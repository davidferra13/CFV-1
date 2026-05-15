# Discovery Rail: Massive Overhaul Design

**Date:** 2026-05-14
**Status:** Spec
**Priority:** P0
**Scope:** 7-layer overhaul of the public homepage discovery rail
**Estimated builds:** 28

## Summary

Transform the discovery rail from a scrolling emoji-pill tray into a living, image-rich, intelligence-powered food-discovery experience. Each of 7 layers delivers BOTH a visible upgrade AND wires more of the existing (40% built, tested, unwired) contract layer. Every build moves two needles: how it looks and how it thinks.

## Design Decisions (Locked)

| Decision         | Choice                             | Rationale                                                                                                                                                |
| ---------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approach         | Full Monty (7-layer interleaved)   | Each layer compounds. Can pause after any layer with a coherent product.                                                                                 |
| Visual treatment | Hybrid per lane                    | Taste = food photography. Occasion = abstract gradient/icon. ChefFlow Picks = chef data with food photo fallback.                                        |
| Mobile strategy  | Compact horizontal rails           | 3-lane model consistent across devices. Snap-scroll, larger cards, swipe-to-save gesture, relevance-scored mobile projection row.                        |
| Remy integration | Search bar IS Remy + silent badges | Natural language search input powered by Remy NLP. Ambient intelligence badges on items ("matches budget", "available this weekend"). No chatbot bubble. |
| Social boundary  | 4 safe families now, 7 queued      | opportunity_marketplace, what_to_eat_now, universal_food_object, shared_circle_discovery ship now. Rest waits for real data.                             |

---

## Layer 1: Visual Foundation (4 builds)

**Goal:** Replace emoji pills with premium image-backed cards. Wire `control-rail-contracts.ts` assembly logic.

### Build 1.1: Image Card System

**What changes:**

- New `DiscoveryCard` component replacing inline pill rendering in `cuisine-marquee.tsx`
- Three card variants matching the hybrid visual strategy:
  - `FoodPhotoCard` (Taste lane): curated food photography backgrounds, cuisine name overlay with gradient scrim, subtle parallax on scroll
  - `AbstractCard` (Occasion lane): signature gradient palette per occasion type, geometric pattern overlays, icon treatment
  - `ProofCard` (ChefFlow Picks lane): chef profile photo when available, food photography fallback, proof badges (available, featured, price tier)
- Card dimensions: 200x140 desktop, 170x120 mobile (up from 180x120 / 160x100)
- All cards share: rounded-2xl, subtle border, backdrop-blur, hover lift + glow

**Image strategy (no external API dependency):**

- Create `lib/discovery/image-map.ts`: static mapping of cuisine slugs, occasion types, and ingredient categories to curated image paths
- Images sourced from Unsplash/Pexels (free license), stored in `public/discovery/` organized by category
- Initial set: 40 cuisine images, 15 occasion images, 10 vibe images, 10 ingredient images = ~75 images
- WebP format, optimized to ~30KB each, lazy-loaded with blur placeholder
- Fallback chain: mapped image -> category default -> gradient treatment (never broken image)

**Wiring:**

- Wire `assembleDiscoveryRailItems()` from `control-rail-contracts.ts` to replace the ad-hoc assembly in `cuisine-marquee.tsx`
- Wire `classifyDiscoveryRailSlot()` for practical/editorial/ambient classification
- Wire slot policy enforcement (max 20% non-practical, no adjacent non-practical, first slot practical)

**Files to create:**

- `components/discovery/discovery-card.tsx` (card component with 3 variants)
- `lib/discovery/image-map.ts` (static image mapping)
- `public/discovery/cuisine/` (40 images)
- `public/discovery/occasion/` (15 images)
- `public/discovery/vibe/` (10 images)
- `public/discovery/ingredient/` (10 images)

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (swap pill rendering for DiscoveryCard)
- `app/(public)/page.tsx` (pass assembled items instead of raw pools)

### Build 1.2: Typography and Color System

**What changes:**

- Discovery-specific type scale: rail heading (text-lg/semibold), lane label (text-sm/medium with colored dot), card title (text-sm/semibold), card sublabel (text-xs/regular at 65% opacity), eyebrow (text-[10px]/uppercase/tracking-widest)
- Lane-specific color palettes (replacing the 5 ad-hoc pill color schemes):
  - Taste: warm amber/gold family (`amber-400` through `amber-900`)
  - Occasion: cool sage/emerald family (`emerald-400` through `emerald-900`)
  - ChefFlow Picks: rich purple/violet family (`violet-400` through `violet-900`)
- Consistent opacity scale: primary text 95%, secondary 70%, tertiary 45%, disabled 25%
- Dark theme tokens in CSS custom properties for easy theming

**Files to modify:**

- `app/globals.css` (discovery section: replace ad-hoc colors with CSS custom properties)
- `app/(public)/_components/cuisine-marquee.tsx` (apply new type/color tokens)

### Build 1.3: Depth and Glassmorphism

**What changes:**

- 3-layer depth system for the discovery section:
  - Background layer: subtle gradient mesh (dark, barely visible)
  - Rail layer: `backdrop-blur-2xl bg-white/[0.03]` container with soft border
  - Card layer: each card floats above with box-shadow and slight translate-z
- Edge fade masks upgraded: 8% desktop / 6% mobile (tighter for larger cards)
- Lane separators: replace `border-stone-800/30` with gradient fade lines
- Container: max-w-6xl (up from max-w-2xl) to give cards room to breathe

**Files to modify:**

- `app/globals.css` (depth tokens, gradient mesh background)
- `app/(public)/_components/homepage-discovery.tsx` (container width upgrade)
- `app/(public)/_components/cuisine-marquee.tsx` (depth classes on cards and rows)

### Build 1.4: Responsive Card Grid

**What changes:**

- Desktop: 3 rows, each showing 5-6 cards visible at a time (scrollable)
- Tablet (768-1024px): 3 rows, 4 cards visible, slightly smaller cards
- Mobile (< 768px): 3 compact rows with snap-scroll, 2.5 cards visible (peek pattern)
- Mobile cards: taller aspect ratio (160x130) for better thumb targets
- Gap between cards: 12px mobile, 16px desktop
- Row height standardized per lane (no variable heights within a row)

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (responsive card sizing, snap-scroll on mobile)
- `app/globals.css` (responsive breakpoint tokens)

---

## Layer 2: Motion and Feel (4 builds)

**Goal:** Replace basic auto-scroll with physics-based motion. Wire `resolveDiscoveryRailMotionContract()`.

### Build 2.1: Physics-Based Scroll Engine

**What changes:**

- Replace the current dual-sine-wave auto-scroll with the motion contract system from `control-rail-contracts.ts`
- Four motion modes wired from `resolveDiscoveryRailMotionContract()`:
  - `passive`: no auto-scroll, manual drag only (default for `prefers-reduced-motion`)
  - `flick`: momentum-based, fast flicks get 900ms auto-stop, natural deceleration
  - `dice`: staggered row stops at 1400ms intervals (each row settles independently)
  - `lever`: manual top-to-bottom cascade at 4500ms
- Default mode: `flick` on desktop, `passive` with snap-scroll on mobile
- Scroll velocity tracking with exponential decay (0.94/frame, cap 3.2px/frame) already exists; wire it to the contract

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (replace sine-wave scroller with motion contract)

### Build 2.2: Micro-Interactions

**What changes:**

- Card hover: scale(1.04) + translateY(-3px) + lane-colored glow (150ms ease-out)
- Card press: scale(0.97) + subtle shadow reduction (80ms)
- Card select: border pulse animation (amber for taste, emerald for occasion, violet for picks)
- Feedback buttons (love/pin/hide): spring-in on hover, bounce on click, confetti burst on love
- Filter token add: slide-in from the card that generated it
- Filter token remove: shrink + fade
- Pause/play button: morph animation between icons
- Row label dot: pulse animation when row content updates

**Files to modify:**

- `app/globals.css` (keyframe definitions for all micro-interactions)
- `app/(public)/_components/cuisine-marquee.tsx` (interaction event handlers)
- `components/discovery/discovery-card.tsx` (hover/press/select states)

### Build 2.3: Entrance Choreography

**What changes:**

- Replace current staggered slide-in with a richer sequence:
  1. Rail container fades in with backdrop-blur growing from 0 to full (200ms)
  2. Lane labels appear with typewriter effect (left to right, 60ms per character)
  3. Cards cascade in from left, each 40ms behind the previous, with slight upward float
  4. First card in each row gets a brief spotlight glow (draws the eye)
  5. After all cards visible, auto-scroll begins with a gentle acceleration curve
- Mobile: simplified to container fade + cards snap into place (no cascade on slow connections)
- Respect `prefers-reduced-motion`: instant appear, no cascade

**Files to modify:**

- `app/globals.css` (new keyframe sequences)
- `app/(public)/_components/cuisine-marquee.tsx` (entrance orchestration logic)

### Build 2.4: Swipe Gestures (Mobile)

**What changes:**

- Horizontal snap-scroll with CSS `scroll-snap-type: x mandatory` on each row
- Swipe-to-save: quick upward flick on a card saves it (heart animation + toast)
- Swipe-to-dismiss: quick downward flick hides the item (fade-out + undo toast)
- Velocity threshold: 0.5px/ms minimum for swipe gestures (prevents accidental triggers)
- Visual affordance: slight card tilt in swipe direction (max 3 degrees)
- Haptic feedback via `navigator.vibrate(10)` on gesture recognition (where supported)

**Files to create:**

- `lib/discovery/swipe-gesture.ts` (gesture recognizer: direction, velocity, threshold)

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (mobile gesture handlers)
- `components/discovery/discovery-card.tsx` (tilt transform during swipe)

---

## Layer 3: Intelligence Wiring (4 builds)

**Goal:** Connect the tested-but-unwired contract layer. The rail becomes stateful, context-aware, and self-governing.

### Build 3.1: Session Lifecycle

**What changes:**

- Wire `createDiscoverySession()` and `applyDiscoveryRailItemToSession()` from `session-lifecycle-contract.ts`
- Session created on first rail interaction (click, select, or filter)
- Session stored in `sessionStorage` (anonymous) or synced to server (authenticated)
- Session drives: active filters, selected items, locked items, compare list, Remy hints
- Session expires after 120 minutes (TTL from contract)
- Three reset commands available via UI:
  - "Clear filters" = `current_search` scope
  - "Shuffle" = `fresh_mix` scope (new seed, same preferences)
  - "Start over" = full reset with confirmation

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (session init, item interactions route through session)
- `app/(public)/_components/homepage-discovery.tsx` (session state provider)

**Files to create:**

- `lib/discovery/use-discovery-session.ts` (React hook wrapping session lifecycle)

### Build 3.2: Feature Flag System

**What changes:**

- Wire `getDiscoveryFeatureDecision()` from `rail-feature-flags.ts` to gate new features
- 12 flags evaluated at render time based on user role
- Flags that go ON with this build:
  - `recent_searches` (show recent search pills above the rail)
  - `saved_locations` (location switcher in search bar)
  - `one_tap_feedback` (love/hide directly on cards without hover)
- Kill switch wired: admin can disable any feature or all discovery features via a config object
- Feature decisions logged to `discovery_interactions` for A/B analysis

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (conditional rendering based on feature flags)
- `app/(public)/_components/homepage-search.tsx` (recent searches, saved locations)
- `app/(public)/page.tsx` (resolve feature flags server-side, pass to components)

### Build 3.3: Control Rail Assembly

**What changes:**

- Wire `assembleDiscoveryRailItems()` fully (Build 1.1 started this; this build completes it):
  - Cooldown enforcement: items seen in last 4 hours get deprioritized
  - Impression timestamps tracked in localStorage
  - Slot policy auditing via `evaluateDiscoveryRailSlotPolicy()`: warnings logged for policy violations
  - Pinned items guaranteed first position
  - Saved items guaranteed top 3
  - Seeded deterministic shuffle (same user sees same order within a session, different order next session)
- Wire `classifyDiscoveryRailSlot()` to drive visual treatment:
  - `practical` items: standard card treatment
  - `editorial` items: story card treatment with eyebrow
  - `ambient` items: subtle/muted card treatment (lower contrast, smaller)

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (full assembly pipeline replaces ad-hoc logic)
- `lib/discovery/track-discovery-click.ts` (impression timestamp recording)

### Build 3.4: Undo Stack

**What changes:**

- Wire `undo-stack.ts` for reversible discovery actions
- Actions that push to undo stack: hide, dismiss, clear filters, remove from shortlist
- Undo toast appears for 8 seconds with "Undo" button
- Stack depth: 10 actions maximum
- Keyboard shortcut: Ctrl+Z / Cmd+Z undoes last action when discovery section is focused
- Undo restores: the item to its position, the filter state, the session state

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (undo integration on hide/dismiss)
- `components/discovery/discovery-feedback-toast.tsx` (undo button in toast)

**Files to create:**

- `lib/discovery/use-discovery-undo.ts` (React hook wrapping undo stack)

---

## Layer 4: Remy Integration (4 builds)

**Goal:** The search bar becomes Remy-powered. Natural language in, intelligent rail filtering out. Silent badges on items.

### Build 4.1: Remy-Powered Search Bar

**What changes:**

- Replace the current location + service type dropdown with a single natural language input
- Input accepts anything: "Italian dinner for 4 this Saturday under $100", "vegan brunch near me", "something fancy for our anniversary"
- On submit: `translateCasualDiningIntent()` from `discovery-runtime.ts` parses the input into filter operations
- Parsed filters applied to the session, rail reorders live
- Below the input: parsed intent shown as editable tokens ("Italian", "4 guests", "Sat", "< $100") so user can see what Remy understood and remove/edit individual filters
- Location input preserved as a secondary field (auto-detected or manual)
- Typewriter placeholder updated: cycles through natural language examples ("Romantic dinner for two...", "Vegan catering for 20...", "Quick weeknight meal...")

**Files to modify:**

- `app/(public)/_components/homepage-search.tsx` (full rewrite to Remy-powered input)
- `app/(public)/_components/homepage-discovery.tsx` (connect search output to session filters)

### Build 4.2: Intent Parsing Feedback

**What changes:**

- When Remy parses a search, show a brief "understanding" animation:
  - Input text fades slightly
  - Parsed tokens appear below with a staggered slide-in
  - Each token is color-coded by filter dimension (cuisine = amber, budget = emerald, timing = sky, etc.)
  - Unrecognized parts of the query get a subtle "?" badge; clicking it refines
- If parse confidence is low, show a disambiguation prompt: "Did you mean dinner party (occasion) or dinner (meal type)?"
- Parse results cached in session: same query doesn't re-parse

**Files to create:**

- `components/discovery/remy-parse-tokens.tsx` (parsed intent token display)

**Files to modify:**

- `app/(public)/_components/homepage-search.tsx` (parse feedback UI)

### Build 4.3: Silent Intelligence Badges

**What changes:**

- Items in the rail can display ambient badges based on Remy analysis:
  - "Matches your budget" (green checkmark) when item's price tier fits parsed budget
  - "Available this weekend" (calendar icon) when timing matches
  - "Near you" (pin icon) when location context matches
  - "Popular choice" (trending icon) when item has high engagement
  - "New to ChefFlow" (sparkle icon) for recently added items
- Badges sourced from `buildRemyNextActionHandoff()` missing signal inference
- Max 1 badge per item (highest priority wins)
- Badges animate in 200ms after cards are visible (staggered, not simultaneous)

**Files to create:**

- `components/discovery/intelligence-badge.tsx` (badge component with 5 variants)
- `lib/discovery/badge-resolver.ts` (determines which badge each item gets)

**Files to modify:**

- `components/discovery/discovery-card.tsx` (badge slot on cards)

### Build 4.4: Conversational Refinement

**What changes:**

- After initial search, the search bar transforms into a refinement input
- Placeholder changes to "Refine: try 'but cheaper' or 'add seafood' or 'this Friday instead'"
- Remy's `parseRemyUndoCommand()` handles: "undo", "go back", "remove the budget filter"
- Additive refinements: "also vegan", "but closer", "for 6 instead of 4"
- Each refinement updates session filters incrementally (not full re-parse)
- Refinement history shown as a breadcrumb trail above the tokens

**Files to modify:**

- `app/(public)/_components/homepage-search.tsx` (refinement mode)
- `lib/discovery/use-discovery-session.ts` (incremental filter updates)

---

## Layer 5: Personalization Surface (4 builds)

**Goal:** Make the intelligence visible. Users see WHY items appear and can shape their taste profile.

### Build 5.1: "Why This?" Tooltips

**What changes:**

- Every card gets a small info icon (top-right, appears on hover/long-press)
- Clicking shows a tooltip explaining why this item appeared:
  - "Based on your Italian cuisine interest" (from boosted cuisines)
  - "Trending in your area this week" (from engagement data)
  - "You saved a similar chef last month" (from preference ranking)
  - "Seasonal peak: these ingredients are at their best right now" (from culinary signals)
  - "Random discovery pick" (from surprise/novelty injection)
- Reason sourced from `debugScore.reason` already attached by scoring engine
- Tooltip styled consistently with card's lane color

**Files to create:**

- `components/discovery/why-this-tooltip.tsx` (tooltip component)

**Files to modify:**

- `components/discovery/discovery-card.tsx` (info icon + tooltip trigger)

### Build 5.2: Taste Passport Display

**What changes:**

- Above the rail (below search): a compact "Your Taste" summary strip (authenticated users only)
- Shows: top 3 cuisine preferences as small image chips, preferred budget range, dietary tags, location
- Data sourced from `getUserScrollSignals()` which already runs in `page.tsx`
- Tapping any chip filters the rail to that preference
- "Edit preferences" link goes to `/my-preferences/discovery` (already built)
- Anonymous users see: "Sign in to personalize your discovery" with a subtle CTA

**Files to create:**

- `components/discovery/taste-passport-strip.tsx` (compact preference display)

**Files to modify:**

- `app/(public)/_components/homepage-discovery.tsx` (render strip between search and rail)
- `app/(public)/page.tsx` (pass user signals to discovery component)

### Build 5.3: Scoring Transparency

**What changes:**

- Developer/debug mode: toggle that shows the composite score on every card
- Score breakdown: editorial (position + type boost) + preference (learned signals) - negative penalty
- Visualized as a small colored bar: green = high preference match, amber = editorial boost, red = negative signal
- Toggle via feature flag `data_freshness_dashboard` (admin only)
- Production users: no visible scoring, but scores logged to analytics for model improvement

**Files to modify:**

- `components/discovery/discovery-card.tsx` (debug score overlay)
- `lib/discovery/rail-feature-flags.ts` (wire admin-only flag)

### Build 5.4: Preference Learning Feedback Loop

**What changes:**

- After 5+ interactions in a session, show a brief "Getting to know you" indicator
- After 20+ interactions across sessions, show "Personalized for you" badge on the rail header
- Love/hate feedback immediately adjusts the visible rail (item animates to new position or fades out)
- New preference signals from this session are written back via `trackDiscoveryInteraction()` and influence `rankDiscoveryInteractionPreferences()` on next page load
- "Reset my preferences" option in taste passport strip (clears `discovery_interactions` for user)

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (learning indicators, live reordering on feedback)
- `components/discovery/taste-passport-strip.tsx` (reset option)

---

## Layer 6: Conversion Engine (4 builds)

**Goal:** Bridge from "browsing" to "talking to a chef." Shortlist, planning brief, chef proof, inquiry funnel.

### Build 6.1: Shortlist Drawer

**What changes:**

- Wire `shortlist-contracts.ts` into the rail
- When user selects 2+ items, a bottom drawer slides up showing the shortlist
- Drawer shows: selected items as mini-cards, "Compare" button (if 2-3 chefs), "Plan a dinner" CTA
- Items can be added from: rail click, save button, search result, Remy suggestion
- Shortlist persists in session (sessionStorage for anonymous, server-synced for authenticated)
- Max 8 items in shortlist
- Drawer collapses to a floating pill showing count ("3 saved") when not focused

**Files to create:**

- `components/discovery/shortlist-drawer.tsx` (bottom drawer component)
- `lib/discovery/use-discovery-shortlist.ts` (React hook wrapping shortlist contracts)

**Files to modify:**

- `app/(public)/_components/homepage-discovery.tsx` (render drawer)
- `app/(public)/_components/cuisine-marquee.tsx` (item selection triggers shortlist)

### Build 6.2: Chef Proof Cards

**What changes:**

- ChefFlow Picks lane: featured chef cards upgraded with real proof signals
- Proof badges from `PublicProofSignal` type in `consumer-discovery-model.ts`:
  - "Accepting inquiries" (green dot)
  - Price tier badge (budget/mid/premium/luxury)
  - Primary cuisine + dietary strengths
  - City/state location
  - "Responds within 24h" (if response time data exists)
- Card layout: chef photo or food photo background, name + cuisine overlay, proof badges row at bottom
- Tap opens chef profile (`/chef/[slug]`) with inquiry CTA prominent

**Files to modify:**

- `components/discovery/discovery-card.tsx` (ProofCard variant enrichment)
- `app/(public)/page.tsx` (pass richer chef data to discovery)

### Build 6.3: Planning Brief Quick-Start

**What changes:**

- "Plan a dinner" CTA from shortlist drawer opens a quick planning brief
- Brief captures: occasion, date, guest count, budget, dietary needs (5 fields)
- Pre-populated from session filters (Remy already parsed most of this)
- Submitting the brief navigates to `/eat` with all parameters, OR creates an inquiry draft if a chef is in the shortlist
- Brief stored in session for continuity
- Anonymous users: brief still works, prompts sign-in only at inquiry submission

**Files to create:**

- `components/discovery/planning-brief-modal.tsx` (quick-start modal)

**Files to modify:**

- `components/discovery/shortlist-drawer.tsx` (CTA triggers brief)

### Build 6.4: Inquiry Funnel Integration

**What changes:**

- From the planning brief or chef proof card, "Contact this chef" opens the inquiry form
- Inquiry form pre-populated with: occasion, date, guests, budget, dietary needs, location (all from session)
- The `trackDiscoveryInteraction('inquiry_started')` and `trackDiscoveryInteraction('inquiry_submitted')` events fire, feeding back into preference ranking (+7 and +12 respectively)
- After inquiry submission: rail shows a "Your inquiry" card in ChefFlow Picks lane linking to the inquiry status
- Conversion tracked end-to-end: impression -> click -> dwell -> inquiry_started -> inquiry_submitted

**Files to modify:**

- `app/(public)/chefs/[slug]/_components/public-inquiry-form.tsx` or equivalent (connect to session data for pre-population)
- `lib/discovery/track-discovery-click.ts` (ensure inquiry events fire correctly)
- `app/(public)/_components/cuisine-marquee.tsx` (post-inquiry card injection)

---

## Layer 7: Social and Ambient (4 builds)

**Goal:** Ship 4 safe social rail families. Add ambient credibility signals.

### Build 7.1: Opportunity Marketplace Cards

**What changes:**

- Wire `opportunity_marketplace` family from `food-social-rail-contracts.ts`
- New card type in ChefFlow Picks lane: "Chef Opening" cards
- Shows: chef name, available date(s), cuisine, special pricing if applicable
- Sourced from chefs who have marked availability windows or specials
- Max 2 opportunity cards per rail render (18% share cap from contract)
- Rarity factor: 0.88x (limited), urgency factor: 1.25x if date is within 7 days
- Card visual: distinct border treatment (dashed amber) to differentiate from regular picks

**Files to create:**

- `components/discovery/opportunity-card.tsx` (opportunity card variant)
- `lib/discovery/opportunity-resolver.ts` (queries chef availability, applies social rail scoring)

**Files to modify:**

- `app/(public)/page.tsx` (fetch opportunity data)
- `app/(public)/_components/cuisine-marquee.tsx` (inject opportunity cards into picks lane)

### Build 7.2: What-to-Eat-Now Recovery

**What changes:**

- Wire `what_to_eat_now` family: universal search recovery when results are empty or vague
- Three recovery modes from `resolveWhatToEatRecovery()`:
  - `continue`: "Try broadening your search" with suggested filter removals
  - `clarify`: "Did you mean X or Y?" with disambiguation options
  - `recover`: "Here's what's popular right now" with trending items
- Recovery UI: replaces empty rail state with a friendly prompt + suggested actions
- Currently the rail shows all items on empty search; this adds intelligent narrowing suggestions

**Files to create:**

- `components/discovery/search-recovery.tsx` (recovery prompt component)

**Files to modify:**

- `app/(public)/_components/cuisine-marquee.tsx` (empty/vague state handling)

### Build 7.3: Universal Food Object Actions

**What changes:**

- Wire `universal_food_object` family: every discoverable item gets a standard action menu
- Long-press or right-click on any card shows: Save, Send to Circle, Ask a Chef, Plan a Dinner, Hide
- Actions gated by authentication and context (from `buildUniversalFoodObjectActions()`)
- "Send to Circle" opens a circle picker if user has circles; prompts circle creation if not
- "Ask a Chef" creates a Remy-style question with the item as context
- Actions tracked as discovery interactions for preference learning

**Files to create:**

- `components/discovery/food-object-menu.tsx` (context menu component)

**Files to modify:**

- `components/discovery/discovery-card.tsx` (long-press/right-click handler)
- `lib/discovery/track-discovery-click.ts` (action event tracking)

### Build 7.4: Ambient Credibility Signals

**What changes:**

- Wire `shared_circle_discovery` family (24% share cap)
- Ambient badges on items based on real platform activity:
  - "3 inquiries this week" (from inquiry count, anonymized)
  - "Trending in [area]" (from click/engagement data by location)
  - "New chef" (recently onboarded, sparkle badge)
  - "Circle favorite" (if item appears in user's circle shortlists)
- Signals computed server-side in `page.tsx` from aggregated `discovery_interactions` data
- Max 1 ambient signal per item; does not stack with intelligence badges from Layer 4
- Priority: intelligence badge > ambient signal (intelligence wins if both apply)

**Files to create:**

- `lib/discovery/ambient-signal-resolver.ts` (aggregates interaction data into signals)

**Files to modify:**

- `app/(public)/page.tsx` (compute ambient signals)
- `components/discovery/discovery-card.tsx` (ambient signal badge slot)

---

## Cross-Cutting Concerns

### Performance Budget

- Total discovery section JS: < 80KB gzipped (currently ~45KB in cuisine-marquee alone)
- Break `cuisine-marquee.tsx` (3,170 lines) into 8-10 focused components
- Image loading: lazy with blur placeholder, IntersectionObserver, no layout shift
- Rail render: < 16ms per frame during scroll (profile with Chrome DevTools)
- Server data fetching: parallel queries, < 200ms total

### Accessibility

- All cards: focusable, keyboard navigable (Arrow keys, Enter to select, Escape to deselect)
- Screen reader: each card announces type, label, and badge content
- Reduced motion: all animations disabled, instant transitions, no auto-scroll
- Color contrast: all text meets WCAG AA on card backgrounds
- Touch targets: minimum 44x44px on mobile

### Analytics Completeness

- Every build wires its features into `trackDiscoveryInteraction()`
- New action types added as needed (e.g., `shortlist_add`, `brief_start`, `brief_submit`)
- Session-level metrics: items seen, items interacted, filters applied, conversion events
- Funnel tracking: impression -> click -> dwell -> shortlist -> brief -> inquiry

### Testing Strategy

- Each build gets unit tests for new logic (scoring, assembly, session mutations)
- E2E test updates to `15-homepage-discovery-marquee.spec.ts` for visual regression
- Accessibility audit after Layer 1 and Layer 2 complete
- Performance profiling after Layer 2 (motion is the biggest perf risk)

---

## Build Sequence (28 builds)

| #   | Build                             | Layer              | Dependencies  |
| --- | --------------------------------- | ------------------ | ------------- |
| 1   | Image Card System                 | L1 Visual          | None          |
| 2   | Typography and Color System       | L1 Visual          | None          |
| 3   | Depth and Glassmorphism           | L1 Visual          | Build 2       |
| 4   | Responsive Card Grid              | L1 Visual          | Builds 1, 3   |
| 5   | Physics-Based Scroll Engine       | L2 Motion          | Build 4       |
| 6   | Micro-Interactions                | L2 Motion          | Build 1       |
| 7   | Entrance Choreography             | L2 Motion          | Build 5       |
| 8   | Swipe Gestures (Mobile)           | L2 Motion          | Build 5       |
| 9   | Session Lifecycle                 | L3 Intelligence    | Build 4       |
| 10  | Feature Flag System               | L3 Intelligence    | Build 9       |
| 11  | Control Rail Assembly (Complete)  | L3 Intelligence    | Builds 9, 10  |
| 12  | Undo Stack                        | L3 Intelligence    | Build 9       |
| 13  | Remy-Powered Search Bar           | L4 Remy            | Build 9       |
| 14  | Intent Parsing Feedback           | L4 Remy            | Build 13      |
| 15  | Silent Intelligence Badges        | L4 Remy            | Build 11      |
| 16  | Conversational Refinement         | L4 Remy            | Builds 13, 14 |
| 17  | "Why This?" Tooltips              | L5 Personalization | Build 15      |
| 18  | Taste Passport Display            | L5 Personalization | Build 10      |
| 19  | Scoring Transparency              | L5 Personalization | Build 15      |
| 20  | Preference Learning Feedback Loop | L5 Personalization | Builds 17, 18 |
| 21  | Shortlist Drawer                  | L6 Conversion      | Build 9       |
| 22  | Chef Proof Cards                  | L6 Conversion      | Build 1       |
| 23  | Planning Brief Quick-Start        | L6 Conversion      | Build 21      |
| 24  | Inquiry Funnel Integration        | L6 Conversion      | Build 23      |
| 25  | Opportunity Marketplace Cards     | L7 Social          | Builds 11, 22 |
| 26  | What-to-Eat-Now Recovery          | L7 Social          | Build 13      |
| 27  | Universal Food Object Actions     | L7 Social          | Build 9       |
| 28  | Ambient Credibility Signals       | L7 Social          | Build 15      |

### Parallelization Opportunities

These builds can run in parallel within their layers:

- Builds 1 + 2 (image cards + typography)
- Builds 5 + 6 (scroll engine + micro-interactions)
- Builds 9 + 10 (session + flags, though flags depends on session)
- Builds 17 + 18 (tooltips + taste passport)
- Builds 21 + 22 (shortlist + chef proof)
- Builds 25 + 26 + 27 + 28 (all Layer 7 builds after dependencies met)

---

## Phase 2 (Queued, Not In This Spec)

These 7 social rail families ship when their data prerequisites are met:

| Family                       | Data Prerequisite                            |
| ---------------------------- | -------------------------------------------- |
| `social_safety`              | Circle adoption > 10 active circles          |
| `relationship_life_event`    | Calendar/event history depth                 |
| `visibility_consent`         | Cross-context interaction volume             |
| `food_signal_notifications`  | Notification infrastructure built            |
| `partner_vendor_opportunity` | Partner onboarding pipeline                  |
| `food_social_network`        | Unification layer depends on all above       |
| `population_governance`      | Meta-contract, ships with first family above |

Role portal system (7 role-specific rails) is a separate spec: `discovery-rail-role-portal-spec-2026-05-13.md`.

---

## Success Criteria

1. **Visual:** Homepage discovery section passes a "would you screenshot this?" test. No emoji pills visible. Image-backed cards with depth, glow, and motion.
2. **Intelligence:** Every unwired contract file in `lib/discovery/` has at least one production consumer.
3. **Conversion:** End-to-end funnel tracked: impression -> click -> shortlist -> inquiry. Measurable in analytics.
4. **Mobile:** 3-lane experience on mobile with snap-scroll, swipe gestures, and touch-optimized cards.
5. **Remy:** Natural language search works for at least: cuisine, budget, guest count, timing, dietary, and location queries.
6. **Performance:** Discovery section renders in < 200ms, scrolls at 60fps, total JS < 80KB gzipped.
7. **Accessibility:** WCAG AA compliant, full keyboard navigation, reduced motion support.
