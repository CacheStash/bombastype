/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-memory cache for fonts & promotions to eliminate redundant round-trips & enable 0ms instant detail rendering
let cachedFontsList: any[] = [];
let cachedPromosList: any[] = [];

const SESSION_FONTS_KEY = 'bombastype_collection_cache';
const SESSION_PROMOS_KEY = 'bombastype_promotions_cache';

export const setCachedFonts = (fonts: any[]) => {
  if (Array.isArray(fonts) && fonts.length > 0) {
    cachedFontsList = fonts;
    try {
      sessionStorage.setItem(SESSION_FONTS_KEY, JSON.stringify({ all: fonts }));
    } catch (_) {}
  }
};

export const setCachedPromos = (promos: any[]) => {
  if (Array.isArray(promos)) {
    cachedPromosList = promos;
    try {
      sessionStorage.setItem(SESSION_PROMOS_KEY, JSON.stringify({ promos }));
    } catch (_) {}
  }
};

export const getCachedFontByIdOrSlug = (idOrSlug: string): any | null => {
  if (!idOrSlug) return null;

  // 1. Check in-memory first
  let list = cachedFontsList;

  // 2. Fallback to sessionStorage if in-memory is empty
  if (list.length === 0) {
    try {
      const raw = sessionStorage.getItem(SESSION_FONTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.all)) {
          list = parsed.all;
          cachedFontsList = parsed.all;
        }
      }
    } catch (_) {}
  }

  if (list.length === 0) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUuid) {
    return list.find(f => f.id === idOrSlug) || null;
  }

  const clean = idOrSlug.replace(/-/g, ' ').trim().toLowerCase();
  return list.find(f => (f.name || '').toLowerCase() === clean) || null;
};

export const getCachedPromos = (): any[] => {
  if (cachedPromosList.length > 0) return cachedPromosList;
  try {
    const raw = sessionStorage.getItem(SESSION_PROMOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.promos)) {
        cachedPromosList = parsed.promos;
        return parsed.promos;
      }
    }
  } catch (_) {}
  return [];
};
