# R2 Storage Audit — `veernxt-resources` (2026-09-20)

**Question:** the dashboard shows 55.2 GB. Is that true, and why so big?
**Answer:** Yes. A full read-only listing of the bucket found **286,664 objects, 55.5 GB**. Almost all of it is one image copied thousands of times.

## 1. Where the space is

| Folder | Size | Files |
|---|---|---|
| `structured_resources/STATE EXAMS/` | 51.16 GB | 267,662 |
| `structured_resources/blocks/` (current live path) | 1.27 GB | 14,118 |
| `structured_resources/06.NURSING` | 0.36 GB | 308 |
| `structured_resources/master_documents` | 0.30 GB | 1,440 |
| other exam/state folders | ~1.5 GB | — |
| `exam-logos/` | 0.22 GB | 802 |

By file type: **PNG = 51.5 GB (89,677 files)**, JPG 2.4 GB, chapter JSON 0.9 GB (146,116 files). Everything except images is under 4 GB.

Inside `STATE EXAMS`: 130,402 images, but only ~1,272 distinct (by name + size). Roughly **49.8 GB is duplicate copies**. The Precis folders hold about 107,700 of those images (30 GB). All of it was uploaded on 2026-08-17.

## 2. The main culprit: one brand cover, 7,159 copies

`cover.png` and `fig-1-0034f0aa.png` are **the same image** — the VeerNXT branded cover (shield, "सेवा से समृद्ध कल की ओर", books and graduation cap), 1023 × 1537 px, 3.81 MB. Both filenames share one R2 ETag, so all copies are byte-identical.

- 3,579 copies named `cover.png` + 3,580 named `fig-1-0034f0aa.png` = **7,159 objects, 27.25 GB (~49% of the bucket)**.
- Most likely cause: the image extractor writes every book's cover and first figure into that book's own `images/` folder, and this cover is the placeholder it finds first.
- It is stored as an uncompressed-style full-colour PNG. A web cover at this size should be well under 1 MB.

## 3. Is the old `STATE EXAMS` folder still used?

Not dead. Of 16,576 `resources` rows: 14,639 point at `structured_resources/blocks/…`, but **1,324 still point into `STATE EXAMS`** and ~400 more at other old folders (Nursing, Teaching, Delhi, Ladakh, …). Deleting old folders wholesale would break live resources. Any cleanup must map references first.

## 4. Fix #1 (this report's first action): shrink the cover in place

Overwrite each of the 7,159 copies with a 256-colour PNG of the same image. Measured on the real file:

| Variant | Size | Note |
|---|---|---|
| Original | 3,716 KB | — |
| PNG, lossless recompress | 2,435 KB | not enough |
| **PNG, 256 colours (chosen)** | **779 KB** | near-identical; slight banding on the blue book |
| PNG 256 colours at 768 px wide | 457 KB | smaller, but changes dimensions |
| JPEG q85 / WebP q85 | 326 / 251 KB | needs content-type/extension changes, not in-place safe |

**UPDATE — DONE with WebP instead (decision: WebP q90, 328 KB, served as `image/webp` under the existing `.png` keys).** Verified against the public R2 URL (HTTP 200, `image/webp`, CORS header for `veernxt.in`); no app code depends on the extension. 7,159 objects replaced plus 58 more copies of the same image under other names (`image_*.png`, found by ETag), 0 failures. Re-listing the live bucket afterwards: **55.50 GB → about 30.4 GB (saved ~25 GB)**. The PNG-256 rows in this section are the alternative that was not used. Rollback: re-upload `K:\tmp\r2_cleanup\brand_cover_ORIGINAL.png` to the keys listed under `K:\tmp\db_backups\`.

Original plan (PNG-256, not used): 27.25 GB → 5.71 GB, saving 21.54 GB.

Why in place: same keys, same URLs — no chapter JSON, DB row or reader code changes. Nothing is deleted.

Safeguards in `scripts/r2_shrink_brand_cover.mjs`: dry run by default; only objects whose ETag still equals the original are touched; the original image and the list of affected keys are backed up under `K:\tmp` first; each write is verified by size afterwards. Cloudflare's edge may serve the old 3.8 MB copy for anything already cached (1-year cache header) until it expires — storage drops immediately, delivery savings arrive gradually.

## 4b. Fix #2 — DONE: all duplicated PNGs of 100 KB+ converted to WebP

512 distinct images (each duplicated 2+ times) were converted — 250 lossy (WebP q90, never below 38 dB PSNR vs the original) and 261 lossless where lossy drifted too far; 1 skipped as not smaller. `scripts/r2_shrink_duplicate_images.mjs` overwrote **49,504 objects in place, 0 failures**, ETag-guarded and MD5-checked on upload. Same mechanism and rollback as Fix #1: originals in `K:\\tmp\\r2_cleanup\\originals`, key list in `K:\\tmp\\db_backups\\2026-09-20T13-28-17-673Z`.

**Verified by re-listing the live bucket: 30.4 GB → 15.33 GB** (55.5 GB at the start of the audit). Spot-checked converted keys serve 200 as `image/webp`. What's left as PNG (89,677 keys, 11.3 GB) is mostly small or single-copy images that were deliberately not touched.

## 5. Further steps (not started)

1. **True dedupe of the cover**: 7,159 copies of 0.78 MB is still 5.7 GB for one picture. Point all books at a single shared file by rewriting image URLs in the chapter JSONs (~146k files) — would bring this to ~1 MB total. Larger change; do after step 4.
2. **Other duplicated images**: e.g. 464 copies each of several 1–1.6 MB figures (~2.5 GB), 274 copies of a 2.5 MB cover (0.7 GB). Same in-place shrink or dedupe.
3. **Recompress the remaining PNG figures** (avg 0.38 MB, 130k of them) to WebP/optimized PNG — likely a further ~50–70% on the ~20 GB left after dedupe.
4. **Orphan sweep**: map the 1,324 live `STATE EXAMS` references, then remove what nothing points to. Dry run + backup first, as in the earlier dedupe passes.
5. **Stop it recurring**: make the extractor skip or share the brand cover instead of writing a copy into every book, and add an R2 lifecycle rule for `tmp/publish-uploads/`.

## 6. Cost context

R2 storage is ~$0.015/GB-month, so 55 GB is under $1/month. The value of the cleanup is tidiness, faster syncs/listings (286k objects) and avoiding a growing bucket, not the bill.

*Generated from a live bucket listing on 2026-09-20; numbers are per-object sizes from `ListObjectsV2`.*
