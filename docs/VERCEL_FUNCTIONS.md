# Vercel serverless functions (as of 2026-10-06)

Vercel **Hobby** allows at most **12 serverless functions per deployment**. Every `.js` file under `api/`
is one function, **except** files/folders whose name starts with an underscore (`api/_lib/...`), which are
helpers and are not counted. The project is at **12 / 12**: there is no spare slot.

Incident 2026-10-06: the admin-login commit `ed7a5de` added `api/admin/auth.js` as a 13th function and every
deploy failed from then on ("No more than 12 Serverless Functions"). Fixed by moving that handler to
`api/_lib/adminAuth.js` and dispatching it from `api/admin/misc.js` (`?fn=auth`), with a rewrite so the URL
`/api/admin/auth` is unchanged. The same trick was used before for every router below (see
`docs/status_report.md` §36.3).

## The 12 functions

| # | File (function) | Lines | Public URL(s) | What it does | Client call sites* |
|---|---|---|---|---|---|
| 1 | `api/admin/misc.js` | ~435 | `/api/admin/admins`, `/api/admin/redemptions`, `/api/admin/content-writes`, `/api/admin/auth` (rewrites, `?fn=`) | Admin router. `admins`: list / invite / remove admins. `redemptions`: reward redemptions list + status. `content-writes`: service-role writes for `lc_*` catalogue tables, subject thumbnails, PYQ question replace. `auth`: admin login, session (`me`), first-login setup, profile update, change password (handler in `api/_lib/adminAuth.js`) | 3 / 2 / 4 / 4 |
| 2 | `api/admin/save-resource.js` | ~2,010 | `/api/admin/save-resource` (POST `{type}`) | The big admin content API: 15 `books-*` actions (list, get, create, duplicate, rename, archive/unarchive, delete, save chapter, tags, find/replace, issues, sync pairs, fetch content), `content-publish`, `docx-preview-convert`, `docx-upload-url`, `r2-upload`, and 4 `theme-*` actions. Uses mammoth, AWS S3 SDK, DOCX/intro parsers from `scripts/` | 20 |
| 3 | `api/admin/legal-aid.js` | ~180 | `/api/admin/legal-aid` | Legal Aid Cell admin: list queries, send email reply (nodemailer, SMTP from `_lib/emailBroadcaster.js`), update status/notes | 1 |
| 4 | `api/auth/account.js` | ~275 | `/api/auth/register`, `/api/auth/reset-password` (rewrites) | User registration and password reset | 1 / 1 |
| 5 | `api/auth/otp.js` | ~175 | `/api/auth/otp` (POST `{action: send\|verify}`) | MSG91 OTP send / verify for register and reset | 2 |
| 6 | `api/exams.js` | ~180 | `/api/exams`, `/api/exams?fn=chapter` | Exam/syllabus data, and the secure per-chapter fetch used by the reader (checks freemium/lock state, reads the chapter JSON from R2) | 3 (SecureReader, PyqCenter, Dashboard) |
| 7 | `api/jobs.js` | ~130 | `/api/jobs`, `/api/jobs-v2` (rewrite, `?source=v2`) | Job listings (scraped jobs, company extraction) | 4 |
| 8 | `api/payments/actions.js` | ~225 | `/api/payments/create-subscription`, `/api/payments/verify-payment` (rewrites) | Razorpay subscription create and signature verification | 3 / 3 |
| 9 | `api/points/actions.js` | ~190 | `/api/points/actions` (POST `{type: award\|redeem}`) | Points awards (idempotent) and reward redemption | 3 |
| 10 | `api/private-sector/router.js` | ~1,250 | `/api/private-sector/router` (POST `{action}`) | Whole Private Sector module: 14 admin actions (requirements, verifications, interest, recruiter requests, notifications, email) and 8 candidate/employer actions (save profile, submit verification, express interest, submit requirement, recruiter requests, matching candidates) + WhatsApp (MSG91) sender | 9 |
| 11 | `api/profile/recommend.js` | ~475 | `/api/profile/recommend` | Profiling engine: eligibility + scoring run in the function (imports `backend/engine/*`, points catalog) | 6 |
| 12 | `api/v1/router.js` | ~180 | `/api/v1/chat/completions`, `/api/v1/health` (rewrites) | External AI-inference API proxy (`docs/AI_API_USAGE.md`), health check | 0 in app (external callers) |

\* number of `fetch` call sites found in `src/`, counted by URL; approximate.

Helpers (not functions): `api/_lib/emailBroadcaster.js` (~390 lines, SMTP + broadcast), `api/_lib/adminAuth.js` (~385 lines, admin auth handler).

`vercel.json`: every function gets `maxDuration: 60`. Rewrites turn the clean public URLs into `?fn=` / `?source=` calls on the routers, then a catch-all `/api/(.*)` and the SPA fallback `/(.*) -> /index.html`. The local dev server (`vercelApiPlugin` in `vite.config.js`) reads the same rewrites.

## How to add an endpoint without a 13th function
1. Put the handler in `api/_lib/<name>.js` (default-export `async (req, res)`).
2. Add one `if (fn === '<name>') return handler(req, res);` line to the nearest router (`api/admin/misc.js`, or `api/auth/account.js` for non-admin).
3. Add a rewrite to `vercel.json` **above** the `/api/(.*)` catch-all: `{ "source": "/api/x/y", "destination": "/api/admin/misc?fn=<name>" }`.
4. Check: `find api -name '*.js' ! -path '*/_*' | wc -l` must stay **12**.

## Optimisation ideas (not done, for discussion)
1. **Pull the heavy admin API out of the 12.** `save-resource.js` (2,010 lines, 23 actions) pulls in mammoth, the AWS SDK and the DOCX parsers, so its cold start and bundle are the biggest. Admin-only and low traffic. Options: (a) a second small Vercel project (own 12-function budget) for `/api/admin/*`, (b) Supabase Edge Functions or Cloudflare Workers for the R2/upload actions (R2 already lives on Cloudflare), (c) upgrade to Pro (no 12 cap).
2. **Split by weight, not by feature.** One router means the heaviest import cost is paid by every action in it. `save-resource` mixes tiny actions (`books-list`, `theme-fetch-all`) with heavy ones (`docx-preview-convert`, `r2-upload`). Lazy `await import()` of mammoth / S3 / parsers inside the heavy actions would cut cold start for the light ones without adding functions.
3. **`recommend.js` bundles the engine.** It runs eligibility + scoring in-function against Supabase. If its latency matters, cache the exam/eligibility tables in module scope (warm instances reuse them).
4. **Duplicate boilerplate.** Each file re-declares `createClient(...)`, `getSupabaseAdmin()`, secret checks and CORS/headers. A single `api/_lib/supabase.js` + `api/_lib/http.js` would remove ~100 lines and make the admin-secret check consistent (several files use their own `x-admin-api-secret` check; admin auth now also uses bearer tokens).
5. **Hard-coded Supabase URL fallbacks** in `api/exams.js` and `api/jobs.js` (project URL as a default). Not a secret, but it hides a missing-env misconfiguration; prefer failing loudly.
6. **Lower `maxDuration` per function.** 60 s is set for all. Most routes finish in a second or two; the 60 s only matters for `save-resource` (DOCX conversion) and email sends. A tighter default limits runaway cost and hung requests. `vercel.json` `functions` accepts per-file overrides.
7. **Merge candidates if slots are needed again:** `api/auth/otp.js` + `api/auth/account.js` (both small auth flows), `api/admin/legal-aid.js` into `misc.js`, `api/jobs.js` + `api/exams.js` (both small read APIs).
8. **Static data instead of functions.** `/api/exams` and `/api/jobs` are read-mostly; with Supabase RLS-safe public views the SPA could read them directly (as most `lc_*` reads already do), freeing two slots.
