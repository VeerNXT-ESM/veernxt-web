import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const RESOURCE_CATEGORIES = ['Intro', 'Guide', 'Precis', 'PYQ'];

// resources_v2/quizzes exam_name carries a "N. " ordinal prefix from CMS
// ingestion that the unified exams.exam_name never has, so an exact match
// misses real, published content — same fallback chain proven in
// Dashboard.jsx's PreparationPanel, generalized here (no result cap, grouped
// by category) so the syllabus page can show the full content list.
async function fetchByExamName(examName, careerTrack) {
  // Each stage below runs the resources_v2/quizzes queries in parallel
  // (Promise.all) rather than sequential awaits — this table's real-world
  // Supabase round-trip runs ~2-3s in this environment, so awaiting two of
  // them back-to-back visibly doubled the wait for what's usually a single
  // exact-match hit (confirmed live: "HAL Recruitment" resolves on the
  // first query alone).
  let [resData, quizData] = await Promise.all([
    supabase.from('resources_v2').select('*').eq('exam_name', examName),
    supabase.from('quizzes').select('*').eq('exam_name', examName),
  ]);

  const needResIlike = !resData.data || resData.data.length === 0;
  const needQuizIlike = !quizData.data || quizData.data.length === 0;
  if (needResIlike || needQuizIlike) {
    const escaped = examName.replace(/[%_]/g, (c) => `\\${c}`);
    const [resIlike, quizIlike] = await Promise.all([
      needResIlike ? supabase.from('resources_v2').select('*').ilike('exam_name', `%${escaped}%`) : null,
      needQuizIlike ? supabase.from('quizzes').select('*').ilike('exam_name', `%${escaped}%`) : null,
    ]);
    if (resIlike) resData = resIlike;
    if (quizIlike) quizData = quizIlike;
  }

  if ((!resData.data || resData.data.length === 0) && careerTrack) {
    let fallbackTerm = examName.split(' ')[0];
    if (careerTrack === 'POLICE_CAPF') fallbackTerm = 'Constable';
    else if (careerTrack === 'SSC') fallbackTerm = 'SSC';
    else if (careerTrack === 'RAILWAYS') fallbackTerm = 'RRB';
    else if (careerTrack === 'BANKING') fallbackTerm = 'IBPS';
    else if (careerTrack === 'DEFENCE') fallbackTerm = 'Defence';

    [resData, quizData] = await Promise.all([
      supabase.from('resources_v2').select('*').ilike('exam_name', `%${fallbackTerm}%`),
      supabase.from('quizzes').select('*').ilike('exam_name', `%${fallbackTerm}%`),
    ]);
  }

  return { resources: resData.data || [], quizzes: quizData.data || [] };
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
 * used by the exam syllabus page (src/pages/ExamSyllabus.jsx). Same
 * matching logic as Dashboard.jsx's PreparationPanel, without the .limit(3)
 * teaser cap.
 */
export function useExamContent(examName, careerTrack) {
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

    fetchByExamName(examName, careerTrack)
      .then(({ resources, quizzes: quizRows }) => {
        if (!mounted) return;
        setByCategory(groupByCategory(resources));
        setQuizzes(quizRows);
      })
      .catch((err) => {
        console.error('Error fetching exam content:', err);
        if (mounted) setError('Unable to load content for this exam.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [examName, careerTrack]);

  return { byCategory, quizzes, loading, error };
}
