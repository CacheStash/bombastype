-- =================================================================
-- SUPABASE SECURITY HARDENING & FRAUD PREVENTION PATCH
-- BOMBASTYPE & SUBQI (Zero-Paid-SaaS Architecture)
-- =================================================================

-- 1. FIX FONTADMIN PRIVILEGE ESCALATION
-- Prevents any logged-in user from making themselves an admin
DROP POLICY IF EXISTS "fontadmin_admin_insert" ON public.fontadmin;
CREATE POLICY "fontadmin_admin_insert"
ON public.fontadmin FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.fontadmin FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.fontadmin FROM authenticated;


-- 2. LOCK DOWN AFFILIATE COMMISSIONS
-- Only service_role (Cloudflare Worker) can insert, update, or delete commissions
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_commissions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_commissions FROM authenticated;
DROP POLICY IF EXISTS "commissions_insert_authenticated" ON public.affiliate_commissions;


-- 3. LOCK DOWN AFFILIATES PII & REVENUE LEAKS
-- Prevent public scraping of paypal_email, user_id, full address, phone number
DROP POLICY IF EXISTS "affiliates_public_read_active" ON public.affiliates;
REVOKE INSERT, UPDATE, DELETE ON public.affiliates FROM anon;

-- Ensure owners can view only their own record
DROP POLICY IF EXISTS "affiliates_owner_select" ON public.affiliates;
CREATE POLICY "affiliates_owner_select"
ON public.affiliates FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());


-- 4. SECURE RPC FOR VANITY SLUG AVAILABILITY (ZERO PII EXPOSURE)
CREATE OR REPLACE FUNCTION public.affiliate_code_exists(check_code TEXT)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliates 
    WHERE LOWER(affiliate_code) = LOWER(TRIM(check_code))
  );
$$;
GRANT EXECUTE ON FUNCTION public.affiliate_code_exists(TEXT) TO anon, authenticated;


-- 5. SECURE RPC TO VERIFY AFFILIATE REFERRAL CODE (FOR CHECKOUT DISCOUNT)
CREATE OR REPLACE FUNCTION public.verify_affiliate_code(lookup_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  found_record RECORD;
BEGIN
  SELECT id, affiliate_code, commission_rate, status
  INTO found_record
  FROM public.affiliates
  WHERE LOWER(affiliate_code) = LOWER(TRIM(lookup_code))
  LIMIT 1;

  IF found_record IS NULL THEN
    RETURN jsonb_build_object('exists', false, 'valid', false);
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'valid', (found_record.status = 'active'),
    'code', found_record.affiliate_code,
    'id', found_record.id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_affiliate_code(TEXT) TO anon, authenticated;


-- 6. UNIQUE CONSTRAINTS FOR IDEMPOTENCY (PREVENTS DOUBLE COMMISSIONS & ORDERS)
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_order_aff 
ON public.affiliate_commissions (order_id, affiliate_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_history_tx_font 
ON public.font_history (transaction_id, font_id) 
WHERE download_type = 'full';


-- 7. UPDATE COMMISSION STATUS CHECK TO SUPPORT ATOMIC 'processing' STATE
ALTER TABLE public.affiliate_commissions DROP CONSTRAINT IF EXISTS affiliate_commissions_status_check;
ALTER TABLE public.affiliate_commissions ADD CONSTRAINT affiliate_commissions_status_check 
  CHECK (status IN ('pending_clearance', 'approved', 'processing', 'paid', 'voided'));


-- 8. ATOMIC WITHDRAWAL CLAIM RPC (CLAIM FIRST, SEND SECOND)
-- Atomically claims eligible approved commissions, preventing double-payout race conditions
CREATE OR REPLACE FUNCTION public.claim_commissions(p_aff_id UUID, p_batch_id TEXT)
RETURNS TABLE(id UUID, commission_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.affiliate_commissions
  SET status = 'processing',
      payout_batch_id = p_batch_id
  WHERE affiliate_id = p_aff_id
    AND (
      status = 'approved'
      OR (status = 'pending_clearance' AND cleared_at <= NOW())
    )
  RETURNING public.affiliate_commissions.id, public.affiliate_commissions.commission_amount;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_commissions(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_commissions(UUID, TEXT) TO service_role;


-- 9. SECURE COUPON USAGE INCREMENT RPC
DROP POLICY IF EXISTS "coupons_update_usage" ON public.coupons;
REVOKE UPDATE ON public.coupons FROM anon;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons 
  SET used_count = used_count + 1 
  WHERE id = p_coupon_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO anon, authenticated;


-- 10. SECURE FONT HISTORY SELECT
DROP POLICY IF EXISTS "font_history_select" ON public.font_history;
CREATE POLICY "font_history_select"
ON public.font_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());
