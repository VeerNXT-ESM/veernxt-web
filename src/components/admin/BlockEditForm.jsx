import { useState } from 'react';
import { ChevronUp, ChevronDown, Copy, Trash2, Plus, X } from 'lucide-react';

// Phase 2 of the book-content-editor plan: one edit form per block type,
// matching the shapes BlockRenderer.jsx already knows how to render (see
// that file's switch for the canonical list). Content fields are edited as
// raw strings, not WYSIWYG -- most of this corpus is plain text, a minority
// carries inline tags like <strong>; a full rich-text editor per field is
// out of scope for what's needed to fix missing/wrong text.
export const BLOCK_TYPE_LABELS = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  image: 'Image',
  important: 'Important',
  examTip: 'Exam Tip',
  definition: 'Definition',
  example: 'Example',
  callout: 'Callout',
  list: 'Bullet List',
  numberedList: 'Numbered List',
  table: 'Table',
  keyFacts: 'Key Facts',
  pullQuote: 'Pull Quote',
  examAlert: 'Exam Alert',
  comparisonTable: 'Comparison Table',
  statStrip: 'Stat Strip',
};

export function genBlockId() {
  return Math.random().toString(36).slice(2, 9);
}

export function createBlock(type) {
  const id = genBlockId();
  switch (type) {
    case 'heading': return { id, type, level: 3, content: '' };
    case 'image': return { id, type, src: '', alt: '', caption: '' };
    case 'list': case 'numberedList': case 'examAlert':
      return { id, type, items: [''] };
    case 'keyFacts': return { id, type, title: 'Key Takeaways', items: [''] };
    case 'table': return { id, type, rows: [{ isHeader: true, cells: ['', ''] }, { isHeader: false, cells: ['', ''] }] };
    case 'comparisonTable': return { id, type, headers: ['', ''], rows: [['', '']] };
    case 'statStrip': return { id, type, stats: [{ label: '', value: '', icon: 'info' }] };
    default: return { id, type, content: '' }; // paragraph, important, examTip, definition, example, callout, pullQuote
  }
}

const fieldStyle = { width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.25rem' };

const TextField = ({ label, value, onChange, placeholder }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    {label && <label style={labelStyle}>{label}</label>}
    <input type="text" style={fieldStyle} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const TextAreaField = ({ label, value, onChange, rows = 3 }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    {label && <label style={labelStyle}>{label}</label>}
    <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const ItemListEditor = ({ items, onChange }) => (
  <div>
    {(items || []).map((item, idx) => (
      <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <input
          type="text" style={fieldStyle} value={item}
          onChange={(e) => { const next = [...items]; next[idx] = e.target.value; onChange(next); }}
        />
        <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} style={iconBtnStyle} title="Remove item">
          <X size={14} />
        </button>
      </div>
    ))}
    <button type="button" onClick={() => onChange([...(items || []), ''])} style={addBtnStyle}>
      <Plus size={13} /> Add item
    </button>
  </div>
);

const iconBtnStyle = { border: '1px solid #e2e8f0', background: 'white', borderRadius: 6, padding: '0.3rem 0.45rem', cursor: 'pointer', color: '#94a3b8', flexShrink: 0 };
const addBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' };

const BlockFields = ({ block, onChange }) => {
  const set = (patch) => onChange({ ...block, ...patch });

  switch (block.type) {
    case 'heading':
      return (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <div style={{ width: 90 }}>
            <label style={labelStyle}>Level</label>
            <select style={fieldStyle} value={block.level || 2} onChange={(e) => set({ level: Number(e.target.value) })}>
              {[2, 3, 4].map((l) => <option key={l} value={l}>H{l}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Heading text</label>
            <input type="text" style={fieldStyle} value={block.content || ''} onChange={(e) => set({ content: e.target.value })} />
          </div>
        </div>
      );

    case 'paragraph': case 'important': case 'examTip': case 'definition': case 'example': case 'callout': case 'pullQuote':
      return <TextAreaField label="Content" value={block.content} onChange={(v) => set({ content: v })} rows={block.type === 'pullQuote' ? 2 : 4} />;

    case 'image':
      return (
        <>
          <TextField label="Image path (src)" value={block.src} placeholder="/books/Guide/BOOK/images/image_xxx.png" onChange={(v) => set({ src: v })} />
          <TextField label="Alt text" value={block.alt} onChange={(v) => set({ alt: v })} />
          <TextField label="Caption" value={block.caption} onChange={(v) => set({ caption: v })} />
        </>
      );

    case 'list': case 'numberedList': case 'examAlert':
      return <ItemListEditor items={block.items || []} onChange={(items) => set({ items })} />;

    case 'keyFacts':
      return (
        <>
          <TextField label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <ItemListEditor items={block.items || []} onChange={(items) => set({ items })} />
        </>
      );

    case 'statStrip': {
      const stats = block.stats || [];
      const updateStat = (idx, patch) => set({ stats: stats.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
      return (
        <div>
          {stats.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
              <input type="text" style={fieldStyle} placeholder="Label" value={s.label || ''} onChange={(e) => updateStat(idx, { label: e.target.value })} />
              <input type="text" style={fieldStyle} placeholder="Value" value={s.value || ''} onChange={(e) => updateStat(idx, { value: e.target.value })} />
              <button type="button" onClick={() => set({ stats: stats.filter((_, i) => i !== idx) })} style={iconBtnStyle} title="Remove stat"><X size={14} /></button>
            </div>
          ))}
          <button type="button" onClick={() => set({ stats: [...stats, { label: '', value: '', icon: 'info' }] })} style={addBtnStyle}><Plus size={13} /> Add stat</button>
        </div>
      );
    }

    case 'table': {
      const rows = block.rows || [];
      const colCount = rows[0]?.cells?.length || 0;
      const updateCell = (rIdx, cIdx, value) => {
        const next = rows.map((r, i) => (i === rIdx ? { ...r, cells: r.cells.map((c, j) => (j === cIdx ? value : c)) } : r));
        set({ rows: next });
      };
      const addRow = () => set({ rows: [...rows, { isHeader: false, cells: Array(colCount).fill('') }] });
      const removeRow = (rIdx) => set({ rows: rows.filter((_, i) => i !== rIdx) });
      const addColumn = () => set({ rows: rows.map((r) => ({ ...r, cells: [...r.cells, ''] })) });
      const removeColumn = (cIdx) => set({ rows: rows.map((r) => ({ ...r, cells: r.cells.filter((_, j) => j !== cIdx) })) });
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {(row.cells || []).map((cell, cIdx) => (
                    <td key={cIdx} style={{ border: '1px solid #e2e8f0', padding: 2 }}>
                      <input
                        type="text"
                        style={{ ...fieldStyle, border: 'none', fontWeight: row.isHeader ? 700 : 400, minWidth: 100 }}
                        value={cell || ''}
                        onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                      />
                    </td>
                  ))}
                  <td style={{ border: 'none', padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => set({ rows: rows.map((r, i) => (i === rIdx ? { ...r, isHeader: !r.isHeader } : r)) })} style={{ ...iconBtnStyle, fontSize: '0.65rem', fontWeight: 700 }} title="Toggle header row">H</button>
                    <button type="button" onClick={() => removeRow(rIdx)} style={{ ...iconBtnStyle, marginLeft: 4 }} title="Remove row"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              <tr>
                {Array.from({ length: colCount }).map((_, cIdx) => (
                  <td key={cIdx} style={{ border: 'none', textAlign: 'center', padding: '2px 0' }}>
                    <button type="button" onClick={() => removeColumn(cIdx)} style={{ ...iconBtnStyle, fontSize: '0.65rem' }} title="Remove column">col ✕</button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={addRow} style={addBtnStyle}><Plus size={13} /> Row</button>
            <button type="button" onClick={addColumn} style={addBtnStyle}><Plus size={13} /> Column</button>
          </div>
        </div>
      );
    }

    case 'comparisonTable': {
      const headers = block.headers || [];
      const rows = block.rows || [];
      const updateHeader = (idx, value) => set({ headers: headers.map((h, i) => (i === idx ? value : h)) });
      const updateCell = (rIdx, cIdx, value) => set({ rows: rows.map((r, i) => (i === rIdx ? r.map((c, j) => (j === cIdx ? value : c)) : r)) });
      const addRow = () => set({ rows: [...rows, Array(headers.length).fill('')] });
      const removeRow = (rIdx) => set({ rows: rows.filter((_, i) => i !== rIdx) });
      const addColumn = () => set({ headers: [...headers, ''], rows: rows.map((r) => [...r, '']) });
      const removeColumn = (cIdx) => set({ headers: headers.filter((_, i) => i !== cIdx), rows: rows.map((r) => r.filter((_, j) => j !== cIdx)) });
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                {headers.map((h, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid #e2e8f0', padding: 2, background: '#f8fafc' }}>
                    <input type="text" style={{ ...fieldStyle, border: 'none', fontWeight: 700, minWidth: 100 }} value={h || ''} onChange={(e) => updateHeader(cIdx, e.target.value)} />
                  </td>
                ))}
                <td style={{ border: 'none' }} />
              </tr>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ border: '1px solid #e2e8f0', padding: 2 }}>
                      <input type="text" style={{ ...fieldStyle, border: 'none', minWidth: 100 }} value={cell || ''} onChange={(e) => updateCell(rIdx, cIdx, e.target.value)} />
                    </td>
                  ))}
                  <td style={{ border: 'none', padding: '2px 4px' }}>
                    <button type="button" onClick={() => removeRow(rIdx)} style={iconBtnStyle} title="Remove row"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              <tr>
                {headers.map((_, cIdx) => (
                  <td key={cIdx} style={{ border: 'none', textAlign: 'center', padding: '2px 0' }}>
                    <button type="button" onClick={() => removeColumn(cIdx)} style={{ ...iconBtnStyle, fontSize: '0.65rem' }} title="Remove column">col ✕</button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={addRow} style={addBtnStyle}><Plus size={13} /> Row</button>
            <button type="button" onClick={addColumn} style={addBtnStyle}><Plus size={13} /> Column</button>
          </div>
        </div>
      );
    }

    default:
      return <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No editor for block type "{block.type}" yet.</p>;
  }
};

export const BlockTypePicker = ({ onPick, onCancel }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.5rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
    {Object.entries(BLOCK_TYPE_LABELS).map(([type, label]) => (
      <button
        key={type} type="button" onClick={() => onPick(type)}
        style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#334155', cursor: 'pointer' }}
      >
        {label}
      </button>
    ))}
    {onCancel && <button type="button" onClick={onCancel} style={{ ...iconBtnStyle, marginLeft: 'auto' }}><X size={14} /></button>}
  </div>
);

const BlockEditForm = ({ block, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, onInsertAfter, canMoveUp, canMoveDown }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.85rem', marginBottom: '0.6rem', background: '#fbfcfd' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b6b32', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#eef2eb', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
          {BLOCK_TYPE_LABELS[block.type] || block.type}
        </span>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button type="button" style={iconBtnStyle} disabled={!canMoveUp} onClick={onMoveUp} title="Move up"><ChevronUp size={14} /></button>
          <button type="button" style={iconBtnStyle} disabled={!canMoveDown} onClick={onMoveDown} title="Move down"><ChevronDown size={14} /></button>
          <button type="button" style={iconBtnStyle} onClick={onDuplicate} title="Duplicate block"><Copy size={14} /></button>
          <button type="button" style={{ ...iconBtnStyle, color: '#dc2626' }} onClick={onDelete} title="Delete block"><Trash2 size={14} /></button>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} />
      <div style={{ marginTop: '0.6rem' }}>
        {pickerOpen ? (
          <BlockTypePicker onPick={(type) => { onInsertAfter(type); setPickerOpen(false); }} onCancel={() => setPickerOpen(false)} />
        ) : (
          <button type="button" onClick={() => setPickerOpen(true)} style={{ ...addBtnStyle, fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}>
            <Plus size={12} /> Insert block below
          </button>
        )}
      </div>
    </div>
  );
};

export default BlockEditForm;
