import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import Card from './Card';
import Button from './Button';

/**
 * Shared shell for a one-question-at-a-time guided journey (candidate
 * profiling, employer onboarding). Two things happen at once: a numbered
 * rail tracks progress through named *stages*, while each individual
 * *step* asks one focused question with live, contextual insight copy
 * alongside it — the "VeerNXT is actively analysing" feeling comes from
 * that insight rail updating as questions are answered, not from a score
 * ticking up.
 *
 * stages: [{ id, label }] — the named sections (e.g. Identity, Service…)
 * activeStageId: which stage the current step belongs to
 * stepNumber/totalSteps: fine-grained question progress within the journey
 * insights: [{ icon: LucideIcon, label, detail }] — accumulated so far
 */
export default function GuidedStep({
  stages,
  activeStageId,
  stepNumber,
  totalSteps,
  title,
  helpText,
  insights = [],
  onBack,
  backDisabled = false,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  loading = false,
  skipLabel,
  onSkip,
  children,
}) {
  const activeStageIndex = stages.findIndex((s) => s.id === activeStageId);
  const progressPct = Math.round((stepNumber / totalSteps) * 100);

  return (
    <div className="gs-wrap">
      {/* Stage rail */}
      <div className="gs-stage-rail" role="list" aria-label="Journey stages">
        {stages.map((stage, idx) => {
          const done = idx < activeStageIndex;
          const active = idx === activeStageIndex;
          return (
            <div key={stage.id} role="listitem" className={`gs-stage-node ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              <span className="gs-stage-dot">{done ? <Check size={12} /> : idx + 1}</span>
              <span className="gs-stage-label">{stage.label}</span>
            </div>
          );
        })}
      </div>
      <div className="gs-progress-track" role="progressbar" aria-valuenow={stepNumber} aria-valuemin={1} aria-valuemax={totalSteps}>
        <div className="gs-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="gs-step-count">Question {stepNumber} of {totalSteps}</p>

      <div className="gs-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepNumber}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="gs-question-col"
          >
            <Card padding="lg" className="gs-question-card">
              <h2 className="gs-question-title">{title}</h2>
              {helpText && <p className="gs-question-help">{helpText}</p>}
              <div className="gs-question-content">{children}</div>

              <div className="gs-nav">
                <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onBack} disabled={backDisabled || loading}>
                  Back
                </Button>
                <div className="gs-nav-right">
                  {onSkip && (
                    <Button type="button" variant="ghost" onClick={onSkip} disabled={loading}>
                      {skipLabel || 'Skip'}
                    </Button>
                  )}
                  <Button type="button" size="lg" icon={loading ? undefined : ArrowRight} onClick={onNext} disabled={nextDisabled || loading}>
                    {loading ? 'Please wait…' : nextLabel}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="gs-insight-col">
          <Card padding="md" elevated={false} className="gs-insight-card">
            <div className="gs-insight-head">
              <Sparkles size={16} />
              <span>What we're learning about you</span>
            </div>
            {insights.length === 0 ? (
              <p className="gs-insight-empty">We'll surface insights here as your answers come in.</p>
            ) : (
              <ul className="gs-insight-list">
                {insights.map((insight, i) => {
                  const Icon = insight.icon || Sparkles;
                  return (
                    <motion.li
                      key={insight.label + i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 4) * 0.05, ease: 'easeOut' }}
                    >
                      <Icon size={15} />
                      <div>
                        <span className="gs-insight-label">{insight.label}</span>
                        {insight.detail && <span className="gs-insight-detail">{insight.detail}</span>}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <style>{`
        .gs-wrap { max-width: 920px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
        .gs-stage-rail {
          display: flex;
          justify-content: space-between;
          gap: 0.25rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .gs-stage-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          flex: 1;
          min-width: 64px;
        }
        .gs-stage-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--border-strong);
          background: var(--surface);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .gs-stage-node.active .gs-stage-dot {
          border-color: var(--ios-olive);
          color: var(--ios-olive);
          box-shadow: 0 0 0 4px rgba(75,107,50,0.12);
        }
        .gs-stage-node.done .gs-stage-dot {
          background: var(--ios-olive);
          border-color: var(--ios-olive);
          color: #fff;
        }
        .gs-stage-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: center;
          white-space: nowrap;
        }
        .gs-stage-node.active .gs-stage-label { color: var(--ios-olive); }
        .gs-progress-track {
          height: 4px;
          border-radius: var(--radius-pill);
          background: var(--surface-alt);
          overflow: hidden;
          margin-bottom: 0.4rem;
        }
        .gs-progress-fill {
          height: 100%;
          background: var(--ios-olive);
          border-radius: var(--radius-pill);
          transition: width 0.3s ease;
        }
        .gs-step-count {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 1.5rem;
        }
        .gs-body {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .gs-question-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--ios-text);
          margin: 0 0 0.4rem;
          letter-spacing: -0.01em;
        }
        .gs-question-help {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin: 0 0 1.5rem;
        }
        .gs-question-content { margin-bottom: 2rem; }
        .gs-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border);
          padding-top: 1.25rem;
        }
        .gs-nav-right { display: flex; gap: 0.5rem; align-items: center; }
        .gs-insight-card { position: sticky; top: 1.5rem; }
        .gs-insight-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--ios-olive);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.9rem;
        }
        .gs-insight-empty {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        .gs-insight-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.9rem; }
        .gs-insight-list li { display: flex; gap: 0.6rem; align-items: flex-start; color: var(--ios-olive); }
        .gs-insight-list li > div { display: flex; flex-direction: column; gap: 0.1rem; }
        .gs-insight-label { font-size: 0.85rem; font-weight: 700; color: var(--ios-text); }
        .gs-insight-detail { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; }

        @media (max-width: 760px) {
          .gs-body { grid-template-columns: 1fr; }
          .gs-insight-card { position: static; }
          .gs-stage-label { display: none; }
        }
      `}</style>
    </div>
  );
}
