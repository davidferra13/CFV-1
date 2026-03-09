# UI Audit: Secondary Pages (Element-by-Element)

> Generated 2026-02-23. Covers Onboarding, Import, Cannabis, Help, Loyalty, Safety, Remy, Commands, Dev Tools, Reputation, and Games route groups.

---

## Table of Contents

1. [Onboarding Pages](#1-onboarding-pages)
2. [Import Page](#2-import-page)
3. [Cannabis Pages](#3-cannabis-pages)
4. [Help Pages](#4-help-pages)
5. [Loyalty Pages](#5-loyalty-pages)
6. [Safety Pages](#6-safety-pages)
7. [Remy Page](#7-remy-page)
8. [Commands Page (Remy Hub)](#8-commands-page-remy-hub)
9. [Dev Tools / Simulate Page](#9-dev-tools--simulate-page)
10. [Reputation / Mentions Page](#10-reputation--mentions-page)
11. [Games Pages](#11-games-pages)

---

## 1. Onboarding Pages

### 1a. Onboarding Hub / Wizard Entry

**Route:** `/onboarding`
**File:** `app/(chef)/onboarding/page.tsx`
**Auth:** `requireChef()`
**Page title:** "Getting Started - ChefFlow" (metadata)

**Conditional rendering:**

- If onboarding is NOT complete: renders `<OnboardingWizard>` component
- If onboarding IS complete: renders `<OnboardingHub>` component

**Data fetched server-side:** chef profile, Stripe Connect status, onboarding progress record

---

#### OnboardingWizard Component

**File:** `components/onboarding/onboarding-wizard.tsx`

**Wizard steps:** 5-step linear flow with progress bar

**Progress bar:** Visual bar across top showing current step / total steps

##### Step 1: Profile

| Element    | Type       | Label           | Details                           |
| ---------- | ---------- | --------------- | --------------------------------- |
| Text input | `text`     | Display Name    | Pre-filled from profile if exists |
| Textarea   | `textarea` | Bio             | 1200 character max                |
| Button     | primary    | Save & Continue | Saves profile, advances to step 2 |
| Button     | ghost/link | Skip            | Advances to step 2 without saving |

##### Step 2: Branding

| Element      | Type       | Label           | Details                             |
| ------------ | ---------- | --------------- | ----------------------------------- |
| Text input   | `text`     | Tagline         | 160 character max                   |
| Color picker | `color`    | Brand Color     | Color input for primary brand color |
| Button       | primary    | Save & Continue | Saves branding, advances to step 3  |
| Button       | ghost/link | Skip            | Advances to step 3 without saving   |
| Button       | ghost      | Back            | Returns to step 1                   |

##### Step 3: Public URL

| Element      | Type       | Label               | Details                                                                         |
| ------------ | ---------- | ------------------- | ------------------------------------------------------------------------------- |
| Text input   | `text`     | Profile URL Slug    | Prefixed with `cheflowhq.com/chef/`                                             |
| Data display | text       | Availability Status | Debounced check: "Checking...", "Available!", "Already taken", "Invalid format" |
| Button       | primary    | Save & Continue     | Saves slug, advances to step 4                                                  |
| Button       | ghost/link | Skip                | Advances to step 4 without saving                                               |
| Button       | ghost      | Back                | Returns to step 2                                                               |

##### Step 4: Payments (Stripe Connect)

Three conditional states:

**Not connected:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | primary | Connect Stripe Account | Opens Stripe Connect OAuth flow |
| Link | text | Skip | Advances to step 5 without connecting |
| Button | ghost | Back | Returns to step 3 |

**Pending verification:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | primary | Continue Stripe Setup | Resumes Stripe Connect flow |
| Link | text | Skip | Advances to step 5 |
| Button | ghost | Back | Returns to step 3 |

**Connected (verified):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | status | Green check + "Stripe connected" | Confirmation state |
| Button | primary | Continue | Advances to step 5 |
| Button | ghost | Back | Returns to step 3 |

##### Step 5: Completion

| Element      | Type      | Label              | Details                             |
| ------------ | --------- | ------------------ | ----------------------------------- |
| Data display | checklist | Completion Summary | Check marks for each completed step |
| Link/Button  | primary   | Go to Dashboard    | Navigates to `/dashboard`           |

---

#### OnboardingHub Component (Post-Wizard Migration Hub)

**File:** `components/onboarding/onboarding-hub.tsx`

**Progress bar:** Shows `completedPhases / totalPhases` ratio

**5 Phase cards:**

| Phase | Icon          | Label              | Description                    | CTA Button     | Link                  |
| ----- | ------------- | ------------------ | ------------------------------ | -------------- | --------------------- |
| 1     | Settings icon | Profile & Payments | Profile info and payment setup | Edit           | (inline)              |
| 2     | Users icon    | Client List        | Import your existing clients   | Import Clients | `/onboarding/clients` |
| 3     | Star icon     | Loyalty Program    | Set up points and rewards      | Set Up Loyalty | `/onboarding/loyalty` |
| 4     | Book icon     | Recipe Library     | Add your signature recipes     | Add Recipes    | `/onboarding/recipes` |
| 5     | Users icon    | Staff Roster       | Add your team (optional)       | Add Staff      | `/onboarding/staff`   |

Each card shows either a `CheckCircle` (green, done) or `Circle` (grey, not done) icon.

| Element | Type | Label           | Details                                   |
| ------- | ---- | --------------- | ----------------------------------------- |
| Link    | text | Go to Dashboard | Bottom of page, navigates to `/dashboard` |

---

### 1b. Client Import (Onboarding)

**Route:** `/onboarding/clients`
**File:** `app/(chef)/onboarding/clients/page.tsx`
**Component:** `components/onboarding/client-import-form.tsx`

| Element | Type       | Label                   | Details                    |
| ------- | ---------- | ----------------------- | -------------------------- |
| Link    | back arrow | Back to Setup           | Navigates to `/onboarding` |
| Heading | h1         | Import Your Client List | Page title                 |

#### Client Import Form

| Element          | Type                 | Label                | Required | Details                                                               |
| ---------------- | -------------------- | -------------------- | -------- | --------------------------------------------------------------------- |
| Text input       | `text`               | Full Name            | Yes (\*) | Client name                                                           |
| Text input       | `email`              | Email                | No       | Email address                                                         |
| Text input       | `tel`                | Phone                | No       | Phone number                                                          |
| Select dropdown  | `select`             | Preferred Contact    | No       | Options: Text, Email, Phone, Instagram                                |
| Text input       | `text`               | Referral Source      | No       | Free text                                                             |
| Tag input        | `text` + Enter/comma | Dietary Restrictions | No       | Tags added by pressing Enter or comma                                 |
| Button (per tag) | icon                 | X (remove tag)       | -        | Removes individual dietary tag                                        |
| Tag input        | `text` + Enter/comma | Allergies            | No       | Tags added by pressing Enter or comma. Label marked "safety-critical" |
| Button (per tag) | icon                 | X (remove tag)       | -        | Removes individual allergy tag                                        |
| Number input     | `number`             | Past Events          | No       | Count of historical events                                            |
| Number input     | `number`             | Total Spent $        | No       | Historical total spend                                                |
| Button           | primary              | Save & Add Another   | -        | Saves client, clears form for next entry                              |

**Right panel (imported list):**

| Element      | Type         | Label                      | Details                               |
| ------------ | ------------ | -------------------------- | ------------------------------------- |
| Data display | badge + list | Imported clients ({count}) | Shows all imported clients with names |
| Button       | primary      | Continue to Loyalty Setup  | Navigates to `/onboarding/loyalty`    |
| Button/Link  | ghost        | Back to Setup Overview     | Navigates to `/onboarding`            |

---

### 1c. Loyalty Setup (Onboarding)

**Route:** `/onboarding/loyalty`
**File:** `app/(chef)/onboarding/loyalty/page.tsx`
**Component:** `components/onboarding/loyalty-setup.tsx`

| Element | Type       | Label           | Details                    |
| ------- | ---------- | --------------- | -------------------------- |
| Link    | back arrow | Back to Setup   | Navigates to `/onboarding` |
| Heading | h1         | Loyalty Program | Page title                 |

#### 3-Tab Interface

**Tab bar:** 3 tabs: "1. Program Config", "2. Reward Catalog", "3. Historical Balances"

##### Tab 1: Program Config

| Element      | Type      | Label              | Details                           |
| ------------ | --------- | ------------------ | --------------------------------- |
| Number input | `number`  | Points per Guest   | Points earned per guest per event |
| Number input | `number`  | Welcome Points     | Bonus points for new clients      |
| Number input | `number`  | Silver Threshold   | Minimum points for Silver tier    |
| Number input | `number`  | Gold Threshold     | Minimum points for Gold tier      |
| Number input | `number`  | Platinum Threshold | Minimum points for Platinum tier  |
| Button       | primary   | Save Config        | Saves tier configuration          |
| Button       | secondary | Next: Rewards ->   | Switches to tab 2                 |

##### Tab 2: Reward Catalog

| Element      | Type | Label            | Details                                                   |
| ------------ | ---- | ---------------- | --------------------------------------------------------- |
| Data display | list | Existing Rewards | Each shows name, description, type badge, points required |

**Add Reward Form:**

| Element         | Type      | Label                  | Details                                                                      |
| --------------- | --------- | ---------------------- | ---------------------------------------------------------------------------- |
| Text input      | `text`    | Reward Name            | Name of the reward                                                           |
| Number input    | `number`  | Points Required        | Cost in points                                                               |
| Select dropdown | `select`  | Type                   | Options: Free Course, Free Dinner, Fixed Discount, Percent Discount, Upgrade |
| Text input      | `text`    | Description            | Optional description                                                         |
| Button          | primary   | Add Reward             | Adds reward to catalog                                                       |
| Button          | secondary | Next: Seed Balances -> | Switches to tab 3                                                            |

##### Tab 3: Historical Balances

| Element             | Type            | Label                     | Details                                                          |
| ------------------- | --------------- | ------------------------- | ---------------------------------------------------------------- |
| Data display        | warning         | Append-only warning       | Warning that ledger is immutable                                 |
| Data display        | per-client rows | Client Name + Point Input | Each imported client shown with number input for initial balance |
| Button (per client) | secondary       | Save                      | Saves individual client balance                                  |
| Button              | primary         | Save All Balances         | Saves all at once                                                |
| Link                | text            | Continue to Recipes       | Navigates to `/onboarding/recipes`                               |
| Link                | text            | Back to Overview          | Navigates to `/onboarding`                                       |

---

### 1d. Recipe Entry (Onboarding)

**Route:** `/onboarding/recipes`
**File:** `app/(chef)/onboarding/recipes/page.tsx`
**Component:** `components/onboarding/recipe-entry-form.tsx`

| Element | Type       | Label          | Details                    |
| ------- | ---------- | -------------- | -------------------------- |
| Link    | back arrow | Back to Setup  | Navigates to `/onboarding` |
| Heading | h1         | Recipe Library | Page title                 |

#### Recipe Entry Form

| Element          | Type           | Label              | Required | Details                                                                                                                          |
| ---------------- | -------------- | ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Text input       | `text`         | Name               | Yes (\*) | Recipe name                                                                                                                      |
| Select dropdown  | `select`       | Category           | No       | 14 options: sauce, appetizer, soup, salad, protein, seafood, pasta, grain, vegetable, bread, dessert, beverage, condiment, other |
| Text input       | `text`         | Description        | No       | Short description                                                                                                                |
| Text input       | `text`         | Method summary     | No       | Brief method overview                                                                                                            |
| Textarea         | `textarea`     | Full Method        | No       | Detailed preparation steps                                                                                                       |
| Number input     | `number`       | Prep min           | No       | Prep time in minutes                                                                                                             |
| Number input     | `number`       | Cook min           | No       | Cook time in minutes                                                                                                             |
| Number input     | `number`       | Yield qty          | No       | Recipe yield quantity                                                                                                            |
| Text input       | `text`         | Yield unit         | No       | Unit for yield (e.g., "servings")                                                                                                |
| Tag input        | `text` + Enter | Dietary Tags       | No       | Tags like "vegan", "gluten-free"                                                                                                 |
| Button (per tag) | icon           | X (remove tag)     | -        | Removes individual dietary tag                                                                                                   |
| Text input       | `text`         | Chef Notes         | No       | Personal notes                                                                                                                   |
| Button           | primary        | Save & Add Another | -        | Saves recipe, clears form                                                                                                        |

**Right panel (recipe library):**

| Element      | Type         | Label                   | Details                                          |
| ------------ | ------------ | ----------------------- | ------------------------------------------------ |
| Data display | badge + list | Library ({count})       | Lists recipes with name and category color badge |
| Link         | text         | Continue to Staff Setup | Navigates to `/onboarding/staff`                 |
| Link         | text         | Back to Setup Overview  | Navigates to `/onboarding`                       |

---

### 1e. Staff Entry (Onboarding)

**Route:** `/onboarding/staff`
**File:** `app/(chef)/onboarding/staff/page.tsx`
**Component:** `components/onboarding/staff-entry-form.tsx`

| Element | Type       | Label         | Details                    |
| ------- | ---------- | ------------- | -------------------------- |
| Link    | back arrow | Back to Setup | Navigates to `/onboarding` |
| Heading | h1         | Staff Roster  | Page title                 |

#### Staff Entry Form

| Element         | Type     | Label              | Required | Details                                                                                    |
| --------------- | -------- | ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| Text input      | `text`   | Name               | Yes (\*) | Staff member name                                                                          |
| Select dropdown | `select` | Role               | No       | Options: Sous Chef, Kitchen Assistant, Service Staff, Server, Bartender, Dishwasher, Other |
| Text input      | `email`  | Email              | No       | Email address                                                                              |
| Text input      | `tel`    | Phone              | No       | Phone number                                                                               |
| Number input    | `number` | Hourly Rate $/hr   | No       | Pay rate                                                                                   |
| Text input      | `text`   | Notes              | No       | Free text notes                                                                            |
| Button          | primary  | Save & Add Another | -        | Saves staff, clears form                                                                   |

**Right panel (staff roster):**

| Element      | Type         | Label                   | Details                               |
| ------------ | ------------ | ----------------------- | ------------------------------------- |
| Data display | badge + list | Roster ({count})        | Lists staff with name and hourly rate |
| Link         | text         | Back to Setup Overview  | Navigates to `/onboarding`            |
| Link         | text         | Skip -> Go to Dashboard | Navigates to `/dashboard`             |

---

## 2. Import Page

**Route:** `/import`
**File:** `app/(chef)/import/page.tsx`
**Auth:** `requireChef()`
**Page title:** "Smart Import - ChefFlow" (metadata)

| Element      | Type     | Label                                         | Details     |
| ------------ | -------- | --------------------------------------------- | ----------- |
| Heading      | h1       | Smart Import                                  | Page title  |
| Data display | subtitle | "Paste text, upload photos, or drop files..." | Description |

**Conditional Alert (when AI not configured):**

| Element | Type    | Label                       | Details                                                                             |
| ------- | ------- | --------------------------- | ----------------------------------------------------------------------------------- |
| Alert   | warning | Smart Import Not Configured | Shows when `GEMINI_API_KEY` is not set. Contains link to Google Studio for API key. |

**SmartImportHub Component:**

9 import modes available (passed as props): `brain-dump`, `csv`, `past-events`, `take-a-chef`, `clients`, `recipe`, `receipt`, `document`, `file-upload`

Initial mode determined by `?mode=` search param, defaulting to `brain-dump`.

Props passed: `aiConfigured` (boolean), `events` (dropdown list, last 50), `existingClients` (for historical import), `initialMode`.

> Note: The `SmartImportHub` component is a large, complex component not fully enumerated here. It handles mode switching, file uploads, text parsing, and review flows for each of the 9 modes.

---

## 3. Cannabis Pages

### 3a. Cannabis Hub

**Route:** `/cannabis`
**File:** `app/(chef)/cannabis/page.tsx`
**Auth:** `requireChef()` + `hasCannabisAccess` check (redirects to `/dashboard` if no access)
**Page title:** "Cannabis Portal - ChefFlow" (metadata)

| Element      | Type     | Label                     | Details    |
| ------------ | -------- | ------------------------- | ---------- |
| Heading      | h1       | Cannabis Dining Portal    | Page title |
| Data display | subtitle | Description of the portal | -          |

**4 Hub Cards (links):**

| Card | Icon                 | Label      | Description            | Link                   |
| ---- | -------------------- | ---------- | ---------------------- | ---------------------- |
| 1    | Calendar             | Events     | Cannabis dining events | `/cannabis/events`     |
| 2    | DollarSign           | Ledger     | Financial tracking     | `/cannabis/ledger`     |
| 3    | Mail                 | Invite     | Guest invitations      | `/cannabis/invite`     |
| 4    | Shield (alert style) | Compliance | Compliance checklist   | `/cannabis/compliance` |

**Data displays:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | count | Total events | Count of cannabis events |
| Data display | count | Active events | Count of active cannabis events |

**Info panel:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | info box | How the Portal Works | 4 bullet points explaining the cannabis event workflow |

---

### 3b. Cannabis Events

**Route:** `/cannabis/events`
**File:** `app/(chef)/cannabis/events/page.tsx`
**Auth:** `requireChef()` + cannabis access check

| Element | Type   | Label           | Details                    |
| ------- | ------ | --------------- | -------------------------- |
| Heading | h1     | Cannabis Events | Page title                 |
| Link    | button | + New Event     | Navigates to `/events/new` |

**Conditional empty state:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | empty | No cannabis events yet | Shown when list is empty |
| Link | text | Create your first cannabis event | Navigates to `/events/new` |

**Event lists (when populated):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | section | Active Events | List of CannabisEventCard components for active events |
| Data display | section | Past Events | List of CannabisEventCard components for past events |

Each `CannabisEventCard` displays event occasion, date, status, and links to the event detail page.

---

### 3c. Cannabis Invite

**Route:** `/cannabis/invite`
**File:** `app/(chef)/cannabis/invite/page.tsx`
**Component:** `components/cannabis/invite-form.tsx`
**Auth:** `requireChef()` + cannabis access check

| Element | Type | Label                 | Details    |
| ------- | ---- | --------------------- | ---------- |
| Heading | h1   | Send Guest Invitation | Page title |

#### Invite Form

| Element    | Type       | Label                     | Required | Details                |
| ---------- | ---------- | ------------------------- | -------- | ---------------------- |
| Text input | `email`    | Guest Email               | Yes (\*) | Required email field   |
| Text input | `text`     | Guest Name                | No       | Optional name          |
| Textarea   | `textarea` | Personal Note             | No       | Optional message       |
| Button     | primary    | Submit Invitation Request | -        | Disabled while loading |

**Success state (after submission):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | success message | Invite Submitted | Confirmation |
| Link | text | Send another invite | Resets form |

**Sent Invites History:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | list | Sent Invitations | Per-invite: email, name, date, status badge |
| Data display | badge | Status | Processing / Sent / Declined / Accepted |

---

### 3d. Cannabis Ledger

**Route:** `/cannabis/ledger`
**File:** `app/(chef)/cannabis/ledger/page.tsx`
**Auth:** `requireChef()` + cannabis access check

**3 Summary Cards:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | card (green) | Revenue | Total revenue in dollars |
| Data display | card (red) | Expenses | Total expenses in dollars |
| Data display | card (conditional) | Net Profit | Green if positive, red if negative |

**Conditional content:**

Empty state when no entries, or data table when populated:

| Column | Type        | Details                                                                               |
| ------ | ----------- | ------------------------------------------------------------------------------------- |
| Date   | date        | Entry date formatted                                                                  |
| Type   | badge/label | Payment, Deposit, Installment, Final Payment, Tip, Refund, Adjustment, Add-On, Credit |
| Event  | text        | Associated event name                                                                 |
| Amount | currency    | Dollar amount, with refund indicator if applicable                                    |

---

### 3e. Cannabis Compliance (Placeholder)

**Route:** `/cannabis/compliance`
**File:** `app/(chef)/cannabis/compliance/page.tsx`
**Component:** `app/(chef)/cannabis/compliance/compliance-placeholder-client.tsx` (co-located client component)
**Auth:** `requireChef()` + cannabis access check

| Element | Type | Label             | Details    |
| ------- | ---- | ----------------- | ---------- |
| Heading | h1   | Compliance Center | Page title |

**Warning banner:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | conspicuous warning | Placeholder Notice | Clear notice that this is not yet functional |

**10-item Phase 2 checklist:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | numbered list | Missing Phase 2 features | 10 items describing what's needed for compliance |

**Compliance Notes Scratchpad:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Textarea | `textarea` | Compliance Notes | Free-text notes, persisted to `localStorage` |
| Button | primary | Save Notes | Saves to `localStorage` |

---

## 4. Help Pages

### 4a. Help Center Hub

**Route:** `/help`
**File:** `app/(chef)/help/page.tsx`
**Component:** `components/help/help-search.tsx`
**Auth:** `requireChef()`

| Element | Type | Label       | Details    |
| ------- | ---- | ----------- | ---------- |
| Heading | h1   | Help Center | Page title |

**Search:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Text input | `text` | Search input | Filters 13 static articles by keyword match |
| Data display | dropdown | Search Results | Matching articles shown in dropdown as links |

**6 Category Cards (links):**

| Card | Label                   | Link               |
| ---- | ----------------------- | ------------------ |
| 1    | Events & Scheduling     | `/help/events`     |
| 2    | Clients & CRM           | `/help/clients`    |
| 3    | Finance & Payments      | `/help/finance`    |
| 4    | Menus & Recipes         | `/help/culinary`   |
| 5    | Settings & Integrations | `/help/settings`   |
| 6    | Getting Started         | `/help/onboarding` |

**Contact link:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Link | mailto | Contact Support | Opens `mailto:support@cheflowhq.com` |

---

### 4b. Help Article Pages

**Route:** `/help/[slug]`
**File:** `app/(chef)/help/[slug]/page.tsx`
**Valid slugs:** `events`, `clients`, `finance`, `culinary`, `settings`, `onboarding`

| Element      | Type       | Label                           | Details                              |
| ------------ | ---------- | ------------------------------- | ------------------------------------ |
| Link         | back arrow | Back to Help Center             | Navigates to `/help`                 |
| Heading      | h1         | (Article title, varies by slug) | Dynamic based on slug                |
| Data display | `<pre>`    | Article Content                 | Static text content for the category |
| Link         | mailto     | Contact support                 | Opens `mailto:support@cheflowhq.com` |

---

## 5. Loyalty Pages

### 5a. Loyalty Dashboard

**Route:** `/loyalty`
**File:** `app/(chef)/loyalty/page.tsx`
**Component:** `app/(chef)/loyalty/reward-actions.tsx`
**Auth:** `requireChef()`

| Element | Type   | Label            | Details                             |
| ------- | ------ | ---------------- | ----------------------------------- |
| Heading | h1     | Loyalty Program  | Page title                          |
| Link    | button | Program Settings | Navigates to `/loyalty/settings`    |
| Link    | button | Create Reward    | Navigates to `/loyalty/rewards/new` |

**PendingDeliveriesPanel:** (component renders pending reward deliveries)

**4 Stat Cards:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | stat card | Total Clients | Count of loyalty-enrolled clients |
| Data display | stat card | Points Outstanding | Total unredeemed points |
| Data display | stat card | Gold+ Members | Count of Gold and Platinum tier clients |
| Data display | stat card | Active Rewards | Count of active rewards in catalog |

**Tier Breakdown (4 cards):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | tier card | Bronze | Client count + point range (0 to Silver threshold) |
| Data display | tier card | Silver | Client count + point range (Silver to Gold threshold) |
| Data display | tier card | Gold | Client count + point range (Gold to Platinum threshold) |
| Data display | tier card | Platinum | Client count + point range (Platinum+) |

**Outreach Opportunities (conditional, shown when applicable):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | section | Approaching Tier Upgrades | Client names as links to `/clients/{id}`, with points needed for next tier |
| Data display | section | Approaching Rewards | Client names as links to `/clients/{id}`, with points needed for nearest reward |

**Top Clients:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | ranked list | Top Clients | Ranked by points. Each row: name (link to `/clients/{id}`), tier badge, point count |

**Rewards Catalog:**

Per-reward display:
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | list item | Reward | Name, description, value, points cost |
| Button | secondary | Edit | Toggles inline edit mode |
| Button | danger/ghost | Remove | Deletes reward |

**Inline edit mode (per reward):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Text input | `text` | Name | Editable reward name |
| Text input | `text` | Description | Editable description |
| Number input | `number` | Points Required | Editable point cost |
| Button group | 5 buttons | Reward Type | Free Course / Fixed Discount / Percentage Discount / Free Dinner / Upgrade |
| Number input (conditional) | `number` | Discount Amount | Shown for Fixed Discount type |
| Number input (conditional) | `number` | Discount Percentage | Shown for Percentage Discount type |
| Button | primary | Save Changes | Saves edits |
| Button | ghost | Cancel | Exits edit mode |

**Recent Point Awards:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | list | Recent Awards | Description, date, points awarded |

**Program Settings Summary:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | field | Points per Guest | Configured value |
| Data display | field | Welcome Bonus | Configured value |
| Data display | field | Large Party Bonus | Configured value |
| Data display | badge | Program Status | Active/Paused badge |
| Data display | list | Milestones | List of milestone bonuses |
| Link | text | Edit Settings | Navigates to `/loyalty/settings` |

---

### 5b. Create Reward

**Route:** `/loyalty/rewards/new`
**File:** `app/(chef)/loyalty/rewards/new/page.tsx`
**Component:** `app/(chef)/loyalty/rewards/new/create-reward-form.tsx`

| Element | Type       | Label           | Details                 |
| ------- | ---------- | --------------- | ----------------------- |
| Link    | back arrow | Back to Loyalty | Navigates to `/loyalty` |
| Heading | h1         | Create Reward   | Page title              |

#### Create Reward Form

| Element                    | Type           | Label               | Required | Details                                                                    |
| -------------------------- | -------------- | ------------------- | -------- | -------------------------------------------------------------------------- |
| Text input                 | `text`         | Reward Name         | Yes      | Required field                                                             |
| Text input                 | `text`         | Description         | No       | Optional description                                                       |
| Number input               | `number`       | Points Required     | Yes      | Min value: 1                                                               |
| Button group               | 5 grid buttons | Reward Type         | Yes      | Free Course / Fixed Discount / Percentage Discount / Free Dinner / Upgrade |
| Number input (conditional) | `number`       | Discount Amount $   | No       | Shown only for Fixed Discount type                                         |
| Number input (conditional) | `number`       | Discount Percentage | No       | Shown only for Percentage Discount type                                    |
| Button                     | primary        | Create Reward       | -        | Submits form                                                               |
| Button                     | ghost          | Cancel              | -        | Navigates back to `/loyalty`                                               |

---

### 5c. Loyalty Settings

**Route:** `/loyalty/settings`
**File:** `app/(chef)/loyalty/settings/page.tsx`
**Component:** `app/(chef)/loyalty/settings/loyalty-settings-form.tsx`

| Element | Type       | Label            | Details                 |
| ------- | ---------- | ---------------- | ----------------------- |
| Link    | back arrow | Back to Loyalty  | Navigates to `/loyalty` |
| Heading | h1         | Loyalty Settings | Page title              |

#### Loyalty Settings Form

**Program Status:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Toggle/Button | toggle | Program Status | Active / Paused, with status badge |

**Earn Rates:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Number input | `number` | Points per guest | Points earned per guest per event |
| Number input | `number` | Welcome bonus | Points for new client enrollment |
| Number input | `number` | Referral bonus | Points for client referrals |

**Large Party Bonus:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Toggle/Button | toggle | Large Party Bonus | Enable/disable large party bonus |
| Number input (conditional) | `number` | Minimum guests | Threshold guest count |
| Number input (conditional) | `number` | Bonus points | Extra points for qualifying parties |

**Milestone Bonuses:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | list | Existing Milestones | Each with dinner number, bonus points, Remove button |
| Button (per milestone) | ghost/danger | Remove | Deletes the milestone |
| Number input | `number` | Dinner # | For adding new milestone |
| Number input | `number` | Bonus Points | For adding new milestone |
| Button | secondary | Add Milestone | Adds new milestone to list |

**Tier Thresholds:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Number input | `number` | Silver minimum | Points for Silver tier, with silver dot indicator |
| Number input | `number` | Gold minimum | Points for Gold tier, with gold dot indicator |
| Number input | `number` | Platinum minimum | Points for Platinum tier, with platinum dot indicator |
| Data display | computed | Range display | Shows computed tier ranges based on thresholds |

**Actions:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | primary | Save Settings | Saves all settings |
| Button | ghost | Back to Dashboard | Navigates to `/loyalty` |
| Data display | message | Success/Error feedback | Toast or inline message |

---

## 6. Safety Pages

### 6a. Incident List

**Route:** `/safety/incidents`
**File:** `app/(chef)/safety/incidents/page.tsx`
**Component:** `components/safety/incident-list.tsx`
**Auth:** `requireChef()`

| Element | Type   | Label            | Details                              |
| ------- | ------ | ---------------- | ------------------------------------ |
| Heading | h1     | Safety Incidents | Page title                           |
| Link    | button | Report Incident  | Navigates to `/safety/incidents/new` |

**Empty state:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | empty message | No incidents recorded | Shown when list is empty |

**Incident cards (when populated):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | badge | Incident Type | e.g., Food Safety, Guest Injury, etc. |
| Data display | badge | Status | Open, In Progress, Resolved |
| Data display | text | Date | Incident date |
| Data display | text (2-line clamp) | Description | Truncated description |
| Link | button | View | Navigates to `/safety/incidents/{id}` |

---

### 6b. Report New Incident

**Route:** `/safety/incidents/new`
**File:** `app/(chef)/safety/incidents/new/page.tsx`
**Component:** `components/safety/incident-form.tsx`
**Auth:** `requireChef()`

| Element              | Type | Label              | Details     |
| -------------------- | ---- | ------------------ | ----------- |
| Heading (Card title) | h2   | Report an Incident | Card header |

#### Incident Form

| Element         | Type             | Label                  | Required | Details                                                                                                                                         |
| --------------- | ---------------- | ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Date/time input | `datetime-local` | Date & Time            | No       | Defaults to current date/time                                                                                                                   |
| Select dropdown | `select`         | Incident Type          | No       | Options: Food Safety, Guest Injury, Property Damage, Equipment Failure, Near Miss, Other                                                        |
| Textarea        | `textarea`       | Description            | Yes (\*) | 4 rows, placeholder "What happened?"                                                                                                            |
| Textarea        | `textarea`       | Parties Involved       | No       | 2 rows, placeholder "Who was involved or affected?"                                                                                             |
| Textarea        | `textarea`       | Immediate Action Taken | No       | 2 rows, placeholder "What was done immediately?"                                                                                                |
| Button          | primary          | Document Incident      | -        | Disabled while pending or when description is empty. Text changes to "Saving..." while submitting. Redirects to `/safety/incidents` on success. |

---

### 6c. Incident Detail

**Route:** `/safety/incidents/[id]`
**File:** `app/(chef)/safety/incidents/[id]/page.tsx`
**Component:** `components/safety/incident-resolution-tracker.tsx`
**Auth:** `requireChef()`, returns 404 if incident not found or wrong tenant

**Header:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Heading | h1 | (title or "Incident Report") | Dynamic title |
| Data display | text | Incident #{truncated-id} | First 8 chars of UUID, uppercased |
| Data display | badge | Severity | critical/high = error (red), medium = warning (amber), low = info (blue) |
| Data display | badge | Status | open = warning (amber), resolved = success (green) |

**Incident Details Card:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | field | Date | Formatted incident date |
| Data display | field | Location | Location text (conditional) |
| Data display | field | Type | Incident type with underscores replaced by spaces, capitalized |
| Data display | field | Description | Full description, whitespace preserved |
| Data display | field | Immediate Actions Taken | Full text, whitespace preserved (conditional) |

**Follow-Up & Resolution Card (IncidentResolutionTracker):**

| Element             | Type             | Label                 | Details                                                           |
| ------------------- | ---------------- | --------------------- | ----------------------------------------------------------------- |
| Checkbox (per step) | `checkbox`       | Follow-up step label  | Toggles completion. Completed steps show strikethrough text.      |
| Text input          | `text`           | Add follow-up step... | Placeholder text. Submits on Enter key.                           |
| Button              | secondary, small | Add                   | Adds new follow-up step. Disabled when input is empty or pending. |

**Resolution Status:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | primary (if selected) or ghost | Open | Sets resolution status to "open" |
| Button | primary (if selected) or ghost | In Progress | Sets resolution status to "in_progress" |
| Button | primary (if selected) or ghost | Resolved | Sets resolution status to "resolved" |

---

### 6d. Backup Chef Protocol

**Route:** `/safety/backup-chef`
**File:** `app/(chef)/safety/backup-chef/page.tsx`
**Component:** `components/safety/backup-chef-list.tsx` + `components/safety/backup-chef-form.tsx`
**Auth:** `requireChef()`

| Element      | Type     | Label                  | Details                                       |
| ------------ | -------- | ---------------------- | --------------------------------------------- |
| Heading      | h1       | Backup Chef Protocol   | Page title                                    |
| Data display | subtitle | Description of purpose | "Trusted chefs and culinary professionals..." |

**Warning banner:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | amber warning box | Best practice | "Confirm availability with each backup chef at least once per quarter..." |

**Contact count + Add button:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Contact count | "{N} backup contact(s) on file" or "No backup contacts on file" |
| Button | primary, small | Add Backup Chef | Opens BackupChefForm inline |

#### BackupChefForm (shown when "Add Backup Chef" clicked)

| Element      | Type       | Label                         | Required | Details                                                                      |
| ------------ | ---------- | ----------------------------- | -------- | ---------------------------------------------------------------------------- |
| Text input   | `text`     | Name                          | Yes (\*) | Contact name                                                                 |
| Text input   | `text`     | Phone                         | No       | Phone number                                                                 |
| Text input   | `email`    | Email                         | No       | Email address                                                                |
| Text input   | `text`     | Relationship                  | No       | Placeholder: "e.g., Culinary school friend"                                  |
| Text input   | `text`     | Specialties (comma-separated) | No       | Placeholder: "Italian, French, Pastry"                                       |
| Number input | `number`   | Max Guest Count               | No       | Maximum guests they can handle                                               |
| Textarea     | `textarea` | Availability Notes            | No       | 2 rows                                                                       |
| Button       | primary    | Save                          | -        | Disabled while pending or name is empty. Text: "Saving..." while submitting. |
| Button       | ghost      | Cancel                        | -        | Closes the form                                                              |

**Per-contact cards (BackupChefList):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Name | Contact name (bold) |
| Data display | text | Relationship | Below name, smaller text (conditional) |
| Data display | text | Phone | Contact phone (conditional) |
| Data display | text | Email | Contact email (conditional) |
| Data display | badges | Specialties | Array of badges, one per specialty (conditional) |
| Data display | text | Max Guests | "Up to {N} guests" (conditional) |
| Button | ghost, small | Remove | Calls `deactivateBackupContact(id)`. Disabled while pending. |

---

## 7. Remy Page

**Route:** `/remy`
**File:** `app/(chef)/remy/page.tsx`
**Auth:** None (no `requireChef()` call visible)
**Page title:** "Remy History" (metadata)

| Element      | Type             | Label                                    | Details                                                                            |
| ------------ | ---------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Data display | icon             | Bot icon                                 | Brand-colored circle with Bot icon                                                 |
| Heading      | h1               | Remy History                             | Page title                                                                         |
| Data display | subtitle         | "Everything Remy has created for you..." | Description                                                                        |
| Component    | Suspense-wrapped | RemyHistoryList                          | Renders conversation history. Loading state: 3 animated pulse skeleton rectangles. |

---

## 8. Commands Page (Remy Hub)

**Route:** `/commands`
**File:** `app/(chef)/commands/page.tsx`
**Component:** `components/ai/remy-hub-dashboard.tsx`
**Auth:** `requireChef()`
**Page title:** "Remy - ChefFlow" (metadata)

**Header:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | icon | Bot icon | Brand-colored rounded square with Bot icon |
| Heading | h1 | Remy | Page title |
| Data display | subtitle | "Your AI assistant - research, drafts, memory, and task execution" | Description |

**Tab Bar (4 tabs):**
| Tab | Icon | Label | Details |
|-----|------|-------|---------|
| 1 | Bot | Chat | Default active tab |
| 2 | MessageSquare | History | - |
| 3 | Brain | Memory | - |
| 4 | ShieldCheck | Settings | - |

Active tab: brand-colored bottom border + text. Inactive: transparent border, stone text.

---

### Chat Tab

| Element      | Type | Label               | Details                                                           |
| ------------ | ---- | ------------------- | ----------------------------------------------------------------- |
| Data display | text | Intro paragraph     | "Tell Remy what you need. Multi-step commands run in parallel..." |
| Component    | -    | CommandCenterClient | The main Remy AI chat interface                                   |

---

### History Tab

| Element   | Type | Label           | Details                        |
| --------- | ---- | --------------- | ------------------------------ |
| Component | -    | RemyHistoryList | Full conversation history list |

---

### Memory Tab

**Loading state:** 3 animated pulse skeleton rectangles

**Empty state:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | icon | Brain icon (grey) | Centered |
| Data display | text | Empty message | "Remy hasn't formed any memories yet..." |

**Populated state:**

| Element      | Type | Label        | Details                                                            |
| ------------ | ---- | ------------ | ------------------------------------------------------------------ |
| Data display | text | Memory count | "{N} memor(y/ies) - Remy uses these to personalize conversations." |

**Per-memory card:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | icon | Brain icon (grey) | Left of memory content |
| Data display | text | Content | Memory text content |
| Data display | badge (default) | Category | Uses CATEGORY_LABELS map: Chef Preference, Client Insight, Business Rule, Communication Style, Culinary Note, Scheduling, Pricing, Workflow |
| Data display | text | Importance | "Importance: {N}/10" |
| Data display | text | Access count | "Used {N}x" |
| Button | icon (hover reveal) | Delete memory | Trash2 icon. Opacity 0 by default, appears on group hover. Red hover color. Disabled while deleting. Calls `deleteRemyMemory(id)`. |

---

### Settings Tab

**Loading state:** 3 animated pulse skeleton rectangles

**Error state:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | icon | ShieldCheck (grey) | Centered |
| Data display | text | Error message | "Unable to load settings. Please try again." |

**Status banner (conditional):**

When Remy enabled:
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | banner (emerald) | Status | "Remy is active and running on ChefFlow's private infrastructure." |
| Data display | text (emerald) | Privacy note | "Your data stays within ChefFlow. Nothing is sent to third-party AI services." |

When Remy disabled:
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | banner (stone/grey) | Status | "Remy is currently disabled." |
| Data display | text (grey) | Note | "Your existing AI data is preserved. Enable Remy from the controls below." |

**How It Works (collapsible):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Details/Summary | collapsible | How It Works - Data Flow Diagram | Expandable section |
| Component | - | DataFlowAnimated | Animated data flow diagram inside |

**Feature Toggles + Data Controls:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Component | - | DataControls | Feature toggles and data management controls. Receives `initialPrefs`, `initialSummary`, `onRefresh`. |

**Privacy Promise:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Heading | h3 | Our Promise | Section title |
| Data display | text | "We will never:" | Send data to external AI, use data to train models, share with third parties, make data hard to delete |
| Data display | text | "We will always:" | Process AI on ChefFlow servers, give visibility into what Remy knows, let you delete data instantly, respect opt-out |

---

## 9. Dev Tools / Simulate Page

**Route:** `/dev/simulate`
**File:** `app/(chef)/dev/simulate/page.tsx`
**Component:** `app/(chef)/dev/simulate/simulate-client.tsx`
**Auth:** `requireAdmin()` (admin-only page)
**Page title:** "Simulation Lab - ChefFlow" (metadata)

| Element      | Type     | Label          | Details                                                                                |
| ------------ | -------- | -------------- | -------------------------------------------------------------------------------------- |
| Heading      | h1       | Simulation Lab | Page title                                                                             |
| Data display | subtitle | Description    | "Generates synthetic chef scenarios -> runs through the pipeline -> grades outputs..." |

**4 Summary Stat Cards (conditional, shown when totalScenariosRun > 0):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | stat card | all-time pass rate | Percentage, colored: green >= 80%, amber >= 60%, red < 60% |
| Data display | stat card | scenarios run | Total scenario count |
| Data display | stat card | simulation runs | Count of recent runs |
| Data display | stat card | fine-tuning examples | Count of fine-tuning examples generated |

**Pass Rate by Module (conditional, shown when module data exists):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | horizontal bar chart | Pass Rate by Module (all time) | Per-module bar with label, progress bar (green >= 80%, amber >= 60%, red < 60%), percentage |

**Run Configuration Card:**

| Element              | Type | Label            | Details     |
| -------------------- | ---- | ---------------- | ----------- |
| Heading (Card title) | h2   | Run a Simulation | Card header |

**Module Selection:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button group | toggle pills | Select modules to test | Each `SimModule` as a pill button. Selected: brand-colored border + bg. Unselected: stone border. Disabled while simulation running. Default selected: `inquiry_parse`, `client_parse`, `allergen_risk`. |

**Scenarios per module:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Range input | `range` | Scenarios per module: {N} | Min: 1, Max: 10. Labels: "1 (fast)" to "10 (thorough)". Default: 3. |

**Time estimate:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | info box | Estimated time | "~{N} min ({modules} modules x {scenarios} scenarios x ~15s each). Ollama must be running." |

**Error / Success messages (conditional):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | error box (red) | Error message | Dynamic error text |
| Data display | success box (green) | Success message | "Simulation complete - results updated below." |

**Run button:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | primary | Run Simulation | Disabled while pending or no modules selected. Text: "Running simulation..." while active. |
| Data display | text (pulsing) | Running indicator | "Ollama is generating scenarios and evaluating outputs..." (conditional while running) |

**Latest Run Results (conditional):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Heading | h2 | Latest Run Results | With timestamp |
| Component | - | SimulationResultsPanel | Displays detailed results for the latest run |

**Run History (conditional, when runs exist):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Heading (Card title) | h2 | Run History | Card header |
| Data display | list | Per-run entries | Date/time, scenario count, status/pass rate |

Per run entry:
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Date/Time | Localized date string |
| Data display | text | Scenario count | "{N} scenarios" |
| Data display | text (colored) | Status/Pass Rate | Running (blue "Running..."), Failed (red "Failed"), or pass percentage (green >= 80%, amber >= 60%, red < 60%) |

**Empty state (no runs yet):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | centered | No simulations run yet | Test tube emoji + message + instruction |

---

## 10. Reputation / Mentions Page

**Route:** `/reputation/mentions`
**File:** `app/(chef)/reputation/mentions/page.tsx`
**Component:** `components/reputation/mention-feed.tsx`
**Auth:** `requireChef()`

| Element      | Type     | Label                                                             | Details     |
| ------------ | -------- | ----------------------------------------------------------------- | ----------- |
| Heading      | h1       | Brand Mentions                                                    | Page title  |
| Data display | subtitle | "Monitor where your brand appears online and respond to reviews." | Description |

**Filter Tabs (3 pill buttons):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button (pill) | filter tab | All | Shows all mentions. Brand-colored when active. |
| Button (pill) | filter tab | Unreviewed | Filters to unreviewed only |
| Button (pill) | filter tab | Negative | Filters to negative sentiment only |

**Empty state:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | centered text | No mentions found for this filter | Shown when filtered list is empty |

**Mention Cards (when populated):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text (uppercase) | Source | Source name (e.g., "Yelp", "Google") |
| Data display | badge | Sentiment | positive = success (green), negative = error (red), neutral = default (grey) |
| Data display | badge (conditional) | Reviewed | "Reviewed" badge shown when `is_reviewed = true` |
| Link (conditional) | external link | Title | Links to `source_url` if URL exists, opens in new tab. Plain text if no URL. |
| Data display | text (2-line clamp, conditional) | Excerpt | Mention excerpt, truncated to 2 lines |
| Data display | text | Found date | "Found {formatted date}" |
| Button (conditional) | secondary, small | Mark Reviewed | Only shown on unreviewed mentions. Disabled while pending. Calls `markReviewed(id)`. |

Card opacity: reviewed mentions shown at 60% opacity.

---

## 11. Games Pages

### 11a. Games Hub (Arcade)

**Route:** `/games`
**File:** `app/(chef)/games/page.tsx`
**Auth:** None (no explicit auth guard)

| Element      | Type     | Label                                               | Details               |
| ------------ | -------- | --------------------------------------------------- | --------------------- |
| Heading      | h1       | Chef Arcade                                         | Page title (centered) |
| Data display | subtitle | "Take a break, have some fun, sharpen your skills." | Centered description  |

**6 Game Cards (links, 2-column grid):**

| Card | Emoji        | Title                 | Description                                 | CTA          | Link                 |
| ---- | ------------ | --------------------- | ------------------------------------------- | ------------ | -------------------- |
| 1    | (lightbulb)  | Menu Muse             | "Break through writer's block..."           | Get inspired | `/games/menu-muse`   |
| 2    | (fire)       | The Line              | "Survive the dinner rush..."                | Play now     | `/games/the-line`    |
| 3    | (snake)      | Chef Snake            | "Slither around collecting ingredients..."  | Play now     | `/games/snake`       |
| 4    | (frying pan) | Food Galaga           | "Defend your kitchen!..."                   | Play now     | `/games/galaga`      |
| 5    | (brain)      | Remy's Kitchen Trivia | "Pick any culinary topic..."                | Play now     | `/games/trivia`      |
| 6    | (X)          | Tic-Tac-Toe vs Remy   | "Challenge Remy to a food-themed battle..." | Play now     | `/games/tic-tac-toe` |

Each card: hover gradient overlay, arrow CTA at bottom.

---

### 11b. Menu Muse

**Route:** `/games/menu-muse`
**File:** `app/(chef)/games/menu-muse/page.tsx`
**Auth:** `requireChef()`

**Event context banner (conditional):** Shown when `?eventId=` search param is present.

**Loading state:** Spinner with "Loading your creative toolkit..."
**Error state:** Error message with "Try Again" button

**7 Collapsible Panels (each with shuffle button):**

#### Panel 1: Your Recipe Bible

| Element                    | Type         | Label                                       | Details                                             |
| -------------------------- | ------------ | ------------------------------------------- | --------------------------------------------------- |
| Button                     | icon         | Shuffle                                     | Randomizes displayed recipes                        |
| Tab bar                    | 3 sub-tabs   | Forgotten Gems / Most Trusted / By Category | Switches recipe view                                |
| Button group (conditional) | filter pills | Category filters                            | Category pills for filtering (in "By Category" tab) |
| Data display               | cards        | Recipe cards                                | Each links to `/recipes/{id}`                       |

#### Panel 2: In Season

| Element      | Type             | Label          | Details                                       |
| ------------ | ---------------- | -------------- | --------------------------------------------- |
| Button       | icon             | Shuffle        | Randomizes displayed items                    |
| Data display | quote            | Sensory Anchor | Seasonal sensory quote                        |
| Data display | section (urgent) | Closing Soon   | Micro-windows about to close, styled urgently |
| Data display | section          | Active Now     | Currently in-season micro-windows             |
| Data display | section          | Proven Wins    | Previously successful seasonal dishes         |
| Data display | list             | Peak Produce   | Items at peak availability                    |

#### Panel 3: Your Culinary Heroes

| Element            | Type     | Label      | Details                                 |
| ------------------ | -------- | ---------- | --------------------------------------- |
| Button             | icon     | Shuffle    | Randomizes displayed chefs              |
| Data display       | cards    | Chef cards | Name, reason for admiration             |
| Link (conditional) | external | Website    | Links to chef's website if URL provided |

#### Panel 4: Client Intelligence (conditional on event context)

| Element      | Type                 | Label                | Details                                  |
| ------------ | -------------------- | -------------------- | ---------------------------------------- |
| Data display | list (red)           | Allergies            | Safety-critical, highlighted in red      |
| Data display | list                 | Dietary Restrictions | Client dietary restrictions              |
| Data display | list                 | Favorite Dishes      | Client favorites                         |
| Data display | list                 | Favorite Cuisines    | Client preferred cuisines                |
| Data display | list (strikethrough) | Dislikes             | Items to avoid, shown with strikethrough |
| Data display | list                 | Special Requests     | Client special requests                  |
| Data display | links                | Past Menus           | Links to `/menus/{id}/editor`            |

#### Panel 5: Your Idea Pipeline

| Element      | Type    | Label             | Details                 |
| ------------ | ------- | ----------------- | ----------------------- |
| Data display | section | Currently Testing | Dishes being tested     |
| Data display | section | Backlog           | Ideas in the backlog    |
| Data display | section | Dishes to Explore | Future exploration list |

#### Panel 6: Your Flavor Language

| Element      | Type  | Label      | Details                                                    |
| ------------ | ----- | ---------- | ---------------------------------------------------------- |
| Data display | chips | Word chips | Color-coded by category (e.g., technique, flavor, texture) |

#### Panel 7: Menu Patterns & Templates

| Element      | Type  | Label                 | Details                                                          |
| ------------ | ----- | --------------------- | ---------------------------------------------------------------- |
| Data display | links | Saved Templates       | Links to `/menus/{id}/editor`                                    |
| Data display | links | Same Season Last Year | Historical menus from same season, links to `/menus/{id}/editor` |
| Data display | links | Recent Menus          | Most recent menus, links to `/menus/{id}/editor`                 |

---

### 11c. The Line

**Route:** `/games/the-line`
**File:** `app/(chef)/games/the-line/page.tsx`
**Auth:** `requireChef()` (fetches events for prep mode)
**Rendering:** Canvas-based (480x640)

**Menu Screen:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | primary | Rush Mode | Starts game in rush mode with random orders |
| Button group | event buttons | Prep Mode Events | One button per real event (fetched from DB). Starts game with event-specific menu items. |
| Data display | instructions | Keyboard controls | Lists keyboard shortcuts |

**Game Screen (HUD):**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Score | Current score |
| Data display | text | Rush Level | Soft Open / Dinner / Rush / Slammed / Weeded |
| Data display | text | Strikes | Strike count (3 strikes = game over) |

**Game Interactions:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Canvas area | clickable | Order rail tickets | Click/tap to assign items to stations |
| Canvas area | clickable | 4 Stations | Grill, Saute, Prep, Oven - click/tap to pull completed items |
| Canvas area | clickable | Plating zone | Plating area for completed items |
| Keyboard | keys | Q/W/A/S | Pull from stations (Grill/Saute/Prep/Oven) |
| Keyboard | key | E | Auto-assign next ticket item |
| Touch | swipe | Mobile controls | Touch-based interaction |

**5 Rush Levels:** Soft Open, Dinner, Rush, Slammed, Weeded
**5 Ratings:** Dishwasher, Prep Cook, Line Cook, Sous Chef, Chef de Cuisine

**Game Over Screen:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Final Score | Score achieved |
| Data display | text | Rating | Performance rating |
| Data display | text | Best Streak | Longest order streak |
| Data display | text | Tickets Served | Total tickets completed |
| Data display | prompt | Restart prompt | Instruction to restart |

---

### 11d. Chef Snake

**Route:** `/games/snake`
**File:** `app/(chef)/games/snake/page.tsx`
**Auth:** None
**Rendering:** Canvas-based (480x480, 20x20 grid)

| Element      | Type      | Label       | Details                                                                                                |
| ------------ | --------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| Data display | card      | Recipe card | Current recipe name, ingredient emojis (collected ones highlighted), flash effect on recipe completion |
| Data display | text      | Score       | Current score                                                                                          |
| Canvas       | game area | Game canvas | 480x480 snake game                                                                                     |

**Controls:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Keyboard | arrow keys | Direction | Move snake |
| Keyboard | WASD | Direction (alt) | Alternative movement keys |
| Touch | swipe | Direction (mobile) | Swipe-based movement |

**Game features:**

- 10 recipes with ingredient combinations
- +50 bonus per recipe completion
- Speed increases with length

---

### 11e. Food Galaga

**Route:** `/games/galaga`
**File:** `app/(chef)/games/galaga/page.tsx`
**Auth:** None
**Rendering:** Canvas-based (480x600)

**HUD:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Wave | Current wave number |
| Data display | text | Score | Current score |
| Data display | hearts | Lives | Heart icons for remaining lives |

**Game elements:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text overlay | Power-up message | Displayed when power-up collected |
| Data display | text overlay | Wave message | Displayed at start of each wave |
| Canvas | game area | Game canvas | 480x600 shooter game |

**Controls:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Touch | drag | Move ship | Drag to move on mobile |
| Touch | tap | Fire | Tap to shoot on mobile |
| Keyboard | arrows/WASD | Move | Desktop movement |
| Keyboard | space | Fire | Desktop shooting |

**Game features:**

- Enemy emojis (food-themed)
- Power-ups: Spread Shot, Rapid Fire
- Progressive wave difficulty

---

### 11f. Remy's Kitchen Trivia

**Route:** `/games/trivia`
**File:** `app/(chef)/games/trivia/page.tsx`
**Auth:** `requireChef()` (for business mode data)

#### Setup Phase

| Element                    | Type        | Label          | Details                                                                                |
| -------------------------- | ----------- | -------------- | -------------------------------------------------------------------------------------- |
| Toggle                     | 2 buttons   | Game Mode      | Culinary Knowledge / My Business                                                       |
| Button group               | chips       | Topic Chips    | 15 predefined culinary topics (e.g., "French Cuisine", "Knife Skills", "Food Science") |
| Text input                 | `text`      | Custom Topic   | Free-text for custom topic                                                             |
| Button group (conditional) | radio-style | Internal Focus | Upcoming Events / My Clients / Everything (shown in "My Business" mode)                |
| Button group               | 3 buttons   | Difficulty     | Easy / Medium / Hard                                                                   |
| Toggle                     | switch      | Timed Mode     | Enable/disable timer                                                                   |
| Button                     | primary     | Let's Go!      | Starts the trivia game, calls Ollama to generate questions                             |

#### Loading Phase

| Element      | Type          | Label         | Details                                      |
| ------------ | ------------- | ------------- | -------------------------------------------- |
| Data display | animated text | Remy messages | Rotating animated loading messages from Remy |
| Data display | timer         | Elapsed time  | Shows how long generation has taken          |
| Button       | ghost         | Cancel        | Cancels the generation and returns to setup  |

#### Playing Phase

| Element      | Type                       | Label                       | Details                                                                                |
| ------------ | -------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| Data display | progress bar               | Question progress           | Shows current question / total questions                                               |
| Data display | timer (conditional)        | Countdown timer             | Shown when timed mode is enabled                                                       |
| Data display | text                       | Streak                      | Current correct-answer streak                                                          |
| Data display | card                       | Question                    | Question text                                                                          |
| Button group | 4 buttons                  | Choices A-D                 | Four answer choices. Correct = green highlight, wrong = red highlight after selection. |
| Data display | text (conditional)         | Fun Fact                    | Shown after answering, provides additional context                                     |
| Data display | text + badge (conditional) | Source Citation             | Source of the question + confidence badge                                              |
| Button       | primary                    | Next Question / See Results | Advances to next question or results screen                                            |

#### Results Phase

| Element      | Type              | Label         | Details                                                                                              |
| ------------ | ----------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| Data display | summary           | Score Summary | Final score display                                                                                  |
| Data display | per-question list | Answer Review | For each question: correct/wrong indicator, correct answer, user's answer, fun fact, source citation |
| Button       | primary           | Play Again    | Restarts with same settings                                                                          |
| Button       | secondary         | New Topic     | Returns to setup phase                                                                               |

#### Error Phase

| Element      | Type          | Label     | Details                |
| ------------ | ------------- | --------- | ---------------------- |
| Data display | error message | Error     | Error text             |
| Button       | primary       | Try Again | Returns to setup phase |

---

### 11g. Tic-Tac-Toe vs Remy

**Route:** `/games/tic-tac-toe`
**File:** `app/(chef)/games/tic-tac-toe/page.tsx`
**Auth:** None

| Element | Type       | Label          | Details               |
| ------- | ---------- | -------------- | --------------------- |
| Link    | back arrow | Back to Arcade | Navigates to `/games` |

**Score Tracker:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | score | You | Player wins count |
| Data display | score | Remy | AI wins count |
| Data display | score | Draws | Draw count |

**Size Picker:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button | toggle (3 buttons) | 3x3 | Sets grid to 3x3 |
| Button | toggle (3 buttons) | 4x4 | Sets grid to 4x4 |
| Button | toggle (3 buttons) | 5x5 | Sets grid to 5x5 |

**Game Grid:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Button grid | NxN buttons | Cell buttons | Clickable cells. Shows food emoji for player (X) and Remy (O). |
| Data display | text | Remy taunt | Remy's commentary/trash talk |
| Data display | indicator | Thinking | Shown while Remy is "thinking" |

**Game Over:**
| Element | Type | Label | Details |
|---------|------|-------|---------|
| Data display | text | Result message | Win/Lose/Draw message |
| Button | primary | Play Again | Resets board for new game |

**AI behavior:**

- 3x3: Minimax algorithm (perfect play)
- 4x4, 5x5: Heuristic-based AI (imperfect, beatable)

---

## Summary Statistics

| Section    | Pages         | Form Fields | Buttons                  | Links   | Data Displays | Toggles/Switches |
| ---------- | ------------- | ----------- | ------------------------ | ------- | ------------- | ---------------- |
| Onboarding | 5             | ~45         | ~20                      | ~15     | ~25           | 0                |
| Import     | 1             | 0 (in hub)  | 0 (in hub)               | 1       | 2             | 0                |
| Cannabis   | 5             | 3           | 2                        | 6       | ~20           | 0                |
| Help       | 2 (+ 6 slugs) | 1           | 0                        | 8       | ~15           | 0                |
| Loyalty    | 3             | ~25         | ~15                      | 5       | ~30           | 2                |
| Safety     | 4             | ~15         | ~12                      | 2       | ~20           | 0                |
| Remy       | 1             | 0           | 0                        | 0       | 4             | 0                |
| Commands   | 1             | 0           | 5 (tabs + delete)        | 0       | ~15           | 0                |
| Dev Tools  | 1             | 1 (range)   | ~10+ (module pills)      | 0       | ~15           | 0                |
| Reputation | 1             | 0           | 4 (tabs + mark reviewed) | 1       | ~8            | 0                |
| Games      | 7             | ~5          | ~25                      | 7       | ~40           | 2                |
| **TOTAL**  | **31**        | **~95**     | **~93**                  | **~45** | **~194**      | **~4**           |
