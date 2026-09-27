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
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}

function calculateCRC32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}


async function fetchFileBuffer(fileName, env) {
  // 1. Coba ambil dari R2
  const object = await env.R2_BUCKET.get(fileName);
  if (object) return { body: await object.arrayBuffer(), contentType: object.httpMetadata?.contentType };

  // 2. Jika tidak ada di R2, asumsikan ini adalah Google Drive ID
  // Gunakan Google UserContent CDN (lh3) untuk performa lebih cepat dan bebas batas lonjakan trafik/virus HTML
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
    const contentType = res.headers.get('content-type') || '';
    // Proteksi: Jika Google memberikan HTML (halaman peringatan virus), return null
    // Karena Opentype.js tidak bisa memproses HTML sebagai Font
    if (contentType.includes('text/html')) {
      console.error(`DRIVE_REJECTED_BINARY_FETCH: ${fileName} - Size likely too large`);
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
  return resSender || "bombastype@gmail.com";
}

async function getSmartPrioritizedGasAccounts(gasUrls, recipientEmail) {
  const cleanRecipient = (recipientEmail || "").trim().toLowerCase();

  // 1. Map URLs to account objects
  const accounts = gasUrls.map(url => ({
    url,
    email: resolveGasSender(null, url)
  }));

  // 2. Prevent self-sending: Filter out any account whose sender email matches recipient
  const filtered = accounts.filter(acc => acc.email.toLowerCase() !== cleanRecipient);
  const candidates = filtered.length > 0 ? filtered : accounts;

  // 3. Query remaining daily quotas in parallel (costs 0 emails)
  const withQuotas = await Promise.all(candidates.map(async (acc) => {
    let quota = 100;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const qRes = await fetch(acc.url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      if (qRes.ok) {
        const qJson = await qRes.json();
        if (typeof qJson?.quota === 'number') quota = qJson.quota;
        else if (typeof qJson?.remainingDailyQuota === 'number') quota = qJson.remainingDailyQuota;
      }
    } catch (_) {}
    return { ...acc, quota };
  }));

  // 4. Random shuffle first (for ties), then sort descending by remaining quota
  return withQuotas
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => b.quota - a.quota);
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
  const prioritizedAccounts = await getSmartPrioritizedGasAccounts(gasUrls, buyerEmail);

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


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handling CORS (Preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, X-Order-ID',
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

    // --- 3. API Fonts (Protected Read: Allowed Origins Only With Cache API) ---
    if (url.pathname.startsWith('/api/fonts/')) {
      const origin = request.headers.get('Origin') || '';
      const referer = request.headers.get('Referer') || '';

      const isAllowedSource = (val) => {
        if (!val) return true;
        try {
          const parsed = val.startsWith('http://') || val.startsWith('https://')
            ? new URL(val)
            : new URL(`https://${val}`);
          const hostname = parsed.hostname.toLowerCase();
          return (
            hostname === 'bombastype.com' ||
            hostname.endsWith('.bombastype.com') ||
            hostname === 'subqi.com' ||
            hostname.endsWith('.subqi.com') ||
            hostname === 'fontcanvas.subqi.workers.dev' ||
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
        if (cachedResponse && cachedResponse.headers.get('X-Font-Protection') === 'subqi-shield-v1') {
          const headers = new Headers(cachedResponse.headers);
          headers.set('Access-Control-Allow-Origin', allowedOrigin);
          headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          headers.set('Access-Control-Expose-Headers', '*');
          headers.set('Vary', 'Origin');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            headers
          });
        }

        // 3. Cache Miss: Fetch from R2 / Google Drive
        const fileData = await fetchFileBuffer(fontName, env);
        if (!fileData) return new Response(`Font not found`, { status: 404 });

        // Optional internal bypass for raw access via authorized key
        const isRawRequested = url.searchParams.get('raw') === 'true' && url.searchParams.get('key') === '$uperAm4n';
        const finalBody = isRawRequested ? fileData.body : maskFontBuffer(fileData.body);

        // Base headers stored in Cloudflare Worker cache (WITHOUT origin-locked CORS)
        const baseHeaders = new Headers();
        baseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        baseHeaders.set('Access-Control-Expose-Headers', '*');
        baseHeaders.set('Content-Type', isRawRequested ? (fileData.contentType || 'font/otf') : 'application/octet-stream');
        baseHeaders.set('Content-Disposition', 'inline');
        baseHeaders.set('X-Content-Type-Options', 'nosniff');
        baseHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        baseHeaders.set('X-Font-Protection', isRawRequested ? 'none' : 'subqi-shield-v1');
        baseHeaders.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');

        const responseToCache = new Response(finalBody, { headers: baseHeaders });
        ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

        // Response sent to current requester has specific dynamic CORS
        const responseHeaders = new Headers(baseHeaders);
        responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
        responseHeaders.set('Access-Control-Expose-Headers', '*');
        responseHeaders.set('Vary', 'Origin');

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

    // --- 5B. API SVG Assets (Proxy & CDN Cache for FontCanvas Ornaments) ---
    if (url.pathname.startsWith('/api/svg-assets')) {
      try {
        const gasUrl = env.GAS_SVG_URL;
        const token = env.GAS_TOKEN || "$uperAm4n";
        if (!gasUrl) {
          return new Response(JSON.stringify({ error: "GAS_SVG_URL_NOT_CONFIGURED" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const action = (url.searchParams.get('action') || 'list').toLowerCase();
        const fileId = url.searchParams.get('id') || '';
        const refresh = url.searchParams.get('refresh') === 'true';
        const limit = parseInt(url.searchParams.get('limit') || '0', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const cache = caches.default;
        
        // Cache key based on url without 'refresh'
        const cacheUrl = new URL(url.toString());
        cacheUrl.searchParams.delete('refresh');
        const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

        if (!refresh) {
          const cached = await cache.match(cacheKey);
          if (cached) {
            if (action === 'get' || url.searchParams.get('raw') === 'true') {
              const cachedText = await cached.clone().text();
              const isRealSvg = cachedText.includes('<svg') && (cachedText.includes('</svg>') || cachedText.includes('/>'));
              if (isRealSvg) {
                const h = new Headers(cached.headers);
                h.set('Access-Control-Allow-Origin', '*');
                h.set('Content-Type', 'image/svg+xml; charset=utf-8');
                return new Response(cachedText, { status: cached.status, headers: h });
              }
              // If cached body was poisoned (e.g. Google Drive HTML error), ignore it and re-fetch!
            } else {
              const h = new Headers(cached.headers);
              h.set('Access-Control-Allow-Origin', '*');
              return new Response(cached.body, { status: cached.status, headers: h });
            }
          }
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
              fullHeaders.set('Access-Control-Allow-Origin', '*');
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
            resHeaders.set('Access-Control-Allow-Origin', '*');
            resHeaders.set('Content-Type', 'application/json; charset=utf-8');
            resHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
            ctx.waitUntil(cache.put(cacheKey, new Response(resBody, { headers: resHeaders })));
            return new Response(resBody, { headers: resHeaders });
          }
        }

        // Fetch from GAS with retry logic
        const isRawSvgAction = action === 'get' || url.searchParams.get('raw') === 'true';
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
              'Access-Control-Allow-Origin': '*',
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
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }

        const resHeaders = new Headers();
        resHeaders.set('Access-Control-Allow-Origin', '*');
        resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        if (isRawSvgAction) {
          resHeaders.set('Content-Type', 'image/svg+xml; charset=utf-8');
        } else {
          resHeaders.set('Content-Type', gasRes.headers.get('content-type') || 'application/json');
        }
        resHeaders.set('X-Content-Type-Options', 'nosniff');
        
        // Cache list for 7 days, verified authentic SVG content for 1 year
        const maxAge = action === 'get' ? 31536000 : 604800;
        resHeaders.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400`);

        const responseToCache = new Response(gasBody, { headers: resHeaders });
        ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

        return new Response(gasBody, { headers: resHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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

        const prioritizedAccounts = await getSmartPrioritizedGasAccounts(gasUrls, targetEmail);
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

    // --- 6F. API Admin GAS Status & Remaining Daily Quota (0 quota cost check) ---
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

        const gasUrls = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
        const accounts = await Promise.all(gasUrls.map(async (targetUrl) => {
          const email = resolveGasSender(null, targetUrl);
          let quota = 100;
          let limit = 100;
          let isOnline = false;
          let needsAuth = false;

          try {
            // Check quota via lightweight GET request (costs 0 emails)
            const qRes = await fetch(targetUrl, { method: "GET" });
            if (qRes.ok) {
              const qText = await qRes.text();
              try {
                const qJson = JSON.parse(qText);
                if (qJson?.status === "SUCCESS") {
                  isOnline = true;
                  if (typeof qJson?.quota === 'number') quota = qJson.quota;
                  else if (typeof qJson?.remainingDailyQuota === 'number') quota = qJson.remainingDailyQuota;
                  limit = typeof qJson?.limit === 'number' ? qJson.limit : (quota > 100 ? 1500 : 100);
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
            console.error("GAS quota check error for:", email, e.message);
          }

          let accountStatus = "READY";
          if (isOnline) accountStatus = "ONLINE";
          else if (needsAuth) accountStatus = "NEEDS_AUTH";

          return {
            email,
            url: targetUrl,
            remaining: quota,
            limit: limit,
            status: accountStatus
          };
        }));

        const totalRemaining = accounts.reduce((sum, acc) => sum + (acc.remaining || 0), 0);
        const totalLimit = accounts.reduce((sum, acc) => sum + (acc.limit || 100), 0);

        return new Response(JSON.stringify({
          accounts,
          totalRemaining,
          totalLimit
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
            
            // Ambil data profil untuk LICENSE.txt (Bypass RLS via Service Role)
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

        // 1b. FALLBACK: VERIFIKASI VIA EMAIL + ORDER ID (Untuk pembeli lama/guest)
        if (!isAuthorized && email && transactionId && serviceRoleKey) {
          const checkRes = await fetch(
            `${supabaseUrl}/rest/v1/font_history?transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,user_id`,
            { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
          );
          const historyRows = await checkRes.json();
          
          if (historyRows && historyRows.length > 0 && historyRows[0].user_id) {
            const targetUserId = historyRows[0].user_id;
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
        let licenseBody = `BOMBASTYPE — OFFICIAL LICENSE CERTIFICATE\n`;
        licenseBody += `========================================================================\n`;
        licenseBody += `ORDER ID       : ${transactionId || 'N/A'} (USE AS PASSWORD RESETTER)\n`;
        licenseBody += `LICENSE HOLDER : ${buyerEmail} (USERNAME)\n`;
        licenseBody += `LICENSEE NAME  : ${buyerName}\n`;
        licenseBody += `ADDRESS        : ${buyerAddress}\n`;
        licenseBody += `ISSUE DATE     : ${issueDate}\n`;
        const displayFontName = txData.actual_name || cleanFontName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        licenseBody += `ASSET NAME     : ${displayFontName}\n`;
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
          licenseBody += `FONT CANVAS ACCESS (USER VAULT PERKS):\n`;
          licenseBody += `Your commercial license unlocks VIP access to our Font Canvas design suite:\n`;
          licenseBody += `• Portal Link : https://canvas.bombastype.com\n`;
          licenseBody += `• Username    : ${buyerEmail}\n`;
          licenseBody += `• Order ID    : ${transactionId || 'N/A'} (Use as Password)\n`;
          licenseBody += `PERKS INCLUDED:\n`;
          licenseBody += `- Instant Unlock : All fonts you purchased are automatically unlocked in Canvas.\n`;
          licenseBody += `- Free Extras    : Enjoy free access to all font extras, ornaments & exclusive dingbats catalog-wide.\n`;
          licenseBody += `- Pro Features   : All creator features unlocked (Export, Save, Import & more).\n\n`;
        }

        licenseBody += `FULL DIGITAL RECEIPT:\nhttps://font.bombastype.workers.dev/user/receipt/${transactionId} *LOGIN FIRST TO ACCESS*\n`;

        const licenseData = new TextEncoder().encode(licenseBody.trim());

        // 5. Gabungkan Font + LICENSE.txt ke dalam ZIP
        const zipFiles = await Promise.all(fontFilesToFetch.map(async (fName, index) => {
          // Gunakan fungsi helper fetchFileBuffer agar bisa ambil dari R2 atau Drive
          const fileData = await fetchFileBuffer(fName, env);
          if (!fileData) return null;
          
          // DETEKSI R2: Harus diawali timestamp (10+ angka) diikuti tanda hubung
          const isR2File = /^\d{10,}-/.test(fName);
          let finalFileName = "";

          if (isR2File) {
            finalFileName = fName.replace(/^\d+-/, '');
          } else {
            // JIKA DRIVE ID: Gunakan nama Typeface asli + Indeks
            // Paksa extension .ttf jika tipe generic untuk mendukung Variable Font di OS
            const ext = fileData.contentType?.includes('ttf') ? 'ttf' : 'otf';
            const cleanBase = (txData.actual_name || "Font").replace(/\s+/g, '_');
            
            finalFileName = fontFilesToFetch.length > 1 
              ? `${cleanBase}_${index + 1}.${ext}` 
              : `${cleanBase}.${ext}`;
          }

          return { name: finalFileName, content: fileData.body };
        }));

        // Gabungkan seluruh font family + LICENSE.txt
        const validFiles = zipFiles.filter(f => f !== null);
        validFiles.push({ name: 'LICENSE.txt', content: licenseData });

        const zipData = createMultiZip(validFiles);

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
      } catch (e) { return new Response("Download Failed", { status: 500 }); }
    }

   // --- 9. API Backdoor Password Reset (Transaction ID as Key) ---
    if (url.pathname === '/api/auth/backdoor-reset' && request.method === 'POST') {
      console.log("BACKDOOR_RESET_REQUEST_RECEIVED"); // Tambahkan log di dashboard Cloudflare
      try {
        const { email, transactionId } = await request.json();
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

    // --- 8. Serve Frontend (SPA Handler) ---
    try {
      let response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !url.pathname.startsWith('/api/')) {
        const indexUrl = new URL('/index.html', request.url);
        return await env.ASSETS.fetch(new Request(indexUrl));
      }
      return response;
    } catch (e) { return new Response(`System Error: ${e.message}`, { status: 500 }); }
  },
};