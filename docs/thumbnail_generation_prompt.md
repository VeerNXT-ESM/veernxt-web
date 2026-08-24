# VeerNXT Category Thumbnail Generation — Prompt & Plan

## The approach

The existing thumbnail templates (`public/thumbnils/thumbnil royal {green,blue,red}.png`, 1024×1536) aren't abstract icons — they're an ornate crest design with baked-in elements: the VeerNXT shield + laurel wreath, gold ribbon banners carrying a Hindi motto ("सेवा से समृद्ध कल की ओर") and its English translation, and the "VeerNXT" wordmark. That crest is the actual brand mark, not decoration.

**Do not regenerate the crest, wordmark, or Hindi text via the image model.** Text-to-image models — including this one — are unreliable at reproducing an exact existing logo and non-Latin script consistently across separate generations; five independently-generated near-copies of the crest will drift and look inconsistent, worse than not touching it at all.

Instead, split it into two layers, the same way the caption text already works today (`renderCustomThumbnailCanvas` in `AdminDriveIngestion.jsx` draws dynamic text onto a static background at ingestion time):

1. **AI-generated layer** (this prompt): background texture/environment + a category-specific motif at the bottom, in the category's accent color. No crest, no wordmark, no baked-in text of any kind.
2. **Code-composited layer** (existing mechanism, extended): the fixed VeerNXT crest/wordmark/ribbon graphic (crop it once from an existing thumbnail, or ask design for a clean transparent-background version) gets drawn on top at a fixed position, plus the dynamic exam-name caption — both via canvas, exactly like today.

This guarantees the crest is pixel-identical and correctly-worded across all 5 category thumbnails, and only the genuinely-variable parts (color, background mood, bottom motif) come from the image model.

## Category color-coding

Extends the existing "Royal ___" naming rather than inventing an unrelated palette — 3 of the 5 colors are already-approved assets:

| Category | Color | Motif at bottom (replaces the books/grad-cap) |
|---|---|---|
| Intro | Royal Blue (existing) | An open gate/compass-and-map motif — "starting point" |
| Guide | Royal Green (existing — flagship) | Stack of books + graduation cap (keep as-is, already correct for Guide specifically) |
| Precis | Muted Gold | A single bookmarked document + magnifying glass — "distilled summary" |
| PYQ | Royal Red/Burgundy (existing) | A stack of aged exam papers/scrolls with a clock — "past papers, historical record" |
| Mock Test | Slate Charcoal (new) | A stopwatch + answer sheet with a checkmark — "timed simulation" |

Reserve the crest area (top ~55% of the frame) and the caption band (60.5%–72.5% of height, per the existing canvas code) as plain, low-detail background in every variant — that's where the crest and text composite on top. Put the category motif in the bottom ~25%, same zone the books/cap currently occupy.

## Image-generation prompt

Shared prefix (matches the brand language already established in `image-generation.txt` / `generate_veernxt_assets.py`), then per-category specifics. Structured to drop straight into `generate_veernxt_assets.py`'s `ASSETS` list format.

```python
SHARED_PROMPT_THUMBNAIL_BG = (
    "Premium aged-parchment textured background for a certificate-style book cover, portrait orientation. "
    "Subtle vignette, fine decorative corner-frame border in muted gold matching an ornate heraldic crest design. "
    "Faint background line-art motifs (gears, compass, subtle military/education iconography) barely visible, "
    "very low contrast, not competing for attention. "
    "The vertical band from 0% to 60% height, and again from 60.5% to 72.5% height, must stay plain, low-detail "
    "and evenly toned — no illustration, no objects, no text — reserved for a crest graphic and caption text "
    "to be composited on afterward. "
    "All illustrative detail (the category motif) belongs only in the bottom 25% of the frame. "
    "No text, no numbers, no logos, no wordmarks, no UI elements, no watermarks anywhere in the image — "
    "this is a background layer only. "
    "Style: painterly premium illustration with soft aged texture, not flat/vector, not photographic."
)

THUMBNAIL_ASSETS = [
    {
        "id": "T-INTRO", "name": "thumbnail_bg_intro", "size": "1024x1536",
        "prompt": SHARED_PROMPT_THUMBNAIL_BG + (
            " Dominant color: deep royal blue tones throughout the parchment texture. "
            "Bottom-of-frame motif: an open ornate gate or a compass resting on an unfolded map, "
            "symbolizing a starting point / orientation."
        ),
    },
    {
        "id": "T-PRECIS", "name": "thumbnail_bg_precis", "size": "1024x1536",
        "prompt": SHARED_PROMPT_THUMBNAIL_BG + (
            " Dominant color: muted antique gold tones throughout the parchment texture. "
            "Bottom-of-frame motif: a single elegant bookmarked document or scroll with a magnifying glass "
            "resting on it, symbolizing a distilled summary."
        ),
    },
    {
        "id": "T-PYQ", "name": "thumbnail_bg_pyq", "size": "1024x1536",
        "prompt": SHARED_PROMPT_THUMBNAIL_BG + (
            " Dominant color: deep royal red/burgundy tones throughout the parchment texture. "
            "Bottom-of-frame motif: a small stack of aged exam papers or scrolls beside an antique clock, "
            "symbolizing past papers and historical record."
        ),
    },
    {
        "id": "T-MOCK", "name": "thumbnail_bg_mock", "size": "1024x1536",
        "prompt": SHARED_PROMPT_THUMBNAIL_BG + (
            " Dominant color: slate charcoal-blue tones throughout the parchment texture. "
            "Bottom-of-frame motif: a stopwatch beside an answer sheet with a checkmark, "
            "symbolizing timed simulation and assessment."
        ),
    },
    # Guide already exists (thumbnil royal green.png) — no regeneration needed.
]
```

## What's still manual after this

- Crop/isolate the crest+wordmark+ribbon graphic from the existing green/blue/red thumbnails (or get a clean transparent-background source from whoever designed the original) — one-time task, not per-category.
- Extend `THUMBNAIL_THEMES` in `AdminDriveIngestion.jsx` from the current 3 manually-picked color options to 5 category-driven ones, auto-selected by the file's category instead of a manual dropdown, and update `renderCustomThumbnailCanvas` to also draw the crest layer, not just the caption text.
- These 5 backgrounds are generated **once each**, not per-exam — the same reuse model as the current 3 themes.
