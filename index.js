import opentype from 'opentype.js';

function subsetFontBuffer(fontBuffer, mode) {
  try {
    const bytes = new Uint8Array(fontBuffer);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const font = opentype.parse(ab);

    let allowedChars;
    if (mode === 'alphanumeric') {
      // BombasType Handpicked section: A-Z, a-z, 0-9
      allowedChars = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ');
    } else if (mode === 'basic') {
      // Subqi /fonts preview: A-Z, a-z, 0-9 and basic keyboard symbols (ASCII 32 to 126)
      allowedChars = new Set();
      for (let i = 32; i <= 126; i++) {
        allowedChars.add(String.fromCharCode(i));
      }
    } else {
      return fontBuffer;
    }

    const allowedGlyphs = [font.glyphs.get(0)]; // .notdef
    for (let i = 1; i < font.glyphs.length; i++) {
      const g = font.glyphs.get(i);
      if (g.unicode && allowedChars.has(String.fromCharCode(g.unicode))) {
        allowedGlyphs.push(g);
      }
    }

    const subsetFont = new opentype.Font({
      familyName: font.names.fontFamily?.en || 'SubsetFont',
      styleName: font.names.fontSubfamily?.en || 'Regular',
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      glyphs: allowedGlyphs
    });

    const subsetAb = subsetFont.toArrayBuffer();
    return subsetAb;
  } catch (err) {
    console.error("subsetFontBuffer error fallback:", err);
    return fontBuffer;
  }
}

async function getSupabaseUser(authHeader, env) {
  if (!authHeader) return null;
  const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': authHeader,
      'apikey': env.VITE_SUPABASE_ANON_KEY,
    }
  });
  if (res.ok) return await res.json();
  return null;
}

// Fungsi ini membungkus file mentah menjadi kontainer ZIP yang valid secara manual
// Ultra-fast Slicing-by-8 CRC32 table (Intel algorithm, ~5x faster in Cloudflare V8)
const CRC_TABLE_8 = new Uint32Array(256 * 8);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE_8[i] = c;
}
for (let i = 0; i < 256; i++) {
  for (let k = 1; k < 8; k++) {
    CRC_TABLE_8[k * 256 + i] = (CRC_TABLE_8[(k - 1) * 256 + i] >>> 8) ^ CRC_TABLE_8[CRC_TABLE_8[(k - 1) * 256 + i] & 0xFF];
  }
}

function calculateCRC32(data) {
  const len = data.length;
  let crc = 0xFFFFFFFF;
  let i = 0;
  const rem = len & 7;
  const end = len - rem;

  if (data.buffer && data.byteOffset !== undefined) {
    const dv = new DataView(data.buffer, data.byteOffset, len);
    while (i < end) {
      const one = dv.getUint32(i, true) ^ crc;
      const two = dv.getUint32(i + 4, true);
      crc = CRC_TABLE_8[7 * 256 + (one & 0xFF)] ^
            CRC_TABLE_8[6 * 256 + ((one >>> 8) & 0xFF)] ^
            CRC_TABLE_8[5 * 256 + ((one >>> 16) & 0xFF)] ^
            CRC_TABLE_8[4 * 256 + (one >>> 24)] ^
            CRC_TABLE_8[3 * 256 + (two & 0xFF)] ^
            CRC_TABLE_8[2 * 256 + ((two >>> 8) & 0xFF)] ^
            CRC_TABLE_8[1 * 256 + ((two >>> 16) & 0xFF)] ^
            CRC_TABLE_8[two >>> 24];
      i += 8;
    }
  }

  while (i < len) {
    crc = (crc >>> 8) ^ CRC_TABLE_8[(crc ^ data[i]) & 0xFF];
    i++;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// --- OPENTYPE METADATA STAMPING (Pure DataView, <2ms, 0 design/kerning modification) ---
function encodeUTF16BE(str) {
  const bytes = new Uint8Array(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i * 2] = (code >> 8) & 0xff;
    bytes[i * 2 + 1] = code & 0xff;
  }
  return bytes;
}

function encodeASCII(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0x7f;
  }
  return bytes;
}

function calculateTableChecksum(u8Array, offset, length) {
  let sum = 0;
  const view = new DataView(u8Array.buffer, u8Array.byteOffset, u8Array.byteLength);
  const nWords = (length + 3) >>> 2;
  for (let i = 0; i < nWords; i++) {
    const pos = offset + i * 4;
    let word = 0;
    if (pos + 4 <= offset + length) {
      word = view.getUint32(pos);
    } else {
      for (let b = 0; b < 4; b++) {
        const byteVal = (pos + b < offset + length) ? u8Array[pos + b] : 0;
        word = (word << 8) | byteVal;
      }
    }
    sum = (sum + word) >>> 0;
  }
  return sum;
}

function stampFontMetadata(fontBuffer, stamps) {
  try {
    const bytes = new Uint8Array(fontBuffer);
    if (bytes.length < 64) return fontBuffer;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const sfntVersion = view.getUint32(0);
    const isOTF = sfntVersion === 0x4F54544F; // 'OTTO'
    const isTTF = sfntVersion === 0x00010000 || sfntVersion === 0x74727565; // TrueType or 'true'
    if (!isOTF && !isTTF) {
      return fontBuffer;
    }

    const numTables = view.getUint16(4);
    let nameTableDirOffset = -1;
    let nameTableOffset = 0;
    let nameTableLength = 0;
    let headTableOffset = -1;

    for (let i = 0; i < numTables; i++) {
      const dirOffset = 12 + i * 16;
      const tag = view.getUint32(dirOffset);
      if (tag === 0x6E616D65) { // 'name'
        nameTableDirOffset = dirOffset;
        nameTableOffset = view.getUint32(dirOffset + 8);
        nameTableLength = view.getUint32(dirOffset + 12);
      } else if (tag === 0x68656164) { // 'head'
        headTableOffset = view.getUint32(dirOffset + 8);
      }
    }

    if (nameTableDirOffset === -1 || nameTableOffset === 0) {
      return fontBuffer;
    }

    const format = view.getUint16(nameTableOffset);
    if (format !== 0 && format !== 1) {
      return fontBuffer;
    }

    const existingCount = view.getUint16(nameTableOffset + 2);
    const existingStringOffset = view.getUint16(nameTableOffset + 4);
    const existingStringBase = nameTableOffset + existingStringOffset;

    const records = [];
    const stampedNameIds = new Set();
    if (stamps.uniqueId) stampedNameIds.add(3);
    if (stamps.licenseDescription) stampedNameIds.add(13);
    if (stamps.licenseUrl) stampedNameIds.add(14);
    if (stamps.vendorUrl) stampedNameIds.add(11);
    if (stamps.trademark) stampedNameIds.add(7);

    for (let i = 0; i < existingCount; i++) {
      const recOffset = nameTableOffset + 6 + i * 12;
      const platformID = view.getUint16(recOffset);
      const encodingID = view.getUint16(recOffset + 2);
      const languageID = view.getUint16(recOffset + 4);
      const nameID = view.getUint16(recOffset + 6);
      const length = view.getUint16(recOffset + 8);
      const strOffset = view.getUint16(recOffset + 10);

      if (stampedNameIds.has(nameID)) {
        continue;
      }

      const strBytes = bytes.slice(existingStringBase + strOffset, existingStringBase + strOffset + length);
      records.push({ platformID, encodingID, languageID, nameID, data: strBytes });
    }

    const stampEntries = [
      { nameID: 3, val: stamps.uniqueId },
      { nameID: 7, val: stamps.trademark },
      { nameID: 11, val: stamps.vendorUrl },
      { nameID: 13, val: stamps.licenseDescription },
      { nameID: 14, val: stamps.licenseUrl },
    ];

    for (const entry of stampEntries) {
      if (!entry.val) continue;
      // Windows Unicode BMP (UTF-16BE)
      records.push({
        platformID: 3,
        encodingID: 1,
        languageID: 0x0409,
        nameID: entry.nameID,
        data: encodeUTF16BE(entry.val)
      });
      // Mac Roman (ASCII)
      records.push({
        platformID: 1,
        encodingID: 0,
        languageID: 0,
        nameID: entry.nameID,
        data: encodeASCII(entry.val)
      });
    }

    records.sort((a, b) => {
      if (a.platformID !== b.platformID) return a.platformID - b.platformID;
      if (a.encodingID !== b.encodingID) return a.encodingID - b.encodingID;
      if (a.languageID !== b.languageID) return a.languageID - b.languageID;
      return a.nameID - b.nameID;
    });

    const headerSize = 6;
    const recordsSize = records.length * 12;
    const stringOffset = headerSize + recordsSize;
    let totalStringSize = 0;
    for (const r of records) {
      totalStringSize += r.data.length;
    }

    const newNameTableLength = stringOffset + totalStringSize;
    const newNameTable = new Uint8Array(newNameTableLength);
    const nameView = new DataView(newNameTable.buffer);

    nameView.setUint16(0, 0);
    nameView.setUint16(2, records.length);
    nameView.setUint16(4, stringOffset);

    let curStringOffset = 0;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const recOffset = 6 + i * 12;
      nameView.setUint16(recOffset, r.platformID);
      nameView.setUint16(recOffset + 2, r.encodingID);
      nameView.setUint16(recOffset + 4, r.languageID);
      nameView.setUint16(recOffset + 6, r.nameID);
      nameView.setUint16(recOffset + 8, r.data.length);
      nameView.setUint16(recOffset + 10, curStringOffset);

      newNameTable.set(r.data, stringOffset + curStringOffset);
      curStringOffset += r.data.length;
    }

    const paddedOldLength = (bytes.length + 3) & ~3;
    const newTotalLength = paddedOldLength + newNameTableLength;
    const resultBytes = new Uint8Array(newTotalLength);
    resultBytes.set(bytes, 0);
    resultBytes.set(newNameTable, paddedOldLength);

    const resultView = new DataView(resultBytes.buffer);
    resultView.setUint32(nameTableDirOffset + 8, paddedOldLength);
    resultView.setUint32(nameTableDirOffset + 12, newNameTableLength);

    const newChecksum = calculateTableChecksum(resultBytes, paddedOldLength, newNameTableLength);
    resultView.setUint32(nameTableDirOffset + 4, newChecksum);

    if (headTableOffset > 0 && headTableOffset + 12 <= resultBytes.length) {
      resultView.setUint32(headTableOffset + 8, 0);
      const wholeFileChecksum = calculateTableChecksum(resultBytes, 0, resultBytes.length);
      const adjustment = (0xB1B0AFBA - wholeFileChecksum) >>> 0;
      resultView.setUint32(headTableOffset + 8, adjustment);
    }

    return resultBytes.buffer;
  } catch (err) {
    console.error("stampFontMetadata error fallback:", err);
    return fontBuffer;
  }
}

// In-memory rate limiter for sensitive authentication & recovery endpoints
const resetRateLimitMap = new Map();
function checkResetRateLimit(ip, limit = 5, windowMs = 900000) {
  const now = Date.now();
  if (resetRateLimitMap.size > 5000) {
    for (const [key, val] of resetRateLimitMap.entries()) {
      if (now > val.resetTime) resetRateLimitMap.delete(key);
    }
    if (resetRateLimitMap.size > 5000) resetRateLimitMap.clear();
  }
  const record = resetRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    resetRateLimitMap.set(ip, record);
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count++;
  resetRateLimitMap.set(ip, record);
  return true;
}

function isAllowedSource(val) {
  if (!val) return false;
  try {
    const parsed = val.startsWith('http://') || val.startsWith('https://')
      ? new URL(val)
      : new URL(`https://${val}`);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === 'bombastype.com' ||
      hostname.endsWith('.bombastype.com') ||
      hostname === 'bombastype.workers.dev' ||
      hostname.endsWith('.bombastype.workers.dev') ||
      hostname === 'subqi.com' ||
      hostname.endsWith('.subqi.com') ||
      hostname === 'subqi.workers.dev' ||
      hostname.endsWith('.subqi.workers.dev') ||
      hostname === 'fontcanvas.pages.dev' ||
      hostname.endsWith('.fontcanvas.pages.dev') ||
      (hostname.endsWith('.workers.dev') && hostname.includes('fontcanvas')) ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  } catch (_) {
    return false;
  }
}

async function fetchFileBuffer(fileName, env) {
  if (fileName.includes('..') || fileName.includes('\\')) return null;

  // 1. Coba ambil dari R2 (cek folder tester/ terlebih dahulu jika ada, lalu fallback ke root)
  let object = await env.R2_BUCKET.get('tester/' + fileName);
  if (!object) {
    object = await env.R2_BUCKET.get(fileName);
  }
  if (object) return { body: await object.arrayBuffer(), contentType: object.httpMetadata?.contentType };

  // 2. Proteksi Anti-Open-Proxy: Jika fileName memiliki ekstensi font (.otf, .ttf, .woff, .woff2),
  // jangan teruskan ke Google Drive karena file R2 yang hilang tidak boleh menjadi request Drive liar.
  const isFontExtension = /\.(otf|ttf|woff2?)$/i.test(fileName);
  if (isFontExtension) {
    return null;
  }

  // 3. Fallback Google Drive ID (Hanya untuk legacy alphanumeric Drive ID)
  const isValidDriveId = /^[a-zA-Z0-9_-]{25,45}$/.test(fileName);
  if (!isValidDriveId) {
    return null;
  }

  const driveUrl = `https://lh3.googleusercontent.com/d/${fileName}`;
  let res = await fetch(driveUrl);

  // Fallback ke uc?export=download jika lh3 gagal atau dibatasi
  if (!res.ok || (res.headers.get('content-type') || '').includes('text/html')) {
    const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileName}&confirm=t`;
    const fallbackRes = await fetch(fallbackUrl);
    if (fallbackRes.ok) {
      res = fallbackRes;
    }
  }
  
  if (res.ok) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    
    // Proteksi: Maksimal ukuran file 15MB (mencegah proxy download film/file besar)
    if (contentLength > 15 * 1024 * 1024) {
      console.error(`DRIVE_REJECTED_OVERSIZED: ${fileName} (${contentLength} bytes)`);
      return null;
    }

    // Proteksi: Tolak jika HTML, video, audio, atau image non-font
    if (
      contentType.includes('text/html') || 
      contentType.includes('video/') || 
      contentType.includes('audio/') || 
      contentType.includes('image/')
    ) {
      return null;
    }

    return { body: await res.arrayBuffer(), contentType: contentType };
  }

  return null;
}

function createMultiZip(files) {
  const date = new Date();
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1));
  const dte = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate());
  
  let offset = 0;
  let centralDirectory = [];
  let zipParts = [];

  files.forEach(file => {
    const fileContent = new Uint8Array(file.content);
    const crc = calculateCRC32(fileContent); // FIXED: Hitung CRC32 asli
    const utf8 = new TextEncoder().encode(file.name);
    
    // 1. Local File Header (30 bytes + filename)
    const header = new Uint8Array(30 + utf8.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); 
    view.setUint16(4, 20, true);         // Version needed: 2.0
    view.setUint16(8, 0, true);          // Method: 0 (Stored)
    view.setUint16(10, time, true); 
    view.setUint16(12, dte, true);
    view.setUint32(14, crc, true);       // FIXED: Masukkan CRC32
    view.setUint32(18, fileContent.byteLength, true); 
    view.setUint32(22, fileContent.byteLength, true);
    view.setUint16(26, utf8.length, true); 
    header.set(utf8, 30);
    
    zipParts.push(header, fileContent);

    // 2. Central Directory Header (46 bytes + filename)
    const cd = new Uint8Array(46 + utf8.length);
    const cdView = new DataView(cd.buffer);
    cdView.setUint32(0, 0x02014b50, true); 
    cdView.setUint16(4, 20, true);         // Version made by
    cdView.setUint16(6, 20, true);         // Version needed
    cdView.setUint16(10, 0, true);         // Method: 0 (Stored)
    cdView.setUint16(12, time, true); 
    cdView.setUint16(14, dte, true);
    cdView.setUint32(16, crc, true);       // FIXED: Masukkan CRC32
    cdView.setUint32(20, fileContent.byteLength, true); 
    cdView.setUint32(24, fileContent.byteLength, true);
    cdView.setUint16(28, utf8.length, true); 
    cdView.setUint32(42, offset, true); 
    cd.set(utf8, 46);
    centralDirectory.push(cd);

    offset += header.byteLength + fileContent.byteLength;
  });

  const cdTotalLen = centralDirectory.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(offset + cdTotalLen + 22);
  let curPos = 0;
  [...zipParts, ...centralDirectory].forEach(part => { result.set(part, curPos); curPos += part.length; });

  const eocdView = new DataView(result.buffer, offset + cdTotalLen);
  eocdView.setUint32(0, 0x06054b50, true); 
  eocdView.setUint16(8, files.length, true); 
  eocdView.setUint16(10, files.length, true); 
  eocdView.setUint32(12, cdTotalLen, true); 
  eocdView.setUint32(16, offset, true);

  return result;
}

// FUNGSI BARU: Cek apakah user ada di tabel fontadmin
async function isUserAdmin(userId, env) {
  try {
    const authKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/fontadmin?id=eq.${userId}&select=id`,
      { 
        headers: { 
          'apikey': authKey, 
          'Authorization': `Bearer ${authKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        } 
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data && data.length > 0; // Jika ID ada di tabel fontadmin, return true
  } catch (e) { return false; }
}

const DEFAULT_EMAIL_TEMPLATE = {
  subject: "Your Font License Order #[ORDER_ID] is Ready — BombasType",
  heading: "Thank you for your purchase, [BUYER_NAME]",
  intro_text: "Your commercial font packages and license certificates are prepared below. Please keep your Order ID safe as archival proof of your licensed usage rights.",
  warning_title: "Security & Direct Download Notice",
  warning_text: "Direct download packages are active for 7 days or up to 7 downloads to safeguard intellectual property against link sharing. You may also access your typography library permanently anytime inside your User Vault.",
  vault_url: "https://bombastype.com/user/auth",
  canvas_vip_enabled: true,
  canvas_url: "https://canvas.bombastype.com",
  canvas_heading: "Font Canvas VIP Access Unlocked!",
  canvas_text: "As our verified commercial font licensee, you receive complimentary VIP access to Font Canvas — our web-based typography creator app:",
};

const DEFAULT_COUPON_EMAIL_TEMPLATE = {
  subject: "Exclusive [DISCOUNT] Off Voucher — BombasType",
  heading: "Exclusive VIP Voucher For You",
  intro_text: "Hello [BUYER_NAME], here is an exclusive discount code for your next commercial font license acquisition from our foundry catalog.",
  discount_label: "YOUR PRIVILEGED DISCOUNT",
  button_text: "Claim Voucher & Browse Catalog →",
  footer_text: "Questions or special inquiries? Reply directly to this letter.<br>© BombasType Studio. All rights reserved."
};

const GAS_ACCOUNT_MAP = {
  "AKfycbyy": "bombastype@gmail.com",
  "AKfycbzH": "bombastypetwo@gmail.com",
  "AKfycbyv": "bombastypebot@gmail.com"
};

function resolveGasSender(resSender, url) {
  if (resSender && resSender.includes('@')) return resSender;
  const target = (url || "") + " " + (resSender || "");
  for (const [key, email] of Object.entries(GAS_ACCOUNT_MAP)) {
    if (target.includes(key)) return email;
  }
  if (url && url.includes('=')) {
    const parts = url.split('=');
    if (parts[0].includes('@')) return parts[0].trim();
  }
  if (url && url.includes('#')) {
    const parts = url.split('#');
    if (parts[1] && parts[1].includes('@')) return parts[1].trim();
  }
  return resSender || null;
}

function parseGasEntry(rawEntry, fallbackIndex = 0) {
  if (!rawEntry) return { url: "", email: `Account #${fallbackIndex + 1}` };
  const str = rawEntry.trim();
  let email = null;
  let url = str;

  // Format 1: email@domain.com=https://script.google.com/...
  if (str.includes('=')) {
    const parts = str.split('=');
    if (parts[0].includes('@')) {
      email = parts[0].trim();
      url = parts.slice(1).join('=').trim();
    }
  }
  // Format 2: https://script.google.com/...#email@domain.com
  else if (str.includes('#')) {
    const parts = str.split('#');
    url = parts[0].trim();
    if (parts[1] && parts[1].includes('@')) {
      email = parts[1].trim();
    }
  }

  // Format 3: Static Map Fallback
  if (!email) {
    email = resolveGasSender(null, url);
  }

  return {
    url,
    email: email || `Account #${fallbackIndex + 1}`
  };
}

async function getSmartPrioritizedGasAccounts(gasUrls, recipientEmail, env) {
  const cleanRecipient = (recipientEmail || "").trim().toLowerCase();
  const accounts = gasUrls.map((entry, idx) => parseGasEntry(entry, idx));
  const filtered = accounts.filter(acc => acc.email.toLowerCase() !== cleanRecipient);
  const candidates = filtered.length > 0 ? filtered : accounts;

  // Use cached quota if env is provided to avoid latency
  let cachedData = null;
  if (env) {
    try {
      cachedData = await getCachedGasQuota(gasUrls, env, false);
    } catch (_) {}
  }

  const withQuotas = candidates.map(acc => {
    let quota = 100;
    if (cachedData?.accounts) {
      const match = cachedData.accounts.find(c => c.url === acc.url || c.email === acc.email);
      if (match && typeof match.remaining === 'number') {
        quota = match.remaining;
      }
    }
    return { ...acc, quota };
  });

  return withQuotas
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => b.quota - a.quota);
}

async function fetchAndSaveGasQuotaCache(gasUrls, env) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const accounts = await Promise.all(gasUrls.map(async (rawEntry, idx) => {
    const parsed = parseGasEntry(rawEntry, idx);
    let email = parsed.email;
    const targetUrl = parsed.url;
    let quota = 100;
    let limit = 100;
    let isOnline = false;
    let needsAuth = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const qRes = await fetch(targetUrl, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      if (qRes.ok) {
        const qText = await qRes.text();
        try {
          const qJson = JSON.parse(qText);
          if (qJson?.status === "SUCCESS") {
            isOnline = true;
            if (typeof qJson?.quota === 'number') quota = qJson.quota;
            else if (typeof qJson?.remainingDailyQuota === 'number') quota = qJson.remainingDailyQuota;
            limit = typeof qJson?.limit === 'number' ? qJson.limit : (quota > 100 ? 1500 : 100);
            if (qJson?.email && qJson.email.includes('@')) {
              email = qJson.email.trim();
            }
          } else if (qText.includes("permission") || qText.includes("authorization")) {
            needsAuth = true;
          }
        } catch (_) {
          if (qText.includes("permission") || qText.includes("authorization")) {
            needsAuth = true;
          }
        }
      }
    } catch (e) {
      console.warn("GAS live quota fetch failed for account:", email, e.message);
    }

    let accountStatus = "READY";
    if (isOnline) accountStatus = "ONLINE";
    else if (needsAuth) accountStatus = "NEEDS_AUTH";

    return {
      email,
      url: targetUrl,
      remaining: quota,
      limit,
      status: accountStatus,
      isOnline
    };
  }));

  const totalRemaining = accounts.reduce((sum, acc) => sum + (acc.remaining || 0), 0);
  const totalLimit = accounts.reduce((sum, acc) => sum + (acc.limit || 100), 0);
  const safetyReserve = 15;
  const allowedToday = Math.max(0, totalRemaining - safetyReserve);

  const cachePayload = {
    accounts,
    totalRemaining,
    totalLimit,
    safetyReserve,
    allowedToday,
    cached_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };

  if (supabaseUrl && serviceRoleKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          key: 'gas_quota_cache',
          value: JSON.stringify(cachePayload),
          updated_at: new Date().toISOString()
        })
      });
    } catch (dbErr) {
      console.warn("Failed saving gas_quota_cache to site_settings:", dbErr.message);
    }
  }

  return cachePayload;
}

async function getCachedGasQuota(gasUrls, env, forceRefresh = false) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const today = new Date().toISOString().split('T')[0];

  if (!forceRefresh && supabaseUrl && serviceRoleKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.gas_quota_cache&select=value`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows?.[0]?.value) {
          const cached = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
          // Valid cache if from today and contains accounts
          if (cached && cached.cached_date === today && Array.isArray(cached.accounts) && cached.accounts.length > 0) {
            return cached;
          }
        }
      }
    } catch (e) {
      console.warn("Failed reading gas_quota_cache from site_settings:", e.message);
    }
  }

  return await fetchAndSaveGasQuotaCache(gasUrls, env);
}

async function decrementGasQuotaCache(senderAccount, env, count = 1) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.gas_quota_cache&select=value`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (!rows?.[0]?.value) return;

    const cached = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    if (!cached || !Array.isArray(cached.accounts)) return;

    let modified = false;
    cached.accounts = cached.accounts.map(acc => {
      if (!senderAccount || acc.email === senderAccount || (acc.url && senderAccount.includes(acc.email))) {
        acc.remaining = Math.max(0, (acc.remaining || 0) - count);
        modified = true;
      }
      return acc;
    });

    if (modified) {
      cached.totalRemaining = cached.accounts.reduce((sum, acc) => sum + (acc.remaining || 0), 0);
      cached.allowedToday = Math.max(0, cached.totalRemaining - (cached.safetyReserve || 15));
      cached.updated_at = new Date().toISOString();

      await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          key: 'gas_quota_cache',
          value: JSON.stringify(cached),
          updated_at: new Date().toISOString()
        })
      });
    }
  } catch (e) {
    console.warn("Failed decrementing gas_quota_cache:", e.message);
  }
}

function generateOrderEmailHtml({ buyerEmail, buyerName, orderId, items, templateConfig, baseUrl }) {
  const cfg = { ...DEFAULT_EMAIL_TEMPLATE, ...(templateConfig || {}) };
  const safeName = buyerName || "Creator";
  const heading = (cfg.heading || DEFAULT_EMAIL_TEMPLATE.heading).replace(/\[BUYER_NAME\]/g, safeName).replace(/\[ORDER_ID\]/g, orderId);
  const introText = (cfg.intro_text || DEFAULT_EMAIL_TEMPLATE.intro_text).replace(/\[BUYER_NAME\]/g, safeName).replace(/\[ORDER_ID\]/g, orderId);
  const warningText = (cfg.warning_text || DEFAULT_EMAIL_TEMPLATE.warning_text).replace(/\[BUYER_NAME\]/g, safeName).replace(/\[ORDER_ID\]/g, orderId);
  const warningTitle = cfg.warning_title || DEFAULT_EMAIL_TEMPLATE.warning_title;
  const vaultUrl = cfg.vault_url || DEFAULT_EMAIL_TEMPLATE.vault_url;
  const siteUrl = baseUrl || "https://bombastype.com";

  let itemsHtml = "";
  (items || []).forEach(item => {
    const isTrial = item.price === 0;
    const fontName = item.name || "Commercial Font";
    const licenseTier = item.tier || (isTrial ? "Personal Trial" : "Commercial License");
    const fileParam = item.file || item.font_files?.[0] || item.trialFileUrl || fontName;
    const downloadUrl = `${siteUrl}/api/download-zip?file=${encodeURIComponent(fileParam)}&order=${encodeURIComponent(orderId)}&email=${encodeURIComponent(buyerEmail)}`;

    itemsHtml += `
      <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 20px; margin-bottom: 14px;">
        <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 19px; font-weight: 700; color: #2c241a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">${fontName}</div>
        <div style="font-size: 12px; color: #6b5c4d; margin-bottom: 16px;">
          LICENSE TIER: <strong style="background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 3px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">${licenseTier}</strong>
        </div>
        <a href="${downloadUrl}" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 11px; text-decoration: none; padding: 12px 24px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.12em;">Download Font & License (.ZIP)</a>
      </div>
    `;
  });

  const canvasHtml = cfg.canvas_vip_enabled ? `
    <tr>
      <td style="padding: 0 32px 24px 32px;">
        <div style="background-color: #fffdf5; border: 1px solid #8b6b4a; padding: 22px;">
          <div style="margin-bottom: 12px;">
            <span style="background-color: #8b6b4a; color: #fffdf5; font-size: 9px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; letter-spacing: 0.15em; display: inline-block;">VIP BONUS</span>
            <span style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 8px; display: inline-block; vertical-align: middle;">${cfg.canvas_heading}</span>
          </div>
          <p style="font-family: 'EB Garamond', Georgia, serif; font-size: 14px; color: #4a3c2c; margin: 8px 0 16px 0; line-height: 1.5;">
            ${cfg.canvas_text}
          </p>

          <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 14px 18px; margin-bottom: 16px; font-size: 13px; line-height: 2;">
            <div style="margin-bottom: 4px;">
              <span style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #2c241a;">URL</span>
              <strong style="color: #2c241a;">APP URL:</strong> <a href="${cfg.canvas_url}" style="color: #8b6b4a; font-weight: 700; text-decoration: underline;">${cfg.canvas_url}</a>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="display: inline-block; background-color: #fdf6e3; color: #2c241a; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #4a3c2c;">USER</span>
              <strong style="color: #2c241a;">USERNAME:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a; background-color: #fdf6e3; padding: 2px 6px; border: 1px solid #2c241a;">${buyerEmail}</span>
            </div>
            <div>
              <span style="display: inline-block; background-color: #8b6b4a; color: #fffdf5; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #8b6b4a;">PASS</span>
              <strong style="color: #2c241a;">PASSWORD:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a; background-color: #fdf6e3; padding: 2px 6px; border: 1px solid #2c241a;">${orderId}</span>
            </div>
          </div>

          <div style="font-family: 'EB Garamond', Georgia, serif; font-size: 13px; color: #4a3c2c; line-height: 1.6;">
            <strong style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Your VIP Privileges:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 18px; color: #4a3c2c;">
              <li><strong style="color: #2c241a;">Purchased Fonts Unlocked:</strong> All fonts in this order are automatically activated in your Canvas suite.</li>
              <li><strong style="color: #2c241a;">Bonus Extras & Dingbats:</strong> Free access to exclusive ornaments and dingbats catalog-wide.</li>
              <li><strong style="color: #2c241a;">Full Pro Tools:</strong> High-res export, canvas saving, and SVG generation completely unlocked.</li>
            </ul>
          </div>
        </div>
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #fffdf5; font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; color: #2c241a; line-height: 1.5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #fdf6e3; border: 2px solid #2c241a; text-align: left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #2c241a; background-color: #fdf6e3; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: #2c241a; margin-bottom: 4px;">— BOMBASTYPE —</div>
              <div style="font-size: 10px; font-weight: bold; letter-spacing: 0.15em; color: #8b6b4a; text-transform: uppercase; margin-bottom: 14px;">ACQUISITION RECEIPT & LICENSE PROVISIONS</div>
              <div style="font-family: monospace; color: #2c241a; font-size: 11px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;">ORDER #${orderId}</div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3;">${heading}</h1>
              <p style="margin: 10px auto 0 auto; color: #4a3c2c; font-size: 14px; line-height: 1.6; max-width: 480px;">${introText}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 11px; font-weight: 700; color: #8b6b4a; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px;">PURCHASED FONT ASSETS</div>
              ${itemsHtml}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 18px 20px;">
                <div style="margin-bottom: 6px;">
                  <strong style="color: #8C4A32; font-family: 'Playfair Display', Georgia, serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">⚠️ ${warningTitle}</strong>
                </div>
                <p style="margin: 0; color: #4a3c2c; font-size: 13px; line-height: 1.6;">
                  ${warningText}
                </p>
                <div style="margin-top: 12px;">
                  <a href="${vaultUrl}" style="display: inline-block; background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 6px 14px; font-family: 'Playfair Display', Georgia, serif; font-size: 10px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">Open User Vault (Permanent Access) →</a>
                </div>
              </div>
            </td>
          </tr>

          ${canvasHtml}

          <tr>
            <td style="padding: 22px 32px; border-top: 1px solid #2c241a; background-color: #fdf6e3; text-align: center; font-size: 12px; font-style: italic; color: #6b5c4d; line-height: 1.6;">
              ${cfg.footer_text || DEFAULT_EMAIL_TEMPLATE.footer_text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateCouponEmailHtml({ buyerEmail, buyerName, couponCode, discountText, validUntil, usageLimit, templateConfig, baseUrl }) {
  const cfg = { ...DEFAULT_COUPON_EMAIL_TEMPLATE, ...(templateConfig || {}) };
  const safeName = buyerName || "Creator";
  const siteUrl = baseUrl || "https://bombastype.com";
  const heading = (cfg.heading || DEFAULT_COUPON_EMAIL_TEMPLATE.heading)
    .replace(/\[BUYER_NAME\]/g, safeName)
    .replace(/\[DISCOUNT\]/g, discountText || "");
  const introText = (cfg.intro_text || DEFAULT_COUPON_EMAIL_TEMPLATE.intro_text)
    .replace(/\[BUYER_NAME\]/g, safeName)
    .replace(/\[DISCOUNT\]/g, discountText || "");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Exclusive ${discountText} Off Voucher — BombasType</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #fffdf5; font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; color: #2c241a; line-height: 1.5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #fdf6e3; border: 2px solid #2c241a; text-align: left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #2c241a; background-color: #fdf6e3; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: #2c241a; margin-bottom: 4px;">— BOMBASTYPE —</div>
              <div style="font-size: 10px; font-weight: bold; letter-spacing: 0.15em; color: #8b6b4a; text-transform: uppercase; margin-bottom: 12px;">PATRON EXCLUSIVE PROVISION</div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3;">${heading}</h1>
              <p style="margin: 8px auto 0 auto; color: #4a3c2c; font-size: 14px; line-height: 1.6; max-width: 480px;">${introText}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <div style="background-color: #ffffff; border: 2px dashed #2c241a; padding: 24px 20px; text-align: center;">
                <div style="color: #8b6b4a; font-family: 'Playfair Display', Georgia, serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 6px;">${cfg.discount_label || DEFAULT_COUPON_EMAIL_TEMPLATE.discount_label}</div>
                <div style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 44px; font-weight: 900; letter-spacing: -0.02em; line-height: 1;">${discountText}</div>
                <div style="margin-top: 16px;">
                  <span style="display: inline-block; background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 10px 24px; font-family: monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.2em;">${couponCode}</span>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px 32px 20px 32px;">
              <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 16px 20px; font-size: 13px; line-height: 2;">
                <div style="margin-bottom: 4px;"><span style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #2c241a;">EXPIRY</span> <strong style="color: #2c241a;">VALID UNTIL:</strong> <span style="font-weight: 700; color: #4a3c2c;">${validUntil}</span></div>
                <div style="margin-bottom: 4px;"><span style="display: inline-block; background-color: #fdf6e3; color: #2c241a; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #2c241a;">LIMIT</span> <strong style="color: #2c241a;">USAGE LIMIT:</strong> <span style="font-weight: 700; color: #4a3c2c;">${usageLimit}</span></div>
                <div><span style="display: inline-block; background-color: #8b6b4a; color: #fffdf5; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #8b6b4a;">TIER</span> <strong style="color: #2c241a;">APPLIES TO:</strong> <span style="font-weight: 700; color: #8b6b4a;">All Commercial Font Licenses & Bundles</span></div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <a href="${siteUrl}" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 11px; text-decoration: none; padding: 14px 28px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.15em;">${cfg.button_text || DEFAULT_COUPON_EMAIL_TEMPLATE.button_text}</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #2c241a; background-color: #fdf6e3; text-align: center; font-size: 12px; font-style: italic; color: #6b5c4d; line-height: 1.6;">
              ${cfg.footer_text || DEFAULT_COUPON_EMAIL_TEMPLATE.footer_text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateBroadcastEmailHtml({ preset, title, subtitle, bodyText, bannerUrl, buttonText, buttonUrl, couponCode, blocks = [], baseUrl }) {
  const siteUrl = baseUrl || "https://bombastype.com";
  const mainTitle = title || "Studio Dispatch";
  const formattedBody = (bodyText || "").replace(/\n/g, '<br/>');

  const bannerHtml = bannerUrl ? `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <img src="${bannerUrl}" alt="${mainTitle}" style="width: 100%; max-width: 600px; height: auto; display: block; border-bottom: 1px solid #2c241a;" />
      </td>
    </tr>
  ` : '';

  const couponHtml = couponCode ? `
    <div style="background-color: #ffffff; border: 2px dashed #8b6b4a; padding: 18px 24px; margin: 24px 0; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #8b6b4a; font-weight: 700; margin-bottom: 6px;">EXCLUSIVE VIP PRIVILEGE</div>
      <div style="font-family: monospace; font-size: 22px; font-weight: 700; color: #2c241a; letter-spacing: 0.15em; background-color: #fdf6e3; display: inline-block; padding: 6px 16px; border: 1px solid #2c241a;">${couponCode}</div>
      <div style="font-size: 12px; font-style: italic; color: #6b5c4d; margin-top: 8px;">Apply this token at checkout to claim your archival discount.</div>
    </div>
  ` : '';

  const buttonHtml = (buttonText && buttonUrl) ? `
    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${buttonUrl}" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 12px; text-decoration: none; padding: 14px 32px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.15em;">${buttonText}</a>
    </div>
  ` : '';

  const isModular = Array.isArray(blocks) && blocks.length > 0;

  const blocksHtml = (isModular ? blocks : []).map(block => {
    if (!block) return '';
    if (block.type === 'heading') {
      const hTitle = block.title || '';
      const hSub = block.subtitle || '';
      return `
        <div style="margin: 28px 0 16px 0; text-align: center;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #2c241a; margin: 0 0 6px 0; line-height: 1.3;">
            ${hTitle}
          </h2>
          ${hSub ? `<div style="font-size: 13px; font-style: italic; color: #8b6b4a; letter-spacing: 0.05em; margin-top: 4px;">${hSub}</div>` : ''}
        </div>
      `;
    }
    if (block.type === 'text') {
      const formattedTxt = (block.text || '').replace(/\n/g, '<br/>');
      return `
        <div style="font-size: 15px; color: #3a2e22; line-height: 1.7; margin: 18px 0;">
          ${formattedTxt}
        </div>
      `;
    }
    if (block.type === 'button') {
      if (!block.buttonText || !block.buttonUrl) return '';
      return `
        <div style="text-align: center; margin: 26px 0 16px 0;">
          <a href="${block.buttonUrl}" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 12px; text-decoration: none; padding: 14px 32px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.15em;">
            ${block.buttonText}
          </a>
        </div>
      `;
    }
    if (block.type === 'image') {
      if (!block.imageUrl) return '';
      return `
        <div style="margin: 24px 0; text-align: center;">
          <img src="${block.imageUrl}" alt="${block.imageCaption || 'Studio Image'}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border: 1px solid #2c241a;" />
          ${block.imageCaption ? `<div style="font-size: 11px; font-style: italic; color: #6b5c4d; margin-top: 6px;">${block.imageCaption}</div>` : ''}
        </div>
      `;
    }
    if (block.type === 'coupon') {
      if (block.dealKind === 'promotion') {
        const promoName = block.promoName || 'SPECIAL STORE PROMOTION';
        const promoDiscount = block.promoDiscount ? `${block.promoDiscount}% OFF` : 'SPECIAL DISCOUNT';
        const promoScope = block.promoTarget === 'global' ? 'STORE-WIDE ON ALL TYPEFACES' : 'ON SELECTED TYPEFACES';
        const promoUrgency = block.promoEndDate ? `Valid until ${new Date(block.promoEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
        return `
          <div style="background-color: #ffffff; border: 2px solid #8b6b4a; padding: 24px 20px; margin: 24px 0; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #8b6b4a; font-weight: 700; margin-bottom: 12px; font-family: 'Playfair Display', Georgia, serif;">${promoName}</div>
            <div style="margin: 8px 0 12px 0;">
              <div style="display: inline-block; background-color: #2c241a; color: #fdf6e3; border: 2px solid #2c241a; box-shadow: 3px 3px 0px #8b6b4a; padding: 8px 28px; font-family: 'Playfair Display', Georgia, serif; font-size: 36px; font-weight: 900; line-height: 1;">${promoDiscount}</div>
            </div>
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #2c241a; margin: 12px 0 4px 0; font-family: 'Playfair Display', Georgia, serif;">${promoScope}</div>
            <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: #8b6b4a; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">NO COUPON CODE REQUIRED.</div>
            ${promoUrgency ? `<div style="margin-top: 12px; font-size: 11px; font-weight: 700; color: #2c241a; background-color: #f5ede0; display: inline-block; padding: 4px 12px; border: 1px solid #8b6b4a;">⏳ ${promoUrgency}</div>` : ''}
          </div>
        `;
      }
      const cCode = block.couponCode || couponCode || '';
      const cDiscount = block.couponDiscount ? `${block.couponDiscount}% OFF` : '';
      const cUrgency = block.couponUrgencyText || '';
      if (!cCode) return '';
      return `
        <div style="background-color: #ffffff; border: 2px dashed #8b6b4a; padding: 22px 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #8b6b4a; font-weight: 700; margin-bottom: 6px;">EXCLUSIVE PRIVILEGE VOUCHER</div>
          ${cDiscount ? `<div style="font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 900; color: #2c241a; margin-bottom: 8px;">${cDiscount}</div>` : ''}
          <div style="font-family: monospace; font-size: 22px; font-weight: 700; color: #2c241a; letter-spacing: 0.15em; background-color: #fdf6e3; display: inline-block; padding: 6px 18px; border: 1px solid #2c241a;">${cCode}</div>
          <div style="font-size: 12px; font-style: italic; color: #6b5c4d; margin-top: 8px;">Apply this token at checkout to claim your archival discount.</div>
          ${cUrgency ? `<div style="margin-top: 10px; font-size: 11px; font-weight: 700; color: #8b6b4a; background-color: #fffdf5; display: inline-block; padding: 4px 10px; border: 1px solid #d1c7b7;">${cUrgency}</div>` : ''}
        </div>
      `;
    }
    return '';
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${mainTitle} — BombasType</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #fffdf5; font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; color: #2c241a; line-height: 1.6;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #fdf6e3; border: 2px solid #2c241a; text-align: left;" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 2px solid #2c241a; background-color: #fdf6e3; text-align: center;">
              <div style="font-size: 10px; font-family: 'Playfair Display', Georgia, serif; letter-spacing: 0.25em; text-transform: uppercase; color: #8b6b4a; font-weight: 700; margin-bottom: 4px;">ARCHIVAL TYPOGRAPHY DISPATCH</div>
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #2c241a;">BOMBASTYPE</div>
              <div style="font-size: 9px; font-family: monospace; letter-spacing: 0.15em; text-transform: uppercase; color: #6b5c4d; margin-top: 4px;">FOUNDRY &amp; TYPE LAB &bull; EST. MMXXVI</div>
            </td>
          </tr>

          ${!isModular ? bannerHtml : ''}

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              ${isModular ? blocksHtml : `
                <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #2c241a; margin: 0 0 8px 0; text-align: center; line-height: 1.3;">
                  ${mainTitle}
                </h1>

                ${subtitle ? `
                <div style="font-size: 13px; font-style: italic; text-align: center; color: #8b6b4a; margin-bottom: 24px; letter-spacing: 0.05em;">
                  ${subtitle}
                </div>` : '<div style="margin-bottom: 20px;"></div>'}

                <div style="font-size: 15px; color: #3a2e22; line-height: 1.7; margin-bottom: 16px;">
                  ${formattedBody}
                </div>

                ${buttonHtml}
              `}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2c241a; background-color: #f7eed8; text-align: center; font-size: 11px; color: #6b5c4d; line-height: 1.7;">
              <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #2c241a; margin-bottom: 4px;">BombasType Typography Studio</div>
              <div>You are receiving this communication as an esteemed patron or subscriber.</div>
              <div style="margin-top: 8px;">
                <a href="${siteUrl}" style="color: #2c241a; font-weight: 700; text-decoration: underline;">Visit Website</a> &bull; 
                <a href="${siteUrl}/license" style="color: #2c241a; font-weight: 700; text-decoration: underline;">License Policy</a> &bull;
                <a href="${siteUrl}/canvas" style="color: #2c241a; font-weight: 700; text-decoration: underline;">FontCanvas</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function triggerGasEmail(buyerEmail, buyerName, orderId, items, env) {
  const gasUrls = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
  if (gasUrls.length === 0) return { success: false, error: "GAS_URL_NOT_CONFIGURED" };

  const hasPaidItem = items.some(item => item.price > 0);
  if (!hasPaidItem) return { success: false, error: "TRIAL_ONLY_NO_EMAIL" };

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Ambil template dinamis dari site_settings
  let templateConfig = null;
  if (supabaseUrl && serviceRoleKey) {
    try {
      const sRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.email_template_order&select=value`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData?.[0]?.value) {
          templateConfig = typeof sData[0].value === 'string' ? JSON.parse(sData[0].value) : sData[0].value;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch template from site_settings, using defaults:", e.message);
    }
  }

  const baseUrl = "https://bombastype.com";
  const renderedHtml = generateOrderEmailHtml({
    buyerEmail,
    buyerName,
    orderId,
    items,
    templateConfig,
    baseUrl
  });

  const subjectTemplate = (templateConfig?.subject || DEFAULT_EMAIL_TEMPLATE.subject);
  const finalSubject = subjectTemplate.replace(/\[ORDER_ID\]/g, orderId).replace(/\[BUYER_NAME\]/g, buyerName || "Creator");

  const payload = {
    token: "$emogaAm4n_",
    action: "order",
    email: buyerEmail,
    name: buyerName,
    order_id: orderId,
    subject: finalSubject,
    htmlBody: renderedHtml,
    sender_name: "BombasType"
  };

  // Smart prioritize accounts: exclude buyer email, highest quota first, random on ties
  const prioritizedAccounts = await getSmartPrioritizedGasAccounts(gasUrls, buyerEmail, env);

  for (const acc of prioritizedAccounts) {
    const url = acc.url;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      const resText = await res.text();
      let resJson = null;
      try { resJson = JSON.parse(resText); } catch (_) {}

      const isExplicitFailure = (resJson && (resJson.status === "UNAUTHORIZED" || (resJson.status === "ERROR" && !resText.includes("MailApp")))) ||
                                resText === "Unauthorized" ||
                                (resText.startsWith("Error:") && !resText.includes("MailApp"));

      const isSuccess = !isExplicitFailure && (
        (resJson && resJson.status === "SUCCESS") || 
        resText === "SUCCESS" || 
        resText.includes("Order Email Sent") ||
        resText.includes("Coupon Email Sent") ||
        resText.includes("MailApp.getRemainingDailyQuota") ||
        resText.includes("Moved Temporarily") ||
        resText.includes("googleusercontent.com") ||
        res.status === 200 ||
        res.status === 302
      );

      if (isSuccess) {
        const senderAccount = resolveGasSender(resJson?.sender, url);
        console.log(`GAS_DELIVERY_SUCCESS: Account ${senderAccount}`);

        // Update cached quota in site_settings
        await decrementGasQuotaCache(senderAccount, env, 1);

        // Update font_history in Supabase
        if (supabaseUrl && serviceRoleKey) {
          try {
            const hRes = await fetch(`${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(orderId)}&select=id,metadata`, {
              headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            });
            const hRows = await hRes.json();
            if (hRows && hRows.length > 0) {
              for (const row of hRows) {
                const updatedMeta = {
                  ...(row.metadata || {}),
                  email_sent: true,
                  email_sent_at: new Date().toISOString(),
                  email_sent_by: senderAccount
                };
                await fetch(`${supabaseUrl}/rest/v1/font_history?id=eq.${row.id}`, {
                  method: 'PATCH',
                  headers: {
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify({ metadata: updatedMeta })
                });
              }
            }
          } catch (dbErr) {
            console.error("Failed to record email_sent in font_history:", dbErr);
          }
        }

        return { success: true, sender: senderAccount };
      }
      console.warn(`GAS_LIMIT_REACHED: ${url.substring(0, 45)} returned: ${resText}`);
    } catch (e) {
      console.error(`GAS_FETCH_FAILED: ${e.message}`);
    }
  }

  return { success: false, error: "ALL_GAS_ACCOUNTS_FAILED" };
}

// Web Crypto HMAC helpers for ephemeral token verification
const textEncoder = new TextEncoder();
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function signHMAC(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyHMAC(secret, message, expectedHex) {
  try {
    const actual = await signHMAC(secret, message);
    return safeEqual(actual, expectedHex);
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handling CORS (Preflight)
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || '';
      const allowedOrigin = origin && isAllowedSource(origin) ? origin : '*';
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, X-Order-ID, X-FT, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // --- 2. DIAGNOSTIC CHECK ---
    if (!env.ASSETS) {
      const availableBindings = JSON.stringify(Object.keys(env), null, 2);
      return new Response(
        `CRITICAL ERROR: env.ASSETS is missing!\n\nAvailable Bindings:\n${availableBindings}`,
        { status: 500 }
      );
    }

    // --- 2.5. API Ephemeral Font Token Issuance (/api/ft) ---
    if (url.pathname === '/api/ft' && request.method === 'GET') {
      const origin = request.headers.get('Origin') || '';
      const referer = request.headers.get('Referer') || '';
      const secFetchMode = request.headers.get('Sec-Fetch-Mode') || '';
      const secFetchDest = request.headers.get('Sec-Fetch-Dest') || '';

      // Direct navigation / address bar open blocked
      if (secFetchMode === 'navigate' || secFetchDest === 'document') {
        return new Response(null, { status: 404 });
      }

      // Check allowed origin or referer if provided
      if ((origin && !isAllowedSource(origin)) || (referer && !isAllowedSource(referer))) {
        return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!checkResetRateLimit(`ft_${clientIp}`, 40, 300000)) {
        return new Response(JSON.stringify({ error: "TOO_MANY_REQUESTS" }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin && isAllowedSource(origin) ? origin : '*' }
        });
      }

      const fontTokenSecret = env.FONT_TOKEN_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || env.GAS_TOKEN;
      if (!fontTokenSecret) {
        return new Response(JSON.stringify({ error: "SERVER_MISCONFIGURED" }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const exp = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const sig = await signHMAC(fontTokenSecret, String(exp));

      return new Response(JSON.stringify({ t: `${exp}.${sig}`, ttl: 600 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, max-age=0',
          'Access-Control-Allow-Origin': origin && isAllowedSource(origin) ? origin : '*'
        }
      });
    }

    // --- 3. API Fonts (Protected Read: Allowed Origins Only With Cache API & Masking Shield) ---
    if (url.pathname.startsWith('/api/fonts/') || url.pathname.startsWith('/api/fonts-preview/')) {
      const origin = request.headers.get('Origin') || '';
      const referer = request.headers.get('Referer') || '';
      const secFetchMode = request.headers.get('Sec-Fetch-Mode') || '';
      const secFetchDest = request.headers.get('Sec-Fetch-Dest') || '';
      const acceptHeader = request.headers.get('Accept') || '';
      const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();

      // 1. DETECT DIRECT BROWSER NAVIGATION (Address Bar, Open in New Tab, DevTools Open)
      const isDirectNavigation = 
        secFetchMode === 'navigate' || 
        secFetchDest === 'document' || 
        secFetchDest === 'iframe' ||
        acceptHeader.includes('text/html') ||
        (!origin && !referer && secFetchMode !== 'cors');

      if (isDirectNavigation) {
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vault</title><meta http-equiv="refresh" content="0;url=/"><script>try{window.close();}catch(e){}window.location.replace("/");</script></head><body></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'private, no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Robots-Tag': 'noindex, nofollow, noarchive'
            }
          }
        );
      }

      // 2. BLOCK EXTERNAL DOWNLOAD MANAGERS & CLIPBOARD CAPTURES (IDM, curl, wget, aria2)
      const isKnownDownloader = 
        userAgent.includes('idm') || 
        userAgent.includes('downloadaction') ||
        userAgent.includes('curl') || 
        userAgent.includes('wget') || 
        userAgent.includes('aria2') ||
        userAgent.includes('postman');

      if (isKnownDownloader) {
        return new Response('Access Denied: Direct font binary downloads are restricted.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
          }
        });
      }

      // 2.1 VERIFY EPHEMERAL HMAC TOKEN (X-FT)
      const fontTokenSecret = env.FONT_TOKEN_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || env.GAS_TOKEN;
      if (!fontTokenSecret) {
        return new Response('Server misconfigured: Token secret missing.', { status: 500 });
      }

      const ftHeader = request.headers.get('X-FT') || '';
      let isTokenValid = false;
      if (ftHeader && ftHeader.includes('.')) {
        const [expStr, sig] = ftHeader.split('.');
        const exp = parseInt(expStr, 10);
        if (exp && sig && (Math.floor(Date.now() / 1000) < exp)) {
          isTokenValid = await verifyHMAC(fontTokenSecret, expStr, sig);
        }
      }

      // STRICT GATE: Must have valid ephemeral token AND valid origin/referer
      if (!isTokenValid || (!origin && !referer)) {
        return new Response('Access Denied: Direct font binary downloads are restricted.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
          }
        });
      }

      // 1. Hotlink security check ALWAYS runs first (even before cache lookup)
      if ((origin && !isAllowedSource(origin)) || (referer && !isAllowedSource(referer))) {
        return new Response('Access Denied: Hotlinking is not permitted.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
          }
        });
      }

      const fontName = decodeURIComponent(url.pathname.split('/').pop());
      // Prevent directory traversal
      if (fontName.includes('/') || fontName.includes('..') || fontName.includes('\\')) {
        return new Response('Access Denied: Invalid font identifier.', { status: 403 });
      }
      const lowerFontName = fontName.toLowerCase();
      const allowedFontExtensions = ['.ttf', '.otf', '.woff2', '.woff'];
      const hasAllowedExtension = allowedFontExtensions.some(ext => lowerFontName.endsWith(ext));
      const isDriveId = !fontName.includes('.') && /^[a-zA-Z0-9_-]{25,45}$/.test(fontName);

      if (!hasAllowedExtension && !isDriveId) {
        return new Response('Access Denied: Only font web preview files are permitted.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
          }
        });
      }

      const allowedOrigin = origin && isAllowedSource(origin) ? origin : '*';

      // --- MASKING CIPHER KEY (Subqi Shield v1) ---
      const FONT_CIPHER_KEY = [0x53, 0x75, 0x62, 0x71, 0x69, 0x46, 0x6F, 0x6E, 0x74, 0x56, 0x61, 0x75, 0x6C, 0x74, 0x32, 0x36];
      const FONT_MASK_LENGTH = 512;

      const maskFontBuffer = (buffer) => {
        const bytes = new Uint8Array(buffer);
        const limit = Math.min(bytes.length, FONT_MASK_LENGTH);
        const keyLen = FONT_CIPHER_KEY.length;
        const masked = new Uint8Array(bytes);
        for (let i = 0; i < limit; i++) {
          masked[i] ^= FONT_CIPHER_KEY[i % keyLen];
        }
        return masked.buffer;
      };

      try {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), { method: 'GET' });
        let cachedResponse = await cache.match(cacheKey);

        // 2. Cache Hit: Return cached binary with dynamic CORS & Vary: Origin
        // Cache-Control for client browser MUST be private no-store so browser disk cache NEVER stores the binary
        if (cachedResponse && cachedResponse.headers.get('X-Font-Protection') === 'subqi-shield-v1') {
          const headers = new Headers(cachedResponse.headers);
          headers.set('Access-Control-Allow-Origin', allowedOrigin);
          headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          headers.set('Access-Control-Expose-Headers', '*');
          headers.set('Vary', 'Origin');
          headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
          headers.set('Pragma', 'no-cache');
          headers.set('Expires', '0');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            headers
          });
        }

        // 3. Cache Miss: Fetch from R2 / Google Drive
        const fileData = await fetchFileBuffer(fontName, env);
        if (!fileData) return new Response(`Font not found`, { status: 404 });

        // Optional internal bypass for raw access via authorized key
        const rawSecret = env.RAW_BYPASS_KEY || env.ADMIN_SECRET || env.GAS_TOKEN;
        const isRawRequested = Boolean(rawSecret && url.searchParams.get('raw') === 'true' && url.searchParams.get('key') === rawSecret);
        
        let processedBody = fileData.body;
        if (!isRawRequested && (lowerFontName.endsWith('.otf') || lowerFontName.endsWith('.ttf'))) {
          const isPreviewRoute = url.pathname.startsWith('/api/fonts-preview/');
          const subsetParam = url.searchParams.get('subset') || (isPreviewRoute ? 'alphanumeric' : null);
          if (subsetParam === 'alphanumeric') {
            processedBody = subsetFontBuffer(processedBody, 'alphanumeric');
          } else if (subsetParam === 'basic') {
            processedBody = subsetFontBuffer(processedBody, 'basic');
          }

          const cleanBase = fontName.replace(/\.[^/.]+$/, "");
          processedBody = stampFontMetadata(processedBody, {
            uniqueId: `1.000;BT;${cleanBase};BT-SPEC-W01`,
            licenseDescription: `Digital Specimen Typeface Software. Build Ref: BT-SPEC-W01. BombasType Foundry.`,
            trademark: `BombasType is a trademark of BombasType Foundry.`,
            vendorUrl: `https://bombastype.com`,
            licenseUrl: `https://bombastype.com/licenses`
          });
        }
        const finalBody = isRawRequested ? processedBody : maskFontBuffer(processedBody);

        // Base headers stored in Cloudflare Worker cache (WITHOUT origin-locked CORS)
        const baseHeaders = new Headers();
        baseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        baseHeaders.set('Access-Control-Expose-Headers', '*');
        baseHeaders.set('Content-Type', isRawRequested ? (fileData.contentType || 'font/otf') : 'application/octet-stream');
        baseHeaders.set('Content-Disposition', 'inline');
        baseHeaders.set('X-Content-Type-Options', 'nosniff');
        baseHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        baseHeaders.set('X-Font-Protection', isRawRequested ? 'none' : 'subqi-shield-v1');
        baseHeaders.set('Cache-Control', 'public, s-maxage=31536000');

        const responseToCache = new Response(finalBody, { headers: baseHeaders });
        ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

        // Response sent to current requester has specific dynamic CORS & client-side no-store
        const responseHeaders = new Headers(baseHeaders);
        responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
        responseHeaders.set('Access-Control-Expose-Headers', '*');
        responseHeaders.set('Vary', 'Origin');
        responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
        responseHeaders.set('Pragma', 'no-cache');
        responseHeaders.set('Expires', '0');

        return new Response(finalBody, { headers: responseHeaders });
      } catch (e) { return new Response('Error fetching font', { status: 500 }); }
    }

    // --- 4. API Images (Public Read With Cache) ---
    if (url.pathname.startsWith('/api/images/')) {
      try {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), { method: 'GET' });
        let response = await cache.match(cacheKey);
        if (response) return response;

        const imageName = decodeURIComponent(url.pathname.split('/').pop());
        const fileData = await fetchFileBuffer(imageName, env);
        if (!fileData) return new Response(`Image not found`, { status: 404 });

        const headers = new Headers();
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
        
        // Tentukan Content-Type: prioritaskan hasil fetch atau fallback ke ekstensi
        let contentType = fileData.contentType || 'image/jpeg';
        const lowerName = imageName.toLowerCase();
        if (lowerName.endsWith('.png')) contentType = 'image/png';
        else if (lowerName.endsWith('.webp')) contentType = 'image/webp';
        else if (lowerName.endsWith('.svg')) contentType = 'image/svg+xml';
        
        headers.set('Content-Type', contentType);
        
        response = new Response(fileData.body, { headers });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (e) { return new Response('Error fetching image', { status: 500 }); }
    }

    // --- 5. API Admin Upload (Proteksi via Tabel fontadmin) ---
    if (url.pathname.startsWith('/api/admin/upload/') && request.method === 'PUT') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        
        // Proteksi: Hanya user yang terdaftar di tabel fontadmin yang bisa upload
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), { status: 403 });
        }

        const fileName = decodeURIComponent(url.pathname.split('/').pop());
        await env.R2_BUCKET.put(fileName, request.body, {
          httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' }
        });

        // FIXED: Gunakan kunci "fileName" agar cocok dengan FontUploadForm.tsx
        return new Response(JSON.stringify({ success: true, fileName: fileName }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
    }

    if (url.pathname.startsWith('/api/admin/delete/') && request.method === 'DELETE') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), { status: 403 });
        }

        const fileName = decodeURIComponent(url.pathname.split('/').pop());
        if (fileName && !/^[a-zA-Z0-9_-]{25,}$/.test(fileName)) {
          await env.R2_BUCKET.delete(fileName);
        }

        return new Response(JSON.stringify({ success: true, deleted: fileName }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
    }

    if (url.pathname === '/api/admin/delete-batch' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), { status: 403 });
        }

        const { fileNames } = await request.json();
        if (Array.isArray(fileNames) && fileNames.length > 0) {
          const deletePromises = fileNames
            .filter(f => f && !/^[a-zA-Z0-9_-]{25,}$/.test(f))
            .map(f => env.R2_BUCKET.delete(f));
          await Promise.all(deletePromises);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
    }


    if (url.pathname.startsWith('/api/admin/drive-search') && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response("UNAUTHORIZED", { status: 403 });
        }

        const q = url.searchParams.get('q') || "";
        const gasUrl = env.GAS_DRIVE_SEARCH_URL; 
        const token = env.GAS_TOKEN || "$uperAm4n"; 

        if (!gasUrl) throw new Error("GAS_URL_NOT_CONFIGURED");

        // Membersihkan q dari spasi berlebih di ujung dan memastikan encoding karakter khusus
        const searchParams = new URLSearchParams();
        searchParams.set('q', q.trim());
        searchParams.set('token', token);

        const finalGasUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}${searchParams.toString()}`;

        const res = await fetch(finalGasUrl);
        const contentType = res.headers.get('content-type') || '';

        // Validasi respon: Jika Google mengirimkan HTML (Error Page), jangan paksa parse JSON
        if (!res.ok || !contentType.includes('application/json')) {
          const rawError = await res.text();
          console.error("GAS_RAW_ERROR:", rawError);
          return new Response(JSON.stringify({ 
            error: "GOOGLE_API_ERROR", 
            detail: rawError.substring(0, 150) 
          }), { 
            status: 502, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) { 
        return new Response(JSON.stringify({ error: e.message, images: [], fonts: [] }), { 
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        }); 
      }
    }

    // --- 5B. API SVG Assets (Proxy & CDN Cache with Shield & Masking for FontCanvas Ornaments) ---
    if (url.pathname.startsWith('/api/svg-assets')) {
      const origin = request.headers.get('Origin') || '';
      const referer = request.headers.get('Referer') || '';
      const secFetchMode = request.headers.get('Sec-Fetch-Mode') || '';
      const secFetchDest = request.headers.get('Sec-Fetch-Dest') || '';
      const acceptHeader = request.headers.get('Accept') || '';

      // Direct navigation prevention (tab bar, new tab, direct navigation)
      const isDirectNavigation = 
        secFetchMode === 'navigate' || 
        secFetchDest === 'document' || 
        secFetchDest === 'iframe' ||
        acceptHeader.includes('text/html') ||
        (!origin && !referer);

      if (isDirectNavigation) {
        return Response.redirect(`${url.origin}/`, 302);
      }

      const isAllowedSource = (val) => {
        if (!val) return false;
        try {
          const parsed = val.startsWith('http://') || val.startsWith('https://')
            ? new URL(val)
            : new URL(`https://${val}`);
          const hostname = parsed.hostname.toLowerCase();
          return (
            hostname === 'bombastype.com' ||
            hostname.endsWith('.bombastype.com') ||
            hostname === 'bombastype.workers.dev' ||
            hostname.endsWith('.bombastype.workers.dev') ||
            hostname === 'subqi.com' ||
            hostname.endsWith('.subqi.com') ||
            hostname === 'subqi.workers.dev' ||
            hostname.endsWith('.subqi.workers.dev') ||
            hostname === 'fontcanvas.pages.dev' ||
            hostname.endsWith('.fontcanvas.pages.dev') ||
            (hostname.endsWith('.workers.dev') && hostname.includes('fontcanvas')) ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1'
          );
        } catch (_) {
          return false;
        }
      };

      if ((origin && !isAllowedSource(origin)) || (referer && !isAllowedSource(referer))) {
        return new Response('Access Denied: Hotlinking is not permitted.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
          }
        });
      }

      const allowedOrigin = origin && isAllowedSource(origin) ? origin : '*';

      // --- MASKING CIPHER KEY (Subqi Shield v1 for SVG & Vector Assets) ---
      const FONT_CIPHER_KEY = [0x53, 0x75, 0x62, 0x71, 0x69, 0x46, 0x6F, 0x6E, 0x74, 0x56, 0x61, 0x75, 0x6C, 0x74, 0x32, 0x36];
      const FONT_MASK_LENGTH = 512;

      const maskBuffer = (buffer) => {
        const bytes = new Uint8Array(buffer);
        const limit = Math.min(bytes.length, FONT_MASK_LENGTH);
        const keyLen = FONT_CIPHER_KEY.length;
        const masked = new Uint8Array(bytes);
        for (let i = 0; i < limit; i++) {
          masked[i] ^= FONT_CIPHER_KEY[i % keyLen];
        }
        return masked.buffer;
      };

      try {
        const gasUrl = env.GAS_SVG_URL;
        const token = env.GAS_TOKEN || "$uperAm4n";
        if (!gasUrl) {
          return new Response(JSON.stringify({ error: "GAS_SVG_URL_NOT_CONFIGURED" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin }
          });
        }

        const action = (url.searchParams.get('action') || 'list').toLowerCase();
        const fileId = url.searchParams.get('id') || '';
        const refresh = url.searchParams.get('refresh') === 'true';
        const limit = parseInt(url.searchParams.get('limit') || '0', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const isRawSvgAction = action === 'get' || url.searchParams.get('raw') === 'true';
        const isRawBypass = url.searchParams.get('raw') === 'true' && url.searchParams.get('key') === '$uperAm4n';
        const cache = caches.default;
        
        // Cache key based on url without 'refresh' and auth params
        const cacheUrl = new URL(url.toString());
        cacheUrl.searchParams.delete('refresh');
        cacheUrl.searchParams.delete('key');
        const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

        if (!refresh) {
          const cached = await cache.match(cacheKey);
          if (cached) {
            if (isRawSvgAction) {
              const cachedBuf = await cached.clone().arrayBuffer();
              const checkBytes = new Uint8Array(cachedBuf.slice(0, 5));
              // If previously cached as raw text (<svg...), mask it on-the-fly
              const isRawSvgText = checkBytes[0] === 0x3C; // '<'
              const bodyToReturn = isRawBypass 
                ? (isRawSvgText ? cachedBuf : maskBuffer(cachedBuf))
                : (isRawSvgText ? maskBuffer(cachedBuf) : cachedBuf);

              const h = new Headers(cached.headers);
              h.set('Access-Control-Allow-Origin', allowedOrigin);
              h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
              h.set('Content-Type', isRawBypass ? 'image/svg+xml; charset=utf-8' : 'application/octet-stream');
              h.set('X-Content-Type-Options', 'nosniff');
              return new Response(bodyToReturn, { status: cached.status, headers: h });
            } else {
              const h = new Headers(cached.headers);
              h.set('Access-Control-Allow-Origin', allowedOrigin);
              return new Response(cached.body, { status: cached.status, headers: h });
            }
          }
        }

        // High-Speed WebP Thumbnail action for secure raster previews
        if (action === 'thumb') {
          if (!fileId) {
            return new Response(JSON.stringify({ error: 'FILE_ID_REQUIRED' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin }
            });
          }

          const gasParams = new URLSearchParams();
          gasParams.set('action', 'thumb');
          gasParams.set('token', token);
          gasParams.set('id', fileId);
          const targetGasUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}${gasParams.toString()}`;

          let gasRes = null;
          let gasBase64 = '';
          for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) await new Promise((r) => setTimeout(r, 400));
            try {
              gasRes = await fetch(targetGasUrl);
              if (gasRes.ok) {
                gasBase64 = (await gasRes.text()).trim();
                if (gasBase64.length > 20) break;
              }
            } catch (_) {}
          }

          if (!gasRes || !gasRes.ok || gasBase64.length < 20) {
            return new Response(JSON.stringify({ error: 'THUMBNAIL_NOT_FOUND', id: fileId }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin }
            });
          }

          // Decode base64 to binary WebP buffer
          const binaryString = atob(gasBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const resHeaders = new Headers();
          resHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
          resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          resHeaders.set('Content-Type', 'image/webp');
          resHeaders.set('X-Content-Type-Options', 'nosniff');
          resHeaders.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400');

          ctx.waitUntil(cache.put(cacheKey, new Response(bytes.buffer, { headers: resHeaders })));
          return new Response(bytes.buffer, { headers: resHeaders });
        }

        // Fast paginated list support from full list cache
        if (action === 'list' && limit > 0) {
          const fullListKey = new Request(`${url.origin}/api/svg-assets?action=list`, { method: 'GET' });
          let fullListRes = !refresh ? await cache.match(fullListKey) : null;
          let allData = null;

          if (fullListRes) {
            try {
              allData = await fullListRes.json();
            } catch (_) {}
          }

          if (!allData || !Array.isArray(allData.items)) {
            const gasParams = new URLSearchParams();
            gasParams.set('action', 'list');
            gasParams.set('token', token);
            const targetGasUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}${gasParams.toString()}`;
            const gasRes = await fetch(targetGasUrl);
            if (gasRes.ok) {
              const fullText = await gasRes.text();
              const fullHeaders = new Headers();
              fullHeaders.set('Content-Type', 'application/json; charset=utf-8');
              fullHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
              fullHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
              ctx.waitUntil(cache.put(fullListKey, new Response(fullText, { headers: fullHeaders })));
              try {
                allData = JSON.parse(fullText);
              } catch (_) {}
            }
          }

          if (allData && Array.isArray(allData.items)) {
            const total = allData.items.length;
            const items = allData.items.slice(offset, offset + limit);
            const resBody = JSON.stringify({
              success: true,
              total,
              limit,
              offset,
              items
            });
            const resHeaders = new Headers();
            resHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
            resHeaders.set('Content-Type', 'application/json; charset=utf-8');
            resHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
            ctx.waitUntil(cache.put(cacheKey, new Response(resBody, { headers: resHeaders })));
            return new Response(resBody, { headers: resHeaders });
          }
        }

        // Fetch from GAS with retry logic
        const gasParams = new URLSearchParams();
        gasParams.set('action', action);
        gasParams.set('token', token);
        if (fileId) gasParams.set('id', fileId);
        if (url.searchParams.get('q')) gasParams.set('q', url.searchParams.get('q'));
        if (url.searchParams.get('raw')) gasParams.set('raw', url.searchParams.get('raw'));

        const targetGasUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}${gasParams.toString()}`;
        
        let gasRes = null;
        let gasBody = '';
        let isRealSvg = false;

        // Try up to 2 times for reliability against transient GAS concurrency throttling
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          try {
            gasRes = await fetch(targetGasUrl);
            if (gasRes.ok) {
              gasBody = await gasRes.text();
              if (isRawSvgAction) {
                isRealSvg = gasBody.includes('<svg') && (gasBody.includes('</svg>') || gasBody.includes('/>'));
                if (isRealSvg) break;
              } else {
                break;
              }
            }
          } catch (_) {}
        }

        if (!gasRes || !gasRes.ok) {
          return new Response(JSON.stringify({ error: 'GAS_REQUEST_FAILED', id: fileId }), {
            status: gasRes ? gasRes.status : 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': allowedOrigin,
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }

        // Strict guard: For SVG actions, NEVER cache or serve HTML errors as image/svg+xml
        if (isRawSvgAction && !isRealSvg) {
          return new Response(JSON.stringify({ error: 'INVALID_SVG_CONTENT', id: fileId }), {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': allowedOrigin,
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }

        const resHeaders = new Headers();
        resHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
        resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        resHeaders.set('X-Content-Type-Options', 'nosniff');
        
        // Cache list for 7 days, verified authentic SVG content for 1 year
        const maxAge = action === 'get' ? 31536000 : 604800;
        resHeaders.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400`);

        let finalBody = gasBody;
        if (isRawSvgAction) {
          const rawBytes = new TextEncoder().encode(gasBody);
          const maskedBuffer = maskBuffer(rawBytes.buffer);
          
          // Store masked buffer in cache
          const cacheHeaders = new Headers(resHeaders);
          cacheHeaders.set('Content-Type', 'application/octet-stream');
          ctx.waitUntil(cache.put(cacheKey, new Response(maskedBuffer, { headers: cacheHeaders })));

          if (isRawBypass) {
            resHeaders.set('Content-Type', 'image/svg+xml; charset=utf-8');
            finalBody = gasBody;
          } else {
            resHeaders.set('Content-Type', 'application/octet-stream');
            finalBody = maskedBuffer;
          }
        } else {
          resHeaders.set('Content-Type', gasRes.headers.get('content-type') || 'application/json');
          ctx.waitUntil(cache.put(cacheKey, new Response(gasBody, { headers: resHeaders })));
        }

        return new Response(finalBody, { headers: resHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin }
        });
      }
    }

    // --- 6. API Checkout & Trial (The Resetter Logic) ---
    if ((url.pathname.startsWith('/api/checkout') || url.pathname.startsWith('/api/claim-trial')) && request.method === 'POST') {
      try {
        const body = await request.json();
        // FIXED: Masukkan tier, usages, amount, fontName, dan fontId agar tidak undefined saat digunakan di mapping
        const { email, name, address, metadata, type, tier, usages, amount, fontName, fontId } = body;
        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        const transactionId = metadata?.order_id || `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // 1. Cari/Update User (Logic Resetter)
        const userCheckRes = await fetch(`${supabaseUrl}/rest/v1/fontbuyer?email=eq.${email}&select=id`, {
          headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
        });
        const userCheckData = await userCheckRes.json();
        let targetUserId;

        if (userCheckData && userCheckData.length > 0) {
          targetUserId = userCheckData[0].id;
          
          // A. Update Profil Fontbuyer
          await fetch(`${supabaseUrl}/rest/v1/fontbuyer?id=eq.${targetUserId}`, {
            method: 'PATCH',
            headers: { 
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
              full_name: name || null, 
              address: address || null 
            })
          });

          // B. Update Password Auth ke Order ID Transaksi Baru
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
            method: 'PUT',
            headers: { 
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ password: transactionId })
          });

        } else {
          // Hanya user BARU yang dibuatkan password otomatis menggunakan Order ID
          const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: transactionId, email_confirm: true })
          });
          const createData = await createRes.json();
          targetUserId = createData.id;

          if (targetUserId) {
            await fetch(`${supabaseUrl}/rest/v1/fontbuyer`, {
              method: 'POST',
              headers: { 
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({ 
                id: targetUserId, 
                email: email, 
                full_name: name || null, 
                address: address || null 
              })
            });
          }
        }

        // 2. Masukkan ke font_history (Sinkronisasi Granular Tier)
        let historyEntries = [];
        const items = metadata?.cart_items || [];

        const checkIds = items.length > 0 
          ? items.map(i => i.id) 
          : [fontId || metadata?.font_id || metadata?.cart_items?.[0]?.id];
        
        if (type === 'trial' || (items.length > 0 && items.some(i => i.price === 0))) {
          const trialCheckRes = await fetch(
            `${supabaseUrl}/rest/v1/font_history?user_id=eq.${targetUserId}&download_type=eq.trial&font_id=in.(${checkIds.filter(id => !!id).join(',')})&select=id`,
            { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
          );
          const trialCheckData = await trialCheckRes.json();
          
          if (trialCheckData && trialCheckData.length > 0) {
            return new Response(JSON.stringify({ error: "TRIAL_ALREADY_CLAIMED" }), { 
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
        }
        
        if (items.length > 0) {
          historyEntries = items.map(item => ({
            user_id: targetUserId,
            font_id: item.id, 
            download_type: item.price === 0 ? 'trial' : 'full',
            transaction_id: transactionId,
            tier: (item.tier || 'SOLO').toUpperCase(), // Menyimpan key: SOLO, SMALL_50K, PERSONAL, dsb.
            usages: item.usages || ['desktop'],
            metadata: { ...item.metadata, price_at_purchase: item.price } 
          }));
        } else {
          // FIXED: Ambil font_id dari body, metadata, atau item pertama di cart agar tidak default ke zeros (penyebab FK Violation)
          const finalFontId = fontId || metadata?.font_id || metadata?.cart_items?.[0]?.id;
          
          if (!finalFontId) {
             throw new Error("REQUIRED_FONT_ID_MISSING");
          }

          historyEntries = [{
            user_id: targetUserId,
            font_id: finalFontId,
            download_type: type === 'trial' ? 'trial' : 'full',
            transaction_id: transactionId,
            tier: (tier || 'SOLO').toUpperCase(),
            usages: usages || (type === 'trial' ? ['trial'] : ['desktop']),
            metadata: { ...metadata, price_at_purchase: amount || 0 }
          }];
        }

        const historyRes = await fetch(`${supabaseUrl}/rest/v1/font_history`, {
          method: 'POST',
          headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(historyEntries)
        });

        if (!historyRes.ok) throw new Error(`DB_INSERT_FAILED: ${await historyRes.text()}`);

        if (type !== 'trial' && items.length > 0) {
          ctx.waitUntil(triggerGasEmail(email, name, transactionId, items, env));
        }

        return new Response(JSON.stringify({ success: true, transactionId, userId: targetUserId }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }


    // --- 6B. API Send Manual Coupon to Buyer (Admin Only) ---
    if (url.pathname === '/api/admin/send-coupon' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), { status: 403 });
        }

        const body = await request.json();
        const { email, name, couponCode, discountText, validUntil, usageLimit } = body;
        if (!email || !couponCode) {
          return new Response(JSON.stringify({ error: "EMAIL_AND_COUPON_REQUIRED" }), { status: 400 });
        }

        const gasUrls = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
        if (gasUrls.length === 0) throw new Error("GAS_URL_NOT_CONFIGURED");

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        let couponTemplateConfig = null;
        if (supabaseUrl && serviceRoleKey) {
          try {
            const sRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.email_template_coupon&select=value`, {
              headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData?.[0]?.value) {
                couponTemplateConfig = typeof sData[0].value === 'string' ? JSON.parse(sData[0].value) : sData[0].value;
              }
            }
          } catch (_) {}
        }

        const renderedHtml = generateCouponEmailHtml({
          buyerEmail: email,
          buyerName: name,
          couponCode,
          discountText: discountText || "VIP Special",
          validUntil: validUntil || "Limited Time",
          usageLimit: usageLimit || "1 Use per Customer",
          templateConfig: couponTemplateConfig,
          baseUrl: "https://bombastype.com"
        });

        const subjectTpl = couponTemplateConfig?.subject || DEFAULT_COUPON_EMAIL_TEMPLATE.subject;
        const finalSubject = subjectTpl
          .replace(/\[DISCOUNT\]/g, discountText || "VIP Special")
          .replace(/\[BUYER_NAME\]/g, name || "Customer")
          .replace(/\[COUPON_CODE\]/g, couponCode);

        const payload = {
          token: "$emogaAm4n_",
          action: "coupon",
          email,
          name: name || "Customer",
          subject: finalSubject,
          htmlBody: renderedHtml,
          sender_name: "BombasType"
        };

        const prioritizedAccounts = await getSmartPrioritizedGasAccounts(gasUrls, email);
        let senderAccount = null;

        for (const acc of prioritizedAccounts) {
          const targetUrl = acc.url;
          try {
            const gasRes = await fetch(targetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              redirect: "follow"
            });
            const resText = await gasRes.text();
            let resJson = null;
            try { resJson = JSON.parse(resText); } catch (_) {}

            const isExplicitFailure = (resJson && (resJson.status === "UNAUTHORIZED" || (resJson.status === "ERROR" && !resText.includes("MailApp")))) ||
                                      resText === "Unauthorized" ||
                                      (resText.startsWith("Error:") && !resText.includes("MailApp"));

            const isSuccess = !isExplicitFailure && (
              (resJson && resJson.status === "SUCCESS") ||
              resText === "SUCCESS" ||
              resText.includes("Coupon Email Sent") ||
              resText.includes("Order Email Sent") ||
              resText.includes("MailApp.getRemainingDailyQuota") ||
              resText.includes("Moved Temporarily") ||
              resText.includes("googleusercontent.com") ||
              gasRes.status === 200 ||
              gasRes.status === 302
            );

            if (isSuccess) {
              senderAccount = resolveGasSender(resJson?.sender, targetUrl);
              break;
            }
          } catch (err) {
            console.error("GAS_SEND_COUPON_FAILED:", err.message);
          }
        }

        if (!senderAccount) throw new Error("FAILED_TO_DISPATCH_VIA_GAS");

        return new Response(JSON.stringify({ success: true, sender: senderAccount }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 6C. API Admin Email Template Settings (Load & Save for Order & Coupon) ---
    if (url.pathname === '/api/admin/email-template') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
        const tType = url.searchParams.get('type') === 'coupon' ? 'coupon' : 'order';
        const settingKey = tType === 'coupon' ? 'email_template_coupon' : 'email_template_order';
        const defaultTpl = tType === 'coupon' ? DEFAULT_COUPON_EMAIL_TEMPLATE : DEFAULT_EMAIL_TEMPLATE;

        if (request.method === 'GET') {
          let currentConfig = null;
          if (supabaseUrl && serviceRoleKey) {
            const sRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.${settingKey}&select=value`, {
              headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData?.[0]?.value) {
                currentConfig = typeof sData[0].value === 'string' ? JSON.parse(sData[0].value) : sData[0].value;
              }
            }
          }
          return new Response(JSON.stringify({
            template: { ...defaultTpl, ...(currentConfig || {}) },
            defaultTemplate: defaultTpl
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        if (request.method === 'POST') {
          const body = await request.json();
          const templateData = body.template || body;
          const targetKey = body.type === 'coupon' || tType === 'coupon' ? 'email_template_coupon' : 'email_template_order';

          const upsertRes = await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
            method: 'POST',
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              key: targetKey,
              value: templateData,
              updated_at: new Date().toISOString()
            })
          });

          if (!upsertRes.ok) throw new Error(await upsertRes.text());

          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 6D. API Admin Send Test Email (Order or Coupon) ---
    if (url.pathname === '/api/admin/send-test-email' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const body = await request.json();
        const targetEmail = body.targetEmail;
        if (!targetEmail) {
          return new Response(JSON.stringify({ error: "TARGET_EMAIL_REQUIRED" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const gasUrls = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
        if (gasUrls.length === 0) throw new Error("GAS_URL_NOT_CONFIGURED");

        const isCoupon = body.templateType === 'coupon';
        let renderedHtml = "";
        let finalSubject = "";
        let action = "order";
        let orderId = "";

        if (isCoupon) {
          action = "coupon";
          const dummyCouponCode = `TESTVIP${Math.floor(10 + Math.random() * 90)}`;
          const dummyDiscount = "30% OFF";
          const templateConfig = body.templateConfig || DEFAULT_COUPON_EMAIL_TEMPLATE;
          renderedHtml = generateCouponEmailHtml({
            buyerEmail: targetEmail,
            buyerName: "Admin Tester",
            couponCode: dummyCouponCode,
            discountText: dummyDiscount,
            validUntil: "December 31, 2026",
            usageLimit: "1 Use only",
            templateConfig,
            baseUrl: "https://bombastype.com"
          });
          const subjectTpl = templateConfig.subject || DEFAULT_COUPON_EMAIL_TEMPLATE.subject;
          finalSubject = `[TEST VOUCHER] ` + subjectTpl
            .replace(/\[DISCOUNT\]/g, dummyDiscount)
            .replace(/\[BUYER_NAME\]/g, "Admin Tester")
            .replace(/\[COUPON_CODE\]/g, dummyCouponCode);
        } else {
          action = "order";
          orderId = `BT-TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const dummyItems = [
            {
              name: "Briswood Vintage Regular (Commercial Test)",
              file: "Briswood-Regular.otf",
              price: 35,
              tier: "SOLO (1 USER ONLY)"
            }
          ];
          const templateConfig = body.templateConfig || DEFAULT_EMAIL_TEMPLATE;
          renderedHtml = generateOrderEmailHtml({
            buyerEmail: targetEmail,
            buyerName: "Admin Tester",
            orderId,
            items: dummyItems,
            templateConfig,
            baseUrl: "https://bombastype.com"
          });
          const subjectTemplate = templateConfig.subject || DEFAULT_EMAIL_TEMPLATE.subject;
          finalSubject = `[TEST EMAIL] ` + subjectTemplate.replace(/\[ORDER_ID\]/g, orderId).replace(/\[BUYER_NAME\]/g, "Admin Tester");
        }

        const payload = {
          token: "$emogaAm4n_",
          action,
          email: targetEmail,
          name: "Admin Tester",
          order_id: orderId,
          subject: finalSubject,
          htmlBody: renderedHtml,
          sender_name: "BombasType"
        };

        const prioritizedAccounts = await getSmartPrioritizedGasAccounts(gasUrls, targetEmail, env);
        let senderAccount = null;

        for (const acc of prioritizedAccounts) {
          const targetUrl = acc.url;
          try {
            const res = await fetch(targetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              redirect: "follow"
            });
            const resText = await res.text();
            let resJson = null;
            try { resJson = JSON.parse(resText); } catch (_) {}

            const isExplicitFailure = (resJson && (resJson.status === "UNAUTHORIZED" || (resJson.status === "ERROR" && !resText.includes("MailApp")))) ||
                                      resText === "Unauthorized" ||
                                      (resText.startsWith("Error:") && !resText.includes("MailApp"));

            const isSuccess = !isExplicitFailure && (
              (resJson && resJson.status === "SUCCESS") ||
              resText === "SUCCESS" ||
              resText.includes("Order Email Sent") ||
              resText.includes("Coupon Email Sent") ||
              resText.includes("MailApp.getRemainingDailyQuota") ||
              resText.includes("Moved Temporarily") ||
              resText.includes("googleusercontent.com") ||
              res.status === 200 ||
              res.status === 302
            );

            if (isSuccess) {
              senderAccount = resolveGasSender(resJson?.sender, targetUrl);
              await decrementGasQuotaCache(senderAccount, env, 1);
              break;
            }
          } catch (e) {
            console.error("Test email send failed for account:", e.message);
          }
        }

        if (!senderAccount) throw new Error("FAILED_TO_SEND_VIA_ALL_GAS_ACCOUNTS");

        return new Response(JSON.stringify({ success: true, sender: senderAccount }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 6E. API Admin Resend Order Email ---
    if (url.pathname === '/api/admin/resend-order-email' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const body = await request.json();
        const orderId = body.orderId;
        if (!orderId) {
          return new Response(JSON.stringify({ error: "ORDER_ID_REQUIRED" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        const hRes = await fetch(
          `${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(orderId)}&select=id,user_id,font_id,download_type,tier,metadata`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        );
        const orderRows = await hRes.json();
        if (!orderRows || orderRows.length === 0) {
          return new Response(JSON.stringify({ error: "ORDER_NOT_FOUND" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const firstRow = orderRows[0];
        const bRes = await fetch(
          `${supabaseUrl}/rest/v1/fontbuyer?id=eq.${firstRow.user_id}&select=email,full_name`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        );
        const buyerRows = await bRes.json();
        const buyer = buyerRows?.[0];
        if (!buyer?.email) throw new Error("BUYER_EMAIL_NOT_FOUND");

        // Fetch font names and files
        const fontIds = orderRows.map(r => r.font_id).filter(Boolean);
        const fRes = await fetch(
          `${supabaseUrl}/rest/v1/fonts?id=in.(${fontIds.join(',')})&select=id,name,font_files,trial_file_url`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        );
        const fontRows = fRes.ok ? await fRes.json() : [];
        const fontMap = {};
        fontRows.forEach(f => { fontMap[f.id] = f; });

        const items = orderRows.map(r => {
          const f = fontMap[r.font_id];
          const files = Array.isArray(f?.font_files) && f.font_files.length > 0 ? f.font_files : [f?.trial_file_url || f?.name];
          return {
            name: f?.name || "Font",
            file: files[0],
            price: r.metadata?.price_at_purchase || 25,
            tier: r.tier || "SOLO"
          };
        });

        const result = await triggerGasEmail(buyer.email, buyer.full_name || "Creator", orderId, items, env);
        if (!result.success) throw new Error(result.error || "GAS_DISPATCH_FAILED");

        return new Response(JSON.stringify({ success: true, sender: result.sender }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 6F. API Admin GAS Status & Remaining Daily Quota (Cached & Zero-Cost Check) ---
    if (url.pathname === '/api/admin/gas-status' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const forceRefresh = url.searchParams.get('refresh') === 'true';
        const gasUrls = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
        const quotaData = await getCachedGasQuota(gasUrls, env, forceRefresh);

        return new Response(JSON.stringify(quotaData), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 6G. API Admin Broadcast Data (Audience, Quota & Campaign State) ---
    if (url.pathname === '/api/admin/broadcast-data' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
        const forceRefresh = url.searchParams.get('refresh') === 'true';

        // 1. Fetch GAS accounts quota via Smart Cache
        const rawGasEntries = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
        const quotaData = await getCachedGasQuota(rawGasEntries, env, forceRefresh);

        const accounts = quotaData.accounts || [];
        const totalRemaining = quotaData.totalRemaining || 0;
        const safetyReserve = quotaData.safetyReserve || 15;
        const allowedToday = quotaData.allowedToday ?? Math.max(0, totalRemaining - safetyReserve);

        // 2. Fetch audience numbers from fontbuyer and fontsubscribers
        let buyers = [];
        let subscribers = [];
        let campaigns = [];

        if (supabaseUrl && serviceRoleKey) {
          const [bRes, sRes, cRes] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/fontbuyer?select=email,full_name`, {
              headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            }),
            fetch(`${supabaseUrl}/rest/v1/fontsubscribers?status=eq.active&select=email`, {
              headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            }),
            fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.broadcast_campaigns&select=value`, {
              headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            })
          ]);

          if (bRes.ok) buyers = await bRes.json();
          if (sRes.ok) subscribers = await sRes.json();
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData?.[0]?.value) {
              campaigns = typeof cData[0].value === 'string' ? JSON.parse(cData[0].value) : cData[0].value;
            }
          }
        }

        const uniqueBuyers = Array.from(new Set((buyers || []).map(b => (b.email || '').trim().toLowerCase()).filter(e => e)));
        const uniqueSubscribers = Array.from(new Set((subscribers || []).map(s => (s.email || '').trim().toLowerCase()).filter(e => e)));
        const allUniqueAudience = Array.from(new Set([...uniqueBuyers, ...uniqueSubscribers]));

        return new Response(JSON.stringify({
          success: true,
          gas: {
            accounts,
            totalRemaining,
            safetyReserve,
            allowedToday
          },
          audience: {
            buyersCount: uniqueBuyers.length,
            subscribersCount: uniqueSubscribers.length,
            totalUniqueCount: allUniqueAudience.length
          },
          campaigns: Array.isArray(campaigns) ? campaigns : []
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 6H. API Admin Broadcast Send (Deduplication, Queue & Load Balancing) ---
    if (url.pathname === '/api/admin/broadcast-send' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const body = await request.json();
        const {
          campaignId,
          campaignTitle,
          audience = 'all',
          recipientEmail,
          recipientName,
          subject,
          preset = 'custom',
          templateData = {},
          maxBatchSize
        } = body;

        if (!campaignId || !subject) {
          return new Response(JSON.stringify({ error: "MISSING_REQUIRED_FIELDS" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        // 1. Fetch Target Audience
        let targetEmails = [];
        if (audience === 'single' && recipientEmail) {
          targetEmails = [recipientEmail.trim().toLowerCase()];
        } else if (supabaseUrl && serviceRoleKey) {
          const promises = [];
          if (audience === 'all' || audience === 'buyers') {
            promises.push(
              fetch(`${supabaseUrl}/rest/v1/fontbuyer?select=email`, {
                headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
              }).then(r => r.ok ? r.json() : [])
            );
          } else {
            promises.push(Promise.resolve([]));
          }

          if (audience === 'all' || audience === 'subscribers') {
            promises.push(
              fetch(`${supabaseUrl}/rest/v1/fontsubscribers?status=eq.active&select=email`, {
                headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
              }).then(r => r.ok ? r.json() : [])
            );
          } else {
            promises.push(Promise.resolve([]));
          }

          const [buyerRows, subRows] = await Promise.all(promises);
          const emailSet = new Set();
          (buyerRows || []).forEach(b => { if (b.email) emailSet.add(b.email.trim().toLowerCase()); });
          (subRows || []).forEach(s => { if (s.email) emailSet.add(s.email.trim().toLowerCase()); });
          targetEmails = Array.from(emailSet);
        }

        // 2. Fetch existing campaigns from site_settings
        let campaigns = [];
        if (supabaseUrl && serviceRoleKey) {
          const cRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.broadcast_campaigns&select=value`, {
            headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData?.[0]?.value) {
              campaigns = typeof cData[0].value === 'string' ? JSON.parse(cData[0].value) : cData[0].value;
            }
          }
        }
        if (!Array.isArray(campaigns)) campaigns = [];

        // Find or create this campaign
        let campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) {
          campaign = {
            id: campaignId,
            title: campaignTitle || subject,
            subject,
            preset,
            audience,
            templateData,
            totalTarget: targetEmails.length,
            sentEmails: [],
            sentLogs: [],
            status: 'in_progress',
            created_at: new Date().toISOString()
          };
          campaigns.unshift(campaign);
        }

        const alreadySentSet = new Set(campaign.sentEmails || []);
        const pendingEmails = targetEmails.filter(e => !alreadySentSet.has(e));

        if (pendingEmails.length === 0) {
          campaign.status = 'completed';
          await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
            method: 'POST',
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ key: 'broadcast_campaigns', value: JSON.stringify(campaigns), updated_at: new Date().toISOString() })
          });

          return new Response(JSON.stringify({
            success: true,
            message: "CAMPAIGN_ALREADY_COMPLETED",
            sentCount: 0,
            remainingCount: 0,
            campaign
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // 3. Query GAS accounts quota (Smart Cache)
        const rawGasEntries = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
        const quotaData = await getCachedGasQuota(rawGasEntries, env, false);
        const accounts = (quotaData.accounts || []).map(a => ({
          email: a.email,
          url: a.url,
          quota: a.remaining ?? 100
        }));

        const totalRemaining = quotaData.totalRemaining ?? accounts.reduce((sum, a) => sum + (a.quota || 0), 0);
        const safetyReserve = quotaData.safetyReserve ?? 15;
        const allowedToday = Math.max(0, totalRemaining - safetyReserve);

        if (allowedToday <= 0) {
          return new Response(JSON.stringify({
            error: "DAILY_QUOTA_REACHED",
            message: "Daily quota limit reached (15 emails reserved for customer orders). Please continue tomorrow.",
            totalRemaining,
            pendingCount: pendingEmails.length
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // Determine how many to send in this batch
        const countToSend = Math.min(pendingEmails.length, allowedToday, maxBatchSize || allowedToday);
        const batchEmails = pendingEmails.slice(0, countToSend);

        // Generate rendered HTML
        const htmlBody = generateBroadcastEmailHtml({
          preset,
          title: templateData.title || subject,
          subtitle: templateData.subtitle || "",
          bodyText: templateData.bodyText || "",
          bannerUrl: templateData.bannerUrl || "",
          buttonText: templateData.buttonText || "",
          buttonUrl: templateData.buttonUrl || "",
          couponCode: templateData.couponCode || "",
          blocks: templateData.blocks || [],
          baseUrl: env.BASE_URL || "https://bombastype.com"
        });

        // 4. Send emails via GAS with round-robin / load-balancing
        const activeAccounts = accounts.filter(a => a.quota > 0);
        const newlySentLogs = [];
        let accountIdx = 0;

        for (const recipient of batchEmails) {
          const currentAcc = activeAccounts[accountIdx % activeAccounts.length];
          accountIdx++;

          const payload = {
            token: "$emogaAm4n_",
            action: "broadcast",
            email: recipient,
            name: recipientName || "Creator",
            subject,
            htmlBody,
            sender_name: "BombasType"
          };

          try {
            const sendRes = await fetch(currentAcc.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              redirect: "follow"
            });
            const sendText = await sendRes.text();
            let isOk = sendRes.ok;
            try {
              const sendJson = JSON.parse(sendText);
              if (sendJson.status === "ERROR") isOk = false;
            } catch (_) {}

            if (isOk) {
              campaign.sentEmails.push(recipient);
              const logEntry = {
                email: recipient,
                gas: currentAcc.email,
                sent_at: new Date().toISOString(),
                status: 'delivered'
              };
              campaign.sentLogs.unshift(logEntry);
              newlySentLogs.push(logEntry);
              // Decrement cached quota per sent email
              await decrementGasQuotaCache(currentAcc.email, env, 1);
            }
          } catch (e) {
            console.error("Failed sending broadcast to:", recipient, e.message);
          }
        }

        if (campaign.sentLogs.length > 500) {
          campaign.sentLogs = campaign.sentLogs.slice(0, 500);
        }

        campaign.totalTarget = targetEmails.length;
        campaign.remainingCount = targetEmails.length - campaign.sentEmails.length;
        campaign.status = campaign.remainingCount <= 0 ? 'completed' : 'in_progress';
        campaign.last_batch_at = new Date().toISOString();

        // 5. Save updated campaigns to site_settings
        await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ key: 'broadcast_campaigns', value: JSON.stringify(campaigns), updated_at: new Date().toISOString() })
        });

        return new Response(JSON.stringify({
          success: true,
          sentInBatch: newlySentLogs.length,
          remainingForCampaign: campaign.remainingCount,
          totalTarget: campaign.totalTarget,
          status: campaign.status,
          campaign
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }


    // --- 6C. API Cloudflare Web Analytics (Admin Only) ---
    if (url.pathname === '/api/admin/analytics' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), { 
            status: 403, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const apiToken = env.CF_API_TOKEN;
        const zoneId = env.CF_ZONE_ID || "d3925ef8973fcf257e187601cfb72373";
        const accountId = env.CF_ACCOUNT_ID || "346e497de742c671b7effa8e76f51832";

        if (!apiToken) {
          return new Response(JSON.stringify({ 
            error: "CF_API_TOKEN_MISSING", 
            message: "Harap set CF_API_TOKEN di Cloudflare Worker secrets atau wrangler.toml" 
          }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const days = parseInt(url.searchParams.get('days') || '7', 10);
        const dateSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateUntil = new Date().toISOString().split('T')[0];

        // Query GraphQL Cloudflare Analytics (Zone + Worker Invocations)
        const datetimeSince = `${dateSince}T00:00:00Z`;

        const graphqlQuery = {
          query: `
            query GetAnalytics($zoneId: String!, $dateSince: String!, $dateUntil: String!, $accountTag: String!, $datetimeSince: String!) {
              viewer {
                zones(filter: { zoneTag: $zoneId }) {
                  httpRequests1dGroups(limit: 30, filter: { date_geq: $dateSince, date_leq: $dateUntil }, orderBy: [date_DESC]) {
                    dimensions {
                      date
                    }
                    sum {
                      requests
                      bytes
                      pageViews
                      countryMap {
                        clientCountryName
                        requests
                      }
                    }
                    uniq {
                      uniques
                    }
                  }
                }
                accounts(filter: { accountTag: $accountTag }) {
                  workersInvocationsAdaptive(limit: 100, filter: { scriptName: "font", datetime_geq: $datetimeSince }) {
                    sum {
                      subrequests
                      requests
                      errors
                    }
                  }
                }
              }
            }
          `,
          variables: {
            zoneId: zoneId,
            accountTag: accountId,
            dateSince: dateSince,
            dateUntil: dateUntil,
            datetimeSince: datetimeSince
          }
        };

        const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(graphqlQuery)
        });

        const cfData = await cfRes.json();
        return new Response(JSON.stringify(cfData), {
          headers: { 
            'Content-Type': 'application/json', 
            'Access-Control-Allow-Origin': '*' 
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    
    // --- 6D. API Admin Font ZIP Download (Inspect Buyer Package without license.txt) ---
    if (url.pathname.startsWith('/api/admin/download-font-zip')) {
      try {
        const authHeader = request.headers.get('Authorization');
        const user = await getSupabaseUser(authHeader, env);
        if (!user || !(await isUserAdmin(user.id, env))) {
          return new Response(JSON.stringify({ error: "ADMIN_ONLY_ACCESS" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const fontId = url.searchParams.get('id');
        if (!fontId) {
          return new Response(JSON.stringify({ error: "FONT_ID_REQUIRED" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        const fontRes = await fetch(
          `${supabaseUrl}/rest/v1/fonts?id=eq.${encodeURIComponent(fontId)}&select=id,name,font_files,trial_file_url`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        );
        const fonts = fontRes.ok ? await fontRes.json() : [];
        const font = fonts[0];
        if (!font) {
          return new Response(JSON.stringify({ error: "FONT_NOT_FOUND" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const fontFilesToFetch = Array.isArray(font.font_files) && font.font_files.length > 0
          ? font.font_files
          : font.trial_file_url
          ? [font.trial_file_url]
          : [];

        if (fontFilesToFetch.length === 0) {
          return new Response(JSON.stringify({ error: "NO_FONT_FILES_IN_FONT" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const zipFiles = await Promise.all(fontFilesToFetch.map(async (fName, index) => {
          const fileData = await fetchFileBuffer(fName, env);
          if (!fileData) return null;

          const isR2File = /^\d{10,}-/.test(fName);
          let finalFileName = "";

          if (isR2File) {
            finalFileName = fName.replace(/^\d+-/, '');
          } else {
            const ext = fileData.contentType?.includes('ttf') ? 'ttf' : 'otf';
            const cleanBase = (font.name || "Font").replace(/\s+/g, '_');
            finalFileName = fontFilesToFetch.length > 1
              ? `${cleanBase}_${index + 1}.${ext}`
              : `${cleanBase}.${ext}`;
          }

          return {
            name: finalFileName,
            content: fileData.body
          };
        }));

        const validFiles = zipFiles.filter(Boolean);
        if (validFiles.length === 0) {
          return new Response(JSON.stringify({ error: "FAILED_TO_FETCH_FONT_FILES" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const zipBuffer = createMultiZip(validFiles);

        const baseName = (font.name || 'Font')
          .replace(/(demo|regular|bold|italic|medium|light|thin|black|extrabold|semibold)/gi, '')
          .trim()
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        const zipName = `BT_${baseName}.zip`;

        return new Response(zipBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${zipName}"`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Disposition'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // --- 7. API Secure ZIP Download (For Buyers) ---
    if (url.pathname.startsWith('/api/download-zip')) {
      const rawFile = url.searchParams.get('file') || ''; // AMBIL PARAM MENTAH
      const transactionId = url.searchParams.get('order'); 
      const injectedType = url.searchParams.get('type') || '';

      try {
        const authHeader = request.headers.get('Authorization');
        
        // FIXED: Ambil email dari parameter untuk verifikasi guest/existing user yang tidak login
        const email = url.searchParams.get('email');
        let isAuthorized = false;
        let buyerEmail = '';

        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        let buyerName = 'N/A';
        let buyerAddress = 'N/A';

        // 1a. VERIFIKASI VIA TOKEN (Untuk User yang sedang Login)
        if (authHeader) {
          const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { 'Authorization': authHeader, 'apikey': supabaseKey }
          });
          const userData = userRes.ok ? await userRes.json() : null;
          if (userData) {
            isAuthorized = true;
            buyerEmail = userData.email;
            
            // Jika ada order ID, ambil data pembeli asli untuk LICENSE.txt & OpenType stamping (agar admin download menghasilkan lisensi & stamp pembeli asli)
            if (transactionId && serviceRoleKey) {
              const hRes = await fetch(
                `${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(transactionId)}&select=user_id`,
                { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
              );
              const hRows = await hRes.json();
              if (hRows?.[0]?.user_id) {
                const bRes = await fetch(
                  `${supabaseUrl}/rest/v1/fontbuyer?id=eq.${hRows[0].user_id}&select=email,full_name,address`,
                  { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
                );
                const bRows = await bRes.json();
                if (bRows?.[0]) {
                  buyerEmail = bRows[0].email || buyerEmail;
                  buyerName = bRows[0].full_name || buyerName;
                  buyerAddress = bRows[0].address || buyerAddress;
                }
              }
            }

            if (buyerName === 'N/A') {
              // Fallback: Ambil data profil user yang login untuk LICENSE.txt (Bypass RLS via Service Role)
              const profRes = await fetch(`${supabaseUrl}/rest/v1/fontbuyer?id=eq.${userData.id}&select=full_name,address`, {
                headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
              });
              const profData = await profRes.json();
              if (profData?.[0]) {
                buyerName = profData[0].full_name || 'N/A';
                buyerAddress = profData[0].address || 'N/A';
              }
            }
          }
        }

        // 1b. FALLBACK: VERIFIKASI VIA EMAIL + ORDER ID (Untuk pembeli lama/guest)
        if (!isAuthorized && email && transactionId && serviceRoleKey) {
          const checkRes = await fetch(
            `${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,user_id,created_at,metadata`,
            { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
          );
          const historyRows = await checkRes.json();
          
          if (historyRows && historyRows.length > 0 && historyRows[0].user_id) {
            const hRow = historyRows[0];
            
            // Proteksi 1: Batas 7 hari untuk direct email link
            const createdDate = hRow.created_at ? new Date(hRow.created_at) : null;
            const isExpired = createdDate && (Date.now() - createdDate.getTime() > 7 * 24 * 60 * 60 * 1000);
            if (isExpired) {
              return new Response(
                JSON.stringify({ 
                  error: "LINK_EXPIRED", 
                  message: "Direct download links expire after 7 days. Please sign in to your User Vault at https://bombastype.com/user/auth for lifetime access." 
                }),
                { status: 410, headers: { 'Content-Type': 'application/json' } }
              );
            }

            // Proteksi 2: Batas 7 kali unduhan untuk direct email link
            const currentMeta = (hRow.metadata && typeof hRow.metadata === 'object') ? hRow.metadata : {};
            const downloadCount = currentMeta.download_count || 0;
            if (downloadCount >= 7) {
              return new Response(
                JSON.stringify({ 
                  error: "DOWNLOAD_LIMIT_REACHED", 
                  message: "Direct download limit reached (7/7). Please sign in to your User Vault at https://bombastype.com/user/auth for permanent access." 
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
              );
            }

            const targetUserId = hRow.user_id;
            const buyerRes = await fetch(
              `${supabaseUrl}/rest/v1/fontbuyer?id=eq.${targetUserId}&select=email,full_name,address`,
              { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
            );
            const buyerRows = await buyerRes.json();
            const record = buyerRows?.[0];
            
            if (record && record.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
              isAuthorized = true;
              buyerEmail = record.email;
              buyerName = record.full_name || 'N/A';
              buyerAddress = record.address || 'N/A';

              // Catat & naikkan counter unduhan secara asynchronous di database
              const updatedMeta = { ...currentMeta, download_count: downloadCount + 1, last_downloaded_at: new Date().toISOString() };
              ctx.waitUntil(
                fetch(`${supabaseUrl}/rest/v1/font_history?id=eq.${hRow.id}`, {
                  method: 'PATCH',
                  headers: {
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ metadata: updatedMeta })
                }).catch(() => {})
              );
            }
          }
        }
// --- END FIX ---

        if (!isAuthorized) return new Response("UNAUTHORIZED_ACCESS", { status: 401 });

        // 2. Ekstrak dan Bersihkan Nama File (AGAR TIDAK REFERENCE ERROR)
        const fontFile = decodeURIComponent(rawFile).split('/').pop();
        const cleanFontName = fontFile.replace(/^\d+-/, ''); 
        // FIXED 1: Pindahkan pengambilan data DB ke sini agar isTrial tidak Reference Error
        let txData = {};
        let fontFilesToFetch = [fontFile];
        try {
          // 1. Identifikasi font_id berdasarkan file yang diminta agar item tidak tertukar
          const fontLookupRes = await fetch(
            `${supabaseUrl}/rest/v1/fonts?or=(font_files.cs.{${fontFile}},trial_file_url.eq.${fontFile})&select=id,name,font_files`,
            { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
          );
          const foundFonts = await fontLookupRes.json();
          const targetFont = foundFonts?.[0];

          if (targetFont) {
            txData.actual_name = targetFont.name;
            // 2. Ambil detail transaksi KHUSUS untuk font_id ini dalam Order ID tersebut
            const txRes = await fetch(
              `${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(transactionId)}&font_id=eq.${targetFont.id}&select=tier,usages,download_type,metadata`,
              { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
            );
            const txRows = txRes.ok ? await txRes.json() : [];
            txData = { ...txData, ...(txRows[0] || {}) };

            const typeStr = (injectedType || txData.download_type || '').toLowerCase();
            const isTrial = typeStr.includes('trial') || typeStr.includes('demo') || fontFile.toLowerCase().includes('trial');

            if (!isTrial && targetFont.font_files?.length > 0) {
              fontFilesToFetch = targetFont.font_files;
            }
          }
        } catch (e) { console.log("DB_LOOKUP_ERROR", e.message); }

        // FIXED 2: Tentukan status trial sebelum membuat zipName
        const typeStr = (injectedType || txData.download_type || '').toLowerCase();
        const isTrial = typeStr.includes('trial') || typeStr.includes('demo') || fontFile.toLowerCase().includes('trial');

        // FIXED 3: Naming ZIP Murni - Pertahankan Huruf Besar/Kecil dari Database
        const rawSource = txData.actual_name || cleanFontName.split('.')[0];
        
        const baseName = rawSource
          .replace(/(demo|regular|bold|italic|medium|light|thin|black|extrabold|semibold)/gi, '')
          .trim()
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        // Hapus .toLowerCase() agar Case Sensitive (Royal_Grande.zip)
        const zipName = `BT_${baseName}${isTrial ? '_Trial' : ''}.zip`;
     

       // 3. MASTER TIER MAPPING (Sinkronisasi Frontend CartCard.tsx)
        const MASTER_TIER_LABELS = {
          desktop: { solo: '1 USER ONLY', team: 'UP TO 30 USER', studio: 'UP TO 100 USER', enterprise: 'UNLIMITED USER' },
          social_web: { small_50k: '50K VIEWS', medium_500k: '500K VIEWS', large_5m: '2M VIEWS', enterprise_unlimited: 'UNLIMITED VIEWS' },
          logo_branding: { personal: 'PERSONAL BRANDING', solo: '1-10 EMPLOYEES', team: '11-50 EMPLOYEES', studio: '51-250 EMPLOYEES', enterprise: '251+ EMPLOYEES' },
          app: { solo: '1 TITLE', team: 'UP TO 10 TITLES', studio: 'UP TO 50 TITLES', enterprise: 'UNLIMITED TITLES' },
          server: { solo: 'SINGLE', studio: 'UP TO 50 SERVERS', enterprise: 'UNLIMITED' },
          broadcast: { solo: 'REGIONAL', studio: 'NATIONAL', enterprise: 'WORLDWIDE' }
        };

        const rawTier = (txData.tier || 'solo').toLowerCase();
        const primaryUsage = isTrial ? 'trial' : (txData.usages?.[0] || 'desktop');
        
        let displayTier = '';
        if (isTrial) {
          displayTier = 'DEMO - PERSONAL USE ONLY';
        } else if (txData.tier === 'CORPORATE') {
          displayTier = 'CORPORATE - UNLIMITED ALL-IN-ONE';
        } else {
          // Ambil label spesifik dari kamus berdasarkan kategori lisensi utama
          const label = MASTER_TIER_LABELS[primaryUsage]?.[rawTier] || rawTier.toUpperCase();
          displayTier = `${rawTier.toUpperCase()} (${label})`;
        }

        const usages = isTrial ? ['trial'] : (txData.usages && txData.usages.length > 0 ? txData.usages : ['desktop']);

        const TEXT_DB = {
          trial: {
            title: "01. PERSONAL USE ONLY (DEMO)",
            grant: "Permitted exclusively for personal, non-commercial use (e.g. educational assignments, portfolio pieces, or non-profit testing).",
            charSet: "The Demo version is a trial asset and contains a limited glyph set.",
            restrictions: "Commercial utilization, business promotion, or revenue-generating activities are strictly prohibited."
          },
          desktop: "DESKTOP / PRINT: Install on workstations to create static visual content (PNG, JPG, PDF) for digital and print media.",
          social_web: "DIGITAL MEDIA (SOCIAL/WEB): Specifically for digital platforms, including website embedding and social media advertising.",
          logo_branding: "LOGO & BRANDING: Utilize the font as a core element of a visual identity system (Logos, Wordmarks).",
          app: "APP / GAME / EBOOK: Embed font software into mobile applications, software, games, or electronic publications.",
          broadcast: "BROADCAST: For motion graphics, television, cinema, streaming, and video advertisements.",
          server: "SERVER: Install on a server to facilitate automated end-user customization (Web-to-Print).",
          corporate: "CORPORATE ALL-IN-ONE: A comprehensive license covering all categories for an entire organization with no limits on seats or impressions."
        };

        // 4. Susun isi LICENSE.txt
        const issueDate = new Date().toLocaleDateString();
        // Provenance watermark verification hash for tracking authenticity
        const watermarkSig = calculateCRC32(new TextEncoder().encode(`${transactionId}-${buyerEmail}-BOMBASTYPE-VAULT`)).toString(16).toUpperCase().padStart(8, '0');
        // Opaque non-reversible Public License Key (Separate from confidential Order ID)
        const licenseKey = `BT-LIC-${calculateCRC32(new TextEncoder().encode(`${transactionId}-${env.FONT_TOKEN_SECRET || 'BOMBASTYPE'}`)).toString(16).toUpperCase().padStart(8, '0')}`;

        let licenseBody = `BOMBASTYPE — OFFICIAL LICENSE CERTIFICATE\n`;
        licenseBody += `========================================================================\n`;
        licenseBody += `ORDER ID       : ${transactionId || 'N/A'} (PRIVATE - KEEP CONFIDENTIAL)\n`;
        licenseBody += `LICENSE KEY    : ${licenseKey} (PUBLIC LICENSE ID IN FONT BINARY)\n`;
        licenseBody += `LICENSE HOLDER : ${buyerEmail}\n`;
        licenseBody += `LICENSEE NAME  : ${buyerName}\n`;
        licenseBody += `ADDRESS        : ${buyerAddress}\n`;
        licenseBody += `ISSUE DATE     : ${issueDate}\n`;
        const displayFontName = txData.actual_name || cleanFontName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        licenseBody += `ASSET NAME     : ${displayFontName}\n`;
        licenseBody += `SECURITY HASH  : BT-SIG-${watermarkSig}\n`;
        licenseBody += `------------------------------------------------------------------------\n\n`;

        licenseBody += `LICENSED USAGE TERMS:\n\n`;
        usages.forEach((u, i) => {
          if (isTrial) {
            licenseBody += `${i + 1}. ${TEXT_DB.trial.title}:\n`;
            licenseBody += `${TEXT_DB.trial.grant}\n\n`;
            licenseBody += `CHARACTER SET: ${TEXT_DB.trial.charSet}\n\n`;
            licenseBody += `RESTRICTIONS: ${TEXT_DB.trial.restrictions}\n\n`;
          } else {
            // FIXED: Masukkan Tier Label (misal: 1 User / Personal) ke dalam baris judul
            const specificLabel = MASTER_TIER_LABELS[u]?.[rawTier] || rawTier.toUpperCase();
            const title = `${u.replace('_', ' & ').toUpperCase()} LICENSE: ( ${specificLabel} )`;
            licenseBody += `${i + 1}. ${title}\n`;
            licenseBody += `${TEXT_DB[u] || TEXT_DB.desktop}\n\n`;
          }
        });


        licenseBody += `GENERAL RULES:\n`;
        licenseBody += `1. This license is non-transferable and belongs strictly to the buyer.\n`;
        licenseBody += `2. You may not sell, rent, sublicense, or redistribute the font files.\n`;
        licenseBody += `3. The font software remains the sole property of Bombastype.\n\n`;

        if (!isTrial) {
          licenseBody += `FONT CANVAS ACCESS (CREATOR PERKS):\n`;
          licenseBody += `Your verified commercial license unlocks VIP access to Font Canvas:\n`;
          licenseBody += `• Portal Link : https://canvas.bombastype.com\n`;
          licenseBody += `• Licensee    : ${buyerEmail}\n`;
          licenseBody += `• Order Ref   : ${transactionId || 'N/A'}\n`;
          licenseBody += `PERKS INCLUDED:\n`;
          licenseBody += `- Instant Unlock : All fonts you purchased are automatically unlocked in Canvas.\n`;
          licenseBody += `- Free Extras    : Enjoy free access to all font extras, ornaments & exclusive dingbats catalog-wide.\n`;
          licenseBody += `- Pro Features   : All creator features unlocked (Export, Save, Import & more).\n\n`;
        }

        licenseBody += `FULL DIGITAL RECEIPT:\nhttps://bombastype.com/user/receipt/${transactionId}\n`;

        const licenseData = new TextEncoder().encode(licenseBody.trim());

        // 5. Gabungkan Font + LICENSE.txt ke dalam ZIP
        const zipFiles = await Promise.all(fontFilesToFetch.map(async (fName, index) => {
          // Gunakan fungsi helper fetchFileBuffer agar bisa ambil dari R2 atau Drive
          const fileData = await fetchFileBuffer(fName, env);
          if (!fileData) return null;
          
          // DETEKSI R2: Harus diawali timestamp (10+ angka) diikuti tanda hubung
          const isR2File = /^\d{10,}-/.test(fName);
          const cleanBase = (txData.actual_name || cleanFontName.replace(/\.[^/.]+$/, '') || "Font").replace(/\s+/g, '_');
          let finalFileName = "";

          if (isR2File) {
            finalFileName = fName.replace(/^\d+-/, '');
          } else {
            // JIKA DRIVE ID: Gunakan nama Typeface asli + Indeks
            // Paksa extension .ttf jika tipe generic untuk mendukung Variable Font di OS
            const ext = fileData.contentType?.includes('ttf') ? 'ttf' : 'otf';
            
            finalFileName = fontFilesToFetch.length > 1 
              ? `${cleanBase}_${index + 1}.${ext}` 
              : `${cleanBase}.${ext}`;
          }

          let finalContent = fileData.body;
          if (finalFileName.endsWith('.otf') || finalFileName.endsWith('.ttf')) {
            finalContent = stampFontMetadata(fileData.body, {
              uniqueId: `1.000;BT;${cleanBase};${licenseKey}`,
              licenseDescription: `Commercial Typeface Software. Build Ref: ${licenseKey}. BombasType Foundry.`,
              trademark: `BombasType is a trademark of BombasType Foundry.`,
              vendorUrl: `https://bombastype.com`,
              licenseUrl: `https://bombastype.com/licenses`
            });
          }

          return { name: finalFileName, content: finalContent };
        }));

        // Gabungkan seluruh font family + LICENSE.txt
        const validFiles = zipFiles.filter(f => f !== null);
        validFiles.push({ name: 'LICENSE.txt', content: licenseData });

        const zipData = createMultiZip(validFiles);

        // Simpan license_key ke font_history.metadata untuk pencarian instan di Admin Orders
        if (transactionId && serviceRoleKey) {
          ctx.waitUntil(
            (async () => {
              try {
                const getRow = await fetch(`${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,metadata`, {
                  headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
                });
                const rows = await getRow.json();
                if (rows?.[0] && (!rows[0].metadata?.license_key || rows[0].metadata?.license_key !== licenseKey)) {
                  const newMeta = { ...(rows[0].metadata || {}), license_key: licenseKey };
                  await fetch(`${supabaseUrl}/rest/v1/font_history?id=eq.${rows[0].id}`, {
                    method: 'PATCH',
                    headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ metadata: newMeta })
                  });
                }
              } catch (_) {}
            })()
          );
        }

        const headers = new Headers();
        headers.set('Content-Type', 'application/zip');
        headers.set('Content-Disposition', `attachment; filename="${zipName}"`);
        // EXPOSE HEADERS: Agar frontend bisa membaca nama file asli
        headers.set('Access-Control-Expose-Headers', 'Content-Disposition');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-License-Owner', buyerEmail);
        headers.set('X-Order-ID', transactionId || 'N/A');
        headers.set('X-License-Status', 'VALID_COMMERCIAL');
        headers.set('Access-Control-Allow-Headers', 'Authorization, apikey, X-Order-ID');
        return new Response(zipData, { headers });
      } catch (e) {
        console.error("DOWNLOAD_ZIP_ERROR:", e);
        return new Response("Download Failed: " + (e?.message || e), { status: 500 });
      }
    }

    // --- 9. API Backdoor Password Reset (Transaction ID as Key) ---
    if (url.pathname === '/api/auth/backdoor-reset' && request.method === 'POST') {
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!checkResetRateLimit(clientIp, 5, 900000)) {
        return new Response(JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Too many reset attempts from this IP. Please try again after 15 minutes." }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      console.log("BACKDOOR_RESET_REQUEST_RECEIVED"); // Tambahkan log di dashboard Cloudflare
      try {
        const { email, transactionId } = await request.json();
        if (!email || !transactionId || typeof email !== 'string' || typeof transactionId !== 'string' || transactionId.length < 6) {
          return new Response(JSON.stringify({ error: "INVALID_PARAMETERS" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY; 

        // CEK 1: Apakah kunci admin ada?
        if (!serviceRoleKey) {
          return new Response(JSON.stringify({ error: "SERVICE_KEY_MISSING" }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        // 1. Cari User ID berdasarkan Email (Case-Insensitive menggunakan ilike)
        const buyerRes = await fetch(
          `${supabaseUrl}/rest/v1/fontbuyer?email=ilike.${encodeURIComponent(email)}&select=id`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        );
        const buyerData = await buyerRes.json();
        const foundUserId = buyerData?.[0]?.id;

        if (!foundUserId) {
          return new Response(JSON.stringify({ error: "INVALID_ORDER_OR_EMAIL" }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // 2. Verifikasi apakah Transaction ID yang diinput ada di sejarah transaksi User tersebut
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/font_history?user_id=eq.${foundUserId}&transaction_id=eq.${encodeURIComponent(transactionId)}&select=user_id`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        );
        const checkData = await checkRes.json();

        if (!checkData || checkData.length === 0) {
          return new Response(JSON.stringify({ error: "TRANSACTION_ID_NOT_FOUND" }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const userId = foundUserId;

        // CEK 3: Update Password via Admin API
        const resetRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 
            'apikey': serviceRoleKey, 
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: transactionId })
        });

        if (resetRes.ok) {
          return new Response(JSON.stringify({ success: true }), { 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }
        
        return new Response(JSON.stringify({ error: "AUTH_ADMIN_API_FAILED" }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) { 
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }); 
      }
    }

    // --- 8. Serve Frontend (SPA Handler With Edge Cache Shield) ---
    try {
      let response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !url.pathname.startsWith('/api/')) {
        const indexUrl = new URL('/index.html', request.url);
        response = await env.ASSETS.fetch(new Request(indexUrl));
      }

      // Layer 2: Edge CDN Cache Shield for HTML documents (Protects Worker CPU from bot crawls)
      // Browser caches for 60s, Cloudflare Edge caches for 1 hour (s-maxage=3600), with background revalidation
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') || url.pathname === '/' || !url.pathname.includes('.')) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
        newHeaders.set('X-Edge-Cache-Shield', 'Active');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      }

      return response;
    } catch (e) { return new Response(`System Error: ${e.message}`, { status: 500 }); }
  },
};