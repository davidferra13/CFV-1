# Chef Portal Security Model Overview (V1)

This document provides a high-level overview of the security architecture that protects the Chef Portal. It explains **how security is enforced**, **what layers exist**, and **what threats are mitigated**.

---

## 1) Security Objectives

The Chef Portal security model is designed to achieve these objectives:

### 1.1 Confidentiality
- ✅ Chefs cannot access other chefs' data
- ✅ Clients cannot access chef-private data
- ✅ Clients cannot access other clients' data

### 1.2 Integrity
- ✅ Financial data cannot be tampered with (immutable ledger)
- ✅ Audit logs cannot be deleted or edited
- ✅ Event lifecycle transitions are controlled and logged

### 1.3 Availability
- ✅ System remains operational under normal load
- ✅ DoS attacks are mitigated via rate limiting (if implemented)
- ✅ Database queries are optimized and indexed

### 1.4 Accountability
- ✅ Every critical action is traceable to a user or system actor
- ✅ Audit logs provide forensic capability
- ✅ No anonymous or untraceable operations

---

## 2) Threat Model

### 2.1 Threats In Scope (V1)

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Cross-tenant data access** | Chef A tries to access Chef B's data | RLS + tenant_id enforcement |
| **Unauthorized role escalation** | Client tries to access Chef Portal | Middleware + layout gating + RLS |
| **Financial data tampering** | User tries to edit ledger entries | Immutability triggers + append-only |
| **SQL Injection** | Attacker injects SQL via input fields | Parameterized queries (Prisma/Supabase client) |
| **XSS (Cross-Site Scripting)** | Attacker injects malicious scripts | React auto-escaping + CSP headers |
| **CSRF (Cross-Site Request Forgery)** | Attacker tricks user into unwanted actions | SameSite cookies + CSRF tokens |
| **Replay attacks (webhooks)** | Attacker resends old webhook events | Idempotency keys + signature verification |
| **Session hijacking** | Attacker steals session token | HttpOnly cookies + secure flags |

### 2.2 Threats Out of Scope (V1)

| Threat | Reason Deferred |
|--------|-----------------|
| **Distributed Denial of Service (DDoS)** | Mitigated at infrastructure layer (Vercel/Supabase) |
| **Physical server access** | Cloud-hosted, no physical access |
| **Social engineering** | User training, not technical control |
| **Zero-day exploits in dependencies** | Addressed via dependency updates in V2 |

---

## 3) Defense-in-Depth Architecture

The Chef Portal uses **multiple layers of defense** so that if one layer fails, others still protect the system.

### 3.1 Security Layers (Outer to Inner)

```
┌───────────────────────────────────────────────────────┐
│ 1. NETWORK LAYER                                      │
│    - HTTPS only                                       │
│    - TLS 1.3+                                         │
│    - Vercel/Supabase infrastructure firewalls         │
└───────────────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────────────┐
│ 2. AUTHENTICATION LAYER                               │
│    - Supabase Auth (email/password)                   │
│    - HttpOnly cookies                                 │
│    - Session expiration                               │
└───────────────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────────────┐
│ 3. AUTHORIZATION LAYER (MIDDLEWARE)                   │
│    - Role resolution from user_roles table            │
│    - Route protection (/chef/* requires chef role)    │
│    - Redirect to correct portal                       │
└───────────────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────────────┐
│ 4. APPLICATION LAYER (SERVER COMPONENTS/ACTIONS)      │
│    - Input validation (Zod schemas)                   │
│    - Business logic enforcement                       │
│    - Explicit field projection (no SELECT *)          │
└───────────────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────────────┐
│ 5. DATABASE LAYER (RLS + TRIGGERS)                    │
│    - Row-level security (tenant_id enforcement)       │
│    - Immutability triggers (prevent UPDATE/DELETE)    │
│    - Foreign key constraints                          │
│    - Unique constraints (idempotency)                 │
└───────────────────────────────────────────────────────┘
```

### 3.2 Why Defense-in-Depth Matters

**Scenario:** A bug in application code accidentally omits tenant_id filter.

- ❌ Without RLS: Data leak occurs
- ✅ With RLS: Database layer blocks cross-tenant query, preventing leak

**Every layer is a failsafe for the layers above it.**

---

## 4) Authentication Model

### 4.1 Authentication Provider

- **Supabase Auth** handles user identity
- Email/password authentication (V1)
- OAuth providers excluded from V1

### 4.2 Session Management

- **Session token** stored in HttpOnly cookie (not accessible to JavaScript)
- **Secure flag** enabled (HTTPS only)
- **SameSite=Lax** to prevent CSRF
- **Session expiration:** configurable (default 7 days)

### 4.3 Password Requirements

- Minimum length: 8 characters
- No complexity requirements in V1 (defer to Supabase defaults)
- Password reset via email (Supabase built-in)

---

## 5) Authorization Model

### 5.1 Role-Based Access Control (RBAC)

**Roles in V1:**
- `chef` — Full access to their tenant
- `chef_subaccount` — Limited access to their tenant (if implemented)
- `client` — Access to Client Portal only (never Chef Portal)

### 5.2 Role Resolution Flow

```
1. User authenticates → Supabase session created
2. Middleware reads user_id from session
3. Middleware queries user_roles table:
   SELECT role, tenant_id FROM user_roles WHERE user_id = ?
4. Middleware stores role and tenant_id in context
5. Route guard checks role:
   - If role = 'chef' or 'chef_subaccount', allow /chef/* routes
   - If role = 'client', redirect to /client/*
   - If role is unknown, deny access (fail closed)
```

### 5.3 Permission Enforcement Points

| Layer | Enforcement Mechanism |
|-------|-----------------------|
| **Routing** | Middleware checks role before rendering route |
| **Layout** | Server layout gating prevents wrong portal rendering |
| **Data Access** | RLS policies enforce tenant_id matching |
| **Mutations** | Server actions check role and permissions |

---

## 6) Tenant Isolation Model

### 6.1 Tenant Identifier

- Every chef is a **tenant** (identified by `tenant_id` or `chef_id`)
- All tenant-scoped tables include `tenant_id` column
- Tenant is **derived from authenticated session**, never from user input

### 6.2 RLS Enforcement

**Example RLS Policy (events table):**

```sql
CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('chef', 'chef_subaccount')
  )
);
```

**Key Points:**
- `auth.uid()` is Supabase's authenticated user ID
- `tenant_id` is looked up from `user_roles` (not from request)
- Only rows matching the user's tenant are visible

### 6.3 Service Role Bypass

**When is RLS bypassed?**
- ✅ Stripe webhook processing (service role only)
- ✅ System maintenance operations (admin, not user-facing)

**How is bypass protected?**
- Service role key is stored server-side only (never exposed to client)
- Webhook signature verification ensures only Stripe can trigger service role operations

---

## 7) Data Protection

### 7.1 Data at Rest

- **Encryption:** Supabase encrypts data at rest (AES-256)
- **Backups:** Automated daily backups (Supabase managed)

### 7.2 Data in Transit

- **HTTPS only:** All communication encrypted via TLS 1.3+
- **No HTTP fallback:** HTTP requests are redirected to HTTPS

### 7.3 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| **Supabase anon key** | `.env.local` (client-safe) | Public (scoped by RLS) |
| **Supabase service role key** | `.env.local` (server-only) | Server-side only |
| **Stripe secret key** | `.env.local` (server-only) | Server-side only |
| **Stripe webhook secret** | `.env.local` (server-only) | Webhook handler only |

**No secrets are committed to version control.** `.env.local` is gitignored.

---

## 8) Input Validation

### 8.1 Validation Layers

| Layer | Tool | Purpose |
|-------|------|---------|
| **Client (UX)** | HTML5 validation, React state | Immediate feedback |
| **Server (Authoritative)** | Zod schemas | Enforcement |
| **Database (Constraints)** | NOT NULL, UNIQUE, CHECK | Last line of defense |

### 8.2 Validation Rules

**Example: Create Client Profile**

```typescript
const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export async function createClient(rawInput: unknown) {
  const input = createClientSchema.parse(rawInput); // throws if invalid
  // ... proceed with validated input
}
```

**Key Principles:**
- Server validation is **authoritative**
- Client validation is **UX enhancement only**
- Database constraints are **fail-safe**

---

## 9) Immutability and Audit

### 9.1 Immutable Tables

**Tables that CANNOT be updated or deleted:**
- `ledger_entries`
- `event_transitions`
- `audit_logs` (if implemented as separate table)

**Enforcement:**
- Database triggers prevent UPDATE/DELETE
- Application code never attempts to modify immutable records

### 9.2 Audit Log Schema

**What gets audited:**
- Event status transitions
- Ledger writes
- Client profile creates/updates
- Invite creates
- Menu locks

**Audit log fields:**
- `id` (UUID)
- `tenant_id` (for filtering)
- `user_id` (actor; may be NULL for system actions)
- `action` (e.g., 'event.status_changed', 'ledger.entry_created')
- `entity_type` (e.g., 'event', 'client')
- `entity_id` (the affected record)
- `metadata` (JSONB, action-specific details)
- `created_at` (timestamp)

---

## 10) Webhook Security

### 10.1 Stripe Webhook Protection

**Threats:**
- Replay attacks (resending old webhooks)
- Spoofing (fake webhooks from attackers)

**Mitigations:**

1. **Signature Verification**
   - Stripe signs every webhook with a secret
   - Webhook handler verifies signature before processing
   - Invalid signatures are rejected with 400 error

2. **Idempotency**
   - Every Stripe event has a unique `event.id`
   - Ledger entries include `stripe_event_id` (unique constraint)
   - Duplicate events are ignored (no duplicate ledger writes)

3. **HTTPS Only**
   - Webhook endpoint requires HTTPS
   - Stripe will not send to HTTP endpoints

**Example Webhook Handler:**

```typescript
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // 1. Verify signature
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  // 2. Check idempotency
  const existing = await db.ledger_entries.findUnique({
    where: { stripe_event_id: event.id },
  });
  if (existing) return new Response('OK', { status: 200 });

  // 3. Process event
  await processStripeEvent(event);

  return new Response('OK', { status: 200 });
}
```

---

## 11) XSS and Injection Prevention

### 11.1 XSS Prevention

**Threat:** Attacker injects `<script>` tags via user input fields.

**Mitigations:**
- ✅ React auto-escapes all text content
- ✅ No `dangerouslySetInnerHTML` usage (or strict sanitization if required)
- ✅ Content Security Policy (CSP) headers restrict inline scripts

**Example CSP Header:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
```

### 11.2 SQL Injection Prevention

**Threat:** Attacker injects SQL via input fields.

**Mitigations:**
- ✅ **Parameterized queries only** (Prisma, Supabase client)
- ❌ **No raw SQL with string concatenation**

**Example (Safe):**

```typescript
// ✅ SAFE (parameterized)
const events = await db.events.findMany({
  where: { tenant_id: tenantId },
});
```

**Example (Unsafe):**

```typescript
// ❌ UNSAFE (string concatenation)
const events = await db.query(
  `SELECT * FROM events WHERE tenant_id = '${tenantId}'`
);
```

---

## 12) Rate Limiting (Future / V2)

**V1 does not implement application-level rate limiting.**

**Rationale:** Infrastructure-level protection (Vercel, Supabase) provides baseline DoS protection. Application-level rate limiting is deferred to V2.

**If added in V2:**
- Limit failed login attempts (e.g., 5 per 15 minutes)
- Limit API requests per user (e.g., 100 per minute)
- Limit webhook retries (e.g., exponential backoff)

---

## 13) CORS Policy

**V1 CORS settings:**
- **API routes** allow same-origin only (no cross-origin by default)
- **Stripe webhook** allows Stripe origins only (if required)

**Example CORS header:**

```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Credentials: true
```

**No wildcard (*) CORS headers in production.**

---

## 14) Security Testing

### 14.1 Automated Security Tests

| Test Type | Coverage | Tool |
|-----------|----------|------|
| **RLS Verification** | Tenant isolation | `verify-rls.sql` |
| **Immutability Verification** | Ledger, transitions | `verify-immutability.sql` |
| **SQL Injection** | Parameterized queries | Manual review + Prisma enforcement |
| **XSS** | React escaping | Manual review + CSP |

### 14.2 Manual Security Review

**Before V1 launch:**
- ✅ Code review for authorization checks
- ✅ RLS policy review (all tables covered)
- ✅ Secrets audit (no hardcoded keys)
- ✅ Webhook signature verification tested
- ✅ Idempotency tested (duplicate submission)

---

## 15) Incident Response

**If a security incident occurs:**

1. **Contain:** Disable affected accounts, revoke tokens
2. **Investigate:** Review audit logs, identify scope of breach
3. **Remediate:** Fix vulnerability, deploy patch
4. **Notify:** Inform affected users (if data was exposed)
5. **Document:** Post-mortem analysis, update security docs

**V1 does not include automated incident response tooling.** This is manual and ad-hoc.

---

## 16) Summary: Security Model at a Glance

| Security Aspect | Implementation |
|-----------------|----------------|
| **Authentication** | Supabase Auth (email/password) |
| **Authorization** | RBAC (chef, chef_subaccount, client) |
| **Tenant Isolation** | RLS policies on all tables |
| **Data Protection** | HTTPS, encryption at rest, secrets in env vars |
| **Immutability** | DB triggers on ledger and transitions |
| **Auditability** | Immutable logs for critical actions |
| **Webhook Security** | Signature verification + idempotency |
| **XSS Prevention** | React escaping + CSP headers |
| **SQL Injection Prevention** | Parameterized queries (Prisma/Supabase) |
| **CSRF Prevention** | SameSite cookies |

**The Chef Portal security model is defense-in-depth: every layer (network, auth, authz, app, database) enforces isolation and integrity, ensuring that even if one layer fails, others prevent compromise.**

---

**End of Security Model Overview**
