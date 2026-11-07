const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html','utf8');
let pass=0,fail=0;const t=(n,c)=>{c?pass++:(fail++,console.log('FAIL '+n))};
const mk=(url,pre)=>new Promise(res=>{
  const d=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,
    beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));if(pre)pre(w);}});
  setTimeout(()=>res(d),1700);
});
(async()=>{
  // ---------- A. multi-term AND search ----------
  let d=await mk('https://career-compass-bgw.pages.dev/job-boards');let doc=d.window.document,w=d.window;
  const type=async(s)=>{const i=doc.getElementById('q');i.value=s;i.dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,300));};
  await type('tech');const single=doc.querySelectorAll('#boards-list .card').length;
  await type('tech remote');const multi=doc.querySelectorAll('#boards-list .card').length;
  t('single-term search returns hits',single>0);
  t('multi-term search narrows results',multi>0&&multi<single);
  await type('zzzz notaword');t('impossible multi-term returns nothing',doc.querySelectorAll('#boards-list .card').length===0);
  // category-name search: pick a category word and confirm results come from that category
  await type('remote');t('search matches category or content',doc.querySelectorAll('#boards-list .card').length>0);
  // ---------- B. aria-live count ----------
  const c=doc.getElementById('count');
  t('count is a live region',c.getAttribute('role')==='status'&&c.getAttribute('aria-live')==='polite');
  // ---------- C. per-resource share link ----------
  await type('');
  const infoBtn=doc.querySelector('#boards-list .card .info');
  infoBtn.click();await new Promise(r=>setTimeout(r,200));
  const modal=doc.getElementById('ccModal');
  t('detail modal opens',!!modal&&modal.textContent.length>40);
  const share=doc.getElementById('ccmShare');
  t('detail modal has copy-link button',!!share);
  share.click();await new Promise(r=>setTimeout(r,150));
  t('copy-link confirms in button',/Copied|Ctrl\+C/.test(share.textContent));
  // deep link opens that resource
  const u=infoBtn.dataset.u;
  const d2=await mk('https://career-compass-bgw.pages.dev/job-boards#r='+encodeURIComponent(u));
  const m2=d2.window.document.getElementById('ccModal');
  t('#r= deep link opens the resource card',!!m2&&m2.textContent.length>40);
  // ---------- D. keyboard shortcut help ----------
  const d3=await mk('https://career-compass-bgw.pages.dev/job-boards');
  const doc3=d3.window.document,w3=d3.window;
  t('footer shortcuts button exists',!!doc3.getElementById('kbdBtn'));
  doc3.getElementById('kbdBtn').click();await new Promise(r=>setTimeout(r,200));
  const m3=doc3.getElementById('ccModal');
  t('shortcut modal lists shortcuts',!!m3&&/Keyboard shortcuts/.test(m3.textContent)&&m3.querySelectorAll('.sc-row').length>=5);
  doc3.querySelector('.ccm-close').click();await new Promise(r=>setTimeout(r,150));
  doc3.body.focus();
  doc3.dispatchEvent(new w3.KeyboardEvent('keydown',{key:'?',bubbles:true}));
  await new Promise(r=>setTimeout(r,200));
  t('"?" key opens the shortcut modal',/Keyboard shortcuts/.test(doc3.getElementById('ccModal').textContent));
  // typing "?" in the search box must NOT open it
  doc3.querySelector('.ccm-close').click();await new Promise(r=>setTimeout(r,150));
  const inp=doc3.getElementById('q');inp.focus();
  inp.dispatchEvent(new w3.KeyboardEvent('keydown',{key:'?',bubbles:true}));
  await new Promise(r=>setTimeout(r,150));
  const mc=doc3.getElementById('ccModal');
  t('"?" inside search box is ignored',!mc||!/Keyboard shortcuts/.test(mc.textContent));
  console.log('IMPROVE2: PASS '+pass+' FAIL '+fail);
})();
