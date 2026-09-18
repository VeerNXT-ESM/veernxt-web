import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDebounced } from './lcShared';
import { Search, Plus, Pencil, Trash2, X, Tags, AlertTriangle, Link2 } from 'lucide-react';
import LinkCategoryExamsDrawer from './LinkCategoryExamsDrawer';

/**
 * Lets the content team manage the lc_exams.category list themselves,
 * instead of it only being editable through a code change to
 * src/lib/examCategoryTaxonomy.js (the original, hardcoded source --
 * superseded by the lc_exam_categories table this page manages). Every
 * other admin Category dropdown (ExamEditorPanel.jsx, and the filter bars
 * across Exams/Book Content/Publish Content/PYQ Papers/Quizzes) reads from
 * this same table or from live lc_exams.category values, so a category
 * added here shows up everywhere immediately.
 *
 * category is still plain text on lc_exams (not a foreign key -- matches
 * every other admin surface that already treats it as text), so a rename
 * here explicitly cascades an UPDATE onto every lc_exams row using the old
 * name, and delete is blocked while any exam still references it.
 */
const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [examCounts, setExamCounts] = useState({}); // category name -> count of lc_exams using it
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  const [renaming, setRenaming] = useState(null); // category row being renamed
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // category row pending delete confirmation
  const [managingExamsFor, setManagingExamsFor] = useState(null); // category row whose "Manage Exams" drawer is open

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: cats, error: catErr }, { data: examRows, error: examErr }] = await Promise.all([
      supabase.from('lc_exam_categories').select('id,name,created_at').order('name'),
      supabase.from('lc_exams').select('category'),
    ]);
    if (catErr) console.error('Error fetching categories:', catErr);
    if (examErr) console.error('Error fetching exam category counts:', examErr);

    const counts = {};
    for (const row of examRows || []) {
      const c = (row.category || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    }
    setCategories(cats || []);
    setExamCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = categories.filter((c) => !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const openAddModal = () => {
    setNewName('');
    setAddError('');
    setShowAddModal(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    const clash = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (clash) {
      setAddError(`"${clash.name}" already exists.`);
      return;
    }

    setSaving(true);
    setAddError('');
    try {
      const { data, error } = await supabase.from('lc_exam_categories').insert({ name }).select('id,name,created_at').single();
      if (error) throw error;
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddModal(false);
    } catch (err) {
      const isDuplicate = err.code === '23505';
      setAddError(isDuplicate ? `"${name}" already exists.` : (err.message || 'Failed to add category.'));
    } finally {
      setSaving(false);
    }
  };

  const openRename = (cat) => {
    setRenaming(cat);
    setRenameValue(cat.name);
    setRenameError('');
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name || name === renaming.name) { setRenaming(null); return; }

    const clash = categories.find((c) => c.id !== renaming.id && c.name.toLowerCase() === name.toLowerCase());
    if (clash) {
      setRenameError(`"${clash.name}" already exists.`);
      return;
    }

    setSaving(true);
    setRenameError('');
    try {
      const { error: catUpdateErr } = await supabase.from('lc_exam_categories').update({ name }).eq('id', renaming.id);
      if (catUpdateErr) throw catUpdateErr;

      // Cascade the rename onto every exam currently using the old name --
      // category is plain text on lc_exams, so nothing else keeps this in
      // sync automatically.
      const affectedCount = examCounts[renaming.name] || 0;
      if (affectedCount > 0) {
        const { error: examUpdateErr } = await supabase.from('lc_exams').update({ category: name }).eq('category', renaming.name);
        if (examUpdateErr) throw examUpdateErr;
      }

      setCategories((prev) => prev.map((c) => (c.id === renaming.id ? { ...c, name } : c)).sort((a, b) => a.name.localeCompare(b.name)));
      setExamCounts((prev) => {
        const next = { ...prev };
        if (affectedCount > 0) {
          next[name] = (next[name] || 0) + affectedCount;
          delete next[renaming.name];
        }
        return next;
      });
      setRenaming(null);
    } catch (err) {
      setRenameError(err.message || 'Failed to rename category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('lc_exam_categories').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert('Failed to delete category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Categories</h2>
          <p>The sector classification (Banking, Police, Teaching, etc.) used on every exam. Add or rename categories here — they show up in every Category dropdown immediately.</p>
        </div>
        <button className="lc-btn primary" onClick={openAddModal}><Plus size={16} /> Add Category</button>
      </div>

      <div className="lc-filter-bar">
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="lc-loading-state">Loading categories…</div>
      ) : filtered.length === 0 ? (
        <div className="lc-empty-state"><p>No categories match the current search.</p></div>
      ) : (
        <div className="lc-table-responsive" style={{ marginTop: '1.25rem' }}>
          <table className="lc-table">
            <thead>
              <tr>
                <th><Tags size={13} style={{ marginRight: '0.35rem', verticalAlign: '-2px' }} />Category</th>
                <th style={{ textAlign: 'right' }}>Exams</th>
                <th className="lc-col-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{examCounts[cat.name] || 0}</span></td>
                  <td className="lc-col-nowrap">
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button className="lc-icon-btn" title="Manage exams in this category" style={{ color: '#7c3aed' }} onClick={() => setManagingExamsFor(cat)}><Link2 size={14} /></button>
                      <button className="lc-icon-btn" title="Rename" onClick={() => openRename(cat)}><Pencil size={14} /></button>
                      <button className="lc-icon-btn" title="Delete" style={{ color: '#dc2626' }} onClick={() => setDeleteTarget(cat)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="lc-modal-backdrop">
          <form onSubmit={handleAdd} className="lc-modal-card">
            <div className="lc-modal-header">
              <h3>Add Category</h3>
              <button type="button" className="lc-close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <div className="lc-modal-body">
              <div className="lc-input-group">
                <label>Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Forest Services"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
                  autoFocus
                  required
                />
              </div>
              {addError && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#ef4444' }}>
                  <AlertTriangle size={13} /> {addError}
                </span>
              )}
            </div>
            <div className="lc-modal-footer">
              <button type="button" className="lc-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="lc-btn primary" disabled={saving || !newName.trim()}>
                {saving ? 'Adding…' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {renaming && (
        <div className="lc-modal-backdrop">
          <form onSubmit={handleRename} className="lc-modal-card">
            <div className="lc-modal-header">
              <h3>Rename Category</h3>
              <button type="button" className="lc-close-btn" onClick={() => setRenaming(null)}><X size={20} /></button>
            </div>
            <div className="lc-modal-body">
              <div className="lc-input-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => { setRenameValue(e.target.value); setRenameError(''); }}
                  autoFocus
                  required
                />
              </div>
              {(examCounts[renaming.name] || 0) > 0 && (
                <p className="lc-muted-note" style={{ margin: 0 }}>
                  {examCounts[renaming.name]} exam{examCounts[renaming.name] === 1 ? '' : 's'} currently tagged "{renaming.name}" will be updated to the new name too.
                </p>
              )}
              {renameError && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#ef4444' }}>
                  <AlertTriangle size={13} /> {renameError}
                </span>
              )}
            </div>
            <div className="lc-modal-footer">
              <button type="button" className="lc-btn" onClick={() => setRenaming(null)}>Cancel</button>
              <button type="submit" className="lc-btn primary" disabled={saving || !renameValue.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="lc-modal-backdrop">
          <div className="lc-modal-card">
            <div className="lc-modal-header">
              <h3>Delete Category</h3>
              <button type="button" className="lc-close-btn" onClick={() => setDeleteTarget(null)}><X size={20} /></button>
            </div>
            <div className="lc-modal-body">
              {(examCounts[deleteTarget.name] || 0) > 0 ? (
                <p>
                  <strong>{examCounts[deleteTarget.name]}</strong> exam{examCounts[deleteTarget.name] === 1 ? '' : 's'} still use "{deleteTarget.name}". Reassign them to a different category first (from Exams, or by renaming this category instead), then delete it.
                </p>
              ) : (
                <p>Delete "{deleteTarget.name}"? No exams currently use it.</p>
              )}
            </div>
            <div className="lc-modal-footer">
              <button type="button" className="lc-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                type="button"
                className="lc-btn primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                disabled={saving || (examCounts[deleteTarget.name] || 0) > 0}
                onClick={handleDelete}
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {managingExamsFor && (
        <LinkCategoryExamsDrawer
          category={managingExamsFor}
          allCategories={categories}
          onClose={() => setManagingExamsFor(null)}
          onLinked={() => { setManagingExamsFor(null); fetchAll(); }}
        />
      )}
    </div>
  );
};

export default CategoriesPage;
