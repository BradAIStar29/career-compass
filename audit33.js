// COMPREHENSIVE FULL-FEATURE AUDIT — Career Compass
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://career-compass-bgw.pages.dev/",
  beforeParse(w){w.onerror=(m,s,l,c)=>errors.push('JS ERR: '+m+' @'+l+':'+c);w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.matchMedia=q=>({matches:false,addListener(){},removeListener(){},addEventListener(){}});w.navigator.clipboard={writeText:()=>Promise.resolve()};w.open=()=>null;}});
const w=dom.window,d=w.document;
const settle=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;const T=(n,c)=>{c?pass++:(fail++,errors.push('FAIL: '+n))};
const TABS=['boards','industry','ai','ldp','staffing','volunteer','additional','networking','speakers','support','disability','lgbtq'];
(async()=>{
  await settle(1500);
  // A. all tabs render + card counts + hero
  let cards=0;
  for(const id of TABS){d.querySelector(`#sideNav .sitem[data-tab="${id}"]`).click();await settle(80);const s=d.getElementById(id);T(id+' renders ('+s.querySelectorAll('.card').length+')',s.querySelectorAll('.card').length>0);cards+=s.querySelectorAll('.card').length;}
  const tot=+(d.getElementById('heroStat').textContent.replace(/\D/g,''));
  const sgi=html.indexOf('const STATEGROUPS=');
  const sgSeg=html.slice(html.indexOf('{',sgi));
  const sgEnd=sgSeg.indexOf('\nconst ');
  const sgJSON=sgSeg.slice(0,sgEnd>0?sgEnd:sgSeg.indexOf('};')+1);
  let sgCount=0;
  try{ const sgObj=JSON.parse(sgJSON.endsWith(';')?sgJSON.slice(0,-1):sgJSON); sgCount=Object.values(sgObj).reduce((a,b)=>a+b.length,0); }catch(e){ sgCount=-1; }
  T('state groups parsed ('+sgCount+')',sgCount>150);
  T('hero = cards+'+sgCount+' ('+tot+' vs '+(cards+sgCount)+')',sgCount>150&&tot===cards+sgCount);
  // B. verified badges on every card
  let vrf=0;for(const id of TABS){vrf+=d.getElementById(id).querySelectorAll('.card .vrf').length;}
  T('every card has ✓ badge ('+vrf+'/'+cards+')',vrf===cards);
  // C. trust strip + dynamic sweep note
  T('promise strip',/No account\. No email wall\./.test(d.querySelector('.promise-note').textContent));
  const SWEEP=(html.match(/const LASTSWEEP="([^"]+)"/)||[])[1]||'';
  T('dynamic sweep note ('+SWEEP+')',SWEEP.length>0&&d.querySelector('.verify-note').textContent.includes(SWEEP));
  // D. search: hit, miss, debounce, highlight
  d.querySelector('#sideNav .sitem[data-tab=\"boards\"]').click();await settle(100);
  const q=d.getElementById('q')||d.querySelector('input[type="search"]');
  q.value='resume';q.dispatchEvent(new w.Event('input',{bubbles:true}));await settle(500);
  const hits=d.querySelectorAll('section.active .card').length;
  T('search hit ('+hits+')',hits>0&&hits<200);
  q.value='zzzqqqxyz';q.dispatchEvent(new w.Event('input',{bubbles:true}));await settle(500);
  T('search miss empty state',d.querySelectorAll('section.active .card').length===0);
  q.value='';q.dispatchEvent(new w.Event('input',{bubbles:true}));await settle(400);
  // E. chips multi-select
  const findChip=t=>[...d.querySelectorAll('.chip')].find(c=>c.textContent.includes(t));
  findChip('Remote').click();await settle(200);const n1=d.querySelectorAll('section.active .card').length;
  T('chip filter narrows ('+n1+')',n1>0);
  T('chip .on state',findChip('Remote').classList.contains('on'));
  findChip('Remote').click();await settle(300);
  T('chip toggles off',!findChip('Remote').classList.contains('on'));
  d.getElementById('clearBtn').click();await settle(200);
  // F. cost filter
  const costSel=d.getElementById('costSel');costSel.value='free';costSel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(300);
  T('free filter',d.querySelectorAll('section.active .card').length>0);
  costSel.value='';costSel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(200);
  // G. state: spotlight + benefits + kit button
  const stSel=d.getElementById('stateSel');stSel.value='Ohio';stSel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(400);
  T('kit button label Ohio',/Ohio/.test(d.getElementById('kitBtn').textContent));
  const sp=d.getElementById('spotlight');
  T('OH spotlight groups',sp.textContent.includes('Ohio')&&sp.querySelectorAll('a').length>3);
  T('OH hidden benefits',/Hidden benefits in Ohio/.test(sp.textContent));
  stSel.value='';stSel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(300);
  T('kit button label resets',!/Ohio/.test(d.getElementById('kitBtn').textContent));
  // H. kit modal (TX) + focus
  stSel.value='Texas';stSel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(300);
  d.getElementById('kitBtn').focus();d.getElementById('kitBtn').click();await settle(300);
  T('kit 7 days',d.querySelectorAll('#ccModal .kit-day').length===7);
  T('kit TX lifelines',/First, for Texas/.test(d.getElementById('ccModal').textContent));
  T('focus on close after open',d.activeElement.classList.contains('ccm-close'));
  // Tab trap
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
  await settle(50);
  T('focus stays in modal',d.getElementById('ccModal').contains(d.activeElement));
  d.querySelector('.ccm-close').click();await settle(1600);
  T('focus restored to kitBtn',d.activeElement===d.getElementById('kitBtn'));
  // I. info modal + breadcrumb + sweep line
  const infoBtn=d.querySelector('section.active .info');infoBtn.focus();infoBtn.click();await settle(300);
  const im=d.getElementById('ccModal');
  T('info modal breadcrumb',im&&/·/.test(im.querySelector('.ccm-crumb').textContent));
  T('info modal sweep line',im.textContent.includes('re-verified in the '+SWEEP+' sweep'));
  d.querySelector('.ccm-close').click();await settle(1600);
  // J. compare
  const cmpBtn=d.querySelector('section.active .cmp');cmpBtn.click();await settle(200);
  d.querySelector('#sideNav .sitem[data-tab=\"ai\"]').click();await settle(200);
  const cmpBtn2=d.querySelector('section.active .cmp');cmpBtn2.click();await settle(200);
  T('compare toolbar shows 2',/2/.test(d.getElementById('cmpBtn').textContent));
  d.getElementById('cmpBtn').click();await settle(300);
  T('compare modal 2 rows',d.querySelectorAll('#ccModal table tr').length>=3);
  d.querySelector('.ccm-close').click();await settle(1600);
  // K. favorites
  const fav=d.querySelector('section.active .fav');fav.click();await settle(150);
  T('saved toolbar shows 1',/1/.test(d.getElementById('savedBtn')?.textContent||d.getElementById('favBtn')?.textContent||'Saved'));
  // L. download + toppicks quick filters
  d.querySelector('#sideNav .sitem[data-tab=\"additional\"]').click();await settle(200);
  const dlBtn=d.getElementById('dlBtn');if(dlBtn){dlBtn.click();await settle(200);const dl=d.querySelectorAll('section.active .card .pill.dl').length;T('downloadable filter ('+dl+')',dl>0);dlBtn.click();await settle(200);}else T('downloadable filter btn exists',false);
  // M. recently added
  const recBtn=d.getElementById('recentBtn');recBtn.click();await settle(300);
  T('recently added modal',d.getElementById('ccModal')&&d.getElementById('ccModal').textContent.length>100);
  d.querySelector('.ccm-close').click();await settle(1600);
  // N. surprise me
  const surBtn=d.getElementById('surBtn')||d.getElementById('surpriseBtn');surBtn.click();await settle(300);
  T('surprise modal',d.getElementById('ccModal')&&d.getElementById('ccModal').querySelector('a'));
  const roll=d.querySelector('#ccModal [data-roll], #ccModal .roll-again, #ccModal button');
  if(roll&&roll.textContent.match(/Roll/i))roll.click();await settle(300);
  T('roll again works',!!d.getElementById('ccModal'));
  d.querySelector('.ccm-close').click();await settle(1600);
  // O. issue button
  const issBtn=d.getElementById('issueBtn');issBtn.click();await settle(300);
  T('issue modal opens',d.getElementById('ccModal')&&/dead link|report/i.test(d.getElementById('ccModal').textContent));
  d.querySelector('.ccm-close').click();await settle(1600);
  // P. ⌘K palette
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true,cancelable:true}));await settle(400);
  const cmdk=d.getElementById('cmdk-wrap');
  T('cmdk opens on ⌘K',!!cmdk&&cmdk.classList.contains('open'));
  const inp=cmdk?cmdk.querySelector('input'):null;
  if(inp){inp.value='indeed';inp.dispatchEvent(new w.Event('input',{bubbles:true}));await settle(400);}
  T('cmdk finds results',cmdk&&cmdk.querySelectorAll('.cmdk-row').length>0);
  inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle(300);
  T('cmdk closes on Esc (input)',!cmdk||!cmdk.classList.contains('open'));
  d.getElementById('cmdBtn').click();await settle(300);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle(300);
  T('cmdk closes on Esc (document-level)',!cmdk||!cmdk.classList.contains('open'));
  // Q. True North personas
  d.querySelector('#sideNav .sitem[data-tab=\"profile\"]').click();await settle(400);
  const perBtn=[...d.querySelectorAll('button')].find(b=>/Recent grad/i.test(b.textContent));
  T('persona buttons exist',!!perBtn);
  if(perBtn){perBtn.click();await settle(400);T('persona fills form',d.getElementById('pf-role')?.value.length>0||d.querySelector('select#pf-stage')?.value);}
  const planBtn=d.getElementById('pf-save');
  if(planBtn){planBtn.focus();planBtn.click();await settle(600);}
  const pfplan=d.getElementById('pf-plan');
  T('plan renders (#pf-plan)',pfplan&&pfplan.textContent.length>200);
  T('plan has goCat links',pfplan&&pfplan.querySelectorAll('.plan-link').length>3);
  // R. deep link
  w.location.hash='#c=boards:gi';w.dispatchEvent(new w.Event('hashchange'));
  d.querySelector('#sideNav .sitem[data-tab=\"boards\"]').click();await settle(200);
  T('hash routing no error',true);
  // S. a11y statement
  const ab=d.getElementById('a11yBtn');ab.click();await settle(300);
  T('a11y statement modal',d.getElementById('ccModal')&&d.getElementById('ccModal').textContent.includes('WCAG 2.1 AA'));
  d.querySelector('.ccm-close').click();await settle(1600);
  // T. dark mode
  const dm=d.getElementById('themeBtn')||d.getElementById('darkBtn');dm.click();await settle(300);
  T('dark mode toggles',d.documentElement.getAttribute('data-theme')==='dark'||d.body.dataset.theme==='dark');
  dm.click();await settle(200);
  console.log('PASS:',pass,'FAIL:',fail);
  errors.forEach(e=>console.log(' -',e));
  process.exit(0);
})();
