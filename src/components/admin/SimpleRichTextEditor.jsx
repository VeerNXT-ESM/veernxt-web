import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, AlignCenter, AlignLeft, AlignRight, List, Heading2, Heading3 } from 'lucide-react';

const SimpleRichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);

  // Sync content with value prop
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    editorRef.current.focus();
    onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="rich-text-container">
      <div className="rich-text-toolbar">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} title="Bold"><Bold size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} title="Italic"><Italic size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} title="Underline"><Underline size={16} /></button>
        
        <div className="toolbar-divider" />
        
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }} title="Align Left"><AlignLeft size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }} title="Align Center"><AlignCenter size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }} title="Align Right"><AlignRight size={16} /></button>
        
        <div className="toolbar-divider" />
        
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} title="Bullet List"><List size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'H2'); }} title="Heading 2"><Heading2 size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'H3'); }} title="Heading 3"><Heading3 size={16} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'P'); }} title="Paragraph" className="txt-btn">P</button>
        
        <div className="toolbar-divider" />
        
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }} title="Clear Formatting" className="txt-btn">Clear</button>
      </div>
      
      <div 
        className="rich-text-editor"
        contentEditable
        ref={editorRef}
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning={true}
      />

      <style>{`
        .rich-text-container {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        
        .rich-text-toolbar {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }
        
        .rich-text-toolbar button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rich-text-toolbar button:hover {
          background: #e2e8f0;
          color: var(--ios-olive, #4B6B32);
        }
        
        .rich-text-toolbar button.txt-btn {
          width: auto;
          padding: 0 0.5rem;
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        .toolbar-divider {
          width: 1px;
          height: 20px;
          background: #cbd5e1;
          margin: 0 0.25rem;
        }
        
        .rich-text-editor {
          min-height: 400px;
          padding: 1rem;
          outline: none;
          overflow-y: auto;
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #0f172a;
        }
        
        /* WYSIWYG Content Styles */
        .rich-text-editor p { margin-bottom: 1em; }
        .rich-text-editor h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
        .rich-text-editor h3 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; }
        .rich-text-editor ul { list-style-type: disc; padding-left: 2em; margin-bottom: 1em; }
        .rich-text-editor li { margin-bottom: 0.25em; }
      `}</style>
    </div>
  );
};

export default SimpleRichTextEditor;
