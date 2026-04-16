# Co-Hosting & Ticketed Events: System Integrity Question Set

> **Purpose:** Expose every failure point in the current system when a chef co-hosts events with a venue/partner. Force the system into a fully specified, verifiable state. All questions are framed for ALL users unless marked [SPECIFIC].
>
> **Validation case:** Chef + farm owner co-hosting ticketed dinners. But the system must work for: chef + Airbnb host, chef + restaurant (guest chef night), chef + corporate venue, chef + wedding planner, chef + another chef (already partial).
>
> **How to use:** Answer each question with a concrete decision. No "it depends." Every answer must be implementable and testable.

---

## A. Identity & Role Resolution (Who Is the Co-Host in the System?)

**Q1. What is a venue partner's identity in ChefFlow?**
The partner system has types (airbnb_host, business, venue, etc.) with a read-only portal. Hub groups have roles (owner, admin, chef, member, viewer). Event collaboration has roles (primary, co_host, sous_chef, observer) but requires chef_connections (chef-to-chef only). A farm owner who co-hosts dinners needs to: manage guest lists, see ticket sales, post in the circle, share ingredient availability, and control front-of-house logistics. Which system does a co-host live in? Partner? Hub admin? New role? Or do we bridge existing systems?

**Q2. Does a co-host need a ChefFlow account?**
Partners currently sign up via invite tokens and get a limited portal. Hub members use profile tokens (no auth required). If a venue partner needs admin-level circle access, ticket sale visibility, and guest management, can they operate on a profile token alone? Or do they need a full auth account with a new role (e.g., `venue_admin`)? What are the security implications of each?

**Q3. Can one person hold multiple roles simultaneously?**
A farm owner might be: a referral partner (gets commission on events), a hub group admin (manages circle), and an event collaborator (co-hosts the event). Today these are three separate identity systems with no bridge. Does the system need a unified identity, or do we compose capabilities from existing roles? What breaks if we compose?

**Q4. How does the co-host relationship get established?**
Chef-to-chef collaboration requires `chef_connections` (network request + accept). Partners are created via chef CRUD or self-registration. Hub members join via link. What is the co-host onboarding flow? Chef invites partner -> partner claims invite -> partner gets circle admin + event access? Or something else?

---

## B. Circle Architecture (How Does a Co-Hosted Circle Work?)

**Q5. Who creates the co-hosted dinner circle?**
Today, circles are created by: (a) chef via `createCircleForEvent`, (b) client/guest via hub UI, or (c) auto-created on inquiry. For a co-hosted event, who creates the circle? The chef? The venue partner? Either? What happens to `tenant_id` on the group? Today it scopes to one chef's tenant. If a venue partner creates it, there's no tenant. If the chef creates it, the partner needs admin access to a tenant-scoped group.

**Q6. Should co-hosted events use the existing `dinner_club` group type or a new type?**
Current group types: circle (per-event), dinner_club (recurring), planning (idea stage), bridge (intro). A series of farm dinners is recurring but each event is distinct. Does `dinner_club` fit? Or do we need a `co_hosted` type with different default permissions and features (like ticket sales, ingredient boards)?

**Q7. What circle features does a co-host need that a regular member doesn't?**
Current admin perms: can_post, can_invite, can_pin, update group settings, manage members. A co-host also needs: view ticket sales/revenue, manage guest capacity, post ingredient availability, pin logistics notes, see dietary/allergy dashboard, and potentially manage event details. Which of these are net-new capabilities vs. existing ones that just need to be exposed to the co-host role?

**Q8. How do circle members see the difference between a regular dinner circle and a ticketed event circle?**
If a guest joins a circle for a ticketed farm dinner, do they see a ticket purchase CTA? A countdown? A menu? A map to the venue? Today circles show: feed, members, polls, notes, media, meal board. What additional surfaces does a ticketed event circle need? And does this change the public-facing join page (`/hub/join/[groupToken]`)?

---

## C. Ticketing & Commerce (How Do People Buy Seats?)

**Q9. What IS a ticket in ChefFlow's data model?**
Today there is no ticket entity. Events have `guest_count`. RSVP exists but is free. POS has `product_projections` for retail items. Is a ticket: (a) a product projection sold through POS/checkout, (b) a new entity tied to events, (c) an RSVP with a payment gate, or (d) something else? Each has different implications for refunds, transfers, capacity tracking, and financial reporting.

**Q10. Where does the public ticket page live?**
Currently: `/hub/g/[groupToken]` is the circle view (requires joining). `/hub/join/[groupToken]` is the join form. Event share links go to RSVP pages. None of these sell tickets. Does the ticket page: (a) live inside the circle (members-only), (b) live on the public join page (anyone can buy), (c) get its own route (e.g., `/events/[slug]/tickets`), or (d) use the existing event share page with a payment layer? What does the URL look like when shared on Instagram?

**Q11. How does ticket capacity interact with event `guest_count` and RSVP?**
Events have a `guest_count` field. RSVP tracks attending/declined/maybe with plus-ones. If 30 tickets are available and 25 sell, does `guest_count` auto-update? Do remaining seats show live? Can a co-host manually add guests (comps) that reduce available tickets? What happens when someone RSVPs "attending" without a ticket?

**Q12. Can there be multiple ticket types?**
Farm dinners might have: General ($125), VIP with wine pairing ($175), Kids ($50). Does the system support tiers? Or is it one price per event? If tiers exist, do they map to product projections? Modifiers? Separate products? How does this affect capacity (e.g., only 6 VIP seats)?

**Q13. Who processes the payment?**
Today: Stripe is integrated for event payments (client pays chef). If tickets are sold publicly, whose Stripe account receives the funds? The chef's? The venue partner's? A platform account with automatic splits? This has legal and tax implications. Does ChefFlow need Stripe Connect for multi-party payouts?

**Q14. How do refunds and cancellations work for tickets?**
Event cancellation exists with a refund flow. But ticket refunds are different: individual ticket cancellation (one guest can't come) vs. event cancellation (whole thing is off). Who authorizes refunds: the chef, the co-host, or either? What's the refund policy data model?

---

## D. Shared Resources (How Do Co-Hosts Collaborate on Content?)

**Q15. How does the venue partner share available ingredients?**
The farm owner has a running list of what's in season / available. The chef builds the menu from this. Today: meal board exists (planned/confirmed/served meals), recipe system exists, ingredient catalog exists. But there's no "here's what I have available" board. Is this: (a) a pinned note on the circle, (b) a new "ingredient availability" board (like meal board), (c) an extension of the existing ingredient catalog with venue-sourced items, or (d) a shared document/checklist?

**Q16. Who controls the menu that gets published?**
Chef creates menus. But in a co-hosted event, the venue might have input (seasonal constraints, what's available). Does the menu go through an approval flow? Can the co-host see the menu before it's published to the circle? Can they suggest changes? Or is menu always chef-only and the ingredient board is the co-host's input mechanism?

**Q17. How do logistics get coordinated between co-hosts?**
Setup time, table layout, serving stations, bar setup, parking, weather contingency. Today: event notes exist, circle notes exist, but there's no structured logistics template. Is this just circle messaging? Pinned notes? A dedicated logistics board? A checklist both parties can check off?

---

## E. Guest Journey (Discovery to Dinner)

**Q18. How does a potential guest discover the dinner?**
Today: events are private (chef creates, client is invited). For ticketed events, guests need to find the event. Channels: social media link, circle invite, word of mouth, chef's public profile, venue's website. What is the canonical shareable URL? Does it work without joining the circle first? Does it show menu, date, price, remaining seats?

**Q19. What is the purchase flow for a guest who has never used ChefFlow?**
Guest sees Instagram post -> taps link -> lands on... what? Do they need to create a hub profile first? Or can they buy a ticket with just name + email + payment? What's the minimum friction path from "I want to go" to "I have a ticket"? Every extra step = lost sales.

**Q20. What happens after ticket purchase?**
Guest buys a ticket. Then what? Auto-join the circle? Receive email confirmation? Get added to the guest list? See dietary restriction form? Get a QR code for check-in? Today RSVP auto-syncs to hub profiles. Does ticket purchase do the same, plus trigger payment confirmation?

**Q21. How does the guest manage their ticket?**
Change dietary info, cancel/transfer ticket, add plus-one, see event updates. Today: RSVP has a guest token for self-service updates. Does the ticket system use the same pattern? Can a guest view their ticket status without logging in (token-based)?

---

## F. Financial Model (Who Gets Paid What?)

**Q22. What is the default revenue split model for co-hosted events?**
Chef-to-chef collaboration has configurable splits (lead 40%, sous 25%, etc.). But chef-to-venue is different: the venue might take a flat fee (rental), a percentage, or handle their own costs separately. Is the split: (a) percentage-based like chef collaboration, (b) fixed-fee (venue gets $X, chef gets rest), (c) configurable per event, or (d) handled outside ChefFlow entirely?

**Q23. How does the ledger record co-hosted event revenue?**
Ledger is immutable, append-only. Today: one tenant's ledger records all event financials. For co-hosted events, does revenue appear in both the chef's and the venue partner's financials? Or only the chef's (with a payout line item to the venue)? Does the venue partner even have a ledger? Partners currently have analytics but not a financial ledger.

**Q24. How are expenses tracked for co-hosted events?**
Chef has food costs. Venue has property costs (tables, linens, power, water). Today: event expenses are tracked per-tenant. Can both parties log expenses against the same event? Or does each track their own costs in their own system? How does this affect profit calculation?

**Q25. What financial visibility does each co-host have?**
Chef sees full P&L. Venue sees... what? Total ticket revenue? Their cut only? Number of tickets sold? The collaboration system has `can_view_financials` permission. Does this extend to venue partners? What financial data would be harmful to share (e.g., chef's food cost margins)?

---

## G. Communication & Broadcasting

**Q26. Is there a private admin channel between co-hosts?**
The circle is for everyone (chef, venue, guests). But co-hosts need private coordination: "we're 5 tickets short, should we discount?", "the pig roast fell through, new menu idea", "guest #12 has a severe nut allergy, confirm kitchen is clear." Is this: (a) a separate private circle (type: planning), (b) DMs within the circle, (c) handled outside ChefFlow (text/email), or (d) a new "admin thread" feature within the circle?

**Q27. How do co-hosts broadcast to sell tickets?**
The circle feed reaches members. But pre-sale, there are no members yet. Broadcasting means: shareable event page, social media assets, email blasts to past guests. Today: campaigns exist (email outreach), social posts exist, but none are tied to ticket sales. How do we close the loop from "broadcast" to "ticket purchased"?

**Q28. How do past guests get notified about upcoming events?**
Hub guest profiles persist across events (with event history). A chef who does monthly farm dinners wants to notify past attendees. Today: circle digest emails exist (instant/hourly/daily). But if the next dinner is a NEW circle, past guests aren't members. Is there a "subscribe to this chef's events" mechanism? A mailing list? Or does the dinner_club group type solve this (ongoing membership across events)?

---

## H. Public Surface & Discovery

**Q29. What does the public event page look like?**
No public event page exists today. For ticketed events, the public page needs: event name, date, time, location (maybe approximate), menu, price, remaining capacity, chef bio, venue info, buy button, dietary info form. Is this a new route? Does it extend the existing share page? How does it handle SEO (meta tags, structured data for Google Events)?

**Q30. Can venue partners have their own public profile?**
Partners have `is_showcase_visible` for the chef's profile page. But a venue (farm, restaurant, Airbnb) might want its own landing page showing upcoming events across multiple chefs. Does this exist? Should it? Would it be `/venues/[slug]`? Or is the venue always presented through the chef's lens?

**Q31. How does the event appear on the chef's public profile?**
Chef profiles exist at `/chefs/[slug]`. Do upcoming ticketed events show there? With ticket links? Today: the profile shows services, menus, partners. Adding upcoming events with "Get Tickets" is high-leverage for every chef, not just co-hosted events.

---

## I. System Integrity & Edge Cases

**Q32. What happens when a co-host relationship ends mid-event?**
Collaboration has statuses: pending/accepted/declined/removed. If the venue partner is "removed" after tickets are sold, what happens to: their circle admin access, their financial split, their guest list contributions, their ingredient board posts? Is there a graceful degradation path?

**Q33. What happens when two co-hosts disagree on capacity?**
Chef wants 30 guests (kitchen limit). Venue wants 50 (property capacity). Who sets the canonical `guest_count`? Is capacity: (a) the minimum of both limits, (b) set by the event owner (chef), (c) negotiated with an approval flow, or (d) set per-role (chef controls kitchen seats, venue controls total seats)?

**Q34. Can a venue partner co-host with multiple chefs simultaneously?**
Farm has a dinner every Saturday with different chefs. Each chef has their own tenant. The venue partner appears in multiple tenants' partner lists. Does this work today? Can the venue see all their upcoming events across chefs in one view? Or are they siloed per-tenant?

**Q35. What happens to the circle after the event is completed?**
Today: circles persist. For one-off ticketed events, should the circle archive automatically? Stay open for photos/feedback? Convert to a "memories" view? For recurring series (dinner_club), the circle stays active across events. What's the lifecycle?

**Q36. How does the system handle walk-ins at a ticketed event?**
30 tickets sold. Day-of, 3 people show up wanting to join. Can the chef/venue sell tickets at the door? Does POS handle this (it's already a retail checkout)? Does the guest count update? Do walk-ins get added to the circle?

**Q37. What prevents ticket overselling?**
If chef and venue both share the ticket link, and two people buy the last ticket simultaneously, who gets it? Is there a capacity lock? Optimistic concurrency? Queue? Today: RSVP has no capacity enforcement. POS has inventory tracking (`available_qty`). Which pattern applies?

**Q38. How do dietary restrictions aggregate across ticket buyers?**
RSVP collects dietary/allergy data. The circle has a dietary dashboard. If tickets are the entry point (not RSVP), does the ticket purchase flow collect dietary info? Does it flow into the same dashboard? The chef needs a consolidated allergy report before they plan the menu.

---

## J. Generalization (What Benefits ALL Users?)

**Q39. Which of these features are universally valuable vs. co-host-specific?**
Rank each by "who benefits":

- Public event page with ticket sales -> ALL chefs (even solo events)
- Venue/partner admin on circles -> co-hosted events only
- Ingredient availability board -> co-hosted + personal chef households
- Past guest notifications for new events -> ALL chefs
- Revenue split with non-chef partners -> co-hosted events only
- Capacity enforcement on events -> ALL chefs
- Walk-in POS for events -> ALL chefs doing events
- Post-event circle archival -> ALL circle users

**Q40. What is the minimum viable co-hosting feature set?**
If we could only ship 3 things, what 3 changes unlock the farm dinner scenario without over-engineering? Candidates:

1. Partner-as-circle-admin (bridge existing systems)
2. Ticket purchase on event share page (payment gate on RSVP)
3. Public event page with shareable URL
4. Private admin thread in circle
5. Ingredient availability board
6. Past guest notification system
7. Revenue split configuration for partners

Which 3 have the highest leverage across ALL users?

---

## Completion Criteria

This question set is DONE when:

- [ ] Every question has a concrete, implementable answer
- [ ] Answers do not contradict each other
- [ ] Answers do not contradict existing CLAUDE.md rules
- [ ] Each answer identifies affected files/tables
- [ ] Priority order is established (what ships first)
- [ ] Edge cases in Section I have explicit handling, not "we'll figure it out later"
