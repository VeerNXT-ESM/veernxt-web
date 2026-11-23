/**
 * VeerNXT Multi-Language Exam Translation Engine
 * 
 * Provides on-the-fly, high-fidelity translation for competitive exam questions,
 * options, and explanations between English and Hindi.
 * 
 * Architecture:
 * 1. Single-Batch HTTP Requests: Combines question statement + 4 options + explanation
 *    into ONE single network request using structured delimiters, reducing HTTP calls by 83%
 *    and eliminating rate-limiting/429 blocks.
 * 2. Multi-Provider Fallback Chain: Google GTX Primary -> MyMemory API Secondary.
 * 3. 2-Tier Caching: In-memory Map + localStorage for instant 0ms subsequent renders.
 * 4. Sequential Prefetching: Smooth background caching without concurrent connection spikes.
 */

const memoryCache = new Map();
const DELIMITER = "\n~~~~\n";

/**
 * Checks if a string contains Devanagari (Hindi) characters.
 */
export function isHindi(text) {
  if (!text || typeof text !== 'string') return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Translates a single text using primary Google GTX with MyMemory fallback.
 */
export async function translateSingle(text, targetLang = 'hi') {
  if (!text || typeof text !== 'string') return text;
  if (targetLang === 'en' && !isHindi(text)) return text;
  if (targetLang === 'hi' && isHindi(text)) return text;

  const cacheKey = `t_${targetLang}_${text.trim().substring(0, 100)}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);

  try {
    const local = localStorage.getItem('v_' + cacheKey);
    if (local) {
      if (targetLang === 'hi' && !isHindi(local)) {
        // Corrupt or fallback English entry from earlier runs - purge it!
        localStorage.removeItem('v_' + cacheKey);
      } else {
        memoryCache.set(cacheKey, local);
        return local;
      }
    }
  } catch (e) {}

  // 1. Try Google GTX
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const trans = data[0].map(item => (item && item[0]) ? item[0] : '').join('');
        if (trans) {
          memoryCache.set(cacheKey, trans);
          try { localStorage.setItem('v_' + cacheKey, trans); } catch (e) {}
          return trans;
        }
      }
    }
  } catch (err) {
    console.warn('Google GTX single translation warning:', err);
  }

  // 2. Fallback to MyMemory
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const mmRes = await fetch(mmUrl);
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      const trans = mmData?.responseData?.translatedText;
      if (trans && typeof trans === 'string' && !trans.includes('MYMEMORY WARNING')) {
        memoryCache.set(cacheKey, trans);
        try { localStorage.setItem('v_' + cacheKey, trans); } catch (e) {}
        return trans;
      }
    }
  } catch (err) {
    console.warn('MyMemory fallback failed:', err);
  }

  return text;
}

/**
 * Translates an array of strings in ONE single batch network request.
 */
export async function translateBatch(texts, targetLang = 'hi') {
  if (!Array.isArray(texts) || texts.length === 0) return texts;
  if (targetLang === 'en') return texts;

  // Filter out empty items
  const cleanTexts = texts.map(t => (typeof t === 'string' ? t.trim() : ''));
  const allHindi = cleanTexts.every(t => !t || isHindi(t));
  if (allHindi) return texts;

  // Check if all are individually cached
  const results = [];
  let allCached = true;
  for (const t of cleanTexts) {
    if (!t) {
      results.push('');
      continue;
    }
    const cacheKey = `t_${targetLang}_${t.substring(0, 100)}`;
    if (memoryCache.has(cacheKey)) {
      results.push(memoryCache.get(cacheKey));
    } else {
      try {
        const local = localStorage.getItem('v_' + cacheKey);
        if (local) {
          memoryCache.set(cacheKey, local);
          results.push(local);
          continue;
        }
      } catch (e) {}
      allCached = false;
      break;
    }
  }

  if (allCached && results.length === cleanTexts.length) {
    return results;
  }

  // Combine into single batch string
  const combined = cleanTexts.join(DELIMITER);

  // 1. Primary: Google GTX Batch
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(combined)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const fullTranslated = data[0].map(item => (item && item[0]) ? item[0] : '').join('');
        const parts = fullTranslated.split(/~~~~|\n~~~~\n/);
        
        if (parts.length >= cleanTexts.length) {
          return cleanTexts.map((orig, idx) => {
            const trans = (parts[idx] || orig).trim();
            const cacheKey = `t_${targetLang}_${orig.substring(0, 100)}`;
            memoryCache.set(cacheKey, trans);
            try { localStorage.setItem('v_' + cacheKey, trans); } catch (e) {}
            return trans;
          });
        }
      }
    }
  } catch (err) {
    console.warn('Batch translation primary failed, falling back to individual items:', err);
  }

  // 2. Secondary: Fall back to translating individual items
  return Promise.all(cleanTexts.map(t => translateSingle(t, targetLang)));
}

/**
 * Translates an entire Question object (question, 4 options, explanation) in a single request.
 */
export async function translateQuestion(q, targetLang = 'hi') {
  if (!q) return q;
  if (targetLang === 'en') {
    if (q._originalEnglish) return q._originalEnglish;
    return q;
  }

  // Check question-level cache
  const qCacheKey = `q_obj_${q.id || q.question}_${targetLang}`;
  if (memoryCache.has(qCacheKey)) {
    return memoryCache.get(qCacheKey);
  }

  try {
    const local = localStorage.getItem('v_q_' + qCacheKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (targetLang === 'hi' && isHindi(parsed?.question)) {
        memoryCache.set(qCacheKey, parsed);
        return parsed;
      } else if (targetLang === 'en') {
        memoryCache.set(qCacheKey, parsed);
        return parsed;
      }
      // Purge corrupt/untranslated cache item
      localStorage.removeItem('v_q_' + qCacheKey);
    }
  } catch (e) {}

  // If question is already Hindi, return as is
  if (isHindi(q.question)) {
    return q;
  }

  try {
    const optionsArray = Array.isArray(q.options) ? q.options : Object.values(q.options || {});
    const itemsToTranslate = [
      q.question || '',
      ...optionsArray,
      q.explanation || ''
    ];

    const translatedItems = await translateBatch(itemsToTranslate, targetLang);
    
    const translatedQuestionText = translatedItems[0] || q.question;
    const translatedOptions = translatedItems.slice(1, 1 + optionsArray.length);
    const translatedExplanation = translatedItems[1 + optionsArray.length] || q.explanation;

    const translatedQ = {
      ...q,
      _originalEnglish: {
        question: q.question,
        options: optionsArray,
        explanation: q.explanation
      },
      question: translatedQuestionText,
      options: translatedOptions,
      explanation: translatedExplanation,
      language: targetLang
    };

    if (targetLang === 'hi' && isHindi(translatedQuestionText)) {
      memoryCache.set(qCacheKey, translatedQ);
      try {
        localStorage.setItem('v_q_' + qCacheKey, JSON.stringify(translatedQ));
      } catch (e) {}
    } else if (targetLang === 'en') {
      memoryCache.set(qCacheKey, translatedQ);
    }

    return translatedQ;
  } catch (err) {
    console.error('Error translating question:', err);
    return q;
  }
}

/**
 * Synchronously checks if a question is already cached in memory or localStorage.
 */
export function getCachedQuestion(q, targetLang = 'hi') {
  if (!q) return q;
  if (targetLang === 'en') return q._originalEnglish || q;
  if (isHindi(q.question)) return q;

  const qCacheKey = `q_obj_${q.id || q.question}_${targetLang}`;
  if (memoryCache.has(qCacheKey)) return memoryCache.get(qCacheKey);

  try {
    const local = localStorage.getItem('v_q_' + qCacheKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (isHindi(parsed?.question)) {
        memoryCache.set(qCacheKey, parsed);
        return parsed;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Prefetches translations sequentially with a gentle delay to avoid burst limits.
 */
let prefetchTimeout = null;
export function prefetchTranslations(questions, targetLang = 'hi', startIndex = 0, count = 4) {
  if (!questions || questions.length === 0 || targetLang === 'en') return;
  
  if (prefetchTimeout) clearTimeout(prefetchTimeout);

  prefetchTimeout = setTimeout(async () => {
    const slice = questions.slice(startIndex, startIndex + count);
    for (const q of slice) {
      try {
        await translateQuestion(q, targetLang);
        // Small 150ms delay between prefetch requests
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {}
    }
  }, 400);
}
