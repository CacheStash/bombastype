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
  Tag
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

export default function EmailStudio() {
  const [activeTab, setActiveTab] = useState<'order' | 'coupon'>('order');
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

  const fetchGasPool = async () => {
    setCheckingGas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/gas-status', {
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

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Order template
      const resOrder = await fetch('/api/admin/email-template?type=order', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (resOrder.ok) {
        const data = await resOrder.json();
        if (data.template) setOrderConfig({ ...DEFAULT_ORDER_CONFIG, ...data.template });
      }

      // 2. Fetch Coupon template
      const resCoupon = await fetch('/api/admin/email-template?type=coupon', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (resCoupon.ok) {
        const data = await resCoupon.json();
        if (data.template) setCouponConfig({ ...DEFAULT_COUPON_CONFIG, ...data.template });
      }
    } catch (err) {
      console.error("Failed to load email templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchGasPool();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const isOrder = activeTab === 'order';
      const res = await fetch(`/api/admin/email-template?type=${activeTab}`, {
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
      fetchGasPool(); // Refresh live quota after send
    } catch (err: any) {
      setTestStatus({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  // Live HTML Generation for Preview (Authentic BombasType Warm Vintage Letterpress Paper)
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
            <td style="padding: 22px 28px 12px 28px;">
              <div style="background-color: #ffffff; border: 2px dashed #2c241a; padding: 22px 18px; text-align: center;">
                <div style="color: #8b6b4a; font-family: 'Playfair Display', Georgia, serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 6px;">${couponConfig.discount_label || DEFAULT_COUPON_CONFIG.discount_label}</div>
                <div style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 40px; font-weight: 900; letter-spacing: -0.02em; line-height: 1;">${dummyDiscount}</div>
                <div style="margin-top: 14px;">
                  <span style="display: inline-block; background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 8px 20px; font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 0.2em;">${dummyCode}</span>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px 28px 18px 28px;">
              <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 14px 18px; font-size: 12px; line-height: 2;">
                <div style="margin-bottom: 4px;"><span style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #2c241a;">EXPIRY</span> <strong style="color: #2c241a;">VALID UNTIL:</strong> <span style="font-weight: 700; color: #4a3c2c;">${dummyValid}</span></div>
                <div style="margin-bottom: 4px;"><span style="display: inline-block; background-color: #fdf6e3; color: #2c241a; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #2c241a;">LIMIT</span> <strong style="color: #2c241a;">USAGE LIMIT:</strong> <span style="font-weight: 700; color: #4a3c2c;">${dummyLimit}</span></div>
                <div><span style="display: inline-block; background-color: #8b6b4a; color: #fffdf5; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #8b6b4a;">TIER</span> <strong style="color: #2c241a;">APPLIES TO:</strong> <span style="font-weight: 700; color: #8b6b4a;">All Commercial Font Licenses & Bundles</span></div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 28px 24px 28px; text-align: center;">
              <a href="#" onclick="return false;" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 11px; text-decoration: none; padding: 13px 26px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.15em;">${couponConfig.button_text || DEFAULT_COUPON_CONFIG.button_text}</a>
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

    // ORDER FULFILLMENT PREVIEW
    const dummyOrderId = "BT-8291A";
    const dummyBuyerName = "Alexander Wright";
    const dummyBuyerEmail = testEmail || "buyer.sample@example.com";

    const heading = (orderConfig.heading || DEFAULT_ORDER_CONFIG.heading)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const introText = (orderConfig.intro_text || DEFAULT_ORDER_CONFIG.intro_text)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const warningText = (orderConfig.warning_text || DEFAULT_ORDER_CONFIG.warning_text)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const sampleItems = [
      { name: "Briswood Vintage Regular", tier: "SOLO (1 USER ONLY)" },
      { name: "Briswood Chromatic Layer Pack (5 Styles)", tier: "STUDIO (UP TO 50 USERS)" }
    ];

    const itemsHtml = sampleItems.map(item => `
      <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 18px 20px; margin-bottom: 12px;">
        <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700; color: #2c241a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">${item.name}</div>
        <div style="font-size: 11px; color: #6b5c4d; margin-bottom: 14px;">
          LICENSE TIER: <strong style="background-color: #fdf6e3; color: #2c241a; border: 1px solid #2c241a; padding: 2px 7px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">${item.tier}</strong>
        </div>
        <a href="#" onclick="return false;" style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 11px; text-decoration: none; padding: 10px 20px; border: 1px solid #2c241a; text-transform: uppercase; letter-spacing: 0.12em;">Download Font & License (.ZIP)</a>
      </div>
    `).join("");

    const canvasHtml = orderConfig.canvas_vip_enabled ? `
      <tr>
        <td style="padding: 0 28px 20px 28px;">
          <div style="background-color: #fffdf5; border: 1px solid #8b6b4a; padding: 20px;">
            <div style="margin-bottom: 10px;">
              <span style="background-color: #8b6b4a; color: #fffdf5; font-size: 9px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; letter-spacing: 0.15em; display: inline-block;">VIP BONUS</span>
              <span style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 8px; display: inline-block; vertical-align: middle;">${orderConfig.canvas_heading}</span>
            </div>
            <p style="font-family: 'EB Garamond', Georgia, serif; font-size: 13px; color: #4a3c2c; margin: 8px 0 14px 0; line-height: 1.5;">
              ${orderConfig.canvas_text}
            </p>

            <div style="background-color: #ffffff; border: 1px solid #2c241a; padding: 12px 16px; margin-bottom: 14px; font-size: 12px; line-height: 1.9;">
              <div style="margin-bottom: 3px;">
                <span style="display: inline-block; background-color: #2c241a; color: #fdf6e3; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #2c241a;">URL</span>
                <strong style="color: #2c241a;">APP URL:</strong> <a href="${orderConfig.canvas_url}" style="color: #8b6b4a; font-weight: 700; text-decoration: underline;">${orderConfig.canvas_url}</a>
              </div>
              <div style="margin-bottom: 3px;">
                <span style="display: inline-block; background-color: #fdf6e3; color: #2c241a; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #4a3c2c;">USER</span>
                <strong style="color: #2c241a;">USERNAME:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a; background-color: #fdf6e3; padding: 2px 6px; border: 1px solid #2c241a;">${dummyBuyerEmail}</span>
              </div>
              <div>
                <span style="display: inline-block; background-color: #8b6b4a; color: #fffdf5; font-family: monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #8b6b4a;">PASS</span>
                <strong style="color: #2c241a;">PASSWORD:</strong> <span style="font-family: monospace; font-weight: 700; color: #2c241a; background-color: #fdf6e3; padding: 2px 6px; border: 1px solid #2c241a;">${dummyOrderId}</span>
              </div>
            </div>

            <div style="font-family: 'EB Garamond', Georgia, serif; font-size: 12px; color: #4a3c2c; line-height: 1.6;">
              <strong style="font-family: 'Playfair Display', Georgia, serif; color: #2c241a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Your VIP Privileges:</strong>
              <ul style="margin: 4px 0 0 0; padding-left: 18px; color: #4a3c2c;">
                <li><strong style="color: #2c241a;">Purchased Fonts Unlocked:</strong> Activated in your canvas library.</li>
                <li><strong style="color: #2c241a;">Bonus Extras & Dingbats:</strong> Access to ornaments and dingbats catalog-wide.</li>
                <li><strong style="color: #2c241a;">Full Pro Tools:</strong> High-res export, canvas saving, and SVG generation unlocked.</li>
              </ul>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-vintage-ink/60 font-serif text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-vintage-accent" />
          Loading Email Studio configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-serif text-vintage-ink">
      
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
                  v2.0 Universal
                </span>
              </h1>
              <p className="text-xs text-vintage-ink/70 font-serif italic mt-0.5">
                Customize order fulfillment emails & patron vouchers, preview vintage letterpress layout, and monitor relay quota.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchGasPool}
            disabled={checkingGas}
            className="vintage-btn flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider"
            title="Refresh quota status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingGas ? 'animate-spin text-vintage-accent' : ''}`} />
            Refresh Quota
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`vintage-btn btn-reverse flex items-center gap-2 px-6 py-2 text-xs font-bold uppercase tracking-widest ${
              saveSuccess ? '!bg-green-800 !text-white !border-green-800' : ''
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saveSuccess ? 'Saved to DB!' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Template Mode Tabs (Order Fulfillment vs Patron Coupon Voucher) */}
      <div className="flex border-b border-vintage-ink/20 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('order')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'order'
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5'
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink hover:bg-vintage-ink/5'
          }`}
        >
          <Mail className="w-4 h-4" />
          Order Fulfillment Email
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('coupon')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'coupon'
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5'
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink hover:bg-vintage-ink/5'
          }`}
        >
          <Tag className="w-4 h-4" />
          Patron Gift Voucher Email
        </button>
      </div>

      {/* GAS Relay Pool Quota Monitor */}
      <div className="bg-white/40 border border-vintage-ink/30 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-vintage-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-vintage-ink">
              Universal Email Relay Pool (Google Apps Script)
            </h3>
          </div>
          {gasPool && (
            <div className="text-xs font-mono text-vintage-ink/70">
              Total Quota Available: <strong className="text-vintage-accent font-bold">{gasPool.totalRemaining}</strong> / {gasPool.totalLimit} emails/day
            </div>
          )}
        </div>

        {gasPool ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gasPool.accounts.map((acc, idx) => (
              <div 
                key={idx} 
                className="bg-white/70 border border-vintage-ink/20 p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-vintage-ink truncate">
                      {acc.email}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 border uppercase tracking-wider ${
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

                <div className="w-full bg-vintage-ink/10 h-1.5 mt-3 overflow-hidden">
                  <div 
                    className="bg-vintage-accent h-1.5 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (acc.remaining / acc.limit) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-serif italic text-vintage-ink/50 py-3 text-center">
            {checkingGas ? "Querying quota balances..." : "Click 'Refresh Quota' to view relay account balances."}
          </div>
        )}
      </div>

      {/* Main Split Grid: Editor & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls & Template Fields (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/40 border border-vintage-ink/30 p-6 space-y-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-vintage-accent flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {activeTab === 'order' ? 'Order Template Content & Variables' : 'Voucher Template Content & Variables'}
            </h2>

            {/* ORDER TEMPLATE CONTROLS */}
            {activeTab === 'order' && (
              <>
                {/* Subject Field */}
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

                {/* Heading Field */}
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

                {/* Intro Text */}
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">Notice Box Message</label>
                    <textarea
                      rows={3}
                      value={orderConfig.warning_text}
                      onChange={(e) => setOrderConfig({ ...orderConfig, warning_text: e.target.value })}
                      className="w-full border border-vintage-ink/30 bg-white/60 p-3 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
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
                    <div className="space-y-3 bg-white/60 p-3.5 border border-vintage-ink/20">
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
                        <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70">VIP Description Text</label>
                        <textarea
                          rows={2}
                          value={orderConfig.canvas_text}
                          onChange={(e) => setOrderConfig({ ...orderConfig, canvas_text: e.target.value })}
                          className="w-full border border-vintage-ink/30 bg-white/60 p-2 text-xs font-serif text-vintage-ink outline-none focus:border-vintage-ink transition-colors"
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
              </>
            )}

            {/* COUPON TEMPLATE CONTROLS */}
            {activeTab === 'coupon' && (
              <>
                {/* Subject Field */}
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

                {/* Heading Field */}
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

                {/* Intro Text */}
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

                {/* Discount Label */}
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

                {/* Button Text */}
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

                {/* Footer Text */}
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
              </>
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
              <div className="flex gap-2">
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
                  className="vintage-btn btn-reverse px-5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingTest ? "Sending..." : "Test Send"}
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

        {/* RIGHT COLUMN: Live Interactive Device Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-vintage-ink/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-vintage-ink">
              <Monitor className="w-4 h-4 text-vintage-accent" />
              Live Visual Preview ({activeTab === 'order' ? 'Order Receipt' : 'Patron Voucher'})
            </div>

            <div className="flex items-center border border-vintage-ink/30 p-0.5 bg-vintage-paper">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all ${
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

          {/* Iframe Viewport */}
          <div className="bg-white/20 border border-vintage-ink/30 p-4 flex justify-center min-h-[720px] overflow-auto shadow-sm">
            <div 
              className={`transition-all duration-300 shadow-xl border border-vintage-ink/30 bg-[#fffdf5] overflow-hidden ${
                previewDevice === 'desktop' ? 'w-full max-w-[600px]' : 'w-[375px]'
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

      </div>
    </div>
  );
}
