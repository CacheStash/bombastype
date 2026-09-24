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

## Supabase Guidelines (Post-Oct 30 Rule)
- Supabase no longer automatically grants Data API access to newly created tables in the public schema.
- Whenever creating a **NEW table** in Supabase for Bombastype (via migrations or SQL editor), always run:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.<new_table_name> TO anon, authenticated, service_role;
  ```
- *Note:* Existing tables (`fonts`, `orders`, `coupons`, `settings`, `fontsubscribers`, etc.) retain their grants automatically. Adding new fonts/records to existing tables does NOT require any grants.
