/**
 * src/lib/categoryBannerHelper.js
 *
 * Helpers for category and exam banner styling, background images,
 * and visual badges matching the VeerNext premium dark green gradient style.
 */

export const CATEGORY_BANNER_MAP = {
  // Central Categories
  'SSC': '/category_banners/ssc.jpg',
  'Civil Services': '/category_banners/civil_services.jpg',
  'Banking': '/category_banners/banking.jpg',
  'Railways': '/category_banners/railways.jpg',
  'Defence': '/category_banners/defence.jpg',
  'Police': '/category_banners/police.jpg',
  'Teaching & Education': '/category_banners/teaching.jpg',
  'Judiciary & Legal Services': '/category_banners/judiciary.jpg',
  'Engineering Recruitment': '/category_banners/engineering.jpg',

  // State Categories
  'State Civil Services': '/category_banners/state_psc.jpg',
  'Administrative Services': '/category_banners/state_psc.jpg',
  'Police Services': '/category_banners/state_police.jpg',
  'Police Recruitment': '/category_banners/state_police.jpg',
  'Education Services': '/category_banners/state_education.jpg',
  'Teacher Recruitment': '/category_banners/state_education.jpg',

  // UT Categories
  'Administration': '/category_banners/ut_admin.jpg',
  'Administrative': '/category_banners/ut_admin.jpg',
  'Police (UT)': '/category_banners/state_police.jpg',
  'Teaching': '/category_banners/teaching.jpg',
};

/**
 * Returns the best banner image URL for a given category name and division
 */
export function getCategoryBannerImage(categoryName = '', division = 'central') {
  if (!categoryName) return '/category_banners/ssc.jpg';
  const trimmed = categoryName.trim();
  if (CATEGORY_BANNER_MAP[trimmed]) {
    return CATEGORY_BANNER_MAP[trimmed];
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('ssc')) return '/category_banners/ssc.jpg';
  if (lower.includes('civil') || lower.includes('upsc') || lower.includes('ias') || lower.includes('ips')) {
    return '/category_banners/civil_services.jpg';
  }
  if (lower.includes('bank') || lower.includes('ibps') || lower.includes('sbi') || lower.includes('rbi')) {
    return '/category_banners/banking.jpg';
  }
  if (lower.includes('rail') || lower.includes('rrb') || lower.includes('ntpc')) {
    return '/category_banners/railways.jpg';
  }
  if (
    lower.includes('defence') ||
    lower.includes('defense') ||
    lower.includes('army') ||
    lower.includes('navy') ||
    lower.includes('air force') ||
    lower.includes('nda') ||
    lower.includes('cds') ||
    lower.includes('afcat')
  ) {
    return '/category_banners/defence.jpg';
  }
  if (lower.includes('police') || lower.includes('constable') || lower.includes('sub-inspector')) {
    return division === 'central' ? '/category_banners/police.jpg' : '/category_banners/state_police.jpg';
  }
  if (lower.includes('teach') || lower.includes('education') || lower.includes('tet') || lower.includes('ctet')) {
    return division === 'central' ? '/category_banners/teaching.jpg' : '/category_banners/state_education.jpg';
  }
  if (lower.includes('judic') || lower.includes('law') || lower.includes('court') || lower.includes('legal')) {
    return '/category_banners/judiciary.jpg';
  }
  if (lower.includes('engin') || lower.includes('gate') || lower.includes('ies') || lower.includes('tech')) {
    return '/category_banners/engineering.jpg';
  }
  if (lower.includes('admin') || lower.includes('psc')) {
    return division === 'ut' ? '/category_banners/ut_admin.jpg' : '/category_banners/state_psc.jpg';
  }

  if (division === 'state') return '/category_banners/state_psc.jpg';
  if (division === 'ut') return '/category_banners/ut_admin.jpg';
  return '/category_banners/ssc.jpg';
}

/**
 * Returns official agency or conducting body kicker in uppercase
 */
export function getCategoryKicker(categoryName = '', fullName = '', stateName = '') {
  const lower = (categoryName || '').toLowerCase();
  if (lower.includes('ssc')) {
    return 'STAFF SELECTION COMMISSION';
  }
  if (lower.includes('civil') || lower.includes('upsc')) {
    return 'UNION PUBLIC SERVICE COMMISSION';
  }
  if (lower.includes('bank')) {
    return 'INSTITUTE OF BANKING PERSONNEL SELECTION & RBI';
  }
  if (lower.includes('rail')) {
    return 'RAILWAY RECRUITMENT BOARDS (RRB)';
  }
  if (lower.includes('defence') || lower.includes('defense')) {
    return 'INDIAN ARMED FORCES & DEFENCE ACADEMIES';
  }
  if (lower.includes('police')) {
    return stateName ? `${stateName.toUpperCase()} POLICE RECRUITMENT` : 'POLICE RECRUITMENT & ARMED FORCES';
  }
  if (lower.includes('teach') || lower.includes('education')) {
    return stateName ? `${stateName.toUpperCase()} EDUCATION DEPARTMENT` : 'NATIONAL TEACHER RECRUITMENT';
  }
  if (lower.includes('judic') || lower.includes('law')) {
    return 'HIGH COURTS & SUBORDINATE JUDICIARY SERVICES';
  }
  if (lower.includes('engin')) {
    return 'ENGINEERING SERVICES EXAMINATION (ESE / PSUs)';
  }
  if (fullName && fullName.length <= 44) {
    return fullName.toUpperCase();
  }
  if (stateName) {
    return `${stateName.toUpperCase()} PUBLIC SERVICE COMMISSION`;
  }
  return 'GOVERNMENT RECRUITMENT COMMISSION';
}

/**
 * Returns formatted title components:
 * accentWord (in warm gold #fad074) and mainWords (in crisp clean white #ffffff)
 */
export function getCategoryTitleParts(categoryName = '') {
  const trimmed = (categoryName || '').trim();
  if (!trimmed) {
    return { accentWord: 'GOVERNMENT', mainWords: 'EXAMINATIONS' };
  }
  if (trimmed.toUpperCase() === 'SSC') {
    return { accentWord: 'SSC', mainWords: 'EXAMINATIONS' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { accentWord: parts[0].toUpperCase(), mainWords: 'EXAMINATIONS' };
  }

  const accentWord = parts[0].toUpperCase();
  let remaining = parts.slice(1).join(' ').toUpperCase();
  if (!remaining.includes('EXAM') && !remaining.includes('SERVICE') && !remaining.includes('RECRUITMENT')) {
    remaining += ' EXAMINATIONS';
  }
  return { accentWord, mainWords: remaining };
}

/**
 * Returns emblem badge if available
 */
export function getCategoryEmblem(categoryName = '') {
  return null;
}
