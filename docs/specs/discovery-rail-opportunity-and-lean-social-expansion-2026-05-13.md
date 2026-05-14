# Discovery Rail Opportunity And Lean Social Expansion

> Status: captured and queued as deferred/blocked intake
> Date: 2026-05-13
> Build queue: added as blocked items only
> Implementation: do not build until the current in-flight run completes and the developer explicitly promotes/fires these items

## Current Build Run Guardrail

The developer has an agent actively building the existing in-flight queue. This document and the queue items linked from it are not for that agent.

Do not treat this as permission to implement in the main workspace. Use it only as product/source material for future grooming.

## Raw Developer Signal, Verbatim

> Now, one huge thing I'd like to say is the discovery rail is an amazing thing to have because now we can shove things in people's faces and force them to see things without being annoying or emailing them or making them scroll or find it. Like, things just come to them. So, it's really good that we're adding all these features. And one really good thing that we need to add would be, like, discounts. Like, a chef should be able to have discounts or openings, you know? What if a chef has a last-minute opening? That should show up, like, in red or reddish gold, red and gold, to show that there's an opening and, like, a discount. We also have cool opportunities where right now a chef works with somebody that has a ton of locations. So I'm a chef that could be, that hosts, I, and I could host, I'm hosted at a ton of Airbnbs and I work with a ton of people that have locations. And I can put my clients' Airbnbs literally in the discovery thing for my partners. And then they could either benefit from this by financially paying me or not. Or this could just be a free feature. Like, there's, you know, that's a huge feature in itself. And, but please go ahead and add absolutely every single thing that you just added right now, if you think it's practical, without creating any bloat, please. Please do not ruin this feature. This feature still needs to be slick. We don't wanna add too many things. I know I said A through Z, but I don't want, I didn't want you to force it and literally give me one for A through Z. I wanted you to find things that were actually practical and necessary. But I do like some of the selections. Tell me what you decide you'd like to keep from your selections while also piggybacking off of mine and writing down everything I said verbatim.I love the relationship graph, though. That would be a really cool idea. There's a lot of things you can do with that. Like, for example, one thing with the relationship graph is that it, it would know that person's anniversary, maybe, and it would help that person plan it out. Or like, it would know, you know, that would just be one little thing, or it would know, like, every single thing you said was actually amazing. We just don't wanna create any bloat, and, and um, we could hit it, there could be a point in a certain threshold where, where we start to create diminished returns. And you know what? It might be good to add everything, but we, but as long as we just, um, figure out a method that always runs in the background where every single thing that gets added to the discovery rail has a population formula that obviously changes depending on what version it's in, and what's toggled, and yada yada, and all the nuances and the weights and the balances, and the rations, but, and the reasoning. But it'd be very good to, I guess, to add all these things. And then that person can opt in or out of using them without being overwhelmed. Or we can use everything and turn things on for people automatically, and also some things that are very rare, like someone's anniversary. Like, we could literally just have that on a toggle when their anniversary is coming up, and, like, have it on like a whole month, have it like a month and a half, or like six, have it like six weeks out, it starts helping them plan their anniversary. You know, we could have stuff like that whenever we build things, or like whenever we build something That is cool, but we don't wanna overpopulate things. Um, we can just have it like show up like a like a certain like X amount of times. We can have, we can either have things show up a certain amount of times, but I think it's be more likely to have things show up um on a percentage amount of time. We should never really have an amount of times that things show up, unless certain stuff, like a featured opportunity, or, but obviously there's gonna be things that go away. But then we can have stuff like if a chef want, like, say for example, a chef Just a chef wants to feature a summer menu. Now their summer menu can be featured. They can feature a menu, you know? And that menu can show up on all of their clients' portals, and they can tap it. Or even a, even, let's say, for example, if a person adds a chef, that chef already comes with a whole bunch of upgrades to your rail, and you can choose what you want to have on or off. And for example, now that you follow that chef, You can have a, you'll just have a chef rail, or now you'll have a chef, you'll have a chef percentage that pops up now in the correct spot, where now you can see what they're promoting or like their service packages, or like you can try to get a last-minute dinner with them, or like if a chef is saying that they have this day open, like you'll see it. Like there's cool opportunities now like that. So everything that you said, I actually really enjoy. So please go ahead and start adding everything to the building queue.Absolutely verbatim, don't miss a single thing.

## What To Keep From The A-Z Pass

Keep the practical foundations that make the rail useful without making it noisy:

- Relationship Graph
- Circle Rules Engine
- Visibility, Consent, and Cross-Context Safety
- Universal Food Object Actions
- Memory Capture
- Unified Notifications and Quiet Modes
- Universal Search / What-To-Eat-Now Flow
- Partner, Vendor, and Location Opportunity Profiles
- Quality/Safety Controls where public/social surfaces are involved
- Rail Population Formula and Ranking Governance

Do not keep the A-Z list as 26 separate features. That would create bloat. Collapse it into a small number of deep infrastructure items.

## Product Interpretation

The Discovery Rail should become a controlled attention surface. It lets ChefFlow show users useful opportunities without email, spam, endless scrolling, or forcing them to search manually.

The rail can surface:

- chef discounts
- last-minute openings
- open booking windows
- featured menus
- seasonal menus
- chef service packages
- partner locations
- Airbnb/private-location opportunities
- anniversary planning prompts
- relationship-aware planning prompts
- circle activity
- saved/followed chef updates
- client portal opportunities
- "what to eat now" prompts

The key constraint is density. The rail must stay slick. Every item needs a population formula, reason, expiry, visibility policy, and opt-out path.

## Future Queue Items Created

These were added as blocked/deferred queue items, not active items:

- `BQ-20260512-224612-deferred-discovery-rail-opportunity-marketplace`
- `BQ-20260512-224612-rail-population-formula-and-signal-governance`
- `BQ-20260512-224613-relationship-graph-and-life-event-planner`
- `BQ-20260512-224613-lean-circle-rules-and-social-safety-foundation`
- `BQ-20260512-224613-visibility-consent-and-cross-context-safety-cent`
- `BQ-20260512-224613-universal-food-object-actions-and-memory-capture`
- `BQ-20260512-224613-unified-food-signal-notifications-and-inbox`
- `BQ-20260512-224613-what-to-eat-now-universal-search-and-recovery`
- `BQ-20260512-224614-partner-location-and-vendor-opportunity-profiles`
