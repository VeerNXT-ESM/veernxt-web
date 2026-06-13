import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  'sb_publishable_PlJvy3mq1l2Y2vsWnzTeIw_9rgOamQB'
);

async function main() {
  const { data, error } = await supabase
    .from('resources')
    .select('title, body_html')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log(data.title);
    if (data.body_html.startsWith('[')) {
      const chapters = JSON.parse(data.body_html);
      console.log(chapters[0].content.substring(0, 500));
    } else {
      console.log(data.body_html.substring(0, 500));
    }
  }
}
main();
