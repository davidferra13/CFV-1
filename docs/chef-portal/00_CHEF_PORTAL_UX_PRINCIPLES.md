# Chef Portal UX Principles (V1)

This document defines the user experience principles that govern every interface decision in the Chef Portal V1. These principles ensure the portal is deterministic, safe, and operationally clear.

---

## 1) Core UX Principles

### 1.1 Deterministic, not predictive

**Principle:** The UI shows **actual state**, not guesses or predictions.

**Examples:**

✅ **Good:**
- "Payment processing (awaiting Stripe confirmation)"
- "Deposit pending (Stripe webhook not yet received)"

❌ **Bad:**
- "Payment probably succeeded"
- "Estimated completion: 2 hours"

**Why:** Guessing creates false expectations. The UI must reflect truth, even if truth is "we're waiting."

---

### 1.2 Fail closed, not open

**Principle:** If something is uncertain or blocked, the UI must show a **safe frozen state**, not allow the user to proceed as if everything is fine.

**Examples:**

✅ **Good:**
- Disable "Transition to Confirmed" button until deposit webhook confirms
- Show "Processing..." modal that prevents further clicks

❌ **Bad:**
- Allow user to mark event as "Confirmed" manually before Stripe confirms
- Show success toast immediately on payment intent creation

**Why:** Optimistic UI in financial systems creates audit holes and false state.

---

### 1.3 Explicit, not implicit

**Principle:** Critical actions require **explicit user confirmation**, not silent inference.

**Examples:**

✅ **Good:**
- "Lock Menu" button requires confirmation modal: "This will make the menu immutable. Continue?"
- "Cancel Event" shows impact summary: "This will refund $X and mark the event as canceled."

❌ **Bad:**
- Clicking "Save" on a menu automatically locks it if event is confirmed (silent side effect)
- Deleting an event also deletes all client notes without warning

**Why:** Implicit actions create confusion and accidental data loss.

---

### 1.4 Auditable, not silent

**Principle:** Every critical action shows **who did what and when**, either inline or via an accessible audit log.

**Examples:**

✅ **Good:**
- Event detail page shows "Status changed to Confirmed by John (Chef) on Jan 15, 2026 at 3:42 PM"
- Ledger entries include "Created by system (Stripe webhook) on Jan 15, 2026"

❌ **Bad:**
- Event status changes with no log of who changed it or when
- Ledger entries with no timestamp or source

**Why:** Auditability enables troubleshooting and accountability.

---

### 1.5 Server-authoritative, not client-trusted

**Principle:** The UI **requests** state changes; the server **decides** if they're allowed. The UI must handle rejection gracefully.

**Examples:**

✅ **Good:**
- User clicks "Transition to Executed" → API call → server checks if allowed → UI updates or shows error
- Button states are derived from server-provided transition map

❌ **Bad:**
- UI allows clicking "Transition to Executed" even if event is in `draft` status (relying on UI logic to hide button)
- Form validation happens only client-side without server confirmation

**Why:** Client logic can be bypassed. Server enforcement is the only truth.

---

## 2) Operational Clarity Principles

### 2.1 Status is always visible

**Principle:** The current **status** of any entity (event, payment, menu) must be immediately visible without clicking or hovering.

**Examples:**

✅ **Good:**
- Event cards show status badge: "Confirmed", "Deposit Pending", "Executed"
- Menu cards show lock status: "Draft", "Locked v3"

❌ **Bad:**
- Status is hidden in a dropdown or only visible on detail page
- Color-only indicators with no text label

**Why:** Chefs need to triage quickly. Status must be scannable.

---

### 2.2 Next actions are surfaced, not hidden

**Principle:** The UI should make it **obvious what needs to happen next**, without requiring the user to remember the workflow.

**Examples:**

✅ **Good:**
- Dashboard shows "3 events need menu creation"
- Event detail shows "Next: Send payment request to client"

❌ **Bad:**
- User has to remember that after creating a menu they need to lock it
- No indication that an event is missing required fields

**Why:** Chefs are busy. The system should guide them through the operational loop.

---

### 2.3 Errors are actionable, not vague

**Principle:** Error messages must explain **what went wrong** and **how to fix it**.

**Examples:**

✅ **Good:**
- "Cannot transition to Confirmed: deposit payment has not been received. Wait for Stripe webhook or contact support."
- "Menu cannot be locked: section 'Appetizers' has no items. Add at least one item to each section."

❌ **Bad:**
- "Error: transition failed"
- "Invalid request"

**Why:** Vague errors create frustration and support burden.

---

### 2.4 Dangerous actions are protected

**Principle:** Actions that are **irreversible or high-impact** must have safeguards (confirmation, friction, warnings).

**Examples:**

✅ **Good:**
- "Cancel Event" requires typing "CANCEL" to confirm
- "Delete Client" shows warning: "This client has 3 events. Are you sure?"

❌ **Bad:**
- Delete button with no confirmation
- Irreversible action with instant effect

**Why:** Accidental clicks happen. Protection prevents regret.

---

## 3) Data Presentation Principles

### 3.1 Financial data is always in dollars and cents

**Principle:** Display amounts in **human-readable format** (`$1,234.56`), never as raw cents (`123456`).

**Examples:**

✅ **Good:**
- "Total: $1,500.00"
- "Deposit paid: $500.00"

❌ **Bad:**
- "Total: 150000 cents"
- "Deposit: 500"

**Why:** Chefs think in dollars, not cents.

---

### 3.2 Dates and times are timezone-aware

**Principle:** All timestamps must show the **tenant's timezone**, not UTC or the user's browser timezone.

**Examples:**

✅ **Good:**
- "Event on Jan 20, 2026 at 6:00 PM PST"
- Ledger entry: "Jan 15, 2026 at 3:42 PM PST"

❌ **Bad:**
- "Event on 2026-01-21T02:00:00Z" (ISO 8601 UTC)
- No timezone indicator

**Why:** Events are scheduled in the chef's local time. UTC is meaningless to operators.

---

### 3.3 Lists are paginated and sortable

**Principle:** Large lists must support **pagination** and **sorting** to avoid overwhelming the UI and database.

**Examples:**

✅ **Good:**
- Events list shows 20 per page with "Load More" or pagination controls
- Sortable columns: "Event Date", "Status", "Client Name"

❌ **Bad:**
- Loading all 500 events at once
- No way to sort or filter

**Why:** Performance degrades with large datasets. Pagination is essential.

---

### 3.4 Empty states are helpful, not blank

**Principle:** When a list or section is empty, show a **helpful message and action**, not a blank screen.

**Examples:**

✅ **Good:**
- "No events yet. Create your first event to get started." [+ Create Event]
- "No menu templates. Start by creating a template." [+ New Template]

❌ **Bad:**
- Blank white screen
- "No results" with no context

**Why:** Empty states are onboarding opportunities.

---

## 4) Feedback and Responsiveness Principles

### 4.1 Loading states are explicit

**Principle:** When data is loading or an action is processing, show a **clear loading indicator** and disable interactive elements.

**Examples:**

✅ **Good:**
- "Saving..." spinner on button during API call
- Entire form disabled during submission

❌ **Bad:**
- No indication that save is happening (user clicks again)
- Button remains enabled, allowing duplicate submissions

**Why:** Users need feedback that the system is working.

---

### 4.2 Success feedback is brief and clear

**Principle:** On successful action, show **confirmation** but don't block the user unnecessarily.

**Examples:**

✅ **Good:**
- Toast notification: "Event created successfully" (auto-dismisses in 3 seconds)
- Inline message: "Menu locked" with green checkmark

❌ **Bad:**
- Modal that requires clicking "OK" just to acknowledge success
- No confirmation at all

**Why:** Success feedback provides closure, but shouldn't interrupt flow.

---

### 4.3 Long-running operations show progress

**Principle:** If an operation takes >5 seconds, show **progress indication** (percentage, steps, or message updates).

**Examples:**

✅ **Good:**
- "Importing events... 45% complete"
- "Processing webhook (step 2 of 3): writing ledger entry"

❌ **Bad:**
- Spinner for 30 seconds with no indication of progress
- User has no idea if system is stuck

**Why:** Progress indication prevents anxiety and perceived hangs.

---

## 5) Form and Input Principles

### 5.1 Required fields are marked clearly

**Principle:** Required fields must be **visually indicated** (asterisk, label, color) and validated before submission.

**Examples:**

✅ **Good:**
- "Client Name *" with red asterisk
- Submit button disabled until required fields are filled (with tooltip explaining why)

❌ **Bad:**
- No indication of required fields until form submit fails
- Validation errors only shown server-side

**Why:** Users should know expectations before attempting to submit.

---

### 5.2 Validation is immediate and helpful

**Principle:** Input validation should happen **on blur or on input** (not just on submit) with clear error messages.

**Examples:**

✅ **Good:**
- Email field shows "Invalid email format" immediately on blur
- Date field shows "Event date cannot be in the past" as user types

❌ **Bad:**
- No validation until submit, then entire form highlighted red
- Generic "Invalid input" message

**Why:** Immediate feedback guides users to correct input.

---

### 5.3 Destructive actions are visually distinct

**Principle:** Buttons for **destructive actions** (delete, cancel, refund) must use warning colors and be positioned separately.

**Examples:**

✅ **Good:**
- "Delete Event" button is red, positioned away from "Save" button
- "Cancel Event" has orange/red styling and confirmation requirement

❌ **Bad:**
- "Delete" button next to "Save" with same styling
- Destructive action as primary button

**Why:** Visual distinction prevents accidental destructive actions.

---

## 6) Accessibility Principles

### 6.1 Keyboard navigable

**Principle:** All interactive elements must be **reachable and operable via keyboard** (Tab, Enter, Space, Arrow keys).

**Examples:**

✅ **Good:**
- All buttons, links, and form fields are focusable
- Focus order follows visual layout

❌ **Bad:**
- Custom dropdowns that don't support keyboard navigation
- Focus traps that prevent tabbing out

**Why:** Accessibility is a requirement, and keyboard navigation improves power-user efficiency.

---

### 6.2 Screen reader friendly

**Principle:** All content and actions must have **appropriate ARIA labels and semantic HTML**.

**Examples:**

✅ **Good:**
- Buttons use `<button>` element (not `<div onClick>`)
- Images have `alt` text
- Status badges have `aria-label="Event status: Confirmed"`

❌ **Bad:**
- `<div onClick>` for clickable actions
- No alt text on icons
- Color-only status indicators

**Why:** Screen readers require semantic HTML and ARIA labels.

---

### 6.3 Color is not the only indicator

**Principle:** **Color alone** must not be the only way to convey information. Use text, icons, or patterns in addition.

**Examples:**

✅ **Good:**
- Status badge: green background + "Confirmed" text + checkmark icon
- Error field: red border + error message text below

❌ **Bad:**
- Green row = success, red row = error (no text)
- Color-coded buttons with no labels

**Why:** Colorblind users and screen readers cannot rely on color alone.

---

## 7) Performance Principles

### 7.1 Perceived performance matters

**Principle:** Even if an operation takes time, the UI should **feel responsive** through optimistic updates, loading states, and feedback.

**Examples:**

✅ **Good:**
- Show skeleton loaders while data fetches
- Optimistic UI update (e.g., add item to list immediately, revert if server rejects)

❌ **Bad:**
- Blank screen while data loads
- No indication that action is processing

**Why:** Perceived performance affects user satisfaction more than actual performance.

---

### 7.2 Minimize unnecessary re-renders

**Principle:** UI should **only re-render when necessary**, not on every state change or prop update.

**Implementation:**
- Use React memoization (`useMemo`, `useCallback`, `React.memo`)
- Avoid passing new object references on every render

**Why:** Excessive re-renders cause jank and slow interactions.

---

### 7.3 Lazy load non-critical content

**Principle:** Load **critical content first** (above the fold, primary actions), defer non-critical content (analytics, recommendations, secondary data).

**Examples:**

✅ **Good:**
- Event detail page loads event data first, then loads financial ledger in background
- Dashboard shows summary cards immediately, then loads detailed charts

❌ **Bad:**
- Wait for all data to load before showing anything
- Load entire 500-row table on page load

**Why:** Users can start interacting faster if critical content loads first.

---

## 8) Consistency Principles

### 8.1 Use consistent terminology

**Principle:** Use the **same terms** for the same concepts throughout the portal.

**Examples:**

✅ **Good:**
- Always call it "Event" (not "Booking" in one place and "Event" in another)
- Always call it "Deposit" (not "Down Payment" or "Initial Payment")

❌ **Bad:**
- "Client" on one page, "Customer" on another
- "Menu locked" vs "Menu finalized"

**Why:** Inconsistent terminology creates confusion.

---

### 8.2 Use consistent component patterns

**Principle:** The same **UI pattern** should be used for the same type of action across the portal.

**Examples:**

✅ **Good:**
- All destructive actions use the same confirmation modal pattern
- All forms use the same validation and error display pattern

❌ **Bad:**
- Some delete actions require confirmation, others don't
- Some forms show errors inline, others show errors in a modal

**Why:** Consistency reduces cognitive load.

---

### 8.3 Visual hierarchy is clear

**Principle:** The **most important actions and information** should be the most visually prominent.

**Examples:**

✅ **Good:**
- Primary action button is larger and colored (e.g., "Save Event")
- Secondary actions are smaller and gray (e.g., "Cancel")

❌ **Bad:**
- All buttons same size and color
- Important information buried in paragraphs of text

**Why:** Visual hierarchy guides user attention to what matters most.

---

## 9) Error Handling Principles

### 9.1 Distinguish error types

**Principle:** Different types of errors require different UX treatments.

**Error Types:**

1. **Validation errors** (user input problem)
   - Show inline on the field
   - Explain what's wrong and how to fix it

2. **Permission errors** (user not allowed)
   - Show clear message: "You don't have permission to perform this action"
   - Don't show the action in the first place if possible

3. **System errors** (server/network problem)
   - Show friendly message: "Something went wrong. Please try again."
   - Provide retry button
   - Log error for debugging (don't expose stack trace to user)

4. **State errors** (invalid transition or operation)
   - Show explanation: "Cannot transition to Confirmed: event has no deposit"
   - Guide user to fix the prerequisite

---

### 9.2 Errors don't lose user data

**Principle:** If a form submission fails, **preserve the user's input** so they don't have to re-enter everything.

**Examples:**

✅ **Good:**
- Form validation fails → user corrects field → all other fields still populated
- Server error → form stays populated, user can click "Retry"

❌ **Bad:**
- Form submit fails → entire form clears
- Validation error → user has to re-enter all fields

**Why:** Losing data on error is extremely frustrating.

---

## 10) Summary

The Chef Portal UX is built on these core principles:

1. **Deterministic, not predictive** — Show truth, not guesses
2. **Fail closed, not open** — Safe frozen states over false progress
3. **Explicit, not implicit** — Confirm critical actions
4. **Auditable, not silent** — Show who did what when
5. **Server-authoritative** — Server decides, UI respects

**Operational clarity:**
- Status always visible
- Next actions surfaced
- Errors actionable
- Dangerous actions protected

**Data presentation:**
- Financial data in dollars
- Timezone-aware dates
- Paginated lists
- Helpful empty states

**Feedback:**
- Explicit loading states
- Brief success confirmation
- Progress indication for long operations

**Forms:**
- Required fields marked
- Immediate validation
- Destructive actions distinct

**Accessibility:**
- Keyboard navigable
- Screen reader friendly
- Color not sole indicator

**Performance:**
- Perceived performance optimized
- Minimal re-renders
- Lazy loading

**Consistency:**
- Consistent terminology
- Consistent patterns
- Clear visual hierarchy

**One-Sentence UX Summary:**

*The Chef Portal UX is deterministic, server-authoritative, and operationally clear, showing actual state (not predictions), failing safely (not optimistically), surfacing next actions, and providing actionable feedback while maintaining accessibility, performance, and consistency throughout.*
