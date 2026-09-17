-- =================================================================
-- SUPABASE RLS HARDENING SCRIPT (BOMBASTYPE & SUBQI)
-- Aman, tidak merusak fungsi publik/typetester/checkout/admin.
-- =================================================================

-- 1. HELPER FUNCTION: is_admin()
-- Memeriksa apakah user yang sedang login terdaftar di tabel fontadmin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS 
  SELECT EXISTS (
    SELECT 1 FROM public.fontadmin WHERE id = auth.uid()
  );
;

-- 2. TABLE: fontadmin
ALTER TABLE public.fontadmin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fontadmin_select_auth" ON public.fontadmin;
CREATE POLICY "fontadmin_select_auth"
ON public.fontadmin FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "fontadmin_admin_insert" ON public.fontadmin;
CREATE POLICY "fontadmin_admin_insert"
ON public.fontadmin FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "fontadmin_admin_update" ON public.fontadmin;
CREATE POLICY "fontadmin_admin_update"
ON public.fontadmin FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "fontadmin_admin_delete" ON public.fontadmin;
CREATE POLICY "fontadmin_admin_delete"
ON public.fontadmin FOR DELETE
TO authenticated
USING (public.is_admin());

-- 3. TABLE: fonts
ALTER TABLE public.fonts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fonts_public_read" ON public.fonts;
CREATE POLICY "fonts_public_read"
ON public.fonts FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "fonts_admin_all" ON public.fonts;
CREATE POLICY "fonts_admin_all"
ON public.fonts FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. TABLE: promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_public_read" ON public.promotions;
CREATE POLICY "promotions_public_read"
ON public.promotions FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "promotions_admin_all" ON public.promotions;
CREATE POLICY "promotions_admin_all"
ON public.promotions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. TABLE: site_content
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content_public_read" ON public.site_content;
CREATE POLICY "site_content_public_read"
ON public.site_content FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "site_content_admin_all" ON public.site_content;
CREATE POLICY "site_content_admin_all"
ON public.site_content FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. TABLE: site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
ON public.site_settings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "site_settings_admin_all" ON public.site_settings;
CREATE POLICY "site_settings_admin_all"
ON public.site_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 7. TABLE: coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_read_active" ON public.coupons;
CREATE POLICY "coupons_read_active"
ON public.coupons FOR SELECT
TO public
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "coupons_update_usage" ON public.coupons;
CREATE POLICY "coupons_update_usage"
ON public.coupons FOR UPDATE
TO public
USING (is_active = true OR public.is_admin())
WITH CHECK (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all"
ON public.coupons FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8. TABLE: fontsubscribers
ALTER TABLE public.fontsubscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fontsubscribers_insert_public" ON public.fontsubscribers;
CREATE POLICY "fontsubscribers_insert_public"
ON public.fontsubscribers FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "fontsubscribers_admin_all" ON public.fontsubscribers;
CREATE POLICY "fontsubscribers_admin_all"
ON public.fontsubscribers FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 9. TABLE: fontbuyer
ALTER TABLE public.fontbuyer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fontbuyer_select_own" ON public.fontbuyer;
CREATE POLICY "fontbuyer_select_own"
ON public.fontbuyer FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "fontbuyer_update_own" ON public.fontbuyer;
CREATE POLICY "fontbuyer_update_own"
ON public.fontbuyer FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "fontbuyer_insert_own" ON public.fontbuyer;
CREATE POLICY "fontbuyer_insert_own"
ON public.fontbuyer FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "fontbuyer_admin_delete" ON public.fontbuyer;
CREATE POLICY "fontbuyer_admin_delete"
ON public.fontbuyer FOR DELETE
TO authenticated
USING (public.is_admin());

-- 10. TABLE: font_history
ALTER TABLE public.font_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "font_history_select" ON public.font_history;
CREATE POLICY "font_history_select"
ON public.font_history FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR public.is_admin() 
  OR transaction_id IS NOT NULL
);

DROP POLICY IF EXISTS "font_history_admin_all" ON public.font_history;
CREATE POLICY "font_history_admin_all"
ON public.font_history FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 11. TABLE: font_messages
ALTER TABLE public.font_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "font_messages_select" ON public.font_messages;
CREATE POLICY "font_messages_select"
ON public.font_messages FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid() 
  OR recipient_id IS NULL 
  OR sender_id = auth.uid() 
  OR public.is_admin()
);

DROP POLICY IF EXISTS "font_messages_insert" ON public.font_messages;
CREATE POLICY "font_messages_insert"
ON public.font_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() 
  OR public.is_admin()
);

DROP POLICY IF EXISTS "font_messages_update" ON public.font_messages;
CREATE POLICY "font_messages_update"
ON public.font_messages FOR UPDATE
TO authenticated
USING (
  recipient_id = auth.uid() 
  OR public.is_admin()
)
WITH CHECK (
  recipient_id = auth.uid() 
  OR public.is_admin()
);

DROP POLICY IF EXISTS "font_messages_delete" ON public.font_messages;
CREATE POLICY "font_messages_delete"
ON public.font_messages FOR DELETE
TO authenticated
USING (public.is_admin());

-- 12. TABLES: font_message_reads & font_message_hides
ALTER TABLE public.font_message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "font_message_reads_user" ON public.font_message_reads;
CREATE POLICY "font_message_reads_user"
ON public.font_message_reads FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

ALTER TABLE public.font_message_hides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "font_message_hides_user" ON public.font_message_hides;
CREATE POLICY "font_message_hides_user"
ON public.font_message_hides FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 13. TABLE: keep_alive_ping
ALTER TABLE public.keep_alive_ping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "keep_alive_ping_all" ON public.keep_alive_ping;
CREATE POLICY "keep_alive_ping_all"
ON public.keep_alive_ping FOR ALL
TO public
USING (true)
WITH CHECK (true);