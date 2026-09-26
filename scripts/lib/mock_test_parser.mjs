/**
 * Mock-test docx -> structured questions, plus the quality gate (G3).
 * One tolerant engine for the layouts seen on Drive (see docs/MOCK_TESTS_PLAN.md):
 *   numbering : "Q1." "Q.1" "Question 1" "1." "Q1" alone on a line (or none -> chunked)
 *   options   : "A)" / "(a)" / "A." lines, label alone on a line, all inline on one line
 *               (even glued: "...?A. 0.00 mmB. 0.20 mm"), or 4 unlabeled lines
 *   answer    : "Correct Answer: B", "✔ Correct Answer: Option (B) – text", "Answer: (D)",
 *               "Correct Answer" + "Option B)" on next line, "✓" on an option, or a trailing "Answer Key"
 *   extras    : "Directions (1-5): ..." passages are attached to the questions they cover
 * Pure functions; no DB access.
 */
import mammoth from 'mammoth';

const LETTERS = ['A', 'B', 'C', 'D'];
const norm = (s) => (s || '').toLowerCase().replace(/[\s ]+/g, ' ').replace(/[^\p{L}\p{N}\p{M}. %₹-]/gu, '').trim();

export async function docxText(file) {
  return (await mammoth.extractRawText({ path: file })).value.replace(/\r/g, '').replace(/ /g, ' ');
}

function declaredCount(text) {
  const head = text.slice(0, 2500);
  const m = head.match(/\b(\d{2,3})[ \t]+Questions\b/i) || head.match(/Total\s+Questions\s*:\s*(\d{2,3})/i) || head.match(/Questions\s*:\s*(\d{2,3})/i);
  return m ? parseInt(m[1], 10) : null;
}

// Put answer / explanation markers on their own lines when a docx glued them to the previous text.
function unglue(text) {
  return text
    .replace(/([^\n])(?=(?:✔\s*)?Correct\s+Answer\s*:)/g, '$1\n')
    // "Detailed Explanation:" / "Brief Explanation:" must stay on one line
    .replace(/([^\n])(?=(?:💡|📝)?\s*Explanation\s*:)/g, (m, a, off, s) => (/(?:Detailed|Brief|Short)\s*$/i.test(s.slice(Math.max(0, off - 12), off + 1)) ? a : a + '\n'))
    // any "Answer:" (letter OR text, e.g. Marathi answers) starts its own line, except inside "Correct Answer:"
    .replace(/([^\n])(?=Answer\s*:)/g, (m, a, off, s) => (/Correct\s*$/i.test(s.slice(Math.max(0, off - 8), off + 1)) ? a : a + '\n'));
}

const START_RES = [
  /^\s*(?:Question|Q)\.?\s*(\d{1,3})\s*[.):\-–]?(?:\s+|(?=[A-Z(‘“"'\[]))(.*)$/,
  /^\s*(\d{1,3})\s*[.)]\s+(\S.*)$/,
  /^\s*(?:Question|Q)\.?\s*(\d{1,3})\s*[.):]?\s*$/,
];

// Two numbering families: "Q1." / "Question 1" / "Q1" alone (family 'Q') and plain "1." (family 'N').
// A document uses one; lock onto whichever yields the longer valid sequence so numbered steps
// inside explanations ("1. ...", "2. ...") are not mistaken for questions.
// A real question is followed by an answer marker or A-D options before the next sequential number;
// numbered steps inside an explanation ("1. Turns right ...", "2. ...") are not.
function looksLikeQuestion(lines, cands, k) {
  const c = cands[k]; let end = Math.min(lines.length, c.i + 200);
  for (let j = k + 1; j < cands.length; j++) if (cands[j].n === c.n + 1) { end = Math.min(end, cands[j].i); break; }
  const t = lines.slice(c.i, end).join('\n');
  return hasQuestionSignals(t) || Boolean(KEYMAP[c.n]);
}
// answer marker, A-D option lines (text or label-only, image options), inline A)..D), or numbered (1)..(4) options
function hasQuestionSignals(t) {
  return /Ans(?:wer)?\s*[:.]|Correct\s+(?:Answer|Option)/i.test(t) || (t.match(/^\s*\(?[A-Ea-e][).]\s*\S/gm) || []).length >= 3 || (t.match(/^\s*\(?[A-E][).]?\s*$/gm) || []).length >= 3 || /\(?A[.)].+B[.)].+C[.)].+D[.)]/s.test(t.replace(/\n/g, ' ')) || /^\s*\(1\)[\s\S]*\(4\)/m.test(t);
}
function sequence(lines, cands, strict) {
  const starts = []; let expected = 1;
  for (let k = 0; k < cands.length; k++) {
    const c = cands[k];
    // The previous question is "complete" if it has an answer marker or options (papers without answer keys exist).
    const prevHasAnswer = !starts.length || hasQuestionSignals(lines.slice(starts[starts.length - 1].i, c.i).join('\n'));
    // Sections may restart numbering at 1; forward jumps mean numbers missing in the source (flagged later), not a new question.
    if (c.n === expected || (prevHasAnswer && (c.n === 1 || (c.n > expected && c.n <= expected + 60)))) {
      if (strict && !looksLikeQuestion(lines, cands, k)) continue;
      starts.push(c); expected = c.n + 1;
    }
  }
  return starts;
}
function findStarts(lines) {
  const cands = [];
  lines.forEach((l, i) => { START_RES.forEach((re, k) => { const m = re_first(l, re, k, cands, i); }); });
  const pick = (fam) => { const list = fam ? cands.filter((c) => c.fam === fam) : cands; const strict = sequence(lines, list, true); return strict.length >= 5 ? strict : sequence(lines, list, false); };
  const q = pick('Q');
  const n = pick('N');
  // Some papers switch style mid-way ("Q1.".."Q30." then plain "31." ...): allow both, the question-signal check screens out false starts.
  const mixed = sequence(lines, cands, true);
  if (mixed.length > Math.max(q.length, n.length) * 1.15 && mixed.length >= 5) return mixed;
  if (q.length >= 5 && q.length >= n.length * 0.5) return q; // Q-prefixed numbering wins unless plain numbering is far more frequent
  return n.length > q.length ? n : q;
}
function re_first(l, re, k, cands, i) {
  if (cands.length && cands[cands.length - 1].i === i) return null; // one candidate per line
  const m = l.match(re); if (!m) return null;
  cands.push({ i, n: parseInt(m[1], 10), rest: (m[2] || '').trim(), fam: k === 1 ? 'N' : 'Q' });
  return m;
}

const LABEL_LINE = /^\(?([A-Ea-e])[).]\s*(.*)$/;
const LETTERS5 = ['A', 'B', 'C', 'D', 'E'];
// per-document state set at the start of parseMockText (parsing is synchronous)
let UNLABELED_N = 4; // options per question when option lines carry no labels
let KEYMAP = {}; // end-of-paper answer key: question number -> letter
function parseOptions(lines) {
  // 1) line-based, labels in order A..D (+ optional E for 5-option papers); label may be alone, text on following lines
  const opts = {}; const stem = []; let cur = null;
  for (const raw of lines) {
    const l = raw.trim(); if (!l) continue;
    const m = l.match(LABEL_LINE);
    const idx = m ? LETTERS5.indexOf(m[1].toUpperCase()) : -1;
    if (m && idx === Object.keys(opts).length && (idx < 4 || (idx === 4 && Object.keys(opts).length === 4))) { cur = LETTERS5[idx]; opts[cur] = m[2].trim(); }
    else if (cur) opts[cur] += (opts[cur] ? ' ' : '') + l; // wrapped option text / label was alone on its line
    else stem.push(l);
  }
  if (LETTERS.every((L) => opts[L] !== undefined) && (Object.keys(opts).length === 4 || (Object.keys(opts).length === 5 && opts.E !== undefined))) {
    if (opts.E !== undefined && !opts.E.trim()) delete opts.E; // dangling "E" label with no text
    return { stem: stem.join('\n'), options: opts };
  }
  // 2) inline on one line (parenthesised "(a)..(d)" or "A."/"A)"), use the LAST full run
  const joined = lines.map((x) => x.trim()).filter(Boolean).join(' ');
  if (/\(?A[.)]\s*\(?B[.)]\s*\(?C[.)]\s*\(?D[.)]\s*$/.test(joined)) return { stem: joined.replace(/\(?A[.)]\s*\(?B[.)]\s*\(?C[.)]\s*\(?D[.)]\s*$/, '').trim(), options: null, image: true };
  const tries = [
    { start: /\(a\)/gi, run: /^\(a\)\s*(.+?)\s*\(b\)\s*(.+?)\s*\(c\)\s*(.+?)\s*\(d\)\s*(.+)$/is },
    { start: /A[.)]/g, run: /^A[.)]\s*(.+?)\s*B[.)]\s*(.+?)\s*C[.)]\s*(.+?)\s*D[.)]\s*(.+)$/s },
  ];
  for (const t of tries) {
    const starts = [...joined.matchAll(t.start)].map((x) => x.index).reverse();
    for (const st of starts) {
      const m = joined.slice(st).match(t.run);
      if (m && [1, 2, 3, 4].every((k) => m[k].trim())) return { stem: joined.slice(0, st).trim(), options: Object.fromEntries(LETTERS.map((L, k) => [L, m[k + 1].trim()])) };
    }
  }
  // 2b) numeric labels "(1)".."(4)" on separate lines (only reached when there are no A-D labels)
  {
    const o = {}; const st = []; let c = null;
    for (const raw of lines) {
      const l = raw.trim(); if (!l) continue;
      const m = l.match(/^\(([1-4])\)\s*(.*)$/); const idx = m ? +m[1] - 1 : -1;
      if (m && idx === Object.keys(o).length) { c = LETTERS[idx]; o[c] = m[2].trim(); }
      else if (c) o[c] += (o[c] ? ' ' : '') + l;
      else st.push(l);
    }
    if (LETTERS.every((L) => o[L])) return { stem: st.join('\n'), options: o };
  }
  // 2c) first option's "A)" label missing: the line holding "B) .. C) .. D) .." starts with option A's text
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].trim().match(/^(.{1,120}?)\s*B[.)]\s*(.+?)\s*C[.)]\s*(.+?)\s*D[.)]\s*(.+)$/);
    if (m && [1, 2, 3, 4].every((k) => m[k].trim())) return { stem: lines.slice(0, i).map((x) => x.trim()).filter(Boolean).join('\n'), options: { A: m[1].trim(), B: m[2].trim(), C: m[3].trim(), D: m[4].trim() } };
  }
  // 3) unlabeled: last 4 (or 5 for 5-option papers) non-empty lines
  const ne = lines.map((x) => x.trim()).filter(Boolean);
  const n = UNLABELED_N;
  if (ne.length >= n + 1) return { stem: ne.slice(0, -n).join('\n'), options: Object.fromEntries(LETTERS5.slice(0, n).map((L, k) => [L, ne[ne.length - n + k]])) };
  return { stem: ne.join('\n'), options: null };
}

const ANS_RES = [
  /(?:✔|✓)?[ \t]*Correct[ \t]+Answer[ \t]*:?[ \t]*(?:Option[ \t]*)?\(?([A-Da-d])\)?(?![A-Za-z])(?:[ \t).:–-]+(.*))?$/m,
  /^[ \t]*(?:✔|✓)?[ \t]*Ans(?:wer)?[ \t]*[:.][ \t]*(?:Option[ \t]*)?\(?([A-Da-d])\)?(?![A-Za-z])(?:[ \t).:–-]+(.*))?$/m,
  /Correct\s+Answer\s*\n+\s*Option\s*\(?([A-Da-d])\)?()/m,
  // "Correct Option: (2) Brave" (options numbered 1-4)
  /^[ \t]*Correct[ \t]+Option[ \t]*:?[ \t]*\(?([A-Da-d1-4])\)?(?![A-Za-z0-9])(?:[ \t).:–-]+(.*))?$/m,
  // "Answer:" alone, letter + text on the next line ("C. 2 and 3 only")
  /^[ \t]*(?:Correct[ \t]+)?(?:Answer|Ans)[ \t]*:?[ \t]*\n+[ \t]*\(?([A-Da-d])\)?[.):][ \t]*(.*)$/m,
];

export function parseMockText(rawText) {
  rawText = rawText.replace(/\*\*/g, ''); // markdown bold ("**Q31. ...**")
  const declared = declaredCount(rawText);
  // Answer Key table at the end: "Answer Key" followed by "1. B 2. C ..." pairs.
  const keyMap = {};
  const ak = rawText.search(/Answer\s*Key/i);
  if (ak > rawText.length * 0.5) for (const m of rawText.slice(ak).matchAll(/(\d{1,3})\s*[-–.:)]?\s*\(?([A-Ea-e])\)?(?![A-Za-z])/g)) keyMap[parseInt(m[1], 10)] = m[2].toUpperCase();
  KEYMAP = keyMap;
  UNLABELED_N = (rawText.match(/\bE\)\s*\S/g) || []).length >= 8 ? 5 : 4; // "E) ..." options seen throughout -> 5-option paper
  const text = unglue(rawText);
  const lines = text.split('\n');
  let starts = findStarts(lines);
  const questions = [];
  const passages = []; // {from,to,text}
  let section = null;

  const blocksFrom = [];
  // Word auto-numbering is not in the extracted text: a paper can show only a handful of stray "n." lines while having
  // one answer marker per question. If numbers cover far fewer questions than there are answers, split by answer marker.
  const answerCount = (text.match(/^[ \t]*(?:✔|✓)?[ \t]*(?:Correct[ \t]+(?:Answer|Option)|Ans(?:wer)?)[ \t]*[:.]/gim) || []).length;
  const numbered = starts.length >= 5 && (answerCount === 0 || starts.length >= answerCount * 0.6);
  if (numbered) {
    starts.forEach((s, k) => blocksFrom.push({ n: s.n, lines: [s.rest, ...lines.slice(s.i + 1, k + 1 < starts.length ? starts[k + 1].i : lines.length)] }));
  } else { // unnumbered: one chunk per answer marker
    // states: stem -> (answer marker) -> afterAnswer -> [Explanation] -> inExpl -> (blank gap, next text) -> new block
    let buf = []; let n = 0; let state = 'stem'; let gap = false;
    const flush = () => { if (buf.some((l) => /Correct\s+Answer|^\s*Answer\s*:/i.test(l))) { n++; blocksFrom.push({ n, lines: buf }); } buf = []; state = 'stem'; };
    for (const l of lines) {
      const blank = /^\s*$/.test(l);
      if (!blank) {
        if (state === 'afterAnswer' && !/Explanation\s*:/i.test(l)) flush();
        else if (state === 'inExpl' && gap) flush();
      }
      buf.push(l);
      if (blank) { gap = true; continue; }
      gap = false;
      if (/Explanation\s*:/i.test(l)) state = 'inExpl';
      else if (state === 'stem' && /Correct\s+Answer|^\s*Answer\s*:/i.test(l)) state = 'afterAnswer';
    }
    flush();
  }

  let running = 0;
  for (const b of blocksFrom) {
    let bl = b.lines;
    running++; b.src = b.n; b.n = running; // sections may restart numbering: DB order = document order
    // Trailing section / part headings and "Directions" passages belong to the NEXT questions.
    let cut = bl.length; let trailingPassage = null;
    const seenAns = bl.findIndex((l) => /Explanation\s*:|Correct\s+Answer|^\s*Answer\s*:/i.test(l));
    for (let i = Math.max(seenAns, 0) + 1; i < bl.length; i++) {
      if (/^\s*(SECTION|PART|Section|Part)\b.{0,120}$/.test(bl[i]) && !/Explanation\s*:/i.test(bl[i])) { cut = Math.min(cut, i); const t = bl[i].match(/(?:SECTION|PART|Section|Part)\s*[\w.]*\s*[:\-–]\s*(.+?)\s*(?:\(.*\))?$/); if (t) section = t[1].trim(); }
      const d = bl[i].match(/^\s*Directions?\s*(?:\(?(?:Q(?:uestions?)?\.?\s*)?(\d{1,3})\s*[-–to]+\s*(\d{1,3})\)?)?/i);
      if (d && cut > i - 1) { cut = Math.min(cut, i); trailingPassage = { from: d[1] ? +d[1] : b.n + 1, to: d[2] ? +d[2] : b.n + 1, text: bl.slice(i).join('\n').replace(/\n{2,}/g, '\n').trim() }; break; }
    }
    if (trailingPassage) passages.push(trailingPassage);
    bl = bl.slice(0, cut);
    const q = { number: b.n, sourceNumber: b.src, section, stem: '', options: null, answer: null, answerText: null, explanation: null, flags: [] };
    let body = bl.join('\n');
    const ex = body.match(/(?:💡|📝)?\s*(?:(?:Detailed|Brief|Short)\s+)?Explanation\s*:\s*([\s\S]*)$/i);
    let pre = ex ? body.slice(0, ex.index) : body;
    if (ex) q.explanation = ex[1].trim().replace(/\n{2,}/g, '\n') || null;
    for (const re of ANS_RES) {
      const m = pre.match(re);
      if (m) { q.answer = /[1-4]/.test(m[1]) ? LETTERS[+m[1] - 1] : m[1].toUpperCase(); q.answerText = (m[2] || '').trim().replace(/^[.\s]+/, ''); pre = pre.slice(0, m.index) + pre.slice(m.index + m[0].length); break; }
    }
    // "Ans: (C) North Sikkim   |   explanation": text after a pipe is the explanation when none was given
    if (q.answer && q.answerText.includes('|')) { const [a, ...rest] = q.answerText.split('|'); q.answerText = a.trim(); if (!q.explanation) q.explanation = rest.join('|').trim() || null; }
    // "✓" on the correct option: right after the label (CHSL) or at the end of the option line (Bihar SI)
    if (!q.answer) { const mk = pre.match(/^\s*\(?([A-Da-d])[).]\s*\n*\s*[✓✔]/m) || pre.match(/^\s*\(?([A-Da-d])[).][^\n]*[✓✔]\s*$/m); if (mk) q.answer = mk[1].toUpperCase(); }
    pre = pre.replace(/[ \t]*[✓✔]\s*/g, ' ');
    // Answer given as the option's TEXT instead of a letter (e.g. Marathi papers): resolve after options are parsed
    let answerAsText = null;
    if (!q.answer) { const at = pre.match(/^[ \t]*(?:Correct[ \t]+)?Ans(?:wer)?[ \t]*[:.][ \t]*(\S.*)$/m); if (at) { answerAsText = at[1].trim(); pre = pre.slice(0, at.index) + pre.slice(at.index + at[0].length); } }
    if (/\[Answer not available[^\]]*\]/i.test(pre)) { pre = pre.replace(/\s*\[Answer not available[^\]]*\]/gi, ''); q.flags.push('NO_ANSWER_KEY'); }
    const po = parseOptions(pre.split('\n'));
    q.stem = po.stem; q.options = po.options;
    if (po.image) q.flags.push('IMAGE_OPTIONS');
    if (!q.options && !po.image) q.flags.push('OPTIONS_NOT_FOUND');
    if (!q.answer && answerAsText && q.options) { const t = norm(answerAsText); const hit = LETTERS.find((L) => norm(q.options[L]) === t) || LETTERS.find((L) => t && norm(q.options[L]).length > 1 && (norm(q.options[L]).includes(t) || t.includes(norm(q.options[L])))); if (hit) { q.answer = hit; q.answerText = answerAsText; } }
    if (!q.answer && keyMap[b.n]) q.answer = keyMap[b.n];
    // Leading number remnants like "1." already consumed by START_RES.
    questions.push(q);
  }
  // Drop preamble "questions" (numbered general instructions) that precede the first real question.
  // Separate answer section: numbering restarts and the later run has answers/explanations but no options
  // (paper = all questions first, then "Q1 Answer: (A) Explanation: ..." for each). Merge back by number.
  {
    const runs = []; let cur = null;
    for (const q of questions) { if (!cur || q.sourceNumber <= cur[cur.length - 1].sourceNumber) { cur = []; runs.push(cur); } cur.push(q); }
    if (runs.length >= 2) {
      const isAnswerRun = (r) => r.length >= 5 && r.filter((q) => q.answer && !q.options).length / r.length > 0.6;
      const main = runs.find((r) => r.filter((q) => q.options).length / r.length > 0.6);
      const drop = new Set();
      if (main) for (const r of runs) {
        if (r === main || !isAnswerRun(r)) continue;
        const byNum = new Map(main.map((q) => [q.sourceNumber, q]));
        for (const a of r) { const t = byNum.get(a.sourceNumber); if (t && !t.answer) { t.answer = a.answer; t.answerText = a.answerText; t.explanation = t.explanation || a.explanation; t.flags = t.flags.filter((f) => f !== 'NO_ANSWER_KEY'); } drop.add(a); }
      }
      if (drop.size) { const kept = questions.filter((q) => !drop.has(q)); questions.length = 0; questions.push(...kept); questions.forEach((q, i) => { q.number = i + 1; }); }
    }
  }
  // A leading entry is preamble if it has no answer AND its "options" are junk (empty / punctuation / "and ...") or its text is instructions.
  const isPreamble = (q) => !q.answer && (!q.options || Object.values(q.options).some((v) => v.length <= 3 || /^and\b|select the most appropriate/i.test(v)) || /^(this (paper|question paper)|each question|there is no negative|all questions|the explanations?|instructions?|note\b)/i.test(q.stem));
  let dropped = 0; while (questions.length && isPreamble(questions[0])) { questions.shift(); dropped++; }
  if (dropped) questions.forEach((q, i) => { q.number = i + 1; });
  // Attach passages to the questions they cover.
  for (const q of questions) { const p = passages.filter((x) => q.number >= x.from && q.number <= x.to).pop(); if (p && q.stem) { q.passage = p.text; q.stem = `${p.text}\n\n${q.stem}`; } }
  return { declared, questions };
}

const CONTRADICTION = /\b(wait|recalc|recompute|reconsider(ing)?|actually|let me|hmm|correction|however,? (the )?(correct|answer)|standard is|options? (is|are) wrong|closest option|take [A-D]\)|likely (answer )?intended|approximately matches|assum(e|ing) (the )?(answer|typo))\b/i;
const PLACEHOLDER_EXPL = /answer based on standard .{0,40}syllabus|please verify with official|explanation (not|to be) (available|provided|added)|^\s*(n\/a|tbd|na)\s*\.?\s*$/i;
export const HARD_FLAGS = ['PLACEHOLDER_EXPLANATION','NO_STEM', 'OPTIONS_NOT_FOUND', 'EMPTY_OPTION', 'DUPLICATE_OPTIONS', 'IMAGE_OPTIONS', 'NEEDS_IMAGE', 'ANSWER_LEAKED_IN_OPTION', 'NO_ANSWER_KEY', 'KEY_TEXT_MISMATCH', 'EXPLANATION_SELF_CONTRADICTS', 'DUP_QUESTION', 'DUP_NUMBER'];

export function gate(parsed, { expected = 10 } = {}) {
  const issues = [];
  const qs = parsed.questions;
  const seenNums = new Set(); const seenText = new Map();
  for (const q of qs) {
    const f = [...new Set(q.flags)];
    if (seenNums.has(q.number)) f.push('DUP_NUMBER'); seenNums.add(q.number);
    if (!q.stem || q.stem.length < 8) f.push('NO_STEM');
    if (q.options) {
      const vals = Object.values(q.options);
      if (vals.some((v) => !v || v.length < 1)) f.push('EMPTY_OPTION');
      if (new Set(vals.map(norm)).size < 4) f.push('DUPLICATE_OPTIONS');
      if (vals.some((v) => /Correct Answer|Explanation\s*:|💡|✔/.test(v))) f.push('ANSWER_LEAKED_IN_OPTION');
    }
    if (/\b(figure|image|diagram|picture|pattern|mirror|water image|embedded|paper folding)\b/i.test(q.stem) && (!q.options || Object.values(q.options).some((v) => v.length <= 2))) f.push('NEEDS_IMAGE');
    if (!q.answer && !f.includes('NO_ANSWER_KEY')) f.push('NO_ANSWER_KEY');
    if (q.answer && q.options && q.answerText) {
      const keyed = norm(q.options[q.answer]); const at = norm(q.answerText);
      if (at && keyed && !(keyed === at || keyed.includes(at) || at.includes(keyed))) f.push('KEY_TEXT_MISMATCH');
    }
    if (!q.explanation) f.push('NO_EXPLANATION');
    else if (CONTRADICTION.test(q.explanation)) f.push('EXPLANATION_SELF_CONTRADICTS');
    else if (PLACEHOLDER_EXPL.test(q.explanation)) f.push('PLACEHOLDER_EXPLANATION');
    if (q.stem) { const k = norm(q.stem) + '|' + norm(Object.values(q.options || {}).join('|')); if (seenText.has(k)) f.push('DUP_QUESTION'); seenText.set(k, q.number); }
    q.flags = [...new Set(f)];
  }
  const nums = qs.map((q) => q.number);
  const target = parsed.declared || Math.max(0, ...nums) || expected;
  const missing = []; for (let n = 1; n <= target; n++) if (!nums.includes(n)) missing.push(n);
  if (missing.length) issues.push(`MISSING_QUESTION_NUMBERS(${missing.length}): ${missing.slice(0, 8).join(',')}${missing.length > 8 ? '…' : ''}`);
  if (parsed.declared && qs.length !== parsed.declared) issues.push(`COUNT ${qs.length} != declared ${parsed.declared}`);
  const keyed = qs.filter((q) => q.answer).length;
  if (qs.length < 5) issues.push(`PARSED_TOO_FEW (${qs.length})`);
  else if (keyed / qs.length < 0.5) issues.push(`SOURCE_HAS_NO_ANSWER_KEYS (${keyed}/${qs.length} keyed) - cannot be scored`);
  const bad = qs.filter((q) => q.flags.length);
  const tally = {}; bad.forEach((q) => q.flags.forEach((fl) => (tally[fl] = (tally[fl] || 0) + 1)));
  const hardBad = qs.filter((q) => q.flags.some((fl) => HARD_FLAGS.includes(fl)));
  return { total: qs.length, declared: parsed.declared, issues, tally, flaggedQuestions: bad.length, hardFailQuestions: hardBad.length, pass: issues.length === 0 && hardBad.length === 0 };
}
