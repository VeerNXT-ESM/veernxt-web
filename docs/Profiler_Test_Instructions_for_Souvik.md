# Running the profiler test

**For:** Souvik  
**Time needed:** about 10 minutes  
**Risk:** none. The test only reads. It does not change any user record, award points or write to the database.

## What this is

We are checking whether the profiling engine (`POST /api/profile/recommend`) recommends the right exams for real users. We built **145 test people**: 112 from the veteran survey and 33 hand-made edge cases. They are anonymised (fake names, emails, phones and birth dates).

You get one spreadsheet and one script. The script sends each person to the profiler and saves what it recommends to a CSV.

## What you need

1. **Python 3** and **openpyxl**: `pip install openpyxl`
2. **The repo, up to date**: `git pull` on `main` (the script is at `scripts/testdata/run_profiler_from_xlsx.py`).
3. **The spreadsheet**: `Profiler_Test_Input_2026-09-28.xlsx`, sent to you separately. It is not in git on purpose, because it is derived from survey data. It cannot be regenerated from the repo, so keep your copy. Put it anywhere, for example `docs/`.

## Run it

From the repo root:

```
python scripts/testdata/run_profiler_from_xlsx.py --file docs/Profiler_Test_Input_2026-09-28.xlsx --url https://www.veernxt.in/api/profile/recommend
```

Use **`www.veernxt.in`**. The bare `veernxt.in` answers with a redirect, and a POST does not follow it.

Expected output: `145 ok, 0 failed of 145 -> docs/Profiler_Test_Input_2026-09-28_results.csv`

Options:

| Option | Meaning |
|---|---|
| `--limit 5` | Only the first 5 people (quick check) |
| `--sheet "Profiles - live form only"` | The second sheet: same people, but only what the live form can send |
| `--delay 0.3` | Pause between requests, if you want to go easy on the API |
| `--top 10` | Recommendations kept per person (1 to 50) |
| `--out file.csv` | Where to write the results |

Run it twice, once per sheet. The difference between the two runs shows what the live form's missing questions cost.

## Quick check that your run matches ours

The first three people should come back with these eligible-exam counts:

| Person | Eligible exams |
|---|---|
| S001 | 463 |
| S002 | 361 |
| S003 | 443 |

The numbers depend on the current `exams` table, so small differences mean the catalogue changed since we ran it.

## Reading the results

Each row of the CSV is one person. The columns are the person's id, HTTP status, any error, eligible and rejected exam counts, the overall score, then `rec_1` to `rec_10` as `Exam [level, state] score`.

To see what the engine recommends most often across the 112 survey people:

```python
import csv, collections
rows = list(csv.DictReader(open("docs/Profiler_Test_Input_2026-09-28_results.csv", encoding="utf-8")))
survey = [r for r in rows if r["persona_id"].startswith("S")]
c = collections.Counter(x.rsplit(" [", 1)[0] for r in survey for x in [r[f"rec_{i}"] for i in range(1, 11)] if x)
print(f"{len(survey)} survey people, {len(c)} distinct exams in their top 10s. Most common:")
for exam, n in c.most_common(5):
    print(f"  {n:>3}  {exam}")
```

On our run this printed `112 survey people, 125 distinct exams`, with `SSC GD Constable (General Duty)` in 111 top-10 lists, `JKSSB` in 103, and Lakshadweep, Puducherry and Andaman postal (GDS) exams in about 45 to 50 each.

## What we already know (so you can check it, not rediscover it)

These are the problems in the current engine. A run that shows them means the test is working:

1. **Almost everyone gets the same exams.** SSC GD Constable and JKSSB appear in nearly every list. JKSSB is a J&K body catalogued as Central with no state, so soldiers from UP or Bengal see it.
2. **Union Territory exams leak to other states.** Lakshadweep, Puducherry, Andaman and Ladakh postal exams appear for people from elsewhere, because UT exams are not marked as domicile-restricted. About 22% of the top-10 places for "Home State" users are other-state UT exams.
3. **Central exams ignore the relocation answer.** A Central exam can be posted anywhere, so it should only suit people ready to relocate. Today 51% of the top-10 places for people who said "Home State" are Central exams.
4. **The engine understands only 23% of the exam catalogue.** `exams.career_track` has about 170 free-text values, and the engine recognises 36 codes. No exam carries `POLICE_CAPF`, `RAILWAYS` or `PSU`.
5. **Minimum qualification is missing on 67% of exams**, so the qualification rule cannot be checked for most.
6. **Some profile fields have no effect.** Date of birth (there is no age check), the disability fields, colour blindness, height, weight, chest, vision, marital status, district, branch, courses and Sewa Nidhi interests are stored but never used.

The full baseline is in `docs/Profiling_Baseline_2026-09-28.xlsx` and section 69 of `docs/status_report.md`.

## What we need from you

1. **Run both sheets** and send back the two results CSVs, or tell us if any row fails.
2. **Where does the jobs_v2 tag and AI-description generator live?** We could not find it in this repo, `scraper-app`, `engine.zip` or `content-engine-app`.
3. Anything odd you see in the results. For example, a person whose top 10 makes no sense for their trade, state or qualification.

## If something goes wrong

| Symptom | Cause and fix |
|---|---|
| `HTTP 307` or a redirect error | You used `veernxt.in`. Use `https://www.veernxt.in/...` |
| `HTTP 0` and a timeout | The first call after idle can be slow. Re-run, or add `--timeout 120` |
| `HTTP 400` with a validation message | A cell was edited to an invalid value. The Field guide sheet lists the allowed values |
| `KeyError` on the sheet name | The sheet names must match exactly, including the spaces around the hyphen |
| `ModuleNotFoundError: openpyxl` | `pip install openpyxl` |
| Different eligible counts from ours | The catalogue changed. Compare the top 10 for one person by hand |

## Editing the spreadsheet

The columns are named exactly like the profiler's fields, so you can change a value and re-run. Enum columns have dropdowns. Lists use ` | ` as the separator. Dates are `YYYY-MM-DD` text, and `mobile` must stay text. The **Field guide** sheet documents every field, whether the engine uses it, and how we filled it. The grey columns on the right (`persona_id`, `source`, `purpose`, `cleaned_or_assumed`) are for humans and are ignored by the script.

## Safety notes

- The script never sends a login token. Do not add one: with a valid token the profiler saves a profile and awards points to that user.
- It makes 145 read-only requests per sheet against production. The profiler only reads the `exams` table.
