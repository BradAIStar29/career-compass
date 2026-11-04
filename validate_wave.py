#!/usr/bin/env python3
"""Validation gate for research wave files. Integration may ONLY use *.clean.json.

Usage: python3 career-hub/validate_wave.py wave39_ai.json [more.json ...]

Checks: schema, fn-tag validity, live status (200/202/403/406/429; 000 retried),
exact-URL dupes, normalized-name dupes, domain dupes against existing_names.tsv.
"""
import json, os, re, subprocess, sys, concurrent.futures

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, 'index.html')
NAMES = os.path.join(HERE, 'existing_names.tsv')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0'
LIVE = {'200','202','403','406','429'}
FNTAGS = {'Resume & ATS','Cover Letters','Job Matching','Interview Prep','Networking',
          'Career Coaching','Skills & Learning','Salary Research','Portfolio','General',
          'Students & Grads','Public Sector','Executive','Veterans','Disability','Remote'}

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

def dom(u):
    return (u or '').split('//')[-1].replace('www.', '').rstrip('/').split('?')[0].lower()

def curl(u):
    for attempt in range(2):
        try:
            r = subprocess.run(['curl','-s','-o','/dev/null','-w','%{http_code}','-L',
                                '--max-time','15','-A',UA,u], capture_output=True, text=True, timeout=25)
            code = r.stdout.strip()
            if code != '000' or attempt == 1:
                return code
        except Exception:
            if attempt == 1: return 'ERR'
    return 'ERR'

def load_existing():
    urls, names, doms = set(), set(), set()
    text = open(INDEX, encoding='utf-8').read()
    for m in re.finditer(r'"u":"([^"]+)"', text):
        urls.add(m.group(1).rstrip('/').lower())
    if os.path.exists(NAMES):
        for line in open(NAMES, encoding='utf-8'):
            parts = line.rstrip('\n').split('\t')
            if len(parts) >= 3:
                names.add(norm(parts[1])); doms.add(parts[2].lower())
    return urls, names, doms

def main(paths):
    eurls, enames, edoms = load_existing()
    print(f"existing: {len(eurls)} urls | {len(enames)} names | {len(edoms)} domains\n")
    grand_ok = grand_rej = 0
    for path in paths:
        try:
            data = json.load(open(path, encoding='utf-8'))['items']
        except Exception as e:
            print(f"{path}: UNREADABLE ({e})"); continue
        cand, rejects = [], []
        for it in data:
            n, u, d = (it.get('n') or '').strip(), (it.get('u') or '').strip(), (it.get('d') or '').strip()
            fn = it.get('fn')
            p = it.get('p', 'free')
            why = None
            if not n or not u or not d: why = 'missing n/u/d'
            elif not isinstance(fn, list) or not fn: why = 'fn must be a non-empty list'
            elif not any(t in FNTAGS for t in fn): why = f'unknown fn tag {fn}'
            elif p not in ('free','freemium','paid'): why = f'bad cost "{p}"'
            elif u.rstrip('/').lower() in eurls: why = 'duplicate URL'
            elif norm(n) in enames: why = 'duplicate NAME'
            elif dom(u) in edoms: why = f'duplicate DOMAIN ({dom(u)})'
            (rejects.append((n or '?', why)) if why else cand.append((n, u, d, p, fn, it)))
        with concurrent.futures.ThreadPoolExecutor(6) as ex:
            codes = list(ex.map(lambda t: curl(t[1]), cand))
        clean = []
        for (n, u, d, p, fn, it), code in zip(cand, codes):
            if code in LIVE:
                rec = {'n': n, 'u': u, 'd': d, 'p': p, 'm': it.get('m', 'Free'), 'fn': fn}
                if it.get('cat'): rec['cat'] = it['cat']
                if it.get('dl'): rec['dl'] = True
                if it.get('lvl'): rec['lvl'] = it['lvl']
                clean.append(rec)
            else:
                rejects.append((n, f'dead ({code})'))
        out = path.replace('.json', '.clean.json')
        json.dump({'items': clean}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f"{os.path.basename(path)}: {len(clean)} clean -> {os.path.basename(out)}")
        for n, why in rejects: print(f"   REJECT {n[:44]:46} {why}")
        for rec in clean: print(f"   OK     {rec['n'][:44]:46} {rec['u'][:46]}")
        grand_ok += len(clean); grand_rej += len(rejects)
    print(f"\nTOTAL clean={grand_ok} rejected={grand_rej}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    main(sys.argv[1:])
