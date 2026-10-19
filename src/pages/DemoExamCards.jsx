import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  ArrowRight,
  Landmark,
  GraduationCap,
  Shield,
  BookOpen,
  Sparkles,
  FileText,
  CheckCircle2,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import examCardImages from '../lib/examCardImages.json';
import '../components/CategoryExplorerPortal.css';

const DEMO_CARDS_DATA = [
  {
    slug: 'ssc-mts',
    title: 'SSC MTS',
    desc: 'Multi-Tasking (Non-Technical) Staff and Havaldar (CBIC & CBN) Examination.',
    qualText: 'General Duty',
    qualClass: 'qual-green',
    levelText: 'Central',
    postText: 'MTS, Havaldar',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-cgl',
    title: 'SSC CGL',
    desc: 'Combined Graduate Level Examination (Group B & C Posts).',
    qualText: 'Graduate',
    qualClass: 'qual-purple',
    levelText: 'Central',
    postText: 'Group B & C',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-gd-constable',
    title: 'SSC GD Constable',
    desc: 'Constable (General Duty) in CAPFs, SSF, Rifleman (ASSAM RIFLES) and NCB.',
    qualText: 'Police & Defence',
    qualClass: 'qual-blue',
    levelText: 'Central',
    postText: 'Constable (GD)',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-chsl',
    title: 'SSC CHSL',
    desc: 'Combined Higher Secondary Level (10+2) Examination.',
    qualText: '10+2 Level',
    qualClass: 'qual-orange',
    levelText: 'Central',
    postText: 'LDC, DEO, JSA',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-jht',
    title: 'SSC JHT',
    desc: 'Junior Hindi Translator, Junior Translator and Senior Hindi Translator Examination.',
    qualText: 'Eligible Candidates',
    qualClass: 'qual-green',
    levelText: 'Central',
    postText: 'SSC',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-stenographer',
    title: 'SSC Stenographer',
    desc: 'Stenographer Grade ‘C’ & ‘D’ Examination in various Ministries/Departments.',
    qualText: '10+2 Level',
    qualClass: 'qual-orange',
    levelText: 'Central',
    postText: 'Stenographer',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-selection-post',
    title: 'SSC Selection Post',
    desc: 'Selection Posts Examination for Phase recruitments across Union Ministries.',
    qualText: 'Graduate Level',
    qualClass: 'qual-green',
    levelText: 'Central',
    postText: 'Various Posts',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-cpo',
    title: 'SSC CPO',
    desc: 'Sub-Inspector in Delhi Police, CAPFs and Central Armed Police Forces.',
    qualText: 'Graduate Level',
    qualClass: 'qual-green',
    levelText: 'Central',
    postText: 'Sub-Inspector',
    freqText: 'Once a Year',
  },
  {
    slug: 'ssc-cgl-tier-2',
    title: 'SSC CGL (Tier 2)',
    desc: 'Combined Graduate Level (Tier 2) Examination.',
    qualText: 'Graduate',
    qualClass: 'qual-purple',
    levelText: 'Central',
    postText: 'Group B & C',
    freqText: 'Once a Year',
  },
  {
    slug: 'delhi-police-constable',
    title: 'Delhi Police Constable',
    desc: 'Constable in Delhi Police (Male & Female).',
    qualText: 'Police & Defence',
    qualClass: 'qual-blue',
    levelText: 'Delhi',
    postText: 'Constable',
    freqText: 'Once a Year',
  },
  {
    slug: 'ibps-po',
    title: 'IBPS PO',
    desc: 'Probationary Officer in Public Sector Banks.',
    qualText: 'Graduate',
    qualClass: 'qual-purple',
    levelText: 'Multi-State',
    postText: 'PO',
    freqText: 'Once a Year',
  },
  {
    slug: 'upsc-civil-services',
    title: 'UPSC Civil Services',
    desc: 'Indian Administrative Service (IAS), IPS, IFS and other services.',
    qualText: 'Graduate Level',
    qualClass: 'qual-green',
    levelText: 'National',
    postText: 'IAS/IPS/IFS',
    freqText: 'Once a Year',
  },
];

export default function DemoExamCards() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg-1, #f8fafc)', padding: '36px 40px' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'var(--c-tint-green, #ecfdf5)', borderRadius: '100px', border: '1px solid #a7f3d0', color: 'var(--c-green, #065f46)', fontSize: '12.5px', fontWeight: 600, marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>AI Image Generation & Cloudflare R2 WebP Pipeline</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Exam Catalog — Live Demo Layout
          </h1>
          <p style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '15px', margin: 0 }}>
            Generated via OpenRouter with custom context-tailored prompts, compressed with Sharp to ultra-lightweight WebP (avg ~24 KB), and served globally from Cloudflare R2 CDN.
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        <nav className="cep-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: '14px' }}>
          <span className="cep-bc-link">Home</span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-link">Exams</span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-current">ICAR IARI</span>
        </nav>

        {/* Hero Banner Section (VeerNext Dark Green to Category Image Gradient Blend) */}
        <section className="cep-hero-card" aria-label="ICAR IARI Overview Banner" style={{ marginBottom: '32px' }}>
          <div className="cep-hero-content">
            <span className="cep-hero-kicker">ICAR IARI</span>

            <h1 className="cep-hero-title">
              <span className="cep-hero-title-accent">ICAR</span>
              <span className="cep-hero-title-main">IARI EXAMINATIONS</span>
            </h1>

            <div className="cep-hero-accent-line" />

            <p className="cep-hero-tagline">Your Gateway to a Stable and Rewarding Government Career</p>

            <div className="cep-hero-pills-row" role="list" aria-label="Category Key Offerings">
              <div
                className="cep-hero-pill"
                role="listitem"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/study-materials?category=SSC&type=guide')}
                title="Explore Guidebooks & Study Material"
              >
                <div className="cep-hero-pill-icon">
                  <BookOpen size={15} />
                </div>
                <div className="cep-hero-pill-texts">
                  <span className="cep-hero-pill-title">Study Material</span>
                  <span className="cep-hero-pill-sub">Notes & PDFs</span>
                </div>
              </div>

              <div className="cep-hero-pill" role="listitem">
                <div className="cep-hero-pill-icon">
                  <FileText size={15} />
                </div>
                <div className="cep-hero-pill-texts">
                  <span className="cep-hero-pill-title">Previous Year Papers</span>
                  <span className="cep-hero-pill-sub">Solved PYQs</span>
                </div>
              </div>

              <div className="cep-hero-pill" role="listitem">
                <div className="cep-hero-pill-icon">
                  <CheckCircle2 size={15} />
                </div>
                <div className="cep-hero-pill-texts">
                  <span className="cep-hero-pill-title">Mock Tests</span>
                  <span className="cep-hero-pill-sub">Practice & Analysis</span>
                </div>
              </div>

              <div className="cep-hero-pill" role="listitem">
                <div className="cep-hero-pill-icon">
                  <Lightbulb size={15} />
                </div>
                <div className="cep-hero-pill-texts">
                  <span className="cep-hero-pill-title">Expert Guidance</span>
                  <span className="cep-hero-pill-sub">Strategy & Updates</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Banner Visual with smooth gradient blend */}
          <div className="cep-hero-visual-wrap">
            <div className="cep-hero-image-box">
              <img
                src="/category_banners/ssc.jpg"
                alt="ICAR IARI Headquarters"
                className="cep-hero-img"
                loading="eager"
              />
              <div className="cep-hero-gradient-overlay" />
            </div>
          </div>
        </section>

        <div className="cep-exams-card-grid">
          {DEMO_CARDS_DATA.map((card) => {
            const imageData = examCardImages[card.slug];
            return (
              <div
                key={card.slug}
                className="cep-exam-card"
                role="button"
                tabIndex={0}
              >
                {/* 16:9 Photographic Banner with Motivational Quote Overlay */}
                <div className="cep-card-image-wrap">
                  {imageData?.url ? (
                    <img
                      src={imageData.url}
                      alt={card.title}
                      className="cep-card-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="cep-card-image-placeholder">
                      <BookOpen size={28} />
                    </div>
                  )}
                  {imageData?.quote && (
                    <span className="cep-card-image-quote">
                      {imageData.quote}
                    </span>
                  )}
                </div>

                {/* Card Content Details */}
                <div className="cep-card-content">
                  <h4 className="cep-card-title">{card.title}</h4>
                  <p className="cep-card-desc">{card.desc}</p>

                  <div className="cep-card-pills-row">
                    <span className={`cep-pill ${card.qualClass}`}>
                      {card.qualClass.includes('blue') ? (
                        <Shield size={12} strokeWidth={2.2} />
                      ) : (
                        <GraduationCap size={12} strokeWidth={2.2} />
                      )}
                      <span>{card.qualText}</span>
                    </span>
                    <span className="cep-pill cep-pill-level">
                      <Landmark size={12} strokeWidth={2.2} />
                      <span>{card.levelText}</span>
                    </span>
                  </div>

                  <div className="cep-card-footer-row">
                    <div className="cep-card-meta-left">
                      <div className="cep-meta-item">
                        <Users size={13} className="cep-meta-icon" />
                        <span>{card.postText}</span>
                      </div>
                      <span className="cep-meta-divider">|</span>
                      <div className="cep-meta-item">
                        <Calendar size={13} className="cep-meta-icon" />
                        <span>{card.freqText}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="cep-card-circle-btn"
                      aria-label={`View ${card.title}`}
                    >
                      <ArrowRight size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
