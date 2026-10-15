-- =================================================================
-- SUPABASE AFFILIATE PATCH (SUBQI & BOMBASTYPE)
-- Purely Additive, Non-destructive, Post-Oct 30 Compliant
-- =================================================================

-- 1. Add attribution columns to affiliate_commissions
ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS attribution_type TEXT DEFAULT 'referral_link';

ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 2. Add auto-payout preference to affiliates (defaults to true)
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT true;

-- 3. Ensure permissions for all roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commissions TO anon, authenticated, service_role;
