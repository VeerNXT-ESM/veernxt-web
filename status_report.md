# VeerNXT — Status Report

**Purpose:** Handoff document. This version covers the `/admin` resource audit session that the previous version pointed to as its starting point — it turned into a much larger content-catalog audit: an admin pagination bug, a Central Exams purge, a full exam-list/logo/coverage analysis, a local content-library structural rebuild, a duplicate-content discovery pass that found the real content library is ~88 unique documents wearing 5,543 different filenames, a page-count/image-resolution audit, 37 properly-sourced state/UT/national emblem logos, and a comparison against the content team's newly-delivered subject-requirement mapping that validated the whole exam list. Sections 1–8 are the prior session's R2 migration work, unchanged, kept for history.

**Most of this session (§1–§20) is content-audit/tooling work, not app code** — it happened on the local `CLIENT ASSETS` content library (`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\`), **outside this git repo**; only the analysis scripts, reports, and prompts that resulted live in the repo. See §18 for exactly what's tracked where. **§21 is different** — it's real application architecture: a new schema applied directly to the production Supabase database and seeded with live data (still additive/non-destructive, nothing existing was touched, but it's not just local analysis anymore).

**🎯 Next session starts here**: §29 — the user is explicitly **waiting** before further action: `scripts/map_exam_resources_gemini.mjs --execute` (Gemini exam↔resource mapping, §29.3) is still running as of this write-up, and the content team is still producing more enriched books + PYQ JSONs that `scripts/migrate_resources_to_blocks.mjs` (§29.5) should be re-run against once "done." **Do not re-run either script speculatively** — confirm with the user first, per their own explicit "let's wait" instruction. See §29.7 for the precise resume point.

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
