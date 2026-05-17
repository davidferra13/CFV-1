# Intensify: social-media-feeds (Facebook Staple)

## Deep-Pass Run 2026-05-17

STATUS: partially-mined
DEPTH: normal

SURFACED:

- Facebook Events API is the #1 unwired revenue channel. Distribution panel UI + ticket source enum exist, no API adapter.
- Meta Pixel + CAPI missing from all public pages. Zero attribution. Can't prove any social post drives bookings.
- CIL signals (dead spots, seasonal peaks, completed events) have no bridge to social queue. Intelligence exists but doesn't generate content.
- Post-event auto-content pipeline has all pieces (photos, AI captions, social queue) but no end-to-end wiring.
- RSS feed only emits chef profiles + comparison pages. Events, menus, seasonal content not syndicated.
- Organization JSON-LD missing sameAs social links. Google entity graph disconnected from FB Page.
- Publishing engine is production-grade (CAS claims, retry logic, token refresh, per-platform captions).

LENSES_USED:

- Growth Marketing Strategist (food/hospitality): Facebook Events as organic discovery, post-event content flywheel
- Platform API Engineer (Meta Graph API): Technical feasibility, permission scopes, rate limits
- Revenue Attribution Specialist: Pixel + CAPI for conversion tracking
- Private Chef Business Owner: Real-world validation of what drives bookings
- Content Flywheel Architect: Signal-driven content, compounding returns

EXPERT_VALIDATION:

- FB Events API: endorsed - highest organic reach for local food events, free distribution
- Meta Pixel + CAPI: endorsed - non-optional for attribution, iOS 14+ requires server-side
- CIL social bridge: endorsed - timely signal-driven content converts 5-10x vs planned content
- Post-event pipeline: endorsed - lowest-friction content type, removes chef posting barrier
- RSS expansion: endorsed - enables IFTTT/Zapier automation without custom code
- JSON-LD sameAs: endorsed - 5-minute fix, free SEO lift
- FB Shop Catalog: cautioned - Meta Commerce API unstable, high maintenance, do after core moves

EXPERT_ADDITIONS:

- Server-side CAPI critical because iOS 14+ blocks ~40% of Pixel events
- Event recap posts should link to booking page, not just chef profile
- sameAs in Organization JSON-LD (5-minute fix, missed by intensify)

REJECTED:

- Facebook Groups API mirroring: Groups API heavily restricted post-Cambridge Analytica, manual only
- Facebook Marketplace listings: Wrong channel for services, would confuse brand
- Paid ads automation: Premature. Wire organic first, prove with Pixel, then consider.

ACTED ON: (pending dispatch)

- Move 1: FB Events API adapter
- Move 2: Meta Pixel + CAPI
- Move 3: CIL social bridge
- Move 4: Post-event pipeline wiring
- Move 5: RSS/JSON feed expansion
- Move 6: JSON-LD sameAs fix

SKIPPED:

- FB Shop Catalog: Wait until Moves 1-4 stable
- Eventbrite API: Separate zone
- Groupon: Explicitly parked in spec

CROSS_REFS:

- [[cil]]: CIL signals are the trigger source for auto-content
- [[ticketed-events]]: FB Events API depends on ticket infrastructure (already built)
- [[public-surfaces]]: All public pages need Pixel, OG metadata already present
- [[content-pipeline]]: Post-event content drafts feed into social queue

NEXT TRIGGER: Chef connects FB Page via OAuth and creates first FB Event from ChefFlow

BUILD_PROMPTS:

Wave 1 (3 agents, parallel): fb-pixel-and-capi (opus), jsonld-sameas-fix (haiku), rss-feed-expansion (haiku)
Wave 2 (2 agents, after W1): fb-events-api-adapter (opus), cil-social-bridge (opus)
Wave 3 (1 agent, after W2): post-event-pipeline-wiring (haiku)
Total: 3 haiku + 3 opus
Status: PENDING
