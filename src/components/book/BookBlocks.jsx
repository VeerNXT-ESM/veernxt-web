import React from 'react';
import { Info, AlertTriangle, Lightbulb, BookOpen, Star, Zap, TrendingUp } from 'lucide-react';
import './BookBlocks.css';

export function cleanParagraphContent(content) {
  if (!content || typeof content !== 'string') return content;
  let text = content.trim();

  // Normalize all variations of <br></br>, </br>, <br/> into <br>
  let s = text
    .replace(/<br\s*><\/br>|<\/br>/gi, '<br>')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/^(\s*<br>\s*)+/gi, '')
    .replace(/(\s*<br>\s*)+$/gi, '');

  if (!s.includes('<br>')) {
    return text;
  }

  // Split lines on <br>
  const lines = s.split(/<br>/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return text;
  }

  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Banner / Main Title like <strong>Practice Questions (Syllogism):</strong> or <strong>Solved Example:</strong>
    if (/^<(?:strong|b)>(Practice Questions|Solved Example|Important Questions|Sample Questions)[^<]*<\/(?:strong|b)>$/i.test(line)) {
      let title = line.replace(/<[^>]+>/g, '').trim().replace(/:\s*$/, '');
      out.push(`<div class="bk-section-banner">${title}</div>`);
      continue;
    }

    // Question number: Q1., Q2., Q4., Q5., etc.
    const qMatch = line.match(/^(Q\d+)[\.:]?(.*)$/i);
    if (qMatch) {
      const qNum = qMatch[1];
      const rest = qMatch[2] ? qMatch[2].trim() : '';
      out.push(
        `<div class="bk-q-row"><span class="bk-q-pill">${qNum}</span>${rest ? `<span class="bk-q-lead">${rest}</span>` : ''}</div>`
      );
      continue;
    }

    // Statements: or Statement: or Standard Statements:
    if (/^(?:Standard\s+)?Statements?:/i.test(line)) {
      out.push(`<div class="bk-stmt-heading">${line}</div>`);
      continue;
    }

    // Conclusions: or Conclusion:
    if (/^Conclusions?:/i.test(line)) {
      out.push(`<div class="bk-conclusion-heading">${line}</div>`);
      continue;
    }

    // Logic: or Answer:
    if (/^(Logic|Answer):/i.test(line)) {
      const m = line.match(/^(Logic|Answer):(.*)$/i);
      out.push(
        `<div class="bk-explanation-row"><strong class="bk-expl-label">${m[1]}:</strong> ${m[2].trim()}</div>`
      );
      continue;
    }

    // Roman numeral conclusions: I. , II. , III. , IV.
    const romanMatch = line.match(/^((?:I|II|III|IV|V)\.)\s*(.*)$/i);
    if (romanMatch) {
      out.push(
        `<div class="bk-roman-stmt"><span class="bk-roman-tag">${romanMatch[1]}</span><span class="bk-stmt-body">${romanMatch[2]}</span></div>`
      );
      continue;
    }

    // Multiple choice options: A., B., C., D. (with or without space, e.g. A.Only I follows)
    const optMatch = line.match(/^([A-D])[\.\)]\s*(.*)$/i);
    if (optMatch) {
      out.push(
        `<div class="bk-option-line"><span class="bk-opt-badge">${optMatch[1]}</span><span class="bk-opt-text">${optMatch[2].trim()}</span></div>`
      );
      continue;
    }

    // Numbered statement (1) All A are B, 2) Some A are B...
    const numMatch = line.match(/^(\d+)[\.\)]\s*(.*)$/);
    if (numMatch) {
      out.push(
        `<div class="bk-num-stmt"><span class="bk-num-tag">${numMatch[1]}.</span><span class="bk-stmt-body">${numMatch[2]}</span></div>`
      );
      continue;
    }

    // Bullet-like statement
    out.push(`<div class="bk-bullet-stmt">${line}</div>`);
  }

  return out.join('');
}

export const ParagraphBlock = ({ content }) => {
  const cleaned = cleanParagraphContent(content);
  return <div className="bk-paragraph" dangerouslySetInnerHTML={{ __html: cleaned }} />;
};

export function cleanHeadingContent(content) {
  if (!content || typeof content !== 'string') return content;
  let text = content.trim();

  // Strip leading and trailing break tags (including malformed <br></br>, </br>, <br/>)
  const stripBreaks = (s) => s
    .replace(/^(\s*<\/?br\s*\/?>\s*)+/gi, '')
    .replace(/(\s*<\/?br\s*\/?>\s*)+$/gi, '')
    .trim();

  let prev;
  do {
    prev = text;
    text = stripBreaks(text);
    text = text.replace(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i, (_, inner) => inner.trim());
    text = text.replace(/^<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>$/i, (_, inner) => inner.trim());
    text = stripBreaks(text);
  } while (text !== prev);

  // Normalize any remaining internal <br></br> or </br> into <br />
  text = text.replace(/<br\s*><\/br>|<\/br>/gi, '<br />');

  return text;
}

export const HeadingBlock = ({ level, content }) => {
  const Tag = `h${level}`;
  const cleaned = cleanHeadingContent(content);
  return <Tag className={`bk-heading bk-h${level}`} dangerouslySetInnerHTML={{ __html: cleaned }} />;
};

export const ImageBlock = ({ src, alt, caption }) => {
  return (
    <figure className="bk-image-block">
      <img src={src} alt={alt || 'Book illustration'} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
};

export const ImportantBlock = ({ content }) => {
  return (
    <div className="bk-callout bk-important">
      <div className="bk-callout-icon"><AlertTriangle size={20} /></div>
      <div className="bk-callout-content">
        <h4 className="bk-callout-title">IMPORTANT</h4>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export const ExamTipBlock = ({ content }) => {
  return (
    <div className="bk-callout bk-exam-tip">
      <div className="bk-callout-icon"><Lightbulb size={20} /></div>
      <div className="bk-callout-content">
        <h4 className="bk-callout-title">EXAM TIP</h4>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export const DefinitionBlock = ({ content }) => {
  return (
    <div className="bk-callout bk-definition">
      <div className="bk-callout-icon"><BookOpen size={20} /></div>
      <div className="bk-callout-content">
        <h4 className="bk-callout-title">DEFINITION</h4>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export const ExampleBlock = ({ content }) => {
  return (
    <div className="bk-callout bk-example">
      <div className="bk-callout-content">
        <h4 className="bk-callout-title">EXAMPLE</h4>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export const GenericCalloutBlock = ({ content }) => {
  return (
    <div className="bk-callout bk-generic">
      <div className="bk-callout-icon"><Info size={20} /></div>
      <div className="bk-callout-content">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export const ListBlock = ({ items }) => {
  return (
    <ul className="bk-list">
      {items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ul>
  );
};

const OL_TYPE = { upperLetter: 'A', lowerLetter: 'a', upperRoman: 'I', lowerRoman: 'i' };

export const NumberedListBlock = ({ items, start, format }) => {
  return (
    <ol className="bk-numbered-list" start={start || undefined} type={OL_TYPE[format] || undefined}>
      {items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ol>
  );
};

export const TableBlock = ({ rows }) => {
  if (!rows || rows.length === 0) return null;
  
  return (
    <div className="bk-table-wrapper">
      <table className="bk-table">
        <tbody>
          {rows.map((row, i) => {
            const isArray = Array.isArray(row);
            const cells = isArray ? row : (row.cells || (typeof row === 'object' ? Object.values(row) : [row]));
            const isHeader = isArray ? (i === 0) : !!row.isHeader;

            return (
              <tr key={i}>
                {cells.map((cell, j) => (
                  isHeader ? 
                    <th key={j} dangerouslySetInnerHTML={{ __html: String(cell ?? '') }} /> : 
                    <td key={j} dangerouslySetInnerHTML={{ __html: String(cell ?? '') }} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// The old huge book-wide number ("21" for the first chapter of the second subject) is gone:
// it counted chapters across every subject in the book. `order` is still accepted so existing
// callers need no change; `part` (the subject name, if the book has several) becomes the eyebrow.
export const ChapterHeader = ({ title, part }) => {
  const cleaned = cleanHeadingContent(title);
  return (
    <header className="bk-chapter-header">
      <div className="bk-chapter-title-wrapper">
        <span className="bk-chapter-eyebrow">{part || 'CHAPTER'}</span>
        <h1 className="bk-chapter-title" dangerouslySetInnerHTML={{ __html: cleaned }} />
      </div>
    </header>
  );
};

export const BookCover = ({ title }) => {
  return (
    <div className="bk-cover">
      <div className="bk-cover-inner">
        <div className="bk-brand">VEERNXT LEARNING</div>
        <h1 className="bk-cover-title">{title}</h1>
      </div>
    </div>
  );
};

// ── AI-ENRICHED BLOCK TYPES ────────────────────────────────────

export const KeyFactsBlock = ({ title = 'Key Facts', items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="bk-keyfacts">
      <div className="bk-keyfacts-header">
        <Star size={16} />
        <span>{title}</span>
      </div>
      <ul className="bk-keyfacts-list">
        {items.map((item, i) => (
          <li key={i}>
            <span className="bk-keyfacts-bullet">{String(i + 1).padStart(2, '0')}</span>
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export const PullQuoteBlock = ({ content }) => (
  <blockquote className="bk-pullquote">
    <span className="bk-pullquote-mark">&ldquo;</span>
    <p dangerouslySetInnerHTML={{ __html: content }} />
  </blockquote>
);

export const ExamAlertBlock = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="bk-exam-alert">
      <div className="bk-exam-alert-header">
        <Zap size={16} />
        <span>EXAM ALERT</span>
      </div>
      <ul className="bk-exam-alert-list">
        {items.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
    </div>
  );
};

export const ComparisonTableBlock = ({ headers, rows }) => {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="bk-table-wrapper bk-comparison-table">
      <table className="bk-table">
        {headers && headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => <th key={i} dangerouslySetInnerHTML={{ __html: h }} />)}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Array.isArray(row) 
                ? row.map((cell, j) => <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />)
                : Object.values(row).map((cell, j) => <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />)
              }
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const STAT_ICONS = {
  mountain: '⛰️', river: '🌊', year: '📅', person: '👤', country: '🌍',
  area: '📐', population: '👥', capital: '🏛️', distance: '📏', default: '📌'
};

export const StatStripBlock = ({ stats }) => {
  if (!stats || stats.length === 0) return null;
  return (
    <div className="bk-stat-strip">
      {stats.map((stat, i) => (
        <div key={i} className="bk-stat-item">
          <span className="bk-stat-icon">{STAT_ICONS[stat.icon] || STAT_ICONS.default}</span>
          <span className="bk-stat-value">{stat.value}</span>
          <span className="bk-stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
};
