import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Landmark, MapPin, RefreshCw, ArrowRight, Target, Rocket, PlayCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { getEffectiveTier, TIERS } from '../lib/subscriptionAccess';
import ExamContentPreview from '../components/ExamContentPreview';
import TodayObjectiveCard from '../components/learning/TodayObjectiveCard';
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
  const [isPrimaryTarget, setIsPrimaryTarget] = useState(false);
  const [preparingLoading, setPreparingLoading] = useState(false);

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
    const checkTargetAndTier = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;

      // Tier check
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_expires_at, free_quiz_used')
        .eq('id', session.user.id)
        .maybeSingle();
      if (mounted && profile) {
        setEffectiveTier(getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at));
        setFreeQuizUsed(!!profile.free_quiz_used);
      }

      // Exam target check
      try {
        const { data: targets } = await supabase
          .from('user_exam_targets')
          .select('is_primary')
          .eq('user_id', session.user.id)
          .eq('exam_id', examId)
          .maybeSingle();
        if (mounted && targets) {
          setIsPrimaryTarget(targets.is_primary);
        }
      } catch (e) {
        console.warn('user_exam_targets check warning:', e);
      }
    };
    checkTargetAndTier();
    return () => { mounted = false; };
  }, [examId]);

  const handleMakePrimary = async () => {
    setPreparingLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase
        .from('user_exam_targets')
        .update({ is_primary: false })
        .eq('user_id', session.user.id);

      await supabase
        .from('user_exam_targets')
        .upsert(
          {
            user_id: session.user.id,
            exam_id: examId,
            is_primary: true,
            status: 'active',
            last_activity_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,exam_id' }
        );

      setIsPrimaryTarget(true);
    } catch (err) {
      console.error('Error setting primary exam target:', err);
    } finally {
      setPreparingLoading(false);
    }
  };

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

  const objective = {
    type: 'read',
    title: `Explore ${exam.name} Syllabus`,
    subtitle: 'Review subjects, guidebooks, précis, and past question papers for your exam.',
    targetUrl: '#section-guide',
  };

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ width: '110px', flexShrink: 0 }}>
          <ExamThumbnail
            label={exam.name}
            conductingBodyName={exam.conductingBody}
            thumbnailSubject={exam.thumbnailSubject}
            size="lg"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{exam.name}</h1>
            {isPrimaryTarget ? (
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Target size={13} /> Current Primary Mission
              </span>
            ) : (
              <button
                type="button"
                onClick={handleMakePrimary}
                disabled={preparingLoading}
                style={{
                  background: 'var(--ios-olive, #4b6b32)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Rocket size={13} /> {preparingLoading ? 'Updating…' : 'Set as Primary Target'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', color: '#64748b', fontSize: '0.9rem' }}>
            {exam.conductingBody && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Landmark size={14} /> {exam.conductingBody}</span>}
            {exam.region && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={14} /> {exam.region}</span>}
          </div>
        </div>
      </div>

      <TodayObjectiveCard examId={examId} examName={exam.name} objective={objective} compact />

      {subjects.length > 0 && (
        <Card padding="sm" style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--ios-olive)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>Syllabus Subjects</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {subjects.map((s) => (
              <span key={s} style={{ background: 'var(--ios-olive-tint, #eef2e6)', color: 'var(--ios-olive)', borderRadius: '999px', padding: '0.3rem 0.8rem', fontSize: '0.85rem', fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Practice Loop Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <Link
          to={`/quiz-center?exam=${examId}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border, #e2e8f0)',
            background: '#fff',
            textDecoration: 'none',
            color: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--ios-olive-tint, #f4f7f2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlayCircle size={22} color="var(--ios-olive, #4b6b32)" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Practice Mock Tests</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Timed tests for {exam.name}</div>
          </div>
        </Link>

        <Link
          to={`/pyq-center?exam=${examId}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border, #e2e8f0)',
            background: '#fff',
            textDecoration: 'none',
            color: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--ios-olive-tint, #f4f7f2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={22} color="var(--ios-olive, #4b6b32)" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Practice PYQs</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Previous year questions</div>
          </div>
        </Link>
      </div>

      <div id="section-guide" style={{ marginBottom: '1.75rem', scrollMarginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Preparation Material</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>Explore your study materials by subject. Click the check icon on any material to track your progress.</p>
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
