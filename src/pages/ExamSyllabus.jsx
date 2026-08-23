import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Landmark, MapPin, RefreshCw, ArrowRight } from 'lucide-react';
import { getEffectiveTier, TIERS } from '../lib/subscriptionAccess';
import ExamContentPreview from '../components/ExamContentPreview';
import Card from '../components/ui/Card';
import ExamThumbnail from './admin/ExamThumbnail';
import './ExamSyllabus.css';

const ExamSyllabus = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [examLoading, setExamLoading] = useState(true);
  const [examError, setExamError] = useState(null);
  const [effectiveTier, setEffectiveTier] = useState(TIERS.FREE);
  const [freeQuizUsed, setFreeQuizUsed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setExamLoading(true);
      setExamError(null);
      try {
        const res = await fetch(`/api/exams?examId=${encodeURIComponent(examId)}`);
        const data = await res.json();
        if (!mounted) return;
        if (!data.ok) {
          setExamError(data.error || 'Exam not found.');
        } else {
          setExam(data.exam);
        }
      } catch (err) {
        console.error('Error loading exam:', err);
        if (mounted) setExamError('Unable to load this exam right now.');
      } finally {
        if (mounted) setExamLoading(false);
      }
    };
    if (examId) load();
    return () => { mounted = false; };
  }, [examId]);

  useEffect(() => {
    let mounted = true;
    const loadTier = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_expires_at, free_quiz_used')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!mounted || !profile) return;
      setEffectiveTier(getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at));
      setFreeQuizUsed(!!profile.free_quiz_used);
    };
    loadTier();
    return () => { mounted = false; };
  }, []);

  if (examLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <RefreshCw className="animate-spin" size={28} color="var(--ios-olive)" />
      </div>
    );
  }

  if (examError || !exam) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <p>{examError || 'Exam not found.'}</p>
        <Link to="/learning-center">Back to Learning Center</Link>
      </div>
    );
  }

  const subjects = Object.entries(exam.subjects || {}).filter(([, v]) => String(v).toLowerCase() === 'yes').map(([k]) => k);

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ width: '110px', flexShrink: 0 }}>
          <ExamThumbnail
            label={exam.name}
            conductingBodyName={exam.conductingBody}
            thumbnailSubject={exam.thumbnailSubject}
            size="lg"
          />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{exam.name}</h1>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', color: '#64748b', fontSize: '0.9rem' }}>
            {exam.conductingBody && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Landmark size={14} /> {exam.conductingBody}</span>}
            {exam.region && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={14} /> {exam.region}</span>}
          </div>
        </div>
      </div>

      {subjects.length > 0 && (
        <Card padding="sm" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--ios-olive)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>Syllabus</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {subjects.map((s) => (
              <span key={s} style={{ background: 'var(--ios-olive-tint, #eef2e6)', color: 'var(--ios-olive)', borderRadius: '999px', padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </Card>
      )}

      <div id="section-guide" style={{ marginBottom: '1.75rem', scrollMarginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Preparation Material</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>Explore your preparation material by subject.</p>
        <ExamContentPreview
          examId={exam.id}
          examName={exam.name}
          careerTrack={exam.careerTrack}
          tier={effectiveTier}
          freeQuizUsed={freeQuizUsed}
          variant="subjects"
        />
      </div>

      <Card as={Link} to="/subscribe" interactive style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <BookOpen size={22} color="var(--ios-olive)" />
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Unlock the full library</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Précis, PYQs, and unlimited mock tests for every matched exam.</p>
        </div>
        <ArrowRight size={18} />
      </Card>
    </div>
  );
};

export default ExamSyllabus;
