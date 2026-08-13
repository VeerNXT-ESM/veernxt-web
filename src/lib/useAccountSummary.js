import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Single source of truth for the account-menu header (avatar, name, role,
 * profile readiness, points) — previously fetched independently (and
 * slightly divergently) by both Header.jsx and BottomNav.jsx.
 */
export function useAccountSummary() {
  const [state, setState] = useState({
    loading: true,
    isEmployer: false,
    fullName: '',
    avatarUrl: null,
    profilingCompleted: false,
    pointsBalance: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchSummary = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id === '00000000-0000-0000-0000-000000000000') {
          if (mounted) setState((s) => ({ ...s, loading: false }));
          return;
        }

        const metadataRole = session.user?.user_metadata?.role;
        if (metadataRole === 'candidate') {
          localStorage.removeItem('employer_session');
        }
        const isEmployer = metadataRole === 'employer' || (metadataRole !== 'candidate' && !!localStorage.getItem('employer_session'));

        let fullName = '';
        let avatarUrl = null;
        let profilingCompleted = false;
        let pointsBalance = null;

        if (isEmployer) {
          const { data } = await supabase
            .from('employer_profiles')
            .select('contact_name, avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) {
            fullName = data.contact_name || '';
            avatarUrl = data.avatar_url || null;
          }
        } else {
          const { data } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url, profiling_completed')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) {
            fullName = data.full_name || '';
            avatarUrl = data.avatar_url || null;
            profilingCompleted = !!data.profiling_completed;
          }

          // Own try/catch: points_balance won't exist until
          // sql/points_system.sql has been run against the database.
          try {
            const { data: pointsData } = await supabase
              .from('user_profiles')
              .select('points_balance')
              .eq('id', session.user.id)
              .maybeSingle();
            if (pointsData && pointsData.points_balance != null) {
              pointsBalance = pointsData.points_balance;
            }
          } catch {
            // points system not migrated yet — fine to skip silently
          }
        }

        if (mounted) {
          setState({ loading: false, isEmployer, fullName, avatarUrl, profilingCompleted, pointsBalance });
        }
      } catch (err) {
        console.warn('Could not load account summary', err);
        if (mounted) setState((s) => ({ ...s, loading: false }));
      }
    };

    fetchSummary();
    return () => { mounted = false; };
  }, []);

  return state;
}
