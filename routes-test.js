const {JSDOM, VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
const ROUTES=[['/','True North'],['/job-boards','Job Boards'],['/by-industry','By Industry'],['/exec-search-staffing','Exec Search'],['/ai-tools','AI Tools'],['/leadership-programs','Leadership'],['/volunteer-internships','Volunteer'],['/additional-resources','Additional'],['/networking-groups','Networking'],['/speaker-groups','Speaker'],['/free-career-support','Free Career Support'],['/disability-neurodivergent','Disability'],['/lgbtq-careers','LGBTQ'],['/suggest-a-resource','Suggest'],['/about','About']];
const DIR=['/job-boards','/by-industry','/exec-search-staffing','/ai-tools','/leadership-programs','/volunteer-internships','/additional-resources','/networking-groups','/speaker-groups','/free-career-support','/disability-neurodivergent','/lgbtq-careers'];
let pass=0,fail=0;const t=(n,c,extra)=>{c?pass++:(fail++,console.log('FAIL '+n+(extra?' — '+extra:'')))};
const load=(path)=>new Promise(res=>{
  const errs=[];
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errs.push(e.message)});
  const d=new JSDOM(html,{url:'https://career-compass-bgw.pages.dev'+path,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));w.addEventListener('error',e=>errs.push('window.onerror: '+e.message));}});
  setTimeout(()=>res({d,errs}),1500);
});
(async()=>{
  for(const [path,label] of ROUTES){
    const {d,errs}=await load(path);
    const doc=d.window.document;
    t('route '+path+' loads without runtime errors',errs.length===0,errs[0]);
    t('route '+path+' sets a title',(doc.title||'').length>5,doc.title);
    if(DIR.includes(path)){
      const active=doc.querySelector('section.active');
      const cards=active?active.querySelectorAll('.card').length:0;
      t('route '+path+' renders cards',cards>0,'cards='+cards);
      const count=doc.getElementById('count');
      t('route '+path+' shows a result count',!!count&&count.textContent.trim().length>0);
    }
    d.window.close();
  }
  // shared shell must exist on every route
  const {d}=await load('/job-boards');const doc=d.window.document;
  for(const id of ['q','costSel','sideNav','heroStat','cmdk-wrap','count']){
    t('shell element #'+id+' present',!!doc.getElementById(id));
  }
  const dupIds=(()=>{const s=new Set(),dups=[];doc.querySelectorAll('[id]').forEach(e=>{if(s.has(e.id))dups.push(e.id);s.add(e.id)});return dups})();
  t('no duplicate element ids',dupIds.length===0,dupIds.join(','));
  console.log('ROUTES: PASS '+pass+' FAIL '+fail);
})();
