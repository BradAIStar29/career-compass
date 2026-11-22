"""Normalise near-duplicate function tags so the filter chips stop fragmenting.

The taxonomy declared in FNGROUPS has 21 facets and the validator knows 10
function tags, but items had drifted to 57 other spellings. A visitor filtering
"Interview Prep" never saw the 2 items tagged "Interview"; "Tech & IT" missed
22 items tagged plain "Tech". This folds only UNAMBIGUOUS synonyms and leaves
genuine section-specific facets (Climate, Disability, Diversity, Operations,
Human Services, Job Search & Prep, Sustainability, Business/Marketing/Finance)
untouched, because those are deliberate lens dimensions, not typos.

Run: python3 normalise_tags.py   (idempotent — a second run changes nothing)
"""
import json

path = 'career-hub/index.html'
f = open(path, encoding='utf-8').read()
SECS = ['BOARDS', 'IND', 'EXEC', 'AI', 'LDP', 'VOL', 'ADDL', 'NET', 'SPK', 'SUP', 'INC']

CANON = {
    'Job Boards': 'Job Matching',
    'Job Placement': 'Job Matching',
    'Federal & Public Sector': 'Public Sector',
    'Government': 'Public Sector',
    'Interview': 'Interview Prep',
    'Job Search Preparation': 'Job Search & Prep',
    'Job Search Workshops': 'Job Search & Prep',
    'Workshops': 'Job Search & Prep',
    'Career Pivot': 'Career Pivoters',
    'Career Changers': 'Career Pivoters',
    'Tech': 'Tech & IT',
    'Technology & Engineering': 'Tech & IT',
    'Technical & Engineering': 'Tech & IT',
    'Data': 'Tech & IT',
    'Data & AI': 'Tech & IT',
    'Cybersecurity': 'Tech & IT',
    'Trades': 'Skilled Trades & Labor',
    'Trades & Construction': 'Skilled Trades & Labor',
    'Finance & Accounting': 'Finance',
    'Logistics & Supply Chain': 'Supply Chain',
    'Hospitality & Tourism': 'Hospitality',
    'Business Operations': 'Operations',
    'Business & Operations': 'Operations',
    'Arts, Design & Media': 'Creative',
    'Media & Communications': 'Creative',
    'Design & UX': 'Creative',
    'Creative & Media': 'Creative',
    'Learning': 'Skills & Learning',
    'Job Training': 'Skills & Learning',
    'Nonprofit & Policy': 'Nonprofit',
    'Engineering & Science': 'Engineering',
    'Tools': 'General',
    'Support': 'General',
}


def seg(name):
    i = f.find('const ' + name + '=')
    j = i + len('const ' + name + '=')
    while f[j] not in '[{':
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


changes = 0
items_touched = 0
detail = {}
for s in SECS:
    a, b = seg(s)
    data = json.loads(f[a:b])
    touched = False
    for c in data:
        for it in c['i']:
            fn = it.get('fn')
            if not isinstance(fn, list):
                continue
            new = []
            for t in fn:
                m = CANON.get(t, t)
                detail[m] = detail.get(m, 0) + (1 if m != t else 0)
                if m not in new:
                    new.append(m)
            if new != fn:
                it['fn'] = new
                items_touched += 1
                changes += sum(1 for x, y in zip(fn, new) if x != y) or 1
                touched = True
    if touched:
        f = f[:a] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + f[b:]

open(path, 'w', encoding='utf-8').write(f)
print(f'items touched: {items_touched}')
print('tags folded (into: count):')
for k in sorted(detail, key=lambda x: -detail[x]):
    if detail[k]:
        print(f'   {k}: {detail[k]}')
