/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryOption {
  code: string;
  name: string;
  dial: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' }
];

export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  Indonesia: [
    'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta', 
    'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
    'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara', 
    'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara', 
    'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Papua Barat', 'Papua Pegunungan', 
    'Papua Selatan', 'Papua Tengah', 'Riau', 'Sulawesi Barat', 'Sulawesi Selatan', 
    'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara'
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ],
  Canada: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 
    'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 
    'Northwest Territories', 'Nunavut', 'Yukon'
  ],
  Australia: [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
    'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ],
  'United Kingdom': [
    'England', 'Scotland', 'Wales', 'Northern Ireland', 'Greater London'
  ]
};

export function getDummyAffiliateData(email?: string) {
  if (email && email.toLowerCase() === 'gotrainer19@gmail.com') {
    return {
      affiliate_code: 'GOTRAINER19',
      paypal_email: 'gotrainer19@gmail.com',
      phone_code: '+62',
      phone_number: '81298765432',
      country: 'Indonesia',
      state_province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      postal_code: '12190',
      street_address: 'Jl. Senopati No. 88, Kebayoran Baru'
    };
  }
  return null;
}

export async function syncAffiliateCoupon(supabase: any, affiliateId: string, affiliateCode: string) {
  if (!affiliateId || !affiliateCode) return null;
  const couponCode = `${affiliateCode.trim().toUpperCase()}10`;
  try {
    const { data: existing } = await supabase
      .from('coupons')
      .select('id, code')
      .eq('code', couponCode)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('coupons')
        .update({
          affiliate_id: affiliateId,
          discount_percentage: 10,
          discount_type: 'percentage',
          is_active: true
        })
        .eq('id', existing.id);
      return couponCode;
    } else {
      await supabase
        .from('coupons')
        .insert({
          code: couponCode,
          discount_percentage: 10,
          discount_type: 'percentage',
          is_active: true,
          affiliate_id: affiliateId,
          end_date: '2035-12-31',
          max_uses: null
        });
      return couponCode;
    }
  } catch (err) {
    console.error('Failed to sync affiliate coupon:', err);
    return couponCode;
  }
}
