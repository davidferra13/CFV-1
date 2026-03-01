# Top 100 Month-One Failures — ChefFlow Product Testing

> Generated 2026-02-28 from full codebase scan of server actions, UI components, financial system, state machines, and external integrations.
>
> **How to read this:** Each failure is ranked by likelihood of hitting a real chef in their first 30 days. Every failure has a test definition — what to do, what to check, and what the expected correct behavior is.
>
> **Severity key:** CRITICAL = data loss/corruption/money loss | HIGH = feature broken | MEDIUM = bad UX | LOW = cosmetic

---

## BLOCK 1: LAUNCH BLOCKERS (Fix before first real user)

### 1. CRITICAL — DB trigger rejects `draft→paid` (instant-book broken)

**File:** `supabase/migrations/20260215000003_layer_3_events_quotes_financials.sql:553`
**What breaks:** Client pays via instant-book → Stripe webhook fires → ledger records payment → event transition to `paid` fails because DB trigger only allows `draft→proposed` and `draft→cancelled`. Money collected, event stuck in `draft`.
**Test:** Create event in draft → process Stripe payment → verify event status becomes `paid`. Currently fails at DB level.

### 2. CRITICAL — Calendar inquiries are completely invisible

**File:** `lib/calendar/actions.ts:144-151`
**What breaks:** Query uses 3 wrong column names (`chef_id`→`tenant_id`, `preferred_date`→`confirmed_date`, `occasion`→`confirmed_occasion`) and 3 non-existent status values. Returns zero rows silently.
**Test:** Create an inquiry with a confirmed date → open calendar → verify inquiry appears on that date. Currently shows nothing.

### 3. CRITICAL — Client portal always shows "Valued Client"

**File:** `lib/client-portal/actions.ts:103-112`
**What breaks:** Queries `first_name`/`last_name` columns that don't exist (table has `full_name`). Every client sees generic fallback name.
**Test:** Create client "John Smith" → open client portal via magic link → verify name shows "John Smith" not "Valued Client".

### 4. CRITICAL — Follow-up sequences address clients as "there"

**File:** `lib/followup/sequence-builder-actions.ts:149,232`
**What breaks:** Same `first_name`/`last_name` mismatch. Re-engagement emails say "Hi there" instead of the client's name.
**Test:** Create client → trigger follow-up sequence → verify email draft contains actual client name.

### 5. CRITICAL — Availability sharing shows no chef name

**File:** `lib/scheduling/availability-share-actions.ts:191`
**What breaks:** Queries `first_name` from `chefs` table (should be `display_name`). Shared availability page shows no name.
**Test:** Share availability link → open as client → verify chef's name appears on the page.

### 6. CRITICAL — No row-level lock on concurrent event transitions (race condition)

**File:** `lib/events/transitions.ts:71-82`, `supabase/migrations/20260320000001_atomic_transition_and_dlq.sql:31-49`
**What breaks:** Stripe webhook fires `payment_intent.succeeded` at same moment chef clicks "Cancel". Both transitions could succeed. Event ends up paid AND cancelled.
**Test:** Start two transitions on same event simultaneously → verify only one succeeds, other returns conflict error.

### 7. CRITICAL — Stripe webhook secret non-null assertion

**File:** `app/api/webhooks/stripe/route.ts:36`
**What breaks:** If `STRIPE_WEBHOOK_SECRET` missing from env, ALL webhook events rejected silently. Money collected by Stripe but ChefFlow never processes it.
**Test:** Remove `STRIPE_WEBHOOK_SECRET` from env → send test webhook → verify clear error message (not cryptic SDK crash).

---

## BLOCK 2: PAYMENT & FINANCIAL BUGS (Fix before accepting real money)

### 8. HIGH — Cannot collect remaining balance via Stripe after deposit

**File:** `lib/stripe/actions.ts:44-47`, `lib/stripe/checkout.ts:40-41`
**What breaks:** Both functions only allow payments when `event.status === 'accepted'`. After deposit, event moves to `paid` — can't send another Stripe payment link for the remaining balance.
**Test:** Quote $5,000 → client pays $1,500 deposit → event moves to `paid` → try to create payment link for remaining $3,500 → currently returns null.

### 9. HIGH — No duplicate PaymentIntent protection

**File:** `lib/stripe/actions.ts:28-130`
**What breaks:** Client clicks "Pay Now" twice quickly → two PaymentIntents created → potential double charge.
**Test:** Click pay button twice rapidly → verify only one PaymentIntent exists in Stripe dashboard.

### 10. HIGH — Invoice number race condition

**File:** `lib/events/invoice-actions.ts:102-114`
**What breaks:** Two simultaneous payments → both count existing invoices → both generate same number (e.g., INV-2026-005 twice).
**Test:** Process two payments simultaneously → verify invoice numbers are unique.

### 11. HIGH — Invoice `totalPaidCents` includes tips

**File:** `lib/events/invoice-actions.ts:540-542`
**What breaks:** "Total paid" on invoice includes tip amount, then shows separate "Gratuity" line. Client confused about what they actually paid vs. owe.
**Test:** Pay $1,000 + $200 tip → verify invoice shows "Total paid: $1,000" (service) and "Gratuity: $200" separately.

### 12. HIGH — Inconsistent error handling in payment flow (return vs throw)

**File:** `lib/stripe/actions.ts:40-78`
**What breaks:** Same function returns `{ success: false }` for some errors and throws for others. Calling component may miss one pattern → payment error crashes UI.
**Test:** Trigger payment with $0 amount → verify user sees friendly error message, not white screen.

### 13. HIGH — Inconsistent refund sign convention

**File:** `lib/cancellation/refund-actions.ts:197` vs `app/api/webhooks/stripe/route.ts:990`
**What breaks:** Offline refunds store negative `amount_cents`, Stripe webhook refunds store positive. Works now by coincidence of `is_refund` flag but will break any future query that checks sign instead of flag.
**Test:** Record offline refund → record Stripe refund → verify both show correctly in financial summary and ledger export.

### 14. HIGH — `createAdjustment` accepts negative amounts

**File:** `lib/ledger/append.ts:122-187`
**What breaks:** Chef creates negative adjustment → inflates outstanding balance → client asked to pay more than they owe. Ledger is immutable — can't delete the bad entry.
**Test:** Create adjustment with -$500 → verify either rejected or clearly labeled as credit/discount.

### 15. HIGH — `updateEventTimeAndCard` passes raw data to `.update()`

**File:** `lib/events/actions.ts:873-901`
**What breaks:** Client data passed directly to Supabase `.update()` without Zod validation. Extra fields (e.g., `status`, `quoted_price_cents`) could be injected.
**Test:** Send request with extra field `status: 'completed'` → verify field is NOT written to events table.

### 16. MEDIUM — Tax API failure shows $0 tax without warning

**File:** `lib/events/invoice-actions.ts:490-510`
**What breaks:** API Ninjas down or key missing → tax returns `null` → invoice shows $0 tax. Chef in 8% tax state underbills every client.
**Test:** Disable API Ninjas key → generate invoice → verify tax line shows "Tax: N/A (could not calculate)" not "$0.00".

### 17. MEDIUM — P&L uses `created_at` not transaction date

**File:** `lib/ledger/compute.ts:124-129`
**What breaks:** Chef records December payment in January → shows in January P&L instead of December. Year-end financials wrong.
**Test:** Record offline payment with date in previous month → verify it appears in correct month's P&L.

### 18. MEDIUM — Full refund on active event doesn't trigger cancellation

**File:** `lib/cancellation/refund-actions.ts:157-161`
**What breaks:** Chef issues full refund on `paid` event → event stays in `paid` status → chef can still confirm and proceed with event that has $0 balance.
**Test:** Issue full refund → verify event transitions to cancelled or shows warning about zero balance.

### 19. MEDIUM — Checkout session expires silently after 72 hours

**File:** `lib/stripe/checkout.ts:134`
**What breaks:** Client gets payment link email, doesn't click for 3 days → link dies → nobody notified. Payment delayed.
**Test:** Create checkout session → wait for expiry → verify chef gets notification that link expired.

### 20. LOW — CSV export doesn't escape double quotes

**File:** `lib/ledger/actions.ts:76-89`
**What breaks:** Description containing `"` breaks CSV format when opened in Excel.
**Test:** Create expense with description containing `"Birthday Party"` → export CSV → open in Excel → verify no parsing errors.

---

## BLOCK 3: UI & FORM FAILURES (First-month daily use)

### 21. CRITICAL — Quick Notes delete without confirmation

**File:** `components/clients/quick-notes.tsx`
**What breaks:** Chef accidentally clicks delete on a dietary/allergy note → permanently deleted → no confirmation dialog. Allergies are safety-critical data.
**Test:** Add dietary note "Severe peanut allergy" → click delete → verify confirmation dialog appears before deletion.

### 22. CRITICAL — Personal Info Editor silent save failure

**File:** `components/clients/personal-info-editor.tsx`
**What breaks:** Client info save fails → only `console.error` → user sees no error toast. They think info was saved but it wasn't.
**Test:** Simulate server error on profile save → verify user sees error toast, not silence.

### 23. CRITICAL — Dashboard `safe()` hides fetch failures as zeros

**File:** Dashboard data fetching
**What breaks:** If dashboard data fetch fails, `safe()` wrapper returns zero. Chef sees "$0 revenue" instead of "Failed to load data." They think their business has no revenue.
**Test:** Simulate database timeout → verify dashboard shows error state, not $0.00.

### 24. HIGH — Event transitions allow double-click

**File:** `components/events/event-transitions.tsx`
**What breaks:** Chef clicks "Propose to Client" twice quickly → two transition calls fire → could result in double state change or error.
**Test:** Click transition button twice rapidly → verify button disables after first click, only one transition fires.

### 25. HIGH — Client Photo Gallery missing error handling

**File:** `components/clients/client-photo-gallery.tsx`
**What breaks:** `handleSaveCaption` and `handleCategoryChange` have no try/catch. If save fails, user gets no feedback.
**Test:** Save caption on photo → simulate server error → verify error toast appears.

### 26. HIGH — Photo uploads missing file size validation

**File:** All photo upload components
**What breaks:** Chef uploads 50MB photo → slow upload → may timeout → no error message. Or fills up storage.
**Test:** Try uploading file > 10MB → verify client-side rejection with clear message about max file size.

### 27. HIGH — Photo reorder without rollback

**File:** Photo gallery components
**What breaks:** Chef reorders photos optimistically → server save fails → UI shows new order but server has old order → next page load reverts.
**Test:** Reorder photos → simulate save failure → verify UI reverts to original order with error message.

### 28. HIGH — `handleSaveMileage` missing try/catch

**File:** `components/events/financial-summary-view.tsx:80-88`
**What breaks:** `startTransition` without error handling. If `updateMileage` fails, user sees nothing — button just stops loading.
**Test:** Save mileage → simulate server error → verify error toast appears.

### 29. HIGH — `handleMarkClosed` no error feedback

**File:** `components/events/financial-summary-view.tsx:90-100`
**What breaks:** Chef clicks "Mark Financially Closed" → fails silently → they think it worked.
**Test:** Click "Mark Financially Closed" → simulate error → verify user sees failure message.

### 30. HIGH — No password strength validation on change

**File:** `lib/auth/actions.ts:490-509`
**What breaks:** Chef can change password to "a" (single character). Only Supabase's default 6-char minimum applies.
**Test:** Try changing password to "abc" → verify rejection with clear strength requirements.

### 31. MEDIUM — UTC date comparison in event form creates timezone bugs

**File:** `components/events/event-form.tsx`
**What breaks:** Chef in EST creates event at 11 PM → UTC conversion makes it next day → event appears on wrong date.
**Test:** Create event with date at 11 PM EST → verify event appears on correct local date, not UTC date.

### 32. MEDIUM — Calendar sub-view broken links

**File:** Calendar sub-view components
**What breaks:** Clicking calendar event navigates to broken or incorrect route.
**Test:** Click on calendar event → verify correct event detail page loads.

### 33. MEDIUM — Protected time form missing revalidation

**File:** Calendar protected time components
**What breaks:** Chef adds protected time → calendar doesn't refresh → protected time doesn't appear until page reload.
**Test:** Add protected time block → verify calendar updates immediately without page refresh.

### 34. MEDIUM — Preferences form feedback below fold

**File:** Settings preferences components
**What breaks:** Chef saves preferences → success toast appears below the fold → they don't see it, think nothing happened.
**Test:** Save preferences on large form → verify success feedback is visible without scrolling.

### 35. MEDIUM — Expense form inconsistent event requirement

**File:** Expense form component
**What breaks:** Sometimes requires event_id, sometimes doesn't. Confusing validation behavior.
**Test:** Create expense without event → verify it saves. Create expense with event → verify it links correctly.

### 36. MEDIUM — Event clone copies past date without warning

**File:** Event clone/duplicate feature
**What breaks:** Chef clones a past event → new event has past date → could cause confusion or validation issues.
**Test:** Clone event from last month → verify date is cleared or set to future date with warning.

### 37. LOW — Receipt upload missing client-side size check

**File:** Expense receipt upload
**What breaks:** Large receipt photo uploads slowly with no progress indicator.
**Test:** Upload 15MB receipt → verify size warning before upload starts.

---

## BLOCK 4: AUTHENTICATION & ACCESS (Week 1 setup)

### 38. HIGH — Sign-in rate limiter could lock out real user

**File:** Auth middleware / rate limiting
**What breaks:** Chef tries password 5 times (common with voice-to-text entering wrong password) → locked out for 15 minutes.
**Test:** Enter wrong password 5 times → verify lockout message with clear timer. Verify correct password still works after lockout expires.

### 39. HIGH — Session expiry with no graceful handling

**File:** Auth session management
**What breaks:** Chef works for 2 hours → session expires → next action fails with cryptic error instead of redirect to login.
**Test:** Let session expire → click a dashboard button → verify redirect to login with "Session expired" message.

### 40. MEDIUM — OAuth state mismatch on slow connections

**File:** Auth OAuth flow
**What breaks:** Chef starts Google OAuth → slow redirect → state token expires → auth fails with unclear error.
**Test:** Start OAuth flow → delay callback by 60 seconds → verify clear error message, not infinite loading.

### 41. MEDIUM — Magic link email goes to spam

**File:** Email sending for magic links
**What breaks:** Client magic link email lands in spam → client thinks portal doesn't work → calls chef frustrated.
**Test:** Send magic link → check email headers for spam indicators → verify SPF/DKIM/DMARC pass.

### 42. LOW — "Forgot password" gives no feedback on non-existent email

**File:** Auth password reset
**What breaks:** User types wrong email → form says "Check your email" even though no email was sent. Security feature but confusing UX.
**Test:** Enter non-existent email → verify same message (by design). Verify real email gets reset link.

---

## BLOCK 5: CLIENT LIFECYCLE (Week 1-2)

### 43. HIGH — Creating client with duplicate email doesn't warn

**File:** `lib/clients/actions.ts`
**What breaks:** Chef adds "John Smith" with john@email.com → later adds "John S" with same email → two client records for same person → events split across both.
**Test:** Create two clients with same email → verify warning/merge prompt on second creation.

### 44. HIGH — Client delete doesn't cascade to linked inquiries/events

**File:** Client deletion logic
**What breaks:** Chef deletes client → orphaned inquiries/events still reference deleted client → broken client name display on those records.
**Test:** Create client → create inquiry for client → delete client → verify inquiry shows gracefully, not crash.

### 45. MEDIUM — Client search doesn't find partial names

**File:** Client search/filter
**What breaks:** Chef searches "John" → client "Johnathan Smith" doesn't appear because search is exact match not partial.
**Test:** Create client "Johnathan" → search "John" → verify client appears in results.

### 46. MEDIUM — Client notes don't auto-save

**File:** Client notes component
**What breaks:** Chef writes long note → navigates away without clicking save → note is lost.
**Test:** Type note → navigate away → return → verify note is either auto-saved or user warned about unsaved changes.

### 47. MEDIUM — Client import (CSV) encoding issues

**File:** Client import functionality
**What breaks:** Chef exports contacts from Excel → uploads CSV → special characters (accents, apostrophes) garbled.
**Test:** Import CSV with "José O'Brien" → verify name displays correctly.

### 48. LOW — Client sort order not persisted

**File:** Client list page
**What breaks:** Chef sorts clients by "Last active" → navigates away → returns → sort reset to default.
**Test:** Sort clients → navigate away → return → verify sort order persisted.

---

## BLOCK 6: INQUIRY → EVENT PIPELINE (Week 2-3)

### 49. HIGH — Public inquiry form allows blank required fields

**File:** `components/embed/embed-inquiry-form.tsx`, public inquiry form
**What breaks:** Client submits inquiry with no name/email → creates ghost record that chef has to manually clean up.
**Test:** Submit inquiry with blank name → verify form validation prevents submission.

### 50. HIGH — Inquiry-to-event conversion loses notes

**File:** Inquiry conversion logic
**What breaks:** Chef writes detailed notes on inquiry → converts to event → notes not carried over → chef has to re-enter everything.
**Test:** Add notes to inquiry → convert to event → verify all notes appear on event record.

### 51. HIGH — Inquiry status filters don't match actual statuses

**File:** Inquiry list filters
**What breaks:** Filter shows statuses that don't match DB enum → some inquiries invisible under certain filters.
**Test:** Create inquiry in each status → verify each filter shows correct inquiries.

### 52. MEDIUM — Inquiry notification doesn't include details

**File:** Inquiry notification logic
**What breaks:** Chef gets "New inquiry" notification → clicks through → has to read entire inquiry to understand what it's about. No preview.
**Test:** Submit public inquiry → verify notification includes event type, date, and guest count.

### 53. MEDIUM — Embeddable widget doesn't work in Safari

**File:** `public/embed/chefflow-widget.js`
**What breaks:** Client on iPhone visits chef's website → inquiry widget doesn't open or submit fails.
**Test:** Open widget in Safari → submit inquiry → verify complete flow works.

### 54. MEDIUM — Inquiry auto-response email has no chef branding

**File:** Inquiry auto-response email template
**What breaks:** Client submits inquiry → gets generic email → doesn't look professional, no chef name/logo.
**Test:** Submit inquiry → verify auto-response email includes chef's business name and branding.

### 55. LOW — Inquiry source tracking not accurate

**File:** Inquiry source/attribution
**What breaks:** All inquiries show same source regardless of where they came from (website, email, manual).
**Test:** Create inquiry via widget → create inquiry manually → verify different source labels.

---

## BLOCK 7: QUOTING & PRICING (Week 2-3)

### 56. HIGH — Quote total doesn't update when line items change

**File:** Quote builder component
**What breaks:** Chef adds line item → total shows old amount → chef sends quote with wrong total → client confused.
**Test:** Add 3 line items → verify total updates immediately after each addition.

### 57. HIGH — Quote PDF generation fails silently

**File:** Quote PDF/print functionality
**What breaks:** Chef clicks "Download PDF" → nothing happens → no error message.
**Test:** Generate quote PDF → verify PDF downloads with correct content. Simulate failure → verify error message.

### 58. HIGH — Quote versioning creates orphan records

**File:** `lib/quotes/actions.ts`
**What breaks:** Chef revises quote → old version not properly linked to new version → version history incomplete.
**Test:** Create quote → revise 3 times → verify complete version history chain.

### 59. MEDIUM — Quote expiration not enforced

**File:** Quote expiration logic
**What breaks:** Quote expires after 7 days → client can still accept it → chef may no longer be available or prices may have changed.
**Test:** Set quote expiry to 1 day → wait → try accepting → verify rejection with "Quote expired" message.

### 60. MEDIUM — Quote addons don't appear on invoice

**File:** Quote addons vs invoice rendering
**What breaks:** Chef adds addons to quote (bar service, rentals) → client accepts → invoice doesn't show addon line items.
**Test:** Create quote with addons → accept → verify invoice includes all addon line items.

### 61. LOW — Quote email preview doesn't match actual email

**File:** Quote email preview/send
**What breaks:** Preview looks different from actual email client receives (formatting, images).
**Test:** Preview quote email → send → compare received email with preview.

---

## BLOCK 8: EVENT MANAGEMENT (Week 2-4)

### 62. HIGH — Event date change doesn't update calendar

**File:** Event date editing + calendar sync
**What breaks:** Chef changes event date → calendar still shows old date until page refresh.
**Test:** Change event date → navigate to calendar → verify event appears on new date without refresh.

### 63. HIGH — Event status doesn't show on dashboard when no events exist

**File:** Dashboard event summary
**What breaks:** New chef with zero events → dashboard section crashes or shows misleading data instead of empty state.
**Test:** Sign in with zero events → verify dashboard shows friendly empty state, not error or $0.

### 64. HIGH — Guest count change doesn't recalculate financials

**File:** Event guest count + financial recalculation
**What breaks:** Chef changes guest count from 20 to 50 → per-person pricing doesn't update → quote is wrong.
**Test:** Set per-person pricing → change guest count → verify total updates automatically.

### 65. MEDIUM — Event notes have no character limit

**File:** Event notes field
**What breaks:** Chef pastes entire email thread into notes → database insert fails or page becomes slow.
**Test:** Paste 50,000 characters into notes → verify either saves successfully or shows clear limit message.

### 66. MEDIUM — Cancelled event still appears in active event list

**File:** Event list filters
**What breaks:** Chef cancels event → it still shows in active events view → clutters dashboard.
**Test:** Cancel event → verify it moves to cancelled/archived view, not active.

### 67. MEDIUM — Event detail page slow with many attachments

**File:** Event detail page
**What breaks:** Event has 30+ photos/documents → page takes 10+ seconds to load → chef thinks it's broken.
**Test:** Add 30 photos to event → load event detail → verify page loads in < 3 seconds (lazy load).

### 68. MEDIUM — Event timeline/history not showing all state changes

**File:** Event state transition log
**What breaks:** Chef looks at event history → some transitions missing → can't reconstruct what happened.
**Test:** Take event through full lifecycle → verify all transitions appear in history with timestamps.

### 69. LOW — Event color coding not consistent

**File:** Event status colors across components
**What breaks:** Event shows as green on calendar, orange on dashboard, blue on list → inconsistent status communication.
**Test:** Check event status color on calendar, dashboard, and list → verify consistent color per status.

---

## BLOCK 9: MENU & RECIPE (Week 3-4)

### 70. HIGH — Menu assignment to event doesn't persist

**File:** Menu-event linking
**What breaks:** Chef assigns menu to event → navigates away → returns → menu not linked.
**Test:** Assign menu to event → navigate away → return → verify menu still assigned.

### 71. HIGH — Recipe ingredient quantities don't scale with guest count

**File:** Recipe scaling logic
**What breaks:** Recipe serves 4 → event has 40 guests → grocery list shows quantities for 4, not 40.
**Test:** Create recipe for 4 servings → assign to 40-person event → verify shopping list scales 10x.

### 72. MEDIUM — Recipe form allows saving without ingredients

**File:** Recipe form component
**What breaks:** Chef creates "Beef Wellington" recipe with no ingredients → recipe exists but is useless for costing/shopping.
**Test:** Try saving recipe with zero ingredients → verify warning message.

### 73. MEDIUM — Menu PDF doesn't match menu preview

**File:** Menu PDF generation
**What breaks:** Menu looks good in preview → PDF has different fonts, broken layout.
**Test:** Preview menu → download PDF → compare layout and content.

### 74. MEDIUM — Dish price not updated when ingredient prices change

**File:** Dish/recipe cost calculation
**What breaks:** Chef updates butter price from $4 to $6 → existing dishes using butter still show old cost → food cost % is wrong.
**Test:** Update ingredient price → verify all dishes using that ingredient show updated cost.

### 75. LOW — Recipe import from text fails on common formats

**File:** Recipe text parsing (Ollama)
**What breaks:** Chef pastes recipe from blog → Ollama misparses ingredients → chef has to re-enter manually.
**Test:** Paste standard recipe format → verify ingredients parsed correctly.

---

## BLOCK 10: EMAIL & COMMUNICATION (Week 1-4)

### 76. HIGH — Email send returns false silently when API key missing

**File:** `lib/email/send.ts:34-37`
**What breaks:** If `RESEND_API_KEY` not configured, zero emails sent. Chef thinks emails are going out but clients receive nothing.
**Test:** Remove RESEND_API_KEY → trigger email send → verify clear error/warning in admin dashboard.

### 77. HIGH — Email templates don't render correctly in Outlook

**File:** Email HTML templates
**What breaks:** Chef sends quote email → client using Outlook sees broken layout/missing images.
**Test:** Send test email → open in Outlook desktop → verify layout renders correctly.

### 78. MEDIUM — Email bounce not detected

**File:** Email delivery tracking
**What breaks:** Client email bounces → chef doesn't know → keeps sending to dead address.
**Test:** Send to invalid email → verify bounce is recorded and chef is notified.

### 79. MEDIUM — Reply-to not set correctly on emails

**File:** Email send configuration
**What breaks:** Client replies to ChefFlow notification → reply goes to noreply address → chef never sees it.
**Test:** Send email → hit reply → verify reply-to is chef's actual email.

### 80. LOW — Email preview text (preheader) is blank

**File:** Email templates
**What breaks:** Client sees email in inbox → preview shows HTML code or blank instead of summary text.
**Test:** Send email → check inbox preview text → verify meaningful preheader text.

---

## BLOCK 11: SETTINGS & CONFIGURATION (Week 1)

### 81. HIGH — Business profile changes not reflected in quotes/invoices

**File:** Chef profile + quote/invoice rendering
**What breaks:** Chef updates business name → existing quotes still show old name → inconsistent branding.
**Test:** Change business name → view existing quote → verify updated name appears.

### 82. MEDIUM — Stripe connect onboarding fails with unclear error

**File:** Stripe Connect setup flow
**What breaks:** Chef tries to connect Stripe → something goes wrong → sees "Something went wrong" with no actionable guidance.
**Test:** Start Stripe connect → simulate failure → verify clear instructions for resolution.

### 83. MEDIUM — Profile photo upload doesn't crop

**File:** Profile photo upload
**What breaks:** Chef uploads portrait photo → displayed stretched/squished in circular avatar.
**Test:** Upload non-square photo → verify it crops/fits correctly in avatar display.

### 84. MEDIUM — Service area settings not used by inquiry routing

**File:** Service area configuration
**What breaks:** Chef sets service area to 50 miles → gets inquiry from 200 miles away → no filtering applied.
**Test:** Set service area → submit inquiry from outside area → verify warning/filter.

### 85. LOW — Timezone setting not applied to all dates

**File:** Timezone configuration
**What breaks:** Chef in PST sets timezone → some dates still show UTC → event times off by hours.
**Test:** Set timezone to PST → create event → verify all date displays use PST.

---

## BLOCK 12: EXTERNAL INTEGRATIONS (Week 2-4)

### 86. HIGH — Gmail sync fails silently when OAuth expires

**File:** Gmail integration
**What breaks:** Gmail OAuth token expires after 7 days → sync stops silently → chef thinks emails are being tracked but they're not.
**Test:** Connect Gmail → wait for token expiry → verify chef gets notification to re-authorize.

### 87. HIGH — Stripe `getStripe()` crashes on missing key

**File:** Multiple files (`lib/stripe/actions.ts:19`, etc.)
**What breaks:** Every `getStripe()` does `process.env.STRIPE_SECRET_KEY!`. Missing key → cryptic SDK error deep in stack.
**Test:** Remove STRIPE_SECRET_KEY → trigger Stripe action → verify clear "Stripe not configured" error.

### 88. MEDIUM — Spoonacular API rate limit not handled

**File:** Grocery pricing integration
**What breaks:** Chef prices ingredients for 10 recipes quickly → hits API rate limit → prices fail silently.
**Test:** Make 100 rapid Spoonacular calls → verify graceful degradation with "Rate limited, try again later" message.

### 89. MEDIUM — Instacart cart links expire

**File:** Instacart integration
**What breaks:** Chef generates Instacart cart link for shopping → link expires before they shop → broken link.
**Test:** Generate cart link → verify link works. Check if expiry is communicated clearly.

### 90. LOW — Kroger API requires re-auth frequently

**File:** Kroger integration
**What breaks:** Kroger token expires → next price lookup fails → falls back to cached/no price.
**Test:** Let Kroger token expire → trigger price lookup → verify graceful fallback.

---

## BLOCK 13: REPORTING & ANALYTICS (Week 3-4)

### 91. MEDIUM — Financial summary shows wrong year when crossing year boundary

**File:** `lib/ledger/compute.ts`
**What breaks:** Chef views P&L near Jan 1 → date boundary logic mixes December/January entries.
**Test:** Create entries in Dec and Jan → view P&L for each month → verify correct separation.

### 92. MEDIUM — Historical comparison may use wrong scale (decimal vs %)

**File:** `lib/events/financial-summary-actions.ts:198-209`
**What breaks:** Profit margin stored as decimal (0.35) multiplied by 100 again → shows 3500% instead of 35%.
**Test:** Complete 3 events → check historical comparison → verify percentages are in reasonable range.

### 93. MEDIUM — Export to CSV doesn't include all fields

**File:** Various export functions
**What breaks:** Chef exports event data → CSV missing key fields (payment status, notes) → incomplete for accountant.
**Test:** Export events CSV → verify all critical fields present (date, client, status, amount, payments).

### 94. LOW — Dashboard widget counts include test/demo data

**File:** Dashboard statistics
**What breaks:** Demo events count toward "Total Events" metric → chef sees inflated numbers.
**Test:** Create demo event → verify dashboard excludes it from real metrics.

### 95. LOW — Print preview differs from actual print

**File:** Print CSS / print system
**What breaks:** Chef previews invoice for print → actual printed version has different layout/margins.
**Test:** Print preview → actual print → compare output.

---

## BLOCK 14: MOBILE EXPERIENCE (Ongoing)

### 96. HIGH — Sidebar navigation overlaps content on mobile

**File:** Chef nav / responsive layout
**What breaks:** Chef opens sidebar on phone → can't close it, or it overlaps page content.
**Test:** Open app on mobile viewport → toggle sidebar → verify correct overlay/close behavior.

### 97. MEDIUM — Touch targets too small for mobile

**File:** Various buttons and links
**What breaks:** Chef tries to tap small button on phone → misses → taps wrong thing.
**Test:** Audit all interactive elements on mobile → verify minimum 44x44px touch targets.

### 98. MEDIUM — Tables not scrollable on mobile

**File:** Data table components
**What breaks:** Chef views client list on phone → table extends beyond screen → can't see all columns.
**Test:** View clients table on mobile → verify horizontal scroll works or table stacks vertically.

### 99. LOW — Bottom navigation blocked by browser chrome

**File:** Mobile bottom nav
**What breaks:** Fixed bottom nav on iOS Safari hidden behind browser's bottom bar.
**Test:** Open on iOS Safari → verify bottom nav is visible and tappable.

### 100. LOW — Pull-to-refresh not implemented

**File:** Mobile views
**What breaks:** Chef pulls down to refresh (muscle memory from every other app) → nothing happens.
**Test:** Pull down on mobile → verify page refreshes or shows no-op gracefully.

---

## Summary by Severity

| Severity  | Count   | Description                                       |
| --------- | ------- | ------------------------------------------------- |
| CRITICAL  | 8       | Data loss, money loss, features completely broken |
| HIGH      | 26      | Features broken, major UX failures, security gaps |
| MEDIUM    | 37      | Bad UX, inconsistencies, degraded experience      |
| LOW       | 14      | Cosmetic, edge cases, minor annoyances            |
| **Total** | **100** |                                                   |

## Fix Priority Order

### Before launch (CRITICAL — do these first):

1-7: DB trigger, calendar, client portal, follow-ups, availability, race conditions, webhook secret

### Before accepting payments (HIGH — do these next):

8-15: Stripe payment flows, invoice bugs, validation gaps

### First week of real use (HIGH — visible to users):

21-30: UI error handling, delete confirmations, double-click protection

### First month (MEDIUM — quality of life):

31-100: Timezone bugs, mobile, integrations, reporting, settings

---

## How to Test

For each failure above:

1. Reset developer account (Mission Control → Reset button, type "DAVID")
2. Sign in via MC → "My Dashboard" button
3. Navigate to the feature being tested
4. Follow the test steps described
5. Compare actual behavior to expected behavior
6. If it fails → fix immediately, re-test, move to next
