import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Image as ImageIcon, ExternalLink, Trash2, Upload, RefreshCw } from 'lucide-react';
import SimpleRichTextEditor from '../../components/admin/SimpleRichTextEditor';

const AdminContentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    exam_name: '',
    subject: '',
    category: 'Guide',
    conducting_body: '',
    website_url: '',
    body_html: '',
    thumbnail_url: '',
    is_freemium: false
  });
  const [isMultiChapter, setIsMultiChapter] = useState(false);
  const [chapters, setChapters] = useState([{ id: 1, title: 'Chapter 1', content: '' }]);
  const [activeChapterId, setActiveChapterId] = useState(1);

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) { navigate('/admin/login'); return; }
    if (id) fetchResource();
  }, [id, navigate]);

  const fetchResource = async () => {
    const { data, error } = await supabase.from('resources').select('*').eq('id', id).single();
    if (data) {
      updateFormData(data);
      try {
        if (data.body_html && data.body_html.trim().startsWith('[')) {
          const parsed = JSON.parse(data.body_html);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIsMultiChapter(true);
            updateChapters(parsed);
            setActiveChapterId(parsed[0].id);
          }
        }
      } catch (e) {
        // Leave as single page
      }
    }
  };

  const formDataRef = useRef(formData);
  const chaptersRef = useRef(chapters);

  const updateFormData = (update) => {
    if (typeof update === 'function') {
      setFormData(prev => {
        const next = update(prev);
        formDataRef.current = next;
        return next;
      });
      formDataRef.current = update(formDataRef.current);
    } else {
      setFormData(prev => {
        const next = { ...prev, ...update };
        formDataRef.current = next;
        return next;
      });
      formDataRef.current = { ...formDataRef.current, ...update };
    }
  };

  const updateChapters = (update) => {
    if (typeof update === 'function') {
      setChapters(prev => {
        const next = update(prev);
        chaptersRef.current = next;
        return next;
      });
      chaptersRef.current = update(chaptersRef.current);
    } else {
      setChapters(prev => {
        const next = update;
        chaptersRef.current = next;
        return next;
      });
      chaptersRef.current = update;
    }
  };

  const handleSave = async (silent = false) => {
    setLoading(true);
    try {
      const latestFormData = formDataRef.current;
      const latestChapters = chaptersRef.current;

      // Only include writable columns — exclude generated/read-only fields
      const dataToSave = {
        title: latestFormData.title,
        exam_name: latestFormData.exam_name,
        subject: latestFormData.subject,
        category: latestFormData.category,
        conducting_body: latestFormData.conducting_body,
        website_url: latestFormData.website_url,
        body_html: isMultiChapter ? JSON.stringify(latestChapters) : latestFormData.body_html,
        thumbnail_url: latestFormData.thumbnail_url,
        is_freemium: latestFormData.is_freemium,
      };

      console.log('[DEBUG SAVE] body_html snippet:', dataToSave.body_html?.substring(0, 300));
      console.log('[DEBUG SAVE] fields being saved:', Object.keys(dataToSave));

      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          dataToSave
        }),
      });

      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save resource');
      }

      const { data } = responseData;

      // Detect silent RLS rejection (shouldn't happen with service role, but good sanity check)
      if (!data || data.length === 0) {
        console.error('[DEBUG SAVE] Supabase returned empty data — update was silently rejected (likely RLS)');
        if (!silent) alert('Warning: Save may not have persisted. Check Supabase RLS policies on the resources table.');
        return false;
      }

      console.log('[DEBUG SAVE] Supabase returned data:', data?.[0]?.body_html?.substring(0, 300));
      if (!silent) alert('Content saved successfully!');
      
      if (!id && data && data.length > 0) {
        navigate(`/admin/content/${data[0].id}`, { replace: true });
      }
      return true;
    } catch (err) {
      alert('Error saving content: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Auto-save then preview
  const handlePreview = async () => {
    const saved = await handleSave(true);
    if (saved) {
      window.open(`/reader/${id}`, '_blank');
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `thumb_${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        updateFormData(prev => ({ ...prev, thumbnail_url: urlData.publicUrl }));
      }
    } catch (err) {
      console.error('Thumbnail upload error:', err);
      alert('Upload failed: ' + err.message + '\nYou can paste a URL manually instead.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="editor-page-wrapper">
      {/* Editor Header */}
      <div className="editor-top-bar">
        <button onClick={() => navigate('/admin')} className="btn-back-text">
          <ArrowLeft size={18} /> Dashboard
        </button>
        <div className="header-text">
          <h1>{id ? 'Edit Resource' : 'New Resource'}</h1>
        </div>
        <div className="header-actions">
          {id && (
            <button 
              onClick={handlePreview} 
              className="btn-outline-editor"
              disabled={loading}
            >
              <ExternalLink size={16} /> {loading ? 'Saving...' : 'Preview in App'}
            </button>
          )}
          <button onClick={handleSave} className="btn-save" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving...' : 'Save Content'}
          </button>
        </div>
      </div>

      {/* Main Layout: Editor (left) + Sidebar (right) */}
      <div className="editor-layout">

        {/* LEFT: Content Page Area */}
        <div className="editor-main-area">
          <div className="content-page-card">
            <div className="content-header">
              <div>
                <h3>Content</h3>
                <p className="hint">Choose whether this is a single page or a multi-chapter textbook.</p>
              </div>
              <div className="mode-toggle">
                <button 
                  className={!isMultiChapter ? 'active' : ''} 
                  onClick={() => setIsMultiChapter(false)}
                >Single Page</button>
                <button 
                  className={isMultiChapter ? 'active' : ''} 
                  onClick={() => {
                    if (!isMultiChapter && formData.body_html && chaptersRef.current.length === 1 && !chaptersRef.current[0].content) {
                      const newChapters = [{ id: Date.now(), title: 'Chapter 1', content: formData.body_html }];
                      updateChapters(newChapters);
                      setActiveChapterId(newChapters[0].id);
                    }
                    setIsMultiChapter(true);
                  }}
                >Textbook / Chapters</button>
              </div>
            </div>

            {isMultiChapter ? (
              <div className="chapter-manager">
                <div className="chapter-sidebar">
                  <div className="chapter-list">
                    {chapters.map((chap, idx) => (
                      <div 
                        key={chap.id} 
                        className={`chapter-item ${activeChapterId === chap.id ? 'active' : ''}`}
                        onClick={() => setActiveChapterId(chap.id)}
                      >
                        <div className="chap-num">{idx + 1}</div>
                        <input 
                          type="text" 
                          value={chap.title}
                          onChange={(e) => {
                            const newChaps = [...chaptersRef.current];
                            newChaps[idx].title = e.target.value;
                            updateChapters(newChaps);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button 
                          className="btn-del-chap"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chaptersRef.current.length > 1) {
                              const newChaps = chaptersRef.current.filter(c => c.id !== chap.id);
                              updateChapters(newChaps);
                              if (activeChapterId === chap.id) setActiveChapterId(newChaps[0].id);
                            }
                          }}
                        ><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn-add-chap"
                    onClick={() => {
                      const newId = Date.now();
                      const currentChaps = chaptersRef.current;
                      updateChapters([...currentChaps, { id: newId, title: `Chapter ${currentChaps.length + 1}`, content: '' }]);
                      setActiveChapterId(newId);
                    }}
                  >+ Add Chapter</button>
                </div>
                <div className="chapter-editor">
                  {chaptersRef.current.find(c => c.id === activeChapterId) && (
                    <SimpleRichTextEditor 
                      key={activeChapterId}
                      value={chaptersRef.current.find(c => c.id === activeChapterId).content}
                      onChange={(val) => {
                        const newChaps = chaptersRef.current.map(c => 
                          c.id === activeChapterId ? { ...c, content: val } : c
                        );
                        updateChapters(newChaps);
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <SimpleRichTextEditor 
                value={formData.body_html}
                onChange={(val) => updateFormData(prev => ({...prev, body_html: val}))}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Sidebar — Media + Metadata */}
        <div className="editor-sidebar">

          {/* Thumbnail Card */}
          <div className="sidebar-card">
            <h4>Media & Thumbnail</h4>
            <div className="thumb-preview-portrait">
              {formData.thumbnail_url ? (
                <img src={formData.thumbnail_url} alt="Thumbnail Preview" />
              ) : (
                <div className="no-thumb">
                  <ImageIcon size={40} />
                  <span>No thumbnail</span>
                </div>
              )}
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleThumbnailUpload}
            />
            <button 
              className="btn-upload-thumb"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><RefreshCw size={14} className="spin-icon" /> Uploading...</>
              ) : (
                <><Upload size={14} /> Replace Thumbnail</>
              )}
            </button>

            <div className="sidebar-field" style={{ marginTop: '0.75rem' }}>
              <label>Or paste URL</label>
              <input 
                type="text" 
                placeholder="Paste image URL..." 
                value={formData.thumbnail_url}
                onChange={e => updateFormData(prev => ({...prev, thumbnail_url: e.target.value}))}
              />
            </div>

            <div className="sidebar-toggle">
              <input 
                type="checkbox" 
                id="freemium"
                checked={formData.is_freemium}
                onChange={e => updateFormData(prev => ({...prev, is_freemium: e.target.checked}))}
              />
              <label htmlFor="freemium">Mark as Free Content</label>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="sidebar-card">
            <h4>Title & Metadata</h4>

            <div className="sidebar-field">
              <label>Resource Title</label>
              <input 
                type="text" 
                placeholder="e.g. English Grammar Guide" 
                value={formData.title}
                onChange={e => updateFormData(prev => ({...prev, title: e.target.value}))}
              />
            </div>

            <div className="sidebar-field">
              <label>Category</label>
              <select 
                value={formData.category}
                onChange={e => updateFormData(prev => ({...prev, category: e.target.value}))}
              >
                <option value="Intro">Intro</option>
                <option value="Precis">Precis</option>
                <option value="Guide">Guide Book</option>
              </select>
            </div>

            <div className="sidebar-field">
              <label>Exam Name</label>
              <input 
                type="text" 
                placeholder="e.g. SSC CGL" 
                value={formData.exam_name}
                onChange={e => updateFormData(prev => ({...prev, exam_name: e.target.value}))}
              />
            </div>

            <div className="sidebar-field">
              <label>Subject</label>
              <input 
                type="text" 
                placeholder="e.g. English" 
                value={formData.subject}
                onChange={e => updateFormData(prev => ({...prev, subject: e.target.value}))}
              />
            </div>

            <div className="sidebar-field">
              <label>Conducting Body</label>
              <input 
                type="text" 
                placeholder="e.g. Staff Selection Commission" 
                value={formData.conducting_body}
                onChange={e => updateFormData(prev => ({...prev, conducting_body: e.target.value}))}
              />
            </div>

            <div className="sidebar-field">
              <label>Website URL (Optional)</label>
              <input 
                type="text" 
                placeholder="https://..." 
                value={formData.website_url}
                onChange={e => updateFormData(prev => ({...prev, website_url: e.target.value}))}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .editor-page-wrapper {
          min-height: 100vh;
          background: #f4f5f7;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* ============ TOP BAR ============ */
        .editor-top-bar {
          display: flex;
          align-items: center;
          padding: 1rem 2rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 50;
          gap: 1rem;
        }

        .btn-back-text {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: none;
          color: #64748b;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: color 0.2s;
          padding: 0.5rem 0;
          white-space: nowrap;
        }
        .btn-back-text:hover { color: #4b6b32; }

        .header-text {
          flex: 1;
        }
        .header-text h1 {
          font-size: 1.2rem;
          color: #0f172a;
          margin: 0;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .btn-outline-editor {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1.15rem;
          background: white;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline-editor:hover { background: #f8fafc; color: #4b6b32; border-color: #cbd5e1; }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1.5rem;
          background: #1F3A2E;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-save:hover { opacity: 0.9; }
        .btn-save:disabled { background: #cbd5e1; cursor: not-allowed; }

        /* ============ LAYOUT: EDITOR + SIDEBAR ============ */
        .editor-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 0;
          max-width: 100%;
          min-height: calc(100vh - 60px);
        }

        /* LEFT: Main editor page area */
        .editor-main-area {
          padding: 2rem;
          background: #eef0f2;
          overflow-y: auto;
        }

        .content-page-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 2px 20px rgba(0,0,0,0.04);
          border: 1px solid #e8eaed;
          min-height: 600px;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }
        .content-header h3 {
          font-size: 1.05rem;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
          font-weight: 800;
        }
        .hint {
          font-size: 0.78rem;
          color: #94a3b8;
          margin: 0;
        }

        .mode-toggle {
          display: flex;
          background: #f1f5f9;
          padding: 0.2rem;
          border-radius: 10px;
        }
        .mode-toggle button {
          padding: 0.4rem 0.85rem;
          border: none;
          background: transparent;
          border-radius: 7px;
          font-weight: 600;
          font-size: 0.8rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mode-toggle button.active {
          background: white;
          color: #4b6b32;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        /* ============ RIGHT SIDEBAR ============ */
        .editor-sidebar {
          background: white;
          border-left: 1px solid #e2e8f0;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sidebar-card {
          text-align: left;
        }
        .sidebar-card h4 {
          font-size: 0.82rem;
          font-weight: 800;
          color: #1F3A2E;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0 0 1rem 0;
          padding-bottom: 0.6rem;
          border-bottom: 2px solid #eef2eb;
        }

        .sidebar-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.85rem;
        }
        .sidebar-field label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
        }
        .sidebar-field input,
        .sidebar-field select {
          padding: 0.6rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          outline: none;
          font-size: 0.85rem;
          transition: border 0.2s;
          background: #fafbfc;
        }
        .sidebar-field input:focus,
        .sidebar-field select:focus {
          border-color: #4b6b32;
          background: white;
        }

        /* Portrait Thumbnail */
        .thumb-preview-portrait {
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 12px;
          background: #f4f5f7;
          border: 1px solid #e2e8f0;
          margin-bottom: 0.75rem;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .thumb-preview-portrait img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .no-thumb {
          color: #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* Upload button */
        .btn-upload-thumb {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.55rem 1rem;
          background: #1F3A2E;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-upload-thumb:hover { opacity: 0.9; }
        .btn-upload-thumb:disabled { background: #94a3b8; cursor: not-allowed; }

        .spin-icon {
          animation: spinAnim 1s linear infinite;
        }
        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sidebar-toggle {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          cursor: pointer;
          margin-top: 1rem;
          padding: 0.6rem 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .sidebar-toggle input {
          width: auto;
          cursor: pointer;
          accent-color: #4b6b32;
        }
        .sidebar-toggle label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          margin: 0;
        }

        /* ============ CHAPTERS ============ */
        .chapter-manager {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #f8fafc;
        }
        .chapter-sidebar {
          padding: 0.75rem;
          border-right: 1px solid #e2e8f0;
          background: white;
          display: flex;
          flex-direction: column;
        }
        .chapter-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.75rem;
        }
        .chapter-item { 
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .chapter-item:hover { background: #f8fafc; }
        .chapter-item.active { background: #eef2eb; border-color: rgba(75,107,50,0.15); }
        .chap-num {
          width: 22px;
          height: 22px;
          background: #f1f5f9;
          border-radius: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: #475569;
          flex-shrink: 0;
        }
        .chapter-item.active .chap-num { background: #4b6b32; color: white; }
        .chapter-item input {
          flex: 1;
          min-width: 0;
          padding: 0.2rem;
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }
        .chapter-item input:focus {
          background: white;
          border-radius: 4px;
          border: 1px solid #4b6b32;
        }
        .btn-del-chap {
          background: none;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 4px;
          transition: all 0.15s;
        }
        .btn-del-chap:hover { color: #b89047; background: #fdf6e2; }
        .btn-add-chap {
          width: 100%;
          padding: 0.55rem;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-add-chap:hover { border-color: #4b6b32; color: #4b6b32; background: #f8fafc; }
        .chapter-editor { padding: 1rem; background: #f8fafc; }

        /* ============ RESPONSIVE ============ */
        @media (max-width: 1024px) {
          .editor-layout {
            grid-template-columns: 1fr;
          }
          .editor-sidebar {
            border-left: none;
            border-top: 1px solid #e2e8f0;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminContentEditor;
