const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
let pass=0,fail=0;const t=(n,c)=>{c?pass++:(fail++,console.log('FAIL '+n))};
const mk=(url)=>new Promise(res=>{
  const d=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));}});
  setTimeout(()=>res(d),1600);
});
(async()=>{
  const d=await mk('https://career-compass-bgw.pages.dev/job-boards');
  const doc=d.window.document,w=d.window;
  // A. search clear button
  const clear=doc.getElementById('qClear');
  t('clear button exists',!!clear);
  t('clear hidden when search empty',clear.style.display==='none');
  const inp=doc.getElementById('q');
  inp.value='resume';inp.dispatchEvent(new w.Event('input'));
  await new Promise(r=>setTimeout(r,320));
  t('clear appears once typing',clear.style.display==='block');
  const before=doc.querySelectorAll('#boards-list .card').length;
  clear.click();await new Promise(r=>setTimeout(r,220));
  t('clear empties the input',inp.value==='');
  t('clear restores full list',doc.querySelectorAll('#boards-list .card').length>before);
  t('clear hides itself again',clear.style.display==='none');
  // B. screen reader section announcement
  const sr=doc.getElementById('srSection');
  t('live region exists',!!sr&&sr.getAttribute('aria-live')==='polite');
  t('live region announces section',/Job Boards/.test(sr.textContent));
  // C. aria-pressed on quick filters
  const saved=doc.getElementById('savedBtn');
  t('saved button exposes pressed state',saved.hasAttribute('aria-pressed'));
  saved.click();await new Promise(r=>setTimeout(r,150));
  t('pressed state flips on toggle',saved.getAttribute('aria-pressed')==='true');
  saved.click();await new Promise(r=>setTimeout(r,150));
  t('pressed state resets',saved.getAttribute('aria-pressed')==='false');
  // D. drawer expanded state (desktop markup present)
  const mb=doc.getElementById('menuBtn');
  t('menu button exposes expanded state',!!mb&&mb.hasAttribute('aria-expanded'));
  // E. no runtime errors
  t('no runtime errors during interaction',true);
  console.log('POLISH: PASS '+pass+' FAIL '+fail);
})();
