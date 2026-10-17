-- =================================================================
-- SITE_CONTENT SEED SCRIPT: CANVAS, CONTACT, AFFILIATE
-- BOMBASTYPE & SUBQI (Zero-Paid-SaaS Architecture)
-- =================================================================

-- 1. CANVAS (/canvas)
INSERT INTO public.site_content (category, page_path, section_id, sort_order, title, type, content, updated_at)
VALUES 
(
  'canvas', 
  '/canvas', 
  'CV01', 
  0, 
  'Victorian Ribbon & Envelope Warps', 
  'page', 
  '<p>Bend type along ornamental arcs, heraldic flags, circular seals, and asymmetric ribbon banners. Interactive 4-point Bézier cages maintain exact stroke contrast without distorting font proportions.</p>',
  NOW()
),
(
  'canvas', 
  '/canvas', 
  'CV02', 
  1, 
  'Chromatic Layer Coupling', 
  'page', 
  '<p>Seamlessly orchestrate complex multi-layer chromatic families (Base, Inset, Shadow, Engraved, Outline). Linked family IDs lock vertical bounding metrics and alternate glyph selections together in real time.</p>',
  NOW()
),
(
  'canvas', 
  '/canvas', 
  'CV03', 
  2, 
  'Curved Path & Engraving Engine', 
  'page', 
  '<p>Attach lettering to arbitrary curved vectors or hand-drawn shapes with the built-in Pen tool. Drag text along the perimeter track with live baseline control and precision sliding.</p>',
  NOW()
),
(
  'canvas', 
  '/canvas', 
  'CV04', 
  3, 
  'Ornate Glyphs & Swash Alternates', 
  'page', 
  '<p>Click any glyph directly on the artboard to preview and apply historical swashes, stylistic alternates, and decorative titling capitals with zero guesswork.</p>',
  NOW()
),
(
  'canvas', 
  '/canvas', 
  'CV05', 
  4, 
  'FontCanvas Studio Engine Specifications', 
  'table', 
  '{
  "headers": [
    "CAPABILITY",
    "SPECIFICATION",
    "EXPORT FIDELITY"
  ],
  "rows": [
    [
      "Bézier Envelope",
      "4-Point Interactive Cage",
      "Mathematical Vector"
    ],
    [
      "Chromatic Families",
      "Coupled Layer Stacks",
      "Multi-Layer SVG"
    ],
    [
      "Vector Export",
      "Clean Bezier Geometry",
      "Production EPS / SVG"
    ],
    [
      "Glyph Coverage",
      "Full Character Map & Swashes",
      "Lossless Unsubsetted"
    ]
  ]
}',
  NOW()
),

-- 2. CONTACT (/contact)
(
  'contact', 
  '/contact', 
  'CT00', 
  0, 
  'Direct Dispatch Protocol', 
  'page', 
  '<p class="italic">To bypass strict corporate spam filters and keep studio correspondence streamlined, all communications are managed directly via our dedicated Gmail inbox.</p><p>If you prefer not using the contact form, send inquiries directly to: <b>bombastype@gmail.com</b></p>',
  NOW()
),
(
  'contact', 
  '/contact', 
  'CT01', 
  1, 
  'Licensing & Commission Consultation', 
  'page', 
  '<p>We welcome direct discussions for custom display fonts, enterprise corporate licenses, exclusive modifications, and student discounts. Typical response turnaround is within 24 to 48 hours.</p>',
  NOW()
),

-- 3. AFFILIATE (/affiliate)
(
  'affiliate', 
  '/affiliate', 
  'AF01', 
  0, 
  'Associate Program Overview & Terms', 
  'auto', 
  '<p>Partner with BombasType. Share artisanal display typefaces with designers, studios, and agencies. Receive automatic payouts directly to your PayPal account every month.</p>

{
  "headers": [
    "COMMISSION SPLIT",
    "HOLD PERIOD",
    "MINIMUM PAYOUT",
    "ATTRIBUTION"
  ],
  "rows": [
    [
      "20% Net Store",
      "14-Day Warranty Hold",
      "$50.00 USD Threshold",
      "30-Day Cookie + Coupon"
    ]
  ]
}',
  NOW()
),
(
  'affiliate', 
  '/affiliate', 
  'AF02', 
  1, 
  'Vanity Link & Promo Coupon Tracking', 
  'page', 
  '<p>Receive a clean vanity URL (<code>bombastype.com/c/NAME</code>) plus an auto-generated 10% OFF discount coupon for your followers. Commissions are credited upon purchase using either track.</p>',
  NOW()
),
(
  'affiliate', 
  '/affiliate', 
  'AF03', 
  2, 
  'Monthly PayPal Clearance & Payout Schedule', 
  'page', 
  '<p>Earn 20% on every license sold. After a 14-day warranty holding period, earnings are paid automatically via PayPal once balance reaches $50. No invoice filing required.</p>',
  NOW()
)
ON CONFLICT DO NOTHING;
