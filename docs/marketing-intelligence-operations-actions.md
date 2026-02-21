# Marketing Intelligence & Operations Server Actions

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements
**Scope:** 7 new server action files across marketing and operations domains

---

## Summary

Added 7 server action files implementing marketing intelligence (A/B testing, behavioral segmentation, content performance tracking) and operational capabilities (kitchen display system, document versioning, document comments, split billing).

All files follow established ChefFlow patterns: `'use server'`, `requireChef()` auth, `(supabase as any)` for untyped tables, Zod input validation, tenant scoping on every query, snake_case-to-camelCase mapping, and `revalidatePath()` after mutations.

---

## Files Created

### Marketing Domain (`lib/marketing/`)

#### 1. `ab-test-actions.ts`
- **Table:** `ab_tests` (migration `20260312000005`)
- **Tenant scope:** `chef_id`
- **Exports:**
  - `createABTest()` — insert a new A/B test linked to a campaign
  - `resolveABTest()` — set winner ('a' or 'b') and resolved_at timestamp
  - `getABTestResults()` — single test with aggregated open/click stats per variant
  - `listABTests()` — all tests for chef, newest first
- **Types:** `ABTest`, `ABTestWithStats`, `CreateABTestInput`

#### 2. `segmentation-actions.ts`
- **Table:** `client_segments` (migration `20260308000001`)
- **Tenant scope:** `tenant_id`
- **Exports:**
  - `buildBehavioralSegment()` — create segment with behavioral filters (event count, spend, recency, tags)
  - `getSegmentPreview()` — preview matching clients without saving
  - `evaluateSegmentFilters()` — re-evaluate saved segment against current client data
- **Types:** `BehavioralFilters`, `SegmentPreview`, `EvaluatedSegment`
- **Note:** Filters are stored as structured JSONB entries (`{field, op, value}`) compatible with existing segment schema.

#### 3. `content-performance-actions.ts`
- **Table:** `content_performance` (migration `20260312000005`)
- **Tenant scope:** `chef_id`
- **Exports:**
  - `recordContentPerformance()` — log metrics for a social media post
  - `getContentROI()` — aggregate stats by platform with inquiry conversion rates (optional date range)
  - `getBestPerformingContent()` — top posts ranked by engagement score (impressions + saves*3 + shares*2)
- **Types:** `ContentPost`, `PlatformROI`, `ContentROISummary`, `RankedContent`

### Operations Domain (`lib/operations/`)

#### 4. `kds-actions.ts`
- **Table:** `service_courses` (migration `20260312000006`)
- **Tenant scope:** `chef_id`
- **Exports:**
  - `getServiceCourses()` — all courses for an event, ordered by course_number
  - `createServiceCourses()` — bulk insert courses for event service plan
  - `fireCourse()` — status='fired', fired_at=now()
  - `markCoursePlated()` — status='plated'
  - `markCourseServed()` — status='served', served_at=now()
  - `mark86()` — status='eighty_sixed'
- **Types:** `ServiceCourse`, `CreateServiceCoursesInput`
- **Note:** Course lifecycle: pending -> fired -> plated -> served | eighty_sixed

#### 5. `document-version-actions.ts`
- **Table:** `document_versions` (migration `20260310000001`)
- **Tenant scope:** `tenant_id`
- **Exports:**
  - `saveDocumentVersion()` — insert new version, auto-increment version_number
  - `getDocumentVersions()` — all versions for entity, newest first
  - `revertToVersion()` — non-destructive: copies old snapshot forward as new version
- **Types:** `DocumentVersion`, `SaveDocumentVersionInput`, `EntityType`
- **Note:** Supports entity types: menu, quote, recipe, contract, prep_sheet

#### 6. `document-comment-actions.ts`
- **Table:** `document_comments` (migration `20260312000006`)
- **Tenant scope:** `chef_id`
- **Exports:**
  - `addComment()` — insert comment on a document
  - `resolveComment()` — set resolved=true
  - `getComments()` — all comments for a document, oldest first
- **Types:** `DocumentComment`, `AddCommentInput`, `DocumentType`

#### 7. `split-billing-actions.ts`
- **Table:** `events.split_billing` JSONB column (migration `20260312000006`)
- **Tenant scope:** `tenant_id` (on events table)
- **Exports:**
  - `setSplitBilling()` — update events.split_billing JSONB; validates percentages sum to 100
  - `getSplitBilling()` — read and parse split_billing config
  - `generateSplitInvoices()` — calculate per-client invoice amounts from splits + quoted_price_cents
- **Types:** `SplitEntry`, `SplitBillingConfig`, `SplitInvoice`, `SplitInvoiceSummary`
- **Note:** Uses `events` table directly (typed), with `as any` casts only for the split_billing column access.

---

## Architecture Notes

- All 7 files pass `npx tsc --noEmit --skipLibCheck` with zero errors
- Tables not in `types/database.ts` use `(supabase as any)` cast pattern
- The `events` table (typed) uses direct access in split-billing-actions.ts, with `as any` only for untyped column access
- Segmentation uses the existing `client_segments` table schema (filters as JSONB array of `{field, op, value}` objects)
- Document versioning is non-destructive: "revert" creates a new version by copying the old snapshot forward
- Split billing validates that percentages sum to 100 before saving

---

## Migration Dependencies

These server actions depend on tables from the following existing migrations:
- `20260308000001_client_segments.sql` — `client_segments` table
- `20260310000001_document_versions.sql` — `document_versions` table
- `20260312000005_marketing_intelligence.sql` — `ab_tests`, `content_performance` tables
- `20260312000006_operations_kds_docs.sql` — `service_courses`, `document_comments` tables, `events.split_billing` column

No new migrations were created.
