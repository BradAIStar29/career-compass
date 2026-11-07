#!/usr/bin/env python3
"""Deploy-parity guard: proves the LIVE site matches the local build.

Catches the silent failure mode where resources are integrated into
career-hub/index.html but never deployed (or a deploy is stale).

Exit 0 = live matches local. Exit 1 = drift (DEPLOY REQUIRED).
Also reports hero counts and which resources are missing live.
"""
import hashlib, os, re, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL = os.path.join(HERE, 'index.html')
LIVE = 'https://career-compass-bgw.pages.dev/'

def fetch(url):
    req = urllib.request.Request(url + ('?cb=%d' % int(time.time())),
                                 headers={'User-Agent': 'Mozilla/5.0 Chrome/126.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8', 'replace')

def main():
    local_b = open(LOCAL, 'rb').read()
    local = local_b.decode('utf-8', 'replace')
    live = fetch(LIVE)
    lh, gh = hashlib.md5(local_b).hexdigest(), hashlib.md5(live.encode('utf-8')).hexdigest()
    lhero = (re.search(r'id="heroStat">([^<]*)<', local) or [None, '?'])[1]
    ghero = (re.search(r'id="heroStat">([^<]*)<', live) or [None, '?'])[1]
    lu = set(re.findall(r'"u":"(https?://[^"]+)"', local))
    gu = set(re.findall(r'"u":"(https?://[^"]+)"', live))
    missing = sorted(lu - gu)
    print('local md5 %s  hero %s' % (lh, lhero))
    print('live  md5 %s  hero %s' % (gh, ghero))
    if lh == gh:
        print('IN SYNC — live site matches the local build.')
        return 0
    print('DRIFT — live differs from local. Deploy required.')
    print('resources in local but NOT live: %d' % len(missing))
    for u in missing[:25]:
        i = local.find('"u":"' + u + '"'); st = local.rfind('"n":"', 0, i)
        nm = local[st + 5:local.find('"', st + 5)] if st > 0 else '?'
        print('   %-46s %s' % (nm[:44], u[:58]))
    if len(missing) > 25:
        print('   ... and %d more' % (len(missing) - 25))
    return 1

if __name__ == '__main__':
    sys.exit(main())
