import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 20;

export function useLearningContent({
  regionMode,
  selectedStateMap,
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

  const buildQuery = useCallback((table, isCount = false) => {
    let query;
    if (isCount) {
      query = supabase.from(table).select('*', { count: 'exact', head: true });
    } else {
      query = supabase.from(table).select('*');
    }
    
    if (table === 'resources_v2') {
      query = query.eq('status', 'Published');

      if (regionMode === 'state' || regionMode === 'ut') {
        if (selectedStateMap) {
          query = query.ilike('conducting_body', `%${selectedStateMap}%`);
        }
      } else if (regionMode === 'central') {
        query = query.eq('conducting_body', 'CENTRAL EXAMS');
      }
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
  }, [regionMode, selectedStateMap, selectedCategories, searchQuery]);

  const fetchPage = useCallback(async (pageNum, isInitial = false) => {
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
  }, [buildQuery]);

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
