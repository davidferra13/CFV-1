# Domain Migration: cheflow.us -> cheflowhq.com

**Date:** 2026-02-18
**Reason:** Privacy/usability issues with the old `.us` domain; replaced with `cheflowhq.com`

---

## What Changed (Codebase)

| File | Change |
|------|--------|
| `lib/email/resend-client.ts` | Fallback `FROM_EMAIL` updated to `noreply@cheflowhq.com` |
| `lib/email/notifications.ts` | Fallback `APP_URL` updated to `https://cheflowhq.com` |
| `.env.local` | `RESEND_FROM_EMAIL` set to `noreply@cheflowhq.com` |
| `.env.local.example` | `RESEND_FROM_EMAIL` and production URL comments updated |
| `docs/DEPLOYMENT_AND_DOMAIN_SETUP.md` | All domain references updated |
| `docs/resend-email-integration.md` | Domain verification instructions updated |

**Verified:** `grep -r "cheflow.us"` returns zero matches across the entire codebase.

---

## External Services — Manual Steps Required

These cannot be done via code. Each needs to be updated in the respective dashboard:

### 1. Vercel (Hosting)
- [ ] Go to **Vercel Dashboard > Project Settings > Domains**
- [ ] Add `cheflowhq.com` as the primary domain
- [ ] Remove `cheflow.us` (or keep as redirect)
- [ ] Update environment variables:
  - `NEXT_PUBLIC_SITE_URL` = `https://cheflowhq.com`
  - `NEXT_PUBLIC_APP_URL` = `https://cheflowhq.com`
  - `RESEND_FROM_EMAIL` = `noreply@cheflowhq.com`
- [ ] Redeploy after changing env vars

### 2. DNS (Cloudflare or new registrar)
- [ ] Point `cheflowhq.com` A record to Vercel: `76.76.21.21`
- [ ] Add CNAME `www` -> `cname.vercel-dns.com` (if you want www support)
- [ ] Vercel will auto-provision SSL once DNS propagates

### 3. Supabase (Auth Redirects)
- [ ] Go to **Supabase Dashboard > Authentication > URL Configuration**
- [ ] Update **Site URL** to `https://cheflowhq.com`
- [ ] Update **Redirect URLs** to include `https://cheflowhq.com/**`
- [ ] Remove old `cheflow.us` redirect entries

### 4. Resend (Email)
- [ ] Go to **Resend Dashboard > Domains**
- [ ] Add and verify `cheflowhq.com` (add the DNS records Resend provides: SPF, DKIM, DMARC)
- [ ] Once verified, emails will send from `noreply@cheflowhq.com`
- [ ] Optionally remove old `cheflow.us` domain verification

### 5. Stripe (if configured)
- [ ] Update webhook endpoint URL if it references `cheflow.us`
- [ ] Check any Stripe Checkout `success_url` / `cancel_url` references

### 6. Google OAuth (if configured)
- [ ] Go to **Google Cloud Console > Credentials > OAuth Client**
- [ ] Update **Authorized redirect URIs** to use `cheflowhq.com`
- [ ] Update **Authorized JavaScript origins** to use `cheflowhq.com`

---

## Old Domain (cheflow.us)

Consider keeping `cheflow.us` temporarily with a redirect to `cheflowhq.com` so any bookmarks, emails with old links, or cached URLs still work. A simple Cloudflare page rule or Vercel redirect can handle this.

---

## Verification Checklist

After completing the external steps above:

- [ ] Visit `https://cheflowhq.com` — site loads with HTTPS
- [ ] Sign in works (Supabase auth redirects correctly)
- [ ] Send a test email (quote or invitation) — arrives from `noreply@cheflowhq.com`
- [ ] Email links point to `cheflowhq.com` (not the old domain)
- [ ] PWA manifest loads correctly at new domain
