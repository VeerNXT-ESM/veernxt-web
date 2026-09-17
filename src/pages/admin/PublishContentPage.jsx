import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UploadCloud, RefreshCw, Search, CheckCircle2, AlertTriangle, X, Repeat } from 'lucide-react';
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
  const location = useLocation();
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
  const [allExamsInScope, setAllExamsInScope] = useState([]); // every exam matching level(+region) -- the actual dropdown list
  const [loadingExams, setLoadingExams] = useState(false);
  const [examQuery, setExamQuery] = useState(''); // multi-select mode only: client-side filter over allExamsInScope
  const [selectedExams, setSelectedExams] = useState([]); // Intro: length 0-1; Guide/Precis: 0-N
  const [existingIntroTitle, setExistingIntroTitle] = useState(null); // Intro-only "already has one" badge

  const [assignMode, setAssignMode] = useState('new'); // 'new' | 'replace'
  const [existingBooksToReplace, setExistingBooksToReplace] = useState([]);
  const [loadingExistingBooks, setLoadingExistingBooks] = useState(false);
  const [selectedBookToReplace, setSelectedBookToReplace] = useState(null);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [published, setPublished] = useState(null); // { resourceId, examNames, replacedTitle, isReplace }

  const oversized = file && file.size > VERCEL_SAFE_BYTES;
  const regionOptions = regions.filter((r) => r.level === level);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lc_regions').select('id, name, level').order('name');
      setRegions(data || []);
    })();
  }, []);

  // Arrived here from Book Content's own "Replace" button (BooksPage.jsx) --
  // jump straight into Replace mode with that exact book pre-selected,
  // instead of making the admin re-find it in the dropdown below. Runs once
  // on mount only; nothing re-applies this if the admin navigates away and
  // back without a fresh replaceBook in the route state.
  useEffect(() => {
    const incoming = location.state?.replaceBook;
    if (!incoming) return;
    setCategory(incoming.category);
    setAssignMode('replace');
    fetchExistingBooksForCategory(incoming.category, incoming.resourceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setExistingBooksToReplace([]);
    setSelectedBookToReplace(null);
    setExamQuery('');
    setPublished(null);
    setPublishError(null);
    setConfirmOverwrite(false);
  };

  const handleCategoryChange = (next) => {
    if (next === category) return;
    setCategory(next);
    resetSelectionState();
    fetchExistingBooksForCategory(next);
  };

  const handleLevelChange = (e) => {
    setLevel(e.target.value);
    setRegionId('');
    setExamQuery('');
  };

  const fetchExistingBooksForCategory = async (cat, preselectResourceId) => {
    if (!cat) {
      setExistingBooksToReplace([]);
      setSelectedBookToReplace(null);
      return;
    }
    setLoadingExistingBooks(true);
    try {
      // 1. Fetch exact books list from api/admin/save-resource (same list as Book Content / BooksPage)
      const { ok, data } = await callSaveResource({ type: 'books-list', category: cat });
      const booksList = (ok && data?.ok && Array.isArray(data.books)) ? data.books : [];

      if (cat === 'Intro') {
        const [{ data: introRows }, { data: mapRows }] = await Promise.all([
          supabase.from('lc_exam_intro').select('exam_id, resource_id, manual_title, manual_body, exam:lc_exams(id, name)'),
          supabase.from('lc_exam_resource_map').select('id, exam_id, resource_id, category, exam:lc_exams(id, name)').eq('category', 'Intro'),
        ]);

        const examByResId = new Map();
        (introRows || []).forEach((r) => {
          if (r.resource_id && r.exam) examByResId.set(r.resource_id, { examId: r.exam_id, examName: r.exam.name });
        });
        (mapRows || []).forEach((r) => {
          if (r.resource_id && r.exam && !examByResId.has(r.resource_id)) {
            examByResId.set(r.resource_id, { examId: r.exam_id, examName: r.exam.name, mapId: r.id });
          }
        });

        const list = [];
        const seenKeys = new Set();

        booksList.forEach((b) => {
          seenKeys.add(b.resourceId);
          const examInfo = examByResId.get(b.resourceId);
          list.push({
            id: b.resourceId,
            resourceId: b.resourceId,
            title: b.title,
            category: 'Intro',
            chapterCount: b.chapterCount || 1,
            examId: examInfo?.examId || null,
            examName: examInfo?.examName || null,
            mapId: examInfo?.mapId || null,
          });
        });

        (introRows || []).forEach((r) => {
          if (r.resource_id && seenKeys.has(r.resource_id)) return;
          const key = r.resource_id || `manual-${r.exam_id}`;
          if (seenKeys.has(key)) return;
          seenKeys.add(key);

          list.push({
            id: key,
            resourceId: r.resource_id || null,
            examId: r.exam_id,
            examName: r.exam?.name || null,
            title: r.manual_title || (r.exam?.name ? `${r.exam.name} Introduction` : 'Untitled Introduction'),
            category: 'Intro',
            chapterCount: 1,
            isManual: !r.resource_id,
          });
        });

        list.sort((a, b) => a.title.localeCompare(b.title));
        setExistingBooksToReplace(list);
        setSelectedBookToReplace((preselectResourceId && list.find((b) => b.resourceId === preselectResourceId)) || list[0] || null);
      } else {
        // Guide or Precis
        const { data: mapRows } = await supabase
          .from('lc_exam_resource_map')
          .select('id, exam_id, resource_id, category, exam:lc_exams(id, name)')
          .eq('category', cat);

        const examsByResId = new Map();
        (mapRows || []).forEach((m) => {
          if (!m.resource_id) return;
          const prev = examsByResId.get(m.resource_id) || [];
          if (m.exam?.name) prev.push({ examId: m.exam_id, examName: m.exam.name, mapId: m.id });
          examsByResId.set(m.resource_id, prev);
        });

        const list = booksList.map((b) => {
          const linked = examsByResId.get(b.resourceId) || [];
          const examNames = linked.map((l) => l.examName);
          let examSummary = '';
          if (examNames.length === 1) examSummary = examNames[0];
          else if (examNames.length > 1) examSummary = `${examNames[0]} (+${examNames.length - 1} more)`;

          return {
            id: b.resourceId,
            resourceId: b.resourceId,
            title: b.title,
            category: cat,
            chapterCount: b.chapterCount,
            format: 'blocks',
            examName: examSummary || null,
            linkedExams: linked,
            examId: linked[0]?.examId || null,
          };
        });

        list.sort((a, b) => a.title.localeCompare(b.title));
        setExistingBooksToReplace(list);
        setSelectedBookToReplace((preselectResourceId && list.find((b) => b.resourceId === preselectResourceId)) || list[0] || null);
      }
    } catch (err) {
      console.error('Failed to fetch existing books to replace:', err);
      setExistingBooksToReplace([]);
      setSelectedBookToReplace(null);
    } finally {
      setLoadingExistingBooks(false);
    }
  };

  // Loads every exam matching Level(+Region) once per filter change
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

  const examOptions = allExamsInScope.map((exam) => ({
    value: exam.id,
    label: exam.conducting_body?.name ? `${exam.name} — ${exam.conducting_body.name}` : exam.name,
  }));
  const filteredExamsForMulti = (() => {
    const q = examQuery.trim().toLowerCase();
    if (!q) return allExamsInScope;
    return allExamsInScope.filter((exam) => exam.name.toLowerCase().includes(q) || exam.conducting_body?.name?.toLowerCase().includes(q));
  })();

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
      setSelectedExams([exam]);
      fetchExistingIntro(exam.id);
      return;
    }
    setSelectedExams((prev) => (prev.some((e) => e.id === exam.id) ? prev.filter((e) => e.id !== exam.id) : [...prev, exam]));
  };

  const removeSelectedExam = (examId) => setSelectedExams((prev) => prev.filter((e) => e.id !== examId));

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
      if (assignMode === 'replace') {
        fetchExistingBooksForCategory(category);
      }
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
      if (assignMode === 'replace') {
        if (!selectedBookToReplace) {
          throw new Error(`Please select an existing ${category} book to replace.`);
        }

        const { ok, data } = await callSaveResource({
          type: 'content-publish',
          category,
          fileName: file.name,
          book,
          examId: selectedBookToReplace.examId || undefined,
          overwrite: true,
        });
        if (!ok || !data.ok) throw new Error(data.error || 'Replace failed');

        if (category === 'Intro') {
          // If associated with an exam, update lc_exam_intro and lc_exam_resource_map
          if (selectedBookToReplace.examId) {
            await supabase
              .from('lc_exam_intro')
              .upsert(
                { exam_id: selectedBookToReplace.examId, resource_id: data.resourceId, manual_title: null, manual_body: null, source: 'auto', updated_at: new Date().toISOString() },
                { onConflict: 'exam_id' }
              );
            await supabase
              .from('lc_exam_resource_map')
              .delete()
              .eq('exam_id', selectedBookToReplace.examId)
              .eq('category', 'Intro');
            await supabase
              .from('lc_exam_resource_map')
              .insert({
                exam_id: selectedBookToReplace.examId,
                resource_id: data.resourceId,
                category: 'Intro',
                confidence: 'high',
                reasoning: `Replaced intro via Publish Content`,
                source: 'manual',
              });
          }
        } else {
          // Guide or Precis: update all resource mappings pointing to old resource(s) of this book
          const { data: siblingOldRows } = await supabase
            .from('resources')
            .select('resource_id')
            .eq('category', category)
            .ilike('title', selectedBookToReplace.title);

          const allOldResIds = [
            ...new Set([selectedBookToReplace.resourceId, ...(siblingOldRows || []).map((r) => r.resource_id)].filter(Boolean))
          ];

          if (allOldResIds.length > 0) {
            await supabase
              .from('lc_exam_resource_map')
              .update({
                resource_id: data.resourceId,
                confidence: 'high',
                reasoning: `Replaced book "${selectedBookToReplace.title}" via Publish Content`,
                source: 'manual',
              })
              .in('resource_id', allOldResIds);
          }

          // Ensure every linked exam has an active entry in lc_exam_resource_map
          const linkedExamsList = Array.isArray(selectedBookToReplace.linkedExams) ? selectedBookToReplace.linkedExams : [];
          if (selectedBookToReplace.examId && !linkedExamsList.some((l) => l.examId === selectedBookToReplace.examId)) {
            linkedExamsList.push({ examId: selectedBookToReplace.examId });
          }

          for (const link of linkedExamsList) {
            if (link.examId) {
              const { data: existingLink } = await supabase
                .from('lc_exam_resource_map')
                .select('id')
                .eq('exam_id', link.examId)
                .eq('resource_id', data.resourceId)
                .maybeSingle();
              if (!existingLink) {
                await supabase.from('lc_exam_resource_map').insert({
                  exam_id: link.examId,
                  resource_id: data.resourceId,
                  category,
                  confidence: 'high',
                  reasoning: `Replaced book "${selectedBookToReplace.title}" via Publish Content`,
                  source: 'manual',
                });
              }
            }
          }
        }

        // Automatically archive the old replaced book so it goes to Archive
        if (selectedBookToReplace.resourceId) {
          try {
            await callSaveResource({
              type: 'books-archive',
              resourceId: selectedBookToReplace.resourceId,
              excludeResourceId: data.resourceId,
            });
          } catch (archiveErr) {
            console.warn('Archiving old book warning:', archiveErr.message);
          }
        }

        setPublished({
          resourceId: data.resourceId,
          examNames: selectedBookToReplace.examName ? [selectedBookToReplace.examName] : [],
          replacedTitle: selectedBookToReplace.title,
          newTitle: book.title || file.name,
          isReplace: true,
        });
      } else if (isMulti) {
        const { ok, data } = await callSaveResource({ type: 'content-publish', category, fileName: file.name, book });
        if (!ok || !data.ok) throw new Error(data.error || 'Convert & Link failed');
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
        setPublished({ resourceId: data.resourceId, examNames: selectedExams.map((e) => e.name), isReplace: false });
      } else {
        const { ok, status, data } = await callSaveResource({
          type: 'content-publish',
          category: 'Intro',
          examId: selectedExams[0].id,
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
        setPublished({ resourceId: data.resourceId, examNames: [selectedExams[0].name], isReplace: false });
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
    setAssignMode('new');
    resetSelectionState();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canPublish = assignMode === 'replace'
    ? (selectedBookToReplace && book && !publishing)
    : (selectedExams.length > 0 && book && !publishing);

  const publishLabel = assignMode === 'replace'
    ? (selectedBookToReplace ? `Convert & Replace "${selectedBookToReplace.title}"` : `Select a ${category || 'book'} to replace`)
    : isMulti
    ? `Convert & Link to ${selectedExams.length || 0} exam${selectedExams.length === 1 ? '' : 's'}`
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
          <h3 style={{ margin: 0 }}>{published.isReplace ? 'Replaced & Published!' : 'Published!'}</h3>
          <p className="lc-muted-note" style={{ marginTop: '0.4rem' }}>
            {published.isReplace ? (
              <>
                Successfully replaced <strong>"{published.replacedTitle}"</strong> with <strong>"{published.newTitle}"</strong>{published.examNames[0] ? <> on <strong>{published.examNames[0]}</strong></> : null}.
                <br />
                <span style={{ fontSize: '0.82rem', color: '#d97706', display: 'inline-block', marginTop: '0.35rem' }}>
                  📦 The previous book ("{published.replacedTitle}") was automatically moved to the <strong>Archive</strong>.
                </span>
              </>
            ) : isMulti ? (
              <>Attached to <strong>{published.examNames.length}</strong> exam{published.examNames.length === 1 ? '' : 's'}: {published.examNames.join(', ')}</>
            ) : (
              <><strong>{published.examNames[0]}</strong> now has this Introduction live.</>
            )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                {assignMode === 'replace' ? `3. Select existing ${category || 'book'} to replace` : `3. Assign to exam${isMulti ? '(s)' : ''}`}
              </label>
              <div style={{ display: 'inline-flex', background: 'var(--admin-hover-bg, #f1f5f9)', padding: '3px', borderRadius: 8, gap: '3px' }}>
                <button
                  type="button"
                  className={`lc-btn${assignMode === 'new' ? ' primary' : ''}`}
                  onClick={() => {
                    setAssignMode('new');
                    if (selectedExams[0] && !isMulti) {
                      fetchExistingIntro(selectedExams[0].id);
                    }
                  }}
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', borderRadius: 6, border: 'none' }}
                >
                  Assign as New
                </button>
                <button
                  type="button"
                  className={`lc-btn${assignMode === 'replace' ? ' primary' : ''}`}
                  onClick={() => {
                    setAssignMode('replace');
                    if (category) fetchExistingBooksForCategory(category);
                  }}
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', borderRadius: 6, border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Repeat size={13} /> Replace Existing {category || 'Book'}
                </button>
              </div>
            </div>

            {assignMode === 'replace' ? (
              <div>
                <p className="lc-muted-note" style={{ fontSize: '0.82rem', marginBottom: '0.6rem' }}>
                  Select which existing <strong>{category}</strong> book you want to replace:
                </p>
                {loadingExistingBooks ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)', padding: '0.75rem 0' }}>
                    <RefreshCw size={15} className="animate-spin" /> Loading existing {category} books…
                  </div>
                ) : existingBooksToReplace.length === 0 ? (
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--admin-warn-bg, #fffbeb)', border: '1px solid #fde68a', borderRadius: 6, fontSize: '0.8rem', color: '#92400e' }}>
                    No existing {category} books found in the system. If you want to add this as a new book, switch mode to "Assign as New".
                  </div>
                ) : (
                  <div>
                    <Select
                      searchable
                      value={selectedBookToReplace?.id || ''}
                      onChange={(e) => {
                        const found = existingBooksToReplace.find((b) => b.id === e.target.value);
                        if (found) setSelectedBookToReplace(found);
                      }}
                      placeholder={`Search & select an existing ${category} book (${existingBooksToReplace.length} available)…`}
                      options={existingBooksToReplace.map((b) => ({
                        value: b.id,
                        label: `${b.title}${b.chapterCount ? ` (${b.chapterCount} ch)` : ''}${b.examName ? ` — [Exam: ${b.examName}]` : ''}`,
                      }))}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
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

                {!isMulti ? (
                  // Single exam (Intro): the shared searchable Select IS the
                  // dropdown-of-all-exams-in-scope, with react-select's own
                  // built-in type-to-filter as the search -- no separate
                  // "Change" button needed, clicking the box re-opens it.
                  <Select
                    searchable
                    value={selectedExams[0]?.id || ''}
                    onChange={(e) => {
                      const exam = allExamsInScope.find((x) => x.id === e.target.value);
                      if (exam) pickExam(exam);
                    }}
                    disabled={loadingExams}
                    placeholder={loadingExams ? 'Loading exams…' : `Select an exam (${allExamsInScope.length} in scope)…`}
                    options={examOptions}
                  />
                ) : (
                  <>
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
                        placeholder={loadingExams ? 'Loading exams…' : `Filter ${allExamsInScope.length} exam(s) in scope…`}
                        className="lc-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                    {/* Full dropdown-of-all-exams-in-scope, narrowed live by the filter above -- shows everything when it's empty. */}
                    <div className="lc-card" style={{ maxHeight: 260, overflowY: 'auto', padding: '0.35rem' }}>
                      {filteredExamsForMulti.map((exam) => {
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
                          </div>
                        );
                      })}
                      {filteredExamsForMulti.length === 0 && !loadingExams && (
                        <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.85rem' }} className="lc-muted-note">No exams match.</div>
                      )}
                    </div>
                  </>
                )}

                {selectedExams.length > 0 && existingIntroTitle && (
                  <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: 'var(--admin-warn-bg, #fffbeb)', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={15} /> This exam already has an Introduction ("{existingIntroTitle}") — Convert &amp; Link will ask you to confirm before replacing it.
                  </div>
                )}
              </>
            )}
          </div>

          {book && (
            <div className="lc-card" style={{ padding: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                4. {assignMode === 'replace' ? 'Convert & Replace' : 'Convert & Link'}
              </label>

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
                  {publishing ? (assignMode === 'replace' ? 'Converting & Replacing…' : 'Converting & Linking…') : publishLabel}
                </button>
              )}

              {publishError && (
                <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8rem', color: '#b91c1c' }}>
                  {assignMode === 'replace' ? 'Convert & Replace' : 'Convert & Link'} failed: {publishError}
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
