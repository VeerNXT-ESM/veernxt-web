import Joi from 'joi';

/**
 * /api/v1/router
 *
 * Combines what used to be two separate serverless functions
 * (v1/chat/completions.js, v1/health.js) into one, purely to stay under
 * Vercel Hobby's 12-function-per-deployment cap. External URLs are
 * unchanged -- vercel.json rewrites /api/v1/chat/completions and
 * /api/v1/health to this file with a `fn` query param, so callers
 * (see docs/AI_API_USAGE.md) see no difference. Underlying behavior of
 * each handler is unchanged, just relocated.
 */

const chatRequestSchema = Joi.object({
  model: Joi.string().required(),
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('system', 'user', 'assistant').required(),
      content: Joi.string().required(),
    }).unknown(false)
  ).min(1).required(),
  temperature: Joi.number().min(0).max(2).default(0.3),
  max_tokens: Joi.number().integer().min(1).max(8192).default(512),
  stream: Joi.boolean().default(false),
  top_p: Joi.number().min(0).max(1).optional(),
  frequency_penalty: Joi.number().min(-2).max(2).optional(),
  presence_penalty: Joi.number().min(-2).max(2).optional(),
}).unknown(false);

async function handleHealth(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET requests are allowed.' }
    });
  }

  return res.status(200).json({ status: 'ok' });
}

// Retain active key index across invocations in warm serverless containers
let currentKeyIndex = 0;

function getAiApiKeys() {
  const raw = process.env.AI_API_KEYS || process.env.VITE_AI_API_KEYS || process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || '';
  return raw
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 10);
}

async function handleChatCompletions(req, res) {
  // 1. Enforce POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are allowed.' }
    });
  }

  // 2. Authentication
  const authHeader = req.headers.authorization;
  const internalKey = process.env.VITE_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== internalKey) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' }
    });
  }

  // 3. Payload Validation
  const { error, value } = chatRequestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: error.details.map(d => d.message).join(', ') }
    });
  }

  if (value.stream) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Streaming is not supported at this time.' }
    });
  }

  // 4. Forward Request to AI Provider with Automatic Key Failover
  const aiBaseUrl = process.env.VITE_AI_BASE_URL || process.env.AI_BASE_URL;
  const keys = getAiApiKeys();

  if (!aiBaseUrl || keys.length === 0) {
    console.error('[Error] AI Provider configuration or keys missing.');
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'API configuration error: no provider keys configured.' }
    });
  }

  const providerUrl = `${aiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
  const totalKeys = keys.length;
  const startIndex = currentKeyIndex % totalKeys;

  let lastStatusCode = 500;
  let lastErrorData = null;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const keyIdx = (startIndex + attempt) % totalKeys;
    const apiKey = keys[keyIdx];
    const keyLabel = `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`;

    try {
      const response = await fetch(providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(value),
      });

      if (response.ok) {
        // Success! Keep active pointer at this working key
        currentKeyIndex = keyIdx;
        const data = await response.json();
        return res.status(200).json(data);
      }

      let errorData;
      try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
      const statusCode = response.status;
      lastStatusCode = statusCode;
      lastErrorData = errorData;

      console.warn(`[AI Key Failover] Key [${keyIdx + 1}/${totalKeys}] (${keyLabel}) failed with HTTP ${statusCode}:`, JSON.stringify(errorData));

      // If the model itself doesn't exist (404), switching keys will not help — return immediately
      if (statusCode === 404 && JSON.stringify(errorData).toLowerCase().includes('model')) {
        return res.status(400).json({
          error: { code: 'AI_MODEL_NOT_FOUND', message: 'The requested model does not exist or is not available.', upstream_status: 404 }
        });
      }

      // If rate limited (429), quota/unauthorized (401/402/403), or upstream error (5xx), advance pointer and try next key!
      currentKeyIndex = (keyIdx + 1) % totalKeys;

    } catch (err) {
      console.warn(`[AI Key Failover] Key [${keyIdx + 1}/${totalKeys}] (${keyLabel}) threw exception: ${err.message}`);
      lastStatusCode = (err.name === 'AbortError' || err.name === 'FetchError' || err.message.includes('fetch')) ? 504 : 502;
      lastErrorData = { message: err.message };
      currentKeyIndex = (keyIdx + 1) % totalKeys;
    }
  }

  // All keys failed
  console.error(`[AI Key Failover] Exhausted all ${totalKeys} keys without success. Last error [HTTP ${lastStatusCode}]:`, JSON.stringify(lastErrorData));

  let errorCode = 'AI_PROVIDER_ERROR';
  if (lastStatusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
  if (lastStatusCode >= 500) errorCode = 'AI_PROVIDER_UNAVAILABLE';
  if (lastStatusCode === 504) errorCode = 'AI_PROVIDER_TIMEOUT';

  let outboundStatus = 502;
  if (lastStatusCode === 429) outboundStatus = 429;
  if (lastStatusCode === 504) outboundStatus = 504;

  return res.status(outboundStatus).json({
    error: {
      code: errorCode,
      message: `All ${totalKeys} AI provider keys failed or were rate-limited.`,
      upstream_status: lastStatusCode,
      keys_tried: totalKeys,
      last_error: lastErrorData
    }
  });
}

export default async function handler(req, res) {
  const { fn } = req.query || {};
  if (fn === 'health') return handleHealth(req, res);
  if (fn === 'chat') return handleChatCompletions(req, res);
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown v1 endpoint.' } });
}
