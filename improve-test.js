const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
let pass=0,fail=0;const t=(n,c)=>{c?pass++:(fail++,console.log('FAIL '+n))};
const mk=(url,pre)=>()=>new Promise(res=>{
  const d=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,
    beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));w.open=()=>({document:{write(){},close(){}},focus(){},print(){}});w.print=()=>{};if(pre)pre(w);}});
  setTimeout(()=>res(d),1700);
});
(async()=>{
  // ---- A. shareable filtered views ----
  let d=await mk('https://career-compass-bgw.pages.dev/job-boards')();
  let doc=d.window.document,w=d.window;
  t('copy view button exists',!!doc.getElementById('viewBtn'));
  // apply a search + chip, then check the URL gains a #v= hash
  const inp=doc.getElementById('q');
  inp.value='resume';inp.dispatchEvent(new w.Event('input'));
  await new Promise(r=>setTimeout(r,300));
  t('search filters the section',doc.getElementById('count').textContent.includes('resource'));
  t('url now carries #v=',/^#v=/.test(w.location.hash));
  const decoded=JSON.parse(decodeURIComponent(w.location.hash.replace('#v=','')));
  t('hash stores the query',decoded.q==='resume');
  t('hash stores the tab',decoded.t==='boards');
  // ---- B. restore a shared view in a fresh page load ----
  const sharedHash='#v='+encodeURIComponent(JSON.stringify({t:'ai',q:'interview',fn:['Interview Prep']}));
  const d2=await mk('https://career-compass-bgw.pages.dev/ai-tools'+sharedHash)();
  const doc2=d2.window.document;
  t('shared link restores search box',doc2.getElementById('q').value==='interview');
  t('shared link restores chip state',[...doc2.querySelectorAll('.chip.on')].some(c=>c.dataset.fn==='Interview Prep'));
  t('shared link renders results',/\d+ resource/.test(doc2.getElementById('count').textContent));
  // ---- C. empty state recovery ----
  const d3=await mk('https://career-compass-bgw.pages.dev/job-boards')();
  const doc3=d3.window.document,w3=d3.window;
  const i3=doc3.getElementById('q');
  i3.value='zzzqqqxyz';i3.dispatchEvent(new w3.Event('input'));
  await new Promise(r=>setTimeout(r,320));
  t('zero results shows empty panel',!!doc3.querySelector('.empty.show'));
  t('offers search-all-sections',!!doc3.getElementById('emptyAll'));
  t('offers fallback suggestions',doc3.querySelectorAll('[data-tryq]').length>0);
  const tryBtn=doc3.querySelector('[data-tryq]');
  tryBtn.click();
  await new Promise(r=>setTimeout(r,120));
  t('suggestion click runs a new search',doc3.getElementById('q').value===tryBtn.dataset.tryq);
  // ---- D. sort persistence ----
  const d4=await mk('https://career-compass-bgw.pages.dev/job-boards',w=>w.localStorage.setItem('ccSort','az'))();
  t('saved sort is restored',d4.window.document.getElementById('sortSel').value==='az');
  const sel=d4.window.document.getElementById('sortSel');
  sel.value='new';sel.dispatchEvent(new d4.window.Event('change'));
  t('sort choice is persisted',d4.window.localStorage.getItem('ccSort')==='new');
  console.log('IMPROVE: PASS '+pass+' FAIL '+fail);
})();
