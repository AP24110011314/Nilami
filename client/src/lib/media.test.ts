import { describe, expect, it } from 'vitest';
import { API_ORIGIN, getCategoryFallbackImage, resolveImageUrl } from './media.js';

describe('media url helpers', () => {
  it('resolves relative /uploads paths against API_ORIGIN with seed cache version', () => {
    expect(resolveImageUrl('/uploads/seed/pinarello-dogma-f12-tour-de-france-1.webp')).toBe(
      `${API_ORIGIN}/uploads/seed/pinarello-dogma-f12-tour-de-france-1.webp?v=2`,
    );
    expect(resolveImageUrl('/uploads/user-upload.webp')).toBe(
      `${API_ORIGIN}/uploads/user-upload.webp`,
    );
  });

  it('preserves full http/https URLs and empty values', () => {
    expect(resolveImageUrl('https://example.com/photo.webp')).toBe('https://example.com/photo.webp');
    expect(resolveImageUrl('')).toBe('');
    expect(resolveImageUrl(null)).toBe('');
  });

  it('returns resolved category fallback images including sports and watches', () => {
    expect(getCategoryFallbackImage('sports')).toBe(
      `${API_ORIGIN}/uploads/seed/pinarello-dogma-f12-tour-de-france-1.webp?v=2`,
    );
    expect(getCategoryFallbackImage('watches')).toBe(
      `${API_ORIGIN}/uploads/seed/rolex-submariner-kermit-1.webp?v=2`,
    );
    expect(getCategoryFallbackImage('unknown-cat')).toBe(
      `${API_ORIGIN}/uploads/seed/apple-macbook-pro-m4-max-1.webp?v=2`,
    );
  });
});

