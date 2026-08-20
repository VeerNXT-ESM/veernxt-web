# VEERNXT CMS — Learning Center Rearchitecture

## Objective

Rework the Learning Center CMS so that learning resources are stored as a canonical content library and are NOT duplicated for every examination.

The system currently has approximately 100 unique books/resources, but many of these have been duplicated across different exams because they were previously treated as exam-specific content.

The new architecture must separate:

1. Conducting Bodies
2. Regions
3. Exams
4. Subjects / Syllabus
5. Canonical Resources

A resource should exist ONCE and be reusable across any number of exams and subjects.

Example:

"Objective General English"

should be one canonical resource.

It may then be assigned to:

- SSC CGL → English
- SSC CHSL → English
- IBPS PO → English
- RRB NTPC → English

Do NOT create duplicate copies of the resource.

---

# 1. CMS DESIGN LANGUAGE

Use the existing VEERNXT CMS visual language.

The interface should feel like a professional internal content-management system rather than a consumer-facing website.

### Visual direction

- Dark interface
- Deep navy / charcoal background
- Green / teal primary accent
- High information density
- Clean typography
- Subtle borders
- Minimal decorative effects
- No excessive gradients
- No giant marketing cards
- Tables, filters, drawers and structured panels
- Responsive desktop-first layout
- Clear hierarchy
- Fast interaction

The interface should resemble a modern professional SaaS/admin tool.

---

# 2. PRIMARY NAVIGATION

Replace the current "All Exams" style navigation with a structured CMS navigation.

Recommended navigation:

LEARNING

- Exams
- Syllabus
- Resources

CONTENT

- Categories
- Tags
- Content Library

ANALYTICS

- Overview
- Content Graph
- Reports

SYSTEM

- Users
- Roles & Permissions
- Settings
- Audit Logs

The main focus of this task is Exams, Syllabus and Resources.

---

# 3. EXAM INDEX

The Exams page should NOT show an endless collection of cards that require scrolling.

It must behave like a searchable database.

The primary filtering hierarchy is:

CONDUCTING BODY → REGION → EXAM NAME

For example:

[ Staff Selection Commission ▼ ]
[ Central ▼ ]
[ CGL / Search Exam... ]

The filters must update the results immediately.

No page reload.

No submit button.

Use instant client-side filtering where possible.

If the dataset is large, debounce the search input.

---

# 4. EXAM FILTERS

At the top of the Exams page create a prominent filter/search bar.

### Filter 1 — Conducting Body

Examples:

- Staff Selection Commission
- Union Public Service Commission
- Institute of Banking Personnel Selection
- Railway Recruitment Board
- Indian Air Force
- Tamil Nadu Public Service Commission
- Uttar Pradesh Public Service Commission
- etc.

This should be a searchable select.

---

### Filter 2 — Region

Region is a master classification.

Allowed values:

- Central
- State
- UT

This should be a simple filter.

---

### Filter 3 — Exam Name

Searchable text field.

Examples:

- CGL
- CHSL
- MTS
- PO
- CDS
- AFCAT
- Group 4
- PCS

Search should work against the exam name immediately.

Example:

Conducting Body:
Staff Selection Commission

Region:
Central

Exam Name:
CGL

Result:

SSC CGL

---

# 5. EXAM TABLE

Use a dense table rather than large cards.

Columns:

| Exam | Conducting Body | Region | Subjects | Resources | Status |
|---|---|---|---:|---:|---|

Example:

SSC CGL
Staff Selection Commission
Central
4
38
Published

SSC CHSL
Staff Selection Commission
Central
4
31
Published

IBPS PO
Institute of Banking Personnel Selection
Central
5
42
Draft

TNPSC Group 4
Tamil Nadu Public Service Commission
State
4
28
Published

The table should support:

- Sorting
- Search
- Filtering
- Pagination
- Row selection
- Quick edit
- Status
- Duplicate
- Archive

Do not require users to scroll through dozens of visual cards.

---

# 6. ADD / EDIT EXAM

When creating or editing an exam, use a structured editor.

The PRIMARY identity fields are:

### Conducting Body

Searchable select.

### Region

Select:

- Central
- State
- UT

### Exam Name

Example:

CGL

The UI can display the complete public-facing name:

Combined Graduate Level (CGL)

but the internal exam identity should remain clean.

---

# 7. EXAM TAGS

Support additional tags.

Examples:

- Government
- Graduate
- 10+2
- Defence
- Banking
- Technical
- Competitive

Tags are metadata and should NOT replace Conducting Body or Region.

Conducting Body and Region are structured fields.

Tags are flexible metadata.

---

# 8. DYNAMIC THUMBNAILS

Do NOT require admins to upload a separate thumbnail for every exam.

The thumbnail should be generated dynamically.

The thumbnail system should combine:

1. Template
2. Subject/category visual
3. Conducting Body abbreviation
4. Exam identity

Example:

Template:

GENERAL AWARENESS

Dynamic conducting body:

SSC

Generated result:

GENERAL
AWARENESS

SSC

Another:

QUANTITATIVE
APTITUDE

IBPS

Another:

COMPUTER
SCIENCE

UPSC

The admin should be able to select a thumbnail template and optionally choose an accent color.

Show a live preview in the exam editor.

---

# 9. SYLLABUS MODEL

This is the most important architectural change.

An exam should NOT contain duplicated books.

An exam contains SUBJECTS.

Each subject references resources from the canonical Resource Library.

Example:

SSC CGL

SUBJECTS:

01 — English
    12 Resources

02 — Hindi
    8 Resources

03 — Mathematics
    15 Resources

04 — Computer Science
    7 Resources

---

# 10. SUBJECT EDITOR

Each subject should support:

- Subject name
- Subject icon/category
- Description
- Display order
- Assigned resources

Allow drag-and-drop ordering.

Example:

01 English
02 Hindi
03 Mathematics
04 Computer Science

---

# 11. ADD RESOURCE TO SUBJECT

When the admin clicks:

"+ Add Resource"

DO NOT create a new resource.

Open a searchable resource-selection drawer/modal.

Example:

ADD RESOURCES TO ENGLISH

Search resources...

[✓] Objective General English
    Book

[ ] High School English Grammar
    Book

[✓] Vocabulary Builder
    Book

[ ] Competitive English
    Book

Show:

"2 resources selected"

Then:

[Cancel] [Add Resources]

The selected resources become references/relationships to the canonical Resource records.

---

# 12. RESOURCE LIBRARY

Create a separate Resource Library.

This is the master content database.

The library should contain the approximately 100 unique resources.

Example columns:

| Resource | Type | Subject | Used By Exams | Status |
|---|---|---|---:|---|

Example:

Objective General English
Book
English
11 Exams
Published

Quantitative Aptitude
Book
Mathematics
9 Exams
Published

Computer Awareness
Book
Computer Science
7 Exams
Published

---

# 13. RESOURCE DETAIL

Opening a resource should show:

RESOURCE NAME

Resource ID

Resource Type

Category / Subject

Description

Metadata

Then:

## EXAMS USING THIS RESOURCE

SSC CGL
SSC CHSL
SSC MTS
IBPS PO
RRB NTPC

This is important because admins should be able to see the reuse of content.

Also display:

"Used by 11 exams"

---

# 14. DATA RELATIONSHIPS

The database should conceptually follow:

Conducting Body
    ↓
Region
    ↓
Exam
    ↓
Subject
    ↓
Resource Reference
    ↓
Canonical Resource

Resources must NOT be duplicated.

The relationship should be many-to-many where appropriate.

Example:

Resource:
Objective General English

can be referenced by:

SSC CGL → English
SSC CHSL → English
IBPS PO → English

while remaining one resource record.

---

# 15. GLOBAL SEARCH

Add a global search field in the CMS header.

Search across:

- Exams
- Conducting Bodies
- Subjects
- Resources
- Tags

Example:

Searching "CGL"

could return:

EXAMS
SSC CGL

RESOURCES
Resources used by SSC CGL

SUBJECTS
Subjects inside SSC CGL

The search should feel instantaneous.

---

# 16. SYLLABUS TAB

Create a dedicated Syllabus section.

This should allow admins to inspect subjects independently from exams.

Potential layout:

Syllabus

Search subjects...

English
142 resources
Used across 18 exams

Mathematics
118 resources
Used across 16 exams

General Awareness
96 resources
Used across 21 exams

Computer Science
43 resources
Used across 9 exams

Clicking a subject should show:

- Resources
- Exams using the subject
- Content counts
- Resource reuse

This gives the content team a second way of navigating the data.

---

# 17. CONTENT GRAPH / ANALYTICS TAB

Create a dedicated "Content Graph" section.

This should be an experimental but useful visualization of the content architecture.

DEFAULT VIEW:

## Resource Reuse Graph

Visualize:

EXAM → SUBJECT → RESOURCE

Example:

SSC CGL
    ↓
English
    ↓
Objective General English

SSC CHSL
    ↓
English
    ↓
Objective General English

IBPS PO
    ↓
English
    ↓
Objective General English

The shared resource should visually converge into a single node.

This demonstrates that multiple exams are consuming the same canonical content.

---

# 18. OTHER CONTENT GRAPH VIEWS

Provide a view selector:

### Resource Reuse
Shows which resources are shared across exams.

### Exam Structure
Exam → Subject → Resource hierarchy.

### Subject Coverage
Shows how many resources exist for each subject.

### Regional Distribution
Central → State → UT → Conducting Body → Exam.

### Content Gaps
Identify exams or subjects with unusually low resource coverage.

### Resource Heatmap
Rows = Resources
Columns = Exams
Cell intensity = whether/how heavily the resource is used.

The graph should not just be decorative.

Every node should be clickable.

Clicking a resource should open the Resource Detail view.

Clicking an exam should open the Exam Editor.

---

# 19. ANALYTICS DASHBOARD

The Overview tab can contain lightweight metrics.

Examples:

TOTAL EXAMS
128

UNIQUE RESOURCES
103

SUBJECTS
24

CONDUCTING BODIES
18

RESOURCE REUSE RATE
67%

Then charts:

### Resources by Type

Books
PDFs
Videos
Articles
Other

### Subjects by Resource Count

Bar chart.

### Exams by Region

Central
State
UT

### Top Shared Resources

Show resources used by the greatest number of exams.

This is especially useful for discovering the most important canonical content.

---

# 20. IMPORTANT UX PRINCIPLE

The content team should never have to ask:

"Have we already created this book?"

The CMS should make duplication difficult.

When creating a resource, search for existing resources first.

If a similar resource already exists:

SHOW:

"This resource already exists."

Then offer:

[Use Existing Resource]

instead of creating another copy.

---

# 21. EXAM CREATION FLOW

New Exam:

1. Select Conducting Body
2. Select Region
3. Enter Exam Name
4. Add Tags
5. Select Thumbnail Template
6. Preview Generated Thumbnail
7. Add Subjects
8. Assign Existing Resources
9. Review
10. Publish

At no point should the admin need to duplicate existing resources.

---

# 22. PERFORMANCE

The CMS should be optimized for large content sets.

Requirements:

- Instant filtering
- Debounced search
- Pagination
- Lazy loading where appropriate
- Avoid rendering hundreds of cards simultaneously
- Efficient Supabase queries
- Indexed search/filter fields
- Avoid unnecessary network requests
- Optimistic UI where safe

The interface should remain fast even if the system grows from:

~100 resources / 100 exams

to:

1,000+ resources / 1,000+ exams.

---

# 23. SUPABASE / DATA MODEL

Before changing the database, inspect the existing schema.

Do not destroy existing production data.

Determine which existing tables can be migrated.

The target conceptual model should include:

conducting_bodies
regions
exams
subjects
resources
exam_subjects
subject_resources
tags
exam_tags
thumbnail_templates

Use relationship tables for many-to-many relationships.

Do not store duplicated resource records inside exams.

---

# 24. MIGRATION

Because the existing CMS may contain duplicated resources:

DO NOT immediately delete duplicates.

First:

1. Identify duplicate resources.
2. Determine canonical resource.
3. Create relationships from exams/subjects to canonical resource.
4. Validate counts.
5. Validate that every exam still exposes the correct learning material.
6. Only then mark duplicate records as deprecated/archive candidates.

Migration must be reversible.

---

# 25. MOCKUP / UI PRIORITY

Build the UI around the following screen hierarchy:

1. Exams
2. Exam Editor
3. Syllabus
4. Resources
5. Content Graph
6. Analytics

The Exams page is the primary workflow.

The most important interaction is:

[Conducting Body] [Region] [Search Exam Name]

followed by an immediately filtered table.

The second most important interaction is:

Exam → Subject → Select existing Resources.

The third is:

Resource → Show all Exams using it.

---

# 26. DO NOT DO

Do NOT:

- Duplicate books for every exam.
- Create separate copies of identical learning material.
- Use large exam cards as the primary navigation.
- Force admins to scroll through hundreds of exams.
- Make Conducting Body a free-text field.
- Make Region a tag.
- Make tags substitute for structured metadata.
- Require manual thumbnail uploads for every exam.
- Build analytics that are purely decorative.
- Replace the existing database without inspecting it first.

---

# 27. SUCCESS CRITERIA

The new CMS is successful if a content administrator can:

1. Find any exam in seconds.
2. Filter by Conducting Body.
3. Filter by Central / State / UT.
4. Search the exam name instantly.
5. Create a new exam without uploading a thumbnail.
6. Select subjects for the exam.
7. Assign existing resources to each subject.
8. See how many exams use a resource.
9. Reuse one resource across many exams.
10. See the relationships between exams, subjects and resources visually.
11. Add new exams without creating duplicate learning content.

The architecture should make the distinction between:

**EXAM CONFIGURATION**

and

**CANONICAL LEARNING CONTENT**

very clear throughout the UI and database.