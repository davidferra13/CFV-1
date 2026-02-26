# PII Handling Policy — ChefFlow V1

**Last reviewed:** 2026-02-20
**Owner:** Platform engineer / founder
**Applies to:** All ChefFlow systems, code contributors, and integrated services

---

## What is PII?

Personally Identifiable Information (PII) is any data that can be used to identify an individual, directly or in combination with other data.

In ChefFlow, PII includes:

| Data                                        | Classification   | Where stored                         |
| ------------------------------------------- | ---------------- | ------------------------------------ |
| Client full name                            | PII              | `clients.full_name`                  |
| Client email address                        | PII              | `clients.email`, `auth.users.email`  |
| Client phone number                         | PII              | `clients.phone`                      |
| Client physical address                     | PII              | `clients.address`, `events.location` |
| Chef full name                              | PII              | `chefs.full_name`                    |
| Chef email address                          | PII              | `chefs.email`, `auth.users.email`    |
| Chef phone number                           | PII              | `chefs.phone`                        |
| Event location / venue address              | PII (contextual) | `events.location`                    |
| Chat message content                        | PII (contextual) | `messages.content`                   |
| Receipt photos                              | PII (contextual) | Supabase Storage `receipts/` bucket  |
| Payment amounts associated with individuals | Sensitive PII    | `ledger_entries`                     |
| IP addresses (logs)                         | PII (EU)         | Vercel logs only (not stored in DB)  |

**Not PII:** Aggregated statistics, anonymized analytics, trend data without individual identifiers.

---

## Data Classification Levels

| Level            | Description               | Examples                                | Access                        |
| ---------------- | ------------------------- | --------------------------------------- | ----------------------------- |
| **Public**       | Freely shareable          | Chef profile name, portfolio photos     | Anyone                        |
| **Internal**     | Business operational data | Event counts, revenue totals            | Chef + system                 |
| **Confidential** | PII + financial details   | Client names, emails, phone, amounts    | Chef + authorized system only |
| **Restricted**   | Secrets + credentials     | API keys, Stripe keys, service role key | Platform admin only           |

---

## Who Has Access to PII

| Actor                                | What they can see                                                                 | Technical enforcement                                         |
| ------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Chef                                 | Their own clients' PII                                                            | RLS: `tenant_id = get_current_tenant_id()`                    |
| Client                               | Their own PII only                                                                | RLS: `client_id = get_current_client_id()`                    |
| Chef A                               | Chef B's clients                                                                  | ❌ Blocked by RLS + middleware                                |
| Admin                                | Can query any tenant's data                                                       | Service role key, gated by `ADMIN_EMAILS` env var             |
| AI system (Gemini)                   | Draft generation only — never receives stored PII unless chef submits it manually | AI policy: AI operates on chef-provided input, not DB queries |
| External APIs (Stripe, Resend, etc.) | Only what is explicitly passed                                                    | Minimal disclosure principle                                  |

---

## PII Handling Rules for Engineers and Agents

### 1. Never log PII

```typescript
// ❌ NEVER DO THIS
console.log('Processing client', client.email, client.full_name)

// ✅ DO THIS — use IDs only in logs
console.log('Processing client', client.id)
```

Logs may appear in Vercel log drains, Sentry, or console output — none of which should contain email addresses, phone numbers, or names.

### 2. Never include PII in error messages

Errors that bubble up to Sentry must not contain PII. The `beforeSend` hook in `sentry.server.config.ts` strips `Authorization` and `Cookie` headers. If additional PII scrubbing is needed:

```typescript
// In sentry.server.config.ts beforeSend:
if (event.request?.data) {
  // Strip known PII fields from request bodies
  const body = event.request.data as Record<string, unknown>
  for (const field of ['email', 'phone', 'full_name', 'name']) {
    if (field in body) body[field] = '[Redacted]'
  }
}
```

### 3. Never expose PII in URLs

```typescript
// ❌ NEVER — email in URL is logged by CDN, browser history
/clients?search=john@example.com

// ✅ Always use opaque IDs
/clients/uuid-here
```

### 4. Minimize PII sent to third-party services

| Service       | What we send                                     | What we don't send         |
| ------------- | ------------------------------------------------ | -------------------------- |
| Stripe        | Chef's account info (for Connect), no client PII | Client names, emails       |
| Resend        | To/from email, rendered HTML                     | Raw DB records             |
| Google Gemini | Chef-provided text for drafting                  | Client DB records          |
| MealMe/Kroger | Ingredient names only                            | Chef/client identity       |
| Sentry        | Stack traces, request metadata                   | PII in payloads (scrubbed) |

### 5. Never hardcode or commit PII

No real email addresses, phone numbers, or names in:

- Source code
- Test fixtures committed to git
- Migration files
- Seed scripts (use clearly fake data: `test+chef@example.com`)

### 6. Use anonymized data for development

When testing locally, use clearly synthetic data:

```sql
-- Acceptable test data:
INSERT INTO clients (full_name, email) VALUES ('Test Client', 'test@example.com');

-- Never copy production client records to local dev
```

---

## PII Subject Rights Requests

### Right to Access (GDPR Article 15 / CCPA)

The chef can export all their data (including client data they hold as data controller) via:
`Settings → Compliance → GDPR → Download My Data`

This calls `lib/compliance/data-export.ts` which packages all chef-owned data as JSON.

For clients requesting access to their own data held by a chef: the client should contact the chef directly (ChefFlow is the data processor; the chef is the data controller for their clients).

### Right to Erasure (GDPR Article 17)

**Chef account deletion:**
See `docs/data-retention-policy.md` → Account Deletion section.

**Client PII erasure (requested by client):**

1. Chef navigates to the client record
2. Chef clicks "Delete client" (triggers cascade delete or anonymization)
3. System anonymizes: `full_name → [Deleted]`, `email → deleted@[uuid].invalid`, `phone → null`
4. Client portal access revoked immediately
5. Financial records (ledger entries) are NOT deleted — exempt under legal hold

**What cannot be erased:**

- Ledger entries (7-year legal retention)
- Event state transitions (immutable by DB trigger)
- Admin audit logs (platform compliance)

### Right to Rectification (GDPR Article 16)

Chef can edit client records at any time via the client detail page. No special process required.

### Right to Portability (GDPR Article 20)

Covered by the GDPR export (JSON format) at `Settings → Compliance → GDPR`.

---

## Data Breach Response (PII-Specific)

See `docs/disaster-recovery.md` → Runbook B (Data Breach).

**GDPR-specific requirement:** If EU residents' PII was exposed, the supervisory authority must be notified within **72 hours** of discovery. Affected data subjects must also be notified without undue delay if the breach is likely to result in high risk to their rights and freedoms.

---

## Third-Party Data Processing Agreements

ChefFlow acts as a **data processor** for chef data (the chef is the data controller for their clients). ChefFlow is also a **data controller** for chef personal data.

Sub-processors:

| Processor | Purpose                   | Privacy Policy                  |
| --------- | ------------------------- | ------------------------------- |
| Supabase  | Database + Auth + Storage | supabase.com/privacy            |
| Vercel    | Application hosting       | vercel.com/legal/privacy-policy |
| Stripe    | Payment processing        | stripe.com/privacy              |
| Resend    | Transactional email       | resend.com/privacy              |
| Google    | Gemini AI, Maps, OAuth    | policies.google.com/privacy     |
| Upstash   | Rate limiting (Redis)     | upstash.com/privacy             |
| Sentry    | Error tracking            | sentry.io/privacy               |

All sub-processors are bound by their own privacy policies. ChefFlow passes only the minimum necessary data to each.

---

## Security Controls Protecting PII

| Control               | Implementation                                                |
| --------------------- | ------------------------------------------------------------- |
| Encryption in transit | TLS 1.2+ (Vercel + Supabase), HSTS header                     |
| Encryption at rest    | AES-256 (Supabase/AWS KMS, platform-managed)                  |
| Access control        | RLS policies on all 60+ tables                                |
| Authentication        | Supabase Auth with session management                         |
| Session security      | HttpOnly cookies, SameSite=lax, secure flag in production     |
| API security          | Bearer API keys, rate limiting, tenant scoping                |
| Input validation      | Zod schemas on AI inputs; DB constraints as last-line defense |
| Audit trail           | `admin_audit_log` for sensitive admin actions                 |
| Secret management     | Vercel env vars (not in source code)                          |

---

## Training and Awareness

All code contributors (including AI agents) must:

1. Read this document before making changes to tables that store PII
2. Never add new PII fields without updating this document and `docs/data-retention-policy.md`
3. Apply the minimum-necessary principle: collect only what is needed to provide the service
4. Flag any new third-party integrations that would receive PII for review before implementation

---

## Review Schedule

- Annually (at minimum)
- After any data breach incident
- When adding new data types, integrations, or geographic markets

_Next review due: 2027-02-20_
