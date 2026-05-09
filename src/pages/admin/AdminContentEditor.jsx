import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Save, ArrowLeft, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) { navigate('/admin/login'); return; }
    if (id) fetchResource();
  }, [id, navigate]);

  const fetchResource = async () => {
    const { data, error } = await supabase.from('resources').select('*').eq('id', id).single();
    if (data) setFormData(data);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = id 
        ? await supabase.from('resources').update(formData).eq('id', id)
        : await supabase.from('resources').insert([formData]);

      if (error) throw error;
      alert('Content saved successfully!');
      navigate('/admin');
    } catch (err) {
      alert('Error saving content: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="editor-header">
        <button onClick={() => navigate('/admin')} className="btn-back"><ArrowLeft size={20} /></button>
        <div className="header-text">
          <h1>{id ? 'Edit Resource' : 'New Resource'}</h1>
          <p>Fill in the details to create a study guide or intro</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={loading}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Content'}
        </button>
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
            <h3>Content (HTML Body)</h3>
            <p className="hint">Use standard HTML tags like &lt;p&gt;, &lt;h1&gt;, &lt;ul&gt;, etc.</p>
            <textarea 
              placeholder="Paste or write your HTML content here..."
              value={formData.body_html}
              onChange={e => setFormData({...formData, body_html: e.target.value})}
              rows={20}
            />
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
        .editor-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 3rem; }
        .btn-back { width: 48px; height: 48px; border-radius: 100px; border: 1px solid #e2e8f0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .header-text h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.25rem; }
        .header-text p { color: #64748b; font-size: 0.9rem; }
        
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
      `}</style>
    </div>
  );
};

export default AdminContentEditor;
