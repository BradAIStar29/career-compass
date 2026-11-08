import json
f=open('/app/conversations/6acfbbd2a4370f1392b68ad1/career-hub/index.html').read()
def seg(name):
    i=f.find('const '+name+'=')
    j=i+len('const '+name+'=')
    while f[j] not in '[{': j+=1
    op=f[j]; cl=']' if op=='[' else '}'
    dep=0;ins=False;esc=False
    for k in range(j,len(f)):
        c=f[k]
        if esc: esc=False; continue
        if c=='\\': esc=True; continue
        if ins:
            if c=='"': ins=False
            continue
        if c=='"': ins=True
        elif c==op: dep+=1
        elif c==cl:
            dep-=1
            if dep==0: return f[j:k+1]
    raise Exception(name)
total=0
# DIS and LGBT are ALIASES: const DIS=INC.slice(0,5),LGBT=INC.slice(5).
# They are already counted inside INC, so counting them again double-counts.
for name in ['BOARDS','IND','EXEC','AI','LDP','VOL','ADDL','NET','SPK','SUP','INC']:
    d=json.loads(seg(name)); n=sum(len(c['i']) for c in d); total+=n; print(name,n)
sg=json.loads(seg('STATEGROUPS'))
print('STATEGROUPS',sum(len(v) for v in sg.values()))
hero=total+sum(len(v) for v in sg.values())
print('HERO TOTAL',hero)
import re as _re
declared=_re.search(r'id="heroStat">(\d+)\+<',f)
if declared:
    d=int(declared.group(1))
    print('DECLARED',d,'->','MATCH' if d==hero else 'MISMATCH (dynamic JS fixes this at runtime)')
# INC aliases, reported but not summed
inc=json.loads(seg('INC'))
print('alias DIS=LGBT slices of INC: 5 +',len(inc)-5,'=',len(inc))
