// Builds docs/book_swap_map_<date>.json (old linked book -> new "2026 NEW" book) from docs/bulk_reparse_runs. Run: node scripts/build_swap_map.cjs
const fs=require('fs');const dir='docs/bulk_reparse_runs';
const man=JSON.parse(fs.readFileSync(dir+'/manifest.json','utf8'));
const created=new Map();
for(const f of fs.readdirSync(dir).filter(f=>/^results_.*\.json$/.test(f)).sort())for(const b of JSON.parse(fs.readFileSync(dir+'/'+f)).books)if(b.created)created.set(b.id,{...b.created,run:f,stats:b.stats,flags:b.flags||[]});
const byKey=new Map(man.entries.map(e=>[e.category+'|'+e.newTitle.replace(man.suffix,''),e]));
const out=man.entries.map(e=>{
  const mine=created.get(e.id);
  let newBook=null;
  if(mine)newBook={title:e.newTitle,resourceId:mine.resourceId,prefix:mine.prefix,chapters:mine.stats?.chapters};
  else if(e.coveredBy){const t=byKey.get(e.coveredBy);const c=t&&created.get(t.id);if(c)newBook={title:t.newTitle,resourceId:c.resourceId,prefix:c.prefix,chapters:c.stats?.chapters,via:'identical text'}}
  else if(e.status==='covered'&&/GK-GS/.test(e.oldTitle)){const t=man.entries.find(x=>x.category==='Precis'&&x.oldTitle==='GS & GK');const c=t&&created.get(t.id);if(c)newBook={title:t.newTitle,resourceId:c.resourceId,prefix:c.prefix,chapters:c.stats?.chapters,via:'replaced by GS & GK Precis'}}
  return {category:e.category,oldTitle:e.oldTitle,oldResourceId:e.oldResourceId,oldStorageBaseUrl:e.oldStorageBaseUrl,examsLinked:e.examsLinked,oldRowCount:e.oldRowCount,oldChapterCount:e.oldChapterCount,source:e.source,status:e.status,newBook,note:e.note||undefined};
});
fs.writeFileSync('docs/book_swap_map_2026-10-07.json',JSON.stringify({generated:new Date().toISOString(),note:'old linked book -> new "2026 NEW" Draft book. Use for the swap: repoint lc_exam_resource_map from the old resource rows sharing oldStorageBaseUrl to newBook.resourceId.',books:out},null,1));
const built=out.filter(o=>o.newBook).length;console.log('mapping rows',out.length,'with a new book',built,'| without',out.filter(o=>!o.newBook).map(o=>o.category+' '+o.oldTitle));
console.log('distinct new books',new Set(out.filter(o=>o.newBook).map(o=>o.newBook.resourceId)).size,'| created runs',[...new Set([...created.values()].map(c=>c.run))].length);
