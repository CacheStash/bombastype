import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, 
  Save, 
  Send, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Check,
  Tag,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Clock,
  User,
  Inbox,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderEmailConfig {
  subject: string;
  heading: string;
  intro_text: string;
  warning_title: string;
  warning_text: string;
  vault_url: string;
  canvas_vip_enabled: boolean;
  canvas_url: string;
  canvas_heading: string;
  canvas_text: string;
  footer_text: string;
}

interface CouponEmailConfig {
  subject: string;
  heading: string;
  intro_text: string;
  discount_label: string;
  button_text: string;
  footer_text: string;
}

const DEFAULT_ORDER_CONFIG: OrderEmailConfig = {
  subject: "Your Font License Order #[ORDER_ID] is Ready — BombasType",
  heading: "Thank you for your purchase, [BUYER_NAME]",
  intro_text: "Your commercial font packages and license certificates are prepared below. Please keep your Order ID safe as archival proof of your licensed usage rights.",
  warning_title: "Security & Direct Download Notice",
  warning_text: "Direct download packages are active for 7 days or up to 7 downloads to safeguard intellectual property against link sharing. You may also access your typography library permanently anytime inside your User Vault.",
  vault_url: "https://bombastype.com/user/auth",
  canvas_vip_enabled: true,
  canvas_url: "https://canvas.bombastype.com",
  canvas_heading: "Font Canvas VIP Access Unlocked!",
  canvas_text: "As our verified commercial font licensee, you receive complimentary VIP access to Font Canvas — our web-based typography creator app:",
  footer_text: "Questions or licensing assistance? Reply directly to this letter.<br>© BombasType Studio. All rights reserved."
};

const DEFAULT_COUPON_CONFIG: CouponEmailConfig = {
  subject: "Exclusive [DISCOUNT] Off Voucher — BombasType",
  heading: "Exclusive VIP Voucher For You",
  intro_text: "Hello [BUYER_NAME], here is an exclusive discount code for your next commercial font license acquisition from our foundry catalog.",
  discount_label: "YOUR PRIVILEGED DISCOUNT",
  button_text: "Claim Voucher & Browse Catalog →",
  footer_text: "Questions or special inquiries? Reply directly to this letter.<br>© BombasType Studio. All rights reserved."
};

const formatGasSender = (sender?: string) => {
  if (!sender) return 'System Default';
  if (sender.includes('@')) return sender;
  if (sender.includes('AKfycbyy')) return 'bombastype@gmail.com';
  if (sender.includes('AKfycbzH')) return 'bombastypetwo@gmail.com';
  if (sender.includes('AKfycbyv')) return 'bombastypebot@gmail.com';
  return sender;
};

const MASTER_TIER_LABELS: Record<string, Record<string, string>> = {
  desktop: { solo: '1 USER ONLY', team: 'UP TO 30 USER', studio: 'UP TO 100 USER', enterprise: 'UNLIMITED USER' },
  social_web: { small_50k: '50K VIEWS', medium_500k: '500K VIEWS', large_5m: '2M VIEWS', enterprise_unlimited: 'UNLIMITED VIEWS' },
  logo_branding: { personal: 'PERSONAL BRANDING', solo: '1-10 EMPLOYEES', team: '11-50 EMPLOYEES', studio: '51-250 EMPLOYEES', enterprise: '251+ EMPLOYEES' },
  app: { solo: '1 TITLE', team: 'UP TO 10 TITLES', studio: 'UP TO 50 TITLES', enterprise: 'UNLIMITED TITLES' },
  server: { solo: 'SINGLE', studio: 'UP TO 50 SERVERS', enterprise: 'UNLIMITED' },
  broadcast: { solo: 'REGIONAL', studio: 'NATIONAL', enterprise: 'WORLDWIDE' }
};

export default function EmailStudio() {
  const [activeTab, setActiveTab] = useState<'order' | 'coupon' | 'sent'>('order');
  const [orderConfig, setOrderConfig] = useState<OrderEmailConfig>(DEFAULT_ORDER_CONFIG);
  const [couponConfig, setCouponConfig] = useState<CouponEmailConfig>(DEFAULT_COUPON_CONFIG);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; sender?: string; error?: string } | null>(null);

  const [gasPool, setGasPool] = useState<{
    accounts: Array<{ email: string; url: string; remaining: number; limit: number; status: string }>;
    totalRemaining: number;
    totalLimit: number;
  } | null>(null);
  const [checkingGas, setCheckingGas] = useState(false);

  // Sent Emails (Outbox) State
  const [sentOrders, setSentOrders] = useState<any[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [sentPage, setSentPage] = useState(1);
  const [sentSearchTerm, setSentSearchTerm] = useState('');
  const [sentSenderFilter, setSentSenderFilter] = useState('ALL');
  const [selectedSentOrder, setSelectedSentOrder] = useState<any | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [modalPreviewDevice, setModalPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const sentItemsPerPage = 10;

  // Lock background scroll when sent order preview modal is open
  useEffect(() => {
    if (selectedSentOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedSentOrder]);

  const fetchGasPool = async (forceRefresh = false) => {
    setCheckingGas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/admin/gas-status${forceRefresh ? '?refresh=true' : ''}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGasPool(data);
      }
    } catch (e) {
      console.error("Failed to fetch gas pool status:", e);
    } finally {
      setCheckingGas(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchGasPool(false);
    fetchSentOrders();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [resOrder, resCoupon] = await Promise.all([
        fetch('/api/admin/email-template?type=order', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/email-template?type=coupon', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);

      if (resOrder.ok) {
        const dataOrder = await resOrder.json();
        if (dataOrder) setOrderConfig({ ...DEFAULT_ORDER_CONFIG, ...dataOrder });
      }

      if (resCoupon.ok) {
        const dataCoupon = await resCoupon.json();
        if (dataCoupon) setCouponConfig({ ...DEFAULT_COUPON_CONFIG, ...dataCoupon });
      }
    } catch (e) {
      console.error("Failed to fetch templates:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentOrders = async () => {
    setLoadingSent(true);
    try {
      const { data, error } = await supabase
        .from('admin_order_view')
        .select('*')
        .order('download_date', { ascending: false });

      if (error) {
        console.error("Failed to load sent orders from admin_order_view:", error);
      } else if (data) {
        const formatted = data.map((item: any) => ({
          ...item,
          fontbuyer: { 
            email: item.buyer_email,
            full_name: item.metadata?.buyer_name || ''
          },
          fonts: { name: item.font_name }
        }));
        setSentOrders(formatted);
      }
    } catch (err) {
      console.error("SYSTEM_FETCH_ERROR:", err);
    } finally {
      setLoadingSent(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const isOrder = activeTab === 'order';
      const res = await fetch('/api/admin/email-template', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: activeTab,
          template: isOrder ? orderConfig : couponConfig
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save template");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      alert("Please provide a valid test recipient email address.");
      return;
    }

    setSendingTest(true);
    setTestStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const isOrder = activeTab === 'order';
      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetEmail: testEmail.trim(),
          templateType: activeTab,
          templateConfig: isOrder ? orderConfig : couponConfig
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch test email");
      }

      setTestStatus({ success: true, sender: data.sender });
      fetchGasPool();
    } catch (err: any) {
      setTestStatus({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleResendSentEmail = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetEmail = order.fontbuyer?.email || order.buyer_email;
    if (!targetEmail) return alert("No valid buyer email found for this record.");

    if (!window.confirm(`Resend order license delivery email to ${targetEmail} for Order #${order.transaction_id}?`)) {
      return;
    }

    setResendingOrderId(order.transaction_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return alert("Session expired. Please login again.");

      const res = await fetch('/api/admin/resend-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ orderId: order.transaction_id })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

      // Optimistically update order metadata in local state
      setSentOrders(prev => prev.map(o => {
        if (o.transaction_id === order.transaction_id) {
          return {
            ...o,
            metadata: {
              ...o.metadata,
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              email_sent_by: json.sender
            }
          };
        }
        return o;
      }));

      if (selectedSentOrder && selectedSentOrder.transaction_id === order.transaction_id) {
        setSelectedSentOrder({
          ...selectedSentOrder,
          metadata: {
            ...selectedSentOrder.metadata,
            email_sent: true,
            email_sent_at: new Date().toISOString(),
            email_sent_by: json.sender
          }
        });
      }

      alert(`Delivery email dispatched successfully via ${formatGasSender(json.sender)}!`);
      fetchGasPool();
    } catch (err: any) {
      console.error("RESEND_EMAIL_ERROR:", err);
      alert("Failed to send email: " + err.message);
    } finally {
      setResendingOrderId(null);
    }
  };

  // Live HTML Generation for Preview
  const previewHtml = useMemo(() => {
    if (activeTab === 'coupon') {
      const dummyBuyerName = "Alexander Wright";
      const dummyDiscount = "30% OFF";
      const dummyCode = "PATRON-VIP30";
      const dummyValid = "December 31, 2026";
      const dummyLimit = "Valid for 1 purchase";

      const heading = (couponConfig.heading || DEFAULT_COUPON_CONFIG.heading)
        .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
        .replace(/\[DISCOUNT\]/g, dummyDiscount);

      const introText = (couponConfig.intro_text || DEFAULT_COUPON_CONFIG.intro_text)
        .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
        .replace(/\[DISCOUNT\]/g, dummyDiscount);

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Exclusive ${dummyDiscount} Off Voucher — BombasType</title>
</head>
<body style="margin: 0; padding: 28px 14px; background-color: #fffdf5; font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; color: #2c241a; line-height: 1.5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 580px; width: 100%; background-color: #fdf6e3; border: 2px solid #2c241a; text-align: left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 30px 28px 20px 28px; border-bottom: 1px solid #2c241a; background-color: #fdf6e3; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: #2c241a; margin-bottom: 4px;">— BOMBASTYPE —</div>
              <div style="font-size: 9px; font-weight: bold; letter-spacing: 0.15em; color: #8b6b4a; text-transform: uppercase; margin-bottom: 12px;">PATRON EXCLUSIVE PROVISION</div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3;">${heading}</h1>
              <p style="margin: 8px auto 0 auto; color: #4a3c2c; font-size: 13px; line-height: 1.6; max-width: 460px;">${introText}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px 20px 28px; text-align: center;">
              <div style="background-color: #ffffff; border: 2px dashed #8b6b4a; padding: 24px 20px; max-width: 440px; margin: 0 auto;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 11px; font-weight: 700; color: #8b6b4a; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px;">
                  ${couponConfig.discount_label || DEFAULT_COUPON_CONFIG.discount_label}
                </div>
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 38px; font-weight: 900; color: #2c241a; line-height: 1; margin-bottom: 14px;">
                  ${dummyDiscount}
                </div>
                <div style="display: inline-block; background-color: #fdf6e3; border: 1px solid #2c241a; padding: 8px 18px; margin-bottom: 12px;">
                  <span style="font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.2em; color: #2c241a;">${dummyCode}</span>
                </div>
                <div style="font-size: 11px; color: #6b5c4d; line-height: 1.5; margin-top: 6px;">
                  Valid through <strong>${dummyValid}</strong> • ${dummyLimit}
                </div>
              </div>
              <div style="margin-top: 24px;">
                <a href="https://bombastype.com" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 11px; text-decoration: none; padding: 12px 28px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.12em;">
                  ${couponConfig.button_text || DEFAULT_COUPON_CONFIG.button_text}
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px; border-top: 1px solid #2c241a; background-color: #fdf6e3; text-align: center; font-size: 11px; font-style: italic; color: #6b5c4d; line-height: 1.6;">
              ${couponConfig.footer_text || DEFAULT_COUPON_CONFIG.footer_text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // Default: Order Email Preview
    const dummyBuyerName = "Alexander Wright";
    const dummyOrderId = "ORD-849201";
    const heading = (orderConfig.heading || DEFAULT_ORDER_CONFIG.heading)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);
    const introText = (orderConfig.intro_text || DEFAULT_ORDER_CONFIG.intro_text)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);
    const warningText = (orderConfig.warning_text || DEFAULT_ORDER_CONFIG.warning_text)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const dummyItems = [
      { name: "Briswood Vintage Serif", tier: "Desktop License (Solo)" },
      { name: "Royal Grande Variable", tier: "Studio Commercial All-In-One" }
    ];

    const itemsHtml = dummyItems.map(item => `
      <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 18px 20px; margin-bottom: 12px;">
        <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700; color: #2c241a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">${item.name}</div>
        <div style="font-size: 11px; color: #6b5c4d; margin-bottom: 14px;">
          LICENSE TIER: <strong style="background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 2px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">${item.tier}</strong>
        </div>
        <a href="#" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 10px; text-decoration: none; padding: 10px 20px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.12em;">Download Font & License (.ZIP)</a>
      </div>
    `).join('');

    const canvasHtml = orderConfig.canvas_vip_enabled ? `
      <tr>
        <td style="padding: 0 28px 18px 28px;">
          <div style="background-color: #fffdf5; border: 1px solid #8b6b4a; padding: 18px;">
            <div style="margin-bottom: 10px;">
              <span style="background-color: #8b6b4a; color: #fffdf5; font-size: 9px; font-weight: 700; padding: 2px 6px; text-transform: uppercase; letter-spacing: 0.15em; display: inline-block;">VIP BONUS</span>
              <span style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 6px; display: inline-block; vertical-align: middle;">${orderConfig.canvas_heading}</span>
            </div>
            <p style="font-family: 'EB Garamond', Georgia, serif; font-size: 13px; color: #4a3c2c; margin: 6px 0 14px 0; line-height: 1.5;">
              ${orderConfig.canvas_text}
            </p>
            <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 12px 16px; margin-bottom: 12px; font-size: 12px; line-height: 1.8;">
              <div style="margin-bottom: 2px;">
                <strong style="color: #2c241a;">APP URL:</strong> <a href="${orderConfig.canvas_url}" style="color: #8b6b4a; font-weight: 700; text-decoration: underline;">${orderConfig.canvas_url}</a>
              </div>
              <div style="margin-bottom: 2px;">
                <strong style="color: #2c241a;">USERNAME:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a;">${testEmail || "alexander@wright.design"}</span>
              </div>
              <div>
                <strong style="color: #2c241a;">PASSWORD:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a;">${dummyOrderId}</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 28px 14px; background-color: #fffdf5; font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; color: #2c241a; line-height: 1.5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 580px; width: 100%; background-color: #fdf6e3; border: 2px solid #2c241a; text-align: left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 30px 28px 20px 28px; border-bottom: 1px solid #2c241a; background-color: #fdf6e3; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: #2c241a; margin-bottom: 4px;">— BOMBASTYPE —</div>
              <div style="font-size: 9px; font-weight: bold; letter-spacing: 0.15em; color: #8b6b4a; text-transform: uppercase; margin-bottom: 12px;">ACQUISITION RECEIPT & LICENSE PROVISIONS</div>
              <div style="font-family: monospace; color: #2c241a; font-size: 11px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">ORDER #${dummyOrderId}</div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3;">${heading}</h1>
              <p style="margin: 8px auto 0 auto; color: #4a3c2c; font-size: 13px; line-height: 1.6; max-width: 460px;">${introText}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 10px 28px;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 11px; font-weight: 700; color: #8b6b4a; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 10px;">PURCHASED FONT ASSETS</div>
              ${itemsHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 18px 28px;">
              <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 16px 18px;">
                <div style="margin-bottom: 4px;">
                  <strong style="color: #8C4A32; font-family: 'Playfair Display', Georgia, serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">⚠️ ${orderConfig.warning_title || DEFAULT_ORDER_CONFIG.warning_title}</strong>
                </div>
                <p style="margin: 0; color: #4a3c2c; font-size: 12px; line-height: 1.6;">
                  ${warningText}
                </p>
                <div style="margin-top: 10px;">
                  <a href="${orderConfig.vault_url || DEFAULT_ORDER_CONFIG.vault_url}" style="display: inline-block; background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 5px 12px; font-family: 'Playfair Display', Georgia, serif; font-size: 10px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.08em;">Open User Vault (Permanent Access) →</a>
                </div>
              </div>
            </td>
          </tr>
          ${canvasHtml}
          <tr>
            <td style="padding: 18px 28px; border-top: 1px solid #2c241a; background-color: #fdf6e3; text-align: center; font-size: 11px; font-style: italic; color: #6b5c4d; line-height: 1.6;">
              ${orderConfig.footer_text || DEFAULT_ORDER_CONFIG.footer_text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [activeTab, orderConfig, couponConfig, testEmail]);

  // Generate Personalized Sent Email HTML for Selected Order
  const generateSentEmailHtml = (order: any) => {
    if (!order) return '';
    const buyerEmail = order.fontbuyer?.email || order.buyer_email || 'patron@example.com';
    const buyerName = order.fontbuyer?.full_name || order.metadata?.buyer_name || buyerEmail.split('@')[0];
    const orderId = order.transaction_id || 'ORD-000000';
    const fontName = order.fonts?.name || order.font_name || 'Archival Typeface';
    const tier = order.tier ? (MASTER_TIER_LABELS[order.tier.toLowerCase()]?.solo || order.tier.toUpperCase()) : 'COMMERCIAL LICENSE';
    const downloadUrl = `${window.location.origin}/api/download-zip?file=${encodeURIComponent(fontName)}&order=${encodeURIComponent(orderId)}&email=${encodeURIComponent(buyerEmail)}`;

    const heading = (orderConfig.heading || DEFAULT_ORDER_CONFIG.heading)
      .replace(/\[BUYER_NAME\]/g, buyerName)
      .replace(/\[ORDER_ID\]/g, orderId);

    const introText = (orderConfig.intro_text || DEFAULT_ORDER_CONFIG.intro_text)
      .replace(/\[BUYER_NAME\]/g, buyerName)
      .replace(/\[ORDER_ID\]/g, orderId);

    const warningText = (orderConfig.warning_text || DEFAULT_ORDER_CONFIG.warning_text)
      .replace(/\[BUYER_NAME\]/g, buyerName)
      .replace(/\[ORDER_ID\]/g, orderId);

    const canvasHtml = orderConfig.canvas_vip_enabled ? `
      <tr>
        <td style="padding: 0 28px 18px 28px;">
          <div style="background-color: #fffdf5; border: 1px solid #8b6b4a; padding: 18px;">
            <div style="margin-bottom: 10px;">
              <span style="background-color: #8b6b4a; color: #fffdf5; font-size: 9px; font-weight: 700; padding: 2px 6px; text-transform: uppercase; letter-spacing: 0.15em; display: inline-block;">VIP BONUS</span>
              <span style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 6px; display: inline-block; vertical-align: middle;">${orderConfig.canvas_heading}</span>
            </div>
            <p style="font-family: 'EB Garamond', Georgia, serif; font-size: 13px; color: #4a3c2c; margin: 6px 0 14px 0; line-height: 1.5;">
              ${orderConfig.canvas_text}
            </p>
            <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 12px 16px; margin-bottom: 12px; font-size: 12px; line-height: 1.8;">
              <div style="margin-bottom: 2px;">
                <strong style="color: #2c241a;">APP URL:</strong> <a href="${orderConfig.canvas_url}" style="color: #8b6b4a; font-weight: 700; text-decoration: underline;">${orderConfig.canvas_url}</a>
              </div>
              <div style="margin-bottom: 2px;">
                <strong style="color: #2c241a;">USERNAME:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a;">${buyerEmail}</span>
              </div>
              <div>
                <strong style="color: #2c241a;">PASSWORD:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a;">${orderId}</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 28px 14px; background-color: #fffdf5; font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; color: #2c241a; line-height: 1.5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 580px; width: 100%; background-color: #fdf6e3; border: 2px solid #2c241a; text-align: left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 30px 28px 20px 28px; border-bottom: 1px solid #2c241a; background-color: #fdf6e3; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: #2c241a; margin-bottom: 4px;">— BOMBASTYPE —</div>
              <div style="font-size: 9px; font-weight: bold; letter-spacing: 0.15em; color: #8b6b4a; text-transform: uppercase; margin-bottom: 12px;">ACQUISITION RECEIPT & LICENSE PROVISIONS</div>
              <div style="font-family: monospace; color: #2c241a; font-size: 11px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">ORDER #${orderId}</div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3;">${heading}</h1>
              <p style="margin: 8px auto 0 auto; color: #4a3c2c; font-size: 13px; line-height: 1.6; max-width: 460px;">${introText}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 10px 28px;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 11px; font-weight: 700; color: #8b6b4a; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 10px;">PURCHASED FONT ASSETS</div>
              <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 18px 20px; margin-bottom: 12px;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700; color: #2c241a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">${fontName}</div>
                <div style="font-size: 11px; color: #6b5c4d; margin-bottom: 14px;">
                  LICENSE TIER: <strong style="background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 2px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">${tier}</strong>
                </div>
                <a href="${downloadUrl}" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 10px; text-decoration: none; padding: 10px 20px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.12em;">Download Font & License (.ZIP)</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 18px 28px;">
              <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 16px 18px;">
                <div style="margin-bottom: 4px;">
                  <strong style="color: #8C4A32; font-family: 'Playfair Display', Georgia, serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">⚠️ ${orderConfig.warning_title || DEFAULT_ORDER_CONFIG.warning_title}</strong>
                </div>
                <p style="margin: 0; color: #4a3c2c; font-size: 12px; line-height: 1.6;">${warningText}</p>
                <div style="margin-top: 10px;">
                  <a href="${orderConfig.vault_url || DEFAULT_ORDER_CONFIG.vault_url}" style="display: inline-block; background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 5px 12px; font-family: 'Playfair Display', Georgia, serif; font-size: 10px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.08em;">Open User Vault (Permanent Access) →</a>
                </div>
              </div>
            </td>
          </tr>
          ${canvasHtml}
          <tr>
            <td style="padding: 18px 28px; border-top: 1px solid #2c241a; background-color: #fdf6e3; text-align: center; font-size: 11px; font-style: italic; color: #6b5c4d; line-height: 1.6;">
              ${orderConfig.footer_text || DEFAULT_ORDER_CONFIG.footer_text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  // Filter & Pagination for Sent Orders
  const filteredSentOrders = useMemo(() => {
    return sentOrders.filter((order) => {
      // Must be a sent email
      const isSent = Boolean(order.metadata?.email_sent || order.metadata?.email_sent_by || order.metadata?.email_sent_at);
      if (!isSent) return false;

      // Sender filter
      if (sentSenderFilter !== 'ALL') {
        const cleanSender = formatGasSender(order.metadata?.email_sent_by);
        if (cleanSender !== sentSenderFilter) return false;
      }

      // Search term
      if (!sentSearchTerm.trim()) return true;
      const q = sentSearchTerm.toLowerCase();
      const orderId = (order.transaction_id || '').toLowerCase();
      const buyerEmail = (order.buyer_email || order.fontbuyer?.email || '').toLowerCase();
      const buyerName = (order.fontbuyer?.full_name || order.metadata?.buyer_name || '').toLowerCase();
      const fontName = (order.font_name || '').toLowerCase();
      const sender = formatGasSender(order.metadata?.email_sent_by).toLowerCase();
      return orderId.includes(q) || buyerEmail.includes(q) || buyerName.includes(q) || fontName.includes(q) || sender.includes(q);
    });
  }, [sentOrders, sentSenderFilter, sentSearchTerm]);

  const totalSentPages = Math.ceil(filteredSentOrders.length / sentItemsPerPage) || 1;
  const paginatedSentOrders = useMemo(() => {
    const from = (sentPage - 1) * sentItemsPerPage;
    return filteredSentOrders.slice(from, from + sentItemsPerPage);
  }, [filteredSentOrders, sentPage, sentItemsPerPage]);

  const allSendersList = useMemo(() => {
    const s = new Set<string>();
    sentOrders.forEach(o => {
      if (o.metadata?.email_sent_by) {
        s.add(formatGasSender(o.metadata.email_sent_by));
      }
    });
    return Array.from(s);
  }, [sentOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-vintage-ink/60 font-serif text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-vintage-accent" />
          Consulting Email Studio archives...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-serif text-vintage-ink pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-vintage-ink/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-vintage-ink/5 border border-vintage-ink/30">
              <Mail className="w-6 h-6 text-vintage-ink" />
            </div>
            <div>
              <h1 className="text-3xl font-display uppercase tracking-tight text-vintage-ink flex items-center gap-3">
                Email Studio
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-vintage-ink/30 text-vintage-accent bg-vintage-ink/5">
                  GAS POOL ENGINE
                </span>
              </h1>
              <p className="text-xs text-vintage-ink/70 font-serif italic mt-0.5">
                Design transactional order receipts, manage patron vouchers, and inspect sent dispatch ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Button (visible on template tabs) */}
        {activeTab !== 'sent' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`vintage-btn btn-reverse px-6 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm cursor-pointer transition-all ${
                saveSuccess ? 'bg-green-800 text-vintage-paper border-green-800' : ''
              }`}
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Preserving...' : saveSuccess ? 'Saved to DB!' : 'Save Template'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation: Order Template | Voucher Template | Sent Emails */}
      <div className="flex items-center border-b border-vintage-ink/30 gap-2">
        <button
          onClick={() => setActiveTab('order')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'order'
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5'
              : 'border-transparent text-vintage-ink/60 hover:text-vintage-ink hover:border-vintage-ink/30'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Order Fulfillment Receipt</span>
        </button>

        <button
          onClick={() => setActiveTab('coupon')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'coupon'
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5'
              : 'border-transparent text-vintage-ink/60 hover:text-vintage-ink hover:border-vintage-ink/30'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Privilege Voucher Deal</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('sent');
            fetchSentOrders();
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'sent'
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5'
              : 'border-transparent text-vintage-ink/60 hover:text-vintage-ink hover:border-vintage-ink/30'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Sent Emails (Outbox)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-vintage-ink text-vintage-paper rounded-full">
            {filteredSentOrders.length}
          </span>
        </button>
      </div>

      {/* GAS Relay Pool Quota Monitor */}
      <div className="bg-white/40 border border-vintage-ink/30 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-vintage-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-vintage-ink">
              Universal Email Relay Pool (Google Apps Script)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {gasPool && (
              <div className="text-xs font-mono text-vintage-ink/70">
                Available Today: <strong className="text-vintage-accent font-bold">{gasPool.totalRemaining}</strong> / {gasPool.totalLimit} emails
              </div>
            )}
            <button
              onClick={() => fetchGasPool(true)}
              disabled={checkingGas}
              className="px-2.5 py-1 text-[10px] font-bold uppercase border border-vintage-ink/30 bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper flex items-center gap-1 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${checkingGas ? 'animate-spin' : ''}`} />
              <span>Refresh Quotas</span>
            </button>
          </div>
        </div>

        {gasPool ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gasPool.accounts.map((acc, idx) => (
              <div key={idx} className="bg-white/70 border border-vintage-ink/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-vintage-ink truncate" title={acc.email}>
                      {acc.email}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 border uppercase tracking-wider ${
                      acc.status === 'ONLINE'
                        ? 'bg-green-100 text-green-900 border-green-800'
                        : acc.status === 'NEEDS_AUTH'
                        ? 'bg-rose-100 text-rose-900 border-rose-800'
                        : 'bg-amber-100 text-amber-900 border-amber-800'
                    }`}>
                      {acc.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-vintage-ink/70">
                    Remaining Quota: <strong className="text-vintage-ink font-mono text-xs">{acc.remaining}</strong> / {acc.limit}
                  </div>
                </div>
                <div className="w-full bg-vintage-ink/10 h-1 mt-2.5 overflow-hidden">
                  <div 
                    className="bg-vintage-accent h-1 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (acc.remaining / acc.limit) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-serif italic text-vintage-ink/50 py-2 text-center">
            {checkingGas ? "Querying quota balances..." : "Relay status ready."}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1 & 2: TEMPLATE COMPOSER (STACKING ATAS-BAWAH SEPERTI BROADCAST STUDIO) */}
      {/* ========================================================================= */}
      {activeTab !== 'sent' && (
        <div className="space-y-8">
          
          {/* 1. EMAIL PREVIEW (PLACED PROMINENTLY ON TOP - FULL WIDTH / REALISTIC READING CONTAINER) */}
          <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs uppercase tracking-widest font-black border-b border-vintage-ink pb-3">
              <div className="flex items-center gap-2 text-vintage-ink">
                <Eye size={15} className="text-vintage-accent" />
                <span>Live Email Preview ({activeTab === 'order' ? 'Order Receipt' : 'Patron Voucher'})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-normal opacity-60 hidden sm:inline">Recipient Live View</span>
                <div className="flex items-center border border-vintage-ink/30 p-0.5 bg-vintage-paper">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-vintage-ink text-vintage-paper'
                        : 'text-vintage-ink/60 hover:text-vintage-ink'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-vintage-ink text-vintage-paper'
                        : 'text-vintage-ink/60 hover:text-vintage-ink'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Mobile
                  </button>
                </div>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex justify-center bg-white/20 border border-vintage-ink/30 p-4 sm:p-6 min-h-[640px] overflow-auto">
              <div 
                className={`transition-all duration-300 shadow-xl border border-vintage-ink/30 bg-[#fffdf5] overflow-hidden ${
                  previewDevice === 'desktop' ? 'w-full max-w-[620px]' : 'w-[375px]'
                }`}
              >
                <iframe
                  title="Email Live Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[760px] bg-[#fffdf5]"
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* 2. TEMPLATE CONTROLS & FORM (STACKED UNDERNEATH PREVIEW) */}
          <div className="space-y-6">
            
            {/* Template Fields Card */}
            <div className="bg-white/40 border border-vintage-ink/30 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-vintage-ink/20 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-vintage-accent flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {activeTab === 'order' ? 'Order Template Content & Variables' : 'Voucher Template Content & Variables'}
                </h2>
                <span className="text-[10px] font-mono opacity-60">Editable Configuration</span>
              </div>

              {/* ORDER TEMPLATE CONTROLS */}
              {activeTab === 'order' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70 flex items-center justify-between">
                        <span>Email Subject</span>
                        <span className="text-[9px] font-mono text-vintage-accent">Supports [ORDER_ID]</span>
                      </label>
                      <input
                        type="text"
                        value={orderConfig.subject}
                        onChange={(e) => setOrderConfig({ ...orderConfig, subject: e.target.value })}
                        className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70 flex items-center justify-between">
                        <span>Greeting / Main Heading</span>
                        <span className="text-[9px] font-mono text-vintage-accent">Supports [BUYER_NAME]</span>
                      </label>
                      <input
                        type="text"
                        value={orderConfig.heading}
                        onChange={(e) => setOrderConfig({ ...orderConfig, heading: e.target.value })}
                        className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">
                      Introduction Text
                    </label>
                    <textarea
                      rows={3}
                      value={orderConfig.intro_text}
                      onChange={(e) => setOrderConfig({ ...orderConfig, intro_text: e.target.value })}
                      className="w-full border border-vintage-ink/30 bg-white/60 p-3 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                    />
                  </div>

                  {/* Security Notice Section */}
                  <div className="pt-4 border-t border-vintage-ink/10 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-vintage-ink">
                      <ShieldAlert className="w-4 h-4 text-vintage-accent" />
                      Security & Expiry Notice Box
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">Notice Box Title</label>
                        <input
                          type="text"
                          value={orderConfig.warning_title}
                          onChange={(e) => setOrderConfig({ ...orderConfig, warning_title: e.target.value })}
                          className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">User Vault URL</label>
                        <input
                          type="text"
                          value={orderConfig.vault_url}
                          onChange={(e) => setOrderConfig({ ...orderConfig, vault_url: e.target.value })}
                          className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">Notice Box Message</label>
                      <textarea
                        rows={2}
                        value={orderConfig.warning_text}
                        onChange={(e) => setOrderConfig({ ...orderConfig, warning_text: e.target.value })}
                        className="w-full border border-vintage-ink/30 bg-white/60 p-3 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>
                  </div>

                  {/* Font Canvas VIP Section */}
                  <div className="pt-4 border-t border-vintage-ink/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-vintage-ink">
                        <Layers className="w-4 h-4 text-vintage-accent" />
                        Font Canvas VIP Access
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={orderConfig.canvas_vip_enabled}
                          onChange={(e) => setOrderConfig({ ...orderConfig, canvas_vip_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-vintage-ink/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-vintage-ink/30 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vintage-ink"></div>
                      </label>
                    </div>

                    {orderConfig.canvas_vip_enabled && (
                      <div className="space-y-3 bg-white/60 p-4 border border-vintage-ink/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">VIP Box Heading</label>
                            <input
                              type="text"
                              value={orderConfig.canvas_heading}
                              onChange={(e) => setOrderConfig({ ...orderConfig, canvas_heading: e.target.value })}
                              className="w-full border-b border-vintage-ink/30 py-1.5 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">Font Canvas App URL</label>
                            <input
                              type="text"
                              value={orderConfig.canvas_url}
                              onChange={(e) => setOrderConfig({ ...orderConfig, canvas_url: e.target.value })}
                              className="w-full border-b border-vintage-ink/30 py-1.5 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">VIP Description Text</label>
                          <textarea
                            rows={2}
                            value={orderConfig.canvas_text}
                            onChange={(e) => setOrderConfig({ ...orderConfig, canvas_text: e.target.value })}
                            className="w-full border border-vintage-ink/30 bg-white/60 p-2 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Text */}
                  <div className="pt-4 border-t border-vintage-ink/10 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">
                      Email Footer HTML
                    </label>
                    <textarea
                      rows={2}
                      value={orderConfig.footer_text}
                      onChange={(e) => setOrderConfig({ ...orderConfig, footer_text: e.target.value })}
                      className="w-full border border-vintage-ink/30 bg-white/60 p-3 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* COUPON TEMPLATE CONTROLS */}
              {activeTab === 'coupon' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70 flex items-center justify-between">
                        <span>Email Subject</span>
                        <span className="text-[9px] font-mono text-vintage-accent">Supports [DISCOUNT]</span>
                      </label>
                      <input
                        type="text"
                        value={couponConfig.subject}
                        onChange={(e) => setCouponConfig({ ...couponConfig, subject: e.target.value })}
                        className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70 flex items-center justify-between">
                        <span>Greeting / Main Heading</span>
                        <span className="text-[9px] font-mono text-vintage-accent">Supports [BUYER_NAME]</span>
                      </label>
                      <input
                        type="text"
                        value={couponConfig.heading}
                        onChange={(e) => setCouponConfig({ ...couponConfig, heading: e.target.value })}
                        className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">
                      Introduction Text
                    </label>
                    <textarea
                      rows={3}
                      value={couponConfig.intro_text}
                      onChange={(e) => setCouponConfig({ ...couponConfig, intro_text: e.target.value })}
                      className="w-full border border-vintage-ink/30 bg-white/60 p-3 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">
                        Discount Badge Label
                      </label>
                      <input
                        type="text"
                        value={couponConfig.discount_label}
                        onChange={(e) => setCouponConfig({ ...couponConfig, discount_label: e.target.value })}
                        className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">
                        Call To Action Button Label
                      </label>
                      <input
                        type="text"
                        value={couponConfig.button_text}
                        onChange={(e) => setCouponConfig({ ...couponConfig, button_text: e.target.value })}
                        className="w-full border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-vintage-ink/10 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">
                      Email Footer HTML
                    </label>
                    <textarea
                      rows={2}
                      value={couponConfig.footer_text}
                      onChange={(e) => setCouponConfig({ ...couponConfig, footer_text: e.target.value })}
                      className="w-full border border-vintage-ink/30 bg-white/60 p-3 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Email Dispatch Card */}
            <div className="bg-white/40 border border-vintage-ink/30 p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-vintage-accent flex items-center gap-2">
                <Send className="w-4 h-4" />
                Live Relay Test Dispatch ({activeTab === 'order' ? 'Order Fulfillment' : 'Patron Voucher'})
              </h3>
              <p className="text-xs text-vintage-ink/70 font-serif">
                Dispatch a real test letter using the selected template to verify styling and typography in your email client.
              </p>

              <form onSubmit={handleSendTest} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="your-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 border-b border-vintage-ink/30 py-2 bg-transparent text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="vintage-btn btn-reverse px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{sendingTest ? "Sending..." : "Test Send"}</span>
                  </button>
                </div>

                {testStatus && (
                  <div className={`p-3 text-xs flex items-start gap-2.5 border ${
                    testStatus.success 
                      ? 'bg-green-50 text-green-900 border-green-800' 
                      : 'bg-rose-50 text-rose-900 border-rose-800'
                  }`}>
                    {testStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      {testStatus.success ? (
                        <>
                          <div className="font-bold">Test email successfully dispatched!</div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Sent via: <span className="font-mono font-bold">{testStatus.sender}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold">Test delivery failed:</div>
                          <div className="text-[11px] mt-0.5">{testStatus.error}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: SENT EMAILS / EMAIL TERKIRIM TAB (OUTBOX) */}
      {/* ========================================================================= */}
      {activeTab === 'sent' && (
        <div className="space-y-6">
          
          {/* Top Bar: Search, Filters, Refresh */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/40 border border-vintage-ink/30 p-4 shadow-sm">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by Order ID, Buyer Email, Font Name, or Sender..."
                value={sentSearchTerm}
                onChange={(e) => {
                  setSentSearchTerm(e.target.value);
                  setSentPage(1);
                }}
                className="w-full bg-transparent border-b border-vintage-ink/30 pl-8 pr-4 py-1.5 text-xs font-serif font-bold text-vintage-ink outline-none focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/40"
              />
              <Search className="w-4 h-4 text-vintage-ink/40 absolute left-1 top-1/2 -translate-y-1/2" />
              {sentSearchTerm && (
                <button
                  onClick={() => setSentSearchTerm('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-vintage-ink/50 hover:text-vintage-ink cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter by Sender Gmail */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink/60 whitespace-nowrap">
                  Admin Sender:
                </span>
                <select
                  value={sentSenderFilter}
                  onChange={(e) => {
                    setSentSenderFilter(e.target.value);
                    setSentPage(1);
                  }}
                  className="border border-vintage-ink/30 bg-vintage-paper px-2.5 py-1 text-xs font-mono font-bold text-vintage-ink outline-none cursor-pointer"
                >
                  <option value="ALL">All Senders ({sentOrders.length})</option>
                  {allSendersList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchSentOrders}
                disabled={loadingSent}
                className="vintage-btn btn-reverse px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                title="Reload sent orders ledger"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSent ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-vintage-ink bg-white/40 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[840px]">
              <thead>
                <tr className="bg-vintage-ink/5 border-b border-vintage-ink text-[10px] font-bold tracking-widest text-vintage-ink/60 uppercase">
                  <th className="p-4">Sent Date</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Buyer / Client</th>
                  <th className="p-4">Purchased Font</th>
                  <th className="p-4 text-center">Amount</th>
                  <th className="p-4 text-center">Admin Sender (Gmail)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Live Email Design</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-serif divide-y divide-vintage-ink/10">
                {loadingSent ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center animate-pulse italic opacity-40">
                      Loading Dispatched Email Records...
                    </td>
                  </tr>
                ) : paginatedSentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center opacity-40 italic">
                      {sentSearchTerm ? `No sent emails matching "${sentSearchTerm}"` : "No sent emails recorded in the database yet."}
                    </td>
                  </tr>
                ) : (
                  paginatedSentOrders.map((order) => {
                    const cleanSender = formatGasSender(order.metadata?.email_sent_by);
                    const sentAt = order.metadata?.email_sent_at || order.download_date;
                    const buyerEmail = order.fontbuyer?.email || order.buyer_email || 'N/A';
                    const buyerName = order.fontbuyer?.full_name || order.metadata?.buyer_name || '';

                    return (
                      <tr 
                        key={order.id || order.transaction_id}
                        onClick={() => setSelectedSentOrder(order)}
                        className="hover:bg-vintage-ink/5 transition-colors cursor-pointer group"
                      >
                        {/* Sent Date */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-bold text-vintage-ink">
                            {new Date(sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[9px] font-mono opacity-60">
                            {new Date(sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Order ID */}
                        <td className="p-4 font-mono font-bold text-vintage-accent text-[11px]">
                          #{order.transaction_id ? order.transaction_id.slice(0, 14) : 'N/A'}
                        </td>

                        {/* Buyer */}
                        <td className="p-4">
                          <div className="font-bold text-vintage-ink lowercase truncate max-w-[200px]" title={buyerEmail}>
                            {buyerEmail}
                          </div>
                          {buyerName && (
                            <div className="text-[10px] text-vintage-ink/60 truncate max-w-[200px]">
                              {buyerName}
                            </div>
                          )}
                        </td>

                        {/* Font & Tier */}
                        <td className="p-4">
                          <div className="font-display font-bold text-base text-vintage-ink">
                            {order.fonts?.name || order.font_name || 'Font Specimen'}
                          </div>
                          <div className="text-[9px] font-mono uppercase opacity-70">
                            {order.tier ? (MASTER_TIER_LABELS[order.tier.toLowerCase()]?.solo || order.tier) : 'Commercial License'}
                          </div>
                        </td>

                        {/* Valuation */}
                        <td className="p-4 text-center font-mono font-bold text-vintage-ink">
                          ${order.metadata?.price_at_purchase ?? (order.download_type === 'trial' ? '0' : '—')}
                        </td>

                        {/* Sender Account */}
                        <td className="p-4 text-center">
                          <span 
                            className="inline-block px-2.5 py-1 text-[10px] font-mono font-bold border border-vintage-ink/30 bg-white/70 text-vintage-ink max-w-[170px] truncate"
                            title={cleanSender}
                          >
                            {cleanSender}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[8px] font-bold border border-green-800 bg-green-100 text-green-900 uppercase tracking-widest">
                            <Check size={10} /> SENT
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedSentOrder(order)}
                              title="View full personalized live email layout"
                              className="px-2.5 py-1 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                              <Eye size={12} />
                              <span>View Email</span>
                            </button>

                            <button
                              onClick={(e) => handleResendSentEmail(order, e)}
                              disabled={resendingOrderId === order.transaction_id}
                              title="Resend this delivery email to buyer"
                              className="px-2 py-1 border border-vintage-ink/30 bg-white hover:border-vintage-ink text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                            >
                              <Mail size={11} className={resendingOrderId === order.transaction_id ? 'animate-spin' : ''} />
                              <span>{resendingOrderId === order.transaction_id ? '...' : 'Resend'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {filteredSentOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono pt-2">
              <div className="text-vintage-ink/60">
                Showing <strong className="text-vintage-ink">{(sentPage - 1) * sentItemsPerPage + 1}</strong> to{' '}
                <strong className="text-vintage-ink">{Math.min(sentPage * sentItemsPerPage, filteredSentOrders.length)}</strong> of{' '}
                <strong className="text-vintage-ink">{filteredSentOrders.length}</strong> sent emails
              </div>

              {totalSentPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSentPage(p => Math.max(1, p - 1))}
                    disabled={sentPage === 1}
                    className="p-1.5 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-30 cursor-pointer transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalSentPages }, (_, i) => i + 1).map((pg) => {
                    // Show limited pages if many
                    if (totalSentPages > 7 && Math.abs(pg - sentPage) > 2 && pg !== 1 && pg !== totalSentPages) {
                      if (Math.abs(pg - sentPage) === 3) return <span key={pg} className="px-1">...</span>;
                      return null;
                    }
                    return (
                      <button
                        key={pg}
                        onClick={() => setSentPage(pg)}
                        className={`w-7 h-7 text-xs font-bold border transition-all cursor-pointer ${
                          sentPage === pg
                            ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                            : 'bg-vintage-paper border-vintage-ink/40 text-vintage-ink hover:border-vintage-ink'
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setSentPage(p => Math.min(totalSentPages, p + 1))}
                    disabled={sentPage === totalSentPages}
                    className="p-1.5 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-30 cursor-pointer transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIVE DESIGN EMAIL PREVIEW WITH BUYER INFO */}
      {/* ========================================================================= */}
      {selectedSentOrder && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-vintage-paper border-2 border-vintage-ink shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b-2 border-vintage-ink bg-vintage-ink text-vintage-paper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-vintage-accent text-vintage-paper font-bold">
                    DISPATCHED EMAIL
                  </span>
                  <span className="font-mono text-xs font-bold tracking-wider">
                    #{selectedSentOrder.transaction_id}
                  </span>
                </div>
                <div className="text-xs font-serif mt-1 opacity-90 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Buyer: <strong>{selectedSentOrder.fontbuyer?.email || selectedSentOrder.buyer_email}</strong></span>
                  {selectedSentOrder.fontbuyer?.full_name && (
                    <span>({selectedSentOrder.fontbuyer?.full_name})</span>
                  )}
                  <span>•</span>
                  <span>Dispatched via: <strong>{formatGasSender(selectedSentOrder.metadata?.email_sent_by)}</strong></span>
                </div>
              </div>

              {/* View Controls & Close */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center border border-vintage-paper/40 p-0.5 bg-vintage-paper/10">
                  <button
                    type="button"
                    onClick={() => setModalPreviewDevice('desktop')}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold transition-all cursor-pointer ${
                      modalPreviewDevice === 'desktop'
                        ? 'bg-vintage-paper text-vintage-ink'
                        : 'text-vintage-paper/70 hover:text-vintage-paper'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPreviewDevice('mobile')}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold transition-all cursor-pointer ${
                      modalPreviewDevice === 'mobile'
                        ? 'bg-vintage-paper text-vintage-ink'
                        : 'text-vintage-paper/70 hover:text-vintage-paper'
                    }`}
                  >
                    Mobile
                  </button>
                </div>

                <button
                  onClick={() => handleResendSentEmail(selectedSentOrder)}
                  disabled={resendingOrderId === selectedSentOrder.transaction_id}
                  className="px-3 py-1.5 bg-vintage-accent hover:bg-vintage-accent/80 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Resend this exact email to buyer"
                >
                  <Send size={12} className={resendingOrderId === selectedSentOrder.transaction_id ? 'animate-spin' : ''} />
                  <span>{resendingOrderId === selectedSentOrder.transaction_id ? 'Sending...' : 'Resend Email'}</span>
                </button>

                <button
                  onClick={() => setSelectedSentOrder(null)}
                  className="p-1.5 hover:bg-vintage-paper/20 rounded transition-colors text-vintage-paper cursor-pointer"
                  title="Close viewer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Authentic Email Iframe */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-white/20 flex justify-center min-h-[500px]">
              <div 
                className={`transition-all duration-300 shadow-xl border border-vintage-ink/30 bg-[#fffdf5] overflow-hidden ${
                  modalPreviewDevice === 'desktop' ? 'w-full max-w-[620px]' : 'w-[375px]'
                }`}
              >
                <iframe
                  title="Dispatched Email Viewer"
                  srcDoc={generateSentEmailHtml(selectedSentOrder)}
                  className="w-full h-[720px] bg-[#fffdf5]"
                  style={{ border: 'none' }}
                />
              </div>
            </div>

            {/* Modal Footer info */}
            <div className="p-3 border-t border-vintage-ink/20 bg-vintage-paper/80 text-[10px] font-mono text-vintage-ink/60 flex items-center justify-between">
              <div>
                Typeface: <strong className="text-vintage-ink">{selectedSentOrder.fonts?.name || selectedSentOrder.font_name}</strong> •{' '}
                Tier: <strong className="text-vintage-ink">{selectedSentOrder.tier || 'Commercial'}</strong> •{' '}
                Price: <strong className="text-vintage-ink">${selectedSentOrder.metadata?.price_at_purchase || 0}</strong>
              </div>
              <button
                onClick={() => setSelectedSentOrder(null)}
                className="text-vintage-ink font-bold hover:underline cursor-pointer uppercase tracking-wider"
              >
                Close Viewer ✕
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
