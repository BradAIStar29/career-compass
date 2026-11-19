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
  // A. tracker button + empty state
  const tb=doc.getElementById('trackBtn');
  t('tracker button exists',!!tb);
  tb.click();await new Promise(r=>setTimeout(r,200));
  let m=doc.getElementById('ccModal');
  t('empty tracker explains how to use it',!!m&&/Save resources with the ♡ button/.test(m.textContent));
  doc.querySelector('.ccm-close').click();await new Promise(r=>setTimeout(r,150));
  // B. save two resources -> tracker rows
  [...doc.querySelectorAll('#boards-list .card .fav')].slice(0,2).forEach(b=>b.click());
  await new Promise(r=>setTimeout(r,150));
  tb.click();await new Promise(r=>setTimeout(r,200));
  m=doc.getElementById('ccModal');
  const rows=m.querySelectorAll('.trk-row');
  t('tracker lists saved resources',rows.length===2);
  t('each row has a stage selector',m.querySelectorAll('.trk-status').length===2);
  t('stage defaults to Not started',m.querySelector('.trk-status').value==='Not started');
  // C. set stage + note -> persisted
  const sel=m.querySelector('.trk-status');sel.value='Applied';
  sel.dispatchEvent(new w.Event('change',{bubbles:true}));
  const note=m.querySelector('.trk-note');note.value='Recruiter call Tuesday';
  note.dispatchEvent(new w.Event('input',{bubbles:true}));
  const date=m.querySelector('.trk-date');date.value='2026-11-19';
  date.dispatchEvent(new w.Event('change',{bubbles:true}));
  const stored=JSON.parse(w.localStorage.getItem('ccTrack')||'{}');
  const key=Object.keys(stored)[0];
  t('stage persisted',stored[key].status==='Applied');
  t('note persisted',stored[key].note==='Recruiter call Tuesday');
  t('date persisted',stored[key].date==='2026-11-19');
  // D. reload restores tracker state
  const d2=await mk('https://career-compass-bgw.pages.dev/job-boards',ww=>{
    ww.localStorage.setItem('ccTrack',JSON.stringify(stored));
    ww.localStorage.setItem('ccFavs',w.localStorage.getItem('ccFavs'));
  });
  const doc2=d2.window.document;
  doc2.getElementById('trackBtn').click();await new Promise(r=>setTimeout(r,250));
  const m2=doc2.getElementById('ccModal');
  t('tracker state restored after reload',!!m2&&[...m2.querySelectorAll('.trk-status')].some(s=>s.value==='Applied'));
  t('notes restored after reload',!!m2&&[...m2.querySelectorAll('.trk-note')].some(n=>n.value==='Recruiter call Tuesday'));
  // E. CSV includes tracker columns
  let clicked=null;const orig=doc.createElement.bind(doc);
  doc.createElement=(tag)=>{const el=orig(tag);if(tag==='a'){el.click=function(){clicked={name:this.download};};}return el;};
  doc.getElementById('csvBtn').click();await new Promise(r=>setTimeout(r,200));
  t('csv export still works with tracker',!!clicked&&/\.csv$/.test(clicked.name));
  console.log('TRACKER: PASS '+pass+' FAIL '+fail);
})();
