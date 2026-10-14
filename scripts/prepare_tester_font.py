#!/usr/bin/env python3
"""
BombasType & Subqi Font Asset Pipeline: Prepare Tester Fonts
-----------------------------------------------------------
Generates protected "Demo / Tester" font variations from commercial master files:
1. Injects "Demo" suffix to Font Family (NameID 1), Full Name (NameID 4), and PostScript Name (NameID 6).
2. Embeds strict evaluation-only copyright and non-commercial license notices in metadata.
3. Strips obsolete legacy tables (DSIG, VDMX, LTSH, hdmx) to optimize web delivery.
4. PRESERVES 100% of OpenType features (GSUB, GPOS, ligatures, alternates) and Variable axes (fvar, gvar, STAT).
"""

import sys
import os
import argparse
from datetime import datetime
from fontTools.ttLib import TTFont

def sanitize_ps_name(name: str) -> str:
    """Ensure PostScript name adheres to OpenType spec: ASCII, no spaces, <= 63 chars."""
    clean = "".join(c for c in name if c.isalnum() or c in "-_")
    return clean[:63]

def process_font(font_path: str, output_dir: str, suffix: str = "Demo", brand: str = "BombasType") -> str:
    if not os.path.isfile(font_path):
        raise FileNotFoundError(f"Font file not found: {font_path}")

    filename = os.path.basename(font_path)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".otf", ".ttf", ".woff", ".woff2"]:
        print(f"[-] Skipping unsupported format: {filename}")
        return ""

    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, filename)

    print(f"\n[+] Processing: {filename}")
    font = TTFont(font_path)

    # 1. Inspect existing Name Table
    name_table = font["name"]
    orig_family = ""
    orig_style = ""
    orig_ps = ""

    # Look up original names
    for rec in name_table.names:
        try:
            val = rec.toUnicode()
            if rec.nameID == 1 and not orig_family:
                orig_family = val
            elif rec.nameID == 2 and not orig_style:
                orig_style = val
            elif rec.nameID == 6 and not orig_ps:
                orig_ps = val
        except Exception:
            continue

    if not orig_family:
        orig_family = os.path.splitext(filename)[0].replace("-", " ")
    if not orig_style:
        orig_style = "Regular"
    if not orig_ps:
        orig_ps = sanitize_ps_name(orig_family.replace(" ", "") + "-" + orig_style.replace(" ", ""))

    demo_family = f"{orig_family} {suffix}".strip()
    demo_full = f"{demo_family} {orig_style}".strip()
    clean_base_ps = orig_ps.replace("-Demo", "").replace("-DEMO", "")
    demo_ps = sanitize_ps_name(f"{clean_base_ps}-{suffix}")

    year = datetime.now().year
    license_desc = (
        f"Strictly Non-Commercial Evaluation Specimen served for {brand} TypeTester. "
        "Unauthorized commercial deployment, distribution, or embedding is prohibited and "
        "actionable under international copyright law."
    )
    license_url = "https://bombastype.com/licenses"
    vendor_url = "https://bombastype.com"
    trademark = f"{brand} is a registered trademark of {brand} Foundry."
    copyright_notice = f"Copyright (c) {year} {brand} Foundry. Non-Commercial Evaluation Only."

    # 2. Update Name Table Records
    # Name IDs:
    # 0 = Copyright
    # 1 = Font Family
    # 2 = Font Subfamily
    # 3 = Unique identifier
    # 4 = Full Name
    # 6 = PostScript Name
    # 7 = Trademark
    # 8 = Manufacturer
    # 9 = Designer
    # 11 = Vendor URL
    # 13 = License Description
    # 14 = License Info URL
    # 16 = Typographic Family Name
    name_table.setName(copyright_notice, 0, 3, 1, 0x409)
    name_table.setName(demo_family, 1, 3, 1, 0x409)
    name_table.setName(orig_style, 2, 3, 1, 0x409)
    name_table.setName(f"{brand};Demo;{demo_ps}", 3, 3, 1, 0x409)
    name_table.setName(demo_full, 4, 3, 1, 0x409)
    name_table.setName(demo_ps, 6, 3, 1, 0x409)
    name_table.setName(trademark, 7, 3, 1, 0x409)
    name_table.setName(f"{brand} Foundry", 8, 3, 1, 0x409)
    name_table.setName(vendor_url, 11, 3, 1, 0x409)
    name_table.setName(license_desc, 13, 3, 1, 0x409)
    name_table.setName(license_url, 14, 3, 1, 0x409)

    # If Typographic Family (NameID 16) exists, update it too
    has_typographic_family = any(r.nameID == 16 for r in name_table.names)
    if has_typographic_family:
        name_table.setName(demo_family, 16, 3, 1, 0x409)

    # Macintosh Platform (platformID 1) compatibility
    name_table.setName(copyright_notice, 0, 1, 0, 0)
    name_table.setName(demo_family, 1, 1, 0, 0)
    name_table.setName(orig_style, 2, 1, 0, 0)
    name_table.setName(f"{brand};Demo;{demo_ps}", 3, 1, 0, 0)
    name_table.setName(demo_full, 4, 1, 0, 0)
    name_table.setName(demo_ps, 6, 1, 0, 0)
    name_table.setName(trademark, 7, 1, 0, 0)
    name_table.setName(f"{brand} Foundry", 8, 1, 0, 0)
    name_table.setName(vendor_url, 11, 1, 0, 0)
    name_table.setName(license_desc, 13, 1, 0, 0)
    name_table.setName(license_url, 14, 1, 0, 0)
    if has_typographic_family:
        name_table.setName(demo_family, 16, 1, 0, 0)

    # 3. Strip Obsolete Legacy Tables (Saves size, zero impact on modern canvas/OS)
    tables_to_strip = ["DSIG", "VDMX", "LTSH", "hdmx"]
    for table_tag in tables_to_strip:
        if table_tag in font:
            del font[table_tag]

    # 4. Save Processed Tester Font
    font.save(out_path)
    in_size = os.path.getsize(font_path)
    out_size = os.path.getsize(out_path)
    diff = in_size - out_size
    diff_str = f"-{diff/1024:.1f} KB" if diff > 0 else f"+{abs(diff)/1024:.1f} KB"

    print(f"    Family: '{orig_family}' -> '{demo_family}'")
    print(f"    PostScript: '{orig_ps}' -> '{demo_ps}'")
    print(f"    Size: {in_size/1024:.1f} KB -> {out_size/1024:.1f} KB ({diff_str})")
    print(f"    Saved: {out_path}")
    return out_path

def main():
    parser = argparse.ArgumentParser(
        description="Prepare safe, watermarked 'Demo' tester fonts for BombasType / Subqi TypeTester."
    )
    parser.add_argument("input", help="Path to a font file (.otf, .ttf) or directory of font files")
    parser.add_argument("-o", "--out", default="dist/tester", help="Output directory (default: dist/tester)")
    parser.add_argument("--suffix", default="Demo", help="Watermark name suffix (default: Demo)")
    parser.add_argument("--brand", default="BombasType", help="Brand name (default: BombasType)")

    args = parser.parse_args()

    target = args.input
    if os.path.isfile(target):
        process_font(target, args.out, suffix=args.suffix, brand=args.brand)
    elif os.path.isdir(target):
        count = 0
        for root, _, files in os.walk(target):
            for file in files:
                if file.lower().endswith((".otf", ".ttf")):
                    full_path = os.path.join(root, file)
                    process_font(full_path, args.out, suffix=args.suffix, brand=args.brand)
                    count += 1
        print(f"\n[✓] Completed: {count} font file(s) processed into '{args.out}'.")
    else:
        print(f"[!] Target not found: {target}")
        sys.exit(1)

if __name__ == "__main__":
    main()
