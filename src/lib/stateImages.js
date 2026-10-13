/**
 * src/lib/stateImages.js
 *
 * Full-width landscape banners for all 28 Indian States and 8 Union Territories.
 * Used across the Learning Center state cards, category explorers, and regional dashboards.
 */

export const STATE_IMAGES = {
  // ── 28 States ──────────────────────────────────────────────────────────
  'Andhra Pradesh': '/state_images/andhra_pradesh.jpg',
  'Arunachal Pradesh': '/state_images/arunachal_pradesh.jpg',
  'Assam': '/state_images/assam.jpg',
  'Bihar': '/state_images/bihar.jpg',
  'Chhattisgarh': '/state_images/chhattisgarh.jpg',
  'Goa': '/state_images/goa.jpg',
  'Gujarat': '/state_images/gujarat.jpg',
  'Haryana': '/state_images/haryana.jpg',
  'Himachal Pradesh': '/state_images/himachal_pradesh.jpg',
  'Jharkhand': '/state_images/jharkhand.jpg',
  'Karnataka': '/state_images/karnataka.jpg',
  'Kerala': '/state_images/kerala.jpg',
  'Madhya Pradesh': '/state_images/madhya_pradesh.jpg',
  'Maharashtra': '/state_images/maharashtra.jpg',
  'Manipur': '/state_images/manipur.jpg',
  'Meghalaya': '/state_images/meghalaya.jpg',
  'Mizoram': '/state_images/mizoram.jpg',
  'Nagaland': '/state_images/nagaland.jpg',
  'Odisha': '/state_images/odisha.jpg',
  'Punjab': '/state_images/punjab.jpg',
  'Rajasthan': '/state_images/rajasthan.jpg',
  'Sikkim': '/state_images/sikkim.jpg',
  'Tamil Nadu': '/state_images/tamil_nadu.jpg',
  'Telangana': '/state_images/telangana.jpg',
  'Tripura': '/state_images/tripura.jpg',
  'Uttar Pradesh': '/state_images/uttar_pradesh.jpg',
  'Uttarakhand': '/state_images/uttarakhand.jpg',
  'West Bengal': '/state_images/west_bengal.jpg',

  // ── 8 Union Territories ────────────────────────────────────────────────
  'Andaman and Nicobar Islands': '/state_images/andaman_and_nicobar.jpg',
  'Chandigarh': '/state_images/chandigarh.jpg',
  'Dadra & Nagar Haveli and Daman & Diu': '/state_images/daman_and_diu.jpg',
  'Delhi': '/state_images/delhi.jpg',
  'Jammu & Kashmir': '/state_images/jammu_and_kashmir.jpg',
  'Ladakh': '/state_images/ladakh.jpg',
  'Lakshadweep': '/state_images/lakshadweep.jpg',
  'Puducherry': '/state_images/puducherry.jpg',
};

/**
 * Returns the state landscape banner URL for a given state or UT name.
 * Safe fallback helper that also attempts slug/case-insensitive matching.
 */
export function getStateBannerImage(stateName = '') {
  if (!stateName) return null;
  const trimmed = stateName.trim();
  if (STATE_IMAGES[trimmed]) return STATE_IMAGES[trimmed];

  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(STATE_IMAGES)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}
