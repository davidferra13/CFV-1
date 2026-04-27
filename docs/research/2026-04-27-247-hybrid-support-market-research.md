# Research: 24/7 Hybrid Support Model

> **Date:** 2026-04-27
> **Question:** How should ChefFlow design credible 24/7 support using WhatsApp, Remy, FAQs, and human escalation?
> **Status:** complete for market-research pass; partial for implementation, because Take a Chef's internal staffing and routing model is not public.

## Origin Context

The developer identified support as a trust gap. ChefFlow currently does not promise 24/7 support, while private chef marketplaces such as Take a Chef feel materially stronger because a customer can reach a human quickly through WhatsApp at any hour. The target is not "AI instead of humans." The target is a hybrid: a complete FAQ base, Remy as a high-quality 24/7 first layer, WhatsApp as the main global channel, and a clear way to reach a human quickly without being trapped by automation. The developer is willing to act as the initial 24/7 human responder, but wants a system that teaches Remy, improves scripts, and can later support a real human coverage team.

## Summary

ChefFlow should not promise "24/7 support" as a blanket claim until the product has a real monitored channel and routing rules. The market pattern is narrower and stronger: 24/7 intake, visible human escalation, urgent issue routing, AI or FAQ for routine answers, and slower evidence-based handling for disputes.

The best first move is a WhatsApp-first "24/7 Concierge" layer with Remy as triage and drafting support, not as a wall. Every path must preserve a one-tap "talk to a human" escape hatch, because WhatsApp Business policy and customer behavior both punish hidden human support.

## Detailed Findings

### Current ChefFlow Support Surface

ChefFlow's public Trust Center currently tells users to contact the chef first, then email support for serious service, payment, or cancellation issues. It explicitly says ChefFlow "does not promise emergency replacement coverage today" in the chef no-show or day-of issue copy. Evidence: `app/(public)/trust/page.tsx:56`, `app/(public)/trust/page.tsx:62`.

The public contact page currently frames support as email and a form, with metadata promising a response "within 1 business day." Evidence: `app/(public)/contact/layout.tsx:8`, `lib/contact/actions.ts:26`, `lib/contact/actions.ts:27`.

The contact card has a support-status concept, email address, response-time section, and hours summary, but no WhatsApp channel. Evidence: `app/(public)/contact/_components/contact-form.tsx:207`, `app/(public)/contact/_components/contact-form.tsx:256`, `app/(public)/contact/_components/contact-form.tsx:285`, `app/(public)/contact/_components/contact-form.tsx:313`.

ChefFlow already has business-hours support primitives. If no hours are configured, it shows "Monday - Sunday" and "We respond within 24 hours"; if hours are configured, it computes open or closed status and summarizes the schedule. Evidence: `lib/contact/public-support.ts:91`, `lib/contact/public-support.ts:99`, `lib/contact/public-support.ts:108`.

Remy has a voluntary "Send to Support" flow, but that is not currently a full support system. The action inserts into `remy_support_shares` with `status: 'open'`, and the visible UI can share a conversation, but the repo search only found this share action and schema, not a complete support inbox workflow. Evidence: `lib/ai/support-share-action.ts:29`, `lib/ai/support-share-action.ts:39`, `lib/ai/support-share-action.ts:44`, `components/ai/remy-drawer.tsx:486`, `components/ai/remy-drawer.tsx:488`.

Remy conversation privacy is useful for support trust. Conversations are stored browser-local by default, and only a selected conversation is shared when the chef taps "Send to Support." Evidence: `lib/ai/remy-local-storage.ts:2`, `lib/ai/remy-local-storage.ts:4`, `lib/ai/remy-local-storage.ts:13`, `database/migrations/20260322000049_remy_privacy_architecture.sql:64`.

### Benchmark: Take a Chef

Take a Chef publicly presents a human-forward contact model: email, mobile or WhatsApp, and chat box. The public FAQ says users can contact them by email, mobile or WhatsApp at a US number, or through chat. Source: Take a Chef FAQ lines 98-100, https://www.takeachef.com/en-us/faqs.

Take a Chef's help center is organized around searchable FAQs and clear categories such as Clients, Chefs, bookings, cancellations, troubleshooting, and payments. Source: Take a Chef Help Center lines 22-30, https://helpcenter.takeachef.com/complaint-policy.

Take a Chef's dispute model is not instant resolution. Complaints can be submitted within 24 business hours, evidence windows are defined, payment can be paused, and resolution is targeted within 72 business hours post-service. Source: Complaint Policy lines 47-58, https://helpcenter.takeachef.com/complaint-policy.

Inference: the excellent "always reachable" feeling likely comes from high-visibility messaging channels and concierge behavior, not a public promise that every issue is fully resolved instantly. ChefFlow should copy the channel and routing clarity, not overpromise refund, replacement, or dispute outcomes.

### Benchmark: Airbnb

Airbnb's public host protection copy promises support 24 hours a day, 7 days a week, in 64 languages. It separates urgent issues from non-urgent messages and adds a 24-hour safety line with specially trained safety agents. Source: Airbnb Resource Center lines 46-51, https://www.airbnb.com/resources/hosting-homes/a/how-airbnb-protects-hosts-5.

The useful pattern is support segmentation: urgent support gets direct phone or safety routing, routine product or account support uses messaging. ChefFlow's equivalent should be "live event issue" versus "product help" versus "dispute review."

### Benchmark: Uber Eats Merchant Support

Uber Eats merchant support separates channels by urgency and data sensitivity. It recommends chat for live orders, lists a typical chat wait time under 30 seconds, provides phone support 24/7 for restaurants, and sends sensitive account issues to email with a much longer response window. Source: Uber Help lines 41-48, 51-57, and 60-72, https://help.uber.com/en/merchants-and-restaurants/article/how-to-contact-support?nodeId=9693412c-a3e4-4fdd-be96-c8a2604eb945.

The useful pattern is not "everything is instant." The useful pattern is that live operational issues get the fastest channel, while sensitive or non-live issues get slower workflows.

### Benchmark: Eat App

Eat App's restaurant support page makes 24/7 availability explicit and offers multiple channels: in-app live chat, WhatsApp, web chat, phone, and email. Source: Eat App lines 70-84, https://restaurant.eatapp.co/knowledge/live-support.

The useful pattern for ChefFlow is channel redundancy, but the developer's constraint is no public personal phone. ChefFlow can still match the practical behavior with WhatsApp plus email plus in-app Remy/support share, while avoiding public phone calls.

### Benchmark: AI Support Platforms

Zendesk's 2026 CX report says 74% of consumers expect customer service to be available 24/7, and 88% expect faster response times than a year earlier. It also says 76% of consumers prefer support that accepts text, images, and video in the same thread. Source: Zendesk CX Trends lines 146-163, https://cxtrends.zendesk.com/.

Intercom's Fin model is explicit about human handoff. Fin can use public and private knowledge sources, can be targeted by audience, region, and channel, and automatically hands off when that is the safest option. Source: Intercom Help lines under "Human handoff" and "Audience targeting," https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained.

Zendesk's handoff model clarifies ownership: when a conversation is handed off to a live agent, agents are notified according to routing rules, and the AI agent no longer responds. Source: Zendesk handoff article snippet, https://support.zendesk.com/hc/en-us/articles/4408824482586-Managing-conversation-handoff-and-handback.

The useful pattern is "AI first where safe, human owns the thread after escalation." ChefFlow should not allow Remy to keep replying over a human in urgent or emotional threads unless the human explicitly hands it back.

### WhatsApp Constraint

WhatsApp automation requires an obvious human path. Blip's WhatsApp policy guide, summarizing WhatsApp Business Policy, says automated WhatsApp flows need a quick, clear, direct way to reach human agents, and examples include human transfer, phone, contact form, email, or physical-store redirection. It also says users must know the human option exists. Source: Blip Help lines 43-68 and 124-128, https://help.blip.ai/hc/en-us/articles/4474389735191-Human-Escalation-Policy-in-WhatsApp-Business.

This aligns with the product instinct: do not trap users in AI. The support flow should advertise "Message a human" as a first-class option, not as a hidden fallback.

## Recommended ChefFlow Model

### Public Promise

ChefFlow should eventually promise this, and only after the number and routing exist:

"24/7 WhatsApp support intake for urgent event, payment, and account issues. Remy can answer common questions instantly. A human can join the thread when you ask or when the issue needs review."

Avoid promising "24/7 resolution." The safer promise is 24/7 intake and urgent monitoring, with formal dispute windows.

### Support Lanes

P0 Live event issue: chef no-show, client cannot reach chef, payment failed on event day, unsafe situation, wrong address, locked access, severe dietary or allergy concern. Route to WhatsApp human immediately. Remy may collect event date, chef/client name, location, screenshots, payment reference, and risk type.

P1 Payment or trust issue: deposit paid but no confirmation, refund question, charge dispute, cancellation conflict, complaint evidence. Route to human with evidence checklist and SLA. Do not let Remy decide refund entitlement.

P2 Product help: login, profile, booking page, calendar, Stripe connection, invoice, quote, menu approval, settings. Remy and FAQ can answer first, with "talk to human" always visible.

P3 Sales/onboarding: new chef, operator walkthrough, marketplace listing, setup help. Route to founder/human during waking hours, with Remy collecting business type and setup goals.

### WhatsApp-First Rollout

Phase 0, manual but credible:

- Dedicated ChefFlow WhatsApp Business number, not the developer's personal number.
- Public CTA: "WhatsApp Support" on Contact, Trust, booking confirmation, payment receipt, and app help surfaces.
- WhatsApp Business labels: `P0 live event`, `P1 payment`, `P1 complaint`, `P2 product`, `P3 onboarding`, `waiting on user`, `waiting on chef`, `resolved`.
- Quick replies for the top 25 support situations.
- Auto-reply: "Got it. I am collecting the details now. Type HUMAN any time."

Phase 1, assisted inbox:

- Webhook every WhatsApp thread into a `support_cases` table.
- Remy triages intent and urgency, drafts the first reply, and suggests the next human action.
- Human owner gets push/email/SMS-style alert for P0 and P1. Do not rely on a dashboard being open.
- Every human answer can be marked "turn into FAQ" or "add to support script."

Phase 2, real hybrid:

- Remy answers P2 FAQ questions directly from the canonical knowledge base.
- Remy can read structured ChefFlow state for the logged-in user, such as event status, payment trail, quote state, and support case status.
- Remy cannot promise refunds, replacement chefs, legal outcomes, or support actions that were not actually performed.
- Human handoff pauses AI responses until the human closes or hands back the case.

Phase 3, follow-the-sun:

- Regional routing by user timezone, event timezone, language, and case lane.
- Offshore or contractor coverage starts with P0/P1 playbooks only.
- Support QA reviews transcripts weekly and updates scripts, FAQ, and Remy retrieval.

## FAQ And Knowledge Base Strategy

The FAQ should become the source of truth for both humans and Remy. Every answer should have:

- Audience: chef, client, guest, vendor, public lead.
- Lane: P0, P1, P2, P3.
- Source of truth: product behavior, terms, Stripe policy, chef agreement, or support policy.
- Allowed Remy answer.
- Human escalation trigger.
- Required evidence or screenshots.
- Last reviewed date.

Initial FAQ clusters:

- How do I reach support?
- What counts as urgent?
- What if a chef cancels or no-shows?
- What if a client cancels?
- What if payment fails?
- Can ChefFlow refund me?
- Can ChefFlow replace a chef?
- How do menu approvals work?
- How do deposits and final payments work?
- What does Remy know, and when should I talk to a human?
- What data is shared when I use Send to Support?

## Implementation Risks

Truth risk: public copy must not say 24/7 until the WhatsApp number is live, monitored, and tested. Current public copy says 1 business day, so changing it without the system would create a false promise. Evidence: `app/(public)/contact/layout.tsx:8`, `lib/contact/actions.ts:27`.

Operational risk: "I am the 24/7 person" is acceptable as a seed phase only if the product copy says "urgent issues are monitored" rather than "instant human resolution." Otherwise ChefFlow creates an SLA it cannot reliably keep.

AI trust risk: Remy should never be the only route. The visible support design must include a human option on every automated support surface. This is both a customer-experience requirement and a WhatsApp automation requirement.

Privacy risk: Remy support shares are deliberately opt-in. Any WhatsApp integration must preserve the same principle: do not silently send private Remy conversation content to support. Evidence: `lib/ai/remy-local-storage.ts:4`, `lib/ai/support-share-action.ts:29`.

## Gaps And Unknowns

Take a Chef's public pages confirm WhatsApp, mobile, chat, help center structure, and complaint windows, but they do not disclose their regional staffing model, routing logic, or after-hours schedule.

ChefFlow needs a real support phone or WhatsApp number decision before public copy can change.

ChefFlow needs a canonical source of support policy truth before Remy can safely answer refund, replacement, emergency, or complaint questions.

ChefFlow needs a support admin/inbox surface. Current evidence shows Remy support shares can be created, but not a mature support operations console.

## Recommendations

Quick fix: create a dedicated WhatsApp Business number and draft the initial public promise as "24/7 WhatsApp intake for urgent issues," not "24/7 resolution."

Quick fix: add a support matrix doc with P0/P1/P2/P3 definitions, response targets, required evidence, and "Remy can answer" versus "human required" boundaries.

Quick fix: write the first 25 WhatsApp quick replies and FAQ answers. Treat them as training data for Remy and scripts for the human operator.

Needs a spec: build `support_cases` as an additive table plus a support inbox. It should ingest public contact forms, Remy support shares, and later WhatsApp webhooks. It should not replace existing `contact_submissions` until migrated intentionally.

Needs a spec: build Remy support triage with explicit human handoff. Handoff must pause AI ownership and pass a structured summary to the human.

Needs discussion: choose the initial WhatsApp implementation path. For a solo founder, the WhatsApp Business app plus labels is fastest. For a productized support system, use WhatsApp Cloud API through a shared inbox provider or direct webhook integration.
