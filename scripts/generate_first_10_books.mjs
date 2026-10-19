import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY in .env');
  process.exit(1);
}

const OUT_DIR = path.resolve('raw_book_covers');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Master prompt builder following the confirmed test_rajasthan_accurate layout
function buildBookPrompt({ stateName, examsLabel, topics, bullets, dioramaScene, spineTitle }) {
  return `A premium photorealistic 3D hardcover textbook mockup of "${stateName} COMPLETE GUIDE" for the VeerNXT competitive examination book series, exactly matching the 682x1024 portrait 2:3 format. The book stands upright, facing front with a slim left spine visible.

Exact Text and Elements to render with 100% correct spelling:
1. Top-left: The official VeerNXT logo featuring a glossy green shield with a golden upward arrow merging into a 'V', encircled by a golden laurel wreath with a curved gold ribbon on top reading "सेवा से समृद्ध कल की ओर" and a gold ribbon on bottom reading "FROM SERVICE TO A PROSPEROUS TOMORROW". Next to the shield is the bold brand name "VeerNXT®" (capitalized exactly as VeerNXT) and tagline "From Service to a Prosperous Tomorrow".
2. Top-right corner: Dark forest green curved badge with gold border reading:
"${examsLabel}"
3. Main Title centered: Large dark-green bold serif text "${stateName.split(' ')[0]}", directly above large gold serif text "${stateName.split(' ').slice(1).join(' ') || 'GS'}".
4. Subtitle ribbon: Beige rounded rectangle banner reading "COMPLETE GUIDE".
5. Subject Icons: A horizontal row of 6 circular dark-green icons on pale sage circles with labels below:
${topics.map(t => `"${t}"`).join(', ')}.
6. Left Checklist: 7 gold circular checkmarks with clean dark-green text:
${bullets.map(b => `- ${b}`).join('\n')}
7. Right Seal: Circular scalloped gold foil seal reading "BASED ON LATEST EXAM PATTERN ★★★".
8. Lower Scene: Photorealistic diorama showing ${dioramaScene}, alongside a neat stack of 5 antique leather reference books titled "HISTORY", "GEOGRAPHY", "ECONOMY", "POLITY", "CULTURE".
9. Left Spine: Solid dark green spine with gold crests at top and bottom, vertical white serif text "${spineTitle || stateName + ' — COMPLETE GUIDE'}", and "VeerNXT®" at the bottom.

Render sharp, clear typography with zero spelling mistakes, pure white/warm ivory studio background, photorealistic 8k commercial mockup.`;
}

// The first 10 books to generate
const first10Books = [
  {
    slug: 'rajasthan-gs',
    stateName: 'RAJASTHAN GS',
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
    dioramaScene: 'the honeycomb facade of Hawa Mahal Jaipur, Thar desert golden sand dunes with Mehrangarh fort wall, and colorful traditional Rajasthani bandhani pagri turban draped over the books',
    spineTitle: 'RAJASTHAN GS — COMPLETE GUIDE'
  },
  {
    slug: 'madhya-pradesh-gs',
    stateName: 'MADHYA PRADESH GS',
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
    dioramaScene: 'the ancient stone Great Stupa of Sanchi with carved Torana gateway, Khajuraho temple sandstone spires, dense Sal forest with Royal Bengal tiger silhouette, and colorful Chanderi silk fabric draped over the books',
    spineTitle: 'MADHYA PRADESH GS — COMPLETE GUIDE'
  },
  {
    slug: 'gujarat-gs',
    stateName: 'GUJARAT GS',
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
    dioramaScene: 'the intricate carved sandstone pavilion of Rani ki Vav stepwell, Sun Temple Modhera wheel, white salt desert of Rann of Kutch under golden sunrise, and colorful embroidered mirror-work Rogan cloth draped over the books',
    spineTitle: 'GUJARAT GS — COMPLETE GUIDE'
  },
  {
    slug: 'maharashtra-gs',
    stateName: 'MAHARASHTRA GS',
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
    dioramaScene: 'the stone Gateway of India and Raigad hill fort, equestrian statue of Chhatrapati Shivaji Maharaj, Ajanta cave fresco lotus motif, and rich gold-bordered Paithani silk fabric draped over the books',
    spineTitle: 'MAHARASHTRA GS — COMPLETE GUIDE'
  },
  {
    slug: 'haryana-gs',
    stateName: 'HARYANA GS',
    examsLabel: 'For\nHPSC, HSSC, Police\nand Other\nHaryana State Exams',
    topics: ['Vedic History', 'Geography & Yamuna', 'Agriculture & Green Rev', 'Sports & Champions', 'Polity & Governance', 'Current Affairs (Haryana Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Haryana Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year HSSC Questions',
      'Haryana Specific Current Affairs',
      'Updated with Latest Haryana Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'the bronze chariot sculpture of Lord Krishna and Arjuna at Kurukshetra, Brahma Sarovar ghats, golden blooming mustard (sarson) fields, and traditional Haryanvi turban and hookah motif',
    spineTitle: 'HARYANA GS — COMPLETE GUIDE'
  },
  {
    slug: 'himachal-pradesh-gs',
    stateName: 'HIMACHAL PRADESH GS',
    examsLabel: 'For\nHPPSC, HP Police\nand Other\nHimachal State Exams',
    topics: ['Hill State History', 'Himalayan Geography', 'Culture & Fairs', 'Hydro & Tourism', 'Polity & Administration', 'Current Affairs (HP Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'HP Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year HPPSC Questions',
      'Himachal Current Affairs',
      'Updated with Latest HP Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'the wooden pagoda spire of Hidimba Temple surrounded by tall deodar cedar trees, snow-covered Dhauladhar Himalayan peaks glowing in golden sunlight, and woven Kullu woolen cap draped over the books',
    spineTitle: 'HIMACHAL PRADESH GS — COMPLETE GUIDE'
  },
  {
    slug: 'odisha-gs',
    stateName: 'ODISHA GS',
    examsLabel: 'For\nOPSC, OSSSC, Police\nand Other\nOdisha State Exams',
    topics: ['Kalinga History', 'Coastline & Chilika', 'Konark & Jagannath Culture', 'Minerals & Ports', 'Polity & Governance', 'Current Affairs (Odisha Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Odisha Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year OPSC Questions',
      'Odisha Specific Current Affairs',
      'Updated with Latest Odisha Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'the colossal stone chariot wheel of Konark Sun Temple, tranquil azure waters of Chilika Lake, silver filigree peacock craft, and traditional Pattachitra folk painting scroll draped over the books',
    spineTitle: 'ODISHA GS — COMPLETE GUIDE'
  },
  {
    slug: 'punjab-gs',
    stateName: 'PUNJAB GS',
    examsLabel: 'For\nPPSC, Punjab Police\nand Other\nPunjab State Exams',
    topics: ['Sikh Gurus & History', 'Five Rivers Geography', 'Agriculture & Crops', 'Culture & Folklore', 'Polity & Administration', 'Current Affairs (Punjab Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Punjab Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year PPSC Questions',
      'Punjab Specific Current Affairs',
      'Updated with Latest Punjab Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'the gleaming Golden Temple (Sri Harmandir Sahib) reflecting in the sacred Amrit Sarovar water, golden ripe wheat fields at sunset, and colorful Phulkari embroidered dupatta draped over the books',
    spineTitle: 'PUNJAB GS — COMPLETE GUIDE'
  },
  {
    slug: 'west-bengal-gs',
    stateName: 'WEST BENGAL GS',
    examsLabel: 'For\nWBPSC, WB Police, WBCS\nand Other\nWest Bengal State Exams',
    topics: ['Bengal Renaissance', 'Geography & Sundarbans', 'Literature & Art', 'Economy & Tea', 'Polity & Administration', 'Current Affairs (WB Specific)'],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'West Bengal Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year WBCS Questions',
      'West Bengal Current Affairs',
      'Updated with Latest WB Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene: 'the white marble dome of Victoria Memorial, steel cantilever Howrah Bridge over the Hooghly river, Sundarbans mangrove with tiger silhouette, terracotta Bishnupur temple tiles, and Dokra tribal craft',
    spineTitle: 'WEST BENGAL GS — COMPLETE GUIDE'
  },
  {
    slug: 'gs-gk-complete-guide',
    stateName: 'GS & GK COMPLETE GUIDE',
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
    dioramaScene: 'the circular stone colonnade of the Parliament of India, the Constitution of India book with golden national emblem, rotating brass terrestrial globe, and Indian national flag on a polished wooden desk',
    spineTitle: 'GS & GK — COMPLETE GUIDE'
  }
];

async function checkBalance() {
  const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
    headers: { 'Authorization': 'Bearer ' + OPENROUTER_API_KEY }
  });
  const json = await res.json();
  return json.data?.effective_budget?.remaining_usd ?? json.data?.limit_remaining;
}

async function run() {
  console.log('Checking starting OpenRouter balance...');
  const startBal = await checkBalance();
  console.log(`Starting Balance Remaining: $${Number(startBal).toFixed(4)} USD`);

  console.log(`\nStarting Generation of First ${first10Books.length} Books using openai/gpt-5-image-mini...\n`);

  let completed = 0;
  for (let i = 0; i < first10Books.length; i++) {
    const book = first10Books[i];
    const dest = path.join(OUT_DIR, `${book.slug}.png`);

    if (fs.existsSync(dest)) {
      console.log(`[${i + 1}/${first10Books.length}] [SKIPPED] ${book.stateName} already exists.`);
      completed++;
      continue;
    }

    console.log(`[${i + 1}/${first10Books.length}] [GENERATING] ${book.stateName}...`);
    const prompt = buildBookPrompt(book);
    const t0 = Date.now();

    try {
      const res = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-image-mini',
          prompt: prompt,
          aspect_ratio: '2:3'
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}: ${err}`);
      }

      const json = await res.json();
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('No b64_json received: ' + JSON.stringify(json));

      fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[${i + 1}/${first10Books.length}] [SUCCESS] ${book.stateName} saved (${sec}s)`);
      completed++;

      // Small 1.5s pause between calls to be gentle on rate limit
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`[${i + 1}/${first10Books.length}] [FAILED] ${book.stateName}:`, e.message);
    }
  }

  console.log('\nChecking final OpenRouter balance...');
  const endBal = await checkBalance();
  const spent = startBal - endBal;
  console.log(`\n======================================================`);
  console.log(` BATCH GENERATION REPORT`);
  console.log(` Total Completed: ${completed}/${first10Books.length}`);
  console.log(` Starting Balance: $${Number(startBal).toFixed(4)} USD`);
  console.log(` Ending Balance:   $${Number(endBal).toFixed(4)} USD`);
  console.log(` Actual Total Cost: $${Number(spent).toFixed(4)} USD (~₹${(spent * 86).toFixed(2)} INR)`);
  console.log(` Avg Cost Per Book: $${Number(spent / completed).toFixed(4)} USD (~₹${((spent / completed) * 86).toFixed(2)} INR)`);
  console.log(` Output Folder:    ${OUT_DIR}`);
  console.log(`======================================================\n`);
}

run().catch(console.error);
