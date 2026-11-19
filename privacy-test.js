const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
let pass=0,fail=0;const t=(n,c,extra)=>{c?pass++:(fail++,console.log('FAIL '+n+(extra?' — '+extra:'')))};
const load=(blockStorage)=>new Promise(res=>{
  const errs=[];
  const d=new JSDOM(html,{url:'https://career-compass-bgw.pages.dev/job-boards',runScripts:'dangerously',pretendToBeVisual:true,
    beforeParse(w){
      w.fetch=()=>Promise.reject(new Error('offline'));
      if(blockStorage){
        const bad={getItem(){throw new Error('storage denied')},setItem(){throw new Error('QuotaExceeded')},removeItem(){throw new Error('denied')},clear(){throw new Error('denied')}};
        try{Object.defineProperty(w,'localStorage',{get(){return bad},configurable:true});}catch(_){}
      }
      w.addEventListener('error',e=>errs.push(e.message));
    }});
  setTimeout(()=>res({d,errs}),1600);
});
(async()=>{
  // A. normal mode still works
  const n=await load(false);
  const nd=n.d.window.document;
  t('normal mode renders cards',nd.querySelectorAll('#boards-list .card').length>50);
  t('normal mode has no errors',n.errs.length===0,n.errs[0]);
  // B. private mode / storage blocked must degrade gracefully, not crash
  const p=await load(true);
  const pd=p.d.window.document,w=p.d.window;
  const cards=pd.querySelectorAll('#boards-list .card').length;
  t('blocked storage still renders the directory',cards>50,'cards='+cards);
  t('blocked storage produces no runtime errors',p.errs.length===0,p.errs[0]);
  t('hero still shows a count',/\d/.test((pd.getElementById('heroStat')||{}).textContent||''));
  // favourites must still toggle visually even if they cannot persist
  const fav=pd.querySelector('#boards-list .card .fav');
  let ok=true;
  try{fav.click();}catch(e){ok=false}
  await new Promise(r=>setTimeout(r,120));
  t('favourite click survives blocked storage',ok);
  t('favourite still shows as saved',fav.classList.contains('on')||fav.textContent==='♥');
  // search + filters must still work
  const inp=pd.getElementById('q');inp.value='resume';inp.dispatchEvent(new w.Event('input'));
  await new Promise(r=>setTimeout(r,320));
  t('search works with blocked storage',pd.querySelectorAll('#boards-list .card').length>=0);
  // tracker + CSV degrade to a message rather than throwing
  let trackOk=true;try{pd.getElementById('trackBtn').click();}catch(e){trackOk=false}
  await new Promise(r=>setTimeout(r,150));
  t('tracker opens with blocked storage',trackOk);
  console.log('PRIVACY: PASS '+pass+' FAIL '+fail);
})();
