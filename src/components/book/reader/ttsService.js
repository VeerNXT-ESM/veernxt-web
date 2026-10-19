/**
 * ttsService.js - Natural Text-to-Speech Engine for VeerNXT Book Reader
 * 
 * Features:
 * - Natural cadence, breath holds, and section pauses (stops & holds)
 * - Phonetic abbreviation expansion (e.g., "for example", "Question 1", "Option A")
 * - Smart voice discovery: prioritize neural, natural, premium, and human-like voices
 * - Synchronized segment callbacks for visual text highlighting
 * - Page-turn and chapter-advance event coordination
 * - Safeguard against browser 15s utterance timeout bug
 */

// Voice ranking heuristics: search for modern, expressive neural/enhanced voices
const VOICE_PREFERENCE_REGEX = /(natural|neural|premium|enhanced|siri|google uk english female|google us english|samantha|daniel|karen|serena|moira|oliver|arthur)/i;

/**
 * Clean and phonetically adapt text for human-like spoken cadence
 */
export function cleanTextForSpeech(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw;

  // 1. Remove HTML tags while preserving space
  s = s.replace(/<br\s*\/?>/gi, '. ');
  s = s.replace(/<\/p>/gi, '. ');
  s = s.replace(/<\/li>/gi, '. ');
  s = s.replace(/<\/h[1-6]>/gi, '. ');
  s = s.replace(/<[^>]+>/g, ' ');

  // 2. Decode HTML entities
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, ' and ')
    .replace(/&lt;/gi, ' less than ')
    .replace(/&gt;/gi, ' greater than ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;/gi, ' • ');

  // 3. Phonetic expansions for academic & competitive exam study texts
  s = s
    // e.g. and i.e.
    .replace(/\be\.g\.,?\s*/gi, 'for example, ')
    .replace(/\bi\.e\.,?\s*/gi, 'that is, ')
    .replace(/\betc\.\s*/gi, 'and so forth. ')
    .replace(/\betc\b/gi, 'and so forth')
    .replace(/\bvs\.?\s*/gi, ' versus ')
    .replace(/\bw\.r\.t\.?\s*/gi, 'with respect to ')
    // Questions, Answers, Solutions
    .replace(/\bQ(\d+)[\.:]\s*/gi, 'Question $1. ')
    .replace(/\bAns[\.:]\s*/gi, 'Answer: ')
    .replace(/\bSol[\.:]\s*/gi, 'Solution: ')
    .replace(/\bEx[\.:]\s*/gi, 'Example: ')
    // Options A, B, C, D in questions
    .replace(/(?:^|\n|\s)\(([A-D])\)\s+/g, ' Option $1: ')
    .replace(/(?:^|\n|\s)([A-D])\.\s+/g, ' Option $1: ')
    // Analogies and ratios
    .replace(/\s*::\s*/g, ', is related to, ')
    .replace(/\s*:\s*/g, ', to ')
    // Numbers and symbols
    .replace(/(\d+)%/g, '$1 percent')
    .replace(/\bNo\.?\s*(\d+)/gi, 'Number $1')
    .replace(/\bp\.\s*(\d+)/gi, 'page $1')
    .replace(/\bpp\.\s*(\d+)/gi, 'pages $1')
    .replace(/\bFig\.?\s*(\d+)/gi, 'Figure $1')
    .replace(/\bCh\.?\s*(\d+)/gi, 'Chapter $1')
    .replace(/\bSec\.?\s*(\d+)/gi, 'Section $1')
    // Em-dashes and separators
    .replace(/—|–|--/g, ' — ')
    .replace(/[*_#~`]/g, '')
    // Roman numerals in statements: I., II., III. -> Statement 1, Statement 2
    .replace(/\bI\.\s+/g, 'Statement 1: ')
    .replace(/\bII\.\s+/g, 'Statement 2: ')
    .replace(/\bIII\.\s+/g, 'Statement 3: ')
    .replace(/\bIV\.\s+/g, 'Statement 4: ');

  // 4. Normalize multiple whitespaces and punctuation gaps
  s = s.replace(/\s+/g, ' ').trim();

  // Ensure ending punctuation for natural vocal decay
  if (s && !/[.!?]$/.test(s)) {
    s += '.';
  }

  return s;
}

/**
 * Split text into naturally paced sentences and thought clauses
 */
export function splitIntoSentences(text) {
  if (!text) return [];
  // Split on sentence boundaries: periods, question marks, exclamation marks followed by space/quote
  const rawParts = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  return rawParts
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Convert block structures into an ordered list of speech segments
 * with context-aware hold pauses (in ms).
 */
export function extractSpeechSegments(blocks, chapterTitle = '') {
  const segments = [];

  // Optional chapter title intro
  if (chapterTitle) {
    segments.push({
      id: 'chap-intro',
      blockId: 'chapter-header',
      type: 'chapter-header',
      text: cleanTextForSpeech(chapterTitle),
      display: chapterTitle,
      holdMs: 700, // solemn chapter introduction pause
    });
  }

  if (typeof blocks === 'string') {
    const cleaned = cleanTextForSpeech(blocks);
    const sentences = splitIntoSentences(cleaned);
    sentences.forEach((sent, sIdx) => {
      segments.push({
        id: `html-s-${sIdx}`,
        blockId: `h-s-${sIdx}`,
        type: 'paragraph',
        text: sent,
        display: sent,
        holdMs: sIdx === sentences.length - 1 ? 480 : 220,
      });
    });
    return segments;
  }

  if (!blocks || !Array.isArray(blocks)) return segments;

  blocks.forEach((block, bIdx) => {
    const bId = block.id || `b-${bIdx}`;

    switch (block.type) {
      case 'heading': {
        const text = cleanTextForSpeech(block.text || block.content || '');
        if (text) {
          segments.push({
            id: `${bId}-h`,
            blockId: bId,
            type: 'heading',
            text,
            display: block.text || block.content,
            holdMs: 650, // Dignified pause after section heading
          });
        }
        break;
      }

      case 'paragraph': {
        const raw = block.content || block.text || '';
        const cleaned = cleanTextForSpeech(raw);
        if (!cleaned) break;

        const sentences = splitIntoSentences(cleaned);
        sentences.forEach((sent, sIdx) => {
          segments.push({
            id: `${bId}-p-${sIdx}`,
            blockId: bId,
            type: 'paragraph',
            text: sent,
            display: sent,
            // Last sentence in paragraph gets longer breath pause
            holdMs: sIdx === sentences.length - 1 ? 480 : 220,
          });
        });
        break;
      }

      case 'callout': {
        const heading = block.title ? `${block.title}: ` : 'Key Takeaway: ';
        const body = cleanTextForSpeech(block.content || block.text || '');
        if (body) {
          segments.push({
            id: `${bId}-callout`,
            blockId: bId,
            type: 'callout',
            text: cleanTextForSpeech(heading) + ' ' + body,
            display: block.title || 'Key Takeaway',
            holdMs: 550,
          });
        }
        break;
      }

      case 'list':
      case 'numberedList': {
        const items = Array.isArray(block.items) ? block.items : [];
        items.forEach((item, idx) => {
          const itemText = cleanTextForSpeech(item);
          if (itemText) {
            const prefix = block.type === 'numberedList' ? `Point ${idx + 1}. ` : '';
            segments.push({
              id: `${bId}-li-${idx}`,
              blockId: bId,
              type: 'list-item',
              text: prefix + itemText,
              display: item,
              holdMs: 380, // Thoughtful pause between list points
            });
          }
        });
        break;
      }

      case 'table':
      case 'comparisonTable': {
        const rawRows = Array.isArray(block.rows) ? block.rows : [];
        if (rawRows.length > 0) {
          const getCells = (row) => {
            if (!row) return [];
            if (Array.isArray(row)) return row.map((c) => String(c ?? ''));
            if (typeof row === 'object') {
              if (Array.isArray(row.cells)) return row.cells.map((c) => String(c ?? ''));
              return Object.values(row).map((c) => String(c ?? ''));
            }
            return [String(row)];
          };

          const rawHeaders = Array.isArray(block.headers)
            ? block.headers
            : (block.type !== 'comparisonTable' ? getCells(rawRows[0]) : []);
          const dataRows = Array.isArray(block.headers)
            ? rawRows
            : (block.type !== 'comparisonTable' ? rawRows.slice(1) : rawRows);

          dataRows.forEach((row, rIdx) => {
            const cells = getCells(row);
            if (!cells || cells.length === 0) return;
            const cellParts = cells.map((cell, cIdx) => {
              const h = rawHeaders[cIdx] ? `${rawHeaders[cIdx]}: ` : '';
              return `${h}${cell}`;
            });
            const rowText = cleanTextForSpeech(cellParts.join('. '));
            if (rowText) {
              segments.push({
                id: `${bId}-tbl-${rIdx}`,
                blockId: bId,
                type: 'table-row',
                text: rowText,
                display: cells.join(' | '),
                holdMs: 420,
              });
            }
          });
        }
        break;
      }

      case 'keyFacts':
      case 'examAlert': {
        const items = Array.isArray(block.items) ? block.items : [];
        const prefix = block.type === 'keyFacts' ? 'Key fact: ' : 'Exam alert: ';
        items.forEach((item, idx) => {
          const rawItem = typeof item === 'string' ? item : (item?.text || item?.content || '');
          const itemText = cleanTextForSpeech(rawItem);
          if (itemText) {
            segments.push({
              id: `${bId}-${block.type}-${idx}`,
              blockId: bId,
              type: 'callout',
              text: `${prefix}${itemText}`,
              display: rawItem,
              holdMs: 400,
            });
          }
        });
        break;
      }

      case 'statStrip': {
        const stats = Array.isArray(block.stats) ? block.stats : [];
        stats.forEach((st, idx) => {
          const label = st?.label || '';
          const value = st?.value || '';
          const text = cleanTextForSpeech(`${label}: ${value}`);
          if (text) {
            segments.push({
              id: `${bId}-stat-${idx}`,
              blockId: bId,
              type: 'badge',
              text,
              display: `${label}: ${value}`,
              holdMs: 350,
            });
          }
        });
        break;
      }

      case 'statGrid':
      case 'badgeGrid': {
        const items = Array.isArray(block.items) ? block.items : [];
        items.forEach((item, idx) => {
          const title = item.title || item.label || '';
          const value = item.value || item.desc || '';
          const text = cleanTextForSpeech(`${title}: ${value}`);
          if (text) {
            segments.push({
              id: `${bId}-grid-${idx}`,
              blockId: bId,
              type: 'badge',
              text,
              display: `${title}: ${value}`,
              holdMs: 350,
            });
          }
        });
        break;
      }

      default: {
        const raw = block.content || block.text || '';
        if (typeof raw === 'string') {
          const cleaned = cleanTextForSpeech(raw);
          if (cleaned) {
            segments.push({
              id: `${bId}-gen`,
              blockId: bId,
              type: 'generic',
              text: cleaned,
              display: cleaned,
              holdMs: 400,
            });
          }
        }
      }
    }
  });

  return segments;
}

/**
 * Filter and rank best available speech synthesis voices
 */
export function getRankedVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];

  const all = window.speechSynthesis.getVoices();
  const enVoices = all.filter((v) => v.lang.startsWith('en') || v.lang.startsWith('EN'));

  const scored = (enVoices.length > 0 ? enVoices : all).map((v) => {
    let score = 0;
    const name = v.name.toLowerCase();

    // High fidelity indicators
    if (name.includes('natural') || name.includes('neural')) score += 100;
    if (name.includes('enhanced') || name.includes('premium')) score += 80;
    if (name.includes('siri')) score += 70;
    if (name.includes('google uk english female')) score += 65;
    if (name.includes('google us english')) score += 60;
    if (name.includes('samantha')) score += 50;
    if (name.includes('daniel')) score += 45;
    if (name.includes('karen') || name.includes('serena') || name.includes('ava')) score += 40;
    if (v.localService) score += 10;
    if (v.default) score += 5;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.voice);
}

/**
 * Controller class managing Web Speech playback with cadence and pause holds
 */
export class BookTTSController {
  constructor() {
    this.segments = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 0.96; // Calm, articulate reading rate
    this.pitch = 1.0;
    this.selectedVoiceURI = null;
    this.holdTimer = null;
    this.currentUtterance = null;
    this.listeners = [];

    // Load voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.getAvailableVoices();
      };
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyState(state) {
    this.listeners.forEach((l) => l.onStateChange?.(state));
  }

  notifySegment(seg, idx, total) {
    this.listeners.forEach((l) => l.onSegmentChange?.(seg, idx, total));
  }

  notifyFinish() {
    this.listeners.forEach((l) => l.onFinish?.());
  }

  getAvailableVoices() {
    return getRankedVoices();
  }

  getSelectedVoice() {
    const voices = this.getAvailableVoices();
    if (this.selectedVoiceURI) {
      const found = voices.find((v) => v.voiceURI === this.selectedVoiceURI);
      if (found) return found;
    }
    return voices[0] || null;
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI;
    if (this.isPlaying && !this.isPaused) {
      // Restart current segment with new voice
      this.playSegment(this.currentIndex);
    }
  }

  setRate(newRate) {
    this.rate = Math.max(0.7, Math.min(1.6, newRate));
    if (this.isPlaying && !this.isPaused) {
      this.playSegment(this.currentIndex);
    }
  }

  loadSegments(segments, startIndex = 0) {
    this.stop();
    this.segments = segments || [];
    this.currentIndex = Math.max(0, Math.min(startIndex, this.segments.length - 1));
  }

  play() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.listeners.forEach((l) => l.onError?.('Speech synthesis not supported in this browser.'));
      return;
    }

    if (this.segments.length === 0) return;

    if (this.isPaused) {
      this.isPaused = false;
      this.isPlaying = true;
      this.notifyState('playing');
      window.speechSynthesis.resume();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.notifyState('playing');
    this.playSegment(this.currentIndex);
  }

  pause() {
    if (!this.isPlaying) return;
    this.clearHoldTimer();
    this.isPaused = true;
    this.isPlaying = false;
    window.speechSynthesis.pause();
    this.notifyState('paused');
  }

  resume() {
    if (this.isPaused) {
      this.play();
    }
  }

  stop() {
    this.clearHoldTimer();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.notifyState('idle');
    this.notifySegment(null, -1, this.segments.length);
  }

  skipNext() {
    if (this.currentIndex < this.segments.length - 1) {
      this.clearHoldTimer();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.currentIndex += 1;
      if (this.isPlaying) {
        this.playSegment(this.currentIndex);
      } else {
        const seg = this.segments[this.currentIndex];
        this.notifySegment(seg, this.currentIndex, this.segments.length);
      }
    } else {
      this.notifyFinish();
    }
  }

  skipPrev() {
    if (this.currentIndex > 0) {
      this.clearHoldTimer();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.currentIndex -= 1;
      if (this.isPlaying) {
        this.playSegment(this.currentIndex);
      } else {
        const seg = this.segments[this.currentIndex];
        this.notifySegment(seg, this.currentIndex, this.segments.length);
      }
    }
  }

  jumpToSegment(index) {
    if (index >= 0 && index < this.segments.length) {
      this.clearHoldTimer();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.currentIndex = index;
      if (this.isPlaying) {
        this.playSegment(this.currentIndex);
      } else {
        const seg = this.segments[this.currentIndex];
        this.notifySegment(seg, this.currentIndex, this.segments.length);
      }
    }
  }

  jumpToBlock(blockId) {
    const idx = this.segments.findIndex((s) => s.blockId === blockId);
    if (idx !== -1) {
      this.jumpToSegment(idx);
    }
  }

  playSegment(index) {
    if (!this.isPlaying) return;
    this.clearHoldTimer();

    if (index >= this.segments.length) {
      this.stop();
      this.notifyFinish();
      return;
    }

    const seg = this.segments[index];
    this.currentIndex = index;
    this.notifySegment(seg, index, this.segments.length);

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(seg.text);
    this.currentUtterance = utterance;

    const voice = this.getSelectedVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    // Handle utterance completion -> Apply breath hold/pause before next unit
    utterance.onend = () => {
      if (!this.isPlaying) return;

      const holdTime = seg.holdMs || 350;
      this.holdTimer = setTimeout(() => {
        if (!this.isPlaying) return;
        this.currentIndex += 1;
        this.playSegment(this.currentIndex);
      }, holdTime);
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('TTS utterance error:', e);
      if (this.isPlaying) {
        this.currentIndex += 1;
        this.playSegment(this.currentIndex);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  clearHoldTimer() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  destroy() {
    this.stop();
    this.segments = [];
    this.listeners = [];
  }
}
