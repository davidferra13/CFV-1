# Chef Network & Community

**What:** Full chef-to-chef interaction platform. 12 systems: connections, social feed, collab spaces, handoffs, opportunities, dinner circles, community directory, mentorship, subcontracting, peer benchmarking, introduction bridges, referral intelligence.

**Routes:**

- `/network` (Feed, Channels, Discover, Connections, Collab tabs)
- `/network/[chefId]` (Chef profile with cuisines, availability, trust level, collab space link)
- `/network/collabs` (Collab spaces list)
- `/network/collabs/[spaceId]` (Individual collab space)
- `/network/bridges/[bridgeId]` (Introduction bridge detail)
- `/network/notifications` (Social notifications)
- `/network/saved` (Saved/bookmarked posts)
- `/network/channels/[slug]` (Channel view)
- `/community` (Hub: directory, mentorship, subcontracts, messaging, benchmarks, templates, roadmap)
- `/community/directory` (Chef directory + public listing search)
- `/community/mentorship` (Mentorship profile, dashboard, mentor search)
- `/community/subcontracts` (Subcontract agreements, COI tracking, roster)
- `/community/messaging` (Peer-to-peer messaging)
- `/community/benchmarks` (Anonymous peer benchmarking)
- `/community/templates` (Community template sharing)
- `/community/roadmap` (Feature board + voting + roadmap)
- `/community/profile` (Community profile + directory listing editor)
- `/circles` (Chef's dinner circles overview + "Browse Circles" link to discovery)
- `/hub/circles` (Public: community circles discovery page, search, topic filter, create)

**Status:** LIVE (with open P2 items)

## What's Here

### Trust Ladder

- Connection system: request, accept, decline, remove (with cascade to trusted circle + collab spaces)
- Trusted circle: 3 tiers (partner, preferred, inner_circle)
- Trust level visible on chef profile page

### Social Platform

- Post composer with visibility (public/connections/private), channels, location tagging
- Stories bar (ephemeral, Instagram-style)
- Social feed (for_you, following, channel modes)
- Channel grid, trending hashtags, discover panel
- Post interactions: likes, comments, saves, shares

### Collaboration

- Event collaborators: invite, accept, role-based permissions (can_modify_menu, can_view_financials, etc.)
- Collab handoffs: structured lead passing with full inquiry data
- Collab spaces: persistent messaging threads between chefs
- Introduction bridges: 3-way introductions between chef, client, target chef
- Opportunity network: structured job postings with interest tracking

### Universal Community Circles

- Any authenticated user (chef or client) can create topic-based circles
- Public or private visibility, discoverable via `/hub/circles`
- Discovery page: search by name, filter by topic, paginated grid
- Creation form: name, description, emoji, visibility, topic tags (20 suggestions)
- Uses `tenant_id = null` pattern (separate from chef business circles)
- Universal profile resolution via `getOrCreateUniversalHubProfile()`
- Rate limited: 5 circles/hour per user, 60 discovery requests/15min per IP
- Full hub messaging, members, photos, polls work out of the box
- Conditional language across join flows, emails, welcome cards
- Invite cards and in-circle copy now adapt to chef, client, or member context while preserving one shared join-link path
- Join activity keeps inviter attribution in the thread so circles can see who brought new members in
- Dinner Circle Meals tab now acts as the residency weekly board, with persistent household dietary context, per-meal allergen conflict flags, attendance/comments, and weekly shopping-list generation for chefs
- Nav badge includes community circle unreads
- Question set: 47 BUILT, 2 GAP (moderation, future work), 5 N/A

### Community Features

- Chef directory with cuisine/area/referral filters
- Public directory listings with search, dietary, and service type filters
- Mentorship: profiles, search, connections, stats
- Subcontracting: agreements, COI tracking, roster management
- Peer messaging between community members
- Anonymous peer benchmarks (event price, food cost %, retention)
- Feature request board with voting and admin status management
- Community template sharing (menus, recipes, response templates, proposals)

### Data Integrity (fixed via system integrity interrogation)

- removeConnection cascades to trusted circle + archives collab spaces (G3)
- Event cancellation notifies all collaborators (G5)
- Prep timeline accessible to accepted event collaborators (G2)
- Contact share acceptance auto-creates client record (G4)
- Settlement confirmation creates ledger entries per event+client (G9)
- Opportunity interest exposes bridge data for handoff/invite actions (G1)
- Chef profile enriched with cuisines, availability, trust, collab space (G7)
- Introduction bridge circles adopted by ensureCircleForEvent (G13)

## Open Items (P2)

- No reputation system; collab metrics private (G8)
- Handoff doesn't auto-populate from inquiry (G10)
- Conversion not linked to referral chain (G11)
- Availability posts and signals are separate systems (G12)
- Mentorship has no operational bridge (G14)
- COI tracking disconnected from event collaboration (G15)
- No unified relationship view between two chefs (G16)
- No aggregate financial history across co-hosted events (G18)
- Team roles stored but never enforced (G19)
- Templates fork completely; no provenance (G20)
