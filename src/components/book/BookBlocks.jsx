import React from 'react';
import { Info, AlertTriangle, Lightbulb, BookOpen, Star, Zap, TrendingUp } from 'lucide-react';
import './BookBlocks.css';

export const ParagraphBlock = ({ content }) => {
  return <div className="bk-paragraph" dangerouslySetInnerHTML={{ __html: content }} />;
};

export const HeadingBlock = ({ level, content }) => {
  const Tag = `h${level}`;
  return <Tag className={`bk-heading bk-h${level}`}>{content}</Tag>;
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

export const NumberedListBlock = ({ items }) => {
  return (
    <ol className="bk-numbered-list">
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
          {rows.map((row, i) => (
            <tr key={i}>
              {row.cells.map((cell, j) => (
                row.isHeader ? 
                  <th key={j} dangerouslySetInnerHTML={{ __html: cell }} /> : 
                  <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ChapterHeader = ({ title, order }) => {
  return (
    <header className="bk-chapter-header">
      <div className="bk-chapter-number-huge">{String(order).padStart(2, '0')}</div>
      <div className="bk-chapter-title-wrapper">
        <span className="bk-chapter-eyebrow">CHAPTER</span>
        <h1 className="bk-chapter-title">{title}</h1>
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
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const PullQuoteBlock = ({ content }) => (
  <blockquote className="bk-pullquote">
    <span className="bk-pullquote-mark">&ldquo;</span>
    <p>{content}</p>
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
          <li key={i}>{item}</li>
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
              {headers.map((h, i) => <th key={i}>{h}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Array.isArray(row) 
                ? row.map((cell, j) => <td key={j}>{cell}</td>)
                : Object.values(row).map((cell, j) => <td key={j}>{cell}</td>)
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
