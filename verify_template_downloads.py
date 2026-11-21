import sys, subprocess, re
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
LIVE={200,202,403,406,429}

def fetch(url):
    p=subprocess.run(['curl','-sS','-L','--max-time','25','-A',UA,'-o','/tmp/dl.bin',
        '-w','%{http_code}\t%{content_type}\t%{size_download}\t%{url_effective}',url],
        capture_output=True,text=True)
    f=(p.stdout or '').strip().split('\t')
    if len(f)<4: return {'code':'000','ct':'','size':0,'final':url,'kind':'','err':p.stderr[:80]}
    code,ct,size,final=f[0],f[1].lower(),int(float(f[2] or 0)),f[3]
    head=b''
    try:
        with open('/tmp/dl.bin','rb') as h: head=h.read(512)
    except OSError: pass
    kind=''
    if head.startswith(b'%PDF'): kind='pdf'
    elif head.startswith(b'PK\x03\x04'): kind='ooxml'
    elif head[:5].lower()==b'{\\rtf': kind='rtf'
    elif b'<html' in head[:300].lower() or b'<!doctype' in head[:300].lower(): kind='html'
    return {'code':code,'ct':ct,'size':size,'final':final,'kind':kind,'err':''}

def page_links(url):
    r=fetch(url)
    if r['kind']!='html': return r,[]
    try: html=open('/tmp/dl.bin','rb').read().decode('utf-8','ignore')
    except OSError: html=''
    links=[]
    for m in re.finditer(r'href=["\']([^"\']+)["\']',html,re.I):
        h=m.group(1)
        if re.search(r'\.(pdf|docx?|rtf|xlsx)(\?|#|$)',h,re.I):
            if h.startswith('/'):
                b=re.match(r'(https?://[^/]+)',url); h=b.group(1)+h if b else h
            elif not h.startswith('http'): continue
            links.append(h)
    return r,list(dict.fromkeys(links))[:6]

def main(path):
    rows=[l.rstrip('\n').split('\t') for l in open(path,encoding='utf-8') if l.strip() and not l.startswith('#')]
    ok=bad=0
    for row in rows:
        label,cat,url=(row+['','',''])[:3]
        r,links=page_links(url)
        verdict,detail='FAIL',''
        if r['code']=='000': detail='connection failed/refused'
        elif r['kind'] in ('pdf','ooxml','rtf') and r['size']>8000: verdict,detail='PASS',f"{r['kind']} {r['size']//1024}KB {r['final']}"
        elif r['kind']=='html' and links:
            for L in links:
                x=fetch(L)
                if x['kind'] in ('pdf','ooxml','rtf') and x['size']>8000:
                    verdict,detail='PASS',f"{x['kind']} {x['size']//1024}KB {x['final']}"; break
                detail=detail or f"page live ({r['code']}) but link not a file: {L} -> {x['code']}/{x['kind'] or 'unknown'}"
            if verdict!='PASS' and not detail: detail=f"page live ({r['code']}) but no pdf/docx link found"
        elif r['code'] in LIVE: detail=f"live page ({r['code']}) but no file behind it"
        else: detail=f"HTTP {r['code']}"
        print(('  OK   ' if verdict=='PASS' else '  DEAD ')+label.ljust(46)+detail[:150])
        ok+=verdict=='PASS'; bad+=verdict=='FAIL'
    print(f"TOTAL verified={ok} rejected={bad}")
    return 0 if bad==0 else 1

if __name__=='__main__':
    sys.exit(main(sys.argv[1]))
