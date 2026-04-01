# Dinner Circle vs Chef Collab

Use this prompt when you need the agent to reason correctly about Dinner Circles, chef-to-chef collaboration, referrals, handoffs, and private chef workspaces inside ChefFlow.

---

## Prompt

You are working inside ChefFlow. Use the following product language as canonical.

### Core Definitions

- **Dinner Circle**: the persistent, shareable, client/guest-facing operating space for a specific dinner, inquiry, booked event, household, or residency relationship.
- A Dinner Circle exists so the chef does not need to chase people across group texts, email chains, or scattered messages.
- A Dinner Circle can start before the event is booked, continue after booking, and remain the single source of truth for that dinner relationship.
- A Dinner Circle may include the chef, the client, household members, and invited guests or collaborators tied to the dinner experience.
- A Dinner Circle is not just chat. It can include chat, members, notes, photos, meal planning, schedule updates, and event status.

- **Chef Collab**: the chef-to-chef collaboration layer for private professional coordination between chefs.
- Chef Collab covers backup coverage, lead sharing, referrals, staffing help, pass-offs, date coverage, and private professional communication between chefs.
- Chef Collab is chef-only. It is not the guest/client operating room.

- **Trusted Circle**: the trust graph between chefs. It defines which chefs are closer partners and who should receive higher-priority collaboration visibility.
- Trusted Circle is a relationship scope, not the same thing as a Dinner Circle.

- **Handoff**: a structured transfer of work from one chef to another.
- Handoffs can be loose leads, date coverage, backup requests, or a real pass-off of an active client/event with pricing, context, and continuity.

### Classification Rules

When deciding what something is, classify it like this:

1. If the space is centered on a dinner, client, inquiry, event, household, or residency and may involve non-chef participants, it is a **Dinner Circle**.
2. If the space is chef-only and is about referrals, coverage, work-sharing, pass-offs, or professional coordination, it is **Chef Collab**, not a Dinner Circle.
3. If the request is specifically about transferring a piece of work from one chef to another, it is a **Handoff** inside Chef Collab.
4. If the request is about which chefs can see or receive collaboration opportunities, it is **Trusted Circle** logic.

### Naming Guidance

Use these names consistently:

- `Dinner Circle` for client/guest dinner coordination.
- `Chef Collab` for chef-to-chef professional collaboration.
- `Handoff` for structured transfers of work.
- `Trusted Circle` for trusted chef relationship scope.

Avoid calling a chef-only private thread a Dinner Circle unless the thread is intentionally part of a client-facing dinner workspace.

### Important Product Call

Two chefs privately messaging each other all week about:

- taking a dinner on a certain date
- passing off an inquiry
- transferring an already-started dinner
- sharing quoted pricing, payment status, guest expectations, or apology context

should be treated as **Chef Collab with Handoffs**, not as a Dinner Circle.

### Best-Practice Recommendation

If the user wants a private one-to-one chef workspace, describe it as:

- a **private Chef Collab thread**
- a **trusted chef collab thread**
- or a **chef handoff workspace**

If the user wants a Discord-like persistent chef-only area with multiple organized topics, describe it as:

- a **private Chef Collab space**
- with **threads** for referrals, date coverage, pricing pass-offs, and active handoffs

Do not collapse that concept into Dinner Circle unless clients or guests are intentionally part of the workspace.

### Output Style

When answering, do three things:

1. State whether the request is a Dinner Circle, Chef Collab, Trusted Circle, or Handoff.
2. Explain why in plain language.
3. If the concept is ambiguous, recommend the cleanest product name and boundary.

### Example Decision

Scenario: "I have one chef friend. We pass each other dinners, cover dates for each other, and sometimes fully transfer active work with pricing and payment context. We want a private persistent space, maybe with separate threads."

Correct answer:

- This is **not primarily a Dinner Circle**.
- This is **Chef Collab**.
- The actual transfer objects are **Handoffs**.
- The persistent relationship can sit inside **Trusted Circle**.
- If you build the Discord-like version, call it a **private Chef Collab space** with structured handoff threads.

---

## Repo Grounding

Anchor your reasoning in the existing ChefFlow implementation:

- Dinner Circle exists as hub-group infrastructure linked to inquiries/events and guest-facing token routes.
- Chef collaboration exists in Chef Community / Network with Connections, Trusted Circle, Collab, and Handoff flows.
- Do not rename existing Dinner Circle behavior to fit chef-only collaboration. Keep the boundary clean.
