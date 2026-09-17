import { useState, useRef, useEffect } from 'react';
import { UploadCloud, RefreshCw, Search, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { DocxPreview } from './DocxPreview';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;
const VERCEL_SAFE_BYTES = 3.3 * 1024 * 1024; // deployed Vercel functions cap request bodies ~4.5MB; base64 adds ~33%
const CATEGORIES = ['Intro', 'Guide', 'Precis'];
// Same Level convention ExamsPage.jsx's own filter uses, against the same
// lc_regions table.
const LEVELS = [
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function callSaveResource(body) {
  const res = await fetch('/api/admin/save-resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// One tool for turning a real .docx into a live resource: upload it, THEN
// pick its category (Intro's single-document/table-aware mammoth parser
// vs. Guide/Precis's multi-chapter book parser -- upload-before-category
// is deliberate, so whoever's uploading can look at the actual document
// before classifying it instead of committing to a category blind),
// preview the conversion, THEN assign to exam(s) (filtered by
// Central/State/UT, same as ExamsPage.jsx's own filter -- also decided
// after seeing the document, not before), then Convert & Link. Replaces two
// previously-separate
// pages (a preview-only "Docx Converter" and an Intro-only publisher) --
// they overlapped almost completely and the only real difference,
// exam-attachment semantics, is handled below instead of duplicating the
// whole page: Intro is exam-specific 1:1 (single pick, server-side
// lc_exam_intro upsert with an overwrite guard); Guide/Precis are shared
// across many exams (multi-pick, client-side lc_exam_resource_map inserts,
// the exact pattern ExamResourcesPanel.jsx's own "Add Resource" flow
// already uses). See docs/status_report.md §52-53 for why this exists at
// all: a system-wide scan found zero unconverted-but-real Intro docx left
// anywhere, so closing content gaps depends entirely on the content team
// writing new ones and needing a safe way to publish them.
const PublishContentPage = () => {
  const [category, setCategory] = useState(null); // chosen only after a file is uploaded
  const isMulti = category ? category !== 'Intro' : false;

  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState(null);
  const [book, setBook] = useState(null);
  const [conversionId, setConversionId] = useState(0);
  const fileInputRef = useRef(null);

  const [level, setLevel] = useState('central');
  const [regions, setRegions] = useState([]);
  const [regionId, setRegionId] = useState('');
  const [allExamsInScope, setAllExamsInScope] = useState([]); // every exam matching level(+region) -- the default list
  const [loadingExams, setLoadingExams] = useState(false);
  const [examQuery, setExamQuery] = useState(''); // client-side filter over allExamsInScope; 2+ chars also triggers a cross-level DB search below
  const [examSearchResults, setExamSearchResults] = useState(null); // null = not searching (use scoped list); array = live cross-level search results
  const [searchingExams, setSearchingExams] = useState(false);
  const [selectedExams, setSelectedExams] = useState([]); // Intro: length 0-1; Guide/Precis: 0-N -- linkage is optional for both, an exam may not exist in the catalog yet
  const [existingIntroTitle, setExistingIntroTitle] = useState(null); // Intro-only "already has one" badge

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [published, setPublished] = useState(null); // { resourceId, examNames }

  const oversized = file && file.size > VERCEL_SAFE_BYTES;
  const regionOptions = regions.filter((r) => r.level === level);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lc_regions').select('id, name, level').order('name');
      setRegions(data || []);
    })();
  }, []);

  // Shared by both "picked a different category" (keeps the already-
  // uploaded file -- no need to re-upload just to correct a category
  // mistake) and "picked a new file" (below, additionally clears category
  // so it's re-chosen fresh for whatever this new document turns out to
  // be) and "start another" (below, additionally clears the file too).
  const resetSelectionState = () => {
    setBook(null);
    setConvertError(null);
    setSelectedExams([]);
    setExistingIntroTitle(null);
    setExamQuery('');
    setPublished(null);
    setPublishError(null);
    setConfirmOverwrite(false);
  };

  const handleCategoryChange = (next) => {
    if (next === category) return;
    setCategory(next);
    resetSelectionState();
  };

  const handleLevelChange = (e) => {
    setLevel(e.target.value);
    setRegionId('');
    setExamQuery('');
  };

  // Loads every exam matching Level(+Region) once per filter change -- the
  // actual dropdown list -- rather than requiring a typed query before
  // showing anything. Central tops out at ~400 exams, any single
  // state/UT at a few dozen, both comfortably fetched in one shot and
  // filtered/searched client-side from here (react-select's own built-in
  // search for the single-select case below; a plain client-side filter
  // for the multi-select checklist). Scoped by Level because many exams
  // share generic names ("Staff Nurse", "Sub-Inspector") across dozens of
  // states -- narrowing by level/region first is what actually prevents
  // picking the wrong one, the search alone wouldn't.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingExams(true);
      let query = supabase
        .from('lc_exams')
        .select('id, name, conducting_body:lc_conducting_bodies(name), region:lc_regions!inner(name, level)')
        .eq('region.level', level)
        .order('name')
        .limit(1000);
      if (regionId) query = query.eq('region_id', regionId);
      const { data } = await query;
      if (!cancelled) {
        setAllExamsInScope(data || []);
        setLoadingExams(false);
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [level, regionId]);

  // 2+ chars searches lc_exams across every level/region, not just the
  // current Level/Region scope -- the point being that whoever's publishing
  // often doesn't know (or the exam doesn't have) a level/region yet.
  // Below 2 chars, a plain client-side filter over the already-loaded
  // scoped list is instant and cheap enough not to need a DB round trip.
  useEffect(() => {
    const q = examQuery.trim();
    if (q.length < 2) { setExamSearchResults(null); setSearchingExams(false); return; }
    let cancelled = false;
    setSearchingExams(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('lc_exams')
        .select('id, name, conducting_body:lc_conducting_bodies(name), region:lc_regions(name, level)')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(100);
      if (!cancelled) { setExamSearchResults(data || []); setSearchingExams(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [examQuery]);

  const displayedExams = (() => {
    if (examSearchResults !== null) return examSearchResults;
    const q = examQuery.trim().toLowerCase();
    if (!q) return allExamsInScope;
    return allExamsInScope.filter((exam) => exam.name.toLowerCase().includes(q) || exam.conducting_body?.name?.toLowerCase().includes(q));
  })();
  const isCrossLevelSearch = examSearchResults !== null;

  const fetchExistingIntro = async (examId) => {
    const [{ data: introRows }, { data: mapRows }] = await Promise.all([
      supabase.from('lc_exam_intro').select('resource_id').eq('exam_id', examId).limit(1),
      supabase.from('lc_exam_resource_map').select('resource_id').eq('exam_id', examId).eq('category', 'Intro').limit(1),
    ]);
    const existingResourceId = introRows?.[0]?.resource_id || mapRows?.[0]?.resource_id || null;
    if (!existingResourceId) { setExistingIntroTitle(null); return; }
    const { data: resource } = await supabase.from('resources').select('title').eq('resource_id', existingResourceId).maybeSingle();
    setExistingIntroTitle(resource?.title || '(untitled)');
  };

  const pickExam = (exam) => {
    setPublished(null);
    setPublishError(null);
    setConfirmOverwrite(false);
    if (!isMulti) {
      if (selectedExams[0]?.id === exam.id) {
        setSelectedExams([]);
        setExistingIntroTitle(null);
        return;
      }
      setSelectedExams([exam]);
      fetchExistingIntro(exam.id);
      return;
    }
    setSelectedExams((prev) => (prev.some((e) => e.id === exam.id) ? prev.filter((e) => e.id !== exam.id) : [...prev, exam]));
  };

  const removeSelectedExam = (examId) => {
    setSelectedExams((prev) => prev.filter((e) => e.id !== examId));
    if (!isMulti) setExistingIntroTitle(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setCategory(null);
    resetSelectionState();
  };

  const handleConvert = async () => {
    if (!file || !category) return;
    setConverting(true);
    setConvertError(null);
    setBook(null);
    try {
      const buffer = await file.arrayBuffer();
      const { ok, data } = await callSaveResource({
        type: 'docx-preview-convert',
        fileName: file.name,
        dataBase64: arrayBufferToBase64(buffer),
        category,
      });
      if (!ok || !data.ok) throw new Error(data.error || 'Conversion failed');
      setBook(data.book);
      setConversionId((n) => n + 1);
    } catch (err) {
      setConvertError(err.message);
    } finally {
      setConverting(false);
    }
  };

  const doPublish = async (overwrite) => {
    setPublishing(true);
    setPublishError(null);
    try {
      if (isMulti) {
        const { ok, data } = await callSaveResource({ type: 'content-publish', category, fileName: file.name, book });
        if (!ok || !data.ok) throw new Error(data.error || 'Convert & Link failed');
        if (selectedExams.length > 0) {
          const rows = selectedExams.map((exam) => ({
            exam_id: exam.id,
            resource_id: data.resourceId,
            category,
            confidence: 'high',
            reasoning: 'Manually added by admin',
            source: 'manual',
          }));
          const { error: mapErr } = await supabase.from('lc_exam_resource_map').insert(rows);
          if (mapErr) {
            throw new Error(`Resource published, but attaching to exam(s) failed: ${mapErr.message}. Attach it manually via each exam's Resources panel.`);
          }
        }
        setPublished({ resourceId: data.resourceId, examNames: selectedExams.map((e) => e.name) });
      } else {
        // examId omitted entirely (not just falsy) when nothing's picked --
        // linkage is optional, the exam may not exist in the catalog yet.
        const { ok, status, data } = await callSaveResource({
          type: 'content-publish',
          category: 'Intro',
          ...(selectedExams[0] ? { examId: selectedExams[0].id } : {}),
          fileName: file.name,
          book,
          overwrite,
        });
        if (status === 409 && data.code === 'ALREADY_HAS_INTRO') {
          setExistingIntroTitle(data.existingTitle);
          setConfirmOverwrite(true);
          return;
        }
        if (!ok || !data.ok) throw new Error(data.error || 'Convert & Link failed');
        setConfirmOverwrite(false);
        setPublished({ resourceId: data.resourceId, examNames: selectedExams[0] ? [selectedExams[0].name] : [] });
      }
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const startAnother = () => {
    setFile(null);
    setCategory(null);
    resetSelectionState();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canPublish = book && !publishing;
  const publishLabel = selectedExams.length === 0
    ? 'Publish without linking'
    : isMulti
      ? `Convert & Link to ${selectedExams.length} exam${selectedExams.length === 1 ? '' : 's'}`
      : `Convert & Link to ${selectedExams[0]?.name || 'exam'}`;

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Publish Content</h2>
          <p className="lc-muted-note" style={{ marginTop: '0.3rem' }}>
            Upload a real .docx, pick its category once you've seen it, check the preview (tables included), then assign it to exam(s) and Convert &amp; Link.
            No matching or guessing — you pick the category and exam(s) yourself.
          </p>
        </div>
      </div>

      {published ? (
        <div className="lc-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <CheckCircle2 size={32} color="#16a34a" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: 0 }}>Published!</h3>
          <p className="lc-muted-note" style={{ marginTop: '0.4rem' }}>
            {published.examNames.length === 0
              ? <>Published without linking to an exam — attach it later via the exam&apos;s Resources panel once it exists.</>
              : isMulti
                ? <>Attached to <strong>{published.examNames.length}</strong> exam{published.examNames.length === 1 ? '' : 's'}: {published.examNames.join(', ')}</>
                : <><strong>{published.examNames[0]}</strong> now has this Introduction live.</>}
          </p>
          <button className="lc-btn primary" style={{ marginTop: '1rem' }} onClick={startAnother}>
            Publish another
          </button>
        </div>
      ) : (
        <>
          <div className="lc-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>1. Upload the document</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="lc-btn" onClick={() => fileInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <UploadCloud size={16} /> Choose .docx file
              </button>
              <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileChange} style={{ display: 'none' }} />
              {file && (
                <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                  {file.name} ({formatBytes(file.size)})
                </span>
              )}
            </div>

            {oversized && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: 'var(--admin-warn-bg, #fffbeb)', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.8rem', color: '#92400e' }}>
                This file is {formatBytes(file.size)} — larger than the deployed admin site's ~3.3MB safe limit. It will still work against the local dev server, but would fail against the live veernxt.in admin site.
              </div>
            )}
          </div>

          <div className="lc-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', opacity: file ? 1 : 0.5, pointerEvents: file ? 'auto' : 'none' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.6rem' }}>2. What kind of content is this?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`lc-btn${category === c ? ' primary' : ''}`}
                  onClick={() => handleCategoryChange(c)}
                >
                  {c}
                </button>
              ))}
              <button className="lc-btn primary" disabled={!category || converting} onClick={handleConvert} style={{ marginLeft: 'auto' }}>
                {converting ? 'Converting…' : 'Convert'}
              </button>
            </div>

            {convertError && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8rem', color: '#b91c1c' }}>
                Conversion failed: {convertError}
              </div>
            )}
          </div>

          {converting && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <RefreshCw className="animate-spin" size={24} color="var(--admin-accent)" />
            </div>
          )}

          {book && <DocxPreview key={conversionId} book={book} />}

          <div className="lc-card" style={{ padding: '1.25rem', margin: '1.25rem 0', opacity: book ? 1 : 0.5, pointerEvents: book ? 'auto' : 'none' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              3. Assign to exam{isMulti ? '(s)' : ''} <span className="lc-muted-note" style={{ fontWeight: 400 }}>— optional, publish without linking if the exam doesn&apos;t exist yet</span>
            </label>

            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 140 }}>
                <Select value={level} onChange={handleLevelChange} options={LEVELS} />
              </div>
              {level !== 'central' && (
                <div style={{ minWidth: 200 }}>
                  <Select
                    value={regionId}
                    onChange={(e) => setRegionId(e.target.value)}
                    searchable
                    placeholder={`All ${level === 'state' ? 'States' : 'UTs'}`}
                    options={[{ value: '', label: `All ${level === 'state' ? 'States' : 'UTs'}` }, ...regionOptions.map((r) => ({ value: r.id, label: r.name }))]}
                  />
                </div>
              )}
            </div>

            {selectedExams.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                {selectedExams.map((exam) => (
                  <span key={exam.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: 999, background: 'var(--admin-hover-bg, #f1f5f9)' }}>
                    {exam.name}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeSelectedExam(exam.id)} />
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Search size={16} color="var(--admin-text-muted)" />
              <input
                type="text"
                value={examQuery}
                onChange={(e) => setExamQuery(e.target.value)}
                placeholder={loadingExams ? 'Loading exams…' : `Search exams by name — type 2+ chars to search every level…`}
                className="lc-input"
                style={{ flex: 1 }}
              />
            </div>
            {/* Below 2 chars: the level/region-scoped list, filtered client-side. At 2+ chars: live results from every level/region, since the exam may not be in the currently selected scope at all. */}
            <div className="lc-card" style={{ maxHeight: 260, overflowY: 'auto', padding: '0.35rem' }}>
              {displayedExams.map((exam) => {
                const isSelected = selectedExams.some((e) => e.id === exam.id);
                return (
                  <div
                    key={exam.id}
                    onClick={() => pickExam(exam)}
                    style={{ padding: '0.5rem 0.65rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', background: isSelected ? 'var(--admin-hover-bg, #f1f5f9)' : 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-hover-bg, #f1f5f9)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--admin-hover-bg, #f1f5f9)' : 'transparent'; }}
                  >
                    {isSelected && '✓ '}
                    <strong>{exam.name}</strong>
                    {exam.conducting_body?.name && <span className="lc-muted-note"> — {exam.conducting_body.name}</span>}
                    {isCrossLevelSearch && exam.region?.level && (
                      <span className="lc-muted-note"> · {exam.region.level}{exam.region.name ? ` (${exam.region.name})` : ''}</span>
                    )}
                  </div>
                );
              })}
              {displayedExams.length === 0 && !loadingExams && !searchingExams && (
                <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.85rem' }} className="lc-muted-note">
                  {examQuery.trim().length >= 2 ? "No exams found — publish without linking, then attach it once the exam exists." : 'No exams match.'}
                </div>
              )}
            </div>

            {!isMulti && selectedExams.length > 0 && existingIntroTitle && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: 'var(--admin-warn-bg, #fffbeb)', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={15} /> This exam already has an Introduction ("{existingIntroTitle}") — Convert &amp; Link will ask you to confirm before replacing it.
              </div>
            )}
          </div>

          {book && (
            <div className="lc-card" style={{ padding: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Convert &amp; Link</label>

              {confirmOverwrite ? (
                <div>
                  <div style={{ marginBottom: '0.85rem', padding: '0.65rem 0.9rem', background: 'var(--admin-warn-bg, #fffbeb)', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.85rem', color: '#92400e' }}>
                    <strong>{selectedExams[0]?.name}</strong> already has an Introduction ("{existingIntroTitle}"). Replace it with this new one?
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button className="lc-btn" onClick={() => setConfirmOverwrite(false)} disabled={publishing}>Cancel</button>
                    <button className="lc-btn primary" onClick={() => doPublish(true)} disabled={publishing}>
                      {publishing ? 'Replacing…' : 'Replace it'}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="lc-btn primary" disabled={!canPublish} onClick={() => doPublish(false)}>
                  {publishing ? 'Converting & Linking…' : publishLabel}
                </button>
              )}

              {publishError && (
                <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8rem', color: '#b91c1c' }}>
                  Convert &amp; Link failed: {publishError}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublishContentPage;
