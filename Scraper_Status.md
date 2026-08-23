# PYP Scraper — Status Report

**Status: HALTED** | Last updated: 2026-08-21

---

## What Was Built

A two-phase scraper to collect Previous Year Question Papers (PYPs) for all ~1,155 exams in the VEERNXT catalogue.

### Phase 1: Primary Scraper (`pyp_scraper/`)
- Sources: Testbook, Oliveboard, AglaSem, Jagran Josh
- Approach: Direct URL scraping of known PYP listing pages
- Result: Partially successful but hit auth walls and dynamic JS rendering issues on most major sources

### Phase 2: Fallback Scraper (`scratch/pyp_fallback_scraper.js`)
- Approach: DuckDuckGo search → scrape top 2 results per exam for PDF links or text content
- Input: `failed_exams.json` (1,155 exams that Phase 1 couldn't resolve)
- Runtime: Started 2026-08-20 ~15:11, killed ~2026-08-20 ~23:00 by server restart

---

## Progress at Time of Halt

| Metric | Value |
|---|---|
| Exams processed | ~890 / 1,155 (~77%) |
| Entries in `scraped_pyp.json` | 223 |
| PDFs downloaded | 0 (PDF downloads were hitting dead links) |
| Text content files saved | 23 `.txt` files |
| JSON result files | 265 |
| Exams remaining | ~265 |

---

## Known Issues

1. **DuckDuckGo rate limiting**: By exam ~887, searches were returning `ERR_NAME_NOT_RESOLVED` and 30s navigation timeouts consistently. The scraper was effectively blocked.
2. **Low data quality**: The 223 `scraped_pyp.json` entries are mostly **generic PYP index pages** (e.g. `testbook.com/previous-year-papers`) rather than exam-specific paper links. Not usable as-is.
3. **No PDFs recovered**: The PDF download logic found PDF links in DOM but downloads were failing silently (dead CDN links, auth-gated files).

---

## Output Location

```
scratch/
  pyp_fallback_scraper.js        ← Main scraper script
  pyp_scraper/
    scraped_pyp.json             ← 223 entries (low quality, mostly index pages)
    failed_exams.json            ← Original 1,155 exam list (input)
    official_urls.json           ← Curated official exam board URLs
    sources/                     ← Source-specific scrapers (testbook, oliveboard, etc.)
```

---

## Recommended Next Steps (when resuming)

1. **Use `official_urls.json`** as the primary source — these are direct exam board URLs which are more reliable than search results.
2. **Switch search engine**: Use Google Custom Search API (free tier: 100 queries/day) instead of DuckDuckGo to avoid blocks.
3. **Target specific domains**: Instead of open web search, scrape known reliable sources directly: `pyp.testbook.com`, `adda247.com/pyp`, `sscportal.in` with Puppeteer and proper session cookies.
4. **Resume from exam 890**: The scraper has a resume checkpoint — restart with `--resume` flag from `failed_exams.json` starting at index 890.
5. **PDF quality gate**: Only save PDFs >50KB that contain text (not scanned images), using `pdf-parse` to validate.
