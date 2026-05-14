# Homepage Upgrade: Spec Improvement Agent Prompts

> Run all 6 in parallel. Each reads the spec, researches its domain, returns actionable amendments.
> Spec: `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md`

---

## Agent 1: Competitive Intelligence Researcher

**Goal:** Study what the best food/chef marketplace homepages actually do and identify gaps in our spec.

**Prompt:**

You are researching homepage design patterns for food service marketplaces. Your job is to analyze top competitors and return concrete, actionable improvements to our homepage redesign spec.

Read our spec at `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md` and our current homepage at `app/(public)/page.tsx`.

Then research these homepages (use web search and fetch):

- **DoorDash** (doordash.com) - category cards, hero treatment, social proof
- **Uber Eats** (ubereats.com) - search UX, cuisine browsing, location integration
- **Airbnb** (airbnb.com) - hero imagery, trust signals, category exploration
- **OpenTable** (opentable.com) - occasion-based browsing, restaurant cards
- **Thumbtack** (thumbtack.com) - service marketplace, provider discovery
- **Bark.com** (bark.com) - professional service marketplace hero

For each competitor, document:

1. Hero section: what's above the fold? Image strategy? CTA placement?
2. Category browsing: card sizes, image usage, scroll behavior
3. Social proof: where and how trust is established
4. Search UX: field layout, autocomplete patterns
5. Mobile vs desktop differences

Then compare against our spec and return:

- **GAPS:** Things competitors do that our spec misses entirely
- **UPGRADES:** Things our spec does but competitors do better
- **UNIQUE STRENGTHS:** Things our spec has that competitors lack (keep these)

Format as a structured amendment document. Be specific (pixel sizes, layout patterns, interaction details). No vague "consider adding social proof" - show exactly what and how.

---

## Agent 2: Conversion & UX Psychologist

**Goal:** Apply conversion psychology to identify where the spec leaves money on the table.

**Prompt:**

You are a conversion rate optimization specialist analyzing a homepage redesign spec for a food services marketplace called ChefFlow. Your job is to find conversion bottlenecks, missing persuasion patterns, and UX friction in the proposed design.

Read the spec at `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md`, the current homepage at `app/(public)/page.tsx`, and the below-fold content at `app/(public)/_components/landing-below-fold.tsx`.

Analyze through these lenses:

**1. Attention & Hierarchy (F-pattern, Z-pattern, visual weight)**

- Where does the eye land first? Is that the right place?
- Is the primary CTA ("Browse chefs" / "Find a chef") competing with discovery rail for attention?
- Does the hero communicate the value prop in under 3 seconds?

**2. Trust Velocity (how fast does a stranger trust this site?)**

- First 2 seconds: what signals "this is legit"?
- First 10 seconds: what signals "this is for me"?
- Social proof placement: above or below the fold? Before or after the CTA?
- Are we missing: review counts, "as seen in", security badges, response time stats?

**3. Action Friction (barriers between landing and clicking)**

- How many decisions before first meaningful click?
- Is the search bar intimidating or inviting? (2 fields vs 1 field debate)
- Discovery rail: does browsing 120+ options cause paradox of choice?
- Mobile: is the primary CTA thumb-reachable?

**4. Emotional Triggers**

- Does the hero create desire (appetite appeal) or just inform?
- Is urgency present? (seasonal items, "booking fast", limited availability)
- Is there a clear "what happens next" after clicking?

**5. Missing Conversion Patterns**

- Exit intent / scroll-depth triggers
- Personalization hooks for returning visitors
- "Quick win" path for high-intent visitors (skip browsing, go straight to booking)

Return a prioritized list of amendments to the spec. Each amendment should include:

- What to change and why (cite the psychological principle)
- Where in the page flow it belongs
- Expected impact (high/medium/low)
- Implementation complexity (trivial/moderate/complex)

---

## Agent 3: Mobile-First Auditor

**Goal:** The spec is desktop-biased. Audit every improvement for mobile experience.

**Prompt:**

You are a mobile UX specialist auditing a homepage redesign spec. Most food service discovery happens on phones. Your job is to ensure every proposed improvement works beautifully on mobile.

Read the spec at `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md`, the current homepage at `app/(public)/page.tsx`, the discovery rail at `app/(public)/_components/cuisine-marquee.tsx` (focus on mobile-specific code: the mobile row, responsive breakpoints, touch handling), and the sticky mobile CTA at `app/(public)/_components/sticky-mobile-cta.tsx`.

For each of the 8 improvements, answer:

1. **Hero Background Image:** On a 375px screen, does a Ken Burns photo add value or just slow LCP? What opacity works on small screens where text is closer to the image? Does parallax work on mobile (iOS Safari scroll behavior)?

2. **Visual Cuisine Cards:** 160x100px cards on a 375px screen means ~2 visible at a time. Is that enough browsing density? Should mobile cards be smaller (120x80)? How does this interact with the existing mobile-only combined row?

3. **Row Hierarchy:** Mobile currently collapses to 2 rows (Row 1 + combined mobile row). How do the visual hierarchy improvements translate? Should mobile get different row treatments?

4. **Featured Chef Spotlight:** Full-width card on mobile: how tall? Does it push key content below the fold? Should it be a compact horizontal card instead?

5. **Seasonal Band:** Another full-width section. On mobile, hero + seasonal band + trust bar + discovery rail could push actual chef browsing way below the fold. What's the fold budget?

6. **Micro-interactions:** Parallax on iOS Safari is notoriously janky. Should parallax be desktop-only? Hover states don't exist on touch. What replaces them?

7. **Trust Bar:** 48px avatars + stats + rotating testimonial on a 375px screen. How does this lay out? Horizontal scroll? Stack vertically?

8. **Color Temperature Breaks:** On mobile, sections are taller (stacked layout). Do 80px gradient bleeds between zones work, or do they create muddy bands?

Also audit:

- **Fold budget:** List every element above the fold on a 375px x 667px screen. Is the most important content (search + browse) visible without scrolling?
- **Touch targets:** All interactive elements meet 44x44px minimum?
- **Thumb zone:** Primary CTAs reachable with one-handed use?
- **Performance:** Total image weight above the fold on mobile (hero photo + cuisine card flags + chef avatars)

Return specific mobile amendments for each improvement. Include recommended breakpoint behaviors (what changes at `sm`, `md`, `lg`).

---

## Agent 4: Performance & Core Web Vitals Analyst

**Goal:** Ensure the spec won't tank page speed. Every visual upgrade has a performance cost.

**Prompt:**

You are a web performance engineer auditing a homepage redesign spec for Core Web Vitals impact. The site uses Next.js 15 with Cloudinary image CDN.

Read the spec at `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md` and the current implementation at `app/(public)/page.tsx` and `app/globals.css`.

Analyze each improvement for:

**LCP (Largest Contentful Paint):**

- Hero background image: this becomes the LCP element. Current LCP is likely the `<h1>` text. Adding a large background image will increase LCP. What preload strategy is needed? Should we use `<link rel="preload">` in the head? What Cloudinary transforms minimize payload (format, quality, responsive sizes)?
- Cuisine visual cards with flag images: how many images load above the fold? Are flags already cached from flagcdn?

**CLS (Cumulative Layout Shift):**

- Hero image loading: if it pops in after text renders, CLS spike. Need explicit `width`/`height` or `aspect-ratio` reservation.
- Seasonal band and trust bar: new sections inserting between hero and rail. If they load async, they shift the rail down. Server components prevent this, but verify.
- Discovery rail visual cards (mixed sizes): do larger cards cause row height shifts during render?

**INP (Interaction to Next Paint):**

- Parallax scroll listener: does it block the main thread? Should it use `passive: true`? `IntersectionObserver` alternative?
- Pill click micro-interactions: ripple effect implementation. CSS-only or JS? DOM mutations during click handlers affect INP.
- Testimonial rotation: `setInterval` + state updates every 5s. Does this cause unnecessary re-renders?

**Total Page Weight:**

- Estimate total image payload above the fold (hero photo + 12-16 flag images + 5-6 chef avatars)
- Estimate CSS additions (new keyframes, color properties, zone backgrounds)
- Are we adding any new JS bundles? (All new components should be server components where possible)

**Specific Recommendations:**

- Image loading strategy (eager/lazy, priority flags, preload hints)
- CSS containment (`contain: layout style paint`) for animation-heavy sections
- `will-change` budget (browsers allocate GPU layers; too many = memory pressure)
- Font loading: serif font for featured chef section. Is Playfair Display already loaded?

Return a performance amendment with specific technical requirements for each improvement. Include a performance budget: "total additional page weight must not exceed X KB above the fold."

---

## Agent 5: Accessibility & Inclusive Design Auditor

**Goal:** Ensure the visual upgrades don't create accessibility barriers.

**Prompt:**

You are an accessibility specialist (WCAG 2.2 AA) auditing a homepage redesign spec for a food services marketplace.

Read the spec at `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md`, the current homepage at `app/(public)/page.tsx`, and the discovery rail at `app/(public)/_components/cuisine-marquee.tsx`.

Audit each improvement:

**1. Hero Background Image:**

- Text over image: contrast ratio at 0.15-0.20 opacity. Calculate: white text (#ffffff) over dark image (#1a0e08 at 80-85% opacity) over food photo. Does it meet 4.5:1 for body text, 3:1 for large text?
- Ken Burns animation: `prefers-reduced-motion` is mentioned. Verify the spec handles `prefers-contrast: more` too.
- Alt text for decorative background image? (`role="presentation"` + empty alt)

**2. Visual Cuisine Cards:**

- Emoji as primary visual identifier: screen readers announce emoji names. "Spaghetti" emoji reads as "spaghetti" which is fine, but verify all 120+ cuisine emojis have meaningful names.
- Color-only category coding in Row 2: is color the ONLY differentiator? Need secondary indicator (icon, label, position).
- Flag images at 30% opacity as watermarks: purely decorative? Mark as `aria-hidden`.

**3. Row Hierarchy:**

- Row labels ("TASTE", "OCCASION", "CHEFFLOW PICKS"): are these visible or screen-reader-only? They help all users orient. Consider `aria-label` on row containers.
- Auto-scrolling rows: users with vestibular disorders. `prefers-reduced-motion` should stop auto-scroll entirely, not just slow it.

**4. Featured Chef Spotlight:**

- Image alt text: "Photo of [chef name]" not empty.
- Link/CTA: clear accessible name ("View [chef name]'s profile" not just "View profile").

**5. Seasonal Band:**

- Season-specific color palettes: do all season colors meet contrast requirements on dark backgrounds?
- "Ending soon" urgency: conveyed by color alone? Need text/icon reinforcement.

**6. Micro-interactions:**

- Parallax: can cause nausea for vestibular-sensitive users. Must be fully disabled (not just slowed) with `prefers-reduced-motion`.
- Pill click ripple: does it convey state change to screen readers? `aria-pressed` or live region?

**7. Trust Bar:**

- Rotating testimonials: auto-advancing content is a WCAG violation (2.2.2 Pause, Stop, Hide) unless user can pause. Add pause-on-focus and pause button.
- Avatar tooltips: keyboard-accessible? Focus-triggered, not just hover?

**8. Color Temperature Breaks:**

- Zone transitions: purely visual, no a11y impact. But verify text contrast in each zone.

**General:**

- Keyboard navigation through discovery rail: can users tab through pills? Arrow key navigation within rows?
- Screen reader announcements: when pills are selected in multi-select mode, is the selection count announced?
- Focus management: after clicking a cuisine card, where does focus go?

Return specific accessibility requirements to add to each improvement section. Use WCAG 2.2 AA success criteria references.

---

## Agent 6: Brand & Emotional Storytelling Reviewer

**Goal:** Ensure the visual upgrade tells a cohesive brand story, not just "looks better."

**Prompt:**

You are a brand strategist reviewing a homepage redesign spec for ChefFlow, a food services marketplace connecting consumers with private chefs, caterers, and food operators.

Read the spec at `docs/superpowers/specs/2026-05-14-homepage-massive-ui-upgrade-design.md`, the current homepage at `app/(public)/page.tsx`, the below-fold at `app/(public)/_components/landing-below-fold.tsx`, and the interface philosophy at `docs/specs/universal-interface-philosophy.md`.

ChefFlow's brand DNA:

- "Real chefs. Real kitchens." (tagline already on homepage)
- Warm, premium, trustworthy. Not corporate. Not cheap.
- The chef is the hero, not the platform.
- Food is emotional, personal, cultural.

Evaluate:

**1. Brand Coherence:**

- Do all 8 improvements reinforce the same brand story?
- Does the color temperature break (Improvement 8) fragment the visual identity or strengthen it?
- Is the overall feel "premium food marketplace" or "food delivery app"? These are very different.

**2. Emotional Arc:**

- What emotion does each section trigger as the user scrolls?
  - Hero: ? (should be desire/appetite)
  - Seasonal band: ? (should be freshness/timeliness)
  - Discovery rail: ? (should be exploration/excitement)
  - Featured chef: ? (should be trust/personal connection)
  - How it works: ? (should be confidence/simplicity)
- Is there a clear emotional narrative from top to bottom?

**3. Hero Messaging:**

- "Find food near you" is functional but generic (DoorDash says the same thing). Does the hero headline differentiate ChefFlow?
- Alternative angles: "Your next unforgettable meal starts here", "Hire a chef for any occasion", "From their kitchen to your table"
- Should the headline rotate or stay fixed? (Spec doesn't address headline copy)

**4. Photography Direction:**

- The spec says "5-8 high-quality food photos." What kind?
  - Overhead plated dishes (editorial/Instagram feel)
  - Chef action shots (hands plating, fire, knives)
  - Table scenes (guests, candles, wine)
  - Ingredient close-ups (produce, raw materials)
- The photo style IS the brand. Recommend a specific visual direction and mood.

**5. Missing Brand Moments:**

- Is there a place where ChefFlow's unique value is stated clearly? ("We're not DoorDash. We connect you with real chefs for real occasions.")
- Should there be a "Why ChefFlow?" section or is it implicit?
- The "For food providers" section: does it dilute the consumer-facing brand, or does showing the chef side build trust?

**6. Typography & Voice:**

- Playfair Display serif for featured chef: does mixing serif + sans-serif create elegance or inconsistency?
- Copy voice across sections: is it consistent? (Hero is functional, below-fold is aspirational, pills are categorical)

Return a brand coherence amendment. Include:

- Recommended hero headline alternatives (3-5 options)
- Photography mood board direction (describe the visual style, reference other brands if helpful)
- Emotional arc map (section by section, what the user should feel)
- Any improvements that conflict with brand identity (flag for revision)
