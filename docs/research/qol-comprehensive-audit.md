# Quality of Life (QoL) Comprehensive Audit & Research

> **Date:** 2026-03-15
> **Scope:** Full codebase audit + industry research + user journey mapping
> **Goal:** Identify every QoL gap, benchmark against industry best practices, create implementation plan

---

## Executive Summary

ChefFlow has an excellent QoL foundation in its 5 core forms (event, inquiry, quote, menu, client creation). However, **180 of 184 forms (97.8%) lack protection**. The 5 protected forms use IndexedDB drafts, unsaved-changes guards, and offline-safe mutations. The remaining 180 forms (settings, editors, modals, finance, staff, compliance, communication) have zero draft persistence, zero navigation protection, and zero crash recovery.

Industry benchmarks from Figma, Notion, Linear, Google Docs, and Superhuman show that users in 2025-2026 expect auto-save everywhere, not just on "important" forms. A chef losing 15 minutes of recipe entry because their phone died is indistinguishable from a bug.

---

## Part 1: Industry Research & Best Practices

### 1.1 Auto-Save & Draft Persistence

**What leaders do:**

- **Figma** saves continuously via delta-based autosave. Changes persist even when offline, stored locally, then synced on reconnect. Their engineering blog details the challenge: serialization must never block the UI thread (even 100ms stutters are unacceptable). They save deltas, not full documents.
  - Source: [Behind the feature: autosave (Figma Blog, 2024)](https://www.figma.com/blog/behind-the-feature-autosave/)

- **Google Docs** saves every keystroke with ~2-second debounce. "All changes saved" indicator is always visible. Offline mode via service worker stores changes in IndexedDB.

- **Notion** auto-saves blocks individually. Each block is its own unit of persistence. No "save" button exists anywhere in the product.

- **Linear** auto-saves issue descriptions, comments, and all form fields. The command menu (Cmd+K) is the primary interaction model.

**User expectations (2025-2026):**

- Auto-save is table stakes. If a form has a "Save" button but no auto-save, users assume their work is safe until they discover it isn't.
- The "save" button should be a manual checkpoint, not the only way to persist.
- Draft recovery after browser crash is expected, not a premium feature.
- Industry benchmarks: Google Docs ~5s debounce, React Admin 3000ms default, form save 1000ms, search/API 300ms.

**The Trust Problem (from HN, Jan 2026):**

> "Autosave is a trust feature. When it fails, users don't blame the browser. They blame the product, and they stop trusting it."
> "When multiple tabs write to storage, whichever tab writes last wins and the other loses silently."
> "Storage quotas exist and are smaller than most people think. When those limits are reached, writes may fail or be ignored."

**Critical insight:** Auto-save alone is insufficient. You need auto-save + recovery + conflict detection + quota monitoring + multi-tab awareness. ChefFlow's `useDurableDraft` already handles most of this (IndexedDB, schema versioning, restore prompts). The gap is adoption, not architecture.

**Key design decision - throttle vs debounce:** Debounce resets the timer on every keystroke. Throttle guarantees periodic saves. For auto-save, throttle is safer because if a disaster occurs during continuous typing, only the last few seconds are lost. With debounce alone, a user who types continuously without pausing could lose minutes. Our 700ms debounce is fine for most forms, but long-form text editors (email composer, recipe method, contract templates) should also use a throttled backup save every 5-10 seconds.

**ChefFlow gap:** Only 5 of 184 forms auto-save. The remaining 180 rely entirely on the user clicking "Save" before navigating away, closing the tab, or losing power. No intermediate persistence.

### 1.2 Session Recovery

**Best practices:**

- Store form state in IndexedDB (survives tab close, browser crash, device restart)
- On app load, check for orphaned drafts and offer restoration
- After auth token expiry, preserve local state and resume after re-login
- Track "last active page" so users return to where they left off

**User quotes from forums:**

- _"I was filling out a long form on my phone, got a call, came back and everything was gone. I didn't go back to that app."_ (common pattern in UX research)
- _"The worst experience is when you spend 20 minutes filling something out and the app just... forgets."_

**ChefFlow gap:** No "resume where you left off" after session expiry. Drafts in the 5 protected forms survive crashes, but the other 180 forms lose everything.

### 1.3 Form Data Protection

**Patterns used by top apps:**

- `beforeunload` event (browser-level "are you sure?" dialog)
- Router-level navigation guards (intercept Next.js route changes)
- `popstate` interception (back/forward button protection)
- Link click interception (prevent accidental internal navigation)
- Auto-draft on blur/navigate (save state before leaving, even if user didn't click save)

**ChefFlow status:** The `useUnsavedChangesGuard` hook implements ALL of these patterns correctly. It's production-quality. The problem is it's only used in 5 places.

### 1.4 Undo/Redo

**How modern apps implement it:**

- **Command Pattern:** Every mutation is an object with `execute()` and `undo()` methods. A history stack tracks executed commands.
- **Snapshot-based:** Store previous state snapshots. Undo = restore previous snapshot.
- **Event sourcing:** Store events, replay forward/backward.

**What users expect:**

- Ctrl+Z works everywhere (not just in text inputs, but for actions like delete, move, status change)
- Linear: "Undo action" toast appears after destructive actions with a timed undo window
- Gmail: "Message sent. Undo" with 5-30 second window
- Notion: Full Ctrl+Z history for block edits

**ChefFlow gap:** Zero undo/redo. No action history, no undo toasts, no Ctrl+Z beyond native browser text undo in input fields.

### 1.5 Error Boundaries & Resilience

**Best practices:**

- Granular error boundaries around independent UI sections (a broken widget shouldn't take down the whole page)
- "Something went wrong" with retry button, not a white screen
- Automatic retry for transient network failures
- Circuit breaker pattern for repeatedly failing services

**ChefFlow status:** 20 route-level error pages exist. One generic `ErrorBoundary` component. But no granular boundaries around dashboard widgets, panel sections, or async-loaded components. A single broken widget in a dashboard can crash the entire page.

### 1.6 Keyboard Shortcuts & Command Palette

**Industry standard (2025-2026):**

- Cmd+K command palette is universal (Notion, Linear, Slack, VS Code, Vercel, Raycast)
- Chord shortcuts (g then d = go to dashboard) popularized by GitHub and Linear
- ? to show shortcuts help
- / to focus search
- Keyboard navigation for all lists (arrow keys, Enter to select, Escape to close)

**ChefFlow status:** Excellent. Already has Cmd+K palette, chord shortcuts, ? help panel, / search. This is above industry average.

### 1.7 Offline Support

**Best practices:**

- IndexedDB for action queuing
- Service worker for asset caching
- Optimistic UI with rollback
- Visual indicator of online/offline state
- Auto-replay queued actions on reconnect

**ChefFlow status:** Excellent. Full offline queue with retry, status toasts, nav indicator. Production-quality implementation.

### 1.8 Smart Notifications & Proactive Alerts

**What top SaaS platforms do:**

- Deadline approaching warnings (24h, 1h before)
- Follow-up reminders for stale items
- Activity digests (daily/weekly summaries)
- Contextual nudges ("You have 3 unread inquiries")

**ChefFlow status:** Has scheduled follow-ups and lifecycle routes. Toast system in place. Could benefit from more proactive in-app nudges.

### 1.9 Data Export & Portability

**User expectations:**

- Export my data in standard formats (CSV, PDF, JSON)
- Backup/restore capabilities
- GDPR-compliant data portability

**ChefFlow status:** CSV export for some reports, PDF for generated documents. No comprehensive "export all my data" feature. No JSON export for full account backup.

---

## Part 2: Codebase Audit Results

### 2.1 What's Already Excellent

| Feature                     | Implementation                                                                     | Files                                          |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| IndexedDB Draft Persistence | `useDurableDraft` - 700ms debounce, schema versioning, 24h expiry, restore prompts | `lib/drafts/use-durable-draft.ts`              |
| Unsaved Changes Guard       | `useUnsavedChangesGuard` - beforeunload + popstate + link intercept + dialog       | `lib/navigation/use-unsaved-changes-guard.ts`  |
| Offline Mutations           | `useIdempotentMutation` - idempotency keys, offline queue, retry, rollback         | `lib/offline/use-idempotent-mutation.ts`       |
| Offline Queue               | IndexedDB FIFO queue with status tracking, auto-replay on reconnect                | `lib/offline/idb-queue.ts`                     |
| Save State Model            | 5-state model: UNSAVED, SAVING, SAVED, OFFLINE_QUEUED, SAVE_FAILED                 | `lib/save-state/model.ts`                      |
| QoL Metrics                 | Beacon-based tracking of draft restores, save failures, conflicts                  | `lib/qol/metrics-client.ts`                    |
| Network Status              | Online/offline detection with `wasOffline` flag                                    | `lib/offline/use-network-status.ts`            |
| Offline Provider            | Central state management with pending count polling                                | `components/offline/offline-provider.tsx`      |
| View State Persistence      | URL/localStorage/server strategies for filters, scroll, sorting                    | `lib/view-state/use-persistent-view-state.ts`  |
| Command Palette             | Fuzzy search, 40+ nav items, data results, recent items                            | `components/search/command-palette.tsx`        |
| Keyboard Shortcuts          | Chord system, global provider, help panel                                          | `components/ui/keyboard-shortcut-provider.tsx` |
| Loading States              | 60+ route loaders, skeleton components, widget shells                              | Various `loading.tsx` files                    |
| Toast System                | Sonner with info/success/warning/error variants, ARIA labels                       | 50+ usage points                               |

### 2.2 The 5 Protected Forms

These forms use the full QoL stack (drafts + guard + optimistic + state badge):

1. `components/events/event-form.tsx`
2. `components/inquiries/inquiry-form.tsx`
3. `components/quotes/quote-form.tsx`
4. `app/(chef)/menus/new/create-menu-form.tsx`
5. `app/(chef)/clients/new/client-create-form.tsx`

### 2.3 The 180 Unprotected Forms (by risk level)

#### CRITICAL RISK (10+ fields, extensive user input, high loss impact)

| #   | File                                                                   | What It Does           | Fields                                   |
| --- | ---------------------------------------------------------------------- | ---------------------- | ---------------------------------------- |
| 1   | `app/(chef)/recipes/new/create-recipe-client.tsx`                      | New recipe creation    | ~25 state fields                         |
| 2   | `app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx`                  | Recipe editing         | ~25 state fields                         |
| 3   | `app/(chef)/settings/my-profile/chef-profile-form.tsx`                 | Chef profile           | 10+ fields (bio, tagline, phone, images) |
| 4   | `components/communication/email-composer.tsx`                          | Email composition      | Subject + body (long-form text)          |
| 5   | `components/communication/template-editor.tsx`                         | Template editing       | Name, subject, body, category            |
| 6   | `components/vendors/vendor-form.tsx`                                   | Vendor management      | 10+ fields                               |
| 7   | `components/expenses/expense-form.tsx`                                 | Expense entry          | 15+ fields + receipt upload              |
| 8   | `components/contracts/contract-template-editor.tsx`                    | Contract templates     | Full document editing                    |
| 9   | `components/menus/menu-doc-editor.tsx`                                 | Menu document          | Full document editing                    |
| 10  | `app/(chef)/settings/culinary-profile/page.tsx`                        | Culinary questionnaire | Multi-field questionnaire                |
| 11  | `app/(chef)/settings/professional/professional-development-client.tsx` | Professional dev       | Multi-tab form system                    |
| 12  | `components/communication/business-hours-editor.tsx`                   | Business hours         | Complex schedule config                  |
| 13  | `components/quotes/proposal-section-editor.tsx`                        | Proposal sections      | Rich text editing                        |
| 14  | `components/prospecting/script-editor.tsx`                             | Call scripts           | Long-form text editing                   |

#### HIGH RISK (5-10 fields, meaningful user input)

| #   | File                                                          | What It Does          |
| --- | ------------------------------------------------------------- | --------------------- |
| 1   | `app/(chef)/settings/profile/profile-form.tsx`                | Profile settings      |
| 2   | `app/(chef)/settings/emergency/emergency-contacts-client.tsx` | Emergency contacts    |
| 3   | `components/aar/aar-form.tsx`                                 | Post-service ratings  |
| 4   | `components/calls/call-form.tsx`                              | Call logging          |
| 5   | `components/clients/onboarding-form.tsx`                      | Client onboarding     |
| 6   | `components/inquiries/platform-spend-form.tsx`                | Platform spend        |
| 7   | `components/staff/staff-member-form.tsx`                      | Staff details         |
| 8   | `components/finance/add-manual-transaction-form.tsx`          | Manual transactions   |
| 9   | `components/finance/recurring-invoice-form.tsx`               | Recurring invoices    |
| 10  | `components/finance/payroll/employee-form.tsx`                | Payroll employee      |
| 11  | `components/finance/payroll/payroll-entry-form.tsx`           | Payroll entry         |
| 12  | `components/finance/deposit-settings-form.tsx`                | Deposit config        |
| 13  | `components/finance/event-sales-tax-form.tsx`                 | Sales tax             |
| 14  | `components/finance/home-office-form.tsx`                     | Home office deduction |
| 15  | `components/inventory/add-inventory-item-form.tsx`            | Inventory items       |
| 16  | `components/inventory/upload-vendor-invoice-form.tsx`         | Invoice processing    |
| 17  | `components/safety/incident-form.tsx`                         | Incident reporting    |
| 18  | `components/compliance/insurance-policy-form.tsx`             | Insurance policy      |
| 19  | `components/protection/continuity-plan-form.tsx`              | Business continuity   |
| 20  | `components/clients/demographics-editor.tsx`                  | Client demographics   |
| 21  | `components/clients/personal-info-editor.tsx`                 | Client personal info  |
| 22  | `components/community/community-profile-editor.tsx`           | Community profile     |
| 23  | `components/community/directory-listing-editor.tsx`           | Directory listing     |
| 24  | `components/hub/hub-profile-editor.tsx`                       | Hub profile           |
| 25  | `components/marketing/social-template-editor.tsx`             | Social templates      |
| 26  | `components/portfolio/grid-editor.tsx`                        | Portfolio grid        |
| 27  | `components/portfolio/highlight-editor.tsx`                   | Portfolio highlights  |
| 28  | `components/social/social-caption-editor.tsx`                 | Social captions       |
| 29  | `components/settings/cancellation-policy-editor.tsx`          | Cancellation policy   |
| 30  | `app/(chef)/loyalty/settings/loyalty-settings-form.tsx`       | Loyalty settings      |
| 31  | `app/(chef)/loyalty/raffle/create-raffle-form.tsx`            | Raffle creation       |
| 32  | `components/vendors/daily-revenue-form.tsx`                   | Daily revenue         |
| 33  | `components/vendors/invoice-form.tsx`                         | Vendor invoices       |

#### MEDIUM RISK (3-5 fields, moderate input)

~90 forms including: quick notes, call outcomes, fun Q&A, travel legs, mileage logs, tip logs, payment plans, journey entries, media panels, task forms, shift forms, goal check-ins, device modals, prospect modals, calendar entries, feedback forms, survey forms, and numerous settings toggles.

#### LOW RISK (Simple toggles, single selections)

~40 forms including: display-only settings, filter forms, search inputs, simple toggle panels.

### 2.4 Missing QoL Systems

| System                          | Status                                | Impact                                       |
| ------------------------------- | ------------------------------------- | -------------------------------------------- |
| **Undo/Redo**                   | Not implemented                       | Users can't reverse accidental changes       |
| **Granular Error Boundaries**   | Missing on widgets/panels             | One broken widget crashes whole page         |
| **Auth Recovery Flow**          | Missing                               | Users lose context after session expiry      |
| **"Resume Where You Left Off"** | Missing                               | No last-page tracking on re-login            |
| **Bulk Data Export**            | Partial (CSV only)                    | No comprehensive account export              |
| **Conflict Resolution UX**      | Detection exists, resolution is basic | Users see conflict but resolution is unclear |

---

## Part 3: User Journey Friction Map

### 3.1 Critical User Journeys

**Journey 1: Chef creates a new recipe**

1. Navigate to Recipes > New (**no draft protection**)
2. Enter ~25 fields (name, description, method, ingredients, tags, cuisine, etc.)
3. Phone rings, chef answers, phone screen times out
4. **ALL DATA LOST** - no auto-save, no draft recovery
5. Chef has to re-enter everything from scratch

- **Risk:** HIGH - recipes can take 15-30 minutes to enter
- **Fix:** Add `useDurableDraft` + `useUnsavedChangesGuard`

**Journey 2: Chef writes an email to a client**

1. Open communication > compose email
2. Write personalized multi-paragraph email
3. Accidentally click a sidebar nav link
4. **EMAIL BODY LOST** - no navigation guard, no draft

- **Risk:** HIGH - personalized emails take 5-10 minutes
- **Fix:** Add draft persistence + navigation guard

**Journey 3: Chef updates their profile**

1. Navigate to Settings > My Profile
2. Update bio, tagline, phone, website, upload new photo
3. Browser crashes (or tab accidentally closed)
4. **ALL CHANGES LOST** - no draft, no auto-save

- **Risk:** HIGH - profile updates involve careful copywriting
- **Fix:** Add draft persistence

**Journey 4: Chef logs an expense after an event**

1. Open expense form
2. Enter amount, category, vendor, date, description, upload receipt
3. Receipt upload takes time, chef switches tabs to check email
4. Comes back, form state is preserved (SPA), but if they refresh...
5. **ALL DATA LOST** on refresh

- **Risk:** HIGH - expense data + receipt uploads
- **Fix:** Add draft persistence

**Journey 5: Chef fills out a compliance form**

1. Navigate to Settings > Compliance > HACCP or Insurance
2. Fill in multi-section compliance data
3. Gets interrupted, navigates away
4. **ALL DATA LOST**

- **Risk:** HIGH - compliance data is tedious to re-enter
- **Fix:** Add draft persistence + navigation guard

**Journey 6: Client submits a review or feedback**

1. Open public review/feedback link
2. Write detailed multi-paragraph review
3. Phone dies (low battery)
4. **REVIEW LOST** - public forms have no persistence

- **Risk:** MEDIUM - clients won't re-write a detailed review
- **Fix:** Add localStorage draft for public forms

### 3.2 Lower-Risk but Still Frustrating Journeys

- Chef editing business hours (complex time grid, lost on navigate)
- Chef writing call scripts for prospecting (long-form text, lost on navigate)
- Chef configuring cancellation policy (legal text, lost on navigate)
- Chef entering staff payroll data (multiple entries, lost on navigate)
- Chef logging mileage/tips (small but frequent data entry)

---

## Part 4: Implementation Plan

### Phase 1: Universal Form Protection (HIGH IMPACT, MODERATE EFFORT)

**Goal:** Every form in the app gets basic crash recovery and navigation protection.

**Strategy:** Create a lightweight wrapper hook that combines `useDurableDraft` + `useUnsavedChangesGuard` with sensible defaults, making it trivial to add to any form.

```
useProtectedForm({
  surfaceId: 'recipe-create',
  recordId: null,
  tenantId: user.tenantId,
  defaultData: initialValues,
})
```

**Priority order for rollout:**

1. Recipe create/edit forms (highest user pain)
2. Email composer + template editor
3. Chef profile form
4. Expense form
5. All finance/payroll forms
6. All settings forms with multi-field input
7. All editor components (contract, menu doc, portfolio, etc.)
8. All compliance/safety forms
9. Staff/operations forms
10. Modal forms
11. Public/embed forms (localStorage-based, no IndexedDB tenant scoping needed)

**Estimated scope:** ~50 forms need full protection, ~40 need basic protection, ~90 are low-risk enough for Phase 2 or can skip.

### Phase 2: Undo/Redo System (HIGH IMPACT, HIGH EFFORT)

**Goal:** Users can Ctrl+Z to undo recent actions across the app.

**Implementation approach:**

1. **Toast-based undo for destructive actions** (delete, archive, status change)
   - Show "Action completed. Undo" toast with 8-second timer
   - Store the reverse action, execute on undo click
   - Start with: delete client, delete event, archive inquiry, status transitions

2. **Form-level undo history** (for complex editors)
   - Snapshot-based: store last N states on each change
   - Ctrl+Z / Ctrl+Shift+Z to navigate history
   - Start with: recipe editor, email composer, template editor

### Phase 3: Granular Error Boundaries (MEDIUM IMPACT, LOW EFFORT)

**Goal:** Broken widgets don't crash entire pages.

**Implementation:**

1. Create a `<WidgetErrorBoundary>` component with retry button
2. Wrap every dashboard widget
3. Wrap every panel section (notes, timeline, media, finance)
4. Wrap every async-loaded section

### Phase 4: Session Recovery & Resume (MEDIUM IMPACT, MEDIUM EFFORT)

**Goal:** Users return to where they left off after re-login.

**Implementation:**

1. Store `lastActivePath` in localStorage on every route change
2. After login, check for `lastActivePath` and offer to navigate there
3. Preserve draft state across auth boundaries (drafts already in IndexedDB, just need to restore after re-auth)

### Phase 5: Enhanced Data Export (LOW IMPACT, MEDIUM EFFORT)

**Goal:** Users can export all their data.

**Implementation:**

1. "Export All Data" in Settings > Account
2. JSON export of all user data (events, clients, recipes, finances)
3. PDF export for reports and analytics tables
4. CSV export for all list views (standardize the pattern)

---

## Part 5: Metrics & Success Criteria

### How to measure QoL improvement:

1. **Draft restore rate** - How often are drafts actually restored? (already tracked via `trackQolMetric`)
2. **Form abandonment** - Add tracking for forms opened but never submitted
3. **Save failure rate** - Already tracked, monitor for improvement
4. **Error boundary catches** - How often do granular boundaries prevent full-page crashes?
5. **Undo usage** - How often do users use undo toasts?

### Success criteria:

- 0% of forms with >3 fields lack draft protection
- <1% of form submissions result in data loss
- Error boundary catches reduce full-page errors by 80%
- Draft restore offered within 2 seconds of page load
- Undo available for all destructive actions

---

## Appendix: Files Referenced

### Core QoL Infrastructure

- `lib/drafts/use-durable-draft.ts` - IndexedDB draft persistence
- `lib/navigation/use-unsaved-changes-guard.ts` - Navigation protection
- `lib/offline/use-idempotent-mutation.ts` - Offline-safe mutations
- `lib/offline/idb-queue.ts` - IndexedDB action queue
- `lib/offline/offline-action.ts` - Offline action wrapper
- `lib/offline/use-network-status.ts` - Network detection
- `lib/offline/use-offline-form.ts` - localStorage form fallback
- `lib/save-state/model.ts` - Save state types
- `lib/qol/metrics-client.ts` - QoL metrics beacon
- `lib/view-state/use-persistent-view-state.ts` - View state persistence
- `components/offline/offline-provider.tsx` - Offline state provider
- `components/offline/offline-status-bar.tsx` - Connectivity banner
- `components/ui/error-boundary.tsx` - Error boundary component

### Protected Forms (5 total)

- `components/events/event-form.tsx`
- `components/inquiries/inquiry-form.tsx`
- `components/quotes/quote-form.tsx`
- `app/(chef)/menus/new/create-menu-form.tsx`
- `app/(chef)/clients/new/client-create-form.tsx`
