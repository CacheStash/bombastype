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
  ExternalLink,
  Layers,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmailTemplateConfig {
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

const DEFAULT_CONFIG: EmailTemplateConfig = {
  subject: "Your Font License Order #[ORDER_ID] is Ready — BombasType",
  heading: "Thank you for your purchase, [BUYER_NAME]!",
  intro_text: "Your commercial font packages and license certificates are prepared below. Keep your Order ID safe as proof of your licensed usage rights.",
  warning_title: "Security & Direct Download Notice",
  warning_text: "Direct download packages are active for 7 days or up to 7 downloads to safeguard our intellectual property against link sharing. You may also access your typography library permanently anytime inside your User Vault.",
  vault_url: "https://bombastype.com/user/auth",
  canvas_vip_enabled: true,
  canvas_url: "https://canvas.subqi.com",
  canvas_heading: "Font Canvas VIP Access Unlocked!",
  canvas_text: "As our verified commercial font licensee, you receive complimentary VIP access to Font Canvas — our web-based typography creator app:",
  footer_text: "Questions or licensing assistance? Reply directly to this email.<br>© BombasType Studio. All rights reserved."
};

export default function EmailStudio() {
  const [config, setConfig] = useState<EmailTemplateConfig>(DEFAULT_CONFIG);
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

  useEffect(() => {
    fetchTemplate();
    fetchGasPool();
  }, []);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/email-template', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setConfig({ ...DEFAULT_CONFIG, ...data.template });
        }
      }
    } catch (err) {
      console.error("Failed to load email template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const res = await fetch('/api/admin/email-template', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ template: config })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save template");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      alert("Please provide a valid email address");
      return;
    }

    setSendingTest(true);
    setTestStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetEmail: testEmail.trim(),
          templateConfig: config
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch test email");
      }

      setTestStatus({ success: true, sender: data.sender });
      fetchGasPool(); // Refresh live quota after test send
    } catch (err: any) {
      setTestStatus({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  // Live HTML Generation for Preview (Bombastype Dark Luxury Style)
  const previewHtml = useMemo(() => {
    const dummyOrderId = "BT-8291A";
    const dummyBuyerName = "Alexander Wright";
    const dummyBuyerEmail = testEmail || "buyer.sample@example.com";

    const heading = (config.heading || DEFAULT_CONFIG.heading)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const introText = (config.intro_text || DEFAULT_CONFIG.intro_text)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const warningText = (config.warning_text || DEFAULT_CONFIG.warning_text)
      .replace(/\[BUYER_NAME\]/g, dummyBuyerName)
      .replace(/\[ORDER_ID\]/g, dummyOrderId);

    const sampleItems = [
      { name: "Briswood Vintage Regular", tier: "SOLO (1 USER ONLY)" },
      { name: "Briswood Chromatic Layer Pack (5 Styles)", tier: "STUDIO (UP TO 50 USERS)" }
    ];

    const itemsHtml = sampleItems.map(item => `
      <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 4px; padding: 20px; margin-bottom: 14px;">
        <div style="font-size: 18px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: -0.01em; margin-bottom: 6px;">${item.name}</div>
        <div style="font-size: 12px; color: #a1a1aa; margin-bottom: 16px;">
          LICENSE TIER: <strong style="background-color: #27272a; color: #f59e0b; border: 1px solid #3f3f46; border-radius: 2px; padding: 3px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">${item.tier}</strong>
        </div>
        <a href="#" onclick="return false;" style="display: inline-block; background-color: #f59e0b; color: #09090b; font-weight: 900; font-size: 12px; text-decoration: none; padding: 12px 24px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">Download Font & License (.ZIP)</a>
      </div>
    `).join("");

    const canvasHtml = config.canvas_vip_enabled ? `
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <div style="background-color: #141418; border: 1px solid #d97706; border-radius: 4px; padding: 22px;">
            <div style="margin-bottom: 12px;">
              <span style="background-color: #d97706; color: #ffffff; font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block;">VIP BONUS</span>
              <span style="color: #ffffff; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; margin-left: 8px; display: inline-block; vertical-align: middle;">${config.canvas_heading}</span>
            </div>
            <p style="font-size: 13px; color: #a1a1aa; margin: 8px 0 16px 0; line-height: 1.5; font-weight: 500;">
              ${config.canvas_text}
            </p>

            <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 4px; padding: 14px 16px; margin-bottom: 16px; font-size: 13px; line-height: 2;">
              <div style="margin-bottom: 4px;">
                <span style="display: inline-block; background-color: #27272a; color: #f59e0b; font-family: monospace; font-size: 9px; font-weight: 900; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #3f3f46; border-radius: 2px;">URL</span>
                <strong style="color: #ffffff;">APP URL:</strong> <a href="${config.canvas_url}" style="color: #f59e0b; font-weight: 800; text-decoration: underline;">${config.canvas_url}</a>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="display: inline-block; background-color: #27272a; color: #ffffff; font-family: monospace; font-size: 9px; font-weight: 900; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #3f3f46; border-radius: 2px;">USER</span>
                <strong style="color: #ffffff;">USERNAME:</strong> <span style="font-family: monospace; font-weight: 800; color: #ffffff; background-color: #18181b; padding: 2px 6px; border: 1px solid #27272a; border-radius: 2px;">${dummyBuyerEmail}</span>
              </div>
              <div>
                <span style="display: inline-block; background-color: #d97706; color: #ffffff; font-family: monospace; font-size: 9px; font-weight: 900; padding: 2px 6px; margin-right: 8px; vertical-align: middle; border: 1px solid #f59e0b; border-radius: 2px;">PASS</span>
                <strong style="color: #ffffff;">PASSWORD:</strong> <span style="font-family: monospace; font-weight: 800; color: #ffffff; background-color: #18181b; padding: 2px 6px; border: 1px solid #27272a; border-radius: 2px;">${dummyOrderId}</span>
              </div>
            </div>

            <div style="font-size: 12px; color: #a1a1aa; line-height: 1.6; font-weight: 500;">
              <strong style="color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">Your VIP Privileges:</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 18px; color: #a1a1aa;">
                <li><strong style="color: #e4e4e7;">Purchased Fonts Unlocked:</strong> All fonts in this order are automatically activated in your Canvas suite.</li>
                <li><strong style="color: #e4e4e7;">Bonus Extras & Dingbats:</strong> Free access to exclusive ornaments and dingbats catalog-wide.</li>
                <li><strong style="color: #e4e4e7;">Full Pro Tools:</strong> High-res export, canvas saving, and SVG generation completely unlocked.</li>
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
<body style="margin: 0; padding: 24px 12px; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7; line-height: 1.5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #121215; border: 1px solid #27272a; border-radius: 6px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); text-align: left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 28px 28px 20px 28px; border-bottom: 1px solid #27272a; background-color: #121215;">
              <span style="display: inline-block; background-color: #f59e0b; color: #09090b; font-family: monospace; font-size: 11px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; margin-bottom: 12px;">BOMBASTYPE™</span>
              <div style="color: #f59e0b; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px;">ORDER #${dummyOrderId}</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; line-height: 1.2;">${heading}</h1>
              <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 13px; font-weight: 500; line-height: 1.6;">${introText}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px 12px 28px;">
              <div style="font-size: 11px; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">PURCHASED FONT ASSETS</div>
              ${itemsHtml}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 28px 20px 28px;">
              <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 4px; padding: 18px 20px;">
                <div style="margin-bottom: 6px;">
                  <strong style="color: #f59e0b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 900;">⚠️ ${config.warning_title || DEFAULT_CONFIG.warning_title}</strong>
                </div>
                <p style="margin: 0; color: #a1a1aa; font-size: 12px; font-weight: 500; line-height: 1.6;">
                  ${warningText}
                </p>
                <div style="margin-top: 12px;">
                  <a href="${config.vault_url || DEFAULT_CONFIG.vault_url}" style="display: inline-block; background-color: #27272a; color: #f59e0b; border: 1px solid #3f3f46; border-radius: 2px; padding: 6px 14px; font-size: 11px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">Open User Vault (Lifetime Access) →</a>
                </div>
              </div>
            </td>
          </tr>

          ${canvasHtml}

          <tr>
            <td style="padding: 20px 28px; border-top: 1px solid #27272a; background-color: #09090b; text-align: center; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.6;">
              ${config.footer_text || DEFAULT_CONFIG.footer_text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [config, testEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-zinc-400 font-mono text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          Loading Email Studio configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded">
              <Mail className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Email Studio
                <span className="text-xs font-mono font-normal px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                  v2.0 Universal
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Customize order fulfillment emails, live dark luxury preview, and monitor relay quota.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchGasPool}
            disabled={checkingGas}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition-all"
            title="Refresh quota status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingGas ? 'animate-spin text-amber-500' : ''}`} />
            Refresh Quota
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider rounded transition-all ${
              saveSuccess 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' 
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-950/30'
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

      {/* GAS Relay Pool Quota Monitor */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Universal Email Relay Pool (Google Apps Script)
            </h3>
          </div>
          {gasPool && (
            <div className="text-xs font-mono text-zinc-400">
              Total Quota Available: <strong className="text-amber-400">{gasPool.totalRemaining}</strong> / {gasPool.totalLimit} emails/day
            </div>
          )}
        </div>

        {gasPool ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gasPool.accounts.map((acc, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-950 border border-zinc-800/80 rounded p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-zinc-200 truncate">
                      {acc.email}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      acc.status === 'ONLINE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : acc.status === 'NEEDS_AUTH'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {acc.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Remaining Quota: <strong className="text-white text-xs">{acc.remaining}</strong> / {acc.limit}
                  </div>
                </div>

                <div className="w-full bg-zinc-800/50 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (acc.remaining / acc.limit) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-mono text-zinc-500 py-3 text-center">
            {checkingGas ? "Querying quota balances..." : "Click 'Refresh Quota' to view relay account balances."}
          </div>
        )}
      </div>

      {/* Main Split Grid: Editor & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls & Template Fields (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Template Content & Variables
            </h2>

            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-300 flex items-center justify-between">
                <span>Email Subject</span>
                <span className="text-[10px] font-mono text-zinc-500">Supports [ORDER_ID]</span>
              </label>
              <input
                type="text"
                value={config.subject}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Heading Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-300 flex items-center justify-between">
                <span>Greeting / Main Heading</span>
                <span className="text-[10px] font-mono text-zinc-500">Supports [BUYER_NAME]</span>
              </label>
              <input
                type="text"
                value={config.heading}
                onChange={(e) => setConfig({ ...config, heading: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Intro Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-300">
                Introduction Text
              </label>
              <textarea
                rows={3}
                value={config.intro_text}
                onChange={(e) => setConfig({ ...config, intro_text: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Security Notice Section */}
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Security & Expiry Notice Box
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400">Notice Box Title</label>
                <input
                  type="text"
                  value={config.warning_title}
                  onChange={(e) => setConfig({ ...config, warning_title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400">Notice Box Message</label>
                <textarea
                  rows={3}
                  value={config.warning_text}
                  onChange={(e) => setConfig({ ...config, warning_text: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400">User Vault URL</label>
                <input
                  type="text"
                  value={config.vault_url}
                  onChange={(e) => setConfig({ ...config, vault_url: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Font Canvas VIP Section */}
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Font Canvas VIP Access
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.canvas_vip_enabled}
                    onChange={(e) => setConfig({ ...config, canvas_vip_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {config.canvas_vip_enabled && (
                <div className="space-y-3 bg-zinc-950/60 p-3.5 rounded border border-zinc-800/80">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-zinc-400">VIP Box Heading</label>
                    <input
                      type="text"
                      value={config.canvas_heading}
                      onChange={(e) => setConfig({ ...config, canvas_heading: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-zinc-400">VIP Description Text</label>
                    <textarea
                      rows={2}
                      value={config.canvas_text}
                      onChange={(e) => setConfig({ ...config, canvas_text: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-zinc-400">Font Canvas App URL</label>
                    <input
                      type="text"
                      value={config.canvas_url}
                      onChange={(e) => setConfig({ ...config, canvas_url: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Text */}
            <div className="pt-4 border-t border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-300">
                Email Footer HTML
              </label>
              <textarea
                rows={2}
                value={config.footer_text}
                onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Test Email Dispatch Card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Live Relay Test Dispatch
            </h3>
            <p className="text-xs text-zinc-400">
              Send a real sample email using the current template to test delivery and styling in your inbox.
            </p>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="your-email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingTest ? "Sending..." : "Test Send"}
                </button>
              </div>

              {testStatus && (
                <div className={`p-3 rounded text-xs flex items-start gap-2.5 ${
                  testStatus.success 
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60' 
                    : 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
                }`}>
                  {testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    {testStatus.success ? (
                      <>
                        <div className="font-bold">Test email successfully dispatched!</div>
                        <div className="text-[11px] text-emerald-400/80 mt-0.5">
                          Sent via: <span className="font-mono">{testStatus.sender}</span>
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
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <Monitor className="w-4 h-4 text-amber-500" />
              Live Visual Preview
            </div>

            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-1">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-all ${
                  previewDevice === 'desktop'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-all ${
                  previewDevice === 'mobile'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex justify-center min-h-[720px] overflow-auto">
            <div 
              className={`transition-all duration-300 shadow-2xl rounded overflow-hidden border border-zinc-800 ${
                previewDevice === 'desktop' ? 'w-full max-w-[620px]' : 'w-[375px]'
              }`}
            >
              <iframe
                title="Email Live Preview"
                srcDoc={previewHtml}
                className="w-full h-[760px] bg-[#09090b]"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
