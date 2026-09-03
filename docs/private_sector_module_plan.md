# VeerNXT Private Sector Employment — Implementation Plan

Sources: `Private sector jobs.md` (original product spec, repo root) and
`docs/VeerNXT_Private_Sector_Implementation_Improvements.md` (client
amendment — read second, supersedes this doc wherever they conflict). This
plan merges both into one build-ready document. Architecture is unchanged
from the first draft; this revision folds in the amendment's UX sequencing,
Phase 1 notification requirement, and the internal segmentation field.

## Build status (2026-09-03)

**Phase 1 is built and verified live**, WhatsApp-only per the user's explicit
instruction ("build everything else... for now we can just use WhatsApp as
the messaging" — email deferred, provider decided as MSG91 for later). What
exists now:

- **Schema**: `sql/private_sector.sql` applied live via
  `scripts/apply_sql_via_management_api.mjs` — all 5 tables (§2.1–2.5), RLS
  policies confirmed live via `pg_policies`/`pg_tables`, plus two private
  Supabase Storage buckets (`ps-verification-docs`, `ps-job-documents`)
  each with an insert-into-own-folder policy.
- **Role taxonomy**: `src/lib/privateSectorTaxonomy.js` — Blue Collar/Black
  Collar resolved by the user as a static role→class lookup (Driver,
  Delivery, Mechanic, Warehouse, Technician, Machine Operator = blue;
  Security/Facility/Operations/Fleet Supervisor, Site Manager = black),
  never rendered to candidates/employers, only surfaced in the admin
  console via `summarizeJobClasses()`.
- **API**: `api/private-sector/router.js` — the one remaining Vercel
  Hobby function slot (was 11/12), single consolidated action-dispatch
  router covering every candidate/employer write and every admin
  read/write, with a MSG91 WhatsApp sender (`sendWhatsAppNotification`)
  that logs every attempt to `ps_notification_events` and falls back to a
  `simulated` status when WhatsApp env vars aren't set yet — same
  dev-mode-fallback convention as the existing `api/auth/otp.js`.
- **Candidate**: `PrivateSectorHome.jsx` (two-state entry card),
  `PrivateSectorProfile.jsx` (the unified path-choice → operational
  questions → verification journey with the "X% complete" checklist),
  `PrivateSectorOpportunities.jsx` (the feed, gate, I'm Interested/Not for
  me). Nav entry added to `Header.jsx`.
- **Employer**: `EmployerReadyToHire.jsx` (post-onboarding interstitial),
  `PostJobRequirement.jsx` (the 5-screen wizard), `EmployerDashboard.jsx`
  gained an Active Requirements table + Post Another Job CTA.
  `EmployerOnboarding.jsx`'s first-time-completion redirect now goes to
  the interstitial instead of straight to the dashboard.
- **Admin**: `AdminPrivateSector.jsx` at `/admin/private-sector` — 5 tabs
  (Requirements, Verification, Candidate Interest, Senior/Professional,
  Notification Log), wired into `adminNavConfig.js`/`AdminShell.jsx`.

**Live-verified end-to-end** (Playwright against the real dev server + real
Supabase project, using throwaway test accounts created/deleted via the
service-role Admin API — no synthetic/mocked data): employer wizard submit
→ admin approve → candidate path-choice/work-types/skills/location/
availability/verification (real file upload to the private bucket) →
candidate opportunities feed shows the approved requirement → I'm
Interested → admin Candidate Interest tab shows it with the candidate's
real name joined from `user_profiles` → admin moves pipeline to Interview
→ all 4 notification events fired in the correct order with the exact
`[VNXT-*]` subject format, correctly logged as `simulated` → admin's
"View uploaded document" signed-URL action fetches the real uploaded file
content. Zero console/page errors in the final run.

**Three real bugs found and fixed during this verification pass** (not by
inspection — each one only surfaced by actually driving the UI):
1. `api/private-sector/router.js`'s `getSupabaseAnon()` read a bare
   `SUPABASE_ANON_KEY` env var that doesn't exist in this project (only
   `VITE_SUPABASE_ANON_KEY` does) — every candidate/employer bearer-token
   action was silently failing 401 until this got a fallback.
2. `PrivateSectorProfile.jsx`'s progress checklist marked "Preferred
   location" complete as soon as the state dropdown was set, before the
   city sub-field — even though the actual step validation correctly
   required both. Cosmetic but misleading; fixed to check both fields.
3. The "done" screen's button read "View Opportunities →" but `finish()`
   navigated to the Private Sector home page instead of the opportunities
   feed directly — fixed to match the label.

**Known, deliberately deferred, not gaps**: real MSG91 WhatsApp credentials
(integrated number + approved template name) aren't set yet, so
notifications log correctly but don't actually send — swap in
`MSG91_WHATSAPP_INTEGRATED_NUMBER`/`MSG91_WHATSAPP_TEMPLATE_NAME`/
`MSG91_WHATSAPP_HR_NUMBER` env vars once provisioned, no code change
needed. Email channel exists in the schema/enum but nothing sends through
it yet, per the user's explicit sequencing. Employer self-service
edit/close/fill, advanced matching, and interview-scheduling integrations
are Phase 2, per §8 below, untouched.

The product principle, unchanged by either source:

> **VeerNXT HR is the mandatory intermediary between employers and
> candidates.** Employers do not search or contact candidates directly.
> Candidates do not contact employers directly. VeerNXT HR owns screening,
> matching, communication and interview coordination.

**Critical product rule, worth checking every screen against as this gets
built** (amendment §22): if the implementation ever introduces employer
candidate search/browsing, contact unlocking, direct candidate/employer
contact, candidate applications sent directly to an employer, in-app
candidate↔employer messaging, or public candidate/employer profiles — stop
and reconsider. The model is "employers tell VeerNXT who they need,
candidates tell VeerNXT what they want, VeerNXT HR brings the right people
together," not a marketplace.

---

## 1. Why this isn't just "let employers post jobs"

The existing `jobs` table already exists and is read by the candidate Job
Board, but has no `employer_id` and no employer-facing posting flow — it's
effectively seeded/admin-only today (confirmed in §34.2/§37.6 of
`docs/status_report.md`). The spec asks for something structurally different
from "add an owner column to `jobs`":

- Employer submissions are **requirements**, not live listings — they go
  through VeerNXT HR review before anything is candidate-visible.
- Candidates need a **separate profile** from the main onboarding
  (`Profiling.jsx`), gating a single action per opportunity, not an
  application form.
- There's a **service-verification** step producing a badge, treated by the
  amendment as part of the same profile-completion journey, not a separate
  afterthought.
- Matching and all downstream coordination is a **manual HR workflow** that
  needs its own admin surface, plus (per the amendment) a **notification
  layer wired in from day one**, not bolted on later.

This plan treats "Private Sector" as its own module: new tables, a new
candidate section, a new employer flow, a new admin HR console, and a new
notification-event layer — reusing existing patterns
(`EmployerOnboarding.jsx`'s step-form approach, the admin CMS's page/panel
structure, the `api/*/router.js`-style consolidated serverless functions
from §36.3) rather than existing `jobs` infrastructure.

---

## 2. Data model

All new tables. Nothing here modifies `jobs`, `job_applications`, or the
existing employer/candidate profile tables (amendment §14, explicit) — this
keeps the existing Job Board and employer dashboard stat-scoping gap
(§34.2) untouched and unaffected, since it's out of scope for this module.

### 2.1 `ps_candidate_profiles`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → `auth.users` | unique |
| `path` | enum | `operational` \| `professional` — the explicit upfront choice from amendment §3 ("Operational & Skilled Work" vs "Professional / Management Opportunities") |
| `work_types` | text[] | driving/security/technical/etc., multi-select; `operational` path only |
| `skills` | text[] | curated multi-select + "Other", `operational` path only |
| `preferred_locations` | jsonb | reuses `STATE_DISTRICTS` shape already used elsewhere in the app |
| `licences_qualifications` | text[] | |
| `availability` | text | immediate / notice period / date |
| `other_preferences` | text | free text |
| `segment` | enum, nullable | `blue_collar` \| `black_collar` \| `unclassified` — internal-only, per amendment §13. **Open question, see §6.4 below**: not yet clear from either source doc whether this is a separate axis from `path`, or an internal relabeling of the same operational/professional split. Don't build matching logic against it until that's confirmed. |
| `profile_completed` | boolean | true once every step for the chosen `path` is done, gates "I'm Interested" |
| `created_at`, `updated_at` | timestamptz | |

`professional`-path rows skip `work_types`/`skills`/`licences_qualifications`
entirely — the row mainly records the opt-in and drives the admin
Senior/Professional Review queue (§5.4).

Progress (amendment §4's "80% complete" indicator) is **derived, not
stored** — compute from which fields/steps are filled rather than keeping a
separate percentage column that can drift out of sync.

### 2.2 `ps_verifications`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `service_number` | text | |
| `document_url` | text | R2 object — uploaded discharge/release doc, gallery photo, or camera capture |
| `status` | enum | `pending` \| `verified` \| `rejected` — displayed to the candidate as "Verification Pending" / "🛡 VeerNXT Verified" / "Verification Requires Attention" per amendment §6 |
| `reviewed_by` | uuid FK → admin user, nullable | |
| `reviewed_at` | timestamptz, nullable | |
| `rejection_reason` | text, nullable | shown back to candidate if rejected |
| `created_at` | timestamptz | |

Kept separate from `ps_candidate_profiles` so re-submission / admin
re-review doesn't clobber profile data. `ps_candidate_profiles` never stores
a denormalized "verified" boolean — derive it from the latest
`ps_verifications` row (avoids a sync-drift bug class already seen
elsewhere in this codebase, e.g. the `lc_exams`/`exams` naming drift in
§27.9/§27.14 of the status report). The verified badge must only ever
render after an admin sets `status = 'verified'` — never on upload alone
(amendment §6, explicit).

### 2.3 `ps_job_requirements`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `employer_id` | uuid FK → `employer_profiles` | |
| `role_titles` | text[] | one submission can tag more than one related operational category (amendment §2 screen 1: "allow multiple roles where appropriate") — **one requirement, one shared quantity/location**, not a batch-create of N separate postings. If an employer genuinely needs different headcounts per role, that's separate submissions; flag this interpretation to the user before building if it's wrong. |
| `quantity` | integer | e.g. 25 |
| `locations` | text[] | one or more |
| `salary_range` | text, nullable | shown on candidate card if present |
| `description` | text, nullable | pasted description |
| `jd_document_url` | text, nullable | uploaded JD (PDF/DOC/DOCX/image per amendment §2 screen 4), alternative to `description` — at least one of the two required |
| `requirements_text` | text, nullable | "relevant requirements" shown on the card |
| `status` | enum | `submitted` \| `under_review` \| `approved` \| `rejected` \| `filled` \| `closed` |
| `hr_notes` | text, nullable | internal, admin-only |
| `reviewed_by` | uuid FK, nullable | |
| `reviewed_at` | timestamptz, nullable | |
| `created_at`, `updated_at` | timestamptz | |

Only `status = 'approved'` rows are ever queried by the candidate-facing
opportunities feed. Employer-facing status display uses friendlier labels
than the raw enum (amendment §16's example table shows "Matching" /
"Under Review" / "Interviews") — map `submitted`/`under_review` → "Under
Review", `approved` → "Matching", `filled`/`closed` → "Filled"/"Closed" in
the UI layer, not in the stored enum.

### 2.4 `ps_candidate_interest`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `requirement_id` | uuid FK → `ps_job_requirements` | |
| `user_id` | uuid FK | |
| `pipeline_status` | enum | `new` → `hr_reviewing` → `shortlisted` → `candidate_contacted` → `employer_contacted` → `interview` → `offer` → `joined` → `not_selected` → `withdrawn` |
| `hr_notes` | text, nullable | |
| `created_at`, `updated_at` | timestamptz | |

One row per candidate per requirement (`unique(requirement_id, user_id)`).
"Not for me" is **not** stored (amendment §11 confirms this explicitly as
correct) — it's a client-side dismiss from the current opportunities view
only, with a neutral "Got it" confirmation. Don't promise reduced future
recommendations from it — no recommendation engine exists to honor that
promise yet.

### 2.5 `ps_notification_events` — new in this revision, Phase 1 per amendment §8

The amendment's central structural change: notifications are core operating
model, not a Phase 2 nice-to-have.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `event_type` | enum | `employer_requirement_submitted` \| `candidate_verification_submitted` \| `candidate_interest_expressed` \| `pipeline_status_changed` \| `selection_offer_update` |
| `channel` | enum | `email` \| `whatsapp` |
| `subject` | text | structured, per amendment §9 — see below |
| `payload` | jsonb | template data (requirement/candidate/interest snapshot at send time) |
| `related_requirement_id`, `related_user_id`, `related_interest_id` | uuid, nullable | whichever applies |
| `status` | enum | `pending` \| `sent` \| `failed` |
| `sent_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

**Subject format** (amendment §9, use verbatim as the convention):
`[VNXT-EMPLOYER]`, `[VNXT-VERIFICATION]`, `[VNXT-INTEREST]`,
`[VNXT-INTERVIEW]`, `[VNXT-OFFER]`, each followed by a human-readable line
carrying stable identifiers (role/location/counts and the record's own id,
e.g. `VNXT-JOB-00241`) so HR can filter by prefix.

**Real, unresolved dependency — flag before building**: this codebase has
**no existing email or WhatsApp sending integration** (checked: no
`nodemailer`/`resend`/`sendgrid`/`twilio` in `package.json`, no mail-related
`api/` route, no `.env.example` entry for any mail provider). Phase 1 per
the amendment needs email actually working, so a provider decision (Resend
and SendGrid are the two that plug into a Vercel serverless function with
the least friction) is a real blocker for that half of Phase 1 — needs the
user's sign-off (which provider, which sending domain/address, who owns the
inbox HR actually reads these in). WhatsApp has no Business API connection
anywhere in this codebase either; per the amendment, the **event
model/architecture** (this table, the `channel` field) should exist in
Phase 1, but actual WhatsApp delivery likely can't ship until that API
access exists — worth being explicit with the user that "WhatsApp
notification architecture in Phase 1" and "WhatsApp messages actually
sending in Phase 1" are two different commitments.

**Also worth flagging**: `vercel.json` currently sits at 8 rewritten
function groups after the Hobby-plan 12-function consolidation in §36.3 of
the status report (14 → 11 raw files). A notification-sending endpoint
should be added to an existing consolidated router (e.g. alongside
`api/v1/router.js`, or its own `api/private-sector/router.js` handling
requirement/verification/interest/pipeline actions **and** notification
dispatch together) rather than as a standalone new serverless file, to
avoid re-tripping that cap.

### 2.6 RLS

Every table above needs an explicit RLS policy from creation — §37.1 of the
status report documents a real, still-live production bug where a table got
Supabase's auto-enabled-RLS-with-zero-policies default, silently blocking
all anon-key access. Don't repeat that here — either write real policies
(candidate reads/writes own rows; employer reads/writes own
`ps_job_requirements`; admin/service-role bypasses via a server-side API
route, same pattern the admin CMS already uses) or explicitly disable RLS to
match this app's actual security model (client-side session flag, not
Postgres RLS) the way `lc_exam_intro` was — but make the choice
deliberately, not by omission.

---

## 3. Candidate-facing flow

### 3.1 Dashboard entry — two states (amendment §17)

A card on `Dashboard.jsx`, surfaced only after main `profiling_completed`:

- **Before profile completion**: "Improve Your Profile" / "Complete your
  Private Sector Profile to discover opportunities that match your skills
  and experience." → **Complete Profile →**
- **After completion**: "Private Sector Opportunities" / "Opportunities
  matched to your skills, experience and preferences." → **View
  Opportunities →**, plus the verification badge state (🛡 VeerNXT Verified
  / Verification Pending) shown alongside.

### 3.2 One unified "Private Sector Profile" journey (amendment §3, §4)

Single guided journey, not two disconnected components even though the
implementation may internally split them:

1. **Path choice** (first screen, explicit): "What kind of private-sector
   opportunity are you looking for?" — **Operational & Skilled Work**
   ("Driving, logistics, security, technical, field and hands-on roles")
   vs **Professional / Management Opportunities** ("Management, leadership,
   consulting and specialist positions" → **Send My Profile to VeerNXT HR
   →**). The professional path **skips straight to done** — no work-type/
   skills/location questionnaire, existing VeerNXT profile referred to HR
   directly.
2. Operational path only: work preferences → skills & experience →
   preferred locations → licences/qualifications → availability.
3. **Service verification**, presented as the final step of the same
   journey, not a separate flow: service number + document (upload,
   gallery, or camera capture — mobile-friendly, per amendment §5).
4. Progress indicator throughout: "Private Sector Profile — 80% complete"
   with a per-step checklist (✓ Work preferences / ✓ Skills & experience /
   ✓ Preferred location / ○ Service verification), CTA **Complete
   Verification →** for whatever's left.

Verification copy, preserved verbatim from both source docs:
> Please keep your original service documents available. You may be asked
> to present the originals during an interview or verification process.

> Do not upload classified, restricted, operational or security-sensitive
> documents.

(The second line mirrors the legal-aid questionnaire's own existing
"🔒 Please do not upload classified, restricted, operational or security
sensitive documents" line from §38.1 — reuse the same wording for
consistency across the app rather than rephrasing it.)

### 3.3 Private Sector Opportunities feed

Cards from `approved` `ps_job_requirements` only: role, positions,
location, salary/range if present, short description, relevant
requirements. Two actions only — **I'm Interested** / **Not for me**.

**Explicitly do not add** (amendment §10, exhaustive): Apply Now, employer
contact/phone/email, external application link, direct messaging. The
candidate expresses interest to VeerNXT, not to the employer.

"Not for me" dismisses the card from the current view client-side only
(§2.4 above) — neutral "Got it" confirmation, no stored row, no promise of
smarter future recommendations.

### 3.4 Profile-completion gate (amendment §12)

"I'm Interested" with `profile_completed = false` →
**Complete your profile first** / "Before we share your details with our
HR team, we need a few more details about the kind of work you're looking
for." → **Complete Private Sector Profile →** → on completion, return the
candidate to the *same* opportunity (preserve intent via a return-to param)
rather than dropping them back at the feed.

---

## 4. Employer-facing flow

### 4.1 Immediately after onboarding — "Post Your First Job," not the dashboard (amendment §1)

```text
Employer Onboarding → You're Ready to Hire → Post Your First Job
  → Job Requirement Wizard → Requirement Submitted → Employer Dashboard
```

New interstitial screen after `EmployerOnboarding.jsx` completes (before
the existing redirect to `/employer/dashboard`): "You're ready to hire
through VeerNXT" / "Tell us who you're looking for and our HR team will
help find suitable candidates." Primary CTA **Post Your First Job →**. The
dashboard becomes primarily a **returning-employer** surface, not the
first thing a newly-onboarded employer sees.

### 4.2 Job Requirement Wizard — 5 screens (amendment §2, use this copy)

1. **Who are you hiring?** — multi-select from a curated role list
   (Drivers, Delivery Personnel, Mechanics, Security Personnel, Security
   Supervisors, Technicians, Warehouse Personnel, Machine Operators,
   Facility Staff, Field Staff, Other).
2. **How many people do you need?** — single number input.
3. **Where?** — one location vs multiple, then the actual location
   picker(s).
4. **Tell us about the job** — Upload Job Requirement (PDF/DOC/DOCX/image)
   *or* Describe the job (free text: "Tell us briefly about the job,
   responsibilities, working hours and what you're looking for").
5. **Review & Submit** — read-only recap of role/positions/location/
   salary-if-provided/description/requirements, **Submit Requirement** CTA
   → confirmation screen: "Requirement received" / "Our HR team will
   review your requirement and begin identifying suitable candidates."

### 4.3 Employer Dashboard — minimal (amendment §16)

Active Requirements table (Role / Positions / Status, friendly labels per
§2.3 above), **+ Post Another Job** primary CTA. **Explicitly excluded**:
candidate database, candidate search, candidate contact information,
candidate browsing, messaging. The employer sees the progress of their own
requirements, never the private candidate pool.

---

## 5. Admin — new HR console

No existing admin analog to lean on (the admin CMS today manages content,
not a people-pipeline). New section, tabs under something like
`AdminPrivateSector.jsx`:

### 5.1 Requirements queue
`ps_job_requirements` by status (New / Under Review / Approved / Rejected /
Filled / Closed). Approve/reject/edit-before-approving — HR "standardises"
the requirement per the spec's own wording. Approving is the action that
makes a requirement visible to candidates.

### 5.2 Verification queue
`ps_verifications` with `status = 'pending'`, showing the uploaded document
+ service number, approve/reject with an optional reason (Pending /
Verified / Requires Attention).

### 5.3 Candidate interest / pipeline board
Per approved requirement: `ps_candidate_interest` rows grouped by
`pipeline_status` (New / HR Reviewing / Shortlisted / Candidate Contacted /
Employer Contacted / Interview / Offer / Joined / Not Selected /
Withdrawn), with candidate profile summary. This is the actual replacement
for "employer browses candidates" — HR does that browsing on the
employer's behalf. A plain status dropdown per row is enough for v1; a
drag/kanban interaction can come later.

### 5.4 Senior / Professional Review — its own clearly separated queue
Per amendment §15, `path = 'professional'` candidates must **not** be
folded into the requirement-linked pipeline board — they're not tied to
any one requirement. Separate list/tab in the same console.

### 5.5 Notification log
Read-only view over `ps_notification_events` (subject, channel, status,
timestamp) — mainly for debugging delivery, not a primary workflow screen.

---

## 6. Open decisions — flag before building

1. **Service verification — manual only for v1.** No automated
   document/OCR verification; admin reviews the uploaded document by eye.
   (Both source docs agree on this.)
2. ~~Senior/professional path~~ — **resolved by the amendment**: explicit
   upfront UI choice (§3.2 above), not just a backend flag. No longer open.
3. ~~In-app messaging~~ — **resolved, hard rule now**: amendment §19/§22
   make this an explicit guardrail, not just a default. No longer open.
4. ~~Blue Collar / Black Collar segmentation~~ — **resolved by the user**:
   it's a static internal role taxonomy, not a separate candidate input or
   an alias for the `operational`/`professional` `path` split. Every
   curated role in the operational wizard/profile options maps to exactly
   one `job_class` (`blue_collar` \| `black_collar`), fixed at the taxonomy
   level, never candidate- or admin-assigned per-profile:
   ```text
   Blue Collar: Driver, Delivery, Mechanic, Warehouse, Technician, Machine Operator
   Black Collar: Security Supervisor, Facility Supervisor, Operations Supervisor,
                 Fleet Supervisor, Site Manager
   ```
   Never rendered to candidates or employers — internal only, for HR
   matching/reporting/segmentation. Implemented as a shared taxonomy module
   (`src/lib/privateSectorTaxonomy.js`) mapping role → `job_class`, reused
   by both the employer wizard's role picker and the candidate profile's
   work-type picker, rather than a per-profile `segment` column — the
   classification is a property of the *role*, not something set per
   candidate/requirement. `ps_job_requirements.role_titles` and
   `ps_candidate_profiles.work_types` both store the human-readable role
   strings; `job_class` is derived by looking those strings up in the
   taxonomy wherever HR reporting needs it, not stored redundantly.
5. ~~Email provider~~ — **resolved: MSG91**, already partially integrated
   in this codebase (`api/auth/otp.js` uses `MSG91_AUTH_KEY`/
   `MSG91_TEMPLATE_ID` for SMS OTP via MSG91's Flow API). **Phase 1 ships
   WhatsApp only, via MSG91's WhatsApp API** — email is explicitly deferred
   until after everything else is built (user's own instruction), so
   `ps_notification_events.channel` is populated as `whatsapp` for every
   event in this build; `email` stays a valid enum value for when that
   later phase happens, but nothing sends through it yet. MSG91 WhatsApp
   needs its own integrated-number + pre-approved template setup (separate
   from the existing SMS OTP template) — real template IDs aren't
   available yet, so the sender follows the exact same dev-mode-fallback
   convention `api/auth/otp.js` already uses (log/simulate instead of
   throwing when the relevant env vars aren't set), rather than blocking
   the rest of the build on that setup.
6. **Employers can't edit a requirement once submitted, only see status,
   for v1.** Editing/closing/marking-filled is admin-driven for v1 —
   matches amendment §21 (employer self-service editing is explicitly
   Phase 2).

---

## 7. Explicitly out of scope (spec §10 + amendment §22)

- No candidate search/browse for employers, ever.
- No direct contact-detail exchange in either direction, ever, without a
  future explicit product decision to change the model.
- No public/unauthenticated job listing page — stays inside the
  authenticated candidate/employer app.
- No in-app candidate↔employer messaging.
- No public candidate or employer profiles.
- No changes to the existing `jobs`/Job Board/`job_applications` flow —
  this is a parallel module, not a replacement.
- Do not market or build v1 as a fully automated AI recruitment engine —
  the system may assist matching, but VeerNXT HR makes the final call
  (amendment §18).

---

## 8. Phasing (revised per amendment §20/§21)

**Phase 1 — the complete end-to-end operating loop, including
notifications**

*Candidate*: unified Private Sector Profile (operational + professional
paths), service verification + status states + verified badge, Private
Sector Opportunities feed, profile-completion gate, I'm Interested / Not
for me.

*Employer*: onboarding → immediate "Post Your First Job" CTA, the 5-screen
requirement wizard, requirement status view, minimal dashboard.

*HR*: requirement queue, verification queue, candidate-interest/pipeline
queue, senior/professional review queue (separated), **email notification
events working end-to-end** for all five event types in §2.5, WhatsApp
notification *architecture* in place (`channel` field, event table) even
if actual WhatsApp sending depends on Business API access landing
separately.

```text
Employer Onboarding → Post Requirement → VeerNXT HR Review
  → Requirement Approved → Candidate Sees Opportunity
  → Candidate Profile / Verification → I'm Interested
  → VeerNXT HR Notification → HR Reviews Candidate
  → HR Contacts Candidate → HR Contacts Employer
  → Interview → Selection → Offer → Joining
```

**Phase 2 — optimisation, not basic functionality**
Employer self-service editing/close/fill, advanced matching, recommendation
learning, candidate preference intelligence, automated WhatsApp workflows,
interview scheduling integration (Google Meet/Zoom), HR analytics and
recruitment-funnel reporting, advanced employer reporting, automated
reminders.

---

## 9. Instruction to Claude, once this is approved

Build Phase 1 in this order: schema + RLS first (verify with a real
insert/select as both an anon-scoped and service-role client before
building any UI on top, given §37.1's RLS-default footgun) → employer
requirement submission + the two admin approval queues (requirements,
verification) → candidate profile/verification/opportunities flow → the
notification-event layer wired into all five trigger points (don't leave
this for last — it's Phase 1, not an add-on) → the pipeline/senior-review
queues last, since they depend on everything upstream already being real
and testable. Resolve open decisions §6.4 (segmentation) and §6.5 (email
provider) with the user before writing code that depends on them — the
rest of §6 can proceed on the stated defaults. Verify each piece live
(Playwright against the dev server, per the pattern established in
§37.3/§38.1 of the status report — install fresh into scratchpad
`node_modules` if not already present) rather than compile-check only.
