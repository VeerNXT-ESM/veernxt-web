import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Target,
  Sparkles,
  Shield,
  Calendar,
  Users,
  Star,
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Scale,
  X,
  Laptop,
  Check,
  CheckSquare,
  HelpCircle,
  BarChart2,
  GraduationCap,
  Lightbulb,
  FileCheck,
  Layers,
  PlayCircle,
  FileQuestion,
  Lock,
  Unlock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../components/book/Book3D.css';
import { resolveSubjectForTitle, getFamilyHex } from '../lib/thumbnailTaxonomy';
import { useThumbnails } from '../lib/thumbnailStore';
import { getBookCoverUrl } from '../lib/bookCatalogCovers';
import './StudyMaterialsPage.css';

// ══════════════════════════════════════════════════════════════════════════
// 5 DISTINCT COMBINATIONS OF GENERIC DESCRIPTIONS & BULLETS (PICKED RANDOMLY)
// ══════════════════════════════════════════════════════════════════════════
export const BOOK_CONTENT_COMBINATIONS = [
  {
    id: 1,
    name: 'Theory & Concept Mastery',
    description:
      'Complete coverage of foundational theory, core concepts, error spotting, comprehension frameworks, and practice sets with detailed step-by-step solutions.',
    bullets: [
      'Chapter-wise In-depth Theory Notes',
      'Concept Clarity with Solved Illustrations',
      'Practice Questions (Level-wise & Graded)',
      'Previous Year Questions with Full Solutions',
      'Exam Tips, Shortcuts & Score Accelerators',
    ],
    stats: [
      { label: '650+ Practice Qs', icon: 'book' },
      { label: '10 Mock Tests', icon: 'laptop' },
      { label: 'PYQs Included', icon: 'check' },
      { label: 'Latest Pattern', icon: 'badge' },
    ],
    accentColor: '#064e3b', // Emerald green
    badgeBg: '#ecfdf5',
    checkColor: '#059669',
  },
  {
    id: 2,
    name: 'Visual & Infographic Learning',
    description:
      'Exhaustive topic-wise coverage of core subjects, diagrams, maps, and high-yield summary tables paired with extensive exam-focused practice question banks.',
    bullets: [
      'Topic-wise Structured Theory Modules',
      'Maps, Infographics, Tables & Flowcharts',
      'Practice Questions (Topic-wise Sets)',
      'Previous Year Solved Questions with Explanations',
      'Current Affairs Integration & Trend Analysis',
    ],
    stats: [
      { label: '700+ Practice Qs', icon: 'book' },
      { label: '15 Mock Tests', icon: 'laptop' },
      { label: 'PYQs Included', icon: 'check' },
      { label: 'Charts & Maps', icon: 'badge' },
    ],
    accentColor: '#92400e', // Warm Amber / Ochre
    badgeBg: '#fefce8',
    checkColor: '#d97706',
  },
  {
    id: 3,
    name: 'Rapid Revision & Speed Drills',
    description:
      'High-impact revision modules featuring formula sheets, shortcut methods, past-trend analytics, and rigorous problem-solving drill sets.',
    bullets: [
      'Modular Concept Summaries & Memory Maps',
      'Speed Tricks, Shortcuts & Mental Techniques',
      'Level-wise MCQs with Detailed Solutions',
      'Last 5-Year Question Trend Analysis',
      'Key Formulas, Tables & Quick References',
    ],
    stats: [
      { label: '800+ Practice Qs', icon: 'book' },
      { label: '12 Mock Tests', icon: 'laptop' },
      { label: 'PYQs Included', icon: 'check' },
      { label: 'Speed Drills', icon: 'badge' },
    ],
    accentColor: '#1e3a8a', // Royal Navy
    badgeBg: '#eff6ff',
    checkColor: '#2563eb',
  },
  {
    id: 4,
    name: 'Exhaustive Question Bank & PYQ Mastery',
    description:
      'Comprehensive question bank with authentic past papers, topic-segregated drill sets, and strategic elimination frameworks for competitive scoring.',
    bullets: [
      'Exhaustive Sectional Question Bank',
      'Authentic Past Year Papers with Explanations',
      'Targeted Speed & Accuracy Drill Sets',
      'Common Mistakes & Pitfall Traps Highlighted',
      'Model Test Papers with Score Analysis',
    ],
    stats: [
      { label: '750+ Practice Qs', icon: 'book' },
      { label: '14 Mock Tests', icon: 'laptop' },
      { label: 'PYQs Included', icon: 'check' },
      { label: 'Full Solutions', icon: 'badge' },
    ],
    accentColor: '#0f766e', // Deep Teal
    badgeBg: '#f0fdfa',
    checkColor: '#0d9488',
  },
  {
    id: 5,
    name: 'Strategic Problem Solving & Exam Tactics',
    description:
      'Systematic problem-solving frameworks, elimination tactics, time-management protocols, and comprehensive syllabus reviews curated by educators.',
    bullets: [
      'Smart Elimination & Deduction Strategies',
      'Core Fundamentals with Solved Walkthroughs',
      'Timed Practice Drills with Answer Keys',
      'Topic-wise Weightage & Priority Matrix',
      'Expert Tips for Accuracy & Time Management',
    ],
    stats: [
      { label: '900+ Practice Qs', icon: 'book' },
      { label: '16 Mock Tests', icon: 'laptop' },
      { label: 'PYQs Included', icon: 'check' },
      { label: 'Expert Curated', icon: 'badge' },
    ],
    accentColor: '#831843', // Deep Berry
    badgeBg: '#fdf2f8',
    checkColor: '#db2777',
  },
];

// Helper to pick randomly from the 5 options
function getRandomCombination(seedIndex) {
  // If seed provided, use deterministic rotation, otherwise Math.random()
  if (typeof seedIndex === 'number') {
    return BOOK_CONTENT_COMBINATIONS[seedIndex % BOOK_CONTENT_COMBINATIONS.length];
  }
  const idx = Math.floor(Math.random() * BOOK_CONTENT_COMBINATIONS.length);
  return BOOK_CONTENT_COMBINATIONS[idx];
}

// ══════════════════════════════════════════════════════════════════════════
// BASE BOOKS TAXONOMY FOR EACH CATEGORY USING EXISTING THUMBNAILS
// ══════════════════════════════════════════════════════════════════════════
const CATALOG_BOOKS = [
  {
    id: 'b-english',
    slug: 'english',
    subjectKey: 'english',
    subjectLabel: 'English',
    titleSuffix: 'English',
    thumbnail: '/thumbnails/English.webp',
    isBestSeller: true,
    spineColor: '#1e3a8a',
  },
  {
    id: 'b-gk-gs',
    slug: 'gk-gs',
    subjectKey: 'gk_general_awareness',
    subjectLabel: 'GK & GS',
    titleSuffix: 'GK & GS',
    thumbnail: '/thumbnails/General Knowledge.webp',
    isBestSeller: false,
    spineColor: '#78350f',
  },
  {
    id: 'b-maths',
    slug: 'mathematics',
    subjectKey: 'mathematics',
    subjectLabel: 'Quantitative Aptitude',
    titleSuffix: 'Mathematics & Quant',
    thumbnail: '/thumbnails/Mathematics.webp',
    isBestSeller: false,
    spineColor: '#b45309',
  },
  {
    id: 'b-reasoning',
    slug: 'reasoning',
    subjectKey: 'reasoning',
    subjectLabel: 'Reasoning Ability',
    titleSuffix: 'Reasoning',
    thumbnail: '/thumbnails/Reasoning.webp',
    isBestSeller: false,
    spineColor: '#991b1b',
  },
];

const HERO_PILLS = [
  { cls: 'smp-pill-green', Icon: BookOpen, title: 'Latest Syllabus Coverage', sub: 'Updated syllabus with topic-wise details' },
  { cls: 'smp-pill-orange', Icon: FileText, title: 'Exam-Oriented Content', sub: 'Chapter-wise theory & important topics' },
  { cls: 'smp-pill-teal', Icon: Target, title: 'Concept Clarity with Examples', sub: 'Easy explanations with solved examples' },
  { cls: 'smp-pill-gold', Icon: FileQuestion, title: 'Practice Questions & PYQs', sub: 'Chapter-wise practice and previous year papers' },
];

// Rendered twice: inside the hero card (desktop/tablet) and as cards under it (phones); CSS shows one of them.
const HeroPills = ({ className }) => (
  <div className={className} role="list">
    {HERO_PILLS.map(({ cls, Icon, title, sub }) => (
      <div key={title} className={`smp-hero-pill ${cls}`} role="listitem">
        <div className="smp-hero-pill-icon"><Icon size={13} /></div>
        <span className="smp-pill-text">{title}<small className="smp-pill-sub">{sub}</small></span>
        <ChevronRight size={14} className="smp-pill-arrow" aria-hidden="true" />
      </div>
    ))}
  </div>
);

export default function StudyMaterialsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { subjectUrl } = useThumbnails();

  const categoryParam = searchParams.get('category') || 'SSC';
  const typeParam = searchParams.get('type') || 'guide'; // 'guide' | 'precis'
  const examParam = searchParams.get('exam') || '';
  const examNameParam = searchParams.get('examName') || '';

  const isGuide = typeParam !== 'precis';
  const pageTypeTitle = isGuide ? 'Guidebooks' : 'Préci Notes';
  const pageCategoryName = categoryParam.toUpperCase();

  // Modal states
  const [activeDetailsBook, setActiveDetailsBook] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Horizontal Scroll for Books Section
  const booksScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeBookIdx, setActiveBookIdx] = useState(0);

  const checkScroll = () => {
    if (booksScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = booksScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      const first = booksScrollRef.current.firstElementChild;
      if (first) setActiveBookIdx(Math.round(scrollLeft / (first.offsetWidth + 14)));
    }
  };

  const scrollBooks = (direction) => {
    if (booksScrollRef.current) {
      const card = booksScrollRef.current.firstElementChild;
      const scrollAmount = card ? card.offsetWidth + 22 : 540;
      booksScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 350);
    }
  };

  // Category Exams & Selection
  const [categoryExams, setCategoryExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(() => {
    if (examNameParam || examParam) {
      return {
        id: examParam || 'exam-param',
        name: examNameParam || examParam,
        category: categoryParam,
      };
    }
    return null;
  });
  const [loadingExams, setLoadingExams] = useState(true);

  // Load all exams in this category so the user can easily switch or select
  useEffect(() => {
    let cancelled = false;
    async function loadCategoryExams() {
      setLoadingExams(true);
      try {
        const { data, error } = await supabase
          .from('lc_exams')
          .select('id, name, category')
          .ilike('category', categoryParam)
          .order('name');

        if (!cancelled && data && data.length > 0) {
          setCategoryExams(data);

          const targetId = (examParam || '').toLowerCase().trim();
          const targetName = (examNameParam || examParam || '')
            .toLowerCase()
            .replace(/['"‘’“”]/g, "'")
            .trim();

          const found = data.find((e) => {
            const eNameNorm = e.name.toLowerCase().replace(/['"‘’“”]/g, "'").trim();
            return (
              (targetId && String(e.id).toLowerCase() === targetId) ||
              (targetName && eNameNorm === targetName) ||
              (targetName && (eNameNorm.includes(targetName) || targetName.includes(eNameNorm)))
            );
          });

          if (found) {
            setSelectedExam(found);
          } else if (!selectedExam) {
            setSelectedExam(data[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch exams for category:', err);
      } finally {
        if (!cancelled) setLoadingExams(false);
      }
    }

    loadCategoryExams();
    return () => {
      cancelled = true;
    };
  }, [categoryParam, examParam, examNameParam]);

  const currentExamFullName =
    selectedExam?.name ||
    examNameParam ||
    (examParam && !examParam.includes('-') ? examParam : '') ||
    `${pageCategoryName} Examination`;

  const currentExamShortName = useMemo(() => {
    const full = currentExamFullName;
    if (full.length > 28 && full.includes('(')) {
      return full.split('(')[0].trim();
    }
    return full;
  }, [currentExamFullName]);

  const handleExamChange = (newExamId) => {
    const match = categoryExams.find((e) => String(e.id) === String(newExamId));
    if (match) {
      setSelectedExam(match);
      setSearchParams({
        category: categoryParam,
        type: typeParam,
        exam: match.id,
        examName: match.name,
      });
    }
  };

  const handleTypeChange = (newType) => {
    setSearchParams({
      category: categoryParam,
      type: newType,
      exam: selectedExam?.id || examParam,
      examName: selectedExam?.name || examNameParam || currentExamFullName,
    });
  };

  // Mapped resources for the currently selected exam
  const [examResources, setExamResources] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadResourcesForExam() {
      if (!selectedExam?.id) return;
      try {
        const catFilter = isGuide ? 'Guide' : 'Precis';
        const { data: mappings } = await supabase
          .from('lc_exam_resource_map')
          .select('resource_id, category')
          .eq('exam_id', selectedExam.id)
          .eq('category', catFilter);

        if (cancelled) return;
        if (mappings && mappings.length > 0) {
          const resIds = mappings.map((m) => m.resource_id).filter(Boolean);
          const { data: resRows } = await supabase
            .from('resources')
            .select('resource_id, title, category, format')
            .in('resource_id', resIds);

          if (!cancelled && resRows) {
            const mapBySubject = {};
            for (const r of resRows) {
              const t = (r.title || '').toLowerCase();
              if (t.includes('english')) mapBySubject['english'] = r.resource_id;
              else if (t.includes('gk') || t.includes('gs') || t.includes('general awareness') || t.includes('general knowledge')) mapBySubject['gk-gs'] = r.resource_id;
              else if (t.includes('math') || t.includes('quant')) mapBySubject['mathematics'] = r.resource_id;
              else if (t.includes('reasoning')) mapBySubject['reasoning'] = r.resource_id;
            }
            setExamResources(mapBySubject);
          }
        } else {
          setExamResources({});
        }
      } catch (err) {
        console.warn('Error loading exam resources:', err);
      }
    }
    loadResourcesForExam();
    return () => {
      cancelled = true;
    };
  }, [selectedExam?.id, isGuide]);

  // Randomly assign one of the 5 combinations to each book card on mount
  const booksWithCombinations = useMemo(() => {
    return CATALOG_BOOKS.map((book, idx) => {
      const combo = getRandomCombination(idx); // ensures 5 distinct combinations across cards
      const formattedTitle = `${currentExamShortName} ${book.titleSuffix} ${isGuide ? 'Guidebook' : 'Préci'} 2026`;
      const matchedResId = examResources[book.slug];
      return {
        ...book,
        resourceId: matchedResId,
        displayTitle: formattedTitle,
        shortCoverTitle: `${book.titleSuffix} ${isGuide ? 'Guide' : 'Préci'}`,
        combo,
      };
    });
  }, [currentExamShortName, isGuide, examResources]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [booksWithCombinations]);

  // Exam selector + Guidebooks/Préci switch: inside the hero on larger screens, as separate cards on phones
  const renderControls = (variant) => (
    <div className={`smp-hero-controls-bar smp-controls-${variant}`}>
      <div className="smp-exam-selector-card">
        <div className="smp-selector-icon-wrap">
          <GraduationCap size={18} />
        </div>
        <div className="smp-selector-body">
          <label className="smp-selector-label" htmlFor={`smp-exam-select-${variant}`}>
            TARGET EXAMINATION
          </label>
          <div className="smp-select-container">
            <select
              id={`smp-exam-select-${variant}`}
              className="smp-exam-select"
              value={selectedExam?.id || ''}
              onChange={(e) => handleExamChange(e.target.value)}
            >
              {categoryExams.length === 0 && selectedExam && (
                <option value={selectedExam.id}>{selectedExam.name}</option>
              )}
              {categoryExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="smp-select-arrow" />
          </div>
        </div>
      </div>

      {/* Guidebooks / Préci Switcher Pills */}
      <div className="smp-type-switcher">
        <button
          type="button"
          className={`smp-type-btn ${isGuide ? 'active' : ''}`}
          onClick={() => handleTypeChange('guide')}
        >
          <BookOpen size={15} />
          <span>Guidebooks</span>
        </button>
        <button
          type="button"
          className={`smp-type-btn ${!isGuide ? 'active' : ''}`}
          onClick={() => handleTypeChange('precis')}
        >
          <Target size={15} />
          <span>Préci Notes</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="smp-page-wrapper">
      <div className="smp-container">
        {/* ── Breadcrumb Bar ── */}
        <nav className="smp-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="smp-bc-link">Home</Link>
          <ChevronRight size={13} className="smp-bc-sep" />
          <Link to="/learning-center" className="smp-bc-link">Exams</Link>
          <ChevronRight size={13} className="smp-bc-sep" />
          <Link to={`/learning-center?category=${encodeURIComponent(categoryParam)}`} className="smp-bc-link">
            {pageCategoryName}
          </Link>
          <ChevronRight size={13} className="smp-bc-sep" />
          <Link
            to={`/learning-center?category=${encodeURIComponent(categoryParam)}&exam=${encodeURIComponent(selectedExam?.id || examParam || '')}`}
            className="smp-bc-link"
          >
            {currentExamFullName}
          </Link>
          <ChevronRight size={13} className="smp-bc-sep" />
          <span className="smp-bc-current">{pageTypeTitle}</span>
        </nav>

        {/* Phones: back to the exam page (the breadcrumb row is hidden there) */}
        <Link
          to={`/learning-center?category=${encodeURIComponent(categoryParam)}&exam=${encodeURIComponent(selectedExam?.id || examParam || '')}`}
          className="smp-back-btn"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </Link>

        {/* ── Hero Banner Section (Warm Editorial Layout with Full Exam Name & Selector) ── */}
        <section className="smp-hero-card" aria-label={`${currentExamFullName} ${pageTypeTitle} Overview`}>
          <div className="smp-hero-content">
            <div className="smp-hero-kicker-row">
              <span className="smp-hero-kicker-cat">{pageCategoryName}</span>
              <span className="smp-hero-kicker-exam">{currentExamFullName}</span>
            </div>

            <h1 className="smp-hero-title">
              <span className="smp-hero-title-main">{currentExamFullName}</span>
              <span className="smp-hero-title-accent">{pageTypeTitle}</span>
            </h1>

            <p className="smp-hero-tagline">
              {isGuide
                ? 'Complete Study Material for Smart & Focused Preparation'
                : 'Topic-Wise Concise Notes for Smart & Quick Revision'}
            </p>

            {/* ── Interactive Target Exam Selector & Type Switcher ── */}
            {renderControls('in')}

            <HeroPills className="smp-hero-pills smp-hero-pills-in" />
          </div>

          {/* Right Visual with Photographic Books & Script Overlay */}
          <div className="smp-hero-visual">
            <div className="smp-hero-img-wrap">
              <img
                src="/study_materials_hero.jpg"
                alt={`${currentExamFullName} Study Books Stack`}
                className="smp-hero-img"
              />
            </div>

            {/* Floating script text with orange curve */}
            <div className="smp-hero-script-tag">
              <div className="smp-hero-script-text">
                Study<br />
                Practice<br />
                Progress<br />
                with Veer Nxt
              </div>
              <div className="smp-hero-script-arc" />
            </div>

            {/* Sticky note card on upper right */}
            <div className="smp-hero-sticky-note">
              <span className="smp-hero-sticky-crown">👑</span>
              Same<br />
              Syllabus<br />
              Smarter<br />
              Preparation
            </div>
          </div>
        </section>

        {renderControls('phone')}

        <HeroPills className="smp-hero-pills smp-hero-pills-phone" />

        {/* ── Trust / Metric Bar ── */}
        <div className="smp-trust-bar">
          <div className="smp-trust-items">
            <div className="smp-trust-item">
              <div className="smp-trust-icon" style={{ color: 'var(--c-green, #059669)' }}>
                <BookOpen size={17} />
              </div>
              <span><b className="smp-trust-main">{booksWithCombinations.length} {pageTypeTitle}</b><span className="smp-trust-opt"> for {currentExamFullName}</span><small className="smp-trust-sub">Complete coverage</small></span>
            </div>

            <div className="smp-trust-item">
              <div className="smp-trust-icon" style={{ color: 'var(--c-blue, #0284c7)' }}>
                <Users size={17} />
              </div>
              <span><b className="smp-trust-main">50,000+ <span className="smp-trust-opt">Happy </span>Learners</b><small className="smp-trust-sub">Trusted by aspirants</small></span>
            </div>

            <div className="smp-trust-item">
              <div className="smp-trust-icon" style={{ color: '#eab308' }}>
                <Star size={17} fill="#eab308" />
              </div>
              <span><b className="smp-trust-main">4.8/5 <span className="smp-trust-opt">Student </span>Rating</b><small className="smp-trust-sub">Student satisfaction</small></span>
            </div>

            <div className="smp-trust-item">
              <div className="smp-trust-icon" style={{ color: 'var(--c-green, #059669)' }}>
                <Shield size={17} />
              </div>
              <span><b className="smp-trust-main">Exam-Oriented<span className="smp-trust-opt"> & Updated</span></b><small className="smp-trust-sub">Always updated</small></span>
            </div>

            <div className="smp-trust-item smp-trust-item-extra">
              <div className="smp-trust-icon" style={{ color: 'var(--c-green, #16a34a)' }}>
                <Calendar size={17} />
              </div>
              <span>Based on Latest Exam Pattern</span>
            </div>
          </div>

          <div className="smp-trust-badge">
            <Award size={15} />
            <span>Trusted by {currentExamShortName} Aspirants</span>
          </div>
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="smp-main-grid">
          {/* Left Column: Books Grid */}
          <div className="smp-main-left">
            <div className="smp-section-head">
              <div className="smp-section-head-left">
                <div className="smp-section-bar" />
                <div>
                  <h2 className="smp-section-title">
                    <span className="smp-title-full">Our {pageTypeTitle} for {currentExamFullName}</span>
                    <span className="smp-title-short">{currentExamShortName} {pageTypeTitle}</span>
                  </h2>
                  <p className="smp-section-sub">
                    Well-structured, exam-focused and easy-to-understand study material.
                  </p>
                </div>
              </div>

              <div className="smp-section-head-right">
                <button
                  type="button"
                  className="smp-compare-books-btn"
                  onClick={() => setIsCompareOpen(true)}
                  title="Compare features of all books"
                >
                  <Scale size={16} />
                  <span>Compare Books</span>
                </button>

                <div className="smp-scroll-nav-group">
                  <button
                    type="button"
                    className={`smp-scroll-nav-btn ${!canScrollLeft ? 'disabled' : ''}`}
                    onClick={() => scrollBooks('left')}
                    disabled={!canScrollLeft}
                    aria-label="Previous books"
                    title="Previous books"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className={`smp-scroll-nav-btn ${!canScrollRight ? 'disabled' : ''}`}
                    onClick={() => scrollBooks('right')}
                    disabled={!canScrollRight}
                    aria-label="Next books"
                    title="Next books"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontally Scrollable Books Track */}
            <div className="smp-books-scroll-wrap">
              <div
                className="smp-books-scroll-track"
                ref={booksScrollRef}
                onScroll={checkScroll}
              >
                {booksWithCombinations.map((book) => {
                const { combo } = book;
                const subject = resolveSubjectForTitle(book.displayTitle, isGuide ? 'Guide' : 'Precis');
                const bg = getFamilyHex(subject.family);
                const examStateName = selectedExam?.name || examNameParam || categoryParam || '';
                const examStateCover =
                  (book.slug === 'gk-gs' || book.slug === 'gs-gk') && examStateName
                    ? getBookCoverUrl(examStateName)
                    : null;
                const customCover =
                  examStateCover ||
                  getBookCoverUrl(book.slug) ||
                  getBookCoverUrl(book.displayTitle) ||
                  (selectedExam?.name ? getBookCoverUrl(selectedExam.name) : null);
                const image = customCover || subjectUrl(subject.key) || book.thumbnail;
                const hasCustomCover = !!customCover;

                const stateMatch = examStateName.match(
                  /(Rajasthan|Madhya Pradesh|Maharashtra|Gujarat|Haryana|Himachal|Punjab|Odisha|West Bengal|Uttar Pradesh|Bihar|Jharkhand|Chhattisgarh|Assam|Karnataka|Kerala|Tamil Nadu|Andhra|Telangana|Arunachal|Delhi|Jammu|Ladakh|Uttarakhand|Goa)/i
                );
                let spineTitle = 'GUIDEBOOK';
                if (book.slug === 'gk-gs' || book.slug === 'gs-gk') {
                  spineTitle = stateMatch ? `${stateMatch[1].toUpperCase()} GS` : 'GENERAL STUDIES & GK';
                } else if (book.slug === 'english') {
                  spineTitle = 'ENGLISH LANGUAGE';
                } else if (book.slug === 'mathematics' || book.slug === 'quant') {
                  spineTitle = 'MATHEMATICS & QUANT';
                } else if (book.slug === 'reasoning') {
                  spineTitle = 'REASONING';
                } else if (book.titleSuffix) {
                  spineTitle = book.titleSuffix.toUpperCase();
                } else if (subject.label) {
                  spineTitle = subject.label.toUpperCase();
                }

                return (
                  <div
                    key={book.id}
                    className="smp-book-card"
                    onClick={() => {
                      // Phones: tapping the book opens its notes directly (the buttons are hidden there)
                      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches) {
                        navigate(`/reader/${book.resourceId || book.slug || 'sample'}`);
                      }
                    }}
                  >
                    {book.isBestSeller && (
                      <div className="smp-bestseller-badge">
                        <Star size={11} fill="#92400e" />
                        <span>Best Seller</span>
                      </div>
                    )}

                    <div className="smp-book-card-body">
                      {/* Left: Original 3D Book Cover from VeerNext Design System */}
                      <div className="smp-book-cover-wrap">
                        <div className="vn-book-3d-scene" style={{ padding: '0 8px 0 50px', width: '298px' }}>
                          <div className="vn-book-3d-item">
                            {/* Rear hardcover base (Consistent brand dark green) */}
                            <div className="vn-book-3d-back" style={{ background: '#032e23' }} />

                            {/* Left extruded spine (Consistent brand green with official logo & authentic typography) */}
                            <div className="vn-book-3d-spine">
                              <div className="vn-book-spine-crest">
                                <img src="/logo.png" alt="VeerNXT" className="vn-spine-logo-img" />
                              </div>
                              <div className="vn-book-3d-spine-text-wrap">
                                <span className="vn-book-3d-spine-title">{spineTitle}</span>
                                <span className="vn-book-3d-spine-sub">COMPLETE GUIDE</span>
                              </div>
                              <div className="vn-book-spine-brand">
                                <span className="vn-spine-vn-logo">❖</span>
                                <span className="vn-spine-vn-text">VeerNXT</span>
                              </div>
                              <div className="vn-book-3d-spine-light" />
                            </div>

                            {/* Right paper block thickness */}
                            <div className="vn-book-3d-pages-right" />

                            {/* Bottom paper block thickness */}
                            <div className="vn-book-3d-pages-bottom" />

                            {/* Front cover */}
                            <div
                              className="vn-book-3d-front"
                              style={{
                                backgroundImage: hasCustomCover
                                  ? `url("${image}")`
                                  : image
                                  ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.85) 100%), url("${image}")`
                                  : `linear-gradient(160deg, ${bg || '#065f46'} 0%, #042f28 100%)`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center top',
                                padding: hasCustomCover ? 0 : '10px 10px 10px 18px',
                              }}
                            >
                              {/* Hardcover hinge crease line */}
                              <div className="vn-book-3d-crease" />

                              {/* Glossy light reflection sheen */}
                              <div className="vn-book-3d-sheen" />

                              {!hasCustomCover && (
                                <>
                                  {/* Top header: VeerNXT emblem + Lock Pill */}
                                  <div className="vn-book-cover-header">
                                    <div className="vn-book-cover-crest-badge">
                                      <Shield size={10} style={{ color: 'var(--c-amber, #b45309)' }} />
                                      <span className="vn-book-cover-crest-text">VEERNXT</span>
                                    </div>
                                    <div className="vn-book-lock-pill unlocked">
                                      <Unlock size={11} color="white" />
                                    </div>
                                  </div>

                                  {/* Center Cover Typography Banner */}
                                  <div className="vn-book-cover-center-banner">
                                    <span className="vn-book-cover-exam-tag">{currentExamShortName}</span>
                                    <h4 className="vn-book-cover-main-title">{book.shortCoverTitle || book.displayTitle}</h4>
                                    <span className="vn-book-cover-sub-bar">{subject.label || (isGuide ? 'COMPLETE GUIDE' : 'PRECIS')}</span>
                                  </div>

                                  {/* Bottom Category Chip */}
                                  <div className="vn-book-cover-footer">
                                    <span className="vn-book-cover-category-chip">{isGuide ? 'GUIDEBOOK' : 'PRECIS'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Ground cast shadow */}
                          <div className="vn-book-3d-ground-shadow" />
                        </div>
                      </div>

                      {/* Right: Info & Bullets (Generated from 1 of the 5 Combinations) */}
                      <div className="smp-book-card-info">
                        <h3 className="smp-book-title">{book.displayTitle}</h3>

                        <p className="smp-book-desc">{combo.description}</p>

                        {/* 5 Bullet Points with Colored Checkmarks */}
                        <ul className="smp-book-bullets">
                          {combo.bullets.map((bText, bIdx) => (
                            <li key={bIdx} className="smp-book-bullet-item">
                              <span
                                className="smp-check-circle"
                                style={{
                                  background: combo.badgeBg || '#ecfdf5',
                                  color: combo.checkColor || '#059669',
                                }}
                              >
                                <Check size={11} strokeWidth={3} />
                              </span>
                              <span>{bText}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Stat Chips Row */}
                        <div className="smp-book-stats-row">
                          {combo.stats.map((s, sIdx) => (
                            <span key={sIdx} className="smp-book-stat-chip">
                              <span className="smp-book-stat-icon">
                                {s.icon === 'book' && <BookOpen size={12} />}
                                {s.icon === 'laptop' && <Laptop size={12} />}
                                {s.icon === 'check' && <CheckSquare size={12} />}
                                {s.icon === 'badge' && <Sparkles size={12} />}
                              </span>
                              <span>{s.label}</span>
                            </span>
                          ))}
                        </div>

                        {/* Actions Row */}
                        <div className="smp-book-actions-row">
                          <button
                            type="button"
                            className="smp-btn-details"
                            onClick={() => setActiveDetailsBook(book)}
                          >
                            View Details
                          </button>

                          <Link
                            to={`/reader/${book.resourceId || book.slug || 'sample'}`}
                            className="smp-btn-explore"
                            style={{
                              background: combo.accentColor || '#064e3b',
                              borderColor: combo.accentColor || '#064e3b',
                            }}
                          >
                            <span>Explore Book</span>
                            <ArrowRight size={15} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              <div className="smp-books-dots" aria-hidden="true">
                {booksWithCombinations.map((b, i) => (
                  <span key={i} className={`smp-books-dot ${i === activeBookIdx ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="smp-sidebar">
            {/* Why Choose Card */}
            <div className="smp-sidebar-card">
              <div className="smp-sidebar-head">
                <div className="smp-section-bar" />
                <h3 className="smp-sidebar-title">
                  Why Choose Veer Nxt {pageTypeTitle}?
                </h3>
              </div>

              <ul className="smp-why-list">
                <li className="smp-why-item">
                  <div className="smp-why-icon-wrap"><BookOpen size={13} /></div>
                  <span>Latest syllabus & pattern</span>
                </li>
                <li className="smp-why-item">
                  <div className="smp-why-icon-wrap"><FileText size={13} /></div>
                  <span>Exam-focused content</span>
                </li>
                <li className="smp-why-item">
                  <div className="smp-why-icon-wrap"><Lightbulb size={13} /></div>
                  <span>Easy language with examples</span>
                </li>
                <li className="smp-why-item">
                  <div className="smp-why-icon-wrap"><CheckSquare size={13} /></div>
                  <span>Chapter-wise practice questions</span>
                </li>
                <li className="smp-why-item">
                  <div className="smp-why-icon-wrap"><BarChart2 size={13} /></div>
                  <span>Previous year paper analysis</span>
                </li>
                <li className="smp-why-item">
                  <div className="smp-why-icon-wrap"><GraduationCap size={13} /></div>
                  <span>Expertly curated by top educators</span>
                </li>
              </ul>
            </div>

            {/* Testimonials Card */}
            <div className="smp-testimonial-card">
              <h4 className="smp-testimonial-head">Students Love Our Books</h4>

              <div className="smp-testimonial-quote-box">
                <span className="smp-quote-icon">“</span>
                <p className="smp-testimonial-quote">
                  The notes are concise and exam-oriented. PYQs with solutions are very helpful.
                </p>
              </div>

              <div className="smp-stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" />
                ))}
              </div>

              <div className="smp-testimonial-user">
                <div className="smp-testimonial-avatar">PS</div>
                <div className="smp-testimonial-meta">
                  <span className="smp-testimonial-name">Priya S.</span>
                  <span className="smp-testimonial-tag">Selected in {pageCategoryName} CGL 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: More Learning Resources for Category ── */}
        <div className="smp-bottom-section">
          <div className="smp-section-head">
            <div className="smp-section-head-left">
              <div className="smp-section-bar" />
              <div>
                <h2 className="smp-section-title">
                  More Learning Resources for {pageCategoryName}
                </h2>
                <p className="smp-section-sub">
                  Everything you need to strengthen your preparation in one place.
                </p>
              </div>
            </div>

            <Link
              to={`/learning-center?category=${encodeURIComponent(categoryParam)}`}
              className="smp-compare-btn"
              style={{ textDecoration: 'none' }}
            >
              <span>View All Resources</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="smp-resources-row">
            {/* 1. Alternate: Préci Notes OR Guidebooks */}
            <Link
              to={`/study-materials?category=${encodeURIComponent(categoryParam)}&type=${isGuide ? 'precis' : 'guide'}`}
              className="smp-resource-card res-card-pink"
            >
              <div className="smp-res-card-top">
                <div className="smp-res-icon-wrap">
                  <Layers size={19} />
                </div>
                <div>
                  <h4 className="smp-res-title">{isGuide ? 'Préci Notes' : 'Guidebooks'}</h4>
                  <p className="smp-res-desc">
                    {isGuide ? 'Topic-wise concise notes for quick revision' : 'Complete in-depth study books'}
                  </p>
                </div>
              </div>
              <div className="smp-res-arrow-wrap">
                <ArrowRight size={13} />
              </div>
            </Link>

            {/* 2. PYQs */}
            <Link to="/pyq-center" className="smp-resource-card res-card-blue">
              <div className="smp-res-card-top">
                <div className="smp-res-icon-wrap">
                  <FileText size={19} />
                </div>
                <div>
                  <h4 className="smp-res-title">Previous Year Papers (PYQs)</h4>
                  <p className="smp-res-desc">Year-wise papers with detailed solutions</p>
                </div>
              </div>
              <div className="smp-res-arrow-wrap">
                <ArrowRight size={13} />
              </div>
            </Link>

            {/* 3. Mock Tests */}
            <Link to="/quiz-center" className="smp-resource-card res-card-purple">
              <div className="smp-res-card-top">
                <div className="smp-res-icon-wrap">
                  <PlayCircle size={19} />
                </div>
                <div>
                  <h4 className="smp-res-title">Mock Tests & Quizzes</h4>
                  <p className="smp-res-desc">Full-length mock tests and sectional quizzes</p>
                </div>
              </div>
              <div className="smp-res-arrow-wrap">
                <ArrowRight size={13} />
              </div>
            </Link>

            {/* 4. Syllabus & Exam Pattern */}
            <Link
              to={`/learning-center?category=${encodeURIComponent(categoryParam)}`}
              className="smp-resource-card res-card-green"
            >
              <div className="smp-res-card-top">
                <div className="smp-res-icon-wrap">
                  <BookOpen size={19} />
                </div>
                <div>
                  <h4 className="smp-res-title">Syllabus & Exam Pattern</h4>
                  <p className="smp-res-desc">Detailed syllabus and latest exam pattern</p>
                </div>
              </div>
              <div className="smp-res-arrow-wrap">
                <ArrowRight size={13} />
              </div>
            </Link>

            {/* 5. Important Topics */}
            <div
              className="smp-resource-card res-card-amber"
              onClick={() => navigate(`/learning-center?category=${encodeURIComponent(categoryParam)}`)}
            >
              <div className="smp-res-card-top">
                <div className="smp-res-icon-wrap">
                  <Lightbulb size={19} />
                </div>
                <div>
                  <h4 className="smp-res-title">Important Topics</h4>
                  <p className="smp-res-desc">High-weightage topics with expert insights</p>
                </div>
              </div>
              <div className="smp-res-arrow-wrap">
                <ArrowRight size={13} />
              </div>
            </div>

            {/* 6. Preparation Strategy */}
            <div
              className="smp-resource-card res-card-coral"
              onClick={() => navigate(`/learning-center?category=${encodeURIComponent(categoryParam)}`)}
            >
              <div className="smp-res-card-top">
                <div className="smp-res-icon-wrap">
                  <BarChart2 size={19} />
                </div>
                <div>
                  <h4 className="smp-res-title">Preparation Strategy</h4>
                  <p className="smp-res-desc">Study plan, tips and expert guidance</p>
                </div>
              </div>
              <div className="smp-res-arrow-wrap">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>
        </div>



        {/* ── View Details Modal ── */}
        {activeDetailsBook && (
          <div className="smp-modal-backdrop" onClick={() => setActiveDetailsBook(null)}>
            <div className="smp-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="smp-modal-head">
                <h3 className="smp-modal-title">{activeDetailsBook.displayTitle}</h3>
                <button
                  type="button"
                  className="smp-modal-close-btn"
                  onClick={() => setActiveDetailsBook(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="smp-modal-body">
                <p style={{ fontSize: '14px', color: 'var(--c-ink-3, #475569)', lineHeight: '1.6', marginBottom: '18px' }}>
                  {activeDetailsBook.combo.description}
                </p>

                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>What You Will Master:</h4>
                <ul className="smp-book-bullets" style={{ marginBottom: '20px' }}>
                  {activeDetailsBook.combo.bullets.map((b, i) => (
                    <li key={i} className="smp-book-bullet-item">
                      <span
                        className="smp-check-circle"
                        style={{
                          background: activeDetailsBook.combo.badgeBg,
                          color: activeDetailsBook.combo.checkColor,
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="smp-btn-details"
                    onClick={() => setActiveDetailsBook(null)}
                  >
                    Close
                  </button>
                  <Link
                    to={`/reader/${activeDetailsBook.resourceId || activeDetailsBook.slug || 'sample'}`}
                    className="smp-btn-explore"
                    style={{
                      background: activeDetailsBook.combo.accentColor,
                      borderColor: activeDetailsBook.combo.accentColor,
                    }}
                  >
                    <span>Open Reader</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Compare Books Modal ── */}
        {isCompareOpen && (
          <div className="smp-modal-backdrop" onClick={() => setIsCompareOpen(false)}>
            <div className="smp-modal-box smp-cmp-box" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
              <span className="smp-sheet-handle" aria-hidden="true" />
              <div className="smp-modal-head">
                <div className="smp-cmp-head-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="smp-cmp-icon"><Scale size={20} color="#064e3b" /></span>
                  <div className="smp-cmp-head-text">
                    <h3 className="smp-modal-title">Compare {currentExamShortName} {pageTypeTitle}</h3>
                    <p className="smp-cmp-sub">Find the right guidebook based on syllabus coverage, key features and practice resources.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="smp-modal-close-btn"
                  onClick={() => setIsCompareOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="smp-modal-body">
                <p className="smp-cmp-desc" style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '16px' }}>
                  Quick side-by-side comparison of syllabus focus, coverage depth, and practice material across our {currentExamShortName} series.
                </p>

                {/* Phones: feature strip + one card per book (the table below is for larger screens) */}
                <div className="smp-cmp-cards">
                  <div className="smp-cmp-features">
                    {[
                      { Icon: BookOpen, t: 'Syllabus-wise', d: 'Complete coverage', cls: 'green' },
                      { Icon: Target, t: 'Practice Ready', d: 'Mock tests & PYQs', cls: 'orange' },
                      { Icon: CheckSquare, t: 'Easy Comparison', d: 'Find the best fit', cls: 'blue' },
                      { Icon: Shield, t: 'Trusted Content', d: 'Curated by experts', cls: 'teal' },
                    ].map(({ Icon, t, d, cls }) => (
                      <div key={t} className={`smp-cmp-feature ${cls}`}>
                        <span className="smp-cmp-feature-icon"><Icon size={15} /></span>
                        <b>{t}</b>
                        <small>{d}</small>
                      </div>
                    ))}
                  </div>

                  {booksWithCombinations.map((b) => {
                    const subj = resolveSubjectForTitle(b.displayTitle, isGuide ? 'Guide' : 'Precis');
                    const cover = getBookCoverUrl(b.slug) || getBookCoverUrl(b.displayTitle) || subjectUrl(subj.key) || b.thumbnail;
                    const accent = b.combo.accentColor || '#064e3b';
                    return (
                      <article key={b.id} className={`smp-cmp-card ${b.isBestSeller ? 'best' : ''}`}>
                        <div className="smp-cmp-card-top">
                          {cover && <img src={cover} alt="" className="smp-cmp-cover" loading="lazy" />}
                          <div className="smp-cmp-card-info">
                            {b.isBestSeller && <span className="smp-cmp-best"><Star size={10} fill="currentColor" /> Best Seller</span>}
                            <h4 className="smp-cmp-card-title">{b.displayTitle}</h4>
                            {subj.label && <span className="smp-cmp-tag" style={{ background: b.combo.badgeBg, color: b.combo.checkColor }}>{subj.label}</span>}
                            <p className="smp-cmp-card-desc">{b.combo.description}</p>
                          </div>
                        </div>
                        <div className="smp-cmp-stats">
                          {b.combo.stats.map((st, i) => (<span key={i} className="smp-cmp-stat">{st.label}</span>))}
                        </div>
                        <div className="smp-cmp-actions">
                          <button type="button" className="smp-cmp-btn-outline" onClick={() => { setIsCompareOpen(false); setActiveDetailsBook(b); }}>View Details</button>
                          <Link to={`/reader/${b.resourceId || b.slug || 'sample'}`} className="smp-cmp-btn-fill" style={{ background: accent, borderColor: accent }}>
                            <BookOpen size={13} /><span>Read Sample</span><ArrowRight size={13} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="smp-cmp-table-view" style={{ overflowX: 'auto' }}>
                  <table className="smp-compare-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>Title</th>
                        <th style={{ width: '30%' }}>Coverage & Core Focus</th>
                        <th style={{ width: '26%' }}>Key Features</th>
                        <th style={{ width: '20%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booksWithCombinations.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>{b.displayTitle}</div>
                            {b.isBestSeller && (
                              <span style={{ fontSize: '10px', color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '4px' }}>
                                ★ Best Seller
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                            {b.combo.description}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {b.combo.stats.map((st, i) => (
                                <span key={i} style={{ fontSize: '10.5px', background: '#f1f5f9', padding: '2.5px 6px', borderRadius: '4px', fontWeight: 700, color: '#334155' }}>
                                  {st.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/reader/${b.resourceId || b.slug || 'sample'}`}
                              className="smp-btn-explore"
                              style={{
                                background: b.combo.accentColor || '#064e3b',
                                borderColor: b.combo.accentColor || '#064e3b',
                                padding: '7px 12px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                width: '100%',
                              }}
                            >
                              <span>Read Sample</span>
                              <ArrowRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
