import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Shown once, immediately after employer onboarding completes, per
// docs/VeerNXT_Private_Sector_Implementation_Improvements.md §1 — the
// dashboard is for returning employers, not the first thing a newly
// onboarded employer sees.
const EmployerReadyToHire = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--ios-bg)', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <Card padding="lg" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(75,107,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Briefcase size={26} color="var(--ios-olive)" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>You're ready to hire through VeerNXT</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem' }}>
          Tell us who you're looking for and our HR team will help find suitable candidates.
        </p>
        <Button size="lg" fullWidth onClick={() => navigate('/employer/post-job')}>Post Your First Job →</Button>
        <button type="button" onClick={() => navigate('/employer/dashboard')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Skip for now
        </button>
      </Card>
    </div>
  );
};

export default EmployerReadyToHire;
