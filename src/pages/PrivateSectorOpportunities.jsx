import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, MapPin, Users, IndianRupee, CheckCircle2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Candidate-facing feed — approved requirements only, two actions only
// ("I'm Interested" / "Not for me"), no employer contact info ever. Per
// docs/VeerNXT_Private_Sector_Implementation_Improvements.md §10/§11.
const PrivateSectorOpportunities = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [interestedIds, setInterestedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [dismissingId, setDismissingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { navigate('/login'); return; }
      setSession(currentSession);

      const { data: profile } = await supabase
        .from('ps_candidate_profiles').select('profile_completed').eq('user_id', currentSession.user.id).maybeSingle();
      setProfileCompleted(!!profile?.profile_completed);

      const { data: requirements } = await supabase
        .from('ps_job_requirements').select('*').eq('status', 'approved').order('created_at', { ascending: false });
      setOpportunities(requirements || []);

      const { data: interests } = await supabase
        .from('ps_candidate_interest').select('requirement_id').eq('user_id', currentSession.user.id);
      setInterestedIds(new Set((interests || []).map((i) => i.requirement_id)));

      setLoading(false);
    })();
  }, [navigate]);

  const expressInterest = async (requirementId) => {
    if (!profileCompleted) {
      navigate(`/private-sector/profile?returnTo=/private-sector/opportunities`);
      return;
    }
    setBusyId(requirementId);
    try {
      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'express_interest', requirement_id: requirementId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to express interest');
      setInterestedIds((prev) => new Set([...prev, requirementId]));
    } catch (err) {
      console.error('Failed to express interest:', err);
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = (requirementId) => {
    // Not stored server-side (docs/VeerNXT_Private_Sector_Implementation_Improvements.md §11)
    // — purely a client-side dismiss from the current view, with a brief
    // neutral confirmation before it disappears.
    setDismissingId(requirementId);
    setTimeout(() => {
      setDismissedIds((prev) => new Set([...prev, requirementId]));
      setDismissingId(null);
    }, 900);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
      </div>
    );
  }

  const visible = opportunities.filter((o) => !dismissedIds.has(o.id));

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.35rem' }}>Private Sector Opportunities</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>Opportunities matched to your skills, experience and preferences.</p>
      </div>

      {!profileCompleted && (
        <Card padding="md" style={{ marginBottom: '1.5rem', background: '#fff8f0', border: '1px solid #f3d9a8' }}>
          <strong style={{ display: 'block', marginBottom: '0.3rem' }}>Complete your profile first</strong>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#7a5a1e' }}>
            Before we share your details with our HR team, we need a few more details about the kind of work you're looking for.
          </p>
          <Button size="sm" onClick={() => navigate('/private-sector/profile?returnTo=/private-sector/opportunities')}>Complete Private Sector Profile →</Button>
        </Card>
      )}

      {visible.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          No opportunities available right now — check back soon.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visible.map((opp) => {
            const isInterested = interestedIds.has(opp.id);
            return (
              <Card key={opp.id} padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>{(opp.role_titles || []).join(' / ')}</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Users size={14} /> {opp.quantity} positions</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> {(opp.locations || []).join(', ')}</span>
                      {opp.salary_range && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><IndianRupee size={14} /> {opp.salary_range}</span>}
                    </div>
                    {opp.description && <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--ios-text)' }}>{opp.description}</p>}
                    {opp.requirements_text && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Requirements:</strong> {opp.requirements_text}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  {dismissingId === opp.id ? (
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Got it.</span>
                  ) : isInterested ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: '#15803d' }}>
                      <CheckCircle2 size={16} /> Interest expressed — VeerNXT HR will be in touch
                    </span>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => expressInterest(opp.id)} disabled={busyId === opp.id}>
                        {busyId === opp.id ? 'Please wait…' : "I'm Interested"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => dismiss(opp.id)}>Not for me</Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PrivateSectorOpportunities;
