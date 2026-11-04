#!/usr/bin/env python3
"""Regenerate existing_names.tsv (tab, name, domain) from index.html.
Run this BEFORE launching any research wave so workers grep a fresh index."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, 'index.html')
OUT = os.path.join(HERE, 'existing_names.tsv')
SECS = ['BOARDS','IND','EXEC','AI','LDP','VOL','ADDL','NET','SPK','SUP','INC']

def seg(text, name):
    i = text.find('const ' + name + '=')
    if i < 0: return None
    j = i + len('const ' + name + '=')
    while text[j] not in '[{': j += 1
    op = text[j]; cl = ']' if op == '[' else '}'
    dep = 0; ins = False; esc = False
    for k in range(j, len(text)):
        c = text[k]
        if esc: esc = False; continue
        if c == '\\': esc = True; continue
        if ins:
            if c == '"': ins = False
            continue
        if c == '"': ins = True
        elif c == op: dep += 1
        elif c == cl:
            dep -= 1
            if dep == 0: return json.loads(text[j:k+1])
    return None

def dom(u):
    return (u or '').split('//')[-1].replace('www.', '').rstrip('/').split('?')[0]

def main():
    text = open(INDEX, encoding='utf-8').read()
    lines = []
    for s in SECS:
        data = seg(text, s) or []
        for cat in data:
            for it in cat.get('i', []):
                lines.append(f"{s}\t{it.get('n','')}\t{dom(it.get('u'))}")
    sg = seg(text, 'STATEGROUPS') or {}
    for st, arr in sg.items():
        for it in arr:
            lines.append(f"STATE:{st}\t{it.get('n','')}\t{dom(it.get('u'))}")
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write("\n".join(lines))
    print(f"{OUT}: {len(lines)} entries")

if __name__ == '__main__':
    main()
