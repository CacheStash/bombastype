/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Send, Megaphone, Users, ShieldAlert, Sparkles, CheckCircle2, 
  AlertCircle, RefreshCw, Eye, History, Clock, ArrowRight, 
  Tag, HelpCircle, Layers, Mail, Check, Search, Upload, Image as ImageIcon, X,
  Plus, Trash2, ChevronUp, ChevronDown, Type, AlignLeft, ExternalLink,
  Calculator, Calendar, Ticket, UserCheck
} from 'lucide-react';

export interface BroadcastBlock {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'coupon';
  dealKind?: 'coupon' | 'promotion';
  promoId?: string;
  promoName?: string;
  promoDiscount?: number;
  promoEndDate?: string;
  promoTarget?: 'global' | 'bundle';
  title?: string;
  subtitle?: string;
  text?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  imageCaption?: string;
  couponCode?: string;
  couponDiscount?: number;
  couponEndDate?: string;
  couponMaxUses?: number;
  couponUrgencyText?: string;
}

interface GasAccount {
  email: string;
  url: string;
  remaining: number;
  limit: number;
  isOnline: boolean;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  preset: string;
  audience: string;
  templateData: any;
  totalTarget: number;
  remainingCount?: number;
  sentEmails: string[];
  sentLogs: Array<{
    email: string;
    gas: string;
    sent_at: string;
    status: string;
  }>;
  status: 'in_progress' | 'completed';
  created_at: string;
  last_batch_at?: string;
}

const PRESETS = [
  {
    id: 'new_release',
    name: 'New Typeface Release',
    subject: 'New Archival Typeface Release: [FONT_NAME]',
    title: 'NEW TYPEFACE RELEASE: [FONT_NAME]',
    subtitle: 'A Majestic Historical Specimen by BombasType',
    bodyText: 'We are thrilled to unveil our latest archival creation, [FONT_NAME]. Meticulously revived and expanded with comprehensive OpenType features, alternates, and multi-layer chromatic styles ready for your editorial masterworks.',
    buttonText: 'TEST IN TYPETESTER & BUY',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: ''
  },
  {
    id: 'update_typeface',
    name: 'Update Typeface (Specimen Upgrade)',
    subject: 'Typeface Update: [FONT_NAME] Enhanced Edition',
    title: 'TYPEFACE UPDATE: [FONT_NAME]',
    subtitle: 'Expanded Glyphs, Historic Alternates & Master Refinements',
    bodyText: 'We are delighted to release a major update for [FONT_NAME]. This revised specimen introduces enriched historical alternates, extensive multilingual kerning corrections, and optimized vector outlines for editorial prints and digital media.',
    buttonText: 'VIEW UPDATE IN CATALOG',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: ''
  },
  {
    id: 'new_feature',
    name: 'New Product / Canvas Launch',
    subject: 'Introducing FontCanvas — The Visual Typographic Suite',
    title: 'INTRODUCING FONTCANVAS',
    subtitle: 'Our In-Browser Visual Composition Playground',
    bodyText: 'Design, stack chromatic layers, and craft authentic vintage typographic layouts directly in your browser. FontCanvas is now live with high-resolution export, vector generator, and full catalog access.',
    buttonText: 'LAUNCH FONTCANVAS',
    buttonUrl: 'https://bombastype.com/canvas',
    couponCode: ''
  },
  {
    id: 'maintenance',
    name: 'Scheduled Maintenance Notice',
    subject: 'Notice: Scheduled Studio Maintenance',
    title: 'SCHEDULED MAINTENANCE NOTICE',
    subtitle: 'Temporary System Optimization',
    bodyText: 'Please be advised that BombasType digital catalog and licensing systems will undergo scheduled maintenance to enhance edge speed and security. The brief maintenance window will conclude shortly.',
    buttonText: 'CHECK STATUS',
    buttonUrl: 'https://bombastype.com',
    couponCode: ''
  },
  {
    id: 'back_live',
    name: 'We Are Back Online!',
    subject: 'BombasType is Live & Fully Operational',
    title: 'WE ARE BACK ONLINE',
    subtitle: 'Infrastructure Enhancements Successfully Completed',
    bodyText: 'Our scheduled maintenance is officially complete. All systems, TypeTesters, license vaults, and FontCanvas are fully operational with enhanced edge delivery worldwide. Thank you for your patience.',
    buttonText: 'EXPLORE CATALOG',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: ''
  },
  {
    id: 'new_coupon',
    name: 'Exclusive Coupon / Private Buyer Deal',
    subject: 'Exclusive [DISCOUNT]% Off Privilege — [BUYER_NAME]',
    title: 'EXCLUSIVE PATRON PRIVILEGE',
    subtitle: 'Private Typographic Commission Voucher',
    bodyText: 'Dear [BUYER_NAME],\n\nThank you for reaching out regarding our typographic library. As discussed, we are pleased to extend an exclusive [DISCOUNT]% private privilege voucher for your upcoming projects.\n\nPlease apply your personal token at checkout to enjoy this preferential rate on all font licenses and bundles.',
    buttonText: 'CLAIM PRIVILEGE & BROWSE CATALOG',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: 'VIP25OFF'
  },
  {
    id: 'new_promotion',
    name: 'Seasonal Promotion / Event Sale (Site-wide Discount)',
    subject: '[EVENT_NAME] Celebration: Up to [DISCOUNT]% Off Site-Wide',
    title: '[EVENT_NAME] SPECIAL SALE',
    subtitle: 'Store-Wide Price Reduction Across All Archival Typefaces',
    bodyText: 'In honor of [EVENT_NAME], we are delighted to announce our limited-time site-wide holiday event. All font licenses and complete family bundles are automatically discounted — no coupon code required.\n\nTake this opportunity to acquire timeless specimens for your forthcoming editorial and identity works.',
    buttonText: 'EXPLORE [EVENT_NAME] DEALS',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: ''
  },
  {
    id: 'custom',
    name: 'Custom Announcement',
    subject: 'An Exclusive Dispatch from BombasType',
    title: 'STUDIO DISPATCH',
    subtitle: 'News & Updates from the Type Foundry',
    bodyText: 'Dear patron,\n\nWe are pleased to share the latest updates, design notes, and exclusive offers crafted for our typography community.',
    buttonText: 'VISIT ARCHIVE',
    buttonUrl: 'https://bombastype.com',
    couponCode: ''
  }
];

export const getDefaultPresetBlocks = (
  presetId: string,
  fontName = '',
  buyerName = '',
  eventName = '',
  discount = ''
): BroadcastBlock[] => {
  const fName = fontName || '[FONT_NAME]';
  const bName = buyerName || '[BUYER_NAME]';
  const eName = eventName || '[EVENT_NAME]';
  const disc = discount || '25';

  switch (presetId) {
    case 'new_release':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: `NEW TYPEFACE RELEASE: ${fName}`,
          subtitle: 'A Majestic Historical Specimen by BombasType'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: `We are thrilled to unveil our latest archival creation, ${fName}. Meticulously revived and expanded with comprehensive OpenType features, alternates, and multi-layer chromatic styles ready for your editorial masterworks.`
        },
        {
          id: `blk_btn_${Date.now()}_3`,
          type: 'button',
          buttonText: 'TEST IN TYPETESTER & BUY',
          buttonUrl: 'https://bombastype.com/fonts'
        }
      ];

    case 'update_typeface':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: `TYPEFACE UPDATE: ${fName}`,
          subtitle: 'Expanded Glyphs, Historic Alternates & Master Refinements'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: `We are delighted to release a major update for ${fName}. This revised specimen introduces enriched historical alternates, extensive multilingual kerning corrections, and optimized vector outlines for editorial prints and digital media.`
        },
        {
          id: `blk_btn_${Date.now()}_3`,
          type: 'button',
          buttonText: 'VIEW UPDATE IN CATALOG',
          buttonUrl: 'https://bombastype.com/fonts'
        }
      ];

    case 'new_feature':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: 'INTRODUCING FONTCANVAS',
          subtitle: 'Our In-Browser Visual Composition Playground'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: 'Design, stack chromatic layers, and craft authentic vintage typographic layouts directly in your browser. FontCanvas is now live with high-resolution export, vector generator, and full catalog access.'
        },
        {
          id: `blk_btn_${Date.now()}_3`,
          type: 'button',
          buttonText: 'LAUNCH FONTCANVAS',
          buttonUrl: 'https://bombastype.com/canvas'
        }
      ];

    case 'maintenance':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: 'SCHEDULED MAINTENANCE NOTICE',
          subtitle: 'Temporary System Optimization'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: 'Please be advised that BombasType digital catalog and licensing systems will undergo scheduled maintenance to enhance edge speed and security. The brief maintenance window will conclude shortly.'
        },
        {
          id: `blk_btn_${Date.now()}_3`,
          type: 'button',
          buttonText: 'CHECK STATUS',
          buttonUrl: 'https://bombastype.com'
        }
      ];

    case 'back_live':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: 'WE ARE BACK ONLINE',
          subtitle: 'Infrastructure Enhancements Successfully Completed'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: 'Our scheduled maintenance is officially complete. All systems, TypeTesters, license vaults, and FontCanvas are fully operational with enhanced edge delivery worldwide. Thank you for your patience.'
        },
        {
          id: `blk_btn_${Date.now()}_3`,
          type: 'button',
          buttonText: 'EXPLORE CATALOG',
          buttonUrl: 'https://bombastype.com/fonts'
        }
      ];

    case 'new_coupon':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: 'EXCLUSIVE PATRON PRIVILEGE',
          subtitle: 'Private Typographic Commission Voucher'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: `Dear ${bName},\n\nThank you for reaching out regarding our typographic library. As discussed, we are pleased to extend an exclusive ${disc}% private privilege voucher for your upcoming projects.\n\nPlease apply your personal token at checkout to enjoy this preferential rate on all font licenses and bundles.`
        },
        {
          id: `blk_coup_${Date.now()}_3`,
          type: 'coupon',
          dealKind: 'coupon',
          couponCode: 'VIP25OFF',
          couponDiscount: parseFloat(disc) || 25,
          couponUrgencyText: '⏳ Limited Time Exclusive • 1 Use Only'
        },
        {
          id: `blk_btn_${Date.now()}_4`,
          type: 'button',
          buttonText: 'CLAIM PRIVILEGE & BROWSE CATALOG',
          buttonUrl: 'https://bombastype.com/fonts'
        }
      ];

    case 'new_promotion':
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: `${(eName || 'SEASONAL').toUpperCase()} SPECIAL SALE`,
          subtitle: 'Store-Wide Price Reduction Across All Archival Typefaces'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: `In honor of ${eName || 'the season'}, we are delighted to announce our limited-time site-wide holiday event. All font licenses and complete family bundles are automatically discounted — no coupon code required.\n\nTake this opportunity to acquire timeless specimens for your forthcoming editorial and identity works.`
        },
        {
          id: `blk_coup_${Date.now()}_3`,
          type: 'coupon',
          dealKind: 'promotion',
          promoName: eName || 'Seasonal Promotion',
          promoDiscount: parseFloat(disc) || 30,
          promoTarget: 'global',
          couponCode: ''
        },
        {
          id: `blk_btn_${Date.now()}_4`,
          type: 'button',
          buttonText: `EXPLORE ${(eName || 'SALE').toUpperCase()} DEALS`,
          buttonUrl: 'https://bombastype.com/fonts'
        }
      ];

    case 'custom':
    default:
      return [
        {
          id: `blk_head_${Date.now()}_1`,
          type: 'heading',
          title: 'STUDIO DISPATCH',
          subtitle: 'News & Updates from the Type Foundry'
        },
        {
          id: `blk_text_${Date.now()}_2`,
          type: 'text',
          text: 'Dear patron,\n\nWe are pleased to share the latest updates, design notes, and exclusive offers crafted for our typography community.'
        },
        {
          id: `blk_btn_${Date.now()}_3`,
          type: 'button',
          buttonText: 'VISIT ARCHIVE',
          buttonUrl: 'https://bombastype.com'
        }
      ];
  }
};

export default function BroadcastStudio() {
  const [activeTab, setActiveTab] = useState<'compose' | 'campaigns' | 'logs'>('compose');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState<{
    gas: { accounts: GasAccount[]; totalRemaining: number; safetyReserve: number; allowedToday: number };
    audience: { buyersCount: number; subscribersCount: number; totalUniqueCount: number };
    campaigns: Campaign[];
  }>({
    gas: { accounts: [], totalRemaining: 0, safetyReserve: 15, allowedToday: 0 },
    audience: { buyersCount: 0, subscribersCount: 0, totalUniqueCount: 0 },
    campaigns: []
  });

  // Compose State
  const [selectedPreset, setSelectedPreset] = useState('new_release');
  const [audience, setAudience] = useState<'all' | 'buyers' | 'subscribers'>('all');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [subject, setSubject] = useState(PRESETS[0].subject);

  // Search & Filter
  const [logSearch, setLogSearch] = useState('');

  // Font Selection State for Typeface Presets
  const [fontsList, setFontsList] = useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [selectedFontName, setSelectedFontName] = useState('');
  const [fontSearch, setFontSearch] = useState('');

  // Database Coupons State (Integrated with Supabase 'coupons' table)
  const [dbCoupons, setDbCoupons] = useState<any[]>([]);
  const [isAddingNewCoupon, setIsAddingNewCoupon] = useState<string | null>(null);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('20');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('1');
  const [newCouponEndDate, setNewCouponEndDate] = useState('');
  const [isSavingNewCoupon, setIsSavingNewCoupon] = useState(false);

  // Private Buyer & Deal Negotiator State (for 'new_coupon' preset)
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [buyersList, setBuyersList] = useState<any[]>([]);
  const [selectedBuyerEmail, setSelectedBuyerEmail] = useState('');
  const [selectedBuyerName, setSelectedBuyerName] = useState('');
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [calcOriginalPrice, setCalcOriginalPrice] = useState('350');
  const [calcTargetPrice, setCalcTargetPrice] = useState('270');
  const [targetMode, setTargetMode] = useState<'single' | 'audience'>('single');
  const buyerSearchRef = React.useRef<HTMLDivElement>(null);

  // Seasonal Promotion Event State & Supabase 'promotions' Table Integration
  const [dbPromotions, setDbPromotions] = useState<any[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [selectedEventName, setSelectedEventName] = useState('Eid Mubarak');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState('30');
  const [isCreatingNewPromo, setIsCreatingNewPromo] = useState(false);
  const [newPromoName, setNewPromoName] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('30');
  const [newPromoTarget, setNewPromoTarget] = useState<'global' | 'bundle'>('global');
  const [newPromoSelectedFonts, setNewPromoSelectedFonts] = useState<string[]>([]);
  const [newPromoStartDate, setNewPromoStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPromoEndDate, setNewPromoEndDate] = useState('');
  const [isSavingNewPromo, setIsSavingNewPromo] = useState(false);

  // Helper to generate promotional urgency text
  const computeUrgencyText = (c: any) => {
    const parts: string[] = [];
    if (c.end_date) {
      try {
        const d = new Date(c.end_date);
        parts.push(`⏳ Limited Time: Valid until ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      } catch (_) {
        parts.push(`⏳ Valid until ${c.end_date}`);
      }
    }
    if (c.max_uses && c.max_uses > 0) {
      parts.push(`⚡ Strictly limited to first ${c.max_uses} redemption${c.max_uses > 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join(' • ') : '⏳ Limited Availability • Claim at Checkout';
  };

  // Email Builder: 100% Modular Content Blocks Initialized from Preset
  const [blocks, setBlocks] = useState<BroadcastBlock[]>(() => getDefaultPresetBlocks('new_release'));

  const addBlock = (type: 'heading' | 'text' | 'button' | 'image' | 'coupon') => {
    let initialCouponCode = 'VIP25OFF';
    let initialDiscount = 25;
    let initialEndDate: string | undefined = undefined;
    let initialMaxUses: number | undefined = 1;
    let initialUrgency = '⏳ Limited Time Promotion • Apply at Checkout';

    if (type === 'coupon' && dbCoupons.length > 0) {
      const topCoupon = dbCoupons[0];
      initialCouponCode = topCoupon.code;
      initialDiscount = topCoupon.discount_value || 25;
      initialEndDate = topCoupon.end_date;
      initialMaxUses = topCoupon.max_uses;
      initialUrgency = computeUrgencyText(topCoupon);
    }

    const newBlock: BroadcastBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      title: type === 'heading' ? 'NEW ARCHIVAL HEADING' : undefined,
      subtitle: type === 'heading' ? 'Section Subtitle' : undefined,
      text: type === 'text' ? 'Write announcement or dispatch notes here...' : undefined,
      buttonText: type === 'button' ? 'EXPLORE CATALOG' : undefined,
      buttonUrl: type === 'button' ? 'https://bombastype.com' : undefined,
      imageUrl: type === 'image' ? '' : undefined,
      imageCaption: type === 'image' ? '' : undefined,
      dealKind: type === 'coupon' ? 'coupon' : undefined,
      couponCode: type === 'coupon' ? initialCouponCode : undefined,
      couponDiscount: type === 'coupon' ? initialDiscount : undefined,
      couponEndDate: type === 'coupon' ? initialEndDate : undefined,
      couponMaxUses: type === 'coupon' ? initialMaxUses : undefined,
      couponUrgencyText: type === 'coupon' ? initialUrgency : undefined,
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const handleCreateDbCoupon = async (blockId: string) => {
    if (!newCouponCode || !newCouponDiscount || !newCouponEndDate) {
      alert('Please complete all coupon fields (Token Code, Discount %, Expiry Date).');
      return;
    }
    setIsSavingNewCoupon(true);
    try {
      const codeUpper = newCouponCode.trim().toUpperCase();
      const discNum = parseFloat(newCouponDiscount) || 20;
      const usesNum = parseInt(newCouponMaxUses) || 1;
      const payload = {
        code: codeUpper,
        discount_type: 'percentage',
        discount_value: discNum,
        max_uses: usesNum,
        start_date: new Date().toISOString().split('T')[0],
        end_date: newCouponEndDate,
        is_active: true
      };

      const { error } = await supabase.from('coupons').insert([payload]);
      if (error) throw error;

      alert(`Coupon "${codeUpper}" registered in database! It will appear in the Promotions menu as well.`);
      const { data: updatedCoupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (updatedCoupons) setDbCoupons(updatedCoupons);

      const urgency = computeUrgencyText(payload);
      updateBlock(blockId, {
        dealKind: 'coupon',
        couponCode: codeUpper,
        couponDiscount: discNum,
        couponEndDate: newCouponEndDate,
        couponMaxUses: usesNum,
        couponUrgencyText: urgency
      });
      setIsAddingNewCoupon(null);
      setNewCouponCode('');
      setNewCouponDiscount('20');
      setNewCouponEndDate('');
    } catch (err: any) {
      alert('Failed to register coupon: ' + err.message);
    } finally {
      setIsSavingNewCoupon(false);
    }
  };

  const handleComputeDeal = async () => {
    const orig = parseFloat(calcOriginalPrice) || 0;
    const target = parseFloat(calcTargetPrice) || 0;
    if (orig <= 0 || target <= 0 || target >= orig) {
      alert('Deal target price must be lower than original price!');
      return;
    }
    const percent = Math.round(((orig - target) / orig) * 100);
    const suggestedCode = `DEAL${percent}OFF`;

    const d = new Date();
    d.setDate(d.getDate() + 14);
    const defaultEndDate = d.toISOString().split('T')[0];

    if (window.confirm(`Computed Discount: ${percent}% OFF\nSuggested Token: ${suggestedCode}\nValid for: 14 days (1 use limit)\n\nRegister this coupon into database and link it to this deal?`)) {
      try {
        const payload = {
          code: suggestedCode,
          discount_type: 'percentage',
          discount_value: percent,
          max_uses: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: defaultEndDate,
          is_active: true
        };
        const { error } = await supabase.from('coupons').insert([payload]);
        if (error) throw error;

        const { data: updatedCoupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        if (updatedCoupons) setDbCoupons(updatedCoupons);

        setSubject(prev => prev.replace(/\[DISCOUNT\]/g, `${percent}`).replace(/\[COUPON_CODE\]/g, suggestedCode));

        // Update or add coupon block
        const existingCouponBlock = blocks.find(b => b.type === 'coupon');
        if (existingCouponBlock) {
          updateBlock(existingCouponBlock.id, {
            dealKind: 'coupon',
            couponCode: suggestedCode,
            couponDiscount: percent,
            couponEndDate: defaultEndDate,
            couponMaxUses: 1,
            couponUrgencyText: computeUrgencyText(payload)
          });
        } else {
          setBlocks(prev => [...prev, {
            id: `blk_deal_${Date.now()}`,
            type: 'coupon',
            dealKind: 'coupon',
            couponCode: suggestedCode,
            couponDiscount: percent,
            couponEndDate: defaultEndDate,
            couponMaxUses: 1,
            couponUrgencyText: computeUrgencyText(payload)
          }]);
        }
        alert(`Privilege Token "${suggestedCode}" registered and applied!`);
      } catch (err: any) {
        alert('Error saving coupon: ' + err.message);
      }
    }
  };

  const handleSelectBuyer = (buyer: any) => {
    setSelectedBuyerEmail(buyer.email);
    const name = buyer.name || 'Patron';
    setSelectedBuyerName(name);
    setBuyerSearchQuery(`${buyer.email} (${name})`);
    setShowBuyerSuggestions(false);

    setSubject(prev => prev.replace(/\[BUYER_NAME\]/g, name));
    setCampaignTitle(`Private Deal - ${name}`);

    // Update tokens in blocks
    setBlocks(prev => prev.map(b => {
      const replacer = (val?: string) => {
        if (!val) return val;
        if (val.includes('[BUYER_NAME]')) return val.replace(/\[BUYER_NAME\]/g, name);
        if (selectedBuyerName && val.includes(selectedBuyerName)) return val.split(selectedBuyerName).join(name);
        return val;
      };
      return {
        ...b,
        title: replacer(b.title),
        subtitle: replacer(b.subtitle),
        text: replacer(b.text)
      };
    }));
  };

  const fetchPromotions = async () => {
    try {
      const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
      if (data) setDbPromotions(data);
    } catch (err) {
      console.warn('Failed fetching promotions:', err);
    }
  };

  const handleSelectPromo = (promoId: string) => {
    setSelectedPromoId(promoId);
    const promo = dbPromotions.find(p => p.id === promoId);
    if (!promo) return;

    setSelectedEventName(promo.name);
    setPromoDiscountPercent(String(promo.discount_percent || 30));

    const scopeText = promo.type === 'global' ? 'Store-Wide Across All Archival Typefaces' : 'Special Discount on Selected Archival Specimens';
    const urgency = promo.end_date ? `Valid until ${new Date(promo.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';

    setSubject(`[${promo.name}] Celebration: Up to ${promo.discount_percent}% Off ${promo.type === 'global' ? 'Site-Wide' : 'Special Selection'}`);
    setCampaignTitle(`Event Sale - ${promo.name}`);

    const promoHead = `${promo.name.toUpperCase()} SPECIAL SALE`;
    const promoSub = `${promo.discount_percent}% Price Reduction • ${scopeText}`;
    const promoBody = `In honor of ${promo.name}, we are delighted to announce our limited-time ${promo.type === 'global' ? 'site-wide' : 'curated'} sale. Font licenses ${promo.type === 'global' ? 'across our entire archival catalog' : 'for selected specimens'} are automatically discounted by ${promo.discount_percent}% — no coupon code required.${urgency ? `\n\nThis promotional privilege concludes on ${urgency}.` : ''}\n\nTake this opportunity to acquire timeless specimens for your forthcoming editorial and identity works.`;
    const promoBtn = `EXPLORE ${promo.name.toUpperCase()} DEALS`;

    // Automatically update blocks
    setBlocks(prev => {
      const hasCoupon = prev.some(b => b.type === 'coupon');
      const updated = prev.map(b => {
        if (b.type === 'heading') {
          return { ...b, title: promoHead, subtitle: promoSub };
        }
        if (b.type === 'text') {
          return { ...b, text: promoBody };
        }
        if (b.type === 'button') {
          return { ...b, buttonText: promoBtn };
        }
        if (b.type === 'coupon') {
          return {
            ...b,
            dealKind: 'promotion' as const,
            promoId: promo.id,
            promoName: promo.name,
            promoDiscount: promo.discount_percent,
            promoEndDate: promo.end_date,
            promoTarget: promo.type,
            couponCode: ''
          };
        }
        return b;
      });

      if (!hasCoupon) {
        updated.push({
          id: `blk_promo_${Date.now()}`,
          type: 'coupon',
          dealKind: 'promotion',
          promoId: promo.id,
          promoName: promo.name,
          promoDiscount: promo.discount_percent,
          promoEndDate: promo.end_date,
          promoTarget: promo.type,
          couponCode: ''
        });
      }
      return updated;
    });
  };

  const handleCreateNewPromotion = async (linkToBlockId?: string) => {
    if (!newPromoName.trim() || !newPromoDiscount || !newPromoEndDate) {
      alert("Please enter campaign name, discount percentage, and end date!");
      return;
    }
    const discNum = parseFloat(newPromoDiscount);
    if (isNaN(discNum) || discNum <= 0 || discNum > 100) {
      alert("Discount must be between 1% and 100%!");
      return;
    }
    if (newPromoTarget === 'bundle' && newPromoSelectedFonts.length === 0) {
      alert("Please select at least one typeface for specific promo!");
      return;
    }

    setIsSavingNewPromo(true);
    try {
      const payload = {
        name: newPromoName.trim(),
        discount_percent: discNum,
        type: newPromoTarget,
        font_ids: newPromoTarget === 'global' ? fontsList.map(f => f.id) : newPromoSelectedFonts,
        start_date: newPromoStartDate || new Date().toISOString().split('T')[0],
        end_date: newPromoEndDate,
        is_active: true
      };

      const { data: inserted, error } = await supabase.from('promotions').insert([payload]).select();
      if (error) throw error;

      await fetchPromotions();
      const createdPromo = inserted?.[0] || payload;

      if (linkToBlockId) {
        updateBlock(linkToBlockId, {
          dealKind: 'promotion',
          promoId: createdPromo.id,
          promoName: createdPromo.name,
          promoDiscount: createdPromo.discount_percent,
          promoEndDate: createdPromo.end_date,
          promoTarget: createdPromo.type,
          couponCode: ''
        });
      } else {
        handleSelectPromo(createdPromo.id);
      }

      setIsCreatingNewPromo(false);
      setNewPromoName('');
      setNewPromoDiscount('30');
      setNewPromoEndDate('');
      setNewPromoSelectedFonts([]);
      alert(`Promotion "${createdPromo.name}" successfully commissioned and linked! It is now active in the Promotions menu.`);
    } catch (err: any) {
      alert("Failed to save promotion: " + err.message);
    } finally {
      setIsSavingNewPromo(false);
    }
  };

  const handleSelectEvent = (eventName: string) => {
    setSelectedEventName(eventName);
    setSelectedPromoId('');
    const disc = promoDiscountPercent || '30';
    setSubject(`[${eventName}] Celebration: Up to ${disc}% Off Site-Wide`);
    setCampaignTitle(`Event Sale - ${eventName}`);

    setBlocks(prev => prev.map(b => {
      if (b.type === 'heading') {
        return {
          ...b,
          title: `${eventName.toUpperCase()} SPECIAL SALE`,
          subtitle: 'Store-Wide Price Reduction Across All Archival Typefaces'
        };
      }
      if (b.type === 'text') {
        return {
          ...b,
          text: `In honor of ${eventName}, we are delighted to announce our limited-time site-wide holiday event. All font licenses and complete family bundles are automatically discounted — no coupon code required.\n\nTake this opportunity to acquire timeless specimens for your forthcoming editorial and identity works.`
        };
      }
      if (b.type === 'button') {
        return {
          ...b,
          buttonText: `EXPLORE ${eventName.toUpperCase()} DEALS`
        };
      }
      if (b.type === 'coupon' && b.dealKind === 'promotion') {
        return {
          ...b,
          promoName: eventName,
          promoDiscount: parseFloat(disc) || 30
        };
      }
      return b;
    }));
  };

  const filteredBuyers = buyersList.filter(b => {
    const q = buyerSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.email || '').toLowerCase().includes(q) ||
      (b.name || '').toLowerCase().includes(q) ||
      (b.transaction_id || '').toLowerCase().includes(q)
    );
  });

  const updateBlock = (id: string, updates: Partial<BroadcastBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const [removed] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, removed);
    setBlocks(updated);
  };

  const convertDriveUrl = (inputUrl: string) => {
    if (!inputUrl) return '';
    const trimmed = inputUrl.trim();
    const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) {
      return `https://lh3.googleusercontent.com/d/${match1[1]}`;
    }
    const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) {
      return `https://lh3.googleusercontent.com/d/${match2[1]}`;
    }
    return trimmed;
  };

  const handleBlockImageUpload = async (blockId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please log in again.');

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/\s+/g, '_');
      const uniqueFileName = `${timestamp}-${cleanFileName}`;

      const res = await fetch(`/api/admin/upload/${uniqueFileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': file.type
        },
        body: file
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Upload failed with HTTP ${res.status}`);
      }

      const publicUrl = `${window.location.origin}/api/images/${uniqueFileName}`;
      updateBlock(blockId, { imageUrl: publicUrl });
    } catch (err: any) {
      console.error('Image upload error:', err);
      alert('Failed to upload image: ' + err.message);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFontsList();
    fetchCouponsAndBuyers();

    const handleClickOutside = (e: MouseEvent) => {
      if (buyerSearchRef.current && !buyerSearchRef.current.contains(e.target as Node)) {
        setShowBuyerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCouponsAndBuyers = async () => {
    try {
      const { data: cData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (cData) setDbCoupons(cData);

      await fetchPromotions();

      const { data: buyers } = await supabase.from('fontbuyer').select('id, email, full_name');
      const { data: history } = await supabase.from('font_history').select('user_id, transaction_id, created_at').order('created_at', { ascending: false });
      if (buyers) {
        const buyerMap: Record<string, { email: string; name: string }> = {};
        buyers.forEach(b => {
          buyerMap[b.id] = { email: b.email || '', name: b.full_name || 'Customer' };
        });
        const combined: any[] = [];
        const seen = new Set<string>();
        (history || []).forEach(h => {
          const b = buyerMap[h.user_id];
          if (b && b.email && !seen.has(`${b.email}-${h.transaction_id}`)) {
            seen.add(`${b.email}-${h.transaction_id}`);
            combined.push({ email: b.email, name: b.name, transaction_id: h.transaction_id || 'N/A' });
          }
        });
        buyers.forEach(b => {
          if (b.email && !combined.some(c => c.email.toLowerCase() === b.email.toLowerCase())) {
            combined.push({ email: b.email, name: b.full_name || 'Customer', transaction_id: 'REGISTERED_BUYER' });
          }
        });
        setBuyersList(combined);
      }
    } catch (e) {
      console.warn('Failed fetching coupons or buyers:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/broadcast-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed fetching broadcast data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFontsList = async () => {
    try {
      const { data, error } = await supabase
        .from('fonts')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed fetching fonts list:', error);
      } else if (data) {
        setFontsList(data);
      }
    } catch (e) {
      console.warn('Failed fetching fonts list:', e);
    }
  };

  const handleSelectFont = (fontName: string) => {
    setSelectedFontName(fontName);
    if (!fontName) return;

    const isRelease = selectedPreset === 'new_release';
    const isUpdate = selectedPreset === 'update_typeface';

    if (isRelease) {
      setCampaignTitle(`${fontName} - Release`);
    } else if (isUpdate) {
      setCampaignTitle(`${fontName} - Update`);
    }

    const currentPresetObj = PRESETS.find(p => p.id === selectedPreset);
    if (!currentPresetObj) return;

    const replaceToken = (text: string, templateFallback: string) => {
      if (text.includes('[FONT_NAME]')) {
        return text.replace(/\[FONT_NAME\]/g, fontName);
      }
      if (selectedFontName && text.includes(selectedFontName)) {
        return text.split(selectedFontName).join(fontName);
      }
      return templateFallback.replace(/\[FONT_NAME\]/g, fontName);
    };

    setSubject(prev => replaceToken(prev, currentPresetObj.subject));

    // Update tokens across blocks
    setBlocks(prev => prev.map(b => {
      const replacer = (val?: string) => {
        if (!val) return val;
        if (val.includes('[FONT_NAME]')) return val.replace(/\[FONT_NAME\]/g, fontName);
        if (selectedFontName && val.includes(selectedFontName)) return val.split(selectedFontName).join(fontName);
        return val;
      };
      return {
        ...b,
        title: replacer(b.title),
        subtitle: replacer(b.subtitle),
        text: replacer(b.text),
        buttonText: replacer(b.buttonText)
      };
    }));
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = PRESETS.find(item => item.id === presetId);
    if (!p) return;

    const isRelease = presetId === 'new_release';
    const isUpdate = presetId === 'update_typeface';
    const isCouponPreset = presetId === 'new_coupon';
    const isPromoPreset = presetId === 'new_promotion';

    let subj = p.subject;

    if ((isRelease || isUpdate) && selectedFontName) {
      subj = subj.replace(/\[FONT_NAME\]/g, selectedFontName);
      setCampaignTitle(isRelease ? `${selectedFontName} - Release` : `${selectedFontName} - Update`);
    } else if (isRelease || isUpdate) {
      setCampaignTitle('');
    } else if (isCouponPreset) {
      const bName = selectedBuyerName || 'Patron';
      subj = subj.replace(/\[BUYER_NAME\]/g, bName).replace(/\[DISCOUNT\]/g, '25');
      setCampaignTitle(`Private Deal - ${bName}`);
      setTargetMode('single');
    } else if (isPromoPreset) {
      const evt = selectedEventName || 'Eid Mubarak';
      const disc = promoDiscountPercent || '30';
      subj = subj.replace(/\[EVENT_NAME\]/g, evt).replace(/\[DISCOUNT\]/g, disc);
      setCampaignTitle(`Event Sale - ${evt}`);
    }

    setSubject(subj);

    // Populate modular blocks from preset
    const presetBlocks = getDefaultPresetBlocks(
      presetId,
      selectedFontName,
      selectedBuyerName || 'Patron',
      selectedEventName,
      isCouponPreset ? '25' : promoDiscountPercent
    );

    // If new_coupon and DB coupons exist, attach first DB coupon
    if (isCouponPreset && dbCoupons.length > 0) {
      const topCoupon = dbCoupons[0];
      const couponBlock = presetBlocks.find(b => b.type === 'coupon');
      if (couponBlock) {
        couponBlock.couponCode = topCoupon.code;
        couponBlock.couponDiscount = topCoupon.discount_value;
        couponBlock.couponEndDate = topCoupon.end_date;
        couponBlock.couponMaxUses = topCoupon.max_uses;
        couponBlock.couponUrgencyText = computeUrgencyText(topCoupon);
      }
    }

    // If new_promotion and DB promotions exist, attach selected or first DB promo
    if (isPromoPreset && dbPromotions.length > 0) {
      const promoToUse = dbPromotions.find(p => p.id === selectedPromoId) || dbPromotions[0];
      const promoBlock = presetBlocks.find(b => b.type === 'coupon');
      if (promoBlock && promoToUse) {
        promoBlock.dealKind = 'promotion';
        promoBlock.promoId = promoToUse.id;
        promoBlock.promoName = promoToUse.name;
        promoBlock.promoDiscount = promoToUse.discount_percent;
        promoBlock.promoEndDate = promoToUse.end_date;
        promoBlock.promoTarget = promoToUse.type;
        promoBlock.couponCode = '';
      }
    }

    setBlocks(presetBlocks);
  };

  const getTargetAudienceCount = () => {
    if (audience === 'buyers') return data.audience.buyersCount;
    if (audience === 'subscribers') return data.audience.subscribersCount;
    return data.audience.totalUniqueCount;
  };

  const handleSendBroadcast = async (existingCampaignId?: string) => {
    const isSingleMode = selectedPreset === 'new_coupon' && targetMode === 'single';
    if (isSingleMode) {
      if (!selectedBuyerEmail || !selectedBuyerEmail.includes('@')) {
        alert("Please select or enter a valid recipient email address for this private coupon deal.");
        return;
      }
    }

    const targetCount = isSingleMode ? 1 : getTargetAudienceCount();
    if (targetCount === 0) {
      alert("No recipients found in selected audience.");
      return;
    }

    if (data.gas.allowedToday <= 0) {
      alert("Daily quota limit reached (15 emails reserved for real-time customer orders). Please continue tomorrow.");
      return;
    }

    const campId = existingCampaignId || `camp_${Date.now()}`;
    const willSendCount = isSingleMode ? 1 : Math.min(targetCount, data.gas.allowedToday);
    const confirmMsg = isSingleMode
      ? `Dispatch Private Deal Voucher to:\n${selectedBuyerName || 'Patron'} <${selectedBuyerEmail}>\n\nProceed with dispatch?`
      : `Launch Broadcast Batch?\n\n- Sending Today: ${willSendCount} emails\n- Safety Reserve: 15 emails protected for incoming customer orders\n- Audience: ${audience.toUpperCase()}\n- Accounts: Balanced across all active GAS senders\n\nProceed with dispatch?`;

    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const firstHeading = blocks.find(b => b.type === 'heading');
      const firstText = blocks.find(b => b.type === 'text');
      const firstBtn = blocks.find(b => b.type === 'button');
      const firstImg = blocks.find(b => b.type === 'image');
      const firstCoupon = blocks.find(b => b.type === 'coupon' && b.dealKind !== 'promotion');

      const res = await fetch('/api/admin/broadcast-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId: campId,
          campaignTitle: campaignTitle || firstHeading?.title || subject,
          audience: isSingleMode ? 'single' : audience,
          recipientEmail: isSingleMode ? selectedBuyerEmail : undefined,
          recipientName: isSingleMode ? selectedBuyerName : undefined,
          subject,
          preset: selectedPreset,
          templateData: {
            title: firstHeading?.title || subject,
            subtitle: firstHeading?.subtitle || '',
            bodyText: firstText?.text || '',
            bannerUrl: firstImg?.imageUrl || '',
            buttonText: firstBtn?.buttonText || '',
            buttonUrl: firstBtn?.buttonUrl || '',
            couponCode: firstCoupon?.couponCode || '',
            blocks
          }
        })
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || resJson.error || 'Broadcast failed');
      }

      alert(`Broadcast Batch Dispatched!\n\nSent: ${resJson.sentInBatch} emails\nRemaining for Campaign: ${resJson.remainingForCampaign}\nStatus: ${resJson.status.toUpperCase()}`);
      await fetchData();
      setActiveTab('campaigns');
    } catch (err: any) {
      alert("Broadcast Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Compile all logs across campaigns
  const allLogs = (data.campaigns || []).flatMap(c => 
    (c.sentLogs || []).map(l => ({ ...l, campaignTitle: c.title || c.subject, campaignId: c.id }))
  ).sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

  const filteredLogs = allLogs.filter(l => 
    (l.email || '').toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.campaignTitle || '').toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.gas || '').toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-serif">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-vintage-ink pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-vintage-ink text-vintage-paper rounded-xs">
              <Megaphone size={20} />
            </span>
            <h1 className="font-blackletter text-4xl tracking-tight leading-none">Broadcast Studio</h1>
          </div>
          <p className="text-xs uppercase tracking-widest text-vintage-ink/70 mt-2 font-mono">
            High-Deliverability Multi-Account Email Marketing &amp; Release Engine
          </p>
        </div>

        {/* GAS REAL-TIME STATUS BAR */}
        <div className="flex items-center gap-4 bg-vintage-ink/5 border border-vintage-ink p-3 rounded-xs text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase opacity-60">Daily Available Quota</span>
            <span className="text-base font-black text-vintage-ink">
              {data.gas.allowedToday} <span className="text-[10px] font-normal opacity-60">/ {data.gas.totalRemaining} (15 Reserve)</span>
            </span>
          </div>
          <div className="h-8 w-px bg-vintage-ink/20" />
          <button 
            onClick={fetchData} 
            disabled={loading}
            title="Refresh Real-Time Quota"
            className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* THREE GAS ACCOUNTS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.gas.accounts.map((acc, idx) => (
          <div key={idx} className="border border-vintage-ink p-4 bg-vintage-paper flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono mb-2">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                Account #{idx + 1}
              </span>
              <span className="opacity-60">{acc.remaining} / {acc.limit} Left</span>
            </div>
            <div className="text-[11px] font-mono text-vintage-ink/80 truncate mb-3">{acc.email}</div>
            <div className="w-full bg-vintage-ink/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-vintage-ink h-full transition-all" 
                style={{ width: `${Math.min(100, (acc.remaining / acc.limit) * 100)}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-vintage-ink text-xs font-bold uppercase tracking-wider gap-2">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-6 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'compose' 
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5' 
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink'
          }`}
        >
          <Send size={14} />
          Compose Broadcast
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'campaigns' 
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5' 
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink'
          }`}
        >
          <Layers size={14} />
          Campaigns &amp; Multi-Day Queue ({data.campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'logs' 
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5' 
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink'
          }`}
        >
          <History size={14} />
          Sent Delivery Audit ({allLogs.length})
        </button>
      </div>

      {/* TAB 1: COMPOSE BROADCAST */}
      {activeTab === 'compose' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* 1. AUDIENCE SELECTOR CARD */}
          <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                <Users size={14} /> Target Audience
              </label>
              {selectedPreset === 'new_coupon' && targetMode === 'single' && (
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                  Single Client Delivery Locked
                </span>
              )}
            </div>

            {selectedPreset === 'new_coupon' && targetMode === 'single' ? (
              <div className="border-2 border-[#8b6b4a] bg-[#8b6b4a]/10 p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <UserCheck size={22} className="text-[#8b6b4a] shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#2c241a] flex items-center gap-2">
                        <span>🎯 Single Client Direct Delivery Mode Active</span>
                        <span className="text-[10px] bg-[#2c241a] text-[#fdf6e3] px-2 py-0.5 font-mono">1 Recipient Only</span>
                      </div>
                      <div className="text-xs font-mono text-[#2c241a] mt-1">
                        Delivering exclusively to: <strong className="text-vintage-accent underline">{selectedBuyerName || 'Patron'}</strong> &lt;{selectedBuyerEmail || 'No recipient selected yet'}&gt;
                      </div>
                      <div className="text-[10px] text-[#2c241a]/70 mt-0.5">
                        Mass audience broadcasting is locked. Only this individual recipient will receive this dispatch.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetMode('audience')}
                    className="px-3 py-1.5 border border-[#2c241a] bg-white text-[#2c241a] text-[10px] font-bold uppercase tracking-wider hover:bg-[#2c241a] hover:text-[#fdf6e3] transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    Switch to Audience Broadcast
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAudience('all')}
                  className={`p-3 border text-left transition-all cursor-pointer ${
                    audience === 'all' 
                      ? 'bg-[#2c241a] text-[#fdf6e3] border-[#2c241a] shadow-[2px_2px_0px_#8b6b4a]' 
                      : 'bg-white/80 text-[#2c241a] border-[#2c241a]/30 hover:border-[#2c241a] hover:bg-[#2c241a]/5'
                  }`}
                >
                  <div className="font-bold">ALL AUDIENCE</div>
                  <div className="text-[10px] opacity-70 mt-1">{data.audience.totalUniqueCount} Unique Emails</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience('buyers')}
                  className={`p-3 border text-left transition-all cursor-pointer ${
                    audience === 'buyers' 
                      ? 'bg-[#2c241a] text-[#fdf6e3] border-[#2c241a] shadow-[2px_2px_0px_#8b6b4a]' 
                      : 'bg-white/80 text-[#2c241a] border-[#2c241a]/30 hover:border-[#2c241a] hover:bg-[#2c241a]/5'
                  }`}
                >
                  <div className="font-bold">BUYERS ONLY</div>
                  <div className="text-[10px] opacity-70 mt-1">{data.audience.buyersCount} Verified Patrons</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience('subscribers')}
                  className={`p-3 border text-left transition-all cursor-pointer ${
                    audience === 'subscribers' 
                      ? 'bg-[#2c241a] text-[#fdf6e3] border-[#2c241a] shadow-[2px_2px_0px_#8b6b4a]' 
                      : 'bg-white/80 text-[#2c241a] border-[#2c241a]/30 hover:border-[#2c241a] hover:bg-[#2c241a]/5'
                  }`}
                >
                  <div className="font-bold">SUBSCRIBERS</div>
                  <div className="text-[10px] opacity-70 mt-1">{data.audience.subscribersCount} Active Readers</div>
                </button>
              </div>
            )}
          </div>

          {/* 2. PRESET SELECTOR */}
          <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-3">
            <label className="text-xs uppercase tracking-widest font-black flex items-center justify-between">
              <span>Template Preset</span>
              <span className="text-[10px] font-mono font-normal opacity-60">{PRESETS.length} Formats Available</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="w-full border border-vintage-ink p-3 text-xs uppercase font-mono tracking-wider bg-vintage-paper outline-none cursor-pointer font-bold"
            >
              {PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 3. TYPEFACE SELECTOR (FOR RELEASE & UPDATE PRESETS) */}
          {(selectedPreset === 'new_release' || selectedPreset === 'update_typeface') && (
            <div className="border border-vintage-ink p-5 bg-vintage-accent/5 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                  <Sparkles size={14} className="text-vintage-accent" /> Select Target Typeface
                </label>
                <span className="text-[10px] opacity-70">
                  {fontsList.length} Specimens Loaded (Recent First)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="SEARCH SPECIMEN..."
                    className="w-full border border-vintage-ink pl-8 pr-3 py-2 text-xs bg-vintage-paper outline-none uppercase font-bold"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vintage-ink/40" size={14} />
                  {fontSearch && (
                    <button
                      type="button"
                      onClick={() => setFontSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold hover:underline"
                    >
                      CLEAR
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={selectedFontName}
                    onChange={(e) => handleSelectFont(e.target.value)}
                    className="w-full border border-vintage-ink p-2 text-xs uppercase font-mono bg-vintage-paper outline-none cursor-pointer font-bold"
                  >
                    <option value="">-- Choose Typeface --</option>
                    {fontsList
                      .filter(f => !fontSearch || f.name.toLowerCase().includes(fontSearch.toLowerCase().trim()))
                      .map(f => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {selectedFontName ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-vintage-ink border border-vintage-ink/40 bg-vintage-ink/5 p-2">
                  <Check size={12} />
                  <span>Selected: <strong>{selectedFontName}</strong> — Campaign reference & [FONT_NAME] tokens automatically populated</span>
                </div>
              ) : (
                <div className="text-[10px] italic opacity-70">
                  Select a typeface specimen above to automatically populate [FONT_NAME] tokens and set campaign title.
                </div>
              )}
            </div>
          )}

          {/* 3B. DIRECT BUYER & DEAL NEGOTIATOR (FOR NEW_COUPON PRESET) */}
          {selectedPreset === 'new_coupon' && (
            <div className="border border-vintage-ink p-5 bg-vintage-accent/5 space-y-4">
              <div className="flex items-center justify-between border-b border-vintage-ink/30 pb-2">
                <div className="flex items-center gap-2">
                  <Calculator size={15} className="text-[#8b6b4a]" />
                  <span className="text-xs uppercase tracking-widest font-black">
                    Direct Buyer &amp; Deal Negotiator
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-70">Single Buyer or Broadcast Deal</span>
              </div>

              {/* TARGET MODE SELECTOR */}
              <div className="flex flex-wrap gap-4 text-xs font-bold uppercase">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="couponTargetMode"
                    checked={targetMode === 'single'}
                    onChange={() => setTargetMode('single')}
                    className="cursor-pointer"
                  />
                  <span>Single Buyer / Prospective Client (Direct 1-on-1)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="couponTargetMode"
                    checked={targetMode === 'audience'}
                    onChange={() => setTargetMode('audience')}
                    className="cursor-pointer"
                  />
                  <span>Audience Broadcast (All / Buyers / Subscribers)</span>
                </label>
              </div>

              {targetMode === 'single' && (
                <div className="space-y-3 pt-1">
                  <div className="relative" ref={buyerSearchRef}>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                      Search Existing Buyer or Enter Candidate Email
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={buyerSearchQuery}
                          onChange={(e) => {
                            setBuyerSearchQuery(e.target.value);
                            setSelectedBuyerEmail(e.target.value);
                            setShowBuyerSuggestions(true);
                          }}
                          onFocus={() => setShowBuyerSuggestions(true)}
                          placeholder="Type customer email, name, or transaction ID..."
                          className="w-full border border-vintage-ink p-2.5 text-xs bg-white outline-none font-bold"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-vintage-ink/40" size={14} />
                      </div>
                      <input
                        type="text"
                        value={selectedBuyerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedBuyerName(val);
                          setSubject(prev => prev.replace(/\[BUYER_NAME\]/g, val));
                          setBlocks(prev => prev.map(b => {
                            const replacer = (s?: string) => s ? s.replace(/\[BUYER_NAME\]/g, val) : s;
                            return {
                              ...b,
                              title: replacer(b.title),
                              subtitle: replacer(b.subtitle),
                              text: replacer(b.text)
                            };
                          }));
                        }}
                        placeholder="Recipient Name (e.g. Alex Studio)"
                        className="w-full sm:w-56 border border-vintage-ink p-2.5 text-xs bg-white outline-none font-bold"
                      />
                    </div>

                    {/* AUTOCOMPLETE SUGGESTIONS */}
                    {showBuyerSuggestions && filteredBuyers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto border border-vintage-ink bg-white shadow-xl divide-y divide-vintage-ink/10">
                        {filteredBuyers.slice(0, 10).map((b, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectBuyer(b)}
                            className="p-2.5 hover:bg-vintage-ink/5 cursor-pointer text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-vintage-ink">{b.email}</span>
                              <span className="text-[10px] text-vintage-ink/60 ml-2 font-mono">({b.name})</span>
                            </div>
                            <span className="text-[9px] font-mono text-[#8b6b4a] uppercase bg-[#8b6b4a]/10 px-2 py-0.5">
                              {b.transaction_id}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BARGAIN / PRICE REQUEST CALCULATOR */}
              <div className="border border-vintage-ink/40 bg-white p-4 space-y-3 mt-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-vintage-ink border-b border-vintage-ink/10 pb-1">
                  <span className="flex items-center gap-1.5"><Calculator size={13} /> Price Request / Deal Calculator</span>
                  <span className="text-[9px] text-[#8b6b4a] font-mono">Negotiate &amp; Generate Token</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase block mb-1">Original Catalog Price ($)</label>
                    <input
                      type="number"
                      value={calcOriginalPrice}
                      onChange={(e) => setCalcOriginalPrice(e.target.value)}
                      placeholder="350"
                      className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase block mb-1">Agreed Deal Target ($)</label>
                    <input
                      type="number"
                      value={calcTargetPrice}
                      onChange={(e) => setCalcTargetPrice(e.target.value)}
                      placeholder="270"
                      className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-1">
                  <div className="text-xs font-mono">
                    {parseFloat(calcOriginalPrice) > 0 && parseFloat(calcTargetPrice) > 0 && parseFloat(calcTargetPrice) < parseFloat(calcOriginalPrice) && (
                      <span className="text-emerald-700 font-bold">
                        Calculated Deal: {Math.round(((parseFloat(calcOriginalPrice) - parseFloat(calcTargetPrice)) / parseFloat(calcOriginalPrice)) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleComputeDeal}
                    className="px-4 py-2 bg-[#2c241a] text-[#fdf6e3] text-[10px] uppercase font-bold tracking-wider hover:bg-[#8b6b4a] transition-all cursor-pointer shadow-sm"
                  >
                    Compute &amp; Apply Coupon
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3C. SEASONAL EVENT & PROMOTIONS SELECTOR (FOR NEW_PROMOTION PRESET) */}
          {selectedPreset === 'new_promotion' && (
            <div className="border border-vintage-ink p-5 bg-vintage-accent/5 space-y-4">
              <div className="flex items-center justify-between border-b border-vintage-ink/30 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#8b6b4a]" />
                  <span className="text-xs uppercase tracking-widest font-black">
                    Seasonal Event &amp; Promotion Selector (Direct Discount)
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-70">Integrated with Promotions Table</span>
              </div>

              {/* 1. SELECT EXISTING FROM DB PROMOTIONS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider block text-vintage-ink">
                    Load Active Promotion from Database ({dbPromotions.length} Available):
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewPromo(!isCreatingNewPromo)}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#8b6b4a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> {isCreatingNewPromo ? 'Cancel Promotion Form' : '+ Create New Promotion'}
                  </button>
                </div>
                <select
                  value={selectedPromoId}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectPromo(e.target.value);
                    } else {
                      setSelectedPromoId('');
                    }
                  }}
                  className="w-full border border-vintage-ink p-2 text-xs bg-white outline-none font-bold"
                >
                  <option value="">-- Choose Existing Promotion from Database --</option>
                  {dbPromotions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.discount_percent}% OFF ({p.type === 'global' ? 'Store-Wide' : 'Specific Fonts'}) {p.end_date ? `[Valid until ${p.end_date}]` : ''}
                    </option>
                  ))}
                </select>
                {selectedPromoId && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 p-2 flex items-center justify-between mt-1">
                    <span>✓ Linked to database promotion: <strong>{selectedEventName}</strong> ({promoDiscountPercent}% OFF)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPromoId('');
                        setSelectedEventName('Eid Mubarak');
                      }}
                      className="text-xs font-bold text-vintage-ink underline hover:opacity-75"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* 2. INLINE CREATE NEW PROMOTION FORM */}
              {isCreatingNewPromo && (
                <div className="border border-vintage-ink p-4 bg-white space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink border-b border-vintage-ink/20 pb-1 flex items-center justify-between">
                    <span>Commission New Promotion in Supabase</span>
                    <span className="text-[9px] text-[#8b6b4a] font-normal">Auto-syncs with Promotions menu</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1">Promotion Name</label>
                      <input
                        type="text"
                        value={newPromoName}
                        onChange={(e) => setNewPromoName(e.target.value)}
                        placeholder="e.g. Ramadan Kareem Sale"
                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1">Discount (%)</label>
                      <input
                        type="number"
                        value={newPromoDiscount}
                        onChange={(e) => setNewPromoDiscount(e.target.value)}
                        placeholder="30"
                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* SCOPE SELECTOR */}
                  <div>
                    <label className="text-[9px] font-bold uppercase block mb-1">Target Scope</label>
                    <div className="flex gap-4 text-xs font-bold uppercase">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="promoScope"
                          checked={newPromoTarget === 'global'}
                          onChange={() => setNewPromoTarget('global')}
                        />
                        <span>Store-wide (All Typefaces)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="promoScope"
                          checked={newPromoTarget === 'bundle'}
                          onChange={() => setNewPromoTarget('bundle')}
                        />
                        <span>Specific Selected Typefaces</span>
                      </label>
                    </div>
                  </div>

                  {/* SPECIFIC FONTS SELECTION */}
                  {newPromoTarget === 'bundle' && (
                    <div className="border border-vintage-ink/40 p-3 bg-vintage-paper/50 space-y-2 max-h-48 overflow-y-auto">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-vintage-ink/70">
                        Check Target Typefaces ({newPromoSelectedFonts.length} selected):
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {fontsList.map(f => {
                          const checked = newPromoSelectedFonts.includes(f.id);
                          return (
                            <label key={f.id} className="flex items-center gap-1.5 text-[11px] font-mono cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setNewPromoSelectedFonts(prev => prev.filter(id => id !== f.id));
                                  } else {
                                    setNewPromoSelectedFonts(prev => [...prev, f.id]);
                                  }
                                }}
                              />
                              <span className="truncate">{f.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={newPromoStartDate}
                        onChange={(e) => setNewPromoStartDate(e.target.value)}
                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1">End Date (Required)</label>
                      <input
                        type="date"
                        value={newPromoEndDate}
                        onChange={(e) => setNewPromoEndDate(e.target.value)}
                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleCreateNewPromotion()}
                      disabled={isSavingNewPromo}
                      className="px-4 py-2 bg-[#2c241a] text-[#fdf6e3] text-[10px] uppercase font-bold tracking-wider hover:bg-[#8b6b4a] transition-all cursor-pointer disabled:opacity-40"
                    >
                      {isSavingNewPromo ? 'Commissioning...' : 'Save & Link to Broadcast'}
                    </button>
                  </div>
                </div>
              )}

              {/* QUICK EVENT CHIPS (FALLBACK / MANUAL) */}
              <div className="space-y-2 pt-1 border-t border-vintage-ink/20">
                <label className="text-[10px] font-bold uppercase tracking-wider block text-vintage-ink/70">
                  Or Quick Preset Celebration:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Eid Mubarak',
                    'Christmas & Holiday',
                    'Halloween Specials',
                    'Black Friday & Cyber Week',
                    'Summer Studio Sale',
                    'Foundry Anniversary'
                  ].map(evt => (
                    <button
                      key={evt}
                      type="button"
                      onClick={() => handleSelectEvent(evt)}
                      className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider border transition-all cursor-pointer ${
                        selectedEventName === evt && !selectedPromoId
                          ? 'bg-[#2c241a] text-[#fdf6e3] border-[#2c241a] shadow-[2px_2px_0px_#8b6b4a]'
                          : 'bg-white text-[#2c241a] border-vintage-ink/40 hover:bg-[#2c241a]/5'
                      }`}
                    >
                      {evt}
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOM EVENT OR DISCOUNT ADJUSTMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1">Event Display Name</label>
                  <input
                    type="text"
                    value={selectedEventName}
                    onChange={(e) => handleSelectEvent(e.target.value)}
                    placeholder="e.g. Spring Typography Festival"
                    className="w-full border border-vintage-ink p-2 text-xs bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1">Discount Rate (%)</label>
                  <input
                    type="number"
                    value={promoDiscountPercent}
                    onChange={(e) => {
                      setPromoDiscountPercent(e.target.value);
                      setSubject(prev => prev.replace(/\b\d+%\b/, `${e.target.value}%`));
                    }}
                    placeholder="30"
                    className="w-full border border-vintage-ink p-2 text-xs bg-white outline-none font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. EMAIL PREVIEW (PLACED PROMINENTLY UNDER PRESET & TYPEFACE SELECTOR) */}
          <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest font-black border-b border-vintage-ink pb-2">
              <span className="flex items-center gap-2">
                <Eye size={15} /> Archival Email Preview
              </span>
              <span className="text-[10px] font-mono font-normal opacity-60">Recipient Live View</span>
            </div>

            {/* PREVIEW CONTAINER (FULL WIDTH WITH REALISTIC READING WIDTH) */}
            <div className="max-w-2xl mx-auto border-2 border-vintage-ink bg-[#fdf6e3] shadow-md p-6 sm:p-8 font-serif text-[#2c241a]">
              {/* Header Branding */}
              <div className="text-center pb-5 mb-5 border-b-2 border-[#2c241a]">
                <div className="text-[9px] uppercase tracking-[0.25em] text-[#8b6b4a] font-bold">
                  ARCHIVAL TYPOGRAPHY DISPATCH
                </div>
                <div className="font-serif font-black text-2xl tracking-wider uppercase mt-1">
                  BOMBASTYPE
                </div>
                <div className="text-[8px] font-mono tracking-widest text-[#6b5c4d] uppercase mt-1">
                  FOUNDRY &amp; TYPE LAB &bull; EST. MMXXVI
                </div>
              </div>

              {/* Modular Blocks Preview (Stacked in Exact Order) */}
              {blocks.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-vintage-ink/40">
                  No content sections added yet. Add sections in the builder below.
                </div>
              ) : (
                blocks.map((block, idx) => {
                  if (block.type === 'heading') {
                    return (
                      <div key={block.id || idx} className="text-center my-6">
                        <h2 className="font-serif font-bold text-xl uppercase tracking-wide leading-tight">
                          {block.title || "MAIN HEADLINE"}
                        </h2>
                        {block.subtitle && (
                          <p className="text-xs italic text-[#8b6b4a] mt-1 tracking-wide">
                            {block.subtitle}
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (block.type === 'text') {
                    return (
                      <div key={block.id || idx} className="text-xs leading-relaxed text-[#3a2e22] whitespace-pre-line my-4 font-serif">
                        {block.text || "Your broadcast message will appear here in elegant archival formatting."}
                      </div>
                    );
                  }

                  if (block.type === 'button') {
                    return (
                      <div key={block.id || idx} className="text-center my-6">
                        <span className="inline-block bg-[#2c241a] text-[#fdf6e3] text-[10px] font-bold uppercase tracking-[0.15em] px-6 py-3 border border-[#2c241a]">
                          {block.buttonText || "EXPLORE ARCHIVE"} &rarr;
                        </span>
                      </div>
                    );
                  }

                  if (block.type === 'image') {
                    return block.imageUrl ? (
                      <div key={block.id || idx} className="my-6 text-center">
                        <div className="border border-[#2c241a] overflow-hidden inline-block w-full">
                          <img src={block.imageUrl} alt={block.imageCaption || "Specimen image"} className="w-full h-auto object-cover" />
                        </div>
                        {block.imageCaption && (
                          <div className="text-[10px] font-serif italic text-[#6b5c4d] tracking-wide mt-1">
                            {block.imageCaption}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={block.id || idx} className="my-4 border border-dashed border-vintage-ink/30 p-6 text-center text-xs font-mono text-vintage-ink/40">
                        [Image placeholder: Upload or paste URL in section editor below]
                      </div>
                    );
                  }

                  if (block.type === 'coupon') {
                    if (block.dealKind === 'promotion') {
                      const pName = block.promoName || selectedEventName || 'SPECIAL STORE PROMOTION';
                      const pDiscount = block.promoDiscount ? `${block.promoDiscount}% OFF` : `${promoDiscountPercent}% OFF`;
                      const pScope = block.promoTarget === 'bundle' ? 'ON SELECTED ARCHIVAL SPECIMENS' : 'STORE-WIDE ON ALL TYPEFACES';
                      const pUrgency = block.promoEndDate ? `Valid until ${new Date(block.promoEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
                      return (
                        <div key={block.id || idx} className="border-2 border-[#8b6b4a]/60 bg-[#fffdf8] p-6 text-center my-6 shadow-sm">
                          <div className="text-[10px] uppercase tracking-[0.25em] text-[#8b6b4a] font-bold mb-3 font-serif">
                            {pName}
                          </div>
                          <div>
                            <div className="inline-block bg-[#2c241a] text-[#fdf6e3] border-2 border-[#2c241a] shadow-[3px_3px_0px_#8b6b4a] px-6 py-2.5 font-serif font-black text-3xl sm:text-4xl tracking-tight leading-none">
                              {pDiscount}
                            </div>
                          </div>
                          <div className="text-xs font-bold uppercase tracking-wider text-[#2c241a] mt-3.5 mb-1 font-serif">
                            {pScope}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-[#8b6b4a] mt-1 uppercase tracking-wide">
                            No coupon code required.
                          </div>
                          {pUrgency && (
                            <div className="mt-3 text-[10px] font-bold text-[#2c241a] bg-[#f5ede0] inline-block px-3 py-1 border border-[#8b6b4a]">
                              ⏳ {pUrgency}
                            </div>
                          )}
                        </div>
                      );
                    }
                    const cCode = block.couponCode || 'VIP25OFF';
                    const cDiscount = block.couponDiscount ? `${block.couponDiscount}% OFF` : '';
                    const cUrgency = block.couponUrgencyText || '';
                    return (
                      <div key={block.id || idx} className="border-2 border-dashed border-[#8b6b4a] bg-white p-5 text-center my-6 shadow-sm">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-[#8b6b4a] font-bold mb-1">
                          EXCLUSIVE PRIVILEGE VOUCHER
                        </div>
                        {cDiscount && (
                          <div className="font-serif font-black text-2xl text-[#2c241a] my-1">
                            {cDiscount}
                          </div>
                        )}
                        <div className="font-mono text-xl font-black text-[#2c241a] bg-[#fdf6e3] inline-block px-4 py-1.5 border border-[#2c241a] tracking-widest my-1">
                          {cCode}
                        </div>
                        <div className="text-[10px] italic text-[#6b5c4d] mt-1.5">
                          Apply this token at checkout to claim your archival discount.
                        </div>
                        {cUrgency && (
                          <div className="mt-2 text-[9px] font-bold text-[#8b6b4a] bg-[#fffdf5] inline-block px-2.5 py-1 border border-[#d1c7b7]">
                            {cUrgency}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })
              )}

              {/* Footer */}
              <div className="text-center pt-4 border-t border-[#2c241a] text-[9px] text-[#6b5c4d] leading-relaxed">
                <div className="font-bold text-[#2c241a] uppercase tracking-wider mb-0.5">
                  BombasType Typography Studio
                </div>
                <div>You are receiving this communication as an esteemed patron or subscriber.</div>
              </div>
            </div>
          </div>

          {/* 4. CAMPAIGN METADATA & MODULAR EMAIL BUILDER */}
          <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-vintage-ink pb-2">
              <span className="uppercase tracking-widest font-black text-xs flex items-center gap-2">
                <Megaphone size={14} className="text-[#8b6b4a]" /> Campaign Subject & Reference
              </span>
              <span className="text-[10px] font-mono opacity-60">Email Metadata</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="uppercase tracking-widest font-bold block mb-1">Campaign Reference Name</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Briswood Release - Sept 2026"
                  className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none font-bold"
                />
              </div>
              <div>
                <label className="uppercase tracking-widest font-bold block mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none font-sans font-bold text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* EMAIL BUILDER: 100% CUSTOMIZABLE CONTENT SECTIONS */}
          <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-vintage-ink/30 gap-2">
              <div>
                <label className="uppercase tracking-widest font-bold text-xs flex items-center gap-2">
                  <Layers size={14} className="text-[#8b6b4a]" /> Email Content Sections (100% Customizable Builder)
                </label>
                <p className="text-[10px] text-vintage-ink/70 font-sans mt-0.5">
                  Preset sections are loaded below. Reorder (▲ / ▼), edit inline, delete (🗑️), or append any section to customize email layout.
                </p>
              </div>
              <span className="text-[10px] font-bold bg-vintage-ink text-vintage-paper px-2 py-0.5 uppercase">
                {blocks.length} {blocks.length === 1 ? 'Section' : 'Sections'}
              </span>
            </div>

              {/* ACTION TOOLBAR: ADD BUTTONS */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => addBlock('heading')}
                  className="p-2 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Type size={13} /> + Heading
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="p-2 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <AlignLeft size={13} /> + Message
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('button')}
                  className="p-2 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ExternalLink size={13} /> + CTA Button
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="p-2 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ImageIcon size={13} /> + Image
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('coupon')}
                  className="p-2 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm col-span-2 sm:col-span-1"
                >
                  <Tag size={13} /> + Coupon
                </button>
              </div>

              {/* LIST OF BLOCKS */}
              {blocks.length === 0 ? (
                <div className="border border-dashed border-vintage-ink/40 p-6 text-center text-vintage-ink/60 font-sans italic">
                  No additional sections added yet. Use the buttons above to append extra headings, announcements, buttons, or images.
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {blocks.map((block, idx) => (
                    <div key={block.id} className="border border-vintage-ink p-4 bg-white/70 shadow-sm space-y-3">
                      {/* Block Header */}
                      <div className="flex items-center justify-between border-b border-vintage-ink/20 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-vintage-ink text-vintage-paper text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold uppercase tracking-wider text-[11px] text-vintage-ink">
                            {block.type === 'heading' && 'Section Heading'}
                            {block.type === 'text' && 'Text Message'}
                            {block.type === 'button' && 'CTA Button'}
                            {block.type === 'image' && 'Image Banner'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, 'up')}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, 'down')}
                            disabled={idx === blocks.length - 1}
                            title="Move Down"
                            className="p-1 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            title="Delete Section"
                            className="p-1 border border-vintage-ink bg-vintage-paper text-red-700 hover:bg-red-700 hover:text-white cursor-pointer ml-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Block Form Fields */}
                      {block.type === 'heading' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Heading Title</label>
                            <input
                              type="text"
                              value={block.title || ''}
                              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                              placeholder="e.g. SPECIAL ARCHIVAL NOTICE"
                              className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Sub-heading (Optional)</label>
                            <input
                              type="text"
                              value={block.subtitle || ''}
                              onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                              placeholder="e.g. Historical notes on development"
                              className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none italic font-serif"
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'text' && (
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Message Text</label>
                          <textarea
                            rows={4}
                            value={block.text || ''}
                            onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                            placeholder="Type additional dispatch text or notes here..."
                            className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none font-serif text-sm leading-relaxed"
                          />
                        </div>
                      )}

                      {block.type === 'button' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Button Label</label>
                            <input
                              type="text"
                              value={block.buttonText || ''}
                              onChange={(e) => updateBlock(block.id, { buttonText: e.target.value })}
                              placeholder="e.g. READ DOCUMENTATION"
                              className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Target Link URL</label>
                            <input
                              type="url"
                              value={block.buttonUrl || ''}
                              onChange={(e) => updateBlock(block.id, { buttonUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'image' && (
                        <div className="space-y-3">
                          {block.imageUrl ? (
                            <div className="flex items-center gap-3 bg-vintage-paper p-2 border border-vintage-ink">
                              <img src={block.imageUrl} alt="Block Preview" className="w-20 h-14 object-cover border border-vintage-ink" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                  <Check size={12} /> Image Ready
                                </div>
                                <div className="text-[9px] font-mono text-vintage-ink/70 truncate" title={block.imageUrl}>
                                  {block.imageUrl}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateBlock(block.id, { imageUrl: '' })}
                                className="px-2 py-1 bg-red-100 text-red-800 border border-red-300 text-[9px] font-bold uppercase hover:bg-red-200 cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="flex-1 border border-dashed border-vintage-ink/40 hover:border-vintage-ink p-3 bg-vintage-paper text-center cursor-pointer transition-all">
                                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                    <Upload size={13} /> Click to Upload Image
                                  </span>
                                  <span className="text-[9px] text-vintage-ink/60 block mt-0.5 font-sans">PNG, JPG, WEBP, SVG</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (!session) throw new Error('Session expired.');
                                        const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
                                        const res = await fetch(`/api/admin/upload/${uniqueFileName}`, {
                                          method: 'PUT',
                                          headers: {
                                            'Authorization': `Bearer ${session.access_token}`,
                                            'Content-Type': file.type
                                          },
                                          body: file
                                        });
                                        if (!res.ok) throw new Error('Upload failed');
                                        const publicUrl = `${window.location.origin}/api/images/${uniqueFileName}`;
                                        updateBlock(block.id, { imageUrl: publicUrl });
                                      } catch (err: any) {
                                        alert('Upload error: ' + err.message);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Or Paste Direct / Google Drive URL</label>
                                <input
                                  type="url"
                                  value={block.imageUrl || ''}
                                  onChange={(e) => updateBlock(block.id, { imageUrl: convertDriveUrl(e.target.value) })}
                                  placeholder="https://drive.google.com/file/d/... or https://..."
                                  className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none text-xs font-mono"
                                />
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider block mb-1">Image Caption / Note (Optional)</label>
                            <input
                              type="text"
                              value={block.imageCaption || ''}
                              onChange={(e) => updateBlock(block.id, { imageCaption: e.target.value })}
                              placeholder="e.g. Archival wood type impression"
                              className="w-full border border-vintage-ink p-2 bg-vintage-paper outline-none font-serif italic"
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'coupon' && (
                        <div className="space-y-4 bg-vintage-accent/5 p-4 border border-vintage-ink/30">
                          {/* DEAL KIND TOGGLE: COUPON CODE VS STORE DISCOUNT PROMOTION */}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase border-b border-vintage-ink/20 pb-2">
                            <span className="text-[10px] opacity-70">Deal Type:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`deal_kind_${block.id}`}
                                checked={block.dealKind !== 'promotion'}
                                onChange={() => updateBlock(block.id, { dealKind: 'coupon' })}
                              />
                              <span>Coupon Token Box (Code required)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`deal_kind_${block.id}`}
                                checked={block.dealKind === 'promotion'}
                                onChange={() => {
                                  const topPromo = dbPromotions[0];
                                  updateBlock(block.id, {
                                    dealKind: 'promotion',
                                    promoId: topPromo ? topPromo.id : undefined,
                                    promoName: topPromo ? topPromo.name : (selectedEventName || 'Seasonal Promotion'),
                                    promoDiscount: topPromo ? topPromo.discount_percent : parseFloat(promoDiscountPercent) || 30,
                                    promoEndDate: topPromo ? topPromo.end_date : undefined,
                                    promoTarget: topPromo ? topPromo.type : 'global',
                                    couponCode: ''
                                  });
                                }}
                              />
                              <span>Store Discount Promotion (Direct discount, no code)</span>
                            </label>
                          </div>

                          {/* OPTION A: STORE DISCOUNT PROMOTION */}
                          {block.dealKind === 'promotion' ? (
                            <div className="space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5 text-vintage-ink">
                                  <Sparkles size={13} className="text-[#8b6b4a]" /> Select Active Promotion from Database
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setIsCreatingNewPromo(!isCreatingNewPromo)}
                                  className="text-[10px] font-bold uppercase tracking-wider text-[#8b6b4a] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus size={12} /> {isCreatingNewPromo ? 'Cancel New Promotion' : 'Commission New Promotion'}
                                </button>
                              </div>

                              <select
                                value={block.promoId || ''}
                                onChange={(e) => {
                                  const selId = e.target.value;
                                  const found = dbPromotions.find(p => p.id === selId);
                                  if (found) {
                                    updateBlock(block.id, {
                                      promoId: found.id,
                                      promoName: found.name,
                                      promoDiscount: found.discount_percent,
                                      promoEndDate: found.end_date,
                                      promoTarget: found.type,
                                      couponCode: ''
                                    });
                                  } else {
                                    updateBlock(block.id, { promoId: '', couponCode: '' });
                                  }
                                }}
                                className="w-full border border-vintage-ink p-2 bg-white outline-none font-bold text-xs"
                              >
                                <option value="">-- Choose Promotion from Database ({dbPromotions.length} Active) --</option>
                                {dbPromotions.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — {p.discount_percent}% OFF ({p.type === 'global' ? 'Store-Wide' : 'Specific Fonts'}) {p.end_date ? `(Valid until ${p.end_date})` : ''}
                                  </option>
                                ))}
                              </select>

                              {/* PROMOTION CUSTOMIZATION FIELDS */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-1">Banner Title</label>
                                  <input
                                    type="text"
                                    value={block.promoName || ''}
                                    onChange={(e) => updateBlock(block.id, { promoName: e.target.value })}
                                    placeholder="e.g. SPECIAL ARCHIVAL SALE"
                                    className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-1">Discount Rate (%)</label>
                                  <input
                                    type="number"
                                    value={block.promoDiscount || 30}
                                    onChange={(e) => updateBlock(block.id, { promoDiscount: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-1">Target Scope</label>
                                  <select
                                    value={block.promoTarget || 'global'}
                                    onChange={(e) => updateBlock(block.id, { promoTarget: e.target.value as any })}
                                    className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none bg-white"
                                  >
                                    <option value="global">Store-wide (All Typefaces)</option>
                                    <option value="bundle">Specific Selected Typefaces</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-1">Expiry Date</label>
                                  <input
                                    type="date"
                                    value={block.promoEndDate || ''}
                                    onChange={(e) => updateBlock(block.id, { promoEndDate: e.target.value })}
                                    className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none bg-white cursor-pointer"
                                  />
                                </div>
                              </div>
                              <div className="text-[10px] italic text-[#6b5c4d] bg-white/70 p-2 border border-vintage-ink/20">
                                ℹ️ This section renders a clean promotional discount banner in the email. No coupon code token box is displayed.
                              </div>
                            </div>
                          ) : (
                            /* OPTION B: COUPON CODE TOKEN */
                            <>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5 text-vintage-ink">
                                  <Tag size={13} className="text-[#8b6b4a]" /> Select Active Coupon from Database
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingNewCoupon(isAddingNewCoupon === block.id ? null : block.id)}
                                  className="text-[10px] font-bold uppercase tracking-wider text-[#8b6b4a] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus size={12} /> {isAddingNewCoupon === block.id ? 'Cancel New Coupon' : 'Create New Coupon'}
                                </button>
                              </div>

                              {/* SELECT FROM DB COUPONS */}
                              <div>
                                <select
                                  value={block.couponCode || ''}
                                  onChange={(e) => {
                                    const selCode = e.target.value;
                                    const found = dbCoupons.find(c => c.code === selCode);
                                    if (found) {
                                      const urgency = computeUrgencyText(found);
                                      updateBlock(block.id, {
                                        couponCode: found.code,
                                        couponDiscount: found.discount_value,
                                        couponEndDate: found.end_date,
                                        couponMaxUses: found.max_uses,
                                        couponUrgencyText: urgency
                                      });
                                      setCouponCode(found.code);
                                    } else {
                                      updateBlock(block.id, { couponCode: selCode });
                                      setCouponCode(selCode);
                                    }
                                  }}
                                  className="w-full border border-vintage-ink p-2 bg-white outline-none font-bold text-xs"
                                >
                                  <option value="">-- Choose Coupon from Database ({dbCoupons.length} Active) --</option>
                                  {dbCoupons.map(c => (
                                    <option key={c.id} value={c.code}>
                                      {c.code} — {c.discount_value}% OFF {c.end_date ? `(Valid until ${c.end_date})` : ''} {c.max_uses ? `[Limit: ${c.max_uses} uses]` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* INLINE NEW COUPON CREATOR */}
                              {isAddingNewCoupon === block.id && (
                                <div className="border border-vintage-ink p-4 bg-white space-y-3 mt-3">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink border-b border-vintage-ink/20 pb-1 flex items-center justify-between">
                                    <span>Register New Coupon to Supabase</span>
                                    <span className="text-[9px] text-[#8b6b4a] font-normal">Auto-syncs with Promotions menu</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[9px] font-bold uppercase block mb-1">Coupon Token</label>
                                      <input
                                        type="text"
                                        value={newCouponCode}
                                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. VIP25OFF"
                                        className="w-full border border-vintage-ink p-2 text-xs font-bold uppercase outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold uppercase block mb-1">Discount (%)</label>
                                      <input
                                        type="number"
                                        value={newCouponDiscount}
                                        onChange={(e) => setNewCouponDiscount(e.target.value)}
                                        placeholder="25"
                                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold uppercase block mb-1">Max Redemptions / Uses</label>
                                      <input
                                        type="number"
                                        value={newCouponMaxUses}
                                        onChange={(e) => setNewCouponMaxUses(e.target.value)}
                                        placeholder="1"
                                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold uppercase block mb-1">Expiry Date</label>
                                      <input
                                        type="date"
                                        value={newCouponEndDate}
                                        onChange={(e) => setNewCouponEndDate(e.target.value)}
                                        className="w-full border border-vintage-ink p-2 text-xs font-bold outline-none cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleCreateDbCoupon(block.id)}
                                      disabled={isSavingNewCoupon}
                                      className="px-4 py-2 bg-[#2c241a] text-[#fdf6e3] text-[10px] uppercase font-bold tracking-wider hover:bg-[#8b6b4a] transition-all cursor-pointer disabled:opacity-40"
                                    >
                                      {isSavingNewCoupon ? 'Registering...' : 'Save & Link Coupon'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* DETECTED URGENCY TEXT */}
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-vintage-ink/70">
                                  Promotional Urgency Note (Auto-detected from expiry / usage limit)
                                </label>
                                <input
                                  type="text"
                                  value={block.couponUrgencyText || ''}
                                  onChange={(e) => updateBlock(block.id, { couponUrgencyText: e.target.value })}
                                  placeholder="e.g. ⏳ Limited Time: Valid until Oct 31 • ⚡ Strictly limited to 1 use"
                                  className="w-full border border-vintage-ink p-2 bg-white outline-none text-xs"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LAUNCH BUTTON */}
            <div className="border-2 border-[#2c241a] shadow-[4px_4px_0px_#2c241a] p-5 bg-[#fdf6e3] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono">
                {selectedPreset === 'new_coupon' && targetMode === 'single' ? (
                  <div>
                    <span className="font-bold text-[#2c241a]">Delivery Mode: </span>
                    <span className="text-emerald-700 font-bold">
                      Direct Single Patron Delivery (1 email)
                    </span>
                    <div className="text-[10px] text-[#2c241a]/70 mt-0.5">
                      Recipient: <strong>{selectedBuyerName || 'Patron'}</strong> ({selectedBuyerEmail || 'no email'})
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-[#2c241a]">Batch Size Today: </span>
                    <span className="text-emerald-700 font-bold">
                      {Math.min(getTargetAudienceCount(), data.gas.allowedToday)} emails
                    </span>
                    {getTargetAudienceCount() > data.gas.allowedToday && (
                      <div className="text-[10px] text-amber-800 mt-0.5">
                        Remaining {getTargetAudienceCount() - data.gas.allowedToday} emails queued for Day 2 continuation.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSendBroadcast()}
                disabled={
                  sending || 
                  data.gas.allowedToday === 0 ||
                  (selectedPreset === 'new_coupon' && targetMode === 'single' 
                    ? (!selectedBuyerEmail || !selectedBuyerEmail.includes('@')) 
                    : getTargetAudienceCount() === 0)
                }
                className="w-full md:w-auto px-8 py-3 bg-[#2c241a] text-[#fdf6e3] text-xs uppercase font-bold tracking-widest border-2 border-[#2c241a] shadow-[3px_3px_0px_#8b6b4a] hover:bg-[#8b6b4a] hover:text-[#fdf6e3] hover:border-[#8b6b4a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2c241a] disabled:hover:text-[#fdf6e3] disabled:hover:border-[#2c241a] disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-[3px_3px_0px_#8b6b4a] flex items-center justify-center gap-2 cursor-pointer"
              >
                {sending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Dispatching {selectedPreset === 'new_coupon' && targetMode === 'single' ? 'Private Deal...' : 'Batch...'}
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    {selectedPreset === 'new_coupon' && targetMode === 'single'
                      ? 'Send Private Voucher Deal (1 Email)'
                      : 'Launch Broadcast Batch'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      {/* TAB 2: CAMPAIGNS & MULTI-DAY QUEUE */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="border border-vintage-ink p-4 bg-vintage-paper flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-bold">Multi-Day Queue Engine: </span>
              <span className="opacity-70">
                Large subscriber lists are split into daily batches. Completed emails are never duplicated on subsequent days.
              </span>
            </div>
            <div className="text-emerald-700 font-bold whitespace-nowrap">
              Allowed Today: {data.gas.allowedToday} emails
            </div>
          </div>

          {data.campaigns.length === 0 ? (
            <div className="border border-vintage-ink p-12 text-center text-xs font-mono opacity-60">
              NO BROADCAST CAMPAIGNS CREATED YET. COMPOSE YOUR FIRST DISPATCH ABOVE.
            </div>
          ) : (
            <div className="space-y-4">
              {data.campaigns.map((camp) => {
                const total = camp.totalTarget || camp.sentEmails.length;
                const sent = (camp.sentEmails || []).length;
                const remaining = Math.max(0, total - sent);
                const percent = total > 0 ? Math.round((sent / total) * 100) : 100;
                const canContinue = remaining > 0 && data.gas.allowedToday > 0;

                return (
                  <div key={camp.id} className="border border-vintage-ink p-6 bg-vintage-paper space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg font-serif">{camp.title || camp.subject}</h3>
                          <span className={`text-[9px] px-2 py-0.5 font-mono uppercase font-black border ${
                            camp.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                              : 'bg-amber-100 text-amber-900 border-amber-400'
                          }`}>
                            {camp.status === 'completed' ? 'Completed' : 'In Progress (Queued)'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono opacity-60 mt-1">
                          Subject: {camp.subject} &bull; Audience: {camp.audience.toUpperCase()} &bull; Created: {new Date(camp.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {remaining > 0 ? (
                        <button
                          onClick={() => handleSendBroadcast(camp.id)}
                          disabled={sending || !canContinue}
                          className="px-5 py-2.5 bg-[#2c241a] text-[#fdf6e3] text-xs uppercase font-bold tracking-wider border-2 border-[#2c241a] shadow-[3px_3px_0px_#8b6b4a] hover:bg-[#8b6b4a] hover:text-[#fdf6e3] hover:border-[#8b6b4a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2c241a] disabled:hover:text-[#fdf6e3] disabled:hover:border-[#2c241a] disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-[3px_3px_0px_#8b6b4a] flex items-center gap-2 cursor-pointer self-start md:self-auto"
                        >
                          <Send size={12} />
                          Continue Next Batch ({Math.min(remaining, data.gas.allowedToday)} emails)
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-mono text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={16} /> All Recipients Reached
                        </span>
                      )}
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span>Progress: {sent} / {total} sent</span>
                        <span className="font-bold">{percent}%</span>
                      </div>
                      <div className="w-full bg-vintage-ink/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-vintage-ink h-full transition-all" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono opacity-60 pt-0.5">
                        <span>Remaining: {remaining} emails</span>
                        <span>Last Batch Sent: {camp.last_batch_at ? new Date(camp.last_batch_at).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SENT DELIVERY AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search recipient email, campaign title, or GAS account..."
              className="w-full md:w-96 border border-vintage-ink p-2.5 text-xs font-mono bg-vintage-paper outline-none"
            />
            <span className="text-xs font-mono opacity-60">Showing {filteredLogs.length} Delivery Records</span>
          </div>

          <div className="border border-vintage-ink overflow-x-auto bg-vintage-paper">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-vintage-ink text-vintage-paper uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Recipient Email</th>
                  <th className="p-3">Sender Account</th>
                  <th className="p-3 text-right">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-ink/10">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center opacity-50">
                      NO DELIVERY LOGS MATCHING CRITERIA.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-vintage-ink/5">
                      <td className="p-3 whitespace-nowrap opacity-70">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-serif font-bold text-vintage-ink">
                        {log.campaignTitle}
                      </td>
                      <td className="p-3 font-semibold text-vintage-ink">
                        {log.email}
                      </td>
                      <td className="p-3 text-vintage-ink/70">
                        {log.gas}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300 rounded-[2px] font-black text-[10px]">
                          <Check size={11} /> DELIVERED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
