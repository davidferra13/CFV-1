# Exit Eval: Partner / REFERRAL GENERATION & EXTERNAL DISCOVERY

> Wave 5 | Scenarios #42-#46 | Role: PARTNER
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #42: Share chef referral link with a guest

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner has a guest (in-person at their venue, in a chat, or via email) who just had a great experience and asks "who was that chef?" The partner needs to hand over a link or card that leads the guest to the chef's booking surface. The act of sharing happens in the guest's native channel (text, WhatsApp, email, QR scan) which ChefFlow cannot replace.

**Context ChefFlow has:**

- Chef public profile URL (`/chef/[slug]`)
- Chef inquiry page (`/chef/[slug]/inquire`)
- Partner-to-chef relationship (tenant_id, partner record)
- QR code generation library (`lib/qr/qr-code.ts` with `getInquiryQrUrl()`)
- URL shortener (`lib/links/url-shortener.ts`)
- Partner share token system (`referral_partners.share_token`)
- Guest lead capture system (`guest_leads` table, `lib/guests/lead-actions.ts`)
- Embeddable inquiry widget (`app/api/embed/inquiry/route.ts`)

**Data source?** No. The external tool is the communication channel itself (SMS, email, WhatsApp, social DM). These are delivery mechanisms, not data sources.

**Client-collaborative angle:** The guest is the recipient here, not a data provider. However, the guest lead form (`/g/[code]`) already captures interest after events. A partner-specific referral URL could carry attribution automatically so the partner never has to explain who referred whom.

**Physical reality:** High physical relevance. Partner hands guest a card at the venue, shows a QR code on their phone, or texts a link while standing in the kitchen. Printed QR cards (table tents, fridge magnets, welcome binders) are the primary interface. Screen-based sharing is secondary.

**Compounding:** High. A single well-crafted referral card generates leads for years. Every venue partner who has a printed card in their welcome binder generates passive referrals indefinitely. Attribution data compounds into partner performance analytics.

**Solution design:**

- Generate partner-attributed referral URL: `/chef/[slug]/inquire?ref=[partner_token]` that auto-tags the inquiry with `referral_source = partner:[id]`
- Add "Copy Referral Link" and "Download QR Card" actions to the partner portal dashboard
- Build a printable referral card PDF (chef photo, QR code, inquiry URL, partner attribution) using existing `getQrCodeUrl()` + `downloadQrCode()` from `lib/qr/qr-code.ts`
- Track click-through and conversion from partner-attributed links in `referral_records`
- Show partner their referral link performance on the dashboard (clicks, inquiries generated)

**Where it appears:**

- Partner portal dashboard (primary action: "Share Chef" button with copy link + QR download)
- Partner portal profile/preview page (secondary)
- Chef-side partner detail page (generate/regenerate partner referral materials)

**What remains as permanent exit:**
The actual act of sharing (texting the link, printing the card, posting in a WhatsApp group) will always happen outside ChefFlow. ChefFlow's job is to make the shareable asset perfect, attributable, and instantly available.

**Priority:** Daily (venues hand out referrals regularly) x Low effort (QR + link infra already exists) = **HIGH**
**Spec needed?** No (small feature, uses existing primitives)

---

## Scenario #43: Promote chef on partner website

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why partner leaves:** The partner wants to feature the chef on their own website (Squarespace, Wix, WordPress, Linktree, Airbnb listing). They need a way to present the chef professionally: a description block, booking link, maybe a photo. They leave to edit their CMS, which ChefFlow cannot replace.

**Context ChefFlow has:**

- Chef public profile data (name, bio, photo, tagline, slug)
- Chef inquiry URL (`/chef/[slug]/inquire`)
- Embeddable inquiry widget already exists (`app/api/embed/inquiry/route.ts` with full CORS support)
- Partner showcase data (description, cover image)
- UTM tracking support on embed widget (`utm_source`, `utm_medium`, `utm_campaign` fields)
- Chef availability signals (`getPublicAvailabilitySignals`)

**Data source?** No. The partner's website CMS is a destination, not a source. ChefFlow generates the content to be placed there.

**Client-collaborative angle:** Minimal. The partner decides where and how to promote. However, ChefFlow can pre-build the promotional content so the partner just copies and pastes.

**Physical reality:** Desktop/laptop workflow. Partner is editing their website, not in a kitchen. Copy-paste and embed code are the natural interfaces.

**Compounding:** High. Once a partner embeds a chef widget or referral block on their site, it generates passive leads permanently. The embed already handles full inquiry creation including Dinner Circle auto-creation and Remy AI scoring.

**Solution design:**

- Generate "Embed Code" snippet from partner portal: pre-configured `<iframe>` or `<script>` tag pointing to `/api/embed/inquiry` with `chef_id` + `utm_source=partner_[name]` pre-filled
- Provide a "Copy Promotional Block" with chef bio, photo URL, and booking link formatted for easy CMS paste
- Add a "Website Badge" (small HTML/image link) option for simpler integrations (Linktree, social bio links)
- Track embed performance by UTM attribution already supported in the embed widget

**Where it appears:**

- Partner portal: new "Promote" or "Marketing Materials" section
- One-click copy for: embed code, promotional text block, badge/button HTML
- Partner dashboard: show "website referrals" metric from UTM-tagged inquiries

**What remains as permanent exit:**
Partner will always leave to paste content into their own CMS. ChefFlow's job is to make what they paste perfect, up-to-date, and tracked.

**Priority:** Weekly (partners update websites periodically) x Medium effort (embed exists, need UI for code generation) = **MEDIUM-HIGH**
**Spec needed?** No (extend existing embed infrastructure)

---

## Scenario #44: Mention chef in host guidebook

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why partner leaves:** Airbnb hosts, VRBO hosts, and venue managers maintain physical or digital guidebooks for guests. They want to mention the chef as an available service: "Want a private chef? Contact [chef name]." The guidebook is a printed binder, Airbnb's digital guidebook editor, or a PDF. ChefFlow cannot edit these surfaces.

**Context ChefFlow has:**

- Chef name, tagline, bio, profile photo
- Chef inquiry URL and QR code generation
- Partner-location relationship (knows which venue this guidebook serves)
- Location-specific service history (events at this venue)
- Printable asset generation capability (QR cards via `lib/qr/qr-code.ts`)

**Data source?** No. Airbnb guidebook and printed binders are destinations for ChefFlow content.

**Client-collaborative angle:** The guest discovering the chef through the guidebook becomes the collaborative party. If the guidebook contains a QR code linking to the chef's inquiry page, the guest self-serves into ChefFlow's inquiry pipeline with full attribution.

**Physical reality:** High. The primary use case is a printed card or page insert for a physical binder. Secondary is copy-paste text for Airbnb's digital guidebook editor. Partners need: (1) a one-paragraph description ready to paste, (2) a printable card/page with QR code and URL, (3) a photo of the chef they can upload to the guidebook.

**Compounding:** Very high. A guidebook entry generates leads for years. Every guest who stays at the property sees it. The same card serves hundreds of future guests.

**Solution design:**

- Generate "Guidebook Insert" from partner portal: a printable half-page PDF with chef photo, short bio, QR code to inquiry page, and partner attribution token
- Provide "Guidebook Text" block: one paragraph ready to paste into Airbnb/VRBO digital guidebook editors
- Include chef's public profile photo URL for easy upload to digital guidebooks
- Pre-fill UTM: `utm_source=guidebook&utm_medium=print&utm_campaign=partner_[name]`
- Track conversions from guidebook-attributed inquiries on partner dashboard

**Where it appears:**

- Partner portal: "Guidebook Materials" or "Marketing Kit" section
- Printable PDF download (half-page or full-page card)
- Copyable text snippet for digital guidebooks
- Chef photo URL for easy download/upload

**What remains as permanent exit:**
Partner will always leave to physically insert the card into a binder or paste text into Airbnb's guidebook editor. ChefFlow provides perfect materials; the partner places them.

**Priority:** One-time setup per venue (then passive) x Low effort (PDF generation + text template) = **MEDIUM**
**Spec needed?** No (part of broader "partner marketing kit" feature alongside #42 and #43)

---

## Scenario #45: Track lead before it becomes inquiry

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** A partner hears from a guest "I might want a chef for my anniversary next month" but the guest hasn't formally inquired yet. The partner wants to log this warm lead so they don't forget, and so the chef knows it's coming. Currently the partner portal has no way to submit a referral or lead. They go to a spreadsheet, notes app, or text the chef.

**Context ChefFlow has:**

- `guest_leads` table with full schema (name, email, phone, message, status, event_id, tenant_id, source)
- Guest lead form already exists (`components/guest-leads/guest-lead-form.tsx`, `lib/guests/lead-actions.ts`)
- `referral_records` table (partner_id, client_id, event_id, revenue_cents, notes, referred_at)
- Chef-side leads page (`app/(chef)/leads/page.tsx`) with status management
- Partner portal authenticated session (`requirePartner()`)
- Notification system for new leads (already fires for guest-submitted leads)

**Data source?** No. The lead information lives in the partner's memory or a conversation. ChefFlow should be the destination for that knowledge.

**Client-collaborative angle:** The guest is the lead. If the partner submits their name/email, ChefFlow can follow up directly (with chef approval) or at minimum have the lead ready when the guest does inquire, enabling instant attribution.

**Physical reality:** Screen-based. Partner is at their desk or on their phone after a conversation. Quick form submission is the natural interface. Could also be voice (partner tells Remy via the portal).

**Compounding:** High. Every lead logged creates attribution history. Over time, ChefFlow builds a complete picture of which partners generate leads, how many convert, and the revenue they drive. This feeds the partner leaderboard (`PartnerLeaderboardEntry` in `lib/partners/analytics.ts`) and referral performance page (`app/(chef)/partners/referral-performance/page.tsx`).

**Solution design:**

- Add "Submit a Referral" form to partner portal dashboard: name, email (optional), phone (optional), occasion/notes, approximate date
- On submission: create a `guest_leads` row with `source = 'partner_referral'` and link to the partner via a new `source_partner_id` column (or use the existing `referral_records` table)
- Notify chef of new partner-submitted lead (reuse existing notification pattern from `submitGuestLead`)
- Show partner their submitted leads and their current status (new, contacted, converted, archived) in a "My Referrals" tab
- When the lead converts to an inquiry/event, auto-create the `referral_records` entry for revenue attribution

**Where it appears:**

- Partner portal dashboard: "Submit a Referral" primary action button
- Partner portal: new "My Referrals" page showing submitted leads + status
- Chef leads page: partner-submitted leads marked with partner attribution badge
- Partner report: converted referrals show in contribution metrics

**What remains as permanent exit:**
Nothing. This scenario is fully reducible. The partner currently leaves because the portal lacks this form. Adding it eliminates the exit entirely.

**Priority:** Weekly (partners have warm leads regularly) x Low-medium effort (form + DB wiring, existing patterns) = **HIGH**
**Spec needed?** Yes (requires partner portal form, new DB relationship, status visibility, and attribution wiring)

---

## Scenario #46: Compare chef with other vendors

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** A partner (venue, concierge, event planner) maintains relationships with multiple service providers, not just this chef. When a guest asks for a recommendation, the partner may compare chefs based on availability, cuisine style, price range, or guest count capacity. They check Google, Instagram, their own vendor list, or a planner tool to decide who to recommend.

**Context ChefFlow has:**

- This specific chef's profile, pricing, availability, cuisine types, service formats
- This chef's event history at the partner's locations
- Partner's relationship with this chef (commission terms, event count, performance metrics)
- Chef public profile data (service types, price range, guest count ranges)
- Vendor comparison infrastructure exists on the chef side (`lib/ai/vendor-comparison.ts`) but is for chef-to-vendor comparisons, not partner-to-chef comparisons

**Data source?** Partially. The "other vendors" data lives in the partner's own network/memory. ChefFlow only knows about THIS chef. It cannot source competitor data without becoming a marketplace (explicitly not the product vision per `memory/project_openclaw_chefflow_separation.md`).

**Client-collaborative angle:** None directly. The guest triggers the comparison by asking "who do you recommend?" but the decision is the partner's.

**Physical reality:** Desktop or phone. Partner is reviewing their contacts/notes or searching online. No kitchen or hands-free needs.

**Compounding:** Low for ChefFlow. The partner's vendor knowledge compounds in their own systems. ChefFlow can only make THIS chef's case stronger by showing the partner proof of performance (events hosted, guest satisfaction, reliability).

**Solution design:**

- Surface "Partner Positioning Notes" field on partner profile: chef can write a brief "why recommend me" note visible to the partner (elevator pitch, differentiators)
- Show chef performance proof on partner dashboard: success rate, on-time record, guest feedback scores, repeat booking rate at their venues
- Add "Quick Facts" card: cuisine types, price range, guest count range, availability status, dietary accommodations
- Allow partner to save private notes about this chef vs others (stored in partner record, not visible to chef)

**Where it appears:**

- Partner portal dashboard: "Chef Quick Facts" or "Why Recommend" section
- Partner profile settings: private notes field (partner's own vendor notes about this chef)
- Chef-side partner detail: "Positioning statement" field the chef writes for the partner

**What remains as permanent exit:**
The partner will always leave to compare with other vendors in their network. ChefFlow is not a marketplace and will never list competing chefs. The permanent exit is the comparison itself. ChefFlow's job is to arm the partner with compelling proof so this chef wins the comparison.

**Priority:** Occasional (when guest asks for recommendations) x Low effort (display existing data + notes field) = **LOW**
**Spec needed?** No (minor UI additions to existing partner portal)

---

## Batch Summary

| #   | Title                                 | Reclassified To     | Spec Needed? |
| --- | ------------------------------------- | ------------------- | ------------ |
| 42  | Share chef referral link with a guest | Partially Reducible | No           |
| 43  | Promote chef on partner website       | Bridgeable          | No           |
| 44  | Mention chef in host guidebook        | Bridgeable          | No           |
| 45  | Track lead before it becomes inquiry  | Reducible           | Yes          |
| 46  | Compare chef with other vendors       | Permanent           | No           |

---

## Key Findings

**Strongest existing infrastructure:** QR code generation (`lib/qr/qr-code.ts`), embeddable inquiry widget with CORS and UTM tracking (`app/api/embed/inquiry/route.ts`), guest lead capture (`guest_leads` table + actions), partner share tokens, and URL shortener are all built. The gap is NOT backend capability; it's partner portal UI surfaces that expose these tools to partners.

**Biggest single win:** Scenario #45 (Submit a Referral). The `guest_leads` table, notification system, and chef leads page all exist. Adding a partner-portal form that inserts into `guest_leads` with partner attribution would eliminate a high-frequency exit with minimal new infrastructure.

**Common theme:** Scenarios #42-#44 all converge on a "Partner Marketing Kit" surface in the portal: referral link, QR card, embed code, guidebook text, printable materials. Building this as one cohesive section addresses three scenarios simultaneously.

**What ChefFlow should NOT do:** Become a vendor marketplace (#46). The partner's multi-vendor comparison is a permanent exit by design. ChefFlow arms the partner with proof, not competitor data.

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)_
