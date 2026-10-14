-- =================================================================
-- SUPABASE AFFILIATE SYSTEM MIGRATION (BOMBASTYPE & SUBQI)
-- Purely Additive, Non-destructive, Post-Oct 30 Compliant
-- =================================================================

-- 1. TABLE: affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    affiliate_code TEXT UNIQUE NOT NULL,
    paypal_email TEXT NOT NULL,
    commission_rate NUMERIC DEFAULT 0.20,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    total_earned NUMERIC DEFAULT 0,
    total_paid NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant lookup by affiliate_code and user_id
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates (LOWER(affiliate_code));
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates (user_id);

-- 2. TABLE: affiliate_commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    font_name TEXT,
    buyer_email TEXT,
    gross_amount NUMERIC NOT NULL DEFAULT 0,
    paypal_inbound_fee NUMERIC NOT NULL DEFAULT 0,
    net_store_amount NUMERIC NOT NULL DEFAULT 0,
    commission_rate NUMERIC NOT NULL DEFAULT 0.20,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending_clearance' CHECK (status IN ('pending_clearance', 'approved', 'paid', 'voided')),
    cleared_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    paid_at TIMESTAMPTZ,
    payout_batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for commission queries
CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate_id ON public.affiliate_commissions (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_order_id ON public.affiliate_commissions (order_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_status ON public.affiliate_commissions (status);

-- 3. LINK TO COUPONS (Optional link to track coupon-based attribution)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupons' 
        AND column_name = 'affiliate_id'
    ) THEN 
        ALTER TABLE public.coupons ADD COLUMN affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. POST-OCT 30 SUPABASE PERMISSION GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commissions TO anon, authenticated, service_role;

-- 5. RLS POLICIES FOR affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliates_public_read_active" ON public.affiliates;
CREATE POLICY "affiliates_public_read_active"
ON public.affiliates FOR SELECT
TO public
USING (status = 'active');

DROP POLICY IF EXISTS "affiliates_owner_select" ON public.affiliates;
CREATE POLICY "affiliates_owner_select"
ON public.affiliates FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "affiliates_owner_insert" ON public.affiliates;
CREATE POLICY "affiliates_owner_insert"
ON public.affiliates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "affiliates_owner_update" ON public.affiliates;
CREATE POLICY "affiliates_owner_update"
ON public.affiliates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "affiliates_admin_all" ON public.affiliates;
CREATE POLICY "affiliates_admin_all"
ON public.affiliates FOR ALL
TO authenticated
USING (public.is_admin());

-- 6. RLS POLICIES FOR affiliate_commissions
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_owner_select" ON public.affiliate_commissions;
CREATE POLICY "commissions_owner_select"
ON public.affiliate_commissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.affiliates a 
        WHERE a.id = affiliate_commissions.affiliate_id 
        AND (a.user_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "commissions_insert_authenticated" ON public.affiliate_commissions;
CREATE POLICY "commissions_insert_authenticated"
ON public.affiliate_commissions FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "commissions_admin_all" ON public.affiliate_commissions;
CREATE POLICY "commissions_admin_all"
ON public.affiliate_commissions FOR ALL
TO authenticated
USING (public.is_admin());
