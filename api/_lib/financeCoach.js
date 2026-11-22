/**
 * VeerNXT — AI Financial Coach & Explainer Service
 *
 * Implements the hybrid financial intelligence model:
 * 1. The deterministic rule engine (financialProfiles.js) handles all core math,
 *    percentage splits, and regulatory guardrails.
 * 2. This service provides natural language coaching, plain-language rationale,
 *    multilingual translation (Hindi/Hinglish/English), and interactive Q&A.
 */

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
}

/**
 * Deterministic fallback in case the AI provider is offline or rate-limited.
 * Guarantees zero downtime and consistent, high-value guidance.
 */
function generateFallbackInsight({ profile, corpusAmount, allocation = [], answers = {}, language = 'hinglish', userQuestion }) {
  const corpusStr = formatINR(corpusAmount);
  const sipAmount = formatINR(Math.max(Math.round(corpusAmount * 0.05 / 12), 500));
  const pName = profile?.name || 'Agniveer Investor';
  const risk = profile?.risk || 'Conservative';
  const horizon = profile?.horizon || 'Medium';

  const liquidItem = allocation.find(i => (i.product || i.name || '').toLowerCase().includes('liquid') || (i.product || i.name || '').toLowerCase().includes('emergency'));
  const debtItem = allocation.find(i => (i.product || i.name || '').toLowerCase().includes('debt') || (i.product || i.name || '').toLowerCase().includes('fd'));
  const sipItem = allocation.find(i => (i.product || i.name || '').toLowerCase().includes('sip') || (i.product || i.name || '').toLowerCase().includes('index') || (i.product || i.name || '').toLowerCase().includes('flexi'));
  const termItem = allocation.find(i => (i.product || i.name || '').toLowerCase().includes('term') || (i.product || i.name || '').toLowerCase().includes('shield'));

  if (userQuestion) {
    const q = userQuestion.toLowerCase();
    if (q.includes('withdraw') || q.includes('emergency') || q.includes('nikal')) {
      return language === 'hi'
        ? `**तरलता और निकासी:** आपके प्लान में लिक्विड फंड (${liquidItem ? formatINR(liquidItem.amount) : 'इमरजेंसी फंड'}) बिना किसी लॉक-इन के रखा गया है। आप इसे 1 कार्यदिवस में बिना किसी पेनल्टी के निकाल सकते हैं। बाकी डेट और एफडी सुरक्षित रिटर्न के लिए हैं।`
        : `**Liquidity & Withdrawal:** Aapke corpus ka Emergency / Liquid Fund portion (${liquidItem ? formatINR(liquidItem.amount) : 'Emergency Reserve'}) zero lock-in ke sath hai. Kisi bhi emergency me aap ise 24 hours me direct bank account me withdraw kar sakte hain, bina kisi heavy penalty ke.`;
    }
    if (q.includes('land') || q.includes('plot') || q.includes('flat') || q.includes('property') || q.includes('real estate')) {
      return language === 'hi'
        ? `**जमीन या प्रॉपर्टी में निवेश:** सेवा निधि का पूरा पैसा तुरंत रियल एस्टेट या जमीन में लगाना जोखिम भरा है। जमीन तुरंत बेची नहीं जा सकती (Illiquid), जबकि आपको आने वाले 1-2 वर्षों में करियर स्थापित करने के लिए लिक्विड पैसों की जरूरत होगी। पहले अपना करियर और इमर्जेंसी फंड मजबूत करें।`
        : `**Land & Real Estate Caution:** VeerNXT Golden Rules ke mutabik pura Seva Nidhi corpus turant plot ya zameen me lock na karein. Real estate illiquid hoti hai aur emergency me turant cash nahi deti. Pehle 1–2 saal career stability aur liquid emergency reserve build karein.`;
    }
    if (q.includes('sip') || q.includes('growth') || q.includes('compounding')) {
      return language === 'hi'
        ? `**एसआईपी और कंपाउंडिंग का जादू:** हर महीने ${sipAmount} का एसआईपी आपके करियर के साथ-साथ चुपचाप धन बनाता रहेगा। 10-15 वर्षों में 12-14% की अपेक्षित वार्षिक वृद्धि से यह एक बड़ा वेल्थ फंड तैयार करेगा। बाजार के उतार-चढ़ाव में भी इसे कभी बंद न करें।`
        : `**Power of Compounding (${sipAmount}/month):** Yeh recurring SIP aapke long-term corpus ko grow karta hai. Agar aap 7-10 saal tak disciplined rehte hain, toh 12-14% CAGR par yeh compounding engine aapke liye solid wealth create karega. Market niche ho ya upar, SIP habit break mat kijiye.`;
    }
    return language === 'hi'
      ? `**वित्तीय सलाहकार सलाह:** आपके प्रोफ़ाइल (${pName}) के अनुसार, आपका मुख्य उद्देश्य पूंजी सुरक्षा और नियमित अनुशासन है। आपके कुल ${corpusStr} में से सुरक्षा कवच पहले तय किया गया है ताकि किसी अनहोनी में परिवार पर आंच न आए।`
      : `**Advisor Guidance:** Aapka profile (${pName}) capital safety aur structured deployment par based hai. ${corpusStr} corpus me se safety shield (Liquid + Insurance) pehle rank kiya gaya hai taaki exam ya transition period me zero tension rahe.`;
  }

  if (language === 'hi') {
    return `### 🎖️ वीर वित्तीय कोच अंतर्दृष्टि (Veer Financial Analysis)

**जय हिन्द, अग्निवीर साथी!** आपके 7 चरणों के उत्तरों के आधार पर आपका वित्तीय प्रोफ़ाइल **"${pName}"** निर्धारित किया गया है।

#### 1. 🛡️ पूंजी सुरक्षा और तरलता (Capital Safety & Emergency Buffer)
आपके कुल सेवा निधि पैकेज **${corpusStr}** में से प्राथमिकता पूंजी की रक्षा करने की है। 
${liquidItem ? `• **इमरजेंसी फंड:** ${formatINR(liquidItem.amount)} (${liquidItem.pct}%) को लिक्विड फंड में रखा गया है जिसे आप बिना किसी लॉक-इन या पेनल्टी के 24 घंटे में निकाल सकते हैं।\n` : ''}
${debtItem ? `• **सुरक्षित रिटर्न डेट फंड/एफडी:** ${formatINR(debtItem.amount)} सुरक्षित सरकारी या फिक्स्ड इनकम में पार्क किया गया है ताकि 6.5–7.5% का पक्का रिटर्न मिलता रहे।\n` : ''}
${termItem ? `• **पारिवारिक सुरक्षा शील्ड:** आपके परिवार पर निर्भरता को देखते हुए टर्म इंश्योरेंस का प्रीमियम रिज़र्व अलग किया गया है।\n` : ''}

#### 2. 📈 वेल्थ निर्माण का इंजन (Wealth Accumulation via SIP)
एकमुश्त सारा पैसा शेयर बाजार में लगाने के बजाय, आपके लिए **${sipAmount}/माह** की अनुशासित SIP चुनी गई है। यह आदत आपके सेवा निधि को बिना जोखिम के अगले 5–10 सालों में कई गुना बढ़ाएगी।

#### 3. ⚡ अगले 30 दिनों के ठोस कदम
1. **कोई जल्दबाजी नहीं:** अगले 60 दिनों तक किसी के बहकावे में आकर चिट फंड, अनरजिस्टर्ड स्कीम या भारी जमीन में निवेश न करें।
2. **बैंक लिक्विडिटी:** इमरजेंसी फंड को सेविंग्स एकाउंट से अलग लिक्विड म्यूचुअल फंड या ऑटो-स्वीप एफडी में रखें।
3. **एसआईपी शुरू करें:** पहले महीने से ही ${sipAmount} की ऑटो-डेबिट एसआईपी सक्रिय करें।`;
  }

  // Default: Hinglish
  return `### 🎖️ Veer Financial Coach Intelligence

**Jai Hind, Agniveer!** Aapke questionnaire responses ke analysis ke baad aapka investor profile **"${pName}"** (${risk} Risk, ${horizon} Horizon) finalize hua hai.

#### 1. 🛡️ Safety Net & Liquidity First (Suraksha Chakra)
Aapke **${corpusStr}** Seva Nidhi corpus me sabse pehla rule capital preservation hai:
${liquidItem ? `• **Emergency Reserve:** ${formatINR(liquidItem.amount)} (${liquidItem.pct}%) direct liquid instruments me hai — 0 days lock-in, 24 ghante me withdrawable bina penalty ke.\n` : ''}
${debtItem ? `• **Safe Debt/FD Tranche:** ${formatINR(debtItem.amount)} safe fixed-income me rakha gaya hai taaki capital safe rahe aur 6.5–7.5% sovereign-backed yield milti rahe.\n` : ''}
${termItem ? `• **Family Protection:** Dependent family ke liye pure term insurance reserve pehle secure kiya gaya hai.\n` : ''}

#### 2. 📈 Compounding via Monthly SIP (${sipAmount}/month)
Lump sum market me daalne ke bajaye, 5% corpus allocation se **${sipAmount}** ka systematic monthly SIP suggest kiya gaya hai. Yeh long-term compounding se market volatility ko absorb karke wealth create karega.

#### 3. ⚡ Next 30-Day Action Checklist
1. **Chit Fund & Unregistered Schemes Se Door Rahein:** Kisi relative ya dost ke kehne par bhi unregulated schemes ya trading tips me paisa mat daliye.
2. **Liquid Account Setup:** Emergency tranche ko high-liquidity mutual fund ya sweep-in account me rakhein.
3. **Start SIP Auto-Debit:** Pehle mahine se ${sipAmount} ka auto-debit set karke habit form karein.`;
}

export default async function handleFinanceCoach(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Only POST is allowed.' } });
  }

  const {
    profile = {},
    corpusAmount = 1171000,
    allocation = [],
    answers = {},
    language = 'hinglish',
    userQuestion = null,
    history = [],
  } = req.body || {};

  const gemKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!gemKey) {
    // If no Gemini key is set, use the robust deterministic advisor output
    const fallbackText = generateFallbackInsight({ profile, corpusAmount, allocation, answers, language, userQuestion });
    return res.status(200).json({ text: fallbackText, provider: 'rule-fallback' });
  }

  const allocationSummary = (allocation || []).map(i => 
    `- ${i.product || i.name}: ${i.pct}% (${formatINR(i.amount)}) | Rationale: ${i.why || ''}`
  ).join('\n');

  const langInstruction = language === 'hi'
    ? 'Respond in clear, respectful, motivating Hindi (हिंदी).'
    : language === 'en'
    ? 'Respond in clear, empowering Indian English.'
    : 'Respond in natural, military-friendly conversational Hinglish (Hindi written in Roman script mixed with key English terms).';

  let prompt = '';
  if (userQuestion) {
    prompt = `You are the VeerNXT AI Financial Coach (वीर वित्तीय मार्गदर्शक) for Indian Armed Forces Agniveers.
You are mentoring an Agniveer with the following profile:
- Profile: ${profile.name || 'Agniveer'} (${profile.risk} Risk Profile, ${profile.horizon} Horizon)
- Seva Nidhi Corpus to deploy: ${formatINR(corpusAmount)}
- Calculated Asset Allocation:
${allocationSummary}
- Agniveer's Questionnaire Answers: Q1 Goal: ${answers.q1}, Q2 Background: ${answers.q2}, Q3 Marital: ${answers.q3}, Q5 Risk: ${answers.q5}, Q6 Window: ${answers.q6}

Strict Financial Rules:
1. Capital protection and emergency fund come first.
2. Never recommend crypto, chit funds, trading, or speculative real estate.
3. Do not modify the computed percentage splits. Explain why their current plan protects and benefits them.
4. Language instruction: ${langInstruction}

The Agniveer asks: "${userQuestion}"

Provide a warm, reassuring, concise, military-respectful answer (under 120 words). Directly address their question using the numbers from their actual plan.`;
  } else {
    prompt = `You are the VeerNXT AI Financial Coach (वीर वित्तीय मार्गदर्शक) for Indian Armed Forces Agniveers.
You have just received the calculated asset allocation for an Agniveer who completed 4 years of military service:

Profile: ${profile.name || 'The Veteran'}
Badge: ${profile.badge || 'Agniveer Profile'}
Risk Tolerance: ${profile.risk}
Investment Horizon: ${profile.horizon}
Corpus Amount: ${formatINR(corpusAmount)}
Calculated Plan:
${allocationSummary}
Context: Goal: ${answers.q1 || 'Transition'}, Dependents: ${answers.q3 || 'Family'}, Time Horizon: ${answers.q6 || 'Medium term'}

Core Military Financial Laws to uphold:
1. Protection before investment (Emergency fund & Term cover before equities).
2. Never invest in unregulated chit funds, real estate bubbles, or crypto.
3. Consistent monthly SIP habits matter more than timing the market.

Task:
Generate a structured, motivating, and personalized financial briefing with 3 clear sections:
1. 🛡️ Suraksha Chakra (Why emergency buffer & safety tranche were calculated at this amount).
2. 📈 Wealth Engine (How monthly SIP & compounding will work for their future without stress).
3. ⚡ 3 Immediate Steps for the First 30 Days (Practical actions: avoid chit funds, open liquid fund, start SIP).

Language Instruction: ${langInstruction}
Keep the formatting clean using markdown bolding and bullet points. Tone should be respectful ('Jai Hind', 'Agniveer'). Keep total response under 280 words.`;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${gemKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const generatedText = parts
        .filter(p => !p.thought && typeof p.text === 'string')
        .map(p => p.text)
        .join('\n')
        .trim();
      if (generatedText && generatedText.length > 60) {
        return res.status(200).json({ text: generatedText, provider: 'gemini-3.8-flash' });
      }
    }

    console.warn('[FinanceCoach] Gemini API error, falling back to local insight engine');
    const fallbackText = generateFallbackInsight({ profile, corpusAmount, allocation, answers, language, userQuestion });
    return res.status(200).json({ text: fallbackText, provider: 'rule-fallback' });

  } catch (err) {
    console.warn('[FinanceCoach] Fetch failed:', err.message);
    const fallbackText = generateFallbackInsight({ profile, corpusAmount, allocation, answers, language, userQuestion });
    return res.status(200).json({ text: fallbackText, provider: 'rule-fallback' });
  }
}
