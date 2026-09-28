/**
 * Validates every generated persona (both variants) against the real profileSchema
 * exported from api/profile/recommend.js, plus sanity checks on the dataset itself.
 *
 * Usage: node scripts/testdata/validate_personas.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { profileSchema } from '../../api/profile/recommend.js';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../test-data/personas');
const load = (f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
const personas = [...load('survey_personas.json'), ...load('synthetic_personas.json')];

let failures = 0;
const fail = (id, variant, msg) => { failures += 1; console.error(`FAIL ${id} [${variant}] ${msg}`); };

for (const p of personas) {
  for (const variant of ['profile_survey', 'profile_app']) {
    const { error } = profileSchema.validate(p[variant], { abortEarly: false, stripUnknown: true });
    if (error) fail(p.id, variant, error.details.map((d) => `${d.path.join('.')}: ${d.message}`).join('; '));
  }
}

// Dataset-level checks
const ids = personas.map((p) => p.id);
if (new Set(ids).size !== ids.length) fail('-', '-', 'duplicate persona ids');
const emails = personas.map((p) => p.profile_survey.email);
if (new Set(emails).size !== emails.length) fail('-', '-', 'duplicate emails');
const mobiles = personas.map((p) => p.profile_survey.mobile);
if (new Set(mobiles).size !== mobiles.length) fail('-', '-', 'duplicate mobiles');
for (const p of personas) {
  if (!/^veernxt-test\+s?x?\d+@example\.com$/i.test(p.profile_survey.email)) fail(p.id, 'survey', 'email is not a synthetic test address');
  if (!/^0{4}\d{6}$/.test(p.profile_survey.mobile)) fail(p.id, 'survey', 'mobile is not a synthetic test number');
  if (!/^Persona /.test(p.profile_survey.fullName)) fail(p.id, 'survey', 'name is not anonymised');
}

console.log(`${personas.length} personas x 2 variants checked, ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
