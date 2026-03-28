# App Polish: Workstreams 1, 3 & 4 - Completed

## Workstream 4: Platform Liability Cleanup

### What Changed

Removed all false claims about third-party platform integrations from user-facing UI.

**Files modified:**

1. **`components/dashboard/onboarding-reminder-banner.tsx`**
   - Changed "auto-import leads from Take a Chef, Bark, and more" to "auto-import leads from your inbox"

2. **`lib/onboarding/onboarding-constants.ts`**
   - Changed "Auto-import inquiries from Take a Chef, Bark, Thumbtack and more" to "Auto-import inquiries from your email inbox"

3. **`components/integrations/take-a-chef-setup.tsx`**
   - Renamed all instances of "TakeAChef Integration" to "Email Lead Capture"
   - Replaced all platform-specific language with generic "booking platform" language
   - Removed the em dash on line 174 (replaced with period/sentence restructure)
   - Fixed duplicate `'use client'` directive
   - Commission rate description now says "Set the default platform commission rate" instead of referencing Take a Chef specifically

4. **`lib/integrations/platform-connections-constants.ts`**
   - Removed Thumbtack, Bark, The Knot, Cozymeal, GigSalad from the SUPPORTED_PLATFORMS array
   - These were all marked as disabled ("API integration not yet available") but their presence implied future integration
   - Only Google Business Profile remains (the only real OAuth connection)

5. **`app/(chef)/settings/integrations/page.tsx`**
   - Updated comment from "TakeAChef Integration" to "Email lead capture"

### What Was NOT Changed (intentionally)

- **`lib/marketplace/platforms.ts`** - Platform names remain here because this is internal data labeling for analytics (tracking where leads came from), not a claim of partnership
- **`lib/constants/booking-sources.ts`** - Same reason, internal analytics
- **Backend parsers** (`lib/gmail/take-a-chef-parser.ts`, etc.) - These are backend logic, not user-facing
- **Marketplace page** - Describes what ChefFlow does (consolidates leads), which is accurate
- **Client create form source dropdown** - Data labeling for where a client came from

### Key Principle

"We parse emails from these platforms" is honest. "We integrate with these platforms" is not. All user-facing copy now uses generic language ("your inbox", "booking platforms") rather than naming specific platforms.

---

## Workstream 1: Navigation Alphabetical Sort

### What Changed

1. **`components/navigation/nav-config.tsx`**
   - Added runtime sort block after the navGroups array declaration
   - Groups are now sorted A-Z (Admin stays last)
   - Items within each group are sorted A-Z
   - Children within each item are sorted A-Z
   - Updated header comment to reflect new sort strategy
   - This is future-proof: any new groups/items added in any order will automatically sort correctly

### Before vs After (Group Order)

**Before:** Pipeline, Clients, Events, Commerce, Culinary, Operations, Supply Chain, Finance, Network, Cannabis, Marketing, Analytics, Protection, Tools, Admin

**After:** Analytics, Cannabis, Clients, Commerce, Culinary, Events, Finance, Marketing, Network, Operations, Pipeline, Protection, Supply Chain, Tools, Admin

### Design Decision

Kept the accordion behavior (one group open at a time) rather than expanding all groups by default. With 17 groups and 200+ items, showing everything expanded would be overwhelming. The alphabetical sort solves the "where is it?" problem without creating information overload.

---

## Workstream 3: Onboarding Overhaul

### What Changed

Expanded the setup wizard from 5 to 6 steps, replaced redirect-based steps with inline forms, and removed all platform-specific claims from the Gmail connection step.

**Files created:**

1. **`components/onboarding/onboarding-steps/first-menu-step.tsx`**
   - New inline wizard step: create a menu with 1-10 dishes
   - Uses `createMenuWithCourses()` server action
   - Skippable with onComplete/onSkip interface

2. **`components/onboarding/onboarding-steps/first-booking-step.tsx`**
   - New inline wizard step: create first event with date, time, guest count, occasion, location
   - Uses `createEvent()` server action
   - Handles missing client_id gracefully

**Files modified:**

3. **`lib/onboarding/onboarding-constants.ts`**
   - Added `first_menu` step (between portfolio and pricing)
   - Renamed `connect_gmail` title: "Import Leads" to "Connect Your Inbox"
   - Renamed `first_event` title: "First Event" to "Your First Booking"
   - Updated comment: "5 wizard steps" to "6 wizard steps"

4. **`components/onboarding/onboarding-wizard.tsx`**
   - Added imports for FirstMenuStep and FirstBookingStep
   - Removed RedirectStep component
   - Updated completion screen (removed "Coming soon: upload menus..." copy)
   - Changed sidebar subtitle to "Get your account ready in minutes"

5. **`components/onboarding/onboarding-steps/connect-gmail-step.tsx`**
   - Removed PLATFORMS array (Take a Chef, Bark, Thumbtack, etc.)
   - Replaced "Supported platforms" badges with "What you get" benefits list
   - Updated copy to generic inbox language throughout
   - Fixed "already connected" copy ("Platform leads" to "New inquiries")
