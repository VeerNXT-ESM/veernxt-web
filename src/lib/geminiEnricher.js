/**
 * VEERNXT Gemini Enricher
 * 
 * Takes a parsed chapter (array of blocks) and sends the raw text to Gemini.
 * Gemini acts as a professional educational publisher and returns an enriched
 * version of the chapter with richer block types inserted.
 * 
 * The ORIGINAL CONTENT IS NEVER CHANGED — only structure and highlighting are added.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const ENRICHMENT_PROMPT = `You are a professional educational book designer and publisher. You are given a chapter from a GK/GS study guide for Indian competitive exams (SSC, UPSC, State PSCs).

Your job is to re-format the content into a HIGHLY ENGAGING, visually rich layout for a digital reader. You must:
1. Keep ALL factual content exactly as-is. Never change, add, or remove facts.
2. Identify and extract key facts into a "keyFacts" block (3-7 bullet points of the most important things to remember)
3. Find the single most important/memorable sentence and make it a "pullQuote" block
4. Identify any facts that are commonly asked in exams and create an "examAlert" block
5. If there are comparisons or categories being listed, convert them into a "comparisonTable" block
6. Identify important named entities (places, people, years, events) and create a "statStrip" block — a row of 3-5 key stats or facts with icons
7. Keep all the original paragraphs, headings, and lists as "paragraph", "heading", "list" blocks

Return ONLY valid JSON matching this exact schema. No markdown fences, no explanation:

{
  "enrichedBlocks": [
    { "id": "unique_id", "type": "paragraph", "content": "<p>...</p>" },
    { "id": "unique_id", "type": "heading", "level": 2, "content": "Section Title" },
    { "id": "unique_id", "type": "keyFacts", "title": "Key Facts", "items": ["fact 1", "fact 2"] },
    { "id": "unique_id", "type": "pullQuote", "content": "The memorable sentence." },
    { "id": "unique_id", "type": "examAlert", "items": ["Commonly asked: ...", "Remember: ..."] },
    { "id": "unique_id", "type": "comparisonTable", "headers": ["Col A", "Col B"], "rows": [["val", "val"]] },
    { "id": "unique_id", "type": "statStrip", "stats": [{ "label": "Height", "value": "8,848m", "icon": "mountain" }] },
    { "id": "unique_id", "type": "list", "items": ["<p>item</p>"] }
  ]
}

Insert keyFacts, pullQuote, examAlert, statStrip, comparisonTable blocks at relevant positions within the chapter flow. Do not cluster them all at the top or bottom.

Here is the chapter content:
`;

/**
 * Enrich a single chapter using Gemini AI
 */
export async function enrichChapterWithGemini(chapter) {
  if (!GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY not set — skipping enrichment');
    return chapter;
  }

  // Build a plain text representation of the chapter for the prompt
  const chapterText = chapter.blocks.map(block => {
    if (block.type === 'heading') return `\n## ${block.content}\n`;
    if (block.type === 'paragraph') return block.content.replace(/<[^>]+>/g, '') + '\n';
    if (block.type === 'list') return block.items.map(i => `- ${i.replace(/<[^>]+>/g, '')}`).join('\n') + '\n';
    if (block.type === 'table') {
      return block.rows.map(r => r.cells.map(c => c.replace(/<[^>]+>/g, '')).join(' | ')).join('\n') + '\n';
    }
    return '';
  }).join('\n');

  const fullPrompt = ENRICHMENT_PROMPT + `\n\nChapter Title: "${chapter.title}"\n\n${chapterText}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return chapter;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return chapter;

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from text if it wrapped it
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return chapter;
    }

    if (!parsed?.enrichedBlocks || !Array.isArray(parsed.enrichedBlocks)) {
      return chapter;
    }

    // Assign new IDs to avoid collisions
    const enrichedBlocks = parsed.enrichedBlocks.map(b => ({
      ...b,
      id: generateId()
    }));

    return { ...chapter, blocks: enrichedBlocks, enriched: true };

  } catch (error) {
    console.error('Gemini enrichment failed:', error);
    return chapter; // Fallback gracefully to original
  }
}
