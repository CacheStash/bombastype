# Project Guidelines & Preferences

## Package Manager
- **Always use `pnpm`** (`pnpm install`, `pnpm build`, `pnpm dev`, `pnpm test`, `pnpm add`, etc.) for building, running scripts, and managing dependencies.
- **Never use `npm` or `yarn`** unless explicitly requested by the user.

## Backup Policy
- **Keep only the 5 most recent backups/changes**. Automatically clean up or prune older backups.
- **Exclude `node_modules`**, `.git`, `dist`, and other heavy directories. Backup files must remain extremely lightweight.

## Deployment Policy
- **Always check if `deploy.sh` exists**. If `deploy.sh` is present, always deploy using it.

## UI Language
- **Never use Indonesian in any project UI** (buttons, labels, modals, tooltips, dialogs).
- **Default to English** for all user interface elements. Indonesian in UI is only used if explicitly requested by the user.
- Comments and notes in code in Indonesian are permissible.

## Core Foundry Mission & TypeTester Philosophy
- **Full-Featured Buyer Experience**: Calon buyer WAJIB bisa menguji coba font secara **PENUH (full features)** tanpa dipotong (*no subsetting demo*).
- **Superior Pro Features**: TypeTester di platform kita harus lebih canggih dan profesional dibanding font foundry lain: mendukung sistem multi-layer chromatic stacking, custom selection individual alternate glyphs langsung di teks/popover, OpenType features lengkap, ligatures, ornaments, serta variable font sliders. Pengalaman eksplorasi tipografi calon buyer adalah prioritas utama konversi penjualan.
- **Resource Efficiency**: Di samping proteksi keamanan biner dan fitur pro, efisiensi eksekusi tetap wajib dijaga ketat: hemat kuota Cloudflare Worker invocations, hemat R2 bandwith, dan minimalkan eksekusi Google Apps Script (GAS) quota.

## Supabase Guidelines (Post-Oct 30 Rule)
- Supabase no longer automatically grants Data API access to newly created tables in the public schema.
- Whenever creating a **NEW table** in Supabase for Bombastype (via migrations or SQL editor), always run:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.<new_table_name> TO anon, authenticated, service_role;
  ```
- *Note:* Existing tables (`fonts`, `orders`, `coupons`, `settings`, `fontsubscribers`, etc.) retain their grants automatically. Adding new fonts/records to existing tables does NOT require any grants.

## Font Security & Anti-Download Protection Standard (Bare Minimum)
Untuk setiap modul font preview / type tester di Bombastype, WAJIB menerapkan standar keamanan font berikut:
1. **Client-Side Cache Prevention (`no-store`)**:
   - Respon font ke browser client WAJIB menyertakan:
     `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0`.
   - Browser pengunjung dilarang keras menyimpan biner font di HTTP disk cache agar tidak bisa diekstrak lewat "Open in new tab" DevTools.
   - Cloudflare Worker Cache API (`caches.default`) tetap mencache di edge server via `s-maxage` agar performa tetap cepat.
2. **Direct Browser Navigation Auto-Close**:
   - Akses langsung ke URL biner font via address bar browser, open in new tab, atau iframe (`Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`, `Accept: text/html`) WAJIB direspon dengan status 200 `Content-Type: text/html` yang mengeksekusi `<script>try{window.close();}catch(e){}window.location.replace('/');</script>`.
   - **JANGAN PERNAH** menggunakan redirect HTTP 302 untuk URL biner, karena browser Chromium/Edge akan menafsirkannya sebagai download file.
3. **External Downloader Blocking (403 Forbidden)**:
   - IDM (Internet Download Manager), cURL, Wget, aria2, Postman, dan scraper eksternal WAJIB diblokir dengan **`403 Forbidden`**.
   - Request font biner sah WAJIB memenuhi: `Sec-Fetch-Mode: cors`, `Sec-Fetch-Dest: empty`, `X-Requested-With: FontMetricsClient`, serta valid Origin/Referer whitelist.
4. **Binary Stream Masking (Subqi Shield v1)**:
   - File biner yang dikirim dari edge server wajib di-mask (XOR stream transformasi pada 512 byte pertama).
   - Magic table OpenType/TrueType rusak di level biner sehingga file rusak jika di-intercept mentah.
   - Frontend web melakukan unmasking hanya di memori RAM (`ArrayBuffer`) secara instan sebelum registrasi `FontFace` / parser OpenType.

## Decoy / Obfuscation Function Naming Policy (Anti-Reverse Engineering)
- For any sensitive client-side security logic (such as font unmasking, stream transformations, cipher keys, client validation, or token decoding):
  - **Always use deceptive/decoy function and variable names (nama plesetan)** that sound like ordinary layout, canvas metric, or raster calculations (e.g., `normalizeBufferMetrics`, `METRIC_TRANSFORM_KEYS`, `BUFFER_ALIGNMENT_LIMIT`, `fetchDisplayBuffer`).
  - **Never use obvious sensitive keywords** like `unmask`, `decrypt`, `cipher`, `shield`, or `deobfuscate` in client-facing function names or variables in compiled bundles.
  - **Always document the mapping in the `.ts` file** as an internal developer guide comment (in Indonesian) at the top of the file, detailing what each decoy name stands for, so future updates and pair-programming sessions can identify and maintain it easily.

