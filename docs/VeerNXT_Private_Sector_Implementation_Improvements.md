# VeerNXT Private Sector Employment — Implementation Improvements

## Purpose

This document contains the **product and implementation changes** to make to Claude's existing Private Sector Employment implementation plan.

The existing plan is fundamentally sound. **Do not discard or redesign the architecture.** Apply the changes below before implementation.

The core product principle remains:

> **VeerNXT HR is the mandatory intermediary between employers and candidates.**

Employers do not search or contact candidates directly. Candidates do not contact employers directly. VeerNXT HR owns screening, matching, communication and interview coordination.

---

## 1. Make the Employer's First Action "Post Your First Job"

For a newly onboarded employer, do **not** send them to an empty or information-heavy dashboard.

Immediately after onboarding, show:

### You're ready to hire through VeerNXT

> Tell us who you're looking for and our HR team will help find suitable candidates.

Primary CTA:

**Post Your First Job →**

### Flow

```text
Employer Onboarding
        ↓
You're Ready to Hire
        ↓
Post Your First Job
        ↓
Job Requirement Wizard
        ↓
Requirement Submitted
        ↓
Employer Dashboard
```

The dashboard is primarily for returning employers.

---

## 2. Keep the Job Posting Wizard Extremely Simple

The employer should be able to submit a requirement in approximately **4–5 screens**.

### Screen 1 — Who are you hiring?

Examples:

- Drivers
- Delivery Personnel
- Mechanics
- Security Personnel
- Security Supervisors
- Technicians
- Warehouse Personnel
- Machine Operators
- Facility Staff
- Field Staff
- Other

Allow multiple roles where appropriate.

### Screen 2 — How many people?

> **How many people do you need?**

Large number input, e.g. `25`.

### Screen 3 — Where?

Ask:

- One location
- Multiple locations

Then collect the relevant city/state/location information.

### Screen 4 — Tell us about the job

Give the employer two choices:

**Upload Job Requirement**

Allow PDF, DOC, DOCX and image.

**Describe the job**

Large text field:

> Tell us briefly about the job, responsibilities, working hours and what you're looking for.

VeerNXT HR can standardise the requirement later.

### Screen 5 — Review & Submit

Show role, positions, location, salary/range if provided, description and requirements.

CTA:

**Submit Requirement**

After submission:

> **Requirement received**

> Our HR team will review your requirement and begin identifying suitable candidates.

---

## 3. Make the Senior / Professional Candidate Path Explicit

The existing plan correctly includes `interest_type = senior_review`, but this must be a visible product decision.

At the beginning of the Private Sector Profile:

# What kind of private-sector opportunity are you looking for?

### Operational & Skilled Work

> Driving, logistics, security, technical, field and hands-on roles.

**Continue →**

### Professional / Management Opportunities

> Management, leadership, consulting and specialist positions.

**Send My Profile to VeerNXT HR →**

The professional path should **skip the operational/private-sector questionnaire**.

The candidate's existing VeerNXT profile can be referred directly to HR.

---

## 4. Treat Private Sector Profile + Verification as One Candidate Journey

The implementation may use separate components such as:

- `PrivateSectorProfile.jsx`
- `PrivateSectorVerification.jsx`

That is technically fine.

From the candidate's perspective, however, these should feel like **one profile-completion journey**.

Example:

```text
PRIVATE SECTOR PROFILE

1. Work preferences
2. Skills & experience
3. Preferred locations
4. Service verification
5. Complete
```

Show a completion indicator such as:

> **Private Sector Profile — 80% complete**

Then:

- ✓ Work preferences
- ✓ Skills & experience
- ✓ Preferred location
- ○ Service verification

CTA:

**Complete Verification →**

---

## 5. Make Service Verification a Core Part of Profile Completion

The candidate provides:

### Service Number

`Enter your service number`

### Service Document

Allow:

- Upload discharge/release document
- Choose from phone gallery
- Take a photograph using the phone camera

The interface must be mobile-friendly.

---

## 6. Verification Status Must Be Explicit

Do not immediately show `Verified` simply because a document was uploaded.

Use:

```text
Pending
   ↓
VeerNXT HR Review
   ↓
Verified
```

Possible statuses:

- **Verification Pending**
- **VeerNXT Verified**
- **Verification Requires Attention / Rejected**

Only after VeerNXT review should the candidate receive:

### 🛡 VeerNXT Verified

The uploaded document is evidence for the VeerNXT review process; it should not automatically be treated as authenticated merely because it was uploaded.

---

## 7. Preserve the Original-Document Instruction

During verification, explicitly tell the candidate:

> **Please keep your original service documents available. You may be asked to present the originals during an interview or verification process.**

Also retain:

> Do not upload classified, restricted, operational or security-sensitive documents.

---

## 8. Notifications Must Be Phase 1

The existing plan places email/WhatsApp notifications in Phase 2.

### Change this.

Notifications are part of the core operating model and therefore must be included in **Phase 1 architecture and workflow**.

At minimum, create notification events for:

```text
Employer submits requirement
        ↓
HR notification

Candidate submits service verification
        ↓
HR notification

Candidate expresses interest
        ↓
HR notification

HR moves candidate to interview
        ↓
Relevant notification/workflow

Selection / offer update
        ↓
Relevant notification/workflow
```

Email should be supported in Phase 1.

WhatsApp integration can follow the available API/integration, but the event model should be designed from the beginning.

---

## 9. Standardise Notification Subjects

Use structured subjects so the VeerNXT HR team can filter and process messages efficiently.

Examples:

```text
[VNXT-EMPLOYER]
New Hiring Requirement — 25 Drivers — Bengaluru

[VNXT-VERIFICATION]
Candidate Verification Submitted — VNXT-CAND-00452

[VNXT-INTEREST]
Candidate Interested — Drivers — Bengaluru — VNXT-JOB-00241

[VNXT-INTERVIEW]
Interview Coordination Required — VNXT-JOB-00241

[VNXT-OFFER]
Offer / Selection Update — VNXT-JOB-00241
```

Use stable identifiers wherever possible.

---

## 10. Candidate Opportunities Must Stay Extremely Simple

The Private Sector Opportunities page should not become another complicated job board.

Each card should primarily show:

- Role
- Number of positions
- Location
- Salary/range if available
- Short description
- Relevant requirements

Actions:

### I'm Interested

### Not for me

Do not add:

- Apply Now
- Employer Contact
- Employer Phone
- Employer Email
- External application
- Direct messaging

The candidate is expressing interest to **VeerNXT**, not applying directly to the employer.

---

## 11. "Not for Me" Does Not Need a Database Table in V1

The existing plan's decision not to store `Not for me` is correct.

Do not build a complex recommendation/dismissal system in V1.

The action can simply dismiss the opportunity from the current view.

Use a neutral confirmation:

> **Got it.**

Do not promise that VeerNXT will automatically show fewer jobs like this until recommendation logic actually exists.

---

## 12. Profile Completion Must Gate "I'm Interested"

If a candidate has not completed the Private Sector Profile, they may browse opportunities.

When they select:

**I'm Interested**

show:

## Complete your profile first

> Before we share your details with our HR team, we need a few more details about the kind of work you're looking for.

CTA:

**Complete Private Sector Profile →**

After completion:

- Return the candidate to the same opportunity.
- Preserve the intended job.
- Allow them to express interest without having to find the job again.

---

## 13. Keep "Blue Collar / Black Collar" Internal

Do not expose:

- Blue Collar
- Black Collar

in the candidate-facing UI.

These can remain internal classifications for:

- Matching
- Reporting
- Analytics
- Employer segmentation

Candidates should see human-readable categories such as:

- Drivers
- Mechanics
- Security
- Logistics
- Technicians
- Operations
- Warehouse
- Facility
- Field roles

---

## 14. Maintain Separation From the Existing Jobs System

Claude's decision to create a parallel Private Sector module is correct.

Do not modify the existing:

- `jobs`
- `job_applications`
- Existing Job Board

for this feature unless a later product decision explicitly requires it.

Use the new Private Sector objects:

```text
ps_candidate_profiles
ps_verifications
ps_job_requirements
ps_candidate_interest
```

This keeps the managed recruitment model separate from the existing job-board/application model.

---

## 15. HR Is the Real Recruitment Workspace

The HR console should not become an employer-style candidate marketplace.

HR should see:

### Requirements

- New
- Under Review
- Approved
- Rejected
- Filled
- Closed

### Verification

- Pending
- Verified
- Requires Attention

### Candidate Interest

- New
- HR Reviewing
- Shortlisted
- Candidate Contacted
- Employer Contacted
- Interview
- Offer
- Joined
- Not Selected
- Withdrawn

### Senior / Professional Review

Candidates who selected the professional/management path should appear in a separate HR review area or clearly separated queue.

---

## 16. Employer Dashboard Should Remain Minimal

After the first requirement is submitted, the employer dashboard can show:

### Active Requirements

| Role | Positions | Status |
|---|---:|---|
| Drivers | 25 | Matching |
| Mechanics | 8 | Under Review |
| Security Supervisors | 4 | Interviews |

Primary CTA:

**+ Post Another Job**

Do not show:

- Candidate database
- Candidate search
- Candidate contact information
- Candidate browsing
- Messaging

The employer sees the **progress of their requirements**, not the private candidate pool.

---

## 17. Candidate Dashboard Should Have Two Clear States

### Before completion

## Improve Your Profile

> Complete your Private Sector Profile to discover opportunities that match your skills and experience.

CTA:

**Complete Profile →**

### After completion

## Private Sector Opportunities

> Opportunities matched to your skills, experience and preferences.

CTA:

**View Opportunities →**

Also show verification state:

> 🛡 **VeerNXT Verified**

or

> **Verification Pending**

---

## 18. HR Remains the Final Human Decision Layer

Initial matching can use:

```text
Role
Location
Skills
Experience
Qualifications/licences
Availability
Service background
Candidate preferences
Verification status
```

The system may assist with matching, but:

> **VeerNXT HR makes the final shortlist and coordinates the relationship.**

Do not build or market V1 as a fully automated AI recruitment engine.

---

## 19. Do Not Build Direct Messaging

There should be **no in-app candidate ↔ employer messaging** in this module.

Communication model:

```text
Candidate
    ↕
VeerNXT HR
    ↕
Employer
```

HR can use:

- Email
- WhatsApp
- Phone
- Google Meet
- Zoom
- Other agreed communication tools

The candidate and employer should not receive each other's private contact details unless there is a future explicit product decision to change this model.

---

## 20. Revised Phase 1

Implement the complete end-to-end operating loop in Phase 1.

### Candidate

- Private Sector Profile
- Operational/skilled pathway
- Senior/professional pathway
- Service verification
- Verification status
- VeerNXT Verified badge
- Private Sector Opportunities
- Profile-completion gate
- I'm Interested / Not for me

### Employer

- Employer onboarding
- Immediate Post Your First Job CTA
- Simple job requirement wizard
- Requirement status
- Minimal employer dashboard

### HR

- Employer requirement queue
- Verification queue
- Candidate interest queue
- Matching/review
- Pipeline
- Senior/professional review
- Email notification events
- WhatsApp notification architecture

### Complete loop

```text
Employer Onboarding
        ↓
Post Requirement
        ↓
VeerNXT HR Review
        ↓
Requirement Approved
        ↓
Candidate Sees Opportunity
        ↓
Candidate Profile / Verification
        ↓
I'm Interested
        ↓
VeerNXT HR Notification
        ↓
HR Reviews Candidate
        ↓
HR Contacts Candidate
        ↓
HR Contacts Employer
        ↓
Interview
        ↓
Selection
        ↓
Offer
        ↓
Joining
```

---

## 21. Revised Phase 2

Phase 2 should focus on optimisation rather than basic functionality:

- Employer self-service editing
- Employer close/fill requirement
- Advanced matching
- Recommendation learning
- Candidate preference intelligence
- Automated WhatsApp workflows
- Interview scheduling integration
- Google Meet / Zoom integration
- HR analytics
- Recruitment funnel reporting
- Advanced employer reporting
- Automated reminders

---

## 22. Critical Product Rule

The implementation must be judged against this principle:

> **Do not build a job marketplace. Build a managed recruitment workflow.**

If implementation introduces any of the following, stop and reconsider:

- Employer candidate search
- Employer candidate browsing
- Contact unlocking
- Direct candidate contact
- Direct employer contact
- Candidate applications sent directly to employers
- Candidate/employer messaging
- Public candidate profiles
- Public employer contact details

The intended model is:

> **Employers tell VeerNXT who they need. Candidates tell VeerNXT what they want. VeerNXT HR brings the right people together.**

---

## 23. Final Instruction to Claude

The existing implementation plan is fundamentally approved.

**Apply this document as an amendment to that plan. Do not replace the existing architecture.**

The primary changes are:

1. Make **Post Your First Job** the immediate employer action after onboarding.
2. Make the employer wizard **4–5 extremely simple steps**.
3. Make the **Senior / Professional** candidate path an explicit early choice.
4. Treat Private Sector Profile + Service Verification as **one candidate journey**.
5. Make **Pending → HR Review → Verified** explicit.
6. Move **notification architecture into Phase 1**.
7. Keep candidate opportunities and employer dashboards minimal.
8. Keep Blue Collar / Black Collar as **internal classifications only**.
9. Preserve the separate `ps_*` Private Sector data model.
10. Keep VeerNXT HR as the **mandatory intermediary at every stage**.

The objective is not to create another job portal.

The objective is to create a **simple, trusted, VeerNXT-managed employment pipeline for ex-servicemen and Agniveers**.
