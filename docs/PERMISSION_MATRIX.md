# Permission Matrix (ChefFlow V1)

**Document ID**: PERM-001
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

---

## Purpose

This document defines the **complete permission matrix** for ChefFlow V1. It specifies which roles can perform which actions on which resources across all three portals (Chef Portal, Client Portal, Public Layer).

**Authority**: This is the single source of truth for all authorization decisions.

---

## Permission Model

### Permission Tuple

Every permission is defined as: `(Role, Resource, Action)`

**Roles**:

- `chef` - Tenant owner (full control within tenant)
- `chef_subaccount` - Limited user within tenant (V1: read-only + draft edits)
- `client` - End-user (participates in events)
- `public` - Unauthenticated visitor

**Actions**:

- `CREATE` - Create new resource
- `READ` - View resource
- `UPDATE` - Modify existing resource
- `DELETE` - Remove resource (soft delete)
- `TRANSITION` - Change state (events only)
- `EXECUTE` - Run operation (payments, exports)

---

## Legend

| Symbol | Meaning                                                |
| ------ | ------------------------------------------------------ |
| ✅     | **Allowed** - Full permission                          |
| 🟡     | **Conditional** - Allowed with constraints (see notes) |
| ❌     | **Forbidden** - Explicitly denied                      |
| —      | **N/A** - Not applicable                               |

---

## Chef Portal Resources

### Events

| Action                 | chef                       | chef_subaccount | client | public |
| ---------------------- | -------------------------- | --------------- | ------ | ------ |
| **CREATE**             | ✅                         | 🟡 Draft only   | ❌     | ❌     |
| **READ (own tenant)**  | ✅ All events              | ✅ All events   | ❌     | ❌     |
| **UPDATE (draft)**     | ✅                         | 🟡 If permitted | ❌     | ❌     |
| **UPDATE (non-draft)** | ✅ Limited fields          | ❌              | ❌     | ❌     |
| **DELETE**             | 🟡 Draft only, no payments | ❌              | ❌     | ❌     |
| **TRANSITION**         | ✅ All transitions         | ❌              | ❌     | ❌     |

**Notes**:

- Chef can UPDATE non-draft events: `notes`, `internal_chef_notes` only
- Subaccount UPDATE permission is tenant-configurable (V1: hardcoded to draft-only)
- DELETE is soft delete (`deleted_at` timestamp)

---

### Clients (Client Profiles)

| Action                   | chef                | chef_subaccount   | client              | public |
| ------------------------ | ------------------- | ----------------- | ------------------- | ------ |
| **CREATE**               | ✅                  | 🟡 If permitted   | ❌                  | ❌     |
| **READ (own tenant)**    | ✅ All clients      | ✅ All clients    | ❌                  | ❌     |
| **READ (own profile)**   | —                   | —                 | ✅ Own only         | ❌     |
| **UPDATE**               | ✅ All fields       | 🟡 Limited fields | ❌                  | ❌     |
| **UPDATE (own profile)** | —                   | —                 | 🟡 Safe fields only | ❌     |
| **DELETE**               | 🟡 No active events | ❌                | ❌                  | ❌     |

**Safe fields for client self-update**:

- `full_name`, `phone`, `dietary_restrictions`, `allergies`, `favorite_dishes`, `special_dates`

**Forbidden for client**:

- `tenant_id`, `linked_user_id`, `chef_private_notes`, `tags`

---

### Menus

| Action                                | chef                      | chef_subaccount | client             | public |
| ------------------------------------- | ------------------------- | --------------- | ------------------ | ------ |
| **CREATE**                            | ✅                        | 🟡 If permitted | ❌                 | ❌     |
| **READ (draft)**                      | ✅                        | ✅              | ❌                 | ❌     |
| **READ (finalized, linked to event)** | ✅                        | ✅              | 🟡 Own events only | ❌     |
| **UPDATE (draft)**                    | ✅                        | 🟡 If permitted | ❌                 | ❌     |
| **UPDATE (finalized)**                | ❌ Locked                 | ❌              | ❌                 | ❌     |
| **DELETE**                            | 🟡 Draft only, not linked | ❌              | ❌                 | ❌     |
| **EXECUTE (lock menu)**               | ✅                        | ❌              | ❌                 | ❌     |
| **EXECUTE (export PDF)**              | ✅                        | ✅              | 🟡 Own events only | ❌     |

**Menu projection for client**:

- Includes: `name`, `description`, `sections`, `items`, `allergens`, `dietary_tags`
- Excludes: `chef_notes`, `prep_instructions`, `internal_pricing`

---

### Ledger Entries

| Action                  | chef                 | chef_subaccount       | client             | public |
| ----------------------- | -------------------- | --------------------- | ------------------ | ------ |
| **CREATE**              | ❌ Webhook only      | ❌                    | ❌                 | ❌     |
| **CREATE (adjustment)** | ✅ Via server action | ❌                    | ❌                 | ❌     |
| **READ (own tenant)**   | ✅ All entries       | ❌ Finance restricted | ❌                 | ❌     |
| **READ (own events)**   | —                    | —                     | ✅ Own events only | ❌     |
| **UPDATE**              | ❌ Immutable         | ❌                    | ❌                 | ❌     |
| **DELETE**              | ❌ Immutable         | ❌                    | ❌                 | ❌     |

**Notes**:

- Ledger is append-only via Stripe webhooks or chef manual adjustment
- Clients can view ledger entries for events they participate in
- Subaccounts CANNOT access finance (V1 scope lock)

---

### Event Transitions (Audit Log)

| Action                | chef               | chef_subaccount    | client             | public |
| --------------------- | ------------------ | ------------------ | ------------------ | ------ |
| **CREATE**            | ❌ System only     | ❌                 | ❌                 | ❌     |
| **READ (own tenant)** | ✅ All transitions | ✅ All transitions | ❌                 | ❌     |
| **READ (own events)** | —                  | —                  | ✅ Own events only | ❌     |
| **UPDATE**            | ❌ Immutable       | ❌                 | ❌                 | ❌     |
| **DELETE**            | ❌ Immutable       | ❌                 | ❌                 | ❌     |

**Notes**:

- Transitions created automatically by `transitionEvent()` server action
- Client can view state change history for own events

---

### Invitations

| Action                    | chef             | chef_subaccount | client | public          |
| ------------------------- | ---------------- | --------------- | ------ | --------------- |
| **CREATE**                | ✅               | ❌              | ❌     | ❌              |
| **READ (own tenant)**     | ✅               | ❌              | ❌     | ❌              |
| **READ (own invitation)** | —                | —               | ❌     | 🟡 Token holder |
| **UPDATE**                | ❌ Immutable     | ❌              | ❌     | ❌              |
| **DELETE**                | ❌ Cannot revoke | ❌              | ❌     | ❌              |
| **EXECUTE (accept)**      | —                | —               | —      | ✅ Token holder |

**Notes**:

- Public user with valid token can accept invitation
- Token provides one-time access (becomes invalid after use)

---

### Messages

| Action                       | chef            | chef_subaccount | client             | public |
| ---------------------------- | --------------- | --------------- | ------------------ | ------ |
| **CREATE (in event thread)** | ✅              | ✅              | 🟡 Own events only | ❌     |
| **READ (event thread)**      | ✅ All threads  | ✅ All threads  | 🟡 Own events only | ❌     |
| **UPDATE**                   | ❌ Immutable    | ❌              | ❌                 | ❌     |
| **DELETE (soft)**            | 🟡 Own messages | 🟡 Own messages | 🟡 Own messages    | ❌     |

**Notes**:

- Messages scoped to event threads
- Users can only soft-delete their own messages (`deleted_at` timestamp)

---

### Attachments

| Action              | chef               | chef_subaccount    | client             | public |
| ------------------- | ------------------ | ------------------ | ------------------ | ------ |
| **CREATE (upload)** | ✅                 | ✅                 | 🟡 Own events only | ❌     |
| **READ (download)** | ✅ All attachments | ✅ All attachments | 🟡 Own events only | ❌     |
| **DELETE**          | 🟡 Own attachments | 🟡 Own attachments | 🟡 Own attachments | ❌     |

**Notes**:

- Attachments scoped to event threads
- Download via signed URL (expires in 1 hour)
- Users can only delete attachments they uploaded

---

### Loyalty Balance

| Action                    | chef           | chef_subaccount | client              | public |
| ------------------------- | -------------- | --------------- | ------------------- | ------ |
| **READ (client balance)** | ✅ All clients | ✅ All clients  | 🟡 Own balance only | ❌     |
| **UPDATE**                | ❌ Computed    | ❌              | ❌                  | ❌     |
| **EXECUTE (redeem)**      | —              | —               | ❌ V2 feature       | ❌     |

**Notes**:

- Loyalty balance is system-derived from ledger entries
- No direct mutation allowed (V1 scope)

---

## Client Portal Resources

### Events (Client View)

| Action                            | chef | chef_subaccount | client                | public |
| --------------------------------- | ---- | --------------- | --------------------- | ------ |
| **READ (participated events)**    | —    | —               | ✅ Own only           | ❌     |
| **UPDATE**                        | —    | —               | ❌                    | ❌     |
| **TRANSITION (accept proposal)**  | —    | —               | 🟡 If status=proposed | ❌     |
| **TRANSITION (decline proposal)** | —    | —               | 🟡 If status=proposed | ❌     |
| **EXECUTE (pay deposit)**         | —    | —               | 🟡 If status=accepted | ❌     |

**Notes**:

- Client can only view events where `client_id = session.client_id`
- Client can trigger limited transitions (accept/decline proposal)
- Payment redirect to Stripe Checkout (client cannot mutate ledger directly)

---

### Client Dashboard

| Action                     | chef | chef_subaccount | client | public |
| -------------------------- | ---- | --------------- | ------ | ------ |
| **READ (upcoming events)** | —    | —               | ✅     | ❌     |
| **READ (past events)**     | —    | —               | ✅     | ❌     |
| **READ (loyalty summary)** | —    | —               | ✅     | ❌     |

**Notes**:

- Dashboard aggregates data from events, ledger, loyalty views
- All data scoped to authenticated client

---

## Public Layer Resources

### Public Pages

| Action                  | chef | chef_subaccount | client | public |
| ----------------------- | ---- | --------------- | ------ | ------ |
| **READ (home page)**    | ✅   | ✅              | ✅     | ✅     |
| **READ (how it works)** | ✅   | ✅              | ✅     | ✅     |
| **READ (pricing)**      | ✅   | ✅              | ✅     | ✅     |
| **READ (services)**     | ✅   | ✅              | ✅     | ✅     |
| **READ (terms)**        | ✅   | ✅              | ✅     | ✅     |
| **READ (privacy)**      | ✅   | ✅              | ✅     | ✅     |

**Notes**:

- All public pages are accessible to everyone
- No authentication required

---

### Inquiries (Contact Form)

| Action     | chef              | chef_subaccount | client | public |
| ---------- | ----------------- | --------------- | ------ | ------ |
| **CREATE** | ✅                | ✅              | ✅     | ✅     |
| **READ**   | ❌ Future feature | ❌              | ❌     | ❌     |

**Notes**:

- Public inquiry form stores submission in database
- No portal to view inquiries (V1 scope: email notification only)

---

### Auth (Signup/Login)

| Action                                 | chef | chef_subaccount | client | public          |
| -------------------------------------- | ---- | --------------- | ------ | --------------- |
| **EXECUTE (chef signup)**              | —    | —               | —      | ✅              |
| **EXECUTE (client signup via invite)** | —    | —               | —      | ✅ Token holder |
| **EXECUTE (login)**                    | ✅   | ✅              | ✅     | ✅              |
| **EXECUTE (logout)**                   | ✅   | ✅              | ✅     | —               |
| **EXECUTE (password reset)**           | ✅   | ✅              | ✅     | ✅              |

**Notes**:

- Public users can sign up as chef or accept client invitation
- All authenticated users can log out

---

## Cross-Portal Access Rules

### Can Chef Access Client Portal?

| Resource                | Access                          |
| ----------------------- | ------------------------------- |
| **Client dashboard**    | ❌ Redirected to chef portal    |
| **Client event view**   | ❌ View via chef portal instead |
| **Client profile edit** | ❌ Edit via chef portal instead |

**Rule**: Chef role is redirected to `/chef/*` by middleware. No client portal access.

---

### Can Client Access Chef Portal?

| Resource              | Access                         |
| --------------------- | ------------------------------ |
| **Chef dashboard**    | ❌ Redirected to client portal |
| **Events management** | ❌ No access                   |
| **Finance/ledger**    | ❌ No access                   |

**Rule**: Client role is redirected to `/client/*` by middleware. No chef portal access.

---

### Can Public Access Authenticated Portals?

| Resource          | Access                 |
| ----------------- | ---------------------- |
| **Chef portal**   | ❌ Redirected to login |
| **Client portal** | ❌ Redirected to login |

**Rule**: Middleware enforces authentication. Unauthenticated users redirected to `/auth/signin`.

---

## Special Cases

### System Role (Webhooks)

| Action                         | system (webhook)             |
| ------------------------------ | ---------------------------- |
| **CREATE ledger_entry**        | ✅ Via service role          |
| **TRANSITION event (to paid)** | ✅ Via service role          |
| **READ (bypass RLS)**          | ✅ Service role bypasses RLS |

**Notes**:

- Stripe webhooks use service role key (bypasses RLS)
- Webhook handler validates signature before mutation
- Idempotency enforced via unique constraints

---

### Anonymous Access (Token Holders)

| Resource                     | Access                  |
| ---------------------------- | ----------------------- |
| **Accept client invitation** | ✅ Valid token required |
| **View shared menu PDF**     | 🟡 Future: signed URL   |

**Notes**:

- Invitation token provides one-time access
- Tokens expire after 7 days or after use

---

## Enforcement Layers

### 1. Middleware (Route Guard)

**File**: `middleware.ts`

**Enforces**:

- `/chef/*` routes require `chef` or `chef_subaccount` role
- `/client/*` routes require `client` role
- All authenticated routes require valid session

**Action**: Redirect to appropriate portal or login page

---

### 2. Server Layout (Portal Selection)

**Files**: `app/(chef)/layout.tsx`, `app/(client)/layout.tsx`

**Enforces**:

- Double-check role matches portal
- Render correct navigation/layout

**Action**: Throw error if role mismatch (defense in depth)

---

### 3. RLS Policies (Database)

**Enforces**:

- Row-level filtering by `tenant_id` and role
- Clients can only query events where `client_id = session.client_id`

**Action**: Return zero rows if unauthorized

---

### 4. Server Actions (Operation Permissions)

**Enforces**:

- Role check before mutation
- Resource ownership check (tenant_id match)
- State validation (e.g., can only update draft events)

**Action**: Throw error if unauthorized

---

## Permission Verification

### Test Matrix

| Test Case                                         | Expected Behavior              |
| ------------------------------------------------- | ------------------------------ |
| Chef queries events in own tenant                 | ✅ Returns all events          |
| Chef queries events in another tenant             | ❌ Zero rows (RLS blocks)      |
| Chef updates draft event                          | ✅ Success                     |
| Chef updates confirmed event                      | 🟡 Limited fields only         |
| Subaccount transitions event status               | ❌ Error "Unauthorized"        |
| Client views own events                           | ✅ Returns participated events |
| Client views another client's events              | ❌ Zero rows (RLS blocks)      |
| Client updates event                              | ❌ Error "Unauthorized"        |
| Client accepts proposal (status=proposed)         | ✅ Transition to accepted      |
| Client accepts proposal (status≠proposed)         | ❌ Error "Invalid state"       |
| Public user accesses chef portal                  | ❌ Redirect to login           |
| Unauthenticated user accepts invite (valid token) | ✅ Account created             |

---

## Violations and Enforcement

### What Happens on Permission Violation?

| Layer             | Violation             | Response                   |
| ----------------- | --------------------- | -------------------------- |
| **Middleware**    | Wrong portal access   | 302 Redirect               |
| **RLS**           | Cross-tenant query    | Zero rows (silent failure) |
| **Server Action** | Unauthorized mutation | Throw Error                |
| **Server Layout** | Role mismatch         | 500 Error page             |

---

## Future Enhancements (V2+)

### Role-Based Permissions (Not in V1)

- Configurable subaccount permissions per user
- Multi-role users (chef in one tenant, client in another)
- Custom roles beyond chef/subaccount/client

### Resource-Level Permissions (Not in V1)

- Event-level permissions (e.g., subaccount can only edit specific events)
- Client-level permissions (e.g., subaccount can only view specific clients)

---

## Related Documents

- [01_ROLE_AUTHORITY_MODEL.md](chef-portal/01_ROLE_AUTHORITY_MODEL.md) - Role resolution and enforcement
- [CLIENT_PORTAL_DATA_OWNERSHIP.md](client-portal/CLIENT_PORTAL_DATA_OWNERSHIP.md) - Client data ownership model
- [023-rls-policy-contract.md](architecture/03-security-rbac-rls/023-rls-policy-contract.md) - RLS policy definitions
- [server-actions-surface.md](v1/01-architecture/server-actions-surface.md) - Server action authorization

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
**Governance**: ChefFlow System Constitution
