# Document Formatting Spec: Professional PDF Standards

> Research-backed formatting spec for all 17 ChefFlow operational documents.
> Sources: culinary schools (CIA, Culinary Pro), UK FSA allergen standards, hotel BEO systems (Tripleseat, Oracle OPERA, Event Temple), film production call sheets (StudioBinder), professional catering operations (WebstaurantStore, Chefs Resources), food photography standards, sommelier pairing conventions.

---

## 1. DESIGN TOKEN SYSTEM (Shared Constants)

All generators must pull from a single source of truth. No inline magic numbers.

### Typography Scale

| Token           | Size | Weight | Use                           |
| --------------- | ---- | ------ | ----------------------------- |
| `title`         | 16pt | Bold   | Document title                |
| `sectionHeader` | 12pt | Bold   | Section breaks                |
| `courseHeader`  | 11pt | Bold   | Sub-sections, course names    |
| `bodyText`      | 10pt | Normal | Checklist items, body content |
| `metadata`      | 9pt  | Normal | Key-value pairs, header bars  |
| `caption`       | 8pt  | Italic | Extra info, notes, hints      |
| `footer`        | 7pt  | Normal | Attribution, page numbers     |

Current body text is 9pt. **Bump to 10pt minimum.** Kitchen lighting is poor, hands are wet, stress is high. 9pt is the absolute floor; 10pt is the professional standard.

### Spacing Scale

| Token                  | Value | Use                                           |
| ---------------------- | ----- | --------------------------------------------- |
| `sectionGap`           | 5mm   | Between major sections                        |
| `groupGap`             | 3mm   | Between item groups within a section          |
| `itemGap`              | 1.5mm | Between individual items                      |
| `lineHeightMultiplier` | 0.40  | Line height = fontSize \* 0.40 (up from 0.38) |
| `paragraphGap`         | 2mm   | Between paragraphs of text                    |

### Color Palette

| Token           | RGB             | Hex     | Use                                    |
| --------------- | --------------- | ------- | -------------------------------------- |
| `textPrimary`   | (0, 0, 0)       | #000000 | All body text                          |
| `textSecondary` | (100, 100, 100) | #646464 | Metadata, notes                        |
| `textMuted`     | (140, 140, 140) | #8C8C8C | Footer, attribution                    |
| `borderPrimary` | (60, 60, 60)    | #3C3C3C | Section separator lines                |
| `borderLight`   | (180, 180, 180) | #B4B4B4 | Thin horizontal rules                  |
| `dangerText`    | (180, 0, 0)     | #B40000 | Allergen warnings, critical alerts     |
| `dangerBg`      | (255, 240, 240) | #FFF0F0 | Warning box fill                       |
| `dangerBorder`  | (200, 0, 0)     | #C80000 | Warning box border                     |
| `warningText`   | (140, 90, 0)    | #8C5A00 | Caution items                          |
| `warningBorder` | (180, 120, 0)   | #B47800 | Caution box border                     |
| `successText`   | (0, 100, 50)    | #006432 | Completed/safe indicators              |
| `shadingLight`  | (245, 245, 245) | #F5F5F5 | Alternating rows (~4% black)           |
| `shadingMedium` | (235, 235, 235) | #EBEBEB | Section header backgrounds (~8% black) |
| `brandOrange`   | (232, 143, 71)  | #E88F47 | Client-facing docs only                |

### Margins

| Edge   | Default | 3-Hole Punch Mode |
| ------ | ------- | ----------------- |
| Left   | 14mm    | 20mm              |
| Right  | 12mm    | 12mm              |
| Top    | 14mm    | 14mm              |
| Bottom | 10mm    | 10mm              |

Current left margin is 12mm. Standard 3-hole punch drills at 12.7mm from edge (hole diameter 6.35mm, outer edge at ~16mm). Content at 12mm gets punched through. Bump to 14mm default (clipboard-safe), 20mm for binder mode.

### Checkbox

| Token            | Value                                    |
| ---------------- | ---------------------------------------- |
| `boxSize`        | 4.5mm minimum (up from fontSize \* 0.38) |
| `boxSizeLarge`   | 6mm (wet-hands / gloves mode)            |
| `boxLineWidth`   | 0.3pt                                    |
| `boxColor`       | rgb(40, 40, 40)                          |
| `checkRowHeight` | 6mm minimum (up from ~4.8mm)             |

### Document Category Color Bands

2mm color band at the very top of every page. Minimal ink, instant document identification in a stack.

| Category           | Band Color   | Hex     | Documents                               |
| ------------------ | ------------ | ------- | --------------------------------------- |
| Core Operations    | Dark blue    | #1A3A5C | Prep, Execution, Checklist, Reset, Mise |
| Shopping/Logistics | Forest green | #2D5F2D | Grocery, Packing, Travel                |
| Client-Facing      | Charcoal     | #333333 | FOH Menu, Event Summary, BEO            |
| Safety             | Dark red     | #8B0000 | Allergen Reference, Allergy Card        |
| Finance            | Dark slate   | #3D3D5C | Invoice, Quote, Contract, Receipt       |
| Marketing          | Dark teal    | #1A5C5C | Content Shot List, Plating Guide        |

---

## 2. UNIVERSAL DOCUMENT STRUCTURE

Every document follows this skeleton:

```
[2mm COLOR BAND - category identification]
[DOC TYPE LABEL - 8pt bold caps, top-right corner]

[TITLE - 16pt bold, centered]
[METADATA BAR - key-value pairs: Client | Date | Time | Guests | Location]
[THIN RULE - 0.4pt separator]

[!! ALLERGY/SAFETY WARNING BOX - if applicable, ALWAYS first !!]

[SECTION 1 HEADER - 12pt bold, with 0.4pt rule above]
  Content...

[SECTION 2 HEADER]
  Content...

[FOOTER: Doc Type | Page X of Y | Timestamp]
[ATTRIBUTION: "Generated by [Chef] via ChefFlow" - 7pt muted]
```

### Multi-Page Continuation

Page 2+ gets a continuation header:

- "[DOC TYPE] (cont.) -- [Client Name] -- [Date]" in bold 10pt
- Repeat event date and serve time on every page
- Never split a section mid-item; push the whole group to the next page

### Information Hierarchy: Glance, Scan, Read

| Level         | Time                   | What's Visible                      | Design                              |
| ------------- | ---------------------- | ----------------------------------- | ----------------------------------- |
| Glance (0.5s) | Walking past clipboard | Title + color band + date           | 16pt bold, 2mm band                 |
| Scan (3-5s)   | Checking what's next   | Section headers + warnings + counts | 12pt bold headers, warning boxes    |
| Read (10-30s) | Executing a task       | Individual items, quantities, notes | 10pt body, checkbox > item > detail |

---

## 3. PER-DOCUMENT FORMATTING SPECS

### 3.1 GROCERY LIST

**Professional pattern:** Organized by store section (not recipe). Mirrors physical store layout.

| Element                   | Spec                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | --------------------------- |
| **Page**                  | Letter portrait. Half-letter (5.5x8.5) option for single-store                                                   |
| **Primary grouping**      | By store/vendor (multi-stop: each store gets its own section or page)                                            |
| **Secondary grouping**    | By store section: PRODUCE > MEAT/SEAFOOD > DAIRY > BAKERY > CANNED/DRY > FROZEN > BEVERAGES > MISC               |
| **Column structure**      | Checkbox (4.5mm)                                                                                                 | Qty+Unit (fixed width, right-aligned) | Item name (bold, primary scan target) | Notes/specs (italic, muted) |
| **Store header**          | 14pt bold caps, full-width, light background fill (#EBEBEB)                                                      |
| **Section header**        | 12pt bold caps, 0.4pt bottom rule, 5mm gap above                                                                 |
| **Item name**             | 10pt bold (the dominant visual element)                                                                          |
| **Qty/Unit**              | 9pt regular, fixed-width column so quantities align vertically                                                   |
| **Notes**                 | 8pt italic, muted color (#646464). Includes: ripeness, cut, brand, "or: substitute"                              |
| **Pre-sourced items**     | Checkbox pre-checked with checkmark. Listed in separate "CONFIRMED" section or inline with strikethrough styling |
| **Pantry check items**    | Prefix with "P" badge or filled dot                                                                              |
| **Budget line**           | Bold total at bottom                                                                                             |
| **Max items per section** | 15-20 before a visual break                                                                                      |

**Why this works:** Vertical checkbox alignment creates a "scan rail." Bold item names pop against lighter quantity/notes text. Section headers act as visual anchors.

### 3.2 PREP SHEET

**Professional pattern:** Timeline-based layout (not par-level). Phase-grouped: DAY BEFORE > MORNING OF > ON-SITE.

| Element               | Spec                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| **Page**              | Letter portrait, 1-2 pages                                                                                           |
| **Primary grouping**  | By time phase: DAY BEFORE, MORNING OF, ON-SITE                                                                       |
| **Phase headers**     | 13pt bold caps, full-width shaded background (#EBEBEB)                                                               |
| **Column structure**  | Checkbox                                                                                                             | Time window (10pt bold, e.g., "8:00-9:00 AM") | Task description (10pt, item bold, method normal) | Yield/storage (8pt italic, right-aligned) |
| **Allergen flags**    | Bold inline badges: **(GF)** **(DF)** **(NF)** in 9pt. Color: dangerText for "contains," successText for "free-from" |
| **Task format**       | Bold the ingredient name within the description: "Blanch and shock **haricots verts**, trim ends"                    |
| **Cross-reference**   | Small recipe reference in muted text at end of line                                                                  |
| **Item ordering**     | Within each phase: longest-cook-time first, then items that need to cool/set, then quick tasks                       |
| **Guest preferences** | Muted italic below affected items                                                                                    |

**Why this works:** Phase headers serve as temporal anchors. Bold ingredient names let eyes skip verbs. Allergen badges pop visually.

### 3.3 EXECUTION SHEET / Service Timeline

**Professional pattern:** Course-based vertical flow with arrival-relative timing.

| Element                   | Spec                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| **Page**                  | Letter portrait preferred; landscape if many parallel tasks                               |
| **Primary grouping**      | By course (Amuse, First, Second, Main, Dessert)                                           |
| **Course blocks**         | Each course gets a horizontal band. Color-coded subtly (left border, not background fill) |
| **Timing**                | Arrival-relative format: "T-30", "T-0 SERVICE", "T+15". Bold 11pt. Or clock times.        |
| **FIRE callout**          | Bold, 11pt, boxed or red-colored. "FIRE" is the universal kitchen keyword                 |
| **Components per course** | Indented bullet list with station/person assignment                                       |
| **Temperature callouts**  | Circled or bold: (165F). Critical food safety temps in dangerText                         |
| **Hold times**            | Italic, with max-hold-time warnings                                                       |
| **Parallel tasks**        | Side-by-side or indented under same time block                                            |
| **Current course**        | When printed, chef uses a paper clip or fold to mark current position                     |

**Why this works:** "What fires NOW, what fires NEXT, what's on hold" answered at a glance. Course color borders create visual rhythm.

### 3.4 NON-NEGOTIABLES CHECKLIST

**Professional pattern:** Organized by physical container/bag, split into NIGHT BEFORE and DAY OF.

| Element                | Spec                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------- | ------------------------------------------------------------------ |
| **Page**               | Letter portrait, single page                                                                                         |
| **Two-phase layout**   | NIGHT BEFORE (top, blue-tinted header #E8EEF4) and DAY OF (bottom, warm-tinted header #F4EDE8)                       |
| **Categories**         | KNIFE ROLL, COOKWARE TOTE, TOOLS, SERVICE WARE, CONSUMABLES, SAFETY/SANITATION, PERSONAL, SPECIALTY (event-specific) |
| **Category headers**   | 11pt bold caps, 0.4pt bottom rule                                                                                    |
| **Items**              | Checkbox (4.5mm)                                                                                                     | Item name (10pt) | Qty (10pt bold) | Condition notes (8pt italic: "sharpened", "charged", "client has") |
| **Critical items**     | Bold or starred (items you cannot substitute if forgotten: knives, thermometer, towels)                              |
| **"CLIENT HAS" items** | Separate mini-section or sidebar: "VERIFY ON ARRIVAL" in warning style                                               |
| **Packed-by line**     | Signature/initials line at bottom for accountability                                                                 |
| **Consumable rule**    | Towels: 1-2 per hour on site                                                                                         |
| **Target count**       | Under 40-50 items for manageability                                                                                  |

**Kit system:** Pre-built standard kits appear as single line items (Spice Kit, Cleaning Kit, Service Kit). Kit contents on a separate reference, not on event checklist.

### 3.5 PACKING LIST

**Professional pattern:** Organized by transport zone/container. Dual checkbox system (OUT + BACK).

| Element                    | Spec                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------- | ------------- |
| **Page**                   | Letter portrait; landscape if dual-checkbox columns need width                                                                                                          |
| **Defining feature**       | DUAL CHECKBOXES: Left = packed for event (OUT), Right = returned/accounted for (BACK). Prevents leaving equipment at venues                                             |
| **Zone headers**           | 12pt bold caps, shaded background, icon prefix. Zones: COOLER 1 (proteins), COOLER 2 (dairy/produce), HOT BOX, DRY GOODS, EQUIPMENT, LINENS/DECOR, CONSUMABLES, FRAGILE |
| **Zone icons**             | Unicode: snowflake for cold, box for dry. Text fallback: "[COLD]", "[DRY]", "[FRAGILE]"                                                                                 |
| **Column structure**       | Checkbox OUT                                                                                                                                                            | Item name (10pt) | Qty (10pt bold) | Checkbox BACK |
| **Temperature notes**      | Inline for food items: "must stay below 41F" in italic                                                                                                                  |
| **Rental/borrowed flags**  | Star or "RENTAL" badge for items that must be returned to third party                                                                                                   |
| **Loading order**          | Items listed in packing order: heavy/bulky first, light/delicate last                                                                                                   |
| **Max per zone**           | 10-12 items; sub-divide if longer                                                                                                                                       |
| **Component verification** | Count fields for recipe components: "Lamb racks: \_\_\_/8 portioned"                                                                                                    |

### 3.6 EVENT SUMMARY (BEO-Style Briefing)

**Professional pattern:** Top-down priority structure modeled on industry BEO format.

| Element                  | Spec                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Page**                 | Letter portrait, 1-2 pages max                                                                                     |
| **Above the fold**       | Event identity (name, date, time, location, guest count) + client contact + chef contact. All in first 1/3 of page |
| **Guest count**          | Large bold (16-24pt). Must be readable from 3 feet away                                                            |
| **Service time**         | Bold, prominent. Second most important datum                                                                       |
| **Allergen section**     | PROMINENTLY placed immediately after contacts, before menu. Red/amber background or border. Never buried           |
| **Menu section**         | Courses in service order with quantities                                                                           |
| **Previous event notes** | "Last time they loved..." or "They didn't enjoy..." in muted text                                                  |
| **Financial summary**    | Per-person cost, total, deposit, balance. Right-aligned numbers                                                    |
| **Field formatting**     | Bold the VALUES, mute the LABELS. Eye goes to "24 guests" not "Guest Count:"                                       |
| **Status stamp**         | "CONFIRMED" / "TENTATIVE" / "REVISED" in header area                                                               |

### 3.7 FRONT-OF-HOUSE MENU (Client-Facing)

**Professional pattern:** Centered, vertical flow. Generous whitespace as luxury signal. THIS IS THE ONLY DOCUMENT THAT USES SERIF FONTS.

| Element                | Spec                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Page**               | Half-letter (5.5x8.5) or A5 for intimate; full letter for larger events                                     |
| **Orientation**        | Portrait, single-sided preferred                                                                            |
| **Font family**        | Serif display font (Times/Georgia) for headers and dish names. Sans-serif for descriptions and dietary tags |
| **Event title**        | 18-24pt display serif, letterspaced +50-100 tracking                                                        |
| **Date**               | 9-10pt caps, letterspaced, light weight                                                                     |
| **Course labels**      | 8-9pt caps, letterspaced +75, muted gray or gold: "FIRST COURSE" or "I."                                    |
| **Dish names**         | 12-14pt, semibold serif. The hero text. Title or sentence case                                              |
| **Descriptions**       | 9-10pt italic sans-serif. Evocative but brief: "wild mushroom, truffle, aged parmesan"                      |
| **Dietary indicators** | 7-8pt superscript after dish name: ^V ^GF ^DF. Small, elegant, never loud. Legend at bottom                 |
| **Wine pairings**      | 9pt italic, preceded by wine glass symbol or "Paired with" in 7pt caps                                      |
| **Course dividers**    | Thin hairline (0.25pt), small ornamental flourish, or just 30-40pt whitespace                               |
| **No color**           | Black on white/cream. Gold accents only for ultra-premium                                                   |
| **Line spacing**       | 1.4-1.6x body, 2.0-2.5x between course blocks                                                               |

**Font pairings:** Playfair Display + Lato, Cormorant Garamond + Montserrat Light, Didot + Gill Sans, Baskerville + Futura Light. (jsPDF: Times + Helvetica is the available pair.)

### 3.8 POST-SERVICE RESET CHECKLIST

**Professional pattern:** Triage-ordered: most urgent first. Color-coded urgency sections.

| Element                  | Spec                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**                 | Letter portrait, single page strongly preferred                                                                                                                             |
| **Section ordering**     | 1. IMMEDIATE/SAFETY (red, 15 min) > 2. FOOD HANDLING (orange, 30 min) > 3. EQUIPMENT (blue, 1 hr) > 4. VENUE (green, before departure) > 5. ADMINISTRATIVE (gray, next day) |
| **Section headers**      | 12pt bold caps with colored left border bar (5pt wide) matching urgency color                                                                                               |
| **Time constraints**     | Bold bracketed notation at right margin: [15 MIN], [30 MIN]                                                                                                                 |
| **Checkbox size**        | 4.5mm minimum. Usable by tired staff at 11 PM with Sharpie                                                                                                                  |
| **Action verb bolding**  | Bold the verb: "**Verify** gas shutoff", "**Count** rental items", "**Pack** perishables"                                                                                   |
| **DISCARD items**        | Red text or dangerBg background for food safety items requiring disposal                                                                                                    |
| **Sign-off lines**       | Horizontal rules at bottom of each section for initials + time                                                                                                              |
| **Night-of vs Next-day** | Heavy divider line. Everything below = "NEXT DAY" admin tasks                                                                                                               |
| **Count fields**         | Blank lines next to equipment items: "Chafers: \_\_\_/6"                                                                                                                    |

### 3.9 ALLERGEN QUICK-REFERENCE

**Professional pattern:** Grid/matrix. Rows = dishes, Columns = allergens. FSA (UK Food Standards Agency) format is the gold standard.

| Element                      | Spec                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**                     | Letter LANDSCAPE to fit 14+ columns                                                                                                    |
| **Format**                   | Grid/matrix table                                                                                                                      |
| **Row headers**              | Dish names, 10-12pt bold, left-aligned. Grouped by course (bold section headers)                                                       |
| **Column headers**           | 14 major allergens, 8-9pt, rotated 45-90 degrees to fit. Or abbreviations with legend                                                  |
| **Cell marks**               | Large checkmarks or X symbols, minimum 0.6cm x 0.6cm per FSA guidance                                                                  |
| **Color coding**             | Red cell = contains allergen. Amber = may contain (cross-contamination). Green/empty = free. Must work in grayscale: add pattern fills |
| **Alternating rows**         | Light gray/white (#F5F5F5) for scan speed across wide matrix                                                                           |
| **Cross-contamination**      | Warning box at bottom in dangerBg: "Items marked amber share prep surfaces..."                                                         |
| **"Can be modified" column** | Optional: dishes where allergens can be removed on request                                                                             |

**The 14 major allergens (EU/UK, widely adopted):** Celery, Cereals (gluten), Crustaceans, Eggs, Fish, Lupin, Milk, Mollusks, Mustard, Peanuts, Sesame, Soybeans, Sulfites, Tree nuts.

### 3.10 PLATING GUIDE

**Professional pattern:** Plate diagram (clock-face positioning) + numbered step-by-step instructions per dish.

| Element              | Spec                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**             | Half-letter (5.5x8.5) or index card (4x6) per dish. Laminated for pass use                                                                                      |
| **Layout**           | One dish per page/card. Overhead plate circle diagram with numbered positions + written steps beside or below                                                   |
| **Plate diagram**    | Circle representing plate. Components labeled with arrows/leader lines. Positions described as clock face: "protein at 5 o'clock, starch at 10, vegetable at 2" |
| **Component labels** | 9-10pt caps on diagram with leader lines                                                                                                                        |
| **Numbered steps**   | 10-11pt numbered list: "1. Place puree at 10 o'clock, drag with offset spatula..."                                                                              |
| **Garnish callouts** | Italic or colored text distinct from main components                                                                                                            |
| **Sauce technique**  | Noted explicitly: "spoon drag", "3 dots", "quenelle", "paint"                                                                                                   |
| **Reference photo**  | Placeholder area if photo available (phone photo taped to pass is standard)                                                                                     |
| **Scan speed**       | Under 5 seconds. Diagram is primary; text is backup                                                                                                             |

### 3.11 VENUE/KITCHEN RECON

**Professional pattern:** Two-part: structured checklist + sketch/layout area.

| Element               | Spec                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Page**              | Letter portrait, 2-3 pages. Page 1: overview + kitchen. Page 2: power/storage. Page 3: sketch                   |
| **Sections**          | Venue Overview, Kitchen Facilities, Power/Electrical, Water, Storage/Staging, Service Area, Access/Logistics    |
| **Format**            | Checkbox items + fill-in fields per section                                                                     |
| **Kitchen inventory** | Oven count/type, burner count, fridge capacity (cu ft), counter space (linear ft), sink count, hood/ventilation |
| **Power**             | Outlet count, amperage, dedicated circuits, generator needs                                                     |
| **Access**            | Loading dock dimensions, delivery window hours, parking, key pickup/dropoff, restrictions (no flame, etc.)      |
| **Sketch area**       | Grid/graph paper section for hand-drawn floor plan                                                              |
| **Red flags**         | Highlight deal-breakers in dangerText (no hood, insufficient power)                                             |
| **Access section**    | Must be scannable fast on event morning (codes, contacts, parking)                                              |

### 3.12 BEVERAGE & PAIRING NOTES

**Professional pattern:** Course-by-course vertical layout. Wine info follows: Name, Producer, Region, Vintage, tasting note.

| Element                  | Spec                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Page**                 | Tall narrow card (4.25x11 or 4x9) for guest-facing. Letter for service team             |
| **Layout**               | Course name + dish description on left, wine/beverage on right                          |
| **Wine format**          | Wine name (11pt bold), Producer/Region/Vintage (9pt regular), Tasting note (9pt italic) |
| **Non-alcoholic**        | Below each pairing, italic or lighter color: "Non-alcoholic: Seedlip Garden 108..."     |
| **Service notes**        | Temperature, pour size (3oz/5oz), glass type, decant time. 8pt right-aligned or sidebar |
| **Course dividers**      | Thin hairline rules or generous whitespace between courses                              |
| **Icons**                | Wine glass glyph before pairing text. Snowflake for "serve chilled"                     |
| **Service team version** | Add: pour size, total bottles needed, backup wine, glass type per course                |

### 3.13 CLIENT CONTACT & ACCESS SHEET

**Professional pattern:** Modeled on film production call sheets (StudioBinder format). Everything on ONE page.

| Element                | Spec                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**               | Letter portrait, SINGLE PAGE (non-negotiable). If it needs two, cut content                                                            |
| **Header**             | Event name (16pt bold), date, service time, guest count                                                                                |
| **Contact hierarchy**  | Client > Day-of contact > Venue contact > Chef/team. Each: name, phone, email. Bold names, regular numbers                             |
| **Phone numbers**      | 11pt minimum. Must be readable while driving/walking                                                                                   |
| **Access codes**       | BOLD 14pt. Gate codes, building codes, buzzer numbers. Impossible to miss                                                              |
| **GPS address**        | Full street address in GPS-friendly format. Map pin icon                                                                               |
| **Parking**            | Where to park catering vehicle, loading zone details                                                                                   |
| **Communication plan** | "Text [name] upon arrival" / "Call [name] if late" / "Do NOT contact client directly; go through [planner]"                            |
| **Emergency**          | Red background section at bottom: nearest hospital address, fire extinguisher location, first aid kit, severe allergy EpiPen awareness |
| **Icons**              | Phone, envelope, map pin, key, red cross next to respective fields                                                                     |
| **Findability**        | Phone numbers and codes findable in under 3 seconds                                                                                    |

### 3.14 MISE EN PLACE VERIFICATION

**Professional pattern:** Grid/table by station (or by course for private chef). Expected vs actual quantities.

| Element                | Spec                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ---------------- | ------- | ---- | --------------------- | ---------- | ----------------- |
| **Page**               | Letter portrait. One page per station (restaurant) or one total page (private chef)                  |
| **Column structure**   | Item                                                                                                 | Par (target qty) | On Hand | Need | Prepped By (initials) | Temp Check | Status (checkbox) |
| **Station headers**    | 14pt bold caps with rule below. Stations: Garde Manger, Saute/Hot Line, Grill, Pastry, General       |
| **For private chef**   | Group by course instead of station                                                                   |
| **Temperature checks** | Dedicated column with pre-printed acceptable ranges: "below 40F" for cold, "above 140F" for hot hold |
| **Critical items**     | Red asterisk for items that halt service if missing                                                  |
| **86'd notation**      | Space/column for recording items that ran out                                                        |
| **Time stamps**        | Space for recording when each item was verified                                                      |
| **Shelf life**         | Optional column: how long prepped item holds                                                         |

### 3.15 BANQUET EVENT ORDER (BEO)

**Professional pattern:** THE industry standard document. Dense, 1-2 pages, simultaneously contract + ops reference.

| Element                    | Spec                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Page**                   | Letter portrait. ONE page preferred, two acceptable. Dense is expected                                                      |
| **BEO number**             | 16pt bold, top-right corner. Primary identifier                                                                             |
| **Sections**               | Header > Event Overview > Contacts > Room Setup > Timeline > Menu > Dietary > AV/Equipment > Financial > Terms > Signatures |
| **Section headers**        | 12pt bold caps with gray/colored background bar                                                                             |
| **Field formatting**       | Labels: 9pt caps, muted. Values: 11pt bold, black. Bold data, mute labels                                                   |
| **Guaranteed guest count** | Highlighted/bold. This is the billing number                                                                                |
| **Menu**                   | Full courses with quantities. Dietary accommodations noted inline                                                           |
| **Timeline**               | Minute-by-minute or block schedule: "5:00 PM Load-in, 6:00 PM Cocktails, 7:00 PM Dinner..."                                 |
| **Financial**              | Right-aligned, itemized: food pp, bev pp, rental, service charge %, tax, deposit, balance                                   |
| **Signature lines**        | Both parties, with date. 10pt with underline                                                                                |
| **Revision tracking**      | "REVISED" watermark if updated. Version number in header                                                                    |

### 3.16 TRAVEL ROUTE / MULTI-STOP SHEET

**Professional pattern:** Sequential stop-by-stop list, numbered. Summary header with totals.

| Element                     | Spec                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ | ------------------------- | -------------- | --------------------------------------------------- | ----------------------- | ------------------- |
| **Page**                    | Letter portrait. Single page for up to 6-8 stops                                     |
| **Summary header**          | Total stops, total distance, total drive time, departure time. Highlighted box       |
| **Stop format**             | Stop # (bold 14pt, like map pins)                                                    | Location name (bold 11pt) | Address (10pt) | Purpose (10pt: "Pick up 4 lb halibut, pre-ordered") | Arrival ETA (bold 11pt) | Drive to next (9pt) |
| **Notes per stop**          | 9pt: "Ask for Mike", "Parking in rear", "Market closes at noon"                      |
| **Pre-order confirmations** | Confirmation numbers, vendor contact phones                                          |
| **Icons**                   | Numbered circles for stops, clock for ETAs, cart for sourcing, truck for destination |
| **Color coding**            | Blue for sourcing stops, green for venue/destination, gray for home base             |
| **Glanceability**           | "Where next? What time? What am I picking up?" answered in 2-3 seconds               |

### 3.17 CONTENT ASSET CAPTURE (Photo Shot List)

**Professional pattern:** Table organized by event phase. Categories: Hero, Process, Detail, Ambiance, People, BTS, Ingredients.

| Element              | Spec                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- | ----- | ---------- | -------- | -------- |
| **Page**             | Letter portrait, 1-2 pages (15-30 planned shots)                                                                                                               |
| **Column structure** | Shot #                                                                                                                                                         | Category | Subject description | Angle | Timing cue | Priority | Checkbox |
| **Priority markers** | Red star = must-capture, yellow = nice-to-have, no marker = bonus                                                                                              |
| **Grouping**         | By event phase: Pre-Event, During Prep, During Cooking, Plating, Service, Post-Event                                                                           |
| **Shot categories**  | Hero (completed dish), Process (action shots), Detail (close-ups), Ambiance (setting), People (with permission), BTS (kitchen chaos), Ingredients (raw beauty) |
| **Timing cues**      | Italic: "During plating, before sauce", "After guests seated"                                                                                                  |
| **Angle notes**      | Overhead, 45-degree, straight-on                                                                                                                               |
| **Social specs**     | Note target: IG feed 1080x1350 (4:5), Stories 1080x1920 (9:16)                                                                                                 |

---

## 4. CROSS-CUTTING FORMATTING RULES

### Print Optimization

- **Font:** Helvetica (built into every PDF renderer, no embedding needed). Serif (Times) only for FOH Menu
- **Minimum font size:** 9pt absolute floor, 10pt preferred for kitchen use
- **Ink economy:** White backgrounds, minimal shading. Warning boxes use light fills. No solid color headers
- **Contrast:** Black on white mandatory for all operational docs. Color is functional, never decorative
- **Durability:** Recommend lamination or sheet protectors for: Plating Guide, Allergen Matrix, Allergy Card, Execution Sheet

### Checkbox Design

- Squares, not circles (faster to check with a pen)
- 4.5mm minimum size. 6mm for wet-hands contexts
- 6mm row height minimum to prevent marking wrong line
- The empty box IS the interface. Chef's pen marks ARE the state changes
- Pre-checked items (already complete before printing) show checkmark inside

### Dietary and Allergen Indicators

Text-based abbreviations (more reliable than icons in jsPDF):

| Tag      | Meaning     | Format             |
| -------- | ----------- | ------------------ |
| **(V)**  | Vegetarian  | Bold parenthesized |
| **(VG)** | Vegan       | Bold parenthesized |
| **(GF)** | Gluten-Free | Bold parenthesized |
| **(DF)** | Dairy-Free  | Bold parenthesized |
| **(NF)** | Nut-Free    | Bold parenthesized |
| **(K)**  | Kosher      | Bold parenthesized |
| **(H)**  | Halal       | Bold parenthesized |

For allergen WARNINGS (not dietary tags): bold + "ALLERGY:" prefix in dangerText.

### Reliable Unicode Symbols

| Symbol           | Unicode | Use               |
| ---------------- | ------- | ----------------- |
| Bullet           | \u2022  | List items        |
| Middle dot       | \u00B7  | Separators        |
| Checkmark        | \u2713  | Pre-checked items |
| Degree           | \u00B0  | Temperature       |
| Multiplication   | \u00D7  | Quantities        |
| Arrow right      | \u2192  | Flow/sequence     |
| Warning triangle | \u26A0  | Alerts            |

**Avoid:** Color emoji (render as empty boxes without font embedding), food emoji, decorative dingbats.

### Warning/Alert Hierarchy

| Level   | Visual                                                      | Use                                                   |
| ------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| DANGER  | Red border (0.6pt), red fill #FFF0F0, bold red text, \u26A0 | Allergen, temp-critical, cross-contamination          |
| WARNING | Amber border (0.4pt), no fill, bold text                    | Timing dependency, special plating                    |
| NOTE    | Gray border (0.3pt), gray italic                            | Client preference, "they liked extra sauce last time" |

### Document Branding

| Document Class                                                  | Branding Level                                           |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| Internal ops (prep, execution, checklist, packing, mise, reset) | Minimal. Chef name in footer only                        |
| Client-facing (FOH menu, summary, invoice, quote, contract)     | Professional. Logo if configured, brand colors in header |
| Hybrid (BEO, grocery)                                           | Default to internal styling                              |

### Professional Standards Referenced

- **Culinary schools:** CIA, The Culinary Pro, Illinois State Board of Education
- **Industry software:** Toast POS, Tripleseat, Oracle OPERA, Event Temple, Amadeus Hospitality
- **Government standards:** UK FSA allergen matrix, FDA Big 9, ANSI Z535 warning hierarchy
- **Film industry:** StudioBinder call sheet format (adapted for client contact sheet)
- **Catering operations:** WebstaurantStore, Chefs Resources, Total Party Planner, Miratag
- **Typography:** SGC Foodservice font guidelines, TerraSlate menu design standards

---

## 5. IMPLEMENTATION PRIORITIES

### Highest Impact (do first)

1. **Extract design tokens** into shared constants file (`pdf-design-tokens.ts`)
2. **Bump body text** from 9pt to 10pt across all generators
3. **Increase left margin** from 12mm to 14mm
4. **Set checkbox minimum** to 4.5mm
5. **Add document type color band** (2mm strip at top of every page)
6. **Add doc type label** in top-right corner of every page
7. **Increase line height multiplier** from 0.38 to 0.40

### Medium Impact (do second)

8. Add continuation headers for multi-page documents
9. Implement dual checkbox (OUT/BACK) for packing list
10. Add urgency-colored section borders to reset checklist
11. Implement bold-data/mute-labels pattern on event summary
12. Add allergen grid/matrix format to allergen reference

### Lower Impact (polish)

13. Configurable left margin (14mm default / 20mm binder mode)
14. Kit system for packing list (collapsed line items for standard kits)
15. Film-style call sheet layout for client contact
16. Clock-face plating diagram system
17. Progress indicators on checklists ("** / ** items checked")

---

## 6. CURRENT STATE vs TARGET STATE

| Aspect                   | Current          | Target                          |
| ------------------------ | ---------------- | ------------------------------- |
| Design tokens            | None. All inline | Shared `pdf-design-tokens.ts`   |
| Body font size           | 9pt              | 10pt minimum                    |
| Left margin              | 12mm             | 14mm (clipboard-safe)           |
| Checkbox size            | fontSize \* 0.38 | 4.5mm minimum floor             |
| Line height              | \* 0.38          | \* 0.40                         |
| Doc identification       | None             | 2mm color band + type label     |
| Continuation headers     | None             | "[DOC TYPE] (cont.)" on page 2+ |
| Packing list checkboxes  | Single           | Dual (OUT + BACK)               |
| Reset checklist sections | Flat             | Urgency-colored borders         |
| Event summary layout     | Standard         | Bold data, mute labels          |
| Allergen format          | List             | Grid/matrix                     |
| FOH menu typography      | Times serif      | Times serif (correct, keep)     |
| Multi-page handling      | Manual newPage() | Auto-section-aware page breaks  |
