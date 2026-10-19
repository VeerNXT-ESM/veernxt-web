import fs from 'fs';
import path from 'path';

// Base style rules strictly matching the user's reference images
const SHARED_PROMPT_PREFIX = `A professional 3D standing hardcover book mockup titled "%TITLE%" angled slightly at a 15-degree isometric perspective to showcase both the left spine and front cover clearly. The book stands upright on a polished surface with realistic subtle cast shadow on the right, tightly framed with no extra white margin, isolated against a pure white background.

Left Spine details:
- Deep forest green spine with gold trim rules and borders.
- Gold embossed uppercase text vertically along spine: "%SPINE_TITLE% — %SUBTITLE%".
- Veer Next gold shield emblem at the bottom of the spine.

Front Cover details:
- Elegant warm ivory / cream parchment background (#faf8f5) with dark green borders and accents.
- Top Header: Green and gold circular shield emblem with laurel leaves and ribbon, with the brand name "Veer Next®" and tagline "From Service to a Prosperous Tomorrow".
- Top-Right Badge: "%EXAMS_LABEL%".
- Main Title: Bold, prominent dark forest green typography: "%TITLE%".
- Subtitle Banner: Warm golden beige banner ribbon reading "%SUBTITLE%".
- Feature Badges: A horizontal row of 6 clean circular line-art icons representing key subjects (%TOPICS_LIST%).
- Left Checklist: 6 bullet points with circular gold checkmarks: %BULLETS_LIST%.
- Right Gold Seal: An authentic circular gold foil scalloped seal stamped with "BASED ON LATEST EXAM PATTERN ★★★".
- Bottom Tabletop Diorama: The lower third features a realistic, cinematic diorama displaying %DIORAMA_DESC%, with a stack of 4 leather-bound antique reference books having embossed gold titles on their spines: %SPINE_BOOKS%.`;

function buildPrompt(spec) {
  return SHARED_PROMPT_PREFIX
    .replace(/%TITLE%/g, spec.title)
    .replace(/%SUBTITLE%/g, spec.subtitle || 'COMPLETE GUIDE')
    .replace(/%SPINE_TITLE%/g, spec.spineTitle || spec.title)
    .replace(/%EXAMS_LABEL%/g, spec.exams || 'For UPSC, State PSC, SSC, Banking, Railways and Other Govt. Exams')
    .replace(/%TOPICS_LIST%/g, (spec.topics || []).join(', '))
    .replace(/%BULLETS_LIST%/g, (spec.bullets || []).join('; '))
    .replace(/%DIORAMA_DESC%/g, spec.diorama)
    .replace(/%SPINE_BOOKS%/g, (spec.spines || []).join(', '));
}

const stateSpecs = JSON.parse(fs.readFileSync('scripts/state_cover_specs.json', 'utf8'));

const allBooks = [];

// 1. Process States (25 books)
for (const [slug, spec] of Object.entries(stateSpecs)) {
  allBooks.push({
    slug,
    title: spec.title,
    category: 'Guide',
    type: 'state',
    prompt: buildPrompt(spec)
  });
}

// 2. Process Union Territories (8 books)
const utSpecs = {
  'andaman-nicobar-gs': {
    title: 'ANDAMAN & NICOBAR GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For Andaman & Nicobar UT Administration & Police Exams',
    topics: ['History & Cellular Jail', 'Island Geography', 'Tribal Communities', 'Marine Biodiversity', 'Administration & Economy', 'Current Affairs'],
    bullets: ['Complete UT Syllabus Notes', 'Cellular Jail & Freedom Struggle', 'Radhanagar Beach & Coral Reefs', 'Topic-wise Practice Questions', 'Previous Year Questions', 'Latest UT Administration Schemes'],
    spines: ['ISLAND HISTORY', 'CORAL GEO', 'TRIBAL STUDIES', 'POLITY'],
    diorama: 'Historic red-brick octagonal watchtower of Cellular Jail overlooking turquoise Andaman sea, coral reef sandbank with palm trees, Nicobari wooden canoe craft'
  },
  'chandigarh-gs': {
    title: 'CHANDIGARH GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For Chandigarh Administration, Police & Education Exams',
    topics: ['Le Corbusier & Architecture', 'Urban Geography', 'Administration & Law', 'Environment & Green City', 'Sukhna Lake Heritage', 'Current Affairs'],
    bullets: ['Complete Chandigarh Theory', 'Open Hand Monument & Capitol Complex', 'Rock Garden Sculptures', 'Topic-wise Practice Questions', 'Previous Year Papers', 'Latest UT Governance Schemes'],
    spines: ['CITY HISTORY', 'URBAN GEO', 'CIVIC POLITY', 'PRACTICE SETS'],
    diorama: 'Iconic Open Hand Monument metal silhouette, Le Corbusier concrete architecture facade, calm waters of Sukhna Lake with paddleboats at sunset, Rock Garden stone figures'
  },
  'dadra-nagar-haveli-daman-diu-gs': {
    title: 'DADRA & NAGAR HAVELI AND DAMAN & DIU GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For DNH & DD Administration Recruitment Exams',
    topics: ['Portuguese Heritage', 'Coastal Geography', 'Tribal Culture & Warli', 'Industry & Ports', 'Administration & Governance', 'Current Affairs'],
    bullets: ['Comprehensive UT Theory', 'Moti Daman Fort Ramparts', 'Warli Tribal Painting Heritage', 'Topic-wise Practice Questions', 'Previous Year Solved Papers', 'Latest UT Schemes'],
    spines: ['COASTAL HISTORY', 'TERRITORY GEO', 'WARLI CULTURE', 'POLITY'],
    diorama: 'Historic sea-facing stone ramparts of Moti Daman Fort with colonial lighthouse, Warli tribal folk painting scroll, tranquil Arabian sea waves splashing on rocks'
  },
  'delhi-gs': {
    title: 'DELHI GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For DSSSB, Delhi Police and Other Delhi State & UT Exams',
    topics: ['Seven Cities History', 'Geography & Yamuna', 'Monuments & Mughal/British Art', 'Economy & NCT Administration', 'Polity & Governance', 'Current Affairs'],
    bullets: ['Comprehensive DSSSB Theory', 'Red Fort & India Gate Heritage', 'Qutub Minar & Rashtrapati Bhavan', 'Topic-wise Practice Questions', 'Previous Year DSSSB Papers', 'Latest Delhi NCT Schemes'],
    spines: ['DELHI HISTORY', 'CAPITAL GEO', 'ADMIN & POLITY', 'CURRENT AFFAIRS'],
    diorama: 'Majestic red sandstone facade of India Gate with eternal flame Amar Jawan Jyoti, Red Fort parapet with Indian tricolor, Qutub Minar stone tower silhouette'
  },
  'jammu-kashmir-gs': {
    title: 'JAMMU & KASHMIR GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For JKSSB, JKPSC, Police and Other J&K UT Exams',
    topics: ['History & Dogras', 'Himalayan & Valley Geo', 'Sufi & Temple Heritage', 'Tourism & Agriculture', 'Polity & Reorganization', 'Current Affairs'],
    bullets: ['Comprehensive JKSSB Theory', 'Dal Lake & Mughal Gardens', 'Vaishno Devi & Amarnath Heritage', 'Topic-wise Practice Questions', 'Previous Year JKSSB Solved Papers', 'Latest J&K UT Schemes'],
    spines: ['J&K HISTORY', 'VALLEY GEO', 'CULTURE & SAFFRON', 'POLITY'],
    diorama: 'Traditional wooden Shikara boat with floral canopy floating on calm Dal lake, snow-dusted Pir Panjal peaks, golden autumn Chinar leaves, crimson saffron flowers'
  },
  'ladakh-gs': {
    title: 'LADAKH GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For LAHDC, Ladakh Police and Ladakh UT Recruitment Exams',
    topics: ['Silk Route History', 'Cold Desert Geography', 'Monasteries & Buddhism', 'Solar & High-Altitude Economy', 'Polity & Hill Councils', 'Current Affairs'],
    bullets: ['Comprehensive Ladakh Theory', 'Thiksey & Hemis Monasteries', 'Pangong Tso & Khardung La', 'Topic-wise Practice Questions', 'Previous Year Solved Papers', 'Latest Ladakh UT Schemes'],
    spines: ['LADAKH HISTORY', 'COLD DESERT GEO', 'MONASTERY ART', 'POLITY'],
    diorama: 'Whitewashed tiered pavilion of Thiksey Monastery, luminous turquoise waters of Pangong Tso lake against bare brown Himalayan mountains, colorful Buddhist prayer flags'
  },
  'lakshadweep-gs': {
    title: 'LAKSHADWEEP GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For Lakshadweep Administration & Police Exams',
    topics: ['Island History & Trade', 'Coral Atoll Geography', 'Marine Life & Lagoon Ecology', 'Fisheries & Coconut Economy', 'Polity & UT Governance', 'Current Affairs'],
    bullets: ['Comprehensive UT Theory', '36 Coral Islands & Atolls', 'Pristine Marine Biodiversity', 'Topic-wise Practice Questions', 'Previous Year Solved Papers', 'Latest Lakshadweep Schemes'],
    spines: ['ATOLL HISTORY', 'MARINE GEO', 'ISLAND ECONOMY', 'POLITY'],
    diorama: 'Luminous neon-turquoise shallow coral lagoon, pure white sandspit with swaying tropical coconut palm trees, colorful coral reef fishes, seashell specimen'
  },
  'puducherry-gs': {
    title: 'PUDUCHERRY GS',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For Puducherry PSC and UT Administration Exams',
    topics: ['French Colonial History', 'Coastal Geography', 'Auroville & Matrimandir', 'Economy & Tourism', 'Polity & Assembly Governance', 'Current Affairs'],
    bullets: ['Comprehensive Theory Notes', 'French Quarter Heritage Architecture', 'Promenade Beach & Auroville', 'Topic-wise Practice Questions', 'Previous Year Questions', 'Latest Puducherry Schemes'],
    spines: ['FRENCH HISTORY', 'COASTAL GEO', 'AUROVILLE', 'POLITY'],
    diorama: 'Mustard-yellow French colonial villa with white louvred shutters and cascading bougainvillea, golden spherical dome of Matrimandir, Promenade beach shoreline'
  }
};

for (const [slug, spec] of Object.entries(utSpecs)) {
  allBooks.push({
    slug,
    title: spec.title,
    category: 'Guide',
    type: 'ut',
    prompt: buildPrompt(spec)
  });
}

// 3. Core Subject Guides (7 books)
const coreSpecs = {
  'gs-gk': {
    title: 'GS & GK GUIDE BOOK',
    subtitle: 'COMPLETE ALL-INDIA GUIDE',
    exams: 'For UPSC, SSC, Railways, State PSC, Banking & Other Exams',
    topics: ['History & Culture', 'Geography', 'Polity & Constitution', 'Economy', 'General Science', 'Current Affairs'],
    bullets: ['Comprehensive All-India Theory', '10,000+ Facts with Infographics', 'Chapter-wise Practice Questions', 'Previous Year Solved Papers', 'High-Yield Revision Summaries', 'Latest Government Initiatives'],
    spines: ['INDIAN HISTORY', 'GEOGRAPHY', 'POLITY & CONST.', 'ECONOMY & SCI.'],
    diorama: 'Majestic circular colonnade of the Parliament of India, Constitution of India book with golden emblem, rotating brass terrestrial globe, Indian national flag'
  },
  'english': {
    title: 'ENGLISH',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For SSC CGL/CHSL, Banking, CDS, NDA and All Govt Exams',
    topics: ['Grammar Rules', 'Vocabulary & Idioms', 'Reading Comprehension', 'Error Spotting', 'Sentence Improvement', 'Para Jumbles'],
    bullets: ['Rule-wise Grammar Coverage', '3,000+ High-Frequency Words', 'Solved Comprehension Passages', 'Level-wise Practice Questions', 'Previous 10 Years Solved Questions', 'Score-Boosting Shortcuts'],
    spines: ['ENGLISH GRAMMAR', 'VOCABULARY', 'COMPREHENSION', 'PRACTICE SETS'],
    diorama: 'Open hardcover grammar book with fine typography, vintage ink bottle and gold-nib fountain pen, brass magnifying glass, elegant stack of literature books'
  },
  'reasoning': {
    title: 'REASONING',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For SSC, Bank PO/Clerk, Railways, Defense & State Exams',
    topics: ['Verbal Reasoning', 'Non-Verbal Logic', 'Analytical Ability', 'Puzzles & Seating', 'Critical Reasoning', 'Data Sufficiency'],
    bullets: ['Concept & Mindmap Frameworks', 'Step-by-Step Logic Algorithms', 'Shortcut Tricks for Puzzles', 'Graded Practice Sets (Easy to Hard)', 'Previous Year Exam Questions', 'Timed Speed-Test Drills'],
    spines: ['VERBAL LOGIC', 'PUZZLES & SEATING', 'NON-VERBAL', 'ANALYTICAL'],
    diorama: 'Carved wooden chess knight piece, 3D Rubik cube with solved faces, geometric logic flowcharts on notepad, mechanical stopwatch with brass dial'
  },
  'mathematics': {
    title: 'MATHEMATICS',
    subtitle: 'QUANTITATIVE APTITUDE GUIDE',
    exams: 'For SSC, Banking, Railways, Defense & State Exams',
    topics: ['Arithmetic & Percentages', 'Algebra & Equations', 'Geometry & Mensuration', 'Trigonometry', 'Data Interpretation', 'Number Systems'],
    bullets: ['Concept Formulas & Derivations', 'Vedic Math Shortcuts & Tricks', 'Topic-wise Practice Questions', 'Previous 15 Years Solved Papers', 'Data Interpretation Sets', 'Speed Calculation Techniques'],
    spines: ['ARITHMETIC', 'ADVANCED MATHS', 'GEOMETRY & TRIG', 'DATA INTERPRETATION'],
    diorama: 'Golden brass compass drawing tools, logarithmic spiral graph on grid paper, wooden abacus with colorful beads, geometric 3D polyhedra models'
  },
  'hindi': {
    title: 'HINDI',
    subtitle: 'COMPLETE GUIDE',
    exams: 'For UP Police, MPPSC, REET, CTET, RO/ARO and State Exams',
    topics: ['Hindi Vyakaran', 'Sandhi & Samas', 'Paryayvachi & Vilom', 'Muhavare & Lokoktiyan', 'Apathit Gadyansh', 'Sahitya & Rachnayein'],
    bullets: ['Complete Vyakaran Theory', 'Rule-wise Solved Illustrations', 'Topic-wise Objective Questions', 'Previous Year Solved Papers', 'Important Hindi Idioms & Proverbs', 'Model Test Papers'],
    spines: ['HINDI VYAKARAN', 'SHABDA KOSH', 'SAHITYA ITIHAS', 'PRACTICE SETS'],
    diorama: 'Ancient Devanagari manuscript scroll on parchment paper, terracotta inkpot with peacocks quill feather pen, classic Hindi literature books'
  },
  'maths-and-reasoning': {
    title: 'MATHS AND REASONING',
    subtitle: 'COMBINED MASTER GUIDE',
    exams: 'For General Recruitment, Police and State Exams',
    topics: ['Arithmetic Quant', 'Logical Reasoning', 'Puzzles & Series', 'Algebra & Geometry', 'Data Interpretation', 'Non-Verbal Logic'],
    bullets: ['Dual Subject Comprehensive Theory', 'Step-by-Step Shortcuts & Formulas', 'Graded Practice Exercises', 'Previous Year Questions', 'Speed Calculation Tips', 'Full Mock Test Papers'],
    spines: ['QUANTITATIVE APT.', 'LOGICAL REASONING', 'PUZZLES & DATA', 'MOCK TESTS'],
    diorama: 'Scientific calculation charts, geometric drafting triangle ruler, chess piece and stopwatch on wooden tabletop with dual-tone reference manuals'
  },
  'delhi-police-driver-traffic-rules': {
    title: 'DELHI POLICE DRIVER',
    subtitle: 'TRAFFIC RULES & MAINTENANCE GUIDE',
    exams: 'For Delhi Police Driver & Other State Driver Recruitment',
    topics: ['Motor Vehicle Act', 'Traffic Signs & Signals', 'Vehicle Maintenance', 'Driving Regulations', 'Road Safety & First Aid', 'General Awareness'],
    bullets: ['Complete MV Act & Rules 2019', 'All Mandatory & Cautionary Signs', 'Engine & Mechanical Maintenance', 'Topic-wise Practice Questions', 'Trade Test Preparation Guide', 'Previous Year Papers'],
    spines: ['MV ACT & RULES', 'VEHICLE MECHANICS', 'ROAD SAFETY', 'TRADE TEST'],
    diorama: 'Miniature classic steering wheel, set of metal road traffic caution signs, vehicle engine piston cutaway, Delhi police official emblem shield'
  }
};

for (const [slug, spec] of Object.entries(coreSpecs)) {
  allBooks.push({
    slug,
    title: spec.title,
    category: 'Guide',
    type: 'core',
    prompt: buildPrompt(spec)
  });
}

// 4. Specialized Guides (4 books)
const specGuides = {
  'nursing': {
    title: 'NURSING BOOK',
    subtitle: 'COMPLETE RECRUITMENT GUIDE',
    exams: 'For AIIMS NORCET, ESIC, RRB Staff Nurse and State Exams',
    topics: ['Anatomy & Physiology', 'Medical-Surgical Nursing', 'Pharmacology', 'Community Health', 'Pediatric & Obstetric', 'Microbiology'],
    bullets: ['Comprehensive Nursing Theory', 'Clinical Case Illustrations', 'High-Yield Drug Tables', 'Topic-wise Practice MCQs', 'Previous Year NORCET Papers', 'Mock Test Papers with Rationales'],
    spines: ['ANATOMY & PHYSIO', 'MED-SURG NURSING', 'PHARMACOLOGY', 'CLINICAL MCQS'],
    diorama: 'Professional medical stethoscope draped on tabletop, heart pulse ECG graph on tablet, anatomical human heart model, amber medicine dropper bottle'
  },
  '2026-descriptive-writing-bank-exams': {
    title: 'DESCRIPTIVE WRITING',
    subtitle: 'BANK EXAMS MASTER GUIDE',
    exams: 'For SBI PO, IBPS PO, RBI Grade B and NABARD Exams',
    topics: ['Formal Letter Writing', 'Essay Frameworks', 'Precis Writing', 'Current Economic Issues', 'Banking Terminology', 'Grammar & Vocabulary'],
    bullets: ['50+ Solved High-Scoring Essays', 'Formal & Informal Letter Templates', 'Step-by-Step Precis Writing Rules', 'Evaluation Rubrics & Scoring Tips', 'Previous Year Solved Topics', 'Grammar Correction Drills'],
    spines: ['ESSAY FRAMEWORKS', 'LETTER WRITING', 'PRECIS WRITING', 'ECONOMIC ISSUES'],
    diorama: 'Modern executive laptop with typing document, polished black and gold fountain pen, ruled cream notepad with handwritten draft, stack of financial reports'
  },
  'metro-technical-knowledge': {
    title: 'METRO TECHNICAL KNOWLEDGE',
    subtitle: 'COMPLETE RECRUITMENT GUIDE',
    exams: 'For DMRC, NMRC, BMRCL, UPMRC & All Metro Rail Exams',
    topics: ['Metro Rail Systems', 'Signalling & Telecom', 'Traction & Power Supply', 'Rolling Stock & Braking', 'Track & Civil Engineering', 'Safety & Operations'],
    bullets: ['Comprehensive Metro Rail Theory', 'System Diagrams & Schematics', 'Technical Trade Questions', 'Previous Year DMRC Solved Papers', 'Safety Rules & Protocols', 'Model Practice Papers'],
    spines: ['METRO SYSTEMS', 'SIGNALLING & POWER', 'ROLLING STOCK', 'PRACTICE SETS'],
    diorama: 'Streamlined modern stainless steel metro express train model, electrical catenary overhead wires, digital track signalling panel, yellow safety helmet'
  },
  'electrical-engineering': {
    title: 'ELECTRICAL ENGINEERING',
    subtitle: 'COMPLETE TECHNICAL GUIDE',
    exams: 'For SSC JE, RRB JE, State AE/JE and PSU Exams',
    topics: ['Circuit Theory', 'Electrical Machines', 'Power Systems', 'Control Systems', 'Measurements & Inst.', 'Basic Electronics'],
    bullets: ['Comprehensive Engineering Theory', 'Formulas & Solved Numerical Examples', 'Circuit Diagrams & Schematics', 'Topic-wise Practice Questions', 'Previous 10 Years JE/AE Papers', 'Formula Quick Sheet'],
    spines: ['CIRCUITS & MACHINES', 'POWER SYSTEMS', 'ELECTRONICS', 'NUMERICAL SETS'],
    diorama: 'Digital electronic multimeter with red and black probes, illuminated circuit board with copper traces and microchips, miniature copper wire induction coil'
  }
};

for (const [slug, spec] of Object.entries(specGuides)) {
  allBooks.push({
    slug,
    title: spec.title,
    category: 'Guide',
    type: 'specialized',
    prompt: buildPrompt(spec)
  });
}

// 5. Précis Revision Books (8 books)
const precisSpecs = {
  'gs-gk-precis': {
    title: 'GS & GK PRÉCI',
    subtitle: 'QUICK REVISION NOTES',
    exams: 'For All Competitive Examinations 2026',
    topics: ['History Flashcards', 'Geography Mindmaps', 'Constitution Articles', 'Economic Highlights', 'Science One-Liners', 'Static GK Tables'],
    bullets: ['High-Yield Concise Bullet Notes', 'Full Syllabus in 1/3rd the Time', 'Memory-Hook Tables & Flowcharts', 'Ultra-Quick Revision Before Exam', 'Frequently Asked PYQ Facts', 'Exam-Day Cheat Summaries'],
    spines: ['QUICK HISTORY', 'RAPID GEOGRAPHY', 'POLITY TABLES', 'STATIC GK SUMMARY'],
    diorama: 'Compact golden spiral-bound flashcard notebook, highlighted pocket revision guide, highlighter pen with glowing yellow ink, elegant leather notebook'
  },
  'mathematics-precis': {
    title: 'MATHEMATICS PRÉCI',
    subtitle: 'FORMULA & SHORTCUT HANDBOOK',
    exams: 'For SSC, Banking, Railways and Defense Exams',
    topics: ['Arithmetic Formulas', 'Algebra Identities', 'Geometry Theorems', 'Trigonometry Tables', 'Mensuration 2D/3D', 'Speed Calculation Tricks'],
    bullets: ['Complete Formula Cheat Sheet', '100+ Time-Saving Shortcut Tricks', 'Step-by-Step Derivation Tips', 'Common Trap Answers to Avoid', 'Topic-wise Rapid Practice Qs', 'Formula Pocket Companion'],
    spines: ['ARITHMETIC SHORTCUTS', 'ALGEBRA FORMULAS', 'GEOMETRY THEOREMS', 'SPEED MATHS'],
    diorama: 'Pocket formula booklet with golden ribbon bookmark, clear acrylic measurement scale, technical drafting pen, mathematical formula cards'
  },
  'english-precis': {
    title: 'ENGLISH PRÉCI',
    subtitle: 'GOLDEN RULES & VOCABULARY NOTES',
    exams: 'For SSC, Bank PO/Clerk, CDS and Defense Exams',
    topics: ['100 Golden Grammar Rules', 'Root Words & Prefixes', 'High-Frequency Idioms', 'Phrasal Verbs Table', 'Spelling Rules', 'Cloze Test Patterns'],
    bullets: ['100 Essential Grammar Rules', 'High-Scoring Vocabulary Cards', 'Confusing Words Demystified', 'Rapid Error-Spotting Formulas', 'Quick Practice Drills', 'Exam Day Revision Checklist'],
    spines: ['GOLDEN GRAMMAR', 'ROOT VOCABULARY', 'IDIOMS & PHRASES', 'QUICK DRILLS'],
    diorama: 'Leather pocket journal with embossed gold lettering, vintage brass index card holder with alphabetized flashcards, classic slim ballpoint pen'
  },
  'reasoning-precis': {
    title: 'REASONING PRÉCI',
    subtitle: 'LOGIC SHORTCUTS & MINDMAPS',
    exams: 'For SSC, Banking, Railways and Defense Exams',
    topics: ['Coding-Decoding Rules', 'Syllogism Venn Diagrams', 'Direction Sense Formulas', 'Blood Relations Maps', 'Seating Arrangement Patterns', 'Non-Verbal Grids'],
    bullets: ['Visual Concept Mindmaps', '5-Second Logic Shortcut Tricks', 'Venn Diagram Cheat Sheets', 'Puzzles Elimination Strategies', 'Speed Practice Test Cards', 'High-Accuracy Rules'],
    spines: ['LOGIC SHORTCUTS', 'SYLLOGISM MAPS', 'PUZZLE TRICKS', 'SPEED PRACTICE'],
    diorama: 'Laminated logic flowchart cards, miniature brass hourglass timer with flowing white sand, sleek black mechanical pencil, pocket puzzle notebook'
  },
  'computer-science-precis': {
    title: 'COMPUTER SCIENCE PRÉCI',
    subtitle: 'QUICK REVISION NOTES',
    exams: 'For Bank SO, SSC, State IT and Technical Exams',
    topics: ['Hardware & OS Summaries', 'DBMS & SQL Commands', 'Networking Protocols', 'Cyber Security Basics', 'Shortcut Keys & Acronyms', 'Programming Highlights'],
    bullets: ['Concise Concept Bullet Summaries', 'Complete SQL & Shortcut Tables', 'OSI 7-Layer Protocol Cards', 'High-Yield Tech Acronyms', 'Previous Exam One-Liners', 'Rapid Tech Revision Companion'],
    spines: ['OS & HARDWARE', 'DBMS & SQL', 'NETWORKING', 'SECURITY CHEATS'],
    diorama: 'Compact microchip motherboard card with golden contact pins, USB metal flash drive, pocket technical quick-reference handbook'
  },
  'hindi-precis': {
    title: 'HINDI PRÉCI',
    subtitle: 'VYAKARAN SUTRA HANDBOOK',
    exams: 'For UP Police, MPPSC, REET, CTET and State Exams',
    topics: ['Sandhi Sutras', 'Samas Pehchan Tricks', 'Varnamala Tables', 'Vakya Shuddhi Rules', 'Top 500 Muhavare', 'Rachnayein Rapid Tables'],
    bullets: ['Grammar Sutra Quick Rules', 'Instant Sandhi-Samas Tricks', 'High-Frequency Synonyms & Antonyms', 'Error Detection Checkpoints', 'Quick Objective Revision Sets', 'Pocket Vyakaran Companion'],
    spines: ['SANDHI SAMAS', 'VYAKARAN SUTRA', 'SHABDA BHANDAR', 'RAPID NOTES'],
    diorama: 'Handmade paper pocket notebook with Devanagari calligraphy script, wooden bookmark with Indian tricolor ribbon, brass inkwell'
  },
  '2026-gk-gs-precis': {
    title: '2026 GK-GS PRÉCI',
    subtitle: 'SSC RAPID REVISION NOTES',
    exams: 'For SSC CGL, CHSL, MTS, CPO & GD Constable',
    topics: ['Modern Indian History', 'World & Indian Geography', 'Polity Key Articles', 'Economy Five Year Plans', 'General Science One-Liners', 'Static Awards & Sports'],
    bullets: ['SSC Specific High-Yield Facts', 'Previous 10 Years Repeated Topics', 'Articles & Amendments Tables', 'Sports, Dances & Festivals List', 'Last-Minute Revision Capsule', '100% Exam-Aligned Content'],
    spines: ['SSC HISTORY', 'POLITY ARTICLES', 'SCIENCE CAPSULE', 'STATIC GK TABLES'],
    diorama: 'SSC exam prep rapid revision handbook with golden bookmarks, official exam syllabus card, yellow highlighter, timer clock on executive study table'
  },
  'electrical-engineering-precis': {
    title: 'ELECTRICAL ENGINEERING PRÉCI',
    subtitle: 'FORMULA & CONCEPT CHEAT BOOK',
    exams: 'For SSC JE, RRB JE, State AE/JE and PSU Exams',
    topics: ['Network Theorems', 'Transformer Formulas', 'AC Fundamentals', 'Control System Roots', 'Measurement Bridge Tables', 'Semiconductor Cheats'],
    bullets: ['Complete Formula Compilation', 'Key Theorems & Equivalent Circuits', 'Testing & Maintenance Rules', 'Unit Conversions & Constants', 'Rapid Numerical Solvers', 'Quick JE/AE Pocket Guide'],
    spines: ['NETWORK THEOREMS', 'ELECTRICAL MACHINES', 'POWER SYSTEM CHEATS', 'FORMULA TABLES'],
    diorama: 'Laminated pocket electronic circuit schematic card, resistance color-code calculator wheel, precision brass vernier caliper on technical handbook'
  }
};

for (const [slug, spec] of Object.entries(precisSpecs)) {
  allBooks.push({
    slug,
    title: spec.title,
    category: 'Precis',
    type: 'precis',
    prompt: buildPrompt(spec)
  });
}

fs.writeFileSync('scripts/all_book_specs.json', JSON.stringify(allBooks, null, 2));
console.log('Successfully generated all', allBooks.length, 'book specifications in scripts/all_book_specs.json');
