import Joi from 'joi';

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

/**
 * POST /api/v1/chat/completions
 * Proxy endpoint to call the internal AI provider model.
 * Secured by an internal API key for Vercel functions/backend communication.
 */
export default async function handler(req, res) {
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

  // 4. Forward Request to AI Provider
  try {
    const aiBaseUrl = process.env.VITE_AI_BASE_URL || process.env.AI_BASE_URL;
    const aiApiKey = process.env.VITE_AI_API_KEY || process.env.AI_API_KEY;
    
    if (!aiBaseUrl || !aiApiKey) {
      console.error('[Error] AI Provider configuration is missing.');
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'API configuration error.' }
      });
    }

    const providerUrl = `${aiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
    
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      let errorData;
      try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
      const statusCode = response.status;
      let errorCode = 'AI_PROVIDER_ERROR';
      if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
      if (statusCode >= 500) errorCode = 'AI_PROVIDER_UNAVAILABLE';
      console.error('[Error] AI Provider Failed:', errorData);

      return res.status(statusCode === 429 ? 429 : 502).json({
        error: { code: errorCode, message: 'Unable to generate a response at this time.' }
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('[Error] AI Proxy Exception:', err.message);
    if (err.name === 'AbortError' || err.name === 'FetchError' || err.message.includes('fetch')) {
       return res.status(504).json({
         error: { code: 'AI_PROVIDER_TIMEOUT', message: 'The AI provider took too long to respond.' }
       });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' }
    });
  }
}
