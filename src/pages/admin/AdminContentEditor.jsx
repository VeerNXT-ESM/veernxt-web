import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';
import SimpleRichTextEditor from '../../components/admin/SimpleRichTextEditor';

const AdminContentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    exam_name: '',
    subject: '',
    category: 'Guide', // Default
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
      setFormData(data);
      try {
        if (data.body_html && data.body_html.trim().startsWith('[')) {
          const parsed = JSON.parse(data.body_html);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIsMultiChapter(true);
            setChapters(parsed);
            setActiveChapterId(parsed[0].id);
          }
        }
      } catch (e) {
        // Leave as single page
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      if (isMultiChapter) {
        dataToSave.body_html = JSON.stringify(chapters);
      }

      const { data, error } = id 
        ? await supabase.from('resources').update(dataToSave).eq('id', id).select()
        : await supabase.from('resources').insert([dataToSave]).select();

      if (error) throw error;
      alert('Content saved successfully!');
      
      if (!id && data && data.length > 0) {
        navigate(`/admin/content/${data[0].id}`, { replace: true });
      }
    } catch (err) {
      alert('Error saving content: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="editor-header">
        <button onClick={() => navigate('/admin')} className="btn-back-text">
          <ArrowLeft size={18} /> Dashboard
        </button>
        <div className="header-text" style={{ flex: 1, marginLeft: '1rem' }}>
          <h1>{id ? 'Edit Resource' : 'New Resource'}</h1>
          <p>Fill in the details to create a study guide or intro</p>
        </div>
        <div className="header-actions">
          {id && (
            <button 
              onClick={() => window.open(`/reader/${id}`, '_blank')} 
              className="btn-outline"
            >
              <ExternalLink size={18} /> Preview in App
            </button>
          )}
          <button onClick={handleSave} className="btn-primary" disabled={loading}>
            <Save size={18} /> {loading ? 'Saving...' : 'Save Content'}
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <div className="editor-main">
          <div className="card">
            <h3>Title & Metadata</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Resource Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. English Grammar Guide" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Intro">Intro</option>
                  <option value="Precis">Precis</option>
                  <option value="Guide">Guide Book</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Exam Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. SSC CGL" 
                  value={formData.exam_name}
                  onChange={e => setFormData({...formData, exam_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g. English" 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Conducting Body</label>
                <input 
                  type="text" 
                  placeholder="e.g. Staff Selection Commission" 
                  value={formData.conducting_body}
                  onChange={e => setFormData({...formData, conducting_body: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Website URL (Optional)</label>
                <input 
                  type="text" 
                  placeholder="https://..." 
                  value={formData.website_url}
                  onChange={e => setFormData({...formData, website_url: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="content-header">
              <div>
                <h3>Content Setup</h3>
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
                    if (!isMultiChapter && formData.body_html && chapters.length === 1 && !chapters[0].content) {
                      // Migrate existing HTML to first chapter
                      const newChapters = [{ id: Date.now(), title: 'Chapter 1', content: formData.body_html }];
                      setChapters(newChapters);
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
                            const newChaps = [...chapters];
                            newChaps[idx].title = e.target.value;
                            setChapters(newChaps);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button 
                          className="btn-del-chap"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chapters.length > 1) {
                              const newChaps = chapters.filter(c => c.id !== chap.id);
                              setChapters(newChaps);
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
                      setChapters([...chapters, { id: newId, title: `Chapter ${chapters.length + 1}`, content: '' }]);
                      setActiveChapterId(newId);
                    }}
                  >+ Add Chapter</button>
                </div>
                <div className="chapter-editor">
                  {chapters.find(c => c.id === activeChapterId) && (
                    <SimpleRichTextEditor 
                      key={activeChapterId} // Force re-render for different chapters
                      value={chapters.find(c => c.id === activeChapterId).content}
                      onChange={(val) => {
                        const newChaps = chapters.map(c => 
                          c.id === activeChapterId ? { ...c, content: val } : c
                        );
                        setChapters(newChaps);
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <SimpleRichTextEditor 
                value={formData.body_html}
                onChange={(val) => setFormData({...formData, body_html: val})}
              />
            )}
          </div>
        </div>

        <div className="editor-sidebar">
          <div className="card">
            <h3>Media & Settings</h3>
            <div className="form-group">
              <label>Thumbnail URL</label>
              <div className="thumb-preview">
                {formData.thumbnail_url ? (
                  <img src={formData.thumbnail_url} alt="Preview" />
                ) : (
                  <div className="no-thumb"><ImageIcon size={40} /></div>
                )}
              </div>
              <input 
                type="text" 
                placeholder="Paste Supabase storage URL" 
                value={formData.thumbnail_url}
                onChange={e => setFormData({...formData, thumbnail_url: e.target.value})}
              />
            </div>

            <div className="form-group toggle">
              <input 
                type="checkbox" 
                id="freemium"
                checked={formData.is_freemium}
                onChange={e => setFormData({...formData, is_freemium: e.target.checked})}
              />
              <label htmlFor="freemium">Mark as Free Content</label>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .editor-header { display: flex; align-items: center; margin-bottom: 3rem; }
        .btn-back-text { display: flex; align-items: center; gap: 0.5rem; background: transparent; border: none; color: #64748b; font-weight: 600; cursor: pointer; transition: color 0.2s; padding: 0; }
        .btn-back-text:hover { color: var(--ios-olive); }
        .header-text h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.25rem; }
        .header-text p { color: #64748b; font-size: 0.9rem; }
        .header-actions { display: flex; gap: 1rem; align-items: center; }
        
        .btn-outline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: white;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover { background: #f8fafc; color: var(--ios-olive); border-color: #cbd5e1; }
        
        .editor-grid { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; }
        .card { background: white; padding: 2rem; border-radius: 24px; border: 1px solid #f1f5f9; margin-bottom: 2rem; }
        .card h3 { font-size: 1.1rem; color: #0f172a; margin-bottom: 1.5rem; }
        .hint { font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem; }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.85rem; font-weight: 700; color: #475569; }
        input, select, textarea {
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          outline: none;
          font-size: 0.95rem;
          transition: border 0.2s;
        }
        input:focus, textarea:focus { border-color: var(--ios-olive); }
        textarea { font-family: monospace; line-height: 1.6; resize: vertical; }

        .thumb-preview { width: 100%; height: 200px; border-radius: 16px; background: #f8fafc; border: 2px dashed #e2e8f0; margin-bottom: 1rem; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .thumb-preview img { width: 100%; height: 100%; object-fit: cover; }
        .no-thumb { color: #cbd5e1; }
        
        .toggle { flex-direction: row; align-items: center; gap: 1rem; cursor: pointer; }
        .toggle input { width: auto; cursor: pointer; }
        
        .btn-primary {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: var(--ios-olive);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-2px); }
        .btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }

        .content-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .mode-toggle { display: flex; background: #f1f5f9; padding: 0.25rem; border-radius: 12px; }
        .mode-toggle button {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mode-toggle button.active { background: white; color: var(--ios-olive); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

        .chapter-manager { display: grid; grid-template-columns: 250px 1fr; gap: 1.5rem; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #f8fafc; }
        .chapter-sidebar { padding: 1rem; border-right: 1px solid #e2e8f0; background: white; display: flex; flex-direction: column; }
        .chapter-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .chapter-item { 
          display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; 
          border-radius: 8px; border: 1px solid transparent; cursor: pointer;
        }
        .chapter-item:hover { background: #f8fafc; }
        .chapter-item.active { background: #f1f5f9; border-color: #e2e8f0; }
        .chap-num { width: 24px; height: 24px; background: white; border-radius: 100px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #475569; }
        .chapter-item input { flex: 1; min-width: 0; padding: 0.25rem; border: none; background: transparent; font-size: 0.85rem; font-weight: 600; color: #0f172a; }
        .chapter-item input:focus { background: white; border-radius: 4px; border: 1px solid var(--ios-olive); }
        .btn-del-chap { background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 0.25rem; }
        .btn-del-chap:hover { color: #ef4444; }
        .btn-add-chap { width: 100%; padding: 0.75rem; border: 1px dashed #cbd5e1; border-radius: 8px; background: transparent; color: #64748b; font-weight: 600; cursor: pointer; }
        .btn-add-chap:hover { border-color: var(--ios-olive); color: var(--ios-olive); background: #f8fafc; }
        .chapter-editor { padding: 1.5rem; background: #f8fafc; }
      `}</style>
    </div>
  );
};

export default AdminContentEditor;
