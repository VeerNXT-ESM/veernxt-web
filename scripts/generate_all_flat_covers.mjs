import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const REFERENCE_IMAGE_PATH =
  process.env.REFERENCE_IMAGE_PATH ||
  './reference/veernxt-reference.png';

const OUT_DIR = path.resolve('raw_book_covers/test2');
const MODEL = 'openai/gpt-image-1';
const WIDTH = 1024;
const HEIGHT = 1536;

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY in .env');
  process.exit(1);
}

if (!fs.existsSync(REFERENCE_IMAGE_PATH)) {
  console.error(`Reference image not found: ${REFERENCE_IMAGE_PATH}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Complete list of all books with exact bespoke prompts
const allBooks = [
  // Already generated (will be skipped automatically if file exists)
  {
    slug: 'rajasthan-gs',
    stateName: 'RAJASTHAN GS',
    title1: 'RAJASTHAN',
    title2: 'GS',
    examsLabel: 'For\nRPSC, RSMSSB, REET\nand Other\nRajasthan State Exams',
    topics: ['History & Culture', 'Geography of Rajasthan', 'Society & People', 'Economy & Development', 'Polity & Schemes', 'Current Affairs (Rajasthan Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'State Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year Questions',
      'Rajasthan Specific Current Affairs',
      'Updated with Latest Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'A photorealistic Rajasthan landscape with Hawa Mahal, Mehrangarh Fort, realistic golden Thar Desert dunes, and authentic Rajasthani bandhani textile. Include five carefully composed premium academic books with dark green, brown and cream covers.'
  },
  {
    slug: 'madhya-pradesh-gs',
    stateName: 'MADHYA PRADESH GS',
    title1: 'MADHYA PRADESH',
    title2: 'GS',
    examsLabel: 'For\nMPPSC, MP Police, Vyapam\nand Other\nMP State Exams',
    topics: ['History & Dynasties', 'Narmada & MP Geography', 'Tribal Culture & Gond Art', 'Forests & Wildlife', 'Polity & Administration', 'Current Affairs (MP Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'MP Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year MPPSC Questions',
      'Madhya Pradesh Current Affairs',
      'Updated with Latest MP Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'A photorealistic composition featuring the Great Stupa of Sanchi, its historic carved gateway, Khajuraho sandstone temples and authentic central Indian forest scenery. Include realistic stone textures and premium academic books.'
  },
  {
    slug: 'maharashtra-gs',
    stateName: 'MAHARASHTRA GS',
    title1: 'MAHARASHTRA',
    title2: 'GS',
    examsLabel: 'For\nMPSC, Maharashtra Police\nand Other\nState Exams',
    topics: ['Maratha History', 'Deccan Geography', 'Social Reformers', 'Economy & Industry', 'Polity & Local Bodies', 'Current Affairs (Maharashtra Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Maharashtra Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year MPSC Questions',
      'Maharashtra Current Affairs',
      'Updated with Latest State Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'A photorealistic Maharashtra scene featuring the Gateway of India, Raigad Fort, authentic Maratha architectural details and finely woven Paithani silk fabric with subtle gold borders.'
  },
  {
    slug: 'gujarat-gs',
    stateName: 'GUJARAT GS',
    title1: 'GUJARAT',
    title2: 'GS',
    examsLabel: 'For\nGPSC, GSSSB, Talati\nand Other\nGujarat State Exams',
    topics: ['History & Solankis', 'Geography & Coastline', 'Trade & Industry', 'Culture & Garba', 'Polity & Governance', 'Current Affairs (Gujarat Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Gujarat Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year GPSC Questions',
      'Gujarat Specific Current Affairs',
      'Updated with Latest Gujarat Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'A photorealistic Gujarat landscape featuring the intricately carved Rani ki Vav stepwell, Modhera Sun Temple, the white salt flats of the Rann of Kutch and subtle authentic Gujarati textiles.'
  },
  {
    slug: 'gs-gk-complete-guide',
    stateName: 'GS & GK COMPLETE GUIDE',
    title1: 'GENERAL STUDIES & GK',
    title2: 'ALL INDIA',
    examsLabel: 'For\nUPSC, SSC, Railways\nBanking, Defense & State\nGovt. Examinations',
    topics: ['Indian History', 'Geography', 'Polity & Constitution', 'Indian Economy', 'General Science', 'Current Affairs (National & Int.)'],
    bullets: [
      'Comprehensive All-India Theory',
      '10,000+ High-Yield Facts & Infographics',
      'Topic-wise Practice Questions',
      'Previous 15 Years Solved Papers',
      'National & International Affairs',
      'Updated with Latest Govt Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'A photorealistic editorial composition featuring the Parliament of India, an authentic Constitution of India book, a brass terrestrial globe and a tastefully presented Indian tricolour, with premium academic books and realistic desk materials.'
  },

  // Remaining State GS Guides
  {
    slug: 'haryana-gs',
    stateName: 'HARYANA GS',
    title1: 'HARYANA',
    title2: 'GS',
    examsLabel: 'For\nHPSC, HSSC, Police\nand Other\nHaryana State Exams',
    topics: ['Vedic History', 'Geography & Yamuna', 'Agriculture & Green Rev', 'Sports & Champions', 'Polity & Governance', 'Current Affairs (Haryana Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Haryana Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year HSSC Questions', 'Haryana Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic scene featuring the bronze chariot sculpture of Kurukshetra, Brahma Sarovar ghats, golden mustard fields under sunlight, and a stack of five premium academic books.'
  },
  {
    slug: 'himachal-pradesh-gs',
    stateName: 'HIMACHAL PRADESH GS',
    title1: 'HIMACHAL PRADESH',
    title2: 'GS',
    examsLabel: 'For\nHPPSC, HP Police\nand Other\nHimachal State Exams',
    topics: ['Hill State History', 'Himalayan Geography', 'Culture & Fairs', 'Hydro & Tourism', 'Polity & Administration', 'Current Affairs (HP Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'HP Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year HPPSC Questions', 'Himachal Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic Himalayan landscape with wooden pagoda of Hidimba Temple, towering deodar pine trees, snow-capped Dhauladhar peaks in golden light, and authentic woven Kullu pattern.'
  },
  {
    slug: 'odisha-gs',
    stateName: 'ODISHA GS',
    title1: 'ODISHA',
    title2: 'GS',
    examsLabel: 'For\nOPSC, OSSSC, Police\nand Other\nOdisha State Exams',
    topics: ['Kalinga History', 'Coastline & Chilika', 'Konark & Jagannath Culture', 'Minerals & Ports', 'Polity & Governance', 'Current Affairs (Odisha Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Odisha Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year OPSC Questions', 'Odisha Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic coastal Odisha composition with the grand carved stone wheel of Konark Sun Temple, tranquil Chilika Lake waters, and authentic silver filigree craft alongside academic books.'
  },
  {
    slug: 'punjab-gs',
    stateName: 'PUNJAB GS',
    title1: 'PUNJAB',
    title2: 'GS',
    examsLabel: 'For\nPPSC, Punjab Police\nand Other\nPunjab State Exams',
    topics: ['Sikh Gurus & History', 'Five Rivers Geography', 'Agriculture & Crops', 'Culture & Folklore', 'Polity & Administration', 'Current Affairs (Punjab Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Punjab Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year PPSC Questions', 'Punjab Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring the golden architecture of Sri Harmandir Sahib reflecting in water, golden ripe wheat fields at sunset, and colorful Phulkari embroidery on premium books.'
  },
  {
    slug: 'west-bengal-gs',
    stateName: 'WEST BENGAL GS',
    title1: 'WEST BENGAL',
    title2: 'GS',
    examsLabel: 'For\nWBPSC, WB Police, WBCS\nand Other\nWest Bengal State Exams',
    topics: ['Bengal Renaissance', 'Geography & Sundarbans', 'Literature & Art', 'Economy & Tea', 'Polity & Administration', 'Current Affairs (WB Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'West Bengal Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year WBCS Questions', 'West Bengal Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic scene featuring the white marble Victoria Memorial dome, steel cantilever Howrah Bridge over the river, Sundarbans mangrove foliage, and classic terracotta temple tiles.'
  },
  {
    slug: 'uttar-pradesh-gs',
    stateName: 'UTTAR PRADESH GS',
    title1: 'UTTAR PRADESH',
    title2: 'GS',
    examsLabel: 'For\nUPPSC, UP Police, RO/ARO\nand Other\nUP State Exams',
    topics: ['Ancient History & Awadh', 'Ganga Plains Geography', 'Culture, Fairs & Heritage', 'Agriculture & ODOP', 'Polity & Governance', 'Current Affairs (UP Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'UP Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year UPPSC Questions', 'Uttar Pradesh Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic architectural composition featuring the sandstone arches of Rumi Darwaza Lucknow, Varanasi ghat stone steps along the sacred river Ganga, and authentic Chikan embroidery on academic books.'
  },
  {
    slug: 'bihar-gs',
    stateName: 'BIHAR GS',
    title1: 'BIHAR',
    title2: 'GS',
    examsLabel: 'For\nBPSC, Bihar Police, BSSC\nand Other\nBihar State Exams',
    topics: ['Magadha & Mauryas', 'Geography & Kosi/Ganga', 'Buddhism & Nalanda', 'Economy & Agriculture', 'Polity & Governance', 'Current Affairs (Bihar Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Bihar Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year BPSC Questions', 'Bihar Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic scene featuring the ancient brick ruins of Nalanda University stupa, Mahabodhi Temple stone spire at Bodh Gaya, and authentic Madhubani folk art motifs.'
  },
  {
    slug: 'jharkhand-gs',
    stateName: 'JHARKHAND GS',
    title1: 'JHARKHAND',
    title2: 'GS',
    examsLabel: 'For\nJPSC, JSSC, Police\nand Other\nJharkhand State Exams',
    topics: ['Tribal Freedom Struggle', 'Chota Nagpur Plateau Geo', 'Minerals & Heavy Industry', 'Tribal Art & Sohrai', 'Polity & Governance', 'Current Affairs (Jharkhand Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Jharkhand Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year JPSC Questions', 'Jharkhand Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring the cascading Hundru waterfall over plateau granite rocks, dense Sal forests, Sohrai tribal wall art motifs, and mineral crystals on academic books.'
  },
  {
    slug: 'chhattisgarh-gs',
    stateName: 'CHHATTISGARH GS',
    title1: 'CHHATTISGARH',
    title2: 'GS',
    examsLabel: 'For\nCGPSC, CG Vyapam, Police\nand Other\nCG State Exams',
    topics: ['History & Dynasties', 'Bastar & Mahanadi Geo', 'Tribal Culture & Dokra', 'Minerals & Forests', 'Polity & Administration', 'Current Affairs (CG Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Chhattisgarh Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year CGPSC Questions', 'Chhattisgarh Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic landscape with the wide horseshoe cascade of Chitrakote waterfall on Indravati river, Bastar bell-metal Dokra bronze figurines, and lush central Indian forest.'
  },
  {
    slug: 'assam-gs',
    stateName: 'ASSAM GS',
    title1: 'ASSAM',
    title2: 'GS',
    examsLabel: 'For\nAPSC, Assam Police\nand Other\nAssam State Exams',
    topics: ['Ahom Dynasty & History', 'Brahmaputra & Tea Gardens', 'Kaziranga & Biodiversity', 'Silk & Bihu Culture', 'Polity & Administration', 'Current Affairs (Assam Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Assam Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year APSC Questions', 'Assam Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring the majestic Kamakhya Temple stone spire, rolling emerald tea garden slopes, one-horned rhinoceros silhouette, and woven red-and-white Gamusa textile.'
  },
  {
    slug: 'karnataka-gs',
    stateName: 'KARNATAKA GS',
    title1: 'KARNATAKA',
    title2: 'GS',
    examsLabel: 'For\nKPSC, KEA, Police\nand Other\nKarnataka State Exams',
    topics: ['Vijayanagara & Hoysalas', 'Deccan & Western Ghats', 'IT & Aerospace Industry', 'Culture & Yakshagana', 'Polity & Governance', 'Current Affairs (Karnataka Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Karnataka Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year KPSC Questions', 'Karnataka Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic scene featuring the iconic stone chariot of Hampi, Mysore Palace illuminated archways, sandalwood carving textures, and lush Western Ghats coffee plantations.'
  },
  {
    slug: 'kerala-gs',
    stateName: 'KERALA GS',
    title1: 'KERALA',
    title2: 'GS',
    examsLabel: 'For\nKerala PSC, Police\nand Other\nKerala State Exams',
    topics: ['History & Travancore', 'Backwaters & Coastal Geo', 'Spices & Plantations', 'Kathakali & Art Forms', 'Polity & Social Model', 'Current Affairs (Kerala Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Kerala Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year Kerala PSC Questions', 'Kerala Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic scene with a traditional wooden Kettuvallam houseboat gliding on calm Alleppey backwaters lined with coconut palms, Chinese fishing nets at sunset, and Kathakali headpiece motifs.'
  },
  {
    slug: 'tamil-nadu-gs',
    stateName: 'TAMIL NADU GS',
    title1: 'TAMIL NADU',
    title2: 'GS',
    examsLabel: 'For\nTNPSC, TNUSRB, Police\nand Other\nTamil Nadu State Exams',
    topics: ['Chola, Pandya & Pallava', 'Coromandel Geography', 'Dravidian Architecture', 'Automobile & Industry', 'Polity & Administration', 'Current Affairs (TN Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Tamil Nadu Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year TNPSC Questions', 'Tamil Nadu Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring the monumental granite Vimana spire of Thanjavur Brihadisvara Temple, Mahabalipuram shore temple rocks, and rich Kanchipuram silk textile with gold zari.'
  },
  {
    slug: 'andhra-pradesh-gs',
    stateName: 'ANDHRA PRADESH GS',
    title1: 'ANDHRA PRADESH',
    title2: 'GS',
    examsLabel: 'For\nAPPSC, AP Police\nand Other\nAndhra Pradesh State Exams',
    topics: ['Satavahanas & Kakatiyas', 'Godavari & Krishna Basins', 'Tirumala & Temple Art', 'Ports & Industrial Hubs', 'Polity & Governance', 'Current Affairs (AP Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Andhra Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year APPSC Questions', 'Andhra Pradesh Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring the golden Gopuram spire of Tirumala, Prakasam barrage across the Krishna river, Lepakshi hanging pillar architecture, and Kalamkari painted cotton textile.'
  },
  {
    slug: 'telangana-gs',
    stateName: 'TELANGANA GS',
    title1: 'TELANGANA',
    title2: 'GS',
    examsLabel: 'For\nTGPSC, Telangana Police\nand Other\nTelangana State Exams',
    topics: ['Kakatiya Dynasty & Golconda', 'Deccan & Godavari Basin', 'Hyderabad & IT Corridors', 'Bathukamma & Culture', 'Polity & Governance', 'Current Affairs (Telangana Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Telangana Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year TGPSC Questions', 'Telangana Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring the four grand minarets of Charminar, Golconda fort stone ramparts on granite hill, and floral arrangement of Bathukamma alongside academic books.'
  },
  {
    slug: 'arunachal-pradesh-gs',
    stateName: 'ARUNACHAL PRADESH GS',
    title1: 'ARUNACHAL PRADESH',
    title2: 'GS',
    examsLabel: 'For\nAPPSC, APSSB, Police\nand Other\nArunachal State Exams',
    topics: ['Tribal History & Clans', 'Eastern Himalayan Geography', 'Monasteries & Tawang', 'Biodiversity & Rivers', 'Polity & Sixth Schedule', 'Current Affairs (Arunachal Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Arunachal Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year APPSC Questions', 'Arunachal Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic mountain composition with the multi-tiered yellow and gold Tawang Monastery, snow-clad Eastern Himalayan ridges, rhododendron flowers, and tribal handloom weaves.'
  },
  {
    slug: 'delhi-gs',
    stateName: 'DELHI GS',
    title1: 'DELHI',
    title2: 'GS',
    examsLabel: 'For\nDSSSB, Delhi Police\nand Other\nDelhi Govt. Exams',
    topics: ['Seven Historic Cities', 'Capital Geography & Yamuna', 'Monuments & Architecture', 'Economy & NCT Administration', 'Polity & Governance', 'Current Affairs (Delhi Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Delhi Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year DSSSB Questions', 'Delhi Specific Current Affairs', 'Updated with Latest NCT Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic architectural composition featuring the red sandstone arch of India Gate, Red Fort ramparts, and Qutub Minar stone tower under clear morning sunlight with academic books.'
  },
  {
    slug: 'jammu-kashmir-gs',
    stateName: 'JAMMU & KASHMIR GS',
    title1: 'JAMMU & KASHMIR',
    title2: 'GS',
    examsLabel: 'For\nJKSSB, JKPSC, Police\nand Other\nJ&K UT Exams',
    topics: ['Dogra Dynasty & History', 'Himalayan & Valley Geo', 'Sufi & Temple Heritage', 'Tourism & Saffron Economy', 'Polity & Reorganization', 'Current Affairs (J&K Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'J&K Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year JKSSB Questions', 'Jammu & Kashmir Current Affairs', 'Updated with Latest UT Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic composition featuring a traditional carved wooden Shikara on serene Dal Lake, snow-capped Pir Panjal mountain range, autumn golden Chinar leaves, and purple saffron flowers.'
  },
  {
    slug: 'ladakh-gs',
    stateName: 'LADAKH GS',
    title1: 'LADAKH',
    title2: 'GS',
    examsLabel: 'For\nLAHDC, Ladakh Police\nand Other\nLadakh UT Exams',
    topics: ['Silk Route & History', 'Cold Desert High-Altitude Geo', 'Monasteries & Buddhist Art', 'Pangong & Mountain Passes', 'Polity & Hill Councils', 'Current Affairs (Ladakh Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Ladakh Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year Solved Papers', 'Ladakh Current Affairs', 'Updated with Latest UT Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic landscape featuring the whitewashed stone tiers of Thiksey Monastery, deep azure waters of Pangong Tso lake against rugged bare brown mountain slopes, and prayer flags.'
  },
  {
    slug: 'uttarakhand-gs',
    stateName: 'UTTARAKHAND GS',
    title1: 'UTTARAKHAND',
    title2: 'GS',
    examsLabel: 'For\nUKPSC, UKSSSC, Police\nand Other\nUttarakhand State Exams',
    topics: ['Garhwal & Kumaon History', 'Himalayan Geography & Rivers', 'Char Dham & Pilgrimage', 'Forests & National Parks', 'Polity & Governance', 'Current Affairs (UK Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Uttarakhand Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year UKPSC Questions', 'Uttarakhand Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic scene featuring the ancient grey-stone Kedarnath Temple against snow-covered Himalayan peaks, roaring green waters of Ganga at Devprayag, and rhododendron flowers.'
  },
  {
    slug: 'goa-gs',
    stateName: 'GOA GS',
    title1: 'GOA',
    title2: 'GS',
    examsLabel: 'For\nGPSC, Goa Police\nand Other\nGoa State Exams',
    topics: ['Portuguese Era & History', 'Konkan Coastline & Mandovi', 'Churches & Heritage Forts', 'Mining & Tourism Economy', 'Polity & Panchayats', 'Current Affairs (Goa Specific)'],
    bullets: ['Comprehensive Exam-Oriented Theory', 'Goa Specific Facts, Maps & Data', 'Topic-wise Practice Questions', 'Previous Year GPSC Questions', 'Goa Specific Current Affairs', 'Updated with Latest State Schemes', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic coastal composition featuring the baroque whitewashed facade of Immaculate Conception Church Panaji, red laterite walls of Aguada Fort, and palm-fringed Arabian sea.'
  },

  // Core Subject Guides
  {
    slug: 'mathematics',
    stateName: 'MATHEMATICS COMPLETE GUIDE',
    title1: 'MATHEMATICS',
    title2: 'QUANTITATIVE APTITUDE',
    examsLabel: 'For\nSSC, Banking, Railways\nDefense, CSAT & State\nGovt. Examinations',
    topics: ['Arithmetic & Percentages', 'Algebra & Equations', 'Geometry & Mensuration', 'Trigonometry', 'Data Interpretation', 'Number Systems'],
    bullets: ['Comprehensive Theory & Derivations', 'Vedic Math Shortcuts & Fast Tricks', 'Topic-wise Graded Practice Questions', 'Previous 15 Years Solved Questions', 'Data Interpretation & Graphs', 'Updated with Latest Exam Patterns', 'Easy Language & Quick Formula Sheets'],
    dioramaScene: 'A photorealistic academic still-life featuring golden brass compass drafting tools, mathematical graphs on grid parchment, a wooden abacus, and geometric polyhedra alongside five reference books.'
  },
  {
    slug: 'reasoning',
    stateName: 'REASONING COMPLETE GUIDE',
    title1: 'REASONING',
    title2: 'VERBAL & NON-VERBAL',
    examsLabel: 'For\nSSC, Banking, Railways\nDefense, Police & State\nGovt. Examinations',
    topics: ['Verbal Reasoning', 'Non-Verbal Logic', 'Analytical Ability', 'Puzzles & Seating', 'Critical Reasoning', 'Data Sufficiency'],
    bullets: ['Concept & Mindmap Frameworks', 'Step-by-Step Logic Algorithms', 'Shortcut Tricks for Complex Puzzles', 'Graded Practice Sets (Easy to Hard)', 'Previous Year Exam Questions', 'Timed Speed-Test Drills', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic academic still-life featuring a polished wooden chess knight piece, a solved Rubik cube, geometric logic flowcharts on notepad, and an antique mechanical stopwatch.'
  },
  {
    slug: 'english',
    stateName: 'ENGLISH COMPLETE GUIDE',
    title1: 'ENGLISH LANGUAGE',
    title2: '& COMPREHENSION',
    examsLabel: 'For\nSSC CGL/CHSL, Banking\nCDS, NDA & State\nGovt. Examinations',
    topics: ['Grammar Rules', 'Vocabulary & Idioms', 'Reading Comprehension', 'Error Spotting', 'Sentence Improvement', 'Para Jumbles'],
    bullets: ['Rule-wise Grammar Coverage', '3,000+ High-Frequency Words', 'Solved Comprehension Passages', 'Level-wise Practice Questions', 'Previous 10 Years Solved Questions', 'Score-Boosting Shortcuts', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic academic composition with an open classic hardcover grammar book showing fine typography, vintage ink bottle and gold-nib fountain pen, and brass magnifying glass.'
  },
  {
    slug: 'hindi',
    stateName: 'HINDI COMPLETE GUIDE',
    title1: 'SAMANYA HINDI',
    title2: 'COMPLETE GUIDE',
    examsLabel: 'For\nUP Police, MPPSC, REET\nCTET, RO/ARO & State\nGovt. Examinations',
    topics: ['Hindi Vyakaran', 'Sandhi & Samas', 'Paryayvachi & Vilom', 'Muhavare & Lokoktiyan', 'Apathit Gadyansh', 'Sahitya & Rachnayein'],
    bullets: ['Complete Vyakaran Theory', 'Rule-wise Solved Illustrations', 'Topic-wise Objective Questions', 'Previous Year Solved Papers', 'Important Hindi Idioms & Proverbs', 'Updated with Latest Exam Patterns', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic still-life with an ancient Devanagari manuscript scroll on parchment, a classic terracotta inkpot with peacock feather quill, and stacked Hindi literature books.'
  },
  {
    slug: 'computer-science',
    stateName: 'COMPUTER AWARENESS COMPLETE GUIDE',
    title1: 'COMPUTER AWARENESS',
    title2: '& APPLICATIONS',
    examsLabel: 'For\nBanking, SSC, Railways\nPolice, State IT & Clerk\nGovt. Examinations',
    topics: ['Computer Fundamentals', 'Operating Systems', 'MS Office & Tools', 'Networking & Internet', 'Cyber Security', 'Database & AI Basics'],
    bullets: ['Comprehensive Theory & Diagrams', 'Shortcut Keys & Command Summaries', 'Topic-wise Practice Questions', 'Previous Year Solved Questions', 'Latest Technology & Cyber Trends', 'Updated with Latest Exam Patterns', 'Easy Language & Quick Revision Notes'],
    dioramaScene: 'A photorealistic modern academic composition with an authentic laptop displaying code and circuit diagrams, silicon microprocessor chip, and modern network cables neatly arranged with books.'
  }
];

function buildFlatPrompt(book) {
  const topics = book.topics
    .map((topic, index) => `${index + 1}. ${topic}`)
    .join('\n');

  const bullets = book.bullets
    .map(item => `- ${item}`)
    .join('\n');

  return `
Create a premium, photorealistic, print-quality FRONT COVER
for the VeerNXT competitive examination book series.

IMPORTANT:
The supplied reference image is the authoritative visual
reference. Inspect it and reproduce its design language,
colour relationships, typography hierarchy, proportions,
spacing and overall composition.

Do not invent a new cover design.

The reference image controls the visual template.
This prompt controls the book-specific content.

==================================================
A. REFERENCE IMAGE PRIORITY
==================================================

MATCH THE REFERENCE IMAGE.
MATCH THE REFERENCE IMAGE.
MATCH THE REFERENCE IMAGE.

Use the reference as the actual visual guide, not merely
as inspiration.

Preserve its:
- Front-cover composition.
- Compact top header.
- Blank top-left logo reservation.
- Brand position and proportions.
- Curved top-right examination panel.
- Main title scale and alignment.
- Complete Guide banner.
- Six-column subject grid.
- Checklist and exam-pattern seal.
- Lower scenic composition.
- Overall visual balance and typography hierarchy.

Keep the same layout across every book in the series.

Only the book title, exam information, subject labels,
feature list and state-specific lower scenery may change.

Do not copy the reference's book-specific text when
it differs from the supplied content.

==================================================
B. OUTPUT: FLAT FRONT ARTWORK ONLY
==================================================

Create one flat, straight-on, 2D front-cover design.

Portrait aspect ratio: 2:3.
Target output: ${WIDTH} x ${HEIGHT} pixels.

The artwork must reach all four canvas edges.

NO book mockup.
NO spine.
NO page edges.
NO perspective.
NO rotation.
NO tabletop outside the printed cover.
NO external background.
NO outer border.
NO padding around the cover.
NO drop shadow outside the artwork.

The cover itself fills the complete canvas.

Keep the content close to the left and right edges,
following the reference image's proportions.

Do not shrink the whole design into a narrow column.

==================================================
C. PHOTOGRAPHIC REALISM — HIGHEST PRIORITY
==================================================

The cover must look like a premium commercially published
Indian competitive-examination guide with a professionally
photographed scenic lower illustration.

The architecture, landscape, textiles, books and materials
must appear photographic and physically realistic.

For the lower scenery, use:
- Real architectural photography aesthetics.
- Natural stone, brick, wood and fabric textures.
- Realistic vegetation and terrain.
- Physically plausible sunlight and shadows.
- Natural atmospheric depth.
- Fine photographic detail.
- Realistic foreground and background separation.
- Professional editorial colour grading.
- High-resolution commercial publishing quality.

The scenic artwork should look like a carefully art-directed
photographic composite assembled from authentic photographs.

It must NOT look like:
- A hand-drawn illustration.
- A children's storybook.
- A cartoon.
- Vector artwork.
- Watercolour.
- Oil painting.
- Digital concept art.
- A 3D-rendered game environment.
- A flat illustrated landscape.
- A heavily AI-stylised fantasy scene.

Architecture must have realistic geometry and materials.
Books must have realistic paper, cloth and leather textures.
Fabric must show natural folds and woven detail.

Use realism rather than decorative exaggeration.

==================================================
D. PRECISE COLOUR AND LIGHTING CONTROL
==================================================

Use this restrained, consistent palette:

Background ivory: #F5F0E4
Deep bottle green: #073B29
Dark text green: #102E23
Antique muted gold: #A77B2B
Champagne beige: #E7D3A0
Pale sage: #DCE2C9
Body text: #17241C

BACKGROUND:
Use a clean, natural warm ivory similar to premium uncoated book-cover stock.
Keep the ivory neutral and creamy. Do not turn the entire background yellow.

GREEN:
Use deep, rich bottle green. Never use neon green, teal or saturated emerald.

GOLD:
Use muted antique gold with restrained metallic detail.
Never use bright lemon yellow or orange-gold everywhere.

SAGE:
Use pale, desaturated sage-green circles.

LIGHTING:
Use balanced, neutral natural daylight with gentle warmth.
Keep the whites and ivory areas visibly neutral.

Avoid excessive golden-hour effects, orange haze,
yellow colour grading, oversaturation and artificial glow.

Maintain good contrast between green text and ivory.

==================================================
E. FIXED TOP HEADER AND BLANK LOGO SPACE
==================================================

Brand spelling must be exactly:

VeerNXT®

Tagline:

From Service to a Prosperous Tomorrow

Reserve a compact blank logo area at the extreme
top-left of the cover.

The reserved area should occupy approximately:
15–17% of canvas width.
9–11% of canvas height.

It must be plain background ivory.

CRITICAL LOGO RULES:
- Completely blank.
- No logo.
- No generated emblem.
- No shield.
- No crest.
- No icon.
- No placeholder symbol.
- No visible rectangle.
- No border or outline.
- No text.
- No shadow.
- No decorative ornament.

The reserved area must blend naturally into the background.
It is intended for adding the official logo later.

Place VeerNXT® immediately to the right of the reserved
logo area, following the reference header proportions.
Use bold, clean, dark-green sans-serif lettering.

Place the exact tagline directly underneath in smaller,
readable dark-green text.

Add a thin antique-gold horizontal accent below it.

Keep the complete header compact.

==================================================
F. FIXED TOP-RIGHT EXAM PANEL
==================================================

Create the same curved, deep bottle-green panel at
the upper-right, with a restrained antique-gold edge.

The panel must remain in the same location and use
the same approximate proportions on every cover.

Use cream and restrained muted-gold typography.

Exact copy:

${book.examsLabel}

==================================================
G. LARGE MAIN TITLE
==================================================

Main title:
${book.title1}

Secondary title:
${book.title2}

Use elegant, high-contrast editorial serif typography,
similar to the premium reference cover.

Main title: deep bottle green.
Secondary title: antique muted gold.

The title must be the dominant typographic element.

==================================================
H. COMPLETE GUIDE BANNER
==================================================

Immediately beneath the title, create a wide,
rounded champagne-beige banner.

Exact wording:

COMPLETE GUIDE

Use dark bottle-green uppercase sans-serif lettering.

==================================================
I. EXACTLY SIX SUBJECT COLUMNS
==================================================

Create exactly six equal-width columns in one
horizontal row directly below the banner.

Use these labels in this exact order:

${topics}

Each column contains:
- One simple dark-green line icon.
- One pale-sage circular icon background.
- One centred label beneath the icon.
- Thin muted-gold vertical dividers.

==================================================
J. FEATURES CHECKLIST
==================================================

Display the following wording exactly:

${bullets}

Position the checklist below the subject row,
aligned to the left.

Use antique-gold circular checkmarks and clean,
readable dark-green sans-serif text.

==================================================
K. EXAM-PATTERN SEAL
==================================================

Place one circular antique-gold seal on the right side
of the checklist region.

Exact wording:

BASED ON
LATEST
EXAM
PATTERN
★★★

==================================================
L. PHOTOREALISTIC LOWER SCENE
==================================================

Create this book-specific scenic composition:

${book.dioramaScene}

The lower artwork must span almost the entire cover width.
Its composition should look like professional editorial
photography assembled for a premium printed book.

==================================================
FINAL ART DIRECTION
==================================================

Create a photorealistic, premium Indian competitive-exam
book cover that follows the supplied reference image.

Generate only the flat front-cover artwork.
`;
}

function getReferenceDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };
  const mime = mimeTypes[ext] || 'image/png';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${base64}`;
}

async function generateCover(book, index, total, referenceDataUrl) {
  const dest = path.join(OUT_DIR, `${book.slug}.png`);

  if (fs.existsSync(dest)) {
    console.log(`[${index + 1}/${total}] [SKIPPED] ${book.stateName} already exists at ${dest}`);
    return;
  }

  console.log(`\n[${index + 1}/${total}] Generating ${book.stateName}...`);
  const t0 = Date.now();

  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildFlatPrompt(book),
      aspect_ratio: '2:3',
      input_references: [
        {
          type: 'image_url',
          image_url: {
            url: referenceDataUrl
          }
        }
      ]
    }),
    signal: AbortSignal.timeout(180000)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  const item = json.data?.[0];

  let imageBuffer;
  if (item?.b64_json) {
    imageBuffer = Buffer.from(item.b64_json, 'base64');
  } else if (item?.url) {
    const imageResponse = await fetch(item.url);
    if (!imageResponse.ok) {
      throw new Error(`Image download failed: HTTP ${imageResponse.status}`);
    }
    imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  } else {
    throw new Error(`No image data returned: ${JSON.stringify(json).slice(0, 1000)}`);
  }

  if (imageBuffer.length === 0) {
    throw new Error('The generated image file is empty.');
  }

  fs.writeFileSync(dest, imageBuffer);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✓ Saved: ${dest} (${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB in ${elapsed}s)`);
}

async function run() {
  console.log('======================================================');
  console.log(' VeerNXT | Batch Flat Front Covers Generator');
  console.log('======================================================');
  console.log(`Total books queued: ${allBooks.length}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE_IMAGE_PATH}`);
  console.log(`Output: ${OUT_DIR}`);
  console.log('======================================================\n');

  const referenceDataUrl = getReferenceDataUrl(REFERENCE_IMAGE_PATH);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < allBooks.length; i++) {
    try {
      await generateCover(allBooks[i], i, allBooks.length, referenceDataUrl);
      success++;
    } catch (err) {
      failed++;
      console.error(`✗ Failed ${allBooks[i].stateName}: ${err.message}`);
      if (err.message.includes('402') || err.message.includes('403') || err.message.includes('budget') || err.message.includes('credit')) {
        console.error('\nStopping batch: OpenRouter limit or credits exhausted.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n======================================================');
  console.log(`BATCH COMPLETE: ${success} processed, ${failed} failed.`);
  console.log(`Destination: ${OUT_DIR}`);
  console.log('======================================================\n');
}

run().catch(console.error);
