import { useEffect } from 'react';

const SITE_NAME = 'VeerNXT';
const SITE_URL = 'https://veernxt.com';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  if (!href) return;
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets per-route <title>/meta tags so each public page describes itself
 * correctly to search engines, instead of every route sharing the single
 * static title/description baked into index.html.
 *
 * Note: this helps crawlers that execute JS (Google does). It does NOT
 * change what social-link previews (Facebook/WhatsApp/X/LinkedIn) show,
 * since those bots don't run JS -- they'll keep showing the generic
 * index.html OG tags until these routes are prerendered to static HTML.
 */
export function useSeo({ title, description, path, image, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : null;
    if (fullTitle) document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    const url = path ? `${SITE_URL}${path}` : null;
    if (url) upsertCanonical(url);

    if (fullTitle) {
      upsertMeta('property', 'og:title', fullTitle);
      upsertMeta('name', 'twitter:title', fullTitle);
    }
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:description', description);
    if (url) upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image || DEFAULT_IMAGE);
    upsertMeta('name', 'twitter:image', image || DEFAULT_IMAGE);
  }, [title, description, path, image, noindex]);
}
