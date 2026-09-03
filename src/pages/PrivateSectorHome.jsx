import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, Briefcase, ShieldCheck, Clock } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Candidate entry point for the Private Sector module — two states per
// docs/VeerNXT_Private_Sector_Implementation_Improvements.md §17.
const PrivateSectorHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: profileData } = await supabase
        .from('ps_candidate_profiles').select('*').eq('user_id', session.user.id).maybeSingle();
      setProfile(profileData || null);

      const { data: verificationData } = await supabase
        .from('ps_verifications').select('*').eq('user_id', session.user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      setVerification(verificationData || null);

      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
      </div>
    );
  }

  const completed = !!profile?.profile_completed;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.25rem' }}>
      <Card padding="lg">
        {!completed ? (
          <>
            <Briefcase size={28} color="var(--ios-olive)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.75rem 0 0.5rem' }}>Improve Your Profile</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
              Complete your Private Sector Profile to discover opportunities that match your skills and experience.
            </p>
            <Button size="lg" onClick={() => navigate('/private-sector/profile')}>Complete Profile →</Button>
          </>
        ) : (
          <>
            <Briefcase size={28} color="var(--ios-olive)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.75rem 0 0.5rem' }}>Private Sector Opportunities</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
              Opportunities matched to your skills, experience and preferences.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button size="lg" onClick={() => navigate('/private-sector/opportunities')}>View Opportunities →</Button>
              <Link to="/private-sector/profile" style={{ fontSize: '0.85rem', color: 'var(--ios-olive)', fontWeight: 700, textDecoration: 'none' }}>Edit profile</Link>
            </div>
          </>
        )}

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {verification?.status === 'verified' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#15803d' }}>
              <ShieldCheck size={16} /> VeerNXT Verified
            </span>
          ) : verification ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>
              <Clock size={16} /> Verification Pending
            </span>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Service verification not started yet.</span>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PrivateSectorHome;
