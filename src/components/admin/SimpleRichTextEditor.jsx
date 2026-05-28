import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Heading2, Heading3, Heading4, Quote, Link, Image, 
  Table, Palette, Highlighter, Undo, Redo, Minus, Code, Type, Check, X
} from 'lucide-react';

const SimpleRichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const [isSourceView, setIsSourceView] = useState(false);
  const isEditing = useRef(false);
  const blurTimeoutRef = useRef(null);
  
  // Dropdown / Dialog states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'textColor', 'bgColor', 'table', 'link', 'image'
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Track what we last wrote to innerHTML so we don't re-write the same value
  const lastSyncedValue = useRef(null);

  // Sync content with value prop — but NEVER while user is actively editing.
  // This handles: initial data load, async Supabase fetch, source→visual toggle.
  useEffect(() => {
    if (isSourceView) return;
    if (!editorRef.current) return;
    if (isEditing.current) return;

    // Only set innerHTML when the value actually changed from outside
    // (parent state update from Supabase fetch, chapter switch, etc.)
    if (value !== lastSyncedValue.current) {
      editorRef.current.innerHTML = value || '';
      lastSyncedValue.current = value;
    }
  }, [value, isSourceView]);

  // When switching from source view back to visual, always re-sync
  useEffect(() => {
    if (!isSourceView && editorRef.current) {
      editorRef.current.innerHTML = value || '';
      lastSyncedValue.current = value;
    }
  }, [isSourceView]);

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      const html = editorRef.current.innerHTML;
      lastSyncedValue.current = html;
      onChange(html);
    }
    setActiveDropdown(null);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastSyncedValue.current = html; // Prevent useEffect from re-overwriting this
      onChange(html);
    }
  };

  const handleEditorFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    isEditing.current = true;
  };

  const handleEditorBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      isEditing.current = false;
      blurTimeoutRef.current = null;
    }, 200);
    // Capture final content on blur
    handleInput();
  };


  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Color options
  const textColors = [
    { name: 'Slate', value: '#0f172a' },
    { name: 'Olive Green', value: '#1F3A2E' },
    { name: 'Muted Gray', value: '#64748b' },
    { name: 'Bright Red', value: '#ef4444' },
    { name: 'Ocean Blue', value: '#3b82f6' },
    { name: 'Emerald Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#f97316' }
  ];

  const bgColors = [
    { name: 'Yellow Highlight', value: '#fef08a' },
    { name: 'Soft Green', value: '#bbf7d0' },
    { name: 'Soft Blue', value: '#bfdbfe' },
    { name: 'Soft Red', value: '#fecaca' },
    { name: 'Soft Purple', value: '#e9d5ff' },
    { name: 'Light Gray', value: '#f1f5f9' }
  ];

  // custom insertion functions
  const insertLink = (e) => {
    e.preventDefault();
    if (!linkUrl) return;
    
    // If text is highlighted, we can create link directly. 
    // Otherwise, we insert anchor with the link text
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      exec('createLink', linkUrl);
    } else {
      const displayTxt = linkText || linkUrl;
      const anchorHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #4B6B32; text-decoration: underline; font-weight: 600;">${displayTxt}</a>`;
      exec('insertHTML', anchorHtml);
    }
    
    setLinkUrl('');
    setLinkText('');
    setActiveDropdown(null);
  };

  const insertImage = (e) => {
    e.preventDefault();
    if (!imageUrl) return;
    const imgHtml = `<img src="${imageUrl}" alt="${imageAlt || 'Course Image'}" style="max-width: 100%; border-radius: 12px; margin: 1rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" />`;
    exec('insertHTML', imgHtml);
    setImageUrl('');
    setImageAlt('');
    setActiveDropdown(null);
  };

  const insertTable = (e) => {
    e.preventDefault();
    const rows = Math.max(1, Math.min(20, tableRows));
    const cols = Math.max(1, Math.min(20, tableCols));
    
    let tableHtml = `<table class="wysiwyg-table" style="width:100%; border-collapse:collapse; margin:1.5rem 0; border:1px solid #e2e8f0; font-size:0.9rem; border-radius:12px; overflow:hidden;">`;
    
    // Header
    tableHtml += `<thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0;"><tr>`;
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th style="border:1px solid #e2e8f0; padding:10px 14px; font-weight:700; text-align:left; color:#1e293b;">Header ${c + 1}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    
    // Body Rows
    for (let r = 0; r < rows; r++) {
      const isEven = r % 2 === 1;
      const bg = isEven ? '#f8fafc' : '#ffffff';
      tableHtml += `<tr style="background:${bg};">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="border:1px solid #e2e8f0; padding:10px 14px; color:#475569;">Cell Data</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p></p>`;
    
    exec('insertHTML', tableHtml);
    setActiveDropdown(null);
  };

  // Close dropdowns on escape or outer click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveDropdown(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="rich-text-container">
      <div className="rich-text-toolbar">
        {/* Undo/Redo */}
        <div className="toolbar-group">
          <button type="button" disabled={isSourceView} onClick={() => exec('undo')} title="Undo"><Undo size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('redo')} title="Redo"><Redo size={15} /></button>
        </div>

        <div className="toolbar-divider" />

        {/* Text Formats */}
        <div className="toolbar-group">
          <button type="button" disabled={isSourceView} onClick={() => exec('bold')} title="Bold"><Bold size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('italic')} title="Italic"><Italic size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('underline')} title="Underline"><Underline size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('strikeThrough')} title="Strikethrough" style={{ textDecoration: 'line-through', fontWeight: 'bold' }}>ab</button>
        </div>

        <div className="toolbar-divider" />

        {/* Headers */}
        <div className="toolbar-group">
          <button type="button" disabled={isSourceView} onClick={() => exec('formatBlock', 'H2')} title="Heading 2"><Heading2 size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('formatBlock', 'H3')} title="Heading 3"><Heading3 size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('formatBlock', 'H4')} title="Heading 4"><Heading4 size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('formatBlock', 'P')} title="Paragraph" className="txt-btn"><Type size={14} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('formatBlock', 'blockquote')} title="Blockquote"><Quote size={14} /></button>
        </div>

        <div className="toolbar-divider" />

        {/* Lists & Alignment */}
        <div className="toolbar-group">
          <button type="button" disabled={isSourceView} onClick={() => exec('insertUnorderedList')} title="Bullet List"><List size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('justifyRight')} title="Align Right"><AlignRight size={15} /></button>
          <button type="button" disabled={isSourceView} onClick={() => exec('justifyFull')} title="Justify"><AlignJustify size={15} /></button>
        </div>

        <div className="toolbar-divider" />

        {/* Color pickers */}
        <div className="toolbar-group dropdown-trigger">
          <button type="button" disabled={isSourceView} onClick={() => toggleDropdown('textColor')} title="Text Color" className={activeDropdown === 'textColor' ? 'active' : ''}>
            <Palette size={15} />
          </button>
          {activeDropdown === 'textColor' && (
            <div className="toolbar-dropdown grid-colors">
              {textColors.map(color => (
                <button 
                  key={color.value} 
                  type="button" 
                  onClick={() => exec('foreColor', color.value)}
                  style={{ background: color.value }}
                  title={color.name}
                  className="color-swatch"
                />
              ))}
            </div>
          )}

          <button type="button" disabled={isSourceView} onClick={() => toggleDropdown('bgColor')} title="Highlight Color" className={activeDropdown === 'bgColor' ? 'active' : ''}>
            <Highlighter size={15} />
          </button>
          {activeDropdown === 'bgColor' && (
            <div className="toolbar-dropdown grid-colors">
              {bgColors.map(color => (
                <button 
                  key={color.value} 
                  type="button" 
                  onClick={() => exec('backColor', color.value)}
                  style={{ background: color.value }}
                  title={color.name}
                  className="color-swatch"
                />
              ))}
              <button 
                type="button" 
                onClick={() => exec('backColor', '#ffffff')}
                title="Clear Highlight"
                className="color-swatch clear-swatch"
              ><X size={12} /></button>
            </div>
          )}
        </div>

        <div className="toolbar-divider" />

        {/* Insertions */}
        <div className="toolbar-group dropdown-trigger">
          <button type="button" disabled={isSourceView} onClick={() => exec('insertHorizontalRule')} title="Horizontal Line"><Minus size={15} /></button>
          
          <button type="button" disabled={isSourceView} onClick={() => toggleDropdown('link')} title="Insert Link" className={activeDropdown === 'link' ? 'active' : ''}>
            <Link size={15} />
          </button>
          {activeDropdown === 'link' && (
            <form onSubmit={insertLink} className="toolbar-dropdown form-dropdown">
              <h4>Insert Link</h4>
              <input 
                type="text" 
                placeholder="Link Text (optional)" 
                value={linkText} 
                onChange={e => setLinkText(e.target.value)} 
              />
              <input 
                type="url" 
                placeholder="https://..." 
                value={linkUrl} 
                onChange={e => setLinkUrl(e.target.value)} 
                required 
              />
              <div className="form-actions">
                <button type="submit" className="btn-small">Insert</button>
              </div>
            </form>
          )}

          <button type="button" disabled={isSourceView} onClick={() => toggleDropdown('image')} title="Insert Image" className={activeDropdown === 'image' ? 'active' : ''}>
            <Image size={15} />
          </button>
          {activeDropdown === 'image' && (
            <form onSubmit={insertImage} className="toolbar-dropdown form-dropdown">
              <h4>Insert Image</h4>
              <input 
                type="url" 
                placeholder="Image URL" 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)} 
                required 
              />
              <input 
                type="text" 
                placeholder="Alt Text" 
                value={imageAlt} 
                onChange={e => setImageAlt(e.target.value)} 
              />
              <div className="form-actions">
                <button type="submit" className="btn-small">Insert</button>
              </div>
            </form>
          )}

          <button type="button" disabled={isSourceView} onClick={() => toggleDropdown('table')} title="Insert Styled Table" className={activeDropdown === 'table' ? 'active' : ''}>
            <Table size={15} />
          </button>
          {activeDropdown === 'table' && (
            <form onSubmit={insertTable} className="toolbar-dropdown form-dropdown">
              <h4>Insert Table</h4>
              <div className="row-inputs">
                <label>
                  <span>Rows</span>
                  <input type="number" min="1" max="15" value={tableRows} onChange={e => setTableRows(parseInt(e.target.value) || 3)} />
                </label>
                <label>
                  <span>Cols</span>
                  <input type="number" min="1" max="15" value={tableCols} onChange={e => setTableCols(parseInt(e.target.value) || 3)} />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-small">Generate</button>
              </div>
            </form>
          )}
        </div>

        {/* Clear formatting / Toggle Source */}
        <div className="toolbar-group utils-group">
          <button type="button" disabled={isSourceView} onClick={() => exec('removeFormat')} title="Clear Formatting"><X size={15} /></button>
          <button 
            type="button" 
            onClick={() => setIsSourceView(!isSourceView)} 
            className={`source-toggle-btn ${isSourceView ? 'active-source' : ''}`}
            title="Toggle HTML Source Editor"
          >
            <Code size={15} style={{ marginRight: '4px' }} />
            <span>{isSourceView ? 'Visual' : 'HTML'}</span>
          </button>
        </div>
      </div>
      
      {isSourceView ? (
        <textarea
          className="rich-text-source-editor"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste or write raw HTML code here..."
        />
      ) : (
        <div 
          className="rich-text-editor"
          contentEditable
          ref={editorRef}
          onInput={handleInput}
          onBlur={handleEditorBlur}
          onFocus={handleEditorFocus}
          suppressContentEditableWarning={true}
          placeholder="Start writing and formatting textbook contents here..."
        />
      )}

      {/* Editor footer */}
      <div className="rich-text-footer">
        <div className="editor-status-item">
          <strong>Mode:</strong> {isSourceView ? 'HTML Source Code' : 'Visual WYSIWYG'}
        </div>
        <div className="editor-status-item">
          <strong>Word Count:</strong> {((value || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length)}
        </div>
      </div>

      <style>{`
        .rich-text-container {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          background: white;
          display: flex;
          flex-direction: column;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
        }
        
        .rich-text-toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          position: relative;
        }

        .dropdown-trigger {
          position: relative;
        }
        
        .rich-text-toolbar button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 8px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rich-text-toolbar button:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1F3A2E;
        }

        .rich-text-toolbar button.active {
          background: #1F3A2E;
          color: white;
        }

        .rich-text-toolbar button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .toolbar-divider {
          width: 1px;
          height: 20px;
          background: #cbd5e1;
          margin: 0 0.15rem;
        }

        /* Dropdowns & Forms inside toolbar */
        .toolbar-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 100;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          margin-top: 8px;
          padding: 0.75rem;
          min-width: 180px;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .grid-colors {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          min-width: auto;
          width: 140px;
        }

        .color-swatch {
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          padding: 0 !important;
        }

        .clear-swatch {
          background: #fff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #64748b !important;
        }

        .form-dropdown {
          width: 260px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-dropdown h4 {
          font-size: 0.8rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
          text-transform: uppercase;
        }

        .form-dropdown input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.8rem;
          outline: none;
        }

        .form-dropdown input:focus {
          border-color: #1F3A2E;
        }

        .row-inputs {
          display: flex;
          gap: 0.5rem;
        }

        .row-inputs label {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .btn-small {
          background: #1F3A2E;
          color: white;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .utils-group {
          margin-left: auto;
          gap: 0.5rem;
        }

        .source-toggle-btn {
          width: auto !important;
          padding: 0 10px !important;
          background: #f1f5f9 !important;
          font-weight: 700;
          font-size: 0.75rem;
          border: 1px solid #e2e8f0 !important;
        }

        .active-source {
          background: #dc2626 !important;
          color: white !important;
          border-color: #b91c1c !important;
        }
        
        .rich-text-editor, .rich-text-source-editor {
          min-height: 450px;
          padding: 1.5rem;
          outline: none;
          overflow-y: auto;
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.7;
          color: #0f172a;
          background: white;
          border: none;
        }

        .rich-text-source-editor {
          font-family: 'Fira Code', 'Courier New', Courier, monospace;
          font-size: 0.85rem;
          background: #0f172a;
          color: #e2e8f0;
          resize: vertical;
          width: 100%;
          box-sizing: border-box;
          line-height: 1.5;
        }
        
        .rich-text-footer {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 0.75rem;
          color: #64748b;
        }

        .editor-status-item strong {
          color: #334155;
        }

        /* WYSIWYG Content Styles inside visual editor */
        .rich-text-editor p { margin-bottom: 1.25em; }
        .rich-text-editor h2 { font-size: 1.6em; font-weight: 800; margin: 1.5em 0 0.5em 0; color: #0f172a; }
        .rich-text-editor h3 { font-size: 1.3em; font-weight: 700; margin: 1.2em 0 0.5em 0; color: #1e293b; }
        .rich-text-editor h4 { font-size: 1.1em; font-weight: 700; margin: 1.2em 0 0.5em 0; color: #334155; }
        .rich-text-editor ul { list-style-type: disc; padding-left: 2em; margin-bottom: 1.25em; }
        .rich-text-editor ol { list-style-type: decimal; padding-left: 2em; margin-bottom: 1.25em; }
        .rich-text-editor li { margin-bottom: 0.4em; }
        .rich-text-editor blockquote { 
          border-left: 4px solid #1F3A2E; 
          padding: 0.5rem 1.2rem; 
          margin: 1.25em 0; 
          background: #f8fafc; 
          color: #475569;
          font-style: italic;
          border-radius: 0 8px 8px 0;
        }
        .rich-text-editor hr {
          border: 0;
          height: 1px;
          background: #e2e8f0;
          margin: 1.5rem 0;
        }
      `}</style>
    </div>
  );
};

export default SimpleRichTextEditor;
