# 2026-04-03 Builder Gap-Closure Handoff

## Scope

This handoff captures the structural gap-closure work completed in this pass, the systems still incomplete, and the recommended execution order for the next builder pass.

This repo already has unrelated local changes. This pass only touched the event transition loop, API v2 audit correctness, document snapshot truth surfaces, and the document intelligence router.

## Completed In This Pass

### 1. Event transitions now use the canonical transition service from all major entry points

Files:

- `app/api/cron/event-progression/route.ts`
- `app/api/v2/events/[id]/transition/route.ts`
- `lib/events/transitions.ts`
- `lib/validation/schemas.ts`

What changed:

- Added `actorContext` support to `transitionEvent()` so API-key and system callers can use the FSM without pretending to be a session user.
- Replaced direct status writes in cron and API v2 transition routes with `transitionEvent()`.
- Moved completed-event post-processing into the canonical transition path so completion side effects are no longer bypassed by cron or API v2 callers.

Why this matters:

- The event lifecycle is now materially closer to closed-loop across start, progress, complete, and downstream fan-out.
- Completion no longer depends on which entry point changed the event status.

### 2. Completed-event post-processing is now centralized

Files:

- `lib/events/transitions.ts`

What changed:

- Added a shared completed-event post-processing step inside `transitionEvent()` for loyalty award hooks and hub snapshot capture.

Why this matters:

- Before this pass, those actions only happened through `completeEvent()`. Cron/API v2 completion could skip them entirely.

### 3. API v2 audit writes no longer treat API keys as user IDs

Files:

- `app/api/v2/events/route.ts`
- `app/api/v2/events/[id]/clone/route.ts`
- `app/api/v2/quotes/[id]/send/route.ts`
- `app/api/v2/quotes/[id]/accept/route.ts`
- `app/api/v2/payments/route.ts`
- `app/api/v2/loyalty/members/route.ts`
- `app/api/v2/loyalty/members/[id]/route.ts`

What changed:

- Removed `ctx.keyId` from FK-backed `created_by` / `transitioned_by` writes.
- Preserved API-key audit context in metadata or internal notes where the table supports it.

Why this matters:

- These routes were writing API key IDs into columns that reference `users.id`, creating silent audit insert failures or invalid state capture.

### 4. API v2 document routes now reflect the real snapshot system

Files:

- `app/api/v2/documents/route.ts`
- `app/api/v2/documents/generate/route.ts`

What changed:

- The list route now reads from `event_document_snapshots` instead of the nonexistent `document_snapshots`.
- The list route validates against real snapshot document types.
- The generate route now reports honest support boundaries:
  - operational event packet document types are recognized
  - legacy commercial document types are explicitly marked unsupported on this surface
  - existing snapshot lookup uses the real table and fields

Why this matters:

- The old surface looked complete but was disconnected from the implemented document system.

### 5. Document intelligence routing is now schema-valid and operationally closer to real use

Files:

- `lib/documents/intelligence-router.ts`

What changed:

- Fixed tenant lookup from `chef_id` to `tenant_id`.
- Fixed routed record fields from `routed_entity_id` to `routed_record_id` / `routed_record_type`.
- Added `processed_at` / `updated_at` lifecycle writes.
- Normalized destination values to match the table constraints (`receipt`, `document`, `recipe`, `client`).
- Mapped routed chef document types to valid `chef_documents.document_type` values.
- Switched routed chef documents to valid `source_type='file_upload'`.
- Preserved uploaded file metadata when routing into `chef_documents`.
- Fixed client routing to use `clients.full_name`.
- Normalized routed receipts into the `receipts` bucket before creating `receipt_photos`, so downstream signed URL regeneration still works.

Why this matters:

- The router was previously not just incomplete; it was writing invalid columns, invalid enum values, and destination values that did not match the actual table constraints.

### 6. API v2 event delete/archive semantics are now less misleading

Files:

- `app/api/v2/events/[id]/route.ts`
- `app/api/v2/events/[id]/archive/route.ts`

What changed:

- Deletion is now limited to draft events.
- Archive sets `archived=true` instead of faking a delete-style lifecycle.

Why this matters:

- This aligns the API more closely with the underlying event model and avoids fake transition/audit behavior.

### 7. Verification is clean for this change set

Executed:

- `npm run typecheck:app`
- `npm run test:unit:fsm`

Notes:

- `typecheck:app` initially exposed one regression in `lib/events/transitions.ts` and one unrelated cast issue in `lib/openclaw/catalog-actions.ts`. Both were fixed in this pass.

## Remaining Incomplete Systems

### 1. Tenant isolation is still structurally incomplete

Why this is expected:

- The product/docs define RLS as a core tenant safety layer.

Evidence:

- `database/migrations/20260401000098_disable_rls_all_tables.sql`
- `lib/api/v2/middleware.ts`
- `docs/chefflow-product-definition.md`

Current gap:

- RLS is disabled broadly while API v2 uses an admin client that bypasses RLS.
- Isolation currently depends on every query remembering to scope `tenant_id` correctly.

Impact:

- One missed tenant filter can become a cross-tenant exposure.

Recommended next step:

1. Inventory tenant-scoped tables used by public, chef, client, staff, and API v2 flows.
2. Reintroduce table-level RLS policies first on the highest-risk tables (`events`, `clients`, `quotes`, `ledger_entries`, `loyalty_transactions`, document tables).
3. Narrow admin-client usage to system-only code paths.
4. Add isolation tests for API v2 writes and reads.

### 2. Admin route protection is still not centralized enough

Why this is expected:

- The system already distinguishes chef, client, staff, and admin route classes.

Evidence:

- `lib/auth/route-policy.ts`
- `middleware.ts`
- `app/(admin)/layout.tsx`
- `docs/system-architecture.md`

Current gap:

- Middleware does not enforce admin boundaries directly; admin gating is deferred to layout-level code.

Impact:

- Protection is inconsistent with the rest of the routing model and easier to accidentally bypass with future route additions.

Recommended next step:

1. Move admin gating into centralized route policy enforcement in middleware.
2. Keep layout-level `requireAdmin()` as a second guard, not the primary one.
3. Add route-boundary tests for direct `/admin/*` access attempts.

### 3. Non-blocking failures still are not uniformly captured or recoverable

Why this is expected:

- The repo already contains a silent-failure model and admin UI.

Evidence:

- `lib/monitoring/non-blocking.ts`
- `app/(admin)/admin/silent-failures/page.tsx`
- `app/api/webhooks/stripe/route.ts`

Current gap:

- Many critical side effects still only log to console.
- Replay/retry paths are not standardized.

Impact:

- Silent degradations remain hard to observe and hard to recover from.

Recommended next step:

1. Convert Stripe webhook side effects and outbound integration fan-out to `runNonBlocking()`.
2. Ensure the backing silent-failure table is present in every deployed environment.
3. Add operator replay actions for common failure classes.

### 4. API v2 document generation still lacks a real write path

Why this is expected:

- The UI and internal routes already generate event packet documents.

Evidence:

- `app/api/documents/[eventId]/route.ts`
- `app/api/documents/[eventId]/bulk-generate/route.ts`
- `lib/documents/document-definitions.ts`
- `app/api/v2/documents/generate/route.ts`

Current gap:

- API v2 is now honest about the operational packet surface, but it still does not invoke generation.
- Commercial documents (`invoice`, `quote`, `receipt`, `contract`) are still a separate family with no clean API v2 integration contract.

Impact:

- The documents surface is no longer false-complete, but it is still incomplete.

Recommended next step:

1. Decide whether API v2 should expose:
   - only operational packet documents, or
   - both operational packet documents and commercial documents under one normalized contract.
2. Extract generation logic from `app/api/documents/[eventId]/route.ts` into a reusable service.
3. Make API v2 call that shared service instead of reporting status only.

### 5. Document intelligence still lacks a full product loop

Why this is expected:

- The router and schema imply an upload -> classify -> review -> route workflow.

Evidence:

- `lib/documents/intelligence-router.ts`
- `lib/db/schema/schema.ts` (`document_intelligence_items`)
- `docs/feature-inventory.md`

Current gap:

- The routing path is corrected, but the end-to-end product loop is still incomplete:
  - upload/classification entry points are not clearly wired to a stable review queue
  - operator review and recovery surfaces remain limited
  - downstream verification is not comprehensive

Impact:

- The subsystem is improved but still not a finished operational feature.

Recommended next step:

1. Identify the exact entry points that create `document_intelligence_items`.
2. Ensure every created item can progress to review and then routing.
3. Add a review UI for failed/ambiguous items with retry actions.

## Builder Sequence

Execute the next pass in this order:

1. Restore real tenant isolation guardrails.
2. Centralize admin route enforcement.
3. Decide and normalize the API v2 document contract.
4. Extract shared document generation services and connect API v2 writes.
5. Finish the document intelligence product loop.
6. Migrate remaining non-blocking integration work onto structured failure capture.
7. Add regression coverage for multi-entry-point event transitions, API v2 documents, and tenant isolation.

## What The Next Builder Can Assume

- Event transition entry points are now significantly less fragmented.
- Completed-event post-processing is centralized instead of wrapper-specific.
- API-key audit writes are no longer corrupting FK-backed user columns.
- API v2 document list/generate routes now reflect the real snapshot table and support boundary.
- The document intelligence router no longer writes obviously invalid schema values.
- Typecheck and FSM tests pass on this change set.
