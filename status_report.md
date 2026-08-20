# VeerNXT — Status Report

**Purpose:** Handoff document. This version covers the `/admin` resource audit session that the previous version pointed to as its starting point — it turned into a much larger content-catalog audit: an admin pagination bug, a Central Exams purge, a full exam-list/logo/coverage analysis, a local content-library structural rebuild, a duplicate-content discovery pass that found the real content library is ~88 unique documents wearing 5,543 different filenames, a page-count/image-resolution audit, 37 properly-sourced state/UT/national emblem logos, and a comparison against the content team's newly-delivered subject-requirement mapping that validated the whole exam list. Sections 1–8 are the prior session's R2 migration work, unchanged, kept for history.

**This session is content-audit/tooling work, not app code.** Most of it happened on the local `CLIENT ASSETS` content library (`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\`), which is **outside this git repo** — only the analysis scripts, reports, and prompts that resulted live in the repo itself. See §18 for exactly what's tracked where.

**🎯 Next session starts here**: **the master exam datamap is built** (§12.8, `exam_master_datamap.json`/`.xlsx`) — every source collected this session (identity, subject requirements, PwD eligibility, logos, content completeness) joined into one row per unique exam. Two loose ends before moving on: relay the 3-UT GS-book gap (Ladakh, Lakshadweep, Puducherry, §12.6) to the content team, and regenerate `exam-logos/manifest.json`/`coverage_report.json`/`logo_priority.json` against the deduped exam list (§12.5). After that, per the user's explicit priority, the team moves on to **the recommendation engine and the ingestion pipeline itself** — the actual "meat of the site" — rather than more content auditing, and the datamap is what that work should consume. **Starter prompts for exactly how to resume each thread are in §20 at the very bottom** — copy one into a fresh conversation rather than re-deriving context from scratch.

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

**Committed this session**: `e92baca` ("exam catalog audit tooling — logos, coverage report, folder-structure fixer": `exam-logos/`, `scripts/fix_content_folder_structure.py`, `content_rewrite_prompt.md`, `thumbnail_generation_prompt.md`, `coverage_report.*`, `central_structure_report.*`, `state_structure_report.*`) and `75b3f00` ("source proper official state/UT/national emblem logos": `exam-logos/state-emblems/`, 37 files).

**Not yet committed** (ready when wanted): `exam_resource_mapping.xlsx` — rebuilt after the §8 subject-classification bug fix, current version is correct.

**Not from this session — the user's own parallel work in progress, do not assume ownership**: `f6c6b52` ("Add premium reading template and thumbnail generation script") is already committed, below `e92baca`/`75b3f00` in history. Currently uncommitted on top of everything: `package.json`/`package-lock.json`, `src/lib/contentEngineProcessor.js`, `src/pages/admin/AdminDriveIngestion.jsx` modified; `public/thumbnails/`, `scratch/cluster_documents.js`, `scratch/generate_category_bg.js` untracked. Looks like the user's in-progress Gemini/thumbnail pipeline work — left alone throughout.

Local branch is 3 commits ahead of `origin/main`, not pushed.

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
| Exam-list dedupe + master-datamap-builder scripts | `scripts/dedupe_exam_list.py`, `scripts/build_master_datamap.py` | No, untracked — new this session, not yet committed |
| Content rewrite + thumbnail prompts | `content_rewrite_prompt.md`, `thumbnail_generation_prompt.md` | Yes, committed |
| Exam-to-resource mapping workbook | `exam_resource_mapping.xlsx` (repo root) | No, untracked |
| Page/image analysis, subject-wise parse + comparison JSON | `K:\tmp\exam_list_extract\{page_image_analysis,subject_wise_list,subject_wise_comparison}.json` | No — scratch area, not moved into repo yet |
| Central/State/UT Exams source content (docx) | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\{CENTRAL EXAMS,STATE EXAMS,UT EXAMS}\` | No — outside the repo entirely |
| 93 deduplicated master documents (88 from Central/State + 5 UT GS books) | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\MASTER DOCUMENTS\` | No — outside the repo entirely |
| Deduped unique exam list + dedupe changelog + UT content mapping + PwD comparison | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\{master_exam_list_unique.json,dedupe_changelog.md,ut_content_mapping.md,pwd_eligibility_comparison.md}` | No — outside the repo entirely |
| **Master exam datamap (source of truth, §12.8)** | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\{exam_master_datamap.json,exam_master_datamap.xlsx,datamap_build_report.md}` | No — outside the repo entirely |
| Master exam list + subject-wise source docs | `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST\` | No — outside the repo entirely |

---

## 19. Suggested pickup order next time

1. **Master exam datamap built** (§12.8) — `exam_master_datamap.json`/`.xlsx` is now the source of truth: identity + subject requirements + PwD eligibility + logos + content completeness, one row per unique exam. Relay the Ladakh/Lakshadweep/Puducherry GS-book gap (§12.6) to the content team, and regenerate `exam-logos/manifest.json`/`coverage_report.json`/`logo_priority.json` against `master_exam_list_unique.json` (§12.5) before trusting their counts — the datamap's logo join already carries current quality flags but hasn't triggered that regen itself.
2. Org-specific logo sourcing (§11) — the genuinely-branded bodies (SSC, UPSC, IBPS, RRB, DSSSB, real PSC branding), plus mapping state-emblem fallbacks onto the rest.
4. Check in on the content team's Gemini rewrite/thumbnail output — does it need the admin-side review UI to actually land, or is it still a manual docx handoff for now.
5. **Move to the recommendation engine and ingestion pipeline** — the user's explicit next priority once the content-audit thread is closed out.
6. Image work (§10): 715 genuine upscale candidates, 314 duplicate logos to replace instead of upscale.
7. The 10 zero-coverage states and Central re-ingestion, once fresh content is ready from the content team.
8. Reader visual design + semantic content tagging (§9), and the in-admin AI writing assistant — after the recommendation engine work, per the user's stated sequencing.

---

## 20. Starter prompts for the next session

Copy the one matching what you're picking up — each is self-contained, points at this report for full context, and names the exact files involved so a fresh conversation doesn't have to re-derive anything.

### A. UT Exams — relay the GS-book gap, then move to ingestion
> Read `status_report.md` §12.6 and `ut_content_mapping.md` (`K:\...\CONTENT\1. EXAM LIST\`) for full context. UT content is already audited — no folder-structure-fixer pass needed (the content team's shape is deliberately different: shared subject content across all UTs, not per-UT scaffolding). Two things left: (1) relay to the content team that Ladakh, Lakshadweep, and Puducherry are missing a real GS book (the other 5 UTs each have one, now in `MASTER DOCUMENTS\Guide\GK-GS\Cluster_089`–`093`) — they need one written in the same shape as the existing 5; (2) when UT ingestion is built, point it at the existing master-doc clusters for Reasoning/Maths/English/Hindi/Computer Science instead of re-uploading the redundant per-UT copies — the mapping table in `ut_content_mapping.md` says which cluster each subject maps to.

### B. Use / extend the master exam datamap
> Read `status_report.md` §12.8 for context. The unified exam reference is built: `K:\...\CONTENT\1. EXAM LIST\exam_master_datamap.json` / `.xlsx` — one row per unique exam with conducting body, logo, subject requirements, PwD eligibility (UT), and content completeness all joined on. Built by `scripts/build_master_datamap.py` (repo, re-runnable). If picking this thread back up: either (a) consume the datamap as-is for the recommendation engine/ingestion work, or (b) extend the script to close its known gaps — 19 Central/State rows with ambiguous completeness data, ~105 UT rows with no completeness match (wording mismatch between the master exam list and actual folder names), live DB coverage (needs a Supabase query, not done in this offline pass). Match-rate detail and every unmatched row is in `datamap_build_report.md`, same folder.

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
