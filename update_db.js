import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  'sb_publishable_PlJvy3mq1l2Y2vsWnzTeIw_9rgOamQB'
);

async function main() {
  const id = '9cf56bba-c1d0-42c4-87d6-1ce951275563';
  const newHtml = `<p class="ql-align-center"><strong>INTRODUCTION (TEST BOLD)</strong></p><p class="ql-align-center">SSC JHT</p><p>2026</p>`;
  
  const { data, error } = await supabase
    .from('resources')
    .update({ body_html: newHtml })
    .eq('id', id);

  if (error) {
    console.error(error);
  } else {
    console.log("Successfully updated database row!");
  }
}
main();
