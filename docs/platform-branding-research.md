# Platform vs. User Branding on Client-Facing Surfaces: Industry Research

**Date:** 2026-03-08
**Purpose:** Inform ChefFlow's branding strategy for client-facing surfaces (invoices, emails, portals, embeds)

---

## Executive Summary

The SaaS industry has a near-universal pattern: **"Powered by [Platform]" branding on free/lower tiers, removable on paid tiers.** This is the single most common monetization lever for client-facing surfaces. The platforms that serve individual service providers (photographers, caterers, freelancers) specifically use branding removal as a key upgrade incentive.

---

## Detailed Platform Comparison

### Direct Competitors (Private Chef / Creative Professional Platforms)

#### HoneyBook

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices/Proposals** | Your logo + HoneyBook branding on documents. Lower plans show HoneyBook branding on all client-facing files. | **Essentials plan ($59/mo)** removes "Powered by HoneyBook" from client-facing pages |
| **Emails to clients** | FROM name is your business name. Email footer includes HoneyBook branding on lower tiers. | Removable on Essentials+ |
| **Client portal** | Branded with your logo/colors. HoneyBook branding visible on Starter plan. Premium ($129/mo) adds custom subdomain support (beta). | Premium for full white-label |
| **Embed widgets** | N/A (no embeddable widget) | N/A |
| **Free vs. paid** | No free tier. Starter ($36/mo) shows HoneyBook branding everywhere. Essentials ($59/mo) removes it from client pages. Premium ($129/mo) adds custom domain. | Branding removal starts at $59/mo |

**Key insight:** HoneyBook has been criticized for showing its own branding too aggressively on client-facing documents. Multiple comparison articles note that "your clients will see HoneyBook on every invoice" as a downside vs. Dubsado.

#### Dubsado

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices/Proposals** | Your logo, your colors, your fonts. **No Dubsado logo or "Powered by" on forms, invoices, or schedulers.** | Not needed - Dubsado never shows its branding on documents |
| **Emails to clients** | FROM name configurable (personal name or business name). Brand color applied to email buttons/links. | Full control included |
| **Client portal** | Your branding. Dubsado branding only appears in the URL domain (dubsado.com) and browser tab/favicon. Fixable with custom CNAME + custom page title/favicon. | URL branding fixable via CNAME (all plans) |
| **Embed widgets** | Schedulers and forms are fully your brand | No platform branding |
| **Free vs. paid** | No free tier. All plans get zero Dubsado branding on client-facing documents. The only Dubsado trace is the URL domain, fixable on any plan. | Clean on all plans |

**Key insight:** Dubsado is the gold standard for white-labeling in this space. Clients never see "Dubsado" unless they look at the URL bar. This is their #1 competitive advantage over HoneyBook.

#### 17hats

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices/Proposals** | Your logo, cover image, custom colors and fonts on all client-facing materials (quotes, contracts, invoices, questionnaires). | Included in all plans |
| **Emails to clients** | Customizable branding | Included |
| **Client portal** | Custom cover image, logo, welcome message, favicon. Branded scheduling and documents. | Included |
| **Embed widgets** | Lead capture forms, online scheduling - use your branding | Included |
| **Free vs. paid** | Single pricing tier (~$13/mo annual). No tiered branding restrictions found. | No tier gating found |

**Key insight:** 17hats doesn't appear to use branding removal as a monetization lever. Their pricing is low and flat.

#### CaterZen (Catering-Specific)

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices/Proposals** | Custom-branded ordering portal. Your logo and branding on all client-facing materials. | Included at $199/mo |
| **Client portal** | Branded online ordering interface. Clients see your catering brand. | Included |
| **Free vs. paid** | No free tier. Single tier at $199/mo includes full branding. | No tier gating |

**Key insight:** At $199/mo, CaterZen includes full branding as table stakes. Catering-specific software doesn't gate branding because their price point is already high.

#### Caterease

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices/Proposals** | Fully customizable via Print Designer. Your logo, custom layouts, formatted text. | Included |
| **Client portal** | Branded web forms designed with Caterease team's help. Lives on your website. | Included |
| **Free vs. paid** | No free tier. Enterprise pricing. Full branding included. | No tier gating |

**Key insight:** Enterprise catering software includes full branding as standard. No "powered by" anywhere.

#### Total Party Planner

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices/Proposals** | Custom branded reports, proposals, BEOs, invoices. Your brand voice throughout. | Included |
| **Client portal** | Client portal with chat and notifications. Branded experience. | Included |
| **Free vs. paid** | No free tier. Subscription pricing. Full branding included. | No tier gating |

---

### Adjacent Platforms (Same White-Label Problem)

#### Shopify

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Storefront footer** | "Powered by Shopify" in footer by default | **Yes, on ALL paid plans.** Edit theme content or footer.liquid to remove. Free themes may need support help. |
| **Emails (order confirmations, receipts)** | FROM name is your store name. Shopify branding not prominently displayed in notification emails. | Customizable templates |
| **Checkout page** | Your store branding. Shopify branding minimal. | Customizable on paid plans |
| **Free vs. paid** | No free plan for live stores. "Powered by Shopify" removable on all paid plans (Basic $39/mo+). | Removable on all plans |

**Key insight:** Shopify lets everyone remove "Powered by Shopify" - it's just hidden in theme settings. They don't gate it by tier. Their monetization is transaction fees, not branding leverage.

#### Squarespace

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Website footer** | "Powered by Squarespace" or "Made with Squarespace" in footer | **Removable on all paid plans.** Not removable on free trial. |
| **Email campaigns** | "Powered by Squarespace" in email footer | Removable on paid email campaign plans (above 500-send tier) |
| **Free vs. paid** | Free trial/Basic plan requires branding. Paid plans ($16/mo+) allow removal. | Branding removal starts at lowest paid tier |

#### Calendly

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Booking pages** | "Powered by Calendly" banner in upper-right corner + "Sign up free" on confirmation page | **Standard plan ($12/mo/seat) and above** |
| **Emails to invitees** | Calendly branding in invitee emails | Removable on Standard+ |
| **Embedded widgets** | "Powered by Calendly" banner. For popup embeds, must also set `branding: false` in embed code. | Standard+ only |
| **Free vs. paid** | **Free plan: cannot remove branding.** This is one of Calendly's primary upgrade incentives. | Starts at $12/mo/seat |

**Key insight:** Calendly is the textbook example of using "Powered by" as an upgrade lever. Free users are walking billboards. Paid users get clean branding.

#### FreshBooks

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices** | Your logo, colors, customizable templates. FreshBooks logo appears in client-facing emails on lower tiers. | **Select plan (custom pricing)** removes FreshBooks branding from emails |
| **Client portal** | White-labeled with your business name/logo on all plans | Included on all plans |
| **Emails** | FreshBooks logo in email notifications on Lite/Plus plans | Select plan removes it |
| **Free vs. paid** | Lite ($19/mo) and Plus ($33/mo) show FreshBooks branding in emails. Premium ($60/mo) adds custom templates. Select (custom) removes all branding. | Full removal requires top tier |

#### Wave

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices** | "Powered by Wave" footer on invoices, estimates, receipts, reminders, and customer statements | **Pro Plan** allows toggling the Wave footer on/off |
| **Client portal** | Wave branding present | Limited customization |
| **Free vs. paid** | Free plan: "Powered by Wave" footer mandatory. Pro plan: toggle it off. | Pro plan for removal |

**Key insight:** Wave explicitly stated this is part of their business model - free users display Wave branding as "advertising" for the platform. They see it as a fair trade for free software.

#### Mailchimp

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Email campaigns** | Mailchimp referral badge (monkey logo) in email footer | **Any paid plan** (Essentials $13/mo, Standard, Premium) |
| **Landing pages** | Mailchimp badge on landing pages | Removable on paid plans |
| **Free vs. paid** | **Free plan: Mailchimp badge mandatory in all email footers.** Cannot be removed. | Removal starts at $13/mo |

**Key insight:** Mailchimp's free tier badge is arguably the most well-known "powered by" in SaaS. It's a massive growth engine - every free user sends emails that advertise Mailchimp.

#### ConvertKit (now Kit)

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Signup forms** | "Built with Kit" badge below forms | **Paid plans only.** CSS workaround exists for free: `.formkit-powered-by-convertkit-container { display: none; }` |
| **Landing pages** | "Built with Kit" badge | Paid plans |
| **Email footer** | Kit branding | Paid plans |
| **Free vs. paid** | Free plan: badge mandatory. Paid plans ($29/mo+): removable. | Starts at $29/mo |

#### Acuity Scheduling (Squarespace)

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Booking page** | "Powered by Acuity Scheduling" on scheduler | **Plus plan only** (highest tier) |
| **Emails** | Acuity branding in confirmation emails | Plus plan |
| **Free vs. paid** | Lower tiers show branding. Only Plus plan ($46/mo) removes it. | Top tier only |

#### Stripe

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Checkout pages** | "Powered by Stripe" badge. Stripe recommends keeping it for trust/conversion. | Technically removable via settings, but Stripe discourages it |
| **Receipts/invoices** | Sent from stripe.com domain by default. Your brand colors/logo applied. | Custom domain available for email sending |
| **Payment links** | Stripe branding on hosted pages | Custom domain available |
| **Free vs. paid** | Stripe has no monthly fee (transaction-based). Branding control available to all accounts. Custom domain setup available. | No tier gating (pay-per-use model) |

**Key insight:** Stripe is unique - they actively WANT their badge displayed because "Powered by Stripe" increases conversion (trust signal). They make it removable but recommend against it.

#### Square

| Surface | What Clients See | Removable? |
|---------|-----------------|------------|
| **Invoices** | Your logo, brand colors. Square branding present. | Customizable branding in settings |
| **Online store** | Square footer/branding on free plan | **Plus plan ($29/mo)** removes Square branding/ads |
| **Receipts** | Square branding on digital receipts | Limited customization |
| **Free vs. paid** | Free plan shows Square branding on online store. Plus plan removes footer and ads. | Starts at $29/mo for online store |

---

## The Universal Pattern

| Tier | Branding Approach | Examples |
|------|-------------------|----------|
| **Free** | Mandatory "Powered by [Platform]" on all client-facing surfaces. Cannot be removed. Platform gets free advertising. | Calendly, Mailchimp, ConvertKit, Wave, Square |
| **Low paid ($10-30/mo)** | "Powered by" removable. Your branding takes priority. URL may still show platform domain. | Calendly Standard, Mailchimp Essentials, Shopify Basic |
| **Mid paid ($30-60/mo)** | Full branding control. Custom colors, fonts, templates. Platform branding gone from documents/emails. | HoneyBook Essentials, FreshBooks Premium, Squarespace Business |
| **High paid ($60-200/mo)** | Complete white-label. Custom domain, custom email sender domain, zero trace of platform. | HoneyBook Premium, FreshBooks Select, Acuity Plus |

**The exceptions:**
- **Dubsado** - Never shows its branding on documents, any plan. Competitive differentiator.
- **Stripe** - Wants its badge shown (trust signal). Doesn't gate removal.
- **Catering-specific software** (CaterZen, Caterease, TPP) - Price point is high enough ($100-300/mo) that branding is included as table stakes.

---

## Where "Powered by" Typically Appears (by surface)

| Client-Facing Surface | Most Common Placement | Industry Standard |
|----------------------|----------------------|-------------------|
| **Invoices/Proposals** | Small text in footer: "Powered by [Platform]" or platform logo | Removable on mid-tier paid plans |
| **Emails** | Footer area, below unsubscribe link. Sometimes "Sent with [Platform]" | Removable on low-tier paid plans |
| **Client portals** | Footer or subtle corner badge. URL domain is the hardest to hide. | Removable on mid-tier; custom domain on high tier |
| **Booking/scheduling pages** | Banner in upper-right or footer | Removable on low-mid tier paid plans |
| **Embed widgets** | "Powered by [Platform]" below the widget | Removable on paid plans; some require code parameter |
| **Checkout/payment pages** | "Powered by [Payment Processor]" badge near payment form | Usually kept for trust; some platforms can't remove |

---

## Recommended Strategy for ChefFlow

### The Industry-Standard Approach (Recommended)

Based on what every successful platform in this space does:

**1. Free Tier: Show "Powered by ChefFlow" on all client-facing surfaces**

- Invoice footer: small, tasteful "Powered by ChefFlow" with link
- Client portal footer: "Powered by ChefFlow"
- Embed widget: "Powered by ChefFlow" below the form
- Emails: "Sent with ChefFlow" in email footer (small, gray text)
- Hub/social pages: "ChefFlow" attribution

This is free advertising. Every invoice a free chef sends, every booking page a client visits, every email a client receives - it's a billboard. Calendly, Mailchimp, Wave, and ConvertKit all built massive user bases this way.

**2. Pro Tier: Remove all platform branding**

- All "Powered by" text removed from invoices, portals, embeds, emails
- Chef's brand is the only brand the client sees
- This becomes a key upgrade incentive: "Your clients see YOUR brand, not ours"

**3. Future (if needed): Custom domain support**

- Custom subdomain for client portal (portal.chefname.com instead of app.cheflowhq.com)
- Custom email sending domain
- This is a high-tier or enterprise feature (HoneyBook charges $129/mo for this)

### Specific Implementation for ChefFlow Surfaces

| Surface | Free Tier | Pro Tier |
|---------|-----------|----------|
| **Invoices (PDF + web)** | "Powered by ChefFlow" in footer, small gray text | Chef's branding only |
| **Client portal** | "Powered by ChefFlow" in footer | Clean, chef's brand only |
| **Hub pages** | "ChefFlow" attribution | Chef's brand only |
| **Embed inquiry widget** | "Powered by ChefFlow" below form | Clean embed |
| **Emails to clients** | "Sent with ChefFlow" in footer, below unsubscribe | Chef's FROM name only, no ChefFlow mention |
| **Experience/share pages** | "ChefFlow" branding | Optional ChefFlow mention |
| **Remy (AI concierge)** | Could show "Powered by ChefFlow AI" | Chef-branded AI name |

### Design Guidelines (Based on Industry Best Practices)

1. **Keep it subtle.** The platforms that do this well (Calendly, Shopify) use small, gray, footer-positioned text. Not a logo. Not a banner. Just "Powered by ChefFlow" in 11-12px gray text at the bottom.

2. **Make it a link.** "Powered by ChefFlow" should link to cheflowhq.com or a landing page. This is how Calendly, Mailchimp, and others drive signups from the badge.

3. **Never compete with the chef's brand.** The chef's logo, name, and colors should dominate. The platform attribution should be an afterthought that clients barely notice.

4. **Match the Dubsado philosophy for Pro.** On Pro, the chef's client should have zero awareness that ChefFlow exists. Complete white-label. This is what serious professionals expect.

5. **The payment badge is different.** If Stripe is processing payments, "Powered by Stripe" on payment forms is actually beneficial (trust signal). Don't remove it.

---

## Sources

- [Dubsado: Will my clients see any Dubsado logos or branding?](https://help.dubsado.com/en/articles/467071-will-my-clients-see-any-dubsado-logos-or-branding)
- [HoneyBook: Customize your company information, logos, and branding](https://help.honeybook.com/en/articles/2209110-customize-your-honeybook-company-information-logos-and-branding)
- [HoneyBook Pricing: Plans, Costs, and Key Features in 2026](https://assembly.com/blog/honeybook-pricing)
- [HoneyBook vs Dubsado: Complete Comparison (2026)](https://www.plutio.com/compare/honeybook-vs-dubsado)
- [HoneyBook Pricing: Upgrade or Switch After the 89% Hike in 2026?](https://www.agencyhandy.com/honeybook-pricing/)
- [Shopify Help Center: Remove "Powered by Shopify"](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/common-customizations/remove-powered-by-shopify-message)
- [Squarespace: Removing "Made with Squarespace"](https://support.squarespace.com/hc/en-us/articles/205815988-Removing-Made-with-Squarespace-from-your-site)
- [Calendly: How to turn off Calendly branding](https://help.calendly.com/hc/en-us/articles/35448706343319-How-to-turn-off-Calendly-branding-on-your-scheduling-page)
- [Mailchimp: Add or Remove Referral Badge](https://mailchimp.com/help/add-remove-referral-badges/)
- [ConvertKit: The "Built With ConvertKit" badge](https://help.convertkit.com/en/articles/4375211-the-built-with-convertkit-badge)
- [Wave: Show or hide the Wave footer](https://support.waveapps.com/hc/en-us/articles/21307138924948-Show-or-hide-the-Wave-footer)
- [Stripe: Branding your Stripe account](https://docs.stripe.com/get-started/account/branding)
- [17hats: Client Portal - Customizing Your Global Settings](https://help.17hats.com/en/articles/3160018-client-portal-customizing-your-global-settings)
- [FreshBooks: How do I customize my brand appearance?](https://support.freshbooks.com/hc/en-us/articles/115001971307-How-do-I-customize-my-brand-appearance)
- [Square: Customize receipts](https://squareup.com/help/us/en/article/5424-customize-digital-receipts-and-invoices)
- [Acuity Scheduling: Customizing your scheduling page](https://help.acuityscheduling.com/hc/en-us/articles/31039700427277-Customizing-your-scheduling-page)
- [CaterZen: Catering Software](https://www.caterzen.com)
- [Caterease: Prints and Reports](https://www.caterease.com/prints-and-reports/)
- [Total Party Planner: Features](https://totalpartyplanner.com/features/)
