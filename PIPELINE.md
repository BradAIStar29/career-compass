# Career Compass — resume-safe integration pipeline

Shell and file tools have dropped mid-turn repeatedly. This page exists so that
never costs a re-derivation again: the tail of the pipeline is now one
idempotent command, and every wave file is the durable handoff.

## The one command

```bash
cd /app/conversations/6acfbbd2a4370f1392b68ad1
python3 career-hub/apply_wave.py waveNN_topic.json [more.json ...]
```

It does, in order:

1. refreshes `existing_names.tsv` (so the dupe check is never stale),
2. runs `validate_wave.py` and only ever integrates from the `.clean.json`,
3. inserts each item into the category named in its `cat` field, skipping any
   URL already present,
4. recomputes the hero total and re-syncs every hardcoded fallback
   (it prints the replacement count, which must be > 0),
5. runs `node --check` on the inline script and prints `DONE` or
   `STOP: syntax broken, do not deploy`.

**Safe to run repeatedly.** A second run adds 0 and changes nothing, so if a
turn dies halfway you just run the same command again. It deliberately does not
deploy, so a half-finished integration can never reach the live site.

## What still has to be done by hand after apply_wave.py

1. Full battery: `cd career-hub/tests && NODE_PATH=/tmp/node_modules node <test>.js`
   for all 17 suites plus `hero-check.js`.
2. `cp career-hub/index.html /tmp/cc-deploy/index.html` (keep `_worker.js` and
   `functions/` in that directory — a CF upload is a full snapshot and dropping
   them kills /api/chat and /api/visit).
3. Deploy, then `python3 career-hub/check_parity.py` until it exits 0.
4. Push `index.html` to GitHub.
5. Live-verify hero, `/api/visit` (`{action:'get'}`), `/api/chat`.

## If a turn dies with tools missing

Do not re-derive URLs. The wave file on disk is the source of truth. Next
tooled turn: `apply_wave.py <that file>` and continue. If the wave file itself
never got written, the research is genuinely lost — which is why every worker
prompt says "write the file after the FIRST verified item, then rewrite".

## Editorial rules that keep biting

- **Dedupe by NAME and domain-root, not exact URL.** A program can appear twice
  with different titles (WV Invests Grant / West Virginia Invests Grant) or two
  TLDs (.org dead, .com live).
- **Check the page title, not just the status code.** A 200 proves nothing: a
  hijacked domain can return 200 and serve something unrelated.
- **Non-US sites get rejected.** Scotland's My World of Work and UK-only boards
  have both been proposed by workers.
- **Practitioner societies are not job-seeker resources.** NACE, PSHRA, RIMS,
  AAFCS, NAHRO and ASAE all return 200, but they serve people already employed
  in those fields and their signature events are paid annual conferences.
  Rejected Nov 21 rather than inflating the Paid count right after the site
  stopped claiming everything is free.
- **State-specific items get labeled or routed to that state's panel.** The site
  stays national-neutral.
