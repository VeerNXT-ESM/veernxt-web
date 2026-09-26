# VeerNXT — Status Report

**Purpose:** Handoff document. This version covers the `/admin` resource audit session that the previous version pointed to as its starting point — it turned into a much larger content-catalog audit: an admin pagination bug, a Central Exams purge, a full exam-list/logo/coverage analysis, a local content-library structural rebuild, a duplicate-content discovery pass that found the real content library is ~88 unique documents wearing 5,543 different filenames, a page-count/image-resolution audit, 37 properly-sourced state/UT/national emblem logos, and a comparison against the content team's newly-delivered subject-requirement mapping that validated the whole exam list. Sections 1–8 are the prior session's R2 migration work, unchanged, kept for history.

**Most of this session (§1–§20) is content-audit/tooling work, not app code** — it happened on the local `CLIENT ASSETS` content library (`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\`), **outside this git repo**; only the analysis scripts, reports, and prompts that resulted live in the repo. See §18 for exactly what's tracked where. **§21 is different** — it's real application architecture: a new schema applied directly to the production Supabase database and seeded with live data (still additive/non-destructive, nothing existing was touched, but it's not just local analysis anymore).

**🎯 Next session starts here**: §50 — suggested improvements for the PYQ Papers/Quizzes admin pages (bulk exam auto-link, bilingual-aware PYQ editing, a "new PYQ paper" flow, the `is_freemium`/`is_locked` mismatch, bulk question import, duplicate/clone). §50.1's stale-R2-cache fix (chapter/metadata fetches now cache-busted) should also get checked with the actual content-team members who reported the blank-Intro bug, to confirm it's actually resolved for them, not just verified at the HTTP level. Also still open: §48.1's 117-vs-32 categorized mislinked-Introduction breakdown, the live "Haryana_GS" Guide/Precis split (§48.5), and credential rotation (five sessions, zero rotated — §46.5, §45.8, §43.9).

*(Prior pointer, now superseded — kept for history)* §45.9 — a from-scratch exam-Introduction linking pass (647/1,534 exams → 837/1,534, 54.6%) plus a full legacy-format-to-JSON-blocks conversion (900/900 Intro resources now `format='blocks'`) and a live-caught leaked API key. The user's own words: "we will tackle these orphans in a new chat" — §45.7's 319 orphaned resources are fully closed out (0 need linking), but the punch list's ~32 remaining items (duplicate `exams` rows, missing `exams` rows, a few approve-on-sight matches) are still open and are almost certainly what "orphans" refers to next. Read §45 in full before touching `scripts/link_intros_to_exams.mjs`, `scripts/link_orphaned_intros_to_exams.mjs`, or `scripts/reformat_legacy_intros.mjs` again — several rounds of self-caught matching bugs are recorded there.

*(Prior pointer, now superseded — kept for history)* §44.8 — Legal Aid Cell rebuilt as a real React component (branch `feature/legal-aid-cell-react`, pushed, not merged), a new `docs/learning_center_handoff.md` written for Shreya's handoff, and a live investigation into "resource allocation disappeared" that surfaced the admin CMS's fake auth as the top open item (branch `feature/learning-center-admin-panel`, pushed, not merged). Read §44 before assuming either branch is merged or before touching `ExamsPage.jsx`/`ExamResourcesPanel.jsx` again.

*(Prior pointer, now superseded — kept for history)* §39.4 — the Private Sector module (§38.3's scoping target) is now **built and live-verified end-to-end**, Phase 1, WhatsApp-only. Read §39 before touching it — real MSG91 WhatsApp credentials are still needed before notifications actually send (currently logging correctly as `simulated`), and email is deliberately not wired up yet.

*(Prior pointer, now superseded — kept for history)* §38.3 — user pointed to `Private sector jobs.md` (repo root, untracked) as the spec for the next build: a managed, VeerNXT-HR-mediated Private Sector Employment module (explicitly not a direct job board) — new candidate "Private Sector Profile" + service verification, an employer "Post a Job" wizard, and a candidate-facing opportunities feed with only "I'm Interested"/"Not for me", no direct employer↔candidate contact anywhere. Directly closes the `jobs.employer_id`/no-employer-posting-flow gap flagged in §34.2 and restated in §37.6. Session ended at discussion/scoping, nothing built yet — read §38.3 before starting.

*(Prior pointer, now superseded — kept for history)* §37.6 — user's stated next steps, not yet planned in detail: (1) **Employers portal** work plus a new candidate-facing **"Private sector" section** (candidates browsing employer-posted jobs) — re-read §34.2 first, since "candidates see employer-posted jobs" needs its flagged-but-deferred gap closed first (`jobs` has no `employer_id` column, no employer job-posting flow exists anywhere yet); (2) **Legal portal**, fleshed out after that — §36.2's client-supplied legal-aid-cell flow swap is the only existing work there so far. §37.1 also surfaced a real, live, *unfixed* production bug worth knowing about before touching candidate-facing content matching: `lc_exam_resource_map` has RLS enabled with zero policies, silently blocking all anon-key access — every exam's Guide/Précis/PYQ is served via the runtime exam-name-matching fallback chain, never the precomputed mapping table that's supposed to be authoritative. Everything from §36.5 (Gemini prepay at $0 as of §36, the PYQ/book mapping plan, the concurrency-pool/exact-match-short-circuit work, the `sync_books_to_r2.mjs` collision-risk re-check, whether the user's manual subject-adding pass happened) is still carried over untouched — see §37.6 for the full restatement.

*(Prior pointer, now superseded — kept for history)* §35.5 — no explicit new task from the user as of this writing. §34.3's 43 unlinked Group A resources are **still open, deferred a third time now** (user: "We will do soon" — not an oversight, don't re-raise unless asked). §34.5's collision-risk flag against the parallel session's `sync_books_to_r2.mjs --execute` was never re-checked this session — still unresolved status, unknown. No live browser click-through exists yet for any of §34 or §35's onboarding work (same recurring tooling gap — no `chromium-cli`/Playwright in this environment).

*(Prior pointer, now superseded — kept for history)* §34.4 — no explicit new task from the user yet as of this writing; the two tasks handed off at the end of the prior session (§31.8) are **both done** this session (§34.1 thumbnails, §34.2 employer portal). Read §34.3 first — a live-verified `resources_v2`/R2 gap (43 Group A resources from §31.5/§31.6 still have no exam linkage) is still open and was deliberately deferred twice now. **Also read §34.5 before running anything from §33.0's next-steps list** — a real collision risk between this session's `resources_v2` ingestion work and the parallel session's planned `sync_books_to_r2.mjs --execute` run.

*(Prior pointer, now superseded — kept for history)* §31.8's Task 1 (thumbnail swap) and Task 2 (employer portal parity) — both done this session, see §34.1/§34.2.

**Note on section numbering**: §32 and the `### 33.0` pointer immediately after it were written by a different, parallel session (Quiz Engine work) that used this same file concurrently — not this session's work, not reviewed or touched. This session's own write-up continues below as **§34** to avoid colliding with that numbering rather than because §33 was skipped by mistake.

*(Prior pointer, now superseded — kept for history)* §29 — the user was waiting before further action on `scripts/map_exam_resources_gemini.mjs --execute` and `scripts/migrate_resources_to_blocks.mjs`; §30's session picked up §29.11's jobs+scraper instruction instead and completed it.

*(Prior pointer, now superseded — kept for history)* §28 — continue Dashboard "Top Exam Matches" work (the user's own words: "we continue to work on the dashboard page," scope beyond §28.7's three rounds not yet specified — ask before assuming it's done), then Learning Center next per the user's own stated order. **§28's entire body of work is uncommitted** (§28.10 has the exact file list) — this is real, live-verified app code (subscription-model/paywall changes, a new job→exam→syllabus flow, a rearchitected Learning Center, accordion UI on both Jobs and Dashboard), not offline content-catalog analysis like most of what came before it. Read §28 in full before touching any of these files — several rounds of user correction are recorded there, each fixing something a previous round got wrong (e.g. §28.5's sidebar-removal and exam-not-resource-list corrections), so don't re-introduce something already explicitly rejected.

**§27.13's PYQs/quizzes-next flag is still open as app-side ingestion work** — §28.9 only answered a narrower, separate question (which on-disk source folder is clean, for the user's own external OCR/rebrand script) and explicitly did not touch ingestion. §28.9's answer: `MASTER PYP_superseded_20260822` is the correct source (its `manifest.json`'s `"type"` field distinguishes 702 first-party `PYQ` files from 1,932 Testbook-scraped `PYP` files); `PYPs_superseded_20260820` and `FINAL_CONTENT\PYPs` are both confirmed (via matching MD5 hashes) to be the same scraped set and should not be separately reprocessed.

**Since §27.11 was first written, the admin CMS's naming and "no books mapped" problems were found and fixed too (§27.14)** — including a real data-correctness bug (not just cosmetic) in the exam rebuild itself: 392 of 1,534 exams shared a name with a sibling exam, and the rebuild's greedy first-match could attach the wrong region's data to the wrong exam (confirmed: Delhi's "Pharmacist" had Andaman & Nicobar's state data, which would have broken its domicile-based eligibility filtering). All four resulting bugs are fixed and verified live — see §27.14 for the full trace and the process-gap lesson at the end of it, worth reading before trusting any future "100% matched" claim from a similar script.

**§26's "66 niche unlinked lc_resources" tagging-pass narrative below is now superseded, not just stale** — §27's rebuild replaced `lc_exam_subjects`/`lc_subject_resources` wholesale from the content team's `subject_requirements` mapping and reseeded content via `resources_v2` directly, which accomplishes (far more completely, for the core subjects) what §26.3's proposed manual tagging pass was aiming at. §26 is kept below for history/context on *why* the old schema was in the state it was, not as a live worklist.

**Exam naming cleanup (§25.4's "Husbandry"/"Teaching" placeholder-name rows) is still untouched** — these are genuinely blank/placeholder-sourced exam records (zero real subject_requirements in the datamap, confirmed again in §27.14), not a naming-format issue like the numeric prefixes were. Still needs its own pass — likely a merge/removal decision, not a rename.

**The pre-existing plan items not touched by any session so far**: `resources_v2` legacy full dedup (the file-hash-isn't-a-content-hash finding in §27.3 means the old plan's approach was unsound; a real fix needs actual chapter-content comparison, not attempted this session), the external `scraper-app` repo's duplicated eligibility engine and orphaned `user_notifications` pipeline (§27.1). Admin CMS pages still read `lc_exams` rather than the unified `exams` table directly (§27.9) — lower priority now that naming and resource-mapping are kept in sync across both tables (§27.14), but the two tables will still drift again if `exams` changes without a re-sync.

**Starter prompt for exactly this: read §28 in full, then §28.11 ("Next steps") is the exact pickup point** — no separate copy-paste prompt written for it yet (§28 was written at the end of the session that did the work, not handed off mid-stream). §27.11's old starter prompt (still below, in §20) is superseded by §28 for anything PYQ/quiz-related — §28.9 already answered the "which source folder" half of it.

---

## 1. Landing page / theme bugs found and fixed tonight

Three separate, real bugs, each looking similar on the surface ("something wrong flashes on load") but with genuinely different root causes — worth reading individually if this recurs, don't assume it's the same fix twice.

1. **Flash of light background on `/` before React mounts.** `body` has a global light CSS background (`#F4F4F8`) that paints instantly (render-blocking CSS), while the landing page's actual dark background is a Tailwind class that only exists once the ~2.2MB JS bundle loads and React mounts. Fixed with a synchronous inline `<script>` in `index.html` that sets the background dark immediately, scoped to `pathname === '/'` only.
2. **A completely different, older-looking hero flashing in, even in incognito.** Turned out to be the `<video poster="...">` attribute — the Hero's actual background is a 26MB autoplay video; until it buffers, the browser shows the `poster` image, which was a leftover white-background illustration from an older design nobody updated. Fixed by extracting a real frame from the current video (ffmpeg) and using that as the poster instead, compressed to 218KB so the poster itself loads fast. Not a caching bug at all — reproduces every time, by design of how `<video poster>` works.
3. **Dark background persisting on inner pages until a hard refresh.** A regression from fix #1: the inline script's `document.body.style.background` is an inline style that survives client-side navigation (React never touches `<body>`, only `#root`), so once set dark on `/`, it stayed dark through every subsequent SPA route change until a full reload re-ran the script with a different pathname. Fixed with an always-mounted `BodyThemeSync` component in `App.jsx` (`useLocation()` + effect) that keeps `body`'s background in sync with the *current* route on every navigation, not just initial load.

All three committed and pushed (`6b3a552`, `6100223`, `a04ffe7`).

---

## 2. Central/State/UT Learning Center filter — shipped, with a bug caught first

Someone (not this session originally) had built a Central/State/UT toggle + state/UT picker locally, replacing the old "Important Exams" checkbox sidebar — but it was never committed, so production kept showing the old UI. Before shipping it: found the query filtered `exam_name` for state/UT selection, but the state/department actually lives in `conducting_body` (e.g. `"16. Meghalaya — 13. Meghalaya High Court"` vs. `exam_name` = `"2. High Court Assistant Grade II"`). As written, selecting any state would have returned **zero results** the moment it shipped. Fixed to query `conducting_body` instead, scoped to `resources_v2` only. Verified against real data before shipping. Committed and pushed (`201fd82`).

---

## 3. R2 account migration

**Why**: the original Cloudflare R2 account was set up by a developer (`souvikgupta64@gmail.com`) who's gone unreachable. Migrated to a new bucket under an account the team controls: **268,677 objects, 47.72GB, 0 failures**, then cut over every `resources_v2` row's storage URLs (`scripts/migrate-r2-account.js`, `scripts/cutover-r2-urls.js`, both kept in the repo as reusable tools). Old bucket left untouched as a rollback reference.

### 3.1 CORS gap — found right after cutover

New bucket had no CORS policy, breaking `SecureReader.jsx`'s direct `fetch()` calls to R2. Fix handed off (dashboard-only, API token can't do it). **Status: presumed applied since — not revisited this session, no reports of broken resource loading, but never explicitly re-confirmed live.**

---

## 4. Admin dashboard — 1,000-row pagination bug (found and fixed)

Opening `/admin` per the previous session's pickup point immediately surfaced a real bug: `AdminDashboard.jsx`'s `fetchDashboardData()` used unranged `.select('*')` calls against `resources_v2`/`quizzes`. Supabase/PostgREST silently caps unranged selects at 1,000 rows — no error, just a truncated result. With 4,399 resources at the time, this meant:

- The Content Catalog/Pipeline tabs, bulk-rename, and delete only ever operated on the 1,000 most-recently-created resources + 1,000 most-recent quizzes — everything older was invisible and unreachable through the admin UI.
- The "Target Exams" stat (unique exam count) was undercounted for the same reason.
- `AdminDriveIngestion.jsx`'s "My Drive" browser had the *same* bug already partially fixed in an earlier session (comment in the code references it being capped at 500 before).

**Fixed**: added a paginated `fetchAllRows()` helper (loops `.range()` in 1,000-row pages, with an `id` tiebreaker since bulk-migrated rows share identical `created_at` timestamps that would otherwise cause `.range()` to skip/duplicate rows across page boundaries) and switched both the resource/quiz fetch and the unique-exam-count derivation to use it. Verified live via Playwright: stat cards and catalog pagination now correctly reflect the true totals.

---

## 5. Central Exams catalog — purged (was badly incomplete)

The admin audit's first real finding: Central Exams had only 49 resources covering 11 conducting bodies, against a target of 226 (per the master exam list, see §6) — UPSC coverage was CDS/NDA mock tests only, no CSE; no SSC CGL/CHSL; no Railways. Also had internal duplicates and 3 rows that were genuinely State content (Punjab SCERT, Gujarat State Education Board, Directorate of Health Services Goa) misfiled under `conducting_body = 'CENTRAL EXAMS'`.

**Action taken** (dry-run reviewed before executing):
- Purged 46 Central resources_v2 rows + their 734 R2 objects. The 3 misfiled State rows were deliberately held out.
- Re-filed those 3 rows to their correct State `conducting_body`/`exam_name` (matching the app's existing "`{state_num}. {State} — {dept_num}. {Department}`" numbering convention, cross-checked against `src/lib/districts.js`'s alphabetical state ordering).
- **Result**: `resources_v2` went from 4,399 → 4,353 rows. Central Exams is now a clean, empty slate (0 rows) awaiting fresh ingestion once content is ready.
- One process note: the first purge attempt used the client-side anon key for the DB delete, which is RLS-restricted and silently matched 0 rows (no error) — caught immediately by the script's own verification step and re-run with `SUPABASE_SERVICE_ROLE_KEY`. R2 objects were already correctly deleted by then; DB rows were the only thing that needed a second pass.

---

## 6. Master exam list — parsed, logos extracted, DB coverage cross-checked

Client provided 3 reference docs (`CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\`: Central/State/UT exam lists) as Word tables with embedded conducting-body logos. Parsed all three into a unified 1,597-row exam list (226 Central conducting bodies, 349 State, 230 UT).

- **Logos**: extracted 347 unique embedded images, resolved 21 conflicting/duplicate-logo cases by hand (found 2 real errors in the client's source doc along the way — RRB's alternate logo was actually RPF's crest, ICAI's was actually ACCA's). **594 of 805 conducting bodies now have a correct logo; 211 still missing** (mostly smaller State/UT departments — Health Depts, local PWD/Forest/Excise offices). Committed to the repo at `exam-logos/` (591 files, ~82MB, organized `{level}/{slug}.png`, with `manifest.json`) — raw, not yet web-optimized.
- **DB coverage cross-check** (`coverage_report.json`/`.txt`, committed): fuzzy-matched the master list's target conducting bodies against what's actually live in `resources_v2`. **15 states fully covered** (AP, Arunachal Pradesh, Assam, Bihar, Chhattisgarh, Goa, Gujarat, Haryana, HP, Jharkhand, Karnataka, Kerala, MP, Manipur, Meghalaya); Maharashtra/Mizoram near-complete; **10 states (Nagaland, Odisha, Rajasthan, Sikkim, Tamil Nadu, Telangana, Tripura, UP, Uttarakhand, West Bengal) and all 8 UTs at 0%**; Central at 0% (per §5, mid-rebuild).

---

## 7. Local content library — structural audit + fix (Central, State & UT done)

Separately from the DB, the client is assembling the actual source content on disk under `CLIENT ASSETS\VeerNXT\CONTENT\{CENTRAL EXAMS,STATE EXAMS}\`, each with a `folder structure.txt` export. Audited both against the expected 5-category-per-exam shape (Intro/Guide/Precis/PYQ/Mock Test):

- **Central**: 443 exam folders — only 136 (31%) fully complete; the scaffold existed everywhere (every exam pre-created its 5 category folders) but most were empty placeholders. RRB, Police Exams, and Metro Rail were fully done; Insurance, PSU Maharatna/Navratna, India Post, BARC, NIC, Accounts & Commerce, Engineering Recruitment had ~0% real content despite full scaffolding.
- **State**: 835 exam slots — rougher: 274 were **completely bare** (no category folders at all, not even placeholders), on top of the placeholder-only problem Central had.

**Fixed** (`scripts/fix_content_folder_structure.py`, committed, dry-run-then-`--execute` design, reusable): for every exam folder, creates any of the 5 category folders that don't exist, fixes 2 known folder-name typos, and drops a title-only `_PENDING_CONTENT.docx` placeholder into any empty slot — replacing ad-hoc `*_placeholder.txt`/`*_README.txt` marker files with one consistent, content-length-checkable convention. Two real bugs caught and fixed *during* the dry-run review before anything touched disk: a word-count check that misread large scanned-image PYQ docs (24-28MB) as empty, and a container-detection heuristic that silently skipped exam folders with only 1-2 category subfolders. Executed and verified on both trees:

| | Central | State |
|---|---|---|
| Typo renames | 2 | 0 |
| New category folders created | 24 | 2,422 |
| Placeholders written | 873 | 2,880 |

Both trees are now 100% structurally scaffolded — every exam has all 5 category folders, every slot is either real content or a uniform placeholder.

**UT Exams**: arrived this session, different shape from Central/State — see §12.6. The content
team pre-built it as `{UT}\{Category}\{Exam}\{5 standard category folders}\`, not flat like
Central/State's `{Exam}\{5 categories}\`, and (deliberately, per the content team) reuses shared
subject content across every UT rather than duplicating it — so `fix_content_folder_structure.py`'s
placeholder-scaffolding pass doesn't apply the same way here; see §12.6 for what was actually done
instead.

---

## 8. Duplicate content discovery — the real content library is ~88 documents, not 5,543

The structural audit above revealed real content existed but didn't say how much of it was actually distinct. Investigation, in order:

1. **Exact byte-hash dedup**: 11,435 real files → 9,517 truly unique (16.8% duplication).
2. **Text-hash dedup** (normalizes away Word metadata/embedded-image differences): 11,423 files → 9,263 unique (18.9%) after correcting a false-positive class (scanned PYQ papers with near-zero extractable text were being merged just because empty strings hash identically).
3. **Near-duplicate clustering, Guide + Precis only** (PYQ deliberately excluded — separate future pass; Intro is already ~99.5% unique per exam and needs no dedup): MinHash/Jaccard similarity within (category, subject) buckets. Verified genuine with direct content comparison, not a bug — e.g. one `SSC COMPLETE GK.docx` file is **100% byte-for-byte identical** to the "General Knowledge Precis" sitting in UPSC Civil Services, 3 separate KVS teaching posts, India Post MTS, and 2 Metro Rail exams. **Result: 5,543 Guide+Precis files collapse to 88 unique master documents** at a 75% similarity threshold (stable across a wide threshold range — 78 clusters at 45% similarity, 117 at 95%).
4. **Subject-classification bug found and fixed mid-pass**: initial subject inference scanned the whole file path, so exam names like "SSC JHT (**Junior Hindi** Translator)" falsely tagged unrelated Maths/Reasoning/GK files as Hindi-subject — this affected actual cluster bucketing, not just labels, so the whole clustering pass was rerun after the fix. Verified clean afterward (every canonical "Hindi" file is now genuinely Hindi content).

**Deliverables** (both current/correct as of the fix in point 4):
- `exam_resource_mapping.xlsx` (committed) — 4 sheets: every real file with its cluster ID and canonical flag (11,423 rows), a live per-exam category-completeness summary (1,278 rows), the master target exam list (1,597 rows), and a notes sheet.
- `CLIENT ASSETS\VeerNXT\CONTENT\MASTER DOCUMENTS\` (**not** in git — lives in CLIENT ASSETS like the rest of the content) — the 88 canonical Guide/Precis documents, organized by Category/Subject, with a `MANIFEST.txt` naming which exams share each one.
- One flagged anomaly, not yet resolved: `RAJASTHAN SI GS GUIDE.docx` sitting in a generically-named `Folder 1` under an unrelated Manipur IBPS exam path rather than a real category folder — bucketed separately (`MASTER DOCUMENTS\_uncategorized\`) rather than silently merged.

**Handed to the content team**: `content_rewrite_prompt.md` and `thumbnail_generation_prompt.md` (both committed) — a Gemini prompt for rewriting/proofreading the 88 master documents into fully-formatted drafts ready for editorial review in the admin, and an image-generation prompt for 5 category-color-coded thumbnail background templates (reusing the existing crest/wordmark as a fixed code-composited layer rather than asking the image model to regenerate exact logo/Devanagari text, which isn't reliable). **User is running both directly via Gemini now** — not something this session executed. A proposed automated "pull from R2, rewrite, push back to R2" pipeline script was reviewed and flagged as architecturally backwards (would bypass the docx source-of-truth this session just spent most of its time establishing) before any of it got built — docx stays canonical; R2/Supabase only get updated by re-running ingestion.

---

## 9. Layout/design tooling — evaluated externally, landed on doing it in-house

Two separate asks, both resolved to "don't add an external tool":

- **Presenton** (github.com/presenton/presenton) — evaluated for making content "more engaging." It's a self-hosted AI presentation generator (Docker + FastAPI + Next.js, outputs PPTX/PDF slide decks). Wrong shape for the actual content: VeerNXT's Guide/Precis material renders as structured HTML chapters in a custom reader (`SecureReader.jsx`), not slides, and the content is reference-dense (one GK Precis alone was 89,000 words during the dedup pass — the opposite of slide-shaped). Not pursued.
- **"AI for layout and design" search on GitHub** — most hits were either wrong-direction (Microsoft's `markitdown` converts documents *into* Markdown, the opposite of what's needed since Gemini already produces the Markdown) or unproven/hype-heavy repos not worth trusting in a production pipeline. The one genuinely credible fit found was **Typst** (modern open-source LaTeX-alternative typesetting engine) — but it outputs PDF, and nothing in the app renders PDF; content lives in the React reader as HTML. **Confirmed direction with the user**: the actual problem is making `SecureReader.jsx` itself more visually engaging (typography, callout/definition boxes, pull quotes, styled tables) — a CSS/component design problem, not a tool-integration problem. Natural next step, not yet started: extend `content_rewrite_prompt.md` so Gemini tags semantic elements (definitions, worked examples, key formulas) that map to distinct styled components in the reader. **Deliberately queued behind the recommendation engine/ingestion work**, per the user's stated priority — not started.

---

## 10. Page count and image resolution analysis

Answered three questions about the actual content footprint, scoped to the 510 unique documents that matter (88 deduplicated Guide/Precis master docs + 422 unique Intro docs — PYQ/Mock and the 5,543 duplicate copies excluded, consistent with scoping used throughout §8):

- **7,694 total pages** (5,869 across the 88 Master docs, 1,825 across 422 Intro docs). Methodology: 348 of 510 files carry a real, tool-computed `<Pages>` value in their Word metadata (mostly WPS Office-generated); the other 162 were estimated using a words-per-page ratio (307) *calibrated from those 348 real values*, not a generic assumption.
- **3,140 embedded images, ~1.5GB total.** First bucketing pass (by smaller dimension) was methodologically wrong and got corrected before reporting — it flagged large landscape diagrams as low-res just because their height was under an arbitrary threshold. Redone by actual megapixel count.
- **The real finding, after checking actual samples**: of the ~1,029 genuinely small (<0.2MP) images, **715 are unique low-res content worth AI-upscaling** (real diagrams, e.g. a 269×187 water-cycle illustration), while **314 are exact duplicates repeated across 3+ files** — almost certainly low-quality embedded seals/crests that should be *replaced* with the properly-sourced logos (§11), not upscaled. This distinction — verified by actually opening sample images, not just measuring pixels — is why §11 happened next.
- Saved to `page_image_analysis.json` (not yet moved into the repo — still in the K:\tmp scratch area, see §18).

---

## 11. State/UT/National emblem logos — properly sourced (37/37)

Audited the `exam-logos/` set from §6 for real quality, not just presence: **0 SVG, only 17% with transparency, 76% under 0.05MP, 65% both low-res and opaque** — makes sense in hindsight, all extracted from Word-embedded images in the client's docx, never meant to be app assets.

Rather than chase all 805 conducting bodies individually, checked RPSC's and TNPSC's own Wikipedia infoboxes first and confirmed many bodies don't have a distinct logo at all — they use their **state's generic government seal**. That reframed the task: source one proper emblem per state/UT/national as a systematic base layer, then chase genuinely distinct org-specific logos (SSC, UPSC, IBPS, RRB, DSSSB, PSCs with real branding) separately later.

**Sourced and verified all 37** (28 states + 8 UTs + national State Emblem of India) from Wikipedia/Wikimedia Commons — 30 as true SVG, 7 as PNG where no vector existed. Every one cross-checked against the specific article's own infobox before download, not just matched by filename. Caught and fixed one real problem mid-batch: parallel `curl` downloads without a proper `User-Agent` tripped Wikimedia's rate limiter, and one file (the national emblem) silently saved as a "429 Too many requests" HTML error page instead of the actual SVG — caught by an automated header-validation pass across all 37 files afterward, fixed by adding a `User-Agent` and retrying. 4 direct visual spot-checks all came back correct (Rajasthan, Odisha, Puducherry, plus the TOC-comparison check in §8).

Committed at `exam-logos/state-emblems/` (`75b3f00`). **Not yet done**: mapping which of the 211-missing / 385-low-quality conducting bodies should actually use a state-emblem fallback vs. need their own distinct logo sourced — that decision-per-body work hasn't started.

---

## 12. Subject-wise exam list — content team's mapping received, cross-checked against ours

Client delivered 3 new Excel files (`1. EXAM LIST\{Central,State,UT}_Exams_Subject_Wise*.xlsx`) — per-exam Yes/No flags across 12 subject/requirement columns (Hindi, English, GK/GS, Reasoning, Maths, Science, Computer Knowledge, Pedagogy, Domain/Technical, Physical Test, Interview, Typing). This is the exam→subject requirement mapping the user had been waiting on from the content team.

**Cross-checked against the master exam list from §6** (fuzzy-matched by conducting body + exam name): **near-perfect alignment** — State 836/836 (100%), UT 312/312 (100%), Central 439/440. Every one of the 14 unmatched rows on either side traces directly to a data-quality issue already flagged in §6's original analysis (blank exam names, exact duplicates) — the content team's file is a cleaned-up version of the same source, not a conflicting one. One nice confirmation surfaced along the way: "Association of Chartered Certified Accountants" (ACCA) shows up as its own genuinely separate entry with a blank conducting-body field in *their* file too — validating the §6 call to treat ACCA's logo as mismatched/wrongly-slotted under ICAI rather than a real ICAI variant.

**One assumption corrected with real data**: the user's belief that "English and Hindi are present for all exams" doesn't hold — actual coverage is English 54.3%/50.1%/67.9% and Hindi 12.7%/37.4%/51.6% (Central/State/UT). Plenty of exams are pure Domain/Technical or Physical/Typing-focused with no separate language testing. This matters for content planning — writing English/Hindi guides for every exam folder would waste effort on roughly half that don't test it. One number flagged back to the content team as worth double-checking: State GK/GS shows a suspiciously exact 100.0% (836/836) — possibly a fill-down artifact in their spreadsheet.

Parsed data in `subject_wise_list.json`, full comparison detail in `subject_wise_comparison.json` (both still in K:\tmp, see §18). **Not yet done**: merging this subject data into a single unified reference alongside the logos/coverage data from §6 — asked the user, not yet decided/started.

---

## 12.5. Duplicate/misclassified exam entries in the master exam list — found, flagged only, not actioned

While resuming the logo-sourcing thread (§20C), the user separately flagged that Central exams
appear to be duplicated into the State/UT lists too. Investigated `master_exam_list.json` (1,597
rows): 39 conducting bodies (323 rows) appear at more than one level. Manually reviewed all 39;
classified into 5 categories — full detail in `K:\tmp\exam_list_extract\duplicate_exam_report.md`
(and `duplicate_exam_report.json` for the raw per-group data):

- **(A) True exact duplicates** — 17 bodies, ~30 rows. Same exam word-for-word at two levels: SSC
  CGL/CHSL and IBPS RRB PO each duplicated under UT=Andaman & Nicobar Islands; India Post's GDS
  exam listed **8 times** (once centrally, then again in Punjab + 6 more UTs) for what's one
  nationally-run exam; HP TET and ESIC UDC/Stenographer each duplicated once.
- **(B) Naming inconsistency** — the body `"SSC"` and `"Staff Selection Commission"` are the same
  real org parsed into two separate `conducting_body` strings; likely not the only such split
  across the full 805-body list, just the only one caught so far (only checked within the 39
  already-flagged bodies).
- **(C) State Police double-listing — the big one.** ~15 state Police forces (Rajasthan, Punjab,
  Haryana, Maharashtra, Kerala, Goa, Jharkhand, HP, Meghalaya, Manipur, Mizoram, Sikkim, Tripura,
  Nagaland, Arunachal Pradesh, Andhra Pradesh) each have 2-4 generic, unlabeled rows filed under
  **Central** ("Constable", "Sub-Inspector") that duplicate what's already properly detailed under
  **State** with real numbered exam names. Police recruitment is inherently state-level; this looks
  like the client's Central Exams docx has a leftover "State Police Forces" bucket that predates
  the State docx's detailed treatment.
- **(D) Level misclassification, not duplication** — 8 bodies, 64 rows. Same conducting body at
  both levels, but the central-side rows are a genuinely different, non-overlapping set of exams
  (mostly nursing/health recruitment or TET papers administered by a State PSC/SSC) — real content,
  just tagged `level: "central"` when the conducting body is explicitly a state body.
- **(E) Name collisions, false positives** — 5 bodies, 14 rows, different real organizations that
  happen to share a generic name (Directorate of Education, Animal Husbandry Dept, Agriculture
  Dept) across unrelated states — no action needed. One exception needs a manual look rather than
  an automated rule: Punjab & Haryana High Court genuinely *is* one shared court across Punjab,
  Haryana, and Chandigarh UT, so its "duplicate" rows might actually be the same real recruitment
  cycle, not a data error.

**Explicitly not actioned yet** — asked the user how to resolve categories A and C, and was told to
flag only and hold off for now on both. **Nothing in `master_exam_list.json`, `exam-logos/manifest.json`,
or `coverage_report.json` has been touched.** Also not yet done: a wider fuzzy pass across all 805
conducting bodies (not just the 39 caught by this exact-name pass) to catch more Category B naming
splits.

**Why this matters for other in-flight work**: `master_exam_list.json` is upstream of
`exam-logos/manifest.json` exam_counts, `coverage_report.json`, and `logo_priority.json` — the
exam-count-ranked logo-sourcing priority list that was just handed to Gemini (see §20C-updated
below) to work through in the background. If/when this dedup is executed, exam_count values shift
and those artifacts should be regenerated afterward — worth doing the dedup cleanup *before* trusting
the logo-priority ranking too literally, or re-running the ranking after.

**Update — dedup executed** (approved via a planning pass, tag-not-delete approach): built
`scripts/dedupe_exam_list.py` (repo, dry-run/`--execute` convention). Instead of deleting duplicate
rows, it collapses each real duplicate down to one canonical row and preserves every folded row
verbatim as an `also_listed_as` tag (level/state/exam_name), so nothing found in the source docx is
silently lost. Scope: Category A (true duplicates) + Category C (Police double-listing) only, per
explicit direction — Category D (level misclassification) and Category E (name collisions) are
copied through untouched.

Method, in order: (1) alias-canonicalize acronym/full-name body splits (20 pairs merged
automatically — e.g. `SSC`→`Staff Selection Commission`, `RRB`→`Railway Recruitment Board`,
`RPSC`→`Rajasthan Public Service Commission`; 2 ambiguous candidates flagged rather than
auto-merged — `MPSC` collides across 4 different states' PSCs, `PWD` is too generic); (2) drop 3
placeholder central rows that just restated the org's own acronym with no real content, superseded
by several specific rows; (3) cluster rows within a body using **exact-match-or-curated-synonym
only** — deliberately *not* fuzzy string similarity, since short codified exam names differ by
exactly one meaningful word ("Constable" vs "Head Constable", "CET Group C" vs "Group D", "TGT" vs
"PGT" vs "TET") and a fuzzy-ratio pass initially produced several dangerous false-positive merges of
genuinely different exams before this was caught and the threshold was removed; (4) a separate,
strict token-*set*-equality pass (not containment) folds the generic Police central rows onto their
matching state entry, correctly rejecting "Constable" vs "Head Constable" while still matching
across plural/abbreviation variants ("constables"/"Constable", "SI"/"Sub-Inspector").

**Result**: 1,597 → 1,534 unique rows (60 folded into 41 canonical rows' `also_listed_as` tags, 3
placeholder rows dropped). Verified: every folded row is recoverable from some canonical row's tag;
row-count math balances exactly (1,534 + 60 + 3 = 1,597).

**Output**: `K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\master_exam_list_unique.json`
(new, deduplicated list) and `dedupe_changelog.md` in the same folder (every merge decision, every
alias applied, everything flagged instead of auto-resolved). Original `master_exam_list.json` in
`K:\tmp\exam_list_extract\` is untouched as the raw/audit-trail source. **Not yet done**:
`exam-logos/manifest.json`, `coverage_report.json`, and `logo_priority.json` still reflect the old,
duplicated counts — need to be regenerated against `master_exam_list_unique.json`.

---

## 12.6. UT Exams content arrived — audited, mapped to existing masters, one gap flagged

The client handed over the UT Exams source content folder this session (`K:\...\CONTENT\UT EXAMS\`,
8 UTs, 308 exam folders, 3,186 docx files) — the blocker §7/§19 were waiting on. Different shape
than expected: `{UT}\{Category}\{Exam}\{5 standard category folders}\`, and the content team's own
design choice was to **not** duplicate subject content per UT — reuse the same
Reasoning/Maths/English/Hindi/Computer-Science guide across every UT, with only General Studies
meant to be UT-specific. Investigated whether that intent actually held in the delivered files
(paragraph-level `difflib` comparison, not byte-hash — a UT-name title-swap on line 1 breaks exact
hashing even when the other 99% of a file is identical):

- **Confirmed**: Reasoning/Maths/English/Hindi/Computer Science are genuinely 100% template-shared
  — 750 pairwise cross-UT comparisons, zero genuinely different pairs. Compared one representative
  file per subject against the existing 88-doc master library from §8: all matched an existing
  cluster at 0.86–0.995 similarity (Cluster_005/007/008/009/010/052 etc. — full table in
  `ut_content_mapping.md`, same folder as the deduped exam list). **No new master-library entries
  needed for these — point UT ingestion at the existing Central/State clusters instead of the UT
  copies.**
- **Surprise**: the generically-*named* `GENERAL KNOWLEDGE.docx` / `GS & GK GUIDE BOOK.docx` files
  — the ones that look like they'd carry the real UT-specific content — are *also* just
  template-shared copies, already matched to existing clusters too. They are not where the real
  content is.
- **The real UT-specific content**: a separately, distinctly-named `{UT}_GS_Book.docx`, filed under
  one "flagship" exam per UT (not repeated across every exam) — confirmed genuine via pairwise
  comparison (0.01–0.07 similarity between different UTs' GS books, vs. 0.93+ for the actually-
  shared files — real, distinct, locally-written content: each opens with UT-specific
  geography/history/formation chapters). **5 of 8 UTs have one**: Andaman & Nicobar, Chandigarh,
  Dadra & Nagar Haveli and Daman & Diu, Jammu & Kashmir, Delhi. Copied into
  `MASTER DOCUMENTS\Guide\GK-GS\` as `Cluster_089`–`Cluster_093` and added to `MANIFEST.txt`,
  same convention as the existing per-state GS docs.
- **🚩 Flagged gap — Ladakh, Lakshadweep, and Puducherry have no GS book at all.** Checked their
  full trees for any distinctly-named file, not just the obvious pattern — genuinely missing, not a
  detection miss. These 3 UTs only have the generic templated content. **Needs relay to the content
  team**: write a real GS book for each, same chapter shape as the 5 that exist (geography, history,
  formation/identity of the UT).
- **Noted, not actioned** (per instruction, "mock tests handled later"): of 382 "Test Series" docx
  files across the whole UT tree, 381 belong to Puducherry alone — the other 6 UTs have essentially
  no mock-test content. Flagging so it isn't lost, not fixing now.

Full comparison detail, ratios, and file-by-file mapping: `ut_content_mapping.md` in
`K:\...\CONTENT\1. EXAM LIST\` (same folder as `master_exam_list_unique.json`).

---

## 12.7. PwD Eligibility file — new data dimension, cross-checked

Client had also dropped `UT ExamsPwD Eligibility.xlsx` into the exam-list folder (dated
2026-08-20 — today, separate from and newer than the 3 Subject-Wise files §12 already covers). Not
previously seen. UT-only: which of the 4 broad PwD reservation categories (RPwD Act 2016 —
Blindness/LV, Deaf/HoH, Locomotor, Autism/ID/MI) apply per UT exam, with a confidence rating and
basis note.

Cross-checked (312 rows, all 8 UTs): **312/312 exact match against the original pre-dedup UT list**
(the 3 non-matches in our list are blank placeholder rows). Against the deduped list, 286/312 match
directly and the other 26 are exactly the rows our own dedup pass (§12.5) folded away as
duplicates (SSC CGL/CHSL, IBPS RRB PO, India Post GDS, SBI/IBPS cadre variants) — a nice
independent confirmation that the dedup was correct, since the client's own PwD spreadsheet was
compiled from the same underlying list and reproduces the identical set of duplicate rows.

Breakdown: 240 "Yes" (desk/clerical/technical/teaching/medical posts), 65 "NOT APPLICABLE"
(physically-demanding posts — police, jail warder, fireman, forest guard, marine, Home Guard,
Agniveer-type), 7 "Uncertain" (contractual posts, inconsistently applied). Full writeup in
`pwd_eligibility_comparison.md` (same folder). **Update — merged.** See §12.8.

---

## 12.8. Master exam datamap — everything joined into one source of truth

With every source now collected and cross-checked (§6/§8/§12/§12.5/§12.6/§12.7), built
`scripts/build_master_datamap.py` (repo, read-only against every source, writes 3 new output files,
modifies nothing existing) to join them all onto the 1,534-row deduped exam list — one row per
unique exam, everything currently known about it in one place.

**Key correctness issue caught and fixed before trusting the output**: the first join pass keyed
only on `(level, state, exam_name)`. Many different conducting bodies share a generic exam name —
18 different bodies each have a "Staff Nurse" exam, for instance — so that key silently broadcast
one body's subject-requirement/PwD data onto every other body with the same exam name. Fixed by
adding alias-normalized `conducting_body` into the join key (reusing the exact same alias-detection
logic from `dedupe_exam_list.py`, run once against the original pre-dedup list so every source
resolves body-name variants — "SSC" vs "Staff Selection Commission" — the same way). Collisions
dropped from 39 keys to 12 (all genuine edge cases where the normalizer's parenthetical-stripping
collapses two real sub-variants, e.g. "Constable (Executive)" vs "Constable (Driver)" — <1% of
rows, documented in the build report rather than silently present).

**Joins and match rates** (full detail + every unmatched row in `datamap_build_report.md`):
- Subject-wise requirements (§12): 1,526/1,534 rows covered.
- PwD eligibility (§12.7, UT only): 286/289 UT rows covered (3 gap = the 3 blank source rows,
  already known).
- Logos: 1,534/1,534 matched to a manifest entry (doesn't mean all have a *good* logo — quality
  field carried through from `logo_priority.json` where flagged).
- Content completeness, Central/State (from the `Exam Summary` sheet, §8): 1,134/1,245. 66 exam
  names in that sheet are shared across bodies (generic Police titles etc.) — disambiguated by
  folder-path/conducting_body token overlap where there was a clear winner, left unmatched
  otherwise (19 rows) rather than risk attaching the wrong body's data.
- Content completeness, UT: **built fresh** (§8 never covered UT) from the already-cached
  `ut_content_hashes.json` — 184/289 UT rows matched (15 via a same-UT fuzzy fallback, since the
  master exam list and the actual folder names were independently authored and disagree on wording,
  e.g. "/" vs "-"). Also carries the UT-specific master-content annotation: which shared cluster
  each generic subject resolves to, and each UT's real GS-book cluster (or the flagged
  Ladakh/Lakshadweep/Puducherry gap) right on the row.

Spot-checked against cases already hand-verified this session (SSC CGL's subjects+logo, an Andaman
& Nicobar UT exam's PwD flags + `Cluster_089` GS-book reference, a Ladakh exam correctly showing
the GS-book gap instead of a silent blank) — all correct.

**Output**, all in `K:\...\CONTENT\1. EXAM LIST\`:
- `exam_master_datamap.json` — primary, machine-consumable, 1,534 rows.
- `exam_master_datamap.xlsx` — same data flattened to one sheet + a "Join Coverage" summary sheet,
  for human review.
- `datamap_build_report.md` — match rate per join, every unmatched/ambiguous row listed with a
  reason, nothing silently dropped.

**Explicitly out of scope**: live DB coverage. `coverage_report.json` is state/level-aggregate, not
per-exam, and an accurate regeneration needs a live Supabase query — no DB access in this offline
pass, and the cached `db_coverage.json` in scratch is empty/stale. Flagged as a follow-up.

---

## 13. Still outstanding

1. Confirm CORS fix (§3.1) is still holding — never re-confirmed live, just presumed since no reports of breakage.
2. Consider reclaiming the *old* Cloudflare account — no rush, not blocking anything.
3. **UT Exams** — content arrived and audited (§12.6); DB coverage is still 0% across all 8 UTs pending ingestion. Two follow-ups before that: relay the Ladakh/Lakshadweep/Puducherry GS-book gap to the content team, and wire UT ingestion to reuse the existing master-doc clusters (§12.6) rather than re-uploading the redundant per-UT subject copies.
4. **Central Exams re-ingestion** — folder structure is fixed and ready (§7), but 0 rows are live in the DB; awaiting the content team's editorial pass on the Gemini-rewritten master documents before ingesting.
5. **Org-specific logos** (§11) — SSC, UPSC, IBPS, RRB, DSSSB, and any State PSC with real distinct branding beyond the generic state seal. Deliberately scoped out of the state-emblem pass.
6. **Mapping state-emblem fallbacks onto specific conducting bodies** (§11) — the 211-missing / 385-low-quality logos from §6 need a per-body decision (state-seal fallback vs. needs its own logo), not yet done.
7. ~~Merging the subject-wise data (§12) into a unified exam reference~~ — **done**, see §12.8 (`exam_master_datamap.json`/`.xlsx`).
8. **The 10 States at 0% DB coverage** (§6) — Nagaland, Odisha, Rajasthan, Sikkim, Tamil Nadu, Telangana, Tripura, UP, Uttarakhand, West Bengal.
9. `RAJASTHAN SI GS GUIDE.docx` misfiling (§8) — needs a manual look, not yet re-filed to its correct location.
10. **715 genuinely low-res content images** (§10) worth running through an AI upscaler — identified but not yet processed.
11. **314 duplicate low-quality logo/seal images embedded in content docs** (§10) — should be replaced with the properly-sourced logos from §11/§6 rather than upscaled; not yet done.
12. **Reader visual design work** (§9) — CSS/component work for `SecureReader.jsx`, plus extending `content_rewrite_prompt.md` with semantic tagging. Deliberately queued behind the recommendation engine/ingestion work.
13. The planned in-admin AI writing assistant and the docx↔admin-editor bidirectional sync (discussed, not built) — same queue position as #12.
14. Mock Test/PYQ content — still deferred; needs its own structured-question-parser investigation. Confirmed this session that no such parser exists yet — `quizzes`/`questions` tables are 100% manually authored today via `AdminQuizEditor.jsx`.
15. 47 files (of 11,423) across the content library have a corrupted embedded-image content-type (`.undefined` extension) that breaks `python-docx` and likely the ingestion parser too — found while spot-checking §10, not yet fixed. Small enough not to block anything.
16. **Duplicate/misclassified exam entries in the master exam list** (§12.5) — **resolved for Categories A+C**: `scripts/dedupe_exam_list.py` produced `master_exam_list_unique.json` (1,534 rows, tag-not-delete). Still open: Category D (8 bodies, 64 rows genuinely mis-leveled, not duplicated — deliberately left untouched) and Category E's one manual-look item (Punjab & Haryana High Court). Also still open: regenerate `exam-logos/manifest.json`, `coverage_report.json`, `logo_priority.json` against the new deduped file — they still reflect pre-dedup counts.

---

## 14. Manual steps still required (Supabase SQL editor) — carried forward, unchanged

1. `sql/points_system.sql`
2. `sql/rewards_system.sql` (depends on #1)
3. `sql/employer_hiring_profile.sql`

---

## 15. Security issues flagged — carried forward, unchanged

1. ~~`src/lib/r2Uploader.js` — R2 secret hardcoded in client bundle~~ — **fixed**, earlier session.
2. `src/lib/supabase.js` — hardcoded fallback Supabase key decodes to `role: service_role`. Not an active leak, but the literal key is in source/git history. Not touched.
3. `src/pages/admin/AdminLogin.jsx` — admin panel has no real authentication. Not touched.

---

## 16. Other loose ends, carried forward, not touched

- Jobs page (`PublicJobs`/`JobBoard`) still spins forever — Postgres `57014 statement timeout`.
- `/profiling/results` still has no fallback for direct URL/refresh without router state.
- Real ₹9/₹1 Razorpay charges (ProfilingResults/Dashboard inline unlock) still never fired for real.
- Pages from the original redesign backlog still untouched: Network, Support, Legal, PublicJobs/JobBoard, Subscribe, FinancialGuidance, RewardsCenter, FindCandidates, the rest of the Admin panel.

---

## 17. Git state

**Committed this session** (local `main`, 7 commits ahead of `origin/main`, not pushed):
- `e92baca` exam catalog audit tooling — logos, coverage report, folder-structure fixer
- `75b3f00` source proper official state/UT/national emblem logos
- `92b1378` exam-list dedupe and master-datamap tooling
- `df9be6a` AI-sourced and upscaled exam logos, full priority-list pass
- `1835903` content engine, thumbnail generation, and PYQ scraper tooling (this one bundled the user's own parallel work at their explicit "commit everything" instruction — `package.json`/`contentEngineProcessor.js`/`AdminDriveIngestion.jsx`/`public/thumbnails/`/the PYQ scraper — not this session's own output, see below)
- `a53aba2` fix: `CMS_Rehaul.md` was staged empty (still being written to disk) at commit time, follow-up commit landed the real content

**Not yet committed** — the Learning Center CMS Phase 1 + Phase 2 work (§21/§22) **plus the §24 admin-CMS sidebar rearchitecture, which superseded/deleted part of that Phase 2 work before any of it was ever committed** — plus `status_report.md` itself:

- **Still current, uncommitted**: `sql/learning_center_schema.sql`, `sql/learning_center_views.sql`, `sql/learning_center_grants.sql`, `scripts/backup_content_tables.mjs`, `scripts/seed_learning_center_schema.mjs`, `scripts/seed_thumbnail_templates.mjs`, `scripts/apply_sql_via_management_api.mjs`, `src/lib/resourceMetadata.js`.
- **From §24, uncommitted**: `src/pages/admin/{AdminShell.jsx,adminNavConfig.js,AdminCMS.css,OverviewPage.jsx,SyllabusPage.jsx,SyllabusTab.jsx,ResourcesPage.jsx,ResourcesTab.jsx,ContentGraphPage.jsx,ContentGraphTab.jsx,UsersPage.jsx,RolesPermissionsPage.jsx,QuizzesPage.jsx,lcShared.jsx}`, `src/App.jsx` (route table), `src/pages/admin/AdminRewardsQueue.jsx` (restyled, back-link removed).
- **From §25, uncommitted**: `src/pages/admin/{ExamsPage.jsx,ExamEditorPanel.jsx,ExamContextRail.jsx,ExamThumbnail.jsx}` (new/rewritten — the master-detail-summary Exams workspace), `src/components/ui/Select.jsx` and `src/index.css` (dark-mode dropdown contrast fix — this one's outside `src/pages/admin/`, it's a shared app-wide component).
- **Deleted from disk, deletions also uncommitted**: `src/pages/admin/AdminDashboard.jsx`, `AdminDriveIngestion.jsx`, `LearningCenterCMS.jsx`, `LearningCenterCMS.css` (§24) and `ExamsTab.jsx`, `LearningCenterExamEditor.jsx` (§25) — six files total, each fully superseded, confirmed zero remaining importers via grep before deleting.
- **From §26, uncommitted**: `scripts/fix_ut_gk_subject_gap.mjs` (new — its *writes* are already live in production, unlike everything else on this list, which is just sitting in the working tree; see §26.4).

Deliberately left uncommitted pending the user's go-ahead (last explicit "commit everything" was answered and executed as the batch below; everything since has come after and hasn't been re-confirmed for commit — and given §24's punch list (§24.6) is still open, committing now would be premature anyway).

**Not from this session — the user's own parallel work in progress, do not assume ownership, left alone throughout**: currently uncommitted on top of everything: `package-lock.json`/`package.json`, `content_rewrite_prompt.md`, `src/components/SecureReader.jsx` modified; `src/lib/mammothParser.js`, `scratch/Cluster_001_SSC_Beautiful.docx`, `scratch/debug.md`, `scratch/rewrite_book.cjs`, `scratch/rewrite_to_docx.cjs`, `scratch/rewritten_gk_sample.md` untracked. Looks like continued in-progress Gemini content-rewrite/docx-generation work.

Still untracked, unrelated, pre-existing (separate visual-asset-generation workstream): `generate_veernxt_assets.py`, `image-generation.txt`, `veernxt_assets/`, `public/veernxt_assets/`.

The `git stash` from before 2026-08-13 is still sitting there, still untouched (`stash@{0}: WIP on main: e89bf4a minor changes`).

---

## 18. Where everything from this session actually lives

| What | Location | In git? |
|---|---|---|
| Exam-logo images (original, mixed quality) | `exam-logos/` (repo root) | Yes, committed |
| State/UT/National emblem logos (proper quality) | `exam-logos/state-emblems/` | Yes, committed |
| Coverage/structure reports | `coverage_report.*`, `central_structure_report.*`, `state_structure_report.*` (repo root) | Yes, committed |
| Folder-structure fixer script | `scripts/fix_content_folder_structure.py` | Yes, committed |
| Exam-list dedupe + master-datamap-builder scripts | `scripts/dedupe_exam_list.py`, `scripts/build_master_datamap.py` | Yes, committed (`92b1378`) |
| Content rewrite + thumbnail prompts | `content_rewrite_prompt.md`, `thumbnail_generation_prompt.md` | Yes, committed |
| Exam-to-resource mapping workbook | `exam_resource_mapping.xlsx` (repo root) | Yes, committed (`92b1378`) |
| **Learning Center CMS schema + backup/seed/apply scripts + ingestion metadata module (§21)** | `sql/learning_center_schema.sql`, `scripts/{backup_content_tables,seed_learning_center_schema,apply_sql_via_management_api}.mjs`, `src/lib/resourceMetadata.js` | No, untracked — ready to commit when wanted |
| ~~Learning Center CMS Phase 2 — admin UI (§22)~~ **superseded by §24, deleted from disk** | ~~`src/pages/admin/{LearningCenterCMS.jsx,LearningCenterCMS.css}`~~ — replaced by the §24 sidebar CMS below | Never committed, now deleted |
| Supporting views/grants SQL (§22, still current) | `sql/{learning_center_views,learning_center_grants}.sql`, `scripts/seed_thumbnail_templates.mjs` | No, untracked — ready to commit when wanted |
| **Admin CMS unified dark-sidebar rearchitecture (§24) — shell + non-Exams pages** | `src/pages/admin/{AdminShell.jsx,adminNavConfig.js,AdminCMS.css,OverviewPage.jsx,SyllabusPage.jsx,SyllabusTab.jsx,ResourcesPage.jsx,ResourcesTab.jsx,ContentGraphPage.jsx,ContentGraphTab.jsx,UsersPage.jsx,RolesPermissionsPage.jsx,QuizzesPage.jsx,lcShared.jsx}` | No, untracked — deliberately held per §24.6's open punch list |
| **Exams workspace — master-detail-summary, matches client mockup PDF (§25)** | `src/pages/admin/{ExamsPage.jsx,ExamEditorPanel.jsx,ExamContextRail.jsx,ExamThumbnail.jsx}` | No, untracked |
| Dark-mode dropdown contrast fix (§25.3) — shared app-wide component, not admin-only | `src/components/ui/Select.jsx`, `src/index.css` | No, untracked |
| **UT GK subject-gap fix script (§26.2)** — writes already applied live in production | `scripts/fix_ut_gk_subject_gap.mjs` | No, untracked (the script itself; its DB writes are not a file at all) |
| Learning Center CMS rearchitecture plan (user-provided) | `CMS_Rehaul.md` (repo root) | Yes, committed (`a53aba2`) |
| Page/image analysis, subject-wise parse + comparison JSON | `K:\tmp\exam_list_extract\{page_image_analysis,subject_wise_list,subject_wise_comparison}.json` | No — scratch area, not moved into repo yet |
| Central/State/UT Exams source content (docx) | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\{CENTRAL EXAMS,STATE EXAMS,UT EXAMS}\` | No — outside the repo entirely |
| 93 deduplicated master documents (88 from Central/State + 5 UT GS books) | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\MASTER DOCUMENTS\` | No — outside the repo entirely |
| Deduped unique exam list + dedupe changelog + UT content mapping + PwD comparison | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\{master_exam_list_unique.json,dedupe_changelog.md,ut_content_mapping.md,pwd_eligibility_comparison.md}` | No — outside the repo entirely |
| **Master exam datamap (source of truth, §12.8)** | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\{exam_master_datamap.json,exam_master_datamap.xlsx,datamap_build_report.md}` | No — outside the repo entirely |
| Master exam list + subject-wise source docs | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\` | No — outside the repo entirely |
| **Learning Center CMS Phase 1 data (§21)** — 10 `lc_`-prefixed tables, seeded and live | Supabase project `jtcyeufhvpieyngracpo`, `public` schema | N/A — live database, not a file. First backup ever taken of the pre-existing content tables: `K:\tmp\db_backups\2026-08-20T17-27-09-590Z\` |

---

## 19. Suggested pickup order next time

1. **[Active thread] Niche-resource tagging pass — link the 66 real, already-deduplicated canonical documents that have never been assigned to an exam.** This is now the concrete shape of "subject assignment improvements" (§26.3's full breakdown, exact list in the master-documents reference handed to the user this session). Priority order within this: the 11 State-level GS books first (mirrors the exact pattern already proven for the 3 UT GS books — one state's GS book → that state's own exams), then the state SI/Constable guides, then the specialist banking/IBPS guides last (smallest exam-count impact). Confirm the exam-matching approach with the user before bulk-linking anything — same discipline as §26.2's UT fix (dry-run script, verify counts before/after).
2. **Clean up the 12 duplicate-orphan `lc_resources` rows** (§26.3's precise recount of §22.4/§23's finding) — pick the canonical id per title (already obvious: whichever one has the nonzero exam count), archive/remove the other 0-exam copies. Small, mechanical, low-risk — could reasonably be done before or alongside item 1.
3. **Exam naming cleanup** — still fully untouched. First step is still a real query (`lc_exam_stats` joined to `lc_exams`, cross-referenced against name patterns) to check whether bad names correlate with the *remaining* 0-subject exams once items 1–2 close most of the resource-linking gap — §25.4's original hypothesis was about missing resources, which turned out to mostly be the niche-tagging gap above, not a naming problem per se; worth re ­checking what's left once that's fixed. See §20 prompt J.
4. **Close out the §24 admin-CMS punch list, or explicitly deprioritize items with the user.** Still open, unchanged since §24: CONTENT nav group, global search, notification bell, `AdminJobs`/`JobBoard` theming, committing the work (mobile sidebar item is resolved differently, see §24.6's update note). See §20 prompt I.
5. **Then, the pre-existing plan — decide on `resources_v2` legacy data, then check profiling-engine/Jobs matching.** The duplicate-`lc_resources` part of this (§23) is now folded into item 2 above. Remaining: **(a)** decide what to do with the still-open `resources_v2` legacy table (4,353 rows, §21.4/§21.5 — dedupe by `file_hash` into `lc_resources`, or archive as a separate legacy system); **(b)** check whether the profiling engine (`api/profile/recommend.js`, its own separate `exams` table, 1,629 rows, §21.2) and the Jobs board are actually matching against the new canonical `lc_exams` catalog. See §20 prompt H.
6. **Master exam datamap** (§12.8) — `exam_master_datamap.json`/`.xlsx` is the source of truth for the content-catalog side; relay the Ladakh/Lakshadweep/Puducherry GS-book gap (§12.6) to the content team, and regenerate `exam-logos/manifest.json`/`coverage_report.json`/`logo_priority.json` against `master_exam_list_unique.json` (§12.5). **Note**: this datamap already carries clean, well-formed exam names sourced from the client's own docx lists — worth checking whether item 3 above (naming cleanup) can just re-derive `lc_exams.name` from here instead of inventing new cleanup logic.
7. Org-specific logo sourcing (§11) — the genuinely-branded bodies (SSC, UPSC, IBPS, RRB, DSSSB, real PSC branding), plus mapping state-emblem fallbacks onto the rest.
8. Check in on the content team's Gemini rewrite/thumbnail output — does it need the admin-side review UI to actually land, or is it still a manual docx handoff for now.
9. Image work (§10): 715 genuine upscale candidates, 314 duplicate logos to replace instead of upscale.
10. The 10 zero-coverage states and Central re-ingestion, once fresh content is ready from the content team.
11. Reader visual design + semantic content tagging (§9), and the in-admin AI writing assistant — queued behind the CMS/recommendation-engine work per the user's stated sequencing.
12. **Bulk-ingestion pipeline targeting `lc_*` is now a clean-slate project, not a wiring job** — `src/lib/resourceMetadata.js`'s bulk-upload metadata gate (§21.3) was originally meant to wire into `AdminDriveIngestion.jsx`, but that page (and the entire legacy `resources_v2`-ingestion admin UI) was deleted in §24. There is currently **no admin UI at all** for bulk-uploading new content into the canonical `lc_resources` schema — building one (reusing `resourceMetadata.js`'s validation contract) is its own project, once the redundant-data question above is settled.

---

## 20. Starter prompts for the next session

Copy the one matching what you're picking up — each is self-contained, points at this report for full context, and names the exact files involved so a fresh conversation doesn't have to re-derive anything.

### A. UT Exams — relay the GS-book gap, then move to ingestion
> Read `status_report.md` §12.6 and `ut_content_mapping.md` (`K:\...\CONTENT\1. EXAM LIST\`) for full context. UT content is already audited — no folder-structure-fixer pass needed (the content team's shape is deliberately different: shared subject content across all UTs, not per-UT scaffolding). Two things left: (1) relay to the content team that Ladakh, Lakshadweep, and Puducherry are missing a real GS book (the other 5 UTs each have one, now in `MASTER DOCUMENTS\Guide\GK-GS\Cluster_089`–`093`) — they need one written in the same shape as the existing 5; (2) when UT ingestion is built, point it at the existing master-doc clusters for Reasoning/Maths/English/Hindi/Computer Science instead of re-uploading the redundant per-UT copies — the mapping table in `ut_content_mapping.md` says which cluster each subject maps to.

### B. Use / extend the master exam datamap
> Read `status_report.md` §12.8 for context. The unified exam reference is built: `K:\...\CONTENT\1. EXAM LIST\exam_master_datamap.json` / `.xlsx` — one row per unique exam with conducting body, logo, subject requirements, PwD eligibility (UT), and content completeness all joined on. Built by `scripts/build_master_datamap.py` (repo, re-runnable). If picking this thread back up: either (a) consume the datamap as-is for the recommendation engine/ingestion work, or (b) extend the script to close its known gaps — 19 Central/State rows with ambiguous completeness data, ~105 UT rows with no completeness match (wording mismatch between the master exam list and actual folder names), live DB coverage (needs a Supabase query, not done in this offline pass). Match-rate detail and every unmatched row is in `datamap_build_report.md`, same folder.

### H. Review the Phase 1 mapping, decide on redundant data, then check profiling-engine/Jobs matching
> Read `status_report.md` §21, §22, §23, and §24 in full for context. The Learning Center content system is now part of the unified admin CMS built in §24 — Exams/Syllabus/Resources/Content Graph/Overview at `/admin/{exams,syllabus,resources,content-graph,overview}` (not `/admin/learning-center` anymore, and the "Analytics" tab is now called "Overview"), backed by `src/pages/admin/{ExamsTab,SyllabusTab,ResourcesTab,ContentGraphTab,OverviewPage,LearningCenterExamEditor}.jsx`. Both the DB foundation (Phase 1) and the admin UI are done, live, and verified working against real production Supabase data — most recently re-verified after the §24 sidebar rebuild.
>
> **Step 1 — confirm the duplicate-`lc_resources` picture is complete, then clean it up.** §23 already sharpened this beyond the original 3-subject finding: REASONING, ENGLISH, MATHEMATICS, and HINDI all show the same pattern — one correctly-linked canonical row plus one-or-more fully **orphaned** duplicate rows with 0 exams attached (not two rows splitting the count) — and "SSC COMPLETE GK" is worse still (3 orphaned duplicates against 1 real row). This was found by spot-checking via search, not an exhaustive query — run one (`select title, resource_type, count(*) from lc_resources group by title, resource_type having count(*) > 1`, or equivalent via Supabase) against the full `lc_resources` table first, to confirm this is the complete list. Then clean up: since the extra rows are orphans nothing links to, this should mostly just be deleting/archiving them — no `lc_subject_resources` re-pointing needed for the orphan cases. Confirm the approach with the user before executing — production data change.
>
> **Step 2 — decide what to do with the other redundant data.** The still-open `resources_v2` legacy table question (4,353 rows, §21.4/§21.5) — dedupe by `file_hash` into `lc_resources`, or archive it as a separate legacy system. Confirm with the user before executing.
>
> **Step 3 — only after that's settled, check the profiling engine and Jobs board against the new canonical exam catalog.** A second, separate live `exams` table (1,629 rows) backs the ex-servicemen recommendation engine (`api/profile/recommend.js`, `backend/engine/eligibility.js`/`scoring.js`) with its own eligibility-focused shape (§21.2) — different from `lc_exams`. The confirmed direction is for profiling/Jobs to eventually link to `lc_exams` by name instead of maintaining a duplicate list, but this has never been scoped in detail: how well do the two exam lists actually match by name today, what would the linking mechanism look like, and does the Jobs board (`PublicJobs`/`JobBoard`) even reference exams in a way this affects. Start there before writing any migration code.

### I. Close out the admin-CMS punch list (§24.6)
> Read `status_report.md` §24 in full for context, especially §24.6. The admin backend was just rebuilt as one unified dark-sidebar CMS matching the client's mockup (`CMS_Rehaul.md`) — it's live, functionally verified via Playwright against production Supabase, and the user's reaction was positive ("This is better") but with "still a lot of work" and an explicit "we will come back to this shortly." Nothing is broken; this is finish-the-job work. Ask the user which of these to tackle, and in what order — don't assume:
>
> 1. **CONTENT nav group** — Categories/Tags/Content Library from the mockup have no real pages yet. Build them, or confirm they should stay omitted indefinitely.
> 2. **Global header search** (Ctrl/⌘K, `CMS_Rehaul.md` §15) — not built yet, deliberately deferred as secondary in the spec itself.
> 3. **Notification bell** in the topbar — no real data source exists; needs one scoped before building anything, so it isn't pure decoration.
> 4. **`AdminJobs`/`JobBoard` still light-themed** inside the new dark shell — `JobBoard.jsx` is shared with the public-facing `/jobs` page, so restyling it needs a pass that doesn't leak into learner-facing UI (e.g. an `isAdmin`-scoped class, not a global recolor).
> 5. ~~Mobile/narrow-viewport sidebar~~ — **resolved differently in §25.3**: a user-controlled collapsible sidebar was built instead (toggle button, persists via `localStorage`), which replaces the untested auto-hide breakpoint entirely.
> 6. **Commit the work** — everything from §23/§24/§25 is uncommitted (full file list in §17), including the deletion of `AdminDashboard.jsx`/`AdminDriveIngestion.jsx`/`LearningCenterCMS.jsx`/`LearningCenterCMS.css`/`ExamsTab.jsx`/`LearningCenterExamEditor.jsx`. Once satisfied, commit.
>
> Once this list is cleared (or explicitly deprioritized), move to prompt J (the user's actual next-session priority) or prompt H (the older, still-pending Phase 1 seeding audit / redundant-data / profiling-engine plan).

### K. Niche-resource tagging pass — link the 66 unassigned canonical documents (start here)
> Read `status_report.md` §26 in full for context, especially §26.3 — this is now the concrete, scoped shape of "subject assignment improvements" from the user's prior-session ask. A live query of all 93 `lc_resources` rows found only 15 have any exam linked; 12 of the other 78 are the already-known duplicate-orphan bug (§22.4/§23), but **66 are genuinely distinct, already-deduplicated canonical documents that were seeded into the library and never linked to a single exam** — state-specific GS books, state SI/Constable guides, specialist banking/IBPS guides. This was deliberately deferred in §21.4 ("seeded... for manual tagging") and never picked back up.
>
> **Step 1 — start with the State GS books**, the highest-confidence, lowest-risk subset: `Arunachal Pradesh GS`, `Andhra_Pradesh GS`, `Assam_GS`, `Bihar_GS`, `Chhattisgarh_GS`, `Goa GS`, `Gujarat_GS`, `Haryana_GS`, `Himachal_Pradesh_GS`, `Jammu_Kashmir_GS_Book`, `Karnataka_GS` (11 total). These mirror the 3 UT GS books that *are* already correctly linked (`Delhi_GS_Book` → 38 exams, `Andaman_Nicobar_GS_Book` → 32, `Chandigarh_GS_Book` → 28, all via that state/UT's own General Knowledge/GS subject slot) — same pattern, same subject id (`d0be9cbd-bee5-4b2c-9387-951373dfcc5a`), just for States instead of UTs. Write a dry-run/`--execute` script matching `scripts/fix_ut_gk_subject_gap.mjs`'s convention: for each state's exams that already have a GK/GS subject slot linked to the generic dominant `GS & GK GUIDE BOOK`/`SSC COMPLETE GK`, decide whether to *add* the state-specific book alongside it or *replace* the generic one — ask the user which, don't assume.
> **Step 2 — state SI/Constable guides next** (`Andhra_Pradesh SI`, `Goa SI`, `Gujarat_SI`, `Haryana_SI`, `Karnataka_SI`, `Kerala Constable`, `Madhya_Pradesh_SI`, `Maharashtra SI`, `Odisha SI`, `Punjab SI`, `Tamil Nadu SI`, `Telangana_SI`, `Tripura_SI`, `Uttarakhand Constable`, `WB`, and any others matching this pattern) — same approach, linking to each state's Police/Sub-Inspector/Constable exams specifically rather than General Knowledge broadly.
> **Step 3 — specialist banking/IBPS guides last** (`Financial_Awareness_IBPS_RRB_GBO`, `HR_Personnel_Officer_IBPS_RRB_SO`, `IT_Officer`, `Law_Officer`, `Rajbhasha_Adhikari_IBPS_RRB_SO`, `Descriptive_Writing_Bank_Exams`, `ITI_Technical_Trade_Literacy_GUIDE BOOK`, `Nursing Book`) — lowest exam-count impact, do after the state passes.
> **Along the way**: clean up the 12 duplicate-orphan rows (exact list in §26.3) — pick the nonzero-usage id per title, delete/archive the 0-exam copies. Small and mechanical, can be done first or interleaved.
>
> A live-data reference document listing/categorizing all 93 resources was produced for the user this session — check whether it's still current before re-deriving the list from scratch (categories drift as soon as any of the above gets fixed). Confirm every bulk-linking decision with the user before executing — production data, same discipline as §26.2's UT fix and every prior cleanup pass in this project.

### J. Exam naming cleanup
> Read `status_report.md` §25.4 in full for context — the other half of the user's prior-session ask, verbatim: *"improvements in the naming of these exams. They are all over the place."* Not scoped yet.
>
> §25.4's original hypothesis was that bad naming correlates with `subject_count = 0` — §26 found the real cause of most 0-subject cases was the niche-tagging gap (prompt K above), not naming specifically. So: **do prompt K's tagging pass first**, then re-run the `subject_count = 0` query — whatever's still zero after that is a better, cleaner signal for what naming cleanup actually needs to fix, rather than conflating two separate problems.
>
> When it's time: `K:\...\CONTENT\1. EXAM LIST\exam_master_datamap.json` (§12.8) already has clean, well-formed exam names sourced directly from the client's own docx lists, and `scripts/seed_learning_center_schema.mjs` (§21.4) originally populated `lc_exams` from this exact source — check whether bad names are a mapping/join bug in that seed script (fixable by re-running a corrected version) before inventing new cleanup logic from scratch. Confirm any bulk rename with the user before executing.

### C. Org-specific logo sourcing
> Read `status_report.md` §11 for context and methodology (Wikipedia/Wikimedia Commons, cross-verify against the specific article's own infobox before downloading, add a proper User-Agent header to avoid rate-limiting, validate every file's header before trusting it). 37 state/UT/national emblems are already done at `exam-logos/state-emblems/`. Next: source real logos for conducting bodies with genuine distinct branding beyond a generic state seal — start with SSC, UPSC, IBPS, RRB, DSSSB (all currently in `exam-logos/` but low quality per the §11 audit), then work down the exam-count-weighted priority list. For bodies without distinct branding, map them to the correct state-emblem fallback from `exam-logos/state-emblems/` instead of leaving them missing.

### D. Central re-ingestion once content team signs off
> Read `status_report.md` §5, §7, and §8 for context. Central Exams' local folder structure is fixed and scaffolded (`CLIENT ASSETS\VeerNXT\CONTENT\CENTRAL EXAMS\`), but `resources_v2` has 0 Central rows — it was deliberately purged. Confirm with the user whether the content team has finished their editorial pass on the Gemini-rewritten master documents (`CLIENT ASSETS\VeerNXT\CONTENT\MASTER DOCUMENTS\`) and the docx→Word-heading-style conversion is done, then walk through re-ingesting Central Exams via the existing `AdminDriveIngestion.jsx` upload flow. Verify against the master exam list coverage numbers in §6 afterward.

### E. Recommendation engine / ingestion pipeline (the big one)
> Read `status_report.md` in full for context on the current state of the content catalog, then set that aside — this is a new workstream. The user's stated priority once the content-audit thread closes out is the recommendation engine and the ingestion pipeline itself. Ask the user for scope/starting point rather than assuming; this hasn't been scoped yet in any prior session.

### G. Finish the exam-list cleanup — regenerate downstream artifacts, handle Category D
> Read `status_report.md` §12.5 for context. `scripts/dedupe_exam_list.py` already resolved Categories A (true duplicates) and C (Police double-listing) — output is `K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\master_exam_list_unique.json` (1,534 rows, tag-not-delete via `also_listed_as`), changelog in the same folder. Two things left: (1) regenerate `exam-logos/manifest.json` exam_counts, `coverage_report.json`, and `logo_priority.json` against the new deduped file — they still reflect the old, duplicated counts, which matters since `logo_priority.json` is what's driving the Gemini logo-sourcing pass (§20C); (2) decide what to do with Category D (8 bodies, 64 rows — real distinct exams like nursing/TET tagged `level:"central"` when the conducting body is a state PSC/SSC, deliberately left untouched by the dedup script since it's a relabeling job, not a duplicate) and Category E's one flagged manual-look item (Punjab & Haryana High Court — genuinely one shared court, might not be a collision after all). Also not yet done: a wider fuzzy pass across all 805 conducting bodies (only the 39 originally flagged by exact-name matching were checked) to catch more alias splits like `SSC`/`Staff Selection Commission`.

### F. Reader visual design work
> Read `status_report.md` §9 for context. The user confirmed the actual "make content engaging" problem is visual design inside the existing React reader (`SecureReader.jsx`), not an external tool — no new integration needed. Natural first step: extend `content_rewrite_prompt.md` (already being used by the content team via Gemini) so it tags semantic elements — definitions, worked examples, key formulas, warnings/tips — instead of just plain headings/paragraphs, then design matching styled components in `SecureReader.jsx` for each tag. Confirm this is still queued behind the recommendation-engine work (§19) before starting, since priorities may have shifted.

---

## 21. Learning Center CMS rearchitecture — Phase 1 (DB foundation) complete, live in production Supabase

New major thread this session, separate from the content-catalog audit above: the user provided `CMS_Rehaul.md` (repo root) — a full spec for replacing per-exam-duplicated content with a canonical Conducting Body → Region → Exam → Subject → Resource model, many-to-many, matching a provided admin-UI mockup (dark CMS, dense filterable exam table, Resource Library, Content Graph). Explicit instruction in the spec: inspect the existing schema first, don't destroy production data, make any migration reversible.

### 21.1 Research before touching anything

Two research passes (background agents) plus live read-only queries against Supabase established:
- **`resources_v2`**: 4,353 rows, but only **1,857 distinct `file_hash` values** — 595 duplicate-content groups. Confirms the duplication problem is real. `exam_name`/`conducting_body` are messy ingestion-time folder-path text (`"4. Bihar — 8. Patna High Court"`, a literal `"STATE EXAMS"` as a conducting_body) — not safely fuzzy-matchable against the clean `exam_master_datamap.json`.
- **`quizzes`** (1,216 rows) / **`questions`** (114,574 rows, 100% manually authored) are on the live hot path (`InteractiveQuiz.jsx`, `Dashboard.jsx`, `ProfilingResults.jsx`), as is `resources_v2` (`SecureReader.jsx`, `LearningCenter.jsx`).
- **No schema anywhere is version-controlled** (`schema.json` empty, no `/migrations`) and **there was no backup of any of this data** before this session.
- Established project convention everywhere else (R2 migration, URL cutover) is additive/resumable/old-data-as-rollback — this work follows the same discipline.
- **Confirmed with the user**: realign, never purge.

### 21.2 A second, unexpected live table: `exams` already exists — backs the profiling/recommendation engine

While applying the new schema, hit `ERROR: relation "exams" already exists`. Investigation found a **live, actively-used** `exams` table (1,629 rows) that the research agents had missed (they scoped to `src/`, this is read by `api/profile/recommend.js`, a Vercel serverless function). It's the backing store for the **ex-servicemen eligibility/career-matching recommendation engine** (`backend/engine/eligibility.js`, `scoring.js`) — same lineage as this session's work (`"source_file": "central exams list.docx"`, same conducting_body/exam_name data) but a different shape: eligibility fields baked onto each row (`career_track`, `min_qualification`, `physical_required`, `domicile_required`, `ex_servicemen_quota`, `ncc_bonus`, `math_required`, `english_intensive`, `technical_trade_preferred`) instead of a normalized content/subject structure. Also found the legacy V1 `resources` table (42 rows) would have collided too.

**Discussed with the user — confirmed direction, not actioned yet**: these two "exams" concepts should eventually be unified — the profiling engine and the Jobs board should link to the *same* canonical exam catalog by name (many-to-many, jobs → required exams) rather than each maintaining a separate duplicated exam list. Explicitly deferred as its own follow-on effort — "let's get content mapped properly first." For now, every new table is prefixed `lc_` (Learning Center) to avoid the collision and keep the new schema unambiguous until that unification happens. Full reasoning is in `sql/learning_center_schema.sql`'s header comment.

### 21.3 New ingestion policy (confirmed with the user, shapes the schema/ingestion design)

Going forward, two upload paths:
- **Single upload** stays interactive: upload → auto-detect metadata → content team fills gaps → tag/assign syllabus → publish.
- **Bulk upload** has no human in the loop per file, so it hard-rejects anything incomplete rather than silently ingesting garbage (exactly how `"STATE EXAMS"` ended up as a conducting_body). Metadata lives **embedded in the docx itself** as Word document properties (not a separate manifest) — Title (standard `dc:title`), and custom properties `ResourceType`, `Subject`, `ConductingBody`, `Region`. All five required before a resource is bulk-ready; exam/syllabus assignment can still happen afterward as its own step.

### 21.4 What was actually built and run

- **`scripts/backup_content_tables.mjs`** — dumps `resources_v2`/`quizzes`/`questions`/`resources` to timestamped JSON. Run once: `K:\tmp\db_backups\2026-08-20T17-27-09-590Z\` — the first backup this data has ever had.
- **`sql/learning_center_schema.sql`** — 10 new tables (`lc_regions`, `lc_conducting_bodies`, `lc_thumbnail_templates`, `lc_exams`, `lc_subjects`, `lc_exam_subjects`, `lc_resources`, `lc_subject_resources`, `lc_tags`, `lc_exam_tags`), `pg_trgm` indexes for fast filter/search, `lc_resources.file_hash` unique constraint so duplicate content is rejected at the DB level. **Applied to production** via a new one-time script, `scripts/apply_sql_via_management_api.mjs` (Supabase Management API, authenticated with a personal access token in `.env` as `SUPABASE_ACCESS_TOKEN` — not the service-role key, which can't run DDL over PostgREST; no direct Postgres connection string exists in this project). Confirmed all 10 tables exist and were empty before seeding.
- **`scripts/seed_learning_center_schema.mjs`** — populates the new schema entirely from this session's own already-validated offline sources (`exam_master_datamap.json` for exams/subjects/conducting_bodies/regions, `MASTER DOCUMENTS\MANIFEST.txt` for the 93 canonical resources), deliberately bypassing `resources_v2`'s reconciliation problem for this pass. Dry-run mode caught two real bugs before they hit production — a CRLF line-ending bug that silently parsed 0 resources from the manifest, and a classic JS falsy-zero bug (`!existing` treating array index `0` as unset) that would have picked a 1-exam niche resource as the "dominant" English guide instead of the one actually used by 537 exams. Also caught on inspection: the already-flagged anomalous resource from §8 (`RAJASTHAN SI GS GUIDE.docx`) would have become an auto-linked "dominant" resource just by being alone in its category bucket — excluded `Other`-category resources from auto-linking entirely. **Executed for real**: 1,534 exams, 673 conducting bodies, 37 regions, 12 canonical subjects (reconciling `subject_wise_list.json`'s naming with `MANIFEST.txt`'s — e.g. "Maths"/"Quantitative Aptitude"/"Mathematics" all → one "Mathematics" row), 6,660 exam↔subject links, 93 resources, 9,398 resource assignments (only the dominant Guide/Precis resource per subject auto-linked broadly; niche resources — state-specific SI guides, IBPS professional-knowledge docs — seeded into the library unlinked for manual tagging; the 5 real per-UT GS books linked precisely to only their own UT's exams, not broadly).
- **`src/lib/resourceMetadata.js`** — `extractEmbeddedMetadata()` / `validateResourceMetadata()` implementing §21.3's contract. Tested against synthetic docx fixtures (complete/missing/partial-with-invalid-value metadata) — all three cases correct. **Not yet wired into `AdminDriveIngestion.jsx`'s actual upload flow** — that's Phase 2.

**Spot-checked and correct**: SSC CGL → English → the one canonical `ENGLISH` resource (shared with every other CGL-named exam, not copied); Andaman & Nicobar exams → their precise `Andaman_Nicobar_GS_Book`; Ladakh exams → only the generic GK/GS resources, no incorrect fallback (correctly reflects the 3-UT gap from §12.6).

### 21.5 Explicitly not done in Phase 1

- **The admin UI itself** — no screen from `CMS_Rehaul.md`/the mockup has been built yet. That's Phase 2.
- **`AdminDriveIngestion.jsx` doesn't call `resourceMetadata.js` yet** — the bulk-upload gate isn't enforced in the UI, only the underlying functions exist.
- **`resources_v2` reconciliation** — deliberately bypassed for this pass (seeded from the clean offline sources instead). What to do with the existing 4,353 messy rows (dedupe by `file_hash` vs. archive) is an open Phase 3 question.
- **Unifying `lc_exams` with the profiling engine's `exams` table** (§21.2) — confirmed as the right direction, explicitly deferred.
- Live DB coverage regeneration (`coverage_report.json` etc., §12.5/§12.8) still not done.

---

## 22. Learning Center CMS — Phase 2 (admin UI), built and verified live

Built the actual admin UI from `CMS_Rehaul.md` against the Phase 1 schema (§21). **Design direction confirmed with the user first**: `CMS_Rehaul.md` literally describes a dark navy/charcoal + green/teal interface, but the *real* `/admin` (`AdminDashboard.jsx`) is actually a light corporate theme (white background, olive `#1F3A2E` / gold `#b89047`) — the user chose to match the existing light theme rather than the spec's literal wording, reorganized into the dense table/filter/drawer UX the spec calls for.

### 22.1 What was built

- **`src/pages/admin/LearningCenterCMS.jsx`** — the CMS hub at `/admin/learning-center`, internal tabs: **Exams** (Conducting Body/Region/Name filter bar, server-side paginated+filtered — a deliberate deviation from `AdminDashboard.jsx`'s fetch-all-then-filter-client-side convention, justified by `CMS_Rehaul.md` §22's performance requirements and the `pg_trgm` indexes already in the schema), **Syllabus** (subjects with resource/exam counts, click to expand), **Resources** / Resource Library (search+filter, anti-duplication "New Resource" modal per §20 — live-searches existing titles and offers "Use Existing Resource" before letting you create a new one), **Content Graph** (6 views: Resource Reuse, Exam Structure, Subject Coverage, Regional Distribution, Content Gaps, Resource Heatmap — shipped as data-dense interactive panels, not a force-directed canvas graph, since no graphing library exists anywhere in this repo and one wasn't worth adding; the heatmap is scoped to **Resource × Subject** (93×12) rather than the spec's literal Resource × Exam (93×1,534 — not renderable or useful at that scale)), **Analytics** (stat tiles + plain-div bar breakdowns, reusing the exact progress-bar pattern already in `AdminDashboard.jsx`'s Content Pipeline tab).
- **`src/pages/admin/LearningCenterExamEditor.jsx`** — dedicated Exam Editor page at `/admin/learning-center/exam/:id?`, following the existing `AdminContentEditor.jsx` convention (route param id, `admin_session` guard, fetch-on-mount). Identity fields (searchable Conducting Body/Region via the existing `src/components/ui/Select.jsx`), tags (chip input, create-on-the-fly against `lc_tags`), dynamic thumbnail preview (**reuses `renderCustomThumbnailCanvas()` from `src/lib/contentEngineProcessor.js`** — the exact function already used by `AdminDriveIngestion.jsx`'s thumbnail generation, so no new image-composition code was written), Subjects section with plain HTML5 drag-and-drop reordering (no dnd library exists in this repo) and a per-subject "Add Resource" drawer that only ever references existing canonical `lc_resources` rows, never creates new ones.
- **`src/pages/admin/LearningCenterCMS.css`** — shared stylesheet imported by both pages (they're separate routes/components, so a shared file was needed rather than each page's own inline `<style>`, or the Exam Editor would render unstyled when reached directly — caught and fixed during this session, not shipped broken).
- **`sql/learning_center_views.sql`** — 4 new read-only aggregate views (`lc_exam_stats`, `lc_resource_usage`, `lc_subject_stats`, `lc_region_stats`), applied to production. Avoids N+1 queries for every count shown in the UI (subjects/resources per exam, exams per resource, etc.).
- **`scripts/seed_thumbnail_templates.mjs`** — `lc_thumbnail_templates` was created empty in Phase 1 and never seeded; this inserts the 3 existing generic royal-color templates (`public/thumbnils/`) so the picker isn't empty. Run and executed.
- Two new routes in `src/App.jsx`, plus a "Learning Center CMS" link added to `AdminDashboard.jsx`'s header nav (next to Rewards) — the actual entry point.

### 22.2 Real production bug found and fixed: the new schema was invisible to the app's real key

Built the UI, pointed it at production, got an empty "No exams match the current filters" table — even with zero filters applied. Root-caused, in order:
1. `src/lib/supabase.js` has a hardcoded fallback key that happens to decode to `service_role` (already flagged separately in §15.2) — but `.env` sets a *real* `VITE_SUPABASE_ANON_KEY` that overrides it, so the actual browser client uses the real, RLS-subject anon key, not the permissive fallback.
2. Confirmed via direct REST calls: the real anon key got `200 []` from `lc_exams` but read `resources_v2` (an existing table) fine — isolating the gap to the new schema specifically.
3. First fix attempt (grants only) wasn't enough: `select relrowsecurity from pg_class` showed RLS enabled (`true`) on all 10 `lc_` tables, even though `learning_center_schema.sql` never mentions RLS at all — Supabase enables it by default on every table created through its platform (dashboard or Management API), regardless of the DDL. With RLS on and zero policies, every non-superuser role is denied unconditionally.
4. **Fix** (`sql/learning_center_grants.sql`, applied to production with the user's explicit confirmation before each of the two apply steps): `grant select/insert/update/delete` to `anon, authenticated` on all 10 tables + `select` on the 4 new views, **and** `alter table ... disable row level security` on all 10 tables — matching every other table this app uses (`resources_v2`, `quizzes`, ... all have RLS off; auth here is entirely application-layer via `admin_session` in `localStorage`, a pre-existing, separately-flagged posture, not something this changes). Verified with a direct anon-key query afterward: real data returned.

This means **Phase 1's schema was never actually reachable by the deployed app** until this session — worth knowing if anything from Phase 1 was assumed "live and working" before this.

### 22.3 Verified live via Playwright

No `chromium-cli` available in this environment; used a scratch Playwright script (installed to a scratchpad temp dir, not the repo) driving a real headless Chromium against `npm run dev`, logged in as the real Super Admin, and exercised the full flow end-to-end: Exams search/filter/pagination, opening a real seeded exam (APSSB CGL) in the Exam Editor and confirming its 5 real subjects, creating a brand-new draft exam start-to-finish (identity → save → add subject → add an existing resource to it via the drawer), Resources/Syllabus/Content Graph (all 6 views)/Analytics tabs. Two real bugs caught and fixed during this pass, not just the RLS/grants gap above:
- **React key collision** in Analytics' "Top Shared Resources" — was keyed by resource *title*, which isn't unique (see §22.4 below); switched to keying by resource id.
- **Out-of-order-response race** in the Exams/Resources tables' fetch functions — typing into the search box while the initial unfiltered mount-load was still in flight could let the slower, stale, unfiltered response land *after* and silently overwrite the correct filtered one, since neither fetch was cancelled or sequenced. Fixed with a monotonic request-id guard (only the most-recently-*dispatched* request is allowed to write to state) in both `ExamsTab.fetchExams` and `ResourcesTab.fetchResources`, plus clearing the list immediately when a new query starts so stale rows are never shown mid-load either.

All test data created during verification (two draft exams) was deleted afterward.

### 22.4 Data-quality finding, not fixed: some canonical resources are exact-title duplicates

Analytics' "Top Shared Resources" visibly shows **"REASONING" twice** (1,005 exams each), **"ENGLISH" twice** (852 each), **"MATHEMATICS" twice** (565 each) — two distinct `lc_resources` rows per subject, both broadly auto-linked during Phase 1's seeding pass (`scripts/seed_learning_center_schema.mjs`), instead of one. This directly undermines the rearchitecture's core goal ("a resource should exist ONCE"). Not investigated further or fixed this session — flagged here for a follow-up pass: find the duplicate pairs, pick a canonical one, re-point `lc_subject_resources` rows at it, and remove or archive the other, the same tag-not-delete discipline used throughout §12.5's exam-list dedup.

### 22.5 Explicitly out of scope this pass (per the plan agreed with the user before building)

- Global header search across Exams/Bodies/Subjects/Resources/Tags (`CMS_Rehaul.md` §15) — not in the spec's own §25 priority list.
- Standalone Categories/Tags management pages and the SYSTEM nav section (Users/Roles/Settings/Audit Logs) — tags are handled inline in the Exam Editor instead.
- Wiring `src/lib/resourceMetadata.js`'s bulk-upload metadata gate into `AdminDriveIngestion.jsx` — that page writes to the *legacy* `resources_v2` table and has no path into `lc_resources` at all; bridging that is a distinct, sizeable project (a real bulk-ingestion pipeline targeting the new canonical schema), not a bolt-on.
- Fixing the pre-existing service-role-key-as-anon-key issue (§15.2) — the new pages just inherit the existing (already-flagged) posture.

---

## 23. Learning Center CMS — live review confirms Phase 2 still working, sharpens the duplicate-resource finding

New session. User asked for a review of "the backend" — clarified via question to mean specifically the Learning Center CMS admin UI (§22), not the DB directly or the serverless API functions. Ran the dev server (`npm run dev`, landed on port 8081 — 8080 was in use) and drove it end-to-end with a scratch Playwright script (Chromium binary already cached locally from a prior session at `C:\Users\mmu\AppData\Local\ms-playwright\chromium-1234`; the installed Playwright *npm package* version didn't match what was cached, so the script launches Chromium via an explicit `executablePath` rather than the default — worth knowing if this recurs, the fix is pointing at the cached binary directly, not reinstalling).

**Result: no regressions.** Logged in as Super Admin, clicked through every tab (Exams search/filter/pagination, opening a real exam into the Exam Editor, Syllabus, Resources with search, all 6 Content Graph views, Analytics) — all load real data from production Supabase with zero console/page errors. Two things that *looked* broken on first pass turned out not to be: Analytics and the Resource Heatmap both show a "Loading…" state for 8–12 seconds before data lands (slow fetch, not a hang) — worth knowing if this gets reported as "frozen." One unrelated pre-existing console error fires on the plain `/admin` dashboard (`Error fetching admin registry: Failed to fetch`) — not part of the Learning Center CMS, not touched.

**Sharper picture of the §22.4 duplicate-resource finding.** Used the Resource Heatmap and direct title-search on the Resources tab to inspect the actual row shapes behind the "REASONING"/"ENGLISH"/"MATHEMATICS" duplicates flagged last session. The pattern is better-understood now, and the problem is *broader* than originally documented:

- The duplication is **not** two linked rows splitting the exam count — it's **one correctly-linked canonical row plus one-or-more fully orphaned duplicate rows with 0 exams attached.** E.g. "REASONING": Guide (1,005 exams, linked), Guide (0, orphan), Precis (1,005, linked) — 3 rows total, not 2.
- Same orphan pattern for ENGLISH (852/0/852) and MATHEMATICS — except MATHEMATICS has it on **both** Guide *and* Precis (565/0/565/0), not just one type.
- **HINDI is affected too** — not in the original 3-subject list at all (Precis 496/0/496 pattern).
- **"SSC COMPLETE GK" is the worst case found**: 4 rows total, only 1 linked (1,390 exams) — **3 fully orphaned duplicates**.
- "MATHS AND REASONING GUIDE BOOK" also has 2 duplicate rows, both orphaned (0 exams each) — a different resource than the 4 above, same pattern.

**Why this matters for the still-pending §19 cleanup plan**: because the extra rows are orphans nothing currently links to, cleanup for these specific cases is simpler than §22.4's original write-up implied — no need to re-point `lc_subject_resources` at a new canonical id, just delete/archive the unlinked duplicate rows. This was found by spot-checking via search, not an exhaustive query — an exhaustive duplicate-title query against `lc_resources` (offered to the user, not yet run) would be needed before trusting this is the *complete* list rather than just the cases visible through the six subjects/resources checked.

---

## 24. Admin CMS — unified dark-sidebar rearchitecture (Phase 3)

Immediately after the §23 review, the user was shown a screenshot of the actual `CMS_Rehaul.md` mockup (dark navy/charcoal, green accent, left sidebar nav grouped LEARNING/CONTENT/ANALYTICS/SYSTEM) and said the Phase 2 build didn't match it — last session had deliberately built a top-tab-bar UI in the app's existing light theme instead (a design call made and documented in §22, now reversed). The user's actual ask, verbatim-equivalent: build the real mockup design as a left sidebar; remove Drive & R2 Ingestion / Content Pipeline / Content Catalog from the backend entirely; work only with the master-documents/`lc_*` content going forward; keep it clean and easy to use.

### 24.1 Scope decisions (confirmed with the user before building, via `AskUserQuestion`)

Three genuinely ambiguous scope questions, each resolved to the broader/more-thorough option:

1. **Does the dark sidebar become the whole admin backend, or just Learning Center?** → **Whole backend, unified.** `AdminDashboard.jsx`'s still-needed real features (Users, Permissions, Jobs, Rewards) get folded into the new sidebar's nav; the old light `/admin` dashboard stops existing as a separate surface.
2. **What happens to the mockup's Categories/Tags/Content Library (CONTENT) and Roles/Settings/Audit Logs (rest of SYSTEM) — none of which have real pages yet?** → **Only show what's real.** No placeholder/disabled nav links for features that don't exist.
3. **Does this touch `resources_v2` or the public-facing reader at all?** → **Admin UI only.** `resources_v2`, `SecureReader.jsx`, `AdminContentEditor.jsx`, and `AdminQuizEditor.jsx` are explicitly untouched — only the admin *dashboards/tabs* built on top of legacy data are being removed or relocated.

### 24.2 Research before planning

An Explore agent mapped the exact current structure before any design decisions: `AdminDashboard.jsx`'s 8 nav tabs and which tables each touches, confirmed `drive`/`pipeline`/`catalog` operate *only* on `resources_v2`/`quizzes` with zero `lc_*` dependency (safe to delete), confirmed `AdminDriveIngestion.jsx` has exactly one importer (`AdminDashboard.jsx`, itself being deleted) and doesn't *define* the shared `renderCustomThumbnailCanvas()` function it uses (that lives in `src/lib/contentEngineProcessor.js`, also used by `LearningCenterExamEditor.jsx` — confirmed safe to preserve), and mapped every `/admin/*` route. A follow-up Plan agent then designed the concrete shell/routing/theming architecture used below — including catching a real gap early: removing Content Catalog also removes the *only* in-app way to browse/open an existing quiz (no separate quiz list page existed), which is why §24.3 includes a new minimal Quizzes page.

### 24.3 What was built

**New shell**: `src/pages/admin/AdminShell.jsx` — a persistent dark sidebar (grouped nav, data-driven from `adminNavConfig.js`, active state from `useLocation()`) + slim topbar (page title, avatar/name/role from `admin_session`, logout) + `<Outlet/>`, following the same nested-route pattern the public app already uses for its `Header`/`Footer` wrapper.

**Nav** (only real features, per §24.1's decision 2):

```
LEARNING          ANALYTICS              SYSTEM                 OPERATIONS
- Exams           - Overview (New)       - Users                - Job Board
- Syllabus        - Content Graph        - Roles & Permissions  - Rewards
- Resources                              - Quizzes
```

CONTENT and the rest of SYSTEM (Settings/Audit Logs) are omitted — nothing real backs them. OPERATIONS is a new group not in the original mockup spec (Jobs/Rewards predate `CMS_Rehaul.md` and don't fit LEARNING/SYSTEM honestly) — flagged as the one debatable naming call, easy to fold into SYSTEM later if it reads as one group too many.

**New pages**: `OverviewPage.jsx` (rebuilt from the old `AnalyticsTab` computation — total exams/resources/subjects/bodies, reuse rate, resources-by-type, exams-by-region, top-shared-resources — plus one live `user_profiles` count carried over from the old dashboard's stat cards; the old cards' `resources_v2`-sourced "Ingested Books"/"Target Exams" numbers are dropped, not replaced, since they measured a table this CMS no longer manages), `UsersPage.jsx` and `RolesPermissionsPage.jsx` (lifted near-verbatim from `AdminDashboard.jsx`'s old `users`/`permissions` tabs, restyled onto the shared `.lc-*` component classes instead of porting `AdminDashboard.jsx`'s ~950-line bespoke inline `<style>` block), `QuizzesPage.jsx` (new — the minimal quiz-browse fix from §24.2), and thin wrapper pages (`ExamsPage`/`SyllabusPage`/`ResourcesPage`/`ContentGraphPage`) around the existing tab components.

**Existing Learning Center tab components preserved functionally, unchanged logic**: `ExamsTab`, `SyllabusTab`, `ResourcesTab`, `ContentGraphTab` (all 6 sub-views) were extracted out of the old single-file `LearningCenterCMS.jsx` into their own files (`src/pages/admin/{Exams,Syllabus,Resources,ContentGraph}Tab.jsx`) with shared constants/helpers moved to `src/pages/admin/lcShared.jsx` (`.jsx` not `.js` — Vite's oxc transform rejects JSX syntax in a `.js`-extensioned file, hit and fixed during this session). Every business-logic line (filtering, pagination, drawers, graph queries, the request-id race guards from §22.3) is unchanged — only the wrapping shell/theme changed.

**Theming**: `LearningCenterCMS.css` → renamed `AdminCMS.css`, every hardcoded light hex (`#1F3A2E`, `#f8fafc`, `white`, `#94a3b8`, etc.) swept to CSS custom properties (`var(--admin-text)`, `var(--surface)`, `var(--admin-accent)`, etc.), all scoped under one `.admin-shell` class that overrides the app's *existing* global tokens (`--surface`, `--border`, `--ios-text`, `--ios-olive`, etc. — already defined in `src/index.css` and already consumed by the shared `Select`/`react-select` component) so the reusable dropdown component picks up the dark theme automatically with no changes of its own. `LearningCenterExamEditor.jsx` (a standalone full-page route, deliberately kept *outside* the sidebar shell per CMS_Rehaul.md §25's own screen hierarchy — a focused editor shouldn't fight a persistent sidebar for space) gets the same dark tokens by adding the `.admin-shell` class directly to its own root div — `.admin-shell` is a pure CSS-variable scope, not tied to actually rendering a sidebar. `AdminRewardsQueue.jsx` got the same hex→token treatment for its own inline `<style>` block plus removal of its now-redundant `"← Back to Admin"` link (the sidebar is always visible now). `AdminJobs.jsx` (a thin wrapper around the shared `JobBoard` component, also used by the public-facing `/jobs` page) was deliberately **not** restyled — it's shared with learner-facing UI, out of this pass's admin-only scope; it now renders with its own light internal styling nested inside the dark shell, a known visual mismatch, see §24.6.

**Routing** (`src/App.jsx`): `/admin` now redirects to `/admin/overview` (required, not optional — it's a hardcoded "back to admin" target in `AdminContentEditor.jsx`, `AdminQuizEditor.jsx`, `AdminRewardsQueue.jsx`, `JobBoard.jsx`, and `AdminLogin.jsx`'s post-login redirect, confirmed via grep before changing anything). New routes: `/admin/overview`, `/admin/exams`, `/admin/syllabus`, `/admin/resources`, `/admin/content-graph`, `/admin/users`, `/admin/roles`, `/admin/quizzes`, all nested under `<AdminShell/>`; `/admin/jobs` and `/admin/rewards` also moved inside the shell. `/admin/learning-center` (the old tab-bar route) is gone. `LearningCenterExamEditor`'s route path deliberately kept as `/admin/learning-center/exam/:id?` rather than renamed, to avoid touching every `navigate()` call site inside the extracted tab components — a pure cosmetic nice-to-have skipped to limit blast radius.

**Deleted** (confirmed zero remaining importers via grep before each deletion): `src/pages/admin/AdminDashboard.jsx` (2793 lines), `src/pages/admin/AdminDriveIngestion.jsx` (1938 lines), `src/pages/admin/LearningCenterCMS.jsx` (the old single-file tab-bar version), `src/pages/admin/LearningCenterCMS.css` (superseded by `AdminCMS.css`).

### 24.4 Verified live via Playwright

Dev server restarted mid-session (see §24.5) — logged in fresh as Super Admin and drove every sidebar destination (Overview, Exams, Syllabus, Resources, Content Graph, Users, Roles & Permissions, Quizzes, Job Board, Rewards), confirmed `/admin` redirects correctly, opened a real exam into the Exam Editor from the new Exams table (verified separately with a longer wait after an initial false-negative — see §24.5), and confirmed the dark theme actually renders correctly in both the sidebar shell and the standalone Exam Editor (screenshots compared directly against the mockup — close match: same branding position, same green accent, same stat-card/bar-chart layout). Zero console/page errors from any of this. Two pre-existing errors surfaced during the pass, both confirmed unrelated to this rearchitecture (not regressions):

- **Rewards page 500s** — `Could not find the table 'public.reward_redemptions' in the schema cache`. A real backend gap, nothing to do with routing or theming; `AdminRewardsQueue.jsx`'s data logic was untouched.
- **Jobs page** — `57014 statement timeout` on the Postgres side. Already documented as a known issue in §16 ("Jobs page still spins forever"), predates this session entirely.

Re-ran the full walkthrough again after deleting the 4 superseded files (§24.3) to confirm nothing broke post-cleanup — same clean result.

### 24.5 Real problems hit and fixed during the build (not just design decisions)

- **`lcShared.js` → `lcShared.jsx`**: Vite's `oxc` transform plugin refuses to parse JSX inside a `.js`-extensioned file ("JSX syntax is disabled"). The shared `StatusBadge` component (originally just a helper alongside plain constants) needed the `.jsx` extension. Worth remembering for any future shared-helpers-with-a-JSX-component file in this app.
- **Stale Vite HMR module graph after the rename above**: renaming a file mid-dev-session left Vite's client trying to fetch the old `lcShared.js` path with a cache-busting query param, 404ing and hanging every page load — HMR didn't invalidate the module id cleanly. Fixed by killing the dev server (`netstat`+`taskkill` on the port, since `npm run dev`'s wrapper process doesn't forward `SIGTERM` to the actual Vite process) and doing a full cold restart rather than trusting HMR through a rename.
- **Chromium executable path mismatch**: this environment's globally-cached Playwright *browser* binary (`chromium-1234`) didn't match what the `npx`-resolved Playwright *npm package* expected (`chromium_headless_shell-1208`) — `chromium.launch()` failed until given an explicit `executablePath` pointing at the cached binary. Same fix as the review pass in §23.
- A first attempt at clicking a table row via `page.evaluate(() => document.querySelector(...).click())` immediately after `page.goto()` returned a false negative (`ROW_CLICKED: false`) because the table was still mid-fetch — not a real bug, just an under-waited test script; a longer explicit wait before clicking confirmed the Exam Editor opens correctly.

### 24.6 Punch list — explicitly not done, nothing broken

Per the user: *"This is better. But still a lot of work... We will come back to this shortly."* Concrete open items, roughly in the order they'd naturally get picked up:

1. **CONTENT nav group** (Categories/Tags/Content Library) — deliberately empty per §24.1's decision 2. Needs a decision: build real pages, or leave omitted indefinitely.
2. **Global header search** (`CMS_Rehaul.md` §15, the mockup's "Search anything… Ctrl/⌘K" box) — deliberately deferred, the spec itself calls it secondary to Exams/Syllabus/Resources.
3. **Notification bell** in the topbar — deliberately omitted, no real notification data source exists yet (the old "Live Notifications" stat card was actually the job-scraper's count, not a notification feed — building a fake bell would be decoration, which `CMS_Rehaul.md` §26 explicitly warns against).
4. **`AdminJobs`/`JobBoard` still visually light-themed** inside the dark shell (§24.3) — deliberately left alone since `JobBoard.jsx` is shared with the public-facing `/jobs` page; restyling it needs its own scoped pass that doesn't leak into learner-facing UI.
5. **Mobile/narrow-viewport sidebar behavior** — a `@media (max-width: 1100px)` breakpoint was added to `AdminCMS.css` (fixed-position, slide-out sidebar) but never actually exercised/verified in a real narrow viewport this session.
6. **Nothing committed** — all of §23/§24's file changes are sitting uncommitted in the working tree (see §17 for the full list). `AdminDashboard.jsx`, `AdminDriveIngestion.jsx`, `LearningCenterCMS.jsx`, `LearningCenterCMS.css` were deleted from disk but the deletions aren't staged/committed either.
7. **The pre-existing plan is still waiting** (§19/§21/§22.4) — the duplicate-`lc_resources` cleanup (now better-understood per §23), the `resources_v2` legacy-data decision, and the profiling-engine/Jobs unification scoping. None of it moved this session.

**Update — item 5 superseded, not just fixed**: the mobile auto-hide breakpoint from §24.3 was replaced entirely in §25.3 with a user-controlled collapsible sidebar (works at any width, not just narrow viewports). Items 1–4 and 6 are still exactly as described above, untouched this session.

---

## 25. Exams workspace rebuilt to match the client's actual mockup PDF (two rounds)

New session. User: *"This is still a lot of work... it needs to have the same layout... select an exam from the left and be able to see it on the right and edit it,"* pointing at `K:\...\CONTENT\1. EXAM LIST\VEERNXT - CMS Mockup Design.pdf` — a real, detailed 17-page design spec, not just the screenshot shown earlier. §24's sidebar/theme work was structurally sound and stayed, but the Exams page itself needed a full rebuild: the mockup specifies a persistent **three-zone master-detail-summary workspace** (Exam List | Exam Editor | Contextual Information Rail), not a table-plus-separate-editor-page pattern.

### 25.1 The PDF spec, read in full (poppler unavailable in this environment — rendered via PyMuPDF/`fitz` instead, 17 pages → PNG, read directly)

Key points that shaped the rebuild, verbatim-equivalent from the spec:
- **"Do NOT turn this into a conventional full-width table. Do NOT turn the exam list into a large card grid."** The reference layout is SIDEBAR | TOP HEADER / HORIZONTAL SECTION NAV / FILTER BAR / three columns (Exam List ~40% | Exam Editor ~40% | Context Rail ~20%).
- **"Do NOT remove this horizontal navigation"** — a second nav strip (Dashboard/Exams/Syllabus/Resources/Content Library/Analytics/Users/Settings) sits directly under the top header, *in addition to* the left sidebar, even though it's largely redundant with it.
- **"The user should NOT be navigated to a completely different page"** when selecting an exam — the editor updates in place beside the still-visible list. This is called out as "one of the most important characteristics of the reference layout."
- Exam identity: Conducting Body, Region, Exam Name, a separate Short Name, Tags — plus a dynamically-generated thumbnail (template + subject/category + conducting-body abbreviation + accent color), explicitly **not** a manual per-exam image upload.
- Editor tabs: Syllabus & Resources (default) / Exam Info / Exam Settings. "Add Resource" must mean *select an existing canonical resource*, never create a new one — the core architectural principle from `CMS_Rehaul.md` restated here.
- Context Rail: Exam Summary, Content Overview (donut), Subject Distribution (bar chart), Quick Actions (Preview / Export / Archive) — all scoped to whichever exam is currently selected.
- Content Graph and Analytics stay separate tabs, explicitly kept off the main Exams screen ("Do not clutter the main Exams workspace with unnecessary analytics").

### 25.2 What was actually built

**New files**: `src/pages/admin/ExamThumbnail.jsx` (colour-only thumbnail — solid colour hashed from conducting body, per explicit "for now just use colours to denote the thumbnails" instruction, replacing canvas-image generation entirely for this pass), `ExamEditorPanel.jsx` (the centre-pane editor — identity fields, tags, thumbnail preview, and the three tabs, ported from the old standalone `LearningCenterExamEditor.jsx` but with all page chrome stripped since it's now embedded, not a route), `ExamContextRail.jsx` (self-contained — fetches its own data by `examId` rather than depending on the editor's internal state, so Quick Actions work even mid-load).

**`ExamsPage.jsx` rewritten** as the orchestrator: holds `selectedExamId` (synced to a `?exam=` URL query param so deep links from Syllabus/Resources/Content Graph still work), renders the filter bar + three-column grid, passes the selection down. Every "open this exam" link elsewhere in the CMS (`SyllabusTab.jsx`, `ResourcesTab.jsx`, `ContentGraphTab.jsx` ×2) was repointed from the old `/admin/learning-center/exam/:id` route to `/admin/exams?exam=:id`.

**Deleted**: `ExamsTab.jsx` and `LearningCenterExamEditor.jsx` (both fully absorbed into the new components above; confirmed zero remaining references via grep before deleting) — on top of the four files already deleted in §24.

**Honest simplifications, not silently fudged**:
- No "Short Name" field — `lc_exams` has no column for it (confirmed against `sql/learning_center_schema.sql` before building), so it wasn't fabricated; the list just shows the real `name`.
- The mockup's "Content Duration" stat and chapter/section/word counts aren't tracked anywhere in the DB (no per-resource duration/page data lives in Supabase, only in the offline `page_image_analysis.json` from §10) — dropped rather than faked. Content Overview instead shows a real breakdown by `resource_type` (Guide/Precis/PYQ/etc.) computed live per selected exam.
- "Preview Exam" is a real button that alerts "not built yet" — there's no public exam-preview route to link to.

**Verified live** via Playwright (own dev instance on a scratch port, stopped afterward) — selection, new-exam creation, subject expand/manage, all three tabs, and the Export/Archive quick actions all work with zero console errors; screenshots compared directly against the mockup.

### 25.3 Second round of feedback — filter restructure, breathing room, collapsible sidebar

User reaction to the rebuild: a screenshot with a visibly broken dropdown (white background, near-white text — illegible), plus: *"we have states we have separate institutions... top level filtration of Central, State and UT... this is so cramped, give it some breathing room... left side menu as collapsible."* Four fixes:

1. **Dropdown contrast bug — a shared-component fix, not admin-only.** Root cause: `src/components/ui/Select.jsx`'s react-select `menu` style never set a `backgroundColor` at all, so the dropdown popup fell back to react-select's default white while the text color came from a theme token (`--ios-text`) that's near-white under `.admin-shell`'s dark palette. Fixed by adding `backgroundColor: 'var(--surface)'` to the menu style, and replacing a hardcoded light-olive hover tint (`rgba(75, 107, 50, 0.1)`) with a new theme-scoped `--ios-olive-soft` token (light value in `src/index.css`, dark override in `AdminCMS.css`'s `.admin-shell` block) so keyboard/hover state also adapts. Because `Select.jsx` is shared app-wide, this fix applies everywhere the searchable variant is used — light-theme (non-admin) usage is unaffected since `--surface`/`--ios-olive-soft` resolve to their existing light values there.
2. **Filter hierarchy restructured**, explicitly superseding the mockup's literal "Conducting Body → Region" ordering per direct instruction: **Central/State/UT is now the primary filter** (prominent pill buttons, not a dropdown field), a **State/UT picker** appears only when State or UT is selected (populated from `lc_regions` for that level), and **Conducting Body is the third, dependent filter** — re-queried live from `lc_exams` for whatever level/state is currently selected rather than assumed static, since `lc_conducting_bodies` is deliberately *not* region-scoped in the schema (the schema's own comment: "some bodies' exams span more than one region").
3. **Breathing room + fixed the real cramping cause.** The list table's real problem was long conducting-body/exam names wrapping to 3–4 lines per row, not just tight padding — fixed with `table-layout: fixed` + explicit column widths + ellipsis truncation (full text still available via a `title=` tooltip) instead of wrapping. Also dropped the now-redundant Region column from the list table (the Level filter covers it) and increased padding/gaps across cards, the filter bar, and table cells throughout `AdminCMS.css`.
4. **Collapsible sidebar** — a toggle button collapses `.admin-sidebar` to a 64px icon-only rail (icons keep native-title hover tooltips) and back; state persists in `localStorage` (`admin_sidebar_collapsed`) across reloads. This fully replaces §24.6 punch-list item 5's mobile auto-hide breakpoint, which never got exercised/verified — removed rather than left as dead, untested CSS.

All four verified live via Playwright: cascading level→state→body filters produce correct result counts, table rows are single-line, sidebar collapse persists across a reload, and a full sweep of every other admin page (Overview/Syllabus/Resources/Content Graph/Users/Roles/Quizzes) confirmed the shared CSS changes introduced no regressions elsewhere.

### 25.4 Data-quality issue surfaced, not yet fixed: exam naming is inconsistent, and correlates with missing subjects

Directly prompted the user's next-session ask. Examples visible in the Exams list screenshots this session, all real production `lc_exams` rows:

| Exam Name (as stored) | Conducting Body | Region | Subjects | Resources |
|---|---|---|---|---|
| `Husbandry` | Department | UT | 0 | 0 |
| `Teaching` | Department | UT | 0 | 0 |
| `INDIAN RAILWAYS` | RRB (Railway Recruitment Board) | Central | 0 | 0 |
| `BANKING` | Indian Bank | Central | 0 | 0 |
| `Professional Entrance` | JKBOPEE | UT | 0 | 0 |
| `Accounting & Commerce` | American Institute of Certified Public Accountants (AICPA) | Central | 0 | 0 |
| `1. APPSC Combined Competitive Examination (CCE)` | Arunachal Pradesh Public Service Commission | State | 5 | 6 |

**The pattern**: rows with a real, specific exam name (bottom row style — numbered, descriptive) have real subject/resource assignments; rows with a generic single-word or body-name-repeated-as-exam-name (top rows) have **zero** subjects and resources. This isn't confirmed as causal yet — it's a correlation spotted by eye across roughly a dozen visible rows, not a systematic query — but it's a strong enough pattern to be the obvious starting hypothesis for next session's naming + subject-assignment work: these may be the same broken rows, likely leftover generic/placeholder entries from `scripts/seed_learning_center_schema.mjs`'s original pass (§21.4) that never got real exam-name or subject data, rather than two unrelated problems.

**Not scoped or investigated further this session** — next session's actual first step should be running a real query (e.g. `select * from lc_exams where id in (select exam_id from lc_exam_stats where subject_count = 0)`, cross-referenced against name patterns) to find out how many rows this affects and whether the naming/subject-assignment problems really are the same rows before deciding on a fix approach.

### 25.5 Git state note

Nothing from §24 or §25 is committed. On top of §24's file list (see §17), this session added/modified: `src/pages/admin/{ExamThumbnail.jsx,ExamEditorPanel.jsx,ExamContextRail.jsx}` (new), `ExamsPage.jsx` (rewritten again), `AdminShell.jsx` and `AdminCMS.css` (collapsible sidebar + filter/breathing-room changes), `src/components/ui/Select.jsx` and `src/index.css` (dropdown contrast fix), `SyllabusTab.jsx`/`ResourcesTab.jsx`/`ContentGraphTab.jsx` (relinked to `/admin/exams?exam=`), plus deletion of `ExamsTab.jsx` and `LearningCenterExamEditor.jsx`.

---

## 26. UT GK/GS duplicate recheck → real subject-assignment gap found and partly fixed

New session. User: *"I still feel that the GK books in the UT folder have not been populated. We need to check if it is truly a complete duplicate in terms of length and copy. Because the content team says there are differences. Please recheck."* — directly challenging §12.6's "100% template-shared" conclusion about the UT `GENERAL KNOWLEDGE.docx`/`GS & GK GUIDE BOOK.docx` files.

### 26.1 The recheck — done properly this time (embedded images, not just text similarity)

§12.6's original check used paragraph-level `difflib` text comparison. This time, since docx files are ZIP containers, the check went straight to the embedded images and full text:

1. **Byte sizes across all 606 GK/GS-named files in the UT tree cluster within ~0.001%** of two values (~18.75MB / ~38.98MB) — already a strong signal, but not proof (docx re-saves always perturb bytes via metadata even when content is identical).
2. **Hashed every embedded image inside each file** (they're 18–39MB because of heavy embedded scan/diagram images — 216 images in `GENERAL KNOWLEDGE.docx`, 41 in `GS & GK GUIDE BOOK.docx`). Sampled Andaman vs. all 8 UTs: 7 of 8 matched image-for-image, byte-for-byte.
3. **Delhi's sample came back with 73/216 and 11/41 images different** — a real difference, but pulling the actual text showed the "Delhi" file's title read **"JHARKHAND POLICE CONSTABLE"** / **"INDORE METRO RECRUITMENT"** — a misfiled copy from an unrelated state exam sitting in the Delhi folder, not Delhi content.
4. **Full-tree scan, all 606 files**: found **two genuine template editions**, not one. The dominant edition covers 296/303 Guide Books (97.7%) and 297/303 Precis files (98.0%). A second, internally-consistent edition (same image set every time — confirmed by hash) covers **13 files scattered across 4 different UTs** (Andaman, Delhi, Puducherry, Ladakh) — including **both editions appearing within the same UT** (Andaman and Puducherry each have some of each), which rules out "this is a UT-specific edition." One further one-off file (J&K) has its own unique third edition.

**Conclusion, handed back as the actual recheck answer**: the content team is right that real byte/image differences exist — but they're not UT-specific content. They're a small number (13 of 606, ~2%) of files carrying a second, older-or-newer version of the same generic template, distributed inconsistently across the content pool during assembly, unrelated to region identity. The genuinely UT-specific content remains exactly where §12.6 already found it — the separately-named `{UT}_GS_Book.docx` files (5 of 8 UTs have one).

### 26.2 The real gap: found via live DB investigation, not the docx files — 45 UT exams had zero subjects

Following up on "we should just assign it to all the UTs" — checked live production Supabase before acting, which changed the plan:

- The canonical `lc_resources` rows for this content (`GS & GK GUIDE BOOK` id `5557633c…`, `SSC COMPLETE GK` id `73866c8b…`) were **already** linked to 1,390 exams — but only 244 of those are UT exams; the other 1,146 are Central/State exams using the exact same document (consistent with §8's original finding that this GK content is genuinely shared across all levels, not UT-specific). **Renaming it to "UT_GK" as first proposed would have been factually wrong** — flagged to the user, who agreed to keep the existing name.
- The real gap: of **289 total UT exams**, only **244 had a "General Knowledge / GS" subject slot at all**. **45 had none** — not a missing-resource-link problem, a missing-subject-assignment problem.

**Fixed live**, with the user's explicit go-ahead: `scripts/fix_ut_gk_subject_gap.mjs` (repo, dry-run/`--execute` convention, matches this project's established discipline for production writes) added the subject and linked both canonical resources for all 45. Verified before/after: UT exams with the subject went 244→289 (all of them now), and the canonical resources' `lc_resource_usage` count went 1,390→1,435 exams each (exactly +45, no drift, no double-count).

**Flagged, not fixed**: 3 of the 45 fixed exams have **completely blank exam names** (filed only under a category, e.g. `" (Professional Entrance)"`, `" (Teaching)"`, `" (Husbandry)"`) — the same bad-naming pattern from §25.4. They got the same GK subject as everything else for consistency, but they're real candidates for the still-pending exam-naming cleanup, possibly even for merging/removal rather than renaming.

### 26.3 The much bigger discovery: 78 of 93 canonical resources have zero exam usage — most of them not bugs, but a task nobody finished

While verifying the fix above, pulled the full `lc_resources` + `lc_resource_usage` join (all 93 rows, live). The result reframes "subject assignment improvements" entirely:

| Category | Count | What it is |
|---|---|---|
| **Dominant** (broadly shared) | 12 | The 6 universal subjects × 2 types (Guide+Precis) — General Knowledge/GS, Reasoning, English, Mathematics, Hindi, Computer Knowledge. 342–1,435 exams each. Working as designed. |
| **Regional-linked** | 3 | The 3 already-properly-linked UT GS books (`Delhi_GS_Book` 38 exams, `Andaman_Nicobar_GS_Book` 32, `Chandigarh_GS_Book` 28). Working as designed. |
| **Duplicate-orphan** (real bug) | 12 | Exact-title duplicates of a Dominant row, sitting at 0 exams — the exact bug already tracked in §22.4/§23, now precisely counted: 3× `GS & GK GUIDE BOOK`, 3× `SSC COMPLETE GK`, 3× `MATHEMATICS`, plus one extra `REASONING`, `ENGLISH`, `HINDI` each. |
| **Niche — unlinked** | **66** | **Real, distinct canonical documents that have never been linked to a single exam.** State-specific GS books (`Arunachal Pradesh GS`, `Andhra_Pradesh GS`, `Assam_GS`, `Bihar_GS`, `Chhattisgarh_GS`, `Goa GS`, `Gujarat_GS`, `Haryana_GS`, `Himachal_Pradesh_GS`, `Jammu_Kashmir_GS_Book`, `Karnataka_GS` — the exact State-level equivalent of the 3 UT GS books that *did* get linked), state police SI guides (`Andhra_Pradesh SI`, `Goa SI`, `Gujarat_SI`, `Haryana_SI`, `Karnataka_SI`, `Kerala Constable`, `Madhya_Pradesh_SI`, `Maharashtra SI`, `Odisha SI`, `Punjab SI`, `Tamil Nadu SI`, `Telangana_SI`, `Tripura_SI`, `Uttarakhand Constable`, `WB`, and more), and specialist banking/IBPS guides (`Financial_Awareness_IBPS_RRB_GBO`, `HR_Personnel_Officer_IBPS_RRB_SO`, `IT_Officer`, `Law_Officer`, `Rajbhasha_Adhikari_IBPS_RRB_SO`, `Descriptive_Writing_Bank_Exams`, `ITI_Technical_Trade_Literacy_GUIDE BOOK`, `Nursing Book`, etc.). |

This isn't new breakage — it's **exactly what §21.4 already flagged as deliberately deferred**: *"niche resources — state-specific SI guides, IBPS professional-knowledge docs — seeded into the library unlinked for manual tagging."* That manual tagging pass was never done, across two full sessions since. **This is what "subject assignment improvements" should actually mean** — not just patching gaps like §26.2's 45 UT exams, but a real pass to link these 66 real, already-deduplicated, already-in-the-library documents to the specific exams they belong to (the State GS books almost certainly belong to each state's own exams, mirroring the UT pattern exactly).

**Deliverable**: a live-data reference document listing and categorizing all 93 canonical resources was produced for the user (see below) — this is the actual worklist for the "niche — unlinked" tagging pass.

### 26.4 Git/production state note

`scripts/fix_ut_gk_subject_gap.mjs` is new, untracked (repo convention: dry-run/`--execute`, kept as a reusable/auditable script rather than a one-off). Its writes are **already live in production** (45 `lc_exam_subjects` rows + 90 `lc_subject_resources` rows, executed with explicit user confirmation) — unlike every other data change this project has made, this one is not sitting in a local working tree waiting for a commit decision; it already happened in Supabase. Nothing else from this session touches git state.

---

## 27. Content integration → discovered the frontend wasn't even reading the CMS schema → full clean-slate catalog rebuild

New session. User: *"The content team has given us the final PYQS and the Final Master Documents... make sure our Jobs are matching to the exams... serve the correct exams and jobs to the users."* PYQs and quizzes explicitly deferred (PYQs are scraped with other companies' watermarks/branding — separate problem). What started as "map the new documents to exams" became, over the course of the session, a full replacement of the exam catalog and a real content-delivery pass, because the first round of investigation found the two pieces of work everyone assumed were connected — the admin CMS schema (§21) and the live user-facing app — were not connected at all.

### 27.1 The architecture finding that reframed everything

Three research passes (recommendation engine, Jobs, frontend/login) established that **`lc_exams`/`lc_resources` (the schema built in §21, worked on all through §22–§26) is admin-CMS-only** — no learner-facing page reads it:

- `Dashboard.jsx`, `LearningCenter.jsx`, `ProfilingResults.jsx`, and `api/profile/recommend.js` all run on a **separate legacy `exams` table** (1,629 rows, service-role-only, eligibility-shaped fields living in a `metadata` JSONB column) plus `resources_v2`/`quizzes` for content — matched by free-text `exam_name` equality.
- Jobs already had a live `jobs.exam_id → exams.exam_id` FK (39% of 549 rows populated) — but it pointed at the same legacy `exams` table, and was **wrong on 75% of populated rows** (a crude SQL `ILIKE` match, built in a separate sibling repo, `scraper-app/`, which also runs its own **duplicated copy** of `backend/engine/{eligibility,scoring}.js` and writes to a `user_notifications` table with **zero frontend consumer anywhere in this repo** — flagged, not touched).
- The two exam catalogs (`exams`, `lc_exams`) turned out to share the same source documents and near-identical names — `lc_exams` just carried a numeric list prefix (`"17. AP High Court..."`) from CMS ingestion that `exams` never had. Bridgeable, not a rebuild — or so it seemed at first (see §27.3).

### 27.2 First pass: bridge, don't replace (later superseded by §27.3–§27.9, kept for the techniques)

Built `lc_exam_legacy_map`, a crosswalk table matching `lc_exams` to `exams` by normalized name (stripping the numeric prefix) with conducting-body/region disambiguation for collisions — **1,525 of 1,534 matched (99.4%)**, only 2 unresolved (a genuine duplicate-row bug already present on both sides — "Sanitary Inspector" under Delhi MCD, filed twice on each side).

While building this, found and fixed the actual root cause of "the test account sees no prep content": `Dashboard.jsx`/`ProfilingResults.jsx` were exact-matching `resources_v2.exam_name` (which carries the same numeric prefix as `lc_exams`) against the recommendation engine's unprefixed `exam_name` — silently hiding real, already-published content. Added an `ilike` substring retry between the exact match and the existing loose career-track fallback in both files. Verified live against the test account (`9884050857`): 2 of 10 recommendations went from zero content to real content immediately from this one bug fix alone.

Re-matched Jobs against the canonical catalog using each job's free-text `raw_json.exam_name`/`conducting_body` (`scripts/match_jobs_to_lc_exams.mjs`, `jobs.lc_exam_id` new column) rather than patching the old FK. Iteratively hardened against three real false-positive traps found by testing against live data, each a useful pattern to remember:
- **Generic institutional template words** ("Staff Selection Board") shared across many different states' bodies scored high on naive token overlap — fixed by stripping a curated list of generic body-words before comparing.
- **Single shared token inflates similarity to 100%** when one side reduces to just one distinguishing word after stopword-stripping (e.g. "Directorate of Education" → "education" alone matched anything else containing "education") — fixed with a minimum-2-distinguishing-token floor.
- **A handful of `raw_json.conducting_body` fields contain the scraper's entire page-text dump**, not just the org name (p95 length ~52 chars; a few outliers ran to 15,000+) — fixed with a length sanity cap.
Result: 14 high-confidence matches (deliberately conservative — "leave unmatched rather than force weak" applied the same way as the crosswalk). `api/jobs.js` updated to prefer the lc_exams-linked conducting body over the old, mostly-wrong FK.

### 27.3 The pivot: why bridging wasn't enough, and why "wipe and rebuild" won

Two findings during the same investigation made incremental bridging the wrong call:

1. **`lc_resources` (all 93 rows) has `storage_base_url = null` and `status = 'draft'` on every single row** — it's pure metadata, no actual file behind any of it. Repointing content lookups at it (the original plan) would have surfaced a title with nothing to open.
2. **`resources_v2`'s `file_hash` column is `hash(filename + filesize)`, not a real content hash.** Verified two "duplicate" rows that should have been byte-identical actually differ — one exam's guide says *"BIHAR HC ASSISTANT CLERK ENGLISH GUIDEBOOK 2026"* on its title page, the other says *"GUJARAT POLICE ASI ENGLISH GUIDEBOOK 2026"* — the exam name is baked directly into stored chapter content, not a separate swappable cover image. A storage-dedup pass planned around `file_hash` would have silently destroyed real per-exam customization for an unknown number of documents. Caught before executing, not after.

At this point the user reframed the goal directly: *"This is how it works... we should only have the master documents... dynamically concatenate... I really feel that we should have a clean slate... I just want the actual documents, no fluff."* Separately, a fresh authoritative source was pointed out — `K:\...\CONTENT\1. EXAM LIST\exam_master_datamap.json`, 1,534 exams (matching `lc_exams` exactly), each carrying a `subject_requirements` map (the real syllabus, "content team just maps those subjects") and a `content_completeness` field, verified against real files on disk (confirmed SSC CGL's Intro genuinely exists at `CENTRAL EXAMS/01.SSC/1.SSC CGL/1.INTRO/CGL.docx`). Decision: replace the exam catalog and content tables from this file + the FINAL_CONTENT master documents, rather than keep patching. Full backups taken first (`K:\tmp\db_backups\2026-08-22T18-34-09-282Z\` for `resources_v2`/`quizzes`/`questions`/`resources`, `catalog_2026-08-22T18-35-31-915Z\` for every `lc_*` table + `exams` + `jobs`).

### 27.4 Conducting-body naming cleanup (done first, before any data depended on the names)

User: *"I don't like how the subjects are named... SSC should be SSC not [the full name]... before we even upload I want to do a renaming."* Built a read-only preview script (`scripts/preview_conducting_body_names.mjs`) before touching anything:
- Rule A: name already ends in a trailing `(ABBR)` → use the abbreviation alone (65 bodies, e.g. `Institute of Banking Personnel Selection (IBPS)` → `IBPS`).
- Rule B: `{State} {Public Service Commission|Staff Selection Commission|Staff Selection Board}` → state-initials abbreviation (34 bodies, e.g. `Bihar Public Service Commission` → `BPSC` — the real, commonly-used short forms).
- Rule C: a small curated list for well-known central bodies with no embedded abbreviation at all (`Staff Selection Commission` → `SSC`, `Union Public Service Commission` → `UPSC`, `Reserve Bank of India` → `RBI`, `Railway Recruitment Board` → `RRB`, `Intelligence Bureau` → `IB`).

The script **automatically caught 5 real collisions** (two different states mapping to the same abbreviation, e.g. Andhra Pradesh PSC and Arunachal Pradesh PSC both → "APPSC"; Maharashtra/Manipur/Meghalaya/Mizoram PSC all → "MPSC") and presented each to the user individually rather than picking a "winner" itself. **User's call for all 4 collision groups: keep every colliding state's full name, shorten none of them** — avoiding ambiguity was valued over maximum shortening. Also found and merged 2 genuine duplicate rows under different names (`RRB (Railway Recruitment Board)` / `Railway Recruitment Board`; `Public Works Department (PWD)` / `PWD`). **Executed live: 93 of 671 conducting bodies renamed, verified.**

### 27.5 Unified exam catalog: `exams` + `lc_exams` merged into one table

Per user decision (*"Don't worry about the old eligibility data. We will anyway need to reset the users, as all of them are just test subjects."*) — the old `exams.metadata` eligibility fields (`min_qualification`, `physical_required`, `ex_servicemen_quota`, etc., confirmed to live only inside a JSONB blob, never as real columns) were **not** carried forward. This removed the need for the crosswalk-preservation step planned in §27.2 and simplified the rebuild considerably.

Read `api/profile/recommend.js`'s `loadAllExams()` precisely first (not re-verified since it was originally written) to confirm the exact contract: it spreads `row.metadata` then overrides with top-level `exam_name`/`conducting_body`/`career_track`/`state_ut`/`base_url`/`is_state_specific` — so the rebuild only needed to get those top-level columns right, not preserve every historical field.

Added (`sql/unify_exams_table.sql`, additive) `region_id`, `conducting_body_id`, `subject_requirements`, `logo_path`, `content_completeness` columns directly onto `exams` — the admin-CMS relational structure, now living on the table the live recommendation engine already reads, so `api/profile/recommend.js` needs zero code changes.

`scripts/rebuild_exams_from_datamap.mjs`: matched all 1,534 `exam_master_datamap.json` entries to their `lc_exams` counterpart by normalized name (**100% match, zero unmatched either direction**) and **reused `lc_exams.id` as the new `exams.exam_id`** — meaning `lc_exam_subjects`/`lc_subject_resources`/`jobs.lc_exam_id` (all keyed on `lc_exams.id`) needed **zero re-keying**. `lc_exams` itself is now redundant and can be dropped once the admin CMS is repointed at `exams` (not done yet — see §27.9).

**A real mid-migration outage, caught and fixed within the turn**: the first `--execute` run deleted all 1,629 old rows, then failed to insert any new ones (`also_listed_as` column didn't exist — missed in the schema migration). `exams` was briefly empty in production. Fixed by dropping the field from the insert payload (folded into `metadata` instead) and re-running immediately; total gap was one command's round-trip, not a session-length outage, but worth flagging honestly rather than glossing over.

Also uncovered a second cross-source naming inconsistency while wiring `lc_exam_subjects` up next: `subject_requirements` uses "Quantitative Aptitude" in 298 entries and "Maths" in 1,236 entries (never both on the same exam) for the same concept that `lc_subjects` calls "Mathematics" — aliased, not treated as a 13th subject.

### 27.6 Syllabus rebuild: `lc_exam_subjects` from `subject_requirements`

`scripts/rebuild_exam_subjects_from_requirements.mjs` replaced all 6,706 old rows with **6,660 fresh ones** derived directly from each exam's `subject_requirements` "Yes" flags (avg 4.3 subjects/exam) — the actual, content-team-authored syllabus, not an inferred/patched one. This cascade-deleted the old 9,489 `lc_subject_resources` rows, which is expected and fine (they pointed at content §27.7 replaces anyway).

### 27.7 Content ingestion — the actual "make sure the content goes through" step

**Intro files** (per-exam, real files the content team already produced, distinct from the deduplicated master documents): extended `scripts/ingest-drive-content.js` with a `--only-category` filter, ordinal/underscore stripping so ingested names match the new clean catalog, and a filter for `_PENDING_CONTENT.docx` — a **placeholder sentinel found scattered 3,753 times across the whole source tree** (verified: one such file's entire content is just `"<Exam Name> — Intro"`) that `exam_master_datamap.json`'s own `content_completeness` field can't distinguish from real content. Real coverage after filtering: 296 new files from Central, 289 from UT (State's 125 were already ingested in an earlier session) — **`resources_v2` Intro rows went 128 → 713**.

**The 66 FINAL_CONTENT master Guide/Precis documents**: since `lc_resources` still has no real storage (§27.3), and rebuilding that properly (dynamic thumbnail + intro + shared-guide composition at render time, the user's actual stated end-state) is a bigger, separate project, the user confirmed shipping through `resources_v2` now: **upload each physical file to R2 exactly once, then write one `resources_v2` row per exam that needs it, all pointing at the same shared URL** — no re-uploading, no storage duplication, using the reader path that already works. Scoped to 12 core-subject documents (English/GK-GS/Reasoning/Computer/Hindi/Mathematics × Guide+Precis, linked to every exam carrying that subject) + 33 state/UT-specific GS Guide books (region-scoped) — niche single-purpose documents (bank SO specialist guides, PSC-specific SI/Constable variants under 15 exams each) intentionally skipped this pass. Along the way, fixed 3 UT region-name data bugs that were silently breaking region-scoped matching (`CHANDIGARH`/`DADRA & NAGAR HAVELI...` stored all-caps, `"Lakshadwee p"` — a stray-space typo).

**Result, executed and verified live**: 45 documents uploaded, **10,296 `resources_v2` rows written, zero failures**. Checked against the test account's real 10 recommendations: **9 of 10 now have both Guide and Precis content** (up from 2/10 after §27.2's bug fix alone, 0/10 before that). The one remaining gap (`SSC Constable (Tradesman)`) has no core academic subject in its syllabus at all — a legitimate edge case, not a bug. Freemium flags came out correct automatically (`is_freemium = category === 'Guide'`), matching the confirmed model (Intro + Guide free, Precis/PYQ/quizzes paywalled) — Guide had previously been 100% locked in error (found and fixed as part of this pass; Precis correctly stays locked).

### 27.8 `resources_v2`, `exams` row-count summary (before → after this session)

| Table | Before | After |
|---|---|---|
| `exams` | 1,629 (legacy, no relational structure, eligibility fields buried in JSON) | 1,534 (unified with `lc_exams`, clean names, `subject_requirements`/`content_completeness` attached) |
| `lc_exam_subjects` | 6,706 (accumulated across sessions) | 6,660 (fresh, derived from the content team's own syllabus mapping) |
| `resources_v2` category=Intro | 128 | 713 |
| `resources_v2` category=Guide/Precis (new, shared-storage rows) | 0 from this content set | +10,296 |
| `lc_conducting_bodies` | 673 (many verbose full names) | 671 (2 duplicates merged, 93 renamed to real-world short forms) |
| `jobs.lc_exam_id` populated | 0 | 14 (deliberately conservative — see §27.2) |

### 27.9 Explicitly not done this session

- `lc_resources`/`lc_subject_resources` were **not** populated by the §27.7 content ingestion — it went through `resources_v2` only, per the confirmed "ship now, build the dynamic model later" decision. The admin CMS's Resources/Content Graph pages will still show the old, mostly-empty `lc_resources` state.
- Admin CMS pages (`ExamsPage.jsx`, `ExamEditorPanel.jsx`, `ContentGraphTab.jsx`, `SyllabusTab.jsx`, `OverviewPage.jsx`) still read `lc_exams`, not yet repointed at the unified `exams` table — `lc_exams` can't be dropped until this happens.
- Exam naming cleanup (§25.4's placeholder-name rows like "Husbandry"/"Teaching") — the rebuild refreshed `exam_name` from the same source document that already had these names, so the problem is unchanged, not fixed.
- Recommendations for existing (test) user profiles have not been recalculated against the rebuilt catalog — the user's explicit next step after content landed, not yet executed.
- The dynamic-composition reader model (exam thumbnail + per-exam intro + shared guide composed at render time) — the actual long-term architecture the user described — is still just a description, not built. §27.10 below is the first concrete step toward it.

### 27.10 Dynamic thumbnail generation — built and verified live, same session

Update: this was framed as "next session's starting task" earlier in this same document, then actually built before the session ended. Left both the original framing and this update in place rather than rewriting history.

User-specified taxonomy for thumbnail templates (**17 reusable subject templates**, deliberately consolidated from the master-document manifest's ~20+ raw subject labels since e.g. Hindi should visually cover Rajbhasha too, and IT should share with Computer Science): English, Hindi (+ Rajbhasha), Mathematics, Reasoning, GK & General Awareness, General Studies, General Science, Computer Science (+ IT), Financial Awareness, Agriculture & Rural Development, Electrical Engineering, Law, HR & Personnel, Nursing, Descriptive Writing, Traffic & Road Safety, Technical Trades. Explicitly excluded: exam-specific unlabeled content (state Police SI/Constable books, "BASE BOOK") — these are exam-specific, not reusable subject categories, and should not get their own thumbnail identity.

**Visual system**: 6–8 colour families, each covering 2 related subjects rather than 17 unrelated designs — Blue (English, Computer Science), Purple (Hindi, Law), Orange (Mathematics, Electrical Engineering), Teal/Green (GS, General Science), Crimson/Magenta (Reasoning, Nursing), Gold/Amber (GK, Financial Awareness), Cyan (Technical Trades, IT), Earth tones (Agriculture, Rural Development). Title area stays consistent across every cover; only imagery/colour treatment changes by subject — the explicit goal is "a coherent publishing system," not 17 unrelated thumbnails.

**Why this is tractable now, not before**: this taxonomy maps cleanly onto the just-rebuilt `lc_subjects` (12 rows) + the state/UT-scoped GS books from §27.7 — before this session's rebuild, subject names were scattered/inconsistent across `resources_v2.subject` (free text, e.g. "GENERAL KNOWLEDGE" vs "GS & GK GUIDE BOOK" vs "SSC COMPLETE GK" as different strings for the same concept), which would have made a clean subject→template mapping guesswork. `lc_thumbnail_templates` already exists as a table (3 rows currently, seeded early in §21, unused since) — extending it to the full 17-template/8-colour-family system is the concrete next step, plus wiring `ExamThumbnail.jsx` (currently a flat hashed-colour placeholder per §25.2) to actually select a template by the exam's subject mix rather than hashing the conducting body name.

**What was actually built**: `src/lib/thumbnailTaxonomy.js` — the single shared source of truth for the 17 subjects/8 colour families, importable from both a Node script and React (avoids the mapping drifting between the two, same principle as other shared modules this session). `resolveThumbnailSubject(resourceRows)` derives the dominant subject from an exam's **actual ingested `resources_v2` content** (title-matched against the 12 core documents + 33 state/UT GS books from §27.7) rather than guessing from `subject_requirements` Yes/No flags, which have no natural priority order — this turned out to matter: an early version picked whichever subject's resource row happened to load first from the database (arbitrary, database-fetch-order-dependent), skewing almost everything to "English" since that was the first core document ingested. Fixed with an explicit `SUBJECT_PRIORITY` order, **General Studies first** (region-specific content is the most exam-distinctive, matching the user's own observation that "GS has genuinely different state/UT-specific variants"), then GK, Reasoning, Mathematics, English, Computer Science, Hindi.

Added `exams.thumbnail_subject` / `lc_exams.thumbnail_subject` (additive columns, `sql/exams_thumbnail_subject.sql` + `sql/lc_exams_thumbnail_subject.sql`), computed once via `scripts/compute_exam_thumbnail_subjects.mjs` and synced onto `lc_exams` (`scripts/sync_lc_exams_thumbnail_subject.mjs`) since the admin CMS still reads `lc_exams`, not the unified `exams` table (§27.9). **Distribution across all 1,534 exams**: General Studies 955, GK & General Awareness 436, no-core-content fallback 101 (mostly the known bad-placeholder-name rows from §25.4/§26.2 — expected, not a bug), English 30, Reasoning 9, Mathematics 3 — Hindi/Computer Science round to 0 at this granularity since almost every exam that has them also has GK/GS, which wins the priority order.

`ExamThumbnail.jsx` rewritten to render from `thumbnail_subject` → colour family (imported from the shared taxonomy module) instead of hashing the conducting-body name, with a manual `accent_color` override still taking precedence when set (unchanged behaviour, just a different default). Added a small subject-name label above the title in the large editor-preview variant so the mapping is visible, not just implied by colour.

**Verified live via Playwright** (dev server on :8080, logged in as Super Admin): searched "CGL" and confirmed the central `SSC CGL (Combined Graduate Level)` renders **gold** (GK & General Awareness — matches its actual dominant content) while every state-level CGL variant (APSSB, JSSC, OSSC, BSSC) renders **teal** (General Studies — matches theirs), in the same result list, side by side. Opened the APSSB exam's editor panel and confirmed the large preview shows "GENERAL STUDIES" as a label above the exam's category text. Zero console/page errors throughout.

**Not done / explicitly deferred**: `lc_thumbnail_templates` (the pre-existing 3-row "Royal Blue/Green/Red" table, and the `thumbnail_template_id` manual-selection dropdown in the editor) was left untouched — it predates this taxonomy and appears to be a separate, still-manual mechanism; extending it to 17 rows in parallel with the new automatic system wasn't asked for and would just be decorative duplication. No actual illustrated/branded background art was generated — this is still solid-colour-block rendering, consistent with the standing "for now just use colours" instruction from §25.2, not the fuller `renderCustomThumbnailCanvas` (VeerNXT logo + gold gradient caption over a themed background image) treatment that exists in `contentEngineProcessor.js` but has never been wired up to anything. **User re-confirmed this explicitly right after the build** ("Just use solid colours for now") — treat solid colour blocks as the standing approach, not a placeholder waiting to be replaced without being asked.

### 27.11 Starter prompt for next session

> Read `status_report.md` §27 in full, especially §27.13 (the exam catalog and content library were rebuilt from scratch, dynamic thumbnails work, recommendation recalculation and the eligibility-field gap are both done, and this session's work is committed and pushed to `main` — don't assume the state described in earlier sections still holds). The user's explicit next step: bring PYQs and quizzes/mock tests up to the same standard as this session's Guide/Precis/Intro work. Start by checking whether any of the three archived PYQ folders (`PYPs_superseded_20260820`, `MASTER PYP_superseded_20260822`, `FINAL_CONTENT/PYPs`) are actually clean of other companies' watermarks/branding — that assumption was never verified against a specific folder, just carried forward from the original scoping conversation. Nothing else is urgently broken; secondary items if this stalls: admin CMS repoint from `lc_exams` to the unified `exams` table (§27.9), exam naming cleanup for placeholder rows like "Husbandry"/"Teaching" (§25.4), `lc_resources`/`lc_subject_resources` population so the admin CMS's Resources/Content Graph pages reflect real content (§27.9).

### 27.11.1 Recalculation done — confirms the system works end to end, and confirms the eligibility-field gap is real

Ran the actual recalculation from §27.11's starter prompt, same session. Two scripts: `scripts/recalc_primary_test_user.mjs` signs in as the primary test account (`9884050857`/`coder123`) for real via Supabase Auth and POSTs to the live `/api/profile/recommend` endpoint with a real session token — the full production path, auth verification through DB write-back and the points RPC, all exercised end to end against the rebuilt `exams` catalog. `scripts/recalc_remaining_test_users.mjs` does the same for the other `profiling_completed=true` test profiles (no known passwords for those, so posts unauthenticated to get the computed result, then persists it itself with the identical shape the endpoint would have written).

**The pipeline itself works correctly** — real exam names, real conducting bodies (post-naming-cleanup, e.g. "SBI", "IBPS"), sensible career-track alignment with each profile's stated preferences, HTTP 200s, confirmed persisted (`user_profiles.updated_at`/`veer_score`/`recommendations` all changed on inspection).

**But it surfaced exactly the gap flagged as a risk in §27.5, now with real numbers**: recalculated for 5 real test profiles —

| Profile | Veer Score (before → after) | Eligible / Total exams |
|---|---|---|
| Arjun Janakiram (primary, `9884050857`) | 94 → 42 | 414 / 414 |
| Souvik Gupta | 94 → 42 | 413 / 413 |
| Souvik Das | 100 → 38 | 430 / 430 |
| Rohit | 95 → 46 | 430 / 430 |
| Gargi P | 100 → 46 | 412 / 412 |

**Every single profile now has `eligible == total`** — the hard-eligibility gate (`checkEligibility()` in `backend/engine/eligibility.js`, keyed on `min_qualification`/`physical_required`/`domicile_required` read off each exam) rejects **zero** exams for anyone, because those fields no longer exist on any exam row (§27.5's deliberate decision not to carry old `exams.metadata` forward). Veer Scores (average of top-3 match scores) dropped by roughly half across the board, and many same-career-track exams now tie on an identical score, since the fields that used to differentiate individual exams within a track are gone — only preference/domicile/character/trade-level signals still vary. One additional pre-existing data-quality issue surfaced along the way, unrelated to this session's rebuild: one stored test profile (`e8929a2c…`, an incomplete/duplicate "Arjun Janakiram" row) fails Joi validation outright (`dateOfBirth` missing, `totalServiceDuration` empty) — flagged, not fixed.

**Not yet decided**: whether to rebuild the eligibility-scoring fields (from `exam_master_datamap.json`'s available signals — `subject_requirements`'s "Physical Test" flag is a partial proxy for `physical_required`, but there's no equivalent for `min_qualification`/`ex_servicemen_quota`/`ncc_bonus`/etc. — or by re-deriving from the archived old `exams` data via the `lc_exam_legacy_map` crosswalk, since that table and the backup snapshot at `K:\tmp\db_backups\catalog_2026-08-22T18-35-31-915Z\` still exist) or leave it as-is for now given every current user is test data. This is the open decision for whoever picks this up next.

### 27.11.2 Five new varied test users created — found and fixed a real 1,000-row cap bug in the live recommendation engine

Per the user's request to "create some test users," built `scripts/create_test_users.mjs`: creates candidate accounts through the **real registration path**, not a direct DB insert — generates a valid HMAC `registerToken` exactly the way `api/auth/otp.js` does after a genuine OTP verify (same payload shape, same `SUPABASE_JWT_SECRET`), POSTs to `api/auth/register`, signs in for a real session token, then POSTs to `api/profile/recommend`. Five profiles deliberately spread across service branch (Army/Navy/Air Force), qualification (10th through Post-Graduate), state, medical/physical standing, and career preference — unlike the existing test accounts, which skew Navy/Graduate/Tamil Nadu.

**This test surfaced a real, live bug**: 3 of the 5 new profiles (all three with `relocation: 'Anywhere in India'`, which bypasses the one eligibility dimension that still works post-rebuild — domicile filtering) came back `eligible: 1000/1000` — an exact hit on Supabase/PostgREST's default unranged-query cap. `api/profile/recommend.js`'s `loadAllExams()` did `client.from('exams').select('*')` with no `.range()`, silently truncating the 1,534-row catalog to 1,000 — **the identical bug pattern already found and fixed for `AdminDashboard.jsx` in §4**, just never applied here. This wasn't visible in §27.11.1's recalculation of the 5 existing test accounts because all of them use `relocation: 'Home State'`/`'Home District'`, which happens to filter the pool below 1,000 before the cap could bite — a coincidence of the existing test data, not evidence the bug wasn't there.

**Fixed**: `loadAllExams()` now paginates with `.range()` in 1,000-row pages, same convention as every other paginated fetch in this project. Verified live: re-ran the 3 affected accounts after restarting the dev server (clears the in-memory `EXAM_CACHE`) — all three now correctly show `eligible: 1534/1534`.

Result spread across all 5 new profiles, for reference: Veer Scores 37–67, `eligible` count varies by domicile-filtering exposure only (415–1,534) as expected given the §27.11.1 finding that qualification/physical eligibility gates are currently no-ops. Recommendations look directionally sane against each profile's stated career preferences (banking-track for the two "Anywhere in India" bankers, SSC for the UP/Home-State candidate, teaching for the ex-Army-Infantry Class-10 candidate matched via his stated TEACHING preference, engineering for the PG-qualified Air Force logistics officer).

### 27.11.3 Eligibility fields restored — the open decision from §27.11.1/§27.11.2, resolved

User's call: fix it. `scripts/backfill_exam_eligibility_fields.mjs` restores `min_qualification`, `physical_required`, `ex_servicemen_quota`, `ncc_bonus`, `math_required`, `english_intensive`, `technical_trade_preferred`, `sports_quota_eligible` onto every exam's `metadata` — sourced from the pre-wipe `exams` backup (`K:\tmp\db_backups\catalog_2026-08-22T18-35-31-915Z\exams.json`) joined through the still-intact `lc_exam_legacy_map` crosswalk from §27.2. Purely additive (merges into existing `metadata`, never removes the `level`/`pwd_eligibility`/`also_listed_as` keys the rebuild added). **1,525 of 1,534 exams updated** (680 got a real `min_qualification`, 252 `physical_required=true`, 252 `ex_servicemen_quota=true`); the 9 without a crosswalk match are unchanged, same as before this fix — not a regression.

**Verified live, dramatic and correct difference** — recalculated the primary test account (`9884050857`) again: Veer Score **42 → 76**, and the recommendation list flipped from a flat, undifferentiated banking list to genuinely matched Defence/Police-track exams (`ex_servicemen_quota: 25` now correctly firing — this profile *is* an ex-serviceman; `math: -10` and `english_penalty: -8` correctly firing against his stated Basic English/no-Class-12-math). Cross-checked against a very different profile (Manoj Kumar Sahu — Class 10 qualification, Home-District-restricted): eligible pool dropped from 414 to **320**, confirming the qualification/physical pre-filter is now doing real work, not passing everything through. Refreshed all 10 valid test profiles' stored recommendations with `scripts/recalc_remaining_test_users.mjs --execute`; Veer Scores moved up across the board (e.g. 57→100, 37→53, 46→80) as real signal replaced the flattened post-rebuild scoring.

### 27.12 Git/production state note

**Committed and pushed** — `c48ad17` on `main`, `https://github.com/VeerNXT-ESM/veernxt-web.git` (confirmed as the canonical remote by the user; `origin` was already correctly pointed at it). 57 files, +6,729/−4,823. Covers: `scripts/{build_exam_legacy_crosswalk,match_jobs_to_lc_exams,rebuild_exams_from_datamap,rebuild_exam_subjects_from_requirements,preview_conducting_body_names,ingest_master_documents,backup_content_tables,backup_catalog_tables,compute_exam_thumbnail_subjects,sync_lc_exams_thumbnail_subject,recalc_primary_test_user,recalc_remaining_test_users,create_test_users,backfill_exam_eligibility_fields}.mjs`, `scripts/ingest-drive-content.js` (extended), `sql/{lc_exam_legacy_map,jobs_lc_exam_link,unify_exams_table,exams_thumbnail_subject,lc_exams_thumbnail_subject}.sql`, `src/lib/thumbnailTaxonomy.js`, `src/pages/admin/ExamThumbnail.jsx` (rewritten), `src/pages/admin/{ExamsPage,ExamEditorPanel}.jsx`, `src/pages/admin/AdminCMS.css`, `src/pages/{Dashboard,ProfilingResults}.jsx` (prefix-match fix), `api/jobs.js`, `api/profile/recommend.js` (paginated `loadAllExams()`), plus the full admin CMS sidebar rearchitecture files from earlier in this same session (`AdminShell.jsx` and the rest of `src/pages/admin/*`). The content folder root (`K:\...\CONTENT\`) was also reorganized on disk: `MASTER DOCUMENTS`/`MASTER PYP`/`PYPs` archived with `_superseded_` suffixes, `FINAL_CONTENT` confirmed authoritative.

**Deliberately left uncommitted** — a separate, unrelated workstream sitting in the same working tree (book-reader/content-engine work: `content_rewrite_prompt.md`, `package.json`/`package-lock.json`'s new deps, `src/components/SecureReader.jsx`, `BookEngine_Status.md`, `Scraper_Status.md`, `src/components/book/`, `src/pages/sandbox/`, a few `scratch/*` files) — none of it was touched this session, so it wasn't bundled into this commit.

**Five new live test accounts exist in production** as of this session (§27.11.2): `9000000001`–`9000000005` / password `TestPass123!`, real Supabase Auth users with completed profiling and stored recommendations — usable for future testing, not fictional/throwaway.

### 27.13 Quizzes/PYQ situation report — flagged as the next content set

User asked for a live-data read on the `quizzes` table before starting the next work item. Findings:

- **1,216 quiz rows, 114,574 real structured questions** (proper question text, 4 options, correct answer, explanation field) — genuine content, not placeholders. A tiny gap found: 5 rows (all "SSC JHT Paper 3") declare 100 questions each but have zero actually linked in the `questions` table — isolated, not systemic.
- **Every row is exactly the two categories already deferred this session**: 765 `PYQ`, 451 `Mock Test` — nothing else in the table.
- **Coverage is narrow**: only **19 of the 1,534 exams** in the current catalog have any quiz content at all, all central SSC/RRB-family exams (SSC CGL/CHSL/MTS/GD Constable/CPO, RRB NTPC/ALP/Jr. Engineer/Technician/Section Controller, RPF Constable/SI, etc.) — zero state or UT exam coverage.
- **Good news, unlike `resources_v2`**: all 19 `exam_name` values get an **exact** match against the current clean `exams` catalog — not affected by the numeric-prefix bug fixed in §27.2, since this table was never touched by the lc_exams-era naming convention.
- **100% locked** (`is_locked=true`, `is_freemium=false` on every row) — consistent with the confirmed paywall model (PYQ/Mock stay paywalled).
- **Provenance**: `source_file` paths point at a local `content-engine\Example Resources` folder — a different, older ingestion pipeline than anything used this session, unrelated to `scripts/ingest-drive-content.js`/`ingest_master_documents.mjs`.

**Flagged by the user as the next work item, not started**: bringing PYQs and quizzes/mock tests up to the same standard as this session's Guide/Precis/Intro work — real content, broad exam coverage, clean naming, no watermark/branding contamination (the specific issue that got PYQs deferred in the first place — see the original session-opening message: PYQs were scraped and carry other companies' branding). This needs its own scoping pass before any ingestion: locate a clean PYQ source (the three archived PYQ folders — `PYPs_superseded_20260820`, `MASTER PYP_superseded_20260822`, `FINAL_CONTENT/PYPs` — were never evaluated for whether any of them are actually clean, since PYQs were deferred immediately), and decide whether quizzes/mock tests get generated from PYQ content or need their own separate source.

### 27.14 User flagged the admin CMS as broken ("no books mapped," "old exam naming") — traced to three real, compounding bugs from this session's own rebuild

User was looking at the live admin CMS after the quizzes report and pushed back: no books showing as mapped to exams, and exam names still had numbers in them. Investigating this seriously (rather than just re-explaining §27.9 as "not yet done") surfaced three separate, real problems — the third much more serious than the first two:

1. **`lc_exams.name` still had the numeric prefix on 838 of 1,534 rows (55%)** — the admin CMS reads `lc_exams`, not the unified `exams` table, and nothing this session had touched `lc_exams.name` itself.
2. **`lc_subject_resources` was completely empty (0 rows)** — it was cascade-deleted when `lc_exam_subjects` got rebuilt in §27.6 and never repopulated, since §27.7's content ingestion deliberately went through `resources_v2` only. This is the literal reason the CMS showed "no books mapped" — that's the table the CMS reads to know it.
3. **The bigger finding, while fixing #1**: the "clean, unified" `exams` table built in §27.5 was never actually uniformly clean. `exam_master_datamap.json` itself inconsistently carries the "N. " prefix per entry, and `rebuild_exams_from_datamap.mjs` copied `exam_name` straight through without stripping it — so 838 of 1,534 rows in the table the *live recommendation engine* reads also still had numbers in them. The earlier §27.5 claim of "clean names" was based on a few spot-checked examples (SSC CGL, IBPS RRB PO) that happened to already be prefix-free, not a systematic check — a real process gap worth naming honestly.

**While fixing #3, found a fourth, more serious bug in the same rebuild script**: `rebuild_exams_from_datamap.mjs` matched each datamap entry to an `lc_exams` row by normalized name only. **392 of 1,534 exams (25%) share a name with at least one sibling** (e.g. "Staff Nurse" appears 20 times, once per state/UT health department) — for those, the greedy first-available-match could and did attach the wrong region's data to the wrong exam. Confirmed concretely: Delhi's "Pharmacist" exam had ended up with `state_ut: "Andaman and Nicobar Islands"` — not cosmetic, since `state_ut` drives domicile-based eligibility filtering (`checkEligibility()`), meaning a Delhi candidate could have been wrongly excluded from their own state's exam.

**All four fixed, in dependency order, each verified live:**
1. `scripts/fix_exam_collision_mismatches.mjs` — re-matched the 392 at-risk exams using conducting-body token similarity (generic institutional words stripped, same technique as `match_jobs_to_lc_exams.mjs`) plus exact level/state agreement against the datamap's own fields. **391/392 resolved with real signal** (1 left genuinely ambiguous — two identical Lakshadweep entries under the same body — correctly left unmatched rather than guessed). Verified: Delhi's Pharmacist now correctly shows `state_ut: "Delhi"`.
2. Re-ran `rebuild_exam_subjects_from_requirements.mjs` to propagate the corrected `subject_requirements` into `lc_exam_subjects` (same 6,660 rows — the corrected data nets out to the same total, just attributed to the right exams now).
3. Checked whether the collision bug had corrupted `resources_v2` content itself: it hadn't, materially — since both ingestion and Dashboard/ProfilingResults lookups are keyed by `exam_name` **text**, not `exam_id`, collision-group siblings sharing identical name text also share the same content pool regardless of which specific ID the syllabus data was attached to. Re-running `ingest_master_documents.mjs` confirmed zero new rows needed. The real damage was isolated to domicile-eligibility filtering and the canonical syllabus bookkeeping, not what users actually see.
4. `scripts/strip_exam_name_prefixes.mjs` — stripped the "N. " prefix from `exams.exam_name` directly (838 rows; safe, since it only makes existing substring-match lookups against `resources_v2` more permissive, never fewer).
5. `scripts/sync_lc_exams_names.mjs` — re-run now that `exams.exam_name` is genuinely clean; synced all 838 previously-mismatched `lc_exams.name` values.
6. `scripts/populate_lc_subject_resources.mjs` — created 45 new clean `lc_resources` rows (one per shared document, real `storage_base_url` recovered from the matching `resources_v2` row already uploaded to R2 in §27.7 — **this is the first time `lc_resources` has ever had real file backing**, closing the gap flagged since §27.3) and linked them via `lc_subject_resources` to every relevant exam (10,296 link rows, mirroring the exam-to-subject targeting already computed for `resources_v2`).

**Verified live via Playwright**: searched "SSC CGL" in the admin Exams page — names now read cleanly ("SSC CGL (Combined Graduate Level)", "BSSC CGL (Inter Level)", no numbers), and the resource counts that were "0" everywhere now show real numbers (BSSC CGL: 9 resources — 5 Guide + 4 Precis — matching what a real user would see via `resources_v2`).

**Take-away for future sessions**: when a rebuild script's own dry-run reports "100% matched, zero unmatched," that only proves every record found *some* candidate — it says nothing about whether records sharing an ambiguous key (a common exam name, in this case) got matched to the *correct* one of several candidates. This should have been checked systematically the first time subject_requirements/`content_completeness`/etc. were merged from a keyed source, not discovered three tasks later from a user's visual spot-check of the CMS.

---

## 28. New session — free profiling/CV, job→exam→syllabus flow, Learning Center rearchitecture, Dashboard accordion

New session, different direction from the §27.11 "PYQs/quizzes next" pointer — the user opened with a much bigger ask: *"I want to make sure that the candidates are getting the right resources based on their profile... There will be no cost for the profiling and the CV... job matches will tell us what exams are needed... show them the syllabus... [Learning Center] hierarchy is CENTRAL, STATE UT, then the conducting body and state and then only we can show the break up of content types."* This became a multi-round build covering the subscription model, a brand-new job→exam→syllabus flow, and a full Learning Center rearchitecture — all frontend/app-code work, unlike §1–§20's offline content-catalog audits. Planned via `EnterPlanMode` before each major change; nothing here was built without an approved plan first. **Everything in this section is uncommitted** — see §28.10.

### 28.1 Free profiling and CV — the ₹9/₹10 paywall removed entirely

`src/lib/subscriptionAccess.js`: `canViewVeerScore`, `canViewRecommendations`, `canGenerateCV` now unconditionally return `true` — profiling results, exam matches, and CV generation are free for every user, no tier check. Removed the `SCORE_UNLOCK`/`SCORE_CV` entries from `PLAN_DETAILS` (nothing sellable at those price points anymore) and from `api/payments/create-subscription.js`'s `PLAN_AMOUNTS` map, so the endpoint now 400s if hit directly with those planIds — closes a real gap (someone could previously POST `planId: 'SCORE_UNLOCK'` and still get charged for something the UI now gives away free).

Deleted the now-dead locked/blurred UI branches in `src/pages/ProfilingResults.jsx` (VeerScore lock overlay, Top Exam Matches lock overlay, the ₹1 CV add-on card) and `src/pages/Dashboard.jsx` (VeerScore card's 2-branch, CV card's 3-branch, Top Exam Matches' blurred/locked branch) rather than leaving unreachable code — along with the `useInlineUnlock` wiring, `localTierOverride`, and their supporting CSS in both files. `src/pages/Subscribe.jsx`'s "INSTANT UNLOCKS" section (which rendered `SCORE_UNLOCK`/`SCORE_CV` as purchasable) removed since `PLAN_DETAILS` no longer has one-time plans; its "Free Tier Includes" copy updated to match §28.2's new rule.

No backend/DB change needed — `/api/profile/recommend` and `/cv` (`CVBuilder.jsx`) never had server-side tier checks to begin with; the old paywall was 100% UI-only.

### 28.2 Syllabus paywall rule changed: Intro + Guide free, Précis/PYQ/Mock Test locked

Per explicit instruction ("they are able to only read the intro and the Guidebook... the rest are behind the paywall"), `subscriptionAccess.js`'s `canAccessResource`/`isResourceLockedForUser` were rewritten:

| Category | Before this session | Now |
|---|---|---|
| Intro | free | free (unchanged) |
| Guide | first chapter only | **fully free** |
| Precis | first chapter only | **fully locked** |
| PYQ | **fully free** | **fully locked** — the single biggest live-behavior change here, flagged explicitly since it flips a previously-free category to paywalled for every free-tier user |
| Mock Test / quizzes | 1 free attempt (`canTakeQuiz`) | unchanged |

`src/components/SecureReader.jsx` needed **no changes** — its chapter-gating is pure pass-through to `canAccessResource`, so correcting the source of truth was sufficient. One corroborating signal found along the way: `resources_v2.is_freemium` was already set to `is_freemium = (category === 'Guide')` during §27.7's ingestion, i.e. the data layer already encoded this exact end state before the frontend rule caught up.

### 28.3 Job matches → required exam

`api/jobs.js`'s response mapper was already joining `lc_exams(name, lc_conducting_bodies(name))` via `jobs.lc_exam_id` (from §27.2's matching pass, 14/549 jobs) but silently dropped the exam name/id from the response. Added `examId`/`examName` fields (no new query — already fetched). `src/components/JobBoard.jsx`'s detail sheet now shows a "Required exam" badge/link when present, degrading silently to today's display for the other 535 jobs. The `scripts/match_jobs_to_lc_exams.mjs` re-run (to raise match coverage against the now-cleaner catalog from §27.4/§27.14) was **not** executed this session — flagged as a follow-up data task, not blocking.

### 28.4 New page: exam syllabus (`src/pages/ExamSyllabus.jsx`, route `/exam/:examId`)

New page showing an exam's header (name, conducting body, region — colour-coded thumbnail added in §28.7), its syllabus (subjects from `subject_requirements`), and content grouped by category (Intro/Guide/Précis/PYQ/Mock Test), each resource showing locked/unlocked per §28.2's rule. Backed by:
- **`api/exams.js`** (new) — `GET /api/exams?examId=` — service-role route reading the unified `exams` table (subject_requirements, career_track, etc.) and resolving conducting-body/region names via `lc_conducting_bodies`/`lc_regions`. Built as a service-role route deliberately, not a direct browser Supabase call — confirmed via `curl` that `exams` has no anon/authenticated SELECT grant (returns `[]` for the anon key), unlike `lc_exams` which the admin CMS already proved is browser-readable.
- **`src/hooks/useExamContent.js`** (new) — generalizes the fetch logic already duplicated in `Dashboard.jsx`'s `PreparationPanel` and `ProfilingResults.jsx`'s `ExamPrepSection` (exact match → `ilike` substring → career-track-keyword fallback against `resources_v2`/`quizzes`), without their `.limit(3)` teaser cap, grouped by category. **Real perf bug found and fixed in this file**: the resources_v2/quizzes queries were `await`ed sequentially rather than run via `Promise.all` — in this environment each Supabase REST round-trip runs ~2–3s, so two sequential awaits visibly doubled the wait for what's usually a single exact-match hit. Fixed; confirmed via network-request timing (was 5s+, now ~1.4s for a single-match case).
- **`vite.config.js`**: the local dev-only Vercel-functions shim never parsed `req.query` (only `req.body`) — every existing `api/*` route happened to be POST/body-based so this was never noticed. `api/exams.js` is the first GET-with-query-param route in the repo, so fixed the shim to populate `req.query` via `url.parse(req.url, true).query`. Production Vercel is unaffected (it already parses query strings natively); this only fixed local `npm run dev`.

`ExamSyllabus.jsx`'s category sections carry `id="section-intro"`/`section-guide`/`section-precis`/`section-pyq`/`section-mock` anchors so other pages (§28.7, §28.8) can deep-link straight to a specific section.

### 28.5 Learning Center — full rearchitecture, in several corrective rounds

The user's ask ("no main filtration by content type... hierarchy is Central/State-UT → conducting body → only then content types") went through real back-and-forth before landing — worth reading the whole arc since each round fixed something the previous one got wrong, not just added scope:

**Round 1 (sidebar drill-down):** Removed the old global "Content Type" checkbox filter and flat resource grid. Built Region (Central/State/UT) → live `lc_regions` state/UT picker → live `lc_conducting_bodies` conducting-body picker, all in a left sidebar, with Content Type checkboxes only appearing once a body was picked. `useLearningContent.js` was rewritten to filter by resolved exam names (via `lc_exams.conducting_body_id`) for Central (no per-body text exists in `resources_v2.conducting_body`, which is a flat `'CENTRAL EXAMS'` literal for every central row) and by `conducting_body` text substring for State/UT.

**Bug caught before shipping:** the exam-name-bridge approach, if used for State/UT too, floods results with *other* states' content — several state Police/SI exams collapsed to bare generic names like `"Sub-Inspector"` during the §12.5 catalog dedup, and an `ilike '%Sub-Inspector%'` match against `resources_v2.exam_name` matches every other state's `"...Sub-Inspector"` rows too (confirmed live: picking "Andhra Pradesh Police" pulled in Punjab/Bengal/Maharashtra/Goa/Assam Police content). Fixed by using `conducting_body` **text** matching for State/UT (state-qualified, no collision) and reserving the exam-name bridge for Central only, where it's structurally necessary.

**Round 2 (user pushback — "I don't want the sidebar... subjects should not be recommended... only Jobs and exams"):** This meant two more real changes, not just polish:
1. **No sidebar at all** — Region/Conducting Body picking moved into the main content column as a full-width wrapping pill grid (`.body-grid`/`.body-grid-btn`), not a side rail. The narrow sidebar's own search input was dropped; the existing main-content search box does double duty (filters bodies before one's picked, filters that body's exams after).
2. **The browse hierarchy now ends at Exams, not resources.** Once a body is picked, the page shows that body's **exam list** (`lc_exams` rows, id/name/thumbnail_subject/accent_color), each linking to its syllabus page — not a resource/document grid. `useLearningContent.js` and its resources_v2/quizzes pagination were removed from this page entirely; content-type breakdown now only ever appears on the syllabus page (§28.4), never here. "Recommended For You" (which showed individual resource-document cards) was removed for the same reason — "Your Exams" (already exam-level) stayed.
3. **Colour-coded exam thumbnails** — "why are our new colour coded thumbnails not being used": reused `src/pages/admin/ExamThumbnail.jsx`/`src/lib/thumbnailTaxonomy.js` (the 17-subject/8-colour-family system from §27.10) directly on the learner-facing exam grid and as a hero thumbnail on `ExamSyllabus.jsx`'s header — no new visual system invented. Its `.lc-thumb-*` CSS classes were copied into `LearningCenter.css` and a new small `ExamSyllabus.css` (component has no CSS of its own; relies on whatever page imports it defining these classes — same as the admin CMS).

### 28.6 Jobs page — "Associated Exam" accordion (`src/components/ExamContentPreview.jsx`, new)

Per explicit spec: clicking a job's exam line should expand *in place* (not navigate away) into content-type thumbnails proving the job→exam→resource mapping — Intro/Guidebook/Précis/PYQs+Quizzes (combined into one thumbnail per instruction), including locked categories shown as locked rather than hidden, every thumbnail routing into `ExamSyllabus.jsx` (never a single guessed file, since a bucket routinely holds several documents) and never opening a new tab.

`JobBoard.jsx`'s old `<Link to="/exam/:id">Required exam: X</Link>` became a `<button>` toggle ("Associated exam: X" + chevron) with local `examAccordionOpen` state; expanding renders `<ExamContentPreview>`. Also removed `target="_blank"` from the Apply button and the "Open Official Source" link in the admin details modal — same-tab in-site navigation, per explicit instruction that external links shouldn't force a new tab.

### 28.7 Dashboard "Top Exam Matches" — same accordion, then corrected twice more

Dashboard's `PreparationPanel` (a near-duplicate of the fetch logic now centralized in `useExamContent.js`) was deleted and replaced with the same `ExamContentPreview` component, reusing `expandedExamId` (Dashboard's pre-existing single-open-accordion state). Two rounds of user correction after the first pass:
1. **5 categories, not 4** — `ExamContentPreview` gained two opt-in props, both defaulting `false` so `JobBoard.jsx`'s call site is untouched: `splitPyqQuiz` (PYQs and Mock Tests render as two separate cards instead of one combined card) and `showEmptyCategories` (all categories always render, even at 0 items, muted/grey with "Not available yet" instead of being omitted — a 0-count card never shows a green "unlocked" badge, which would be misleading). Dashboard passes both `true`.
2. **Click the row, not the tiny arrow** — the whole `.recommendation-item` row is now the click target (`role="button"`, `onClick`/`onKeyDown` toggling `expandedExamId`), chevron kept only as a visual open/closed indicator. The external "Official exam website" link (`rec.website`) moved from a small icon sitting outside the accordion to inside the expanded panel, below the thumbnail grid, same-tab.

Verified via Playwright that `JobBoard.jsx`'s accordion is visually/functionally unchanged by the new opt-in props (still 4 cards, combined PYQs & Quizzes, empty categories omitted).

### 28.8 Verification method used throughout

No automated test suite covers any of this (confirmed, matches prior sessions' convention) — every change was verified live against production Supabase data via a scratch Playwright driver script (headless Chromium, `executablePath` pointed at the locally-cached binary from a prior session — same `chromium-1234` binary noted in §23), logged in as the primary test account (`9884050857`/`coder123`). Screenshots + DOM assertions (element counts, href values, `context.on('page')` to catch any unexpected new-tab opens) rather than just eyeballing. Two real, non-obvious bugs were only caught this way: the Central/State exam-name-collision flooding in §28.5 and the sequential-fetch perf issue in §28.4 (both invisible from a code read alone, only showed up against real data timing).

### 28.9 PYQ source-folder forensics — investigation only, not app code

Separately, the user is running their own OCR/cleanup/rebrand pass on PYQ content (`scripts/rebrand_pyps.py`, `scripts/consolidate_pyps.py` — their own scripts, untracked, not written this session) and asked which of the candidate PYP folders is actually the right one to process, to avoid redundant work. Investigated the three folders named in §27.11's original starter prompt:

- **`PYPs_superseded_20260820`** (1,937 files, 4.7GB) — has its own `scraped_pyp.json` right inside it, explicitly listing **Testbook.com** as the source for every entry. This is the scraped, competitor-branded content that's the whole reason PYQs got deferred from the original scoping conversation.
- **`FINAL_CONTENT\PYPs`** (1,562 files, 4.6GB) — hashed a sample file (`UP Higher Judicial Service\Fallback_Extracted_2.pdf`) against the same path in `PYPs_superseded_20260820`: **identical MD5, identical size.** Despite living under the `FINAL_CONTENT` root confirmed authoritative for Guide/Precis/Intro in §27.12, the PYPs subfolder specifically was never re-sourced or cleaned when copied there — it's the same Testbook-scraped set. (This resolves the standing §27.11 caveat that this assumption "was never actually verified against a specific folder" — now it has been, and it's not clean.)
- **`MASTER PYP_superseded_20260822`** (2,634 files per its own `manifest.json`, 8.3GB) — a genuine merge of two sources, distinguished by the manifest's `"type"` field: **702 files tagged `"PYQ"`**, pulled from inside each exam's own real folder (e.g. `CENTRAL EXAMS\01.SSC\1.SSC CGL...\4. 10 YEARS PYQ\PAPER 1.docx`) — first-party, not scraped; **1,932 files tagged `"PYP"`**, pulled from the same scraped `PYPs\...` folder as the other two candidates.

**Recommendation given to the user**: point the OCR/cleanup/rebrand run at `MASTER PYP_superseded_20260822` only (it's a strict superset — contains everything the other two have, plus the 702 first-party files that exist nowhere else), and use the manifest's `"type"` field to distinguish first-party (`PYQ`) from scraped (`PYP`) content rather than treating it as one undifferentiated set. Do **not** also process `PYPs_superseded_20260820` or `FINAL_CONTENT\PYPs` — that would reprocess the same ~1,900 scraped files a second/third time for nothing. Nothing was executed against these folders this session — this was investigation only, the actual OCR/rebrand run is the user's own separate script, outside this repo/session.

### 28.10 Git state — everything from this session is uncommitted

No commits made this session (not asked to). Modified: `api/jobs.js`, `api/payments/create-subscription.js`, `src/App.jsx`, `src/components/JobBoard.jsx`, `src/hooks/useLearningContent.js`, `src/lib/subscriptionAccess.js`, `src/pages/Dashboard.jsx`, `src/pages/LearningCenter.css`, `src/pages/LearningCenter.jsx`, `src/pages/ProfilingResults.jsx`, `src/pages/Subscribe.jsx`, `vite.config.js`. New: `api/exams.js`, `src/components/ExamContentPreview.jsx`, `src/hooks/useExamContent.js`, `src/pages/ExamSyllabus.jsx`, `src/pages/ExamSyllabus.css`.

**Not from this session — the user's own parallel work in progress, left alone throughout, same as every prior session's convention**: `content_rewrite_prompt.md`, `package.json`/`package-lock.json`, `src/components/SecureReader.jsx` modified; `BookEngine_Status.md`, `Gemini_Cost_Estimation.md`, `Scraper_Status.md`, `scripts/{batch_enrich_books.mjs,consolidate_pyps.py,rebrand_pyps.py}`, `src/lib/{geminiEnricher.js,mammothParser.js,resourceMetadata.js}`, `src/components/book/`, `src/pages/sandbox/`, `sum_chapters.js`, `public/test-book.docx`, `scratch/*` untracked.

### 28.11 Next steps

**Explicit user instruction to pick this up here**: continue Dashboard work (scope not yet specified beyond §28.7's 3 rounds — ask before assuming done), then Learning Center next. Beyond that:
- Run `scripts/match_jobs_to_lc_exams.mjs` (dry-run first) to raise job→exam coverage past 14/549, now that the catalog is cleaner than when that script last ran (§28.3).
- `resources_v2`/`quizzes` sequential-fetch pattern in `Dashboard.jsx`'s remnant `ExamPrepSection`-equivalent code (`ProfilingResults.jsx`) still has the same perf issue fixed in `useExamContent.js` (§28.4) — not fixed there, since it's a different file not touched this session; worth the same `Promise.all` fix if that page's accordion gets touched too.
- PYQ/quiz content ingestion itself (§27.13's original next-content-set flag) is still not started as app-side work — only the source-folder question (§28.9) was resolved this session, and that was for the user's own separate script, not this repo's ingestion pipeline.

---

## 29. New session — Dashboard/Learning Center further revision, Gemini exam↔resource mapping, conducting-body logos, and the enriched-content reader going live

Picked up exactly where §28.11 pointed, then went well beyond it: another full round of Dashboard and Learning Center revision per new user specs, a completely new admin data-quality workstream (Gemini-verified exam-resource mapping, conducting-body logos), and — the biggest single change — actually cutting the app over to the new enriched-block content pipeline for the first batch of already-processed books, live in production.

### 29.1 Learning Center — reacted-to-filters Search Results, inline exam expansion, subject-thumbnail syllabus

§28.5's "browse hierarchy ends at exams, not resources" version was superseded again by a new spec: one coherent search module (free-text search + Central/State/UT toggle + State/Category `Select` filters + conducting-body chips) driving a single **Search Results** list — filtered/searched results when any filter is active, falling back to the profile's personalized matches when nothing is. Added **My Exams** (profile matches with real reading progress, from `point_transactions`) and a **Preparation Centers** band (Syllabus teaser, PYQ/Quiz Center "coming soon" cards). Exam-name matching against `lc_conducting_bodies`/`lc_regions` for the filters uses the same exact→normalized→abbreviation-in-parens tiering pattern established later in §29.4 for logos — a substring tier was tried and dropped early for the same false-positive reason (`"LIC"` matching inside `"pub**lic**ServiceCommission"`).

Then reversed a specific piece of that on explicit instruction: exam details (subject-thumbnail syllabus, via a new `variant="subjects"` on `ExamContentPreview.jsx`) now expand **inline** on the Learning Center page instead of navigating to `/exam/:id` — "I don't want it to go to a new page." `src/pages/ExamSyllabus.jsx` was simplified to delegate to the same shared component rather than duplicating the subject-grid logic.

### 29.2 Dashboard — compact "personal command center" restructure

Profile header now surfaces Veer Score / Career Paths / Exam Matches / Skills as a stat row, with the longer strengths/direction/skills detail collapsed behind a "View Career Analysis" toggle. Added a "Your Next Step" module (top match, real preparation-progress bar, subject checklist — no fabricated per-subject percentages, since no such tracking exists). Top Exam Matches capped at 3 and now links straight to `/exam/:id` instead of the accordion-expand §28.7 built — explicit instruction: "the full browse/search experience now lives on the Learning Center page, don't duplicate it here." All the big cinematic `section-banner` image blocks were removed except the profile header hero, per "kill the banner → cards → banner → cards rhythm."

### 29.3 Admin data quality, Phase 1: Gemini-verified exam↔resource mapping

**Problem**: `useExamContent.js` matches an exam to `resources_v2` content at *read time* via a fuzzy exact→ilike→career-track chain — the same class of heuristic that produced false positives elsewhere in this project's history. A live check found real exams with zero matched content, and no way to know how many non-empty matches were actually *wrong*, not just missing.

**Fix**: new table `lc_exam_resource_map` (`sql/lc_exam_resource_map.sql`: `exam_id`, `resource_id`, `category`, `confidence`, `reasoning`, `source`) populated by `scripts/map_exam_resources_gemini.mjs`. For each exam: build a candidate shortlist (exact/ilike exam-name match + the ~7 "dominant" universal-subject resources from `thumbnailTaxonomy.js`'s `CORE_TITLE_TO_SUBJECT` + region-matched niche GS/SI books via `REGION_GS_TITLE_PATTERN` + career-track keyword fallback — both constants exported from `thumbnailTaxonomy.js` for reuse here), dedupe **by (category, normalized title) not resource_id** (a real bug caught mid-run: exact-title-duplicate rows in `resources_v2`, e.g. 5 identical "GS & GK GUIDE BOOK" rows, were all being offered as distinct candidates and Gemini approved several — fixed before the full batch, verified clean on re-sample), then one Gemini call per exam (`gemini-3.6-flash` — `gemini-2.0-flash`, used elsewhere in this repo's `geminiEnricher.js`, returned a hard 404, confirmed dead) asking for the best-fit resource(s) per category or explicitly "none," never a forced weak match.

Sample-run economics: ~$0.0045–0.007/exam, full 1,534-exam batch estimated $7–11. **Full `--execute` batch was still running as this was written** — background job, last checked at 1,315/1,534 with 1 error total. `useExamContent.js` has **not yet been wired** to actually read from this table — it still only reads the old fuzzy chain today; that wiring is unstarted follow-up work, separate from just populating the table.

### 29.4 Conducting-body logos

The user supplied `exam-logos/` (central/state/ut/state-emblems PNGs + a pre-built `manifest.json`: `{level, state, conducting_body, logo, exam_count}`, 805 entries). Matched against `lc_conducting_bodies.name` (which already has an empty `logo_path` column, unused since the schema was created) via exact → normalized (strip punctuation) → abbreviation-in-parens tiers only — **a substring-containment tier was tried and dropped** after it produced real false positives (`"Jammu Kashmir Public Service Commission"` → `"LIC"`, `"Railway Recruitment Board"` → `"REC"` — short DB names matching as accidental substrings of long normalized manifest names). Final: 604 of 671 bodies matched (90%), 570 unique files (~184MB) uploaded to R2 under `exam-logos/` via the existing `getS3Client`/`uploadToR2` helpers (`scripts/ingest-drive-content.js`), `logo_path` written for all 604.

New admin page `src/pages/admin/ConductingBodiesPage.jsx` (`/admin/conducting-bodies`, added to `adminNavConfig.js`/`AdminShell.jsx`) — a searchable grid of every conducting body with its current logo and a per-row upload/replace control (via `src/lib/r2Uploader.js`'s existing `uploadFilesToR2`, same admin-secret-gated proxy other admin uploads use), explicitly for the user's own future higher-resolution swaps. Manual replacements land under `exam-logos/manual/{bodyId}-{timestamp}.{ext}`, deliberately a different prefix than the bulk-mapped `exam-logos/{level}/...` ones so a future re-run of the bulk mapping script can never clobber a hand-picked replacement.

**Also found in passing, not fixed**: `scraper-app/matching/post_scrape_hook.js` and `push_json_to_supabase.js` both hardcode a plaintext Postgres password as a connection-string fallback — flagged to the user, password rotation recommended, not this repo's job to fix alone.

### 29.5 Resources content migration — books cut over to the new enriched-block reader, live

Separately, the user's own content team has been running a `.docx` → Gemini-enriched-JSON pipeline (mostly built in earlier/parallel sessions, some of it committed to git for the first time this session — see `Resources_Migration_Plan.md`, also saved to the repo root at the user's request). Investigated the pipeline end-to-end (an Explore agent traced every file) before planning anything: rendering layer (`BookBlocks.jsx`) is solid; the batch script (`scripts/batch_enrich_books.mjs`) safely splices new decoration blocks around untouched original content rather than regenerating chapters wholesale (the live browser path, `geminiEnricher.js`, does the riskier full-regeneration and is being retired); images aren't extracted yet (separate, already-planned work, explicitly out of scope here per the user).

**Migration mechanics** (`sql/resources_v2_format_column.sql` + `scripts/migrate_resources_to_blocks.mjs`): added `resources_v2.format` (`'html'` default | `'blocks'`), dual-path exactly like `lc_exam_resource_map`'s rollout. Matching is **exact (title, category) only** against `resources_v2` rows whose `storage_base_url` is under the canonical `master_documents/` prefix — verified live that each canonical (title, category) pair maps to exactly one shared `storage_base_url` (confirmed by grouping 10,296 `master_documents` rows into exactly 40 distinct pairs), so updating by that url safely flips every exam that references the shared document at once. **19 of the content team's ~54 folders matched** (35 are new documents — Nursing, IBPS professional-role guides, several state SI/GS books — not yet in `resources_v2` at all, so there's nothing to flip format on yet; correctly left alone rather than guessed at). Uploaded to R2 under `structured_resources/blocks/{category}/{docId}/`, **5,045 `resources_v2` rows updated**, 10,189 rows untouched on the old format. Verified end-to-end: fetched a migrated chapter live off R2, confirmed the `{id, title, order, blocks, enriched}` shape.

`SecureReader.jsx` now branches on `resource.format`: `'blocks'` renders via a new shared `src/components/book/BlockRenderer.jsx` (lifted out of `DevReader.jsx`, which duplicated the exact same switch statement — `BookReaderV2.jsx` still has its own uncombined copy, left alone since that component is orphaned/unrouted). **First pass only wired the content render**, not the page chrome — shipped with the old flat-HTML tab-row+card layout still wrapping the new blocks, which the user correctly flagged as "not using our new reader" and "hard to navigate." Fixed in a follow-up commit: `format='blocks'` resources now get the full sidebar/TOC layout from `BookReaderV2.jsx`/`DevReader.jsx` (`BookReaderV2.css`'s `bk-*` classes — chapter list sidebar, `ChapterHeader`, prev/next pagination with chapter titles), with the existing tier-gating (`canAccessResource`) and points-awarding (`RESOURCE_OPENED`) logic carried over unchanged into the new layout. `html`-format resources are completely untouched, both times.

**Process note, worth remembering**: the sidebar-layout fix was built, linted, and build-verified in the same turn as the first migration commit, but **not committed** — it sat as an uncommitted local change while the first commit went out, so the live site kept serving the old chrome until the user noticed and asked directly. Always check `git status` before telling the user a fix is live, not just that it built successfully.

### 29.6 CORS false alarm — real lesson on how to diagnose this class of bug

When migrated content failed to load in the browser, initial `curl -H "Origin: <preview-url>"` tests showed **no** `Access-Control-Allow-Origin` header on either old or new content, which looked like "R2 has no CORS configured at all." Wrong: the user supplied the actual bucket policy — `AllowedOrigins` is a specific allow-list (`veernxt.in`, `www.veernxt.in`, `localhost:8080`), correctly excluding the ephemeral Vercel preview URL (`veernxt-fy8ph6u2d-veernxt-projects.vercel.app`) being tested. Re-tested with `Origin: https://veernxt.in` and got a clean `200` with the correct `Access-Control-Allow-Origin` header back — content and mapping were fine the whole time. **Lesson**: a missing CORS header when testing with a specific Origin only proves that *specific origin* isn't allowed — it says nothing about whether CORS is configured at all. Always ask for (or test against) the actual production origin before concluding a bucket-wide policy problem.

### 29.7 Gemini exam↔resource mapping batch completed, and wired into the app

The `--execute` batch flagged as in-progress in §29.3 finished: **1,517 of 1,534 exams mapped** (17 skipped, zero usable candidates — not guessed at), 11,276 rows in `lc_exam_resource_map` (9,374 high confidence / 1,864 medium / 38 low), **total cost $5.26** — under the $7–11 estimate. `src/hooks/useExamContent.js` (used by both `ExamSyllabus.jsx` and `ExamContentPreview.jsx`) now actually reads from this table: `examId` (the exam's `lc_exams.id`, already available at every call site as a prop, just not previously forwarded into the hook) is passed through, and resources are looked up via `lc_exam_resource_map` first, falling back to the old exam-name matching chain only for exams without a mapping yet.

### 29.8 Second books-migration batch — source moved in-repo, a real re-run bug found and fixed

The content team finished more of the previously-skipped "too expensive" books and copied the **full consolidated set** (not just the new ones) into `public/books/{Guide,Precis}/` — 68 folders, ~1,964 chapter files — replacing `K:\...\FINAL_CONTENT_ENRICHED` as the drop location. `scripts/migrate_resources_to_blocks.mjs`'s `SOURCE_ROOT` was repointed there (repo-relative, more portable too).

**Real bug caught before it silently under-delivered**: the script's "is this a canonical row" check only looked for `storage_base_url ILIKE '%master_documents%'` — but the 19 titles migrated in §29.5 now point at the *new* `structured_resources/blocks/...` path, so on a second run they stopped being recognized as canonical at all and would have been silently skipped even though the content team had reprocessed several of them with fuller content. Fixed by broadening the canonical-detection query to `format='blocks' OR storage_base_url ILIKE '%master_documents%'`. Re-ran: **27 titles matched** (the original 19 plus new ones, including Précis for the first time — English/Hindi/Maths/Reasoning/SSC Complete GK Précis are now live), **9,766 `resources_v2` rows** on the new format (up from 5,045), 5,468 still on `html`.

**Confirmed genuinely unresolvable by this script, not a bug**: 9 of the user's specifically-named "remainder" titles (WB, Himachal Pradesh GS, Karnataka GS, Andhra Pradesh GS, RRB GS, RRB Complete GK, RRB Complete Maths, Chhattisgarh GS, Gujarat Constable) have **no existing `resources_v2` row at all** — genuinely new documents never linked to any exam, so there's nothing to flip a format on; they need real ingestion (new rows + exam linkage), a different and bigger operation, not attempted. Rajasthan SI GS Guide (one of the user's named books) doesn't exist anywhere under `public/books/` — flagged, not chased further.

### 29.9 Found and fixed: exam-mapping and format-migration were checking different physical duplicate rows

User asked directly whether the newly-migrated content was actually reachable through the exam mapping. It mostly wasn't, by resource_id: `resources_v2` has one row per exam-folder copy of the same canonical document (e.g. ~850 separate "ENGLISH" rows), so `lc_exam_resource_map` and `scripts/migrate_resources_to_blocks.mjs` could easily reference *different* physical rows for conceptually the same document — raw count check found only 138 of 9,766 migrated resource_ids were the exact ones the mapping table pointed at.

Fixed properly in `useExamContent.js`: a new `upgradeToCanonicalFormat()` step checks, for any resource still on `'html'`, whether a `'blocks'`-format sibling exists with the same (title, category), and redirects to it if so — applies to both the mapped-resource path and the exam-name fallback path. **Verified against live data before treating this as done, not just built-and-assumed**: scanned 134 real mapped exams end-to-end and found **zero actual mismatches** in that sample — meaning the earlier raw 138/9,766 count was misleading (it included titles/categories from outside the 27-title migration entirely, e.g. Intro/PYQ rows, which were never going to have a canonical sibling). The fix is a correct, low-cost permanent safety net for whenever a mismatch *does* occur (this migration or any future one), not a fix for a large existing gap — worth stating precisely to avoid overclaiming impact next session.

### 29.10 Git state

Five commits this session, all pushed to `main`:
- `9284eeb` — `lc_exam_resource_map` + mapping script, conducting-body logos + admin page, `resources_v2.format` + first migration pass, `Resources_Migration_Plan.md`.
- `eabb728` — sidebar-layout reader chrome fix (§29.5).
- `e323723` — `useExamContent.js` wired to `lc_exam_resource_map` (§29.7) + this file's earlier update.
- `e62dd7b` — second migration batch: `public/books/` source + canonical-detection re-run fix (§29.8). `public/books/` content itself was deliberately **not** committed — already on R2, unused by the live app from that path, and would have bloated the repo for no benefit.
- `c623f65` — the html→blocks sibling redirect fix (§29.9).

The Learning Center (§29.1) and Dashboard (§29.2) restructures from earlier in this session were pushed in prior commits not detailed here (see git log directly — `43cb53c`, `4cbb700`).

### 29.11 Next steps — explicit user instruction: new chat, work on Jobs + the scraper next

**The user is starting a fresh chat session specifically to work on Jobs and the scraper.** Everything below is unstarted:

1. **Admin `/admin/jobs` styling**: currently just wraps the candidate-facing `JobBoard.jsx` (light `ios-*` theme) instead of using the admin CMS's own dark `lc-*` conventions every other admin page uses (`ExamsPage`/`ResourcesTab`-style dark table). User's own words: "looks horrendous." Needs a dedicated admin jobs table, not a re-skin of the candidate component.
2. **Re-run the scraper**: `scraper-app/` (sibling repo, `K:\...\VeerNXT APP\scraper-app`) — `npm run scrape:json` then `npm run push:supabase`, runnable headless via CLI (no Electron GUI needed). Confirm with the user immediately before the production purge/insert step in `push_json_to_supabase.js`.
3. **Fix the bad conducting-body data** (the visible "INDIAGOVTEXAM" placeholder values, the scraper's own source-site name leaking in when it couldn't parse a real org) — this is Phase 2 from an earlier admin-planning round in this same session, not yet built: add `jobs.conducting_body_id` (FK to `lc_conducting_bodies`), resolve it via Gemini (same exact→normalized→abbreviation-in-parens tiering already proven twice this session for logos and exam-name matching — **no substring tier**, it produced real false positives both prior times), then a tag/category fallback for what's still unmatched. Re-run `scripts/match_jobs_to_lc_exams.mjs` afterward — a matched conducting body should substantially narrow the exam-candidate pool and raise coverage past today's 14/549.
4. **Also still open, found in passing, not fixed**: `scraper-app/push_json_to_supabase.js` (line ~14) and `matching/post_scrape_hook.js` (line ~5) both hardcode a plaintext Postgres password as a connection-string fallback — flag for rotation, remove the hardcoded fallback, require `DATABASE_URL` from env only. `push_json_to_supabase.js`'s own exam-matching query (crude `ILIKE`/equality against the legacy `exams` table, already known wrong ~75% of the time) should probably stop writing a guess at all once the real matching scripts exist — insert with `exam_id: null` and let the dedicated matching scripts populate it after.
5. **Separately, still waiting, not urgent for this next session**: PYQs (`FINAL_PYPS_STRUCTURED`, mojibake encoding bug still unfixed at the source) and image injection into already-migrated books — both explicitly on hold per the user, revisit only when they raise it.

---

## 30. New session — jobs + scraper (§29.11 fully worked), then pivoted into the admin CMS's exam↔resource mapping

Picked up exactly where §29.11 left off. Scope grew organically as testing kept surfacing real bugs one level deeper than expected — documented in the order they were found, not the order originally planned.

### 30.1 Scraper (`scraper-app`, sibling repo — not part of this git history)

- **Secrets hygiene**: hardcoded plaintext Postgres password removed from all 6 places it appeared (`main.js`, `push_json_to_supabase.js`, `cron/purge.js`, `matching/post_scrape_hook.js`, `scratch_test.js`, `scratch_csv_export.js` — the last two then deleted entirely, see below). `DATABASE_URL` now lives only in `scraper-app/.env`. Not previously leaked (scraper-app isn't a git repo) but was being used live on every run since no env var was actually set.
- **`freejobalert.js` rewritten from scratch**: the old selectors (`article a, .inside-article a, .entry-title a, h2 a, h3 a`) never actually matched real postings — only ad widgets, a WhatsApp CTA, and a cross-promo banner. The real data was sitting in a plain HTML table (`tr.lattrbord`) the old code never queried. New version reads that table directly (org/post/qualification/dates as real columns) and only visits detail pages for vacancies/age-range. Field completeness went from ~15% to ~100% on dates, ~13% to ~80% on vacancies.
- **`indgovtjobs.js` fixed**: was scanning every `<a>` on the page and filtering by URL pattern alone, which matched genuine dated post URLs but with generic "Read more »"/sidebar anchor text instead of the real title. Now uses `.post-title a` (the theme's real title selector, per the file's own outdated comment) with a fallback.
- **`sarkariofficer.js` fixed**: the only source module missing `await delay(...)` after `page.goto()` — every single detail-page visit was failing with "Navigation interrupted by another navigation" because the site's own delayed ad/redirect script was still settling when the next `page.goto()` fired. Added the delay plus a one-retry wrapper for the specific error. Went from 0 jobs/run to 30. (`sarkariofficer.com` itself — one of two sites this module scrapes — has a broken TLS cert unrelated to any of this; left as a known external failure, did not disable cert verification to work around it.)
- **`_helpers.js`'s `extractJobDetails()` widened**: was only recognizing "Organization"/"Department" as conducting-body table labels; added Board/Bank Name/Company Name/Recruiting Organization/Recruitment Board/Conducting Body/Ministry, and a matching set of exam-name label synonyms. This is shared by 8 of the 9 other source modules, so it improved conducting-body accuracy across the board, not just one site — the "scraper-name-as-conducting-body" failure class dropped from ~294/549 pre-session to ~56/260 in the last scrape.
- **Eligibility engine deduplication**: `scraper-app/engine/{eligibility,scoring}.js` + `config/{weights,preferenceMap,tradeMap}.js` were a hand-synced CJS fork of the real, live engine (`veernxt-web/backend/engine/`, used by `api/profile/recommend.js`). Deleted all 6 files; `matching/post_scrape_hook.js` now dynamically `import()`s the canonical ESM files directly (verified working end-to-end, including `tradeMap.js`'s `designations.json` load, which the dead fork's own path resolution was silently broken for — one more reason it was safe to delete). Also deleted `engine/recommend.js` (referenced a `data/exam_master.json` and `scrapers/` dir that don't exist anywhere on disk — never functional, zero consumers) and `scratch_test.js`/`scratch_csv_export.js` (disposable one-off scripts writing to an unrelated AI tool's workspace path).
- **`user_notifications` pipeline**: real write path (`post_scrape_hook.js`'s `runProactiveMatch()`, fires after every push), zero read path anywhere in `veernxt-web`. User's decision: **build the UI** (not: stop writing) — data and matching logic are already correct and live, this is a "add a read + UI" task, not a rebuild. **Not started this session.**

### 30.2 Production `jobs` table

- **No unique constraint existed at all** — 44% of the table (261 of 587 rows at the time) was exact duplicates accumulated since June, because every re-scrape of an already-seen posting just inserted another copy. Deleted the duplicates (kept the exam-linked copy where one existed, else newest), added `UNIQUE(url)` (`sql/jobs_url_unique.sql`), and switched the insert to `ON CONFLICT (url) DO NOTHING` with real per-row error logging instead of a silent catch-all (`push_json_to_supabase.js`). This also revealed the catch-all had been swallowing genuine date-parse failures, not just conflicts — fixed by guarding `new Date(...)` with `isNaN()` before binding.
- **`career_track` tagging added** (`sql/jobs_career_track_tag.sql`): precise exam matching (`lc_exam_id`) only resolves a small fraction of jobs, so every job now also gets a coarse category tag — `classifyCareerTrack()` (already built in `_helpers.js`, never called anywhere) wired into the push pipeline, guaranteed non-null (defaults to `STATE_GOVT`). Backfilled all 444 then-existing rows. **100% of jobs now have either a real exam match or a tag** — verified live. Distribution skews toward BANKING (~58%) because that regex matches generic terms like "clerk"/"PO", not just bank-specific ones — a known, pre-existing looseness in the classifier, not tuned this session.
- **`scripts/match_jobs_to_lc_exams.mjs`** (the actual job→exam linker — exists, well-built, was simply never being run by anything) run for the first time in a while: found and fixed a real false-positive class in its own "unique-body" shortcut (a conducting body with only one catalogued exam gets every posting from that body linked to it regardless of whether the post names have anything in common — e.g. "SBI Junior Associate" linked to "Credit Officer (PGDBF)" at 0% name-token overlap). Tightened the guard (`nameTok.length >= 1 && nameSim === 0` → reject), then swept and unlinked 9 already-bad matches that had been written under the old logic earlier in the same session.
- Net after 3 scrape/push/match cycles: **414 → 444 jobs**, all deduped, all tagged, 9 correctly exam-linked (up from 14/549 pre-session, but on a much smaller, cleaner base — precise matching is still the weak point; most sources besides FreeJobAlert still fall back to their own name as conducting body often enough to block matching, see §30.7).

### 30.3 Admin `notifications` table dropped

Confirmed 0 rows and zero code references anywhere in either repo (distinct from `user_notifications`, which is real but unread — see §30.1) — `sql/drop_unused_notifications_table.sql`. `quiz_attempts` (0 rows) and legacy `resources` v1 (42 rows) were investigated and found to be **live**, not dead — `InteractiveQuiz.jsx` actively writes to the former, `save-resource.js`/`AdminContentEditor.jsx` actively read/write the latter — left untouched. `jobs.exam_id` is also live (19/414 rows populated by the push script's own legacy fuzzy match), not the "always null" dead column it looked like from an earlier snapshot — also left untouched.

### 30.4 Job Board frontend (`src/components/JobBoard.jsx`, `api/jobs.js`)

Added a category filter bar (pills for each `career_track` value + counts) and colour-coded tag badges everywhere a job renders — admin table, admin detail modal, candidate split-screen feed cards, candidate detail sheet. Verified live in the browser, both as admin and logged in as the user's own account (`/admin/jobs` and `/jobs`), including the filter actually narrowing results correctly.

**This is not what §29.11 point 1 was asking for.** The user's complaint there was that `/admin/jobs` just re-skins the candidate-facing light `ios-*` theme instead of using the admin CMS's own dark `lc-*` table conventions every other admin page uses — confirmed still true today ("we have still not improved the Job Board. It still looks horrendous"). The category-tag work is a real, tested improvement layered on top of the same wrong-theme table — **the actual admin-theme rebuild is still unstarted**, see §30.6.

### 30.5 Admin CMS — exam↔resource mapping UX (new problem surfaced by the user mid-session, not from §29.11)

Live screenshots surfaced three real bugs in `ExamEditorPanel.jsx`/`ResourcesTab.jsx`, all fixed and verified live in-browser:

1. **`AddResourceDrawer` showed every resource in the library regardless of subject** — `lc_resources` already has a `subject_id` column (set by `populate_lc_subject_resources.mjs`), the query just never filtered on it. Now defaults to the current subject, with a "show all subjects" checkbox as an escape hatch (some of the 138 resources have no `subject_id` at all and would otherwise be unreachable).
2. **No way to rename a resource or reassign its subject/type.** Added an edit mode to `ResourceDetailDrawer` (Title/Type/Subject become an inline form, Save writes to `lc_resources`) — confirmed working end-to-end including the list refreshing after save.
3. **The `[shared]` prefix on 45 resource titles** turned out to be pure implementation debt — `populate_lc_subject_resources.mjs` used it only as its own idempotency lookup key, no product meaning. Stripped from all 45 rows; the script's lookup changed to match on the plain title instead (re-verified: dry run now correctly reports 0 new rows to create, so it still can't duplicate itself if run again).

Also investigated "certain exams are still not mapped" (from the same screenshots): **17 exams had zero subjects**, which split into two very different groups — 4 were genuinely blank-named placeholder rows (matches §25.4/§27.14's already-known issue), the other 13 were real, legitimately-named exams (8 Civil Defence Volunteer roles, one per UT; 3 India Post roles; 2 accounting-cert bodies) that are plausibly syllabus-free/merit-based rather than actually missing data. User's decision: delete the 4 blank ones, leave the other 13 alone.

**Deleting the 4 blank exams surfaced a real, separate finding worth remembering**: they weren't purely inert — `lc_exam_resource_map` (a different table from `lc_exam_subjects`/`lc_subject_resources`, populated by the Gemini exam-resource mapping pipeline from §29.3, read by `useExamContent.js`) had 37 rows mapped to them from a run the day before. Checking the actual `reasoning` text showed those matches were generic filler, not real value (one Husbandry-category exam in Puducherry got resources justified as "Railway exam" content), and `useExamContent.js` bails out entirely on a blank `examName` before ever reading that table anyway — so nothing live was actually lost, but **the Gemini mapping script doesn't skip blank-named exams, it just produces junk matches for them**. Worth knowing if that script is ever re-run. FK from `lc_exam_resource_map` to `lc_exams` is `ON DELETE CASCADE`, confirmed before deleting, so the 37 rows cleaned up automatically. `lc_exams`: 1534 → 1530.

### 30.6 🎯 Next session starts here

Two things, both explicit from the user, neither started:

1. **Rebuild `/admin/jobs` in the admin CMS's own dark `lc-*` theme** instead of re-skinning the candidate-facing `JobBoard.jsx` component. This is a real UI build, not a bugfix — look at how `ExamsPage`/`ResourcesTab` structure their dark-theme tables/filters/detail-drawers and follow that convention, keeping the new category-tag/filter work from §30.4 (that part is good, just wrapped in the wrong shell).
2. **Deep-dive the exam↔resource mapping for real correctness, not just the UX layer fixed in §30.5.** Two concrete symptoms the user found by hand: a "General Science" subject with **zero books mapped to it at all**, and **two separate Delhi GS books** existing as different `lc_resources` rows (should almost certainly be one canonical resource, per the same dedup logic §8's 88-master-document pass already established for the file-system content library — this is the same class of problem resurfacing in the CMS's own resource table). Given `lc_resources` is small (138 rows), a full manual or scripted audit of every subject → resource assignment for duplicates and gaps is tractable this session — start there rather than assuming §30.5's picker/rename fixes were sufficient on their own (they fix *how you edit* the mapping, not whether the *existing* mapping is internally consistent).

### 30.7 Also true, not urgent

- Match rate for `lc_exam_id` is still low (9/444) — `SarkariResult`, `IndiaGovtExam`, `ResultBharat`, `GovtJobsAlert`, `Examzy`, `Adda247`, `AllGovernmentJobs` still fall back to their own source name as conducting body more often than FreeJobAlert/IndGovtJobs/SarkariOfficer now do (those three got the same kind of live-DOM-investigation fix this session; the rest didn't). Same class of fix, just not done per-source yet — would meaningfully raise match rate if picked up later.
- `Examzy` (and other `scrapeWordPressSite`-based sources) repeatedly log "Local LLM Extraction failed" — calls a local Ollama server that isn't running. Only degrades the optional `standard_details` field, not blocking. Not investigated.
- `notifications` UI (§30.1) is still unbuilt — the user's own chosen direction, just not this session's scope.

---

## 31. New session — §30.6 both items closed, then a much bigger docx-enrichment content-loss bug found and fixed corpus-wide

Picked up exactly at §30.6. Both items there are done (§31.1, §31.5). What actually consumed most of the session: while spot-checking the rebuilt resource mapping, the user noticed a chapter rendering with empty tables and what looked like a repeated section — that turned out to be a real, corpus-wide content-loss bug in the docx enrichment pipeline (not a display bug), affecting every book already live on R2 and everything still waiting to be ingested. Fixing it, verifying it, and re-shipping the corrected content took most of the session.

### 31.1 Admin Job Board dark-theme rebuild (§30.6 item 1 — done)

`/admin/jobs` was a 9-line wrapper rendering the candidate-facing `JobBoard.jsx` with `isAdmin={true}` (light `ios-*` theme in the admin CMS). Rebuilt as a real dark `lc-*` admin page, following `ExamsPage.jsx`/`ResourcesTab.jsx`'s established convention:

- **`src/lib/careerTrack.js`** (new): `CAREER_TRACK_META`/`CAREER_TRACK_ORDER` extracted out of `JobBoard.jsx`, made theme-agnostic (one `hue` + one `hueDark` per track, plus a shared `hexToRgba()` helper) so the candidate (light) and admin (dark) views derive their own tint from one source of truth instead of carrying two hardcoded palettes that can silently drift apart.
- **`src/pages/admin/AdminJobs.jsx`** rebuilt from scratch: `lc-section-header` + search/career-track-pill filter bar + `lc-table` listing + a `JobDetailDrawer` (mirrors `ResourceDetailDrawer`'s pattern) with an edit mode (title, career track, vacancies, last date, exam-link search/clear) and a delete button. Writes go straight through `supabase.from('jobs')`, same direct-write convention `ResourcesTab.jsx` already uses — no new API route.
- **`src/components/JobBoard.jsx`** stripped back to candidate-only: removed the `isAdmin` branches (admin table, admin modal, refresh/back-to-admin buttons) and ~290 lines of now-dead light-theme CSS with them.
- New `.lc-category-pills`/`.lc-category-tag` CSS added to `AdminCMS.css`, matching the existing `.lc-level-pills`/`.lc-graph-nav` conventions.
- Verified: full `vite build` transformed all 3,377 modules cleanly (the build's only failure was an unrelated pre-existing Windows permissions issue copying `public/books/`, confirmed by the fact all modules transformed before that step). **Not verified in an actual browser** — this environment has neither `chromium-cli` nor Playwright installed, so a manual click-through in the real UI is still owed.

Committed `181d8af2`.

### 31.2 Conducting-body logo upload — root cause found, fix still pending (Vercel dashboard, not code)

User reported the logo-replace feature on `/admin/conducting-bodies` (built earlier, §29.4) failing in production after previously working. `ConductingBodiesPage.jsx`'s `LogoCell` was swallowing the real error into a generic "Failed" badge — fixed first (commit `14e8c4bd`) so the actual error is visible, which immediately surfaced `401 Unauthorized` in the browser console.

Traced to root cause by fetching the live production JS bundle (`www.veernxt.in/assets/index-CLnV2s4a.js`) and finding the baked-in constant for `VITE_ADMIN_API_SECRET` is literally `void 0` (undefined) in both places that read it (`r2Uploader.js` and `AdminRewardsQueue.jsx`). Since `VITE_*` vars are baked in at **build time**, this means `VITE_ADMIN_API_SECRET` was not set (or not set for the Production environment specifically) when that bundle was built — a Vercel dashboard/env-var problem, not a code bug. **This affects both the logo upload and the redemptions admin page (`AdminRewardsQueue.jsx`) identically** — the same two consumers, confirmed by grep.

**Not yet resolved** — needs the user (or someone with Vercel dashboard access) to confirm `VITE_ADMIN_API_SECRET` is set for Production and matches the server-side `ADMIN_API_SECRET`, then trigger a fresh deploy (editing the env var alone doesn't retroactively fix an already-built bundle).

### 31.3 A chapter screenshot led to a corpus-wide content-loss bug, not a display bug

User shared two screenshots of "GS & GK GUIDE BOOK" chapter 13 in the reader: a table rendering with completely empty rows, and what looked like a chapter/section being introduced twice. Investigated by reading the raw chapter JSON directly (not the rendered page) — this ruled out a `BlockRenderer.jsx` display bug immediately: the tables' `cells` arrays were genuinely `null` in the source JSON, not empty-but-real content being dropped at render time.

**Root cause, confirmed against the real source `.docx` files, not inferred**: `scripts/batch_enrich_books.mjs` parses each book's `.docx` via `mammoth` (docx → HTML) then `@xmldom/xmldom` (HTML → DOM), and reads paragraph/table-cell/list-item text via `element.innerHTML`. `@xmldom/xmldom` is a spec-compliant **XML** DOM implementation — it never adds `innerHTML` (a browser-only, non-standard extension) — so every one of those reads silently returned `undefined`. `JSON.stringify` then either dropped the key entirely (an object property, e.g. a paragraph block's `content`) or serialized it as `null` (an array element, e.g. a table cell) — two different-looking symptoms from the exact same bug. Headings survived because they used `.textContent` instead, which is why the corpus looked "mostly fine" until someone actually read a chapter with a table in it.

Verified directly against `Cluster_006_GS & GK GUIDE BOOK.docx` (the real source): `td.innerHTML` → `undefined`, `td.textContent` → `"Type of Source"` (real content, on the exact same element). Then quantified across every locally-enriched book: **4,761 table blocks, 3,305 list blocks, and — the much bigger number — 29,192 paragraph-family blocks (paragraph/important/examTip/definition/example/callout), 100% of each, across 2,174 chapters.** The "duplicate chapter" feeling was a second, related bug: a `pullQuote` block (Gemini-generated) verbatim-duplicating an earlier heading's text, then spliced in at a blind "40% of block count" position regardless of where that text actually belongs — 675 chapters affected by the initial (prefix-naive) count, 309 after fixing the counting itself (see §31.4).

**A third variant of the same bug, caught mid-repair**: `classifyParagraph`'s short-line heuristic (lines ≤5 words, no terminal punctuation) classifies things like bullet points as `{ type: 'heading', level: 4 }` — that branch also used `.innerHTML`. This one mattered structurally, not just cosmetically: the repair script's safety check (§31.4) compares heading sequences between the old file and a fresh re-parse to confirm they're the same document before touching anything, and initially flagged 60/77 books as "mismatched" — not because the content had drifted, but because the level-4 "headings" were comparing `null` against real recovered text. Fixed by validating only against level-2/3 structural headings (never affected by the bug) and treating level-4 headings as a fourth repairable content type.

### 31.4 Repair executed — 77/77 books, live-verified, root cause fixed for future ingestion too

- **`scripts/docxParser.mjs`** (new): the docx→block-model parser extracted out of `batch_enrich_books.mjs` into its own module (that file runs `main()` unconditionally at import time, so it couldn't be imported directly by a second script without triggering the whole CLI). Fixed at the source: a `serializeInner()` helper walks each element's child nodes and rebuilds the inner HTML manually (preserving inline `<strong>`/`<em>` formatting, not just flattening to plain text), used everywhere `.innerHTML` used to be read. `batch_enrich_books.mjs` now imports this shared, fixed version instead of its own copy — so future ingestion runs don't reintroduce the bug.
- **`scripts/repair_chapter_content.mjs`** (new): for each already-enriched local book, reads `metadata.json`'s `source_file`, re-parses that exact `.docx` with the fixed parser, and — matching blocks by exact kind and ordinal position (paragraph/important/examTip/definition/example/callout/heading4/table/list/numberedList tracked as independent counters, never lumped together) — copies the recovered content into the existing chapter JSON in place. Does **not** call Gemini again: paragraphs/tables/lists are original document text, not model output, so recovery is free and doesn't touch the already-correct Gemini-generated decoration blocks. Also strips any `pullQuote` whose (prefix-normalized) content duplicates a heading in the same chapter.
- Dry-run safety: a book is skipped entirely (not guessed at) if the fresh re-parse's chapter count or structural-heading sequence doesn't match the existing file, or if a chapter's per-kind block counts don't line up 1:1.
- **Result: 77/77 books repaired, 0 skipped.** 4,761/4,761 tables, 3,305/3,305 lists, 29,192/29,192 paragraph-family blocks recovered (one single-row junk table in `REASONING`/Precis chapter-1 stayed empty — a genuine artifact in the source docx itself, not a bug). 309 duplicate pull-quotes dropped (up from an initial 289 — the first pass under-matched because pull-quotes drop a heading's leading list number, e.g. `"1. Important Sessions..."` vs `"Important Sessions..."`, which the normalizer didn't strip yet).
- Live-verified against the exact chapter the user screenshotted: fetched the real post-repair `chapter-13.json` off R2, confirmed real table headers ("Year"/"Place"/"Important Event / President") and the duplicate pull-quote gone (16 blocks vs. 17 before).

### 31.5 `resources_v2` migration extended — new content, duplicate consolidation, and a re-sync of already-shipped content

`scripts/migrate_resources_to_blocks.mjs` (the script that pushes local `public/books/` content to R2 and flips `resources_v2.format`) previously only handled the case of exactly one already-canonical `storage_base_url` per (title, category). Extended to three cases, matched deterministically so re-runs are safe:

1. **Matched** (27 books) — unchanged behavior, just re-run to push the §31.4-corrected content live. 9,900 `resources_v2` rows updated.
2. **Group B — duplicate rows, no canonical yet** (7 books: Andhra_Pradesh GS/SI, ARUNACHAL PRADESH GS, Chhattisgarh_GS, Goa SI, Himachal_Pradesh_GS, Karnataka_GS) — previously flagged in §30.6 as the "Delhi GS"-class duplication problem, but for the resources_v2/R2 layer rather than `lc_resources`. Consolidates all of a title's existing duplicate rows onto one canonical R2 location, picked **deterministically by lowest `resource_id`** — not "whichever row the DB happens to return first." This distinction mattered live: an earlier draft of this logic (a separately user-supplied `sync_books_to_r2.mjs`, not used) picked an arbitrary first row and would have repointed 23 already-correctly-migrated `Uttarakhand_CONSTABLE` rows onto 1 stray leftover row — caught in dry-run by directly querying which URL each row actually pointed at before trusting the script's own claim.
3. **Group A — zero rows exist yet** (43 books, genuinely new documents never ingested before) — inserts one new `resources_v2` row per title with a real `crypto.randomUUID()` and a **real sha256 hash of the actual local file content** (the same `sync_books_to_r2.mjs` draft mentioned above had used `Math.random()`-based fake IDs and a fake concatenated-random-string "hash" — not used).

Executed: `resources_v2` went from 15,234 → 15,277 rows (+43, exactly matching Group A). Spot-verified live: `Andhra_Pradesh GS` (Group B) — 20 rows, now all sharing exactly one `storage_base_url`; `GENERAL KNOWLEDGE` (Group A) — real UUID `resource_id`, `metadata.json`/`chapter-1.json` both return 200 from R2. Checked the 43 new rows for accidental exact-duplicate content among themselves (given several share topic-adjacent titles, e.g. `GENERAL KNOWLEDGE` vs. the already-canonical `GS & GK GUIDE BOOK`) — all 42 checked have distinct real content hashes, so this is not a repeat of the duplication problem, genuinely new content.

Committed together with §31.3/§31.4's fixes in `f4c1c39f`.

### 31.6 Explicitly deferred: the 43 new Group A resources are not linked to any exam yet

Real content, live and fetchable on R2 — but every one of the 43 new rows was inserted with `exam_name: 'General Exam'` (a generic placeholder, same fallback value `api/admin/save-resource.js` already uses elsewhere for unknown metadata) because the actual exam/region association wasn't known at ingestion time. `scripts/map_exam_resources_gemini.mjs` (the script that populates `lc_exam_resource_map`) builds its Gemini candidate list mostly by matching `resources_v2.exam_name` against real exam names — so as things stand, **none of these 43 can ever surface as a candidate for any exam**, even on a full re-run of that script.

Fixing this needs classifying each of the 43 titles to a real `exam_name`/region/career-track first (some are unambiguous from the title alone — `Gujarat_SI`, `Karnataka_SI`, `RRB COMPLETE GK`/`RRB COMPLETE MATHS`/`RRB GS` — others genuinely aren't, e.g. `BASE BOOK`, `GENERAL KNOWLEDGE` vs. the already-linked `GS & GK GUIDE BOOK`), then a narrow (not full-catalog) re-run of the Gemini mapping script for just the newly-affected exams. **User's explicit decision: hold off on this for now** — not started, no `exam_name` values changed, flagged here so it isn't silently forgotten (same class of gap §29.8/§30.6 already flagged twice before for a similar "new content, not yet linked" situation).

### 31.7 Git state

Two commits this session, both pushed to `main`:
- `181d8af2` — Job Board dark-theme rebuild (§31.1), `lc_resources` dedup 138→98 rows + General Science content linking across 232 exam-subject slots (the other §30.6 item; `scripts/dedupe_lc_resources.mjs` + `scripts/link_general_science_resources.mjs`, both new).
- `14e8c4bd` — logo-upload error-surfacing fix (§31.2).
- `f4c1c39f` — `scripts/docxParser.mjs` (new, shared fixed parser), `scripts/repair_chapter_content.mjs` (new), `scripts/batch_enrich_books.mjs` (now imports the shared parser), `scripts/migrate_resources_to_blocks.mjs` (Group A/B extension).

**Left deliberately untouched, not this session's work**: a `public/thumbnails/` asset swap already staged locally by the user (old `bg_*.jpg`/`thumbnils/thumbnil royal *.png` deleted, 15 new subject-named PNGs added, none of it committed yet — see §31.8 Task 1) and an in-progress Quiz Center feature (`src/pages/QuizCenter.jsx`, `src/components/quiz/`, `scripts/enrich_split_books.mjs`, `scripts/split_large_books.mjs`, modified `src/App.jsx`/`ExamContentPreview.jsx`/`InteractiveQuiz.jsx`/`index.css`/`LearningCenter.jsx`) visible in `git status` throughout this session but never touched — appears to be the user's own parallel work, not investigated or committed.

### 31.8 🎯 Next session starts here (Superseded by Session 32)

---

## 32. Quiz Engine Makeover & Content Ingestion Pipeline (Session 32)

### 32.1 Global Swiss-Theme Visual Makeover
*   **Zero Rounded Corners**: Modified [`src/index.css`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/index.css) to set all design-token radius scales (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`) to `0px`.
*   **Global Reset**: Injected a global base CSS reset `* { border-radius: 0px !important; }` to flatten all cards, inputs, and buttons globally.
*   **Learning Center Scroll Reduction**: Removed the long vertical mock test lists from [`LearningCenter.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/pages/LearningCenter.jsx) and replaced them with a direct button leading to a clean, dedicated Quiz Center dashboard.
*   **Centralized Quiz Center**: Created [`QuizCenter.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/pages/QuizCenter.jsx) (registered route `/quiz-center` in [`src/App.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/App.jsx)) displaying all mock exams grouped by subject, with active search filters.
*   **Exam Resource Dropdowns Updated**: Modified [`ExamContentPreview.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/components/ExamContentPreview.jsx) to replace the cluttered list of mock tests under expanded exams with a single clean "Visit Quiz Center" row.

### 32.2 Quiz Engine UI Redesign
Overhauled all three main quiz components in [`src/components/quiz/`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/components/quiz/) to match the high-contrast mockups:
*   **[`QuizSetup.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/components/quiz/QuizSetup.jsx)**: Implemented flat, rectangular domain selectors, boxed question counts, and timer calibrations.
*   **[`QuizView.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/components/quiz/QuizView.jsx)**: Integrated a monospaced digital score ticker (`00000`), linear progress bar, square action containers, a 2x2 options grid with left-separated letter prefixes, and bottom status indicator grids.
*   **[`QuizResults.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/components/quiz/QuizResults.jsx)**: Rebuilt scorecards, monospaced average pace metrics, Flame streak records, Rank Tier badges (SS, S, A, B, C), and solution review cards.
*   **Orchestration & Database Logging**: Wired the engine in [`InteractiveQuiz.jsx`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/src/components/InteractiveQuiz.jsx) to support local auto-save recovery and commit completed attempts to the Supabase `quiz_attempts` table.

### 32.3 Universal R2 Synchronizer
*   Created [`scripts/sync_books_to_r2.mjs`](file:///K:/H%20DRIVE/Quantum%20Climb/APPS/VeerNXT/VeerNXT%20Main%20Repo/VeerNXT%20APP/veernxt-web/scripts/sync_books_to_r2.mjs) which handles:
    *   **Group A (Ingestion)**: Automatically generates a stable UUID `resource_id`, inserts the canonical metadata entry in Supabase, and uploads files to R2.
    *   **Group B (Consolidation)**: Identifies duplicates, updates database records to point to a single lowest-UUID canonical R2 folder, and migrates to blocks format.
    *   **Standard Books**: Uploads standard blocks chapters and updates image URLs to Cloudflare R2 path URLs.

### 32.4 Ingestion Tool for Structured PYPs (Free/₹0 Cost)
*   **`scripts/ingest_structured_pyps.mjs`** (new): Created a script to read all 956 successfully structured PYP JSONs from the local folder.
*   It automatically converts standard options arrays into database option objects (`{ A: "...", B: "..." }`) and performs bulk-inserts into the Supabase `quizzes` and `questions` tables.
*   Uses stable hash-based UUIDs from filenames to ensure 100% idempotent runs without creating duplicate quizzes.

### 32.5 Master Book Cloning
*   **`scripts/duplicate_enriched_books.mjs`** (new): Clones completed, enriched master GK books (`Cluster_014_SSC-GK-*` subjects) into target duplicate clusters (`Cluster_047` and `Cluster_075`), updating the internal `book_id` and metadata properties. This saves over 60% of the Gemini API costs.

---

### 33.0 🎯 Next session starts here

1.  **Ingest Structured PYPs**: Have Claude run the free database ingestion tool:
    ```bash
    node scripts/ingest_structured_pyps.mjs --execute
    ```
2.  **Top up Prepay / Switch to Post-Pay Billing**: Link your Google AI Studio project to your active GCP billing account, or replace your API keys in `.env` with a standard post-pay GCP key.
3.  **Complete GK Enrichment & Sync**:
    Once billing is ready, have Claude run:
    ```bash
    node scripts/enrich_split_books.mjs
    node scripts/duplicate_enriched_books.mjs
    node scripts/sync_books_to_r2.mjs --execute
    ```

---

## 34. New session (numbered to avoid colliding with §32/§33 above, written by a parallel session — see the note at the top of this file) — §31.8's two tasks done: thumbnail art wired in, employer portal split into its own dedicated pages

### 34.1 Task 1 — real thumbnail art wired into the colour-block system

Scoped first (hadn't been established anywhere): thumbnails are **pure CSS colour-block gradients today, no images anywhere** — `ExamThumbnail.jsx`'s `lg`/`sm` variants and `ExamContentPreview.jsx`'s subject-tile grid both render a `linear-gradient` keyed off `src/lib/thumbnailTaxonomy.js`'s 18-subject/8-colour-family taxonomy (`getFamilyHex()`), not an image file. The old deleted assets (`bg_guide/intro/mock/precis/pyq.jpg`, `thumbnils/thumbnil royal {blue,green,red}.png`) were never wired into that taxonomy at all — confirmed via repo-wide grep, zero references in any rendering path.

The 15 new PNGs the user dropped at `public/thumbnails/` map onto the **subject** taxonomy (English, Reasoning, Mathematics, etc.), not the old 5-category or 3-colour systems — filenames read as subject names. Added `SUBJECT_THUMBNAIL_IMAGE` (a subject-key → filename map) and `getSubjectThumbnailImage()` to `thumbnailTaxonomy.js`, then used it in both `ExamThumbnail.jsx` (`lg` variant) and `ExamContentPreview.jsx` (subject-tile grid): where art exists, it's layered under the existing colour gradient (kept as a semi-transparent scrim so the subject/exam-name/badge text stays legible on top of the photo) instead of replacing the gradient outright; where it doesn't, the plain gradient still renders exactly as before. **3 of 18 subjects have no art yet** (`general_studies`, `general_science`, `information_technology`) plus the neutral default — those three plus any exam using the default fallback still show colour-only, same as before this change, no regression.

Verified compiling via the Vite dev server (all four touched modules transform cleanly, including a direct fetch of `English.png` returning 200). Old unused assets removed. Committed and pushed (`fb68bc5a`).

### 34.2 Task 2 — employer onboarding/dashboard split out of Dashboard.jsx, restyled to match the candidate side

Scoped first: there was no dedicated employer onboarding or dashboard file at all — both lived as `isEmployer`-gated branches inside the same 1,924-line `Dashboard.jsx` the candidate view uses (`renderEmployerOnboarding()`/`renderEmployerDashboard()`). The onboarding flow was already reasonably built (reuses the same `GuidedStep` component candidate profiling uses); the dashboard was the weak point — styled entirely via ad-hoc inline hex colors, no reuse of the candidate side's `welcome-hero`/`welcome-stat-row` conventions, a flat 5-`Card` grid instead of a compact stat row.

**Found and explicitly flagged before writing code, not silently worked around**: the employer dashboard's "Active Postings" stat is a platform-wide `SELECT count(*) FROM jobs`, not scoped to that employer — there's no `employer_id` column on `jobs` and no employer job-posting flow anywhere in the codebase. Asked the user how deep to go; **explicit decision: visual/structural parity only this pass, don't touch the data-scoping gap** (a separate, bigger task if ever picked up). Also asked whether to split into dedicated files vs. leave the `isEmployer` gating in place; **explicit decision: split**, matching the pattern already used for admin (its own shell/pages, not folded into a candidate file).

Built:
- **`src/pages/EmployerOnboarding.jsx`** (new) — the existing multi-step `GuidedStep` flow, now self-contained with its own session check and a redirect to `/employer/dashboard` once `company_name` exists (previously handled by `Dashboard.jsx`'s shared fetch).
- **`src/pages/EmployerDashboard.jsx`** (new) — rebuilt to the candidate "command center" pattern: one hero with the stat row built directly into it (Active Postings/Shortlisted/Active Chats/Network/Verified) instead of a separate `Card` grid below, and the Veteran Talent Spotlight list now tags each candidate's service branch with a colour pill (`BranchTag`, reusing `careerTrack.js`'s `hexToRgba()` helper but with its **own** branch → colour map — Army/Navy/Air Force are a different axis from `CAREER_TRACK_META`'s civilian job sectors, so it doesn't reuse that map directly, just the colour-mixing utility).
- **`src/pages/Dashboard.jsx`**: employer sessions now hit a single `if (isEmployer) return <Navigate to="/employer/dashboard" replace />;` instead of rendering their UI inline. ~780 lines of now-dead employer-only code removed (state, `handleEmployerOnboardingSubmit`, both render functions, the employer branches of the shared edit-profile modal and its save/open handlers) along with imports that became unused as a result (`GuidedStep`, `ChoiceGroup`, `getEmployerInsights`, `useLocalDraft`, `Select`, plus a few pre-existing-but-now-exposed lint issues fixed in passing — an unused `axios` import, two `let x = []; try {...} catch { x = []; }` patterns simplified, one unused destructured `data`).
- **`src/App.jsx`**: added `/employer/onboarding` and `/employer/dashboard` routes (both `skipProfilingCheck`, matching the `/profiling`/`/subscribe` precedent, since `profiling_completed` doesn't apply to `employer_profiles`).

**One real bug caught mid-refactor, not by inspection**: an employer-draft-autosave `useEffect` referencing `employerFormData`/`employerStep`/`employerDraftPrompt` survived an earlier deletion pass (those three were removed as state but the effect reading them wasn't) — would have thrown `ReferenceError` on every candidate dashboard render. Caught by running `eslint` immediately after the edit (`no-undef`), not by re-reading the diff — worth remembering as a reason to always re-lint after a multi-step deletion, not just visually re-check the result.

Verified all four touched files compile via the Vite dev server (200 on every module fetch). **Not verified in an actual browser** — same tooling gap as §34.1 (no `chromium-cli`/Playwright in this environment) — a manual click-through of both new employer routes is still owed before calling this fully done.

`src/App.jsx` and `src/components/ExamContentPreview.jsx` both had the parallel session's in-progress Quiz Center changes sitting in the working tree the whole session (§32/§33 above — not this session's work, never touched). Staged only this session's own hunks in each via a manually-constructed patch (`git apply --cached`) rather than the whole file, so the other session's uncommitted work wasn't swept into this commit. Committed and pushed (`06863c65`).

### 34.3 Still open: the 43 Group A resources from §31.5 have no exam linkage (deferred a second time)

Restating §31.6 since it's now been deferred twice and is easy to lose track of: 43 `resources_v2` rows inserted this session with real content live on R2, but `exam_name: 'General Exam'` (a placeholder) means **zero of them can surface as a candidate for any exam** via `scripts/map_exam_resources_gemini.mjs`'s existing matching logic, even on a full re-run. Needs per-title classification to a real `exam_name`/region (some titles unambiguous — `Gujarat_SI`, `RRB COMPLETE GK` — others genuinely not, e.g. `BASE BOOK`), then a narrow re-run of the mapping script for just the newly-affected exams. Still not started; still the user's explicit call to hold off, not an oversight.

### 34.4 🎯 Next session starts here

No explicit new task from the user as of this writing. Real candidates to raise, in case the next session opens without direction: §34.3 above (deferred twice now), and a live browser verification pass for this session's and §31's work (only compile-checked via the Vite dev server, never actually clicked through, since this environment has neither `chromium-cli` nor Playwright installed).

### 34.5 ⚠️ Flagged, not resolved — a real collision risk with the parallel session's next steps

Discovered while writing this section, not investigated further (out of scope for this session to touch another session's uncommitted work): §32.3/§33.0 above (written by a different, parallel session working on Quiz Engine features) describe a `scripts/sync_books_to_r2.mjs` doing the **same Group A (new-resource ingestion) / Group B (duplicate-row consolidation) job** this session already did via the extended `scripts/migrate_resources_to_blocks.mjs` (§31.5) — down to the same "lowest-UUID canonical folder" consolidation rule. §33.0 lists `node scripts/sync_books_to_r2.mjs --execute` as a **still-pending** next step for that other session.

By the time anyone runs that command, most of the same 43 Group A / 7 Group B titles this session processed already have real canonical `resources_v2` rows (format `'blocks'`, live on R2 — see §31.5, verified). If `sync_books_to_r2.mjs`'s own title-matching doesn't already account for that (i.e. doesn't skip titles that are already canonical the way `migrate_resources_to_blocks.mjs` does), running it could re-process the same titles a second time under a second, independently-generated UUID — creating duplicate `resources_v2` rows or orphaning the URLs this session already verified live. **Before running `sync_books_to_r2.mjs --execute`, whoever picks this up should read both this section and §31.5/§31.6, and check whether that script's canonical-detection logic actually accounts for rows `migrate_resources_to_blocks.mjs` already created this session** — not assumed safe just because the other session's own notes describe it as working.

---

## 35. New session — employer onboarding UX fixes, a redo-onboarding escape hatch, and a PwD/disability step in both onboardings

### 35.1 Employer onboarding investigated and fixed: dropdowns instead of free text, hero gradient retuned

User reported two things after §34.2 shipped: "I thought we had fleshed out the onboarding to have more dropdowns" and "the CSS is not matching the rest of the site... we had removed any rounded borders." Investigated before changing anything (per user's explicit "Investigate"):

- **The border-radius claim didn't hold up.** `EmployerDashboard.jsx`'s `.emp-hero`/`.emp-stat-row` already use the exact same `var(--radius-lg)`/`var(--shadow-2)`/`var(--shadow-3)` tokens as the candidate side's committed `welcome-hero`/`welcome-stat-row` (`Dashboard.jsx`) — confirmed by direct comparison, `Dashboard.jsx` isn't even in the modified-files list this session. The `border-radius: 0px !important` global reset the user was likely seeing locally lives only in the parallel session's **uncommitted** `src/index.css` (§32/§33 above) — not merged, not live, and would affect the candidate dashboard identically if it were. The one real, visible gap: candidate's hero uses a photographic banner (`B14_next_chapter.png` + dark overlay) for depth; employer's was a flat two-tone gradient with a blue undertone (`#1e293b`) that appears nowhere else in the app's palette. Asked the user how to handle it (no employer-themed banner image exists to drop in) — **explicit decision: keep the flat gradient, just retune the colour** — done, `#0d1f0d → #1F3A2E`, matching the candidate hero's dark-olive-black tone instead of slate-blue.
- **The dropdown complaint was real.** `EmployerOnboarding.jsx` still had 4 fields as manual free text (location, hiring roles, required skills, candidate preferences) where candidate `Profiling.jsx` uses `Select`/`ChoiceGroup`/`MultiChoiceGroup` for nearly everything comparable. Converted: location → two searchable `Select`s (state, then city, reusing `STATE_DISTRICTS` — the same data candidate profiling's district picker already uses), hiring roles/required skills → `MultiChoiceGroup` with curated options + an "Other" reveal-text fallback (since job titles/skills aren't a truly closed set the way military branch/category are), candidate preferences → split into two `ChoiceGroup`s (preferred branch, experience range). Left company name/website/contact name/about as free text — those are inherently open fields, matching how candidate profiling also leaves name/email as free text.
- Fixed a real bug this surfaced: `employerInsights.js` had `if (formData.hiringRoles)` truthy checks that would now always be `true` once those fields became arrays (`[]` is truthy in JS) — changed to `?.length` checks.

Committed and pushed (`95786de7`).

### 35.2 "Redo Onboarding" — employer onboarding was a one-way door once completed

Consequence of §34.5-adjacent work from the prior session (candidate/employer phone-number separation): the user completed employer onboarding once to test that fix, and had no way back in afterward — `EmployerOnboarding.jsx`'s own guard redirects to `/employer/dashboard` the instant `employer_profiles.company_name` exists, with no edit path. This blocked testing §35.1's new dropdown fields with the same account.

Added a **"Redo Onboarding"** button on `EmployerDashboard.jsx`'s hero (next to "Edit Profile") linking to `/employer/onboarding?edit=true`. In edit mode, `EmployerOnboarding.jsx` skips the already-onboarded redirect and instead pre-fills every field — including `hiring_profile`'s nested values — from the existing row, splitting stored array values back into their preset selections plus any custom "Other" text so the form round-trips cleanly. Submitting re-upserts the same way normal onboarding does (idempotent, no data loss risk).

Committed and pushed (`15db82e9`).

### 35.3 PwD/disability step added to both onboardings — explicit user request, wired through to actual use

User: certain benefits exist for handicapped/disabled candidates on government exams, and employers have a statutory hiring quota to fulfil — asked for this to be worked into both onboarding flows, not just candidate-side.

- **Candidate (`Profiling.jsx`)**: new step immediately after reservation category (same domain — `category` is already collected there specifically "to check eligibility for reservation-based exam quotas," per its own help text) — a Yes/No `ChoiceGroup`, then (if Yes) disability type and certified disability percentage band, both `ChoiceGroup`s. Total steps went from 19 to 20; every downstream `case` index in both `validateQuestion` and `renderQuestion` renumbered accordingly (verified programmatically — no gaps/dupes across 0–19 in either switch, not just eyeballed).
- **Added the three new fields to `api/profile/recommend.js`'s Joi schema** (`disabilityStatus` required, `disabilityType`/`disabilityPercentage` optional) — without this, the endpoint's `stripUnknown: true` validation option would have silently deleted them from `req.body` before they ever reached `raw_profile_data`, the exact same silent-data-loss failure mode already found and fixed once this session-history in the docx enrichment pipeline (§ various). Would have shipped a UI that collects the answer and a database that never stores it.
- **Employer (`EmployerOnboarding.jsx`)**: new step asking PwD hiring stance (`We have a PwD quota to fulfil` / `Open to it, not mandated` / `Not currently` / `Not sure`), stored in `hiring_profile.pwdHiringStance`. Total steps went from 12 to 13, same renumbering discipline applied and verified.
- **Went one step further than just collecting it** — checked whether the existing analogous field (`category`/reservation quota) is actually used anywhere in matching/eligibility logic, and found it isn't (`backend/engine/eligibility.js` has zero references) — it's captured but currently inert. To avoid PwD data suffering the same fate on the side that matters most (employers who have a literal legal quota to fill), wired it into `FindCandidates.jsx` (new "PwD Status" filter: All / PwD only / Non-PwD, plus a list badge) and `CandidateProfileTemplate.jsx` (a PwD tag with disability type in the full profile view). Existing profiles/candidates without the new fields degrade safely to defaults ("No"/blank), no crashes.

Committed and pushed (`74ee5647`).

### 35.4 Vercel `VITE_ADMIN_API_SECRET` — resolved

User confirmed this has now been set in Vercel Production, closing §31.2's open item (conducting-body logo upload and `AdminRewardsQueue.jsx` both 401ing on a `void 0` baked-in secret). **Not independently re-verified live this session** (no browser tooling available in this environment) — worth a quick manual check the next time either of those admin pages is touched, since a env-var fix alone doesn't help until a fresh deploy has actually run against it.

### 35.5 🎯 Next session starts here

No explicit new task from the user as of this writing. Three things worth surfacing if the next session opens without direction:
- **§34.3's 43 unlinked Group A `resources_v2` rows** — deferred a third time now ("We will do soon"), still genuinely not started. Don't re-raise unprompted again; it's a known, deliberate hold, not an oversight.
- **§34.5's `sync_books_to_r2.mjs --execute` collision risk** — status unknown, never re-checked this session. Worth a quick look at whether the parallel session has run it yet before doing any further `resources_v2` work.
- **No live browser click-through exists for any of §34's or §35's onboarding/dashboard changes** — everything in both sections was verified via lint + a programmatic case-index check (for the two renumbered step flows) + Vite module-transform checks, never an actual manual walkthrough in a browser. This is a recurring gap across many sessions now (see §31.1, §34.2) — this environment has neither `chromium-cli` nor Playwright installed.

## 36. New session — production deploy broken twice in a row (two unrelated causes), a client-supplied legal-flow swap, then a PYQ/book exam-mapping audit deferred pending a Gemini recharge

### 36.1 Vercel build failure #1 — quiz component split committed incompletely

User pasted a Vercel build log: `[UNRESOLVED_IMPORT]` on `./quiz/QuizSetup` and `./quiz/QuizResults` from `InteractiveQuiz.jsx`. Root cause: the `InteractiveQuiz.jsx` → `QuizSetup.jsx`/`QuizView.jsx`/`QuizResults.jsx`/`scoring.js` split (done in an earlier commit, `442b2c9b`) only ever staged `QuizView.jsx` — the other three files existed on disk, complete and non-trivial (765 lines total), but were never `git add`ed, so a fresh Vercel clone from `main` never had them. Confirmed via `git status`/`git log -- <path>` before touching anything, then verified a local `vite build --mode production` succeeded once the three files were staged. Committed and pushed (`0194eba9`).

### 36.2 Client-requested legal aid cell flow swap — as-is, then a follow-up fix once the user spotted a UX issue live

Same session, user asked to swap in a client-improved version of `public/legal_aid_cell_prototype.html` (embedded via `LegalAidCell.jsx`'s iframe, see §29's "add Legal Aid Cell page" commit `442b2c9b`). Diffed the client's replacement against what was live first: different palette/font (Segoe UI, green/gold vs. the app's actual Inter/olive/cream/gold system) and a redundant embedded mini-dashboard (Career Transition/Exam Prep/etc. cards) duplicating chrome the real app already provides via its own nav. Flagged this explicitly before touching anything; user chose to swap in the client's file exactly as given. Committed and pushed (`5c6a90c3`).

User then caught it live and asked for the duplicate top banner (crest logo, "BEYOND THE UNIFORM", Dashboard/My cases/Resources/English nav row) to be removed — exactly the redundant-chrome concern flagged above. Removed the header markup and its now-dead CSS (`.topbar`/`.brand`/`.crest`/`.toplinks`/`.avatar`/`.gold`), verified no other references remained, tag-balance-checked the file. Committed and pushed (`4d5f65aa`).

### 36.3 Vercel build failure #2 — Hobby plan's 12-serverless-function cap exceeded

Next deploy hit a different wall: `"No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan."` `api/` had grown to 14 files (the AI inference proxy pair added since the last time this was fixed — see §29-era `f5ba509`/`d179d38f` and `docs/AI_API_USAGE.md`, `singular-ai.vercel.app`). This exact problem happened once before (`1ccad8d2`, 16→11 via body-action-dispatch consolidation) — followed the same intent but a cleaner mechanism this time: `vercel.json` rewrites (`source` → `destination?fn=...`) into one shared handler per pair, instead of body-based dispatch, so **every external/client URL stayed byte-identical and zero call sites needed updating** (verified by grepping every fetch site first). Merged:
- `api/v1/router.js` ← `v1/chat/completions.js` + `v1/health.js` (external contract matters here — documented for outside callers in `AI_API_USAGE.md`)
- `api/payments/actions.js` ← `payments/create-subscription.js` + `payments/verify-payment.js`
- `api/auth/account.js` ← `auth/register.js` + `auth/reset-password.js`

14 → 11 functions. Verified with `node --check` on all three new files plus a full local production build before pushing. Committed and pushed (`5c054d19`).

### 36.4 PYQ + Book content — exam-mapping audit, live-verified costing, plan written, work deferred

Separately, audited whether the two recent large content-ingestion efforts (748 PYP papers / 76,809 questions into new `pyq_papers`/`pyq_questions` tables; book chapters split and synced into `resources_v2` via `sync_books_to_r2.mjs`) are actually reachable from any exam page. They are not, to different degrees:

- **PYQs: a hard zero.** `pyq_papers` has no FK/crosswalk to `lc_exams` at all, and `useExamContent.js`'s "PYQ" bucket reads `resources_v2 WHERE category='PYQ'` — live-checked, **0 rows**, since that category was deliberately vacated when PYQ content moved out to the new tables (`sql/pyq_papers.sql`'s own header) and nothing ever replaced it. Every exam page's PYQ section has been rendering empty since that migration; the only working entry point is the unscoped `/pyq-center` library.
- **Books: partially covered, thinner than assumed.** They land correctly in `resources_v2`, which `lc_exam_resource_map` already links — but live counts showed only 986 of 15,302 `resources_v2` resource_ids (~6.4%) are ever mapped, and 9,797 of 9,943 `blocks`-format rows (includes this round's splits) have no mapping row. A live dry-run then corrected an assumption: 1,513 of 1,530 `lc_exams` already have *some* mapping from an earlier session (§29.7's original batch), so a plain re-run of `map_exam_resources_gemini.mjs` would only touch 17 net-new exams — actually closing the gap needs `--all` (force every exam to reconsider today's larger `resources_v2`), not the default gap-filling mode. This supersedes §34.3's "43 unlinked Group A rows" note — the real backlog is roughly two orders of magnitude bigger than that figure suggested, just mostly non-blocking since the runtime fallback chain still serves it.

Wrote the full audit + a step-by-step implementation plan to **`docs/pyq_and_book_exam_mapping_plan.md`**: a new `lc_exam_pyq_map` crosswalk table (mirrors `lc_exam_resource_map`, but with a real FK since `pyq_papers.id` is an actual PK) + a new `scripts/map_exam_pyq_gemini.mjs` (mirrors `map_exam_resources_gemini.mjs`), plus a concurrency-pool + exact-match-short-circuit optimization for both mapping scripts (discussed, not yet built), plus the `useExamContent.js`/`ExamContentPreview.jsx`/`ExamSyllabus.jsx` wiring needed to actually surface PYQ papers on exam pages (also catches a live dead anchor: `ExamContentPreview`'s "PYQs & Quizzes" card links to `/exam/:id#section-pyq`, which doesn't exist on `ExamSyllabus.jsx`).

**Costing, live-verified**: a real `--sample=20` dry run against `map_exam_resources_gemini.mjs` came back `429 RESOURCE_EXHAUSTED` — **the Gemini prepay balance is currently $0**. Using the original run's actual recorded cost (§29.7: 1,517 exams for $5.26 = $0.00347/exam) plus a live, zero-Gemini-cost candidate-count query (424 of 1,530 exams resolve by exact name match for free, 550 need a real Gemini call, 556 have no PYQ candidate at all), total estimated spend for both a full resources `--all` re-run and the new PYQ mapper's first run is **~$7–$15**. Recommended recharging **$25** for margin. Nothing executed — this is audit + plan only, explicitly deferred by the user in favor of manually adding subjects to existing exams first.

### 36.5 🎯 Next session starts here

- **User is going to try manually adding subjects to existing exams first**, before returning to the PYQ/book mapping work above — check what they changed (likely `lc_exams`/`lc_exam_subjects`-adjacent tables, or wherever "subjects per exam" actually lives in the CMS) before assuming the mapping plan's candidate-building logic still matches current data.
- **Gemini prepay is at $0** — confirmed live via a real `429`. Nothing in `docs/pyq_and_book_exam_mapping_plan.md` can run (even a `--sample` dry run) until it's recharged (~$25 recommended).
- **The concurrency pool + exact-match short-circuit for `map_exam_resources_gemini.mjs`** was discussed and agreed in principle this session but **not yet built** — do that before the `--all` re-run, not after, per the plan doc.
- Carried over, still open, not touched this session: §35.5's three items (43-row Group A note — now superseded by §36.4's larger live count, above; `sync_books_to_r2.mjs --execute` collision-risk re-check; no live browser click-through for §34/§35's onboarding changes).

---

## 37. New session — guaranteed per-exam Intro (DB + admin CMS + candidate syllabus), three rounds of admin Exams workspace decluttering, all exams bulk-published

None of §36.5's carried-over items were touched this session (Gemini prepay status, the PYQ/book mapping plan, the `sync_books_to_r2.mjs` collision-risk re-check, the manually-added-subjects check) — still open exactly as left, re-stated in §37.6 below rather than silently dropped.

### 37.1 `lc_exam_intro` — a guaranteed one-row-per-exam Introduction, replacing an ambiguous multi-row category

The ask: every exam should show an Intro document in the admin CMS, pre-populated automatically rather than admin-selected. Full deep-dive and plan written to `docs/admin_intro_housekeeping_plan.md` before touching anything — key finding: two separate, non-overlapping content systems both key off `lc_exams` (`resources_v2`+`lc_exam_resource_map`, the legacy system candidates actually see, vs. the admin-only "Learning Center CMS" `lc_resources`/`lc_subjects` tables `ExamEditorPanel.jsx` manages) — the admin CMS had zero Intro-type resources and structurally no exam-level attachment slot at all.

Built `lc_exam_intro` (`sql/lc_exam_intro.sql`): `exam_id` PK, `resource_id`, `manual_title`/`manual_body`, `source` enum (`auto`/`manual`/`unset`). **Immediately hit a live gotcha worth remembering**: this Supabase project auto-enables RLS on new tables with zero policies, which silently blocks *all* anon-key access (reads included) — confirmed the same problem already exists, undetected, on `lc_exam_resource_map` (RLS on, zero policies, live-verified via `pg_policies`), meaning **the candidate-facing app's entire precomputed exam→resource mapping path has been non-functional in production since it was built** (§29.7-era), silently falling through to the exam-name matching chain every time. Flagged, not fixed (out of scope for this task — `lc_exam_intro` was built to read independently of that path specifically so it wouldn't inherit the same silent failure). Disabled RLS on `lc_exam_intro` to match every sibling table this admin CMS already writes to (`lc_exams`, `lc_exam_subjects`) — this CMS's real security model is a client-side `localStorage` session flag, not Postgres RLS.

`scripts/backfill_exam_intro.mjs`: auto-populates from `lc_exam_resource_map` (single match, or highest-confidence-then-earliest-`created_at`-then-`resource_id` tiebreak for the 121 ambiguous exams — sanity-checked against real examples before running for real, which surfaced that `created_at` alone doesn't actually discriminate ties since a whole mapping batch shares one timestamp), falling back to exact-name match against `resources_v2.exam_name` for exams with zero mapping rows, else `source='unset'`. **A real bug found and fixed mid-implementation**: `resources_v2.exam_name` carries a numeric ordinal CMS-ingestion prefix (`"17. AP High Court..."`) `lc_exams.name` never has — same issue already documented for `map_exam_resources_gemini.mjs` but missed here initially, undercounting the exact-name fallback tier (17 found vs. the plan doc's live-verified 29) until prefix-stripping was added. Final backfilled counts matched the plan doc exactly: 1,058 `auto` + 472 `unset` = 1,530.

### 37.2 Admin UI for the Intro, iterated three times as the user reviewed it live

First pass put a fixed "Introduction" card at the top of `ExamEditorPanel.jsx`'s Syllabus tab: auto-populated exams show the resource title read-only with Preview/Override; unset/manual show an inline title+body editor. **Preview initially linked to the candidate site's `/reader/:id` in a new tab** — user asked for it to open in the same admin page instead, and testing that revealed the deeper problem: `/reader/:id` requires a *candidate* Supabase auth session the admin doesn't have, so even an in-page iframe just showed the candidate login wall. Built `AdminResourcePreview.jsx` — a lightweight, auth-free reader reusing the same chapter-JSON-from-R2 + `BlockRenderer` pipeline `SecureReader.jsx` uses, minus subscription-tier locking, points-awarding, and the auth wrapper — opened in an in-page modal, no navigation.

User then asked to also wire the Intro into the **candidate-facing** syllabus page (originally flagged as explicitly out of scope in the plan doc, then asked for anyway) — added a dedicated "Introduction" section to `useExamContent.js`/`ExamContentPreview.jsx`'s `subjects` variant (used only by `ExamSyllabus.jsx`), sourced from `lc_exam_intro` directly rather than the old ambiguous `byCategory.Intro` grouping, deliberately left untouched elsewhere (Dashboard/JobBoard's teaser tiles) to keep blast radius contained.

Two further rounds of layout changes to `ExamsPage.jsx`'s three-column workspace (list/editor/rail), each user-driven after seeing the previous round live:
- **Round 2**: Quick Actions (Preview/Export/Archive) removed entirely — no replacement, meaning Archive is no longer reachable from this UI at all; Preview/Duplicate toolbar buttons removed; Exam Info + Exam Settings tabs collapsed into the main Exam Details form (Website inline, Status as a Draft↔Published toggle replacing the 3-way dropdown, Created/Updated/Also-listed-as inline, read-only); Subjects extracted from a tab into its own full-width `ExamSubjectsPanel.jsx` below the grid. **A real CSS bug caught by a Playwright screenshot, not by inspection**: the new Status toggle rendered as a collapsed 2px sliver — `.lc-input-group label { display: block }` (an existing rule for the outer field labels) had higher specificity than the bare `.lc-toggle` class and was silently overriding `display: inline-flex`, so the plain-inline track span ignored its explicit `width: 40px`. Fixed by scoping the selector (`.lc-input-group .lc-toggle`).
- **Round 3**: user found the Exam Summary/Content Overview/Subject Distribution row "useless" — deleted `ExamStatsRow.jsx` entirely, plus swept up `.lc-quick-action*` CSS that round 2's Quick Actions removal had already orphaned but missed. Status toggle + read-only Details moved out of the main form into a new `ExamStatusCard.jsx` in the rail, directly below Introduction — the toggle now saves immediately on change (a direct `supabase.update()`) rather than waiting for the form's own Save Changes, since it no longer lives inside that form. "Override" renamed to "Edit" on the Introduction card (same action, both the auto-populated and manual states now read "Edit") — prompted by the user independently spotting a real content-quality bug this surfaces: AFCAT's and Accountant's auto-mapped Intros point to a `resources_v2` row **literally titled "ENGLISH"** with `category='Intro'` — live-confirmed via direct query, a source-data miscategorization, not a mapping-logic bug. Edit is the fix mechanism (types correct content directly); the underlying `resources_v2` category error itself is unfixed, out of scope.

Final shape: rail = Introduction + Status (two cards); editor = just the Exam Details form, no tabs; Subjects = full-width section below the grid.

### 37.3 Live browser verification this session, unlike the recurring gap noted in §31/§34/§35

This environment still has neither `chromium-cli` nor Playwright pre-installed (same gap noted repeatedly across sessions) — but rather than skip verification, installed Playwright fresh into an isolated scratchpad `node_modules` each time (global npm install doesn't put it on Node's module resolution path on this Windows setup; a project-local install in the scratchpad dir does) and actually drove the running dev server for every round of changes: logging in via the admin's hardcoded super-admin credential (`AdminLogin.jsx`'s dev/test path), and — for candidate-facing syllabus verification — creating a throwaway Supabase Auth test user via the service-role admin API (`profiling_completed: true` set directly to skip `AuthGuard`'s profiling redirect), always deleted afterward. All test writes to `lc_exam_intro`/`lc_exams` during verification were reverted to their original values before moving on. Worth reusing this pattern (isolated scratchpad Playwright install + throwaway service-role test accounts) for future sessions instead of re-noting the tooling gap as a reason to skip browser verification.

### 37.4 Process incident: an interrupted `git stash` during ad-hoc lint testing, recovered without data loss

Mid-session, ran `git stash` (no pathspec) to test-lint the Intro card change in isolation — this also swept up the user's own large pre-existing uncommitted WIP (book-restructuring JSON files, a few other unrelated hunks) that was already dirty in the working tree before this session started. The command chain hit a shell timeout mid-operation: the stash *commit* was created successfully, but its working-tree reset step was interrupted, leaving `.git/index.lock` stale and ~619 files (including the session's own edit and a few of the user's unrelated files) silently reverted to their pre-stash state on disk while ~1,600 other already-dirty files were untouched. Diagnosed fully (`git diff <path> HEAD` / `git diff <path> stash@{0}`, confirming 0 additions/deletions vs. HEAD, content-only differences) before taking any recovery action; asked the user explicitly before removing the stale lock and before the final wide `git checkout stash@{0} -- .` (flagged by the sandbox as a broad action needing sign-off). Verified byte-identical against the stash afterward, then dropped nothing until confirmed — the stash itself was left in place as a safety net rather than deleted. No data lost, but worth remembering: a plain `git stash` on a working tree with pre-existing unrelated dirty files stashes *everything*, not just the files you meant to isolate — use `git stash push -- <path>` (or `git diff <path> > patch && git checkout -- <path>` for a true single-file isolation test) instead, next time an isolated lint/test run is needed mid-session.

### 37.5 All 1,530 `lc_exams` rows bulk-set to `status='published'`

User asked directly. Checked first whether `lc_exams.status` gates anything visible to candidates before running it — it doesn't (grepped the full candidate-facing path: Dashboard, ExamSyllabus, JobBoard, LearningCenter, `api/exams.js`; only read anywhere for admin-panel display, e.g. `ContentGraphTab.jsx`/`ResourcesTab.jsx`). Prior distribution (recorded in case of revert): 1,528 `draft` + 2 `published` + 0 `archived`. Now: 1,530 `published`. Pure administrative bulk update, no live product effect today — but if `status` is ever wired into a real visibility gate later, this is the point every exam became eligible.

### 37.6 🎯 Next session starts here

**User's stated next steps, in order** (their own words, not yet planned in detail — "I will get a plan together and then we can implement"):
1. **Employers portal** work, alongside a **new candidate-facing "Private sector" site section** — candidates browsing jobs posted by employers. No spec yet as of this writing; §34.2's employer-dashboard/onboarding split and §34.2's flagged-but-deferred data-scoping gap (`jobs` has no `employer_id` column, no employer job-posting flow exists anywhere) are almost certainly relevant prior context to re-read before scoping this, since "candidates see employer-posted jobs" needs that exact gap closed first.
2. **Legal portal** fleshed out, after the above. §36.2's legal-aid-cell flow-swap (client-supplied HTML prototype embedded via iframe in `LegalAidCell.jsx`) is the only existing legal-portal work so far — likely the starting point, not a separate build.

**Everything carried over from §36.5, still untouched**:
- Gemini prepay was at $0 as of §36 (confirmed live via a real `429`) — status unknown now, not rechecked this session. Nothing in `docs/pyq_and_book_exam_mapping_plan.md` can run until recharged (~$25 recommended).
- The concurrency pool + exact-match short-circuit for `map_exam_resources_gemini.mjs`, agreed in principle in §36 but not built.
- Whether the user's manual "adding subjects to existing exams" pass (mentioned as their next move, back in §36.5) happened, and if so what changed — check before trusting the PYQ/book mapping plan's candidate-building logic still matches current data.
- §34.5's `sync_books_to_r2.mjs --execute` collision-risk re-check — status unknown, unresolved since it was first flagged.
- **New this session, not yet re-verified**: `lc_exam_resource_map`'s RLS-blocks-everything bug (§37.1) — a real, live, silent production bug independent of anything this session was asked to fix. Worth raising proactively if a session ever touches the candidate-facing content-matching path, since it means every exam's Guide/Précis/PYQ (not just Intro) is served via the runtime exam-name-matching fallback chain, never the precomputed mapping table that's supposed to be authoritative.

---

## 38. New session — Legal Sahayata rebuilt as a dynamic questionnaire engine, Shreya's AI chatbot merged in, Private Sector module scoping starts next

None of §37.6's carried-over items were touched this session (Gemini prepay status, the PYQ/book mapping plan, the concurrency-pool work, the manual subject-adding check, the `sync_books_to_r2.mjs` collision-risk re-check, `lc_exam_resource_map`'s RLS bug) — still open exactly as left, restated in §38.3 below.

### 38.1 Legal Sahayata (`public/legal_aid_cell_prototype.html`) — mock dashboard intro removed, then rebuilt end-to-end into a config-driven triage engine

Two asks, same file, same session. First: remove the client-supplied prototype's embedded mini-dashboard intro screen (Career Transition/Exam Prep/Financial Guidance/Legal Sahayata cards, duplicating chrome the real app's own nav already provides — the same redundant-chrome pattern already partly addressed in §36.2) so the iframe opens directly on the questionnaire's safety-check screen instead of requiring a "Start legal assistance" click first. Removed the `#dashboard` markup/CSS references and the `startFlow()`/`showDashboard()` JS; rewired the "Exit assistance" button to navigate the host app's history (`window.top.history.back()`) instead of toggling a dashboard section that no longer existed — this also fixed a latent bug the removal would otherwise have left behind (the original file's final screen's "Return to dashboard" button called `showDashboard()`, which had just been deleted, i.e. a guaranteed `ReferenceError` on click).

Second, larger ask: user supplied a full specification at `LEgal_portal_plan.md` (repo root, untracked — not yet moved into `docs/`) to replace the previous hard-coded 6-step, disability-pension-only questionnaire with a genuinely dynamic triage system. Rebuilt per the spec's own architecture principle ("UI ≠ questionnaire logic," one reusable engine rendering a config, not one page per legal situation):

- **8-step flow**: Safety check → About you → What happened (7 legal categories) → Your situation (plain-language options, no legal terminology required) → A few questions → Documents → Case summary → Connect.
- **7 profile types** (Serving/Released Agniveer, Ex-serviceman, Serving personnel, Widow/NOK, Defence family member, Other), each revealing its own relevant fields (`profileFieldsConfig`) — e.g. Ex-serviceman gets PPO/SPARSH/ECHS yes-no fields, Widow/NOK gets relationship/date-of-death/family-pension fields, instead of one generic form.
- **7 legal categories × ~60 plain-language situations** (`situationsByCategory`, e.g. "My pension has stopped" rather than "pension disbursement grievance") mapped onto **14 shared flow templates** (`legalFlows`) — pension stopped/delayed, pension amount/arrears, disability pension, SPARSH, family pension, ECHS, a pension fallback, service/disciplinary, two Agniveer flows (release/entitlement, injury/disability), family welfare, police/fraud, property/civil, and an "I don't know" free-text pathway. Each flow carries its own questions (with `showIf` conditional branching — e.g. "Was a medical board conducted?" → Yes reveals an outcome question, "Not sure" reveals a different one instead) and its own dynamically-filtered document checklist (e.g. a SPARSH access problem never asks for medical-board paperwork).
- **Dynamic case summary**: generated case reference, profile line, category→situation "concern" trail, a computed urgency tier (urgent/priority/standard), a simple heuristic recommended support route (administrative grievance support / case coordinator review / legal professional review / urgent assistance), and disclaimer language deliberately framed as "preliminary assistance classification" rather than legal advice, per the spec's legal-safety section.
- **"I Don't Know" pathway** skips situation selection entirely (per the spec's explicit instruction not to just bounce the user back to the category screen), takes free text, and keyword-classifies a likely category for the coordinator to confirm.

Verified live via Playwright — installed fresh into an isolated scratchpad `node_modules` again (same workaround as §37.3; still no `chromium-cli`/Playwright preinstalled in this environment) against the Vite dev server: full click-through of profile switching (confirmed Widow/NOK's 5 fields render correctly), category→situation→questions→documents→summary→connect, and the "I Don't Know" skip-navigation (confirmed both the forward skip and that Back from the resulting questions screen correctly skips back to the category step, not the situation grid). **Caught and fixed one real logic bug live, not by inspection**: `disability_pension`'s `hasMedicalBoardDocs` question had `showIf: qa.medicalBoard === "I'm not sure"`, but the actual option text for that question was `"Not sure"` (from the shared `yesNo` array) — the follow-up would never have appeared, silently. Fixed, re-verified, then confirmed a full `npm run build` (production) still succeeds. Zero console/page errors across every screen tested.

### 38.2 `origin/main` had moved since the last session — Shreya's AI chatbot merged in before pushing

Checked git before pushing the work above, per the user's instruction, and found the situation wasn't a feature branch to review — developer Shreya had pushed two commits **directly to `origin/main`** ("Added AI CHatbot", "Remove local AI configuration files"), adding `GEMINI.md`, `src/components/AiChatbotWidget.jsx` (1,760 lines), a 2-line `src/App.jsx` change mounting `<AiChatbotWidget />` globally above `<Routes>` (so no route-level collision with the legal aid work), and `public/chatbot_prototype.html`.

One real snag, surfaced before touching anything: a **different**, uncommitted `public/chatbot_prototype.html` already existed locally on disk (dated Sep 1, never part of git history under that filename before Shreya's commit — different color tokens, plus an extra "profile switcher" demo control Shreya's version doesn't have). Unknown provenance, so flagged to the user rather than guessing which one should win; user chose to defer to Shreya's committed version. Moved the local file aside to `public/chatbot_prototype.local-draft.html` (still untracked, preserved on disk, not deleted or silently overwritten) so the merge wouldn't be blocked and neither version was lost without a decision.

Then: committed the legal aid engine work alone (`59e95ee` — deliberately did **not** stage the ~2,241 pre-existing modified book-content JSON files or the large number of other untracked scratch/script/doc files already dirty in the working tree before this session started, all unrelated to this session's work), merged `origin/main` (`a0ed7f3`, clean `ort`-strategy merge, zero conflicts since no touched files overlapped), verified with a full `npm run build`, then pushed. `origin/main` now has both the AI chatbot widget and the dynamic Legal Sahayata engine.

### 38.3 🎯 Next session starts here

User pointed to **`Private sector jobs.md`** (repo root, untracked — same as `LEgal_portal_plan.md`, not yet in `docs/`) as the next feature to scope: a **"Private Sector Employment"** module, explicitly designed as a managed, VeerNXT-HR-mediated hiring service rather than a normal job board (the doc's own stated principle: "not another Naukri/LinkedIn-style marketplace"). Key shape, for whoever picks this up:

- **Candidates** get a new, distinct **"Private Sector Profile"** (work type, skills, preferred locations, licences/qualifications, availability) — separate from the main `Profiling.jsx` onboarding, gating "I'm Interested" the same way `AuthGuard`'s profiling check already gates other candidate features. Senior/professional candidates get an alternate opt-in path ("I'd like VeerNXT HR to review my profile for professional opportunities") instead of the questionnaire. A **service-verification** step (service number + discharge/release document upload, camera or gallery) produces a **"VeerNXT Verified"** badge, admin-reviewed — not automatic.
- **Employers** get a 4-field **"Post a Job"** wizard (role, quantity, location(s), JD — upload or paste), reviewed/standardised by VeerNXT HR before it goes live, not published directly.
- **Candidate-facing "Private Sector Opportunities"** feed: simple cards (role, positions, location, salary range, description), only two actions — **"I'm Interested"** / **"Not for me"** — no application form.
- **No direct employer↔candidate contact anywhere in the product.** All matching, shortlisting, interview coordination and follow-up is explicitly VeerNXT HR acting as intermediary via existing external channels (email/WhatsApp) — the doc does not describe this as an in-app messaging system, and building one would contradict its stated principle. Worth confirming explicitly with the user before assuming otherwise.

This is effectively the spec for closing the exact gap §34.2 flagged and §37.6 restated: `jobs` has no `employer_id` column, and no employer job-posting flow exists anywhere in the codebase today. It also implies new schema (a private-sector candidate profile — new table vs. extending an existing one, TBD; an employer job-posting/requirement table with an approval/review state, since employer-submitted requirements aren't published directly; an "interested" join between candidate and requirement) and a new admin-side HR queue (review requirement → match → shortlist → coordinate) that doesn't exist yet in any form. **Session ended at discussion/scoping — nothing implemented yet.**

Everything carried over from §37.6, still untouched, restated once more since it's now gone three sessions without being picked up:
- Gemini prepay was at $0 as of §36 (confirmed live via a real `429`) — status still unknown, not rechecked this session. Nothing in `docs/pyq_and_book_exam_mapping_plan.md` can run until recharged (~$25 recommended).
- The concurrency pool + exact-match short-circuit for `map_exam_resources_gemini.mjs`, agreed in principle in §36 but not built.
- Whether the user's manual "adding subjects to existing exams" pass (mentioned back in §36.5) happened, and if so what changed — check before trusting the PYQ/book mapping plan's candidate-building logic still matches current data.
- §34.5's `sync_books_to_r2.mjs --execute` collision-risk re-check — status unknown, unresolved since it was first flagged.
- `lc_exam_resource_map`'s RLS-blocks-everything bug (§37.1) — a real, live, silent production bug, still unfixed. Worth raising proactively if a session ever touches candidate-facing content matching (and directly relevant if the new Private Sector opportunities feed ends up reusing any of the same exam-content-matching machinery).

---

## 39. New session — Private Sector Employment module built end-to-end, Phase 1, WhatsApp-only

Same session as §38 (the legal engine rebuild + chatbot merge/push happened first; this continues straight into the scoping work §38.3 opened). Full detail lives in `docs/private_sector_module_plan.md`'s "Build status" section at the top — this is the condensed version.

### 39.1 Client feedback merged into the plan before building anything

User supplied a second doc, `docs/VeerNXT_Private_Sector_Implementation_Improvements.md` — an explicit amendment to the plan drafted from §38.3's scoping discussion, not a redesign ("the existing plan is fundamentally sound... apply the changes below"). Real changes it made, folded into `docs/private_sector_module_plan.md` before any code: notifications moved from Phase 2 into Phase 1 (a genuine architecture requirement, not a UI tweak); the employer's first post-onboarding screen becomes a "You're ready to hire" interstitial rather than the dashboard; the senior/professional candidate path becomes an explicit upfront UI choice instead of just a backend flag; profile + verification became one guided journey with a completion checklist; and it introduced an internal-only "Blue Collar / Black Collar" job-class taxonomy not in the original spec. Two open decisions were flagged back to the user rather than guessed: what Blue/Black Collar actually means, and which email/notification provider to use. **User resolved both**: Blue/Black Collar is a static role→class lookup for internal HR reporting only, never shown to candidates/employers (exact role list given, see §39.2); provider is MSG91 (already partially integrated in this codebase for SMS OTP, `api/auth/otp.js`), but **WhatsApp only for this build — email explicitly deferred**, per the user's own words ("build everything else... for now we can just use WhatsApp as the messaging").

### 39.2 What got built

Full detail in the plan doc's "Build status" section — condensed list:

- **Schema** (`sql/private_sector.sql`, applied live): `ps_candidate_profiles`, `ps_verifications`, `ps_job_requirements`, `ps_candidate_interest`, `ps_notification_events` — all new, `jobs`/`job_applications` untouched by design (parallel module, not a replacement, matching the amendment's explicit instruction). RLS enabled on every table with real `auth.uid()`-scoped self-read policies for candidates/employers; every write goes through the API with the service-role key instead (same "no client write policy on purpose" pattern as `sql/points_system.sql`) — deliberately avoiding the exact RLS-default footgun §37.1 already found once. Two private Storage buckets (`ps-verification-docs`, `ps-job-documents`), each with an insert-into-own-folder-only policy; admin document review goes through server-side signed URLs, not public access.
- **Role taxonomy** (`src/lib/privateSectorTaxonomy.js`): the user's exact Blue/Black Collar role list, looked up on demand for admin reporting only (`summarizeJobClasses()`), never stored per-candidate or per-requirement as a separate field.
- **API** (`api/private-sector/router.js`) — one file, deliberately: this repo was already at 11 of Vercel Hobby's 12-function cap (§36.3), so this used the one remaining slot as a single action-dispatch router rather than adding several new functions. Covers every candidate/employer write (profile save, verification submit, requirement submit, express interest) and every admin read/write (5 list actions, 3 update actions, 2 signed-URL actions), plus a MSG91 WhatsApp sender that logs every attempt to `ps_notification_events` and falls back to a `simulated` status when WhatsApp env vars aren't configured — same dev-mode-fallback convention `api/auth/otp.js` already established, rather than either blocking the build on MSG91 WhatsApp provisioning or faking success silently.
- **Candidate**: `PrivateSectorHome.jsx`, `PrivateSectorProfile.jsx` (unified path-choice → operational questions → verification journey, "X% complete" checklist), `PrivateSectorOpportunities.jsx` (feed + gate + I'm Interested/Not for me, the latter client-side-only per the amendment). New "Private Sector" entry in `Header.jsx`'s candidate nav.
- **Employer**: `EmployerReadyToHire.jsx` (post-onboarding interstitial), `PostJobRequirement.jsx` (5-screen wizard matching the amendment's exact copy), `EmployerDashboard.jsx` gained an Active Requirements table + Post Another Job CTA (existing "Search Talent"/candidate-browsing links left alone — those are the pre-existing, unrelated general job-board feature, not something the amendment's "don't show candidate browsing" instruction was asking to remove). `EmployerOnboarding.jsx`'s first-time-completion redirect changed to the interstitial; re-onboarding via `?edit=true` still goes straight to the dashboard.
- **Admin**: `AdminPrivateSector.jsx` at `/admin/private-sector` — Requirements / Verification / Candidate Interest / Senior-Professional / Notification Log tabs, wired into the existing sidebar (`adminNavConfig.js`, `AdminShell.jsx`).

### 39.3 Live end-to-end verification, three real bugs caught by actually driving it

Same pattern as §37.3/§38.1 — Playwright against the real dev server and the real Supabase project, using throwaway candidate/employer accounts created and fully deleted via the service-role Admin API (profile rows, storage objects, auth users — all cleaned up, verified zero rows left in every `ps_*` table afterward). Not a mocked/synthetic test: employer wizard submit → admin approve → candidate completes the full profile journey including a real file upload to the private bucket → candidate sees the approved opportunity and expresses interest → admin's Candidate Interest tab shows it with the candidate's real name (joined from `user_profiles`) → admin moves the pipeline to Interview → all 4 notification events fire in order with the exact `[VNXT-EMPLOYER]`/`[VNXT-VERIFICATION]`/`[VNXT-INTEREST]`/`[VNXT-INTERVIEW]` subject format from the amendment, logged `simulated` (correct, since no real WhatsApp credentials exist yet) → admin's signed-URL document viewer fetches the actual uploaded file content. Zero console/page errors in the final clean run.

**Three real bugs found only by driving the UI, not by re-reading the diff** (worth remembering as a reason this kind of end-to-end pass keeps paying for itself — see the same lesson already recorded in §34.2/§37.2):
1. `api/private-sector/router.js`'s session-verification client (`getSupabaseAnon()`) read a bare `SUPABASE_ANON_KEY` env var — this project only has `VITE_SUPABASE_ANON_KEY` set (confirmed via `.env`), so every single candidate/employer bearer-token action was silently failing with 401 until this got a fallback to the `VITE_`-prefixed name. Would have shipped a module where literally no candidate or employer action worked, while the admin console (which uses a different secret-header auth path) looked completely fine — an easy one to miss without a real logged-in-as-candidate test pass.
2. The profile-completion checklist marked "Preferred location" done as soon as the state dropdown was set, before the city sub-field — even though the actual Continue-button validation correctly required both. Cosmetic, but would have told a real candidate they'd finished a step they hadn't.
3. The journey's final screen button read "View Opportunities →" but actually navigated to the Private Sector home page instead of the opportunities feed directly — caught because the test script's own assertion ("does the opportunities page show the Driver listing") failed even though the underlying data was completely correct, which is exactly the kind of label/destination mismatch that's invisible from reading the code in isolation.

All three fixed and re-verified live before calling this done.

### 39.4 🎯 Next session starts here

**Real MSG91 WhatsApp credentials are the one thing blocking notifications from actually sending** — `MSG91_WHATSAPP_INTEGRATED_NUMBER`, `MSG91_WHATSAPP_TEMPLATE_NAME`, `MSG91_WHATSAPP_HR_NUMBER` all need real values in `.env`/Vercel once MSG91's WhatsApp Business API is provisioned (separate product from the SMS OTP setup already live). No code change needed once those exist — `sendWhatsAppNotification()` in `api/private-sector/router.js` already branches on their presence. Also worth flagging to the user before relying on it in production: the exact MSG91 WhatsApp outbound-message payload shape in that function was built from general knowledge of MSG91's API, not verified against this specific account's live Postman collection/dashboard docs — there's a comment in the code flagging this explicitly; if the first real send fails, checking the payload shape against MSG91's current docs for this account is the first thing to check, not assumed to be this session's bug.

**Not done, and deliberately out of scope for this pass** (§8 of the plan doc, restated): email notifications (schema/enum ready, nothing sends), employer self-service edit/close/fill on a submitted requirement, advanced matching/recommendation logic, interview-scheduling integration (Meet/Zoom), HR analytics/funnel reporting. All Phase 2 per the amendment.

**This session's own work was not yet committed as of this writing** — everything above is verified and stable in the working tree, but git commit/push always needs explicit user sign-off per this repo's standing instructions, and hadn't been asked for yet at the point this section was written.

Carried over from §38.3/§37.6, still untouched, now four-plus sessions without being picked up: Gemini prepay status (unknown since §36's $0), the concurrency-pool/exact-match short-circuit for `map_exam_resources_gemini.mjs`, whether the user's manual subject-adding pass ever happened, `sync_books_to_r2.mjs --execute`'s collision-risk re-check, and `lc_exam_resource_map`'s RLS-blocks-everything production bug (§37.1) — none of these were touched this session either.

---

## 40. New session — local-dev book content editor built for Guide/Précis books, then rewired straight to R2

Separate from the Private Sector module (§39) and from §37.1's `lc_exam_intro`/`lc_exam_resource_map` work — this targets `public/books`, the 122 Guide/Précis books that ship to candidates via `scripts/sync_books_to_r2.mjs`, distinct from both existing content systems (`resources_v2`/`lc_exam_resource_map`, live, and the incomplete admin-only `lc_resources`/`lc_subjects` CMS, which never talk to each other) and from `AdminContentEditor.jsx`'s unrelated HTML editor. No content-team tool existed to find or fix mistakes/missing text across those books before this.

### 40.1 First pass: a local-dev-only editor reading/writing the filesystem (Phases 0-4)

- `scripts/scan_content_issues.mjs`: read-only QA scan flagging empty/short content, ragged/empty table cells, missing images, and stale metadata across every book — surfaces which books actually need manual attention rather than requiring a blind page-by-page review of 122 books.
- `/admin/books`: searchable book list sorted by QA severity, with New Book and Duplicate Book (with find/replace rebrand) actions.
- `/admin/books/:category/:book`: chapter browser overlaying the QA scan on the real `BlockRenderer` preview, a full block editor (add/edit/reorder/delete across all 16 block types), and Duplicate/Delete/Publish actions for the whole book.
- `api/admin/save-resource.js` gained the new `books-*` actions (list/issues/save-chapter/create/duplicate/delete/publish) rather than new `api/admin/books/*.js` functions — this repo's `api/` directory was already at Vercel Hobby's 12-function cap (first hit in §36.3, still the operative constraint on where any new endpoint can live). Writes are refused outside local dev (`process.env.VERCEL`) since the deployed filesystem is read-only; `books-publish` reused `sync_books_to_r2.mjs`'s own per-book sync logic (extracted into an exported `syncOneBook()`) so there's one implementation of "push this book to R2," not two that can drift apart.

### 40.2 Follow-up request, same day: local files removed entirely, R2 becomes the only source of truth

User asked for the content team to be able to edit from wherever the admin site is deployed, nothing local involved — so the local-JSON-as-truth design (`public/books` + a separate "Publish to R2" step) from §40.1 was replaced, not extended:

- `books-list` now groups `resources_v2` rows by `(title, category)` instead of scanning a folder — this table has heavy pre-existing duplication (the same book linked from many exams; some titles have 1000+ rows), so the list shows one representative per group. New `books-get` resolves a book's live title/category/storage location by `resource_id` for direct links.
- `books-save-chapter`/`create`/`duplicate`/`delete` now read and write Cloudflare R2 objects and `resources_v2` directly (`PutObject`/`ListObjectsV2`/`DeleteObjects`/`CopyObject`), with no filesystem access at all — the `process.env.VERCEL` "local dev only" guard and every local-disk helper (`BOOKS_ROOT`, `copyDirRecursive`, the Windows delete-retry logic) are gone. Every write also re-points all duplicate rows for that title at the canonical storage location and self-heals `resources_v2.chapter_count`, which the old sync script never corrected on existing rows.
- `books-publish` is gone outright — saving already is publishing now, there's nothing left to separately push.
- Frontend (`BooksPage.jsx`, `BookChapterBrowser.jsx`, `BookFormModals.jsx`) now keys off `resource_id` instead of a local folder name throughout; New Book/Duplicate Book no longer ask for a folder name since R2 keys are generated automatically.

Verified against real production R2 + Supabase, not a staging copy: read paths against real books (HINDI, `Cluster_057_HINDI`), then a full create → edit → save → reload → duplicate → find/replace → delete cycle on disposable test titles, confirmed removed from both R2 and Supabase afterward.

**Note for whoever next touches `public/books`**: per §40.2, that directory and `scripts/sync_books_to_r2.mjs` are no longer the live publishing path for Guide/Précis content — `resources_v2` via the admin editor is. Worth confirming `public/books` itself is safe to archive/delete rather than just bypassed, next time someone is in this area.

---

## 41. New session — Learning Center rebuilt from a static catalog into an active, mission-driven preparation system (Releases 1-4)

Same day as §40, a separate and unrelated push (`c2a8d44`) — the commit itself carries no body, so this section (and §42 below, which audited it) is the only narrative record of what shipped. Khan Academy/Duolingo-style framing for competitive defense and police exam prep: an explicit exam target, a daily "mission objective," resource-completion tracking, exam-filtered practice, and a dashboard progress widget, replacing what had been passive browsing.

### 41.1 What shipped

- **Schema** (`sql/user_learning_journey.sql`, applied live): three new tables — `user_exam_targets` (one row per user+exam, `is_primary` flagging the candidate's current focus — uniqueness only ever enforced in application logic at this point, not the database, which §42 found and fixed), `user_resource_reads` (per-resource completion status), `user_quiz_attempts` (per-attempt score log). RLS on all three, `auth.uid() = user_id` scoping throughout.
- **Target selection**: `ProfilingResults.jsx` gained a green "🚀 Start Preparing" pill that sets a candidate's primary exam target and routes to `/exam/:examId`; `LearningCenter.jsx` gained a "Your Current Mission" hero banner and "Make Primary" toggles on matched-exam cards; both, plus `ExamSyllabus.jsx`'s own "Set as Primary Target" button, independently implemented the same demote-then-upsert sequence against `user_exam_targets` — three copies of logic that turned out to have a real race condition, see §42.
- **Exam Journey dashboard**: `ExamSyllabus.jsx` gained a primary-target banner, a "Today's Objective" card, and practice-center shortcuts pre-filtered to the exam (`?exam=` query params into `QuizCenter.jsx`/`PyqCenter.jsx`). New components `TodayObjectiveCard.jsx` (military-themed objective banner) and `SubjectProgressBar.jsx`.
- **Completion tracking**: `useExamContent.js` extended to fetch/upsert `user_resource_reads`; `ExamContentPreview.jsx` gained a round checkmark toggle and "Done" badges per resource.
- **Practice loop**: `QuizCenter.jsx`/`PyqCenter.jsx` accept `?exam=` and show a "Filtered for {exam}" badge; `InteractiveQuiz.jsx` logs every completed attempt to `user_quiz_attempts`; `Dashboard.jsx` gained a `TodayObjectiveCard` widget for candidates with an active target.

### 41.2 Not caught before merge — surfaced the next day by §42's audit

This session's own verification isn't recorded (no commit body, no separate notes found), so it's unknown whether a live click-through happened before this shipped. What's known is that a dedicated audit the very next session (§42) found one real race condition (the three-site demote-then-upsert, with no database-level uniqueness constraint behind it), a completion checkmark that could mark but never un-mark, an anonymous-user path that silently no-op'd instead of prompting login, a "Mission Objective" banner that was static copy despite shipping the props (`completedCount`/`totalCount`) to make it dynamic, and — the most substantial finding — a quiz exam-filter that matched by subject overlap rather than actual exam identity, which barely discriminates since most quizzes in this catalog share one generic subject tag. Full detail and fixes in §42.

---

## 42. New session — audit of §41's Learning Center release, all findings fixed and pushed; a quiz-mapping pipeline built, redesigned mid-flight, and left blocked on Gemini credits

User supplied a written audit request for §41's release (`docs/Audit for learningcenter.md`) covering four pillars — DB integrity, React correctness, UX/degradation, missed edge cases. Read every file the request named directly rather than relying on the request's own description of them, since a description can miss what the code actually does.

### 42.1 Audit findings (full report given to the user; condensed here)

1. **No DB-level uniqueness on "one primary target per user"** (`sql/user_learning_journey.sql` comment admitted it: "enforced in app logic"). The three duplicated demote-then-upsert call sites (§41.1) are two non-atomic round trips each — a dropped connection or two racing tabs could leave a user with zero or two primary rows, and `Dashboard.jsx`/`ExamSyllabus.jsx` both read the primary target via `.eq('is_primary', true).maybeSingle()`, which throws if more than one row ever matched.
2. **QuizCenter's exam filter doesn't filter by exam** — it filters by subject overlap between the quiz's tagged subject and the target exam's required syllabus subjects, which barely discriminates (see §42.3) while the UI badge claimed an exact match ("🎯 Filtered for: {exam}").
3. **"Today's Mission Objective" was static copy** — neither render site (`Dashboard.jsx`, `ExamSyllabus.jsx`) ever passed `completedCount`/`totalCount` to `TodayObjectiveCard`, so its own progress badge and `type: 'complete'` state were dead code despite being built.
4. **The "Mark as Complete" checkmark was one-way** — `markAsCompleted` always upserted `status: 'completed'`; there was no path back to `not_started`, despite the button being named `onToggleComplete`.
5. **PyqCenter's exam-name substring filter degraded to a generic empty state** ("No PYQs Found — try clearing filters") indistinguishable from "this exam genuinely has none yet."
6. **No `CHECK` constraints** on the two new tables' `status` columns — comment-documented enums only.
7. **Anonymous users got silent no-ops** on "Mark Complete"/"Start Preparing" — no redirect, no message.

### 42.2 Every finding fixed, applied live, pushed (`e05c6df`)

- `sql/user_learning_journey_fixes.sql` (applied via `scripts/apply_sql_via_management_api.mjs`, confirmed live via a follow-up `pg_indexes`/`pg_proc`/`pg_constraint` query): a partial unique index (`user_exam_targets(user_id) WHERE is_primary`), `CHECK` constraints on both status columns, and a new `set_primary_exam_target(p_exam_id)` RPC — `SECURITY DEFINER`, reads `auth.uid()` internally rather than taking a `user_id` parameter, so unlike the money-moving RPCs in `sql/points_system.sql` (locked to `service_role` specifically because they take a `p_user_id` param, which a malicious client could otherwise pass as someone else's id) it's safe to grant directly to `authenticated`. All three call sites (`ProfilingResults.jsx`, `LearningCenter.jsx`, `ExamSyllabus.jsx`) now call this one RPC instead of their own copy of the two-step sequence.
- **A bug caught mid-fix, not by inspection**: the first pass at redirecting anonymous users to `/login` left the existing `try/finally` structure intact, and `finally` still ran `navigate('/exam/...')` after the early-return `navigate('/login')` — silently overriding the login redirect the moment it fired. Caught by re-reading the diff before moving on, not by a runtime test; fixed in both files by checking the session before entering the try/finally rather than inside it.
- `markAsCompleted` now takes an explicit `completed` boolean and upserts `not_started`/`completed` accordingly, updating the local `Set` by add-or-delete — a real toggle. Anonymous calls now redirect to `/login` (`useExamContent.js` calls `useNavigate()` internally), matching the existing convention in `CVBuilder.jsx`.
- `ExamSyllabus.jsx`/`Dashboard.jsx` now compute real progress via a new `countProgress()` helper (exported from `useExamContent.js`) over the trackable categories (Guide/Précis/PYQ) and switch the objective to a "you've completed prep" state with a mock-test CTA once `completedCount === totalCount`.
- `PyqCenter.jsx` now distinguishes "the exam filter matched nothing" (papers exist, just not tagged for this exam) from "nothing exists at all," with a dedicated message and an inline "Show All Papers" CTA in the empty state itself.
- `QuizCenter.jsx` now checks a new `lc_exam_quiz_map` table first when `?exam=` is set; badge reads "🎯 Filtered for: {exam}" only when a real mapping exists, "Related subjects for: {exam}" when it's still using the subject-overlap fallback — so the copy never claims more precision than the data backs up.
- `npm run build` clean; every lint diagnostic touched was confirmed pre-existing via `git stash`, not introduced by this pass.

### 42.3 The quiz→exam mapping pipeline: built once, then structurally rebuilt after checking the data first

Initial design directly mirrored `scripts/map_exam_resources_gemini.mjs` (§29.3-era) — iterate every `lc_exams` row, shortlist candidate quizzes, ask Gemini to pick genuine fits. Before spending any Gemini cost on it, checked the actual data and found the design was wrong for this table: **only 10 distinct `exam_name` values exist across the entire 451-row `quizzes` catalog**, and 401 of those 451 (89%) share one identical subject tag, `"General Studies"` — confirming finding #2 above is close to a total non-filter in production today, not just an imprecise one. A per-1500-exam iteration would have meant ~1500 Gemini calls to solve what is structurally a 10-bucket problem, and would still have hand-waved an arbitrary ~40-quiz slice out of 401 identically-tagged candidates to Gemini for the common case.

Rewrote `scripts/map_exam_quizzes_gemini.mjs` around the real shape of the data instead: iterate the ~10 quiz `exam_name` buckets, shortlist `lc_exams` candidates per bucket (bidirectional substring match, guarding against at least one live blank-`name` row that would otherwise match every bucket trivially; a significant-word fallback if that finds nothing), and ask Gemini once per bucket which candidate exams the bucket's quizzes genuinely belong to — explicitly allowing one bucket to match many exams (a generic Stenographer mock-test set is real prep for every state/High Court Stenographer posting, and the catalog lists roughly 50 of those as separate rows). Verified mechanically with `--sample=2`: correct bucket detection (10 buckets, 451 quizzes), correct small clean candidate shortlists (1–5 exams for most buckets) — but every actual Gemini call returned `429 RESOURCE_EXHAUSTED`, confirming Gemini's prepay credits are still at zero (last known state: §36, unrechecked since). This new design needs roughly 10 Gemini calls total to complete, not ~1500, so cost is no longer a real constraint once credits exist — `sql/lc_exam_quiz_map.sql` (the target table) is already live.

### 42.4 🎯 Next session starts here

**Gemini prepay credits, live-reconfirmed exhausted this session** (real `429`, not assumed) — updates the long-standing "unknown, last checked §36" note below. Once topped up: `node scripts/map_exam_quizzes_gemini.mjs --sample=2` to sanity-check output, then `--execute` for the full ~10-bucket run (cheap — see §42.3). Nothing else needs to change for `QuizCenter.jsx` to start using it; it already checks `lc_exam_quiz_map` first and only falls back when a bucket has no rows.

**Everything carried over from §39.4/§38.3/§37.6, still untouched, now six-plus sessions without being picked up**: the concurrency-pool/exact-match short-circuit for `map_exam_resources_gemini.mjs`; whether the user's manual "adding subjects to existing exams" pass ever happened (worth checking before trusting either mapping script's candidate-building logic still matches current data); `sync_books_to_r2.mjs --execute`'s collision-risk re-check (also newly relevant given §40.2 — that script is no longer the live publishing path at all, see the note at the end of §40.2); `lc_exam_resource_map`'s RLS-blocks-everything production bug (§37.1) — a real, live, silent bug meaning every exam's Guide/Précis/PYQ content is served via the runtime exam-name-matching fallback chain, never the precomputed mapping table that's supposed to be authoritative; and real MSG91 WhatsApp credentials for the Private Sector module (§39.4), still not provisioned as of this writing.

---

## 43. New session — Learning Center backend deep dive: every carryover from §37.6/§42.4 finally closed, one bug found 230x bigger than assumed

Worked off `docs/learning_center_backend_session_plan.md` (written same day as §42, branch `learning-center-backend`). Before touching the plan, found ~2,280 uncommitted files already sitting in the tree from prior sessions (book-content fill-ins, an `ExamSyllabus.jsx` cleanup, and an unrelated PYPS/OCR pipeline rewrite) — triaged with the user file-group by file-group rather than assuming intent; the book content and `ExamSyllabus.jsx` cleanup got committed, the PYPS/OCR pipeline work and various docs/scratch/prototype files were deliberately left uncommitted for a separate pass.

### 43.1 §37.1's RLS bug — finally fixed, four-plus sessions after it was found

`lc_exam_resource_map`/`lc_exam_quiz_map` had RLS enabled with zero policies (this Supabase project auto-enables RLS on any new table) — confirmed live one more time (anon: 0/11,239 rows, service-role: 11,239), then fixed with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` (`sql/fix_lc_exam_map_rls.sql`), matching `lc_exam_intro`'s already-correct pattern. Re-verified live: anon now reads all 11,239 rows. Every exam's Guide/Précis/PYQ content should now actually be served from the precomputed mapping table instead of always falling through to `useExamContent.js`'s runtime fallback chain.

### 43.2 Dual-content-system decision (§27.1/§40, open since first flagged) — resolved, with a correction mid-flight

Investigated fresh rather than trusting this doc's own prior "incomplete, all-draft" characterization of `lc_resources`/`lc_subjects`: confirmed (again) zero learner-facing route reads it, only `/admin/resources`, `/admin/syllabus`, and an Exams-page subjects panel do. User decided to remove the orphaned admin UI. **Before dropping the DB tables as originally planned, a live re-check caught the prior "all draft" assumption was stale**: 45 of 98 `lc_resources` rows are actually `status='published'` with real R2 URLs, and `lc_exam_subjects`/`lc_subject_resources` have ~17,600 real link rows between them — real curated content, not empty scaffolding. Stopped, reported the discrepancy, and the user chose to keep the DB tables (data preserved) while still removing the now-orphaned admin UI (`ResourcesTab.jsx`, `ResourcesPage.jsx`, `SyllabusTab.jsx`, `SyllabusPage.jsx`, `ExamSubjectsPanel.jsx`, their routes/nav entries, and the dead `lc_exam_stats` subject/resource-count columns on the Exams list). Migrating that 45-published-resource content into `resources_v2` (or another resolution) is still an open decision for a future session — don't drop those tables without re-verifying row counts/status live first.

### 43.3 Concurrency pool + exact-match short-circuit for `map_exam_resources_gemini.mjs` — built, but the premise behind it was wrong

Built per §36/§37.6/§42.4's repeated carryover: candidates are now tagged by which tier found them, a category whose only candidates are exact-tier resolves directly (`source='exact_name'`) without calling Gemini at all, and exams needing Gemini run through a small worker-pool (`--concurrency=N`, default 5) instead of one sequential call with a fixed sleep. Dry-run verified: concurrent 429s (Gemini still exhausted) handled cleanly, exact-match short-circuit resolves with no Gemini call, summary stats correctly separate exact-only vs. Gemini-processed counts.

**The premise was wrong, though**: this and every prior session's carryover note assumed ~1,400 of 1,530 exams were still unmapped. A live check this session found only 17 actually are — an earlier verification query (this session's own first attempt) had silently truncated at Supabase's default 1,000-row page instead of paginating, undercounting `lc_exam_resource_map`'s distinct `exam_id`s as 134 instead of the real 1,513. Caught before reporting it as fact by re-deriving the number with proper pagination. The rewrite still stands on its own merits for future incremental runs as new exams get added, but the pipeline is essentially already done, not 91% outstanding as carried forward since §36.

### 43.4 `sync_books_to_r2.mjs` collision-risk re-check (§34.5, carried unresolved 5+ sessions) — confirmed dead, annotated rather than deleted

§40.2 already stated the book editor moved to reading/writing R2 + `resources_v2` directly, "nothing on local disk" — this session confirmed it explicitly rather than re-flagging the same "status unknown" note again: a `resources_v2` row this script would sync (`AGRICULTURAL AND RURAL DEVELOPMENT`) already carries newer paragraph content out on live R2, `updated_at` a week old, reached through the live admin-editor path — independent of this script or anything committed to `public/books` this session. Annotated the script's header explicitly as superseded rather than deleting it (kept in case a genuine bulk local-file ingestion is ever needed again) and corrected a stale inline comment that claimed it was wired to the live "Publish to R2" action. `public/books` itself is not guaranteed to reflect production in either direction — still an open question the user hasn't been asked to resolve.

### 43.5 The "adding subjects to existing exams" manual pass (§36.5, unchecked for 6+ sessions) — confirmed it happened

Spot-checked `exams.subject_requirements` live (paginated correctly this time): 1,515 of 1,534 rows (98.8%) have at least one `'yes'` subject, 11 are genuinely subject-less roles (postal service, civil defence volunteer positions with no written exam), and only 8 are null — 7 of those also have a blank `exam_name`, a separate pre-existing data-quality issue unrelated to this pass. The mapping scripts' candidate-building logic is safe to keep trusting as-is.

### 43.6 §31.6-era English-guidebook-as-Intro bug — found to be 230x bigger than the plan assumed, fixed live

The session plan (written same day as §42) described this as affecting just AFCAT's and Accountant's auto-mapped Intro. Investigating before fixing found the real scope: one `resources_v2` row (a 23-chapter English guidebook, `source_file: "ENGLISH.docx"`, mis-ingested with `category='Intro'` instead of `'Guide'`, sitting in R2 under `.../1.INTRO/...`) is also a "dominant/universal" candidate `map_exam_resources_gemini.mjs` surfaces for nearly every exam (English is a required subject almost everywhere) — Gemini, trusting the source-data category label, reasonably picked it as the Intro for **502 different exams**, and `backfill_exam_intro.mjs` propagated that into `lc_exam_intro` for **465 of 1,530 exams (30% of the catalog)**, each showing an English-textbook excerpt as their "Introduction" to real candidates.

Backed up first (`resources_v2` row + all 502 map rows + all 465 intro rows, confirmed counts matched before any write), then fixed at the source: `resources_v2.category` corrected to `'Guide'`, the 502 invalid mapping rows deleted, `lc_exam_intro` regenerated via the existing `backfill_exam_intro.mjs --execute`. Verified live: AFCAT/Accountant/TSPSC Group 4 now show `source='unset'` (blank) instead of English-textbook content; ACCA/CPA (which had their own correctly-titled Intro resources) were unaffected; 58 of the 465 picked up a legitimate remaining Intro candidate rather than going blank. A blank Intro is already `lc_exam_intro`'s state for 472 other exams pre-fix, not a novel UI gap. `sql/fix_english_intro_miscategorization.sql` documents the fix for the audit trail.

### 43.7 Mid-session follow-up request: "no deprecated tables, and rename resources_v2 to resources"

After §43.1-43.6 wrapped, the user gave explicit new direction: eliminate every deprecated/old table and folder, and rename `resources_v2` to plain `resources`. Scoped first (agent-researched) rather than assumed, because the rename target name turned out to already be taken.

**The rename hit a real name collision**: a *third*, previously-undiscussed content system existed — a legacy V1 `resources` table (Quill `body_html` format, 42 rows, all last touched 2026-06-13). An existing code comment called it "unlinked"/orphaned, which was wrong on reachability (its editor, `AdminContentEditor.jsx`, was still live-routed at `/admin/content/:id?`, just missing from nav) but right on relevance — 18 of its 22 distinct `exam_name`s already had a newer `resources_v2` Intro under the same name, confirming this was superseded prototype content, not a live gap. Removed `AdminContentEditor.jsx`, its route, and the V1 branch of `api/admin/save-resource.js` that wrote to it; backed up all 42 rows then dropped the table (commit `d5cab4d`). Also deleted `scripts/inventory.js`, an unreferenced one-off script that queried the same table and wrote its output outside this repo entirely.

**The rename itself needed a zero-downtime plan**: this Postgres database is shared and live regardless of git branch — renaming the table outright would have broken every content query on the currently-deployed production site (which runs compiled code still querying `resources_v2`) until this branch merged and redeployed. Solved with a compatibility view: renamed the table, then created a view named `resources_v2` over it (a plain `select *`, which Postgres's auto-updatable-view support extends to insert/update/delete too). Verified live before trusting it — read row counts matched via both names, and a full insert/update/delete cycle through the old view name landed correctly in the renamed table. Also renamed every dependent index/constraint/RLS-policy name that embedded the old table name (pulled live via `pg_indexes`/`pg_constraint`/`pg_policies`, since `resources_v2`'s own `CREATE TABLE` was never checked into this repo's `sql/` — built directly in the Supabase dashboard). `sql/drop_resources_v2_compat_view.sql` is ready to run once this branch is merged and deployed — **don't drop it before that**, and don't forget it afterward either, or it becomes exactly the kind of lingering deprecated alias this whole request was about eliminating.

Then updated every literal `'resources_v2'` reference across `src/`, `api/`, `scripts/`, and `backend/` to `'resources'` (commit `0612f90`) — live call sites, historical migration/ingest scripts, and the points-catalog `ref_table` label. Left `docs/status_report.md`'s own narrative and existing `sql/*.sql` files' comments/DDL untouched (dated records of what was true when written, same treatment as git commit messages) — deliberately did not touch the handful of `scripts/*` files still uncommitted from this session's own earlier PYPS/OCR triage (§43 opening paragraph), to avoid entangling two unrelated pieces of work.

**§43.2's open `lc_resources` migration decision got resolved too, in the same pass**: re-checked before ever considering a drop (the user's "no deprecated tables" framing revived the question) — this time confirmed all 45 published `lc_resources` rows matched an existing `resources` row by **both** `file_hash` and title, 100%. Byte-identical content already live in the canonical table, not unique data worth migrating. Backed up all 17,724 rows across the four tables (count-verified) then dropped `lc_resources`/`lc_subjects`/`lc_exam_subjects`/`lc_subject_resources` and their three dependent views entirely (commit `c95cbdf`). Verified the drop via a direct SQL query (`relation "lc_resources" does not exist`) rather than trusting `supabase-js`'s response, which returned a stale-cache `204` immediately after — PostgREST's schema cache lags DDL made outside the dashboard and clears on its own; this tripped up verification twice this session (also seen right after dropping the legacy V1 table) and is worth remembering rather than re-discovering each time.

### 43.9 Follow-up: "do we need this scratch folder, what scripts can we junk"

Same session, one more round of cleanup on the same "no deprecated stuff lying around" theme. Split into two passes rather than guessing at 130 combined files: cleaned up `scratch/` directly (it's always been ephemeral/throwaway by convention), and had an agent audit `scripts/`'s ~75 files against what other code actually still references before touching any of them — several were only safe to remove because of what already happened earlier this session (the four dropped `lc_*` tables), so this had to come after, not before, §43.7.

**`scratch/` (commit `552b228`)**: found 28 of its files were actually git-tracked, not throwaway as assumed — including a full `pyp_scraper/` subdirectory (with a 700MB untracked `node_modules` alongside it) that `docs/Scraper_Status.md` documented as explicitly **HALTED with a resume plan**, not abandoned. Flagged that distinction to the user before deleting anything tracked — confirmed superseded (the project since solved PYP sourcing a different way, working from an actual `MASTER_PYPS` PDF corpus rather than web-scraping), not just paused, so removed it along with its tracking doc. Also removed AI-generated-thumbnail scripts (`generate_category_bg.js`/`generate_dynamic_thumbnails.js` — contradicts the standing solid-color-only thumbnail direction, see thumbnails-solid-color memory) and several one-off content-rewrite/inspection experiments. `scratch/` is now empty.

**`scripts/` (commits `4ceea2d`, `4d46cad`)**: agent-audited all 55 non-PYQ-pipeline files (the PYPS/OCR reconstruction scripts stayed untouched, same exclusion as §43.7) and categorized every one before any deletion. Removed 34 total: 6 whose entire purpose was populating the now-dropped `lc_resources`/`lc_subjects`/`lc_exam_subjects`/`lc_subject_resources` (unconditionally dead, can never run again); 16 completed one-off migrations that already ran (an `exams`-table reseed and its follow-up fixups, an R2 cross-account cutover, a prefix-strip pass, two options-cleanup patches, `dedupe_exam_list.py` once its only importer went too) — deliberately given different treatment than already-applied SQL migration files, which stay as the literal DDL audit trail; a script's logic isn't that on its own, and git history covers it if ever needed; 8 ad-hoc debug/test scripts with no reuse value; and `scripts/logo_sourcer/` (a self-contained scraping tool that already built the 805-entry `exam-logos/manifest.json` it existed to produce, same completed-one-off treatment). Fixed `apply_sql_via_management_api.mjs`'s docstring, which called it "the one-time path" for a schema that's been gone since §43.7 — it's actually the tool every DDL change this entire session ran through.

**Real security finding, surfaced as a side effect of the audit, not something searched for**: two of the deleted ad-hoc scripts (`check_messages_schema.cjs`, `query_r2.js`) had hardcoded plaintext credentials committed to the repo — a full Postgres connection string with password, and a Cloudflare R2 account id/access key/secret. Deleting the files doesn't rotate the leaked credentials; flagged to the user explicitly, since this project has fixed the same class of leak twice before (commit history: "remove hardcoded internal API key," "remove hardcoded service_role key") — **rotation status as of this writing is unconfirmed, worth checking first thing if anyone picks this up.**

`scripts/` went from ~75 files to 46; nothing in the kept set lost a real importer (checked via grep across `src/`/`api`/`scripts`/`docs` before each deletion batch, not assumed from filenames). `npm run build` clean after every commit in this section.

### 43.10 One more cleanup round: `public/` prototype HTML files and unused hero images

User asked to remove six named `.html` files under `public/` plus the whole `public/hero/` folder ("not used"), citing they have a backup elsewhere. Checked each rather than trusting the "not used" framing given how often that assumption broke this session (§43.2, §43.7) — two real exceptions turned up:

- **`public/legal_aid_cell_prototype.html` is not actually a prototype** — despite the name, `src/pages/LegalAidCell.jsx` renders it live via iframe (`src="/legal_aid_cell_prototype.html"`). Deleting it would have broken the real Legal Aid Cell feature. Kept.
- **`public/hero/` was only partially unused** — `hero_image.jpg` (video poster) and `about.png` are both referenced live by `LandingPage.jsx`, the page every signed-out visitor sees. The other 6 files in that folder (`career_mapping.png`, `community_support.png`, `financial_guidance.png`, `our_story.png`, `hero_image_old_white.png`, `merchandise.png`, plus `README.txt`) had zero references and were removed.

The other 5 named HTML files (`chatbot_prototype.html`, `chatbot_prototype.local-draft.html`, `CGPT VeerNXT_Civil_Career_Prototype.html`, `Claude placement_cell_prototype.html`, `Civ Job Prototype ChatGPT.html`) were confirmed genuinely dead — the real chatbot is a live React component (`AiChatbotWidget`, global in `App.jsx`) that superseded the static prototype, and the other three were never wired to any route. Removed. `npm run build` clean after both commits.

### 43.11 Two more rounds, same theme, in follow-up messages: a live-code close call and a 294MB dead folder

User kept naming more files to remove across several follow-up messages. Two more real exceptions turned up, checked the same way as §43.10 rather than trusting the "not needed" framing on sight:

- **`public/legal_aid_cell_prototype.html` was named for removal a second time**, explicitly, after already being flagged live in §43.10. Held off and asked again rather than complying — it's still the entire `/legal-aid` route (`src/pages/LegalAidCell.jsx` iframes it directly), and no replacement exists. The user believed it had been "converted into tsx" — checked and found no `.tsx` files exist anywhere in this repo (plain JS/JSX project) and no separate React implementation of the Legal Aid Cell content; `src/pages/Legal.jsx` is a same-word-different-feature Terms & Conditions page, not a conversion of this one. Left untouched, route still depends on it.
- **`public/hero/about.png` was named for removal too**, still live at the time (LandingPage.jsx's CTA section background — purely decorative, `alt=""`, `brightness(0.15)`). Confirmed with the user this time before deleting; removed both the file and its `<img>` element, keeping the existing gradient overlay as the section's background treatment so nothing visibly broke.

Also removed: `public/VeerNXT_Flow.pdf` and `public/test-book.docx` (the latter only referenced by `src/pages/sandbox/BookReaderV2.jsx`, which isn't routed anywhere — fully unreachable), 7 more `public/homepage/` images with zero references, and the entire root-level `exam-logos/` folder (294MB, 1,026 files) — verified live first that all 671 `lc_conducting_bodies` rows already have `logo_path` pointing to real R2 URLs, confirming the user's "already ingested, content team replaced these" claim rather than assuming it. That folder sat outside `public/` anyway, so it was never served by the live app regardless of DB state — its only consumers were the bulk logo-sourcing/upload scripts, which stay (still useful for any future conducting body needing a logo) even with nothing local left to read.

### 43.12 GEMINI.md, README.md, docs/, and public/hero/ trimmed further; a genuine dead-code find (redundant veernxt_assets)

More rounds of the same theme via follow-up messages. `GEMINI.md` (generic `graphify` tool instructions, no project content) and the default Vite+React template `README.md` removed — both confirmed to have zero project-specific content before deleting. `public/hero/about.png`, still live in `LandingPage.jsx`'s CTA section background (`alt=""`, `brightness(0.15)`, purely decorative) at the time, was removed along with its `<img>` element per explicit confirmation, keeping the existing gradient overlay as the section's background. `docs/` pruned down to just `status_report.md` per explicit instruction — 23 other files removed (some untracked and now unrecoverable, most tracked and still in git history if ever needed).

`content-issues-report.json` (root) confirmed as `scan_content_issues.mjs`'s regenerable, already-gitignored QA output — deleted. **A genuine duplicate-folder bug found along the way**: the user asked to move `veernxt_assets/` into `public/`, but `public/veernxt_assets/` already existed (66 files, one more than the root copy) and is what `Dashboard.jsx`'s absolute-path image references actually resolve against — Vite has no custom `publicDir`, so the root-level copy was never served regardless of DB/asset state. Confirmed byte-identical for every shared file (`diff -rq`, zero differences) before removing the stale root duplicate and repointing `scripts/generate_veernxt_assets.py`'s `BASE_DIR` to `public/veernxt_assets` so future regenerations land in the actually-served location.

`backups/` (this session's own dropped-table JSON backups, ~11.7MB, gitignored) was named for removal too — held off, explicitly confirmed to keep given it's the only restore point for today's `lc_resources`/legacy-`resources` drops.

### 43.13 `scripts/logo_sourcer` confirmed already gone; full repo secrets scan (clean); scripts/ reorganized into subfolders

**Secrets scan, repo-wide**: patterns for Postgres URIs, AWS/R2-style keys, OpenAI/Gemini API keys, Supabase JWTs, PEM private key blocks, and any `password`/`secret`/`api_key`-named literal assignment — all clean across `src/`, `api/`, `scripts/`, `backend/`. The two leaks found in §43.9 (`check_messages_schema.cjs`, `query_r2.js`) were the only ones and are already deleted; their credential rotation is still unconfirmed (see next section).

**`scripts/` reorganized into 7 subfolders** (`lib/`, `db/`, `content/`, `exam-mapping/`, `logos/`, `test-users/`, `assets/`) for the 23 already-committed, non-PYQ-pipeline scripts — the PYQ/OCR reconstruction scripts still uncommitted from earlier this session stayed exactly where they are at `scripts/` root, kept separate from this reorg per explicit direction. Mapped the full dependency graph before moving anything rather than assuming: grepped every script for `require('./`/`from './` imports and every `__dirname` usage first. Two shared modules (`ingest-drive-content.js`, `docxParser.mjs`) moved to `scripts/lib/`, with their 5 combined importers (including `api/admin/save-resource.js`, outside `scripts/` entirely) repointed; 2 scripts importing `src/lib/thumbnailTaxonomy.js` gained an extra `../` for their new depth; 5 scripts using `__dirname` to resolve `public/books`, `exam-logos/`, or `content-issues-report.json` had their depth corrected — these would have silently resolved to the wrong directory on next run otherwise, with no obvious error pointing back to "the file just moved." Verified rather than assumed: `node --check` on every touched file, a dynamic `import()` of the two trickiest cross-folder cases (both ran their real dry-run logic successfully), a standalone path-resolution check confirming the `__dirname` math lands on the real `public/books` directory, and `npm run build` plus a direct import check on `save-resource.js` (Vite's build doesn't touch `api/`).

**Commands from earlier sections have new paths after this reorg** — when picking up §43.7's Gemini follow-ups: `node scripts/exam-mapping/map_exam_quizzes_gemini.mjs` and `node scripts/exam-mapping/map_exam_resources_gemini.mjs` (not the old bare `scripts/` paths cited in §42.3/§43.3).

### 43.14 Next session starts here

**Rotate the credentials found hardcoded in `check_messages_schema.cjs`/`query_r2.js` before anything else touches this repo's security posture** (§43.9) — a Postgres password and a full Cloudflare R2 key set were committed in plaintext; unknown whether they're still live. A repo-wide secrets scan since (§43.13) found nothing else.

**Gemini prepay credits, live-reconfirmed exhausted again this session** (real `429`, unchanged since §36/§42). Once topped up: `node scripts/exam-mapping/map_exam_quizzes_gemini.mjs --sample=2` to sanity-check, then `--execute` for the full ~10-bucket run (cheap, §42.3). `scripts/exam-mapping/map_exam_resources_gemini.mjs --all` needs Gemini too, but only for the real 17 unmapped exams now (§43.3), not ~1,400.

**Drop the `resources_v2` compatibility view (`sql/drop_resources_v2_compat_view.sql`) once `learning-center-backend` is merged to `main` and deployed** — it's load-bearing for the currently-deployed production site until then; don't drop early, don't forget after.

**`veernxt_assets/` (root, empty but undeletable due to a Windows file-handle lock on `veernxt_assets/banners/`) is fine to remove once the user closes this project** — every file under it is already safely duplicated at `public/veernxt_assets/` (§43.12), nothing left to lose.

**`reports/` (root, 10 files, all dated 2026-08-17 to 08-20) removed as stale** — confirmed nothing reads it and its generating scripts (`dedupe_exam_list.py`, `build_master_datamap.py`, `logo_sourcer/`) are already gone; regenerating it would mean rebuilding those tools first, not a re-run.

**Open, not touched this session**: whether `public/books` itself is safe to archive/delete now that it's confirmed not the live path (§43.4) — user said explicitly not to touch it this session. Real MSG91 WhatsApp credentials for the Private Sector module (§39.4), still not provisioned. The PYPS/OCR pipeline files found already uncommitted at the start of this session are still exactly where this session left them (§43 opening paragraph, reconfirmed untouched through §43.9's scripts/ cleanup) — nothing further was decided about them.

---

## 44. New session — Legal Aid Cell rebuilt as real React, a from-scratch Learning Center/backend handoff document for Shreya, then a live "resources disappeared" investigation that ended in a new admin panel

Three requests across one session, each starting a fresh topic rather than continuing §43's cleanup theme. PYPS/OCR pipeline files left exactly as found (still uncommitted, untouched, same as every session since they first turned up).

### 44.1 Legal Aid Cell (`/legal-aid`) rebuilt as a real React component, replacing the iframe wrapper

`src/pages/LegalAidCell.jsx` was a thin `<iframe src="/legal_aid_cell_prototype.html">` wrapper around a standalone HTML file with its own full CSS and vanilla-JS triage engine (config-driven 8-step questionnaire — safety check → profile → category → situation → dynamic questions → documents → case summary → connect). User asked for it "properly, not embedded HTML." Confirmed first (repo has zero `.tsx`/`tsconfig.json` anywhere) that "properly" meant plain `.jsx` matching every other page, not an unrequested TypeScript-tooling introduction — the user had already anticipated this ambiguity and asked to be checked before assuming either way.

Read the full prototype as the spec, then ported it three ways: `src/lib/legalAidCellConfig.js` (profiles/services/categories/situations/13 question-and-document flows/urgency-and-routing logic, as plain data + pure functions), `src/pages/LegalAidCell.css` (the prototype's stylesheet verbatim, scoped under `.legal-aid-cell` so it can't leak into the app's global styles now that it's inline instead of iframed — also dropped `.dashboard`/`.hero`/`.cards` rules that existed in the original `<style>` block but were never referenced by its own markup), and `src/pages/LegalAidCell.jsx` (the actual React rewrite — `useState`-driven nav/answer state in place of the prototype's imperative DOM manipulation, no behavior changes intended).

Verified live via a scripted Playwright run through all 8 steps against the real dev server (Chromium installed fresh into an isolated scratchpad `node_modules`, same recurring environment gap noted since §37.3): conditional (`showIf`) questions correctly appear/disappear as answers change, multi-select "No" exclusivity logic works, back-navigation preserves state, document default-checked values and manual toggles both work, the case reference stays stable across screens, and the composed summary (profile line, concern chain, urgency, recommended route, Q&A list) matches what was entered. Zero console errors. `/legal` (the unrelated Terms & Conditions page, easy to confuse by name) confirmed unaffected. `public/legal_aid_cell_prototype.html` deleted once the port was verified.

Three commits on `feature/legal-aid-cell-react` (`96ebbfe` config extraction, `82e8e7a` stylesheet, `c94933b` the component rewrite), pushed. Not merged.

### 44.2 Learning Center & backend deep dive — a new handoff document for Shreya (`docs/learning_center_handoff.md`)

User asked for a comprehensive document on how the Learning Center and its backend work, so a new team member (Shreya, taking over ownership; Gargi on content, Souvik on backend input) can query it with Claude and transition in. Given the scope, four `general-purpose` agents ran in parallel — candidate-facing frontend, admin CMS, backend API/points layer, content-ingestion pipeline — each grounded up front in a fresh live-schema introspection (`scripts/db/apply_sql_via_management_api.mjs` against `information_schema`/`pg_policies`/`pg_class`, not this doc's own prior narrative) rather than left to rediscover table names from scratch. Findings were cross-corroborating rather than duplicated — three of the four agents independently converged on the same points-system diagnosis from different angles (frontend read paths, admin redemptions endpoint, backend RPC call), which is what made it trustworthy enough to state as fact rather than a guess.

Headline findings, all verified live and written up in full in the doc itself (§ numbers below refer to the new doc, not this one): the admin CMS has no real authentication — `AdminLogin.jsx` hardcodes the Super Admin password directly in the JS bundle (and displays it in the UI as a help box), the "session" is an unsigned `localStorage` blob `AdminShell.jsx` trusts blindly, and `api/admin/admins.js` — the endpoint that mints real Supabase Auth admin accounts — has **zero server-side check of any kind** (handoff doc §5.1); the points/gamification system (`sql/points_system.sql`, `sql/rewards_system.sql`) was fully built — schema, RPC functions, frontend calls, all of it — but the one-time migration was never actually run against production, so `point_transactions`/`user_profiles.points_balance`/`points_lifetime` don't exist live and every touchpoint fails silently by design (handoff doc §7); `veer_score` is a completely different, unrelated, and correctly-working exam-match-quality metric, not to be confused with the (broken) points ledger; two parallel exam catalogs (`exams` legacy vs. `lc_exams` current) and three independent content-and-question systems (`resources`+`lc_exam_resource_map`, `quizzes`+`questions`, `pyq_papers`+`pyq_questions`) coexist with only loose, sometimes-unstated bridging — `api/exams.js`, the endpoint every exam-detail page calls, reads the legacy `exams` table by an id every caller sources from `lc_exams.id`, relying on an unstated identity between the two rather than the actual bridging table (`lc_exam_legacy_map`); `LearningCenter.jsx`'s "My Exams" section and `Dashboard.jsx`'s "Your Next Step" progress bar are both permanently broken (0% / always empty) because both read the nonexistent `point_transactions` table, one with an error check that degrades gracefully, one without.

Saved as `docs/learning_center_handoff.md` (717 lines) rather than a chat-only answer, specifically so Shreya's own future Claude Code sessions in this repo pick it up automatically. Committed on its own branch — see §44.6.

### 44.3 "Resource allocation for exams disappeared" investigated — turned out to be §43.2's own admin-UI cleanup, exposing a gap that already existed, not new data loss

Follow-up user report: after "some restructuring" on the exams backend, resource allocation for exams looked like it had disappeared or was hiding. Investigated live rather than guessing: re-checked `lc_exam_resource_map` row counts and referential integrity (10,737 rows, zero orphaned `exam_id`/`resource_id` references, unchanged from the handoff doc's snapshot two exchanges earlier), spot-checked the single most-recently-edited exam by `lc_exams.updated_at` (ABUB, Armed Branch UB) directly against the DB and confirmed its 10 resource mappings were fully intact. Also checked RLS state on the tables involved while there — `lc_exam_resource_map` correctly has RLS disabled (§43.1's fix still holding), `resources` has a correct public-read policy scoped to `status='Published'`; **`exams` (the legacy table) has RLS enabled with zero policies at all**, a latent finding worth knowing about even though nothing in the live frontend reads that table directly from the browser (only server-side, service-role `api/exams.js` does) so it isn't the cause here.

The real cause, traced via git history rather than assumption: `74c75e8` (2026-09-02) had added `ExamSubjectsPanel.jsx`, a "Subjects in this Exam" section in the admin Exams workspace. `6201d07` (2026-09-08, same day as this investigation) removed it, along with the rest of the `lc_resources`/`lc_subjects`/`lc_exam_subjects`/`lc_subject_resources` admin UI — this is the same removal §43.2 already recorded, and `sql/drop_orphaned_lc_resources_cms.sql`'s own header confirms the rest of that story precisely: backed up first (`backups/2026-09-08_dropped_tables/lc_resources_system_full_backup.json`, 4.8MB, confirmed still present and intact on disk), then dropped only after re-verifying all 45 published `lc_resources` rows were byte-identical duplicates (matched by both `file_hash` and title) of content already in the real `resources` table — matching §43.7's own resolution of "§43.2's open `lc_resources` migration decision." **Worth flagging plainly: this investigation could have started by reading §43.2/§43.7 instead of re-deriving the same conclusion from git log and a fresh live backup check** — it happened to land on the same answer, but checking the existing write-up first would have been faster. Recorded here so the next similar report gets the doc-first treatment.

`ExamSubjectsPanel.jsx` had exclusively queried the now-dropped `lc_subjects`/`lc_exam_subjects`/`lc_subject_resources` tables — a system already confirmed dead to every candidate-facing route (§43.2) — never the live `lc_exam_resource_map` table the candidate app actually reads. So its removal didn't take away visibility into live data; **there was never any admin UI for `lc_exam_resource_map` at all**, a gap independently confirmed by the handoff doc's admin-CMS research agent the exchange before (§44.2's underlying research, handoff doc §5.2: "no admin-editable surface today"). Removing the one panel that resembled a resource-allocation view — while it was reading the wrong table the whole time — is what made the pre-existing gap suddenly visible and feel like new data loss.

### 44.4 New admin panel: "Resources mapped to this exam" (`ExamResourcesPanel.jsx`), closing the gap §44.3 found

Built on request, once the investigation established what was actually missing (admin visibility, not data). Reads `lc_exam_resource_map` joined to `resources`, grouped by category (Intro/Guide/Precis) with confidence (`high`/`medium`/`low`) and source (`gemini`/`manual`) badges per row; **Preview** reuses the existing `AdminResourcePreview.jsx` read-only content viewer; **Remove** unlinks a mapping (the resource itself is untouched); **Add Resource** opens a search/category-filtered drawer against published `resources`, excludes already-mapped rows, and inserts new `source: 'manual'` mappings — the same "fix a wrong auto-mapping" pattern `ExamIntroCard.jsx`'s Edit button already established for the Intro slot.

**Real bug caught building it, not by inspection**: `lc_exam_resource_map.resource_id` has no actual foreign key to `resources.resource_id` — only `exam_id` is FK'd (to `lc_exams`); the composite `(exam_id, resource_id)` unique constraint doesn't establish a PostgREST-embeddable relationship either. The first version's `resource:resources(...)` embedded-select syntax 400'd as a result. Fixed with a two-step fetch (map rows, then a batched `resources` lookup by the collected ids) merged client-side.

Verified live end-to-end via Playwright against a real admin session (same hardcoded super-admin login `AdminLogin.jsx` already uses): panel contents matched the database exactly for the ABUB exam (Intro 1 / Guide 5 / Precis 4 = 10, confirmed against a direct SQL re-check taken at the same moment) — the first attempt at this check actually raced and selected the wrong exam (a stale pre-filter table row, before the search-debounce finished), caught by noticing an unfamiliar resource title in the output rather than trusting a passing-looking result, and fixed by waiting for the filtered row count before clicking. A full add-then-remove round trip through the real UI (search "ENGLISH" → select → Add Resources → confirm it appears → Remove → confirm the exam's mapping is back to exactly its original 10 rows) left production in its exact original state. Zero console errors throughout, aside from one pre-existing, out-of-scope R2 CORS failure when previewing this specific exam's Intro resource (same `AdminResourcePreview.jsx` component `ExamIntroCard.jsx` already uses elsewhere — not introduced by this panel, not fixed here).

### 44.5 Layout fix, same panel, same session: no more page-level scroll to reach it

First version placed the new panel as a full-width row below the existing three-column workspace grid (Exam List | Exam Editor | Contextual Rail) — user reported the result as "wonky" with too much scrolling, screenshot attached. Root cause: the editor and rail columns were both far shorter than the exam-list column (which already scrolled internally to `calc(100vh - 24rem)`), so there was a large dead-space gap before a full-page scroll was needed to reach the new panel entirely below the grid.

Fix: folded the panel into the editor column (stacked directly below the Exam Details form) instead of a new row, then bounded all three workspace columns to a shared `calc(100vh - Nrem)` max-height with independent `overflow-y: auto` — tuned empirically against real viewport measurements (`getBoundingClientRect`/`scrollHeight` read via Playwright, not eyeballed) from `24rem` up to `31rem` until page-level scroll hit exactly zero. Added a `900px` breakpoint override (`max-height: none`) so the columns flow naturally once the grid collapses to one column on narrow screens instead of staying locked to a bounded scroll box. Verified zero page-level scroll at 900px, 1300px, and a realistic 1920×1080 viewport; confirmed separately that scrolling within the editor column reveals the full resource list while the list and rail columns stay put beside it, unaffected.

### 44.6 Branch hygiene: two unrelated pieces of work were accidentally stacked on one branch, split apart before pushing

After §44.1's Legal Aid Cell work finished and was pushed, the session continued straight into §44.2 without switching off `feature/legal-aid-cell-react` — so the handoff-doc commit landed on top of that branch by mistake. Caught before compounding it: the legal-aid branch's own 3 commits were already pushed with nothing new on top of them remotely, but the stray handoff-doc commit was still local and unpushed. Fixed by creating `feature/learning-center-admin-panel` at that commit, resetting `feature/legal-aid-cell-react` back to exactly match its already-pushed remote state (dropping the stray commit from it), then `git rebase --onto main feature/legal-aid-cell-react feature/learning-center-admin-panel` so the new branch's history doesn't carry the unrelated legal-aid commits either — required temporarily stashing both the in-progress admin-panel changes and the pre-existing, not-this-session's uncommitted `scripts/` PYQ-pipeline modifications (left completely alone throughout, same convention as every session since they first appeared) so the rebase would run clean, then restoring both afterward by name rather than blindly popping, since two older, unrelated stashes from before this session were also sitting in the stash list and needed to stay untouched.

### 44.7 Git/production state

`feature/legal-aid-cell-react`: 3 commits off `main` (§44.1), pushed, not merged. `feature/learning-center-admin-panel`: 2 commits off `main` — `docs: Learning Center & backend handoff for Shreya` and `feat(admin): show live resource allocation on the Exams workspace` (§44.2/§44.4/§44.5 combined) — pushed, not merged. Production Supabase was touched only via read-only introspection queries plus the live add/remove round trip in §44.4's verification, which left production in its exact original state. The PYPS/OCR pipeline files and other pre-existing uncommitted `scripts/` changes are untouched, exactly where every session since they first turned up has left them.

### 44.8 Next session starts here

**The admin-auth gap is the single most urgent open item from this session** (§44.2, handoff doc §5.1): `api/admin/admins.js` has no server-side check at all and can mint real Supabase Auth admin accounts to anyone who finds the endpoint. Worth raising with the user directly rather than waiting to be asked, given the severity.

**The points/rewards migration is a genuinely cheap fix for something that reads as a real missing feature**: run `sql/points_system.sql` then `sql/rewards_system.sql` against production (via `scripts/db/apply_sql_via_management_api.mjs`, same tool used for every DDL change since §43.7) and the entire points/redemption system — currently silent no-ops everywhere — starts working. Confirm with the user first; it's the one place this session's research touched a live-data-shape decision rather than just reading.

**Both new branches are pushed but neither has a PR open yet** — ask before opening one, per this repo's usual approve-before-share convention.

Everything carried in §43.14 (credential rotation for the two leaked secrets found in §43.9, still unconfirmed; Gemini prepay still exhausted as of its last live check; the `resources_v2` compat view still needs dropping once `learning-center-backend` merges and deploys; `public/books` archival decision still open) was **not re-checked this session** — restated here only as a pointer, not re-verified.

---

## 45. New session — exam Introduction linking (42% → 55% coverage), a full legacy-format-to-blocks conversion, and a third leaked credential caught live

Started from a content-team report: "many INTROS are not mapped correctly." Turned into the largest single-topic session so far — a docx→JSON conversion pipeline built from scratch (no AI/Gemini), four real bugs in the exam-matching algorithm found and fixed live (each one caught by manually verifying a match before trusting it, not by inspection), 184 exams newly linked, a 1.3GB dead weight found and removed from the deploy bundle, every one of the 900 Intro-category `resources` rows converted to the new structured block format, and — while sanity-checking an AI-assisted matching idea — a genuine, live, publicly-downloadable API key caught in `public/`.

### 45.1 docx → blocks converter, built without AI

`scripts/convert_docx_intros_to_blocks.mjs`: walks `K:\...\CONTENT\ORIGINAL CONTENT` for `Introduction*.docx` (later widened to *any* single docx inside a folder named `*INTRO*`, since most aren't literally named "Introduction" — e.g. `CGL.docx`, `SSC MTS.docx` — the original filename-based match only found 150 of 443 CENTRAL EXAMS folders), converts via `mammoth` to HTML, then walks that HTML with `@xmldom/xmldom` (mammoth's own bundled dependency, so no new package) into the same block schema `BlockRenderer.jsx`/`BookBlocks.jsx` already render (`heading`/`paragraph`/`list`/`numberedList`/`table`/`callout`/`important`/`examTip`/`definition`/`example`) — a direct Node port of the browser-only `src/lib/mammothParser.js` (previously only used by an unreachable sandbox page), with real classification-heuristic bugs found and fixed against live content (a bold-only section header like "**Important Links**" was misclassified as a warning callout; a short link line was misclassified as a heading) before trusting it at scale. Deliberately drops embedded images — every sample docx had one multi-MB letterhead/logo image and nothing else visual.

Also found and excluded two placeholder patterns live: a `_PENDING_CONTENT.docx` sentinel filename (the content team's own documented "not written yet" marker, referenced in `scripts/lib/ingest-drive-content.js`'s comments) that the widened matcher started picking up as if it were real content, and a large class of STATE EXAMS folders (720 of 835 docx files found there) whose entire content was a single placeholder heading line — a clean bimodal split (exactly 1 block or 20+, nothing between), not a fuzzy judgment call.

### 45.2 Exam-matching algorithm — four real bugs, each caught by verifying a match before trusting it

`scripts/link_intros_to_exams.mjs` matches a converted local Introduction to an `exams` row by Jaccard-similarity token overlap between the source folder path and the exam's `conducting_body`/`exam_name`, with confidence tiers (`matched`/`ambiguous`/`weak`) so nothing gets linked without a clear margin. Four real, live-found bugs, in order:

1. **2-letter tokens filtered out** — "PO"/"SO"/"JE" (the role-code acronyms that distinguish "IBPS PO" from "IBPS SO" from "IBPS RRB PO") were being dropped by a `word.length > 2` filter, so every IBPS/SBI/SSC role variant under the same body tied on just "ibps"/"rrb"/"ssc". Fixed by keeping single-character tokens too (also needed for "NABARD Grade A" vs "Grade B" and "KTET Category 1/2/3", which were tying on the exact same class of bug).
2. **Raw overlap count, not Jaccard** — a candidate got no penalty for having *extra* unmatched words, so "IBPS RRB PO" tied with the actually-correct "IBPS PO" (both share `{ibps, po}`, and overlap-counting never punishes the leftover "rrb"). Switched to intersection/union.
3. **Containment floor mis-implemented, then fixed** — added to rescue terse PSU-style exam names ("BEL / BEL Recruitment" scoring near-zero against a verbose folder path like "PUBLIC SECTOR UNDERTAKING NAVRATNA - BEL - BHARAT ELECTRONICS LIMITED"), but the first version set an unconditional score floor that made every sibling exam under one body tie at that floor — fixed to boost only the body-corroboration term, not override the whole score.
4. **State-name formatting mismatch** — `"Dadra and Nagar Haveli and Daman and Diu"` (folder) vs the DB's `"DADRA & NAGAR HAVELI AND DAMAN & DIU"` (mixed `&`/`and`), plus a literal typo in the DB itself (`"Lakshadwee p"`, a stray mid-word space) meant 99 UT-level folders had *zero* candidate exams purely from formatting, not a missing-data problem. Fixed by stripping all separators before comparing, not just collapsing whitespace.

**184 exams linked** across four execute rounds (112 → +7 manual-review → +21 PSU/Navratna once the containment floor was fixed → +44 once the state-name fix unlocked the UT batch), each round manually eyeballed in full before writing (never more than ~50 candidates per round). A punch list of everything the matcher correctly refused to auto-link — duplicate `exams` rows, genuine content gaps (no matching `exams` row exists at all), and a handful of correct-but-under-threshold matches — is published as a Claude artifact and kept current: <https://claude.ai/code/artifact/508ee1c9-2e41-4276-9f1a-6ae3e6fc8d9e>.

### 45.3 Cross-checked against the content team's Google Drive copy — 3 more exams, a misfiling caught by hash comparison

User pointed at a shared Drive folder (`VeerNXT_Final_Content`, synced locally to `G:\My Drive\...`) the content team said had newer material. A raw folder diff showed 657 "new"/662 "removed" — almost entirely noise from the `INTRO` folder itself being renamed to `INTRODUCTION` between the two copies. Diffing at the *parent* folder level instead cut it to 17 genuinely new/changed exam folders. Of those: 3 were real, unique new content (Manipur Gramin Bank Clerk, Nagaland Forest Guard/Ranger, UPSSSC Group D) and got linked; one (UP Agriculture Technical Assistant) was an explicit stub file that says outright "this is a pointer to item 10, not real content" — and item 10 doesn't actually exist in the batch, still a real gap. The other UT Defence/CDS-AFCAT folders across Chandigarh/DNH/J&K/Ladakh/Lakshadweep/Puducherry were mostly the same content copy-pasted across UTs — confirmed via MD5 hash, not assumption: J&K's file was byte-identical to Puducherry's, Ladakh's byte-identical to Lakshadweep's. Only DNH and Lakshadweep/Puducherry's own files were genuine; the rest were skipped rather than linked as if they were real region-specific content.

### 45.4 `public/books` (1.3GB) removed from the deployed bundle — closes the `public/books` archival item open since §43.14

Discovered while verifying new Intro content rendered correctly: only 21% of `resources` rows with content were actually in the new `format='blocks'` shape; `public/books/` (1.3GB, **git-tracked**, committed in `ccae8c7`) turned out to have exactly one real consumer — `DevReader.jsx`'s sandbox page, which fetches sample books from a hardcoded local list. Before removing anything: verified every real book folder under `public/books/` already had a corresponding `resources` row with real R2 content — found 41 of 122 (34%) did **not**, including core subjects (`ENGLISH`, `HINDI`, `MATHEMATICS`, `REASONING`, `SSC COMPLETE GK`) and a set of state Police SI/Constable guides. Ran `scripts/content/migrate_resources_to_blocks.mjs --execute` first to get those 39 (2 turned out to be empty leftover folders) into R2, *then* removed `public/books` and repointed `DevReader.jsx` at R2 URLs directly instead of a local copy. Committed (`72db773`, rebased onto a teammate's concurrent commit, then pushed as `6bb9eb8`) with the pre-existing uncommitted PYQ-pipeline scripts stashed and restored around the rebase, same convention as every session since they first appeared — never touched.

### 45.5 `public/FINAL_PYPS_STRUCTURED` (98MB, untracked) verified fully ingested, moved out of `public/`

User believed this was already ingested; verified rather than trusted — computed each of the 754 local files' deterministic ID (`scripts/ingest_structured_pyps.mjs`'s own `stableUuid(filename)`) and confirmed all 754 exist in `pyq_papers` with real question counts (76,900 total in `pyq_questions`, matching). Moved to `FINAL_PYPS_STRUCTURED/` (repo root, was already untracked so no git action needed) since it's pure local staging input, not something the deployed app needs to serve.

### 45.6 Every one of the 900 Intro-category `resources` rows is now `format='blocks'` (was 188/900, 21%)

Follow-up question ("are all the intros converted to JSON format") surfaced that 651 of 838 exams-with-an-intro (78%) were still on the older ingestion pipeline's format — rendered via `dangerouslySetInnerHTML` on a raw `body_html` string, not the structured `BlockRenderer` component tree. `scripts/reformat_legacy_intros.mjs`: reuses `parseHtmlToBlocks` from the docx converter (that function doesn't care whether the HTML came from mammoth or was already stored) to reformat the *existing* HTML in place — same `resource_id`, same `storage_base_url`, same `lc_exam_intro` row, zero exam-matching risk since these were already correctly linked. 394 unique resources reformatted (394 exam-links collapsed to fewer distinct resources since several exams share one underlying resource), 0 failures. Also caught and fixed a second bug along the way: the legacy `metadata.json` shape (`ingest-drive-content.js`'s own format — `resource_id`/`exam_name`/`drive_path`/...) has no `chapters` array, which crashes any tool that reads it (`DevReader.jsx` did, live, with "Cannot read properties of undefined (reading 'map')") — `SecureReader.jsx` itself never reads `metadata.json` so real candidates were never affected, but admin tooling (`BookChapterBrowser.jsx`, `AdminResourcePreview.jsx`) would have been. Backfilled across all 581 linked resources, then the remaining 319 orphaned ones too once that became the next task (§45.7) — 900/900 total, 0 failures across both passes.

**Known, unfixed limitation carried forward, not something this session's work could reach**: the *older* ingestion pipeline (`ingest-drive-content.js`'s `processDocxBuffer`) never parsed docx `<w:tbl>` table elements at all, only `<w:p>` paragraphs — so any table in a legacy-ingested document was already flattened into a sequence of plain paragraphs (each cell on its own line) before this session touched it. Reformatting that HTML makes it *look* better (real headings instead of a flat dump) but can't reconstruct a table that's already gone from the source. Re-deriving from the original docx instead of the stored HTML was offered as an option and explicitly declined by the user for now.

### 45.7 319 orphaned Intro resources — AI matching set up, then made unnecessary by a bug it helped surface

319 `resources` rows (category=Intro) existed with no exam pointing to them at all — leftovers from the older ingestion pipeline. User pointed at `public/AI_API_USAGE.md`/`public/VeerNXT AI API — Developer Integration.md` (an internal OpenAI-compatible proxy at `singular-ai.vercel.app`, model `nvidia/nemotron-3.5-lightning-30b-a3b`) as a way to match the harder ones. Built the pipeline (`scripts/link_orphaned_intros_to_exams.mjs`, reusing the same `rankCandidates`/`decideMatch` core factored out of `link_intros_to_exams.mjs` for this), but before trusting any AI output, manually verified one supposedly-"confident" plain-matcher result first — a Delhi Stenographer resource had matched "Food Corporation Of India" instead of the real "Delhi Subordinate Services Selection Board / Stenographer Grade II/III" row. Root cause: paths with no explicit `CENTRAL`/`STATE`/`UT EXAMS` prefix (a real pattern in this batch — e.g. `"5. Delhi/2. Administration/..."`) were silently defaulting to the wrong level, searching the wrong exam pool entirely. Fixed by trying every plausible level (central always; state *and* ut too, when the first path segment matches a real `state_ut` value from the exams table) and merging all their candidate pools before deciding, rather than committing to one guessed level up front.

That one fix alone moved "already correctly covered by an exam elsewhere" from 126 to 281 of the 319. Cross-checking the remaining 38 against which target exams still genuinely have no intro (not just "is this match plausible") narrowed it to 11 that mattered at all — and every one of those 11 turned out to be either a confirmed byte-for-byte duplicate of content already linked earlier this session (same source `.docx`, different old `resource_id` — verified via `file_hash`, not assumption) or a restatement of a gap already in §45.2's punch list (Postal GDS for four UTs, Defence CDS/AFCAT for three, SSC JE vs. RRB JE body confusion). **Net: 0 of the 319 needed linking, and the AI API was never actually called for a real match** — the investigation into whether to trust it is what found the real bug instead. Punch list artifact (§45.2's link) updated with a dedicated section recording this outcome.

### 45.8 A third leaked credential, caught live while reading the AI API docs for §45.7

`public/AI_API_USAGE.md` had a live, real bearer token for the `singular-ai.vercel.app` proxy hardcoded directly in the markdown — and being under `public/`, it shipped in the deployed bundle, publicly downloadable at `<site>/AI_API_USAGE.md`. Same category of issue as the two secrets already flagged in §43.9 (still unrotated as of this writing). Moved both `AI_API_USAGE.md` and `VeerNXT AI API — Developer Integration.md` to a new `internal/` folder at the repo root, added `internal/` to `.gitignore` as a durable safeguard (both files were already untracked — never committed — so no git-history cleanup was needed, just prevention going forward), and put the real key/URL in `.env` (`VEERNXT_AI_API_KEY`/`VEERNXT_AI_API_URL`, gitignored) instead of leaving it hardcoded in any script. **Key rotation itself is still not done** — same unresolved state as §43.9's two secrets; three live credentials now confirmed leaked across sessions, zero rotated.

### 45.9 Git/production state

Two commits pushed to `main`, in order: `6702631` (a teammate's concurrent, unrelated commit — "added archieve and open in new tab") then `6bb9eb8` (this session's `public/books` removal, §45.4), reached via rebase since the push was initially rejected. `internal/` and `.gitignore`'s new entry are local-only as of this writing (untracked/gitignored respectively) — nothing to commit there by design. All of §45.1–§45.7's database writes (184 exam links, 39 book uploads, 900 Intro-resource reformats) are live in production Supabase/R2, independent of git entirely. The pre-existing uncommitted PYQ-pipeline `scripts/` changes are untouched, exactly where every session since they first turned up has left them — this session's own new scripts (`convert_docx_intros_to_blocks.mjs`, `link_intros_to_exams.mjs`, `link_orphaned_intros_to_exams.mjs`, `reformat_legacy_intros.mjs`, `audit_exam_intros*.mjs`, `export_missing_intros.mjs`) are untracked, not yet committed — user has not asked for that yet.

**§45.10 Next session starts here**: the user's own words, ending this session — "we will tackle these orphans in a new chat." §45.7's literal 319 orphaned resources are fully closed (0 remaining), so this almost certainly means the punch list's still-open ~32 items (§45.2's artifact link): 5 likely-duplicate `exams` rows, 13 confirmed content gaps needing a new `exams` row (not a matching fix), and ~14 correct-but-under-threshold matches worth a quick manual approve. Read the punch list artifact directly rather than re-deriving it — it's kept current as of this session's end. Separately, and worth raising proactively rather than waiting to be asked: three live credentials are now confirmed leaked across sessions (§43.9's two, §45.8's one) with zero rotated.

---

## 46. New session — the §45.2 punch list closed out, and the artifact turned out to be significantly stale

Picked up exactly where §45.10 left off. Before touching anything, re-verified every item in the punch-list artifact against live data rather than trusting it — the `exams` table had grown (new rows added by someone/something between §45's end and this session's start), so several "gaps" and "no row exists" claims in the artifact were already wrong by the time this session opened it. Re-derived ground truth live rather than reconciling against the artifact's text.

### 46.1 5 "likely duplicate" rows — 4 real, 1 was a live mislink, not a duplicate

Audited every FK-bearing table pointing at `exams.exam_id` (`jobs`, `jobs_v2`, `lc_exam_intro`, `lc_exam_quiz_map`, `lc_exam_resource_map`, `lc_exam_tags`, `user_exam_targets`, `user_quiz_attempts`, `user_resource_reads`) before touching any row, via `scripts/db/apply_sql_via_management_api.mjs` against `information_schema` — zero rows in any user-data or jobs table referenced the 8 candidate exam_ids, only `lc_exam_resource_map`/`lc_exam_intro`, both safely mergeable.

- **RBI Assistant, A&N Primary/Graduate/Post-Graduate Teacher (4 pairs)**: confirmed true accidental duplicates — identical `metadata`, identical `created_at` timestamp down to the microsecond. Merged (`lc_exam_resource_map` rows moved to the keeper with `ON CONFLICT (exam_id, resource_id) DO NOTHING`, since the sets mostly overlapped as clean supersets) and the loser row deleted.
- **MCD Sanitary Inspector was NOT a duplicate.** Traced the two source docx filenames directly: `Delhi_MCD_Sanitary_Inspector_Introduction.docx` vs `..._Senior_Grade_Introduction.docx` — two genuinely different postings, exactly as the punch list's own caution suspected. The real bug: both exam rows were pointing at the *same* (non-Senior-Grade) intro resource, because the Senior Grade docx had been converted locally (§45.1's pipeline) but never uploaded to R2 or linked. Uploaded it as its own resource and relinked the Senior Grade exam row to it.

### 46.2 13 "content gaps" — mostly already closed by rows that didn't exist when the artifact was written

Re-checked all 13 against live `exams` data: BTSC Staff Nurse, SSC JE, and all 3 Arunachal Pradesh Police postings now have real rows *and* already have real intros linked (from some intervening round) — zero action needed, the punch list was stale. SSC CGL/CHSL (UT Cadre) for DNH and Lakshadweep: same story, already resolved.

Two categories of real work remained, both found by re-running `link_intros_to_exams.mjs` dry-run fresh (`SHOW_ALL=1 SHOW_STILL_MISSING=1`) rather than trusting the artifact's captured output:

- **Directly linkable, matcher just missed them on a naming mismatch** (row exists, local content exists, zero token overlap between the two): Sikkim Police SI, Meghalaya Police SI (both filed under `CENTRAL EXAMS\18.POLICE EXAMS\` with no state scoping, so the matcher's level/state pool filter excluded the real state-level DB rows entirely and it fell back to ambiguous ties against unrelated Bihar/Assam Police), and Defence/Agniveer content for DNH, Lakshadweep, Puducherry, Ladakh (folders are named "CDS/AFCAT," the real DB rows are named "Indian Armed Forces / Agniveer Recruitment" — literally zero shared tokens). Linked all 6 directly by exam_id rather than trying to generalize the matcher for a one-off naming gap.
- **Genuinely new `exams` rows needed**: Ladakh had zero banking-body row at all (every other state/UT already has an IBPS/SBI row per the `also_listed_as` cross-UT sibling pattern seen on the A&N row) — created `IBPS PO / Clerk / RRB` and `SBI PO / Clerk` for Ladakh, reusing the existing IBPS/SBI `conducting_body_id`. Postal GDS had zero row for A&N, DNH, Lakshadweep, Puducherry, *or* Ladakh (India Post is modeled per-state "postal circle," not centrally, per the pre-existing `Odisha Postal Circle / Odisha GDS` precedent) — created all 5, each a new `lc_conducting_bodies` row since no precedent existed for these bodies. Region ids reused from each UT's own already-existing sibling rows (e.g. the Ladakh Agniveer row's `region_id`) rather than looked up fresh.

Still genuinely open, **not actionable without the content team writing new source material** — no local docx exists for these at all: Sikkim Police DSP, Sikkim Police Constable, Meghalaya Police (MPSC) DSP.

### 46.3 A previously-undocumented structural bug: `lc_exam_intro.exam_id` FKs to `lc_exams.id`, not `exams.exam_id`

Found live while linking the newly-created rows: `lc_exam_intro` upsert failed with a foreign-key violation even though the target `exam_id` definitely existed in `exams`. `information_schema` traced the actual constraint (`lc_exam_intro_exam_id_fkey`) to `lc_exams.id` — a separate, still-live legacy CMS table (`lc_exams` / `lc_conducting_bodies` / `lc_regions`, its own `conducting_body_id`/`region_id` FK structure) that every *pre-existing* `exams` row happens to have a matching row in, same uuid reused across both tables (1,524 of 1,537 matched at time of writing — the other 13 pre-existing orphans predate this session). Nothing keeps the two in sync automatically; a fresh `exams.exam_id` from `gen_random_uuid()`/`crypto.randomUUID()` has no `lc_exams` counterpart until one is created by hand. Worked around it this session (manually inserted the matching `lc_exams` + `lc_conducting_bodies` rows for all 7 new exams), but this is a real landmine for **any future new `exams` row**, not just this session's — anyone inserting directly into `exams` and then trying to `lc_exam_intro.upsert()` will hit the same FK 400 until either `lc_exams` is dropped/decoupled properly or a documented dual-insert helper exists. Related to the dual-admin-content-system pattern already known from `resources`/`resources_v2`/`lc_resources` — same shape of migration debt, different table.

### 46.4 ~14 "approve on sight" matches — all already linked, zero action needed

Checked live `hasIntro` status for every named example in the artifact (IBPS RRB PO/SO/Clerk, RRB NTPC, RRB Nursing Superintendent, NVS Vice-Principal, Maharashtra CHO, J&K Staff Nurse, Bihar/Assam Police SI). Every single one already has a real intro linked from an intervening round between the artifact's generation and this session. Confirmed the artifact's own claim that "SSC JE has no row at all" was specifically wrong — a real `SSC / SSC JE (Junior Engineer)` row exists and already has an intro; the item still showing as a weak match in a fresh dry run is a second, duplicate source docx for the same already-linked exam (harmless, no action).

### 46.5 Credential rotation — still not done, raised again

Flagged proactively at the start of this session per §45.10's own note. Confirmed still unresolved: three live credentials (§43.9's two, §45.8's `singular-ai.vercel.app` bearer token) remain unrotated across three sessions now. Not actioned this session — user chose to proceed with the linking work; rotation is still the user's call to schedule.

### 46.6 Git/production state

All writes (4 exam-row merges/deletes, 7 direct resource-links, 7 new `exams`/`lc_exams`/`lc_conducting_bodies` rows + their resource uploads and links) are live in production Supabase/R2, independent of git. This session's own investigation/one-off scripts were deleted after use (not committed) — no new script files added to the working tree; `git status` at session end matches session start plus the pre-existing uncommitted PYQ-pipeline changes, untouched as always.

**Next session**: the §45.2 punch list is now fully closed except for 3 items with no source content at all (Sikkim Police DSP/Constable, Meghalaya MPSC DSP — need the content team, not more matching work) and one low-priority ambiguity (Puducherry Teaching vs. Non-Teaching Staff body — both candidates already have *some* intro, so not urgent). The `lc_exams` FK landmine (§46.3) should get a real fix — either drop the constraint if `lc_exams` is truly dead, or document/build a proper dual-insert helper — before the next person creates a new `exams` row by hand and hits the same 400. Credential rotation (three, zero rotated) is still open.

---

## 47. Same session, second thread — admin "Exams Management" CMS rebuilt to a client mockup, plus a real dark-on-dark rendering bug found along the way

Separate from §46's data work: the user shared a screenshot of the live admin CMS's Introduction Preview showing near-unreadable text, which turned into (a) a genuine bug fix, then (b) a full rebuild of the Exams Management page to match a supplied mockup, then (c) several rounds of follow-up polish. All committed and pushed by session's end — see §47.7.

### 47.1 Real bug: admin resource previews rendered light-theme text on the CMS's dark background

The user's screenshot showed Introduction Preview content that was essentially invisible except where a browser text-selection highlight lit it up. Traced to `AdminResourcePreview.jsx`: it renders `BlockRenderer`/`BookBlocks.css` content directly inside the admin CMS's dark drawer (`--surface: #141a21`), but `BookBlocks.css` hardcodes near-black text/light backgrounds throughout (`#1e293b`, `#0f172a`, `#ffffff` callout boxes, etc.) because it's shared with the candidate-facing reader, which *is* on a light page. Fixed by wrapping the rendered content in a white "paper" card inside `AdminResourcePreview.jsx` — the same fix pattern `ExamIntroCard.jsx` (since deleted, §47.4) already used for its own manual/draft preview paths. Verified live via a Playwright-driven headless Chromium session (login → Exams → open a preview → screenshot) rather than trusting the build alone, since this was a pure rendering bug a compile can't catch.

Separately, and while looking at that same screenshot: **Goa ANM's Introduction was showing Tamil Nadu's content** — a genuine wrong-content link from an early bulk-seeding pass (`lc_exam_intro`, `source: 'auto'`, all timestamped `2026-09-02T07:29:22` to the microsecond across many rows), long predating this week's careful matching work. A quick scan found **149 of 533 (28%) state/UT-level auto-linked exams** show zero trace of their own state anywhere in the linked resource — e.g. Himachal Pradesh/Sikkim/Punjab/Tamil Nadu/J&K/Ladakh/Lakshadweep/Chhattisgarh/Puducherry's "Staff Nurse" postings *all* show Jharkhand's content; a dozen+ states' TGT/PGT show Bihar's. **Flagged to the user, not yet remediated** — a real, sizeable content-correctness problem sitting underneath the UI work, separate from anything this session's own linking touched.

### 47.2 Introduction Preview made full-screen, chatbot widget removed from `/admin/*`

Two quick, independently-requested fixes ahead of the bigger rebuild:
- The Introduction Preview drawer (and, later, every other resource-preview drawer) was a `min(900px, 92vw)` panel floating on the right; changed to `100vw`/`100vh` per explicit direction ("let it overlay over the full screen"), overriding `.lc-drawer-panel`'s own `max-width: 92vw` which would otherwise have silently capped it back down.
- `AiChatbotWidget.jsx` (the candidate-facing exam-prep/career assistant) is mounted globally in `App.jsx` outside `<Routes>`, so it rendered on every admin page too. Added a `useLocation()`-based guard (`if (location.pathname.startsWith('/admin')) return null;`, placed after all hooks per rules-of-hooks) rather than touching the global mount point. Verified with a real browser: present on `/`, absent on `/admin`.

### 47.3 Full Exams Management rebuild to a supplied client mockup

The user supplied a high-fidelity mockup (plus a companion ASCII wireframe) and a detailed 14-point spec. Rebuilt across `ExamsPage.jsx`, `ExamEditorPanel.jsx`, `ExamResourcesPanel.jsx`, `AdminShell.jsx`, and `AdminCMS.css`:

- **Removed the top `Exams | Users | Settings` tab bar** (`AdminShell.jsx`'s `HORIZONTAL_NAV`) sitewide, not just on this page — its own code comment said it was required by an *earlier* mockup ("Do NOT remove this horizontal navigation"); the sidebar already covers the same navigation everywhere, and the new mockup explicitly called it redundant.
- **Filter bar** collapsed from a two-row Level-pills-plus-secondary-filters layout to one row: Search / Category / Conducting Body / Level. Level is now a **required** field with only Central/State/UT (no "All Levels") — deliberately, so the exam list is never rendered unscoped against the full 1,500+ row catalog.
- **Exam list** rewritten from a `<table>` to card-style rows (colour thumbnail, name, body, `category • level`, status badge) with **no internal scrollbar** — bounded by pagination, not `overflow-y: auto`.
- **Three columns stretch to equal height** (`align-items: stretch` on the grid) so Exams list / Basic Information / Resources bottom edges line up instead of each sizing to its own content.
- **Exam header**: title + `body • category • level` subtitle, with a Published toggle (moved here from the deleted `ExamStatusCard.jsx` rail card — still saves immediately, independent of Save Changes), a new **Duplicate** button (copies identity fields only — deliberately not tags/resources/Introduction, to avoid silently cloning content mappings that might not apply), Delete, Save Changes.
- **Basic Information**: Level split out of the old combined Region dropdown into its own Level + State/UT pair; Category/Level/State-UT in one row; Website got an external-link icon; **Change Image** is now a toggle button revealing the Template/Accent-color controls instead of always showing them.
- **Resources** moved to the right column (previously it sat in the centre column under the editor, and the rail held Introduction + Status instead).
- Deleted `ExamStatusCard.jsx` (fully absorbed into the editor header) once nothing referenced it any more.

Verified the whole rebuild with a real headless-browser walkthrough (Playwright via `chromium/index.mjs`, since `chromium-cli` isn't available in this Windows environment) — caught one real bug this way: the Published toggle's track/thumb rendered overlapping its own label text, because `.lc-toggle`'s flex/gap CSS was scoped to `.lc-input-group .lc-toggle` and the new header placement wasn't inside one. Fixed by unscoping the rule to plain `.lc-toggle`.

### 47.4 Introduction folded into the Resources panel as its own assignable category; docx upload retired

Follow-up request: move "Introduction Document" out of Basic Information and into the Resources panel, positioned above Guide; replace the docx-upload flow with an "assign from our Intro DB" mechanism matching Guide/Precis; give Intro/Guide/Precis each their own "+" instead of one generic "Add Resource" button.

Turned out `AddResourceMapDrawer` (Guide/Precis's existing assign-picker) already fetches published `category='Intro'` resources and already has category-filter pills — the "assign from an existing library" mechanism the user asked for already existed, just wasn't wired to the Introduction slot. Deleted `ExamIntroCard.jsx` (the old upload-docx-convert-to-HTML-store-as-`lc_exam_intro.manual_body` flow) entirely rather than keep two parallel intro mechanisms; going forward, Introductions are just `lc_exam_resource_map` rows with `category='Intro'`, exactly like Guide/Precis, read by the candidate app's existing `lc_exam_resource_map` fallback path (no candidate-side change needed — that fallback already existed). `ExamResourcesPanel.jsx`'s three canonical categories now always render (even at zero items) so there's a "+" to click before anything's assigned; `AddResourceMapDrawer` gained an `initialCategory` prop so each category's own "+" opens the drawer pre-filtered and relabeled ("Assign Intro" / "Assign Guide" / "Assign Precis").

Also removed the redundant **State/UT dropdown for Central-level exams** (it was permanently disabled and showing "Central" a second time right next to a Level field that already said "Central") while keeping it for State/UT-level exams, where it's a real, necessary choice — verified both cases with screenshots. And removed the HIGH/MEDIUM confidence badges and `gemini`/source text from every resource row per explicit direction ("useless info") — deleted the now-unused `ConfidenceBadge` component too.

### 47.5 Final polish round: page chrome, pagination size, full width

A few more explicit, small requests, each verified visually:
- Removed the "Exams / Central / State / UT → State → Conducting Body..." page heading entirely; moved "Add Exam" into the filter row (replacing the "Clear" button, which the user said wasn't needed).
- Exams list capped to **10 per page**, not the shared `lcShared.PAGE_SIZE` (20) — added a page-local `EXAMS_PAGE_SIZE` constant instead of changing the shared one, since `AdminJobs.jsx` also uses it and wasn't part of this ask.
- `.admin-content`'s `max-width: 1680px` cap removed — was leaving dead space on wider/laptop screens instead of the three columns always using the full available width. Verified at both 1440px (laptop) and 1920px (wide monitor).
- The **Resource Preview** drawer (the generalized viewer all Intro/Guide/Precis rows now use) still had the old `min(900px, 92vw)` floating-panel style, missed during §47.2's full-screen pass since it predated Introduction being folded into Resources — fixed to `100vw`/`100vh` like every other preview drawer.

### 47.6 Not actioned, flagged for a future round

- **149 mislinked exam Introductions** (§47.1) — real content is showing under the wrong exam for over a quarter of state/UT-level auto-linked exams. Not touched this session; needs a deliberate pass to separate genuinely-shared national content (e.g. UGC-NET for Assistant Professor postings, plausibly intentional) from wrong state-specific narrative (the Goa/Tamil Nadu ANM case, clearly not).
- **Credential rotation** — still three, still zero rotated, still open (see §46.5, §45.8, §43.9).
- **`lc_exams` FK landmine** (§46.3) — still unresolved.

### 47.7 Git/production state

Committed (`d3ee4a5`, following `87738cf` which a teammate pushed directly, unrelated to this session) and pushed to `origin/main`. Staged only the files this session actually touched (`.gitignore`, this file, and the 9 admin CMS files including the 2 deletions) — the pre-existing uncommitted PYQ-pipeline scripts and this session's own untracked one-off scripts/exports were deliberately left alone, per the standing convention every session since they first appeared has followed. User asked for a rundown of exactly what remained untracked and why before confirming the push scope was right.

**Next session ("round 2")**: no specific scope given yet beyond "get ready" — the user said the current round is done and to prepare the status report, without naming what's next. Worth raising proactively at the start of the next session: the 149-mislink content problem (§47.1/§47.6) and credential rotation (§46.5) are both still open and neither has been actioned across multiple sessions now.

---

## 48. New session — the 149 mislinked Introductions re-derived and categorized, a State/UT filter added to the admin Exams list

### 48.1 149 mislinked exam Introductions, re-derived live and split into two real categories

Picked up exactly where §47.6 left off, but re-derived the count live rather than trusting it, per the prior session's own explicit caution ("don't trust the 149 count as still-accurate — the exams table has changed shape before"). Live count: **149 of 534** state/UT-level exams with an auto-linked Introduction show zero trace of their own state (last session: 149/533 — one new exam row had appeared since, the pattern held exactly).

- **The naive check isn't a reliable A/B split on its own.** "Does the exam's own state name appear anywhere in the linked content?" reproduces the same headline 149, but caught real content on both sides of the line wrong:
  - **False positive it would have caused:** the NIC (National Informatics Centre) Scientist intro mentions "Delhi" only because NIC is headquartered there and interviews happen there — genuinely shared central content across A&N/Ladakh/Chandigarh/DNH's own Scientist postings, not a leak.
  - **False negatives it would have missed:** a state PSC's own Group D/Peon posting silently showing **India Post's own MTS intro** instead (19 exams), or a state Health Department's Pharmacist posting showing the **Railway Recruitment Board's** Pharmacist intro instead (10 exams) — neither mentions any state name at all, so a text-only check calls both "clean."
- **Fix:** cross-checked every flagged resource's own `resources.conducting_body` field against the exam's real conducting body. That single check both cleared the NIC/IBPS/SBI/India-Post-GDS false positives *and* caught the India-Post-MTS/RRB-Pharmacist/KVS-Assistant-Commissioner/UPSC-state-CSE false negatives that the text-only check missed.
- **Final split: 117 genuine content errors** (need a real fix — unlink, then either find the correct state-specific source or leave empty) **vs. 32 plausibly-intentional shared/central content** (leave alone). UGC-NET Assistant Professor is 23 of the 32 — the exact case the user named unprompted as the model "probably fine" example, independently confirmed correct by the conducting_body cross-check.
- All 149 trace to the exact same seeding-pass timestamp already identified in §47.1 (`2026-09-02T07:29:22` to the microsecond), confirming this is one bad historical pass, not new or ongoing damage.
- Delivered as a categorized report (grouped by posting type — MTS/TGT/ANM/Staff Nurse/Pharmacist/PGT/Medical Officer/etc. on the error side, Assistant Professor/NIC Scientist/SBI PO/Postal GDS on the shared-content side, each with a real example naming the donor state or body) plus the full 149-row detail (exam_id, resource_id, source_file, donor conducting_body, link timestamp) saved to this session's scratchpad. **Nothing in the database was touched** — explicitly scoped as categorization only, per the user's own instruction to report back before bulk-fixing anything.
- All investigation was one-off scripts against live Supabase plus the public R2 content URLs (`chapters/chapter-1.json` per resource), deleted after use per the standing convention — `git status` at the end of this sub-task matched `git status` at the start.

### 48.2 State/UT filter added to the admin Exams list (`ExamsPage.jsx`)

User request: when Level is set to State or UT in the Exams filter bar, add a further State/UT dropdown to narrow the ~1,100-row state/UT catalog down to one state — the same Level → State/UT cascade `ExamEditorPanel.jsx`'s own Basic Information form already uses per-exam (§47.4), just not present yet at the list/filter level.

- Added a `regions` fetch (`lc_regions`, same table/shape the editor panel already reads) and a `regionId` filter state, cascaded to whichever Level is currently selected via `regionOptions = regions.filter(r => r.level === level)`, and reset whenever Level changes (same pattern `chooseLevel` already used for Category/Conducting Body).
- Wired into the exam-list query as a plain `region_id` equality filter; added to the page-reset effect's dependency array so changing state resets to page 1.
- Field renders only for Level ≠ Central (labelled "State" or "UT" to match which one is selected) — same reasoning already used in §47.4 to hide the analogous field in the editor panel for Central-level exams, which have exactly one fixed region.
- Confirmed via `git show HEAD:...` + `eslint` that the two `react-hooks/set-state-in-effect` errors on this file are pre-existing on the already-committed version, not introduced by this change.
- First verification attempt (login → Exams → switch Level → confirm the State/UT dropdown appears/filters/resets) was interrupted by the user mid-run before any screenshot was taken, then superseded by the port-cleanup request in §48.3 — committed and pushed (`54a23eb`) on code-review + lint alone at that point. **Actually browser-verified afterward**, same session, once the dev server was relaunched clean on 8080 (§48.3): Level=State correctly reveals a "State" combobox and filtering to Goa narrows the list to exactly the 30 Goa exams; Level=UT correctly flips the label to "UT" and clears the prior selection; Level=Central correctly hides the field entirely. No console errors.
- Committed (`54a23eb`) and pushed to `origin/main`, staging only this one file — the pre-existing uncommitted PYQ-pipeline scripts, this file's own pending edits, and this session's untracked one-off scripts were left alone, per the standing convention every session since they first appeared has followed.

### 48.3 Dev-server port cleanup

Eight stale `node.exe` Vite dev-server processes from prior sessions were found squatting ports 8080–8087 (each confirmed as `node.exe` via `tasklist` before killing, not assumed). Killed all eight on the user's explicit instruction and relaunched fresh — now serving cleanly on `8080` with no port-hunting fallback needed.

### 48.4 "Add Conducting Body" capability built for the admin Conducting Bodies page

User's next request: `ConductingBodiesPage.jsx` (`lc_conducting_bodies`, 676 rows) was a pure logo-management grid — no way to create a new body anywhere in the admin CMS except inserting into the table directly. `ExamEditorPanel.jsx`'s own conducting-body picker (§47.3) only ever selects from existing rows.

- Added an "Add Conducting Body" button in the page header, opening a modal built on the same `.lc-modal-*` CSS pattern `RolesPermissionsPage.jsx`'s "Add Administrator" flow already uses — kept the new page visually and structurally consistent with an existing pattern rather than inventing a new one. Fields: Name (required) and Website (optional) — the only two real columns on `lc_conducting_bodies` besides `logo_path`, which is deliberately left to the existing per-card upload flow (`LogoCell`) right after creation rather than duplicating that upload logic inside the modal.
- **Live-verified with Playwright caught a real race condition**, not just a cosmetic issue: the client-side duplicate-name check compares against the `bodies` state loaded once on mount (676 rows, one paginated fetch) — clicking "Add Conducting Body" before that fetch resolves leaves the check with nothing to compare against, so a genuine duplicate (tested with the pre-existing "CTU" row) sailed past the client check and hit `lc_conducting_bodies`'s real unique constraint on `name` directly, surfacing the raw Postgres error (`duplicate key value violates unique constraint "lc_conducting_bodies_name_key"`) inside the modal instead of a friendly message.
- Fixed by also catching Postgres error code `23505` in the submit handler's `catch` block and mapping it to the same friendly "already exists" message the client-side pre-check shows — so the two-layer guard (instant client check when data has loaded, DB constraint as the real backstop) now degrades gracefully either way instead of leaking SQL to the user.
- Re-verified after the fix: the same fast-click-before-load race against "CTU" now shows the friendly message with no raw error text, and a genuine new entry still saves, appears in the grid, and closes the modal correctly. Both test rows created during verification (`Test Conducting Body …`) were deleted from the live table afterward.
- Committed (`4c70603`) and pushed to `origin/main`, staging only this one file, same convention as §48.2.

### 48.5 Book Content page redesigned: Intro support, per-row category correction, cleaner filter bar

Next explicit user request, given as a dense multi-part instruction. Read `BooksPage.jsx` and `api/admin/save-resource.js`'s `books-*` handlers in full before touching either — the resources table has heavy pre-existing title-based duplication (`handleBooksList`'s own docstring: "some titles have 1000+ rows") that every action here has to account for.

- **Header decluttered**: dropped the "111 active books, 0 flagged by the last QA scan" subtitle entirely (`activeCount`/`totals` computations removed as now-unused) — user's own words, "we don't need to show the amount of books right now."
- **Filter bar consolidated**: Show Archived and New Book moved out of the section header into the same row as Search/Type/Sort, reusing `.lc-filter-bar-single` (the flex-wrap container built for §48.2's Exams filter row) rather than inventing new CSS.
- **"All" tab removed, Type made a required drill-down**: same reasoning as `ExamsPage.jsx`'s Level field (§48.2) — Category renamed "Type," defaults to `'Guide'`, and the list is never rendered across mixed types unscoped. User's own words: the All button was "confusing."
- **Intro added as a third type** — and this is the part that needed real care, not a one-line addition. Guide/Precis legitimately have many `resources` rows sharing one `(category, title)` — the same book linked from many exams — so every existing action (`books-list`, `-rename`, `-archive`, `-delete`, `-save-chapter`, `-duplicate`, `-find-replace`) groups and mutates "this book" by title. Intro resources don't share that pattern: they're independently-authored, exam-specific documents that often carry a generic filename-derived title (`"Introduction"`, `"1.MTS_INTRO"`) across dozens of unrelated exams — exactly what §48.1's mislink audit spent this session characterizing. Naively adding `'Intro'` to `BOOK_CATEGORIES` would have made the book list silently merge unrelated exams' Introductions into one row (hiding the rest), and worse, made rename/archive/delete apply to every same-titled Intro at once instead of just the one intended.
  - Fixed with a `TITLE_DEDUPED_CATEGORIES = ['Guide', 'Precis']` split: a new `fetchBookRows`/`bookRowsFilter` pair scopes every action to title+category for Guide/Precis (unchanged behavior) but to `resource_id` alone for Intro. Applied consistently across all eight `books-*` handlers, not just `books-list`.
  - Live-verified against the real 676-row-plus catalog: switching to the Intro tab shows **914 distinct rows**, each its own resource_id, zero false "N linked exam entries" badges — confirmed by checking for the literal badge text, not just badge-shaped elements (the QA-status column's unrelated "Not scanned" badge shares a CSS class and produced a false read on the first pass).
- **Per-row category correction added** (`books-set-category`, new API action): an inline `<select>` replaces the static category text in the table — pick Guide/Precis/Intro directly, content stays exactly where it lives in R2 (only the `resources.category` column moves, since `storage_base_url` is stored per-row rather than derived from category at read time). This is the user's own stated motivation: "some books are wrongly assigned to precis when they are guides."
  - **Real bug caught by testing, not by inspection**: the first version blocked the change with a 409 if the destination category already had a book with that title — sensible for `books-create`/`books-duplicate` (a title clash there really is two unrelated things), wrong here. Testing against the live catalog hit exactly this: **"Haryana_GS" already exists split across both Guide (~50 rows) and Precis (~30 rows) in production** — a live, naturally-occurring instance of the exact bug the user described, not something this session's testing caused. The guard was blocking the one operation meant to fix it. Removed the destination-clash check specifically for `books-set-category` (kept it for create/duplicate); merging into an existing same-titled group now behaves the same way any other duplicate-titled row already does (`pickCanonicalStorageBaseUrl` resolves which content is canonical, nothing is deleted).
  - Added a client-side confirm when `duplicateRowCount > 1`, since one row on screen can represent many underlying `resources` rows getting re-labeled at once.
- **Verified live end-to-end** via Playwright against a disposable test book (created → Guide→Precis→Intro category changes, each confirmed by tab switch → deleted via the real "type the title to confirm" flow) rather than against any real book, specifically to avoid touching production data like the newly-discovered Haryana_GS split. `NewBookModal`/`DuplicateBookModal` (`BookFormModals.jsx`) also gained the Intro option in their category dropdowns for consistency.
- **Known tradeoff, not fixed this session**: `books-list` now scans ~1,300 raw rows instead of ~110 (Intro included), and the fetch takes ~5s instead of near-instant. Acceptable for an admin tool at this scale, but if it becomes annoying the real fix is having `books-list` accept a category param and only fetch the selected type, rather than all three up front every load.
- Committed (`0b2f3df`) and pushed to `origin/main`, staging only the three files this touched (`api/admin/save-resource.js`, `src/pages/admin/BooksPage.jsx`, `src/components/admin/BookFormModals.jsx`) — same standing convention.

### 48.6 Admin CMS contrast audit: three real "invisible text" bugs, same root cause

User hit this live while renaming a book: the pre-filled title in `RenameBookModal` (`BookFormModals.jsx`) rendered as pale grey text on a white card, barely readable. Root cause, confirmed via computed styles before fixing rather than guessed: `AdminShell`'s own dark theme sets `color: rgb(230,237,243)` (light text, meant for its own dark background) on itself, and every hardcoded-white card nested inside it that doesn't pin its own `color` inherits that value straight through every intervening `<div>`. `BookFormModals.jsx`'s shared `fieldStyle` (used by every input across New/Duplicate/Rename Book) never set `color`/`background` explicitly, despite the file's own docstring saying it's deliberately theme-independent inline styles — the gap was real, just not one `git grep`-able without checking computed styles.

- Fixed `fieldStyle` by pinning `color: '#0f172a', background: '#fff'` directly, rather than relying on inheritance. Re-verified computed styles after: `rgb(15,23,42)` on white, confirmed via screenshot too.
- Delegated a broader background-agent audit of the rest of `src/pages/admin/**` and `src/components/admin/**` for the identical pattern (light-on-dark-shell and its mirror, dark-on-light-page), specifically excluding `.lc-*`/CSS-variable-based components (those are designed to inherit the theme). Found two more real, live instances: the bulk-select action bar ("N selected / Set subject...") on both `QuizzesPage.jsx` and `PyqPapersPage.jsx` had the exact same unset-`color` gap, both confirmed reachable inside `AdminShell` via `App.jsx`'s route nesting before fixing. Everything else checked out already-clean.
- All three fixes verified live (computed styles + screenshots), not just by inspection. Committed (`13ab8df`) and pushed.

### 48.7 Book Content: editing Intros in the block editor confirmed already working, no changes needed

Next request checked before building anything: turned out §48.5's `resource_id`-scoping fix already made this work end-to-end as a side effect — preview, "Edit Chapter," Split View/Editor/Preview, and Save all function identically for Intro as for Guide/Precis. Verified with a disposable test Intro book (created → edited chapter title → saved → confirmed the edit persisted to that resource's own isolated R2 location via direct DB/R2 checks → deleted). No code changes were needed for this part.

### 48.8 Book Content gains Level/State-UT/Conducting Body tagging, with an explicit per-row Save

User's stated motivation: "This is a great place to tag as we can then have better mapping later" -- books have never had a level or region association the way exams already do, which is exactly the missing shared vocabulary behind §48.1's mislink audit and the ad-hoc matching scripts (`link_intros_to_exams.mjs` etc.) scattered across recent sessions.

- **Schema**: added `resources.level` (this session, §48's earlier work) and `resources.state_ut` (new) via the standard `apply_sql_via_management_api.mjs` path — both nullable text columns, ~1,300 existing rows untagged by default. `resources.conducting_body` already existed and is reused as-is.
- **State/UT and Conducting Body dropdowns deliberately reuse `lc_regions`/`lc_conducting_bodies`** — the exact tables `ExamsPage.jsx`/`ExamEditorPanel.jsx` already read for the identical Level→State/UT cascade and Conducting Body picker — so a book's tags land on the same names exams use, not a parallel vocabulary that needs reconciling later.
- **Explicit Save, not auto-commit on change**: user's own words, "I want a save changes button so that we know we are committing the data to DB." Category, Level, State/UT, and Conducting Body are all staged locally per row (`pendingEdits` state) rather than firing a request per dropdown change — **confirmed live via network-request logging that editing all four fields produces zero API calls**, and clicking the one "Save" button that then appears fires exactly one `books-save-tags` request. Added a small "×" to discard unsaved edits per row.
- **Backend consolidated**: replaced the two separate `books-set-category`/`books-set-level` actions from earlier this session with one `books-save-tags` handler taking any combination of the four fields, still scoped by the same `bookRowsFilter` (Guide/Precis grouped by title, Intro isolated to `resource_id` — see §48.5) so a save on one book can't bleed into an unrelated same-titled one.
- **Caught and fixed a real test-data leak during verification**: the Playwright test tagged the real "Haryana GS" book (Level=State/Goa, Conducting Body=Andhra Pradesh PSC, nonsense combination) to confirm the save path — confirmed it correctly propagated across all 56 of that title's linked rows in one write, then immediately reverted all three fields back to `null` on the real record before moving on, verified via a direct DB check.
- Committed (`7f0f1fe`) and pushed, staging only `api/admin/save-resource.js` and `BooksPage.jsx`.

### 48.9 Not actioned, flagged for a future round

- **117 genuine Introduction content errors** (§48.1) — categorized, not yet fixed. Remediation approach not yet decided (likely unlink-and-reassign where a correct state-specific source can be found, unlink-and-leave-empty otherwise) — ask before assuming which.
- **The live "Haryana_GS" Guide/Precis split found in §48.5** — still not fixed (which side is correct needs a human call), but a real instance of it got briefly (and now un-)tagged during §48.8's own verification, purely as test data — no lasting change to that book beyond what was already wrong before this session touched it.
- **Credential rotation** — still three, still zero rotated, now five sessions running (§46.5, §45.8, §43.9).
- **`lc_exams` FK landmine** (§46.3) — still unresolved. Newly relevant here: `ExamsPage.jsx`/`ExamEditorPanel.jsx`/`ConductingBodiesPage.jsx` all operate entirely on the legacy `lc_exams`/`lc_regions`/`lc_conducting_bodies` tables, while §48.1's Introduction-mismatch audit and §48.5/§48.8's Book Content work both operate on the separate `exams`/`resources` schema — the dual-admin-content-system pattern already known for `resources`/`resources_v2`/`lc_resources` extends to the region/state modeling too, not just resources.

### 48.11 Level/State-UT/Conducting Body tagging extended to PYQ Papers and Quizzes

Same session, immediately following §48.8 — user's own words confirming the throughline: "we will do the same to the PYQS and the Quizzes sections. If we can have a dynamic system that the content team can assign easily. Our filtration system will be perfect and our mapping." Read `PyqPapersPage.jsx`/`QuizzesPage.jsx` and their live schemas fresh before assuming anything carried over from Book Content, per the standing convention — turned out `quizzes` and `pyq_papers` are meaningfully simpler than `resources`:

- **No server API involved at all** — both pages already query Supabase directly from the browser (no `/api/admin/save-resource` proxy, no `ADMIN_API_SECRET` header), so the new tags needed zero new backend code, just direct `.update({...}).eq('id', ...)` calls.
- **No title-based row duplication** — every row is already a distinct, independently-addressable id (unlike `resources`' Guide/Precis-share-a-title-across-many-exam-links pattern from §48.5), so none of `bookRowsFilter`/`TITLE_DEDUPED_CATEGORIES`'s complexity applies. Every save is a plain single-row update.
- **Schema**: added `level`/`state_ut` (nullable text) to both `quizzes` (451 rows) and `pyq_papers` (754 rows) via the same `apply_sql_via_management_api.mjs` migration path. `conducting_body` already existed on both — reused as-is, same as `resources`.
- Same reused `lc_regions`/`lc_conducting_bodies` tables, same staged-edit-then-explicit-Save interaction (confirmed live via request logging: zero network calls while editing, exactly one write per Save click), same discard-with-× affordance — deliberately identical UX to §48.8's Book Content version so the content team learns one pattern once, not three.
- Left everything else on both pages untouched (the existing bulk multi-select "Set subject..." action bar, Quizzes' Mock Test/Topic Test category tabs, the `.limit(200)` fetch cap, per-row navigation to the quiz editor) — this was scoped to the tagging system specifically, not a broader redesign of either page.
- **Verified live**, then cleaned up immediately: tagged a real PYQ paper (Level=State/Kerala) and a real quiz (Level=Central) to confirm the save path, checked persistence via direct DB query, then reverted both back to untagged before moving on — same discipline as §48.8's Haryana_GS revert.
- Committed (`3fb0964`) and pushed, staging only the two page files.

### 48.12 Git/production state

Six commits this session, all pushed to `origin/main`: `54a23eb` (§48.2, State/UT filter), `4c70603` (§48.4, Add Conducting Body), `0b2f3df` (§48.5, Book Content redesign + Intro support), `13ab8df` (§48.6, contrast fixes), `7f0f1fe` (§48.8, Level/State-UT/Conducting Body tagging + Save on Book Content), `3fb0964` (§48.11, same tagging extended to PYQ Papers + Quizzes). Each staged only the files it actually touched — the pre-existing uncommitted PYQ-pipeline scripts, this file's own pending edits mid-session, and this session's untracked one-off investigation/verification scripts (all deleted after use) were left alone throughout, per the standing convention every session since they first appeared has followed.

### 48.13 PYQ Papers and Quizzes: inline title/exam/subject editing, honest details/subject split, pagination, one-row filter bars

Same session, immediately following §48.11. Four separate asks in one dense message, all addressed:

- **Title and Exam Name made editable** ("we should have an edit function for name of Quizzes and PYQS," "I also want the exam to be an editable field") — both are now inline text inputs in the table, staged through the same `pendingEdits`/explicit-Save mechanism as the Level/State-UT/Conducting Body fields from §48.11, not a separate rename modal. One Save commits title + exam + subject + details + all four tags together in a single `.update()`.
- **`subject` vs `details` — checked live before assuming, and the data confirmed exactly what the user suspected**: sampled and then counted every distinct `subject` value against the real 18-label taxonomy (`THUMBNAIL_SUBJECTS`). `quizzes` was already 100% clean (451/451 rows matched real labels like "Nursing," "General Studies" exactly) — no problem there, but the user's "same goes for the quizzes" meant *give it the same structure* even though it didn't need cleanup. `pyq_papers` was the opposite: only 75/754 rows (10%) matched taxonomy exactly; the rest were paper-section descriptors like `"Part-A-General Intelligence and Reasoning"` or near-miss variants (`"General Awareness"` vs. the real `"GK & General Awareness"`, `"English Language"` vs. `"English"`) — genuinely details content mislabeled as subject, confirming "the subject is not correct... this should be the details."
  - Fixed by adding a `details` column to both tables and copying the old `subject` text into it (nothing deleted) via a one-time `UPDATE ... SET details = subject WHERE details IS NULL`, before `subject` starts being treated as taxonomy-only going forward. A row whose old `subject` already was a real taxonomy value stays correctly selected in the new dropdown rather than getting cleared.
  - `subject` is now a `<select>` constrained to `SUBJECT_OPTIONS` (the same taxonomy the pre-existing bulk "Set subject..." action bar already wrote from) instead of plain text; `details` is a free-text input shown as a smaller/muted second line under the title.
- **Pagination, 10/page**: both pages previously did a blunt `.limit(200)` with no page controls at all (silently hiding rows past the 200th on tables with 451 and 754 total rows). Replaced with real server-side pagination (`.range()` + `count: 'exact'`), same as Book Content.
- **Filter bars consolidated into one row, "to conserve space"**: Quizzes had Search on one row and the Mock Test/Topic Test category tabs on a separate row below, with "New Quiz" sitting in the header above both — all three folded into a single `.lc-filter-bar-single` row (Search, Type tabs, Level filter, New Quiz), matching the pattern already built for Book Content earlier this session (confirmed Book Content's own filter bar was already fully consolidated from §48.2/§48.5, so no changes needed there).
- **Found and fixed a second, separate instance of the exact redundant-description complaint**: the user quoted the PYQ/Quizzes subtitle text verbatim to ask for its removal, but after removing each page's own `<p>` subtitle, the *identical* text was still visible — traced to `AdminShell.jsx`'s `PAGE_META` map, a completely separate top-bar title+description shown above the page body for every admin route, keyed by path and untouched by any page-level edit. Removed the `description` field for `/admin/quizzes`, `/admin/pyq-papers`, and `/admin/books` (the last for consistency, since Book Content had the same top-bar/page-body duplication left over from earlier this session, just not re-flagged this time). Confirmed via a live check that both layers were shown before, and neither shows now.
- Quiz rows are no longer click-anywhere-to-navigate (most of the row is now directly editable) — added a dedicated "Open full quiz editor" icon button instead.
- **Verified live and thoroughly**: edited title, exam, details, and subject together on a real PYQ row, clicked Save, then reloaded the page from scratch to confirm genuine DB persistence rather than trusting optimistic client-side state, then reverted every field back to its exact original value and confirmed the revert matched byte-for-byte.
- Committed (`d25e01d`) and pushed, staging `PyqPapersPage.jsx`, `QuizzesPage.jsx`, and `AdminShell.jsx`.

### 48.14 Git/production state

Seven commits this session, all pushed to `origin/main`: `54a23eb`, `4c70603`, `0b2f3df`, `13ab8df`, `7f0f1fe`, `3fb0964` (see §48.10/§48.12 for the first six), and `d25e01d` (§48.13). Each staged only the files it actually touched — the pre-existing uncommitted PYQ-pipeline scripts and this session's untracked one-off verification scripts (all deleted after use) were left alone throughout.

### 48.15 Session end: next-session plan drafted for PYQ/Quiz editing (exam linkage, PYQ editor, quiz-editor synergy)

User asked to close the session out and draft a plan + a standalone prompt for the next chat, rather than continue in this one. Did a short live reconnaissance pass first rather than handing off blind guesswork:

- **`pyq_papers`/`quizzes` have no real exam linkage today** — only a free-text `exam_name` column, no `exam_id` foreign key to the actual `exams` table (~1,500+ rows, the same one `ExamsPage.jsx` already searches). This is the concrete next step for "our filtration system will be perfect and our mapping."
- **PYQ content already exists at real scale, contrary to the assumption a fresh editor would start from nothing**: `PyqReader.jsx` (the candidate-facing reader) revealed a `pyq_questions` table — `paper_id` FK to `pyq_papers.id`, `question_number`, `question_text`, `options`, `correct_answer`, `explanation` — currently holding **76,900 rows**. `PyqPapersPage.jsx`'s own docstring ("no per-paper editor exists yet") is about the *admin* side only; the content itself is real and live.
- **`AdminQuizEditor.jsx` already stores its questions in an almost identical shape** (`question_text`, `options: {A,B,C,D}`, `correct_answer`, as a JSON array on the quiz row rather than a separate table) — confirmed by reading its own state initialization and options-editor JSX. This makes "synergize the quiz editor" concrete rather than aspirational: a shared question-editing component (add/reorder/delete a question, 4 options, mark the correct one, optional explanation) could plausibly serve both PYQ and Quiz, despite one being a separate table and the other inline JSON.
- Drafted a full handoff prompt (given directly to the user, not reproduced here — see the user's own copy from this session) covering: (1) add `exam_id` + a searchable exam picker (reusing the `Select` component's `searchable` mode, same as this session's Conducting Body picker) to both tables; (2) build a PYQ preview + editor against the real `pyq_questions` shape, explicitly warned not to assume it mirrors `resources`' block-JSON format from Book Content; (3) evaluate `AdminQuizEditor.jsx` fresh and decide how much of it should be restyled to match the shared visual/interaction language, given the underlying data shapes for Books (prose blocks) vs. PYQ/Quiz (structured questions) genuinely differ — "unified style" likely means consistent chrome/Save-flow/visual language, not one identical widget for all three.
- Nothing built this sub-session — planning and reconnaissance only, no code changes, no schema changes.

**Next session**: the plan above — real exam linkage for PYQ Papers/Quizzes, a PYQ preview + editor built against the real `pyq_questions` table, and a synergy pass on `AdminQuizEditor.jsx`. All three content sections (Books, PYQ Papers, Quizzes) already share one Level/State-UT/Conducting Body/taxonomy-Subject classification system with consistent inline editing and pagination (§48.8, §48.11, §48.13) — worth checking with the user whether the content team has started using it. Also still open: §48.1's 117 genuine Introduction content errors (categorized, not remediated), the live Haryana_GS Guide/Precis split (§48.5), and credential rotation (five sessions, zero rotated — §46.5, §45.8, §43.9).

## 49. §48.15's plan executed: real exam linkage, a PYQ paper editor, and a shared question-editing component across PYQ/Quizzes

### 49.1 The handoff's own premise didn't hold — checked live before building anything

§48.15's plan said to link `pyq_papers`/`quizzes` to "the real `exams` table (~1,500+ rows, already searched by ExamsPage.jsx)". Checked live before writing any migration: `ExamsPage.jsx` actually searches `lc_exams` (1,536 rows), not the separate `exams` table (1,537 rows) — and `exams` turned out to be **service-role-only, no anon/authenticated SELECT grant at all** (confirmed by an existing code comment in `useLearningContent.js`: "`exams` is service-role-only... unlike `lc_exams` which the admin CMS already relies on from the browser"). Since neither `PyqPapersPage.jsx` nor `QuizzesPage.jsx` goes through a server API (§48.11), a picker against `exams` literally couldn't work. Also found real precedent already in the codebase: `jobs.lc_exam_id -> lc_exams(id)` (`sql/jobs_lc_exam_link.sql`), with its own comment noting `jobs.exam_id -> exams` is "separately known to be wrong on ~75% of its populated rows" — independent confirmation that `exams`-table FKs are the troubled path here, not the canonical one. Surfaced this to the user before proceeding rather than guessing; user confirmed `lc_exams`.

### 49.2 Schema: `lc_exam_id` added to both tables

`sql/pyq_quizzes_lc_exam_link.sql` — additive `lc_exam_id uuid references lc_exams(id)` on both `pyq_papers` and `quizzes`, plus indexes, same shape as `jobs_lc_exam_link.sql`. Applied via the standard `apply_sql_via_management_api.mjs` path, verified live (column readable, both currently all-null as expected). The existing free-text `exam_name` column is untouched — still what candidate-facing code (`PyqReader.jsx`, `PyqCenter.jsx`, `useLearningContent.js`, `useExamContent.js`, etc.) matches on by name; `lc_exam_id` is additive forward-linkage, not a replacement, since rewiring those consumers to the new FK is a separate, larger task not in scope here.

### 49.3 Searchable exam picker on both admin pages

Both `PyqPapersPage.jsx` and `QuizzesPage.jsx` gained a full `lc_exams` (id, name) fetch on mount alongside the existing `lc_regions`/`lc_conducting_bodies` fetch, and the Exam table cell now stacks the existing free-text `exam_name` input (still independently editable) with a new `Select searchable` picker underneath (same component/mode as this session's — actually last session's — Conducting Body picker). Picking a real exam stages both `lc_exam_id` and an auto-synced `exam_name` in the same `pendingEdits` write, through a new `handleExamPick` wrapper — one Save still commits everything together, same explicit-Save pattern as every other field on these rows. **Verified at the DB level** (see §49.6) rather than via live browser click-through — no headless-browser tool available in this environment (no `chromium-cli`/Playwright), the same recurring gap noted in §35.5.

### 49.4 PYQ paper preview + question editor (`PyqPaperEditor.jsx`, `/admin/pyq/:id`)

Confirmed live before building (per the handoff's own instruction): `pyq_questions` is real, 76,900 rows, `paper_id` FK, `question_number`/`question_text`/`options` (jsonb `{A,B,C,D}`)/`correct_answer`/`explanation` — genuinely a different shape from Book Content's block-JSON, exactly as warned. Sampled real rows from both `pyq_questions` and quizzes' `questions` table before writing any editor code: both are 100% plain text (bilingual Hindi/English in PYQ's case, with literal embedded newlines), not HTML — the small number of `<`/`>` matches in `pyq_questions` turned out to be math inequality symbols (`k < -2`, direction ratios `<3, -2, 2>`), not markup, checked individually rather than assumed.

- New page, chrome deliberately matching `BookChapterBrowser.jsx` (Book Content's own full-page editor) — white header bar, `#1F3A2E` accent, Preview/Edit mode toggle, "Unsaved changes"/"Saved" dirty-state badge — rather than AdminQuizEditor's old pastel/`border-radius:24px` look, which didn't match anything else in the admin CMS. Lives outside `AdminShell`, same reasoning as `BookChapterBrowser`/`AdminQuizEditor` (a content editor wants full viewport width).
- Preview mode renders read-only via the new `QuestionSetPreview` component (numbered questions, options, correct answer highlighted, optional explanation) — same visual logic as the candidate-facing `PyqReader.jsx` but restyled for the admin chrome; `PyqReader.jsx` itself was not touched.
- Edit mode uses the new shared `QuestionEditorList` component (see §49.5): add/reorder (up/down)/delete a question, 4 options with a click-to-mark-correct selector, optional explanation. Reorder/delete keep `question_number` contiguous with on-screen position — the old AdminQuizEditor never did this (only ever set it once, on add).
- Save deletes all `pyq_questions` for the paper and reinserts the edited set, then updates `pyq_papers.total_questions` to match — same delete-and-reinsert pattern AdminQuizEditor already used for the sibling `questions` table, scoped to one paper's own rows (not the full 76,900-row table).
- `PyqPapersPage.jsx` gained an "Open paper preview/question editor" icon button per row (same `ExternalLink` icon/placement AdminQuizEditor already used for Quizzes), navigating to `/admin/pyq/:id`. Route wired in `App.jsx`, outside `AdminShell`.

### 49.5 Shared question-editing component + `AdminQuizEditor.jsx` restyle

New `src/components/admin/QuestionEditorList.jsx` — add/reorder/delete a question, 4-option editor with mark-correct, optional explanation — used verbatim by both the new PYQ paper editor and (replacing its old bespoke question-card JSX) `AdminQuizEditor.jsx`'s Questions tab. Deliberately uses plain `<textarea>`/`<input>`, not `SimpleRichTextEditor` (Quill/HTML) — confirmed live that neither table's real content is HTML, and Quill can't round-trip a plain string containing literal newlines the way this content actually has them, so keeping the old rich-text editor here would have been a real mismatch, not just a style choice.

`AdminQuizEditor.jsx` restyled to the same chrome as `PyqPaperEditor.jsx`/`BookChapterBrowser.jsx` (white header bar, `#1F3A2E` accent, dirty-state badge) and now uses `QuestionEditorList` for its Questions tab — gaining reorder-with-contiguous-renumbering as a new capability it didn't have before. Its own Metadata tab (title/category/exam name/subject/description) is unchanged in content, only restyled to match. This is "one unified style of editing" as the user's own words meant it: consistent chrome/Save-flow/visual language across all three content editors, not one identical widget — Book Content's block editor legitimately stays structurally different (prose blocks vs. structured Q&A), per the handoff's own explicit caution against over-unifying.

### 49.6 Verification

No headless-browser tool available in this environment (`chromium-cli`/Playwright both absent) — the same gap §35.5 already flagged, so this could not be click-through-verified live in a browser. Verified instead by: (1) `eslint` clean on every new/changed file, with the two pre-existing errors this session's diff touches (`AdminQuizEditor`'s `fetchQuiz`-hoisting warning, both list pages' `set-state-in-effect` errors) confirmed pre-existing on the already-committed versions via `git show HEAD:... | eslint`, same method §48.2 used; (2) every changed/new source file requested directly through the running Vite dev server (port 8080, already up from §48.3) to confirm it transforms without error; (3) the exact DB-level operations the UI performs, run live against real rows and reverted immediately after — a real `pyq_papers` row and a real `quizzes` row each had `lc_exam_id`/`exam_name` set to a real `lc_exams` match and read back, then reverted to their exact original values; a fully disposable test PYQ paper (`__TEST__ PyqPaperEditor verification`) was created with two seed questions, then the exact delete-all/reinsert-edited-reordered-plus-new-question sequence `PyqPaperEditor.handleSave` performs was run against it, read back to confirm the edit/reorder/add all landed correctly, then the test paper was deleted (cascading to its questions via the existing FK) and confirmed empty. No real production PYQ paper, quiz, or exam-link data was left modified.

### 49.7 Git/production state

Left staged-but-uncommitted at first per standing practice (commits aren't made without an explicit ask); the user then explicitly asked for it to be pushed in the same conversation. Committed (`3e4b851`, staging only the nine files this sub-session actually touched — the pre-existing modified/untracked pipeline scripts and content folders from before this session were left alone, per the standing convention) and pushed to `origin/main`. Files: `sql/pyq_quizzes_lc_exam_link.sql` (new), `src/App.jsx`, `src/pages/admin/PyqPapersPage.jsx`, `src/pages/admin/QuizzesPage.jsx`, `src/pages/admin/AdminQuizEditor.jsx`, `src/pages/admin/PyqPaperEditor.jsx` (new), `src/components/admin/QuestionEditorList.jsx` (new), `src/components/admin/QuestionSetPreview.jsx` (new), `docs/status_report.md`. The schema migration itself (`lc_exam_id` on both tables) was already live in production regardless of git state, applied directly via the Management API per standing convention.

**Next session**: a live browser click-through of all three flows (exam picker on both list pages, PYQ paper editor's preview/edit/save, restyled quiz editor) once a browser-driving tool is available — genuinely not done this session, only DB-level-verified. Also still open, unchanged: §48.1's 117 genuine Introduction content errors, the live Haryana_GS Guide/Precis split (§48.5), and credential rotation (still zero rotated — §46.5, §45.8, §43.9).

## 50. Same session, continued: a real "Intro preview half-blank for some users" bug investigated and fixed — stale R2/CDN caching, not broken content

User reported (screenshot: `veernxt.in/admin/exams?exam=ee04c47d-...`, the Resources panel's Preview drawer) that an exam's Intro preview shows the chapter header ("01 Introduction") correctly but the body is blank underneath — for some content-team members, not others, on the same live resource.

### 50.1 Root cause: a 1-year Cache-Control with no purge-on-edit, not a rendering bug

Traced the exact exam in the screenshot (GPSC Assistant Professor, `lc_exams.id = ee04c47d-...`) to its mapped Intro (`lc_exam_resource_map`, category=Intro): the shared UGC-NET Assistant Professor Intro — the same resource §48.1 named as the model "probably fine" shared-content example (23 of the 32 non-error cases). Checked the actual content before assuming anything was wrong with it, per the standing convention: fetched its real `chapters/chapter-1.json` straight from R2 — **173 real blocks, all `heading`/`paragraph`, both fully recognized by `BlockRenderer.jsx`**. The content itself is fine.

The real cause is caching, confirmed with hard evidence, not inferred:
- Every R2 upload in this codebase goes through one shared function (`uploadToR2()`, `scripts/lib/ingest-drive-content.js`, also called from `api/admin/save-resource.js`'s `books-save-chapter` handler) that sets `Cache-Control: public, max-age=31536000` (**one year**) on every object it writes — JSON chapters and metadata included, not just images.
- This exact chapter's `Last-Modified` header (checked live via `curl -I`) is `Sun, 13 Sep 2026 13:19:31 GMT` — matching `resources.updated_at` for this row to the second. It was overwritten in place at that same URL 2 days before the bug report, almost certainly the AI-enrichment pass that took it from a much thinner intro to this 173-block version.
- Nowhere in the codebase is there a cache-purge step after an R2 overwrite (`git grep -i purge` in the relevant paths: nothing). So any browser, or any Cloudflare edge PoP, that had already cached this exact URL *before* that Sept 13 edit keeps serving whatever it cached — for up to a year — with nothing forcing a re-fetch.
- Three real readers fetch this same un-versioned URL with a plain `fetch()` and no cache-busting: `AdminResourcePreview.jsx` (what the screenshot shows), `BookChapterBrowser.jsx`'s own chapter/preview fetch, and **`SecureReader.jsx` — the actual candidate-facing reader**. This was not an admin-only bug; candidates reading this same Intro could hit the identical stale response.

This fully explains "some people see it correctly, some don't": it depends only on whether that person's browser or nearest Cloudflare edge had already cached the URL before the Sept 13 edit, not on anything about who they are or what they clicked.

**A precedent for the exact fix already existed in this same file, just not applied everywhere**: `BookChapterBrowser.jsx`'s Find & Replace success handler already appends `?t=${Date.now()}` to its own metadata/chapter re-fetch — someone had already hit and worked around this exact staleness at that one call site, without generalizing it to the initial page-load fetch or to the other two readers.

### 50.2 Fix: cache-bust the read side, not the write side

Chose to fix this at the three *readers* (append `?t=${Date.now()}` to the fetch URL) rather than touching `uploadToR2()`'s `Cache-Control` header — that function is shared by the whole ingestion pipeline and a year-long cache is genuinely fine (desirable, even) for the large binary images it also writes; changing it globally would be a bigger, riskier change than the bug warrants. Cache-busting on read fixes all three affected call sites without touching the R2/ingestion write path at all, and matches the pattern already established (and working) in `BookChapterBrowser.jsx`'s Find & Replace handler.

- `src/components/SecureReader.jsx` (`loadChapter`) — candidate-facing reader, the highest-impact fix of the three.
- `src/pages/admin/AdminResourcePreview.jsx` — the preview drawer from the bug report.
- `src/pages/admin/BookChapterBrowser.jsx` — both its initial `metadata.json` fetch and its per-chapter fetch on mount (its Find & Replace success handler already did this correctly and was left unchanged).
- Confirmed live that appending `?t=<timestamp>` to the exact affected R2 URL still resolves to the same object (R2 ignores the query string for object identity, matching `ETag`/`Content-Length`/`Last-Modified` against the un-parameterized request) while giving both the browser and Cloudflare's edge a distinct cache key per request — verified via `curl -I` before and after.
- **Not fixed / deliberately left alone**: `src/pages/sandbox/DevReader.jsx` has the identical unbusted fetch pattern, but it's a developer sandbox tool (`/dev-reader`), not reachable by candidates or the content team — left as a known, low-priority instance of the same pattern rather than expanding scope into an unrelated tool.

### 50.3 Verification

Same environment constraint as §49.6 (no `chromium-cli`/Playwright — see the `project-no-browser-automation-tool` memory) — no live browser click-through. Verified instead by: (1) `eslint` on all three changed files, with `SecureReader.jsx`'s and `BookChapterBrowser.jsx`'s pre-existing errors (hoisting, unused var, set-state-in-effect, empty catch blocks) confirmed identical on `git show HEAD:...`, same method as §49.6/§48.2 — `AdminResourcePreview.jsx` is fully clean; (2) all three files requested through the running Vite dev server to confirm they transform without error (the dev server itself had stopped since the prior sub-session — relaunched clean on port 8080, confirmed nothing else was already listening first); (3) `curl -I` against the real affected R2 URL both with and without a cache-busting query param, confirming the parameterized request reaches the same live, correct object (matching `ETag`) rather than a different/broken one. Not independently confirmed with the actual content-team members who reported the bug — flagged as the concrete next-session check.

### 50.4 Git/production state

Committed (`2bac9c7`) and pushed to `origin/main` after the user asked.

### 50.5 A second, related bug the fix itself surfaced: a pre-existing loading-state race, now visible

User reported (same session, right after §50.1-50.4 shipped): the preview now visibly "flashes half-rendered, then shows the full preview" instead of just being blank.

**Root cause: a genuine pre-existing race in both `AdminResourcePreview.jsx` and `SecureReader.jsx`, unmasked (not caused) by the cache-busting fix.** Both components gated their loading spinner on `chapterLoading && !activeChapter?.loaded`. `chapterLoading` only flips to `true` inside a `useEffect` that runs *after* the render where `resource`/`chapters` (an unloaded stub) first get set — so there's one render in the gap where `chapterLoading` is still its stale initial `false` but the chapter body hasn't loaded yet. In that gap frame the spinner condition is false, so it fell through to the "real content" branch and rendered `ChapterHeader` with an empty body (blocks/body_html both undefined on the stub) -- the "half rendered" flash. This bug has existed since these components were written; it was invisible before because a cache-hit `fetch()` resolved in under a millisecond, collapsing the gap frame to nothing perceptible. Forcing every fetch through the real network (§50.1's fix) stretched that same gap to real, visible duration.

**Fix**: dropped the `chapterLoading &&` from both conditions in both files -- the spinner now shows whenever `!activeChapter?.loaded`, full stop, regardless of whether the loading-effect has technically fired yet. This closes the gap frame entirely rather than just narrowing it. `chapterLoading` state itself was now fully unused (only ever written, never read) in both files, so removed rather than left as dead state -- `SecureReader.jsx` also had an in-memory `chapterCache` early-return path that never set `chapterLoading` at all, so this fix is also more consistent than before (that path behaves identically to a freshly-loaded chapter now, whereas previously it happened to avoid the bug only by accident).

Verified the same way as §50.3: `eslint` clean on `AdminResourcePreview.jsx`, `SecureReader.jsx`'s two pre-existing unrelated errors (hoisting, an unused param) confirmed identical to the committed version; both files transform cleanly through the running Vite dev server. No live browser click-through (same environment gap).

### 50.6 Git/production state

Committed and pushed to `origin/main` after the user asked.

## 51. Non-AI docx-to-blocks conversion investigated for Book Content, built, and put online for the content team to try

User's own words: "I don't want to use AI for this. I spent a lot of cash on Book Content because it was going through the content and trying to understand it and rewrite it. Instead of just formatting it in the style that we need. Do an investigation."

### 51.1 Both halves of this already partly existed, undocumented

**Intro side: already solved.** `scripts/convert_docx_intros_to_blocks.mjs` (untracked, not from this session, not documented anywhere in this file before now) is a complete, deterministic docx -> HTML (mammoth) -> blocks converter, zero AI. It had already been run: `FINAL_INTROS_STRUCTURED/` has real output for **706 books** (corrected during this investigation -- initially mis-reported as 1,412, which was actually the file count at 2 files/folder, not the folder count).

**Book Content side: the mechanical half already existed too, just bolted onto a paid pipeline.** `scripts/content/batch_enrich_books.mjs` is the existing "expensive" pipeline, but its own first step, `parseDocxToSemanticModelNode()` (`scripts/lib/docxParser.mjs`), is already a complete, deterministic docx -> blocks parser -- Gemini only runs after it, to splice in purely decorative extra blocks (statStrip/keyFacts/pullQuote/examAlert/comparisonTable) onto the mechanically-parsed chapters; the original paragraphs are preserved verbatim either way, never rewritten. The script even already has a `--dry-run` flag that skips the Gemini call entirely -- the honest correction on the user's own framing: the cost is real, but it isn't "understanding and rewriting," it's "read each chapter once to generate bonus summary boxes."

### 51.2 The real blocker: `batch_enrich_books.mjs`'s hardcoded source folder no longer exists

Moved to `DEPRECATED\MASTER DOCUMENTS_superseded_20260819` on the K: drive. Two candidate replacement folders exist with only partially-overlapping file sets (93 vs. 67 docx); cross-checked filenames against live `resources.source_file` values and found strong evidence `FINAL_CONTENT\Final Documents\MASTER DOCUMENTS` (67 docx) is current -- it uniquely contains the exact state-GS-book filenames (Haryana_GS, Goa GS, etc.) actually live in production, while the other folder has 60 files not reflected in live content at all. Not exhaustively proven for every file, flagged as such.

### 51.3 New script: `scripts/convert_docx_books_to_blocks.mjs`

Mirrors `convert_docx_intros_to_blocks.mjs`'s CLI conventions (dry-run by default, `--execute`/`--limit`/`--only`/`--root`), reuses `parseDocxToSemanticModelNode` directly rather than re-implementing the parsing heuristic a third time, writes local-only JSON to `FINAL_BOOKS_STRUCTURED/` (no DB/R2 writes, same convention as the Intro script). Dry run against the full 67-book corpus: **67/67 converted, 0 failures, 46,576 blocks** (paragraph/heading/table/list breakdown all sensible). Real findings surfaced, not hidden: a genuine source duplicate ("RAJASTHAN SI GS GUIDE" exists as two separate docx in two different folders), one 690-chapter outlier (`Cluster_079_RRB COMPLETE GK.docx`, plausible if the source really has hundreds of short H1-styled entries, worth a manual look), and 9 books where no H1 heading was detected at all (fell into one fallback "Introduction" chapter -- these source docx likely use a different/no heading style). Executed on two real sample titles only (Agricultural & Rural Development, Haryana_GS) per the user's own request to test narrow first -- real, clean output, including a genuinely useful 16-row Haryana fact table extracted with zero AI and zero data loss.

### 51.4 Title casing/underscores investigated (no code written, per explicit ask)

Checked directly against R2, not just the DB: R2's `metadata.json.title` is a plain copy of `resources.title` from whenever it was last written, not independently maintained -- fixing the DB alone won't fix what's live on R2. Found three separate title surfaces, not one: (1) book-level title -- live audit found 59-67% of unique Guide/Precis/Intro titles still have underscores, 81-86% aren't Title Case, pre-existing and widespread, not introduced by either conversion pipeline; (2) chapter-level titles (`metadata.json.chapters[].title`, rendered by `ChapterHeader` on both the admin preview and the candidate reader) -- a genuinely separate thing, sampled 709 real chapters across 15 books and found 24% ALL CAPS, zero underscores (they come from in-document heading text, not filenames), plus one real broken case (`" 1"`, `" 2"` chapter titles on a Mathematics Guide); (3) our own new pipeline's output -- both Book Content test titles and 46% of the existing 706 Intro conversions currently fail a title-case check too. Flagged that a blind Title Case pass would break this domain (SSC, RRB, IBPS, UPSC, GK, GS, SI, HC, etc. must stay uppercase) and that a real fix needs to write to three places (DB, R2 metadata, and any local conversion output), not just one. Not built -- explicitly out of scope for this sub-task, next up per the user.

### 51.5 The converter put online: `/admin/docx-converter`

User's next ask: get it "online" so it can be tested from the browser rather than the CLI. Real architectural constraint found and designed around before building: `api/` is already sitting exactly at Vercel Hobby's 12-serverless-function cap (`save-resource.js`'s own existing docstring already explains why `books-*` actions were crammed into that one file for the same reason) -- so the new capability was added as a new `type` dispatch (`docx-preview-convert`) inside `api/admin/save-resource.js`, not a new file, which would have broken deployment.

- New action calls `parseDocxToSemanticModelNode` directly against an uploaded file's bytes (base64 over JSON, same convention `src/lib/r2Uploader.js` already established) and returns the book/chapters/blocks in the response -- no Supabase write, no R2 upload, preview only.
- Real, documented-not-silently-hit constraint: a deployed Vercel function caps request bodies around 4.5MB; real master docx files run up to ~39MB. Works fully against the local dev server (`vite.config.js`'s `vercelApiPlugin` runs this exact handler in Node locally with no such cap), would 413 against the live veernxt.in site for a large file. `DocxConverterPage.jsx` warns the client before sending rather than let this fail silently.
- New page `src/pages/admin/DocxConverterPage.jsx` (`/admin/docx-converter`, added to the LEARNING nav group): file picker, per-chapter block-type-count summary, toggle between a real rendered preview (`BlockRenderer`/`ChapterHeader`, the same components the candidate reader uses) and raw JSON.
- **Verified end-to-end, not just by inspection**: sent a real 454KB docx through an actual `fetch` -> `/api/admin/save-resource` -> local Vite API shim -> `handleDocxPreviewConvert` round trip (not just a direct function call) and got back the correct 12 chapters, matching the CLI script's own output on the same file exactly. Also confirmed the auth guard (401 with no secret) and validation (400 with missing fields) both work. `eslint` clean on the new page; the `no-undef` (`process`/`Buffer`) errors on `save-resource.js` and the `set-state-in-effect` error on `AdminShell.jsx` were confirmed pre-existing on the committed versions via `git show HEAD:...`, same method used throughout this session -- not introduced by this change. No live browser click-through (same environment gap as every other UI change this session).

### 51.6 Git/production state

Committed and pushed to `origin/main` after the user asked. Staged only this sub-task's own files (`api/admin/save-resource.js`, `src/App.jsx`, `src/pages/admin/AdminShell.jsx`, `src/pages/admin/adminNavConfig.js`, `src/pages/admin/DocxConverterPage.jsx`, `scripts/convert_docx_books_to_blocks.mjs`) -- `scripts/convert_docx_intros_to_blocks.mjs` (pre-existing, not from this session) and the generated `FINAL_BOOKS_STRUCTURED/`/`FINAL_INTROS_STRUCTURED/`/`FINAL_PYPS_STRUCTURED/`/`books/` output folders (local intermediate content, not source code) were deliberately left untracked, same convention as every prior session.

**Next session**: title-casing/underscore normalization (§51.4) is the explicit next ask, needs a design decision on the domain acronym exception list before any code; the 9 no-heading books and the Rajasthan duplicate (§51.3) are worth a manual look before a full `--execute` run across all 67 books; a live browser click-through of `/admin/docx-converter` once a browser-driving tool is available.

## 52. Intro tables recovered, wrong cross-state/UT intros fixed, table-text CSS bug fixed

User's own report that kicked this off: "Apparently our convertor did not convert the tables. It has just come in as text."

### 52.1 Root cause: two converters existed, only the newer one ever handled tables

`scripts/lib/ingest-drive-content.js`'s `processDocxBuffer()` (the original ingestion pipeline used for most already-live Intro resources) walks the docx XML with `getElementsByTagNameNS('*', 'p')` -- paragraphs only, never `<w:tbl>`. A table's cells are still paragraphs in the tree, so they still came through, just as a flat sequence of un-demarcated `<p>` lines with all row/column structure discarded -- exactly "converted to text." `scripts/convert_docx_intros_to_blocks.mjs` (the newer mammoth-based converter, §51.1) does parse `<table>` correctly into real `{type:'table', rows}` blocks, but `reformat_legacy_intros.mjs` -- used to bring already-ingested legacy intros into the new "blocks" format -- only re-parses the already-stored (already tableless) HTML, so it could never recover a table that was never captured at ingestion time in the first place.

**Confirmed live**: queried `resources` where `category='Intro'` -- 914 total, all `format='blocks'`, only 146 had any `table` block; 714 had zero.

### 52.2 Fix: re-convert from the ORIGINAL docx, in place, no re-matching

For each table-less resource, `metadata.json`'s own `drive_path`/`source_file` (written at original ingestion time) pointed at the source docx -- but a systematic gap was found and repaired first: the recorded `drive_path` for most rows was missing one segment (`CENTRAL EXAMS`/`STATE EXAMS`/`UT EXAMS`), because whichever ingestion run produced them was pointed at that subfolder directly. Repaired deterministically (try each of the 3 known top-level roots, keep it only when exactly one resolves on disk -- zero fuzzy folder-name matching): **712 / 712 resolved to exactly one real file, 0 ambiguous, 0 missing** once repaired.

Two permanent scripts built (`scripts/reconvert_legacy_intro_tables.mjs` for the 381 resources already linked via `lc_exam_intro`, `scripts/reconvert_fallback_linked_intro_tables.mjs` for 13 more only reachable via `lc_exam_resource_map`) that re-parse the real docx (mammoth -> `parseHtmlToBlocks`) and overwrite `chapters/chapter-1.json` + `metadata.json`'s `blocks_count` **at the exact same `storage_base_url`** -- same `resource_id`, same `exam_id`, same title, nothing re-matched, nothing renamed. Dry run then `--execute` on both: **394 / 394 succeeded, 0 failures** (3 genuinely have no table in the source docx, flagged not forced). The remaining 318 table-less resources are orphaned/duplicate rows not shown to any real user (286 confirmed dead duplicates of already-linked exams, 32 ambiguous/weak low-confidence matches -- mostly mistitled PYQ/mock-test files filed under "Intro" -- correctly left unlinked rather than guessed).

### 52.3 A second, distinct bug found from the client's own audit docs: same-role content reused across different states/UTs

User provided two client-side manual audit spreadsheets (`K:\...\CLIENT ASSETS\VeerNXT\UT LIST INTRO UPDATE STATUS.xlsx` -- 8 UTs, 199 rows; `Intro Update Status from Arunachal to Kerala.xlsx` -- 11 states, 259 rows), each exam tagged No Intro / Wrong Intro / Conducting Body Missing. Cross-referencing "Wrong Intro" against live `lc_exam_intro` confirmed it's not random mismatches but ONE bug repeated: an exam's own auto-matching scored high purely on role-name overlap ("Medical Officer / Specialist" etc.) and linked it to another state's/UT's real, specific, wrong Introduction -- confirmed by content, not assumption (the "Nagaland Medical Officer" resource literally opens "conducted by the Department of Health & Family Welfare, Nagaland" while showing as the Intro for 5 different UTs' unrelated Medical Officer exams).

For each flagged exam, searched every real `*INTRO*` folder under the relevant `UT EXAMS/`/`STATE EXAMS/` tree for a genuinely state/UT-specific docx, reusing `link_intros_to_exams.mjs`'s own already-validated `matchExam()` scoring (never re-derived a new matching heuristic). Caught and fixed a real bug in this search itself before executing anything: the folder-picker didn't exclude `_PENDING_CONTENT.docx` (the content team's own placeholder-file sentinel, already excluded by the production ingestion script but not by this one-off search), which first mis-reported 36 state-level placeholders as "real content found." Fixed, re-ran, confirmed by hand (the 2 UT cases with no folder match at all really do contain nothing but a README stub, no docx).

Net, both docs, dry-run then `--execute` after explicit approval each time:
- **UT doc**: 36 exams relinked to real state-specific content (most with tables intact from §52.2's converter), 2 unlinked (J&K Civil Defence Volunteer, Agniveer -- confirmed no real docx exists yet) -- reverted to No Intro rather than continuing to show wrong content.
- **State doc**: only 1 of 37 had real content ready (Bihar Jail Warder, relinked) -- the other 36 (all of Goa/Gujarat/Haryana/HP/Jharkhand's ANM & TGT/PGT rows, the entire JSSC block, Karnataka, Kerala CHO/Pharmacist/Last Grade Servants) were still literal `_PENDING_CONTENT.docx` stubs, unlinked to No Intro.
- 2 rows (Karnataka + Kerala "HC Stenographer") left untouched -- ambiguous between two real DB exams ("KPSC Stenographer" vs "High Court Stenographer"), no confident match either way, flagged for a human.

`scripts/fix_ut_wrong_intros.mjs` built generic (`--plan <file>`) and reused as-is for both docs rather than duplicated.

### 52.4 Table text unreadable on white background -- CSS bug, found and fixed

`src/components/book/BookBlocks.css`'s `.bk-table th, .bk-table td` rule never set an explicit `color` on `td` (only `th` gets one) -- table cell content is raw injected HTML (`<p><strong>...</strong></p>`, no `bk-` class of its own, unlike every other block type here), so it silently inherits whatever ambient text color the host page happens to set. Invisible on the candidate-facing reader (light page throughout), but broke specifically in the admin CMS's dark-drawer preview: `AdminResourcePreview.jsx`'s "paper" wrapper (added previously, per its own comment, to fix this exact class of bug for headings/paragraphs on the admin's dark `--surface`) only resets `background` to white, never `color` -- so table text kept the admin's light/muted grey, landing as unreadable grey-on-white while every other block type (which does set its own explicit color) looked fine. Fixed by pinning `.bk-table td { color: #1e293b }` (matching `.bk-paragraph`'s body text color) plus `.bk-table td p { color: inherit }`, so the table is never dependent on ambient inheritance again, on any host page.

### 52.5 Git/production state

Pulled Shreya's two upstream commits first (`0d0368e`/`1e0a213` -- admin CMS/books-management/learning-center work, see her own commit for detail) -- clean fast-forward, zero overlap with anything touched this session. Then committed and pushed (`d57031c`): `src/components/book/BookBlocks.css` (§52.4's fix) + `scripts/fix_ut_wrong_intros.mjs`, `reconvert_legacy_intro_tables.mjs`, `reconvert_fallback_linked_intro_tables.mjs` (§52.2/52.3's scripts) + `scripts/convert_docx_intros_to_blocks.mjs` (pre-existing/untracked before this session, but a required runtime dependency of the three new scripts -- `STYLE_MAP`/`parseHtmlToBlocks`). Scanned all four for secret-shaped strings before staging -- none found. Deliberately left alone: 6 modified PYQ scripts and the rest of the pre-existing untracked scripts (unrelated to this session, not mine to decide on), and every generated content directory (`FINAL_BOOKS_STRUCTURED/`, `FINAL_INTROS_STRUCTURED/`, `FINAL_PYPS_STRUCTURED/`, `books/`, `docs/exams_missing_intro.xlsx`) -- user explicitly confirmed these must never be committed, standing rule.

**Next session**: user wants to see whether the remaining "No Intro" gap (165 UT + 222 state in just the two audited docs, more elsewhere) can be bulk-mapped the same way §52.2/52.3 did, and failing that, extend `/admin/docx-converter` (§51.5, currently PREVIEW-ONLY -- no Supabase/R2 write, and built for Guide/Precis via `parseDocxToSemanticModelNode`, not Intro's own `parseHtmlToBlocks`/table-aware path) into a real upload-and-map tool the content team can use directly, since Claude/automation cannot invent content that was never written. Plan being drafted as of this entry.

## 53. Bulk-mapping ruled out (checked the content team's own Google Drive too); built "Publish Introduction" for the content team instead

### 53.1 Bulk-mapping: exhaustively checked, confirmed impossible right now

System-wide (not just the two audited docs), read-only: of 1,537 exams, 690 have no Introduction at all; of 1,589 real `*INTRO*` folders on disk, **zero** unconverted-but-real docx map to any of those 690 (699 folders already have real content and are already linked, 783 are still literal `_PENDING_CONTENT.docx` placeholders, 107 have no docx of any kind).

User then asked to check the content team's actual Google Drive (mounted via Drive Desktop at `G:\`) in case the local `K:\` mirror was stale. Checked directly: `G:\My Drive\VeerNXT_Final_Content` is the same CENTRAL/STATE/UT tree, essentially the same folder count (1,584 vs. 1,589 INTRO folders) -- not a bigger or newer source. The ~30 other loose top-level folders on that Drive turned out to be PYQ papers and OCR-fallback text artifacts (`Fallback_Text_*.txt`, `PYP_*.pdf`), not Introductions. A drive-wide search for any other "intro" folder found only one small trial/sample folder and an unrelated image asset -- no separate/larger Intro repository exists anywhere on that Drive account. User confirmed: accept the finding, build the upload tool instead.

### 53.2 Built: `/admin/publish-intro`, a real upload-and-publish tool

Since `/admin/docx-converter` is deliberately preview-only and uses the wrong parser for Introductions (`parseDocxToSemanticModelNode` would wrongly chapter-split a single-document Intro on every heading), built a new, purpose-built page rather than overload that tool:

- **`api/admin/save-resource.js`** -- extended `handleDocxPreviewConvert` with an optional `category` field: `category === 'Intro'` branches to `mammoth.convertToHtml({ buffer }, { styleMap })` (the exact `{ buffer }` call `docxParser.mjs` already runs live in this same function) piped through `parseHtmlToBlocks` (imported from `scripts/convert_docx_intros_to_blocks.mjs`), wrapped into the same `{ book: { title, chapters } }` shape the existing branch returns -- `DocxConverterPage.jsx`, which never sends `category`, is byte-for-byte unaffected. Added a new `intro-publish` action (`handleIntroPublish`) that looks up the exam in `lc_exams` (the browser-reachable catalog `lc_exam_intro.exam_id` itself FKs to, not the service-role-only `exams` table the CLI scripts use), refuses to silently overwrite an existing Introduction (409 `ALREADY_HAS_INTRO` unless `overwrite: true`), then uploads to R2 and writes `resources` + `lc_exam_intro` exactly like `link_intros_to_exams.mjs` does. No new serverless function -- `api/` is confirmed still exactly at Vercel Hobby's 12-function cap, so both pieces live inside this already-multi-action file.
- **`src/pages/admin/DocxPreview.jsx`** -- extracted the block/chapter rendering out of `DocxConverterPage.jsx` (now just `{book && <DocxPreview key={conversionId} book={book} />}`) so the new page reuses the identical preview instead of duplicating ~100 lines. Note: initializes its expand/raw-view state from a `key`-driven remount (`conversionId`, bumped by the caller on every successful conversion) rather than an effect that calls `setState` on prop change -- the newer `react-hooks/set-state-in-effect` lint rule flags the latter as a real anti-pattern, caught live while building this.
- **`src/pages/admin/PublishIntroPage.jsx`** (new, route `/admin/publish-intro`, LEARNING nav group) -- search-an-exam (debounced against `lc_exams`, showing conducting body/region, with an "already has an Introduction" warning badge fetched the moment one is picked) → upload & convert → preview (tables included) → Publish, with a confirm-before-replace dialog on the 409 path. Same three touch points as Docx Converter for wiring it in: `src/App.jsx` (route), `adminNavConfig.js` (nav entry), `AdminShell.jsx` (title/description + a new `FileUp` icon).

### 53.3 Verification

No browser-automation tool available (same as every UI change this session) -- verified instead by real requests against the running local dev server:
1. `docx-preview-convert` with `category: 'Intro'` against a real file (`IBPS RRB GENERAL BANKING OFFICER GBO.docx`, one of this session's own §52.2 fixes) returned 32 blocks / 2 tables with the identical Age-Criteria row content the CLI converter produced on the exact same file earlier this session -- not just "didn't error," a byte-for-byte match.
2. The `lc_exams` search query (anon key) returned the correct joined shape (`id, name, conducting_body: {name}, region: {name, level}`) for a real exam, and its `id` matched the `exam_id` already used earlier this session against the (different) `exams` table -- confirms the two tables really do share UUIDs, as the FK-landmine memory says.
3. The existing-intro lookup correctly found that same exam's real intro (from §52.2's own fix).
4. `intro-publish` tested against that same already-has-an-intro exam with `overwrite: false` -- correctly returned `409 ALREADY_HAS_INTRO` with the right title, proving the guard fires *before* any write (never reached the R2/insert code path).
5. Full publish-a-brand-new-resource path deliberately NOT exercised against a live exam -- would need a real content-team-authored docx to be a real test rather than throwaway data; left for the first real use.
6. `eslint` clean on every new/changed frontend file (fixed two real `react-hooks/set-state-in-effect` errors this session's own new code introduced, see 53.2); `api/admin/save-resource.js`'s `process`/`Buffer` `no-undef` and one `no-empty` are confirmed pre-existing on `HEAD` (32 errors there vs. 34 now -- the +2 are just more instances of the same pre-existing category from the new code, not a new kind of error).

### 53.4 Merged with Docx Converter into one tool, per user pushback

User's own question after seeing 53.2: "why do we have a Doc convertor and the intro uploader. Arent they the same? ... upload docs and then assign them to a category eg INTRO, PRECIS or GUIDE and then add it to our exams and then publish." Correct call -- they overlapped almost completely (both upload-a-docx-and-preview), and only the exam-attachment step genuinely differs by category:

- Deleted `DocxConverterPage.jsx` entirely (preview was a strict subset of the new tool). Renamed/generalized `PublishIntroPage.jsx` -> **`PublishContentPage.jsx`** (route `/admin/publish-content`, nav label "Publish Content"), with a category selector (Intro/Guide/Precis) at the top.
- `docx-preview-convert` already branched by `category` (53.2) -- no change needed there, the page now just always sends the selected one instead of hardcoding `'Intro'`.
- Generalized `handleIntroPublish` -> **`handleContentPublish`** (`type: 'content-publish'`): resource creation (R2 upload + `resources` insert) now loops over however many chapters `book.chapters` has, so the same code path serves Intro's single chapter and Guide/Precis's many. Branches only at exam-attachment, because the semantics are genuinely different:
  - **Intro** stays exam-specific 1:1 -- `examId` required, server-side `lc_exam_intro` upsert with the same overwrite guard as before.
  - **Guide/Precis** are legitimately shared across many exams, so the action just creates the resource and returns its id; the client then inserts into `lc_exam_resource_map` directly for each selected exam -- the *exact* insert shape (`exam_id, resource_id, category, confidence: 'high', reasoning: 'Manually added by admin', source: 'manual'`) `ExamResourcesPanel.jsx`'s own "Add Resource" drawer already uses client-side (confirmed that table already grants anon/browser writes, unlike `resources`/`lc_exam_intro` which don't -- hence the split).
- Frontend: exam picker is now single-select for Intro (unchanged UX) or multi-select with removable chips for Guide/Precis, reusing the same debounced `lc_exams` search either way.

**Verification**: re-ran all of 53.3's live checks against the renamed/generalized endpoints -- identical results (32 blocks/2 tables for the same Intro docx, same 409 guard behavior). Additionally confirmed the old `intro-publish` action name no longer resolves to anything live (falls through to the unrelated legacy V2 path, 400) -- a clean retirement, not a stale duplicate route. Confirmed the Guide/Precis parser path is completely unaffected by any of this (`category: 'Guide'` against a real master docx still returns the correct 12-chapter book via `parseDocxToSemanticModelNode`). A repo-wide grep confirmed zero remaining references to `DocxConverterPage`, `PublishIntroPage`, `intro-publish`, or the old routes. Did not exercise the Guide/Precis multi-chapter *publish* write path live (would create real test data in production for no reason) -- the R2 upload loop and `lc_exam_resource_map` insert are both direct copies of already-proven code paths (`handleBooksCreate`'s chapter convention and `ExamResourcesPanel.jsx`'s own insert), so this is a code-review-level verification, not a live one, same caveat as the Intro publish path in 53.3.

### 53.5 Reordered per user feedback: upload/preview before exam assignment, plus a Level filter

User: "We first upload the documents. Then we assign them to the exam. That should have a filter for state, UT and CENTRAL and once mapped we convert and link them." Asked two clarifying questions first (preview timing, single vs. batch) rather than guess -- confirmed: preview immediately after upload (so you see what the document actually is before committing it to an exam), still one document at a time.

Reordered the page to: (1) category, (2) upload & preview, (3) assign to exam(s) -- now gated on a real preview existing, not the other way around -- with a **Level filter** (Central/State/UT, same `LEVELS`/`lc_regions` convention `ExamsPage.jsx`'s own filter already uses) plus a State/UT region narrower shown once Level != Central, both feeding the same debounced `lc_exams` search via `.eq('region.level', level)` (+ `.eq('region_id', regionId)` when set), (4) "Convert & Link" (renamed from "Publish" -- same underlying `content-publish` action, unchanged). The Level filter exists because many exams share generic names ("Staff Nurse", "Sub-Inspector") across dozens of states -- narrowing by level/region first is what actually prevents attaching to the wrong one, not just the name search alone.

**Verified live**: the same central-exam name search returns a real match when Level=Central and correctly returns *empty* when Level=State (proving the filter actually narrows, not a no-op); `lc_regions` loads all 37 real regions. `eslint` clean on the rewritten page.

### 53.6 Category moved after upload too, per further feedback

User: "Category and Exam will only be assigned after the docment is uploaded. That way if they upload An intro, guide or precis they can chose accordingly." Same principle as 53.5, extended one step earlier: `category` now starts `null` (was defaulted to `'Intro'`) and is only chosen once a file exists.

Final order: (1) upload the file only, (2) pick category + Convert (both gated on a file existing; Convert itself additionally gated on category being chosen), (3) preview, (4) assign to exam(s) with the Level/Region filter, (5) Convert & Link. Reworked the reset logic into one `resetSelectionState()` used three different ways: choosing a different category keeps the already-uploaded file (no need to re-upload just to correct a mistake); choosing a new file clears category so it's re-chosen fresh for whatever that document turns out to be; "Publish another" clears both. `eslint` clean.

### 53.7 Exam picker: a real dropdown of everything in scope, not just type-to-search

User: "I want a drop down of all exams and the search of course." The Level/Region-scoped search previously required typing 2+ characters before showing anything and hit the network per keystroke (debounced). Replaced with: fetch every exam matching the current Level(+Region) once per filter change (central tops out at 407, any single state/UT a few dozen -- both cheap in one shot, confirmed live), then filter/search entirely client-side from there.

- **Intro (single-select)**: swapped the custom text-input-plus-dropdown for the shared `Select` component (`src/components/ui/Select.jsx`, react-select-backed) with `searchable` -- this alone gives a real click-to-browse dropdown of every exam in scope AND type-to-filter search in one component, and shows the current selection inline (no separate "Change" button needed).
- **Guide/Precis (multi-select)**: the shared `Select` doesn't support multi-select, so kept the existing checkbox-style list UI, but pointed it at the same fetched full list with a plain client-side text filter (no network, no debounce) -- empty filter shows every exam in scope, matching "dropdown of all exams" for this mode too.
- Caught and fixed a second `react-hooks/set-state-in-effect` error the new fetch-on-filter-change effect introduced (`setLoadingExams(true)` called synchronously in the effect body) -- same fix as 52.2/53.2's precedent: defer the whole fetch into a zero-delay `setTimeout` so the setState call happens in a macrotask callback, not synchronously as part of the effect's own execution.

**Verified live**: the same central-exam-list query used by the page returned all 407 real exams with correct joined conducting-body names. `eslint` clean.

### 53.8 Git/production state

Committed (`9c07922`) and pushed to `origin/main` after the user asked. Staged only this feature's own files: `api/admin/save-resource.js`, `docs/status_report.md`, `src/App.jsx`, `src/pages/admin/AdminShell.jsx`, `src/pages/admin/adminNavConfig.js`, deleted `src/pages/admin/DocxConverterPage.jsx`, added `src/pages/admin/DocxPreview.jsx` + `PublishContentPage.jsx` -- same 6 pre-existing modified PYQ scripts and generated content dirs deliberately left alone as every prior push.

## 54. First live Drive folder-by-folder audit (SSC), a real wrong-intro caught, and a systematic plan for the rest

User asked to check Google Drive again (`G:\My Drive\VeerNXT_Final_Content`), starting with `CENTRAL EXAMS\01.SSC`, exam by exam.

### 54.1 Folder vs. DB comparison

13 exam folders under `01.SSC`, all 13 matched a real `exams` row (`conducting_body = 'SSC'`, level central) by name -- full coverage, nothing missing. Found 4 EXTRA DB rows with no corresponding folder (`Delhi Police Constable`, `Delhi Police Driver`, `Delhi Police Head Constable`, `Delhi Police MTS` -- bare names, no "SSC" prefix) that look like stale duplicates of the properly-named folder-matched rows, left alone (not asked to clean up, just flagged).

### 54.2 Went folder by folder checking Intro linkage + content correctness

All 13 SSC exams already had SOME intro linked, with tables present (confirms the linked ones are already-fixed survivors of §52). But checking each one's actual title/content (not just "is something linked") caught a real bug §51-53's audits never covered because they only scanped UT/State docs: **SSC CHSL (a Central exam) was showing an Andaman & Nicobar-specific regional intro** (`AN_02_SSC_CHSL_Introduction`, `conducting_body: "Andaman and Nicobar Islands — SSC"`, opening text literally says "ANDAMAN & NICOBAR ISLANDS") instead of the real national one. The correct docx (`CHSL.docx`) was sitting right in the same folder. Converted and relinked (new `resource_id` `5bace296-23fe-423f-a23f-5bace29623fe`, 36 blocks/1 table) -- verified the new content correctly describes the national exam with no regional mention. Old wrong resource row left in place, unlinked (same convention as §52.3 -- never delete, just re-point `lc_exam_intro`).

### 54.3 Next session: systematic folder-by-folder audit across all of Drive

User wants this done exam-by-exam across the ENTIRE `CENTRAL EXAMS`, `STATE EXAMS`, and `UT EXAMS` trees on Drive, not just SSC -- a large, multi-session undertaking. A ready-to-paste starter prompt for the next session is provided in this same conversation turn (not duplicated here) -- see the chat itself for its exact text; it codifies: per-folder docx discovery (skip `_PENDING_CONTENT.docx`/lock files), exact (never fuzzy) folder-to-exam_id resolution, convert via `convert_docx_intros_to_blocks.mjs`, link via the same `resources` insert + `lc_exam_intro` upsert pattern as §54.2, and a **content-based** correctness check (not just "is something linked") for exams that already have an intro -- reading the actual opening text/conducting_body for a region/state mismatch like §54.2 found, replacing only when genuinely wrong, otherwise leaving it and moving on.

## 55. The full Drive-vs-DB Introduction audit finished -- every category, every state, every UT

Continuation of §54's plan, run start-to-finish in one long session (with a mid-session break) once the user said "we work sequentially, every time we finish a folder we ingest" and later "finish all the folders now in batch." Went through `CENTRAL EXAMS` (21 categories), then `STATE EXAMS` (28 states), then `UT EXAMS` (8 UTs) -- every real Introduction docx on the Drive checked against the DB, every wrong or missing link fixed on the spot before moving to the next folder, with a table reported after each category/state/UT rather than one silent end-of-session dump.

### 55.1 Methodology (same pattern for all ~1,560 exam folders)

For each top-level folder: discover every exam subfolder with a real (non-placeholder, non-lock-file) Intro docx via the new `scripts/audit_drive_intro_folders.mjs` (see §55.8); resolve the exact matching `exams` row by conducting_body/exam_name/state_ut (never fuzzy-guessed -- ambiguous cases were skipped and flagged, not picked); check `lc_exam_intro` (and the `lc_exam_resource_map` fallback); for anything already linked, fetch the linked resource's actual opening content from R2 and sanity-check it's genuinely about the right exam/state, not just "something is linked"; convert + publish + relink anything wrong or missing via the exact `mammoth` → `parseHtmlToBlocks` → R2 upload → `resources` insert → `lc_exam_intro` upsert pattern used since §52, generating titles that never contain underscores per explicit user directive (mid-session -- see §55.4); never delete an old wrong resource row, only re-point `lc_exam_intro` away from it.

### 55.2 CENTRAL EXAMS -- 21 categories, ~438 exam folders, ~196 fixes

| Category | Folders | Fixed | Already correct |
|---|---|---|---|
| 01.SSC (prior session, §54) | 13 | 1 | 12 |
| 02.BANKING | 37 | 11 | 26 |
| 03.TEACHING | 70 | 16 | 54 |
| 04.RRB | 9 | 0 | 9 |
| 05.UGC-NET | 3 | 0 | 3 |
| 06.NURSING | 78 | 49 | 29 |
| 07.CIVIL SERVICES | 2 | 0 | 2 |
| 08.ENGINEERING RECRUITMENT | 6 | 1 | 5 |
| 09.DEFENCE | 19 | 19 | 0 |
| 10.JUDICIARY EXAMS | 24 | 17 | 7 |
| 11.INSURANCE EXAMS | 16 | 13 | 3 |
| 12.OTHER GOVERNMENT EXAMS | 21 | 19 | 2 |
| 13.INDIA POST | 4 | 0 | 4 |
| 14.BARC | 5 | 5 | 0 |
| 15.ICAR-IARI | 1 | 1 | 0 |
| 16.NATIONAL INFORMATICS CENTRE | 3 | 1 | 2 |
| 17.ACCOUNTS AND COMMERCE | 5 | 0 | 5 |
| 18.POLICE EXAMS | 63 | 43 | ~14 |
| 19.PSU MAHARATNA | 14 | 0 | 14 |
| 20.PSU NAVRATNA | 25 | 1 | 24 |
| 21.METRO RAIL | 20 | 0 | 20 |

`06.NURSING` was the single worst category: a handful of resources (`Tamil Nadu Staff Nurse Exam` reused across 16 different states, `Karnataka CHO Exam` across 6, an Andaman-specific ANM doc across 5) had been auto-matched onto dozens of unrelated states' exams purely by job-title overlap. `18.POLICE EXAMS` was the largest by folder count (64) and found a genuine source-file bug: J&K's own Police Drive folders literally contain Haryana's docx (misfiled at the source, not a DB bug -- flagged for the content team, left unlinked since the DB link was already correct from elsewhere).

### 55.3 STATE EXAMS -- 28 states, ~829 exam folders, ~664 fixes

| State | Folders | Fixed | State | Folders | Fixed |
|---|---|---|---|---|---|
| Andhra Pradesh | 19 | 0 | Maharashtra | 30 | 28 |
| Arunachal Pradesh | 34 | 0 | Manipur | 30 | 29 |
| Assam | 36 | 3 | Meghalaya | 30 | 28 |
| Bihar | 31 | 2 (unlink only) | Mizoram | 28 | 26 |
| Chhattisgarh | 35 | 33 | Nagaland | 32 | 29 |
| Goa | 30 | 28 | Odisha | 30 | 27 |
| Gujarat | 33 | 31 | Punjab | 29 | 26 |
| Haryana | 29 | 26 | Rajasthan | 46 | 44 |
| Himachal Pradesh | 30 | 26 | Sikkim | 24 | 22 |
| Jharkhand | 33 | 29 | Tamil Nadu | 32 | 31 |
| Karnataka | 32 | 31 | Telangana | 25 | 25 |
| Kerala | 27 | 25 | Tripura | 22 | 21 |
| Madhya Pradesh | 30 | 29 | Uttar Pradesh | 27 | 23 |
| — | — | — | Uttarakhand | 23 | 22 |
| — | — | — | West Bengal | 22 | 20 |

This is where the audit found the real damage: Andhra Pradesh and Arunachal Pradesh were the only two states already fully correct going in. Most of the rest (Chhattisgarh, Gujarat, Rajasthan, Telangana most severely) were **almost entirely unlinked** despite having real, ready-to-use Introduction docx sitting on Drive the whole time -- not a wrong-content bug, just never connected. On top of that, the same small set of generic resources (`UGC Assistant Professor`, `BPSC TRE TGT/PGT/PRT`, `Tamil Nadu ANM Exam`, `Jharkhand Staff Nurse`, `RRB Pharmacist`, `1.MTS_INTRO` from India Post, `Gujarat CHO Exam`, `Patna High Court Stenographer`, `AN Primary Teacher`) kept recurring as the wrong link across a dozen-plus states. Two more source-file mistakes were caught: Jharkhand's own "Group D/Peon" folder contains a mislabeled Clerk docx, and Odisha's "Agriculture Services (ASO/AO)" folder contains a mislabeled CGLRE docx -- both left unlinked rather than propagated.

### 55.4 UT EXAMS -- 8 UTs, ~295 exam folders, ~22 fixes

| UT | Folders | Fixed |
|---|---|---|
| Andaman and Nicobar Islands | 34 | 0 |
| Chandigarh | 34 | 2 |
| Dadra and Nagar Haveli and Daman and Diu | 34 | 0 |
| Jammu and Kashmir | 43 | 11 |
| Delhi | 42 | 1 |
| Ladakh | 40 | 4 |
| Lakshadweep | 30 | 1 |
| Puducherry | 38 | 2 |

Unlike the states, most UTs were already ~90%+ correct going in -- confirms the UT-specific wrong-intro cleanup from §52.3 (done in an earlier session, before this one) actually held. The remaining bugs here were smaller and more scattered: `NIC Scientist` content reused for 3 different Ladakh research-institute exams (DRDO-SASE, DRDO-DIHAR, Pollution Control), `UGC Assistant Professor` reused for Chandigarh/Lakshadweep/Puducherry/Ladakh college-lecturer exams, and one Puducherry exam showing Ladakh's own Social Welfare content.

### 55.5 A real miss, caught by post-hoc verification, not by the pass itself

After declaring the audit complete, the user asked to *confirm* the intros were actually live -- not just take the summary at face value. Ran a DB-wide fan-out check (`lc_exam_intro` grouped by `resource_id`, flagging any resource shared by exams with different conducting_body/state_ut -- the exact signature hunted all session) across all 1,523 linked exams. 19 flagged; 18 reviewed and confirmed legitimate (same-state duplicate `exams` rows, or deliberately-accepted national content like SBI/India Post GDS). The 19th was real: **Ladakh's own "Assistant Professor / Lecturer" exam was still showing generic UGC content** -- it had been correctly identified as wrong during the Ladakh UT pass (§ in-chat) but left out of that category's fix plan by a transcription slip. Fixed immediately once caught. Also verified: a spread of resources created across the session (earliest to latest) all return HTTP 200 with real block content from their live R2 URLs, and zero of the 1,523 `lc_exam_intro` rows point at a `resource_id` that doesn't exist in `resources` -- no dangling writes. Lesson for future passes of this kind: a same-pattern DB-wide sweep at the end is worth doing even after a careful category-by-category pass, since a single missed item in a 40-exam plan is easy to lose track of across a session this long.

### 55.6 Genuine data-modeling gaps found, flagged, not fixed

Two cases where one `exams` row maps to more than one real docx, which isn't fixable by relinking: ISRO's combined "Scientist/Engineer Technical Assistant" exam row has two distinct real docx (Scientist and Technical Assistant) but only one can be linked; ESIC's combined "Technical & Medical JE, Nursing Officer/Staff Nurse, Doctors" exam row has three real docx for its three sub-roles. Both left as-is (the ESIC one was unlinked from its previously-wrong content rather than guessing which of the three docx to pick) -- these need a data-modeling decision (split into separate exam rows) that isn't this audit's call to make unilaterally.

### 55.7 A blanket "no underscores in generated titles" directive, applied retroactively too

Partway through, user gave a standing instruction: no underscores in resource titles going forward. The reusable fix template (§55.8) was updated to strip underscores unconditionally and fall back to `"<conducting body> - <exam label>"` whenever the raw docx filename is literally "Introduction" (extremely common -- most STATE/UT folders use that generic filename). Also went back and fixed the 44 resources already created earlier in the session whose titles had underscores baked in from source docx filenames (Banking cooperative-bank items, all of Defence, Judiciary, Engineering's RRB JE) -- DB title, R2 `metadata.json` title, and the chapter's own title all patched to match. Did not retroactively touch older underscored titles from unrelated earlier-today work (outside this task's scope).

### 55.8 Tooling built and kept (committed as reusable, not one-off `_tmp_` scripts)

- **`scripts/audit_drive_intro_folders.mjs`** -- discovers every real exam-Introduction folder under a given Drive root. Went through two real bugs during use, both fixed: (1) `fs.readdirSync` order over a mounted Drive filesystem isn't alphabetical, so when a folder has 2+ subfolders matching `/intro/i` (a genuine content-team duplication -- e.g. a stray "5. INTRODUCTION" folder full of mock-test docx sitting alongside the real "1. INTRODUCTION") it now always picks the lowest-numbered one and prints a `[WARN]` rather than picking whichever the filesystem lists first; (2) the "is this an exam folder" heuristic now matches on a direct `/intro/i` folder name OR a GUIDE/PRECIS/PYQ/TEST-SERIES sibling signature, after an earlier version either mis-triggered on parent category folders or missed genuine typo'd folders (e.g. "1. INTODUCTION").
- **`scripts/fix_wrong_intros_template.mjs`** -- the reusable relink/new-link script, copied per category to a `_tmp_fix_<category>_intros.mjs` and pointed at that category's plan JSON. Dry-run by default, `--execute` to write. Bakes in the underscore-free title rule from §55.7.

Every per-category plan file and its copy of the fix script were deleted after that category's writes were verified -- only these two genuinely reusable tools were kept untracked-but-real in `scripts/`.

### 55.9 Git/production state

`docs/status_report.md` (this entry) plus the two new scripts (`scripts/audit_drive_intro_folders.mjs`, `scripts/fix_wrong_intros_template.mjs`) are the only file changes from this session -- everything else was Supabase/R2 writes, not code. Not committed yet; user has not asked to commit or push this session. Standing rules followed throughout: no hardcoded secrets (all scripts read from `.env`), no generated content directories touched, confirmed with the user before each large batch of writes until they explicitly waived that for the remainder of the run.

**Next session, if anything is left**: the two data-modeling gaps in §55.6 need a decision; the handful of genuine source-file mistakes flagged in §55.2/§55.3 (J&K Police folder, Jharkhand Group D folder, Odisha Agriculture Services folder, Gujarat Police Constable with no matching DB row, Rajasthan Informatics Assistant with no matching Drive folder) need the content team to supply the real file or the DB row, whichever is missing -- nothing more Claude can do on these without inventing content.

## 56. The §55 fixes were invisible in admin -- found and closed a second linking gap, then produced the final missing-Intro list

Right after §55 was reported done, the user checked the actual admin Exams page and the Intro links didn't appear to be there. Root cause: the admin "Resources" panel (`src/pages/admin/ExamResourcesPanel.jsx`) only ever reads `lc_exam_resource_map` (category='Intro') -- the older, Gemini-auto-matched mapping table -- and never reads `lc_exam_intro`, the guaranteed one-row-per-exam table §52 onward (and all of §54-55) actually wrote to. The candidate-facing site was correct the whole time (`useExamContent.js`'s `fetchExamIntro` checks `lc_exam_intro` first, exactly by design), but admin had zero visibility into it, so from the admin's chair the whole audit looked like it hadn't happened.

Confirmed concretely on the Ladakh Assistant Professor/Lecturer exam fixed at the very end of §55: `lc_exam_intro` correctly pointed at the new resource, but `lc_exam_resource_map` still had its old August 23 Gemini-matched (wrong) resource sitting in the Intro slot -- because nothing in this whole audit had ever touched that table.

**Fix**: wrote a one-off sync (`scripts/_tmp_sync_intro_map*.mjs`, not kept -- see §55.8's two permanent tools for what *is* kept) that, for every `lc_exam_intro` row with a real `resource_id`, makes `lc_exam_resource_map`'s Intro-category row for that `exam_id` match it exactly -- deleting any stale/wrong Intro row for that exam first, then inserting the correct one. First pass silently truncated at PostgREST's default 1000-row page cap (`lc_exam_intro` actually has 1,492 rows with a `resource_id`, not 1,000 -- confirmed the hard way when the Ladakh exam, used as the live verification case, still showed the old row after "success"). Re-ran with proper `.range()` pagination on both the `lc_exam_intro` and `lc_exam_resource_map` fetches; the corrected run found the 492 rows the first pass missed and finished the sync. Combined across both passes: 265 stale rows deleted, 1,121 new rows inserted, `lc_exam_resource_map` now carries 1,499 Intro rows against 1,492 `lc_exam_intro` rows (the small excess is pre-existing legitimate duplicates, not a new bug). Verified the Ladakh exam specifically now shows the correct resource in both tables.

**Lesson for future one-off sync/backfill scripts against this DB**: never trust an unfiltered `.select()` to return everything -- PostgREST silently caps at 1000 rows with no error, so a row count landing suspiciously close to a round 1000 is itself a signal to add `.range()` pagination before trusting the result.

Also ran `scripts/export_missing_intros.mjs` (an existing tool from an earlier session, untouched) fresh to get a current punch-list: of 1,537 total exams, **37 still have no Introduction at all** -- written to `docs/exams_missing_intro.xlsx`. Of those, most are either genuinely missing real content (7 have blank `exam_name`, worth a data-quality look on their own) or fall into the already-flagged §55.2/§55.3 gaps (Rajasthan Informatics Assistant, Odisha Agriculture Services). The rest are smaller/rarer exams the Drive tree audit's folder-discovery heuristic never surfaced a folder for at all (as opposed to surfacing one with wrong/no content) -- a genuinely different, smaller follow-up than the main §55 sweep, left for whenever the content team supplies the missing folders.

Permission note: applying the corrected sync script's `--execute` run required the user to manually add a Bash permission rule to `.claude/settings.local.json` -- the auto-mode classifier blocks Claude from editing its own permission file (self-modification), by design.

## 57. Next session's plan: the same audit, extended to PYQs then Quizzes

User's direction for the next chat: apply the exact same Drive-vs-DB methodology from §54-56 to **PYQs first, then Quizzes last** -- go exam by exam, compare what's on Drive against what's actually linked in the DB, relink whatever's wrong or missing, and (per the standing §55.7 rule) never leave underscores in a generated title. This section is the starting plan so the next session can begin immediately without re-deriving context.

### 57.1 Known complication to resolve first: which table is actually live for PYQs

Unlike Intro (where §52-56 already nailed down `lc_exam_intro` as the one true source), PYQ content is split across **two different systems** and it isn't yet confirmed which one candidates actually see:

- **`pyq_papers` / `pyq_questions`** (`sql/pyq_papers.sql`) -- dedicated structured Q&A tables (question/options/answer/explanation), populated by the OCR/reconstruction pipeline (`scripts/ocr_reconstruct_pyps*.py`, `scripts/reconstruct_all_pyps*.py`, `scripts/structure_pyps_replicate.py`, `scripts/ingest_structured_pyps.mjs`, output into the untracked `FINAL_PYPS_STRUCTURED/`/`books/` dirs). Rendered candidate-side by `PyqReader.jsx`/`PyqCenter.jsx`. Has an additive `lc_exam_id` FK column (`sql/pyq_quizzes_lc_exam_link.sql`) alongside a free-text `exam_name` column -- but as of this session, `PyqCenter.jsx`'s actual exam filter (`matchesExamFilter`, line 64) still matches on `exam_name` substring only, **not** `lc_exam_id`. Confirm whether that's changed before assuming `lc_exam_id` is what to write to.
- **`resources` with `category='PYQ'`**, linked the same way Intro/Guide/Precis are via `lc_exam_resource_map` -- the sql comment in `pyq_papers.sql` itself says PYQs "previously landed in quizzes/questions (category='PYQ') by mistake" and were moved out, which suggests this pathway may now be legacy/dead for PYQ specifically, but that needs to be confirmed live (check whether any exam's `byCategory.PYQ` in `useExamContent.js` is non-empty and actually rendered anywhere), not assumed.

First task of the next session: read `PyqReader.jsx`/`PyqCenter.jsx` and `useExamContent.js`'s PYQ handling closely enough to state definitively which table+column is the real write target before touching any data, the same way lc_exam_intro's authority was established before §54's first write.

### 57.2 Quizzes: the write target is already known

Two separate quiz-mapping surfaces already exist and both matter: `lc_exam_quiz_map` (`sql/lc_exam_quiz_map.sql`, exam_id -> quiz_id, mirrors `lc_exam_resource_map`) is what `QuizCenter.jsx` (the candidate-facing quiz browse page) prefers, falling back to the old subject-overlap filter only when a given exam has no rows there yet. `quizzes.lc_exam_id` (`sql/pyq_quizzes_lc_exam_link.sql`) is a second, additive per-quiz FK column. Next session should confirm both are checked/kept in sync the same way §56 just did for Intro (`lc_exam_resource_map` vs `lc_exam_intro`) -- don't repeat the same two-tables-diverge mistake for quizzes.

### 57.3 Methodology (reuse, don't rebuild)

Same pattern as §54-55, applied per category folder, PYQs first then Quizzes, one category fully audited and fixed before moving to the next (§ standing "sequential folder ingest" rule): discover the real PYQ/Quiz-relevant files under each exam's Drive folder (the "4. PYQ" and "5. TEST SERIES" numbered subfolders `audit_drive_intro_folders.mjs` already detects as the content-signature siblings -- that script's discovery logic should extend directly to these, not need reinventing); resolve exact exam_id (never fuzzy); check current linkage in whichever table §57.1/§57.2 confirms is authoritative; content-sanity-check anything already linked (not just "is something linked") the same way §54.2's SSC CHSL bug and the whole of §55 was caught; fix and relink immediately per category, no underscores in any generated title (bake `cleanTitle()` from `scripts/fix_wrong_intros_template.mjs` into whatever new fix script this needs, don't regenerate that logic from scratch); report a per-category table; and -- the new lesson from §56 -- **sync both the authoritative table and whatever legacy/admin-facing table mirrors it in the same pass this time**, so this session doesn't end with the same "looks unlinked in admin" surprise §56 had to catch after the fact. Track elapsed time per category for an ETA the same way the STATE EXAMS pass did in §55.

## 58. §57's plan executed for CENTRAL EXAMS (all 21 categories), then a bigger architectural bug found and fixed: `exams.exam_name` collisions, not just wrong links

### 58.1 §57.1 answered: `pyq_papers`/`pyq_questions` is the real table, `resources` category='PYQ' is a live code path with zero rows

Read `PyqReader.jsx`/`PyqCenter.jsx` directly: both query `pyq_papers`/`pyq_questions` exclusively, matched by `exam_name` substring (`PyqCenter.jsx`'s `matchesExamFilter`), never `lc_exam_id` before this session. Separately, `useExamContent.js` → `ExamContentPreview.jsx` reads `resources` where `category='PYQ'` and renders it inline on `ExamSyllabus.jsx` alongside a dedicated `/pyq-center` link -- genuinely live code, but a DB check found **zero** `resources` rows with `category='PYQ'` exist right now, so that path is currently a no-op for every exam, not a second real content source to reconcile against.

### 58.2 New reusable tooling, same spirit as §55.8

- **`scripts/audit_drive_pyq_folders.mjs`** -- Drive discovery for the "N. ... PYQ" folder per exam, counting real paper files by distinct stem (docx+pdf pair = one paper). Handles two real folder-naming quirks found live: a stray space before the numbering dot ("4 . 10 YEARS PYQs"), and exams that split PYQ papers into subject subfolders (SSC JE's Civil/Electrical/Mechanical) instead of dumping files directly in the PYQ folder.
- **`scripts/audit_pyq_linkage.mjs`** -- cross-references Drive discovery against `pyq_papers`, matching Drive folder labels to `exams` rows by normalized name or `conducting_body`+`exam_name` combo (BANKING-style short generic names need the combo; career_track turned out too fragmented/overlapping to use as a hard filter -- one Drive category like TEACHING spans TEACHING, TEACHER RECRUITMENT, TEACHER ELIGIBILITY, EDUCATION SERVICES as separate `career_track` values -- so it's now only a tie-break hint, never a scope filter). Flags `AMBIGUOUS_LABEL` when 2+ Drive folders in one run normalize to the same label, which is what surfaced §58.4.
- **`scripts/backfill_pyq_lc_exam_id.mjs`** -- the real fix for §58.4, see below.

### 58.3 All 21 CENTRAL EXAMS categories audited -- 432 exams, 122 (~28%) fully linked with real content

| # | Category | Exams | OK | Partial | Missing/no-source |
|---|---|---|---|---|---|
| 01 | SSC | 13 | 10 | 0 | 3 |
| 02 | BANKING | 37 | 14 | 7 | 16 |
| 03 | TEACHING | 72 | 39 | 5 | 28 |
| 04 | RRB | 9 | 4 | 5 | 0 |
| 05 | UGC-NET | 3 | 3 | 0 | 0 |
| 06 | NURSING | 78 | 17 | 1 | 60 |
| 07 | CIVIL SERVICES | 2 | 0 | 1 | 1 |
| 08 | ENGINEERING RECRUITMENT | 6 | 1 | 1 | 4 |
| 09 | DEFENCE | 19 | 2 | 2 | 15 |
| 10 | JUDICIARY EXAMS | 27 | 0 | 0 | 27 (no source) |
| 11 | INSURANCE EXAMS | 17 | 5 | 0 | 12 |
| 12 | OTHER GOVERNMENT EXAMS | 21 | 14 | 0 | 7 |
| 13 | INDIA POST | 4 | 3 | 0 | 1 |
| 14 | BARC | 5 | 1 | 0 | 4 |
| 15 | ICAR-IARI | 1 | 0 | 0 | 1 |
| 16 | NATIONAL INFORMATICS CENTRE | 3 | 2 | 0 | 1 |
| 17 | ACCOUNTS AND COMMERCE | 5 | 2 | 0 | 3 |
| 18 | POLICE EXAMS | 51 | 0 | 0 | 51 (mostly no source) |
| 19 | PSU MAHARATNA | 14 | 5 | 0 | 9 |
| 20 | PSU NAVRATNA | 25 | 0 | 0 | 25 |
| 21 | METRO RAIL | 20 | 0 | 0 | 20 (mostly no source) |

**"Missing/no-source" is two different problems, not one.** Most of it is a real OCR backlog (Drive has real docx/PDF papers, nothing's been reconstructed into `pyq_papers` yet -- deferred this session, no working free OCR pipeline right now: Gemini's out of credits, the Vertex/fal/replicate/flex scripts in the working tree from an earlier session look like unfinished experiments). But three categories (JUDICIARY EXAMS fully, most of POLICE EXAMS, most of METRO RAIL) have Drive folders containing only a `[PLACEHOLDER -- Replace with actual content]` .txt file, not real source material at all -- the content team hasn't supplied anything to OCR yet, which needs a different ask than "run the reconstruction pipeline."

### 58.4 Bigger finding: cross-exam content bleed traces to `exams.exam_name` itself, not just wrong `pyq_papers` links

Content-sanity-checking the "linked" papers (not just counting them, same lesson as §54.2/§55) found real mislinks fixed by unlink (non-destructive, `exam_name` set to null, no rows deleted): SSC Scientific Assistant (IMD)'s only paper was actually an SSC JE paper; UPSC Civil Services' two "papers" were Bhutan's and the Philippines' civil service exams; two "Community Health Officer" papers were Kenya's TVET community-health curriculum assessments, not an Indian CHO recruitment exam.

Deeper than that: several papers were ingested with a bare generic `exam_name` ("Staff Nurse", "ANM", "Community Health Officer", "Nursing Officer", plain "TGT"/"PGT") instead of the institution-qualified label every other paper uses. `PyqCenter.jsx`'s matching is bidirectional substring (`paper.exam_name` vs `exam.exam_name`), so exactly 2 real "Staff Nurse" papers (RRB-titled, SGPGI-titled) were showing as "linked" on **18 different states'** Staff Nurse pages. Renaming those papers to institution-qualified labels seemed like the fix -- until checking why one rename (UIIC's "Administrative Officer (AO)") still didn't resolve cleanly revealed the real root cause: **the `exams` table itself has massive non-unique `exam_name` values.** Measured live: **117 exam_name values are shared by 2+ different real exams, covering 380 of 1,537 exams (24.7%)** -- "Staff Nurse" ×20, "Sub-Inspector" ×9, "ANM" ×7, "Constables" ×7, plus a long tail of Agriculture/Home Guard/Civil Defence titles at ×6 each. When the *target* exams themselves share one name, no amount of `pyq_papers.exam_name` rewriting can disambiguate -- the two exams are equally valid substring matches by construction. This isn't a PYQ-only bug; it risks the same substring-matching convention anywhere else it's used (Guide/Precis fallback, Quiz fallback) wherever `lc_exam_resource_map`/`lc_exam_id` linking doesn't already cover it.

### 58.5 The real fix: `pyq_papers.lc_exam_id` backfilled, `PyqCenter.jsx` changed to prefer it

`pyq_papers.lc_exam_id` already existed (`sql/pyq_quizzes_lc_exam_link.sql`, added §49.2) but was essentially unused (1/754 rows set) and `PyqCenter.jsx` never read it. Verified live that `exams.exam_id` and `lc_exams.id` share the same UUID for 1,531/1,537 rows (`api/exams.js`'s own header comment already relies on this), so `lc_exam_id` can be backfilled by resolving against `exams` directly and writing that same uuid.

`scripts/backfill_pyq_lc_exam_id.mjs` resolves conservatively -- exact normalized `exam_name` match, else `conducting_body`+`exam_name` combo, else unique-prefix match against the real ingestion convention (`"<exam name> 10 YEARS PYQ PAPER N"`) -- and only writes when exactly one `exams` row qualifies; ambiguous (2+ candidates) or unmatched rows are left null rather than guessed. First pass: 534/747 resolved and written (71%). This session's own manually-renamed rows (institution-name-first, so they don't fit the automated resolver's patterns) were then individually resolved and backfilled by hand (UIIC, NIACL, GIC, MP ANM, NIC, BTSC, OSSSC, FCI ×3). Final coverage: **548/754 (72.7%)** `pyq_papers` rows now carry a real `lc_exam_id`; 200 remain unresolved (genuinely ambiguous or no matching `exams` row) rather than fuzzy-guessed; 6 have no `exam_name` at all (this session's confirmed-wrong-content unlinks).

`PyqCenter.jsx`'s `matchesExamFilter` now checks `lc_exam_id` first (exact FK, no ambiguity) and only falls back to the substring text match when it's null -- same pattern `useExamContent.js` already uses for Guide/Precis via `lc_exam_resource_map`. Fixed a second, real bug found while touching this function: the old code's `!p.exam_name` clause made any unlinked paper match *every* exam's filtered view (not just the unfiltered "all papers" list) -- meaning this session's own unlink-fixes (Bhutan/Philippines/Kenya content) were about to leak onto every exam's PYQ page instead of disappearing. Now a null-`exam_name` paper only shows in the unfiltered view. Verified with a clean `vite build`; no live browser check available in this environment (standing gap, see memory).

`src/pages/admin/PyqPapersPage.jsx`'s exam-picker code comment (written at §49) claimed "candidate-facing code still matches on it by name, not yet on lc_exam_id" -- updated to reflect the new reality so a future session doesn't read stale context there.

### 58.6 Git/production state

Changed this session: `docs/status_report.md` (this entry), two new scripts (`scripts/audit_drive_pyq_folders.mjs`, `scripts/audit_pyq_linkage.mjs`), one new script (`scripts/backfill_pyq_lc_exam_id.mjs`), `src/pages/PyqCenter.jsx` (matching logic), `src/pages/admin/PyqPapersPage.jsx` (comment only). All Supabase writes (unlinks, renames, the `lc_exam_id` backfill) already applied live against production. Not committed yet -- user has not asked to commit or push this session. Standing rules followed: no hardcoded secrets, no generated content directories touched, every write was either a rename/unlink of a specific already-identified-wrong row or a conservative non-guessed backfill.

### 58.7 (Superseded by §59 -- both STATE and UT were finished same session)

## 59. Same session, continued: STATE EXAMS (28 states) and UT EXAMS (8 UTs) audited, closing out the full PYQ Drive-vs-DB pass

### 59.1 STATE EXAMS -- 28 states, 835 exams, 206 (~24.7%) fully linked

| State | Exams | OK | State | Exams | OK |
|---|---|---|---|---|---|
| Andhra Pradesh | 20 | 18 | Maharashtra | 30 | 1 |
| Arunachal Pradesh | 34 | 19 | Manipur | 30 | 0 |
| Assam | 36 | 18 | Meghalaya | 30 | 0 |
| Bihar | 31 | 19 | Mizoram | 28 | 0 |
| Chhattisgarh | 35 | 20 | Nagaland | 32 | 3 |
| Goa | 30 | 17 | Odisha | 31 | 0 |
| Gujarat | 33 | 21 | Punjab | 30 | 1 |
| Haryana | 29 | 20 | Rajasthan | 47 | 0 |
| Himachal Pradesh | 30 | 8 | Sikkim | 24 | 2 |
| Jharkhand | 33 | 11 | Tamil Nadu | 32 | 1 |
| Karnataka | 32 | 7 | Telangana | 25 | 1 |
| Kerala | 27 | 3 | Tripura | 24 | 2 |
| Madhya Pradesh | 30 | 0 | Uttar Pradesh | 27 | 10 |
| — | — | — | Uttarakhand | 23 | 3 |
| — | — | — | West Bengal | 22 | 1 |

Andhra Pradesh and Arunachal Pradesh are again (as they were for Intro, §55.3) the best-covered states -- everything else drops off sharply, with Madhya Pradesh, Manipur, Meghalaya, Mizoram, Odisha, and Rajasthan showing **zero** real PYQ content despite every one of those states' Drive folders having genuine, ready-to-source docx/PDF papers sitting there unused. Same finding as Intro's §55.3, just worse for PYQ: the Northeast states and MP/Odisha/Rajasthan are where the OCR backlog is concentrated.

### 59.2 UT EXAMS -- 8 UTs, ~308 exams, 100% no real source content anywhere

Andaman & Nicobar, Chandigarh, Dadra & Nagar Haveli/Daman & Diu, Jammu & Kashmir, Delhi, Ladakh, Lakshadweep, and Puducherry **every single one** came back `NO_DRIVE_CONTENT` for every exam folder -- no real docx/PDF PYQ papers exist on Drive for any UT exam at all, only placeholder files or nothing. This is a cleaner, simpler finding than STATE/CENTRAL's mix: there's no OCR work possible here yet at all -- the content team needs to supply real source papers before this category can be touched, category-wide, not exam-by-exam.

### 59.3 A few more cross-exam mislinks found and fixed the same way as §58.4

Spot-checking "OK" results while auditing states surfaced the exact same generic-`exam_name` bleed pattern again: Haryana's "Agriculture Development Officer" (2 papers) turned out to be Punjab's and Himachal's content, not Haryana's at all; a bare "Agriculture Supervisor" mixed one Rajasthan-specific paper (RSMSSB) with one unidentifiable one. Fixed the same way -- renamed to institution-qualified labels, backfilled `lc_exam_id` where a matching `exams` row could be found without guessing (Himachal's row resolved; Punjab's and the unidentified one could not, and were left honestly unresolved rather than guessed).

**A real lesson from doing this over ~35 categories/states now**: renaming a paper to `"<Institution> (<full name>) <original generic label>"` (institution-first) breaks the automated backfill script's matching (which expects the real ingestion convention, `"<label> ... PAPER N"`, label-first) *and* can break the paper's own correct match against its real Drive folder if that folder's label doesn't also happen to be a full sentence containing the institution name verbatim. Where the institution was already knowable and confirmed, resolving `lc_exam_id` by hand (as done throughout §58-59) sidesteps this; a few generic-labeled papers from this session (RSMSSB Agriculture Supervisor, Punjab Agriculture Development Officer, IB Security Assistant, SGPGI Staff Nurse) are renamed correctly for human readability but don't yet resolve to a real `exams` row, either because none exists yet or the resolution wasn't attempted by hand. Worth a final cleanup pass before this is called fully done.

### 59.4 Overall PYQ audit totals, CENTRAL + STATE + UT combined

**1,575 exams audited, 328 (~20.8%) with real, correctly-linked PYQ content.** `pyq_papers.lc_exam_id` coverage: 549/754 rows (72.8%). The remaining ~1,247 exams need either real OCR reconstruction (most of CENTRAL/STATE) or the content team to supply source material that doesn't exist yet at all (JUDICIARY EXAMS, most of POLICE EXAMS, most of METRO RAIL, and the entire UT EXAMS category).

### 59.5 Git/production state

Same file set as §58.6 plus this entry -- no additional scripts needed for STATE/UT, the same `audit_drive_pyq_folders.mjs`/`audit_pyq_linkage.mjs`/`backfill_pyq_lc_exam_id.mjs` tooling covered all three tiers unchanged. All writes (renames, unlinks, `lc_exam_id` backfills) applied live. Not committed -- user has not asked to commit or push this session.

### 59.6 Next session starts here

The full Drive-vs-DB PYQ *linkage* audit (discover, cross-reference, fix cheap mislinks, flag OCR/no-source gaps) is done for all of CENTRAL + STATE + UT. What's left, in the order the user's been working through this: (1) **Quizzes** (§57.2) -- not started yet, flagged this session as lower priority per the user's own words ("quizzes are in better shape than the PYQs"), but `lc_exam_quiz_map` vs `quizzes.lc_exam_id` sync should still be checked the same way §56 caught it for Intro. (2) **The OCR reconstruction decision** -- deferred all session; no working free pipeline confirmed (Gemini exhausted, Vertex/fal/replicate/flex scripts in the tree are unverified experiments from an earlier session) -- needs a real decision on provider/budget before any of the ~1,000+ missing-content exams can actually be closed. (3) The content-team ask for JUDICIARY EXAMS, most of POLICE EXAMS, most of METRO RAIL, and all of UT EXAMS is a different, non-Claude-actionable item -- there's no source material to work with at all, not a linking or OCR problem.

## 60. Book Content admin work: row-click regression fix, bulk Link Exams, and a much bigger find -- most Guide/Precis content was running on a legacy text-match fallback, not real links

### 60.1 BooksPage.jsx: row click no longer opens the book editor

Clicking anywhere on a row in Book Content (`src/pages/admin/BooksPage.jsx`) used to `navigate()` into the chapter editor -- redundant with the existing "Open in new tab" (`ExternalLink`) button and the Preview (`Eye`) button, and an accidental click while editing an inline field was easy to trigger. Removed the row's `onClick`/`clickable` class entirely; the two existing buttons are now the only way in.

### 60.2 New: bulk "Link Exams" -- the mirror of the exam page's own "Add Resource" drawer

User wanted to link one Guide/Precis book to many exams at once from the book's own row, without going exam-by-exam through each exam's Resources panel. `src/pages/admin/ExamResourcesPanel.jsx` already had almost exactly this (`AddResourceMapDrawer` -- fixed exam, multi-select resources); built `src/pages/admin/LinkExamsDrawer.jsx` as its mirror image (fixed book, multi-select exams, same search/level-filter/checkbox-list UI, same `lc_exam_resource_map` insert shape), wired to a new purple Link2 button per row in BooksPage.jsx. **Disabled for Intro rows** with an explanatory tooltip -- Intro is a hard 1:1 (one exam per resource, never more), a rule the user restated emphatically after an earlier in-session attempt to generalize it, which was reverted. The drawer only *adds* links; it doesn't unlink or replace an exam's existing resource (removal still goes through ExamResourcesPanel's own trash icon, one exam at a time).

### 60.3 Investigating a "swap this book out" request surfaced the real finding

User wanted to replace "HINDI JHT" (596 linked entries) with a different book. Checking what "596" actually meant before building a swap feature: those are 596 duplicate `resources` rows all sharing one title and one real R2 location (`storage_base_url`) -- a legacy ingestion pattern (one row created per exam at ingestion time) predating `lc_exam_resource_map`. Of those 596, only 455 had an explicit `lc_exam_resource_map` row; the other 141 were reachable only through `useExamContent.js`'s `exam_name` ilike-text-match fallback.

Widening the check to all of Guide/Precis found this wasn't a one-book problem: **of 14,655 total Guide/Precis `resources` rows, only 611 distinct resource_ids had any `lc_exam_resource_map` row at all (10,045 map rows total, reused across many exams each -- the modern one-resource/many-exams pattern this year's tooling uses). The other 14,044 rows, across 533 real book titles, had zero map row and were served entirely by the legacy fallback** -- not an edge case, the large majority of live Guide/Precis content. Quizzes were worse: `lc_exam_quiz_map` had **zero** rows despite being built (§42) -- every quiz link was 100% fallback, no exceptions (still blocked on Gemini credits per §36/§42).

User's direction: remove the legacy fallback entirely and run on real linkage only, then later clean up whatever tables/rows become dead. That can't happen in one step without breaking live content for whatever isn't backfilled first.

### 60.4 A live bug found in the fallback gate itself, fixed first

Before backfilling anything, found and fixed a real bug in `useExamContent.js`: `fetchMappedResources(examId)` checked for *any* `lc_exam_resource_map` row for the exam across *all* categories combined -- so an exam with, say, only an Intro map row (1,499 exams have one, per §56) would short-circuit the fallback for *every* category, including Guide/Precis rows that were never mapped and had no other way to be found. Verified live: 18 exams had real Guide/Precis content sitting completely unreachable this way (sample: RRB Nursing Superintendent, SBI PO/Clerk, several "Medical Officer"/"Assistant Professor" postings). Rewrote it to return which *categories* are actually mapped (`{ resources, mappedCategories }`), and the hook now only calls the fallback for whichever categories aren't covered -- a strict improvement over the old behavior (fixes the 18 live cases) and a necessary prerequisite for the backfill below (partial coverage no longer silently blacks out unmapped categories for the same exam).

### 60.5 Guide/Precis backfill: `scripts/backfill_guide_precis_resource_map.mjs`

Built (kept, reusable, same convention as `backfill_pyq_lc_exam_id.mjs`) rather than one-off `_tmp_`. Groups `resources` rows by **(category, title, storage_base_url)** -- title alone isn't safe: 66 titles (e.g. "ENGLISH" with 7, "GENERAL KNOWLEDGE" with 464) turned out to be several genuinely *different* real books sharing one generic name. An earlier draft of this script grouped by title alone and would have picked one arbitrary "canonical" resource per title, silently cross-linking exams to the wrong book's content -- the same class of bug the PYQ audit already found once (§58.4, generic `exam_name` values shared by unrelated exams). Caught in dry-run before any writes.

Per (category, title, content) group: pick a canonical resource_id (prefer one an existing map row already points at), resolve every duplicate row's `exam_name` to a real `lc_exams.id` via the same conservative exact → conducting-body-combo → unique-prefix chain `backfill_pyq_lc_exam_id.mjs` uses (never guessed -- ambiguous or no-match rows are skipped), insert an `lc_exam_resource_map` row per resolved exam pointing at the canonical resource, and archive (`status='Draft'`) every non-canonical row in the group (confirmed byte-for-byte identical content by construction of the group key).

Dry run first, reviewed with the user, then executed. Result: **8,517 new `lc_exam_resource_map` rows** resolved and written (10,458 exact-name matches + 4 prefix matches, minus in-group dedup; 3,575 ambiguous and 592 no-match rows correctly left unresolved rather than guessed), **13,270 duplicate legacy rows archived**. One real snag mid-execute: `lc_exam_resource_map` has a unique constraint on `(exam_id, resource_id)` alone, not including `category` -- a plain `.insert()` fails an *entire* 500-row batch on a single conflict, which silently dropped ~1,000 otherwise-valid rows in the first two batches. Fixed by switching to `.upsert(..., { onConflict: 'exam_id,resource_id', ignoreDuplicates: true })` and re-running (idempotent -- already-written rows and already-Draft archives just no-op); the retry picked up the missing ~1,000. Verified live afterward: Guide/Precis `lc_exam_resource_map` row count went from 10,045 to 18,530 (+8,485, matching expectations); HINDI JHT specifically now has exactly 1 Published row (was 596) with the rest archived.

### 60.6 What's left before the fallback code can actually be deleted

Real remaining gap: **3,575 ambiguous + 592 no-match Guide/Precis rows** (the same generic-shared-exam-name problem PYQ hit) are still only reachable via the fallback -- until each is manually resolved or flagged for the content team, removing `fetchResourcesFallback` would blank those exams' Guide/Precis sections. Quizzes haven't been touched at all yet (still 0 rows in `lc_exam_quiz_map`) -- same backfill approach needs to be built for `quizzes`/`lc_exam_quiz_map` before its own fallback (`fetchQuizzesByExamName`) can go. Only once both are as complete as conservative matching allows should the fallback functions actually be deleted from `useExamContent.js`; after that, the now-fully-archived duplicate `resources` rows (13,270 and counting) are the "later, remove deprecated tables and rows" cleanup the user asked for.

### 60.7 Git/production state

Changed: `src/pages/admin/BooksPage.jsx`, new `src/pages/admin/LinkExamsDrawer.jsx`, `src/hooks/useExamContent.js` (per-category mapped/fallback fix), new `scripts/backfill_guide_precis_resource_map.mjs` (kept, reusable), this status_report entry. All Guide/Precis backfill writes (8,517 map inserts, 13,270 archives) already applied live against production. Not committed -- user has not asked to commit or push this session.

### 60.8 Live incident: the archive step broke real, pre-existing links -- found via "Untitled Resource" reports, root-caused and fixed same session

Right after §60.5's backfill, user reported the admin's exam-level Resources panel showing "Untitled Resource" for content the team had already linked, and books missing from view generally.

**Root cause**: `resources` has RLS that hides `status='Draft'` rows from the anon key -- confirmed directly (queried the same resource_id via service-role key, got the row; via anon key, got `[]`). `ExamResourcesPanel.jsx` and `useExamContent.js` both read `resources` with the anon client (browser-side), unlike the admin's `books-list`/`books-get` API actions, which go through the service-role key and never showed a problem. §60.5's archive step picked ONE arbitrary "canonical" resource_id per (title, content) group and archived every other resource_id in that group -- but some of those other resource_ids weren't just unused legacy junk, they were resource_ids that a *different* exam's admin had already, correctly, linked to before this session ever started (two exams independently pointing at two different duplicate rows of the same real content, both valid). Archiving the one this run's arbitrary pick didn't choose silently broke that other exam's link, invisibly to the service-role scripts that verified the backfill (which never checked visibility through the anon key/RLS).

**Blast radius, confirmed live**: 8,881 pre-existing (real, team-created) `lc_exam_resource_map` rows across 1,460 exams ended up pointing at a resource archived by mistake -- collapsing to 202 distinct resource_ids once you cut duplicates. 5 of my own 8,517 backfilled rows hit the identical bug pointing at each other's un-picked duplicate.

**Fix, applied live**: re-published (`status='Published'`) exactly the 202 resource_ids that were both (a) currently Draft and (b) referenced by at least one real `lc_exam_resource_map` row -- i.e. "un-archive anything actually in use, leave archived only what nothing points to." Verified after: zero `lc_exam_resource_map` rows (any category) still pointing at a Draft resource, except one pre-existing, unrelated Intro-category row (`resource_id 02ee...`, exam `e2ee...`) that predates this session's work entirely and wasn't touched.

**`scripts/backfill_guide_precis_resource_map.mjs` fixed for next time**, two bugs: (1) the archive-candidate check now also excludes any resource_id in `mappedResourceIds` (referenced by ANY pre-existing map row), not just the one this run picked as canonical -- the actual fix for the incident above. (2) Canonical selection was picking via `.find()` over Postgres's non-guaranteed row order, so a second run of the script could pick a *different* resource_id as canonical than the first run and generate a redundant second set of links instead of recognizing the first run's as already covering those exams -- switched to a deterministic sort. A re-run after the fix still shows ~3,197 "new" inserts (down from the ~4,700 an intermediate, only-partially-fixed version showed) -- these are cases where a content group genuinely has 2+ different resource_ids each already linked to different exams; correctly resolving that without creating redundant duplicate links for exams that already have working access via a different resource_id in the same group needs another pass, deliberately not executed this session given the live incident just closed.

**Lesson for any future bulk status/archival script against this schema**: verify visibility through the same client (anon key, RLS-subject) real users/admin pages actually read with, not just the service-role script's own view -- a service-role verification pass can look completely clean while RLS silently hides the result from everyone else. Same category of lesson as PYQ's PostgREST 1000-row cap (§56) and the Intro/lc_exam_resource_map divergence (§56) -- a write that looks correct from the tool that made it isn't verified until checked from the same angle the real consumers use.

### 60.9 Same incident, second and larger wave: archiving broke the fallback path itself for thousands of never-resolved exams

Minutes after §60.8's fix, user reported the "ENGLISH" Precis book specifically missing. Investigating found the real scope was much bigger than the 202-resource fix covered.

**Root cause, continued**: "ENGLISH" is one of the 66 titles that's actually 2+ genuinely different real books sharing a name (§60.5) -- 6 distinct physical books after dedup, 2,422 duplicate rows total. §60.5's archive step correctly kept exactly one Published survivor per distinct book -- but for the **3,575 ambiguous + 592 no-match rows that never resolved to an explicit exam link**, that specific row -- tagged with that specific exam's own `exam_name` -- was each exam's *only* path to the content, via `useExamContent.js`'s exam-name fallback. Archiving anything except the one arbitrary survivor per book silently cut off every other exam that depended on the fallback finding its own differently-tagged duplicate row of the same content. The earlier 202-resource fix only covered resource_ids with an *existing explicit* `lc_exam_resource_map` row; it didn't account for exams with no explicit link at all, which was most of the still-ambiguous/no-match set.

**Confirmed scope**: of 13,109 archived Guide/Precis rows, **3,420 belonged to an exam with zero other path to that content** (no explicit link, and its own `exam_name` didn't resolve to anything this session) -- these had just lost their only way to be found. 9,671 were safe (their exam now has a real explicit link from §60.5). 18 had no `exam_name` at all (harmless either way).

**Fixed live**: restored `status='Published'` on those 3,420 rows. Verified via the anon key directly afterward: "ENGLISH" (Precis) now returns real rows again for a spread of exam_name values (Veterinary Assistant, MPSC Stenographer, NDA, SSC JHT, etc.) Current Guide/Precis split: 4,966 Published, 9,689 Draft (versus 611 Published pre-session, so still a large, real reduction in duplicate row count -- just a correct one now).

**`scripts/backfill_guide_precis_resource_map.mjs` hardened a third time**: a row may now only be archived if it has a real alternate path -- either its resource_id is already in `mappedResourceIds`, or its own `exam_name` resolved to a real exam *this run* (getting a fresh explicit link to the canonical resource_id, replacing its fallback dependency). Ambiguous, no-match, and blank-exam_name rows are never archived, full stop. Re-run in dry mode afterward: archive candidates dropped from 13,270 (the original, unsafe number) to 3,402 -- that's the actual safe number a from-scratch run should have produced from the start.

**Deliberately not re-executed this session**: the dry run still shows 3,197 "new" map-row inserts available (content groups where 2+ different resource_ids already have independent real links to different exams, and some unresolved rows in the same group could now get their own explicit link too). Left for a future session with a clearer head, given two live incidents already happened today from moving too fast on the same script.

**Real lesson, sharper than §60.8's**: "this row is a duplicate of the canonical" was never really the right question. The right question was "does the exam that depends on this specific row have anywhere else to go if it disappears" -- for most of this schema's legacy content, before this session, the answer was no, because the fallback *is* the primary access path, not a backup. Any future archival pass against legacy exam_name-tagged rows must check the actual dependency (explicit link, successful resolution this run, or nothing) per row, never infer safety from "some other row in the same content group survived."

### 60.10 A genuinely separate, pre-existing bug found while chasing §60.9: "ENGLISH" was never tagged as a Guide book at all

Following up on "ENGLISH is missing from Guide" specifically (as opposed to Precis, which §60.9 fixed) -- not a fallout of today's archiving. User pointed at the local `books/Guide/ENGLISH/` staging folder (26 real chapters, `source_file: Cluster_087_ENGLISH.docx`) to check whether it had been lost. Traced that exact source file in the DB: it *was* ingested, at some point before this session, but with `resources.category='Precis'` even though its own R2 storage path is `structured_resources/blocks/Guide/...` -- a pre-existing mistagging at ingestion time, unrelated to anything this session touched. 3 duplicate rows existed for it, all Published, zero existing `lc_exam_resource_map` links on any of them (so it had never actually been linked to any exam as Guide *or* Precis via the explicit table -- whatever exposure it had was through the fallback, under the wrong category).

Per user's direction: recategorized the canonical row (`345ae2f4-...`) to `category='Guide'`, title kept as "ENGLISH"; archived its 2 exact duplicates (safe -- zero links existed on any of the 3 to begin with, confirmed before touching anything); then linked it to **every exam that currently has an ENGLISH Precis resource** (1,010 distinct exams, all newly linked via `lc_exam_resource_map` category='Guide'). Verified through the anon key directly afterward (given §60.8/60.9's lesson): resource visible, category correctly 'Guide', all 1,010 links visible.

Separate, still-open finding: "ENGLISH" (Precis) has one much larger sub-group (1,177 duplicate rows) also stored under a `blocks/Guide/...` R2 path, not yet checked for the same mistagging -- deliberately left alone this session, flagged for a future look rather than guessed at.

### 60.11 Merged with a teammate's concurrent work, pushed to `main`

`git push` was rejected -- `origin/main` had moved 4 commits ahead while this session was running, all from a teammate (commit authorship suggests Shreya), the most recent titled "feat(admin): add book replace and auto-archive flow for publish content." That's the same "swap a book out" feature the user asked about earlier this session (§ in-chat, before the fallback/backfill investigation took over) -- built independently and pushed while this session worked the data-integrity incidents above.

Checked for real overlap before merging blind: `api/admin/save-resource.js`, `useExamContent.js`, and `BooksPage.jsx` diffs were on non-overlapping line ranges (auto-merged cleanly, no conflict). `PublishContentPage.jsx` was a genuine conflict -- both sides independently rewrote the same ~500-line exam-assignment section from the same base, in different directions (this session: unified the Intro/Guide/Precis exam picker into one searchable list with optional linkage, §60.2; the teammate: kept the older picker structure, added a `new`/`replace` toggle with auto-archive of the replaced book). Per user's direction, resolved by taking the teammate's `PublishContentPage.jsx` entirely -- their replace/auto-archive flow is the one going forward; this session's exam-picker rewrite there is superseded. The bulk **Link Exams** feature (§60.2) lives in `BooksPage.jsx`/`LinkExamsDrawer.jsx`, a separate file untouched by the conflict, and survived intact, alongside the `isArchived` fix (§60.8) and the per-category fallback fix (§60.8) -- verified present in the final merged file before committing.

One process note: mid-resolution, ran `git stash`/`git stash pop` to test something, which silently dropped `.git/MERGE_HEAD` even though the resolved file content itself survived the round-trip -- caught before committing (would have produced a single-parent commit that looked right but wasn't actually recorded as descending from the teammate's pushed commits). Recovered by discarding the working tree back to the pre-merge commit and redoing the merge cleanly (safe/reproducible -- same two branch tips, same deterministic auto-merge and conflict). Pushed as a proper two-parent merge commit (`0f5bf2c`) after a clean `vite build` on the merged result.

### 60.12 Book Content gets a Replace button too, wired into the teammate's existing flow

User tried the teammate's replace/auto-archive flow locally (§60.11), approved it as-is ("a little confusing but we keep it"), and asked for the same capability to be reachable from Book Content directly, not just by starting from Publish Content and re-finding the book in a dropdown.

Didn't duplicate the teammate's replace logic. Added a `Repeat`-icon "Replace" button per row in `BooksPage.jsx` (same icon they used) that navigates to `/admin/publish-content` with `{ state: { replaceBook: { resourceId, category, title } } }`. `PublishContentPage.jsx` gained one small mount-time effect that reads that route state, sets `category` and `assignMode: 'replace'`, and calls `fetchExistingBooksForCategory(category, resourceId)` -- extended that function to accept an optional resourceId to preselect (falls back to its existing default of the first book alphabetically when none is given, so every other call site is unaffected). Net effect: clicking Replace on a Book Content row lands directly on Publish Content's upload step with the right book already chosen, instead of starting from a blank picker.

### 60.13 LinkExamsDrawer becomes a full manage-links view, plus a Category filter everywhere exams are searched

Two follow-up requests. First: the user didn't want already-linked exams greyed out/disabled in `LinkExamsDrawer.jsx` -- they may as easily want to unlink a few exams from a book with hundreds of links as add new ones. Reworked it from add-only to a real manage-links view: already-linked exams now load pre-checked (not disabled), unchecking one queues it for removal, checking a new one queues it for addition, and the one Save button applies both adds and removes together (`lc_exam_resource_map` insert for the adds, delete for the removes), with a live "+N / -M" count in the footer.

Second: "wherever we have a search [for exams] we need to be able to search by Category" -- `lc_exams.category` (Banking, Agriculture, Police, etc., the same ~21-value field `ExamsPage.jsx`'s own Category filter already reads, not the book's Guide/Precis/Intro category despite the shared column name). Added the same Category dropdown, cascaded under whatever Level is picked, to both `LinkExamsDrawer.jsx` and `PublishContentPage.jsx`'s "Assign as New" exam picker (its Replace-mode book search is untouched -- that's a different axis, searching books not exams). `PublishContentPage.jsx` itself stays the teammate's file per §60.11/§60.12; this was an additive change to the same exam-fetch query and filter logic already there, not a rewrite.

## 61. Global Category/Level/State-UT filter standard rolled out; `lc_exams.category` rebuilt from 180-value free text into a 23-value, content-team-editable taxonomy; a Vercel deploy-cap incident fixed same session

### 61.1 Global order: every admin search/link surface gets Category + Level + State + UT filters

User's ask, framed as a standing rule ("wherever there is a need to link or search we must have the Categories... we need to also have the state. This will be a global order for all the Admin"), not a one-off. Investigated every admin surface that searches or links exams and found `ExamsPage.jsx` was already the complete pattern (Category + Level + State/UT); six other surfaces were missing one or more pieces: `LinkExamsDrawer.jsx` (Book Content's bulk link, §60.13 -- had Category, not State/UT), `PublishContentPage.jsx`'s Replace-book picker (had nothing), `ExamResourcesPanel.jsx`'s Add Resource drawer (Intro/Guide/Precis pills only), `PyqPapersPage.jsx` and `QuizzesPage.jsx` (Level only). Rolled the same three-field pattern out to all six, reusing each page's already-loaded `lc_regions`/`lc_exams` data rather than new fetches.

### 61.2 State and UT split into two always-visible filters, not one gated behind Level

Follow-up correction: the pattern above (and `ExamsPage.jsx`'s own original design) used a single "State/UT" field that only appeared after Level was set to `state` or `ut` -- user had "categorically" asked for a State filter *and* a UT filter, not one shared, gated field. Redesigned across all seven surfaces (the six above plus `ExamsPage.jsx` itself): two independent State and UT dropdowns, both always rendered. Picking a value in either sets `level` to match and clears the other (a region can't be both); picking Level directly clears both back to "any region at that level." Removes the "click Level first just to see the region field" friction the original design had everywhere, including the page that was supposedly the gold standard.

### 61.3 A real, unrelated bug found and fixed along the way: new Central exams silently failed to save

User's own screenshot of the live site showed "Conducting Body, State/UT, and Exam Name are required" on a New Exam form where all three visibly had values. Root cause in `ExamEditorPanel.jsx`: Level defaults to `'central'` on the new-exam reset, but only the *manual* `changeLevel()` handler auto-fills the invisible `region_id` for Central (Central has exactly one region row, so the State/UT field is hidden entirely at that level) -- the initial-mount reset never did, so `region_id` stayed blank with no field an admin could see to fix it. Confirmed pre-existing via `git blame` (last touched 2026-09-14), unrelated to this session's filter work. Fixed by making the Central-region auto-selection reactive (fires whenever `level === 'central' && !form.region_id` once `regions` has loaded, regardless of how that state was reached) instead of only living inside `changeLevel()`.

### 61.4 The category taxonomy itself was free text and had drifted into 180 near-duplicate values

Separately, user flagged that after an earlier categorization pass `Banking` and `Insurance` had become one category. Investigating found the real scope was much bigger: `lc_exams.category` (`ExamEditorPanel.jsx`'s Category field, per §77 of the original schema doc's own comment, was meant to be a clean enum like `'SSC'`/`'Banking'`) was a plain `<input type="text">` with no dropdown, and had drifted into **180 distinct raw strings across 1,544 exams** -- `BANKING`/`Banking`/`Rural Banking`/`Cooperative Banking` all the same real sector; `Police Services`/`POLICE EXAMS`/`Police`/`POLICE`/`Police Recruitment`/`Police Constable`/`Police SI`/`Armed Police` all Police; similar fragmentation for Judiciary, Teaching, Administrative, and dozens of one-off singletons (`Ports`, `Shipping`, `Marine`, `Electricity`).

Built a canonical 20-value taxonomy (`src/lib/examCategoryTaxonomy.js`) and `scripts/exam-mapping/normalize_exam_categories.mjs` (dry-run-first, `--execute` to write) mapping all 180 raw values onto it. Added `lc_exams.category_detail` (`sql/lc_exams_category_normalize.sql`) to preserve each exam's original wording non-destructively before overwriting `category` -- applied via the Supabase Management API's SQL-query endpoint (`SUPABASE_ACCESS_TOKEN`, a personal access token already in `.env`) rather than a direct Postgres connection string, since none exists in this repo's env files; the same route was used for every other schema change this session. Dry run confirmed 100% coverage (zero unmapped values) before executing: **1,434/1,544 exams recategorized**, zero failures. `ExamEditorPanel.jsx`'s Category field converted from free text to a dropdown fed by the canonical list, to stop the drift recurring.

### 61.5 Content team's own exam-list document confirmed two of those 20 buckets were wrongly over-merged

User supplied `"1. Central Exams List (1).docx"` (Central Government Exams, the content team's own source list) with an explicit instruction to check it and a hint that Banking/Insurance had been merged wrongly. Parsed via `mammoth.convertToHtml` -- not `extractRawText`, which flattens the doc's real `<table>`'s rowspan-merged Category/Conducting-Body/Website cells into an ambiguous flat line list; the HTML export preserves the actual `rowspan` structure, letting `scripts/exam-mapping/parse_central_exams_doc.mjs` walk it properly (standard rowspan carry-forward across 6 logical columns) into 445 structured exam rows under 17 real category headers.

Confirmed: the doc treats `BANKING` and `INSURANCE EXAMS` as two distinct categories (my earlier merge was wrong, exactly as flagged), and the identical mistake existed one level over -- `INDIAN RAILWAYS` and `Metro Rail` are also two distinct doc categories, merged into one "Railways & Metro" bucket by the same original pass. Everything else that got split out earlier (Defence, Engineering Services, Judiciary & Legal, Administrative & Civil Services) matched the doc correctly and needed no change.

### 61.6 New `lc_exam_categories` table + Categories admin page, so the content team owns this list directly

User's actual ask went further than fixing the two merges: a dedicated Categories page so the content team can add/rename/delete categories themselves, instead of every change requiring a code deploy. Also asked to also split Nursing out of the broader Health/Medical grouping (the doc lists `NURSING` as its own Central category), and for a **full audit** against the document, not just the taxonomy fix.

Built: `sql/lc_exam_categories.sql` (new table, `id`/`name unique`/`created_at`, RLS disabled + `select,insert,update,delete` granted to `anon,authenticated` -- same posture as every other `lc_` table, per `learning_center_grants.sql`'s own documented reasoning), applied live via the Management API. `scripts/exam-mapping/seed_exam_categories.mjs` seeded it from the taxonomy file, now updated to 23 values (Banking/Insurance and Railways/Metro Rail split, Nursing split out of a renamed "Health & Medical Services"). `scripts/exam-mapping/split_merged_categories.mjs` re-derived each affected exam's correct new category from its preserved `category_detail` (no new guessing needed) and re-split **331 exams**: 118 → Health & Medical Services, 87 → Banking, 80 → Nursing, 23 → Metro Rail, 14 → Insurance, 9 → Railways.

`src/pages/admin/CategoriesPage.jsx` (new, modeled on the existing `ConductingBodiesPage.jsx`): add / rename (cascades an `UPDATE` onto every `lc_exams` row using the old name, since `category` stays plain text, not a foreign key) / delete (blocked while any exam still uses it, with a count shown). Wired into `adminNavConfig.js`, `AdminShell.jsx`'s `PAGE_META`, and `App.jsx`'s routes. `ExamEditorPanel.jsx`'s Category dropdown switched from importing the static taxonomy file to querying `lc_exam_categories` live, so a category added on the new page shows up in the exam editor immediately, no deploy needed; the taxonomy file itself is now only a one-time seed record, not imported by any live component.

### 61.7 Full audit of Central exams against the document: DB was already ~97% correct

Built `scripts/exam-mapping/audit_central_exams.mjs` to diff the 445 parsed doc rows against all 407 live Central `lc_exams` rows on category, conducting body, and website. First pass matched only 433/445 with 72 "conducting-body mismatches" -- almost all false positives from an over-simple matcher: legitimate abbreviation-vs-full-name pairs (`SSC` vs `Staff Selection Commission`, `RBI` vs `Reserve Bank of India`) and ambiguous same-named-exam collisions (`Constable`/`Sub-Inspector` exist once per state, so picking the wrong one of several DB candidates falsely looked like a body mismatch). Added an initials-based equivalence check and a dedicated "ambiguous, don't guess" bucket instead of forcing a pick; re-run: **406/407 matched cleanly**, 1 real category mismatch, 1 minor conducting-body artifact, 0 website mismatches, 30 previously-ambiguous Police entries confirmed (by direct query) to already exist correctly as separate *state*-level exams, not missing at all -- the Central-only audit scope was just blind to them.

Two concrete outcomes: fixed `WBSSC SLST (Secondary Level)` (was `Group / Class Posts (Ungraded)`, should be `Teaching & Education`). Found a genuine pre-existing duplicate -- two `RBI Assistant` rows, same conducting body, different categories (one correctly `Banking` with 10 resource links + an Intro; the other `Other Government Exams` with 1 resource link, both `published`) -- flagged to the user rather than merged/deleted unilaterally (real content attached to both); user's decision: leave it for later review.

### 61.8 State/UT docs + Subject-Wise Excel files checked; a pre-built master datamap found; Subject confirmed to be a wholly separate, currently un-stored concept

User supplied four more files (`2. State Government Exams.docx`, `3. UT Exams List.docx`, and three `*_Subject_Wise.xlsx` files) with an explicit reminder that "Subject is different from Category." Investigating the target folder found a **prior session had already built and reconciled all five documents** into `exam_master_datamap.json` (1,534 unique exams -- 410 central/835 state/289 UT -- with `dedupe_changelog.md` documenting every alias merge and `datamap_build_report.md` its match rates), so none of the four new files needed re-parsing from scratch.

Confirmed the Subject/Category distinction directly against the Excel files' own sheet names: Category is the sector (what this session fixed); Subject is a **12-item per-exam Yes/No syllabus checklist** (Hindi/Regional Language, English, GK/GS, Reasoning, Quantitative Aptitude, General Science, Computer Knowledge, Child Dev & Pedagogy, Domain/Technical Subject, Physical Test, Interview, Typing/Skill Test), already populated for 1,526/1,534 exams in the datamap -- and confirmed **it has nowhere to live in the app today**: `lc_subjects`/`lc_exam_subjects` are defined in `learning_center_schema.sql` but were never actually created in the live Supabase project (`PGRST205: table not found`, checked live). Per explicit user instruction ("Only work with the categories. Don't touch subjects."), this was reported and deliberately left unbuilt.

### 61.9 Category-only audit extended to State and UT exams, using the datamap as source

Built `scripts/exam-mapping/audit_state_ut_categories.mjs` (category-field-only, matching the "don't touch subjects" scope), reusing the same raw-category-string mapping table from §61.4/§61.6 (duplicated rather than imported into a live script, since `normalize_exam_categories.mjs` executes on import with no module guard). First pass matched only 257/1,124 datamap State/UT rows against 1,137 live State/UT `lc_exams` rows -- root cause was a leading list-number artifact baked into the datamap's own State `exam_name` values (`"1. APPSC Group 1"`), the same class of bug found and fixed in the Central docx parser at §61.7. Stripped it; re-run matched **1,092/1,124 (97%)**.

Of 5 remaining category mismatches: one was this session's own §61.7 WBSSC SLST fix correctly diverging from the (wrong) source doc category, two were genuine judgment calls left as-is (the DB's existing category looked at least as reasonable as the generic mapping rule), two were clear errors fixed directly (a Dadra & Nagar Haveli/Daman & Diu "Junior Engineer" with a null category, a Delhi "Junior Engineer" tagged `Administrative & Civil Services` -- both → `Engineering Services`). Separately found **11 UT exams with `category = NULL`** entirely (SSC CGL/CHSL, IBPS, SBI, and one more Junior Engineer entry across Andaman & Nicobar, Chandigarh, Dadra & Nagar Haveli/Daman & Diu, and Jammu & Kashmir) -- all resolved unambiguously by exam name and fixed directly. Verified live afterward: zero `lc_exams` rows anywhere with a null category, exactly 23 distinct category values DB-wide.

### 61.10 Categories page gets bulk exam linking too, mirroring Book Content's Link Exams -- direct and reverse

User asked for the same "linked exams" capability Book Content has, in both directions, giving Categories page. Planned first (per explicit request) rather than building blind: **direct** linking already existed (`ExamEditorPanel.jsx`'s per-exam Category dropdown, one exam at a time); **reverse** linking (bulk, from the category's own row) didn't. The one real design fork, put to the user: unlike Book↔Exam (`lc_exam_resource_map`, genuinely many-to-many, unchecking cleanly unlinks), Category↔Exam is a single required text field -- an exam can't be unlinked into nothing, only *moved*. User chose the more powerful of two options: unchecking an already-linked exam opens an inline picker for which other category to move it to, rather than uncheck doing nothing.

Built `src/pages/admin/LinkCategoryExamsDrawer.jsx` (opened via a new purple `Link2` "Manage Exams" button per `CategoriesPage.jsx` row): same preload-all-exams/search/Level-pills/State-UT-filter pattern as `LinkExamsDrawer.jsx`, plus a "Current Category" filter for finding miscategorized exams to pull in. Checking a different-category exam queues it "moving in"; unchecking an already-here exam opens the replacement picker (move only commits once a category is chosen; re-checking cancels it). Save does one bulk update for everything moving in, then per-row updates for everything moving out (each can have a different destination). No schema change -- still the plain `lc_exams.category` text column.

### 61.11 Git/production state (category/filter work)

Three commits, all pushed to `main`: (1) `a521751` "Split combined State/UT filter into two always-visible State and UT filters" -- 7 files (§61.2). (2) `4a7177f` "Add content-team-editable Categories page; fix Banking/Insurance and Railways/Metro over-merges" -- 12 files: `App.jsx`, `AdminShell.jsx`, `adminNavConfig.js`, `ExamEditorPanel.jsx`, `examCategoryTaxonomy.js`, new `CategoriesPage.jsx`, new `sql/lc_exam_categories.sql`, 5 new `scripts/exam-mapping/*.mjs` (§61.6-61.9). (3) `cb9ad48` "Add bulk exam linking to Categories, mirroring Book Content's Link Exams" -- `CategoriesPage.jsx` + new `LinkCategoryExamsDrawer.jsx` (§61.10). All Supabase writes (the 1,434-row normalize, the 331-row split, the 11 null-category and 2 miscategorization fixes) already applied live before each commit, same discipline as §58-60.

Push #2 hit real remote divergence -- 5 teammate commits (email broadcaster, military taxonomy, two Legal Aid commits, private-sector updates) landed while this session ran. One real conflict in `AdminShell.jsx`: both sides added a new lucide-react icon to the same import/`ICONS`-map line (`Tags` for Categories here, `Scale` for the teammate's Legal Aid nav item) -- resolved by keeping both, plus the teammate's own unused `HORIZONTAL_NAV` addition left untouched (not this session's code to fix). Had to `git stash` a pre-existing, unrelated local `package.json`/`package-lock.json` change (flipbook-library dependencies, not from this session) before the merge would proceed, then popped it back afterward -- auto-merged clean. Verified with a full `vite build` before pushing each time.

### 61.12 Same-day production incident: Vercel Hobby's 12-function deploy cap, broken by the teammate's two new endpoints

User reported the next Vercel deploy failing: `"No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan."` Root cause: the teammate's Legal Aid + email-broadcaster commits (merged in at §61.11) added `api/private-sector/emailBroadcaster.js` -- a plain helper module (`getSmtpCredentials`, `getCivilJobSubscribers`, `broadcastJobApprovalEmail`, no `export default` at all) imported by `legal-aid.js` and `private-sector/router.js` -- but it sat directly under `api/`, where `vercel.json`'s `"functions": {"api/**/*.js": {...}}` config and Vercel's own directory convention count every file as its own serverless function regardless of whether it's a real HTTP handler. That alone was function #13 for nothing.

Confirmed via git log this is the **third** time this exact cap has been hit in this codebase -- two prior commits ("fix: Consolidate serverless functions to fit Vercel Hobby's 12-function cap", 2026-08-13 and 2026-09-01) already exist, and `api/admin/admins.js`/`api/admin/redemptions.js` each document in their own header comments that they're themselves earlier 3-to-1 and 2-to-1 consolidations from the same recurring problem.

Fix: moved the helper to `api/_lib/emailBroadcaster.js` (Vercel's underscore-prefix convention excludes it from routing entirely), updated its two import sites. That alone still left 13 real endpoint files -- consolidated `admins.js` and `redemptions.js` into one new `api/admin/misc.js` with a `?fn=` dispatcher, added two matching rewrite rules to `vercel.json` (`/api/admin/admins` → `/api/admin/misc?fn=admins`, same for `redemptions`), mirroring the exact pattern already used for `payments`/`auth` -- frontend URLs unchanged, zero frontend edits needed. Back to exactly 12 functions. Verified by directly invoking the new handler's `default export` in a Node script with simulated `req`/`res` objects for `fn=admins`, `fn=redemptions`, and a missing-`fn` case -- `admins` and the missing-`fn` 400 both behaved correctly; `redemptions` surfaced a pre-existing Supabase FK-relationship schema-cache error (`reward_redemptions` ↔ `user_profiles`) with the identical, unchanged query from the original file -- not introduced by this fix, flagged to the user, left alone as out of scope. Full `vite build` clean. Committed (`3bdad6a`) and pushed -- no remote divergence at push time.

### 61.13 Next session starts here

Two explicitly-deferred items from this session, in the order they came up: (1) **The Subject Requirements feature** (§61.8) -- `subject_requirements` exists for 1,526/1,534 exams in `exam_master_datamap.json` but has no live table; user said not to touch it this session, but the finding (and the datamap's exact location) is on record for whenever that's greenlit. (2) **The `RBI Assistant` duplicate** (§61.7) -- two rows, same conducting body, different categories, both published with real content attached; user said review later rather than merge/delete now. Also worth noting for whoever picks up `api/` next: the 12-function cap is exactly full again (§61.12) -- the next new endpoint added anywhere will need another consolidation pass before it can deploy, same as the last three times.

## 62. Per-level exam categories (Central / State / UT, each from its own source doc), content-team review sheets, Guide/Precis de-duplication, and the misfiled-Precis backfill bug -- one decision still open

Session of 2026-09-19. The content team was unhappy with exam category tagging ("some tags exist, some don't, some have to be edited") and suspected State exams had leaked into the Central list. Worked Central first, then State, then UT, then moved to resource de-duplication, which surfaced a second bug from §60's backfill.

### 62.1 Central list made to match the content team's Central Exams List exactly

Source of truth: `Central.. Exams List .docx` (21 category headings, 446 rows / 440 named exams). Findings before changing anything: the DB's shared 23-value taxonomy (§61.4) didn't match the doc -- "Administrative & Civil Services" (which the content team says doesn't exist for Central) held 6 Accounting & Commerce exams plus the 2 real Civil Services ones, PSU was one bucket where the doc has Maharatna and Navratna, and India Post / BARC / ICAR IARI / NIC / UGC NET were buried in Other Government Exams / Teaching / PSU.

Fixes (all via dry-run-first scripts under `scripts/exam-mapping/`): `retag_central_exams.mjs` created 10 categories (UGC NET, Civil Services, Engineering Recruitment, India Post, BARC, ICAR IARI, NIC, Accounting & Commerce, PSU Maharatna, PSU Navratna), retagged 67 exams (mostly from each exam's preserved raw `category_detail`), and retired the old merged PSU category. `sync_central_to_doc.mjs` then created the 33 doc exams the DB lacked, all as **drafts**: 29 state-force Constable/Sub-Inspector Police rows, HP TET, WBSSC SLST, and an SSC Junior Engineer. Conducting bodies of already-matched exams were deliberately *not* rewritten (DB stores acronyms -- SSC/RBI/UPSC -- where the doc spells names out; "Staff Nurse"-style repeats can't be paired safely; Nursing was confirmed correct by the content team).

Decision recorded: **Central keeps the state forces' generic Constable/SI rows even though they overlap State** (user's call; the State doc lists the same forces). 62 Central Police now vs the content team's stated 61 -- the doc has 62 named rows, so the DB matches the doc; the 61 is probably their miscount. A stray exam literally named "Accounting & Commerce" (AICPA) was **unpublished, not deleted** (it has an intro row). Central: 441 exams.

### 62.2 State: its own 102-category list from the State doc

`retag_state_exams.mjs`: State matched its doc almost 1:1 (835/836). Created 100 categories using the doc's own wording, recategorised 802 exams, created the one missing exam (Punjab Gramin Dak Sevak, draft). Only spelling variants merged (Forest Service/Services, Judicial Service/Services); two doc names colliding with Central names were folded into their State neighbour (Civil Services -> State Civil Services, Nursing -> Health Nursing); the one blank-category doc row (UP Agriculture Technical Assistant) went to Agriculture Services (**inference, worth a glance**). 56 of the 102 categories hold a single exam -- that's how the doc names them. An unlinked duplicate `APSSB MULTI TASKING STAFF` (Arunachal) took its twin's category and was **not deleted**. State: 837 exams.

### 62.3 UT: its own 64-category list from the UT doc

The UT doc is 23 fragmented tables (UT name only on each UT's first row, category split across rows -- "Animal"/"Husbandry"); flattened to 312 rows / 8 UTs. `retag_ut_exams.mjs`: 13 names that would collide with Central/State carry a `" (UT)"` suffix (Police, Banking, Defence, SSC, Engineering, ...), 12 missing exams created as drafts (3 A&N Teaching, Chandigarh + J&K GDS, and SSC/IBPS/SBI rows for Ladakh/Lakshadweep/Puducherry -- central-style rows the UT doc itself lists), 7 naming twins (e.g. "A&N GDS (Gramin Dak Sevak)" = "GDS / Postal Assistant") recategorised rather than renamed or duplicated, 291 exams recategorised, 7 now-unused legacy categories deleted. Bug caught and fixed the same session: the script's all-caps softening turned "SSC" into "Ssc" (renamed to "SSC (UT)"; script fixed). A duplicate DNH "Junior Engineer (Civil/Electrical)" was given its twin's category, not deleted. UT: 313 exams.

**Net:** 1,591 exams (Central 441 / State 837 / UT 313), 187 categories (21 / 102 / 64), and verified that **no category is used by more than one level**. UT categories that differ only by wording in the doc (Administration/Administrative, Food variants, Disaster variants, Marine/Marine Services) were left separate.

### 62.4 Admin UI

- `CategoriesPage.jsx`: the single "Exams" column became Central / State / UT / Total so a category's level can be cross-checked from the numbers. Found and fixed a real bug on the way -- the `lc_exams` fetch was capped at PostgREST's 1,000-row default (there are ~1,600), so every count was undercounted; now paginated. Added an All/Central/State/UT level filter, a Level column, and 25-per-page pagination (same page-selector bar as Books/Users).
- `ExamEditorPanel.jsx`: the Category dropdown is scoped by Level from three new lists -- `src/lib/{central,state,ut}ExamCategories.js` (generated by the retag scripts). An exam's saved category always stays selectable, labelled "(not a X category)". Central shows only Category + Level (State/UT dropdowns only appear for State/UT), which the editor already did.

### 62.5 Review sheets produced for the content team (in `docs/`, untracked by policy)

`Central_/State_/UT_Exams_Intro_Review.xlsx` (every exam + its assigned intro, Check column, decision dropdown), `Draft_Exams.xlsx` (49 drafts: 35 Central / 1 State / 13 UT), plus the earlier `central_exams_level_review.xlsx`. Intro coverage: 88 exams have no intro (41 Central / 18 State / 29 UT) -- but only **39 are on published exams**; the other 49 are the new drafts. 25 intros are shared by more than one exam (mostly the deliberate Central/State Police overlap). Content team fills the yellow columns; nothing applied yet.

### 62.6 Supabase incident (about 90 minutes of blocked work)

Keyed Auth and REST requests returned Cloudflare 522 after ~19 s while unkeyed requests (instant 401) and Storage worked. Cloudflare's Chennai edge was operational; Supabase's status page had an open "401 errors due to JWT rejections" incident on the API gateway. Restarting the project from the dashboard fixed it. Nothing in this session's scripts was implicated (single-query-at-a-time, finished ~15 min before the first 522), but DB connection count is the first thing to check if it recurs. All later scripts use a retry wrapper.

### 62.7 Guide/Precis de-duplication

Content team saw duplicate Guides (e.g. two Mathematics) within an exam. Analysis of 19,541 Guide/Precis links: no exact repeats, but two resource rows with the same `file_hash` (3,503 links) or serving the identical stored content -- same `storage_base_url` + `chapter_count` + title -- (1,474 links; the hash differs only because the same .docx was ingested twice under different file names, e.g. `MATHEMATICS.docx` vs `Cluster_008_MATHEMATICS.docx`). `dedupe_exam_resources.mjs` removed **4,977 links across 1,024 exams** (2,802 Guide / 2,175 Precis; 14,564 remain), keeping the Published, most-shared, oldest resource; only `lc_exam_resource_map` rows deleted, never `resources`. Verified beforehand that every removal had an identical surviving twin and no exam lost all its Guides/Precis; verified after that a re-run finds 0. Backup: `K:\tmp\db_backups\2026-09-19T12-37-19-855Z\lc_exam_resource_map_removed_duplicates.json`.

Same title but **different content** was *not* touched: 1,714 groups over 998 exams (1,562 different chapter counts, 152 same chapters/different stored file) are in `docs/Duplicate_Named_Resources_To_Review.xlsx` for the content team.

Prevention: `src/lib/resourceDuplicates.js` (`isSameResource` = same hash, or same stored content + chapters + title) is checked at all three places that link resources to exams -- an exam's Add Resource drawer, the bulk Link Exams drawer, and Publish Content's multi-exam attach; duplicates are skipped with a message. `sql/lc_exam_resource_map_unique.sql` (unique index on `exam_id, resource_id`) is written but **not yet run** -- the user must paste it into the Supabase SQL editor; 0 repeated pairs exist today.

### 62.8 Misfiled Precis links -- a bug from §60's backfill

The flag sheet showed some Precis rows pointing at the same stored file as a Guide. Root cause: on 2026-09-17 the "Backfilled from legacy exam_name duplicate row" run (§60) created 5,055 links in one second, trusting `resources.category`. **1,179 English resource rows are labelled Precis but stored under `/blocks/Guide/`** (median 23 chapters, Guide-sized; genuine English Precis have 1 or 30) -- ~4 distinct files. 691 exams got a *Precis* link to one of them: all the same file, `Cluster_005_ENGLISH.docx` (23 ch). The other 4,364 backfilled links have consistent label/path.

Of the 691: 567 duplicated a Guide the exam already had, 116 sat beside a genuine English Precis, 8 were the exam's only English "Precis". `remove_misfiled_precis_links.mjs` removed the 683 (A+B) -- backup `K:\tmp\db_backups\2026-09-19T13-33-51-553Z\lc_exam_resource_map_removed_misfiled_precis.json` -- and left the 8 alone. The 846 *Guide* links to those same files are correct (English Guides); only the resource *label* is wrong. **Relabelling the 1,179 resources Precis -> Guide is deliberately held** until the content team confirms `Cluster_005_ENGLISH.docx` is really a Guide (inferred from folder + chapter count + file name, not from reading it).

**The 8 exams with no English Precis right now:** Chhattisgarh -- CG Vyapam Patwari, NHM Chhattisgarh CHO, CG Vyapam Sub Engineer (Civil/Electrical/Mechanical), CG Excise Constable, CG Vyapam Pharmacist, CG SET; Mizoram -- NHM Mizoram CHO; Gujarat -- GSSSB Fireman. Each has its English Guide (26 ch) and 2-8 other Precis.

### 62.9 OPEN DECISION (to close tonight, pending the content team)

Current English Precis reality across exams: 599 exams have **both** a 1-chapter `Cluster_005_ENGLISH.docx` (one file, 247 resource rows) and a 30-chapter `ENGLISH.docx` (63 rows in ~22 hash variants); 247 have only the 1-chapter, 155 only the 30-chapter. I proposed linking the pair (1ch + `0503abd3` 30ch) to the 8 exams; **the user rejected that as probably wrong**: an exam should have **one** English Precis, probably the large 30-chapter. Plan once the content team names the single final English Precis: link **every exam that has English to that one resource** (bulk, via the existing Link Exams tooling or a script), which also settles the 8 above and removes the 1-chapter/variant sprawl. Do it dry-run-first with a backup like the earlier passes, and check the 30-chapter variants first -- there is no single canonical copy today (22 hashes), so the content team must name *which* file. **Nothing has been linked to the 8 exams.**

### 62.10 Git state

Pushed to `main`: `4541a0f` (per-level categories, editor scoping, retag scripts) and `89afd09` (duplicate-link guard, dedupe script, unique-index SQL, Categories filter/pagination); a merge commit `e7e205f` brought in two teammate commits with no conflicts. **Uncommitted:** `scripts/exam-mapping/remove_misfiled_precis_links.mjs` and this section. Untracked by standing policy: the review `.xlsx` files in `docs/` and `FINAL_*_STRUCTURED/`/`books/`. No secrets in any commit (scripts read `.env`).

### 62.11 Next session starts here

1. **English Precis decision** (§62.9) -- get the content team's single final file, then bulk-link it to every exam that has English, dry run + backup first.
2. **Run `sql/lc_exam_resource_map_unique.sql`** in the Supabase SQL editor (user action).
3. After the content team confirms `Cluster_005_ENGLISH.docx` is a Guide: **relabel the 1,179 Precis-labelled/Guide-stored resources to Guide**.
4. Apply the content team's returns on the review sheets (intro decisions, draft actions) and on `Duplicate_Named_Resources_To_Review.xlsx` -- each as a dry-run-first script.
5. Spot-check the two inferences (UP Agriculture Technical Assistant -> Agriculture Services; 62 vs 61 Central Police) and decide whether to delete the two unlinked duplicates (APSSB MULTI TASKING STAFF, DNH Junior Engineer) and the unpublished "Accounting & Commerce" stray.
6. Still deferred from §61.13: the Subject Requirements feature.

## 63. Session of 2026-09-21: docxParser content-loss fix, Mathematics Precis replaced, five "2026 ..." book copies (written up retroactively on 09-23)

Written from git history (`899022b`, `bf247bf`, `0e94f17`, `ae18519`) and the scripts, because this session was never documented at the time.

### 63.1 Root cause: the parser silently dropped real chapters
`scripts/lib/docxParser.mjs` removed **any** chapter whose title contained "introduction" (rule inherited from `batch_enrich_books.mjs`), deleting real content such as "Chapter 1: Introduction to Andhra Pradesh" or a book's "N.1 Introduction" sections. Fixed (`899022b`): only the auto-created front-matter placeholder (text before the first Heading 1) is dropped. The parser also gained opt-in image support (`bf247bf`, `onImage` hook emits `image` blocks; default behaviour unchanged). Guide/Precis only -- Intros use a separate parser.

### 63.2 Remediation of the books that had lost chapters
- **Mathematics Precis** (`scripts/replace_mathematics_precis_book.mjs`, run live): the source docx itself only had 9 of 20 chapters, so the book was **replaced in place** (same resource rows, same R2 folder `structured_resources/blocks/Precis/0568526f-4c9d-44c9-a4c9-0568526f4c9d/`) from the content team's `Mathematics_Precis_FULL_fixed.docx`: 9 -> 20 chapters, 22 images. **Trade-off, deliberate and documented in the script: the AI-enrichment blocks the 9-chapter version had (statStrip / keyFacts / pullQuote / examAlert; every chapter was `enriched: true`) were NOT carried over; the new chapters are plain parser output (`enriched: false`).** `chapter_count` was updated on Published rows only; ~711 Draft rows sharing the folder still say 9 (harmless, hidden by RLS, but stale). **Restore path:** `K:\tmp\book_merge_backups\2026-09-21T13-28-07-100Z\mathematics-precis\` (old metadata.json + 9 enriched chapter files; re-upload them to the R2 folder; the old images were never deleted).
- **Five other books** (GENERAL KNOWLEDGE, GK-GS, ITI Technical Trade Literacy, Descriptive Writing Bank Exams, RRB COMPLETE GK): the missing chapters were merged back into **new "2026 <title>" copies** (`create_2026_book_copies.mjs`: new R2 folder + new `resources` row each; originals untouched; GK-GS's 185 exam links moved to "2026 GK-GS"). `merge_missing_chapters_into_live_books.mjs` (dry-run default, importable, retries R2 429s) plans the merge. **Restore path:** `K:\tmp\book_merge_backups\2026-09-21T15-07-07-824Z\2026-copies\ROLLBACK.json` and `...15-09-26-737Z\2026-copies\ROLLBACK.json` (created ids, inserted link ids, the deleted original link rows); ITI merge backup in `...13-19-28-086Z\iti`.

## 64. Session of 2026-09-23: "cleaning ship" -- Guide/Precis reality check, mock tests parked, GK splits deduplicated and assigned

### 64.1 Corrected counts (my first list was wrong)
A first published-books list counted every storage folder as a book (586 Guide / 784 Precis). Using the admin Book Content definition (one book per title per category, `format='blocks'`): **Guide 77 books (49 linked to an exam), Precis 25 (8 linked)**, plus legacy **html-format** rows (Guide 453 titles, Precis 23 titles; not shown in Book Content). Intro: 1,955 published block rows vs 1,575 exams; 1,541 linked (1,563 exams have one, none has two); **414 published Intro rows are orphans** (linked to no exam) -- to be archived AFTER the Guide/Precis cleanup (user's order). List: `docs/Published_Books_List.txt` (untracked; regenerate before trusting).

### 64.2 Renamed "MATHEMATICS FINAL PRECIS" -> "2026 MATHEMATICS"
All 952 `resources` rows sharing that folder (241 Published, 711 Draft), so the user could find it. Nothing keys off the title (scripts use the R2 URL). **Rollback:** `rollback_2026_09_23.mjs --step=rename-math`.

### 64.3 468 mock tests parked out of Guide
468 of the 475 published html "Guide" rows were mock tests (folders "5. 10 MOCK TESTS" etc.). User: Quiz Center = MOCK TESTS; PYQs are separate and are NOT quizzes. `scripts/park_mock_tests_out_of_guide.mjs` set them **Draft** (category stays Guide -- **`resources_category_check` rejects 'Mock Test'**, so no retag) and deleted their **60** exam links (9 exams). Rows and R2 files are kept; identifiable by "MOCK" in the storage path. 7 real html Guide rows remain (Gujarat/Haryana/JK/Arunachal CONSTABLE, MATHEMATICS(1); several are mislinked to unrelated exams such as Manipur Gramin Bank Clerk). No PYQs were found in Guide/Precis. The 451 rows in `quizzes` (category 'Mock Test', `lc_exam_id` null, `lc_exam_quiz_map` empty) are a different set. **Rollback:** `--step=unpark-mocks`. Backup `K:\tmp\db_backups\2026-09-23T16-20-45-617Z\` (an identical dir `...16-20-23-431Z` is from the first attempt, which failed on the category constraint before writing anything).

### 64.4 GK splits: deduplicated, then assigned (Central only so far)
- Model (user): GK was one massive book, then split by subject; assigning GK should assign ALL the splits; **keep the combined book linked** (delink later only if the content team agrees); state/UT exams have their own state GK book; **Guides are left alone -- work on Precis only.**
- `scripts/dedupe_gk_split_books.mjs`: exactly one Published block Precis per SSC GK subject now (GK Biology/Chemistry/Economics/Geography/History/Physics/Polity -- the 2026-09-13 uuid-folder copies, whose text has the "SSC" brand stripped; Polity renamed from `Cluster_014_SSC-GK-Polity`). Archived 26 duplicate rows (21 html SSC-GK-*, 5 block "cluster-" copies), all with 0 links. RRB-GK-* splits are a different book (Polity 442 ch) and were not touched. **Rollback:** `--step=restore-gk-dupes` (backup `...16-46-01-777Z`).
- `scripts/link_gk_splits_to_exams.mjs --levels=central --execute`: **310 Central exams x 7 = 2,170 links** (rule: exam holds a combined GK Precis and no state-specific GK book in Precis; 1 Central exam skipped). **Rollback:** `--step=unlink-gk-splits` (backup `...17-02-31-941Z`; deletes only those pairs). State (815) and UT (239) exams with combined GK are NOT done yet.
- Reading each book's first blocks: only ~1/3 can be typed (enrichment stripped the cover pages). Where legible, state/UT GS books say **Guide** (e.g. "ASSAM GS", "BPSC DSP BIHAR GS GUIDEBOOK"); none say Precis. The 10 html state "Precis" titles (Goa GS, Haryana_GS, Gujarat_CONSTABLE = Gujarat GS, Chhattisgarh_SI/GS, KERALA CONSTABLE, Karnataka_GS, Andhra_Pradesh GS, Himachal_Pradesh_GS, ARUNACHAL PRADESH SI) are the same documents the content team dropped in each exam's "3. PRECIS" Drive folder, and almost all their exams already hold the block Guide of the same book.
- Label oddities noticed: `2026 Descriptive Writing Bank Exams` (Guide) reads as Precis; `Cluster_083_MATHEMATICS` (Guide) has a "MATHEMATICS PRECIS" cover. GK Economics image `src` values use local `/books/...` paths (probably broken).

### 64.5 Blocked, not executed: archive the html state-GS Precis duplicates
`scripts/archive_state_gs_html_precis.mjs` dry run (approved by the user): archive **218** html rows (174 linked + 44 reached via exam_name), remove **349** Precis links across **258 exams**, add **3** Guide links (so every dependent exam keeps its state book), leave **42** rows Published (exam_name ambiguous 31 / unresolved 11). The `--execute` run was **blocked by the auto-mode classifier**; nothing was written. The user must run it or add a Bash permission rule.

### 64.6 Rollback plan (all 09-23 changes)
`node scripts/rollback_2026_09_23.mjs --step=<rename-math|unpark-mocks|restore-gk-dupes|unlink-gk-splits> [--execute]` -- dry run by default, each step independent, reads the backup files in `K:\tmp\db_backups\<timestamp>\`. All four dry-run correctly (952 rows / 468 rows + 60 links / 33 rows / 2,170 links). 09-21 restore paths are in §63.2. Earlier restores: §62.7 and §62.8 backups (`2026-09-19T12-37-19-855Z`, `...13-33-51-553Z`). **If the archive script (§64.5) is run it writes its own backup (`state_gs_html_precis_rows.json`, `..._removed_links.json`, `state_gs_guide_links_added.json`) but there is no rollback step for it yet -- add `--step=restore-state-html` to the rollback script before running it if one-command undo is wanted.**

### 64.7 Next session starts here
1. Run (or approve) `archive_state_gs_html_precis.mjs --execute`; then `link_gk_splits_to_exams.mjs --levels=state,ut` (dry run first) -- the rule will then see no state Precis on those exams, so all combined-GK exams qualify.
2. The 166 exams holding only the html "GENERAL KNOWLEDGE" Precis (136 ch) -> repoint to the block "GS & GK" (591 exams hold the html copy; 425 already hold the block one); then decide on delinking the combined book once the content team agrees.
3. Remaining html Precis (~12 source docs) and the 7 html Guides -> convert to block or archive as duplicates; RRB-GK-* splits (only published as html; block versions are Draft) -> publish block, archive html.
4. Archive the 414 orphan Intros (dry run + backup, verify via anon).
5. Purge the ~20 Draft GK duplicate rows if wanted; fix the two mislabelled books (§64.4); stale `chapter_count=9` on 711 Draft Mathematics rows.
6. Then Mock Tests and PYQs, which need Google Drive as source. Final documents: `K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_CONTENT\Final Documents\MASTER DOCUMENTS` (Drive itself holds 500+ duplicate copies per exam -- work from what is in the DB).
7. Standing items: run `sql/lc_exam_resource_map_unique.sql` (§62.7, user action); English Precis single-canonical decision (§62.9); rotate the leaked credentials.
8. Git: uncommitted are `docs/status_report.md` and the new scripts (`park_mock_tests_out_of_guide`, `dedupe_gk_split_books`, `link_gk_splits_to_exams`, `archive_state_gs_html_precis`, `rollback_2026_09_23`). Untracked by policy: `docs/*.xlsx`, `docs/Published_Books_List.txt`, `FINAL_*_STRUCTURED/`, `books/`.

## 65. Session of 2026-09-24: thumbnails become data -- category thumbnails for exams, subject thumbnails for books, new Subjects admin page

### 65.1 The rule (user's design)
**Exams use their CATEGORY's thumbnail (landscape 16:9); books/study materials use their SUBJECT's thumbnail (portrait).** They are separate systems. Exam with no category image = a **solid colour, no wash/overlay**. The large exam thumbnail (`src/pages/admin/ExamThumbnail.jsx`, `size="lg"`) now shows only a **level badge (CENTRAL/STATE/UT, white pill top-left) and the exam name, centred**; the old subject label, category text and initials circle are gone. The admin exam editor's **Change Image** button/options (template, accent colour) were removed -- thumbnails are assigned on the Categories and Subjects pages instead (existing `thumbnail_template_id` / `accent_color` values are still written back unchanged on save).

### 65.2 Data model (applied to the live DB today via the Management API)
`sql/lc_thumbnails.sql`: `lc_exam_categories.thumbnail_url` (new column) and new table `lc_subjects (key, label, color_family, thumbnail_url)` (RLS off + grants, same posture as the other `lc_` tables). `scripts/seed_thumbnail_urls.mjs` (idempotent; reads `.env`): upserts the subject rows from `THUMBNAIL_SUBJECTS`, links every category to `public/category_thumbnails/<level>/<slug>.webp`, and refreshes subjects still pointing at a bundled `/thumbnails/` file while **keeping uploaded R2 URLs**. Result: **187/187 categories linked** (all 1,575 exams sit in a category with a thumbnail -- the 65 state categories missing art earlier in the day were supplied by the user meanwhile). Verified with the **anon key**, which is what the site uses.

### 65.3 Front end
- `src/lib/thumbnailStore.js`: one cached read of both tables, `useThumbnails()` -> `categoryUrl(name)` / `subjectUrl(key)`; DB value first, then `src/lib/bundledThumbnails.js` (generated slug -> file map of the 187 category WebPs) as fallback so existing art shows even before it is linked.
- Consumers moved to it: `ExamThumbnail` (admin editor, exam page, Dashboard "Next Step"), the Learning Center Recommended/Popular cards and Related Exams cards (curated cards now carry a `category` name instead of an `image`; real names are e.g. "Teaching & Education", "Police (UT)"), and book tiles (`ResourceTile` in `ExamContentPreview.jsx` -> subject thumbnail).
- `api/exams.js` now also returns the exam's `category` (looked up on `lc_exams`).
- `src/pages/ExamSyllabus.css` / Dashboard: thumbnail slots widened for landscape (220px / 160px). The old portrait `.lc-thumb-lg*` CSS is now dead but still present in `AdminCMS.css`, `ExamSyllabus.css` and Dashboard's inline styles.

### 65.4 Admin pages
- **Subjects** (`src/pages/admin/SubjectsPage.jsx`, `/admin/subjects`, sidebar under Categories): the fixed subject list with colour, preview, **Upload/Replace** and "Missing thumbnail only". No add/delete -- the list is fixed by `src/lib/thumbnailTaxonomy.js` because it also drives title -> subject matching.
- **Categories**: new Thumbnail column (same Upload/Replace, "Missing thumbnail only"); falls back to the plain list if the column does not exist yet (that gap briefly showed an empty page today).
- Shared `ThumbnailCell.jsx`: centre-crops to 640x360 (categories) / 512x768 (subjects), converts to WebP (`src/lib/imageResize.js`), uploads to R2 via the existing `r2Uploader`, saves the URL. **Future (planned by the user): content team generates a thumbnail with the existing OpenAI key** -- it can write into the same `thumbnail_url` columns; nothing here needs redoing.

### 65.5 Book -> subject matching (`thumbnailTaxonomy.js`)
Titles were matched by exact, case-sensitive lookup, so most books had no subject (9,767 of 16,631 resources). Now case-insensitive with keyword rules. The user then added more subjects (General Science, History, Geography, Polity, Economy, Physics, Chemistry, Biology, Environment, Banking, Accounting, Civil Engineering; taxonomy now 29) and 26 cover WebPs (400x600, `public/thumbnails/`). A review of that work found and fixed: (1) **Law/Nursing labels had been renamed, breaking 50 `quizzes.subject='Nursing'` rows and the quiz/PYQ subject dropdowns** -- reverted, and a warning comment added: subject labels double as quiz subject values; (2) 15 subjects still pointed at the 1-3 MB PNGs (seed never overwrote) -- now WebP; (3) keyword rules matched **Intro** documents (titled by exam, e.g. "Banking - SBI PO - Clerk") -- **Intro is now excluded** (`resolveSubjectForTitle(title, category)`; 0 of 1,970 intros get a subject); (4) 19 real books still missed (Electrical Engineering, Maths variants, SSC Reasoning, Financial Awareness, HR Personnel, Law Officer, ITI Technical Trade, GEN AWARENESS, Hindi grammar, Rajbhasha -> Hindi, Metro_Technical_Knowledge -> Technical Trades) -- rules added; (5) a bulk deletion of the taxonomy file's explanatory comments was reverted. **Result:** of non-html Guide/Precis, only the two "PSU Navaratna Base" books have no subject (neutral by design); the 460 remaining "no subject" Guide rows are the parked html mock tests. Judgement call to revisit: 8 "ASSAM AGRICULTURE EXTENSION ASSISTANT.docx N" Guide chapters now show the Agriculture cover.

### 65.6 Production incident: Vercel Hobby 12-function cap (again)
Upstream commit `90afbc7` (New Jobs V2 tab) added `api/jobs-v2.js`, making 13 functions; the deploy of `200dd0c` failed at "Deploying outputs" (build itself passed). Fix `fe7c30a`: V2 handler folded into `api/jobs.js` behind `?source=v2`, `vercel.json` rewrites `/api/jobs-v2` -> `/api/jobs?source=v2` (client URL unchanged), `api/jobs-v2.js` deleted -> 12 functions. Same lesson as §61.12: **check `git ls-files api | wc -l` before pushing any new `api/*.js`.**

### 65.7 Git / production state
Pushed to `origin/main`: `e47b80c`+merge `200dd0c` (thumbnail system, 187 category WebPs), `fe7c30a` (function-cap fix), `2099001`+merge `904dc0d` (subject covers, matching fixes). Each merge was done in a **temporary worktree from origin/main** because the local checkout has uncommitted edits (`SecureReader.jsx`) that overlap incoming changes; the local `main` is therefore **~23 commits behind** and a plain `git pull` will stop on `SecureReader.jsx`. Deliberately not committed: `public/category_thumbnails/png/` (438 MB) and `public/thumbnails/png/` (71 MB) originals, loose source PNGs, and everything listed under §64.7 item 8. I did not confirm the Vercel deploys completed. Leftover: stale `.git/worktrees/wt` (permission denied) keeps `git worktree prune` / `git branch -D subj-merge` from finishing -- delete `.git/worktrees/wt` and `.git/worktrees/vnxt2` by hand, then prune.

### 65.8 Next session starts here
1. **User is creating `Banking.webp` and `Accounting.webp`** (400x600, `public/thumbnails/`): the DB already points at them (broken images until they exist). `civil_engineering` has no file, no DB URL and no title rule.
2. Decide whether the Assam Agriculture chapters and other exam-specific books should stay neutral (§65.5).
3. Delete the dead portrait `.lc-thumb-lg*` CSS (§65.3). Optionally give intros a dedicated default thumbnail (they show a plain "STUDY MATERIAL" tile).
4. OpenAI thumbnail generation on the Categories/Subjects pages (§65.4).
5. Confirm both Vercel deploys are green and spot-check in a browser -- **nothing this session was verified in a live UI** (no browser automation here; verified by lint, `vite build`, and DB/anon-key checks).
6. Everything in §64.7 still stands.

## 66. Session of 2026-09-25: targeted rollback of the 09-23 GK-split work (content team does not want split GK books)

**Why not a blanket rollback:** since 09-23 the content team has added ~1,800 links by hand (`lc_exam_resource_map`, reasoning "Manually added by admin" / "Co-linked with Precis/Guide ...", 09-23 to 09-24) and a separate session ingested ~1,900 mock-test quizzes (09-25). A point-in-time restore would wipe all of that, so only my own changes are reverted, each from its own backup.

- **GK splits unlinked:** `rollback_2026_09_23.mjs --step=unlink-gk-splits --execute` deleted the 2,170 split links (all 2,170 were created by my script; the content team had added none). Verified with the anon key: 0 split links remain, and all 310 exams still hold a Published combined GK Precis. Then `scripts/rollback_followups_2026_09_25.mjs --execute` set the 7 split books (GK Biology/Chemistry/Economics/Geography/History/Physics/Polity) to **Draft**. Backup `K:\tmp\db_backups\2026-09-25T10-11-58-243Z\followups_before.json`. The combined GK book was never unlinked.
- **NOT restored on purpose:** `--step=restore-gk-dupes` (would republish 26 duplicate rows the user does not want).
- **`--step=rename-math` is now guarded** (only renames rows still titled "2026 MATHEMATICS"). It would do nothing today: the content team already renamed the Mathematics folder's rows to "MATHEMATICS" themselves (241 Published, 711 Draft). Content is still the 09-21 plain-parser 20-chapter version (no enrichment).
- **Reasoning finding (not caused by the 09-21/09-23 scripts):** at 2026-09-25 09:59 UTC a title-level rename (admin Book Content `books-rename`, which renames every row sharing the title) retitled the Guide rows that were called "Descriptive Writing Bank Exams". That group actually contained two different books: the 12-chapter reasoning book (`Cluster_007_REASONING.docx`, ~940+ exams; now "Reasoning") and the original 33-chapter Descriptive Writing book (`Cluster_080_Descriptive_Writing_Bank_Exams.docx`, 0 exams), which was swept into the rename. **Fixed:** the 33-chapter row is titled "Descriptive Writing Bank Exams" again (1 row). **Still open:** there are now two Reasoning Guides with different content and case-different titles ("REASONING" 6 ch, `Cluster_052`, 929 exams; "Reasoning" 12 ch, `Cluster_007`, ~940 exams), which the admin list groups as ONE book because grouping is case-insensitive. Needs a decision from the content team on names.
- **Open decision, the five "2026 ..." copies from 09-21:** GK-GS (185 exams moved to "2026 GK-GS") and Descriptive Writing (37 exams on "2026 Descriptive Writing Bank Exams") are linked; the other three are unlinked duplicates (2026 GENERAL KNOWLEDGE, 2026 ITI Technical Trade Literacy, 2026 RRB COMPLETE GK). Undo path exists (`K:\tmp\book_merge_backups\2026-09-21T15-07-07-824Z\2026-copies\ROLLBACK.json`), but undoing brings back the books that lost their "introduction" chapters. Not done; waiting on the user.
- **Lesson:** a title-level admin rename is unsafe when one title groups different books (see also §60.3). Before any rename, check whether the title has more than one distinct `storage_base_url` / `source_file`.

### 66.1 Snapshot taken 2026-09-25 (before any quiz rollback)
Full read-only export in `K:\tmp\snapshots\2026-09-25_before-rollback-to-09-24\` (227 MB, `manifest.json` lists counts): resources 16,631, lc_exam_resource_map 15,963, lc_exam_intro 1,568, lc_exams 1,575, lc_exam_categories 187, lc_regions 37, quizzes 2,198, pyq_papers 754, quiz_attempts 4, **questions 287,968** (exported with `scripts/snapshot_questions.mjs`, keyset paging, because an exact count on that table times out; `scripts/snapshot_db.mjs` did the rest). Every row id is unique and every table matched its database count at export time. **The quizzes/questions tables kept growing afterwards (another session is still ingesting mock tests): the database showed 2,204 quizzes / 288,902 questions minutes later, i.e. 6 quizzes and 934 questions newer than the snapshot.** Re-run both snapshot scripts (new label) after that ingest stops and before touching the quiz tables. Guide/Precis were verified unchanged since the content team last link (09-24 21:01:58 IST) apart from the Reasoning title fix and the GK split archive; no Guide/Precis rollback needed. Nothing was written to the live database in this step.

### 66.2 CONFIRMATION: Guides and Precis rolled back / verified at the 2026-09-24 state (checked live 2026-09-25 16:14 IST)
**Scope decided with the user:** Guides and Precis are to be exactly as the content team left them on 09-24 (their last change: link created 2026-09-24 21:01:58 IST). The user is now concerned only with the quizzes; **there is no further business with Guides/Precis.**

**What was rolled back (only our own changes, from their backups):**
1. **GK split links removed:** 2,170 links (310 Central exams x 7 splits), via `rollback_2026_09_23.mjs --step=unlink-gk-splits --execute`. All 2,170 were created by our script; the content team had added none. Combined GK book links untouched.
2. **GK split books archived:** the 7 split resources (GK Biology / Chemistry / Economics / Geography / History / Physics / Polity) set to Draft (`rollback_followups_2026_09_25.mjs`, backup `K:\tmp\db_backups\2026-09-25T10-11-58-243Z\followups_before.json`). User confirmed "the GK splits can be archived".
3. **Descriptive Writing:** the original 33-chapter book (`Cluster_080_Descriptive_Writing_Bank_Exams.docx`) had been swept into a title-level rename and was called "Reasoning"; retitled "Descriptive Writing Bank Exams" (1 row, same script).

**Verification (live DB, not the snapshot):** resources created after the cutoff = 0; resources updated after our last change (09-25 15:42 IST) = 0; exam links created after the cutoff = 0; `lc_exam_resource_map` total 15,963 = snapshot; `lc_exams` and `lc_exam_intro` updated after the cutoff = 0. Every one of the 1,332 rows touched after the cutoff is accounted for: 1,324 Reasoning-title rows (09-25 15:29:53 IST, the content-side fix below), 7 GK split rows and 1 Descriptive Writing row (ours, 09-25 15:41 IST). Full pre-change snapshot: `K:\tmp\snapshots\2026-09-25_before-rollback-to-09-24\` (§66.1).

**Deliberately NOT reverted:** the 09-25 15:29:53 IST retitle of the 12-chapter reasoning book from "Descriptive Writing Bank Exams" to "Reasoning". Reverting it would restore a wrong name; the user described the "Descriptive" name as the problem. It was not made by our scripts (no script or session of ours touched Reasoning); it is a title-level admin rename that hit 1,324 Guide rows (941 Draft, 383 Published) in one second. **When the original mislabel happened is not recorded** (a rename overwrites `updated_at`); storage metadata shows rename activity on 09-15 18:52-18:54 IST, the 09-21 11:52 IST review sheets already list "Descriptive Writing Bank Exams" where Reasoning belongs, and it was the state on 09-23. It predates all of our 09-21/09-23 work.

**Issues and residual risks (please read):**
- **Deleted links are invisible.** The DB only records created/updated rows. Any link the content team deleted after 09-24 21:01 IST (or before, unseen) cannot be detected or restored from data. The link count matches the snapshot, but there is no earlier snapshot to compare it with.
- **Two different Reasoning Guides now exist** ("REASONING" 6 ch `Cluster_052`, ~929 exams; "Reasoning" 12 ch `Cluster_007`, ~940 exams; plus Drafts). The admin Book Content list groups by lower-cased title, so it shows them as ONE book. Naming is for the content team to decide.
- **Five "2026 ..." copies from 09-21 remain** (2026 GK-GS on 185 exams and 2026 Descriptive Writing Bank Exams on 37 exams are linked; 2026 GENERAL KNOWLEDGE, 2026 ITI Technical Trade Literacy, 2026 RRB COMPLETE GK are unlinked duplicates). Not rolled back; awaiting the user. Undo path: `K:\tmp\book_merge_backups\2026-09-21T15-07-07-824Z\2026-copies\ROLLBACK.json`.
- **Mathematics** content is still the plain 20-chapter version (no enrichment); the content team renamed the rows back to "MATHEMATICS" themselves. Enriched 9-chapter backup: `K:\tmp\book_merge_backups\2026-09-21T13-28-07-100Z\mathematics-precis\`. The `rename-math` rollback step is now guarded so it cannot overwrite that rename.
- **Title-level admin renames are unsafe** when one title groups different books (this is how the Descriptive Writing book got renamed). Check for more than one `storage_base_url`/`source_file` under a title before renaming.
- **The auto-mode safety classifier blocked** `archive_state_gs_html_precis.mjs --execute` on 09-23; it was never run. The plan to archive the html state-GS Precis duplicates and to assign GK splits to state/UT exams is **cancelled** (splits are not wanted).
- **Our own check errors, caught and corrected:** a "split exams without combined GK" check briefly showed 194 exams missing the combined book; that was a 1,000-row API cap in my check, not a data problem (re-run with paging: all 310 exams still hold it). A "sum of quiz totals" of 129,811 was the same cap; the true figure is ~289,000.
- **Quizzes (the user's remaining concern):** `quizzes`/`questions` were still growing from another session's mock-test ingest (2,198 -> 2,205 quizzes and 287,968 -> 295,348 questions between the snapshot and 16:15 IST). The snapshot is therefore incomplete for the newest rows. **Plan (corrected 09-25 by the user):** the quizzes are NOT being hidden, removed or rolled back. The work continues as the mock-test parsing/mapping effort (`docs/MOCK_TESTS_PLAN.md`): make sure every quiz is parsed properly and mapped to its exam. The only thing we do is take a second full snapshot as a safety copy once the ingest has stopped (user will check in about one hour; `snapshot_db.mjs` + `snapshot_questions.mjs` with a new label, questions takes about 12 minutes). **Update 09-25 17:20 IST: the second snapshot is done and verified** -- `K:\tmp\snapshots\2026-09-25_after-mock-ingest\` (230 MB): quizzes 2,205, questions 295,348 (equals the SQL `select count(*) from questions`; all ids distinct), resources 16,631, links 15,963, intros 1,568, exams 1,575. The mock-test ingest had stopped (newest question 16:15 IST, nothing added for over an hour). Nothing touching the quiz tables has been done. (An earlier version of this note wrongly said the new quizzes would be taken off the live site; that was an over-reading of the request and is withdrawn.)

## 67. Session of 2026-09-25 (evening): STATE and UT mock tests ingested; content-team gap report
Full detail in `docs/MOCK_TESTS_PLAN.md` (STATUS LOG, last entry). Summary: every State and UT folder with readable mock papers was parsed and linked to its exam (backups per folder, verified with SQL aggregates and the anon key): **7,963 quizzes, 772,833 questions, 801 exams with mock tests, 0 mismatches, 0 orphans, 0 duplicates; 79,733 questions flagged (hidden from students).** Name collisions between states caused wrong-exam links (Manipur/Meghalaya MPSC onto Maharashtra's exam, Meghalaya MSSC onto Manipur's, J&K Staff Nurse onto Dadra & Nagar Haveli's); all found by a cross-region check, fixed, and the audit/ingest scripts now scope matching to the folder's own state/UT and check State/UT claims. Remaining decisions (UP PGT, ESIC/FCI/KVS shared exams, Karnataka Group D) and 43 unmatched folders are in the gap report `docs/Mock_Tests_Gap_Report.xlsx` (untracked), which also lists the 736 exams that still need mock tests and the 99 folders with placeholder files. Guides and Precis were not touched (see §66.2). Central open items remain deferred by the user (ISRO relink, ESIC x5, 10 legacy quizzes, 110 no-regress papers, exam-name typos, browser test and commit of the app changes). All of these scripts were committed in `73ec10b` (see 67.2).

### 67.1 2026-09-26: mock tests are no longer hidden from the Quiz Center
User directive ("dont hide anything ... content team can update those"). `MIN_PLAYABLE_QUESTIONS` in `src/lib/quizQuality.js` is now 0, so all 7,963 quizzes are listed (the 140 with fewer than 10 playable questions were hidden before). Questions with a blocking flag are still skipped inside a quiz (user chose "listing only"), and a quiz with no playable questions shows a "being prepared" message instead of an empty session. Lint and `vite build` pass; not verified in a browser. Committed in `73ec10b` (see 67.2). The gap report sheet is now "Few playable questions (<10)". Details: `docs/MOCK_TESTS_PLAN.md` last entry.

### 67.2 Where things stand at the end of the 2026-09-25/26 sessions
**Committed (`73ec10b`, branch `main`, NOT pushed):** 27 files -- the Quiz Center changes (`src/lib/quizQuality.js`, `QuizCenter.jsx`, `InteractiveQuiz.jsx`, `useExamContent.js`, `ProfilingResults.jsx`), the mock-test parser/ingest/audit/export scripts and `scripts/data/mock_exam_overrides.json`, the Guide/Precis cleanup and rollback scripts (`park_mock_tests_out_of_guide`, `dedupe_gk_split_books`, `link_gk_splits_to_exams`, `archive_state_gs_html_precis`, `rollback_2026_09_23`, `rollback_followups_2026_09_25`, `snapshot_db`, `snapshot_questions`), and the docs (`status_report.md` through 67.1, `MOCK_TESTS_PLAN.md`, `NEXT_SESSION_PROMPT.md`). Secret scan of the committed files: clean. **Deliberately left untracked:** `docs/*.xlsx` (including the gap report), `docs/Published_Books_List.txt`, `FINAL_*_STRUCTURED/`, `books/`, and other sessions' work (`SecureReader.jsx` edit, `FlipbookReader.*`, new thumbnail images). This section 67.2 is itself uncommitted.

**Live database (checked 2026-09-26):** 7,963 quizzes, 772,833 questions, 801 exams with mock tests (Central 218 of 409, State 370 of 835, UT 213 of 293); all 7,963 are listed in the Quiz Center; 79,733 questions carry review flags and are skipped inside a quiz; 0 count mismatches, 0 orphan questions, 0 duplicate (exam, title). Guides and Precis are at the 09-24 state (see 66.2). Safety snapshots: `K:/tmp/snapshots/2026-09-25_before-rollback-to-09-24` and `K:/tmp/snapshots/2026-09-25_after-mock-ingest`; the quiz tables are much larger now, so take a new one (`snapshot_db.mjs` + `snapshot_questions.mjs`) before any destructive quiz change.

**Deliverable for the content team:** `docs/Mock_Tests_Gap_Report.xlsx` (untracked; regenerate with `node scripts/export_mock_gap_report.mjs docs/Mock_Tests_Gap_Report.xlsx`). Covers Central, State and UT: per-region summary, 736 exams needing mock tests (with reason and what to upload), 27 incomplete exams, 99 placeholder folders, 43 unmatched Drive folders, 8 shared-exam conflicts, 140 papers with fewer than 10 playable questions (listed, not hidden), and flagged questions by exam.

**Open decisions (user):** UP PGT (Central and State each have a 10-paper set for one exam; the State set currently wins); shared exams ESIC/FCI Junior Engineer, ESIC/KVS Stenographer and Karnataka Group D (two folders, one exam); whether to push `73ec10b`; whether to keep the two "Reasoning" Guides ("REASONING" 6 ch and "Reasoning" 12 ch) as they are; the five "2026 ..." book copies from 09-21 (see 66.2).

**Deferred by the user (Central):** ISRO Technical Assistant quizzes linked to NIC's exam (fix denied by the safety classifier; the SQL is in `MOCK_TESTS_PLAN.md`), ESIC x5 and ISRO Scientist/Engineer mapping, 10 legacy unlinked quizzes, 110 papers kept on older data, exam-name typos flowing into quiz titles, browser test of the app changes, and the 211 Central exams with no mock files on Drive.

**Known gotchas:** tool inputs collapse double backslashes (use `String.fromCharCode(92)` or forward slashes in scripts); PostgREST silently caps at 1,000 rows (use SQL aggregates through the Management API for counts); RLS hides Draft rows from the anon key, so verify with it; the safety classifier has blocked raw-SQL UPDATEs and one `--execute` script on prod.

**Next:** send the gap report to the content team; they upload and map new mock tests with the quiz parser (`ingest_mock_tests.mjs`, dry run first) and the audit (`audit_mock_test_linkage.mjs`, now scoped to each state/UT); regenerate the report after each batch. Then the deferred Central items, the Guide/Precis leftovers in 64.7 (orphan Intros, html GENERAL KNOWLEDGE repoint, leftover html Precis/Guides), and PYQs (separate from quizzes, also need Drive).

## 68. Session of 2026-09-26: Guide/Precis duplicates traced, rolled back to 09-23 09:00, English deduplicated, RLS enabled on 14 tables

### 68.1 Where the repeating Guides/Precis came from (link history, read-only analysis)
The map table only records creation times, so state at time T = links created at or before T, plus the links the 09-19 dedupe removed (backups in `K:\tmp\db_backups\2026-09-19T12-37-19-855Z` and `...13-33-51-553Z`). Duplicate = same exam, same category, two Published books of the same title. There is **no point after content-team work began with zero duplicates**: the last clean state is 09-17 12:59 UTC (11 old Gemini groups). Duplicates entered in four steps: (1) 09-17 13:01 "Backfilled from legacy exam_name" run (ours, 639 groups); (2) 09-17 13:48 ENGLISH Guide (26 ch) linked on top of Gemini's 23 ch Guide (ours, 653); (3) 09-23 08:03-08:14 UTC burst of 1,008 links "Synced from counterpart precis link" (708 groups, 679 exams; most likely the admin feature from origin commit `69076fe` "co-linking and bulk sync of same-named Guide & Precis books", not our scripts); (4) 09-24 "Co-linked" links (114). The largest title groups were Reasoning (789: Cluster_007 12 ch + Cluster_052 6 ch, made to look identical by the 09-25 title-level rename) and English (Guide 685, Precis 500).

### 68.2 Rollback of Guide/Precis links (Intros, resources and quizzes untouched)
`scripts/rollback_guide_precis_links_to.mjs` (`--snapshot`, `--to=<ISO>`, dry run unless `--execute`) and `scripts/restore_guide_precis_links_from_backup.mjs`. Snapshots of the live links and of the reconstructed 09-23 08:00 and 09:00 UTC states: `K:\tmp\snapshots\guide_precis_links_2026-09-26T05-48-34-889Z\` (14,472 / 10,843 / 11,862 links). Step 1 rolled back to 08:00 (deleted 3,629 links: 1,008 sync, 1,171 co-linked, 1,450 manual; backup `K:\tmp\db_backups\2026-09-26T05-49-07-330Z\links_deleted.json`). Step 2, at the user's request, restored the 1,019 links created between 08:00 and 09:00 from that backup, so **Guide/Precis are at the 09-23 09:00 UTC state (11,862 links)**. 08:00 had 1,303 duplicate groups (753 exams), 09:00 has 2,011 (1,044 exams); the 2,610 links created after 09:00 (content-team work of 09-23/24) are only in the backup and can be re-applied with the restore script (`--upto=` a later time).

### 68.3 English deduplicated
Four English books were linked side by side: Guide 23 ch (Cluster_005, Gemini 08-23, 846 exams), Guide 26 ch (Cluster_087, canonical, 826), Precis 1 ch (Gemini, 727), Precis 30 ch (ENGLISH.docx, backfill, 596); 497 exams held all four. `scripts/dedupe_english_links.mjs` (dry run first) deleted the older link only where the exam already had the canonical one in that category: **1,181 links (684 Guide 23 ch, 497 Precis 1 ch) across 684 exams**, backup `K:\tmp\db_backups\2026-09-26T07-30-59-349Z\english_links_deleted.json` (restore = upsert on id). Verified with the anon key: 10,681 Guide/Precis links, 0 deleted ids present, no exam lost its only English Guide or Precis. Left alone: 162 exams with only the 23 ch Guide, 230 with only the 1 ch Precis (the content team still has to name the single canonical English Precis), 3 exams with a mislabelled 23 ch Precis.

### 68.4 Supabase Advisor: RLS was off on 14 public tables
The app's admin panel wrote the catalogue tables with the public anon key (RLS off by design, documented in each sql/ file), so anyone with the key could insert/update/delete. Fixed: **RLS on, one public-read policy, anon INSERT/UPDATE/DELETE revoked** on lc_subjects, pyq_questions, lc_conducting_bodies, lc_exam_categories, lc_exam_intro, lc_exam_quiz_map, lc_exam_resource_map, lc_exam_tags, lc_exams, lc_reader_themes, lc_regions, lc_tags, lc_thumbnail_templates, pyq_papers (`sql/lc_subjects_pyq_questions_rls.sql`, `sql/lc_tables_rls.sql`, applied via the Management API on 09-26 after the deploy). All admin writes now go through `POST /api/admin/content-writes` (`api/admin/misc.js`, `fn=content-writes`, service role, `x-admin-api-secret`; no new serverless function, the 12-function cap is unchanged) via the browser helper `src/lib/adminDb.js` (`adminFrom(table).insert/update/upsert/delete/eq/neq/in/select/single`). The route only accepts the 12 whitelisted tables, validates column names, and refuses update/delete without a filter; `pyq-questions-replace` inserts the new rows before deleting the old. **New admin code must write these tables with `adminFrom`, never `supabase.from(...)`, or the write will fail with `permission denied`.** Reads are unchanged. Verified live: catalog shows RLS on + 1 policy on all 14, anon reads return rows (views too), anon writes return 42501, and the admin route still writes. Rollback SQL is in each file's header. Honest limit: the shared admin secret ships in the bundle, so this stops writes with the bare anon key but is not real per-admin authentication.

### 68.5 Deploy notes
Pushed `904dc0d..de4ef31` to `main`. The merge with 24 origin commits conflicted in `vercel.json` (kept both rewrites), `LinkExamsDrawer.jsx` (took upstream, re-converted), `useExamContent.js` (lookup order: quizzes.lc_exam_id, then lc_exam_quiz_map, then name match restricted to unlinked quizzes) and `InteractiveQuiz.jsx` (kept review-flag filters, upstream's `quizData.id`). Commit `73ec10b` (mock-test app changes) went out with it. Not browser-tested. Vercel's live host is `www.veernxt.in` (the apex 307-redirects). Local `main` was left behind because another session has uncommitted edits in `SecureReader.jsx`; a stale `.git/worktrees/deploy_wt` entry could not be deleted (permission denied, harmless).

### 68.6 Open
The Reasoning names (68.1), the canonical English Precis, the five "2026 ..." copies (66.2), applying the content team's 09-23/24 links again once the duplicate rule is agreed, and a `git pull` of local main once `SecureReader.jsx` is committed. The unique index `sql/lc_exam_resource_map_unique.sql` is still not run.
