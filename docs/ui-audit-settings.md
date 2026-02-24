# ChefFlow Settings Pages -- UI Audit

**Generated:** 2026-02-23
**Total pages audited:** 50 (including sub-pages and redirects)

---

## Table of Contents

1. [Settings Hub (Main Page)](#1-settings-hub-main-page)
2. [Profile & Branding](#2-profile--branding)
   - 2.1 [My Profile](#21-my-profile)
   - 2.2 [Network Profile](#22-network-profile)
   - 2.3 [Public Profile](#23-public-profile)
   - 2.4 [Culinary Profile](#24-culinary-profile)
   - 2.5 [Favorite Chefs](#25-favorite-chefs)
   - 2.6 [Portfolio](#26-portfolio)
   - 2.7 [Profile Highlights](#27-profile-highlights)
   - 2.8 [Client Preview](#28-client-preview)
3. [AI & Privacy](#3-ai--privacy)
   - 3.1 [AI Trust Center](#31-ai-trust-center)
4. [Connected Accounts & Integrations](#4-connected-accounts--integrations)
   - 4.1 [Integrations Center](#41-integrations-center)
   - 4.2 [Website Widget (Embed)](#42-website-widget-embed)
   - 4.3 [Stripe Connect](#43-stripe-connect)
   - 4.4 [API Keys](#44-api-keys)
   - 4.5 [Webhooks](#45-webhooks)
5. [Availability Rules](#5-availability-rules)
6. [Booking Page](#6-booking-page)
7. [Communication & Workflow](#7-communication--workflow)
   - 7.1 [Response Templates](#71-response-templates)
   - 7.2 [Automations](#72-automations)
   - 7.3 [Contract Templates](#73-contract-templates)
   - 7.4 [Seasonal Palettes (Repertoire)](#74-seasonal-palettes-repertoire)
   - 7.5 [Seasonal Palette Detail](#75-seasonal-palette-detail)
   - 7.6 [Chef Journal](#76-chef-journal)
   - 7.7 [Journal Detail](#77-journal-detail)
8. [Notification Settings](#8-notification-settings)
9. [Dashboard & Navigation](#9-dashboard--navigation)
   - 9.1 [Dashboard Widgets](#91-dashboard-widgets)
   - 9.2 [Primary Navigation](#92-primary-navigation)
10. [Appearance](#10-appearance)
11. [Modules](#11-modules)
12. [Billing & Subscription](#12-billing--subscription)
13. [Custom Fields](#13-custom-fields)
14. [Event Types & Labels](#14-event-types--labels)
15. [Compliance](#15-compliance)
    - 15.1 [Food Safety & Compliance](#151-food-safety--compliance)
    - 15.2 [GDPR & Privacy](#152-gdpr--privacy)
16. [Protection Hub](#16-protection-hub)
    - 16.1 [Protection Hub Overview](#161-protection-hub-overview)
    - 16.2 [Insurance Policies](#162-insurance-policies)
    - 16.3 [Certifications (Protection)](#163-certifications-protection)
    - 16.4 [NDA & Permissions](#164-nda--permissions)
    - 16.5 [Business Continuity](#165-business-continuity)
    - 16.6 [Crisis Response](#166-crisis-response)
    - 16.7 [Business Health Checklist](#167-business-health-checklist)
    - 16.8 [Portfolio Removal Requests](#168-portfolio-removal-requests)
17. [Professional Development](#17-professional-development)
    - 17.1 [Professional Development Overview](#171-professional-development-overview)
    - 17.2 [Capability Inventory (Skills)](#172-capability-inventory-skills)
    - 17.3 [Professional Momentum](#173-professional-momentum)
18. [Account & Security](#18-account--security)
    - 18.1 [System Health](#181-system-health)
    - 18.2 [System Incidents (Admin)](#182-system-incidents-admin)
    - 18.3 [Change Password](#183-change-password)
    - 18.4 [Delete Account](#184-delete-account)
19. [Redirects](#19-redirects)

---

## 1. Settings Hub (Main Page)

| Property       | Value                                           |
| -------------- | ----------------------------------------------- |
| **Route**      | `/settings`                                     |
| **File**       | `app/(chef)/settings/page.tsx`                  |
| **Page title** | Settings - ChefFlow                             |
| **Auth**       | `requireChef()`                                 |
| **Layout**     | `max-w-3xl`, collapsible `<details>` categories |

### Page Header

- **H1:** "Settings"
- **Subtitle:** "Configure your defaults and account settings in organized categories."

### Collapsible Categories

Each category uses a `<details>` element with summary title + description. `defaultOpen` marks which are expanded on load.

| #   | Category                          | Description                                                                                | Default Open |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------ | :----------: |
| 1   | Business Defaults                 | Home base, stores, timing, operating procedures, revenue goals, and dashboard layout       |     Yes      |
| 2   | Profile & Branding                | Manage your core chef profile, public profile presentation, and portal background          |      No      |
| 3   | AI & Privacy                      | Control Remy, understand how your data is handled, and manage AI features                  |     Yes      |
| 4   | Connected Accounts & Integrations | Connect inbox and website channels, then manage system integrations                        |      No      |
| 5   | Availability Rules                | Set hard blocks, event limits, and buffer time so ChefFlow warns you before double-booking |      No      |
| 6   | Booking Page                      | Share a link clients can use to check your availability and submit a booking request       |      No      |
| 7   | Communication & Workflow          | Manage messaging templates, automations, and your creative planning systems                |      No      |
| 8   | Client Reviews                    | Configure your review link and review collection flow                                      |      No      |
| 9   | Chef Network                      | Control network visibility and your chef directory profile                                 |      No      |
| 10  | Desktop App                       | System tray, auto-start, and native desktop notifications                                  |      No      |
| 11  | Notifications & Alerts            | Control email, browser push, and SMS alerts by category                                    |      No      |
| 12  | Sample Data                       | Load or remove sample clients, events, and inquiries                                       |      No      |
| 13  | Share Feedback                    | Tell us what you love, what frustrates you, or anything in between                         |      No      |
| 14  | Account & Security                | Password, account-level management, and system status                                      |      No      |

### Category 1: Business Defaults

#### BusinessModeToggle component

| Element                         | Details                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Toggle switch**               | Label: "Business Mode". Switch control (`role="switch"`). Brand-colored when on, stone-300 when off.                                                |
| **Description (on)**            | "Enabled -- business tools are unlocked. Tax workflow, legal name, compliance settings, and invoicing are available."                               |
| **Description (off)**           | "Disabled -- you're running as an individual chef. Enable to access tax workflow, legal name registration, business address, and compliance tools." |
| **Conditional links (when on)** | Tax Workflow (`/finance/tax`), Compliance (`/settings/compliance`), Contract Templates (`/settings/contracts`)                                      |
| **Conditional data display**    | Business legal name, business address (if set)                                                                                                      |

#### Links in Business Defaults

| Link Label          | Destination            | Description                                  |
| ------------------- | ---------------------- | -------------------------------------------- |
| Customize Dashboard | `/settings/dashboard`  | Turn widgets on or off                       |
| Primary Navigation  | `/settings/navigation` | Choose which tabs are visible in primary bar |
| Goals               | `/goals/setup`         | Set revenue, booking, and margin targets     |

#### PreferencesForm (inline)

**Card: Home Base**

| Field | Type       | Placeholder | Notes |
| ----- | ---------- | ----------- | ----- |
| City  | text input | "City"      |       |
| State | text input | "State"     |       |
| ZIP   | text input | "ZIP"       |       |

**Card: Default Stores**

| Element              | Details                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Button**           | "+ Add Store" (variant: secondary, size: sm)                                                         |
| **Empty state**      | "No default stores yet. Add at least one store to speed up route planning." (dashed border)          |
| **Per-store fields** | Store (StoreAutocomplete, placeholder: "Search store"), Address (text, placeholder: "Store address") |
| **Remove button**    | "Remove" (variant: ghost, size: sm, red text) per store                                              |

**Card: Timing Defaults**

| Field             | Type   | Min | Max | Step |
| ----------------- | ------ | --- | --- | ---- |
| Prep Time (hours) | number | 0.5 | 12  | 0.5  |
| Shopping (min)    | number | 15  | 240 | -    |
| Packing (min)     | number | 10  | 120 | -    |
| Buffer (min)      | number | 0   | 120 | -    |

Helper text on Buffer: "Before arrival at client"

**Card: Operating Procedures**

| Element                  | Details                                    |
| ------------------------ | ------------------------------------------ |
| Checkbox                 | "Shop the day before events (recommended)" |
| Target Profit Margin (%) | Number input, min 0, max 100, w-32         |

**Card: Revenue Goals Program**

| Element                  | Details                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkbox                 | "Enable goal-driven revenue coaching and nudges"                                                                                                              |
| Monthly Revenue Goal ($) | Number input, disabled when program off                                                                                                                       |
| Annual Revenue Goal ($)  | Number input, placeholder "Optional", disabled when program off                                                                                               |
| Nudge Intensity          | Select dropdown: Gentle / Standard / Aggressive                                                                                                               |
| Custom Goals button      | "+ Add Goal" (variant: secondary, size: sm)                                                                                                                   |
| Custom Goal fields       | Goal Label (text, placeholder "Q2 push, holiday season, etc."), Start (date), End (date), Target ($) (number), Enabled (checkbox), Remove (ghost button, red) |
| Empty state              | "No custom goals yet. Add seasonal or campaign goals if needed." (dashed border)                                                                              |

**Form Actions**

| Button | Variant           | Label                            |
| ------ | ----------------- | -------------------------------- |
| Submit | primary (default) | "Save Preferences" / "Saving..." |

**Feedback** | Success alert (green) + error alert (red)

### Category 2: Profile & Branding

| Link/Component             | Destination                | Style                                                     |
| -------------------------- | -------------------------- | --------------------------------------------------------- |
| My Profile                 | `/settings/my-profile`     | Brand-highlighted card (border-brand-200, bg-brand-50/40) |
| ChefBackgroundSettings     | (inline component)         | Card                                                      |
| AvailabilitySignalToggle   | (inline component)         | Toggle                                                    |
| Profile & Partner Showcase | `/settings/public-profile` | Standard link card                                        |
| Favorite Chefs             | `/settings/favorite-chefs` | Standard link card                                        |
| Client Preview             | `/settings/client-preview` | Brand-highlighted card                                    |
| Open Live Profile          | `/chef/[slug]` (new tab)   | Button-styled link (conditional: only if slug exists)     |

#### ChefBackgroundSettings (inline)

| Element              | Details                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Card title           | "Chef App Background"                                                                     |
| Background Color     | Color picker (`type="color"`), helper: "Used as fallback when no image is set."           |
| Background Image     | File input (accepts JPEG, PNG, HEIC, HEIF, WebP), max 10MB                                |
| Remove current image | Text button (underline), conditional: only shows if image is set and no new file selected |
| Preview              | 28px-tall color/image preview box                                                         |
| Save button          | "Save Background" / "Saving..."                                                           |

#### AvailabilitySignalToggle (inline)

| Element                    | Details                                                     |
| -------------------------- | ----------------------------------------------------------- |
| Title                      | "Public Availability Signals"                               |
| Description                | About "Seeking a booking" dates appearing on public profile |
| Toggle switch              | `role="switch"`, brand-colored                              |
| Conditional text (enabled) | Green info box about active public target booking dates     |

### Category 3: AI & Privacy

| Link             | Destination                  | Style                                         |
| ---------------- | ---------------------------- | --------------------------------------------- |
| AI Trust Center  | `/settings/ai-privacy`       | Emerald-highlighted card (border-emerald-200) |
| Culinary Profile | `/settings/culinary-profile` | Standard link card                            |

### Category 4: Connected Accounts & Integrations

**Sub-header: Connected Accounts**

| Component          | Details                                                        |
| ------------------ | -------------------------------------------------------------- |
| GoogleIntegrations | Gmail and Google Calendar service cards (see section 4 detail) |
| WixConnection      | Wix integration status and recent submissions                  |

**Sub-header: Integration Center**

| Link                | Destination              | Style                  |
| ------------------- | ------------------------ | ---------------------- |
| Website Widget      | `/settings/embed`        | Brand-highlighted card |
| Manage Integrations | `/settings/integrations` | Standard link card     |

### Category 5: Availability Rules

Renders `SchedulingRulesForm` inline (see section 5 detail).

### Category 6: Booking Page

Renders `BookingPageSettings` inline (see section 6 detail).

### Category 7: Communication & Workflow

| Link               | Destination             | Description                                 |
| ------------------ | ----------------------- | ------------------------------------------- |
| Response Templates | `/settings/templates`   | Pre-written messages                        |
| Automations        | `/settings/automations` | Auto-create follow-ups, notifications       |
| Seasonal Palettes  | `/settings/repertoire`  | Creative thesis, micro-windows per season   |
| Chef Journal       | `/settings/journal`     | Travel inspiration, favorite meals, lessons |

### Category 8: Client Reviews

| Component/Link      | Details                    |
| ------------------- | -------------------------- |
| GoogleReviewUrlForm | Inline card with URL input |
| View All Reviews    | Link to `/reviews`         |

#### GoogleReviewUrlForm

| Element     | Details                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Card title  | "Google Review Link" (with Google icon SVG)                                                     |
| Description | "After clients leave internal feedback, they'll be prompted to also leave you a Google review." |
| URL input   | `type="url"`, placeholder "https://g.page/r/your-business/review"                               |
| Helper text | "Find this in Google Business Profile -> Share review form"                                     |
| Button      | "Save" (variant: primary, size: sm)                                                             |

### Category 9: Chef Network

| Component/Link        | Details                              |
| --------------------- | ------------------------------------ |
| DiscoverabilityToggle | Toggle switch for network visibility |
| Network Profile       | Link to `/settings/profile`          |

#### DiscoverabilityToggle

| Element           | Details                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Title             | "Network Discovery"                                                                                |
| Toggle switch     | `role="switch"`, brand-colored                                                                     |
| Description (on)  | "You are visible in the chef directory. Other chefs can find you by name and see your city/state." |
| Description (off) | "You have opted out of the chef directory. Other chefs cannot find or connect with you."           |

### Category 10: Desktop App

#### DesktopAppSettings

**Browser state (not in Tauri):**

| Element     | Details                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Title       | "ChefFlow Desktop App"                                                                                                          |
| Description | Run ChefFlow as native app, system tray                                                                                         |
| Note        | "You're currently using ChefFlow in a browser. Download the desktop app to unlock system tray and native notification support." |
| Coming soon | "Desktop app download coming soon." (italic)                                                                                    |

**Tauri desktop state:**

| Element   | Details                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| Toggle    | "Launch at login" -- Start ChefFlow automatically on Windows login             |
| Info note | Running as desktop app, system tray active, tray icon right-click instructions |

### Category 11: Notifications & Alerts

| Link                  | Destination               | Style                  |
| --------------------- | ------------------------- | ---------------------- |
| Notification Channels | `/settings/notifications` | Brand-highlighted card |

### Category 12: Sample Data

#### DemoDataManager

| Element                | Details                                        |
| ---------------------- | ---------------------------------------------- |
| Description            | Load realistic sample clients, events, inquiry |
| Button (no demo data)  | "Load Sample Data" (variant: secondary)        |
| Button (has demo data) | "Clear Sample Data" (variant: danger)          |
| Status message         | Text displayed after action                    |

### Category 13: Share Feedback

#### FeedbackForm

| Element            | Details                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| Sentiment picker   | 5 pill buttons: Love it, Frustrated, Suggestion, Bug, Other (each with emoji)   |
| Message textarea   | Required, rows=4, maxLength=2000, placeholder "What's on your mind?..."         |
| Character counter  | "N/2000" right-aligned                                                          |
| Anonymous checkbox | "Send anonymously" -- "Your name and account won't be attached"                 |
| Submit button      | "Send Feedback" (variant: primary), disabled when no sentiment or empty message |
| Success state      | Green box with "Thanks for your feedback!" and "Send another" link              |

### Category 14: Account & Security

| Link             | Destination                 | Style           | Condition                          |
| ---------------- | --------------------------- | --------------- | ---------------------------------- |
| System Health    | `/settings/health`          | Emerald border  | Always                             |
| System Incidents | `/settings/incidents`       | Amber border    | Admin only (`isAdmin(user.email)`) |
| Change Password  | `/settings/change-password` | Standard        | Always                             |
| Delete Account   | `/settings/delete-account`  | Red border/text | Always                             |

---

## 2. Profile & Branding

### 2.1 My Profile

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/my-profile`                    |
| **File**       | `app/(chef)/settings/my-profile/page.tsx` |
| **Page title** | My Profile - ChefFlow                     |
| **Auth**       | `requireChef()`                           |

**Navigation:** Back to Settings link (ArrowLeft icon)

**H1:** "My Profile"
**Subtitle:** "Manage the core profile details used across your client portal and public page."

#### ChefProfileForm

**Card 1: Chef Profile**

| Field                      | Type              | Placeholder/Helper                                                      |
| -------------------------- | ----------------- | ----------------------------------------------------------------------- |
| Your Name or Business Name | text              | Helper: "How you'd like to be known"                                    |
| Display Name               | text              | Helper: "Optional public-facing name. If blank, business name is used." |
| Phone                      | tel               | --                                                                      |
| Tagline                    | text              | Helper: "Short headline shown on your public chef page."                |
| Bio                        | textarea (4 rows) | Helper: "N/1200 characters"                                             |

**Card 2: Public Profile Settings**

| Field                          | Type                             | Placeholder/Helper                                                                                                        |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Google Review URL              | url                              | "https://g.page/r/..."                                                                                                    |
| Official Website URL           | url                              | "https://your-site.com", Helper: "Optional. Your primary marketing website."                                              |
| Show website on public profile | checkbox                         | Helper: "When enabled, clients can open your official website from your public chef page."                                |
| Preferred Inquiry Destination  | select                           | Options: Both (ChefFlow + Website), ChefFlow only, Website only. Helper: "Default routing preference for incoming leads." |
| Profile Photo                  | file input                       | Accepts JPEG, PNG, HEIC, HEIF, WebP (max 10MB)                                                                            |
| Remove current photo           | text button (underline)          | Conditional                                                                                                               |
| Image Preview                  | 80x80 circular image             | Conditional                                                                                                               |
| Business Logo                  | file input                       | Accepts JPEG, PNG, WebP, SVG (max 5MB). "Recommended: landscape format, min 200px wide."                                  |
| Remove current logo            | text button (underline)          | Conditional                                                                                                               |
| Logo Preview                   | Max 16px height, max 240px width | Conditional                                                                                                               |

**Button:** "Save Profile" (variant: primary, size: lg)

#### ChefBioPanel (AI component, inline after form)

Renders AI-generated bio and tagline panel.

---

### 2.2 Network Profile

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| **Route**      | `/settings/profile`                    |
| **File**       | `app/(chef)/settings/profile/page.tsx` |
| **Page title** | Network Profile - ChefFlow             |

**Navigation:** Back to Settings link

**H1:** "Network Profile"
**Subtitle:** "This information is visible to other chefs who find you in the network directory."

#### ProfileForm

**Card: Profile Details**

| Field                | Type                                        | Placeholder/Helper                                                                                 |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Display Name         | text                                        | Placeholder: business name. Helper: "If left blank, your business name 'X' will be shown instead." |
| Bio                  | textarea (3 rows, max 500 chars)            | Placeholder: "Tell other chefs a bit about yourself..."                                            |
| Profile Photo        | file input                                  | Accepts JPEG, PNG, HEIC, HEIF, WebP (max 10MB)                                                     |
| Remove current photo | text button (underline)                     | Conditional                                                                                        |
| Preview              | Avatar + name + bio preview in stone-50 box |

**Button:** "Save Profile" (default variant)

---

### 2.3 Public Profile

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Route**      | `/settings/public-profile`                    |
| **File**       | `app/(chef)/settings/public-profile/page.tsx` |
| **Page title** | (none set explicitly)                         |

**H1:** "Public Profile"
**Subtitle:** "See what clients will see when they view your profile, then update your details and partner showcase."

**Header button:** "Client's View" (variant: secondary, links to `/chef/[slug]`, new tab). Conditional on slug existing.

#### PublicProfileSettings component

Receives: currentTagline, currentPrimaryColor, currentBackgroundColor, currentBackgroundImageUrl, partners array (id, name, partner_type, is_showcase_visible, showcase_order).

---

### 2.4 Culinary Profile

| Property       | Value                                           |
| -------------- | ----------------------------------------------- |
| **Route**      | `/settings/culinary-profile`                    |
| **File**       | `app/(chef)/settings/culinary-profile/page.tsx` |
| **Page title** | (none set; client component)                    |
| **Rendering**  | `'use client'` -- fully client-side             |

**Icon:** ChefHat icon (brand-500)
**H1:** "Culinary Profile"
**Subtitle:** "Help Remy understand your food identity. These answers shape how Remy talks about food, suggests dishes, and understands your style."

**Loading state:** Pulse-animated skeleton (h-8, h-4, 4 question skeletons).

#### Progress Bar

| Element    | Details                           |
| ---------- | --------------------------------- |
| Counter    | "N of M answered"                 |
| Percentage | "X%"                              |
| Bar        | h-2, brand-500 fill, rounded-full |

#### Questions

Dynamically rendered from `CulinaryProfileAnswer[]`:

| Element | Details                                             |
| ------- | --------------------------------------------------- |
| Label   | Numbered: "1. [question text]"                      |
| Input   | textarea, rows=3, placeholder "Type your answer..." |

#### Save

| Button       | Label                                                                           | Style                                |
| ------------ | ------------------------------------------------------------------------------- | ------------------------------------ |
| Save         | "Save Profile" / "Saving..." / "Saved" (with icons: Save, spinner, CheckCircle) | brand-500 bg, white text, rounded-lg |
| Success text | "Remy will use your updated profile in future conversations."                   | Green, shown 3 seconds after save    |

---

### 2.5 Favorite Chefs

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Route**      | `/settings/favorite-chefs`                    |
| **File**       | `app/(chef)/settings/favorite-chefs/page.tsx` |
| **Page title** | Favorite Chefs - ChefFlow                     |

**Navigation:** Back to Settings link

**H1:** "Favorite Chefs"
**Subtitle:** "Celebrate the chefs who inspire you -- mentors, idols, and culinary heroes. Share your list on social media to show clients what drives your craft."

**Component:** `FavoriteChefEditor` (receives chefs array)

---

### 2.6 Portfolio

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Route**      | `/settings/portfolio`                    |
| **File**       | `app/(chef)/settings/portfolio/page.tsx` |
| **Page title** | Portfolio - ChefFlow                     |

**Navigation:** Back to Settings link

**H1:** "Portfolio"
**Subtitle:** "Curate the photos and descriptions that appear on your public profile. Drag to reorder."

**Component:** `GridEditor` (receives items: id, photoUrl, caption, dishName, isFeatured)

---

### 2.7 Profile Highlights

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/highlights`                    |
| **File**       | `app/(chef)/settings/highlights/page.tsx` |
| **Page title** | Profile Highlights - ChefFlow             |

**Navigation:** Back to Settings link

**H1:** "Profile Highlights"
**Subtitle:** "Feature your key achievements, certifications, press mentions, and awards on your profile."

**Component:** `HighlightEditor` (receives highlights: id, title, category, items[], displayOrder)

---

### 2.8 Client Preview

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Route**      | `/settings/client-preview`                    |
| **File**       | `app/(chef)/settings/client-preview/page.tsx` |
| **Page title** | Client Preview - ChefFlow                     |

**H1:** "Client Preview"
**Subtitle:** "See exactly what your clients experience -- your public profile and their portal."

#### ClientPreviewTabs

| Element             | Details                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| Tab bar             | Two tabs: "Public" and "Portal"                                                     |
| Device frame toggle | Desktop / Mobile icons (Monitor, Smartphone)                                        |
| Client selector     | Dropdown to pick a client (for portal tab)                                          |
| Public tab          | Renders `PublicProfilePreview` inline                                               |
| Portal tab          | Renders `ClientPortalPreview` with selected client's events, quotes, loyalty status |

---

## 3. AI & Privacy

### 3.1 AI Trust Center

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/ai-privacy`                    |
| **File**       | `app/(chef)/settings/ai-privacy/page.tsx` |
| **Page title** | (none set; client component)              |
| **Rendering**  | `'use client'`                            |

**Loading state:** Pulse skeleton

**Conditional:** If `!prefs.onboarding_completed`, shows `RemyOnboardingWizard` instead of the trust center.

#### Trust Center Header

| Element      | Details                                                               |
| ------------ | --------------------------------------------------------------------- |
| Icon         | Shield icon in brand-100 rounded box                                  |
| H1           | "Privacy & Data"                                                      |
| Subtitle     | "Your conversations with Remy are private."                           |
| Status badge | "Remy Active" (emerald) or "Remy Off" (stone) pill with dot indicator |

#### RemyArchetypeSelector

Conditional on `prefs.remy_enabled`. Rounded card allowing selection of Remy personality archetype.

#### Section 1: How It Works

| Element | Details                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------- |
| Icon    | Server icon                                                                                        |
| H2      | "How it works"                                                                                     |
| Content | Two paragraphs explaining private AI infrastructure, no storage, browser-only conversation history |

#### Section 2: What We Can See

| Element | Details                                                                                |
| ------- | -------------------------------------------------------------------------------------- |
| Icon    | Eye icon                                                                               |
| H2      | "What we can see"                                                                      |
| Content | Two paragraphs explaining anonymous usage metrics only, no conversation content access |

**Anonymous Metrics Summary (conditional: totalMessages > 0):**

| Metric        | Display                                                              |
| ------------- | -------------------------------------------------------------------- |
| Conversations | Number                                                               |
| Messages      | Number                                                               |
| Top category  | Text or dash                                                         |
| Since         | Month/year or dash                                                   |
| Footer note   | "Counts only. No conversation content. No client names. No recipes." |

#### Section 3: If You Need Help

| Element | Details                                   |
| ------- | ----------------------------------------- |
| Icon    | Headphones icon                           |
| H2      | "If you need help"                        |
| Content | Explains "Send to Support" opt-in sharing |

#### External Services Disclosure

Amber-themed card:

| Element                       | Details                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Icon                          | ExternalLink icon                                                                               |
| H2                            | "Other services we use"                                                                         |
| Content                       | Explains external API usage for grocery pricing, nutrition                                      |
| Service cards (3-column grid) | Spoonacular (nutrition/recipe), Kroger/Instacart (grocery pricing), MealMe (local store search) |
| Footer                        | "These services have their own privacy policies."                                               |

#### Animated Schematic

| Element     | Details                                                  |
| ----------- | -------------------------------------------------------- |
| H2          | "See how it works"                                       |
| Description | "55-second animated walkthrough of where your data goes" |
| Component   | `PrivacySchematicPlayer`                                 |

#### Static Data Flow Diagram (collapsible)

| Element     | Details                                                      |
| ----------- | ------------------------------------------------------------ |
| Trigger     | `<details>` summary                                          |
| H2          | "Static data flow diagram"                                   |
| Description | "Side-by-side comparison of ChefFlow vs. other AI services." |
| Component   | `DataFlowAnimated`                                           |

#### Data Controls

Component: `DataControls` -- receives initialPrefs, initialSummary, onRefresh callback. Contains feature toggles and delete/disable actions.

---

## 4. Connected Accounts & Integrations

### Google Integrations (inline on Settings Hub)

#### GoogleIntegrations component

**Gmail ServiceCard:**

| State              | Elements                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Not connected      | Description: "Connect your Gmail to automatically capture dinner inquiries..." Button: "Connect Gmail" (variant: primary) |
| Connected          | Badge: "Connected" (success). Email address. Last synced timestamp. "Disconnect" button (variant: secondary, size: sm).   |
| Connected expanded | "Inbox Sync" section with "Sync Now" button. Sync results alert. Recent Activity list. `HistoricalScanSection` component. |

**Google Calendar ServiceCard:**

| State         | Elements                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Not connected | Description: "Connect your Google Calendar to automatically sync bookings..." Button: "Connect Google Calendar" (variant: primary) |
| Connected     | Badge: "Connected" (success). Email. Last sync. "Disconnect" button.                                                               |

**OAuthDiagnostics panel (conditional):**

Amber warning box showing redirect URI that must be registered in Google Cloud Console. Links to Google Cloud Console.

---

### 4.1 Integrations Center

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| **Route**      | `/settings/integrations`                    |
| **File**       | `app/(chef)/settings/integrations/page.tsx` |
| **Page title** | Integrations - ChefFlow                     |

**Navigation:** Back to Settings link

**H1:** "Integrations"
**Subtitle:** "Connect ChefFlow to your website, POS systems, and scheduling or CRM tools."

**Components:**

| Component         | Details                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| TakeAChefSetup    | Featured prominently. Shows Gmail connection status, last sync, lead count. |
| IntegrationCenter | Provider overview and recent integration events.                            |

---

### 4.2 Website Widget (Embed)

| Property       | Value                                |
| -------------- | ------------------------------------ |
| **Route**      | `/settings/embed`                    |
| **File**       | `app/(chef)/settings/embed/page.tsx` |
| **Page title** | Website Widget - ChefFlow            |

**Navigation:** Back to Settings link

**H1:** "Website Widget"
**Subtitle:** "Add a booking form to your existing website. Works on Wix, Squarespace, WordPress, and any site that supports custom HTML."

**Component:** `EmbedCodePanel` (receives chefId) -- displays embed code with platform-specific setup instructions.

---

### 4.3 Stripe Connect

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Route**      | `/settings/stripe-connect`                    |
| **File**       | `app/(chef)/settings/stripe-connect/page.tsx` |
| **Page title** | (none set explicitly)                         |

**H1:** "Stripe Payouts"
**Subtitle:** "Connect your Stripe account to receive client payments directly to your bank account."

#### StripeConnectClient

**Connection Status Card:**

| State                 | Badge                     | Content                                                                    | Button                             |
| --------------------- | ------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| Connected             | "Connected" (success)     | Checkmarks: "Charges enabled", "Payouts enabled". Account ID.              | --                                 |
| In Progress (pending) | "In Progress" (warning)   | "Your Stripe account has been created but onboarding is not yet complete." | "Continue Stripe Setup" (primary)  |
| Not Connected         | "Not Connected" (default) | Benefits list: direct deposits, automatic payouts, professional invoices   | "Connect Stripe Account" (primary) |

**Refresh Status card (conditional: has accountId but not connected):**

"Just completed your Stripe setup? Refresh to update your status." + "Refresh Status" button (secondary, sm).

**Connected management card:**

"Manage payouts, view payout history, and update your bank account directly in your Stripe Dashboard." + link to "Open Stripe Dashboard" (external).

---

### 4.4 API Keys

| Property       | Value                                   |
| -------------- | --------------------------------------- |
| **Route**      | `/settings/api-keys`                    |
| **File**       | `app/(chef)/settings/api-keys/page.tsx` |
| **Page title** | API Keys - ChefFlow                     |

**H1:** "API Keys"
**Subtitle:** "Create API keys to integrate ChefFlow with other tools"

**Component:** `ApiKeyManager` (receives apiKeys: id, name, key_prefix, scopes, last_used_at, is_active, created_at)

---

### 4.5 Webhooks

| Property       | Value                                   |
| -------------- | --------------------------------------- |
| **Route**      | `/settings/webhooks`                    |
| **File**       | `app/(chef)/settings/webhooks/page.tsx` |
| **Page title** | Webhooks - ChefFlow                     |

**H1:** "Webhooks"
**Subtitle:** "Send real-time data to external services when events occur"

**Component:** `WebhookManager` (receives endpoints array)

---

## 5. Availability Rules

Rendered inline on the Settings Hub page within the "Availability Rules" collapsible category.

#### SchedulingRulesForm

**Blocked days of week:**

| Element                    | Details                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| Label                      | "Blocked days of week (hard block -- cannot be overridden)"              |
| Buttons                    | 7 day-of-week pill buttons (Sun--Sat). Red when blocked, stone when not. |
| Warning text (conditional) | "New bookings will be blocked on: Mon, Tue" (red text)                   |

**Preferred days:**

| Element | Details                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| Label   | "Preferred days (advisory only -- shows warning if chef books outside these)" |
| Buttons | 7 day-of-week pill buttons. Green when preferred, stone when not.             |

**Numeric rules (2x2 grid):**

| Field                          | Type   | Min | Max | Placeholder | Helper                            |
| ------------------------------ | ------ | --- | --- | ----------- | --------------------------------- |
| Max events per week            | number | 1   | 20  | "No limit"  | --                                |
| Max events per month           | number | 1   | 50  | "No limit"  | --                                |
| Min buffer days between events | number | 0   | 30  | --          | "Days required between events"    |
| Min lead days (advance notice) | number | 0   | 90  | --          | "Min days ahead for new bookings" |

**Button:** "Save Rules" (variant: primary)

---

## 6. Booking Page

Rendered inline on the Settings Hub page within the "Booking Page" collapsible category.

#### BookingPageSettings

**Enable toggle:**

| Element  | Details                      |
| -------- | ---------------------------- |
| Checkbox | "Enable public booking page" |

**Conditional fields (when enabled):**

| Field                | Type              | Notes                                                                |
| -------------------- | ----------------- | -------------------------------------------------------------------- |
| Booking URL slug     | text              | Auto-lowercases, strips invalid chars. Helper shows generated URL.   |
| Preview booking page | link              | External link to booking URL                                         |
| Copy link            | button            | Copies URL to clipboard, shows "Copied!"                             |
| Headline             | text              | Placeholder: "Private chef for intimate gatherings in San Francisco" |
| Short bio            | textarea (3 rows) | Placeholder: "A brief description of your style..."                  |
| Minimum notice days  | number (0--90)    | Helper: "Clients cannot book dates within this many days"            |

**Booking Model Card:**

| Element              | Details                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| Radio: Inquiry first | "Clients submit a request. You review and send a proposal before they pay." |
| Radio: Instant book  | "Clients pay a deposit upfront and book instantly."                         |

**Instant-book conditional fields:**

| Field                             | Type               | Options/Notes                             |
| --------------------------------- | ------------------ | ----------------------------------------- |
| Pricing type                      | select             | Flat rate / Per person                    |
| Base price / Price per person ($) | number (step 0.01) | Placeholder "500.00"                      |
| Deposit type                      | select             | Percentage of total / Fixed amount        |
| Deposit percentage (%)            | number (1--100)    | Helper: "Percentage of total event price" |
| Deposit amount ($)                | number (step 0.01) | Helper: "Fixed deposit amount in dollars" |
| Note                              | text               | "Requires Stripe Connect to be set up."   |

**Button:** "Save Settings" (variant: primary)

---

## 7. Communication & Workflow

### 7.1 Response Templates

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Route**      | `/settings/templates`                    |
| **File**       | `app/(chef)/settings/templates/page.tsx` |
| **Page title** | (none set explicitly)                    |

**Breadcrumb:** Settings / Response Templates

**H1:** "Response Templates"
**Subtitle:** "Pre-written messages you can quickly copy and customize when logging communication."

**Component:** `TemplateManager` (receives templates array)

---

### 7.2 Automations

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Route**      | `/settings/automations`                    |
| **File**       | `app/(chef)/settings/automations/page.tsx` |
| **Page title** | Automations - ChefFlow                     |

**H1:** "Automations"
**Subtitle:** "Control what ChefFlow does automatically -- built-in follow-up reminders, expiry rules, and your own custom triggers."

#### AutomationsList

**Section: BuiltInSettings** -- chef-configurable toggle settings for built-in automations.

**Section: Custom Rules Card**

| Element          | Details                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Header           | "Custom Rules" with description: "Your rules run on top of the built-in automations above."                               |
| Button           | "+ New Rule" (variant: primary, size: sm)                                                                                 |
| Empty state      | "No custom rules yet." + explanatory text + "+ Create your first rule" button                                             |
| RuleBuilder      | Shown when creating/editing a rule                                                                                        |
| Rule cards       | Name, Active/Paused badge, description, trigger label (blue pill), action label (green pill), fire count, last fired date |
| Per-rule actions | Edit (text button), Pause/Enable (text button), Delete (red text button, with confirmation dialog)                        |

**Section: Activity Log Card**

| Element   | Details                                                       |
| --------- | ------------------------------------------------------------- |
| Header    | "Activity Log" with subtitle "Recent custom rule executions." |
| Component | `ExecutionLog` (receives last 30 executions)                  |

---

### 7.3 Contract Templates

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Route**      | `/settings/contracts`                    |
| **File**       | `app/(chef)/settings/contracts/page.tsx` |
| **Page title** | Contract Templates -- ChefFlow           |

**H1:** "Contract Templates"
**Subtitle:** Explains merge fields syntax `{{merge_fields}}`

**Header button:** "Back to Settings" (variant: ghost, size: sm, link to `/settings`)

**Empty state:**

| Element     | Details                                        |
| ----------- | ---------------------------------------------- |
| Card title  | "Create your first template"                   |
| Description | "You don't have any contract templates yet."   |
| Component   | `ContractTemplateEditor` (no initial template) |

**Populated state:**

Per-template card:

| Element       | Details                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| Title         | Template name                                                                    |
| Default badge | "Default" (amber) -- conditional                                                 |
| Version       | "vN"                                                                             |
| Body preview  | `<pre>` block, max 32 lines, truncated at 300 chars                              |
| Edit          | Collapsible `<details>` with "Edit template" summary -> `ContractTemplateEditor` |
| Delete        | Button (variant: ghost, size: sm, red text). Server action deletes on submit.    |

**Add another:** Card with "Add another template" title and blank `ContractTemplateEditor`.

---

### 7.4 Seasonal Palettes (Repertoire)

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/repertoire`                    |
| **File**       | `app/(chef)/settings/repertoire/page.tsx` |
| **Page title** | (none set explicitly)                     |

**Breadcrumb:** Settings / Seasonal Palettes

**H1:** "Seasonal Palettes"
**Subtitle:** "Keep track of what's available each season so you can plan menus without guessing."

**Component:** `SeasonalPaletteList` (receives palettes array)

---

### 7.5 Seasonal Palette Detail

| Property       | Value                                          |
| -------------- | ---------------------------------------------- |
| **Route**      | `/settings/repertoire/[id]`                    |
| **File**       | `app/(chef)/settings/repertoire/[id]/page.tsx` |
| **Page title** | (none set explicitly)                          |

**Breadcrumb:** Settings / Seasonal Palettes / [Season Name]

**H1:** [Season Name]
**Subtitle:** "Add your notes, seasonal ingredients, and go-to dishes for [Season Name]."

**Component:** `SeasonalPaletteForm` (receives palette data + recipe options for "Proven Wins" linking)

---

### 7.6 Chef Journal

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| **Route**      | `/settings/journal`                    |
| **File**       | `app/(chef)/settings/journal/page.tsx` |
| **Page title** | (none set explicitly)                  |

**Breadcrumb:** Settings / Chef Journal

**H1:** "Chef Journal"
**Subtitle:** "Build a living record of where your chefs go, what inspires them, and how those learnings become better food."

**Component:** `JourneyHub` (receives journeys + insights)

---

### 7.7 Journal Detail

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| **Route**      | `/settings/journal/[id]`                    |
| **File**       | `app/(chef)/settings/journal/[id]/page.tsx` |
| **Page title** | (none set explicitly)                       |

**Breadcrumb:** Settings / Chef Journal / [Journey Title]

**H1:** [Journey Title]
**Subtitle:** "Journal every destination, insight, and idea so your culinary repertoire compounds over time."

**Component:** `JourneyDetail`

| Prop               | Details                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| journey            | Full journey object                                                                 |
| initialEntries     | Journal entries                                                                     |
| initialIdeas       | Ideas list                                                                          |
| initialMedia       | Media/scrapbook items                                                               |
| initialRecipeLinks | Recipe link references                                                              |
| recipeOptions      | All recipes for linking                                                             |
| initialTab         | From URL `?tab=` param. Options: entries (default), ideas, media, recipes, progress |

---

## 8. Notification Settings

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| **Route**      | `/settings/notifications`                    |
| **File**       | `app/(chef)/settings/notifications/page.tsx` |
| **Page title** | Notification Settings - ChefFlow             |

**H1:** "Notification Settings"
**Subtitle:** "Control how and where you receive alerts -- email, browser push, and SMS."

#### NotificationSettingsForm

**Section 1: Browser Push Notifications**

| State       | Display                                                          | Button                                   |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------- |
| subscribed  | "Enabled on this device" (green)                                 | "Disable push" (stone border)            |
| default     | "Not yet enabled on this device"                                 | "Enable push" (stone-900 bg, white text) |
| denied      | "Blocked by browser -- open browser settings to re-allow." (red) | None                                     |
| unsupported | "Not supported on this browser or device." (stone-400)           | None                                     |

**Section 2: SMS Alerts**

| Element         | Details                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Description     | "Text messages for critical-tier notifications: new inquiries, payments, and disputes. Requires Twilio setup." |
| Phone number    | tel input, placeholder "+14155551234", E.164 format                                                            |
| Opt-in checkbox | "I agree to receive SMS notifications from ChefFlow. Message and data rates may apply."                        |
| Save button     | "Save SMS settings" (stone-900 bg)                                                                             |
| Feedback        | "Saved" (green) or error message (red)                                                                         |

**Section 3: Channel Overrides by Category**

Table with per-category toggles:

| Category | Email Toggle |                 Push Toggle                  |              SMS Toggle              |
| -------- | :----------: | :------------------------------------------: | :----------------------------------: |
| Inquiry  |    switch    | switch (disabled if push unsupported/denied) | switch (disabled if no phone/opt-in) |
| Quote    |    switch    |                    switch                    |                switch                |
| Event    |    switch    |                    switch                    |                switch                |
| Payment  |    switch    |                    switch                    |                switch                |
| Chat     |    switch    |                    switch                    |                switch                |
| Client   |    switch    |                    switch                    |                switch                |
| System   |    switch    |                    switch                    |                switch                |

Footer note: "SMS toggles are disabled until you save a phone number and opt in above. Push toggles are disabled if push is unsupported or denied by the browser."

---

## 9. Dashboard & Navigation

### 9.1 Dashboard Widgets

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Route**      | `/settings/dashboard`                    |
| **File**       | `app/(chef)/settings/dashboard/page.tsx` |
| **Page title** | Dashboard Layout - ChefFlow              |

**H1:** "Dashboard Widgets"
**Subtitle:** "Choose which widgets are enabled. Reorder enabled widgets directly from the dashboard corner settings."

**Header link:** "Back to Settings" (border button)

#### DashboardLayoutForm

Two-column card layout:

**Card 1: Enabled Widgets**

| Element     | Details                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| Description | "These widgets will show on your dashboard."                                  |
| Empty state | "No enabled widgets. Turn widgets on from the disabled list." (dashed border) |
| Per-widget  | Widget label + "Disable" button (variant: ghost, size: sm)                    |

**Card 2: Hidden Widgets**

| Element     | Details                                                       |
| ----------- | ------------------------------------------------------------- |
| Description | "Disabled widgets stay off until you turn them back on."      |
| Empty state | "All widgets are currently visible." (dashed border)          |
| Per-widget  | Widget label + "Enable" button (variant: secondary, size: sm) |

**Actions:**

| Button           | Variant           | Label                       |
| ---------------- | ----------------- | --------------------------- |
| Reset to Default | secondary         | Restores default widget set |
| Save Layout      | primary (default) | "Save Layout" / "Saving..." |

---

### 9.2 Primary Navigation

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/navigation`                    |
| **File**       | `app/(chef)/settings/navigation/page.tsx` |
| **Page title** | Primary Navigation - ChefFlow             |

**H1:** "Primary Navigation"
**Subtitle:** "Customize your always-visible bar without changing the underlying feature set."

**Header link:** "Back to Settings" (border button)

#### PrimaryNavForm

Two-column card layout:

**Card 1: Primary Bar (Visible)**

| Element     | Details                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Description | "These tabs stay visible in your primary bar. Drag-style reorder is done with up/down."           |
| Empty state | "No primary tabs selected." (dashed border)                                                       |
| Per-tab     | Label, context description, href. Up/Down arrow buttons (ghost, sm). "Remove" button (ghost, sm). |

**Card 2: Available Tabs**

| Element      | Details                                                            |
| ------------ | ------------------------------------------------------------------ |
| Description  | "Any route listed here can be promoted into your primary bar."     |
| Search input | Placeholder: "Search by tab name or route"                         |
| Empty state  | "No matching tabs available." (dashed border)                      |
| Per-tab      | Label, context, href. "Add" button (variant: secondary, size: sm). |

**Actions:**

| Button           | Variant           | Label                            |
| ---------------- | ----------------- | -------------------------------- |
| Reset to Default | secondary         | Restores default nav set         |
| Save Primary Bar | primary (default) | "Save Primary Bar" / "Saving..." |

---

## 10. Appearance

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/appearance`                    |
| **File**       | `app/(chef)/settings/appearance/page.tsx` |
| **Page title** | Appearance - ChefFlow                     |

**H1:** "Appearance"
**Subtitle:** "Customize how ChefFlow looks for you"

**Card: Theme**

| Element     | Details                                |
| ----------- | -------------------------------------- |
| Card title  | "Theme"                                |
| Label       | "Color Theme"                          |
| Description | "Switch between light and dark mode"   |
| Component   | `ThemeToggle` (light/dark mode switch) |

---

## 11. Modules

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| **Route**      | `/settings/modules`                    |
| **File**       | `app/(chef)/settings/modules/page.tsx` |
| **Page title** | Modules - ChefFlow                     |

**H1:** "Modules"
**Subtitle:** "Choose which features appear in your sidebar. Toggle modules on or off to keep your workspace focused on what you need."

#### ModulesClient

**Quick action buttons:**

| Button              | Action                      |
| ------------------- | --------------------------- |
| "Select All"        | Enables all modules         |
| "Reset to Defaults" | Restores default module set |

**Module grid (2 columns on sm+):**

Per-module card:

| Element                  | Details                                                        |
| ------------------------ | -------------------------------------------------------------- |
| Title                    | Module label                                                   |
| Pro badge                | "PRO" pill (brand colors) -- conditional for pro-tier modules  |
| Lock icon                | Shown when module is locked (pro module, user on free tier)    |
| Description              | Module description text                                        |
| "Upgrade to unlock" link | Links to `/settings/billing` -- conditional for locked modules |
| Toggle switch            | On/off, brand-500 when on. Disabled during save.               |
| "Always on" label        | For modules with `alwaysVisible: true` (no toggle shown)       |

**Saving indicator:** "Saving..." animated text

---

## 12. Billing & Subscription

| Property          | Value                                  |
| ----------------- | -------------------------------------- |
| **Route**         | `/settings/billing`                    |
| **File**          | `app/(chef)/settings/billing/page.tsx` |
| **Page title**    | Subscription & Billing -- ChefFlow     |
| **Search params** | `?upgraded=1` triggers success banner  |

**H1:** "Subscription & Billing"
**Subtitle:** "Manage your ChefFlow Professional plan."

#### BillingClient

**Post-upgrade banner (conditional):**

Green box: "Welcome to ChefFlow Pro! Your subscription is now active."

**Status Card:**

| Element      | Details                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Plan name    | "ChefFlow Pro" or "ChefFlow Free"                                                                           |
| Description  | "Founding member -- free forever" / "Full access to all features" / "Core features included"                |
| Status badge | Founding Member (info) / Active (success) / Trial (success) / Trial Ending Soon (warning) / Expired (error) |

**Conditional status details:**

| Condition                | Display                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Grandfathered            | Star icon + "You're on the founding member plan -- full Pro access, no subscription charge. Ever." |
| Trial with days          | Clock icon + "N days remaining in your free trial. Subscribe to keep Pro access."                  |
| Active with billing date | CheckCircle icon + "Next billing date: [date]"                                                     |
| Expired                  | AlertTriangle icon + "Your trial has ended. Upgrade to Pro to unlock all features."                |

**CTA Buttons:**

| Condition                        | Button                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Not active and not grandfathered | "Upgrade to Pro" (variant: primary, with CreditCard icon). Form action: `redirectToCheckout`. |
| Active with Stripe customer      | "Manage Subscription" (variant: secondary). Form action: `redirectToBillingPortal`.           |

**Free vs Pro Comparison (2-column grid):**

| Column                                   | Details                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free (forever)                           | 13 features listed with green checkmarks                                                                                                           |
| Pro (with sparkle icon, gradient border) | Grouped by category (AI, Analytics, Finance, Marketing, etc.). Each feature has sparkle icon. "Upgrade to Pro" button at bottom for non-Pro users. |

**Footer:** "ChefFlow subscription is separate from your Stripe Payouts connection." with link to `/settings/stripe-connect`.

---

## 13. Custom Fields

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| **Route**      | `/settings/custom-fields`                    |
| **File**       | `app/(chef)/settings/custom-fields/page.tsx` |
| **Page title** | Custom Fields - ChefFlow                     |

**H1:** "Custom Fields"
**Subtitle:** "Add extra fields to events, clients, and recipes to capture information specific to your business."

**Component:** `CustomFieldBuilder` (receives grouped field definitions by entity type)

---

## 14. Event Types & Labels

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Route**      | `/settings/event-types`                    |
| **File**       | `app/(chef)/settings/event-types/page.tsx` |
| **Page title** | Event Types & Labels - ChefFlow            |

**H1:** "Event Types & Labels"
**Subtitle:** "Rename occasion types and status labels to match your preferred terminology. Changes appear everywhere in the app."

**Component:** `EventLabelEditor`

| Prop                 | Details                                    |
| -------------------- | ------------------------------------------ |
| occasionMap          | Map of occasion type keys to custom labels |
| statusMap            | Map of status label keys to custom labels  |
| defaultOccasionTypes | Array of default occasion type keys        |
| defaultStatusLabels  | Array of default status label keys         |

---

## 15. Compliance

### 15.1 Food Safety & Compliance

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/compliance`                    |
| **File**       | `app/(chef)/settings/compliance/page.tsx` |
| **Page title** | Compliance -- ChefFlow                    |

**H1:** "Food Safety & Compliance"
**Subtitle:** "Track certifications, licenses, and insurance with expiry reminders."

**Expiry alerts (conditional):**

Amber warning box: "N certification(s) expiring within 60 days" with list of cert names, days remaining, and expiry dates.

**Section: Active**

Per-certification card:

| Element       | Details                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Name          | Bold text                                                                                                        |
| Type badge    | Type label from CERT_LABELS map (default variant)                                                                |
| Expiry badge  | Color-coded: Expired (error), <14 days (error), <60 days (warning), >60 days (success), or "No expiry" (default) |
| Issuing body  | Subtitle text                                                                                                    |
| Dates         | "Issued [date]", "Expires [date]"                                                                                |
| Cert number   | "#XXXXX"                                                                                                         |
| Document link | "View document" (amber, underline, opens in new tab)                                                             |

Empty state: "No active certifications on file."

**Section: Expired / Pending Renewal**

Similar cards with reduced opacity (0.70). Status badge shows "Expired" or "Pending renewal".

**Section: Add Certification**

Card with `CertForm`:

| Field                          | Type            | Notes                                                                                                                                     |
| ------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Type                           | select          | Food Handler Card, ServSafe Manager, Allergen Awareness, LLC Formation, Business License, Liability Insurance, Cottage Food Permit, Other |
| Status                         | select          | Active, Expired, Pending renewal                                                                                                          |
| Name/description               | text (required) | Placeholder: "ServSafe Manager Certification"                                                                                             |
| Issuing body                   | text            | Placeholder: "National Restaurant Assoc."                                                                                                 |
| Certificate #                  | text            | Placeholder: "Optional"                                                                                                                   |
| Issued date                    | date            |                                                                                                                                           |
| Expiry date                    | date            |                                                                                                                                           |
| Remind me N days before expiry | number (min 0)  | Default: 30                                                                                                                               |
| Document URL                   | url             | Placeholder: "https://... (optional)"                                                                                                     |

**Button:** "Add Certification" (size: sm)

**AI Permit Checklist:** `PermitChecklistPanel` component at bottom.

---

### 15.2 GDPR & Privacy

| Property       | Value                                          |
| -------------- | ---------------------------------------------- |
| **Route**      | `/settings/compliance/gdpr`                    |
| **File**       | `app/(chef)/settings/compliance/gdpr/page.tsx` |
| **Page title** | GDPR & Privacy - ChefFlow                      |

**H1:** "GDPR & Privacy"
**Subtitle:** "Manage data privacy, exports, and compliance"

**Component:** `GdprTools` -- handles data export, deletion requests, and compliance controls.

---

## 16. Protection Hub

### 16.1 Protection Hub Overview

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Route**      | `/settings/protection`                    |
| **File**       | `app/(chef)/settings/protection/page.tsx` |
| **Page title** | Protection Hub -- ChefFlow                |

**H1:** "Protection Hub"
**Subtitle:** "Your business protection posture at a glance -- insurance, certifications, continuity, and crisis preparedness."

**2-column card grid (6 cards):**

| Card                | Icon                  | Badge(s)                                                        | Description                                                 | Link                                   |
| ------------------- | --------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Business Health     | Shield (amber)        | "N/M complete" (success/warning) or "Not started" (default)     | Legal structure, contracts, liability foundations           | `/settings/protection/business-health` |
| Insurance           | FileCheck (amber)     | "N active" (default) + "N expiring soon" (warning, conditional) | General liability, food contamination, workers' comp        | `/settings/protection/insurance`       |
| Certifications      | Award (amber)         | "N active" (default) + "N expiring soon" (warning, conditional) | Food safety, allergen training, credentials                 | `/settings/protection/certifications`  |
| NDA & Permissions   | FileText (amber)      | "Per-client" (info)                                             | Non-disclosure agreements and photo permissions             | `/settings/protection/nda`             |
| Business Continuity | Layers (amber)        | "Plan" (default)                                                | Extended incapacitation, data handoff, client communication | `/settings/protection/continuity`      |
| Crisis Response     | AlertTriangle (amber) | "Playbook" (default)                                            | Food safety incidents, client complaints, PR crises         | `/settings/protection/crisis`          |

Each card has a "Manage ->" link (amber-700 text).

---

### 16.2 Insurance Policies

| Property       | Value                                               |
| -------------- | --------------------------------------------------- |
| **Route**      | `/settings/protection/insurance`                    |
| **File**       | `app/(chef)/settings/protection/insurance/page.tsx` |
| **Page title** | Insurance Policies -- ChefFlow                      |

**H1:** "Insurance Policies"
**Subtitle:** "Document your coverage -- general liability, food contamination, workers' comp, and umbrella policies."

**Info box (blue):** "Set expiry reminders so you never lapse on coverage. Clients increasingly ask for proof of insurance before booking."

**Component:** `InsuranceList` (receives policies array)

---

### 16.3 Certifications (Protection)

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| **Route**      | `/settings/protection/certifications`                    |
| **File**       | `app/(chef)/settings/protection/certifications/page.tsx` |
| **Page title** | Certifications -- ChefFlow                               |

**H1:** "Certifications"
**Subtitle:** "Track your active certifications, renewal dates, and issuing bodies. Expiry alerts help ensure credentials never lapse."

**Component:** `CertificationList` (receives certs array)

---

### 16.4 NDA & Permissions

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Route**      | `/settings/protection/nda`                    |
| **File**       | `app/(chef)/settings/protection/nda/page.tsx` |
| **Page title** | NDA & Permissions -- ChefFlow                 |

**H1:** "NDA & Photo Permissions"
**Subtitle:** "Manage non-disclosure agreements and content usage rights for your clients."

**Card content:**

| Element        | Details                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| Icon           | FileText (amber, 24px)                                                           |
| Title          | "Per-client settings"                                                            |
| Explanation    | NDA and photo permissions managed per client                                     |
| Amber info box | "Why per-client? NDA terms and photo permissions vary by client relationship..." |
| Button         | "Go to Clients ->" (amber-600 bg, white text, links to `/clients`)               |

---

### 16.5 Business Continuity

| Property       | Value                                                |
| -------------- | ---------------------------------------------------- |
| **Route**      | `/settings/protection/continuity`                    |
| **File**       | `app/(chef)/settings/protection/continuity/page.tsx` |
| **Page title** | Business Continuity -- ChefFlow                      |

**H1:** "Business Continuity Plan"
**Subtitle:** "Document what happens to your business and your clients if you are suddenly unable to work -- illness, injury, family emergency, or extended leave."

**Info box (blue):** "A continuity plan gives your backup contacts and trusted peers the information they need to protect your clients and your reputation. Review and update it at least twice a year."

**Component:** `ContinuityPlanForm` (receives existing plan text or null)

---

### 16.6 Crisis Response

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Route**      | `/settings/protection/crisis`                    |
| **File**       | `app/(chef)/settings/protection/crisis/page.tsx` |
| **Page title** | Crisis Response -- ChefFlow                      |

**H1:** "Crisis Response Playbook"
**Subtitle:** "Step-by-step protocols for food safety incidents, client complaints, negative reviews, and other crisis scenarios. Know exactly what to do before a crisis happens."

**Component:** `CrisisPlaybook` -- renders static playbook content with step-by-step protocols.

---

### 16.7 Business Health Checklist

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **Route**      | `/settings/protection/business-health`                    |
| **File**       | `app/(chef)/settings/protection/business-health/page.tsx` |
| **Page title** | Business Health -- ChefFlow                               |

**H1:** "Business Health Checklist"
**Subtitle:** "A practical checklist of legal, financial, and operational foundations every private chef business should have in place."

**Component:** `BusinessHealthChecklist` (receives items sorted by sort_order, each with completed status)

---

### 16.8 Portfolio Removal Requests

| Property       | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| **Route**      | `/settings/protection/portfolio-removal`                    |
| **File**       | `app/(chef)/settings/protection/portfolio-removal/page.tsx` |
| **Page title** | (none set explicitly)                                       |

**H1:** "Portfolio Removal Requests"
**Subtitle:** "Track and manage requests to remove content from your portfolio."

**Component:** `RemovalRequestList` (receives requests joined with client display_name, ordered by request_date desc)

---

## 17. Professional Development

### 17.1 Professional Development Overview

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| **Route**      | `/settings/professional`                    |
| **File**       | `app/(chef)/settings/professional/page.tsx` |
| **Page title** | Professional Development -- ChefFlow        |

**H1:** "Professional Development"
**Subtitle:** "Your career milestones, achievements, and learning goals."

**Component:** `ProfessionalDevelopmentClient` (receives initialAchievements, initialGoals)

Contains sections for achievements (competitions, stages, press features, awards, courses) and learning goals (active vs. completed).

---

### 17.2 Capability Inventory (Skills)

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| **Route**      | `/settings/professional/skills`                    |
| **File**       | `app/(chef)/settings/professional/skills/page.tsx` |
| **Page title** | (none set explicitly)                              |

**H1:** "Capability Inventory"
**Subtitle:** "Rate your confidence across cuisines, dietary needs, and techniques."

**Component:** `CapabilityInventory` (receives capabilities sorted by capability_type)

---

### 17.3 Professional Momentum

| Property       | Value                                                |
| -------------- | ---------------------------------------------------- |
| **Route**      | `/settings/professional/momentum`                    |
| **File**       | `app/(chef)/settings/professional/momentum/page.tsx` |
| **Page title** | (none set explicitly)                                |

**H1:** "Professional Momentum"
**Subtitle:** "Track your growth across new dishes, cuisines, education, and creative projects."

**Component:** `MomentumDashboard` (receives momentum snapshot data)

---

## 18. Account & Security

### 18.1 System Health

| Property       | Value                                 |
| -------------- | ------------------------------------- |
| **Route**      | `/settings/health`                    |
| **File**       | `app/(chef)/settings/health/page.tsx` |
| **Page title** | System Health - ChefFlow              |

**Navigation:** Back to Settings link

**H1:** "System Health"
**Subtitle:** "Connection and service status for your ChefFlow account"

**Overall status banner:**

Card with colored dot + message:

| Status  | Color                  | Message                            |
| ------- | ---------------------- | ---------------------------------- |
| ok      | emerald                | "All systems operational"          |
| warning | amber (animated pulse) | "Some items need attention"        |
| error   | red (animated pulse)   | "One or more services have issues" |
| unknown | stone                  | "Status could not be determined"   |

**Health check rows:**

Each row: colored background, status dot, label, detail, optional action link.

| Check             | Possible States                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Stripe Payments   | ok (connected + charges enabled), warning (connected but charges not enabled), error (not connected), unknown |
| Gmail Integration | ok (connected, shows email + last sync), warning (not connected or has sync errors), unknown                  |
| Google Calendar   | ok (connected), warning (not connected), unknown                                                              |
| DOP Tasks         | ok (all complete or upcoming, nothing overdue), warning (tasks due today), error (overdue tasks), unknown     |

**Action links per check:** "Connect Stripe ->", "Fix in Settings ->", "Connect Gmail ->", "Review ->", "Connect Calendar ->", "View Tasks ->", "View ->"

**Footer:** "Status refreshes on each page load. Hard-refresh to re-check all connections."

---

### 18.2 System Incidents (Admin)

| Property       | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **Route**      | `/settings/incidents`                                                    |
| **File**       | `app/(chef)/settings/incidents/page.tsx`                                 |
| **Page title** | System Incidents - ChefFlow                                              |
| **Access**     | Admin only (`isAdmin(user.email)`) -- redirects to `/settings` otherwise |

**H1:** "System Incidents"
**Subtitle:** "Automatic failure reports from Ollama, the task queue, circuit breakers, and health checks. Only real problems show up here -- retries and expected offline states are filtered out."

**Search params (URL filters):** `?date=`, `?system=`, `?severity=`

**Component:** `IncidentsDashboard` (receives dashboard data filtered by params)

---

### 18.3 Change Password

| Property       | Value                                          |
| -------------- | ---------------------------------------------- |
| **Route**      | `/settings/change-password`                    |
| **File**       | `app/(chef)/settings/change-password/page.tsx` |
| **Page title** | (none set explicitly)                          |

**H1:** "Change Password"
**Subtitle:** "Update your account password. You will need to enter your current password for verification."

#### ChangePasswordForm

**Card: Update Password**

| Field                | Type     | Autocomplete     | Validation                                            |
| -------------------- | -------- | ---------------- | ----------------------------------------------------- |
| Current Password     | password | current-password | Required                                              |
| New Password         | password | new-password     | Required, min 8 chars. Helper: "Minimum 8 characters" |
| Confirm New Password | password | new-password     | Required, must match new password                     |

**Button:** "Update Password" (variant: primary)

**Alerts:** Success: "Password updated successfully." Error: dynamic message.

---

### 18.4 Delete Account

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Route**      | `/settings/delete-account`                    |
| **File**       | `app/(chef)/settings/delete-account/page.tsx` |
| **Page title** | (none set explicitly)                         |

**H1:** "Delete Account"
**Subtitle:** "Permanently delete your ChefFlow account and all associated data."

**Warning alert (error variant):** "Warning: This action is permanent and cannot be undone. All your events, clients, recipes, menus, financial records, and other data will be permanently deleted. Make sure you have exported any data you need before proceeding."

#### DeleteAccountForm

**Card: Confirm Account Deletion**

| Field        | Type     | Placeholder   | Notes                                                           |
| ------------ | -------- | ------------- | --------------------------------------------------------------- |
| Confirmation | text     | "Type DELETE" | Must type exactly "DELETE"                                      |
| Password     | password | --            | Required. Helper: "Enter your password to verify your identity" |

**Button:** "Permanently Delete Account" (variant: danger). Disabled until confirmation text matches "DELETE".

**Alert:** Error messages displayed dynamically.

---

## 19. Redirects

| Route                    | Destination              | Notes                                         |
| ------------------------ | ------------------------ | --------------------------------------------- |
| `/settings/journey`      | `/settings/journal`      | Server-side redirect                          |
| `/settings/journey/[id]` | `/settings/journal/[id]` | Server-side redirect, preserves dynamic param |

---

## Summary Statistics

| Metric                                | Count                                                            |
| ------------------------------------- | ---------------------------------------------------------------- |
| Total page files                      | 50                                                               |
| Unique routable pages                 | 48 (2 are redirects)                                             |
| Pages with inline forms               | 18                                                               |
| Pages delegating to client components | 32                                                               |
| Admin-only pages                      | 1 (System Incidents)                                             |
| Pages with `requireChef()` auth       | 47                                                               |
| Pages with file upload fields         | 3 (My Profile, Network Profile, Chef Background)                 |
| Toggle switches across all pages      | ~25+ (modules, notifications, business mode, availability, etc.) |
| Collapsible sections on hub page      | 14                                                               |
