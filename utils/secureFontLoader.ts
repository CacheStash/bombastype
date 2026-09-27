/**
 * SECURE FONT LOADER (Client-side Decryption & Direct Binary FontFace Injector)
 * 
 * Protects commercial fonts from direct downloading/ripping via DevTools.
 * Font binaries fetched from /api/fonts are masked on the server (Subqi Shield v1).
 * This helper unmasks them in browser memory and mounts them via native FontFace(ArrayBuffer) and opentype.js.
 */
import opentype from 'opentype.js';

// Secret key stream mask (Subqi Shield v1 - 100% interoperable with FontCanvas)
const CIPHER_KEY = [0x53, 0x75, 0x62, 0x71, 0x69, 0x46, 0x6F, 0x6E, 0x74, 0x56, 0x61, 0x75, 0x6C, 0x74, 0x32, 0x36];
const MASK_LENGTH = 512;

/**
 * Checks if a byte buffer starts with valid SFNT font magic headers:
 * - OTTO (OpenType CFF)
 * - 0x00010000 (TrueType)
 * - true (Apple TrueType)
 * - wOFF / wOF2 (Web Open Font Format)
 */
function isSfntFont(bytes: Uint8Array): boolean {
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
 * Smart unmasks the font buffer in memory.
 * If the buffer is already a valid font (e.g. from legacy unmasked cache), it leaves it untouched.
 */
export function unmaskFontBuffer(buffer: ArrayBuffer): ArrayBuffer {
  // Always create a clean copy so we don't accidentally mutate across calls
  const bytes = new Uint8Array(buffer.slice(0));

  // If already a valid font format, do not unmask!
  if (isSfntFont(bytes)) {
    return bytes.buffer;
  }

  // Attempt unmasking
  const limit = Math.min(bytes.length, MASK_LENGTH);
  const keyLen = CIPHER_KEY.length;
  for (let i = 0; i < limit; i++) {
    bytes[i] ^= CIPHER_KEY[i % keyLen];
  }

  // Check if unmasking succeeded
  if (isSfntFont(bytes)) {
    return bytes.buffer;
  }

  // Fallback: return clean buffer copy
  return bytes.buffer;
}

const fontPromiseCache = new Map<string, Promise<ArrayBuffer>>();
const loadedFamilies = new Set<string>();

/**
 * Fetches and decrypts the font buffer.
 */
export async function fetchAndDecryptFont(url: string): Promise<ArrayBuffer> {
  if (fontPromiseCache.has(url)) {
    return fontPromiseCache.get(url)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const rawBuffer = await res.arrayBuffer();
      return unmaskFontBuffer(rawBuffer);
    } catch (err) {
      fontPromiseCache.delete(url);
      throw err;
    }
  })();

  fontPromiseCache.set(url, promise);
  return promise;
}

/**
 * Loads a protected font into document.fonts using native FontFace(familyName, ArrayBuffer).
 * Zero Blob URL overhead, CSP immune, instant native rendering.
 */
export async function loadProtectedFontFace(familyName: string, url: string): Promise<void> {
  const cacheKey = `${familyName}::${url}`;
  if (loadedFamilies.has(cacheKey)) return;

  try {
    const buffer = await fetchAndDecryptFont(url);
    const cleanBuffer = buffer.slice(0);
    const fontFace = new FontFace(familyName, cleanBuffer, {
      display: 'swap'
    });
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    loadedFamilies.add(cacheKey);
  } catch (err) {
    console.error(`Failed to register protected FontFace: ${familyName}`, err);
  }
}

/**
 * Parses a protected font directly into an OpenType.js Font object from memory.
 */
export async function loadProtectedOpenType(url: string): Promise<opentype.Font> {
  const buffer = await fetchAndDecryptFont(url);
  return opentype.parse(buffer.slice(0));
}
