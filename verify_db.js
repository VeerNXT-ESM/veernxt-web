import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  'sb_publishable_PlJvy3mq1l2Y2vsWnzTeIw_9rgOamQB'
);

async function main() {
  const id = '9cf56bba-c1d0-42c4-87d6-1ce951275563';
  const { data, error } = await supabase
    .from('resources')
    .select('body_html')
    .eq('id', id)
    .single();

  if (error) {
    console.error(error);
  } else {
    // Print the FULL raw HTML to see exactly what's stored
    console.log("=== RAW body_html (first 1000 chars) ===");
    console.log(data.body_html.substring(0, 1000));
    console.log("=== Contains <strong>? ===", data.body_html.includes('<strong>'));
    console.log("=== Contains ql-align? ===", data.body_html.includes('ql-align'));
    console.log("=== Starts with [? ===", data.body_html.trim().startsWith('['));
  }
}
main();
