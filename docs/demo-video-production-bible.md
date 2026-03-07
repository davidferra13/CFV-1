# Demo Video Production Bible

> Research-backed rules for making ChefFlow demo videos that convert. Every decision here comes from studying what works at the best SaaS companies (Linear, Notion, Slack, Loom, Superhuman, Figma) and the latest 2026 research on scroll-stopping content.

---

## THE 1.7-SECOND RULE (most important thing in this doc)

You have **1.7 seconds** to stop someone from scrolling. Not 3. Not 5. 1.7.

That means the FIRST FRAME of every video must be visually striking. No logos. No "welcome to ChefFlow." No fade-from-black into a loading screen. The first frame is either:

1. **A bold text statement on a dark background** (the title card) that creates a curiosity gap
2. **The product already in motion** with something visually interesting happening

### What makes a good title card hook

The psychology: humans are wired to close open loops. An incomplete piece of information (a question without an answer, a problem without a solution) creates mild discomfort the brain wants to resolve. That's what keeps them watching.

**Patterns that work:**

| Pattern                   | Example                                              | Why it works                       |
| ------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Pain point as statement   | "You're losing money on every event."                | They feel attacked (in a good way) |
| Rhetorical question       | "What if your clients booked themselves?"            | Opens a curiosity loop             |
| Impossible-sounding claim | "From first message to final payment. One platform." | They want to see if it's true      |
| Direct challenge          | "Stop checking TakeAChef. It checks itself."         | Speaks to their daily pain         |
| Empathy + solution        | "You're a chef, not an admin."                       | They feel understood               |

**Patterns that DON'T work:**

- "Introducing ChefFlow" (nobody cares about your brand name yet)
- "The all-in-one platform for..." (generic, says nothing)
- "Welcome to our demo" (instant scroll)
- Company logo for 3 seconds (dead air)

### Title card design rules

- **Background:** Dark (#0a0e17 or similar). Not white. Dark backgrounds command attention on feeds.
- **Text:** Large, bold, white. Max 7 words on the main line. Max 5 words on the subtitle.
- **Subtitle:** Brand orange (#e88f47), uppercase, letter-spaced. This is where "CHEFFLOW" goes, not the main line.
- **Duration:** 2.5-3 seconds. Long enough to read, short enough to maintain urgency.
- **No animation on entry.** The text should be there on frame 1. Fade-ins waste the 1.7 seconds.

---

## VIDEO STRUCTURE (the 4-beat framework)

Every video follows this structure. No exceptions.

### Beat 1: HOOK (0-3 seconds)

- Title card with pain point or curiosity gap
- First frame must be visually complete (no loading, no fading in)
- Sound-off viewers must understand the hook from text alone

### Beat 2: SHOW (3 seconds to 80% of video)

- The product in action, solving the problem from the hook
- Captions narrate every action (60%+ of viewers watch on mute)
- 2-4 "a-ha moments" where something impressive happens
- Fast pacing, never more than 4 seconds on one screen without movement

### Beat 3: PROOF (80-90% of video)

- A quick moment that builds credibility
- Could be: real data on screen, multiple features in rapid succession, the client-side view
- This is where dual-perspective videos pay off: "you did this, and HERE'S what your client got"

### Beat 4: CTA (last 5-7 seconds)

- Title card with clear next step
- "Start free at cheflowhq.com" or "Try it free"
- Same dark background as the hook for visual bookending
- NEVER end on the product screen. End on the branded title card.

---

## PACING RULES

### The 4-Second Rule

Never stay on one static screen for more than 4 seconds without something moving. Options:

- Scroll the page
- Move the cursor
- Zoom into a detail
- Switch a caption
- Cut to a new view

The eye needs movement. Static screens = lost viewers.

### Timing by video length

| Duration | Scenes | Avg scene length | Transitions            |
| -------- | ------ | ---------------- | ---------------------- |
| 30s      | 4-6    | 5-7s             | Hard cuts              |
| 45s      | 6-8    | 5-6s             | Mix of cuts and fades  |
| 60s      | 8-12   | 5-7s             | Fades between sections |
| 90s      | 12-16  | 5-7s             | Fades + scene cuts     |

### Music pacing

- Background music should be rhythmically consistent
- Tempo: 100-120 BPM for standard demos, 130-140 BPM for fast-paced social cuts
- Music complements, never competes with captions
- Volume: subtle. If someone notices the music, it's too loud.
- Genre: modern electronic/lo-fi, no lyrics, no jazz, no corporate stock music

---

## CURSOR RULES

The cursor is the viewer's guide. It tells them where to look.

### Movement

- **Smooth easing.** Never teleport. Cubic-bezier curves (0.25, 0.1, 0.25, 1) for natural deceleration.
- **Speed:** 500-700ms per move. Fast enough to not bore, slow enough to follow.
- **Path:** Move in natural curves, not straight lines. Real humans don't move mice in straight lines.

### Click effects

- **Click burst:** Small ring animation on click (brand orange, 0.4s duration)
- **Scale down:** Cursor scales to 85% on click for tactile feel
- **Never click without moving first.** The cursor should arrive at the target, pause 200ms, then click. This gives the viewer time to see what's about to be clicked.

### When NOT to show the cursor

- During scroll animations (the page is moving, cursor is distracting)
- During title cards
- During scene transitions

---

## CAPTION RULES

60%+ of viewers watch on mute, especially on mobile and social. Captions aren't optional, they're primary.

### Style

- **Font:** Inter or system sans-serif, bold (700 weight)
- **Size:** 22px for YouTube (1920x1080), scale proportionally for other formats
- **Color:** White text with text-shadow for readability over any background
- **Position:** Bottom of screen, left-aligned, max 80% width
- **Background:** Gradient from transparent to semi-opaque black (not a solid bar)

### Writing captions

- **Max 8 words per caption.** If you need more, break it into two captions.
- **Active voice.** "Every inquiry gets a lead score" not "Lead scores are assigned to inquiries."
- **Present tense.** "Your client sees this" not "Your client will see this."
- **No em dashes.** (Obviously.)
- **Speak to "you."** "Your dashboard" not "The dashboard." "Your client" not "The client."

### Timing

- Caption appears 0.3s BEFORE the action it describes (primes the viewer)
- Caption stays for at least 2 seconds (reading time)
- Fade transition between captions (0.35s)
- Never overlap two captions

---

## ZOOM AND SPOTLIGHT RULES

### When to zoom

- To highlight small UI details (lead score number, status badge, price)
- To show text that would be unreadable at full viewport
- Maximum zoom: 1.8x. Beyond that, context is lost.
- Duration at zoom: 2-3 seconds, then zoom back out

### When to spotlight

- To draw attention to one widget/panel on a busy page (like the dashboard)
- Dim everything except the target (65% opacity black overlay with rounded cutout)
- Always pair with a caption explaining what the viewer is looking at
- Duration: 2-3 seconds

### When to use callouts

- To label something that isn't self-explanatory
- Orange (#e88f47) background, white bold text, arrow pointing to target
- Max 5 words on a callout
- Duration: 2-2.5 seconds
- Never more than one callout on screen at a time

---

## TRANSITION RULES

### Between sections (within a video)

- **Fade to dark (0.3s) > navigate > fade in (0.3s)** for section changes
- This hides page loading and creates clean visual separation

### Between perspectives (dual-context videos)

- **Hard cut with a caption change.** "Chef's view" > cut > "Client's view"
- Optionally: brief flash of dark (0.15s) to signal the switch
- The caption MUST label which perspective we're seeing

### Never use

- Slide transitions (PowerPoint energy)
- Wipes (dated)
- Dissolves between product screens (confusing, looks like a glitch)

---

## FORMAT-SPECIFIC RULES

### YouTube (1920x1080, 16:9)

- Primary format for all Tier 1-4 videos
- Full browser chrome visible (shows it's a real app, not mockups)
- Progress bar at top (thin, brand orange) so viewers know how far through they are

### TikTok/Reels (1080x1920, 9:16)

- Tier 5 social cuts only
- Product fills the middle 60% of screen
- Top 20%: hook text overlay
- Bottom 20%: caption + CTA
- Duration: 15-30 seconds max
- Faster pacing (3-second scenes, hard cuts)
- Captions are LARGER (28-32px) for phone screens

### Square (1080x1080, 1:1)

- LinkedIn and Instagram feed
- Product fills 70% of frame
- Caption bar at bottom
- Duration: 30-60 seconds

---

## DUAL-PERSPECTIVE VIDEO RULES

These are the most complex but most impressive videos. Two accounts, one story.

### Account switching (simple approach)

- Record as one continuous video
- Use fade-out > navigate + switch context > fade-in
- Caption labels the perspective: "Chef's view" / "Client's view" / "Staff's view"
- Brand orange accent bar on one side to visually differentiate (left = chef, right = client)

### Split-screen (advanced, post-production)

- Record each perspective separately
- Composite side-by-side in ffmpeg
- Active side is full brightness, inactive side is 40% opacity
- Thin divider line (1px white) between sides

### Rules for both approaches

- Never stay on one perspective for more than 15 seconds
- The switch itself is a mini "a-ha moment" (chef sends > you see the client receive it)
- Always end on the chef's perspective (they're the buyer)

---

## THE A-HA MOMENT CHECKLIST

Every video needs 2-4 of these. These are the moments that make someone think "I need this."

| A-ha type        | Example                                        | When to use                                              |
| ---------------- | ---------------------------------------------- | -------------------------------------------------------- |
| **Speed**        | Action completes in one click                  | Close-out wizard, payment recording                      |
| **Intelligence** | System knows something the user didn't tell it | Lead score, dietary alerts, loyalty auto-calc            |
| **Both sides**   | Chef does X, client instantly sees Y           | Proposal send/receive, conversation, handoff             |
| **Scale**        | Zoomed-out view showing the whole system       | Kanban board, calendar, financial dashboard              |
| **Delight**      | Something unexpectedly beautiful or thoughtful | Invoice with loyalty, Remy's personality, hub group chat |

---

## QUALITY CHECKLIST (run before publishing any video)

- [ ] First frame is visually complete (no loading, no fade-in)
- [ ] Hook is 7 words or fewer
- [ ] Title card is on dark background with brand orange subtitle
- [ ] Every scene has a caption
- [ ] No static screen lasts more than 4 seconds
- [ ] Cursor movement is smooth (no teleporting)
- [ ] Zoom never exceeds 1.8x
- [ ] CTA title card at the end with "cheflowhq.com"
- [ ] No em dashes anywhere
- [ ] Video looks good on mute (captions carry the story)
- [ ] Total duration matches the target (+/- 10 seconds)
- [ ] At least 2 a-ha moments are clearly visible
- [ ] Dual-perspective videos label each switch

---

## TOOLS AND INFRASTRUCTURE

### What we have (built)

- **DemoRecorder class** (`scripts/demo-video.mjs`): cursor, captions, spotlight, callout, zoom, fade, title card, progress bar, scene cut
- **Playwright video recording**: captures webm at any resolution
- **3 format presets**: YouTube (1920x1080), TikTok (1080x1920), Square (1080x1080)

### What we need to add

- **`switchTo(page)` method** on DemoRecorder for dual-context videos
- **Perspective label bar** (thin colored accent showing which account is active)
- **ffmpeg post-processing** for MP4 conversion and optional split-screen compositing
- **Background music injection** via ffmpeg audio overlay
- **Batch recording** command to record all Tier 1 videos in sequence

### Recording environment

- Record on **beta** (production build, instant page loads), not localhost
- Demo data seeded via agent account (already has events, clients, inquiries)
- Browser: headed Chromium via Playwright (not headless, video needs real rendering)

---

Sources:

- [16+ Best B2B SaaS Video Examples From 2026](https://www.superside.com/blog/saas-video-examples)
- [10 Best SaaS Product Demo Videos That Convert (2026 Guide)](https://levitatemedia.com/learn/best-saas-demo-videos-2026-10-tips-for-creating-outstanding-ones)
- [Interactive SaaS Demo Best Practices | Arcade Blog](https://www.arcade.software/post/saas-demo-best-practices)
- [20 SaaS Product Demo Video Examples That Convert | Supademo](https://supademo.com/blog/marketing/demo-video-examples/)
- [Scroll Stopping Hooks: 5 Triggers That Stop the Scroll](https://quadcubes.com/scroll-stopping-hooks-psychology-2026/)
- [The 3-Second Rule for Scroll-Stopping Creative Hooks](https://signalytics.ai/3-second-rule-for-scroll-stopping-content/)
- [How to Create Video Hooks That Stop Scrolling](https://www.moonb.io/blog/how-to-create-video-hooks-that-stop-scrolling-in-seconds)
- [Transitions and Pacing in Video Production](https://www.venturevideos.com/insight/mastering-transitions-and-pacing-the-unsung-heroes-of-video-production)
- [Ultimate Product Demo Videos Guide For 2026](https://www.whatastory.agency/blog/product-demo-videos-guide)
- [Screen Studio - Professional Screen Recorder](https://screen.studio/)
- [12 Best SaaS Product Demo Video Examples of All Time](https://vidico.com/news/top-12-outstanding-saas-product-demo-videos/)
- [25 Best SaaS Explainer Videos That Reduced CAC](https://www.b2w.tv/blog/best-saas-videos)
