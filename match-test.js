// match-test.js — the private resume-to-posting checker must open, score, and stay client-side
const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
let pass=0,fail=0;
const t=(n,c,x)=>{c?pass++:(fail++,console.log('FAIL '+n+(x?' — '+x:'')))};
let fetched=[];
const d=new JSDOM(html,{url:'https://career-compass-bgw.pages.dev/job-boards',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){w.fetch=(u)=>{fetched.push(String(u));return Promise.reject(new Error('offline'));};}});
setTimeout(async()=>{
  const doc=d.window.document,w=d.window;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const btn=doc.getElementById('matchBtn');
  t('toolbar button exists',!!btn);
  t('button has accessible name',!!(btn&&(btn.getAttribute('aria-label')||btn.textContent.trim())));
  btn.click(); await wait(120);
  t('modal opens',!!doc.getElementById('mcModal')||!!doc.getElementById('ccModal'));
  const post=doc.getElementById('mc-post'),res=doc.getElementById('mc-res');
  t('posting textarea present',!!post);
  t('resume textarea present',!!res);
  post.value='We need a registered nurse with EPIC experience, triage skills, patient education, and BLS certification. Triage experience required. EPIC preferred.';
  res.value='Registered nurse with eight years in emergency care. Patient education lead. BLS certified.';
  fetched=[];
  doc.getElementById('mc-run').click(); await wait(120);
  const out=(doc.getElementById('mc-out').textContent||'');
  t('produces a percentage score',/\d+%/.test(out), out.slice(0,60));
  t('lists a missing keyword',/triage/i.test(out), out.slice(0,90));
  t('lists a covered keyword',/epic|nurse|bls/i.test(out));
  t('sends nothing over the network',fetched.length===0,'fetched: '+fetched.join(','));
  // empty input path
  post.value='';res.value='';
  doc.getElementById('mc-run').click(); await wait(80);
  t('empty input asks for both fields',/paste both/i.test(doc.getElementById('mc-out').textContent||''));
  console.log('MATCH: PASS '+pass+' FAIL '+fail);
},1500);
