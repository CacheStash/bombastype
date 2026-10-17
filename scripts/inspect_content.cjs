const fs = require('fs');

function parseEnv(path) {
  const content = fs.readFileSync(path, 'utf8');
  const res = {};
  content.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const k = line.slice(0, idx).trim();
      let v = line.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      res[k] = v;
    }
  });
  return res;
}

const sEnv = parseEnv('s:/Git/subqifont/.env');

async function inspectSubqi() {
  const url = sEnv.VITE_SUPABASE_URL.replace(/['"]/g, '');
  const key = sEnv.SUPABASE_SERVICE_ROLE_KEY.replace(/['"]/g, '');

  // Delete about if exists
  await fetch(url + '/rest/v1/site_content?category=eq.about', {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });

  const res = await fetch(url + '/rest/v1/site_content?category=not.is.null&order=category,sort_order', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const data = await res.json();
  console.log(`Found ${data.length} categorized items in Subqi:`);
  data.forEach(item => {
    console.log(`[${item.category}] [${item.section_id}] ${item.title} (type: ${item.type})`);
  });
}

inspectSubqi();
