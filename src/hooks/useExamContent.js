import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const RESOURCE_CATEGORIES = ['Intro', 'Guide', 'Precis', 'PYQ'];

// Precomputed, Gemini-verified exam -> resources_v2 mapping (see
// scripts/map_exam_resources_gemini.mjs, status_report.md §29.3) —
// checked first when an examId is available. No FK to resources_v2 (that
// table has no unique constraint Postgres can target), so this is two
// queries: mapping rows, then the resources they point at.
async function fetchMappedResources(examId) {
  const { data: mappings } = await supabase
    .from('lc_exam_resource_map')
    .select('resource_id')
    .eq('exam_id', examId);
  if (!mappings || mappings.length === 0) return null; // no mapping yet -> caller falls back

  const resourceIds = mappings.map((m) => m.resource_id);
  const { data: resources } = await supabase.from('resources_v2').select('*').in('resource_id', resourceIds);
  return resources || [];
}

// resources_v2 exam_name carries a "N. " ordinal prefix from CMS ingestion
// that the unified exams.exam_name never has, so an exact match misses
// real, published content — exact -> ilike substring -> career-track
// keyword fallback, same chain proven in Dashboard.jsx's old
// PreparationPanel. Used for resources only when lc_exam_resource_map has
// no rows for this exam yet (see fetchMappedResources above); quizzes
// always use this chain since Phase 1 of the mapping work didn't cover
// quizzes.
async function fetchResourcesFallback(examName, careerTrack) {
  let resData = await supabase.from('resources_v2').select('*').eq('exam_name', examName);

  if (!resData.data || resData.data.length === 0) {
    const escaped = examName.replace(/[%_]/g, (c) => `\\${c}`);
    resData = await supabase.from('resources_v2').select('*').ilike('exam_name', `%${escaped}%`);
  }

  if ((!resData.data || resData.data.length === 0) && careerTrack) {
    const fallbackTerm = careerTrackKeyword(examName, careerTrack);
    resData = await supabase.from('resources_v2').select('*').ilike('exam_name', `%${fallbackTerm}%`);
  }

  return resData.data || [];
}

// resources_v2 has one row per exam-folder copy of the same canonical
// document (e.g. ~850 separate "ENGLISH" rows, one per exam), so a
// resource picked by exam-name matching or lc_exam_resource_map may be a
// different physical row than the one scripts/migrate_resources_to_blocks.mjs
// updated to the new format for that same title — verified live: of 9,766
// migrated rows, only 138 were the exact resource_id the mapping table
// referenced. Redirect any 'html' resource to its 'blocks' sibling (same
// title + category) when one exists, so a migrated title actually shows
// the new format regardless of which duplicate row got selected upstream.
async function upgradeToCanonicalFormat(resources) {
  const needsUpgrade = resources.filter((r) => r.format !== 'blocks' && r.title);
  if (needsUpgrade.length === 0) return resources;

  const titles = [...new Set(needsUpgrade.map((r) => r.title.trim()))];
  const { data: canonicalRows } = await supabase
    .from('resources_v2')
    .select('resource_id,title,category,format,storage_base_url')
    .eq('format', 'blocks')
    .in('title', titles);
  if (!canonicalRows || canonicalRows.length === 0) return resources;

  const canonicalByKey = new Map();
  for (const c of canonicalRows) {
    const key = `${c.title.trim().toLowerCase()}::${c.category}`;
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, c);
  }

  return resources.map((r) => {
    if (r.format === 'blocks' || !r.title) return r;
    const canonical = canonicalByKey.get(`${r.title.trim().toLowerCase()}::${r.category}`);
    return canonical ? { ...r, resource_id: canonical.resource_id, format: canonical.format, storage_base_url: canonical.storage_base_url } : r;
  });
}

function careerTrackKeyword(examName, careerTrack) {
  if (careerTrack === 'POLICE_CAPF') return 'Constable';
  if (careerTrack === 'SSC') return 'SSC';
  if (careerTrack === 'RAILWAYS') return 'RRB';
  if (careerTrack === 'BANKING') return 'IBPS';
  if (careerTrack === 'DEFENCE') return 'Defence';
  return examName.split(' ')[0];
}

async function fetchQuizzesByExamName(examName, careerTrack, category = 'Mock Test') {
  let quizData = await supabase.from('quizzes').select('*').eq('exam_name', examName).eq('category', category);

  if (!quizData.data || quizData.data.length === 0) {
    const escaped = examName.replace(/[%_]/g, (c) => `\\${c}`);
    quizData = await supabase.from('quizzes').select('*').ilike('exam_name', `%${escaped}%`).eq('category', category);
  }

  if ((!quizData.data || quizData.data.length === 0) && careerTrack) {
    const fallbackTerm = careerTrackKeyword(examName, careerTrack);
    quizData = await supabase.from('quizzes').select('*').ilike('exam_name', `%${fallbackTerm}%`).eq('category', category);
  }

  return quizData.data || [];
}

function groupByCategory(resources) {
  const byCategory = Object.fromEntries(RESOURCE_CATEGORIES.map((c) => [c, []]));
  for (const res of resources) {
    const cat = RESOURCE_CATEGORIES.find((c) => c.toLowerCase() === (res.category || '').toLowerCase().trim());
    (byCategory[cat] || (byCategory.Other ||= [])).push(res);
  }
  return byCategory;
}

/**
 * Full (non-teaser) content lookup for an exam, grouped by category —
 * used by the exam syllabus page (src/pages/ExamSyllabus.jsx) and
 * ExamContentPreview.jsx. Prefers the precomputed lc_exam_resource_map
 * (examId) for resources when available; falls back to the exam-name
 * matching chain otherwise, so nothing regresses for exams the mapping
 * script hasn't covered.
 */
export function useExamContent(examName, careerTrack, examId) {
  const [byCategory, setByCategory] = useState(() => groupByCategory([]));
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!examName) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [mappedResources, quizRows] = await Promise.all([
          examId ? fetchMappedResources(examId) : Promise.resolve(null),
          fetchQuizzesByExamName(examName, careerTrack),
        ]);

        const rawResources = mappedResources !== null ? mappedResources : await fetchResourcesFallback(examName, careerTrack);
        const resources = await upgradeToCanonicalFormat(rawResources);

        if (!mounted) return;
        setByCategory(groupByCategory(resources));
        setQuizzes(quizRows);
      } catch (err) {
        console.error('Error fetching exam content:', err);
        if (mounted) setError('Unable to load content for this exam.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [examName, careerTrack, examId]);

  return { byCategory, quizzes, loading, error };
}
