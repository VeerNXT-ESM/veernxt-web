import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, BookOpen } from 'lucide-react';
import { THUMBNAIL_SUBJECTS, COLOR_FAMILIES } from '../../lib/thumbnailTaxonomy';
import { refreshThumbnails, bundledSubjectThumbnail } from '../../lib/thumbnailStore';
import ThumbnailCell from './ThumbnailCell';

/**
 * Subjects (English, Mathematics, Reasoning, ...) and the portrait thumbnail
 * each one uses on books / study materials. The subject list is fixed by
 * src/lib/thumbnailTaxonomy.js (the same list drives which subject a book's
 * title maps to), so this page only manages the thumbnails, stored in
 * lc_subjects.thumbnail_url. Exams do not use these -- they use their
 * category's thumbnail (Categories page). A subject with no thumbnail shows
 * a solid colour from its colour family.
 */
const THUMB_W = 512;
const THUMB_H = 768; // 2:3 portrait, same shape as the existing subject art

const SubjectsPage = () => {
  const [urls, setUrls] = useState({}); // subject key -> thumbnail_url
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('lc_subjects').select('key,thumbnail_url');
    if (error) console.error('Error fetching subjects:', error);
    setUrls(Object.fromEntries((data || []).map((r) => [r.key, r.thumbnail_url])));
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const saveThumbnail = async (key, url) => {
    const subject = THUMBNAIL_SUBJECTS[key];
    const { error } = await supabase
      .from('lc_subjects')
      .upsert({ key, label: subject.label, color_family: subject.family, thumbnail_url: url }, { onConflict: 'key' });
    if (error) throw error;
    setUrls((prev) => ({ ...prev, [key]: url }));
    refreshThumbnails();
  };

  const rows = Object.entries(THUMBNAIL_SUBJECTS)
    .map(([key, s]) => ({ key, ...s, url: urls[key] || bundledSubjectThumbnail(key) }))
    .filter((r) => (!search || r.label.toLowerCase().includes(search.toLowerCase())) && (!onlyMissing || !r.url));
  const withThumb = Object.keys(THUMBNAIL_SUBJECTS).filter((k) => urls[k] || bundledSubjectThumbnail(k)).length;

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Subjects</h2>
          <p>{withThumb} of {Object.keys(THUMBNAIL_SUBJECTS).length} subjects have a thumbnail. Books and study materials show their subject's thumbnail; exams use their category's thumbnail instead.</p>
        </div>
      </div>

      <div className="lc-filter-bar">
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--admin-text-muted, #64748b)' }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Missing thumbnail only
        </label>
      </div>

      {loading ? (
        <div className="lc-loading-state">Loading subjects…</div>
      ) : rows.length === 0 ? (
        <div className="lc-empty-state"><p>No subjects match the current filters.</p></div>
      ) : (
        <div className="lc-table-responsive" style={{ marginTop: '1.25rem' }}>
          <table className="lc-table">
            <thead>
              <tr>
                <th><BookOpen size={13} style={{ marginRight: '0.35rem', verticalAlign: '-2px' }} />Subject</th>
                <th>Colour (no thumbnail)</th>
                <th>Thumbnail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: COLOR_FAMILIES[r.family]?.hex }} />
                      {COLOR_FAMILIES[r.family]?.name}
                    </span>
                  </td>
                  <td>
                    <ThumbnailCell
                      url={r.url}
                      name={r.label}
                      keyPrefix="subject-thumbnails"
                      width={THUMB_W}
                      height={THUMB_H}
                      previewWidth={64}
                      onSave={(url) => saveThumbnail(r.key, url)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;
