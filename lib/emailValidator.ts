/**
 * 100% Free Client-Side Email & Mailbox Domain Validator
 * Uses Google Public DNS over HTTPS (DoH - CORS Enabled) to verify real MX records.
 */

interface GoogleDnsResponse {
  Status: number; // 0 = NOERROR (Domain exists), 3 = NXDOMAIN (Domain does not exist)
  Answer?: Array<{
    name: string;
    type: number; // Type 15 is MX
    TTL: number;
    data: string;
  }>;
}

const BLOCKED_DOMAINS = new Set([
  'bla.com', 'test.com', 'example.com', 'asdf.com', 'sample.com', 'fake.com',
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'yopmail.com', 'throwawaymail.com', 'getairmail.com', 'dispostable.com',
  'trashmail.com', 'sharklasers.com', 'nada.ltd', 'mohmal.com', 'mytemp.email',
  'burnermail.io', 'inboxkitten.com', 'crazymailing.com', 'dropmail.me'
]);

export async function validateLegitEmail(email: string): Promise<{ isValid: boolean; message?: string }> {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Strict Syntax Check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, message: 'INVALID EMAIL FORMAT' };
  }

  const [username, domain] = cleanEmail.split('@');
  if (!domain || !username) {
    return { isValid: false, message: 'INVALID EMAIL STRUCTURE' };
  }

  // 2. Block Known Disposable / Dummy Domains & Patterns
  if (BLOCKED_DOMAINS.has(domain)) {
    return { isValid: false, message: 'DISPOSABLE / FAKE DOMAINS ARE NOT PERMITTED' };
  }

  if (username === domain.split('.')[0] || username.length < 2) {
    return { isValid: false, message: 'SUSPICIOUS EMAIL PATTERN DETECTED' };
  }

  // 3. 100% Free Live MX Record Lookup via Google DNS (CORS Enabled)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as GoogleDnsResponse;
      
      // Status 3 = NXDOMAIN (Domain tidak pernah terdaftar)
      if (data.Status === 3) {
        return { isValid: false, message: `DOMAIN "@${domain.toUpperCase()}" DOES NOT EXIST` };
      }

      // Status 0 = NOERROR, periksa apakah ada Answer MX record
      if (!Array.isArray(data.Answer) || data.Answer.length === 0) {
        return { isValid: false, message: `DOMAIN "@${domain.toUpperCase()}" HAS NO ACTIVE MAIL SERVER (NO MX RECORD)` };
      }
    }
  } catch (err) {
    console.error('DNS MX check failed:', err);
    // Jika user offline / DNS diblokir, tetap tolak jika domain terdeteksi aneh
    if (domain.endsWith('.bla') || domain === 'bla.com') {
      return { isValid: false, message: 'INVALID EMAIL DOMAIN' };
    }
  }

  return { isValid: true };
}