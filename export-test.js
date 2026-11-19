const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
let pass=0,fail=0;const t=(n,c)=>{c?pass++:(fail++,console.log('FAIL '+n))};
const mk=(url,pre)=>new Promise(res=>{
  const d=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,
    beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));w.URL.createObjectURL=()=>'blob:mock';w.URL.revokeObjectURL=()=>{};if(pre)pre(w);}});
  setTimeout(()=>res(d),1700);
});
(async()=>{
  const d=await mk('https://career-compass-bgw.pages.dev/job-boards');const doc=d.window.document,w=d.window;
  const btn=doc.getElementById('csvBtn');
  t('export CSV button exists',!!btn);
  btn.click();await new Promise(r=>setTimeout(r,120));
  t('empty export warns instead of failing',/Save a few resources first/.test(doc.body.textContent));
  const favs=[...doc.querySelectorAll('#boards-list .card .fav')].slice(0,2);
  favs.forEach(b=>b.click());
  await new Promise(r=>setTimeout(r,150));
  let clicked=null;
  const origCreate=doc.createElement.bind(doc);
  doc.createElement=(tag)=>{const el=origCreate(tag);if(tag==='a'){el.click=function(){clicked={name:this.download,href:this.href};};}return el;};
  btn.click();await new Promise(r=>setTimeout(r,200));
  t('export produces a csv download',!!clicked&&/\.csv$/.test(clicked.name));
  t('filename is dated',/\d{4}-\d{2}-\d{2}/.test(clicked?clicked.name:''));
  const cmp=[...doc.querySelectorAll('#boards-list .card .cmp')].slice(0,2);
  const u1=cmp[0].dataset.u;
  cmp.forEach(b=>b.click());
  await new Promise(r=>setTimeout(r,120));
  const stored=JSON.parse(w.localStorage.getItem('ccCmp')||'[]');
  t('compare set saved to localStorage',stored.length===2&&stored.includes(u1));
  const storedJson=w.localStorage.getItem('ccCmp');
  const d2=await mk('https://career-compass-bgw.pages.dev/job-boards',ww=>ww.localStorage.setItem('ccCmp',storedJson));
  const on=d2.window.document.querySelectorAll('#boards-list .card .cmp.on').length;
  t('compare selection restored on reload',on===2);
  t('compare button shows restored count',/Compare \(2\)/.test(d2.window.document.getElementById('cmpBtn').textContent));
  console.log('EXPORT: PASS '+pass+' FAIL '+fail);
})();
