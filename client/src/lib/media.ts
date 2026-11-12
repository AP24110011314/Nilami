import { API_ORIGIN } from './env.js';

export { API_ORIGIN };
const SEED_MEDIA_VERSION = '2';

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/uploads/seed/') && !url.includes('?')) {
    return `${API_ORIGIN}${url}?v=${SEED_MEDIA_VERSION}`;
  }
  if (url.startsWith('/uploads/')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
}

const CATEGORY_FALLBACK_PATHS: Record<string, string> = {
  electronics: '/uploads/seed/apple-macbook-pro-m4-max-1.webp',
  collectibles: '/uploads/seed/independence-stamp-cover-1947-1.webp',
  art: '/uploads/seed/tanjore-painting-krishna-1.webp',
  fashion: '/uploads/seed/hermes-birkin-30-gold-togo-1.webp',
  vehicles: '/uploads/seed/royal-enfield-amal-carburetor-1.webp',
  watches: '/uploads/seed/rolex-submariner-kermit-1.webp',
  furniture: '/uploads/seed/eames-lounge-chair-palisander-1.webp',
  books: '/uploads/seed/tolkien-hobbit-first-edition-1.webp',
  musical: '/uploads/seed/fender-stratocaster-1962-sunburst-1.webp',
  appliances: '/uploads/seed/la-marzocco-linea-mini-1.webp',
  sports: '/uploads/seed/pinarello-dogma-f12-tour-de-france-1.webp',
  other: '/uploads/seed/apple-macbook-pro-m4-max-1.webp',
};

export function getCategoryFallbackImage(category?: string): string {
  const path = (category && CATEGORY_FALLBACK_PATHS[category]) || CATEGORY_FALLBACK_PATHS.other;
  return resolveImageUrl(path);
}

