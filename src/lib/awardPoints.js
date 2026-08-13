import axios from 'axios';
import { supabase } from './supabase';

/**
 * Fire-and-forget call to /api/points/actions (type: 'award'). Failures are
 * logged and swallowed — earning points is a bonus on top of the action
 * (opening a resource, finishing a quiz, printing a resume), never a
 * blocker for it.
 */
export async function awardPoints(actionCode, { refId, metadata } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const res = await axios.post('/api/points/actions', {
      type: 'award',
      action_code: actionCode,
      ref_id: refId,
      metadata,
    }, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    return res.data;
  } catch (err) {
    console.error(`Error awarding points for ${actionCode}:`, err);
    return null;
  }
}
