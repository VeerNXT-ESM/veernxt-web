# VeerNXT Learning Center — Popular Exams Section Redesign

## Scope

This document covers **only the Popular Exams section** of the VeerNXT Learning Center page.

The section should allow users to:

1. Browse popular examinations.
2. Select an exam card.
3. Display the selected exam's information directly below the cards.
4. Switch between exams without navigating away from the page.
5. View exam overview, eligibility, stages, preparation duration, subjects, and related actions.

---

## 1. Recommended Layout

Use a horizontal exam-card selector followed by an expandable exam-details panel.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Popular Exams                                      View all →        │
│ Most sought-after exams by aspirants                                 │
├──────────────────────────────────────────────────────────────────────┤
│ [UPSC] [SSC] [State PSC] [Police] [Banking] [Defence]       →        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  SSC Examinations                 [Bookmark]       │
│  │              │  Staff Selection Commission (SSC)                 │
│  │  Exam Image  │  Description of the selected examination           │
│  │              │                                                     │
│  └──────────────┘  [Eligibility] [Stages] [Subjects] [Duration]      │
│                                                                      │
│                    [Start Learning] [View Syllabus] [Exam Guide]    │
│                                                                      │
│  ──────────────────────────────────────────────────────────────────  │
│  Overview | Syllabus | Exam Pattern | Eligibility | Resources | FAQs │
│                                                                      │
│  About the Exam              What You Will Learn     Related Exams   │
│  Description                 ✓ Topic 1               SSC CGL         │
│  ✓ Key benefit               ✓ Topic 2               SSC CHSL        │
│  ✓ Key benefit               ✓ Topic 3               SSC MTS         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Section Header

### Content

- Heading: `Popular Exams`
- Supporting text: `Most sought-after exams by aspirants like you`
- Right-side action: `View all →`

### Design

- Use a white card container.
- Add a subtle border and soft shadow.
- Keep the heading visually stronger than the supporting text.
- Maintain consistent spacing with the other Learning Center sections.
- Use the VeerNXT green and gold visual identity.

---

## 3. Popular Exam Cards

### Suggested Cards

The initial list can include:

1. UPSC Civil Services
2. SSC Examinations
3. State PSC Exams
4. Police Examinations
5. Banking & Insurance
6. Defence Examinations

### Card Content

Each card should contain:

- Exam image or emblem.
- Category badge.
- Exam title.
- Conducting body.
- Short exam description.
- Rating and learner count, if available.
- Bookmark icon.
- Selected state.

### Card States

#### Default

- White background.
- Light border.
- Subtle shadow.
- Neutral bookmark icon.

#### Hover

- Slight elevation.
- Border changes to the brand green.
- Smooth transition.
- Cursor indicates that the card is clickable.

#### Selected

- Green border, approximately `2px`.
- Very light green background or selected indicator.
- Green check or active marker.
- Details panel updates below the card row.

### Important Interaction

Clicking a card must **not navigate to a new page**.

Instead:

```text
selectedExam = clickedExam
```

The details panel below the card row should update immediately.

---

## 4. Exam Details Panel

The details panel should be rendered below the popular exam cards.

### Main Information

Display:

- Exam logo or cover image.
- Exam name.
- Official conducting organization.
- A short overview.
- Optional status badge such as:
  - Popular
  - High Vacancy
  - Defence
  - State Level
  - Banking

### Example

```text
SSC Examinations
Staff Selection Commission (SSC)

The Staff Selection Commission conducts recruitment examinations
for different Group B and Group C positions across government
departments and ministries.
```

Do not use fixed descriptions for every exam. The content should come from the exam data object or backend API.

---

## 5. Exam Metadata

Display important information using compact icon-based information blocks.

Recommended metadata:

| Field | Example |
|---|---|
| Eligibility | Graduate / 12th Pass |
| Exam Stages | Tier I, Tier II |
| Main Subjects | Quantitative Aptitude, Reasoning, English, GK |
| Preparation Time | 6–12 Months |
| Exam Type | Government Recruitment |
| Mode | Online / Offline, if available |

Only display values that exist in the database.

If a value is unavailable, hide the metadata item rather than showing incorrect placeholder information.

---

## 6. Action Buttons

Place the primary actions on the right side of the details panel.

### Primary Action

```text
Start Learning →
```

Behavior:

- Opens the learning journey for the selected exam.
- Uses the existing application route or learning handler.
- Should preserve the selected exam identifier.

### Secondary Actions

```text
View Syllabus
Download Exam Guide
```

Behavior:

- `View Syllabus`: opens the syllabus view for the selected exam.
- `Download Exam Guide`: downloads or opens the available guide.
- Hide actions if the required resource is unavailable.

### Suggested Button Hierarchy

- Primary: dark green filled button.
- Secondary: white button with green border.
- Tertiary: text link or icon button.

---

## 7. Details Tabs

Add tabs inside the expanded details panel.

### Suggested Tabs

1. Overview
2. Syllabus
3. Exam Pattern
4. Eligibility
5. Preparation Strategy
6. Study Material
7. Resources
8. FAQs

### Tab Behavior

- Overview is active by default.
- Clicking a tab updates only the content inside the details panel.
- Do not reload the entire page.
- Keep the selected exam unchanged when switching tabs.
- On mobile, allow horizontal scrolling or use a compact dropdown.

### Example State

```js
const [activeExamTab, setActiveExamTab] = useState("overview");
```

When the selected exam changes:

```js
setActiveExamTab("overview");
```

This ensures every newly selected exam opens at the beginning of its information.

---

## 8. Overview Tab Layout

Use a three-column layout on desktop.

### Column 1: About the Exam

Include:

- Official exam overview.
- Conducting organization.
- Recruitment purpose.
- Exam frequency, if available.
- Important factual highlights.

### Column 2: What You Will Learn

Use a checklist layout:

- Core concepts and fundamentals.
- Topic-wise preparation.
- Previous-year question practice.
- Mock test preparation.
- Time management.
- Revision strategy.

The checklist should be configurable for each exam.

### Column 3: Related Exams

Display related exams in compact list cards.

Example:

- SSC CGL
- SSC CHSL
- SSC MTS
- SSC GD Constable
- SSC CPO

Related exams should be based on the selected exam category or backend mapping.

---

## 9. Suggested Data Structure

Create a reusable exam object.

```js
const popularExams = [
  {
    id: "upsc-civil-services",
    title: "UPSC Civil Services",
    organization: "Union Public Service Commission",
    category: "Central Government",
    badge: "Popular",
    image: "/assets/exams/upsc.jpg",
    rating: 4.9,
    learnerCount: "3.4k",
    eligibility: "Graduate",
    stages: "Prelims, Mains, Interview",
    subjects: "General Studies + Optional Subject",
    preparationDuration: "12–18 Months",
    description:
      "Official exam overview should be loaded from the CMS or API.",
    whatYouLearn: [
      "General Studies preparation",
      "Previous-year question practice",
      "Mock tests and revision",
      "Interview preparation"
    ],
    relatedExams: [
      "ssc-cgl",
      "state-psc"
    ],
    actions: {
      learningRoute: "/learning/upsc-civil-services",
      syllabusAvailable: true,
      guideAvailable: true
    }
  }
];
```

Use the actual backend field names already present in the project rather than duplicating data unnecessarily.

---

## 10. React Component Structure

Recommended component breakdown:

```text
PopularExamsSection
├── SectionHeader
├── PopularExamCarousel
│   └── PopularExamCard
├── SelectedExamDetails
│   ├── ExamSummary
│   ├── ExamMetaGrid
│   ├── ExamActions
│   ├── ExamTabs
│   └── ExamTabContent
│       ├── OverviewTab
│       ├── SyllabusTab
│       ├── ExamPatternTab
│       ├── EligibilityTab
│       ├── PreparationStrategyTab
│       ├── ResourcesTab
│       └── FaqTab
└── RelatedExams
```

Keep the details panel reusable so it can work with any exam category.

---

## 11. State Management

Suggested state:

```js
const [selectedExamId, setSelectedExamId] = useState(
  popularExams[0]?.id
);

const [activeExamTab, setActiveExamTab] = useState("overview");
```

Selected exam:

```js
const selectedExam = popularExams.find(
  (exam) => exam.id === selectedExamId
);
```

Card click handler:

```js
const handleExamSelect = (examId) => {
  setSelectedExamId(examId);
  setActiveExamTab("overview");
};
```

If the application already uses Context API, Redux, Zustand, or another shared state solution, follow the existing project pattern instead of introducing a new state-management library.

---

## 12. Responsive Behavior

### Desktop

- Display 5–6 exam cards in a horizontal carousel.
- Details panel uses a two- or three-column layout.
- Actions remain visible on the right.
- Related exams appear in a side column.

### Tablet

- Display 3–4 cards.
- Use a two-column details layout.
- Move related exams below the primary content if necessary.

### Mobile

- Display one card at a time or a horizontally scrollable card row.
- Stack image, title, description, metadata, and actions vertically.
- Convert tabs into a horizontal scrollable list.
- Place `Start Learning` as a full-width primary button.
- Related exams appear below the overview content.
- When a card is selected, automatically scroll the details panel into view if the existing UX supports it.

---

## 13. Visual Design Guidelines

### Color Palette

Use the existing VeerNXT brand colors:

```css
--veer-green: #245b38;
--veer-dark-green: #123b29;
--veer-light-green: #edf6ed;
--veer-gold: #d6a33d;
--veer-border: #dfe7df;
--veer-text: #172033;
--veer-muted: #6b7785;
```

Verify the current design tokens before adding new global variables.

### Styling

- Border radius: `10px–14px`.
- Use consistent card heights.
- Avoid excessive gradients.
- Keep text readable and accessible.
- Use subtle shadows rather than heavy effects.
- Use smooth transitions for hover and selected states.
- Avoid displaying too much information in the card itself; place detailed content in the panel below.

---

## 14. Accessibility

Ensure that:

- Exam cards are keyboard accessible.
- Cards use buttons or accessible interactive elements.
- Selected cards expose an active state.
- Tabs use appropriate ARIA attributes.
- Images include meaningful alt text.
- Color is not the only indicator of selection.
- Buttons have descriptive labels.
- Focus states are visible.

Example:

```jsx
<button
  type="button"
  aria-pressed={selectedExamId === exam.id}
  onClick={() => handleExamSelect(exam.id)}
>
  {exam.title}
</button>
```

---

## 15. Loading, Empty, and Error States

### Loading

Display skeleton cards while exam data is loading.

### Empty State

If no popular exams exist:

```text
Popular exams will appear here soon.
Explore all available exams.
```

### Error State

If the API fails:

```text
We couldn't load popular exams.
Please try again.
```

Do not render broken images or undefined values.

---

## 16. Implementation Checklist

- [ ] Locate the existing Popular Exams component.
- [ ] Reuse the existing exam data/API.
- [ ] Add `selectedExamId` state.
- [ ] Make each exam card clickable.
- [ ] Add selected card styling.
- [ ] Render the selected exam details below the cards.
- [ ] Add overview, syllabus, exam pattern, and resource tabs.
- [ ] Connect the Start Learning button to the existing route.
- [ ] Connect syllabus and guide actions to real resources.
- [ ] Add related exam mapping.
- [ ] Add loading and error states.
- [ ] Make the section responsive.
- [ ] Test card selection on desktop and mobile.
- [ ] Test keyboard navigation and accessibility.
- [ ] Verify that existing page sections are not affected.

---

## 17. Acceptance Criteria

The redesign is complete when:

1. The Popular Exams section appears in the existing Learning Center page.
2. A user can click any popular exam card.
3. The selected card is visually highlighted.
4. The selected exam information opens directly below the cards.
5. Selecting another exam updates the same details panel.
6. The overview tab is reset when a different exam is selected.
7. Start Learning uses the selected exam's actual identifier.
8. Syllabus and resource buttons use valid application data.
9. The layout works on desktop, tablet, and mobile.
10. No existing exam data or routes are replaced with hardcoded fake content.

---

## Final UX Recommendation

Use an **inline expandable details panel** rather than opening a modal or navigating to a separate page.

This keeps the user in the Popular Exams section, makes comparison easier, reduces navigation friction, and allows the same UI to support UPSC, SSC, State PSC, Police, Banking, and Defence examinations.
