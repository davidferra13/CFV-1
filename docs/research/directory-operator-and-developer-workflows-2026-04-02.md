# Research: Directory Operator and Developer Workflows

> **Date:** 2026-04-02
> **Question:** How do food operators and developers currently handle the discovery, listing, and direct-ordering problems ChefFlow is trying to solve, and what does that imply for the current directory work?
> **Status:** complete

## Summary

Yes, there is still useful work to do, even in spec-only mode.

The research is consistent from multiple angles:

- food operators already manage a fragmented surface area, not a single profile
- their highest-value fields are hours, menu/order links, photos, promos, and direct action links
- they increasingly want first-party guest relationships, not just marketplace exposure
- developers solve this by centralizing data and pushing it outward, but major platform APIs are gated, uneven, and not friendly to a light custom integration

That means the current direction is correct, but incomplete in one important way:

The outreach and claim experience should be optimized for **claim, review, correct, and publish**, not "start from scratch." It should also prioritize the fields operators already maintain elsewhere and avoid promising cross-platform sync too early.

## Method

I used four angles and cross-checked them:

1. Platform docs for Google Business Profile, Apple Business Connect, and Toast
2. Restaurant industry surveys and vendor research from Qu and TouchBistro
3. Operator and implementer community discussions on Reddit
4. Current local ChefFlow specs and research docs

## What Food Operators Do Today

### 1. They already manage multiple public surfaces

Operators do not think in terms of one listing. They typically manage:

- Google Business Profile
- Apple Maps / Apple Business Connect
- restaurant website
- first-party or semi-first-party ordering page
- reservation link
- social profiles

Google explicitly lets businesses update regular hours, special hours, service-specific hours, menu links, photos, and manager access on their Business Profile. Apple Business Connect similarly lets businesses claim location cards, update photos/logos, run offers, and add actions like ordering or reservations.

This matters because ChefFlow should not assume operators are waiting for a blank profile builder. They are already maintaining data elsewhere.

### 2. The most important fields are operational, not decorative

Across Google, Apple, and ordering systems, the recurring high-value fields are:

- hours
- special hours
- menu link
- website
- order link
- reservation link
- photos and logos
- promotions / seasonal updates

These are the fields that change frequently and directly affect guest conversion.

### 3. They want direct guest relationships

Qu's 2025 restaurant digital report says brands are doubling down on first-party digital ordering, and that 40% of brands expect first-party digital ordering to drive the most growth in 2025. The same report says 64% are prioritizing unified systems and nearly 70% cite order accuracy as a top efficiency challenge.

Toast positions its platform the same way: direct ordering, website-driven discovery, integrated menus, and unified guest profiles. TouchBistro's reporting also shows direct online ordering, websites, and social discovery remain central operator concerns.

This means ChefFlow should treat directory value as more than "be found." Operators care about being found **and** converting that attention into direct action.

### 4. They often rely on shared management, not a single owner login

Google Business Profile supports owners and managers. Google also supports business groups and agency organizations. Apple Business Connect has a self-service claim flow and an API path aimed at larger-scale listing management through agencies/platform partners.

That means ownership is often distributed:

- owner
- general manager
- marketing person
- agency or vendor

Any future claim system that assumes one permanent owner-user with no delegation will eventually hit a wall.

### 5. What breaks for operators

The recurring breakpoints are clear:

- stale hours
- wrong menu links
- mismatched online/offline menus
- broken or confusing ordering flows
- duplicate entry across tools
- commission pressure from third parties
- lack of confidence that public data is current

Community discussions reinforce this. Operators commonly describe using a branded or semi-branded ordering link, then linking to it from their site. They also report glitches, outages, or confusing product tiers in online ordering tools.

## What Developers Do Today

### 1. They usually centralize data, then syndicate

The common developer pattern is not manual editing everywhere forever. It is:

1. establish one operational source of truth
2. keep menus, hours, and links synced from that system
3. expose direct-order or reservation actions where guests discover the business

Toast's pitch is explicit: update once, see the change across the stack. Qu's research also centers unified systems and unified data as prerequisites for digital growth and order accuracy.

### 2. They rely on platform-native claim and management models

Google and Apple both expect claimed profiles, ownership roles, and platform-specific management. Developers building around these ecosystems still have to respect:

- ownership verification
- role/manager constraints
- platform-specific fields
- moderation and review processes

This is important because ChefFlow should not try to "skip" platform ownership reality. It should build a clean internal claim flow first.

### 3. API access is real, but harder than it looks

Google Business Profile API access is gated, requires approval, and has no sandbox. Google explicitly says there is no sandbox environment and recommends `validateOnly` for request validation. Apple exposes API support at scale through listing management agencies/partners.

This is a major planning constraint:

- cross-platform sync is possible
- cross-platform sync is not a good v1 assumption
- platform integration should not be treated as a lightweight follow-up

### 4. Public web structure still matters

Google says brand/profile information can come from the business, public websites, licensed data, and user contributions. Google also explicitly references schema.org markup and website/menu URLs as part of the accuracy story.

Developers handling this space do not solve everything via API. They also improve the public web surface:

- clean website data
- structured markup
- accurate menu URLs
- correct action links

## Cross-Checked Truths

These findings held up from multiple directions:

### A. Accuracy beats volume

Operators care more about whether hours, menus, links, and photos are right than whether a profile simply exists.

### B. Direct action beats passive discovery

Discovery is not enough. The winning pattern is discovery plus direct next step:

- order
- reserve
- call
- visit website

### C. Duplicate entry is a real tax

Operators already re-enter too much across Google, Apple, ordering, and websites. ChefFlow should reduce re-entry, not add another blank setup burden.

### D. Delegation is normal

Manager and agency support is not edge-case behavior. It is standard operating reality.

### E. Cross-platform sync is strategically valuable, but tactically expensive

It should be planned deliberately, not smuggled into a narrow feature.

## What This Means for ChefFlow Right Now

### The current outreach direction is correct

The neutral invite-and-claim approach still makes sense. It avoids surprise and lets operators opt in cleanly.

### But the post-claim value proposition needs sharper prioritization

The operator's first meaningful wins should be:

1. confirm or correct hours
2. add or fix website, menu, order, and reservation links
3. upload a logo / hero photo
4. add a short description or promo

Not because those are flashy, but because they map to the fields operators already maintain and the actions diners actually use.

### Do not overpromise sync

ChefFlow should not imply that claiming a listing automatically fixes Google, Apple, Yelp, or every other public surface. The research does not support treating that as easy or immediate.

### A future claim/admin model should anticipate delegated access

Not necessarily in the outreach v1 build, but in planning:

- multiple managers
- transfer of ownership
- agency/assistant workflows
- ownership dispute handling

### Public data provenance and freshness matter

The state-normalization work was correct and necessary, but broader trust will eventually depend on visible accuracy and a clear path to correction. Operators are already living in an ecosystem where public data can drift.

## Recommended Changes to Current Work

### Refine `directory-operator-outreach.md`

Add these constraints:

- join flow should be minimal, but the follow-up enhance flow should prioritize hours, action links, and photos first
- the experience should be framed as reviewing and correcting existing information, not re-entering a profile from scratch
- disputed ownership and ambiguous matches need a manual-review path
- delegated management should be recognized as a follow-up requirement, not ignored
- cross-platform sync should remain explicitly out of scope for this spec

### Keep `discover-state-normalization-hardening.md` narrow

Do not expand that spec. It is correctly scoped to data truth on `/discover`.

### Capture a future spec, but only if needed

The next justified spec after outreach is not "more directory features" in general. It is one of these:

1. profile enhancement priorities after claim
2. delegated profile management and ownership transfer
3. external listing sync strategy

## Sources

### Platform and developer sources

- Google Business Profile Help, edit business hours: https://support.google.com/business/answer/6323743
- Google Business Profile Help, menu editor and menu URL: https://support.google.com/business/answer/9455840
- Google Business Profile Help, more hours: https://support.google.com/business/answer/9876800
- Google Business Profile Help, transfer primary ownership and role limits: https://support.google.com/business/answer/3415281
- Google Business Profile Help, request ownership: https://support.google.com/business/answer/4566671
- Google for Developers, Business Profile API basic setup: https://developers.google.com/my-business/content/basic-setup
- Google Brand Profile Help, data sources and schema.org guidance: https://support.google.com/brandprofile/answer/15995286
- Apple Newsroom, Apple Business Connect: https://www.apple.com/newsroom/2023/01/introducing-apple-business-connect/
- Toast Support, Online Ordering Pro: https://support.toasttab.com/en/article/Getting-Started-with-Toast-Online-Ordering-Pro
- Toast Newsroom, Digital Storefront and Websites: https://pos.toasttab.com/news/toast-launches-digital-storefront-and-marketing-suites

### Industry research

- Qu, 2025 State of Digital Restaurant Report: https://www.qubeyond.com/2025-state-of-digital-restaurant-report/
- TouchBistro / BusinessWire summary of 2025 State of Restaurants: https://www.businesswire.com/news/home/20241120078001/en/TouchBistros-2025-State-of-Restaurants-Report-Reveals-89-Per-Cent-of-U.S.-Independent-Operators-Feel-Positive-About-the-Use-of-AI

### Community workflow signals

- ToastPOS discussion, operators linking their own site to Toast ordering: https://www.reddit.com/r/ToastPOS/comments/1l3a0kt/can_someone_please_help_me_understand_online/
