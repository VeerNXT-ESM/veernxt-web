import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionBanner from './SectionBanner';
import { V2_SECTIONS } from './sections';

/** The universal landing page: pick a section. Dashboard lives behind the avatar. */
export default function UniversalLanding() {
  return (
    <>
      <SectionBanner
        title="Welcome to VeerNXT"
        subtitle="From Service to a Prosperous Tomorrow — choose where you want to go."
        color="#1F3A2E"
      />
      <div className="v2-container">
        <div className="v2-section-grid">
          {V2_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.key} to={s.to} className="v2-section-tile" style={{ background: s.color }}>
                <span className="v2-section-tile-icon"><Icon size={34} /></span>
                <h2>{s.label}</h2>
                <p>{s.blurb}</p>
                <span className="v2-section-tile-cta">Open {s.label} <ArrowRight size={16} /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
