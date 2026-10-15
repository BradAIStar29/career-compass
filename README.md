# Career Compass

A free career resource hub for job seekers: 786+ vetted resources across 11 tabs, a True North personalization planner, and Compass, an AI guide (Groq-powered).

**Live (Netlify):** https://careercompass-jobs.netlify.app
**Temp home (Cloudflare Pages):** connect this repo in CF Pages (see below).

## Repo structure (works on BOTH platforms)
- `index.html` — the entire site. It auto-detects the platform and calls the right chat endpoint (`/.netlify/functions/chat` on Netlify, `/api/chat` on Cloudflare).
- `netlify/functions/chat.js` — Netlify Function (reads `process.env.GROQ_API_KEY`)
- `functions/api/chat.js` — Cloudflare Pages Function (reads `context.env.GROQ_API_KEY`)
- `netlify.toml` — Netlify config

## Deploy to Cloudflare Pages (one-time, ~1 min)
1. Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** → pick this repo.
2. Build settings: Framework preset **None**, Build command **empty**, Output directory **/** (root).
3. Settings → Environment variables → add `GROQ_API_KEY` (the same Groq key used on Netlify).
4. Save & Deploy. Every future push to main auto-deploys.

## Returning to Netlify (November 13, 2026)
Netlify credits reset on Nov 13, 2026. When ready, deploy `index.html` + `netlify/functions/chat.js`
back to site `77bc494b-5a2c-4b6a-a2a9-2bd022818723` via digest deploy (Netlify API), then set
`GROQ_API_KEY` as a Netlify env var. One clean push brings everything back.
