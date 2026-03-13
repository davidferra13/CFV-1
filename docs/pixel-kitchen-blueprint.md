# Pixel Kitchen Blueprint: Complete Metaphor Mapping

> Every ChefFlow technology component mapped to a physical restaurant element.
> This is the master reference for pixel art visualization. No gaps.

---

## SCENE LAYOUT (Top-Down View)

The pixel kitchen is a full restaurant, not just a kitchen. The scene scrolls or is divided into connected zones:

```
+------------------------------------------------------------------+
|  ALLEY / BACK (Receiving)                                         |
|  [Delivery Door] [Dumpster] [Generator]                          |
+------------------------------------------------------------------+
|  KITCHEN (Back of House)                                          |
|  [Walk-in] [Prep] [Grill] [Saute] [Fry] [Pastry] [Dish Pit]    |
|                          [PASS / EXPO]                            |
+------------------------------------------------------------------+
|  DINING ROOM (Front of House)                                     |
|  [Bar] [Tables] [Host Stand] [Sidestation] [POS]                |
+------------------------------------------------------------------+
|  OFFICE / UTILITIES (Below or Side)                               |
|  [Manager Office] [Breaker Box] [Safe] [Schedule Board]          |
+------------------------------------------------------------------+
```

---

## ZONE 1: KITCHEN (Back of House) = Build/Deploy/AI Pipeline

### The Stove Line = Servers/Environments

Each server is a **burner on the stove line**. Active servers have flames; stopped servers are dark burners.

| Tech Component                     | Kitchen Element                                                                     | Healthy Visual                                                                                                 | Degraded                                                                     | Down                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| **Dev Server** (localhost:3100)    | **Saute Station** (workhorse burner, closest to pass)                               | Blue-orange flame, pan sizzling, steam rising. Mise en place containers (prepped code) visible in lowboy below | Flame flickering yellow (HMR disconnected), pan smoking (compilation errors) | Dark burner, no flame, cold pan sitting on grate |
| **Beta Server** (localhost:3200)   | **Grill Station** (the preview/tasting station)                                     | Red-orange glow on grill surface, grill marks forming on food, thin smoke wisps                                | Uneven glow (Cloudflare Tunnel issues), heavy smoke (stale build)            | No glow, cold black grate, "86'd" sign           |
| **Production** (app.cheflowhq.com) | **The Pass / Expo Window** (where food meets customers)                             | Heat lamps glowing amber, plates perfectly plated under lamps, expo chef wiping rims                           | Too many plates stacking up (latency), lamps flickering (cold starts)        | Lamps dark, no plates, pass empty, "CLOSED" sign |
| **Mission Control**                | **Expo Chef** (the person at the pass, reading tickets, orchestrating)              | Chef standing at pass, reading ticket rail, calling orders, hands moving                                       | Chef looking stressed, squinting at tickets (some monitors failing)          | No one at the pass (MC not running)              |
| **OpenClaw Pi Gateway**            | **Delivery Door / Loading Dock** (separate entrance, brings things in from outside) | Door propped open, hand truck visible, green light above                                                       | Door partially stuck (high latency to PC)                                    | Door closed, padlocked, red light                |

### Walk-In Cooler = Supabase Database

The walk-in cooler is the PERFECT metaphor for the database: it stores everything, temperature (health) matters, and if it goes down, everything spoils.

| Tech Component            | Kitchen Element                                                            | Healthy Visual                                                                                                                                                                                | Degraded                                                                                                                                | Down                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Supabase (PostgreSQL)** | **Walk-In Cooler** (main body)                                             | Door sealed, digital temp display showing "36F" in green, compressor humming (subtle animation), frost-free interior visible through window, organized shelves with labeled Cambro containers | Temp display showing "42F" in yellow, frost forming on coils, compressor running constantly (no pause cycle), some unlabeled containers | Temp display "55F" in red/flashing, compressor silent, condensation on walls, containers sweating. ALARM state |
| **Supabase Auth**         | **Walk-In Door Lock** (the mechanism that lets you in/out)                 | Chrome handle gleams, safety release visible inside, door opens/closes smoothly                                                                                                               | Handle stiff, gasket slightly worn (session refresh issues)                                                                             | Locked shut (no one can get in) or stuck open (security breach, cold air escaping)                             |
| **Supabase Storage**      | **Walk-In Shelves** (wire racks holding containers)                        | Chrome shelves organized, containers labeled with tape+Sharpie, FIFO maintained                                                                                                               | Shelves cluttered, some containers unlabeled (upload timeouts)                                                                          | Shelves collapsed, containers on floor                                                                         |
| **Supabase Realtime**     | **Walk-In Temperature Sensor** (the wireless IoT sensor that sends alerts) | Small white sensor with green LED blinking inside cooler, sending data to base station                                                                                                        | LED blinking yellow (subscription lag)                                                                                                  | LED off, no signal (realtime disconnected)                                                                     |
| **RLS Policies**          | **Walk-In Shelving Labels** ("CHEF DAVID ONLY", "RAW MEAT - BOTTOM SHELF") | Every container labeled, separation enforced, bottom shelf for raw                                                                                                                            | Some labels missing (policy gaps)                                                                                                       | No labels at all (tenant data exposed)                                                                         |

### Ollama = The Brain of the Kitchen (Chef de Cuisine's Brain)

Ollama is not a piece of equipment; it's the **CHEF'S KNOWLEDGE**. It processes ingredients (data) into dishes (responses) using learned techniques (models).

| Tech Component            | Kitchen Element                                                           | Healthy Visual                                                                                           | Degraded                                                                 | Down                                                               |
| ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Ollama Server**         | **Head Chef** (standing at the center of the line, overseeing everything) | Chef in white coat, standing tall, tasting from spoon, directing cooks. Thought bubble with recipe notes | Chef sweating, moving slower (thermal throttling), queue of pans waiting | Chef absent. Empty station. Apron hanging on hook. "CHEF OUT" sign |
| **qwen3:4b (fast model)** | **Chef's Quick Taste** (quick sip from tasting spoon, instant judgment)   | Small spoon dipping into pot, quick taste, nod of approval                                               | Multiple spoons waiting (queue depth)                                    | No tasting happening                                               |
| **qwen3:8b (full model)** | **Chef's Full Plate Review** (carefully plating and inspecting a dish)    | Chef carefully plating a dish, adjusting garnish, full focus                                             | Slow, deliberate movements, multiple plates waiting for review           | No plating happening                                               |
| **Google Gemini**         | **Cookbook on Shelf** (reference book, not the chef's own knowledge)      | Open cookbook on a shelf above prep station, generic reference. Clearly separate from the chef           | Book closed (API error)                                                  | Book missing from shelf                                            |

### Dish Pit = Git / Version Control

The dish pit processes dirty dishes (modified files) into clean ones (committed code). If the dish pit backs up, the whole kitchen suffers.

| Tech Component        | Kitchen Element                        | Healthy Visual                                                                                                  | Degraded                                                   | Down                                  |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| **Git (clean state)** | **Dish Machine Running**               | Machine cycling, steam bursts when door opens, clean racks emerging                                             | N/A                                                        | N/A                                   |
| **Git (dirty state)** | **Dirty Dishes Piling Up**             | Bus tubs stacking on landing table, the more modified files = more dishes piled up. Number on pile = file count | Dishes overflowing to floor (too many uncommitted changes) | N/A                                   |
| **Git Push**          | **Clean Dishes Returning to Stations** | Clean rack being carried back, sparkling dishes on shelves                                                      | N/A                                                        | Dishes stuck in machine (push failed) |
| **Git Conflict**      | **Broken Dish Machine**                | Machine jammed, red error light, water leaking from seal                                                        | N/A                                                        | N/A                                   |

### Prep Station = TypeScript Compiler / Build Pipeline

Prep happens BEFORE service. TypeScript checks and Next.js builds are the mise en place of the code world.

| Tech Component                | Kitchen Element                                                             | Healthy Visual                                                                    | Degraded                                                     | Down                                                        |
| ----------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| **TypeScript Compiler (tsc)** | **Mise en Place** (everything prepped and in its place)                     | All containers filled, labeled, organized in lowboy. Green checkmark on prep list | Some containers empty, unlabeled items (type errors)         | Prep station bare, nothing ready, red X on prep list        |
| **Next.js Build**             | **Full Mise en Place Completion** (station fully set up, ready for service) | Cook standing behind fully stocked station, hands clasped, "READY" posture        | Still prepping (build in progress), knife chopping animation | Ingredients scattered, cutting board dirty, cook scrambling |
| **npm install**               | **Receiving/Checking In a Delivery**                                        | Delivery boxes being opened, items checked against invoice, moved to shelves      | Delivery delayed, some items missing                         | Delivery rejected, boxes sent back                          |

### Fry Station = Stripe Payment Processing

Deep fryers handle the "hot oil" of payment processing. Dangerous if mishandled, critical to revenue.

| Tech Component      | Kitchen Element       | Healthy Visual                                                                                   | Degraded                                                        | Down                                                                  |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Stripe**          | **Deep Fryer**        | Golden oil, steady heat shimmer, food dropping in and emerging crispy. Dollar sign on the basket | Oil darkening (webhook delays), too many items dropping at once | Oil smoking (API errors), fryer OFF, cold oil, "CLOSED" sign on fryer |
| **Stripe Webhooks** | **Fryer Timer/Alarm** | Timer beeping when food is done (payment confirmed), cook pulling basket                         | Timer delayed (webhook retry), multiple alarms going off        | Timer broken, silent, food burning (missed webhooks)                  |

### Ticket Printer / KDS = Request Pipeline

Orders coming in from the dining room = HTTP requests, API calls, user actions hitting the server.

| Tech Component             | Kitchen Element           | Healthy Visual                                                                     | Degraded                                                  | Down                                               |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| **Incoming HTTP Requests** | **Ticket Printer**        | Chattering sound, white paper coming out, tickets appearing on rail at steady pace | Printer running nonstop, tickets piling up (high traffic) | Printer jammed, red light blinking, paper crumpled |
| **API Route Handlers**     | **Ticket Rail**           | 3-5 tickets hanging neatly, evenly spaced                                          | 20+ tickets overlapping, edges curling from heat          | Rail empty (no requests) or rail collapsed         |
| **Server Actions**         | **Cook Reading a Ticket** | Cook reading ticket, nodding, starting to work                                     | Cook squinting at multiple tickets, confused              | Cook staring blankly at unreadable ticket          |

---

## ZONE 2: THE PASS = Production Boundary

The pass is where kitchen (backend) meets dining room (frontend/users). It's the deployment boundary.

| Tech Component    | Kitchen Element                                               | Healthy Visual                                                | Degraded                                                   | Down                              |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| **Vercel Deploy** | **Plates Going Under Heat Lamps**                             | Freshly plated dishes under amber glow, clean rims, garnished | Plates sitting too long (deploy taking time), food wilting | No plates at pass (deploy failed) |
| **CDN/Edge**      | **Heat Lamps** (keeping food warm for fast pickup)            | Amber glow, warm plates                                       | Bulb flickering (edge issues)                              | Lamps dark (CDN down)             |
| **Middleware**    | **Expo Chef's Towel Wipe** (final check before food goes out) | Chef wiping plate rims, checking presentation                 | Skipping rim wipes (middleware bypassed)                   | No one checking plates            |

---

## ZONE 3: DINING ROOM (Front of House) = User-Facing App / External Services

### Tables = Active Events/Clients

Each set table = an active event or client relationship.

| Tech Component    | Kitchen Element                                      | Healthy Visual                                                                                                             | Degraded                                      | Down                                               |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| **Active Events** | **Set Tables with Guests**                           | Tables with place settings, candles lit, guests seated, servers approaching. Count of occupied tables = active event count | Tables turning slowly, dirty tables visible   | Empty dining room, chairs on tables (closing time) |
| **Inquiries**     | **Guests at Host Stand**                             | People standing at host stand, looking at reservation book. Count = inquiry count                                          | Long line of people waiting, host overwhelmed | No host, people leaving (missed inquiries)         |
| **Revenue**       | **Cash Register / POS**                              | Cash register with green display showing dollar amount, receipt printing, cash drawer satisfyingly full                    | Register slow (revenue declining)             | Register error screen, empty drawer                |
| **Clients**       | **Repeat Guests** (regulars at their favorite table) | Familiar faces at tables, waiter knowing their order. Count badge on the host stand wall                                   | Fewer regulars showing up                     | Empty reserved tables                              |

### Bar = External Integrations

The bar is semi-independent from the kitchen but serves the same guests. Like external services.

| Tech Component              | Kitchen Element                                                                 | Healthy Visual                                                                    | Degraded                                                   | Down                                             |
| --------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| **Resend (Email)**          | **Bar Cocktail Shaker** (mixing and sending drinks/messages)                    | Bartender shaking, pouring into glass, slide to customer                          | Cocktails backing up, bartender overwhelmed (rate limited) | Bar closed, no bartender, empty bottles          |
| **PostHog (Analytics)**     | **Security Camera** (watching everything, recording)                            | Small dome camera on ceiling with blinking red LED, feed visible on small monitor | Camera feed grainy, some blind spots                       | Camera dark, no recording                        |
| **Sentry (Error Tracking)** | **Smoke Detector** (catches problems before they become fires)                  | Small white disc on ceiling, green LED steady                                     | Beeping intermittently (alerts firing)                     | No light, dead battery (errors going undetected) |
| **Google OAuth**            | **Front Door** (the main entrance for guests)                                   | Double doors, doorman/greeter, "WELCOME" mat                                      | Door sticking (token refresh issues)                       | Door locked, "CLOSED" sign                       |
| **Google Maps**             | **Wall Map / Floor Plan** at host stand (showing restaurant layout, directions) | Framed map on wall near host stand, clear and readable                            | Map faded or outdated                                      | Map missing from wall                            |
| **Google Calendar**         | **Reservation Book** (scheduling)                                               | Open book on host stand, today's reservations neatly written                      | Book behind, scribbled entries                             | Book missing, no reservations tracked            |
| **Gmail Sync (GOLDMINE)**   | **Telephone** at host stand (incoming calls = incoming emails)                  | Phone on host stand, occasionally ringing, host picking up and writing notes      | Phone ringing off the hook, host can't keep up             | Phone off hook / dead line                       |

### Sidestations = Browser Storage

Sidestations hold supplies that servers need quick access to, just like browser storage holds client-side data.

| Tech Component                 | Kitchen Element                                                                                   | Healthy Visual                            | Degraded                       | Down                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------ | -------------------------------- |
| **IndexedDB** (conversations)  | **Coffee Machine** at sidestation (hot, ready, serves a purpose but if it breaks you can survive) | Coffee maker with fresh pot, steam rising | Coffee stale, pot nearly empty | Machine broken, "NO COFFEE" sign |
| **localStorage** (preferences) | **Condiment Tray** at sidestation (salt, pepper, hot sauce)                                       | Organized tray with full bottles, labeled | Some bottles empty             | Tray missing                     |

---

## ZONE 4: OFFICE & UTILITIES = Infrastructure & Security

### Manager's Office = Admin Panel / Security

| Tech Component             | Kitchen Element                                                              | Healthy Visual                                                             | Degraded                     | Down                                            |
| -------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------- |
| **Admin Panel**            | **Manager's Office**                                                         | Small room visible with desk, monitor showing camera feeds, safe in corner | Messy desk, papers piling up | Door locked, lights off                         |
| **Tenant Isolation (RLS)** | **Separate Walk-In Sections** (each chef's food on their own shelf, labeled) | Clear shelf dividers, labels for each chef                                 | Some dividers missing        | No dividers, food mixed together (data breach!) |

### Utilities = Core Infrastructure

| Tech Component        | Kitchen Element                                                     | Healthy Visual                                          | Degraded                                          | Down                                                                    |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| **Cloudflare Tunnel** | **HVAC / Ventilation Duct** (connects kitchen air to outside world) | Hood vent humming, air flowing, smoke pulled up and out | Vent struggling, haze lingering (tunnel degraded) | Vent off, smoke filling kitchen (tunnel disconnected, beta unreachable) |
| **DNS**               | **Restaurant Sign** (the neon "OPEN" sign + name sign out front)    | Neon sign glowing "OPEN", street number visible         | Sign flickering                                   | Sign dark                                                               |
| **GitHub**            | **Filing Cabinet** in manager's office (code backup, history)       | Cabinet with neatly labeled folders, drawers closed     | Drawer stuck (push failed)                        | Cabinet locked, key lost                                                |
| **Backup Generator**  | **Actual Generator** outside back door                              | Quiet, green "READY" light                              | Running (grid power issues), rumbling             | Failed to start, red light                                              |

---

## ZONE 5: ALLEY / EXTERIOR = Waste & External Access

| Tech Component                    | Kitchen Element                                              | Healthy Visual                       | Degraded                                         | Down                                              |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| **Build Artifacts / .next cache** | **Dumpster** (old builds go here)                            | Dumpster with lid closed, clean area | Overflowing (cache bloat)                        | N/A                                               |
| **Error Logs**                    | **Grease Trap** (catches problems before they hit the sewer) | Invisible when working (underground) | Slow drains, slight odor (log volume increasing) | Backup through floor drains (errors overwhelming) |

---

## ANIMATED DETAILS (State-Based Visual Effects)

### Flames (Server Activity)

- **Idle:** Tiny blue pilot light dots at burner base
- **Active:** Blue-orange flames, 2-3 px tall, flickering animation (2-frame cycle)
- **Heavy Load:** Tall yellow-orange flames, 5-6 px, rapid flicker, smoke particles rising
- **Error:** No flame, dark burner, maybe a wisp of gas (gray pixel rising)

### Steam (Data Flow)

- **Normal:** Thin white pixel wisps rising from pots/pans (1px wide, 3-4px tall, float up and fade)
- **Heavy:** Thick steam clouds (2-3px clusters, billow effect)
- **Dish Machine:** Burst of steam (3-frame expansion animation when cycle completes)
- **Walk-In Door Open:** Cold air visible as blue-white wisps escaping when door animation plays

### Ticket Printer (Request Volume)

- **Low traffic:** Occasional ticket appears (every 3-4 seconds)
- **Normal:** Steady stream (every 1-2 seconds)
- **High traffic:** Continuous chattering, tickets overlapping on rail
- **Jammed:** Red blinking pixel on printer, no tickets

### People (Agents/Users)

- **Head Chef (Ollama):** 8x12px sprite, white coat, moves between stations. When Ollama is processing = chef is tasting. When idle = chef standing with arms crossed
- **Expo Chef (Mission Control):** Standing at pass, reading tickets, calling orders
- **Line Cooks (Claude Code agents):** At their stations, working. Multiple concurrent agents = multiple cooks on the line
- **Servers (API requests):** Moving between dining room and pass, carrying plates
- **Guests (Users/Clients):** Seated at tables. Incoming inquiries = guests arriving at host stand
- **Dishwasher (Git):** At dish pit, processing dirty to clean
- **Host (Auth):** At host stand, checking reservations (sessions), seating guests

### Walk-In Cooler Temperature Display

- Real number derived from Supabase connection latency
  - < 100ms = "34F" (perfect, green)
  - 100-500ms = "38F" (acceptable, green)
  - 500-1000ms = "42F" (warning, yellow)
  - > 1000ms = "50F" (danger, red)
  - Timeout = "ERR" (flashing red)

### Cash Register Display

- Shows actual revenue from Supabase `event_financial_summary`
- Green digits on black background
- Updates with a satisfying "ka-ching" animation when new revenue comes in

### Reservation Book

- Open book at host stand
- Upcoming events count written on today's page
- Pages flip animation when data refreshes

---

## INTERACTION TARGETS (Click Behavior)

Each visual element is clickable and shows a tooltip or detail panel:

| Click Target          | Shows                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| Saute Station flame   | Dev server: URL, uptime, HMR status, last compile error                      |
| Grill Station         | Beta server: URL, build age, tunnel status                                   |
| The Pass / Heat Lamps | Production: URL, deployment status, last deploy time                         |
| Walk-In Cooler        | Supabase: connection status, latency, row counts, auth status, storage usage |
| Head Chef             | Ollama: models loaded, queue depth, avg latency, memory usage                |
| Deep Fryer            | Stripe: webhook status, recent payments, error rate                          |
| Ticket Printer        | Request volume: requests/min, error rate, top endpoints                      |
| Dish Pit              | Git: branch, clean/dirty, recent commits, push status                        |
| Cash Register         | Revenue: total, today's, this week, growth                                   |
| Tables                | Events: active count, by status (draft/proposed/accepted/etc)                |
| Host Stand            | Inquiries: count, pending, conversion rate                                   |
| Bar cocktail shaker   | Resend: emails sent today, bounce rate                                       |
| Camera                | PostHog: active users, events today                                          |
| Smoke Detector        | Sentry: error count, last error time                                         |
| Phone                 | Gmail sync: last sync, unread count                                          |
| Cookbook              | Gemini: API status, quota usage                                              |
| Coffee Machine        | IndexedDB: storage used, conversation count                                  |
| Front Door            | Google OAuth: status, active sessions                                        |
| Filing Cabinet        | GitHub: branch, last push, remote status                                     |
| Hood Vent             | Cloudflare Tunnel: connected/disconnected, latency                           |
| Neon Sign             | DNS: resolution status                                                       |
| Generator             | Backup systems status                                                        |
| Prep Station          | TypeScript: error count, last check time                                     |
| Dumpster              | Build cache: size, last clean                                                |

---

## COMPLETE COMPONENT AUDIT

41 tech components mapped to unique visual elements. Zero gaps.

| #   | Tech Component      | Restaurant Element            | Zone                 |
| --- | ------------------- | ----------------------------- | -------------------- |
| 1   | Dev Server (3100)   | Saute Station / Burner        | Kitchen              |
| 2   | Beta Server (3200)  | Grill Station                 | Kitchen              |
| 3   | Production (Vercel) | The Pass + Heat Lamps         | Kitchen/Pass         |
| 4   | Mission Control     | Expo Chef (person)            | Pass                 |
| 5   | OpenClaw Pi Gateway | Delivery Door                 | Alley                |
| 6   | Ollama Server       | Head Chef (person)            | Kitchen              |
| 7   | qwen3:4b            | Chef's Tasting Spoon          | Kitchen              |
| 8   | qwen3:8b            | Chef's Plating Station        | Kitchen              |
| 9   | Google Gemini       | Cookbook on Shelf             | Kitchen              |
| 10  | Supabase PostgreSQL | Walk-In Cooler (body)         | Kitchen              |
| 11  | Supabase Auth       | Walk-In Door Lock             | Kitchen              |
| 12  | Supabase Storage    | Walk-In Shelves               | Kitchen              |
| 13  | Supabase Realtime   | Walk-In Temp Sensor           | Kitchen              |
| 14  | RLS Policies        | Walk-In Shelf Labels          | Kitchen              |
| 15  | IndexedDB           | Coffee Machine                | Dining (sidestation) |
| 16  | localStorage        | Condiment Tray                | Dining (sidestation) |
| 17  | Stripe              | Deep Fryer                    | Kitchen              |
| 18  | Stripe Webhooks     | Fryer Timer                   | Kitchen              |
| 19  | Resend              | Bar Cocktail Shaker           | Dining (bar)         |
| 20  | Sentry              | Smoke Detector                | Ceiling              |
| 21  | PostHog             | Security Camera               | Ceiling              |
| 22  | Google OAuth        | Front Door                    | Dining               |
| 23  | Google Maps         | Wall Map                      | Dining               |
| 24  | Google Calendar     | Reservation Book              | Dining               |
| 25  | Gmail Sync          | Telephone                     | Dining               |
| 26  | Cloudflare Tunnel   | Hood Vent / Ductwork          | Kitchen (ceiling)    |
| 27  | Cloudflare DNS      | Neon "OPEN" Sign              | Exterior             |
| 28  | GitHub              | Filing Cabinet                | Office               |
| 29  | Next.js (framework) | Kitchen Layout / Floor Plan   | Kitchen              |
| 30  | TypeScript          | Mise en Place / Prep          | Kitchen              |
| 31  | Tailwind CSS        | Table Settings / Presentation | Dining               |
| 32  | Playwright          | Health Inspector (person)     | Roaming              |
| 33  | npm                 | Receiving / Deliveries        | Alley                |
| 34  | tsc (compiler)      | Prep List Checklist           | Kitchen              |
| 35  | Next.js Build       | Full Station Setup            | Kitchen              |
| 36  | Git                 | Dish Pit / Dish Machine       | Kitchen              |
| 37  | Vercel Platform     | Heat Lamps at Pass            | Pass                 |
| 38  | Beta Deploy Script  | Grill Temperature Control     | Kitchen              |
| 39  | HTTP Requests       | Ticket Printer                | Kitchen              |
| 40  | Active Events       | Occupied Tables               | Dining               |
| 41  | Revenue             | Cash Register / POS           | Dining               |

---

## PIXEL ART SPECS

### Color Palette (16-bit feel)

```javascript
const PALETTE = {
  // Kitchen metals
  steel: '#C0C0C0', // stainless steel surfaces
  steelDark: '#808080', // shadowed metal
  chrome: '#E8E8E8', // shiny handles, rails

  // Flames
  flameBlue: '#4444FF', // gas flame base
  flameOrange: '#FF8800', // flame tips
  flameYellow: '#FFCC00', // hot flame
  pilot: '#2222AA', // pilot light

  // Food/organic
  woodLight: '#C8A050', // cutting boards, tables
  woodDark: '#8B6914', // dark wood trim
  foodGreen: '#44AA44', // produce, herbs
  foodRed: '#CC3333', // meat, tomatoes
  foodGold: '#DAA520', // fried food, oils

  // Status
  statusGreen: '#00CC44', // healthy
  statusYellow: '#FFAA00', // warning
  statusRed: '#FF2222', // error/down

  // Temperature display
  tempGreen: '#00FF44', // cold (good)
  tempYellow: '#FFD700', // warming (warning)
  tempRed: '#FF0000', // hot (danger)

  // Environment
  tileFloor: '#D4C4A0', // kitchen floor
  wallWhite: '#F0E8DC', // kitchen walls
  ceilingGray: '#A0A0A0', // ceiling
  steam: '#FFFFFF', // steam (semi-transparent)
  smoke: '#888888', // smoke
  water: '#4488CC', // water
  ice: '#CCDDFF', // ice, cold air

  // People
  coatWhite: '#F8F8F0', // chef coat
  coatBlack: '#222222', // modern chef coat
  apronWhite: '#EEEEEE', // clean apron
  apronDirty: '#CCBB99', // dirty apron
  skin: '#DEB887', // skin tone (default)

  // Ambient
  heatLamp: '#FFB040', // amber heat lamp glow
  neonGlow: '#FF3366', // neon sign
  candleGlow: '#FFE4B5', // candle light
  screenGlow: '#44FF44', // POS/register screen
}
```

### Sprite Sizes (at 2x scale)

- **People:** 8w x 14h pixels (with hat/toque: 8w x 18h)
- **Stove/Station:** 24w x 16h pixels each
- **Walk-In Cooler:** 32w x 24h pixels (prominent, it's the database)
- **Tables (dining):** 12w x 8h pixels each
- **Equipment (fryer, mixer, etc.):** 8-12w x 10-14h pixels
- **Small items (bottles, containers):** 3-4w x 5-6h pixels
- **Flames:** 2-4w x 3-6h pixels, 2-frame animation
- **Steam particles:** 1-2w x 2-4h pixels, float up + fade

### Animation Speeds

- Flame flicker: 200ms per frame (5 fps)
- Steam rise: 100ms per pixel upward, fade over 600ms
- Ticket print: new ticket appears every 1-3 seconds based on load
- Chef movement: 300ms per position change
- Temperature display: updates every 30 seconds
- Cash register: updates on revenue change with 500ms "ka-ching" flash
- Dish pit cycle: 3-second animation (dirty in, steam burst, clean out)

---

## PRIORITY ORDER FOR IMPLEMENTATION

### Phase 1: Core Kitchen (must-have)

1. Stove line with 3 burners (dev, beta, prod) with flame states
2. Walk-in cooler with temperature display (Supabase)
3. Head chef sprite (Ollama)
4. Dish pit (Git status)
5. Ticket printer (request flow)

### Phase 2: Restaurant Expansion

6. Cash register (revenue)
7. Dining room tables (active events)
8. Host stand with guests (inquiries)
9. Deep fryer (Stripe)
10. Pass with heat lamps (Vercel/production)

### Phase 3: Full Scene

11. Bar area (external services: Resend, PostHog, Sentry)
12. Front door (Google OAuth)
13. Delivery door (OpenClaw)
14. Office area (admin, GitHub filing cabinet)
15. Hood vent (Cloudflare Tunnel)

### Phase 4: Polish

16. Neon sign (DNS)
17. All ceiling elements (cameras, smoke detectors)
18. Generator (backup)
19. Sidestations (browser storage)
20. Prep station details (TypeScript/build)
21. Cookbook on shelf (Gemini)
22. Full ambient animations (steam, sound, particles)

---

## ADDITIONAL SERVICES (from Full Stack CS Report)

The CS expert report revealed 30+ additional services beyond the core 41. These are grouped into restaurant metaphors by category.

### Pantry Shelf = External Data APIs

The dry storage pantry holds bulk supplies the kitchen draws from. Each API is a labeled container on the shelf.

| Tech Component                  | Kitchen Element                           | Visual                        |
| ------------------------------- | ----------------------------------------- | ----------------------------- |
| **Spoonacular**                 | Jar of spice blend (ingredient pricing)   | Labeled jar on pantry shelf   |
| **USDA FoodData**               | Nutrition facts poster on pantry wall     | Laminated chart               |
| **Edamam**                      | Allergen warning card clipped to shelf    | Red/yellow allergy cards      |
| **Kroger / MealMe / Instacart** | Vendor catalogs on clipboard in receiving | Stack of supplier price lists |
| **Yelp / Google Reviews**       | Comment cards in a box at host stand      | Stack of guest feedback cards |
| **Tavily**                      | Chef's phone (quick web search)           | Small phone on chef's hip     |
| **API Ninjas (tax)**            | Calculator next to cash register          | Small desktop calculator      |
| **Geocodio**                    | Street map pinned to office wall          | Pushpin map                   |
| **AirNow**                      | Air quality gauge near hood vent          | Small dial gauge              |
| **openFDA**                     | FDA inspection certificate on wall        | Framed certificate            |
| **weather.gov**                 | Window showing outside weather            | Window with sky/rain/sun      |

### Prep Line Timer Board = Cron Jobs (30+ Scheduled Tasks)

The kitchen has a **timer board** (row of kitchen timers on the wall above the pass). Each timer represents a scheduled cron job. Timers tick down, flash when they fire, and reset.

| Timer Group                   | Visual                             | Example Jobs                                           |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------ |
| **5-min timers** (fast cycle) | Small egg timers, spinning rapidly | Gmail sync, integration pull, social publish           |
| **15-min timers**             | Medium timers, steady tick         | Automations, copilot, email history                    |
| **30-min timers**             | Larger timers                      | Call reminders, monitoring                             |
| **Hourly timers**             | Wall clock style                   | Integration retry, RSVP, campaigns, Remy alerts        |
| **6-hour timers**             | Oven timer display                 | Revenue goals, follow-ups, wellbeing, reviews          |
| **Daily timers**              | Calendar page (day tear-off)       | Cleanup, lifecycle, reports, briefings, beta reminders |
| **Monthly timer**             | Calendar page (month)              | Raffle draw                                            |

Visual: When a cron fires, the timer flashes, a small "DING!" animation appears, and a tiny ticket prints from the board showing the job name.

### Telephone System = Communication Services

| Tech Component                   | Kitchen Element                                      | Visual                                                     |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| **Twilio (SMS/WhatsApp)**        | **Pager system** (the buzzer pagers at host stand)   | Stack of vibrating pagers, one flashes when SMS sent       |
| **OneSignal / Web Push (VAPID)** | **Kitchen bell** (the small desk bell at the pass)   | Bell that dings when push notification fires               |
| **ElevenLabs (Remy voice)**      | **Remy's mouth/voice** (the head chef sprite speaks) | Speech bubble with sound waves when voice synthesis active |

### Service Window = Middleware Layer

| Tech Component                    | Kitchen Element                                                                                 | Visual                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Next.js Middleware**            | **Service window** (the small window between kitchen and dining room where orders pass through) | Sliding window, open = requests flowing, closed = blocked            |
| **Rate Limiting (Upstash Redis)** | **Bouncer at the door**                                                                         | Large figure at front door, hand up = rate limited, relaxed = normal |
| **CORS/CSP Headers**              | **Kitchen door sign** ("STAFF ONLY", "NO ENTRY")                                                | Signs on the kitchen door                                            |

### Catering Van = Mobile/Desktop Builds

| Tech Component           | Kitchen Element                                       | Visual                                                            |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| **Tauri (Desktop App)**  | **Catering van** parked outside                       | Van with ChefFlow logo, lights on = app running, dark = not built |
| **PWA / Service Worker** | **Takeout window** (separate counter for grab-and-go) | Small window on building exterior, "TAKEOUT" sign                 |

### Inngest = Kitchen Prep Schedule Board

| Tech Component                | Kitchen Element                                           | Visual                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inngest (Background Jobs)** | **Tomorrow's Prep List** (posted by sous chef at closing) | Clipboard hanging on wall with numbered tasks. Tasks get checked off as they complete. Items: post-event emails (thank you, review, referral), commerce closeout, payment reconciliation, settlement |

### Additional Office Items

| Tech Component                             | Kitchen Element                                         | Visual                                          |
| ------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------- |
| **DocuSign**                               | **Notary stamp** on manager's desk                      | Stamp and ink pad                               |
| **QuickBooks**                             | **Ledger book** (big accounting book)                   | Thick book open on desk with columns of numbers |
| **Square**                                 | **Second cash register** (backup POS)                   | Smaller register next to main one               |
| **Zapier**                                 | **Intercom system** (connects rooms/services)           | Wall-mounted intercom box with buttons          |
| **Social OAuth (Instagram, TikTok, etc.)** | **Social media wall** (photos and reviews posted)       | Cork board with polaroids and business cards    |
| **Cloudinary / Unsplash / Pexels**         | **Photo studio corner** (lightbox for food photography) | Small photo setup with ring light               |
| **OCR Space / Tesseract**                  | **Receipt scanner** on manager's desk                   | Small flatbed scanner                           |
| **Remotion (video)**                       | **Video camera** in dining room                         | Camera on tripod                                |
| **i18n (next-intl)**                       | **Multi-language menu**                                 | Menu boards in multiple languages               |

---

## REVISED COMPLETE COMPONENT COUNT

| Category                | Count                                             | Zone                                         |
| ----------------------- | ------------------------------------------------- | -------------------------------------------- |
| Core Servers (5)        | Dev, Beta, Prod, MC, OpenClaw                     | Kitchen Line + Pass + Alley                  |
| AI/Inference (4)        | Ollama, qwen3:4b, qwen3:8b, Gemini                | Kitchen (Chef + Cookbook)                    |
| Database/Storage (5)    | Supabase DB, Auth, Storage, Realtime, RLS         | Walk-In Cooler                               |
| Browser Storage (2)     | IndexedDB, localStorage                           | Sidestations                                 |
| Payments (3)            | Stripe, Stripe Webhooks, Square                   | Fryer + Second Register                      |
| Email/Comms (4)         | Resend, Twilio, OneSignal/VAPID, ElevenLabs       | Bar + Pagers + Bell                          |
| Monitoring (2)          | Sentry, PostHog                                   | Ceiling (Smoke Detector + Camera)            |
| Google Services (5)     | OAuth, Maps, Calendar, Gmail, Custom Search       | Front Door + Map + Book + Phone              |
| Infrastructure (4)      | Cloudflare Tunnel, DNS, GitHub, Generator         | Hood Vent + Sign + Filing + Generator        |
| Build Pipeline (6)      | npm, tsc, Next.js Build, Git, Vercel, Beta Deploy | Prep + Dish Pit + Pass                       |
| External Data APIs (11) | Spoonacular, USDA, Edamam, Kroger, etc.           | Pantry Shelf                                 |
| Cron Jobs (30+)         | Grouped into 7 timer categories                   | Timer Board above Pass                       |
| Background Jobs (1)     | Inngest                                           | Prep Schedule Board                          |
| Middleware/Security (3) | Next.js MW, Rate Limiting, CORS/CSP               | Service Window + Bouncer + Signs             |
| Apps (2)                | Tauri, PWA                                        | Catering Van + Takeout Window                |
| Office Tools (6)        | DocuSign, QuickBooks, Zapier, Social, Photo, OCR  | Manager's Office                             |
| Code Framework (4)      | Next.js, TypeScript, Tailwind, Playwright         | Kitchen Layout + Prep + Settings + Inspector |
| Business Data (3)       | Events, Inquiries, Revenue                        | Tables + Host Stand + Register               |
| **TOTAL**               | **~80**                                           | All Zones                                    |
