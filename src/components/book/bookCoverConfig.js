import {
  Monitor, Settings, Globe, Database, Code2, ShieldCheck, FileText, BookOpen, Calculator,
  Scale, Landmark, Atom, FlaskConical, Languages, Brain, Newspaper, Map, Train, Wheat, HeartPulse,
} from 'lucide-react';

export const COVER_W = 1000;
export const COVER_H = 1480;
export const SPINE_W = 150;

export const TOPIC_ICONS = {
  monitor: Monitor, cog: Settings, globe: Globe, database: Database, code: Code2, shield: ShieldCheck,
  file: FileText, book: BookOpen, calculator: Calculator, scale: Scale, landmark: Landmark, atom: Atom,
  flask: FlaskConical, language: Languages, brain: Brain, news: Newspaper, map: Map, train: Train,
  wheat: Wheat, health: HeartPulse,
};

export const DEFAULT_COVER = {
  title: 'Computer\nScience',
  type: 'GUIDE',
  badge: 'COMPLETE GUIDE',
  exams: 'UPSC, State PSC\nSSC, Banking, Railways\nand Other Govt. Exams',
  examsPrefix: 'For',
  brandName: 'VEERNXT',
  spineType: false,   // also print Guide/Precis on the spine
  topics: [
    { label: 'Computer Fundamentals', icon: 'monitor' },
    { label: 'Operating System', icon: 'cog' },
    { label: 'Internet & Networking', icon: 'globe' },
    { label: 'DBMS', icon: 'database' },
    { label: 'Programming Concepts', icon: 'code' },
    { label: 'Cyber Security', icon: 'shield' },
    { label: 'Previous Year Questions', icon: 'file' },
  ],
  bullets: [
    'Concept Based Theory',
    'Lucid Notes with Diagrams & Flowcharts',
    'Important Definitions & Short Notes',
    'Topic-wise Practice Questions',
    'Previous Year Questions',
    'Model Test Papers',
    'Exam-Oriented Approach',
  ].join('\n'),
  logo: '',          // data URL; empty = built-in crest
  image: '',         // data URL for the bottom hero picture
  imageY: 60,        // vertical focus of the hero picture, %
  imageHeight: 36,   // hero picture height, % of the cover
  layout: {},        // overrides of LAYOUT_DEFAULTS, see below
  paper: '#FBF3DF',
  primary: '#0F3D2B',
  accent: '#B8872B',
};


// Per-element size/spacing the content team can tune. Everything lays out as a
// vertical flow, so a bigger font or gap pushes the blocks below it down
// instead of overlapping them. titleSize 0 = auto-fit to the cover width.
export const LAYOUT_DEFAULTS = {
  brandSize: 60,      // "Veer Next" wordmark, px
  tagline: 17,        // tagline under the wordmark, px
  examsSize: 28,      // exams panel text, px
  headerGap: 24,      // header -> subject name, px
  titleSize: 0,       // 0 = auto
  titleLeading: 92,   // subject line spacing, % of font size
  titleGap: 6,        // subject name -> badge, px
  badgeSize: 46,      // GUIDE / PRECIS badge text, px
  badgeGap: 34,       // badge -> subject icons, px
  topicSize: 22,      // subject icon labels, px
  topicsGap: 34,      // subject icons -> bullets, px
  bulletSize: 31,     // bullet text, px
  bulletGap: 12,      // space between bullets, px
  bulletsWidth: 62,   // bullet column width, % of the cover
  fade: 70,
  spineTitleSize: 0,  // 0 = auto-fit the spine height
  spineLogoSize: 112, // logo at the top of the spine, px           // how strongly the picture fades under the text, %
};

export const LAYOUT_CONTROLS = [
  ['Header', [['brandSize', 'Brand name size', 50, 110], ['tagline', 'Tagline size', 14, 30], ['examsSize', 'Exams text size', 18, 40]]],
  ['Subject name', [['headerGap', 'Space above name', 0, 160], ['titleSize', 'Name size (0 = auto)', 0, 260], ['titleLeading', 'Line spacing %', 70, 130], ['titleGap', 'Space below name', 0, 120]]],
  ['Badge', [['badgeSize', 'Badge text size', 28, 70], ['badgeGap', 'Space below badge', 0, 120]]],
  ['Subjects row', [['topicSize', 'Label size', 16, 32], ['topicsGap', 'Space below row', 0, 120]]],
  ['Bullets', [['bulletSize', 'Text size', 22, 42], ['bulletGap', 'Space between', 2, 36], ['bulletsWidth', 'Column width %', 40, 100]]],
  ['Picture', [['fade', 'Fade under text %', 0, 100]]],
  ['Spine', [['spineTitleSize', 'Name size (0 = auto)', 0, 130], ['spineLogoSize', 'Logo size', 60, 130]]],
];
