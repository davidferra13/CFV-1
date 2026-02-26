# Disaster Recovery Plan — ChefFlow V1

**Last reviewed:** 2026-02-20
**Owner:** Platform engineer / founder
**RTO (Recovery Time Objective):** 4 hours for full service restoration
**RPO (Recovery Point Objective):** Up to 24 hours of data loss on Free plan; ~5 minutes on Pro (PITR)

---

## Overview

This document defines the response procedures for catastrophic incidents that affect ChefFlow's availability or data integrity. Every scenario has a named runbook below. Follow them in order.

### Severity Levels

| Level         | Description                                              | Response SLA         |
| ------------- | -------------------------------------------------------- | -------------------- |
| P1 — Critical | Production completely down or data breach confirmed      | Immediate (< 15 min) |
| P2 — High     | Major feature unavailable, auth broken, payments failing | < 1 hour             |
| P3 — Medium   | Degraded performance, partial feature outage             | < 4 hours            |
| P4 — Low      | Minor bugs, cosmetic issues                              | Next business day    |

---

## Runbook A — Database Corruption or Accidental Mass Deletion

**Indicators:**

- Supabase dashboard shows schema errors or missing tables
- Application throws 500s for all DB queries
- Users report data missing en masse

**Steps:**

1. **Immediately set maintenance mode** (prevents new writes that could worsen state):

   ```bash
   # In Vercel dashboard: Project > Settings > Environment Variables
   # Add: MAINTENANCE_MODE=1 (Production)
   # Redeploy (takes ~2 min)
   ```

   Middleware should check `process.env.MAINTENANCE_MODE` and return 503. If not implemented:

   ```bash
   # Alternative: redirect all traffic at Cloudflare
   # Cloudflare > cheflowhq.com > Rules > Redirect Rules > "Maintenance" rule
   ```

2. **Identify the scope** — run these queries to assess damage:

   ```sql
   SELECT COUNT(*) FROM chefs;
   SELECT COUNT(*) FROM events;
   SELECT COUNT(*) FROM ledger_entries;
   SELECT COUNT(*) FROM clients;
   ```

   Compare against last known good counts.

3. **Do NOT push any more migrations** — freeze the schema.

4. **Restore from Supabase backup** (Free tier: daily snapshots, 7-day retention):
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select project: `luefkpakzvxcsqroxyhz`
   - Settings → Backups
   - Click "Restore" on the most recent backup **before** the incident
   - Choose **a new project** — never restore over production directly
   - Wait 10–30 minutes for restore to complete

5. **Verify restored data**:

   ```sql
   -- On the restored project:
   SELECT COUNT(*) FROM chefs;      -- Compare to known values
   SELECT COUNT(*) FROM events;
   SELECT MAX(created_at) FROM ledger_entries;  -- Check freshness
   ```

6. **If restored data is good** — migrate production to restored project:

   ```bash
   # Option A: Copy rows back to production using SQL INSERT ... SELECT
   # Option B: Promote restored project to production by swapping env vars

   # In Vercel: update these 3 env vars to point to the restored project:
   # NEXT_PUBLIC_SUPABASE_URL = https://[NEW_PROJECT_ID].supabase.co
   # NEXT_PUBLIC_SUPABASE_ANON_KEY = [new anon key]
   # SUPABASE_SERVICE_ROLE_KEY = [new service role key]
   # Then redeploy
   ```

7. **Remove maintenance mode** and announce restoration to users.

8. **Post-incident:**
   - Document what data was lost (if any)
   - Identify root cause
   - Add preventive migration constraints if applicable
   - Schedule retrospective within 48 hours

---

## Runbook B — Data Breach (Unauthorized Data Access)

**Indicators:**

- Suspicious admin_audit_log entries
- Supabase alerts for unusual query volume
- External report of leaked data
- Auth tokens appearing in unexpected locations

**Steps (execute in parallel where possible):**

1. **IMMEDIATE — Rotate all secrets** (see `docs/key-rotation-policy.md` → Emergency Rotation):
   - Supabase service role key
   - Supabase anon key (rotate JWT secret)
   - Stripe secret key + webhook secret
   - CRON_SECRET
   - All Google OAuth credentials

2. **Invalidate all user sessions**:
   - Supabase Dashboard → Authentication → Settings → JWT Secret → regenerate
   - This logs out every user immediately
   - Redeploy Vercel to pick up new keys

3. **Identify the breach vector**:

   ```sql
   -- Check admin audit log for suspicious actions
   SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 100;

   -- Check recent auth activity
   SELECT * FROM auth.audit_log_entries ORDER BY created_at DESC LIMIT 200;

   -- Check for impossible geographic access (manual review of Vercel logs)
   ```

4. **Contain**:
   - If a specific chef account is compromised: revoke via Supabase Auth → Users → disable account
   - If a specific API key is compromised: delete from `api_keys` table
   - If service role key was exposed: rotate immediately (step 1)

5. **Assess scope** — determine what data may have been accessed:
   - Which tables are accessible via the compromised credential?
   - What is the time window of unauthorized access?
   - Does it include PII (names, emails, phone numbers)?

6. **Legal and notification obligations**:
   - GDPR: If EU residents affected → must notify affected users within 72 hours of discovery
   - CCPA: California residents → must notify "in the most expedient time possible"
   - Notify affected chefs and their clients directly via email (use Resend)
   - Document the breach in a dated incident report

7. **Post-incident:**
   - Full security audit of all access control paths
   - Review and patch the entry point
   - Consider enabling Supabase Pro for audit logs and PITR

---

## Runbook C — Key Compromise (Single Secret Exposed)

**Indicators:**

- Secret found in git history, log file, or error message
- Unexpected API usage on Stripe dashboard
- Unauthorized ledger entries

**Steps:**

1. Identify which key was exposed and from which service.
2. Follow the emergency rotation procedure in `docs/key-rotation-policy.md`.
3. Audit for any unauthorized actions the compromised key may have taken:
   ```sql
   -- For SUPABASE_SERVICE_ROLE_KEY compromise:
   SELECT * FROM admin_audit_log WHERE created_at > '[time of exposure]';
   SELECT * FROM ledger_entries WHERE created_at > '[time of exposure]' ORDER BY created_at DESC;
   ```
4. Reverse any unauthorized ledger entries (require explicit sign-off — these are immutable by policy, but a compensating entry is allowed).
5. Notify affected users if any data was accessed or modified.

---

## Runbook D — Vercel Account Compromise

**Indicators:**

- Unknown deployments in Vercel dashboard
- Environment variables modified without authorization
- `vercel.json` or cron schedule changed unexpectedly

**Steps:**

1. **Immediately change Vercel account password** and enable 2FA if not already enabled.
2. **Revoke all team member tokens** and re-invite legitimately.
3. **Audit recent deployments**:
   - Vercel Dashboard → Deployments → check for unknown commits or env changes
4. **Check environment variables** — verify all secrets match expected values. Rotate any that may have been viewed.
5. **Re-verify** `vercel.json` cron config is unchanged (compare to git history):
   ```bash
   git show HEAD:vercel.json
   ```
6. Redeploy from a known-good git commit:
   ```bash
   git log --oneline -10
   vercel deploy --prod --yes
   ```

---

## Runbook E — DNS Hijack / Domain Compromise

**Indicators:**

- `cheflowhq.com` resolves to wrong IP
- SSL certificate warning on production site
- Cloudflare dashboard shows unauthorized DNS changes

**Steps:**

1. **Log into Cloudflare immediately** — change password + enable 2FA.
2. **Check DNS records** — compare to expected Vercel records:
   - A record / CNAME for `cheflowhq.com` should point to Vercel
   - Expected CNAME target: `cname.vercel-dns.com`
3. **Restore correct DNS records** if modified.
4. **Revoke and reissue SSL** if certificate was compromised (Cloudflare does this automatically on DNS fix).
5. **Enable Cloudflare Email Security** (SPF/DKIM/DMARC) if not already set — prevent domain spoofing.
6. **Notify users** if they may have been served a malicious page.

---

## Runbook F — Stripe Account Suspension or Dispute Spike

**Indicators:**

- Stripe dashboard shows "Account suspended" or "Payouts paused"
- Webhook delivery failures from Stripe
- Sudden spike in chargebacks/disputes

**Steps:**

1. **Check Stripe dashboard** for the exact reason (at-risk notice, high dispute rate, AML flag).
2. **Respond to Stripe's request immediately** — they typically require:
   - Business verification documents
   - Explanation of business model
   - Dispute response for specific transactions
3. **Graceful degradation** while suspended:
   - Payments are blocked but the rest of the app continues to work
   - Events in `paid`, `confirmed`, `in_progress`, `completed` states are unaffected
   - New events cannot progress past `accepted` → `paid` (manual note-taking required)
4. **Contact Stripe support** at support.stripe.com with your account ID.
5. **Activate backup payment processor** if suspension is prolonged:
   - Alternative: Square, PayPal Business, manual bank transfer with ledger entry
   - Update `.env` `STRIPE_SECRET_KEY` to new processor after code changes

---

## Runbook G — Extended Vercel / Hosting Outage

**Indicators:**

- Vercel status page shows incident (status.vercel.com)
- App unreachable but DNS resolves correctly

**Steps:**

1. **Monitor Vercel status page** — most incidents resolve within 30–60 minutes.
2. **Communicate with users** during outage:
   - Post status update on any available channel (email, social)
   - Set a simple static maintenance page via Cloudflare Pages as a fallback
3. **If outage exceeds 4 hours** — emergency migration options:
   - Option A: Deploy to Railway.app (Next.js compatible) using same env vars
   - Option B: Deploy to Netlify
   - Update DNS CNAME to new host once deployed
4. **Post-outage:** verify all cron jobs caught up (check `cron_executions` table for gaps).

---

## Communication Templates

### User-Facing Maintenance Notice

> **ChefFlow — Scheduled Maintenance**
>
> We are performing emergency maintenance to address [brief description]. The system is temporarily unavailable.
>
> **Expected restoration:** [time]
>
> We apologize for the disruption. Your data is safe and all in-progress events are unaffected.
>
> — ChefFlow Team

### Data Breach Notification (GDPR/CCPA Required)

> **Important Security Notice — Your ChefFlow Account**
>
> We are writing to inform you of a security incident that may have affected your ChefFlow account data.
>
> **What happened:** [brief description]
> **When:** [date range]
> **What was affected:** [specific data types]
> **What we have done:** [actions taken — rotated keys, patched vulnerability, etc.]
> **What you should do:** [change password, monitor for suspicious activity]
>
> We take your privacy seriously. If you have questions, contact [email].

---

## Incident Log

| Date               | Incident Type | Severity | RTO Achieved | Notes |
| ------------------ | ------------- | -------- | ------------ | ----- |
| (no incidents yet) | —             | —        | —            | —     |

---

## Recovery Contacts

| Service    | Dashboard            | Support                |
| ---------- | -------------------- | ---------------------- |
| Supabase   | app.supabase.com     | supabase.com/support   |
| Vercel     | vercel.com/dashboard | vercel.com/help        |
| Stripe     | dashboard.stripe.com | support.stripe.com     |
| Cloudflare | dash.cloudflare.com  | cloudflare.com/support |
| Resend     | resend.com/dashboard | resend.com/support     |
| Upstash    | console.upstash.com  | upstash.com/docs       |

---

## Quarterly DR Drill Checklist

Run this drill every quarter (takes ~1 hour):

- [ ] Restore last Supabase backup to a throwaway project (see `docs/backup-and-restore.md`)
- [ ] Verify restored data row counts match production
- [ ] Practice rotating CRON_SECRET end-to-end (see `docs/key-rotation-policy.md`)
- [ ] Verify maintenance mode works: set `MAINTENANCE_MODE=1` env var, confirm 503 response
- [ ] Verify `/api/health` returns degraded (not error) when Redis is unavailable
- [ ] Confirm all team members know their role in this runbook
- [ ] Update incident log table above with drill result

_Last drill: (pending — first drill not yet conducted)_
