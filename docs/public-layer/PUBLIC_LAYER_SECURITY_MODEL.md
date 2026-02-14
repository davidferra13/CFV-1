# Public Layer - Security Model

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines the **security architecture** for the Public Layer, including threat model, defense layers, attack prevention, and security testing requirements.

---

## Security Philosophy: Defense in Depth

### Principle
Security MUST be enforced at MULTIPLE layers. Even if one layer fails, others MUST prevent unauthorized access or data exposure.

### Layers
1. **Network Layer** - Middleware (authentication checks, redirects)
2. **Application Layer** - Server Components, Server Actions (input validation, authorization)
3. **Database Layer** - Row Level Security (RLS) policies (tenant isolation, role-based access)
4. **Client Layer** - Input validation, CSRF tokens (prevent malicious submissions)

---

## Threat Model

### Threats the Public Layer MUST Protect Against

#### 1. Unauthorized Data Access
**Threat**: Unauthenticated user accesses user-specific data.
**Mitigation**:
- NO user-specific data on public pages
- Database queries ONLY in API routes/Server Actions (not page components)
- RLS policies block unauthorized queries

#### 2. Cross-Site Scripting (XSS)
**Threat**: Attacker injects malicious JavaScript via form inputs.
**Mitigation**:
- HTML sanitization (strip tags from text inputs)
- Content Security Policy (CSP) headers
- React auto-escapes JSX variables
- NO `dangerouslySetInnerHTML` unless absolutely necessary

#### 3. Cross-Site Request Forgery (CSRF)
**Threat**: Attacker tricks user into submitting form from malicious site.
**Mitigation**:
- Next.js Server Actions automatically include CSRF tokens
- API routes validate `Origin` and `Referer` headers
- SameSite cookies (`Lax` or `Strict`)

#### 4. SQL Injection
**Threat**: Attacker injects SQL via form inputs.
**Mitigation**:
- Use parameterized queries ONLY (Supabase client handles this)
- NEVER use string interpolation in SQL
- Zod validation on all inputs

#### 5. Spam / Bot Submissions
**Threat**: Bots flood inquiry form with spam.
**Mitigation**:
- Honeypot field (hidden input, bots fill it, reject submission)
- Rate limiting (3 submissions/hour/IP)
- CAPTCHA (optional, V1.1 if spam persists)

#### 6. Enumeration Attacks
**Threat**: Attacker tries to enumerate valid emails via signup/signin.
**Mitigation**:
- Generic error messages ("Invalid credentials" - don't reveal if email exists)
- Rate limiting on signin attempts
- NO "email already exists" message on signup (generic "error occurred")

#### 7. Session Hijacking
**Threat**: Attacker steals session cookie and impersonates user.
**Mitigation**:
- HTTPS only (enforced by Vercel)
- `HttpOnly` cookies (Supabase Auth default)
- `Secure` flag on cookies (HTTPS only)
- `SameSite=Lax` (prevent CSRF)

#### 8. Clickjacking
**Threat**: Attacker embeds ChefFlow in iframe to trick users.
**Mitigation**:
- `X-Frame-Options: DENY` header
- `Content-Security-Policy: frame-ancestors 'none'` header

#### 9. Open Redirect
**Threat**: Attacker uses redirect to phishing site.
**Mitigation**:
- Whitelist allowed redirect URLs
- NEVER redirect to user-provided URLs
- Validate redirect params (e.g., `?redirect=/dashboard` must start with `/`)

#### 10. Timing Attacks (Password Enumeration)
**Threat**: Attacker uses timing differences to guess valid passwords.
**Mitigation**:
- Consistent response times for valid/invalid credentials (Supabase Auth handles this)
- Rate limiting on signin attempts

---

## Security Controls (Public Layer)

### 1. Input Validation

#### Zod Schemas (Client & Server)
```typescript
import { z } from 'zod';

export const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string().max(20).optional(),
  eventDate: z.string().optional(),
  guestCount: z.number().min(1).max(1000).optional(),
  message: z.string().min(10, 'Message too short').max(1000),
  website: z.string().optional(), // Honeypot
});
```

#### Sanitization
```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim();
}
```

---

### 2. CSRF Protection

#### Server Actions (Automatic)
Next.js Server Actions automatically include CSRF tokens. NO additional work needed.

#### API Routes (Manual)
```typescript
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_URL,
    'http://localhost:3000', // Dev environment
  ];

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Process request...
}
```

---

### 3. Content Security Policy (CSP)

#### Implementation
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://*.supabase.co https://api.stripe.com;
  frame-src https://js.stripe.com;
  frame-ancestors 'none';
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
};
```

---

### 4. Rate Limiting

#### Inquiry Form Submissions
```typescript
const submissionCache = new Map<string, number[]>();

export async function checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  const recentSubmissions = submissionCache.get(ip)?.filter(t => t > hourAgo) || [];

  if (recentSubmissions.length >= 3) {
    return false; // Rate limit exceeded
  }

  submissionCache.set(ip, [...recentSubmissions, now]);
  return true; // Allow
}
```

#### Signin Attempts (Supabase Auth)
Supabase Auth automatically rate-limits signin attempts. NO additional work needed.

---

### 5. Honeypot Field

#### Form Implementation
```tsx
<form>
  {/* Visible fields */}
  <input type="text" name="name" required />
  <input type="email" name="email" required />

  {/* Honeypot field (hidden, bots will fill it) */}
  <input
    type="text"
    name="website"
    tabIndex={-1}
    autoComplete="off"
    style={{ position: 'absolute', left: '-9999px' }}
  />
</form>
```

#### Server-Side Check
```typescript
export async function submitInquiry(formData: FormData) {
  const honeypot = formData.get('website');

  if (honeypot) {
    // Bot detected - fail silently (don't reveal we caught them)
    return { success: true, message: 'Thank you for your inquiry.' };
  }

  // Proceed with real submission...
}
```

---

### 6. Secure Session Management

#### Cookie Configuration
```typescript
// Supabase Auth default settings (no changes needed)
{
  cookieOptions: {
    name: 'sb-access-token',
    domain: process.env.NEXT_PUBLIC_URL,
    path: '/',
    sameSite: 'lax',
    secure: true, // HTTPS only
    httpOnly: true, // Not accessible via JavaScript
  }
}
```

---

### 7. Error Message Security

#### Bad (Reveals Information)
```typescript
// ❌ DON'T DO THIS
if (!userExists) {
  return { error: 'Email not found' };
}
if (!passwordMatches) {
  return { error: 'Incorrect password' };
}
```

#### Good (Generic)
```typescript
// ✅ DO THIS
if (!userExists || !passwordMatches) {
  return { error: 'Invalid email or password' };
}
```

---

### 8. Redirect Validation

#### Safe Redirects
```typescript
function validateRedirect(url: string): boolean {
  // Only allow relative URLs starting with /
  return url.startsWith('/') && !url.startsWith('//');
}

// Usage
const redirect = req.nextUrl.searchParams.get('redirect');
if (redirect && validateRedirect(redirect)) {
  return NextResponse.redirect(new URL(redirect, req.url));
}
// Default redirect if invalid
return NextResponse.redirect(new URL('/dashboard', req.url));
```

---

## Environment Variables Security

### Public Variables (Safe to Expose)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Private Variables (NEVER Expose)
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Verification
```bash
# Search for service role key in client bundles
grep -r "service_role" .next/static/
# Should return ZERO results
```

---

## HTTPS Enforcement

### Vercel (Default)
Vercel automatically redirects HTTP → HTTPS. NO configuration needed.

### Local Development
```bash
# Use HTTP for local dev (OK)
http://localhost:3000

# For production testing, use Vercel preview deployments (HTTPS)
https://chefflow-git-main-yourproject.vercel.app
```

---

## Dependency Security

### Audit Dependencies
```bash
npm audit
# Fix vulnerabilities
npm audit fix
```

### Minimal Dependencies
- ONLY install necessary packages
- Avoid packages with known vulnerabilities
- Review package source code before installing (if unfamiliar)

### Lockfile Integrity
- Commit `package-lock.json` to git
- Use `npm ci` in production (not `npm install`)

---

## Security Testing Checklist

### Pre-Deployment Tests

#### 1. XSS Prevention
- [ ] Submit `<script>alert('XSS')</script>` in inquiry form
- [ ] Verify script is stripped/escaped (not executed)

#### 2. CSRF Protection
- [ ] Submit form from external origin (e.g., `http://evil.com`)
- [ ] Verify request is rejected (403 Forbidden)

#### 3. SQL Injection
- [ ] Submit `' OR '1'='1` in form fields
- [ ] Verify no database error or unauthorized access

#### 4. Rate Limiting
- [ ] Submit inquiry form 4 times in 1 hour
- [ ] Verify 4th submission is rejected

#### 5. Honeypot
- [ ] Submit form with `website` field filled
- [ ] Verify submission is silently rejected

#### 6. Session Hijacking
- [ ] Copy session cookie to different browser
- [ ] Verify session works (Supabase Auth allows this)
- [ ] Logout invalidates cookie

#### 7. Clickjacking
- [ ] Embed ChefFlow in iframe: `<iframe src="https://chefflow.app"></iframe>`
- [ ] Verify iframe is blocked (blank or error)

#### 8. Open Redirect
- [ ] Visit `/signin?redirect=//evil.com`
- [ ] Verify redirect is rejected (stays on `/signin` or goes to default)

---

## Incident Response Plan

### If Security Vulnerability is Discovered

1. **Immediate**: Disable affected feature (if possible) or take site offline
2. **Assess**: Determine scope (how many users affected, what data exposed)
3. **Fix**: Deploy patch to production ASAP
4. **Notify**: Inform affected users (if data was exposed)
5. **Review**: Post-mortem to prevent recurrence

### Reporting Security Issues
- Email: security@chefflow.app (if exists)
- GitHub: Private security advisory (if open-source)

---

## Compliance

### OWASP Top 10 Coverage

| OWASP Risk | Mitigation |
|-----------|-----------|
| A01: Broken Access Control | RLS policies, role resolution |
| A02: Cryptographic Failures | HTTPS, secure cookies, password hashing (Supabase) |
| A03: Injection | Parameterized queries, input sanitization |
| A04: Insecure Design | Defense in depth, threat modeling |
| A05: Security Misconfiguration | CSP headers, secure defaults |
| A06: Vulnerable Components | `npm audit`, minimal dependencies |
| A07: Authentication Failures | Supabase Auth, rate limiting |
| A08: Software/Data Integrity | Lockfile integrity, code review |
| A09: Logging Failures | Server-side logging (console.error for V1) |
| A10: Server-Side Request Forgery | NO user-provided URLs in server requests |

---

## Monitoring & Logging

### V1 Logging (Console Only)
```typescript
// Log failed login attempts
console.error('Failed login attempt', { email, ip, timestamp });

// Log rate limit violations
console.warn('Rate limit exceeded', { ip, endpoint });

// Log honeypot triggers
console.info('Honeypot triggered', { ip });
```

### V1.1 (Production Logging)
- Integrate Sentry or similar error tracking
- Log to external service (e.g., Logtail, Papertrail)
- Monitor for suspicious patterns (repeated failed logins, etc.)

---

## Security Review Cadence

### Pre-Launch
- Full security review of all Public Layer code
- Penetration testing (manual or automated)

### Post-Launch
- Monthly `npm audit` check
- Quarterly security review
- After any major feature addition

---

## Verification Checklist

Before deploying Public Layer:

- [ ] All inputs are validated (client + server)
- [ ] All inputs are sanitized (strip HTML)
- [ ] CSRF protection enabled (Server Actions + API routes)
- [ ] CSP headers configured
- [ ] Rate limiting works
- [ ] Honeypot field works
- [ ] No service role key in client bundles
- [ ] HTTPS enforced (Vercel default)
- [ ] Error messages are generic (no information leakage)
- [ ] Redirect URLs are validated
- [ ] Session cookies are secure (`HttpOnly`, `Secure`, `SameSite`)
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] XSS test passed
- [ ] CSRF test passed
- [ ] SQL injection test passed
- [ ] Clickjacking test passed

---

**Status**: This security model is LOCKED and MUST be enforced for V1.
