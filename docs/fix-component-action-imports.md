# Fix: Component-to-Action Import Mismatches

**Date:** 2026-02-20
**Branch:** `feature/scheduling-improvements`

## Summary

Fixed 10 TypeScript errors where UI components imported non-existent or wrongly-named functions from server action files, or called server actions with incorrect argument counts/shapes.

## Root Cause

Components were written against assumed server action signatures that diverged from the actual implementations. This included wrong function names, wrong casing, incorrect argument counts, and mismatched return types.

## Changes Made

### 1. `components/documents/comment-thread.tsx`

**Action file:** `lib/operations/document-comment-actions.ts`

- Removed non-existent `unresolveComment` import (only `resolveComment` exists in the action file, which sets `resolved = true` with no toggle-back)
- Fixed `addComment` call from `addComment(documentType, entityId, text)` (3 args) to `addComment({ documentType, entityId, authorName, commentText })` (single Zod object)
- Added type import for `AddCommentInput` to correctly cast the `documentType` parameter
- Updated resolve toggle handler to only support resolving (not unresolving), since the server action has no unresolve capability

### 2. `components/documents/version-history.tsx`

**Action file:** `lib/operations/document-version-actions.ts`

- Fixed `revertToVersion(entityType, entityId, versionId)` (3 args) to `revertToVersion(versionId)` (1 arg) -- the action only needs the version ID since it looks up entity details internally

### 3. `components/marketing/ab-test-config.tsx`

**Action file:** `lib/marketing/ab-test-actions.ts`

- Fixed import `createAbTest` to `createABTest` (uppercase B)
- Fixed import `resolveAbTest` to `resolveABTest` (uppercase B)
- Fixed `resolveABTest` call to pass lowercase winner (`'a' | 'b'`) to match the server action's Zod schema
- Fixed `createABTest` result handling: action returns `{ success, test }`, not a bare test object

### 4. `components/marketing/behavioral-segment-builder.tsx`

**Action file:** `lib/marketing/segmentation-actions.ts`

- Replaced non-existent `createBehavioralSegment` with `buildBehavioralSegment`
- Replaced non-existent `previewSegmentCount` with `getSegmentPreview` (returns `{ count, clientIds }`, not just a number)
- Removed non-existent `deleteSegment` import (no delete action exists); replaced handler with local-state-only removal
- Fixed `buildBehavioralSegment` call: uses `{ name, filters }` not `{ name, filterCriteria }`
- Fixed result handling to destructure `result.segment`

### 5. `components/marketing/email-builder.tsx`

**Action file:** `lib/marketing/email-template-actions.ts`

- Replaced non-existent `createEmailTemplate` and `updateEmailTemplate` imports with `saveEmailTemplate` (which upserts by name)
- Consolidated create/update code paths to both use `saveEmailTemplate`
- Fixed result handling to destructure `result.template`

### 6. `components/operations/course-fire-button.tsx`

**Action file:** `lib/operations/kds-actions.ts`

- Fixed import `markPlated` to `markCoursePlated`
- Fixed import `markServed` to `markCourseServed`
- Fixed `ACTION_MAP` type from `Promise<void>` to `Promise<any>` (actions return `{ success, course }`)

### 7. `components/operations/eighty-six-modal.tsx`

**Action file:** `lib/operations/kds-actions.ts`

- Fixed `mark86(courseId, substitute)` (2 args) to `mark86(courseId)` (1 arg) -- the action only accepts a courseId

### 8. `components/portfolio/highlight-editor.tsx`

**Action file:** `lib/portfolio/highlight-actions.ts`

- Fixed import `addHighlight` to `createHighlight`
- Fixed import `removeHighlight` to `deleteHighlight`
- Removed non-existent `reorderHighlights` import (not exported by the action file)
- Fixed `createHighlight` result handling: action returns `{ success, highlight }`, not a bare highlight object

### 9. `components/portfolio/grid-editor.tsx`

**Action file:** `lib/portfolio/actions.ts`

- Fixed `addPortfolioItem` result handling: action returns `{ success, item }` but the component was pushing `result` directly into state instead of `result.item`

### 10. `components/operations/kds-view.tsx`

**Action file:** `lib/operations/kds-actions.ts`

- Removed redundant `course.status !== 'served'` check on line 146 that was inside a block already guarded by `course.status !== 'served' && course.status !== 'eighty_sixed'` on line 139. TypeScript correctly narrowed the type to exclude `'served'`, making the inner comparison a type error.

## Files Modified

| File | Type |
|---|---|
| `components/documents/comment-thread.tsx` | Component |
| `components/documents/version-history.tsx` | Component |
| `components/marketing/ab-test-config.tsx` | Component |
| `components/marketing/behavioral-segment-builder.tsx` | Component |
| `components/marketing/email-builder.tsx` | Component |
| `components/operations/course-fire-button.tsx` | Component |
| `components/operations/eighty-six-modal.tsx` | Component |
| `components/operations/kds-view.tsx` | Component |
| `components/portfolio/highlight-editor.tsx` | Component |
| `components/portfolio/grid-editor.tsx` | Component |

## No Action Files Were Modified

All 10 fixes were made exclusively in the component files. The server action files were correct as-is -- the components needed to match them.

## Testing Notes

- These are all TypeScript compilation errors, so a clean `npx tsc --noEmit --skipLibCheck` covering these files would confirm the fixes.
- Runtime behavior should be verified for each component, especially:
  - Comment thread: verify adding and resolving comments works
  - Email builder: verify that the upsert-by-name behavior of `saveEmailTemplate` correctly handles both create and update flows
  - Behavioral segment builder: the delete functionality is now local-only (no server action exists for delete)
