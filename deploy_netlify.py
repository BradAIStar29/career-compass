#!/usr/bin/env python3
"""Publish the current career-hub/index.html to Netlify (careercompass-jobs).

Why this exists: the Netlify site is the URL Bradley shares publicly, but it was
frozen while work moved to Cloudflare Pages, and it silently sat on a build from
Oct 15 2026 while the site grew to 2,284 resources. This makes republishing one
command so the two never diverge again.

API routes are NOT Netlify Functions. Zip deploys do not bundle functions (a
function only ships from a git-connected build), so /api/* is proxied to the
Cloudflare deployment, which already runs the Compass AI worker, the visitor
counter and the suggestion handler. Verified working: /api/visit, /api/chat.

Usage: python3 career-hub/deploy_netlify.py
Needs: NETLIFY_PERSONAL_ACCESS_TOKEN in the environment.
"""
import io, json, os, sys, time, zipfile, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
INDEX = os.path.join(HERE, "index.html")
TOK = os.environ.get("NETLIFY_PERSONAL_ACCESS_TOKEN", "")
SITE = "77bc494b-5a2c-4d6a-a2a9-2bd022818723"   # careercompass-jobs (note 4d6a, not 4b6a)
CF = "https://career-compass-bgw.pages.dev"

REDIRECTS = f"""# API endpoints proxy to the Cloudflare deployment, which runs the Compass AI
# worker, the visitor counter and the suggestion handler.
/api/chat      {CF}/api/chat      200
/api/visit     {CF}/api/visit     200
/api/suggest   {CF}/api/suggest   200
/*             /index.html        200
"""


def call(url, data=None, ct="application/json"):
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET")
    req.add_header("Authorization", "Bearer " + TOK)
    if data is not None:
        req.add_header("Content-Type", ct)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main():
    if not TOK:
        sys.exit("NETLIFY_PERSONAL_ACCESS_TOKEN missing")
    if not os.path.exists(INDEX):
        sys.exit("index.html not found next to this script")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(INDEX, "index.html")
        z.writestr("_redirects", REDIRECTS)
    print("bundle:", len(buf.getvalue()), "bytes")

    st, out = call(f"https://api.netlify.com/api/v1/sites/{SITE}/deploys",
                   buf.getvalue(), "application/zip")
    if st != 200:
        sys.exit(f"deploy rejected: {st} {out[:200]}")
    did = json.loads(out).get("id")
    print("deploy id:", did)

    for _ in range(20):
        st, out = call(f"https://api.netlify.com/api/v1/deploys/{did}")
        state = json.loads(out).get("state")
        print("  state:", state)
        if state in ("ready", "error"):
            break
        time.sleep(5)
    if state != "ready":
        sys.exit("deploy did not reach ready")
    print("published -> https://careercompass-jobs.netlify.app")


if __name__ == "__main__":
    main()
