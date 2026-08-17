# VeerNXT — Status Report

**Purpose:** Handoff document, updated after the "tonight" session referenced in the previous version of this report. Covers: three landing-page/theme bugs found and fixed, a real query bug caught before shipping the Central/State/UT Learning Center filter, and — the largest piece — migrating the entire R2 storage account away from a developer (`souvikgupta64@gmail.com`, per git history) who's gone unreachable, onto a bucket the team fully controls.

Everything from tonight — landing-page bugs, Central/State/UT filter fix, the R2 account migration and its two scripts (`scripts/migrate-r2-account.js`, `scripts/cutover-r2-urls.js`) — **is committed and pushed.** See §5 for the exact git state.

**⚠️ Vercel env vars were updated** (user confirmed) to the new R2 bucket's credentials — that part of the migration is done.

**⚠️ New issue found right after the Vercel update, needs a dashboard action**: the new R2 bucket has **no CORS policy**, so every direct browser `fetch()` to it (chapter JSON, images — `SecureReader.jsx` fetches these client-side straight from the R2 public URL, not proxied through the server) is blocked by the browser with a CORS error. This is why resources stopped showing up right after the cutover — not a code bug, a bucket configuration gap that never existed on the old bucket. **Fix**: Cloudflare dashboard → R2 → the bucket → Settings → CORS Policy → add:
```json
[{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
```
Can't be done via the R2 API token in `.env` — it's scoped to Object Read & Write only, `GetBucketCors`/`PutBucketCors` returned `AccessDenied`. Needs the dashboard specifically. **Not yet confirmed fixed** — waiting on this to be applied and re-tested live.

---

## 1. Landing page / theme bugs found and fixed tonight

Three separate, real bugs, each looking similar on the surface ("something wrong flashes on load") but with genuinely different root causes — worth reading individually if this recurs, don't assume it's the same fix twice.

1. **Flash of light background on `/` before React mounts.** `body` has a global light CSS background (`#F4F4F8`) that paints instantly (render-blocking CSS), while the landing page's actual dark background is a Tailwind class that only exists once the ~2.2MB JS bundle loads and React mounts. Fixed with a synchronous inline `<script>` in `index.html` that sets the background dark immediately, scoped to `pathname === '/'` only.
2. **A completely different, older-looking hero flashing in, even in incognito.** Turned out to be the `<video poster="...">` attribute — the Hero's actual background is a 26MB autoplay video; until it buffers, the browser shows the `poster` image, which was a leftover white-background illustration from an older design nobody updated. Fixed by extracting a real frame from the current video (ffmpeg) and using that as the poster instead, compressed to 218KB so the poster itself loads fast. Not a caching bug at all — reproduces every time, by design of how `<video poster>` works.
3. **Dark background persisting on inner pages until a hard refresh.** A regression from fix #1: the inline script's `document.body.style.background` is an inline style that survives client-side navigation (React never touches `<body>`, only `#root`), so once set dark on `/`, it stayed dark through every subsequent SPA route change until a full reload re-ran the script with a different pathname. Fixed with an always-mounted `BodyThemeSync` component in `App.jsx` (`useLocation()` + effect) that keeps `body`'s background in sync with the *current* route on every navigation, not just initial load.

All three committed and pushed (`6b3a552`, `6100223`, `a04ffe7`).

---

## 2. Central/State/UT Learning Center filter — shipped, with a bug caught first

Someone (not this session originally) had built a Central/State/UT toggle + state/UT picker locally, replacing the old "Important Exams" checkbox sidebar — but it was never committed, so production kept showing the old UI. Before shipping it: found the query filtered `exam_name` for state/UT selection, but the state/department actually lives in `conducting_body` (e.g. `"16. Meghalaya — 13. Meghalaya High Court"` vs. `exam_name` = `"2. High Court Assistant Grade II"`, per the mapping fix from the earlier session). As written, selecting any state would have returned **zero results** the moment it shipped. Fixed to query `conducting_body` instead, scoped to `resources_v2` only (the `quizzes` table has no `conducting_body` column). Verified against real data before shipping: Central → 49 rows, Meghalaya → 201 rows, both matching independently-known counts. Committed and pushed (`201fd82`).

**Worth knowing**: `regionMode` defaults to `'central'`, which now correctly shows only 49 items on first load — since State content is the much bigger set (4,350 of 4,399 total resources), first-time visitors land on a fairly sparse view unless they switch tabs. Flagged, not changed — a product/UX call, not a bug.

---

## 3. R2 account migration — the big one tonight

**Why**: the original Cloudflare R2 account (`veernxt-resources` bucket, account `3d586cada95b2d9c88eb1621d8cd0dc9`) was set up by a developer (`souvikgupta64@gmail.com`, confirmed via `git blame` on the commit that introduced `r2Uploader.js`) who is now unreachable. The team doesn't control that Cloudflare account. Tried the cheap path first (asking whether he could grant access instead of a full migration) — not pursued/not possible, so a real migration was done.

**What happened, in order**:
1. User created a brand-new R2 bucket (also named `veernxt-resources`, different account: `3407b19182fb6ab1a3ea73221b7c9dcf`) under a Cloudflare account the team controls, with a fresh public dev URL (`pub-8c123d43246448199bbe4a14bffa2c06.r2.dev`) and a scoped Object Read & Write API token.
2. New credentials added to `.env` under separate names first (`R2_NEW_*`) — deliberately did **not** touch the live `R2_*` values until everything was verified, so the running app was never at risk mid-migration.
3. Verified connectivity end-to-end (list/write/read-back/public-fetch) on the empty new bucket before building anything on top of it.
4. Built `scripts/migrate-r2-account.js` — R2 has no server-side cross-account `CopyObject` (unlike the earlier same-account STATE EXAMS prefix migration), so this actually downloads each object from the old account and re-uploads it to the new one. Resumable by design (skips anything already present at the destination with a matching size).
5. Tested on 30 objects first: copy correctness, byte-for-byte integrity (`Buffer.compare`), public URL serving, and resumability (re-running skipped all 30) — all verified before the full run.
6. Ran the full migration: **268,647 copied + 30 from the test = 268,677 objects, 47.72GB, 0 failures.** Independently re-verified from the destination side afterward (re-listed the whole new bucket): exact match on object count and total size, plus a live content spot-check.
7. Built `scripts/cutover-r2-urls.js` — the actual DB cutover: bulk-updates every `resources_v2` row's `storage_base_url`/`metadata_url`/`thumbnail_url` from the old bucket's public URL to the new one. Pure string replace, doesn't touch R2 at all (by this point every object already exists at the new location). Tested on 5 rows first, verified live (metadata fetch 200, title match, thumbnail fetch 200), then ran against all remaining rows: **4,394 + 5 test = 4,399 rows, 0 failures.**
8. Final independent check: 0 rows left pointing at the old URL, 4,399 on the new one, 5 random spot-checks all resolving live content correctly.
9. `.env` updated: `R2_*` (the "live" vars every script and `api/admin/save-resource.js`'s `r2-upload` branch actually read) now hold the **new** bucket's values. Old bucket's credentials kept as `R2_OLD_*` purely as a rollback reference — nothing reads them anymore, and nothing was deleted from the old bucket either, so there's a clean rollback path if anything surfaces later.

**Old bucket**: left completely untouched (not deleted, not modified) — still fully intact under Souvik's account as a backup, just no longer written to or read from by anything in this app.

**Both migration scripts are real, reusable tools** (kept in the repo, not deleted) in case a similar cross-account move is ever needed again.

---

## 4. Still outstanding from this migration

1. **Vercel env vars not updated** — see the banner at the top. Local `.env` is correct; the deployed app isn't yet. This is the single most important thing to do before anyone touches content ingestion again, otherwise new uploads will silently try to write to a bucket the team can't administer.
2. Consider whether to pursue reclaiming the *old* Cloudflare account (support ticket, proving ownership) now that it's no longer urgent — no rush, since the app no longer depends on it, but the ~47GB sitting there costs whoever's account it's on real money each month.
3. `scripts/migrate-r2-account.js` / `scripts/cutover-r2-urls.js` need to be committed (see banner).

---

## 5. Git state

**Committed and pushed** (in order, today + tonight): `669dd70`, `1ccad8d`, `05d9d07`, `b14a740`, `6b3a552` (landing FOUC fix), `6100223` (hero poster fix), `201fd82` (Central/State/UT filter), `a04ffe7` (body theme sync fix).

**Not committed**: `scripts/migrate-r2-account.js`, `scripts/cutover-r2-urls.js` (§3).

Still untracked, unrelated, deliberately excluded from every commit (separate visual-asset-generation workstream): `generate_veernxt_assets.py`, `image-generation.txt`, `veernxt_assets/`, `public/veernxt_assets/`.

**The `git stash` from before 2026-08-13 is still sitting there, still untouched** (`stash@{0}: WIP on main: e89bf4a minor changes`).

---

## 6. Manual steps still required (Supabase SQL editor) — carried forward, unchanged

1. `sql/points_system.sql`
2. `sql/rewards_system.sql` (depends on #1)
3. `sql/employer_hiring_profile.sql`

---

## 7. Security issues flagged — one fixed, others carried forward

1. ~~`src/lib/r2Uploader.js` — R2 secret hardcoded in client bundle~~ — **fixed**, earlier session.
2. `src/lib/supabase.js` — hardcoded fallback Supabase key decodes to `role: service_role`. Not an active leak, but the literal key is in source/git history. Not touched.
3. `src/pages/admin/AdminLogin.jsx` — admin panel has no real authentication. Not touched.

---

## 8. Other loose ends, carried forward, not touched

- Jobs page (`PublicJobs`/`JobBoard`) still spins forever — Postgres `57014 statement timeout`.
- `/profiling/results` still has no fallback for direct URL/refresh without router state.
- Real ₹9/₹1 Razorpay charges (ProfilingResults/Dashboard inline unlock) still never fired for real.
- Mock Test/PYQ content (2,736 STATE EXAMS files) still deferred — needs a structured-question parser, unverified whether the source docx files are even in an extractable Q&A format.
- Central and UT exam sets from the Drive folder are still entirely unstarted.
- Pages from the original redesign backlog still untouched: Network, Support, Legal, PublicJobs/JobBoard, Subscribe, FinancialGuidance, RewardsCenter, FindCandidates, the rest of the Admin panel.

---

## 9. Suggested pickup order next time

1. Update Vercel's env vars to the new R2 bucket (§4.1) — do this first, before any content work.
2. Commit the two migration scripts (§5).
3. Spot-check the live site (not just API-level checks) — Learning Center filters, a few resource pages, thumbnails.
4. Mock Test/PYQ parser investigation (§8).
5. Central/UT exam ingestion, once Mock/PYQ is sorted or explicitly deprioritized.
