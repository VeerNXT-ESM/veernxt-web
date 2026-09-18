# Engineering & Feature Changelog Report: VeerNXT Platform
**Date:** September 18, 2026  
**Repository:** `veernxt-web` (`https://github.com/VeerNXT-ESM/veernxt-web`)  
**Scope of Changes:** **25 files changed (+7,705 lines, -1,117 lines)** across 4 major commits pushed to `origin/main`

---

## Executive Summary

A comprehensive full-stack upgrade was implemented across the VeerNXT platform, focused on two primary strategic pillars:
1. **Legal Aid Assistance Cell & Operations Portal**: End-to-end digitisation of veteran legal aid requests, secure Supabase persistence, user-facing submission history tracking, and a full dark-themed admin management suite with a dual-mode communication console (Veteran Reply & Advocate Case Referral).
2. **Private Sector Corporate Career Engine & Military Taxonomy**: Complete overhaul of the corporate recruitment workflow, automated candidate notification broadcaster (`emailBroadcaster.js`), and a deep military-to-civilian skills mapping matrix across Army, Navy, and Air Force trades and ranks.

---

## 1. Legal Aid Assistance Cell (User & Admin Portals)

### 1.1 Veteran Portal (`src/pages/LegalAidCell.jsx` & `LegalAidCell.css`)
* **Real Database Persistence**: Replaced the previous prototype alert mock with authenticated/anonymous insertion into Supabase (`legal_aid_queries`).
* **Complete Intake Data Structure**: Captures veteran identity, contact coordinates (verified email + phone), urgency level (`Low`, `Medium`, `High`, `Critical`), dispute category, service arm branch, and multi-step questionnaire responses.
* **Live "My Submissions" History**:
  * Added dynamic history view in the sidebar for desktop viewports and a responsive horizontal card strip for mobile devices.
  * Veterans can monitor case statuses in real time (`Submitted`, `In Review`, `Responded`, `Closed`) with color-coded badges.
  * Tracks query submissions via authenticated `user_id` and retains continuity across sessions with client-side persistence fallback.
* **Confirmation & Case Tracking**: On submission, veterans receive a unique generated case tracking reference (`VNXT-LA-XXXXXX`) with expected turnaround guidance.

### 1.2 Administrative Legal Aid Console (`src/pages/admin/AdminLegalAid.jsx`)
* **Dark Theme Native Design**: Fully aligned with the Admin CMS dark theme design system (`#0d1117` canvas, `#10b981` emerald accent tokens, dark surface cards, and translucent borders).
* **Operational KPI Metrics**: Real-time summary header displaying counts for **Total Inquiries**, **New**, **Under Review**, **Resolved/Responded**, and **Critical Cases**.
* **Filterable & Searchable Inquiries Table**: Filter by urgency, service arm, status, and search by query ref or veteran name.
* **Interactive Case Drawer**:
  * Slides out to reveal comprehensive case dossier, chronological timeline, structured Q&A questionnaire responses, and veteran service background.
  * Direct status state machine controller (`New` ➔ `In Review` ➔ `Responded` ➔ `Closed`) with internal admin audit notes.
* **Dual-Tab Email Dispatch Engine**:
  * **Tab 1: Reply to Veteran**: Pre-configured, empathetic acknowledgement with automated case references, assigned points of contact, and next steps.
  * **Tab 2: Forward to Advocate**: Formats a formal legal brief including veteran service background, legal issue classification, urgency level, concise problem statement, and pro bono/professional counsel engagement request.
  * Pre-populates recipient fields with support for custom CC additions and SMTP email dispatch.

### 1.3 Backend & Database Architecture
* **Serverless API Route (`api/admin/legal-aid.js`)**:
  * Authenticated administrative endpoint protected via `x-admin-api-secret`.
  * `GET`: Retrieves all inquiries with sorting and search filters.
  * `POST send_email`: Dispatches email via Nodemailer and auto-transitions case to `Responded`.
  * `POST update_status`: Modifies inquiry lifecycle state and updates administrative remarks.
* **Database Schema (`sql/legal_aid_queries.sql`)**:
  * Complete SQL migration defining `legal_aid_queries` with Row-Level Security (RLS) policies granting anonymous/authenticated insert privileges and service-role administrative management.

---

## 2. Private Sector Career Portal & Military Taxonomy

### 2.1 Military-to-Civilian Taxonomy Engine (`src/lib/militaryTaxonomy.js`)
* **+1,117 lines of domain mapping**: Translates Indian Armed Forces corps, arms, ranks, and specialized trades into civilian industry-equivalent competencies.
* **Tri-Service Coverage**: Army (Infantry, EME, Signals, ASC, AOC, Engineers), Indian Navy (Executive, Engineering, Electrical, Logistics), and Indian Air Force (Flying, Technical, Administration, Logistics, Accounts).
* **Capability Normalization**: Maps specialized military experience to corporate skills like Supply Chain Optimization, Fleet Management, Critical Infrastructure Security, Aerospace Maintenance, and Cross-Functional Leadership.

### 2.2 Private Sector Competency Framework (`src/lib/privateSectorTaxonomy.js`)
* **Industry Verticals & Standardized Tags**: Defined standard job categories, skill tags, experience levels, and capability clusters (+319 lines) to facilitate high-precision matching between ex-servicemen and corporate job postings.

### 2.3 Automated Email Broadcaster (`api/private-sector/emailBroadcaster.js`)
* **Automated Candidate Matching & Alerting**: Outbound notification service that informs matched veterans when an employer publishes a relevant job.
* **Resilient Credential Parsing**: Implemented direct disk-level `.env` reader bypassing Node/Vite process memory caching for uninterrupted SMTP credential rotations.
* **Branded Responsive Email Layouts**: Generates accessible email notifications with role parameters, salary ranges, location, capability matches, and direct 1-click application URLs.

### 2.4 Employer Experience Suite
* **Post Job Requirement (`src/pages/PostJobRequirement.jsx`)**: Overhauled job creator (+1,312 lines) with multi-tag capability selectors, military trade preferences, compensation sliders, and job state controls (`Active`, `Draft`, `Paused`, `Closed`).
* **Find Candidates (`src/pages/FindCandidates.jsx`)**: Advanced candidate search engine (+1,538 lines) enabling recruiters to filter military talent by rank, arms/services, civilian skill tags, readiness timeline, and location.
* **Employer Dashboard (`src/pages/EmployerDashboard.jsx`)**: Centralized dashboard (+337 lines) with active posting metrics, candidate application pipelines, and profile verification workflows.
* **Employer Onboarding (`src/pages/EmployerOnboarding.jsx`)**: Verification workflows and profile completion for enterprise employers.
* **Candidate Profile & Opportunities (`PrivateSectorProfile.jsx` & `PrivateSectorOpportunities.jsx`)**: Overhauled the veteran-facing job board and resume builder (+1,934 lines) highlighting operational service history, skill translations, and application statuses.
* **Admin Management (`src/pages/admin/AdminPrivateSector.jsx` & `src/pages/admin/UsersPage.jsx`)**: Enhanced employer approvals, candidate moderation, and enterprise auditing.

### 2.5 Private Sector Router & Database Migrations
* **API Router (`api/private-sector/router.js`)**: Core enterprise routing logic (+522 lines) managing job requirements, applicant retrieval, candidate searching, and profile updates.
* **SQL Migrations**:
  * `sql/broadcast_job_notification.sql`: Notification history and delivery logging.
  * `sql/jobs_multi_tags_and_status.sql`: Multi-tag indexing and lifecycle state tracking for job requisitions.
  * `sql/private_sector_sector_and_tags.sql`: Industry tags, taxonomy tables, and indexing constraints.

---

## 3. Git Commit Summary (Chronological)

| Commit Hash | Author | Message | Key Impact Areas |
| :--- | :--- | :--- | :--- |
| `6822269` | `souvik6296` | `feat: legal aid query submission + admin portal Legal Aid tab` | Core Legal Aid flow, admin tab, backend API, Supabase schema |
| `3a1c00e` | `souvik6296` | `fix(legal-aid-admin): dark theme match + two email tabs (Veteran reply & Advocate forward)` | Legal Aid admin dark theme, dual email tabs, major Private Sector update |
| `1495f13` | `souvik6296` | `feat(legal-aid): user submission history in sidebar + mobile strip` | User-facing past queries & status tracker in sidebar & mobile |
| `4a2e4b6` | `souvik6296` | `feat: add email broadcaster, military taxonomy, and SQL migration scripts` | `emailBroadcaster.js`, `militaryTaxonomy.js`, SQL migrations |

---

## 4. File-by-File Impact Matrix

| File Path | Status | Lines Changed | Description |
| :--- | :--- | :--- | :--- |
| `api/admin/legal-aid.js` | Added | +179 | Admin API for query listing, status transitions, and email replies |
| `api/private-sector/emailBroadcaster.js` | Added | +392 | Disk-resilient SMTP broadcaster for veteran job alert matching |
| `api/private-sector/router.js` | Modified | +522 | Backend router for employer requirements, applicants, & talent search |
| `sql/broadcast_job_notification.sql` | Added | +33 | Notification tracking and audit schema |
| `sql/jobs_multi_tags_and_status.sql` | Added | +20 | Multi-tag capability and status state machine for job postings |
| `sql/legal_aid_queries.sql` | Added | +39 | Schema, RLS policies, and triggers for veteran legal aid queries |
| `sql/private_sector_sector_and_tags.sql` | Added | +25 | Taxonomy schemas and index definitions for industry sectors |
| `src/lib/militaryTaxonomy.js` | Added | +1,117 | Full Tri-Service military-to-civilian trade and skills translation engine |
| `src/lib/privateSectorTaxonomy.js` | Modified | +319 | Industry sectors, qualifications, and core capability clusters |
| `src/pages/admin/AdminLegalAid.jsx` | Added/Updated | +624 | Dark theme Admin Legal Aid dashboard with dual-tab email composer |
| `src/pages/admin/AdminPrivateSector.jsx` | Modified | +87 | Admin controls for employer listings and candidate oversight |
| `src/pages/admin/AdminShell.jsx` | Modified | +17, -1 | Added Legal Aid navigation entry under Operations |
| `src/pages/admin/adminNavConfig.js` | Modified | +1 | Nav registry entry for `/admin/legal-aid` |
| `src/pages/admin/UsersPage.jsx` | Modified | +26 | Added user role management and profile inspection |
| `src/pages/EmployerDashboard.jsx` | Modified | +337 | Pipeline metrics, applicant review, and post management |
| `src/pages/EmployerOnboarding.jsx` | Modified | +41 | Verification and corporate onboarding flow |
| `src/pages/FindCandidates.jsx` | Modified | +1,538 | Candidate discovery and filtering by military background |
| `src/pages/LegalAidCell.jsx` | Modified | +204, -30 | Real Supabase intake form, user submission history sidebar |
| `src/pages/LegalAidCell.css` | Modified | +6 | Responsive styling for mobile history strip |
| `src/pages/PostJobRequirement.jsx` | Modified | +1,312 | Multi-step job posting wizard with military taxonomy mapping |
| `src/pages/PrivateSectorOpportunities.jsx` | Modified | +661 | Veteran job board with capability matches and status indicators |
| `src/pages/PrivateSectorProfile.jsx` | Modified | +1,273 | Veteran career profile builder with military trade mapping |
| `src/App.jsx` | Modified | +2 | Route registration for `/admin/legal-aid` |

---

## 5. Verification & Deployment Status

1. **Repository Synchronization**:
   * All 25 modified and newly created files are tracked, committed, and pushed to `origin/main`.
   * Working trees across `veernxt-web`, `veernxt-ai-api`, and `VeerNXT` are 100% clean.
2. **Production Deployment**:
   * Automatic CI/CD build triggered on Vercel for `veernxt-web`.
   * Live web application accessible on `https://www.veernxt.in`.
3. **Database Integration**:
   * `legal_aid_queries` table active in Supabase production database (`jtcyeufhvpieyngracpo`) with verified RLS policies.
