import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select, filterFn) {
  let all = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(page * pageSize, (page + 1) * pageSize - 1);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) {
      console.error('Error fetching ' + table + ':', error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

async function main() {
  console.log('Loading resources and mappings...');
  const [resources, mappings, exams] = await Promise.all([
    fetchAll('resources', 'resource_id,title,category,storage_base_url,chapter_count,status,format,level,state_ut'),
    fetchAll('lc_exam_resource_map', 'exam_id,resource_id,category'),
    fetchAll('lc_exams', 'id,name,category,level,state_ut')
  ]);

  console.log(`Total exams in lc_exams: ${exams.length}`);
  console.log(`Total rows in resources: ${resources.length}`);
  console.log(`Total rows in lc_exam_resource_map: ${mappings.length}`);

  // Map of resource_id -> Set of exam_ids
  const examsByResId = new Map();
  for (const m of mappings) {
    if (!examsByResId.has(m.resource_id)) examsByResId.set(m.resource_id, new Set());
    examsByResId.get(m.resource_id).add(m.exam_id);
  }

  // Filter to format === 'blocks'
  const blockResources = resources.filter(r => r.format === 'blocks');

  function analyzeCategory(cat) {
    const catRows = blockResources.filter(r => r.category === cat);
    const groups = new Map();
    for (const r of catRows) {
      if (!r.title) continue;
      const key = r.title.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, { title: r.title.trim(), rows: [] });
      groups.get(key).rows.push(r);
    }

    const books = [];
    for (const [key, g] of groups.entries()) {
      const liveRow = g.rows.find(r => !['draft', 'archived'].includes((r.status || '').toLowerCase()));
      const canonical = liveRow || g.rows[0];
      const isArchived = ['draft', 'archived'].includes((canonical.status || '').toLowerCase());

      const linkedExams = new Set();
      for (const r of g.rows) {
        for (const eid of (examsByResId.get(r.resource_id) || [])) {
          linkedExams.add(eid);
        }
      }

      books.push({
        title: g.title,
        status: isArchived ? 'Draft' : 'Published',
        linkedExamsCount: linkedExams.size,
        duplicateRowCount: g.rows.length,
        chapters: canonical.chapter_count,
        storageBaseUrl: canonical.storage_base_url
      });
    }
    return books;
  }

  const guideBooks = analyzeCategory('Guide');
  const precisBooks = analyzeCategory('Precis');

  console.log('\n==============================');
  console.log('SUMMARY OF UNIQUE BOOKS');
  console.log('==============================');
  console.log(`Guide:  ${guideBooks.length} unique titles (${guideBooks.filter(b => b.status === 'Published').length} Published, ${guideBooks.filter(b => b.status === 'Draft').length} Draft)`);
  console.log(`        -> ${guideBooks.filter(b => b.linkedExamsCount > 0).length} linked to at least 1 exam`);
  console.log(`Precis: ${precisBooks.length} unique titles (${precisBooks.filter(b => b.status === 'Published').length} Published, ${precisBooks.filter(b => b.status === 'Draft').length} Draft)`);
  console.log(`        -> ${precisBooks.filter(b => b.linkedExamsCount > 0).length} linked to at least 1 exam`);

  // Active / Linked Guides
  console.log('\n--- ACTIVE / LINKED GUIDE BOOKS ---');
  const activeGuides = guideBooks.filter(b => b.linkedExamsCount > 0).sort((a,b) => b.linkedExamsCount - a.linkedExamsCount);
  for (const b of activeGuides) {
    console.log(`  * ${b.title.padEnd(38)} | ${String(b.linkedExamsCount).padStart(4)} exams | ${String(b.chapters || 0).padStart(2)} ch | (${b.status})`);
  }

  // Active / Linked Precis
  console.log('\n--- ACTIVE / LINKED PRECIS BOOKS ---');
  const activePrecis = precisBooks.filter(b => b.linkedExamsCount > 0).sort((a,b) => b.linkedExamsCount - a.linkedExamsCount);
  for (const b of activePrecis) {
    console.log(`  * ${b.title.padEnd(38)} | ${String(b.linkedExamsCount).padStart(4)} exams | ${String(b.chapters || 0).padStart(2)} ch | (${b.status})`);
  }

  // Check unique distinct content storage folders for linked books
  const linkedGuideStorage = new Set(activeGuides.map(b => b.storageBaseUrl).filter(Boolean));
  const linkedPrecisStorage = new Set(activePrecis.map(b => b.storageBaseUrl).filter(Boolean));
  console.log(`\nDistinct content storage folders for active Guides: ${linkedGuideStorage.size}`);
  console.log(`Distinct content storage folders for active Precis: ${linkedPrecisStorage.size}`);
  console.log(`Total distinct active book content sets: ${linkedGuideStorage.size + linkedPrecisStorage.size}`);
}

main().catch(console.error);
