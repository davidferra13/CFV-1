# External Service Boundaries

**Document ID**: 036
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines all external service integrations in ChefFlow V1 and their boundaries.

---

## External Services

### 1. Stripe (Payment Processing)

**Purpose**: Card payments, refunds

**Integration**: See `033-stripe-integration-boundary.md`

**Dependency**: Critical (payments blocked if down)

---

### 2. Supabase (Database + Auth)

**Purpose**: PostgreSQL, Authentication, Storage

**Integration**: Direct client library

**Dependency**: Critical (app unusable if down)

---

### 3. Vercel (Hosting)

**Purpose**: Next.js hosting, serverless functions

**Integration**: Git-based deployment

**Dependency**: Critical (app unreachable if down)

---

### 4. Email Delivery (Supabase Auth)

**Purpose**: Password reset, invitations (via Supabase)

**Integration**: Built-in to Supabase Auth

**Dependency**: Medium (users can still sign in without email)

---

## V1 Services NOT Integrated

- ❌ Sentry (error tracking)
- ❌ Mixpanel/Google Analytics
- ❌ Twilio (SMS)
- ❌ SendGrid (transactional email)
- ❌ AWS S3 (file storage)

---

## References

- **Stripe Integration Boundary**: `033-stripe-integration-boundary.md`
- **Monitoring Surface**: `039-monitoring-surface.md`
