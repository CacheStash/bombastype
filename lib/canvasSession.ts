import { supabase } from './supabase';

/**
 * Appends current active auth session tokens as a client-side URL hash fragment.
 * Using URL fragment (#access_token=...&refresh_token=...) ensures:
 * 1. Tokens are NEVER transmitted over HTTP request headers or logged in server/CDN logs.
 * 2. Instant client-side consumption by FontCanvas with zero quota usage.
 * 3. Sanitized immediately upon load via window.history.replaceState in FontCanvas.
 */
export async function getCanvasUrlWithSession(baseUrl: string): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const hashParams = new URLSearchParams();
      hashParams.set('access_token', session.access_token);
      if (session.refresh_token) {
        hashParams.set('refresh_token', session.refresh_token);
      }
      
      const separator = baseUrl.includes('#') ? '&' : '#';
      return `${baseUrl}${separator}${hashParams.toString()}`;
    }
  } catch (err) {
    console.warn('Could not attach session to Canvas URL:', err);
  }
  return baseUrl;
}

/**
 * Opens FontCanvas in a new tab, seamlessly passing session credentials if logged in.
 */
export async function openCanvasWithSession(baseUrl: string = 'https://canvas.bombastype.com'): Promise<void> {
  const targetUrl = await getCanvasUrlWithSession(baseUrl);
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
