# VeerNXT Reader Theme System — Implementation Prompt

You are working on the VeerNXT Learning Center codebase.

I want you to implement a **Reader Theme System** for the book/resource reader.

The objective is to allow the visual design of books to be changed globally or per theme **without changing the underlying book content JSON, block schema, or semantic rendering architecture**.

---

## 1. Existing Architecture

The current reader has two content-rendering paths:

### New block-based format

`SecureReader.jsx` loads chapter JSON containing semantic blocks and renders them through:

* `ChapterHeader`
* `BlockRenderer`
* `BookBlocks.css`

The semantic blocks include things such as:

* paragraph
* heading
* list
* numberedList
* image
* callout
* table
* comparisonTable
* keyFacts
* pullQuote
* examAlert
* statStrip

**Do not change the semantic block model.**

`BlockRenderer.jsx` should remain the semantic dispatcher.

### Legacy HTML format

`SecureReader.jsx` also supports older HTML/Quill content through:

* `.reader-main`
* `.reader-card`
* `.reader-content`
* `.ql-snow`
* `dangerouslySetInnerHTML`

The theme system must support this path too.

---

# 2. Main Goal

Create a reusable:

## Reader Theme System

The theme should control:

* typography
* body font
* heading font
* font sizes
* line heights
* text colors
* background colors
* primary/accent color
* secondary color
* borders
* shadows
* corner radius
* spacing
* paragraph spacing
* heading spacing
* table styling
* callout styling
* chapter header styling
* book cover styling
* blockquote styling
* list styling
* image treatment
* reader navigation styling
* legacy HTML reader styling
* mobile behavior

The theme must be implemented primarily through **CSS variables/design tokens**.

Do NOT hard-code theme-specific colors throughout individual components.

---

# 3. Important Architectural Rule

Do NOT modify the content JSON.

Do NOT introduce theme information into individual content blocks.

For example, this should remain valid:

```json
{
  "type": "paragraph",
  "content": "Some educational content..."
}
```

And:

```json
{
  "type": "heading",
  "level": 2,
  "content": "Introduction"
}
```

The same content should be able to render using:

* Academic
* Modern
* Exam Prep
* Textbook

without changing the JSON.

---

# 4. Create This Architecture

Create:

```text
components/book/theme/
    ReaderThemeProvider.jsx
    readerThemeRegistry.js
    readerThemeTokens.js
    ThemeSwitcher.jsx

    themes/
        academic.js
        modern.js
        examPrep.js
        textbook.js
```

Use the existing project conventions where appropriate.

Do not create unnecessary abstractions.

---

# 5. ReaderThemeProvider

Create:

```jsx
<ReaderThemeProvider theme="academic">
    ...
</ReaderThemeProvider>
```

The provider should:

1. Resolve the selected theme.
2. Expose the theme through React context.
3. Apply theme CSS variables to the reader root.
4. Support a subject accent color independently from the reader theme.
5. Persist the selected theme in:

```text
localStorage
```

using:

```text
veernxt_reader_theme
```

6. Gracefully fall back to the default theme if the stored theme does not exist.

The theme should be available to all reader components.

---

# 6. Theme Registry

Create a central registry similar to:

```js
export const readerThemes = {
    academic: academicTheme,
    modern: modernTheme,
    examPrep: examPrepTheme,
    textbook: textbookTheme,
};
```

Each theme should define tokens rather than arbitrary component-specific CSS.

Example:

```js
{
    id: "academic",
    name: "Academic",
    description: "Traditional scholarly reading experience",

    tokens: {
        primary: "...",
        secondary: "...",
        background: "...",
        surface: "...",
        text: "...",
        textMuted: "...",

        headingFont: "...",
        bodyFont: "...",

        bodySize: "...",
        bodyLineHeight: "...",

        radiusSmall: "...",
        radiusMedium: "...",
        radiusLarge: "...",

        spacingUnit: "...",

        shadowSmall: "...",
        shadowMedium: "..."
    }
}
```

You may expand this token structure if necessary.

---

# 7. Separate Theme From Subject Color

This is important.

The reader theme controls the overall visual language.

The subject/exam can supply its own accent color.

For example:

```text
Theme = Academic
Subject = Nursing
Subject Accent = Purple
```

or:

```text
Theme = Academic
Subject = Banking
Subject Accent = Blue
```

The theme should reference:

```css
var(--reader-primary)
```

where appropriate.

Do NOT bake subject colors into the themes.

The subject accent should override only the appropriate accent tokens.

---

# 8. Initial Themes

Create four visually distinct themes.

## Academic

Traditional scholarly textbook.

Characteristics:

* serif body typography
* restrained accent color
* generous reading width
* subtle borders
* elegant chapter headers
* minimal decoration
* excellent long-form reading experience

---

## Modern

Contemporary digital learning platform.

Characteristics:

* clean sans-serif typography
* generous whitespace
* rounded surfaces
* subtle shadows
* modern cards
* cleaner tables
* slightly more visual hierarchy

---

## Exam Prep

Optimized for competitive exam preparation.

Characteristics:

* highly scannable
* strong headings
* compact spacing
* visually distinct exam alerts
* prominent key facts
* clear tables
* strong accent treatment
* optimized for rapid revision

---

## Textbook

Traditional educational textbook.

Characteristics:

* highly readable serif body
* clear chapter hierarchy
* traditional textbook-like tables
* restrained callouts
* strong chapter openings
* comfortable paragraph spacing
* minimal UI distraction

---

# 9. Refactor BookBlocks.css

Refactor the existing `BookBlocks.css`.

Do NOT redesign every component from scratch.

First preserve the current appearance as closely as possible.

Replace hard-coded visual values with variables.

For example, instead of:

```css
color: #1e293b;
```

use:

```css
color: var(--reader-text);
```

Instead of:

```css
color: #0f766e;
```

use:

```css
color: var(--reader-primary);
```

Instead of:

```css
font-family: Merriweather, Georgia, serif;
```

use:

```css
font-family: var(--reader-body-font);
```

Do this throughout the block system.

---

# 10. Token Categories

Create tokens for at least:

### Colors

```text
--reader-primary
--reader-primary-soft
--reader-secondary
--reader-background
--reader-surface
--reader-surface-alt
--reader-text
--reader-text-muted
--reader-heading
--reader-border
--reader-border-strong
--reader-success
--reader-warning
--reader-danger
--reader-info
```

### Typography

```text
--reader-body-font
--reader-heading-font
--reader-ui-font

--reader-body-size
--reader-body-line-height

--reader-h1-size
--reader-h2-size
--reader-h3-size
--reader-h4-size

--reader-heading-weight
```

### Spacing

```text
--reader-space-xs
--reader-space-sm
--reader-space-md
--reader-space-lg
--reader-space-xl
--reader-space-2xl
```

### Shape

```text
--reader-radius-sm
--reader-radius-md
--reader-radius-lg
```

### Shadows

```text
--reader-shadow-sm
--reader-shadow-md
--reader-shadow-lg
```

### Layout

```text
--reader-content-width
--reader-reading-width
--reader-sidebar-width
```

---

# 11. Theme All Existing Blocks

Make sure these respond to the theme:

### Paragraphs

* font
* size
* line height
* color
* spacing
* justification

### Drop Caps

Allow each theme to define:

* font
* size
* color
* weight

### Headings

Theme:

* font
* weight
* size
* color
* spacing
* border treatment

### Lists

Theme:

* font
* bullet/number color
* borders
* spacing

### Images

Theme:

* radius
* shadow
* caption treatment

### Callouts

All existing variants must remain:

* important
* exam-tip
* definition
* example
* generic

The theme controls their:

* background
* border
* icon color
* text color
* typography

Do not remove the variants.

### Tables

Theme:

* header
* body
* borders
* alternating rows
* hover
* typography
* radius
* shadow

### Comparison Tables

Keep the existing semantic behavior.

### Key Facts

Theme:

* background
* border
* heading
* bullet
* accent

### Pull Quote

Theme:

* font
* quote mark
* color
* border/accent

### Exam Alert

Theme:

* warning background
* accent
* icon
* typography

### Stat Strip

Theme:

* card
* border
* number
* label
* spacing

---

# 12. Chapter Header

Theme the existing `ChapterHeader`.

It should respond to:

```text
--reader-primary
--reader-heading
--reader-text-muted
--reader-border
--reader-heading-font
```

Allow themes to produce substantially different visual treatments.

For example:

Academic:

```text
Large chapter number
Thin rule
Elegant typography
```

Exam Prep:

```text
Compact chapter badge
Strong title
More compact vertical spacing
```

Do not change the component's semantic API.

---

# 13. Book Cover

Theme the existing book cover.

Allow the theme to control:

* background
* title font
* title size
* subtitle
* author
* border
* radius
* shadow
* spacing

Do not modify the content structure.

---

# 14. SecureReader.jsx

Integrate the theme provider around the entire reader.

The theme must cover:

* reader navigation
* sidebar
* chapter navigation
* block reader
* legacy HTML reader
* locked state
* loading state
* pagination
* mark-read controls
* flipbook container where appropriate

Do not only wrap `BlockRenderer`.

The current `SecureReader.jsx` contains a large inline `<style>` block.

**Move reader-specific visual styling out of the inline style block where practical.**

Do not break functionality while doing this.

If some styles genuinely need to remain component-local, that's acceptable.

---

# 15. Theme Switcher

Add a `ThemeSwitcher` to the existing reader navigation.

Place it near:

```text
Scroll View / 3D Flipbook
```

It should allow the user to select:

```text
Academic
Modern
Exam Prep
Textbook
```

Use a compact UI.

Do not create a giant settings panel.

Example:

```text
Theme ▾
Academic
Modern
Exam Prep
Textbook
```

Persist selection to:

```text
veernxt_reader_theme
```

The selection should immediately update the reader.

---

# 16. Do Not Break Reader Mode

The existing:

```text
Scroll View
3D Flipbook
```

functionality must continue working.

Do not remove:

* reader mode state
* localStorage persistence
* chapter navigation
* print
* share
* mark as read
* access control
* subscription logic

Theme changes must not affect these behaviors.

---

# 17. Legacy HTML Reader

This is important.

The current `SecureReader.jsx` contains a separate styling system for:

```text
.reader-content
.reader-main
.reader-card
.ql-snow
```

The theme system must also style these.

Map legacy styles onto the same tokens.

For example:

```css
.reader-content {
    color: var(--reader-text);
    font-family: var(--reader-body-font);
}
```

and:

```css
.reader-content h2 {
    color: var(--reader-heading);
    font-family: var(--reader-heading-font);
}
```

Do not create a second independent theme system.

Both rendering paths should consume the same variables.

---

# 18. AdminResourcePreview

The admin preview currently uses a white wrapper around the block reader because the CMS interface itself is dark while the book content styling is light.

Remove this dependency where appropriate.

The admin preview should use the exact same:

```text
ReaderThemeProvider
BookBlocks.css
BlockRenderer
ChapterHeader
```

system as the real reader.

This ensures:

```text
CMS Preview ≈ Actual Reader
```

The admin preview should be able to select a theme as well.

---

# 19. Important: Preserve Existing Functionality

Do NOT change:

* Supabase queries
* R2 loading
* chapter loading
* access control
* subscriptions
* awards
* content JSON
* block schema
* chapter schema
* resource schema
* reader mode
* flipbook behavior
* pagination logic
* authentication
* routing

This task is primarily a **presentation-layer refactor**.

---

# 20. Avoid These Mistakes

Do NOT:

* duplicate BlockRenderer
* create separate components for every theme
* add theme metadata to every content block
* hard-code colors inside individual blocks
* create four copies of BookBlocks.css
* change the content JSON schema
* rewrite the R2 content pipeline
* introduce a new state-management library
* introduce Tailwind if the project isn't already using it
* remove existing callout variants
* remove legacy HTML support
* remove flipbook support

The goal is:

```text
ONE semantic content system
        ↓
ONE renderer
        ↓
ONE theme token layer
        ↓
MULTIPLE visual themes
```

---

# 21. Theme Architecture

The final architecture should look approximately like:

```text
Content JSON
     ↓
BlockRenderer
     ↓
Semantic Components
     ↓
ReaderThemeProvider
     ↓
CSS Variables / Design Tokens
     ↓
Theme
     ↓
Visual Output
```

Subject accent should be a separate layer:

```text
Theme
  +
Subject Accent
  ↓
Reader Tokens
```

---

# 22. Backward Compatibility

Existing resources must render without requiring any migration.

If no theme is specified:

```text
Academic
```

should be used as the default.

Existing content should look as close as possible to its current appearance after the refactor.

---

# 23. Implementation Process

Before modifying files:

1. Inspect the existing:

   * `SecureReader.jsx`
   * `BookBlocks.css`
   * `BlockRenderer.jsx`
   * `ChapterHeader`
   * `AdminResourcePreview`
   * any existing reader CSS

2. Identify duplicate styles.

3. Identify hard-coded colors, fonts and spacing.

4. Create the theme/token architecture.

Then implement incrementally.

---

# 24. Deliverables

Create/modify:

```text
components/book/theme/ReaderThemeProvider.jsx
components/book/theme/readerThemeRegistry.js
components/book/theme/readerThemeTokens.js
components/book/theme/ThemeSwitcher.jsx

components/book/theme/themes/academic.js
components/book/theme/themes/modern.js
components/book/theme/themes/examPrep.js
components/book/theme/themes/textbook.js

BookBlocks.css
SecureReader.jsx
AdminResourcePreview.jsx
```

Only modify other files if genuinely necessary.

---

# 25. Final Validation

After implementation, verify:

### Rendering

* Existing block JSON renders.
* Legacy HTML renders.
* All existing block types render.
* Tables work.
* Images work.
* Callouts work.
* Chapter headers work.
* Book covers work.

### Themes

Switching between:

```text
Academic
Modern
Exam Prep
Textbook
```

changes the appearance immediately.

### Persistence

Reloading the page preserves the selected theme.

### Subject Accent

Changing the subject accent changes the appropriate visual accents without destroying the theme.

### Reader

Verify:

* Scroll View
* 3D Flipbook
* chapter navigation
* previous/next
* print
* share
* mark as read
* locked content
* mobile layout

all continue working.

### Admin

The CMS preview should use the same visual theme system as the actual reader.

---

# 26. Code Quality

Keep the implementation clean and maintainable.

Prefer:

```text
semantic components
+
design tokens
+
theme configuration
```

over:

```text
conditional JSX everywhere
```

Do not write code like:

```jsx
if (theme === "academic") {
   ...
} else if (theme === "modern") {
   ...
}
```

inside every component.

The theme should primarily be data + CSS variables.

---

# 27. Important Final Requirement

When finished, give me:

1. A concise summary of the architecture.
2. A list of files created.
3. A list of files modified.
4. Any migration requirements.
5. Any potential regressions you identified.
6. A short explanation of how I can add a fifth theme later.

Do not rewrite the content model.

Do not make the reader dependent on a particular theme.

The result should make it possible to introduce an entirely new visual identity later by adding a theme configuration and its token values rather than rebuilding the reader.
