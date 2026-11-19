// plan-test.js — verifies the True North personalization engine:
// 1) every challenge option produces a plan step
// 2) every goCat() link in the generated plan points at a REAL section + category
const {JSDOM} = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html', 'utf8');

let pass = 0, fail = 0;
const t = (n, c, extra) => { c ? pass++ : (fail++, console.log('FAIL ' + n + (extra ? ' — ' + extra : ''))); };

const d = new JSDOM(html, {
  url: 'https://career-compass-bgw.pages.dev/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(w) { w.fetch = () => Promise.reject(new Error('offline')); }
});

setTimeout(async () => {
  const doc = d.window.document, w = d.window;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const val = (id) => doc.getElementById(id).value;
  const secondOption = (id) => doc.querySelector('#' + id + ' option:nth-child(2)').value;

  // collect the real category names per section from the page's own data
  // read the section -> category map straight from the source (SECTIONS is not on window)
  const realCats = {};
  const constBody = (name) => {
    const i = html.indexOf('const ' + name + '=');
    if (i < 0) return null;
    let j = i + ('const ' + name + '=').length;
    while (html[j] !== '[' && html[j] !== '{') j++;
    const open = html[j], close = open === '[' ? ']' : '}';
    let depth = 0, inStr = false, esc = false;
    for (let k = j; k < html.length; k++) {
      const ch = html[k];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (inStr) { if (ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; continue; }
      if (ch === open) depth++;
      else if (ch === close) { depth--; if (depth === 0) return html.slice(j, k + 1); }
    }
    return null;
  };
  const secMap = constBody('SECTIONS') || '';
  for (const m of secMap.matchAll(/(\w+)\s*:\s*(\w+)/g)) {
    const body = constBody(m[2]);
    if (!body) continue;
    realCats[m[1]] = new Set([...body.matchAll(/"c"\s*:\s*"([^"]+)"/g)].map(x => x[1]));
  }
  // INC-derived slices (disability / lgbtq) share the INC category names
  if (realCats.inc) { realCats.disability = realCats.inc; realCats.lgbtq = realCats.inc; }

  const challenges = [...doc.querySelectorAll('#pf-challenge option')].map(o => o.value).filter(Boolean);
  t('challenge options present', challenges.length >= 8, 'n=' + challenges.length);

  const noPlan = [];
  for (const ch of challenges) {
    doc.getElementById('pf-name').value = 'Test';
    doc.getElementById('pf-role').value = 'Data analyst';
    doc.getElementById('pf-industry').value = secondOption('pf-industry');
    doc.getElementById('pf-stage').value = secondOption('pf-stage');
    doc.getElementById('pf-state').value = 'New Jersey';
    doc.getElementById('pf-challenge').value = ch;
    doc.getElementById('pf-save').click();
    await wait(90);
    const txt = (doc.getElementById('pf-plan').textContent || '').trim();
    if (txt.length < 40) noPlan.push(ch);
  }
  t('every challenge option produces a plan step', noPlan.length === 0, 'missing: ' + noPlan.join(' | '));

  // dead-link scan over every plan generated above (last plan rendered) + a full sweep
  let links = 0, dead = [];
  for (const ch of challenges) {
    doc.getElementById('pf-challenge').value = ch;
    doc.getElementById('pf-save').click();
    await wait(60);
    const html2 = doc.getElementById('pf-plan').innerHTML;
    const decode = (v) => v.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    for (const m of html2.matchAll(/goCat\('([^']+)','([^']+)'\)/g)) {
      links++;
      const [tab, cat] = [m[1], decode(m[2])];
      if (!realCats[tab]) { dead.push(tab + ' (no such section)'); continue; }
      if (!realCats[tab].has(cat)) dead.push(tab + ' / ' + cat);
    }
  }
  t('plan contains links', links > 10, 'n=' + links);
  t('no plan link points at a missing section/category', dead.length === 0, [...new Set(dead)].slice(0, 6).join(' | '));

  // the plan must stay readable and include the key sections for a crisis case
  doc.getElementById('pf-challenge').value = 'Income stopped — need survival help';
  doc.getElementById('pf-save').click();
  await wait(80);
  const crisis = doc.getElementById('pf-plan').textContent || '';
  t('survival case mentions benefits help', /benefits/i.test(crisis));
  t('survival case mentions health coverage', /health coverage/i.test(crisis));

  console.log('PLAN: PASS ' + pass + ' FAIL ' + fail);
}, 1600);
