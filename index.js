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
  // Tambahkan confirm=t untuk meminimalkan hambatan pada file yang lebih besar
  const driveUrl = `https://drive.google.com/uc?export=download&id=${fileName}&confirm=t`;
  const res = await fetch(driveUrl);
  
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
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/fontadmin?id=eq.${userId}&select=id`,
      { 
        headers: { 
          'apikey': env.VITE_SUPABASE_ANON_KEY, 
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
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

async function triggerGasEmail(buyerEmail, buyerName, orderId, items, env) {
  const gasUrls = (env.GAS_WEBAPP_URL || "").split(',').map(u => u.trim()).filter(u => u);
  if (gasUrls.length === 0) return;

  const hasPaidItem = items.some(item => item.price > 0);
  
  // Jika hanya berisi trial font (total $0), batalkan seluruh proses pengiriman email
  if (!hasPaidItem) return; 

  // Jika ada item berbayar, kirimkan semua item (Paid + Trial) dengan label berbeda
  const fontAssets = items.map(item => {
    const isTrial = item.price === 0;
    return {
      name: isTrial ? `${item.name} (Trial Version)` : item.name,
      file: isTrial ? (item.trialFileUrl || item.name) : (item.font_files?.[0] || item.name),
      type: isTrial ? 'trial' : 'full' // Menyertakan tipe untuk dikonsumsi GAS
    };
  });

  const payload = {
    token: "$emogaAm4n_", 
    email: buyerEmail,
    name: buyerName,
    orderId: orderId,
    font_assets: fontAssets
  };

  // SELANG-SELING: Acak urutan akun agar distribusi beban merata (Load Balancing)
  const rotatedUrls = gasUrls.sort(() => Math.random() - 0.5);

  // FAILOVER: Coba satu per satu akun sampai ada yang berhasil mengirim (SUCCESS)
  for (const url of rotatedUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const statusText = await res.text();
      if (statusText === "SUCCESS") {
        console.log(`GAS_DELIVERY_SUCCESS: Account ${url.substring(0, 45)}...`);
        return; // Berhenti jika salah satu akun sukses mengirim
      }
      console.warn(`GAS_LIMIT_REACHED: Account ${url.substring(0, 45)}... returned ${statusText}`);
    } catch (e) {
      console.error(`GAS_FETCH_FAILED: ${e.message}`);
    }
  }
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

    // --- 3. API Fonts (Public Read) ---
    if (url.pathname.startsWith('/api/fonts/')) {
      const fontName = decodeURIComponent(url.pathname.split('/').pop());
      try {
        const fileData = await fetchFileBuffer(fontName, env);
        if (!fileData) return new Response(`Font not found`, { status: 404 });

        const headers = new Headers();
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Content-Type', fileData.contentType || 'font/otf');
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate'); 
        
        return new Response(fileData.body, { headers });
      } catch (e) { return new Response('Error fetching font', { status: 500 }); }
    }

    // --- 4. API Images (Public Read With Cache) ---
    if (url.pathname.startsWith('/api/images/')) {
      try {
        const cache = caches.default;
        let response = await cache.match(request);
        if (response) return response;
        const imageName = decodeURIComponent(url.pathname.split('/').pop());
        const fileData = await fetchFileBuffer(imageName, env);
        if (!fileData) return new Response(`Image not found`, { status: 404 });

        const headers = new Headers();
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
        
        // Tentukan Content-Type: prioritaskan hasil fetch atau fallback ke ekstensi
        let contentType = fileData.contentType || 'image/jpeg';
        const lowerName = imageName.toLowerCase();
        if (lowerName.endsWith('.png')) contentType = 'image/png';
        else if (lowerName.endsWith('.webp')) contentType = 'image/webp';
        else if (lowerName.endsWith('.svg')) contentType = 'image/svg+xml';
        
        headers.set('Content-Type', contentType);
        
        response = new Response(fileData.body, { headers });
        ctx.waitUntil(cache.put(request, response.clone()));
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