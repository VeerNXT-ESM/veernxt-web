#!/usr/bin/env node
/**
 * scripts/seed_category_profiles.mjs
 *
 * Seeds comprehensive category profiles into the Supabase table `lc_category_profiles`
 * for Central (21 categories), State (102 categories), and UT (64 categories).
 *
 * Includes:
 *  - Full names, taglines, badges, about text, exam mode, post level, eligibility, major exams
 *  - Top exams and related exams dynamically linked to real catalog exams from lc_exams where available
 *  - AI banner images for 3+ categories in each division (central, state, ut), leaving others blank as instructed
 */

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { CENTRAL_EXAM_CATEGORIES } from '../src/lib/centralExamCategories.js';
import { STATE_EXAM_CATEGORIES } from '../src/lib/stateExamCategories.js';
import { UT_EXAM_CATEGORIES } from '../src/lib/utExamCategories.js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('SUPABASE_DB_URL is not set in .env');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

// Images map for the 3 from Central, State, and UT
const BANNER_MAP = {
  // Central
  'SSC': '/category_banners/ssc.jpg',
  'Civil Services': '/category_banners/civil_services.jpg',
  'Banking': '/category_banners/banking.jpg',
  'Railways': '/category_banners/railways.jpg',
  'Defence': '/category_banners/defence.jpg',
  'Police': '/category_banners/police.jpg',
  'Teaching & Education': '/category_banners/teaching.jpg',
  'Judiciary & Legal Services': '/category_banners/judiciary.jpg',
  'Engineering Recruitment': '/category_banners/engineering.jpg',

  // State
  'State Civil Services': '/category_banners/state_psc.jpg',
  'Administrative Services': '/category_banners/state_psc.jpg',
  'Police Services': '/category_banners/state_police.jpg',
  'Police Recruitment': '/category_banners/state_police.jpg',
  'Education Services': '/category_banners/state_education.jpg',
  'Teacher Recruitment': '/category_banners/state_education.jpg',

  // UT
  'Administration': '/category_banners/ut_admin.jpg',
  'Administrative': '/category_banners/ut_admin.jpg',
  'Police (UT)': '/category_banners/state_police.jpg',
  'Teaching': '/category_banners/teaching.jpg',
};

const DEFAULT_WHY_CHOOSE = [
  {
    title: 'Expert-Curated Study Material',
    desc: 'Updated as per latest syllabus and official recruitment guidelines',
  },
  {
    title: 'Préci for Quick Revision',
    desc: 'Topic-wise short and high-yield notes for rapid retention',
  },
  {
    title: 'Practice & Evaluation',
    desc: 'Section-wise, topic-wise and full-length simulated mock tests',
  },
  {
    title: 'Mentorship & Support',
    desc: 'Strategic guidance and preparation roadmaps from top mentors',
  },
];

function generateCategoryProfile(catName, division, catalogExams) {
  const normName = catName.replace(/\s*\(UT\)$/, '').trim();
  const heroImage = BANNER_MAP[catName] || null;

  // Find real matching exams in catalog
  const matchingExams = catalogExams.filter(
    (e) => (e.category || '').trim() === catName || (e.category || '').toLowerCase() === catName.toLowerCase()
  );

  let fullName = catName;
  let tagline = `Your Gateway to a Stable and Rewarding Government Career in ${normName}`;
  let badges = [
    'Multiple Job Opportunities',
    division === 'central' ? 'All India Recruitment' : division === 'state' ? 'State Government Careers' : 'UT Administration Posts',
    'Graduate & 10+2 Level',
    'Stable Career & Growth',
  ];
  let aboutText = `Recruitment and qualifying examinations for ${normName}. Comprehensive syllabus, structured guidebooks, previous year question papers (PYQs), and timed mock tests designed to accelerate your competitive examination preparation with Veer Next.`;
  let examMode = 'Online (CBT) & Written';
  let postLevel = division === 'central' ? 'Group B & C' : 'Cadre / Gazetted & Non-Gazetted';
  let eligibility = '10+2 / Diploma / Graduate';

  // Custom rich tailoring for prominent categories
  if (catName === 'SSC') {
    fullName = 'Staff Selection Commission';
    tagline = 'Your Gateway to a Stable and Rewarding Government Career';
    badges = [
      'Multiple Job Opportunities',
      'All India Recruitment',
      'Graduate & 10+2 Level Exams',
      'Stable Career & Growth',
    ];
    aboutText =
      'The Staff Selection Commission (SSC) conducts recruitment exams for various Group B and Group C posts in different Ministries, Departments and Organizations of the Government of India. SSC exams provide excellent career opportunities for 10+2 and graduate-level candidates across the country.';
    examMode = 'Online (CBT)';
    postLevel = 'Group B & C';
    eligibility = '10+2 / Graduate';
  } else if (catName === 'Civil Services') {
    fullName = 'Union Public Service Commission (UPSC)';
    tagline = 'The Premier Gateway to India’s Elite Administrative & Allied Services';
    badges = ['Top Administrative Posts', 'All India Civil Services', 'IAS, IPS, IFS & Allied', 'Nation Building Leadership'];
    aboutText =
      'The Civil Services Examination (CSE) is conducted by the Union Public Service Commission (UPSC) to recruit officers for the prestigious Indian Administrative Service (IAS), Indian Police Service (IPS), Indian Foreign Service (IFS), and Central Group A & B services.';
    examMode = 'Prelims (MCQ) & Mains (Descriptive)';
    postLevel = 'Group A & B Gazetted';
    eligibility = 'Bachelor’s Degree (Graduate)';
  } else if (catName === 'Banking') {
    fullName = 'Banking & Financial Sector Recruitment';
    tagline = 'Build a High-Growth Career in Public Sector Banks & Financial Institutions';
    badges = ['Public Sector Banks', 'IBPS, SBI & RBI Cadres', 'Probationary Officers & Clerks', 'Lucrative Pay & Perks'];
    aboutText =
      'Banking examinations recruit candidates for Probationary Officers (PO), Clerks, and Specialist Officers (SO) across State Bank of India, Reserve Bank of India, and 11 nationalized public sector banks regulated through IBPS.';
    examMode = 'Online (CBT - Prelims & Mains)';
    postLevel = 'Officer (Scale I) & Clerical';
    eligibility = 'Graduate (Any Discipline)';
  } else if (catName === 'Railways') {
    fullName = 'Railway Recruitment Control Board (RRB)';
    tagline = 'Join the Lifeline of the Nation with Indian Railways Recruitment';
    badges = ['Largest Public Employer', 'NTPC, Group D, ALP & JE', 'Technical & Non-Technical', 'Pan-India Postings'];
    aboutText =
      'Indian Railways conducts large-scale recruitment via RRB and RRC for Non-Technical Popular Categories (NTPC), Assistant Loco Pilots (ALP), Junior Engineers (JE), and Technical staff across 21 railway zones.';
    examMode = 'Computer Based Test (CBT)';
    postLevel = 'Group C & D';
    eligibility = '10th / 12th / ITI / Diploma / Degree';
  } else if (catName === 'Defence') {
    fullName = 'Armed Forces & Ministry of Defence Recruitment';
    tagline = 'Serve the Nation with Pride, Honour and Gallantry';
    badges = ['Army, Navy & Air Force', 'Officer & Enlisted Entries', 'Permanent & Short Service', 'Gallantry & Leadership'];
    aboutText =
      'Defence recruitment encompasses entry schemes for the Indian Army, Indian Navy, Indian Air Force, and Ministry of Defence establishments via CDS, NDA, AFCAT, CAPF, and direct recruitment pathways.';
    examMode = 'Written Exam + SSB Interview';
    postLevel = 'Commissioned Officer & Personnel Below Officer Rank';
    eligibility = '10+2 / Graduate (Physics & Math for Tech)';
  } else if (catName === 'Police' || catName === 'Police Services' || catName === 'Police (UT)') {
    fullName = division === 'ut' ? 'UT Police & Security Services' : 'State & Central Police Services';
    tagline = 'Safeguard Society and Enforce the Law with Integrity and Valour';
    badges = ['Law Enforcement & Security', 'Sub-Inspector & Constable', 'Physical & Written Rallies', 'Pensions & Uniform Prestige'];
    aboutText =
      'Police recruitment examinations select Sub-Inspectors, Constables, and specialized executive officers responsible for public safety, law enforcement, investigation, and crime prevention.';
    examMode = 'CBT / Written + Physical Efficiency Test (PET)';
    postLevel = 'Executive Cadre / Sub-Inspector & Constable';
    eligibility = '10+2 / Graduate';
  } else if (catName === 'Teaching & Education' || catName === 'Education Services' || catName === 'Teaching') {
    fullName = 'Education Department & Teacher Recruitment Board';
    tagline = 'Shape Young Minds and Guide the Future Generation of the Nation';
    badges = ['National & State Schools', 'PRT, TGT, PGT & Lecturer', 'TET & CTET Qualification', 'Academic Excellence'];
    aboutText =
      'Teaching examinations recruit Primary Teachers (PRT), Trained Graduate Teachers (TGT), Post Graduate Teachers (PGT), and Lecturers for government schools, Kendriya Vidyalayas, Navodaya Vidyalayas, and state departments.';
    examMode = 'Written (MCQ) & Eligibility Test';
    postLevel = 'Primary / Secondary / Senior Secondary Teacher';
    eligibility = 'B.Ed / D.El.Ed / Master’s Degree';
  } else if (catName === 'Judiciary & Legal Services' || catName === 'Judicial Services') {
    fullName = 'Judiciary & High Court Recruitment';
    tagline = 'Uphold the Rule of Law and Justice Across the Republic';
    badges = ['Judicial Magistrate & Civil Judge', 'High Court Staff & Legal Officers', 'Prestigious Constitutional Cadre', 'High Autonomy'];
    aboutText =
      'State Judicial Service Examinations recruit Civil Judges (Junior Division) and Judicial Magistrates. High Courts and District Courts also recruit Law Clerks, Research Associates, and administrative cadres.';
    examMode = 'Preliminary, Mains Written & Viva-Voce';
    postLevel = 'Judicial Officer / Civil Judge (Jr Div)';
    eligibility = 'LL.B. / Bachelor of Laws';
  } else if (catName === 'Engineering Recruitment' || catName === 'Engineering Services') {
    fullName = 'Central & State Engineering Services';
    tagline = 'Engineer the Nation’s Infrastructure and Technological Prowess';
    badges = ['CPWD, MES, CWC & Railways', 'Assistant Executive Engineer', 'Junior Engineer (JE)', 'Core Technical Specialization'];
    aboutText =
      'Engineering recruitment examinations select graduate engineers and diploma holders for Junior Engineer (JE) and Assistant Engineer (AE) roles in premier departments including CPWD, MES, Border Roads, and Central Water Commission.';
    examMode = 'Online CBT (Technical + Non-Tech)';
    postLevel = 'Group B & C Technical';
    eligibility = 'B.Tech / B.E. / Diploma in Engineering';
  } else if (catName === 'Insurance') {
    fullName = 'Public Sector Insurance Corporations (LIC, GIC, NIACL)';
    tagline = 'Secure Financial Fortunes and Advance in India’s Booming Insurance Sector';
    badges = ['Life & General Insurance', 'AAO, ADO & Assistant', 'High Compensation & Bonuses', 'Rapid Corporate Promotions'];
    aboutText =
      'Insurance recruitment drives select candidates for Assistant Administrative Officers (AAO), Apprentice Development Officers (ADO), and Assistants in Life Insurance Corporation of India (LIC) and public general insurance companies.';
    examMode = 'Online (Prelims + Mains)';
    postLevel = 'Officer (AAO) & Assistant Cadre';
    eligibility = 'Graduate Degree (Any Stream)';
  } else if (catName === 'State Civil Services' || catName === 'Administrative Services') {
    fullName = 'State Public Service Commission (State PCS)';
    tagline = 'Lead District Administration and Governance in Your Home State';
    badges = ['Deputy Collector & DSP', 'Tehsildar & Block Dev Officer', 'Top State Administrative Cadre', 'Prestigious State Impact'];
    aboutText =
      'State Public Service Commissions (State PSC) recruit top administrative officials including Sub-Divisional Magistrates (SDM), Deputy Superintendents of Police (DSP), and Commercial Tax Officers across state secretariats.';
    examMode = 'Preliminary, Mains & Interview';
    postLevel = 'State Group A & B Gazetted';
    eligibility = 'Graduate (Any Discipline)';
  } else if (catName === 'Administration' || catName === 'Administrative') {
    fullName = 'Union Territory Central Administrative Services';
    tagline = 'Direct Governance and Public Administration in Union Territories';
    badges = ['UT Secretariats', 'DANICS & Allied Services', 'Executive Officers & Assistants', 'Central Pay Matrix'];
    aboutText =
      'Administrative recruitment in Union Territories provides key executive, supervisory, and managerial manpower to UT secretariats, revenue departments, and municipal corporations under Ministry of Home Affairs oversight.';
    examMode = 'Written Examination & Interview';
    postLevel = 'Executive Officer / Group B & C';
    eligibility = 'Graduate / 10+2';
  }

  // Build Top Exams list from matching exams or defaults
  let topExams = [];
  if (matchingExams.length > 0) {
    topExams = matchingExams.slice(0, 6).map((e) => ({
      title: e.name,
      subtitle: `${normName} Recruitment Exam`,
      examId: e.id,
    }));
  } else {
    topExams = [
      { title: `${normName} Officer Grade Examination`, subtitle: 'Graduate Level Recruitment' },
      { title: `${normName} Junior Associate Examination`, subtitle: '10+2 / Intermediate Level' },
      { title: `${normName} Executive Services Selection`, subtitle: 'Specialized Direct Entry' },
      { title: `${normName} Assistant Recruitment`, subtitle: 'General Administrative Post' },
    ];
  }

  // Related Exams
  let relatedExams = topExams.slice(0, 5).map((e) => ({
    title: e.title,
    badge: e.title.toLowerCase().includes('constable') || e.title.toLowerCase().includes('clerk') || e.title.toLowerCase().includes('mts')
      ? '10th / 12th Pass'
      : 'Graduate Level',
    examId: e.examId,
  }));

  const majorExams = topExams.map((e) => e.title.split(' ')[0] || e.title).slice(0, 5).join(', ');

  return {
    category_name: catName,
    division,
    full_name: fullName,
    tagline,
    hero_image_url: heroImage,
    badges: JSON.stringify(badges),
    about_text: aboutText,
    exam_mode: examMode,
    post_level: postLevel,
    eligibility,
    major_exams: majorExams,
    top_exams: JSON.stringify(topExams),
    related_exams: JSON.stringify(relatedExams),
    why_choose: JSON.stringify(DEFAULT_WHY_CHOOSE),
  };
}

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL for category seeding');

  // Fetch all existing lc_exams to link real exams
  const examsRes = await client.query('SELECT id, name, category, region_id FROM public.lc_exams;');
  const catalogExams = examsRes.rows;
  console.log(`Fetched ${catalogExams.length} catalog exams to cross-link`);

  const allProfiles = [];

  // Central categories (21)
  for (const cat of CENTRAL_EXAM_CATEGORIES) {
    allProfiles.push(generateCategoryProfile(cat, 'central', catalogExams));
  }

  // State categories (102)
  for (const cat of STATE_EXAM_CATEGORIES) {
    allProfiles.push(generateCategoryProfile(cat, 'state', catalogExams));
  }

  // UT categories (64)
  for (const cat of UT_EXAM_CATEGORIES) {
    allProfiles.push(generateCategoryProfile(cat, 'ut', catalogExams));
  }

  console.log(`Seeding ${allProfiles.length} total category profiles across Central, State, UT...`);

  let insertedCount = 0;
  for (const p of allProfiles) {
    const upsertSql = `
      INSERT INTO public.lc_category_profiles (
        category_name, division, full_name, tagline, hero_image_url,
        badges, about_text, exam_mode, post_level, eligibility,
        major_exams, top_exams, related_exams, why_choose, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, now()
      )
      ON CONFLICT (category_name, division) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        tagline = EXCLUDED.tagline,
        hero_image_url = EXCLUDED.hero_image_url,
        badges = EXCLUDED.badges,
        about_text = EXCLUDED.about_text,
        exam_mode = EXCLUDED.exam_mode,
        post_level = EXCLUDED.post_level,
        eligibility = EXCLUDED.eligibility,
        major_exams = EXCLUDED.major_exams,
        top_exams = EXCLUDED.top_exams,
        related_exams = EXCLUDED.related_exams,
        why_choose = EXCLUDED.why_choose,
        updated_at = now();
    `;
    await client.query(upsertSql, [
      p.category_name,
      p.division,
      p.full_name,
      p.tagline,
      p.hero_image_url,
      p.badges,
      p.about_text,
      p.exam_mode,
      p.post_level,
      p.eligibility,
      p.major_exams,
      p.top_exams,
      p.related_exams,
      p.why_choose,
    ]);
    insertedCount++;
  }

  console.log(`Successfully seeded/upserted ${insertedCount} category profiles into Supabase!`);
  await client.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
