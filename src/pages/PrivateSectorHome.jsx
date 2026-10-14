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
    <div className="ps-home">
      <Card padding="lg" className="ps-home-card">
        {/* On phones this block becomes the dark hero banner; on larger screens it is just the card's content. */}
        <div className="ps-home-hero">
          {!completed ? (
            <>
              <Briefcase size={28} className="ps-home-icon" />
              <h1 className="ps-home-title">Improve Your Profile</h1>
              <p className="ps-home-text">
                Complete your Private Sector Profile to discover opportunities that match your skills and experience.
              </p>
              <div className="ps-home-actions">
                <Button size="lg" onClick={() => navigate('/private-sector/profile')}>Complete Profile →</Button>
              </div>
            </>
          ) : (
            <>
              <Briefcase size={28} className="ps-home-icon" />
              <h1 className="ps-home-title">Private Sector Opportunities</h1>
              <p className="ps-home-text">
                Opportunities matched to your skills, experience and preferences.
              </p>
              <div className="ps-home-actions">
                <Button size="lg" onClick={() => navigate('/private-sector/opportunities')}>View Opportunities →</Button>
                <Link to="/private-sector/profile" className="ps-home-edit">Edit profile</Link>
              </div>
            </>
          )}
        </div>

        <div className="ps-home-verified">
          {verification?.status === 'verified' ? (
            <span className="ps-verified-ok">
              <ShieldCheck size={16} /> VeerNXT Verified
            </span>
          ) : verification ? (
            <span className="ps-verified-pending">
              <Clock size={16} /> Verification Pending
            </span>
          ) : (
            <span className="ps-verified-none">Service verification not started yet.</span>
          )}
        </div>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        .ps-home {
          max-width: 720px;
          margin: 0 auto;
          padding: 2.5rem 1.25rem;
        }
        .ps-home-icon {
          color: var(--ios-olive);
        }
        .ps-home-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0.75rem 0 0.5rem;
        }
        .ps-home-text {
          color: var(--text-secondary);
          margin: 0 0 1.5rem;
        }
        .ps-home-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .ps-home-edit {
          font-size: 0.85rem;
          color: var(--ios-olive);
          font-weight: 700;
          text-decoration: none;
        }
        .ps-home-verified {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ps-verified-ok,
        .ps-verified-pending {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .ps-verified-ok { color: #15803d; }
        .ps-verified-pending { color: #b45309; }
        .ps-verified-none {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .ps-home a:focus-visible {
          outline: 3px solid var(--accent-gold, #fbbf24);
          outline-offset: 2px;
        }

        /* Tablets and phones: dark hero banner, verified status beneath it */
        @media (max-width: 992px) {
          .ps-home {
            padding: 1rem 14px 1.5rem;
          }
          .ps-home-card {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .ps-home-hero {
            padding: 1.75rem 1.25rem 1.5rem;
            border-radius: 16px;
            color: #ffffff;
            background:
              linear-gradient(180deg, rgba(8, 28, 20, 0.78) 0%, rgba(8, 28, 20, 0.92) 100%),
              url('/veernxt_assets/banners/B05_military_to_career.png') center / cover no-repeat;
            box-shadow: var(--shadow-2);
          }
          .ps-home-icon {
            color: var(--accent-gold, #fbbf24);
          }
          .ps-home-title {
            font-size: clamp(1.6rem, 7.5vw, 2rem);
            line-height: 1.12;
            color: #ffffff;
            margin: 0.6rem 0 0.5rem;
          }
          .ps-home-text {
            color: rgba(255, 255, 255, 0.88);
            font-size: 1rem;
            line-height: 1.45;
            margin-bottom: 1.25rem;
          }
          .ps-home-actions button {
            min-height: 48px;
            justify-content: center;
          }
          .ps-home-edit {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
            padding: 0 1.5rem;
            border: 1.5px solid rgba(255, 255, 255, 0.65);
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.22);
            color: #ffffff;
            font-size: 0.95rem;
          }
          .ps-home-verified {
            justify-content: center;
            margin-top: 0.9rem;
            padding-top: 0;
            border-top: none;
          }
        }
        @media (max-width: 767px) {
          .ps-home-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 0.65rem;
          }
          .ps-home-actions button {
            width: 100%;
          }
          .ps-home-edit {
            display: flex;
            padding: 0;
          }
        }
      `}} />
    </div>
  );
};

export default PrivateSectorHome;
