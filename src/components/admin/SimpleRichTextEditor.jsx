import React, { useState, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const fullModules = {
  toolbar: [
    [{ 'header': [2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ],
  table: true
};

const compactModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    ['link', 'image', 'clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'align',
  'blockquote', 'code-block',
  'link', 'image', 'script',
  'table'
];

const SimpleRichTextEditor = ({ value, onChange, compact = false }) => {
  const [debugHtml, setDebugHtml] = useState('');

  const handleChange = useCallback((content) => {
    setDebugHtml(content);
    onChange(content);
  }, [onChange]);

  return (
    <div className={`rich-text-container ${compact ? 'compact-mode' : ''}`}>
      <ReactQuill 
        theme="snow"
        value={value || ''} 
        onChange={handleChange}
        modules={compact ? compactModules : fullModules}
        formats={formats}
        placeholder={compact ? "Option text..." : "Start writing and formatting contents here..."}
        className="custom-quill-editor"
      />
      
      {!compact && (
        <>
          <div className="rich-text-footer">
            <div className="editor-status-item">
              <strong>Mode:</strong> Visual WYSIWYG
            </div>
            <div className="editor-status-item">
              <strong>Word Count:</strong> {((value || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length)}
            </div>
          </div>
          <details style={{ padding: '0.5rem 1rem', background: '#1e293b', color: '#22d3ee', fontSize: '0.7rem', fontFamily: 'monospace', maxHeight: '120px', overflow: 'auto' }}>
            <summary style={{ cursor: 'pointer', color: '#fbbf24', fontWeight: 'bold' }}>🔍 DEBUG: Raw HTML being saved (click to expand)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem' }}>{debugHtml || value || '(empty)'}</pre>
          </details>
        </>
      )}

      <style>{`
        .rich-text-container {
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: ${compact ? '12px' : '18px'};
          overflow: hidden;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          width: 100%;
          box-shadow: 0 8px 32px rgba(31, 38, 135, 0.05);
        }

        .custom-quill-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.75rem;
          border-radius: ${compact ? '12px 12px 0 0' : '18px 18px 0 0'};
        }
        
        .custom-quill-editor .ql-toolbar .ql-formats {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 8px;
          padding: 2px;
          margin-right: 8px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }

        .custom-quill-editor .ql-toolbar button {
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .custom-quill-editor .ql-toolbar button:hover {
          background: rgba(75, 107, 50, 0.1);
        }
        .custom-quill-editor .ql-toolbar button.ql-active {
          background: rgba(75, 107, 50, 0.2);
        }

        .custom-quill-editor .ql-container {
          border: none;
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.7;
          color: #0f172a;
          background: rgba(255, 255, 255, 0.85);
        }
        
        .custom-quill-editor .ql-editor {
          min-height: ${compact ? '80px' : '150px'};
        }

        .rich-text-footer {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          color: #64748b;
        }

        .editor-status-item strong {
          color: #334155;
        }
        
        /* Apply VeerNXT styles inside the quill editor for accuracy */
        .ql-editor p { margin-bottom: 1.25em; }
        .ql-editor img { max-width: 100%; height: auto; }
        .ql-editor h2 { font-size: 1.6em; font-weight: 800; margin: 1.5em 0 0.5em 0; color: #0f172a; }
        .ql-editor h3 { font-size: 1.3em; font-weight: 700; margin: 1.2em 0 0.5em 0; color: #1e293b; }
        .ql-editor h4 { font-size: 1.1em; font-weight: 700; margin: 1.2em 0 0.5em 0; color: #334155; }
        .ql-editor blockquote { 
          border-left: 4px solid #1F3A2E; 
          padding: 0.5rem 1.2rem; 
          margin: 1.25em 0; 
          background: #f8fafc; 
          color: #475569;
          font-style: italic;
          border-radius: 0 8px 8px 0;
        }
        .ql-editor table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 1.5em 0; 
          display: block;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .ql-editor th, .ql-editor td { 
          border: 1px solid #cbd5e1; 
          padding: 0.75rem 1.25rem; 
          text-align: left; 
          word-break: normal;
          overflow-wrap: normal;
          min-width: 120px;
        }
        .ql-editor th { 
          background-color: #f1f5f9; 
          font-weight: 600; 
          color: #0f172a; 
        }
      `}</style>
    </div>
  );
};

export default SimpleRichTextEditor;

