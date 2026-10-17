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

const bEnv = parseEnv('s:/Git/bombastype/.env');
const sEnv = parseEnv('s:/Git/subqifont/.env');

const bombastypeItems = [
  // CANVAS (9 CARDS)
  {
    category: 'canvas',
    section_id: 'CV01',
    title: 'Victorian Ribbon & Envelope Warps',
    content: 'Bend type along ornamental arcs, heraldic flags, circular seals, and asymmetric ribbon banners. Interactive 4-point Bézier cages maintain exact stroke contrast without distorting font proportions.',
    page_path: '/canvas',
    sort_order: 0,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV02',
    title: 'Chromatic Layer Coupling',
    content: 'Seamlessly orchestrate complex multi-layer chromatic families (Base, Inset, Shadow, Engraved, Outline). Linked family IDs lock vertical bounding metrics and alternate glyph selections together in real time.',
    page_path: '/canvas',
    sort_order: 1,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV03',
    title: 'Curved Path & Engraving Engine',
    content: 'Attach lettering to arbitrary curved vectors or hand-drawn shapes with the built-in Pen tool. Drag text along the perimeter track with CorelDraw-style precision and live baseline control.',
    page_path: '/canvas',
    sort_order: 2,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV04',
    title: 'Ornate Glyphs & Swash Alternates',
    content: 'Click any glyph directly on the artboard to preview and apply historical swashes, stylistic alternates, and decorative titling capitals with zero guesswork.',
    page_path: '/canvas',
    sort_order: 3,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV05',
    title: 'iPad & Tablet Multi-Touch',
    content: '<p class="mb-2">Designed for studio tablets. Fluid two-finger pinch zoom, natural one-finger canvas panning, and tap-and-hold marquee multi-selection for fast object manipulation.</p><p class="text-xs leading-relaxed font-medium bg-vintage-ink/5 p-2 border-l border-vintage-accent">Desktop Recommended: While touch devices are supported, working on a desktop workstation with a larger screen and mouse precision provides the most optimal lettering experience.</p>',
    page_path: '/canvas',
    sort_order: 4,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV06',
    title: 'Vector Outlines for Print & Foil',
    content: 'Export warped typography as expanded, production-ready SVG path outlines. Compatible with Adobe Illustrator, CorelDraw, laser engravers, and letterpress die-cutters.',
    page_path: '/canvas',
    sort_order: 5,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV07',
    title: 'Complimentary Lettering & Crucial Pro Workflows',
    content: '<p class="mb-3">FontCanvas Studio is free for designers and typographers to prototype custom lettering, test chromatic layer stacking, and compose layouts directly in your browser.</p><p>To unlock crucial production capabilities—including clean unwatermarked vector SVG & high-res PNG exports, chromatic layer stacking, and full access to all accompanying ornament fonts and SVG assets—simply purchase at least one paid font from our collection. Please note that FontCanvas specifically unlocks and loads your purchased fonts.</p>',
    page_path: '/canvas',
    sort_order: 6,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV08',
    title: 'Direct Store Exclusive Facility',
    content: '<p><strong>Please note:</strong> FontCanvas VIP access, full font family unlocking, and creator perks are exclusively reserved for orders placed directly on <strong>bombastype.com</strong>. We sincerely apologize, but purchases made through third-party marketplaces (such as Creative Market, Envato, MyFonts, etc.) are not eligible for this facility, as it is an exclusive benefit created solely for our direct website patrons.</p>',
    page_path: '/canvas',
    sort_order: 7,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV09',
    title: 'Continuous Development & In-Browser Simplicity',
    content: '<p><strong>* Continuous Development & In-Browser Simplicity:</strong> We actively maintain and update FontCanvas regularly to resolve critical bugs and introduce refined tools. FontCanvas is intentionally engineered to stay clean, fast, and focused on essential typographic design workflows—allowing our buyers to compose, customize, and export production-ready vector artwork directly in-browser without requiring complex 3rd-party graphic software.</p>',
    page_path: '/canvas',
    sort_order: 8,
    type: 'page'
  },

  // CONTACT (2 CARDS)
  {
    category: 'contact',
    section_id: 'CT01',
    title: 'Direct Dispatch Protocol',
    content: '<p class="italic mb-4">To bypass strict corporate spam filters and keep studio correspondence streamlined, all communications are managed directly via our dedicated Gmail inbox.</p><p class="mb-4">If you prefer not using the contact form below, you can send an inquiry directly to:</p><p class="font-bold text-xl"><a href="mailto:bombastype@gmail.com" class="underline">bombastype@gmail.com</a></p>',
    page_path: '/contact',
    sort_order: 0,
    type: 'page'
  },
  {
    category: 'contact',
    section_id: 'CT02',
    title: 'Quick Resources',
    content: '<p class="mb-4">Before sending a message, you might find an instant answer in our licensing resources.</p><p class="mb-4"><a href="/faq" class="font-bold underline">License FAQ &rarr;</a></p><p class="text-xs uppercase tracking-widest opacity-60">Typical response time: Within 24-48 hours.</p>',
    page_path: '/contact',
    sort_order: 1,
    type: 'page'
  },

  // AFFILIATE (4 CARDS)
  {
    category: 'affiliate',
    section_id: 'AF01',
    title: 'Vanity Link & Promo Coupon',
    content: 'Receive a clean vanity URL (<code class="font-mono font-bold text-xs bg-vintage-ink/10 px-1.5 py-0.5">bombastype.com/c/NAME</code>) plus an auto-generated 10% OFF discount coupon for your followers.',
    page_path: '/affiliate',
    sort_order: 0,
    type: 'page'
  },
  {
    category: 'affiliate',
    section_id: 'AF02',
    title: 'Share With Designers',
    content: 'Share in your specimens, client presentations, or social channels. Visitors are attributed via 30-day server cookies or upon coupon redemption.',
    page_path: '/affiliate',
    sort_order: 1,
    type: 'page'
  },
  {
    category: 'affiliate',
    section_id: 'AF03',
    title: 'Monthly PayPal Payout',
    content: 'Earn 20% on every license sold. After a 14-day warranty holding period, earnings are paid automatically via PayPal once balance reaches $50.',
    page_path: '/affiliate',
    sort_order: 2,
    type: 'page'
  },
  {
    category: 'affiliate',
    section_id: 'AF04',
    title: 'Associate Terms & Clearances',
    content: '<p>Join our curated network of font partners. Instant approval with your verified buyer account. 20% net commission on all direct typeface sales. 14-day clearance hold on all transactions to account for fraud prevention. Minimum payout threshold is $50 via PayPal.</p>',
    page_path: '/affiliate',
    sort_order: 3,
    type: 'page'
  }
];

const subqiItems = [
  // CANVAS (9 CARDS)
  {
    category: 'canvas',
    section_id: 'CV01',
    title: 'Bezier Envelope Warping',
    content: 'Warp and deform live fonts into custom shapes, arches, waves, banners, and asymmetric envelopes with real-time 4-point Bézier cages and interactive tangent handles.',
    page_path: '/canvas',
    sort_order: 0,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV02',
    title: 'Linked Layered System',
    content: 'Work with chromatic and layered font families seamlessly. Linked layers synchronize font metrics, alternate glyph replacements, and transformations without vertical shifts or misalignment.',
    page_path: '/canvas',
    sort_order: 1,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV03',
    title: 'Text On Path & Vector Pen',
    content: 'Attach typography to arbitrary Bézier paths or shapes. Drag text interactively along curved perimeters with smooth baseline alignment, or draw custom vector paths directly on the artboard.',
    page_path: '/canvas',
    sort_order: 2,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV04',
    title: 'Alternate Glyph Access',
    content: 'Click any character on canvas to reveal and apply contextual alternates, swashes, stylistic sets, and discretionary ligatures without digging through complex OpenType menus.',
    page_path: '/canvas',
    sort_order: 3,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV05',
    title: 'Touch & iPad Gestures',
    content: '<p class="mb-2">Full multi-touch interaction support for iPad and tablet browsers. Smooth 2-finger pinch zoom, fluid single-finger canvas panning, and tap-and-hold marquee multi-selection.</p><p class="text-[11px] leading-relaxed font-medium bg-black/5 p-2 border-l border-black">Desktop Recommended: While touch devices are supported, using a desktop computer with a larger screen and mouse/trackpad precision is strongly recommended for the most optimal design workflow.</p>',
    page_path: '/canvas',
    sort_order: 4,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV06',
    title: 'Vector SVG & PNG Export',
    content: 'Export your typographic layouts, outlines, and warped wordmarks as production-ready clean SVGs or high-resolution PNGs ready for Illustrator, Figma, or print production.',
    page_path: '/canvas',
    sort_order: 5,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV07',
    title: 'Free In-Browser Access & Crucial Pro Workflows',
    content: '<p class="mb-3">FontCanvas Studio is free for anyone to use and experiment without restriction. Designers and typographers can freely draft custom lettering layouts, explore stylistic alternates, test warping envelopes, and preview typography directly in their browser.</p><p>To unlock crucial production capabilities—including clean unwatermarked vector SVG & high-res PNG exports, chromatic layer stacking, and full access to all accompanying ornament fonts and SVG assets—simply purchase at least one paid font from our collection. Please note that FontCanvas specifically unlocks and loads your purchased fonts.</p>',
    page_path: '/canvas',
    sort_order: 6,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV08',
    title: 'Direct Store Exclusive Facility',
    content: '<p><strong>Please note:</strong> FontCanvas VIP access, full font family unlocking, and creator perks are exclusively reserved for orders placed directly on <strong>subqi.com</strong>. We sincerely apologize, but purchases made through third-party marketplaces (such as Creative Market, Envato, MyFonts, etc.) are not eligible for this facility, as it is an exclusive benefit created solely for our direct website patrons.</p>',
    page_path: '/canvas',
    sort_order: 7,
    type: 'page'
  },
  {
    category: 'canvas',
    section_id: 'CV09',
    title: 'Continuous Development & In-Browser Simplicity',
    content: '<p><strong>* Continuous Development & In-Browser Simplicity:</strong> We actively maintain and update FontCanvas regularly to resolve critical bugs and introduce refined tools. FontCanvas is intentionally engineered to stay clean, fast, and focused on essential typographic design workflows—allowing our buyers to compose, customize, and export production-ready vector artwork directly in-browser without requiring complex 3rd-party graphic software.</p>',
    page_path: '/canvas',
    sort_order: 8,
    type: 'page'
  },

  // CONTACT (2 CARDS)
  {
    category: 'contact',
    section_id: 'CT01',
    title: 'Direct Dispatch Protocol',
    content: '<p class="italic mb-4">To bypass strict corporate spam filters and keep studio correspondence streamlined, all communications are managed directly via our dedicated Gmail inbox.</p><p class="mb-4">If you prefer not using the contact form below, you can send an inquiry directly to:</p><p class="font-bold text-xl"><a href="mailto:subqistudio@gmail.com" class="underline">subqistudio@gmail.com</a></p>',
    page_path: '/contact',
    sort_order: 0,
    type: 'page'
  },
  {
    category: 'contact',
    section_id: 'CT02',
    title: 'Quick Resources',
    content: '<p class="mb-4">Before sending a message, you might find an instant answer in our licensing resources.</p><p class="mb-4"><a href="/faq" class="font-bold underline">License FAQ &rarr;</a></p><p class="text-xs uppercase tracking-widest opacity-60">Typical response time: Within 24-48 hours.</p>',
    page_path: '/contact',
    sort_order: 1,
    type: 'page'
  },

  // AFFILIATE (4 CARDS)
  {
    category: 'affiliate',
    section_id: 'AF01',
    title: 'Vanity Link & Promo Coupon',
    content: 'Receive a clean vanity URL (<code class="font-mono font-bold text-xs bg-black/10 px-1.5 py-0.5">subqi.com/c/NAME</code>) plus an auto-generated 10% OFF discount coupon for your followers.',
    page_path: '/affiliate',
    sort_order: 0,
    type: 'page'
  },
  {
    category: 'affiliate',
    section_id: 'AF02',
    title: 'Share With Designers',
    content: 'Share in your specimens, client presentations, or social channels. Visitors are attributed via 30-day server cookies or upon coupon redemption.',
    page_path: '/affiliate',
    sort_order: 1,
    type: 'page'
  },
  {
    category: 'affiliate',
    section_id: 'AF03',
    title: 'Monthly PayPal Payout',
    content: 'Earn 20% on every license sold. After a 14-day warranty holding period, earnings are paid automatically via PayPal once balance reaches $50.',
    page_path: '/affiliate',
    sort_order: 2,
    type: 'page'
  },
  {
    category: 'affiliate',
    section_id: 'AF04',
    title: 'Partner Terms & Clearances',
    content: '<p>Join our curated network of font partners. Instant approval with your verified buyer account. 20% net commission on all direct typeface sales. 14-day clearance hold on all transactions to account for fraud prevention. Minimum payout threshold is $50 via PayPal.</p>',
    page_path: '/affiliate',
    sort_order: 3,
    type: 'page'
  }
];

async function seed(name, url, key, items) {
  const cleanUrl = url.replace(/['"]/g, '');
  const cleanKey = key.replace(/['"]/g, '');

  // Delete existing items for canvas, contact, affiliate to avoid duplicates
  for (const cat of ['canvas', 'contact', 'affiliate']) {
    await fetch(`${cleanUrl}/rest/v1/site_content?category=eq.${cat}`, {
      method: 'DELETE',
      headers: { 'apikey': cleanKey, 'Authorization': 'Bearer ' + cleanKey }
    });
  }

  // Insert fresh items
  const res = await fetch(`${cleanUrl}/rest/v1/site_content`, {
    method: 'POST',
    headers: {
      'apikey': cleanKey,
      'Authorization': 'Bearer ' + cleanKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(items)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Error inserting items into ${name}:`, err);
  } else {
    const data = await res.json();
    console.log(`Successfully seeded ${data.length} items into ${name} (canvas: 9, contact: 2, affiliate: 4)`);
  }
}

async function run() {
  await seed('Bombastype', bEnv.VITE_SUPABASE_URL, bEnv.SUPABASE_SERVICE_ROLE_KEY, bombastypeItems);
  await seed('Subqi', sEnv.VITE_SUPABASE_URL, sEnv.SUPABASE_SERVICE_ROLE_KEY, subqiItems);
}

run();
