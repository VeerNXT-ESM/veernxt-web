/**
 * Mapping of VeerNXT book slugs and state titles to their official 3D-ready
 * high-resolution covers with the official VeerNXT logo composited.
 */

export const BOOK_COVERS_MAP = {
  // All-India Core Guides
  'gs-gk-complete-guide': '/thumbnails/books/gs-gk-complete-guide.webp',
  'gk-gs': '/thumbnails/books/gs-gk-complete-guide.webp',
  'gs-gk': '/thumbnails/books/gs-gk-complete-guide.webp',
  'mathematics': '/thumbnails/books/mathematics.webp',
  'reasoning': '/thumbnails/books/reasoning.webp',
  'english': '/thumbnails/books/english.webp',
  'hindi': '/thumbnails/books/hindi.webp',
  'computer-science': '/thumbnails/books/computer-science.webp',

  // State & UT GS Guides
  'rajasthan-gs': '/thumbnails/books/rajasthan-gs.webp',
  'madhya-pradesh-gs': '/thumbnails/books/madhya-pradesh-gs.webp',
  'maharashtra-gs': '/thumbnails/books/maharashtra-gs.webp',
  'gujarat-gs': '/thumbnails/books/gujarat-gs.webp',
  'haryana-gs': '/thumbnails/books/haryana-gs.webp',
  'himachal-pradesh-gs': '/thumbnails/books/himachal-pradesh-gs.webp',
  'punjab-gs': '/thumbnails/books/punjab-gs.webp',
  'odisha-gs': '/thumbnails/books/odisha-gs.webp',
  'west-bengal-gs': '/thumbnails/books/west-bengal-gs.webp',
  'uttar-pradesh-gs': '/thumbnails/books/uttar-pradesh-gs.webp',
  'bihar-gs': '/thumbnails/books/bihar-gs.webp',
  'jharkhand-gs': '/thumbnails/books/jharkhand-gs.webp',
  'chhattisgarh-gs': '/thumbnails/books/chhattisgarh-gs.webp',
  'assam-gs': '/thumbnails/books/assam-gs.webp',
  'karnataka-gs': '/thumbnails/books/karnataka-gs.webp',
  'kerala-gs': '/thumbnails/books/kerala-gs.webp',
  'tamil-nadu-gs': '/thumbnails/books/tamil-nadu-gs.webp',
  'andhra-pradesh-gs': '/thumbnails/books/andhra-pradesh-gs.webp',
  'telangana-gs': '/thumbnails/books/telangana-gs.webp',
  'arunachal-pradesh-gs': '/thumbnails/books/arunachal-pradesh-gs.webp',
  'delhi-gs': '/thumbnails/books/delhi-gs.webp',
  'jammu-kashmir-gs': '/thumbnails/books/jammu-kashmir-gs.webp',
  'ladakh-gs': '/thumbnails/books/ladakh-gs.webp',
  'uttarakhand-gs': '/thumbnails/books/uttarakhand-gs.webp',
  'goa-gs': '/thumbnails/books/goa-gs.webp',
};

export const STATE_COVERS_MAP = {
  'rajasthan': '/thumbnails/books/rajasthan-gs.webp',
  'madhya-pradesh': '/thumbnails/books/madhya-pradesh-gs.webp',
  'maharashtra': '/thumbnails/books/maharashtra-gs.webp',
  'gujarat': '/thumbnails/books/gujarat-gs.webp',
  'haryana': '/thumbnails/books/haryana-gs.webp',
  'himachal-pradesh': '/thumbnails/books/himachal-pradesh-gs.webp',
  'punjab': '/thumbnails/books/punjab-gs.webp',
  'odisha': '/thumbnails/books/odisha-gs.webp',
  'west-bengal': '/thumbnails/books/west-bengal-gs.webp',
  'uttar-pradesh': '/thumbnails/books/uttar-pradesh-gs.webp',
  'bihar': '/thumbnails/books/bihar-gs.webp',
  'jharkhand': '/thumbnails/books/jharkhand-gs.webp',
  'chhattisgarh': '/thumbnails/books/chhattisgarh-gs.webp',
  'assam': '/thumbnails/books/assam-gs.webp',
  'karnataka': '/thumbnails/books/karnataka-gs.webp',
  'kerala': '/thumbnails/books/kerala-gs.webp',
  'tamil-nadu': '/thumbnails/books/tamil-nadu-gs.webp',
  'andhra-pradesh': '/thumbnails/books/andhra-pradesh-gs.webp',
  'telangana': '/thumbnails/books/telangana-gs.webp',
  'arunachal-pradesh': '/thumbnails/books/arunachal-pradesh-gs.webp',
  'delhi': '/thumbnails/books/delhi-gs.webp',
  'jammu-kashmir': '/thumbnails/books/jammu-kashmir-gs.webp',
  'ladakh': '/thumbnails/books/ladakh-gs.webp',
  'uttarakhand': '/thumbnails/books/uttarakhand-gs.webp',
  'goa': '/thumbnails/books/goa-gs.webp',
};

/**
 * Resolves a book title, slug, or state name to its composited cover image.
 */
export function getBookCoverUrl(slugOrTitle) {
  if (!slugOrTitle) return null;
  const normalized = String(slugOrTitle)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (BOOK_COVERS_MAP[normalized]) return BOOK_COVERS_MAP[normalized];

  // 1. Check if the book or exam is specifically for a state
  for (const [stateKey, url] of Object.entries(STATE_COVERS_MAP)) {
    if (normalized.includes(stateKey)) {
      return url;
    }
  }

  // 2. Specific subjects
  if (normalized.includes('mathematics') || normalized.includes('quant')) {
    return BOOK_COVERS_MAP['mathematics'];
  }
  if (normalized.includes('reasoning')) {
    return BOOK_COVERS_MAP['reasoning'];
  }
  if (normalized.includes('english')) {
    return BOOK_COVERS_MAP['english'];
  }
  if (normalized.includes('hindi')) {
    return BOOK_COVERS_MAP['hindi'];
  }
  if (normalized.includes('computer')) {
    return BOOK_COVERS_MAP['computer-science'];
  }

  // 3. Fallback to All-India GS/GK
  if (normalized.includes('gs') || normalized.includes('gk') || normalized.includes('general-studies')) {
    return BOOK_COVERS_MAP['gs-gk-complete-guide'];
  }

  return null;
}
