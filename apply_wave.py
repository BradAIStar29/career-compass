"""apply_wave.py — one idempotent command: gate -> integrate -> recount.

Why this exists: shell/file tools have dropped mid-turn more than once, which
stranded verified research in wave files and left me re-deriving URLs by hand.
This makes the whole tail of the pipeline a single, re-runnable step:

    python3 career-hub/apply_wave.py wave65_events.json [more.json ...]

Safe to run any number of times: the gate rejects already-integrated URLs, and
the integrator skips any URL already present in the target category. If a turn
dies halfway, just run the same command again.

It does NOT deploy. Deploying is deliberately separate so a half-finished
integration can never reach the live site.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUB = os.path.join(ROOT, 'career-hub')
INDEX = os.path.join(HUB, 'index.html')
SECS = ['BOARDS', 'IND', 'EXEC', 'AI', 'LDP', 'VOL', 'ADDL', 'NET', 'SPK', 'SUP', 'INC']


def seg(f, name):
    i = f.find('const ' + name + '=')
    if i < 0:
        return None
    j = i + len('const ' + name + '=')
    while j < len(f) and f[j] not in '[{':
        j += 1
    op = f[j]
    cl = ']' if op == '[' else '}'
    depth = 0
    instr = False
    esc = False
    for k in range(j, len(f)):
        c = f[k]
        if esc:
            esc = False
            continue
        if c == '\\':
            esc = True
            continue
        if instr:
            if c == '"':
                instr = False
            continue
        if c == '"':
            instr = True
        elif c == op:
            depth += 1
        elif c == cl:
            depth -= 1
            if depth == 0:
                return j, k + 1
    return None


def gate(wave):
    """Run the project gate; returns path to the clean file (or None)."""
    out = subprocess.run([sys.executable, os.path.join(HUB, 'validate_wave.py'), wave],
                         cwd=HUB, capture_output=True, text=True)
    clean = wave.replace('.json', '.clean.json')
    ok = os.path.exists(clean)
    tail = [l for l in (out.stdout or '').splitlines() if 'clean' in l or 'TOTAL' in l]
    print('  gate:', tail[-2] if len(tail) > 1 else (tail[-1] if tail else 'no output'))
    return clean if ok else None


def integrate(clean_files):
    f = open(INDEX, encoding='utf-8').read()
    items = []
    for cf in clean_files:
        try:
            items += json.load(open(cf))['items']
        except Exception as e:
            print('  skip unreadable', cf, e)
    added, skipped = 0, 0
    for s in SECS:
        r = seg(f, s)
        if not r:
            continue
        a, b = r
        data = json.loads(f[a:b])
        by_name = {c['c'].strip().lower(): c for c in data}
        touched = False
        for it in items:
            if it.get('_done'):
                continue
            cat = by_name.get(it.get('cat', '').strip().lower())
            if not cat:
                continue
            urls = {str(x.get('u', '')).rstrip('/').lower() for x in cat['i']}
            if it['u'].rstrip('/').lower() in urls:
                it['_done'] = True
                skipped += 1
                continue
            fn = it.get('fn') if isinstance(it.get('fn'), list) else ['General']
            cat['i'].append({'n': it['n'], 'u': it['u'], 'd': it['d'], 'p': it.get('p', 'free'),
                             'm': it.get('m', 'Free'), 'fn': fn, 'add': '2026-11-21'})
            it['_done'] = True
            added += 1
            touched = True
            print(f'  + {s:6} {cat["c"][:32]:34} now {len(cat["i"]):3}  {it["n"][:40]}')
        if touched:
            f = f[:a] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + f[b:]
    open(INDEX, 'w', encoding='utf-8').write(f)
    unplaced = [i['n'] for i in items if not i.get('_done')]
    print(f'  integrated {added}, already-present {skipped}, unplaced {unplaced}')


def recount():
    """Sync every hardcoded hero fallback to the computed total."""
    f = open(INDEX, encoding='utf-8').read()
    total = 0
    for s in SECS:
        r = seg(f, s)
        if r:
            total += sum(len(c['i']) for c in json.loads(f[slice(*r)]))
    r = seg(f, 'STATEGROUPS')
    if r:
        total += sum(len(v) for v in json.loads(f[slice(*r)]).values())
    # find whatever number is currently in the hero and any other fallback spots
    m = re.search(r'id="heroStat">(\d[\d,]*)', f)
    old = m.group(1) if m else None
    n = 0
    if old and old != str(total):
        f, n = re.subn(re.escape(old) + r'\+', str(total) + '+', f)
        open(INDEX, 'w', encoding='utf-8').write(f)
    print(f'  hero: computed {total} (was {old}) | replacements {n}')


def syntax_check():
    f = open(INDEX, encoding='utf-8').read()
    m = re.search(r'<script>([\s\S]*)</script>', f)
    if not m:
        print('  no script block found')
        return False
    open('/tmp/cc_check.js', 'w').write(m.group(1))
    r = subprocess.run(['node', '--check', '/tmp/cc_check.js'], capture_output=True, text=True)
    print('  node --check:', 'OK' if r.returncode == 0 else 'FAILED\n' + r.stderr[:400])
    return r.returncode == 0


if __name__ == '__main__':
    waves = sys.argv[1:]
    if not waves:
        print('usage: apply_wave.py waveNN_*.json [...]')
        sys.exit(2)
    print('refreshing names index...')
    subprocess.run([sys.executable, os.path.join(HUB, 'build_names_index.py')],
                   cwd=HUB, capture_output=True, text=True)
    cleans = []
    for w in waves:
        print('gate:', w)
        c = gate(w)
        if c:
            cleans.append(c)
    print('integrating...')
    integrate(cleans)
    print('recounting...')
    recount()
    ok = syntax_check()
    print('DONE' if ok else 'STOP: syntax broken, do not deploy')
    sys.exit(0 if ok else 1)
