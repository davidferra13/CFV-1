# Dinner Circles - Canonical Product Prompt

Use this prompt any time you need to explain, extend, market, or build on Dinner Circles inside ChefFlow.

---

## What It Is

A **Dinner Circle** is the persistent, shareable command center for a dinner. One link. No app download. No login. No group chat. No email chain. The chef controls everything about the dinner from one place, and everyone involved can see exactly what they need to see.

## The Problem It Solves

Private chefs (and any chef doing off-premise dining) spend as much time coordinating as they do cooking. Every dinner involves:

- The client (who booked it)
- The guests (who are attending, each with allergies, dietary needs, preferences)
- The details (menu, date, time, address, headcount, payments, prep updates)

Today, this coordination happens across group texts, email chains, DMs, phone calls, and sticky notes. The chef becomes a human switchboard: "Did Sarah confirm her allergy?" "Can you forward the menu to your husband?" "What time did we say again?"

**A Dinner Circle eliminates all of that.**

## How It Works

### For the Chef

1. A Dinner Circle is created automatically the moment an inquiry comes in. Zero setup.
2. The chef's first response posts inside the circle automatically (no AI, deterministic template based on the inquiry details).
3. Every lifecycle milestone posts itself: quote sent, payment received, event confirmed, "I'm on my way," post-event thank you, photos shared.
4. The chef sees all active circles on their dashboard with unread counts. One click to jump in.
5. Email replies from the client automatically route into the circle. The chef never has to copy-paste between email and the app.
6. The chef controls everything: who's in the circle, what role they have, what they can see, notification settings.

### For the Client and Guests

1. The client gets a link in the chef's first email. Click it. That's it. No account, no password, no app.
2. They see a status banner: what's confirmed (date, address, menu, headcount) and what the chef still needs from them.
3. They can chat with the chef and other guests, see the menu, view photos, check the schedule, share dietary restrictions.
4. Guests can be invited by the client or chef. Each guest gets their own profile in the circle.
5. Notifications come via email and push. Members control their own notification preferences (mute, digest mode, quiet hours).

### What Makes It Different

- **Persistent, not ephemeral.** A group text dies. A Dinner Circle lives as long as the relationship. Repeat clients reuse their circle.
- **No login wall.** Token-based access via a shareable link. The circle is the portal.
- **Chef-controlled.** The chef decides who's in, who can post, who can invite others. Not a democracy, it's a professional workspace.
- **Lifecycle-aware.** The circle knows where the dinner is in its journey (inquiry, quoted, booked, confirmed, in-progress, completed). It surfaces the right information at the right time.
- **Multi-channel.** Email replies flow in. Push notifications flow out. The client doesn't have to change how they communicate. The circle absorbs it all.
- **Everything in one place.** Menu, guest list, dietary info, payment status, chat, photos, schedule, notes. The chef never has to say "check your email" or "I sent that in the group text."

## The One-Liner

> **A Dinner Circle is a private command center for your dinner. One link, no login, no group chat. Everyone sees what they need. The chef controls everything.**

## The Elevator Pitch

> Every dinner you do involves a client, guests, menus, allergies, schedules, payments, and a dozen back-and-forth messages across texts, email, and phone calls. A Dinner Circle puts all of that in one place with one shareable link. Your client clicks it, sees the menu, confirms their guest count, shares it with whoever's coming. No app. No login. No group chat. You control the whole dinner from one screen. It's like a private mission control for every event you run.

## Positioning Notes

- **Do NOT compare to Slack, Discord, WhatsApp, or any messaging app.** A Dinner Circle is not a chat room. Chat is one feature inside it. The circle is a coordination layer.
- **Do NOT call it a "portal."** Portals are impersonal. A Dinner Circle is warm, professional, and personal.
- **Do NOT frame it as "event management."** It's relationship management. The circle persists beyond any single event.
- **DO frame it as "the end of chasing people."** That's the pain point. No more "Did you get my text?" No more "Can you forward the menu?" No more hunting down RSVPs one by one.
- **DO emphasize zero friction.** No download. No account. One link. Works on any device.
- **DO emphasize chef control.** This is the chef's space. They set the rules. Professional, not casual.

## Technical Anchor (for agents building on Dinner Circles)

| Concept              | Implementation                                                                 |
| -------------------- | ------------------------------------------------------------------------------ |
| Circle = hub_group   | `hub_groups` table (tenant_id, group_token, inquiry_id, event_id, emoji, name) |
| Members              | `hub_group_members` (profile_id, role, permissions, notification prefs)        |
| Messages             | `hub_messages` (text, system, notification types; source tagging for email)    |
| Profiles             | `hub_guest_profiles` (token-based identity, no auth required)                  |
| Public URL           | `/hub/g/{group_token}` (no login, SSR)                                         |
| Auto-creation        | `createInquiryCircle()` in `lib/hub/inquiry-circle-actions.ts`                 |
| Lifecycle hooks      | `lib/hub/circle-lifecycle-hooks.ts` (auto-posts at every lifecycle transition) |
| Email routing        | `lib/hub/email-to-circle.ts` (inbound email replies become circle messages)    |
| Notifications        | `lib/hub/circle-first-notify.ts` (circle-first, email/push as pointers back)   |
| Chef dashboard       | `app/(chef)/dashboard/_sections/dinner-circles-cards.tsx`                      |
| Guest view           | `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` (9 tabs)                  |
| Invitation templates | `lib/lifecycle/dinner-circle-templates.ts` (4 styles)                          |
| Circle lookup        | `lib/hub/circle-lookup.ts` (find circle by event or inquiry)                   |
| Group management     | `lib/hub/group-actions.ts` (CRUD, roles, permissions, mute, leave)             |

## Boundaries (What a Dinner Circle Is NOT)

- **Not Chef Collab.** Chef-to-chef coordination (referrals, handoffs, date coverage) is a separate system. See `prompts/dinner-circle-vs-chef-collab.md`.
- **Not a Trusted Circle.** That's the chef's trust graph with other chefs. Different concept, similar name.
- **Not a chat app.** Chat is one tab. The circle includes meals, photos, notes, schedule, member management, settings, and lifecycle status.
- **Not a replacement for email.** Email flows into the circle. The circle is the single source of truth. Clients can still email normally.
