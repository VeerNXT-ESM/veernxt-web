import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  let allMasterDocs = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('resources_v2')
      .select('source_file, chapter_count')
      .ilike('storage_base_url', '%master_documents%')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(error);
      break;
    }

    if (data.length === 0) {
      hasMore = false;
    } else {
      allMasterDocs = allMasterDocs.concat(data);
      if (data.length < pageSize) hasMore = false;
      else page++;
    }
  }

  const uniqueDocs = {};
  allMasterDocs.forEach(doc => {
    uniqueDocs[doc.source_file] = doc.chapter_count || 0;
  });

  let totalChapters = 0;
  let totalBooks = 0;
  for (const file in uniqueDocs) {
    totalChapters += uniqueDocs[file];
    totalBooks++;
  }

  console.log(`Total unique books: ${totalBooks}`);
  console.log(`Total chapters: ${totalChapters}`);
}

run();
