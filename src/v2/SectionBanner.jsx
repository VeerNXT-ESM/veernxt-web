import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Banner that states which section the user is in. Solid colour block (no
 * artwork) so it works for every module -- Learning, Jobs, Finance, Legal.
 * `crumbs` is [{ label, to? }]; the last crumb is the current page.
 */
export default function SectionBanner({ title, subtitle, color = '#1F3A2E', icon: Icon, crumbs = [], children }) {
  return (
    <section className="v2-banner" style={{ background: color }}>
      <div className="v2-banner-inner">
        {crumbs.length > 0 && (
          <nav className="v2-crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="v2-crumb">
                {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
                {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="v2-banner-title-row">
          {Icon && <span className="v2-banner-icon"><Icon size={26} /></span>}
          <div>
            <h1 className="v2-banner-title">{title}</h1>
            {subtitle && <p className="v2-banner-sub">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
