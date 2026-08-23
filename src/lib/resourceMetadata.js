/**
 * src/lib/resourceMetadata.js
 *
 * Reads and validates the embedded-in-the-docx metadata contract for the
 * Learning Center ingestion gate (agreed this session): bulk upload only
 * accepts a file once its metadata is already complete -- no interactive
 * gap-filling happens at bulk scale, unlike single upload. Metadata lives
 * as standard Word document properties (File -> Info -> Properties ->
 * Advanced Properties), not a separate manifest:
 *
 *   - Title            -> the standard dc:title core property
 *   - Resource Type     -> custom property "ResourceType" (Intro/Guide/
 *                          Precis/PYQ/Mock/Other)
 *   - Subject           -> custom property "Subject"
 *   - Conducting Body    -> custom property "ConductingBody"
 *   - Region             -> custom property "Region" (central/state/ut)
 *
 * extractEmbeddedMetadata() takes the same JSZip instance
 * contentEngineProcessor.js already builds for a docx (zipContent =
 * await zip.loadAsync(file)) -- no new parsing dependency, just reads two
 * more entries (docProps/core.xml, docProps/custom.xml) out of the same
 * zip. Uses the browser's native DOMParser, same as contentEngineProcessor.js.
 */

const RESOURCE_TYPES = ['Intro', 'Guide', 'Precis', 'PYQ', 'Mock', 'Other'];
const REGIONS = ['central', 'state', 'ut'];

function textOf(el) {
  return el && el.textContent ? el.textContent.trim() : '';
}

// Not all DOMParser/DOM implementations support firstElementChild (e.g. the
// xmldom polyfill used in this module's own test harness doesn't) -- walk
// childNodes and find the first element (nodeType === 1) instead, which is
// supported everywhere.
function firstElement(node) {
  if (!node || !node.childNodes) return null;
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 1) return child;
  }
  return null;
}

async function readXml(zip, path) {
  const file = zip.file(path);
  if (!file) return null;
  const text = await file.async('text');
  return new DOMParser().parseFromString(text, 'text/xml');
}

/**
 * Reads whatever embedded metadata is present in the docx. Never throws on
 * a missing/malformed property -- returns nulls for anything not found, so
 * callers always pass the result through validateResourceMetadata() rather
 * than assuming completeness.
 */
export async function extractEmbeddedMetadata(zip) {
  const result = {
    title: null,
    resourceType: null,
    subject: null,
    conductingBody: null,
    region: null,
  };

  const coreDoc = await readXml(zip, 'docProps/core.xml');
  if (coreDoc) {
    const titleEl = coreDoc.getElementsByTagNameNS('*', 'title')[0];
    const title = textOf(titleEl);
    if (title) result.title = title;
  }

  const customDoc = await readXml(zip, 'docProps/custom.xml');
  if (customDoc) {
    const props = Array.from(customDoc.getElementsByTagNameNS('*', 'property'));
    for (const prop of props) {
      const name = (prop.getAttribute('name') || '').trim().toLowerCase();
      const value = textOf(firstElement(prop));
      if (!name || !value) continue;
      if (name === 'resourcetype') result.resourceType = value;
      else if (name === 'subject') result.subject = value;
      else if (name === 'conductingbody') result.conductingBody = value;
      else if (name === 'region') result.region = value;
    }
  }

  return result;
}

/**
 * Minimum fields required before a resource is bulk-ready (agreed this
 * session): Title, Resource Type, Subject, Conducting Body, Region. Exam
 * assignment/syllabus placement can still happen afterward as its own
 * tagging step -- not required here.
 *
 * Returns { ready, missing, warnings } rather than throwing, so bulk
 * upload can hard-reject on `ready` while still showing the content team
 * exactly what's missing, and the (later, Phase 2) single-upload UI can
 * reuse the same function to show the same gaps interactively.
 */
export function validateResourceMetadata(fields) {
  const required = ['title', 'resourceType', 'subject', 'conductingBody', 'region'];
  const missing = required.filter((key) => !fields || !String(fields[key] || '').trim());

  const warnings = [];
  if (fields?.resourceType && !RESOURCE_TYPES.includes(fields.resourceType)) {
    warnings.push(`resourceType "${fields.resourceType}" is not one of: ${RESOURCE_TYPES.join(', ')}`);
  }
  if (fields?.region && !REGIONS.includes(String(fields.region).toLowerCase())) {
    warnings.push(`region "${fields.region}" is not one of: ${REGIONS.join(', ')}`);
  }

  return {
    ready: missing.length === 0 && warnings.length === 0,
    missing,
    warnings,
  };
}
