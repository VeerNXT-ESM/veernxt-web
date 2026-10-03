"""
scripts/exam-mapping/build_presence_data.py

Rebuilds scripts/exam-mapping/data/*.json -- the inputs of
sync_subject_book_links.mjs and link_matrix_exam_books.mjs -- from the content
team's spreadsheets, applying each sheet's known quirks:
  * State sheets ("<Subject>_Presence_All_States_Alphabetical.xlsx"): columns
    State | Present | Not Present. The Computer sheet's first 31 data rows are
    its summary table pasted in as WEST BENGAL rows -> skipped. The English
    sheet repeats every name three times with "[Sr. N]" -> first copy kept.
  * UT sheets ("UT_<Subject>_Presence.xlsx"): Union Territory | Sr | Exam | Status.
  * Central sheets ("<Subject>_Presence_By_Category.xlsx"): Category | Sr | Exam | Status.
  * Matrix ("exam_subject_matrix_99_exams.xlsx"), with the 2026-10-02 review
    applied: English/Maths dropped for ABPM and Dak Sevak (merit-based, no exam).

Usage:  python scripts/exam-mapping/build_presence_data.py [source_dir]
        (source_dir defaults to ~/Downloads)
"""
import json
import os
import re
import sys

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(OUT, exist_ok=True)

STATE_SHEETS = {
    'reasoning': 'Reasoning_Presence_All_States_Alphabetical.xlsx',
    'computer': 'Computer_Presence_All_States_Alphabetical.xlsx',
    'hindi': 'Hindi_Presence_All_States_Alphabetical.xlsx',
    'english': 'English_Presence_All_States_Alphabetical.xlsx',
    'gsgk': 'GS_GK_Presence_All_States_Alphabetical.xlsx',
    'maths': 'Maths_Presence_All_States_Alphabetical.xlsx',
}
UT_SHEETS = {
    'reasoning': 'UT_Reasoning_Presence.xlsx', 'computer': 'UT_Computer_Presence.xlsx',
    'hindi': 'UT_Hindi_Presence.xlsx', 'english': 'UT_English_Presence.xlsx',
    'gsgk': 'UT_GS_GK_Presence.xlsx', 'maths': 'UT_Maths_Presence.xlsx',
}
CENTRAL_SHEETS = {
    'reasoning': 'Reasoning_Presence_By_Category.xlsx', 'computer': 'Computer_Science_Presence_By_Category.xlsx',
    'hindi': 'Hindi_Presence_By_Category.xlsx', 'english': 'English_Presence_By_Category.xlsx',
    'gsgk': 'GK-GS_Presence_By_Category.xlsx', 'maths': 'Maths_Presence_By_Category.xlsx',
}
STATES_28 = {
    'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA',
    'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR',
    'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU',
    'TELANGANA', 'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
}
SUMMARY_JUNK = {s.title() for s in STATES_28} | {'TOTAL', 'Checked', 'Standard pattern'}


def rows_of(fname):
    ws = openpyxl.load_workbook(os.path.join(SRC, fname), data_only=True).worksheets[0]
    return [r for r in list(ws.iter_rows(values_only=True))[1:] if r and r[0]]


def write(name, data):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=0, ensure_ascii=False)
    print(f'{name}: {len(data)} rows, {sum(1 for d in data if d.get("present"))} present')


for key, fname in STATE_SHEETS.items():
    out = []
    for s, p, n in (r[:3] for r in rows_of(fname)):
        for name, present in ((p, True), (n, False)):
            if not name:
                continue
            name = str(name).strip()
            if name in SUMMARY_JUNK:  # Computer sheet's pasted-in summary table
                continue
            m = re.match(r'^(.*?) \[Sr\. \d+\]', name)  # English sheet's tripled names
            if m:
                name = m.group(1).strip()
            out.append({'state': s.strip(), 'name': name, 'present': present})
    write(f'{key}_presence_states.json', out)

for key, fname in UT_SHEETS.items():
    write(f'ut_{key}_presence.json', [
        {'state': r[0].strip(), 'sr': r[1], 'name': str(r[2]).strip(), 'present': str(r[3]).strip().lower() == 'present'}
        for r in rows_of(fname)
    ])

for key, fname in CENTRAL_SHEETS.items():
    write(f'central_{key}_presence.json', [
        {'state': 'Central', 'sr': r[1], 'name': str(r[2]).strip(), 'present': str(r[3]).strip().lower() == 'present', 'category': r[0]}
        for r in rows_of(fname) if r[2]
    ])

# Matrix (sheet "Subject Matrix": 3 title rows, header on row 4, subjects in columns 8..30).
ws = openpyxl.load_workbook(os.path.join(SRC, 'exam_subject_matrix_99_exams.xlsx'), data_only=True)['Subject Matrix']
rows = list(ws.iter_rows(values_only=True))
hdr = rows[3]
matrix = []
for r in rows[4:]:
    if not r[0]:
        continue
    present = [hdr[i] for i in range(7, 30) if str(r[i]).strip().lower() == 'present']
    if str(r[1]).strip() in ('Assistant Branch Postmaster (ABPM)', 'Dak Sevak'):  # 2026-10-02 review, decision 5
        present = [s for s in present if s not in ('English Language', 'Quantitative Aptitude / Maths')]
    matrix.append({'sno': r[0], 'name': r[1], 'state': r[2], 'level': r[3], 'domain': r[4], 'present': present, 'remarks': r[31]})
with open(os.path.join(OUT, 'matrix_99_exams.json'), 'w', encoding='utf-8') as f:
    json.dump(matrix, f, indent=1, ensure_ascii=False)
print(f'matrix_99_exams.json: {len(matrix)} exams')

# 2026-10-02 review, decision 1: where the matrix says a subject is Present but an
# older presence sheet says Not Present, the matrix wins -- flip those rows.
MATRIX_SUBJECTS = {
    'gsgk': {'General Knowledge / Awareness', 'Current Affairs', 'General Studies (History, Geography, Polity, Economy)', 'General Science'},
    'english': {'English Language'}, 'hindi': {'Hindi Language'}, 'maths': {'Quantitative Aptitude / Maths'},
    'reasoning': {'Reasoning / Mental Ability'}, 'computer': {'Computer Knowledge'},
}


def norm(s):
    s = str(s or '').lower().replace('�', '').replace('†', '').replace('&', ' and ')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


flips = []
for key, subjects in MATRIX_SUBJECTS.items():
    for name in (f'{key}_presence_states.json', f'ut_{key}_presence.json', f'central_{key}_presence.json'):
        path = os.path.join(OUT, name)
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        changed = 0
        for row in data:
            if row['present']:
                continue
            for m in matrix:
                if norm(m['name']) == norm(row['name']) and (norm(m['state']) == norm(row['state']) or norm(row['state']) == 'central') \
                        and subjects & set(m['present']):
                    row['present'] = True
                    row['note'] = 'Present per exam subject matrix (2026-10-02 review)'
                    flips.append(f'{name}: {row["name"]}')
                    changed += 1
                    break
        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=0, ensure_ascii=False)
print(f'Rows flipped to Present to match the matrix: {len(flips)}')
for x in flips:
    print('  ' + x)
