import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 20;
const MAX_BODY_EXAM_NAMES = 200;

function escapeForOrFilter(value) {
  // Supabase's .or() filter syntax uses commas/parens as delimiters and
  // quotes for values containing special chars — wrap in double quotes and
  // escape any literal quote so exam names with punctuation don't break
  // the filter string.
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

/**
 * Resolves the exam_name list for a conducting body, used ONLY for Central
 * (see buildQuery below) — resources_v2.conducting_body is a flat literal
 * ('CENTRAL EXAMS') for every central row with no per-body text to filter
 * on, so Central needs this exam-name bridge; State/UT rows carry the body
 * name directly in conducting_body and don't need it (a bridge there was
 * actually less precise — many state police/SI exams collapsed to bare
 * generic names like "Sub-Inspector" during the catalog dedup, and an
 * exam_name-based ilike match on a generic name matches every OTHER
 * state's "...Sub-Inspector" rows too; conducting_body's state-qualified
 * text doesn't have that collision).
 *
 * Reads `lc_exams` (conducting_body_id) rather than the unified `exams`
 * table — `exams` is service-role-only (no anon/authenticated SELECT grant,
 * unlike lc_exams which the admin CMS already relies on from the browser),
 * and `exams.exam_id`/`lc_exams.id` are the same UUID space so this is the
 * same identity, just reachable from the client.
 */
async function resolveBodyExamNames(bodyId) {
  const { data, error } = await supabase
    .from('lc_exams')
    .select('name')
    .eq('conducting_body_id', bodyId)
    .limit(MAX_BODY_EXAM_NAMES);
  if (error) {
    console.warn('Could not resolve exam names for conducting body:', error.message);
    return [];
  }
  return (data || []).map((row) => row.name).filter(Boolean);
}

export function useLearningContent({
  regionMode,
  selectedRegionName,
  selectedBodyId,
  selectedBodyName,
  selectedCategories,
  searchQuery
}) {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [hasMoreResources, setHasMoreResources] = useState(true);
  const [hasMoreQuizzes, setHasMoreQuizzes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalResourceCount, setTotalResourceCount] = useState(null);
  const [totalQuizCount, setTotalQuizCount] = useState(null);

  // Only Central needs the exam-name bridge (see resolveBodyExamNames doc).
  const needsBodyExamNames = regionMode === 'central' && !!selectedBodyId;

  // Body-scoped exam names, resolved once per selectedBodyId change (not
  // per page/category/search change) — a separate, lighter fetch than the
  // main paginated content query below.
  const [bodyExamNames, setBodyExamNames] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!needsBodyExamNames) {
      setBodyExamNames(null);
      return;
    }
    resolveBodyExamNames(selectedBodyId).then((names) => {
      if (!cancelled) setBodyExamNames(names);
    });
    return () => { cancelled = true; };
  }, [needsBodyExamNames, selectedBodyId]);

  const buildQuery = useCallback((table, isCount = false) => {
    let query;
    if (isCount) {
      query = supabase.from(table).select('*', { count: 'exact', head: true });
    } else {
      query = supabase.from(table).select('*');
    }

    if (table === 'resources_v2') {
      query = query.eq('status', 'Published');
    }

    if (needsBodyExamNames) {
      if (bodyExamNames && bodyExamNames.length > 0) {
        const orFilter = bodyExamNames.map((name) => `exam_name.ilike.${escapeForOrFilter(`%${name}%`)}`).join(',');
        query = query.or(orFilter);
      }
      // else: still resolving — fetchPage's guard below waits rather than
      // fetching all of Central unscoped for a flash of wrong results.
    } else if ((regionMode === 'state' || regionMode === 'ut') && selectedBodyName) {
      query = query.ilike('conducting_body', `%${selectedBodyName}%`);
    } else if (regionMode === 'state' || regionMode === 'ut') {
      if (selectedRegionName) {
        query = query.ilike('conducting_body', `%${selectedRegionName}%`);
      }
    } else if (regionMode === 'central') {
      query = query.eq('conducting_body', 'CENTRAL EXAMS');
    }

    if (selectedCategories && !selectedCategories.includes('all')) {
      const catFilters = selectedCategories.map(c => `category.eq.${c}`).join(',');
      query = query.or(catFilters);
    }

    if (searchQuery) {
      const filter = `title.ilike."%${searchQuery}%",subject.ilike."%${searchQuery}%",exam_name.ilike."%${searchQuery}%"`;
      query = query.or(filter);
    }

    return query;
  }, [regionMode, selectedRegionName, selectedBodyName, needsBodyExamNames, bodyExamNames, selectedCategories, searchQuery]);

  const fetchPage = useCallback(async (pageNum, isInitial = false) => {
    // Central + a body selected, but its exam names haven't resolved yet.
    if (needsBodyExamNames && bodyExamNames === null) return;

    if (isInitial) {
      setLoading(true);
      setResources([]);
      setQuizzes([]);
      setError(null);
      setHasMoreResources(true);
      setHasMoreQuizzes(true);
      setTotalResourceCount(null);
      setTotalQuizCount(null);
    } else {
      setLoadingMore(true);
    }

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const resQuery = buildQuery('resources_v2').order('created_at', { ascending: false }).range(from, to);
      const quizQuery = buildQuery('quizzes').order('created_at', { ascending: false }).range(from, to);

      const fetches = [resQuery, quizQuery];

      if (isInitial) {
        fetches.push(buildQuery('resources_v2', true));
        fetches.push(buildQuery('quizzes', true));
      }

      const results = await Promise.all(fetches);
      const [resData, quizData] = results;

      if (resData.error || quizData.error) {
        const errMsg = resData.error?.message || quizData.error?.message || 'Unknown database error';
        console.error('Supabase query error:', resData.error || quizData.error);
        setError(`Database retrieval failed: ${errMsg}`);
        return;
      }

      const newResources = resData.data || [];
      const newQuizzes = quizData.data || [];

      if (isInitial) {
        setResources(newResources);
        setQuizzes(newQuizzes);

        const resCount = results[2];
        const quizCount = results[3];
        if (resCount && !resCount.error) setTotalResourceCount(resCount.count);
        if (quizCount && !quizCount.error) setTotalQuizCount(quizCount.count);
      } else {
        setResources(prev => [...prev, ...newResources]);
        setQuizzes(prev => [...prev, ...newQuizzes]);
      }

      if (newResources.length < PAGE_SIZE) setHasMoreResources(false);
      if (newQuizzes.length < PAGE_SIZE) setHasMoreQuizzes(false);
    } catch (err) {
      console.error('Error fetching learning content:', err);
      setError('Unable to fetch learning resources. Please try again.');
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQuery, needsBodyExamNames, bodyExamNames]);

  const fetchContent = useCallback(async () => {
    setPage(0);
    await fetchPage(0, true);
  }, [fetchPage]);

  const loadNextPage = useCallback(() => {
    const hasMore = hasMoreResources || hasMoreQuizzes;
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, false);
  }, [page, hasMoreResources, hasMoreQuizzes, loadingMore, fetchPage]);

  // Debounced initial fetch / refetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchContent]);

  return {
    resources,
    quizzes,
    loading,
    error,
    setError,
    loadingMore,
    hasMore: hasMoreResources || hasMoreQuizzes,
    totalResourceCount,
    totalQuizCount,
    fetchContent,
    loadNextPage
  };
}
