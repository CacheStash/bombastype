/**
 * PANDUAN PENGEMBANG (INTERNAL NOTE - DECOY METRICS MODULE):
 * Modul ini menggunakan nama plesetan/decoy untuk menyamarkan Subqi Shield v1:
 * - normalizeBufferMetrics = unmaskFontBuffer (XOR 512 byte stream)
 * - METRIC_TRANSFORM_KEYS  = CIPHER_KEY
 * - BUFFER_ALIGNMENT_LIMIT = MASK_LENGTH (512)
 * - fetchDisplayBuffer     = fetchAndDecryptFont
 * 
 * Nama fungsi dibuat menyerupai kalkulasi metrik raster/buffer layout biasa
 * agar hacker yang melakukan search/grep "unmask", "decrypt", atau "shield"
 * di DevTools tidak akan menemukan apapun.
 */
import opentype from 'opentype.js';

// Decoy coefficients (Subqi Shield v1 key stream)
const METRIC_TRANSFORM_KEYS = [0x53, 0x75, 0x62, 0x71, 0x69, 0x46, 0x6F, 0x6E, 0x74, 0x56, 0x61, 0x75, 0x6C, 0x74, 0x32, 0x36];
const BUFFER_ALIGNMENT_LIMIT = 512;

/**
 * Verifikasi header magic binary (OTTO, TrueType, WOFF)
 */
function verifyGlyphStreamMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // OTTO
  if (bytes[0] === 0x4F && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4F) return true;
  // 0x00010000 (TrueType)
  if (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) return true;
  // true
  if (bytes[0] === 0x74 && bytes[1] === 0x72 && bytes[2] === 0x75 && bytes[3] === 0x65) return true;
  // wOFF
  if (bytes[0] === 0x77 && bytes[1] === 0x4F && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  // wOF2
  if (bytes[0] === 0x77 && bytes[1] === 0x4F && bytes[2] === 0x46 && bytes[3] === 0x32) return true;
  return false;
}

/**
 * Decoy function: normalizeBufferMetrics (sebelumnya unmaskFontBuffer)
 * Melakukan alignment stream XOR 512 byte di RAM browser secara instan.
 */
export function normalizeBufferMetrics(buffer: ArrayBuffer): ArrayBuffer {
  // Always create a clean copy so we don't mutate across calls
  const bytes = new Uint8Array(buffer.slice(0));

  // If already valid stream magic, do not transform
  if (verifyGlyphStreamMagic(bytes)) {
    return bytes.buffer;
  }

  // Stream normalization
  const limit = Math.min(bytes.length, BUFFER_ALIGNMENT_LIMIT);
  const keyLen = METRIC_TRANSFORM_KEYS.length;
  for (let i = 0; i < limit; i++) {
    bytes[i] ^= METRIC_TRANSFORM_KEYS[i % keyLen];
  }

  // Check if normalization succeeded
  if (verifyGlyphStreamMagic(bytes)) {
    return bytes.buffer;
  }

  // Fallback: return clean buffer copy
  return bytes.buffer;
}

// Alias decoy
export const unmaskFontBuffer = normalizeBufferMetrics;

const fontPromiseCache = new Map<string, Promise<ArrayBuffer>>();
const facePromises = new Map<string, Promise<FontFace | void>>();

// Token management with clock-skew tolerance, sessionStorage persistence, and retry backoff
const TOKEN_STORAGE_KEY = 'bt_ft_v1';
let cachedToken: { token: string; expiresAtLocal: number } | null = null;
let tokenPromise: Promise<string> | null = null;
let failUntil = 0;

// Hydrate from sessionStorage on boot
try {
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.token && typeof parsed.expiresAtLocal === 'number' && Date.now() < parsed.expiresAtLocal) {
        cachedToken = parsed;
      }
    }
  }
} catch {
  // Ignore sessionStorage errors (e.g. private mode)
}

function resetTokenCache() {
  cachedToken = null;
  tokenPromise = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

// Invalidate on BFCache restoration
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resetTokenCache();
    }
  });
}

/**
 * Mengambil ephemeral HMAC token berumur 10 menit untuk otorisasi fetch font
 */
async function getFontAccessToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cachedToken && cachedToken.expiresAtLocal > now) {
    return cachedToken.token;
  }

  if (now < failUntil) {
    return '';
  }

  if (force) {
    resetTokenCache();
  } else if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const res = await fetch('/api/ft');
      if (!res.ok) {
        failUntil = Date.now() + 5000;
        return '';
      }
      const data = await res.json();
      const ttl = typeof data.ttl === 'number' ? data.ttl : 600;
      // Kurangi 60 detik buffer dari ttl untuk mencegah kadaluarsa saat inflight
      const expiresAtLocal = Date.now() + Math.max(30, ttl - 60) * 1000;
      cachedToken = { token: data.t, expiresAtLocal };
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(cachedToken));
        }
      } catch {}
      return data.t || '';
    } catch {
      failUntil = Date.now() + 5000;
      resetTokenCache();
      return '';
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

/**
 * Fetches and normalizes font buffer in memory with HMAC auth
 */
export async function fetchDisplayBuffer(url: string): Promise<ArrayBuffer> {
  if (fontPromiseCache.has(url)) {
    return fontPromiseCache.get(url)!;
  }

  const promise = (async () => {
    try {
      let token = await getFontAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['X-FT'] = token;
      }

      let res = await fetch(url, { headers });

      // Jika ditolak 403 (mungkin token expired di server), coba refresh token sekali
      if (res.status === 403) {
        token = await getFontAccessToken(true);
        if (token) {
          headers['X-FT'] = token;
          res = await fetch(url, { headers });
        }
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const rawBuffer = await res.arrayBuffer();
      return normalizeBufferMetrics(rawBuffer);
    } catch (err) {
      fontPromiseCache.delete(url);
      throw err;
    }
  })();

  fontPromiseCache.set(url, promise);
  return promise;
}

/**
 * Loads font into document.fonts using native FontFace(familyName, ArrayBuffer).
 * Safe from race-conditions and concurrent duplicate loads.
 */
export function loadProtectedFontFace(familyName: string, url: string): Promise<FontFace | void> {
  const cacheKey = `${familyName}::${url}`;
  let p = facePromises.get(cacheKey);
  if (!p) {
    p = (async () => {
      const buffer = await fetchDisplayBuffer(url);
      const cleanBuffer = buffer.slice(0);
      const fontFace = new FontFace(familyName, cleanBuffer, {
        display: 'swap'
      });
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
      return loadedFace;
    })();
    p.catch(() => facePromises.delete(cacheKey));
    facePromises.set(cacheKey, p);
  }
  return p;
}

/**
 * Parses font directly into an OpenType.js Font object from normalized memory.
 */
export async function loadProtectedOpenType(url: string): Promise<opentype.Font> {
  const buffer = await fetchDisplayBuffer(url);
  return opentype.parse(buffer.slice(0));
}
