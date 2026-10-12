import { supabase } from './supabase';

const METRIC_SYNC_SECRET = 'Subqi_Bombastype_Metric_Sync_Secure_2026';

function generateMetricSignature(ts: number): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  const str = `${ts}:${METRIC_SYNC_SECRET}:buffer_matrix`;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ code, 2246822507);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 1597334677) ^ Math.imul(h1 ^ (h1 >>> 13), 2654435761);
  return (Math.abs(h1) * 4294967296 + Math.abs(h2)).toString(36);
}

export function createMetricSyncTicket(): string {
  const ts = Date.now();
  const sig = generateMetricSignature(ts);
  return `${ts}_${sig}`;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return false;
    const { data } = await supabase
      .from('fontadmin')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function getFontopsyUrlWithAuth(baseUrl: string = 'https://fontopsy.bombastype.com'): Promise<string> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return baseUrl;
  }
  const ticket = createMetricSyncTicket();
  const url = new URL(baseUrl);
  url.searchParams.set('metrics_sync', ticket);
  return url.toString();
}

export async function openFontopsyWithAuth(baseUrl: string = 'https://fontopsy.bombastype.com'): Promise<void> {
  const targetUrl = await getFontopsyUrlWithAuth(baseUrl);
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
