# Email Setup

ChefFlow sends transactional emails (confirmations, invoices, reminders) via Resend.

## 1. Resend Domain Verification

1. Sign up at https://resend.com
2. Add your domain (cheflowhq.com) in the Resend dashboard
3. Resend provides DNS records to add

## 2. DNS Records (Cloudflare)

Log into Cloudflare DNS for cheflowhq.com and add:

**SPF Record**
- Type: TXT
- Name: @
- Content: `v=spf1 include:amazonses.com ~all`

**DKIM Record**
- Type: CNAME
- Name: (provided by Resend, usually `resend._domainkey`)
- Target: (provided by Resend)

**DMARC Record**
- Type: TXT
- Name: _dmarc
- Content: `v=DMARC1; p=none; rua=mailto:dmarc@cheflowhq.com`

**Return-Path (optional)**
- Type: CNAME
- Name: bounces
- Target: (provided by Resend)

## 3. Environment Variables

Add to .env.production:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@cheflowhq.com
```

EMAIL_FROM sets the sender address for all transactional emails.
Falls back to RESEND_FROM_EMAIL, then noreply@cheflowhq.com.

## 4. Verify

After DNS propagation (usually 5 to 30 minutes):
1. Check domain status in Resend dashboard, should show "Verified"
2. Send a test email from ChefFlow
3. Check the email headers for SPF=pass, DKIM=pass
