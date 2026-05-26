# Exit Eval: Guest / MENU, FOOD & EXPERIENCE RESEARCH

> **Wave 4** | 6 scenarios | Evaluator: Claude (Solo mode)
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)
>
> **Source:** `docs/research/guest-exit-points-analysis.md` Category 6
> **Companion:** `docs/research/guest-never-leaves-analysis.md` Categories 4, 6
> **Rubric:** `.claude/skills/exit-eval/SKILL.md`

---

## Scenario #35: Research unfamiliar dishes before picking

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** Guest sees a dish name on the menu picker or guest portal (e.g. "Boudin Noir en Croute" or "Yuzu Kosho Crudo") and does not know what it is. They need to understand the dish before committing a selection. The operational gap: the guest lacks enough context to make a confident choice, so they open Google or a food blog to learn what they are about to eat.

**Context ChefFlow has:**

- Full dish name, course, and description (stored in `menu_dishes` and exposed via `PublicMenuData` and `PublicCatalogData` types)
- Chef notes (stored in dish index: `lib/menus/dish-index-actions.ts` schema includes `description`, `notes`, `dietary_tags`, `allergen_flags`)
- Linked recipe with ingredients (dish index has `linked_recipe_id` field)
- Photo URL on catalog dishes (`PublicCatalogData.dishes[].photoUrl`)
- Dietary tags and allergen flags (fully exposed on catalog-pick and guest portal, but NOT on menu-pick)

**Data source?** No external API needed. The chef IS the data source. Dish descriptions, ingredient lists, and photos are all chef-authored content already in the database. The gap is exposure, not acquisition.

**Client-collaborative angle:** Limited. The host might explain dishes in a group chat, but the chef is the authority. If the chef writes rich dish descriptions and attaches photos, the guest never needs to search.

**Physical reality:** Screen-based. Guest is browsing a menu on their phone before or during an event. Quick-glance clarity matters: a 1-2 sentence description and a photo eliminate most searches. No hands-free need here.

**Compounding:** High. Every dish description, photo, and ingredient note the chef adds serves every future guest who encounters that dish. The dish index (`lib/menus/dish-index-actions.ts`) is a permanent catalog. One investment pays across all events.

**Solution design:**

- Enrich `PublicMenuData` (menu-pick token page) to include `dietary_tags`, `allergen_flags`, and `photoUrl` (already present in `PublicCatalogData` but missing from `PublicMenuData` in `lib/menus/menu-share-actions.ts`)
- Add ingredient highlights to guest-facing dish cards (pull from linked recipe ingredients when available)
- Surface chef notes as expandable "About this dish" on both menu-pick and catalog-pick
- Display dish photos inline on menu-pick (catalog-pick already has `photoUrl` in its type but rendering not confirmed)
- Add a "What is this?" expandable panel per dish that shows description + key ingredients + dietary/allergen badges

**Where it appears:**

- `/menu-pick/[token]` (currently shows name + description only, no photos, no tags)
- `/catalog-pick/[token]` (has dietary tags and photo URL in data type, partially rendered)
- Guest portal menu section (`portal-client.tsx` lines 397-441, shows description + dietary tags + allergen flags)
- `/share/[token]` menu summary

**What remains as permanent exit:**
Guest may still search for dishes from cuisines completely unfamiliar to them where even a good description is insufficient (e.g., wanting to see YouTube videos of how a dish is prepared or eaten). This is a narrow edge case.

**Priority:** High frequency (every guest encountering unfamiliar cuisine) x Low effort (data already exists, just needs exposure on menu-pick) = P1
**Spec needed?** No. The fix is wiring existing data to existing surfaces.

---

## Scenario #36: Ask friends which menu option to choose

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** Guest has menu options to choose from and wants social input before picking. The decision is collaborative, not informational. They screenshot the menu or describe options in a group chat. The operational need: shared decision-making among a social group that may not all be in ChefFlow.

**Context ChefFlow has:**

- Full menu with dish names, descriptions, courses (via share tokens and guest portal)
- Dinner Circle poll infrastructure (`lib/dinner-circles/polls.ts` with `createPoll`, `votePoll`, single/multi/ranked choice)
- Menu poll composer (`components/events/dinner-circle-menu-poll-composer.tsx` with course-level poll creation)
- Guest share link generation (`GuestNetworkShare` in guest portal)
- Group decisions channel in Circles (`components/circles/redesign/channels/group-decisions.tsx`)

**Data source?** No. This is social coordination, not data lookup.

**Client-collaborative angle:** Strong. If guests are in a Dinner Circle, the chef or host can publish a menu poll directly. The Circle poll system already supports single choice, multi-select, and ranked choice voting. The gap is that most dinner guests are NOT Circle members; they are token-only users on menu-pick pages.

**Physical reality:** Screen-based. Guest is on their phone, wants to share a screenshot or link. Native share sheet is the natural interface.

**Compounding:** Low. Each menu choice is event-specific. No lasting knowledge is created.

**Solution design:**

- Add a "Share this menu" button to `/menu-pick/[token]` that creates a read-only shareable link or generates a copy-friendly text summary
- For Circle members: surface the existing poll infrastructure from the menu-pick page (link to "Vote in your Circle" if a linked Circle exists)
- For token-only guests: add a lightweight "share your picks" view that lets a guest forward a summary of the menu to friends via native share sheet
- Do NOT build a full voting system outside Circles; the social coordination will always happen in iMessage/WhatsApp

**Where it appears:**

- `/menu-pick/[token]` (add share/copy button)
- `/catalog-pick/[token]` (add share/copy button)
- Dinner Circle group decisions channel (poll system already exists)

**What remains as permanent exit:**
The actual group conversation will always happen in the guest's native messaging app. ChefFlow can make the menu easy to share but cannot replace iMessage, WhatsApp, or in-person discussion. This is a permanent social exit.

**Priority:** Medium frequency (group dinners, not solo) x Low effort (share button + copy text) = P2
**Spec needed?** No. Lightweight share/copy UX addition.

---

## Scenario #37: Browse wine, cocktail, or beverage pairings

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why guest leaves:** Guest sees a multi-course menu and wants to know what wine or cocktail pairs well. They browse Vivino, Google "wine pairing for lamb", or check a retailer's site. The operational need: beverage intelligence that complements the menu the chef has designed.

**Context ChefFlow has:**

- Beverage discovery section on events (`components/events/beverage-discovery-section.tsx` with service type: chef_provides, client_provides, BYOB, no_alcohol, TBD)
- Beverage expectations field on events (`beverage_expectations` column)
- Beverage notes PDF generator (`lib/documents/generate-beverage-notes.ts` with per-course pairing sheets)
- Alcohol being served flag (`alcohol_being_served` boolean)
- Full menu with courses and dish descriptions
- Recipe ingredient data (for pairing logic)

**Data source?** Partially. Wine/cocktail pairing knowledge could come from: (a) the chef's own pairing notes (already capturable in beverage expectations), (b) AI-generated pairing suggestions from Gemma 4 based on menu ingredients, or (c) external pairing databases. The chef is the primary authority for their own events.

**Client-collaborative angle:** Moderate. If beverage service is "client provides" or "BYOB", the host or guests need guidance. The chef's pairing notes published to the guest portal or Circle would eliminate the search. The Dinner Circle "what to bring" channel (`components/circles/redesign/channels/what-to-bring.tsx`) is a natural home for beverage recommendations.

**Physical reality:** Screen-based pre-event. Guest is planning what to bring or what to expect. Not a kitchen/hands-free moment.

**Compounding:** Medium. Chef pairing notes per dish compound across events serving the same dishes. A "Pairs well with" note on a dish index entry serves every future event using that dish.

**Solution design:**

- Add a "Pairing notes" field to the dish index schema (chef writes "Pairs well with: medium-bodied red, Pinot Noir ideal")
- Surface chef pairing notes on the guest portal menu section when beverage service is BYOB or client_provides
- Publish beverage guidance to the Dinner Circle "what to bring" channel automatically when beverage data exists
- For BYOB events, show a simple "Chef recommends" pairing block per course on the guest portal
- Optional: use Gemma 4 to suggest pairings based on dish ingredients when chef has not written notes

**Where it appears:**

- Guest portal menu section (add pairing notes per dish)
- Dinner Circle "what to bring" channel
- `/share/[token]` event details (beverage plan summary)
- Beverage notes PDF (already exists for chef, could be guest-shared)

**What remains as permanent exit:**
Guests will still browse Vivino for specific bottle reviews, check retailer inventory, and comparison shop. ChefFlow provides pairing guidance, not a wine marketplace. Purchasing is always external.

**Priority:** Medium frequency (BYOB/client-provides events) x Medium effort (new field + surface wiring) = P2
**Spec needed?** No. Incremental field additions and surface wiring.

---

## Scenario #38: Buy wine or host-provided items

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** Guest needs to purchase wine, spirits, or other items the chef has requested the host/guests provide. They go to a liquor store app, Drizly, Total Wine, or a physical store. The operational need: commercial transaction in a regulated marketplace.

**Context ChefFlow has:**

- Beverage plan and expectations per event (`beverage_expectations`, `beverage_service_type`)
- "What to bring" channel in Dinner Circles (`components/circles/redesign/channels/what-to-bring.tsx`)
- Chef's pairing recommendations (when written)
- Guest count and dietary context (for quantity estimation)
- Event date and timeline (for planning)

**Data source?** No. Wine/liquor retail is a regulated commercial marketplace. ChefFlow should not become a retailer or aggregator.

**Client-collaborative angle:** Strong for coordination. The Circle "what to bring" channel can track who is bringing what, preventing duplicates. The chef's beverage notes tell guests WHAT to buy. The actual purchase is external.

**Physical reality:** Mobile commerce or in-store shopping. Guest is in a liquor store or browsing a delivery app. ChefFlow's job ends at "here's what the chef recommends."

**Compounding:** Low. Each purchase is event-specific. Quantity and variety change every time.

**Solution design:**

- Ensure chef beverage recommendations are clearly visible on guest portal and Circle
- Add quantity guidance ("For 8 guests, 3-4 bottles of red recommended")
- Track "who's bringing what" in Circle what-to-bring channel (coordination, not commerce)
- Provide copyable shopping list text that guest can take to the store

**Where it appears:**

- Guest portal beverage section
- Dinner Circle "what to bring" channel
- Share page event details

**What remains as permanent exit:**
All purchasing. ChefFlow never processes alcohol sales, never links to specific retailers, never becomes a marketplace. The guest always leaves to buy. This is a clean permanent exit.

**Priority:** Low frequency (only BYOB/client-provides events) x Minimal effort (surface existing data better) = P3
**Spec needed?** No.

---

## Scenario #39: Save a dish idea for later home cooking

**Original classification:** Reducible
**Reclassified to:** Partially Reducible

**Why guest leaves:** Guest attends a dinner, loves a dish, and wants to remember or recreate it later. They screenshot the menu, take a photo of the plating, or bookmark a food blog recipe. The operational need: personal food memory outside the event context.

**Context ChefFlow has:**

- Event recap page (`app/(public)/share/[token]/recap/page.tsx`) with menu highlights, guest messages, and photos
- Guest portal showing full menu with dish names, descriptions, and dietary tags
- Dish index with rich metadata (description, dietary tags, season affinity, chef notes)
- Testimonial form on recap page
- Guest photo upload and gallery
- Recipe data (but recipes are chef IP, not publicly shared)

**Data source?** No external source. The dish memory is ChefFlow content. But the guest's personal recipe collection lives outside ChefFlow (Notes app, recipe apps, bookmarks).

**Client-collaborative angle:** None. This is a personal desire, not a social or host-mediated need.

**Physical reality:** Post-event. Guest is at home, reflecting on the dinner. Screen-based, no urgency.

**Compounding:** Medium. If ChefFlow builds a guest-facing dish memory, it compounds across multiple events attended. A returning guest could have a "dishes I loved" history. But this requires guest identity persistence (profile token or account).

**Solution design:**

- Add "Save to my favorites" on the guest portal menu section (stores dish reference against guest profile token)
- On recap page, show menu served with "I loved this" quick-reaction per dish
- For profile-token guests (Circle members), build a simple "My Dish Memories" view on `/hub/me/[profileToken]`
- Provide a "Take this home" card per dish: dish name, description, key ingredients (NOT the full recipe, which is chef IP)
- Allow export as text/image for pasting into personal notes

**Where it appears:**

- Guest portal menu section (save/favorite button)
- `/share/[token]/recap` page (dish highlight reactions)
- `/hub/me/[profileToken]` profile (dish memory history)

**What remains as permanent exit:**
Full recipe recreation. ChefFlow intentionally does NOT share chef recipes with guests (recipes are chef intellectual property per `memory/project_flexible_creation_order.md`). The guest gets dish name, description, and ingredient highlights, but not proportions, techniques, or full instructions. Guests wanting to cook the dish at home will still need to find a similar recipe externally.

**Priority:** Medium frequency (memorable dishes are common) x Medium effort (new guest-facing save mechanism) = P2
**Spec needed?** Yes, if built beyond the recap reaction. A "Guest Dish Memory" feature touching profile tokens, hub profile views, and recap pages warrants a lightweight spec.

---

## Scenario #40: Translate or explain menu language

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** Guest sees French culinary terms ("en croute", "au jus", "chiffonade"), Japanese dish names, or specialized food vocabulary and does not understand. They open Google Translate or search "what does [term] mean." The operational need: linguistic accessibility for menu comprehension.

**Context ChefFlow has:**

- Full translation system: `lib/translate/libre-translate.ts` (LibreTranslate API, 10 languages, auto-detect)
- Server actions for translation: `lib/translate/translate-actions.ts` (`translateSingleText`, `translateMenuItemsBatch`)
- Menu translate button component: `components/menus/menu-translate-button.tsx` (language selector, batch translation, inline results)
- Dish descriptions on guest portal (course name + description + dietary tags)
- Chef notes in dish index

**Data source?** Yes. LibreTranslate (free, self-hostable). Already integrated. The translation pipeline is BUILT but only available on chef-side menu editor, not on guest-facing surfaces.

**Client-collaborative angle:** None. This is a language accessibility need, not a social coordination.

**Physical reality:** Screen-based. Guest is reading a menu on their phone. Inline translation or glossary tooltip is the ideal interface. No voice or print need.

**Compounding:** High. Once a dish name is translated for one guest, the same translation serves every future guest who speaks that language. Translations could be cached per dish per language.

**Solution design:**

- Add `MenuTranslateButton` to guest portal menu section and menu-pick/catalog-pick token pages
- Add inline culinary glossary tooltips for common French/Italian/Japanese terms (static dictionary, no API call needed for ~200 common culinary terms)
- Cache translations per dish+language in the dish index to avoid repeated API calls
- Auto-detect guest browser language and offer "View menu in [language]" prompt when non-English detected
- Add "What does this mean?" expandable per dish that shows a plain-English explanation alongside the culinary name

**Where it appears:**

- `/menu-pick/[token]` (add translate button, currently absent)
- `/catalog-pick/[token]` (add translate button, currently absent)
- Guest portal menu section in `portal-client.tsx` (add translate button)
- `/share/[token]` menu summary

**What remains as permanent exit:**
Edge cases where LibreTranslate quality is poor for obscure culinary terms in rare languages. Mainstream languages (Spanish, French, Italian, Chinese, Japanese, Korean) should cover 95%+ of guest needs. Guests may still search for cultural context beyond translation (e.g., "what does this dish taste like" vs. "what does the name mean").

**Priority:** High frequency (any guest facing a non-English menu) x Low effort (component already built, just needs wiring to guest surfaces) = P1
**Spec needed?** No. The `MenuTranslateButton` component and LibreTranslate integration are fully built. This is purely a wiring task: add the component to three guest-facing pages.

---

## Batch Summary

| #   | Title                                       | Reclassified To     | Spec Needed?                    |
| --- | ------------------------------------------- | ------------------- | ------------------------------- |
| 35  | Research unfamiliar dishes before picking   | Reducible           | No                              |
| 36  | Ask friends which menu option to choose     | Bridgeable          | No                              |
| 37  | Browse wine, cocktail, or beverage pairings | Partially Reducible | No                              |
| 38  | Buy wine or host-provided items             | Permanent           | No                              |
| 39  | Save a dish idea for later home cooking     | Partially Reducible | Yes (if beyond recap reactions) |
| 40  | Translate or explain menu language          | Reducible           | No                              |

### Classification Distribution

- **Reducible:** 2 (#35, #40)
- **Partially Reducible:** 2 (#37, #39)
- **Bridgeable:** 1 (#36)
- **Permanent:** 1 (#38)

### Key Findings

1. **#40 (Translation) is the biggest quick win.** The entire translation pipeline is built (`lib/translate/`, `components/menus/menu-translate-button.tsx`) but only wired to chef-side surfaces. Adding it to three guest pages is a near-zero-effort, high-impact fix.

2. **#35 (Dish research) is mostly a data exposure gap.** `PublicCatalogData` already includes `dietaryTags`, `allergenFlags`, and `photoUrl`, but `PublicMenuData` does not. Parity between these two types would close most of the exit.

3. **#39 (Save dish for later) touches chef IP boundaries.** ChefFlow should share dish descriptions and ingredient highlights, never full recipes. This is a product policy decision the developer should validate.

4. **#37 (Beverage pairings) has strong existing infrastructure** (beverage discovery section, beverage notes PDF, Circle "what to bring" channel) but none of it surfaces on guest-facing pages.

5. **#38 (Buy wine) is a clean permanent exit.** ChefFlow should never become a liquor marketplace. The only work is making chef recommendations more visible.

6. **#36 (Social menu choice) will always be bridgeable.** The Circle poll system is sophisticated but most dinner guests are token-only users. A simple share/copy button is the right investment.
