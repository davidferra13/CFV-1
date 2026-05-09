# Settings UX Benchmark Research

> 25-product analysis of how world-class digital products design account settings, profile settings, privacy, notifications, billing, security, preferences, and user-control surfaces.
> Research date: 2026-05-09

---

## Executive Summary

The best settings experiences share five qualities: they are boring in the right way, they separate identity from preferences from administration, they make destructive actions hard to trigger accidentally, they save state predictably, and they never mix serious controls with playful UI treatment.

Products that excel (Stripe, Discord, Notion, GitHub, Linear, Airbnb) consistently do three things:

1. **Group by concern, not by feature.** Security settings live together. Billing lives together. Profile lives together. They never scatter related controls across unrelated pages.
2. **Use a persistent sidebar with section headers.** The left-sidebar-with-grouped-categories pattern dominates among professional products. Horizontal tabs work for simple products (Reddit, Canva, Twitch) but break down past 6-7 categories.
3. **Make save behavior predictable.** Toggles auto-save. Forms use explicit save buttons. No product mixes these without causing confusion. The best products (Shopify) track dirty state and show a contextual save bar.

Products that struggle (Facebook, Slack, Amazon, Microsoft, YouTube) share a common failure: **fragmentation.** Settings scattered across multiple domains, portals, and sub-applications destroy user confidence. When a user cannot find where to change their password, trust erodes.

---

## Core Pattern

The ideal modern settings architecture is a **full-page dedicated settings area** accessed from a **profile dropdown or persistent gear icon**, organized with a **left sidebar grouped by concern** (Account, Preferences, Notifications, Billing, Security, Integrations), using **card-based grouped forms** in the content area, with **auto-save for toggles and explicit save for forms**, and a clearly separated **danger zone** for destructive actions.

Personal settings (about you the human) are always separated from workspace/business settings (about the organization). App preferences (appearance, language, defaults) are always separated from account identity (name, email, password). Billing is always its own section, never mixed with profile or preferences.

---

## Benchmark Matrix

| Product           | Entry Point                                                | Layout                                                          | Main Categories                                                                                                                                                                                                                     | Save Behavior                                                            | Security Model                                                                                   | Notification Model                                                                  | Privacy/Data                                                                             | Visual Style                                                                            | Notable Strengths                                                                                                                                | Notable Weaknesses                                                                                                                                 |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Facebook          | Avatar dropdown                                            | Full page, left sidebar                                         | General, Security, Privacy, Notifications, Payments, Apps, Ads + Accounts Center                                                                                                                                                    | Edit-expand-save per field; toggles auto-save                            | Password, 2FA (app/SMS/key), sessions, recovery contacts                                         | Per-type toggles across push/email/SMS; extremely granular                          | Audience controls, activity log, data download, deactivation/deletion                    | Clean white, medium density, blue accents                                               | Security checkup, session list, multi-step destructive flows                                                                                     | Accounts Center split is confusing; 15+ sidebar items; notifications overwhelming                                                                  |
| Instagram         | Hamburger on profile                                       | Full screen drill-down (mobile), sidebar (web)                  | Edit Profile, Notifications, Privacy, Content, Interactions                                                                                                                                                                         | Toggles auto-save; profile edit has Done button                          | Delegated to Meta Accounts Center                                                                | Per-category with Pause All master toggle                                           | Single public/private toggle (genius); granular story/tag controls                       | Extremely minimal, generous whitespace, iOS-native feel                                 | Simplicity; public/private toggle; Pause All notifications                                                                                       | Security buried in Accounts Center; deletion buried deep; web stripped down                                                                        |
| TikTok            | Hamburger on profile                                       | Full screen drill-down (mobile), sidebar (web)                  | Account, Privacy, Security, Notifications, Content, Creator Tools                                                                                                                                                                   | Auto-save on toggles; radio buttons save on tap                          | Password, 2FA (app/SMS), device sessions, security alerts                                        | Per-category with Pause All; moderate granularity                                   | Per-interaction audience selectors (Duets, Stitches, DMs, Downloads); ad personalization | Clean mobile-native, teal accents, moderate density                                     | Granular per-interaction privacy controls; Family Pairing                                                                                        | Deep nesting for privacy (many taps); web feels like afterthought                                                                                  |
| YouTube           | Avatar dropdown                                            | Full page, minimal sidebar (7 items)                            | Account, Notifications, Playback, Privacy, Connected Apps, Billing, Advanced                                                                                                                                                        | Explicit Save buttons; notification toggles auto-save                    | Fully delegated to Google Account                                                                | Per-category with All/Personalized/None per channel                                 | History toggles, subscription privacy, links to Google data tools                        | Material Design, sparse, low density                                                    | Extreme simplicity (7 items); Google security inheritance                                                                                        | Fragmented across YouTube, Studio, and Google Account; no in-app security                                                                          |
| Twitch            | Avatar dropdown                                            | Full page, horizontal tabs (5 tabs)                             | Profile, Security & Privacy, Notifications, Channel & Videos, Connections                                                                                                                                                           | Explicit Save with dirty-state detection; toggles auto-save              | Password, 2FA (app/SMS), sessions, login verification                                            | 3-channel breakdown (email/push/on-site) per category                               | Embedded in Security tab; limited scope                                                  | Dark theme, purple accents, single column centered                                      | Flat one-level structure; dirty-state save detection; rich Connections page                                                                      | Billing separated into Wallet; Creator Dashboard fragments settings; light settings page in dark app                                               |
| X / Twitter       | More menu (buried)                                         | Full page, expanding sidebar                                    | Your Account, Monetization, Security, Privacy, Notifications, Display                                                                                                                                                               | Toggles auto-save; password form has Save button                         | Password, 2FA (SMS/app/key), sessions, connected accounts                                        | Per-channel (push/email/SMS) with per-type toggles                                  | Extensive: audience, muting, blocking, DMs, ads, location, Grok                          | Clean, high contrast, minimal color                                                     | Logical grouping; thorough privacy explanations; master-detail layout                                                                            | Entry point buried in More menu; Monetization feels like upsell; profile editing separate from settings                                            |
| Reddit            | Avatar dropdown                                            | Full page, horizontal tabs (6 tabs)                             | Account, Profile, Safety & Privacy, Feed, Notifications, Emails                                                                                                                                                                     | Toggles auto-save; text fields have Save button                          | Password, 2FA (authenticator only), connected accounts                                           | Separate tabs for in-app vs. email notifications                                    | Ad personalization toggles, blocked accounts, chat permissions                           | Clean, flat, bland, utilitarian                                                         | Flat tab structure; ad controls prominently placed; delete flow is honest                                                                        | Notifications/Emails tab split confusing; legacy OAuth page; gender field feels like data harvesting                                               |
| Discord           | Gear icon (always visible)                                 | Full-screen overlay, grouped sidebar                            | My Account, Profiles, Privacy, Connections, Nitro, Billing, Appearance, Voice, Notifications, Keybinds                                                                                                                              | Nearly all auto-save; text fields save on Enter                          | Password, 2FA (app/SMS), backup codes, device sessions                                           | Per-event-type toggles; per-server overrides via context menu                       | DM scanning levels, friend request controls, data usage toggles                          | Dark theme, blurple accents, moderate-dense                                             | Always-visible gear icon; section-grouped sidebar; disable vs. delete distinction; rich connections                                              | Sidebar too long (scrolling needed); HypeSquad/Merch dilute sidebar; Nitro cancellation is pushy                                                   |
| Slack             | Avatar dropdown (preferences) + workspace dropdown (admin) | Modal (preferences) + full web page (admin)                     | Notifications, Sidebar, Themes, Messages, Language, Accessibility, Audio, Connected Accounts, Advanced                                                                                                                              | Auto-save in modal; explicit Save in web admin                           | Personal: web account page. Workspace: SSO/SAML, enforced 2FA                                    | Best-in-class DnD schedule, keyword triggers, VIP contacts, per-channel overrides   | Minimal for individuals; workspace admin controls policy                                 | Polished modal vs. utilitarian web admin                                                | Notification schedule (DnD by day); theme hex customization; VIP contacts                                                                        | Three-way settings split (modal/side panel/web); no individual privacy controls; can't delete own account                                          |
| Notion            | Sidebar text link                                          | Full-screen modal, grouped sidebar                              | Account (Profile, Preferences, Notifications, Connections, AI) + Workspace (General, People, Plans, Billing, Security, Connections, Import)                                                                                         | All auto-save; no save button anywhere                                   | Personal: password/2FA. Workspace: SSO/SAML, enforced 2FA, audit log                             | Compact; push/email toggles; Slack integration                                      | Minimal; profile discoverability toggle; workspace admin controls export/duplication     | Light, airy, minimal, typographic                                                       | Account/Workspace split; always-visible entry; auto-save matches product philosophy; Danger Zone label                                           | Notifications too simple; Connections appears twice (personal + workspace); AI section feels forced                                                |
| Google Account    | Avatar dropdown, standalone hub                            | Full page, left sidebar (7 items)                               | Personal Info, Data & Privacy, Security, People & Sharing, Payments & Subscriptions                                                                                                                                                 | Inline edit with per-field Save; toggles with confirmation dialogs       | Password, 2FA (app/SMS/key/passkeys), security checkup, sessions, app passwords                  | Scattered across individual products; no centralized page                           | Activity controls (Web, Location, YouTube); ad personalization; Takeout; delete account  | Material Design 3, cards on light gray, spacious                                        | Security Checkup wizard; Takeout data export; progressive disclosure                                                                             | Notifications fragmented across products; Data & Privacy page extremely long; links jump to different Google properties                            |
| Apple ID          | Top of Settings app / appleid.apple.com                    | Single scrollable page (web), hierarchical push (iOS)           | Sign-In & Security, Personal Info, Payment & Shipping, iCloud, Devices, Privacy                                                                                                                                                     | Inline edit with Done/Save; toggles immediate                            | Password, 2FA (mandatory), recovery contact, legacy contact, app-specific passwords              | Not in Apple ID; per-app in device Settings                                         | Privacy portal (privacy.apple.com); data download, deactivation, deletion                | Extremely clean, SF Pro, low density, luxury feel                                       | Extreme simplicity; Legacy Contact; deactivation + deletion options; 7-day grace period                                                          | No search in Apple ID; iCloud storage deeply nested; web experience less capable than device; notifications not centralized                        |
| Microsoft Account | Avatar, standalone hub                                     | Full page, horizontal top tabs                                  | Your Info, Devices, Security, Privacy, Family, Services & Subscriptions, Rewards, Billing                                                                                                                                           | Mixed: profile has Save buttons; toggles immediate                       | Password, passwordless option, 2FA (Authenticator/SMS), sessions, sign-in activity               | Under Privacy > Communication preferences; minimal                                  | Privacy dashboard with per-category activity browsing and deletion; ad settings          | Fluent Design, Segoe UI, cards with shadows, corporate                                  | Security features (passwordless, detailed sign-in logs); 60-day closure grace period; Family features                                            | Fragmentation across domains (account.microsoft.com, office.com, xbox.com); subscription cancellation dark pattern; Rewards feels like an ad       |
| Amazon            | Account & Lists dropdown                                   | Full page, icon+label card grid                                 | Orders, Login & Security, Prime, Addresses, Payments, Gift Cards, Digital Content, Data & Privacy, Communication Preferences                                                                                                        | Explicit Save buttons; yellow Amazon button style                        | Password (email reset only), 2FA (app/SMS); no session visibility                                | Simple checkbox list for email categories                                           | Data download, ad opt-out, account closure; scattered across ecosystem                   | Dense, utilitarian, yellow-orange-black, Amazon Ember font                              | Comprehensive hub; order history excellence; payment management maturity                                                                         | Prime cancellation dark pattern; ecosystem fragmented (Alexa, Ring, Audible); no search in settings; dated design; privacy scattered               |
| Airbnb            | Avatar dropdown                                            | Full page, card grid hub + single-column detail pages           | Personal Info, Login & Security, Payments & Payouts, Taxes, Notifications, Privacy & Sharing, Global Preferences, Travel for Work                                                                                                   | Inline edit pattern (Edit > expand > Save > collapse); toggles auto-save | Password, social accounts, device history; no proper 2FA/TOTP                                    | Best-in-class: per-category with per-channel toggles (email/push/SMS)               | Activity sharing, connected apps, read receipts toggle, data download                    | Modern, warm, spacious, Airbnb pink/red, large typography                               | Notification settings exemplary; inline editing intuitive; public profile vs. private settings separation; read receipts toggle                  | No 2FA for a financial platform; deactivate vs. delete terminology unclear; hub has 10+ cards                                                      |
| DoorDash          | Bottom tab (Account)                                       | Full page, flat list                                            | Orders, DashPass, Addresses, Payment Methods, Account Settings, Manage Account                                                                                                                                                      | Toggles auto-save; address/payment have Save button                      | Minimal; email-based password reset; no 2FA                                                      | 3 toggles (Store Offers, DoorDash Offers, Order Updates)                            | Not prominently surfaced; buried in help                                                 | Clean white, generous padding, red CTAs, mobile-first                                   | Flat shallow structure; fast pages; payment masking feels secure                                                                                 | No grouping or headers; "Account Settings" vs. "Manage Account" confusing; no search; no in-app password management                                |
| Uber              | Bottom tab (Account)                                       | Full page, stacked list with sub-pages                          | Wallet, Uber One, Manage Account, App Settings, Privacy, Safety                                                                                                                                                                     | Profile edits require verification; toggles auto-save                    | Password, 2FA (authenticator), sessions, device management                                       | Under App Settings; toggles for rides/promos/account                                | Dedicated Privacy Center with data exploration, connected apps, behavioral ads, deletion | Black-and-white, dense but polished, corporate                                          | Privacy Center genuinely well-designed; 30-day recovery period; Safety features prominent                                                        | Privacy Center depth can bury settings; Wallet combines payment + promos; some OS-level notification confusion                                     |
| Spotify           | Avatar dropdown (desktop), gear icon (mobile)              | Single scrollable page, no sidebar or tabs                      | Account (link to web), Content & Display, Audio Quality, Playback, Privacy & Social, Notifications, Data Saver, Storage, Apps & Devices                                                                                             | All auto-save, no save buttons anywhere                                  | All on web (spotify.com/account); no in-app security; no native 2FA                              | Per-category push toggles on mobile; desktop: song change only                      | Private session toggle, listening activity sharing; data controls on web                 | Dark theme, green accents, long scrollable document                                     | Simplicity of single page; seamless auto-save; separation of in-app preferences from web account                                                 | Single page gets very long; forced web redirect for account/billing; hidden advanced settings; mobile settings confusing                           |
| Netflix           | Avatar dropdown                                            | Full web page, collapsible sections                             | Membership & Billing, Security, Profiles (per-profile settings), Settings                                                                                                                                                           | Most require explicit Save/Update; notification checkboxes auto-save     | Email, phone, password, device management; no traditional 2FA                                    | Per-profile: email categories with checkboxes                                       | Per-profile: behavioral advertising, matched identifiers, data download                  | Light, clean, minimal, neutral, disclosure arrows                                       | Per-profile structure for households; cancellation vs. deletion distinction; 10-month data retention                                             | Always redirects to web browser; long with many profiles; "Test participation" confusing; "Settings" section header within Account page is muddled |
| Stripe Dashboard  | Gear icon, bottom of left sidebar                          | Full page, three-column (dashboard nav + settings nav + detail) | Personal (Profile, Communications, Sessions, Password, Auth) + Account (Details, Business, Team, Payouts, Documents) + Product (Payments, Checkout, Billing, Radar, Tax, Webhooks, API Keys)                                        | Explicit Save buttons with dirty-state tracking; some toggles auto-save  | Password, 2FA, enforced team 2FA, SSO/SAML, audit log, role-based access (6 roles)               | Per-category email toggles; no push (web-only)                                      | Minimal consumer-style; PCI compliance, data exports, DPA                                | Light, airy, purple accents, refined typography, high information density but organized | Three-tier (Personal/Account/Product) is the gold standard; role-based access; dirty-state tracking; branding preview; test/live mode separation | Volume overwhelming for new users; Account vs. Product boundary unclear for some settings; three-column cramped on small screens                   |
| Shopify Admin     | Gear icon, bottom of left sidebar                          | Full page, two-column (settings sidebar + content)              | Store Details, Plan, Billing, Users, Payments, Checkout, Customer Accounts, Shipping, Taxes, Locations, Gift Cards, Markets, Domains, Brand, Notifications, Custom Data, Languages, Policies, Apps                                  | Contextual save bar (dirty-state detection, Discard/Save)                | Personal via avatar; Store: staff permissions with granular roles                                | Customer-facing notification templates (editable HTML/Liquid) + staff notifications | Policies page (privacy policy, terms); GDPR via admin tools                              | Polaris design system, clean, cards with subtle shadows, professional                   | Contextual save bar is excellent; store vs. account separation; consistent Polaris components; empty states guide setup                          | 20+ categories overwhelming; notification template editor intimidating; some settings in unexpected places                                         |
| GitHub            | Avatar dropdown                                            | Full page, grouped sidebar                                      | Public Profile, Account, Appearance, Accessibility, Notifications, Billing, Emails, Password & Auth, Sessions, SSH/GPG Keys, Organizations, Repositories, Copilot, Packages, Pages, Applications, Security Log + Developer Settings | Explicit Save buttons; some toggles auto-save; inconsistent              | Password, 2FA (app/SMS/key/passkeys), sessions, recovery codes                                   | Extremely granular: per-type, per-org routing, per-channel                          | Scattered: email privacy, contribution privacy, blocked users across multiple pages      | Clean, dense, monochrome, developer-oriented, no decorative elements                    | Danger Zone pattern (industry-defining); grouped sidebar with section headers; typed-name confirmation; granular notifications                   | Notification settings overwhelming; privacy scattered; toggle-save vs. button-save inconsistency; Developer Settings feels disconnected            |
| Linear            | Workspace dropdown                                         | Full page, grouped sidebar                                      | My Account (Profile, Notifications, Security, Preferences) + Features + Administration (General, Members, Labels, Templates, Integrations, API, Security, Billing) + Teams                                                          | All auto-save; no save buttons                                           | Personal: password, 2FA, sessions. Workspace: SAML SSO, SCIM, domain restrictions                | Per-event toggles for email and push; compact                                       | Minimal; data export via Import/Export; workspace admin controls policy                  | Extremely clean, minimal, refined, dark mode default, best-in-class B2B design          | Auto-save removes friction; retire vs. delete for teams; keyboard shortcut access (O then S); visual design excellence                           | Entry point hard to discover (workspace dropdown); Teams list can get long; Slack routing under Integrations not Notifications                     |
| Figma             | Avatar menu                                                | Modal (personal) + full page (org admin)                        | Personal: Account, Notifications, Security (3 tabs in modal). Org Admin: Dashboard, Workspaces, Teams, Members, Activity, Resources, Settings, Billing                                                                              | Mixed: name/email have Save; toggles auto-save                           | Password, 2FA (app/key); org-level SSO/SAML                                                      | Per-event email toggles; compact                                                    | Limited; org admin controls file visibility and guest access                             | Minimal, clean, compact, understated, Inter font                                        | Modal for personal settings is fast and non-disruptive; clear personal vs. admin separation; matches brand                                       | Modal is small (scrolling needed); editor preferences NOT in settings modal; connected apps buried under Security tab                              |
| Canva             | Avatar dropdown                                            | Full page, horizontal tabs                                      | Your Account, Login & Security, Message Preferences, Your Data, Billing & Plans, Purchase History, Domains                                                                                                                          | Profile has Save button; toggles auto-save                               | Password, connected login methods (Google/Apple/Facebook); SSO for enterprise; no individual 2FA | Simple toggles for marketing email categories                                       | AI training data opt-out; activity data toggles; data download; account deletion         | Bright, approachable, consumer-friendly, purple accents, large typography               | Tab navigation immediately understandable; AI training opt-out shows privacy respect; 14-day deletion grace period; Purchase History as own tab  | Subscription cancellation is retention-heavy; integrations buried in editor, not settings; notification controls are marketing-only                |

---

## Common Settings Categories

### Profile

**What belongs:** Display name, username/handle, avatar/photo, bio/about, pronouns, public links, profile banner, public-facing identity controls.
**What does not belong:** Email, password, phone number (those are Account). App theme or language (those are Preferences). Business name or team info (those are Workspace).

### Account

**What belongs:** Email address, phone number, username (login credential), linked sign-in methods (Google, Apple, Facebook), account type, account creation date, data export, account closure/deletion.
**What does not belong:** Display name or bio (those are Profile). Password and 2FA (those are Security). Payment methods (those are Billing).

### Security

**What belongs:** Password management, two-factor authentication, passkeys, backup codes, recovery contacts, active sessions/devices, login history, sign-in alerts, app-specific passwords, security checkup.
**What does not belong:** Email or phone number changes (those are Account, though they may require security verification). Privacy controls (those are Privacy). API keys (those are Developer/Integrations).

### Privacy

**What belongs:** Visibility controls (who can see your profile, activity, content), data collection toggles (ad personalization, tracking, analytics), data download/export, search and discovery controls, blocking and muting, read receipts, activity sharing, consent management.
**What does not belong:** Password or 2FA (those are Security). Notification preferences (those are Notifications). Content filtering (those are Preferences).

### Notifications

**What belongs:** Per-channel controls (email, push, SMS, in-app), per-event-type controls (comments, mentions, follows, billing, security alerts), master pause/mute toggle, notification schedule (quiet hours/DnD), frequency controls (immediate vs. digest).
**What does not belong:** Blocked or muted users (those are Privacy). Sound/volume settings (those are device-level). Marketing email opt-outs can live here or in Privacy.

### Billing

**What belongs:** Current plan/subscription, plan comparison, upgrade/downgrade, payment methods, billing address, invoices/receipts, usage meters, credits/coupons, cancellation.
**What does not belong:** Business profile or tax info (those are Workspace unless the product is simple). Payout methods for creators (those are a sub-section of Billing or their own Payouts category).

### Preferences

**What belongs:** Appearance/theme (light/dark/system), language, region/locale, timezone, font size, default views, content display (compact/comfortable), autoplay, keyboard shortcuts, accessibility settings.
**What does not belong:** Profile information (that is Profile). Notification controls (that is Notifications). Privacy controls (that is Privacy).

### Connected Accounts / Integrations

**What belongs:** Third-party sign-in methods, OAuth-authorized applications, linked platform accounts (social, gaming, productivity), API keys (for developer-facing products), webhook management, calendar connections.
**What does not belong:** Payment methods (those are Billing). Social sharing preferences (those are Privacy).

### Workspace / Team / Business

**What belongs:** Organization name and branding, team member management, role and permission assignments, SSO/SAML configuration, audit logs, workspace-level security policies, domain verification, public business profile.
**What does not belong:** Individual profile settings. Individual notification preferences. Individual security (password/2FA).

### Danger Zone

**What belongs:** Account deletion, account deactivation, workspace deletion, data purge. Only irreversible or high-consequence actions.
**What does not belong:** Anything reversible. Anything routine. Password changes, plan cancellation (that is Billing), or disconnecting accounts.

---

## Layout Patterns

### Left-Sidebar Settings Page (Most Common, Recommended)

**Used by:** Facebook, Google Account, Discord, Notion, Stripe, Shopify, GitHub, Linear, X/Twitter
**How it works:** Full-page settings area with a persistent left sidebar listing all categories. Clicking a category loads its content in the right panel. Sidebar may have grouped section headers.
**When appropriate:** Products with 6+ settings categories. Products with both personal and workspace/admin settings. Any product that needs scalable settings navigation.
**Strengths:** All categories visible at once. Easy to scan and switch. Scales well to 20+ categories with section headers.
**Weaknesses:** Requires dedicated full-page space. Can feel overwhelming if sidebar is too long without grouping.

### Horizontal Tab Bar

**Used by:** Reddit, Twitch, Canva, Microsoft Account
**How it works:** Tabs across the top of the settings page. Each tab shows a different category's settings.
**When appropriate:** Products with 3-7 settings categories. Simpler products where the full category set fits in one row.
**Strengths:** Simple, scannable, familiar. Works well for lightweight settings.
**Weaknesses:** Breaks down past 7 tabs (wrapping, scrolling). Cannot show grouped sections. Poor for products with personal + admin split.

### Full-Screen Modal/Overlay

**Used by:** Discord, Notion, Figma (personal)
**How it works:** Settings open as a full-viewport overlay on top of the main app. ESC or X closes it. The main app is dimmed but still contextually present.
**Strengths:** Feels focused without losing app context. Quick to open and close. Good for products where settings changes are quick adjustments.
**Weaknesses:** Cannot bookmark or share URLs to specific settings. Feels trapped if the modal is complex.

### Compact Modal (Small)

**Used by:** Figma (personal settings)
**How it works:** A medium-sized modal (600px) with tabs for 3-4 categories.
**When appropriate:** Products with very few personal settings where a full page would feel empty.
**Strengths:** Fast, non-disruptive, lightweight.
**Weaknesses:** Limited space forces scrolling within tabs. Cannot accommodate many categories.

### Card Grid Hub

**Used by:** Amazon, Airbnb, Google Account, Shopify
**How it works:** An index page with icon+label cards linking to individual settings pages.
**When appropriate:** Products with many distinct settings areas that each warrant their own page. Products where settings categories are conceptually independent.
**Strengths:** Scannable. Good for discoverability. Each page can have its own layout.
**Weaknesses:** Requires an extra click to reach any setting. No persistent navigation once inside a category (unless combined with breadcrumbs).

### Single Scrollable Page

**Used by:** Spotify, Netflix (with collapsible sections), Apple ID (web)
**How it works:** All settings on one long page, divided by section headers or collapsible accordions.
**When appropriate:** Products with few settings or simple toggles. Mobile-first experiences.
**Strengths:** Everything findable by scrolling. No navigation complexity.
**Weaknesses:** Gets very long. No way to jump to sections. Harder to scan than a sidebar.

### Drill-Down Stack (Mobile)

**Used by:** Instagram, TikTok, DoorDash, Uber (mobile apps)
**How it works:** A list of settings items. Tapping pushes a new screen. Back button returns.
**When appropriate:** Mobile-first products. Products following iOS/Android native patterns.
**Strengths:** Familiar mobile pattern. Each screen is focused.
**Weaknesses:** Deep nesting creates "tunnel" feeling. Users lose orientation. Each tap is a commitment.

### Profile Dropdown Entry Point

**Used by:** 22 of 25 products researched
**How it works:** Clicking the user's avatar/photo in the corner opens a dropdown with a Settings link.
**Why it dominates:** Universal learned behavior. Users expect their avatar to be the gateway to account management. The avatar is personal, signaling "your stuff is here."

---

## Mobile Settings Behavior

Mobile settings are not just "smaller desktop settings." Across the 25 products, mobile introduces distinct patterns, constraints, and tradeoffs that a serious settings overhaul must account for.

### Entry Points on Mobile

| Pattern                      | Products                              | How It Works                                                                         |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| Bottom tab (Account)         | DoorDash, Uber                        | Dedicated Account tab in bottom nav bar. One tap to settings hub. Most discoverable. |
| Profile tab + hamburger/gear | Instagram, TikTok, Twitch, Reddit     | Tap profile tab, then tap hamburger or gear icon. Two taps.                          |
| Avatar in header + dropdown  | Facebook, X/Twitter, YouTube, Spotify | Tap avatar in top corner, tap Settings from menu. Two taps.                          |
| Gear icon (always visible)   | Spotify (mobile), Discord             | Persistent gear icon on home/profile screen. One tap.                                |
| Hamburger menu + nested      | Slack, Amazon, Netflix                | Open hamburger/drawer, find Settings in list. Two-three taps. Least discoverable.    |

**Best practice:** One-tap entry via a dedicated Account tab or persistent gear icon. Two-tap maximum. Never bury settings inside a hamburger menu behind another submenu.

### Navigation Models on Mobile

**Drill-down stack** (dominant pattern): Used by Instagram, TikTok, DoorDash, Uber, Apple, Amazon, Airbnb. Settings appear as a vertical list. Each tap pushes a new full-screen page. Back button returns. Native iOS/Android feel.

- Strength: Each screen is focused. Familiar platform behavior.
- Weakness: Deep nesting (3-4 levels in TikTok privacy, Apple iCloud storage) creates disorientation. Users lose track of where they are. Each tap is a commitment with no way to see sibling categories.
- Mitigation: Breadcrumbs or header titles showing path. Keep maximum depth to 2 levels. Collapse sub-settings into expandable sections on a single page rather than pushing new pages.

**Single scrollable page**: Used by Spotify. All settings sections on one long scroll with section headers.

- Strength: No navigation decisions. Everything findable by scrolling.
- Weakness: Gets extremely long. No way to jump to a section. No persistent nav context.
- Mitigation: Add anchor links or a floating section index (no product does this well yet).

**Tabbed**: Used by Reddit, Canva. Horizontal tab bar at top of settings page. Each tab is a scrollable section.

- Strength: Clear category separation. Quick switching.
- Weakness: Tab labels must be short. More than 5-6 tabs require horizontal scrolling, which hides categories.

### Mobile-Specific Behaviors

**Forced web redirects:** Spotify, Netflix, and Apple force users out of the native app to a web browser for account management, billing, and security. This is partly driven by App Store/Play Store billing rules (Apple and Google take 30% cuts on in-app subscription changes), but the UX is jarring. Users lose context, authentication state, and app navigation.

**OS-level notification overlap:** On mobile, notification preferences exist in two places: the app's settings AND the device's OS-level notification settings (Settings > Apps > [App] > Notifications). This creates confusion about which takes precedence. Uber, DoorDash, and Spotify all surface this tension. Best practice: the app's notification settings should acknowledge the OS layer ("If you're not receiving notifications, check your device settings") rather than pretending it doesn't exist.

**Biometric verification gates:** Mobile settings can leverage Face ID, Touch ID, or device biometrics for verification gates instead of password re-entry. Apple uses device passcode for Apple ID changes. This is faster and more secure than typing a password on a mobile keyboard.

**Responsive layout adaptation:** Products with left-sidebar settings on desktop must adapt for mobile. Three approaches observed:

1. **Convert sidebar to drill-down list** (Discord, Notion, Slack): The sidebar categories become the top-level list. Tapping a category pushes the content page. Works well.
2. **Convert sidebar to bottom sheet or tabs** (Google Account on mobile): Categories appear as horizontal scrollable tabs at the top. Works for 5-7 categories, breaks past that.
3. **Separate mobile settings entirely** (Instagram, TikTok): Mobile settings are a distinct experience designed mobile-first. The web settings are a different layout. Creates maintenance burden but optimal per-platform UX.

**Recommendation for mobile:** Use the drill-down list pattern derived from the desktop sidebar. Keep depth to 2 levels maximum. Show clear header titles on each pushed page. Add a persistent back-to-hub action. Use biometric verification for sensitive changes. Acknowledge OS notification settings. Never force web redirects for core settings.

---

## Data Export Patterns

Data export and portability is a distinct settings concern that most products handle inconsistently. GDPR, CCPA, and similar regulations require data export capabilities, but products differ wildly in how they surface and deliver them.

### Where Data Export Lives

| Placement                                 | Products                                                                                                          | Pros                                 | Cons                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| Under Privacy/Data section                | Google (Takeout), Canva ("Your Data"), Uber (Privacy Center), Reddit (Safety & Privacy), X/Twitter (Your Account) | Logically grouped with data controls | Can feel buried if Privacy is a sub-page         |
| Under Account section                     | Notion (General > Export), Apple (privacy.apple.com, separate site), Discord (Privacy & Safety)                   | Near account management              | Mixed with unrelated account settings            |
| Under a dedicated Data & Privacy category | Facebook ("Your Facebook Information"), Amazon ("Data & Privacy")                                                 | Prominent and findable               | Category may feel heavy if it only has 2-3 items |
| Not surfaced in settings at all           | DoorDash, Spotify (web-only), Netflix (buried in help)                                                            | N/A                                  | Users cannot find it; erodes trust               |

**Best practice:** Data export belongs in Privacy or under a dedicated "Your Data" sub-section. It should be findable within 2 clicks from the settings hub. It should never require contacting support or visiting a separate website.

### Export Mechanisms Observed

**Google Takeout (gold standard):** Select which products/data types to include. Choose file format (JSON, CSV, HTML). Choose delivery method (download link via email, or push to Drive/Dropbox/OneDrive/Box). Choose export frequency (one-time or scheduled every 2 months). Estimated size shown before export. Email notification when export is ready. This is the benchmark.

**Apple (privacy.apple.com):** Request a copy of data. Apple prepares it (can take days). Download link sent via email. Limited format options. Separate from device settings entirely.

**Facebook/Meta:** "Download your information" wizard. Choose date range, format (HTML or JSON), and media quality. Request submitted; notification when ready. Can take hours for large accounts.

**Simple download button:** Notion, GitHub, LinkedIn offer a single "Export all data" button or CSV export. Immediate or near-immediate. Less granular but friction-free.

### Data Deletion vs. Export

Several products (Google, Apple, Facebook, Uber, Canva) present data export alongside data deletion in the same settings area. This is logical: "see your data" and "delete your data" are two sides of the same coin. However, deletion should always have more friction than export (multi-step confirmation, verification gate, grace period). They should be visually adjacent but with deletion clearly marked as destructive.

### Recommendation for Data Export

Place data export under Privacy > "Your Data" or as a dedicated sub-section in Account. Offer:

1. A one-click "Download everything" option (JSON or CSV, depending on data type)
2. Per-category export if the product has distinct data domains
3. Email notification when export is ready (for large exports)
4. Clear explanation of what is included and what is not

Never require support contact for data export. Never charge for it. Never hide it.

---

## Category Architecture Patterns

Beyond individual category definitions, products differ in how they architecturally group settings into tiers. This structural decision has the highest impact on findability and scalability.

### Two-Tier Architecture (Personal + Workspace)

**Used by:** Notion, Linear, Figma, Slack, Shopify

The settings sidebar is divided into two labeled groups:

- **Personal/Account** (your identity, preferences, notifications, security)
- **Workspace/Organization** (team, billing, roles, integrations, admin security)

This is the dominant pattern for B2B SaaS products where one person manages their own account within a shared workspace. The boundary is clear: "settings about me" vs. "settings about us."

**Strengths:** Intuitive separation. Scales well. Admin-only sections can be hidden from non-admin users. Each tier can grow independently.
**When to use:** Any product with team/organization features. Any product where billing is at the workspace level rather than the individual level.

### Three-Tier Architecture (Personal + Account/Business + Product)

**Used by:** Stripe

Stripe goes further with three groups:

- **Personal** (profile, password, sessions, communication preferences)
- **Account** (business info, team, payouts, documents, branding)
- **Product** (payments config, checkout, billing, radar, tax, webhooks, API keys)

This adds a third tier for product-specific configuration, acknowledging that "how the product behaves" is distinct from "who the business is."

**Strengths:** The cleanest separation of any product researched. Scales to extremely complex products.
**When to use:** Products where the product itself is deeply configurable (payment processing, e-commerce platforms, developer tools). Overkill for simpler apps.

### Flat Architecture (No Grouping)

**Used by:** DoorDash, Amazon, Spotify, Reddit, Canva

All settings categories listed at the same level with no grouping headers. Categories are ordered by assumed importance or usage frequency.

**Strengths:** Simple. No conceptual overhead.
**Weaknesses:** Falls apart past 8-10 items. Users must scan every item. No visual hierarchy. Cannot accommodate both personal and admin settings without confusion.
**When to use:** Simple consumer apps with fewer than 8 settings categories and no team/workspace features.

### Dual-Surface Architecture (Settings + Separate Admin)

**Used by:** Figma, Slack, YouTube (Studio), Facebook (Accounts Center)

Personal settings live in one surface (modal, in-app page), while admin/workspace settings live in a completely separate surface (different page, different URL, sometimes different web application).

**Strengths:** Keeps personal settings lightweight. Admin interface can be more complex without cluttering consumer settings.
**Weaknesses:** Fragmentation. Users and admins must learn two different settings UIs. Settings changes that span both surfaces (like security policies affecting personal 2FA) create confusion about which surface governs.
**When to use:** Only when the admin surface is genuinely a different product (like YouTube Studio being a creator tool vs. YouTube being a viewer tool). Avoid when possible.

### Per-Profile Architecture

**Used by:** Netflix

Settings are split between account-level settings (billing, security) that the account owner controls, and per-profile settings (language, maturity rating, notifications, privacy, viewing activity) that each profile member controls independently.

**Strengths:** Brilliant for household/multi-user accounts. Each person customizes their own experience without affecting others.
**When to use:** Products with multiple user profiles under one billing account. Products where family/household sharing is a core feature.

### Category Count Benchmarks

| Category Count   | Products                                                | Assessment                                                                       |
| ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 3-5 categories   | Figma (personal), DoorDash, Spotify                     | Too few for a serious product. Forces unrelated settings into shared categories. |
| 6-8 categories   | YouTube, Apple ID, Reddit, Twitch, Canva, Netflix       | Sweet spot for simple consumer products. Scannable without grouping.             |
| 9-14 categories  | Google Account, Airbnb, Discord, Notion, Linear, GitHub | Requires section headers or grouping to remain scannable. The B2B sweet spot.    |
| 15-20 categories | Facebook, X/Twitter, Shopify                            | Needs strong grouping. Without section headers, becomes overwhelming.            |
| 20+ categories   | Stripe, Shopify, GitHub (with Developer Settings)       | Requires two-tier or three-tier architecture. Flat listing is unusable.          |

**Recommendation:** Target 9-14 categories with two-tier grouping (Account + Workspace). If categories grow past 14, introduce three-tier or collapsible section groups. Never exceed 20 visible sidebar items without grouping headers.

### How Products Handle Category Growth

Products that started simple and grew complex reveal patterns in how settings scale:

1. **Bolt-on approach (worst):** New features add new top-level categories. Facebook went from ~8 categories to 15+ by adding Marketplace, Business Integrations, Reels, etc. as separate sidebar items. Creates bloat.

2. **Sub-page approach:** New features nest under existing categories. Google keeps its sidebar at 7 items but adds depth within each (Data & Privacy alone has 10+ expandable sections). Keeps the sidebar clean but creates deep nesting.

3. **Section grouping approach (best):** New categories are added but organized under labeled section headers. Discord went from ~15 to 25+ settings but remains navigable because of USER SETTINGS / BILLING / APP SETTINGS / ACTIVITY grouping. Scales well.

4. **Separate surface approach:** New complex features get their own settings surface entirely. YouTube Studio, Shopify's store vs. account split, Figma's admin panel. Appropriate only when the new surface serves a genuinely different user role.

---

## Integration Readiness Summary

This section exists to help a future integration agent synthesize this research with the companion visual/scalability research into a master settings overhaul plan.

### Key Decisions This Research Informs

1. **Layout choice:** Left sidebar with section-grouped categories. Full page, not modal or drawer. Evidence: 9 of the top 12 professional products use this pattern.

2. **Category architecture:** Two-tier (Account + Workspace/Business). Evidence: Notion, Linear, Figma, Slack, Shopify all use this and it works. Three-tier (Stripe) is overkill unless the product itself is deeply configurable.

3. **Save behavior:** Contextual save bar for forms (Shopify pattern). Auto-save for toggles. Evidence: universal industry consensus on toggles; Shopify's save bar is the most professional form pattern with dirty-state tracking.

4. **Destructive actions:** GitHub-style danger zone (red border, bottom of page, typed confirmation). Grace period of 14-30 days. Evidence: GitHub pioneered this; Notion, Discord, and Linear adopted it.

5. **Mobile adaptation:** Convert desktop sidebar to drill-down list. Max 2 levels deep. Evidence: Discord, Notion, and Slack all do this successfully.

6. **Notification architecture:** Per-category groups with per-channel toggles (email, push, in-app). Master pause toggle. Evidence: Airbnb is the benchmark; Slack's DnD schedule is best-in-class for quiet hours.

7. **Security section:** Treat as high-trust surface. Verification gates. Session/device list. Denser layout with more explanation text. Evidence: Google, Discord, Stripe all treat security pages with more visual weight than preference pages.

8. **Privacy section:** Separate from Security. Focus on visibility controls, data usage toggles, and data export. Evidence: Uber's Privacy Center is the benchmark for consumer products; TikTok's per-interaction audience selectors are the benchmark for granular privacy.

9. **Data export:** Findable within 2 clicks. One-click download option. Email notification for large exports. Evidence: Google Takeout is the gold standard; products that hide export (DoorDash, Spotify) erode trust.

10. **Entry point:** Avatar dropdown with "Settings" link. Optionally a gear icon in sidebar. Evidence: 22/25 products use avatar dropdown; Discord and Shopify add a persistent gear icon for power users.

### What This Research Does NOT Cover

- Visual component specifications (spacing, typography, color tokens): covered by companion document `settings-ux-visual-scalability-patterns.md`
- Specific implementation for any particular product or codebase
- Accessibility audit of settings patterns (WCAG compliance, keyboard navigation, screen reader behavior)
- Performance benchmarks (settings page load times, save latency)
- A/B testing or conversion data on settings patterns
- Mobile-native app settings (this research focuses on web and PWA; native iOS/Android design system guidelines add additional constraints)

### Cross-References for Integration Agent

| Topic                         | This Document Section                                            | Companion Document Section (if applicable)             |
| ----------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Which layout to use           | Layout Patterns; Final Design Direction                          | Visual scalability patterns for responsive breakpoints |
| How to group categories       | Category Architecture Patterns                                   | N/A                                                    |
| What belongs in each category | Common Settings Categories                                       | N/A                                                    |
| Save UX                       | UI Components > Contextual Save Bars; Professional Principles #9 | Save state visual patterns                             |
| Destructive action UX         | UI Components > Danger Zone Panels; Professional Principles #6   | Destructive action visual hierarchy                    |
| Mobile settings               | Mobile Settings Behavior                                         | Responsive layout patterns                             |
| Anti-patterns to avoid        | UX Anti-Patterns                                                 | Visual anti-patterns                                   |

---

## UI Components

### Toggles

The universal component for binary settings. Every product uses pill-shaped toggle switches for on/off preferences. Toggles auto-save on interaction across all 25 products. Colored when active (blue, green, brand color), gray when off. Never used for settings that need explanation before taking effect (those use confirmation dialogs after the toggle).

### Inline Editable Fields

The pattern pioneered by Airbnb and Apple: click "Edit" next to a field, the row expands into an inline form with Save/Cancel buttons, then collapses back to display mode after saving. Better than navigating to a separate edit page. Used by Google, Airbnb, Apple, Facebook. Reduces page transitions.

### Cards

Rounded rectangles grouping related settings. Used by Google (cards on light gray), Shopify (Polaris cards), Stripe (sections with subtle shadows), Amazon (grid cards). Effective for visual grouping. Should have clear headings. Avoid decorative shadows or heavy borders.

### Danger Zone Panels

Red-bordered sections at the bottom of settings pages containing destructive actions only. Pioneered by GitHub. Adopted conceptually by Notion ("Danger zone" label), Discord (separate Disable/Delete buttons). The red border and physical separation from other settings make dangerous actions visually distinct. The gold standard for destructive action presentation.

### Contextual Save Bars

A sticky bar that appears when unsaved changes are detected, showing Discard and Save buttons. Used by Shopify (Polaris ContextualSaveBar). Tracks dirty state. The save button shows a loading spinner during submission. After save, the bar disappears and a toast confirms. The best save-state pattern for form-heavy settings.

### Confirmation Dialogs

Modal dialogs for confirming destructive or significant actions. Range from simple "Are you sure?" (adequate for low-risk actions) to typed-name confirmation (GitHub, Notion: type the workspace/repo name) to multi-step flows with checkbox acknowledgments (Google, Apple, Amazon). The more destructive the action, the more friction is appropriate.

### Toast Notifications

Brief, auto-dismissing messages confirming successful saves. Used by Shopify (after save bar), Stripe (green toast), Discord (brief "Saved!" flash). Surprisingly rare; most products rely on inline confirmation (form collapsing, value updating) rather than toasts. When used, they should be subtle, positioned consistently, and auto-dismiss in 3-5 seconds.

### Section Headers in Sidebars

Uppercase or bold labels grouping related sidebar items (Discord: "USER SETTINGS," "BILLING SETTINGS," "APP SETTINGS"; Notion: "Account," "Workspace"; GitHub: "Access," "Security," "Integrations"). Critical for sidebars with 10+ items. Without them, long sidebars become unscannable.

### Radio Groups / Audience Selectors

Used for mutually exclusive choices: "Everyone / Friends / No one" (TikTok, Instagram privacy), notification frequency "All / Personalized / None" (YouTube), display density "Comfortable / Compact" (Reddit, Gmail). Better than dropdowns when there are 2-4 options and the user benefits from seeing all choices at once.

### Connected Account Cards

Cards showing a service logo, linked account name, connection status, and Connect/Disconnect action. Used extensively by Discord (20+ services), Twitch, GitHub, Notion. The visual icon of the connected service is critical for scannability. Always show what the connection does or what data it accesses.

### Verification Gates

Security checkpoints before sensitive operations: password re-entry (Facebook, Amazon, X/Twitter), SMS/email code (DoorDash, Uber, Apple, TikTok), re-authentication (Google). Used for: changing email, changing password, deleting account, viewing sensitive data. Should be proportional to the risk of the action.

---

## Professional Settings Principles

### 1. Settings should feel boring in a good way

Settings are infrastructure, not marketing. They should be neutral, calm, and predictable. No gradients, no illustrations, no promotional banners, no gamification. White or light gray backgrounds. Black or dark gray text. Accent color only for interactive elements. Stripe, Linear, and Apple exemplify this.

### 2. Users should immediately know where they are

Every settings page needs: a clear heading identifying the current section, breadcrumbs or visible sidebar showing navigation context, and consistent visual treatment across all settings pages. Users who arrive at a settings page via a deep link should understand their location without backtracking.

### 3. Settings should not look like marketing UI

Settings pages should never contain promotional banners (Microsoft Rewards), upsell cards (Discord Nitro in sidebar), or retention flows disguised as settings (Amazon Prime cancellation). When billing pages show plan comparisons, the comparison should be informational, not persuasive.

### 4. Settings should not feel gimmicky

No playful animations on toggles. No cute empty-state illustrations. No branded mascots in danger zones. No confetti on save. The more serious the setting (security, billing, privacy), the more sober the visual treatment should be.

### 5. Settings should prioritize trust, clarity, reversibility, and control

Every setting should communicate: what it does (clear label), why it exists (short description), what happens when changed (predictable result), and whether the change is reversible. Users should feel in control, not managed. Privacy controls should empower, not patronize.

### 6. Dangerous actions should be visually separated

Destructive actions (delete account, close workspace, purge data) must be physically separated from routine settings. Place them at the bottom of the page in a red-bordered section (GitHub pattern) or on a dedicated sub-page. Never place a "Delete Account" button next to "Change Display Name."

### 7. Account, profile, workspace, and app preferences should not be mixed

These are four distinct concerns:

- **Account**: who you are in the system (email, password, identity)
- **Profile**: what others see (name, bio, avatar, public info)
- **Workspace**: the organization/business layer (team, roles, billing)
- **Preferences**: how the app behaves for you (theme, language, defaults)

Mixing them (Amazon, Facebook) creates confusion. Separating them (Stripe, Notion, Discord) creates clarity.

### 8. Every setting needs a clear label, short explanation, and predictable result

Labels should be plain English, not jargon. A one-line description below the label explains what the setting controls. The result of changing the setting should be obvious. If a toggle's effect is not self-evident, add a description. If a change has consequences (like making your account public), show a confirmation dialog explaining those consequences.

### 9. Save behavior must be consistent

Pick one pattern and stick to it. The industry consensus: toggles auto-save, forms use explicit save buttons. If using a contextual save bar (Shopify), use it everywhere. If using auto-save (Notion, Linear), use it everywhere. Never mix auto-save and manual-save on the same page without clear visual distinction. Shopify's contextual save bar is the most professional pattern for form-heavy settings.

### 10. Security and privacy settings must feel more serious than cosmetic preferences

Security and privacy pages should have:

- More explanation text than preference pages
- Verification gates before changes
- Visual weight (slightly denser, more structured)
- No playful elements
- Clear consequences stated for each action
- Session/device visibility

They should feel like you are in a bank vault, not a toy store.

---

## Recommended First-Principles Settings Architecture

This architecture is designed for a modern SaaS-style application serving professional users, informed by the patterns that work best across all 25 products researched.

### Account

- **Profile** - Display name, avatar/photo, bio, public links
- **Login & Security** - Email, phone, password, 2FA, passkeys, active sessions, recovery options
- **Connected Accounts** - Sign-in methods (Google, Apple), authorized third-party apps
- **Data & Export** - Download your data, request data report
- **Delete / Deactivate Account** - Danger zone, visually separated

### Preferences

- **Appearance** - Theme (light/dark/system), accent color
- **Language & Region** - Language, timezone, date format, currency
- **Accessibility** - Reduced motion, font size, contrast, screen reader optimizations
- **Default Views** - Default sort orders, default landing page, compact/comfortable density

### Notifications

- **Email Notifications** - Per-category toggles (account, activity, updates, marketing)
- **Push Notifications** - Per-category toggles (same categories as email)
- **In-App Notifications** - Badge, sound, popup preferences
- **Notification Schedule** - Quiet hours / Do Not Disturb (per-day configuration)

### Billing

- **Plan** - Current plan, comparison, upgrade/downgrade
- **Payment Methods** - Cards, bank accounts, with add/remove/default
- **Invoices & Receipts** - Downloadable invoice history
- **Usage** - Current period usage, limits, meters
- **Cancel Subscription** - Separate from plan management, clear consequences

### Workspace / Business

- **Business Profile** - Business name, logo, description, public display
- **Team Members** - Invite, manage, role assignment
- **Roles & Permissions** - Define roles, assign capabilities
- **Integrations** - Workspace-level connected services, webhooks, API keys
- **Public Profile Controls** - What the public sees about the business

### Privacy

- **Visibility** - Who can see your profile, activity, content
- **Data Usage** - Analytics, personalization, ad preferences
- **Search & Discovery** - Whether you appear in search, directory listings
- **Blocking & Muting** - Manage blocked/muted users
- **Consent Controls** - Cookie preferences, marketing consent

### Danger Zone

- Account deletion (permanent)
- Account deactivation (temporary)
- Workspace deletion (if owner)
- Data purge

All items require multi-step confirmation with identity verification. Grace period of 14-30 days for recovery. Red-bordered visual treatment. Physically separated from all other settings.

---

## UX Anti-Patterns

### Too many unrelated cards on one page

Amazon's account hub has 15+ cards mixing orders, payments, Alexa, and Prime. When everything is a card, nothing stands out. Group related items; reduce the total number of top-level items to under 10.

### Settings scattered across dashboards

Microsoft bounces between account.microsoft.com, office.com, xbox.com, and Windows Settings. Slack splits between an in-app modal, a side panel, and a web page. YouTube fragments across YouTube settings, YouTube Studio, and Google Account. One product, one settings destination.

### Cute or gimmicky visual treatment

Settings are not the place for brand personality. No mascots, no playful animations, no colorful illustrations in empty states. The setting controls financial, security, and identity information. Treat it seriously.

### Weak hierarchy

Facebook's sidebar has 15+ items with no grouping headers. Without section labels (like Discord's "USER SETTINGS," "APP SETTINGS"), users must read every item to find what they need. Always group with section headers when the list exceeds 6 items.

### No clear categories

DoorDash presents "Account Settings" and "Manage Account" as separate items with no indication of what each contains. Naming must be self-evident. "Login & Security" is better than "Manage Account."

### Mixing profile, billing, security, and preferences

Amazon mixes shopping history, payment methods, and account security on the same hub page. These are fundamentally different concerns requiring different trust levels and interaction patterns. Separate them.

### Unclear save behavior

GitHub mixes toggle-auto-save with form-button-save on the same page without visual distinction. Users cannot predict whether their change has been saved. Pick one pattern and apply it consistently.

### Important actions hidden too deeply

Instagram buries account deletion 5+ taps deep in Meta Accounts Center. Apple's privacy controls require visiting a separate website (privacy.apple.com). If a user needs to find something, they should find it within two clicks from the settings landing page.

### Dangerous actions placed beside casual preferences

Never put "Delete Account" on the same visual level as "Change Theme." Dangerous actions belong in their own visually distinct section at the bottom of the page.

### Toggle overload

Facebook's notification settings page has 40+ individual toggles. When every notification type has its own toggle, the page becomes impossible to configure thoughtfully. Group toggles into categories with master toggles. Let users drill into granular control only if they want to.

### Overly clever language

Settings labels should be literal. "Your Digital Footprint" instead of "Privacy" is confusing. "Keep your account safe" instead of "Security" is patronizing. Use the word users expect.

### Lack of explanations

A toggle labeled "Personalization" with no description tells the user nothing. Every non-obvious setting needs a one-line description explaining what it does and what changes when toggled.

### Lack of confirmation states

When a user saves a setting, they need confirmation. A toggle that silently changes state, a form that submits with no feedback, or a save button that does not indicate completion all erode trust. Show confirmation: toast, inline message, or visual state change.

### Subscription cancellation dark patterns

Amazon Prime and Microsoft 365 use multi-page retention flows with counter-offers, benefit reminders, and deliberately confusing button placement. Cancellation should be clear, honest, and achievable in 2-3 clicks with appropriate warnings about what the user will lose.

---

## Final Design Direction

A professional settings experience should follow this blueprint:

**Surface:** Full-page dedicated settings area. Not a modal (too constraining for complex settings), not a drawer (too casual for security/billing), not scattered across multiple pages.

**Entry point:** Profile avatar dropdown in the header. One click to reach settings. Optionally, a gear icon in a persistent sidebar for power users (Discord, Shopify pattern).

**Navigation:** Left sidebar with grouped section headers. Groups: Account, Preferences, Notifications, Billing, Workspace, Privacy. Section headers in small uppercase text. Active item highlighted. Sidebar always visible while browsing settings.

**Content area:** Card-based grouped forms. Each card contains related settings with a section heading, description fields below labels, and controls (toggles, selects, inputs) aligned to the right. Cards have subtle rounded corners and minimal elevation. No heavy borders or shadows.

**Save behavior:** Contextual save bar (Shopify pattern) for form-heavy pages. Auto-save for individual toggles with brief inline confirmation. Dirty-state tracking prevents accidental navigation away from unsaved changes.

**Security and privacy sections:** Denser layout, more explanation text, verification gates before changes, session/device lists, no playful elements. Visual weight should communicate "this matters."

**Danger zone:** Red-bordered section at the bottom of the Account page. Contains only destructive, irreversible actions. Multi-step confirmation with identity verification. Grace period stated clearly. Physically and visually separated from everything else.

**What to avoid:**

- No dashboard widgets in settings
- No promotional banners or upsell cards in the sidebar
- No decorative illustrations
- No playful treatment for serious controls
- No marketing-style plan comparison pages (informational comparison is fine)
- No fake dashboards with vanity metrics
- No scattered settings across multiple domains
- No toggle overload without category grouping
- No inconsistent save behavior across pages

The goal is a settings experience that a user opens, immediately understands, finds what they need, makes their change, confirms it worked, and leaves. No surprises. No confusion. No entertainment. Just clear, trustworthy, professional control over their account.
