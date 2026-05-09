# Front-of-House Menu Expansion: Agent Handoff

## What Exists (Already Built This Session)

Three-layer FOH menu system, fully working:

### Files Created

- `lib/menus/foh-menu-data.ts` - Types (`FOHMenuData`, `FOHCourse`) + `mapToFOHMenuData()` pure mapper
- `lib/menus/foh-menu-actions.ts` - `getFOHMenuData(menuId)` server action (auth-gated, fetches menu + event + chef profile)
- `components/menus/front-of-house-menu.tsx` - `<FrontOfHouseMenu data={data} />` canonical React component. Serif typography, centered layout, print-first inline styles, dietary badges, beverage pairings, allergy footer

### Files Modified

- `app/print/menu/[id]/page.tsx` - Rewired to use `getFOHMenuData` + `<FrontOfHouseMenu>`
- `app/(chef)/menus/[id]/menu-detail-client.tsx` - "Front-of-House Menu" button opens `/print/menu/[id]`
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` - FOH preview card when menu attached

### Data Flow

```
getMenuById() + getMenuEvent() + getChefLayoutData()
  -> mapToFOHMenuData()  [pure function, no DB]
    -> FOHMenuData        [normalized type]
      -> <FrontOfHouseMenu data={...} />  [pure rendering]
```

### FOHMenuData Type (the contract)

```typescript
type FOHCourse = {
  label: string // "First Course", "Dessert"
  number: number // 1-based position
  dishName: string | null // dish name if different from course label
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
  beveragePairing: string | null
}

type FOHMenuData = {
  title: string
  subtitle: string | null
  chefName: string | null
  tagline: string | null
  date: string | null
  courses: FOHCourse[]
  footerNote: string | null
  serviceStyle: string | null
  guestCount: number | null
  clientName: string | null
}
```

---

## Existing Infrastructure (Already in Codebase)

### Dinner Circles

- `hub_groups` table stores circles. Each event can have a circle.
- `lib/hub/circle-first-notify.ts` - `circleFirstNotify()` is THE broadcast function. Posts rich message to `hub_messages`, then emails + push notifies each member. Respects throttle, mute, quiet hours.
- `lib/hub/circle-lifecycle-hooks.ts` - Legacy hooks including `postMenuSharedToCircle()`. Posts to `hub_messages`.
- `lib/hub/circle-lookup.ts` - `getCircleForEvent()`, `getCircleForContext()` to find a circle for any event.
- Circle messages render in the Hub feed. Members access via `/hub/join/[groupToken]`.

### Menu Lifecycle

- `lib/menus/menu-lifecycle.ts` - FSM: `draft -> shared -> locked -> archived`
- `transitionMenuWithContext()` fires `runMenuTransitionSideEffects()` which:
  1. Revalidates paths
  2. Logs activity
  3. **Calls `circleFirstNotify()` with type `menu_shared`** on shared/locked transitions
  4. Indexes dishes on lock
- Transition to `shared` or `locked` already fires a circle notification. Currently just text ("Menu shared..." or "Menu finalized...").

### Client/Public Sharing

- `app/(public)/share/[token]/page.tsx` - Event share page (token-gated). Shows event details, menu names, RSVP.
- `app/(public)/e/[shareToken]/page.tsx` - Public ticketed event page with JSON-LD.
- `lib/menus/menu-share-actions.ts` - `createMenuSelectionToken()` for guest menu preference voting via `/menu-pick/[token]`.

### Email + Notifications

- `lib/email/send.ts` - `sendEmail()` via Resend with circuit breaker.
- `lib/notifications/channel-router.ts` - `routeNotification()` delivers email + push + SMS in parallel.
- `lib/email/templates/circle-update-notification.tsx` - React Email template for circle updates.

### Existing Document Generation

- `lib/documents/generate-front-of-house-menu.ts` - PDF generation via jsPDF (server-side). Has `renderFrontOfHouseMenu()` that uses `PDFLayout`. Returns Buffer.
- `lib/documents/pdf-layout.ts` - `PDFLayout` class wrapping jsPDF. US Letter, auto-compact, Helvetica.
- `lib/documents/document-definitions.ts` - 16 document types including `foh`. Core packet = first 8.
- `components/print/printable-document.tsx` - Print wrapper supporting standard, thermal-80, thermal-58 modes.

### Chef Profile Data

- `lib/chef/layout-cache.ts` - `getChefLayoutData(chefId)` returns `business_name`, `tagline`, `logo_url`, `profile_image_url`, `portal_primary_color`, etc.

---

## What to Build: Full Expansion Plan

### Stream 1: Auto-Post FOH Menu to Dinner Circles on Confirm

**Goal:** When a menu transitions to `shared` or `locked`, automatically post a rich FOH menu card into the dinner circle feed.

**Files to modify:**

- `lib/hub/circle-lifecycle-hooks.ts` - Upgrade `postMenuSharedToCircle` to include structured menu data
- `lib/menus/menu-lifecycle.ts` - Ensure the side effect passes menu content (not just notification text)

**What the circle post should contain:**

- Occasion/title as the post headline
- Course list with dish names and descriptions rendered inline
- Link to the full FOH preview page (public variant needed)
- "Menu finalized for [date]" context line

**Key function:** `circleFirstNotify()` already accepts a `body` string and `metadata` object. Extend to include structured menu data so the Hub feed renderer can display it richly.

**New component needed:** `components/hub/circle-menu-card.tsx` - Renders FOHMenuData as a compact card inside the Hub message feed. Reuse the same type, just different visual density.

---

### Stream 2: Public FOH Menu Page (No Auth Required)

**Goal:** A public URL that renders the FOH menu so circle members, clients, and shared links all land on a beautiful page without needing to log in.

**Files to create:**

- `app/(public)/menu/[token]/page.tsx` - Public FOH menu view
- `lib/menus/foh-public-actions.ts` - `getFOHMenuDataByToken(token)` fetches menu data via share token (no auth)

**How it works:**

- Reuse existing `menu_selection_tokens` table or create a simpler `menu_share_tokens` approach
- `createMenuShareLink(menuId)` generates a token, stores in DB, returns URL
- Public page calls `getFOHMenuDataByToken()`, renders `<FrontOfHouseMenu showControls={false} />`
- Token can have optional expiry

**Integration points:**

- Circle posts link to this public URL
- Client portal links to this URL
- Email notifications include this URL
- Event share page can embed or link to this

---

### Stream 3: Email the FOH Menu

**Goal:** When menu is shared/locked, email the client a beautiful HTML version of the menu (not a PDF attachment, not a link-only email).

**Files to create:**

- `lib/email/templates/foh-menu-email.tsx` - React Email template that renders the FOH menu inline in the email body. Simplified version (email HTML constraints: no flexbox, tables-based layout, inline styles only).

**Files to modify:**

- `lib/menus/menu-lifecycle.ts` - Add email side effect on shared/locked transition
- `lib/email/route-email.ts` - Add `menu_shared_to_client` action routing

**Design constraints:**

- Email clients don't support modern CSS. Template must be table-based with inline styles.
- Include a "View Full Menu" button linking to public FOH page
- Include "Download PDF" link to the existing PDF generator
- Subject line: "[Occasion] Menu from [Chef Name]"

---

### Stream 4: FOH Menu Image Generation (PNG Snapshot)

**Goal:** Generate a PNG image of the FOH menu for sharing on social media, in messages, as circle attachments.

**Files to create:**

- `lib/documents/generate-foh-image.ts` - Server-side image generation
- `app/api/menu-image/[menuId]/route.ts` - API endpoint returning PNG

**Approach options (pick one):**

1. **Satori + Resvg** (recommended): Use Vercel's `satori` to convert React JSX to SVG, then `@resvg/resvg-js` to render to PNG. No browser needed. Fast. Already common in Next.js.
2. **Puppeteer/Playwright screenshot**: Heavy, but pixel-perfect. Spin up headless browser, navigate to FOH page, screenshot.
3. **Canvas-based**: Use `canvas` package (node-canvas) to draw the menu programmatically.

**Recommendation:** Satori approach. Create a simplified `<FOHMenuSatori>` component (subset of JSX that satori supports) that renders from `FOHMenuData`. Output 1200x1600px PNG.

**Usage:**

- Circle posts can include image attachment
- Social sharing meta tags (`og:image`)
- Chef can download for Instagram/social
- Email can include as inline image

---

### Stream 5: OG Meta Tags for Public Menu Page

**Goal:** When someone shares the public menu link on social media, iMessage, etc., it shows a rich preview card.

**Files to modify:**

- `app/(public)/menu/[token]/page.tsx` - Add `generateMetadata()` export

**Metadata:**

```typescript
export async function generateMetadata({ params }) {
  const data = await getFOHMenuDataByToken(params.token)
  return {
    title: data.title,
    description: `${data.courses.length} courses by ${data.chefName}`,
    openGraph: {
      title: data.title,
      description: courseSummary,
      images: [`/api/menu-image/${menuId}`], // from Stream 4
      type: 'article',
    },
  }
}
```

---

### Stream 6: Client Portal Integration

**Goal:** When a client logs into their portal, they see the FOH menu for their upcoming event prominently displayed.

**Files to explore first:**

- `app/(client)/` - Find the client dashboard/portal pages
- Look for where event details are shown to clients

**What to add:**

- Render `<FrontOfHouseMenu>` (or a compact version) in the client's event view
- Add print/download buttons for the client
- Use `fetchFrontOfHouseMenuDataForClient()` (already exists in `lib/documents/generate-front-of-house-menu.ts`) as the auth pattern

---

### Stream 7: Menu Customization Controls (Minimal)

**Goal:** Let the chef tweak the FOH output without touching code.

**Files to create:**

- `lib/menus/foh-menu-options.ts` - Type + defaults
- Add UI controls to the print preview page

**Options (keep minimal):**

```typescript
type FOHMenuOptions = {
  showDate: boolean // default true
  showCourseNumbers: boolean // default false (labels only)
  showBeveragePairings: boolean // default true
  showDietaryBadges: boolean // default true
  footerNote: string | null // custom footer text
  showChefAttribution: boolean // default true
  showAllergyDisclaimer: boolean // default true
}
```

**UI:** Simple toggle panel above the menu preview on `/print/menu/[id]`. Toggles update the render in real-time. No persistence needed initially (URL params or local state).

---

### Stream 8: Automatic Document Packet Integration

**Goal:** Include the FOH menu in the auto-generated event document packet.

**Files to check:**

- `lib/documents/document-definitions.ts` - `foh` type already exists in definitions
- `components/documents/bulk-generate-runner.tsx` - Bulk generation UI
- `lib/documents/auto-generate.ts` - Auto-generation logic

**What to verify/fix:**

- Ensure `foh` document type correctly generates using the updated FOH template
- The existing `generateFrontOfHouseMenu()` in `lib/documents/generate-front-of-house-menu.ts` should be refactored to use `mapToFOHMenuData()` for consistency (single source of truth for data mapping)

---

## Agent Dispatch Plan

### Phase 1: Foundation (Parallel)

**Agent A: Public Menu Page + Token System**

- Create `lib/menus/foh-public-actions.ts`
- Create `app/(public)/menu/[token]/page.tsx`
- Add `createMenuShareLink()` to `lib/menus/foh-menu-actions.ts`
- Wire to `<FrontOfHouseMenu showControls={false} />`

**Agent B: Circle Auto-Post Upgrade**

- Modify `lib/hub/circle-lifecycle-hooks.ts` to post structured menu data
- Create `components/hub/circle-menu-card.tsx` for rich circle feed rendering
- Ensure `runMenuTransitionSideEffects` passes full menu content on shared/locked
- Use the public menu URL from Agent A (coordinate via known URL pattern `/menu/[token]`)

**Agent C: FOH Email Template**

- Create `lib/email/templates/foh-menu-email.tsx` using React Email
- Table-based layout, inline styles, email-safe HTML
- Include "View Full Menu" CTA button
- Wire into `lib/email/route-email.ts` for `menu_shared_to_client` action

### Phase 2: Enhancement (Parallel, after Phase 1)

**Agent D: Image Generation (Satori)**

- Create `lib/documents/generate-foh-image.ts`
- Create `app/api/menu-image/[menuId]/route.ts`
- Satori JSX component rendering FOHMenuData to 1200x1600 PNG

**Agent E: OG Meta + Social Sharing**

- Add `generateMetadata()` to public menu page
- Wire og:image to the image generation API
- Add "Share Menu" button with copy-link, native share API

**Agent F: Customization Controls**

- Create `FOHMenuOptions` type
- Add toggle panel to print preview page
- Real-time preview updates via state

### Phase 3: Integration (Serial)

**Agent G: Document Packet + Client Portal**

- Refactor `generate-front-of-house-menu.ts` PDF to use `mapToFOHMenuData()`
- Verify `foh` doc type in auto-generate pipeline
- Add FOH menu to client portal event view

---

## Critical Rules

1. **Do not modify `foh-menu-data.ts` types** without understanding downstream consumers. `FOHMenuData` is the contract.
2. **Circle posts go through `circleFirstNotify()`** - never post directly to `hub_messages`.
3. **Public pages must not leak tenant data.** Token-gated only. No auth bypass.
4. **No em dashes anywhere.** Use commas, semicolons, periods, colons, parentheses.
5. **Email templates must be table-based.** No flexbox, no grid, no modern CSS.
6. **Image generation must not require a browser.** Satori/canvas only, no Puppeteer.
7. **All server actions need auth gates.** Public endpoints use token validation, not `requireChef()`.
8. **`mapToFOHMenuData()` is the single source of truth** for transforming menu DB data to presentation data. Never create a parallel mapper.

## Database Schema Context

The `dishes` table has these FOH-relevant columns:

- `course_name` (text, required) - "First Course", "Dessert"
- `course_number` (int, required) - ordering
- `name` (text, nullable) - specific dish name
- `description` (text) - ingredient list or short description
- `dietary_tags` (text[]) - ["vegan", "gluten-free"]
- `allergen_flags` (text[]) - ["tree nuts", "shellfish"]
- `beverage_pairing` (text) - wine/cocktail pairing text
- `beverage_pairing_notes` (text) - tasting notes

The `menus` table: `name`, `description`, `service_style`, `cuisine_type`, `target_guest_count`, `notes`, `status`, `simple_mode`, `simple_mode_content`

The `events` table: `occasion`, `event_date`, `guest_count`, `service_style`, `client_id` (FK to clients with `full_name`)

The `chefs` table (via `getChefLayoutData`): `business_name`, `tagline`, `logo_url`

## Testing Approach

After each agent completes:

1. `npx tsc --noEmit --skipLibCheck` must pass
2. Navigate to `/print/menu/[id]` with a real menu ID - verify rendering
3. For public page: access without auth via token
4. For circle: trigger menu transition, check hub_messages for rich content
5. For email: check Resend dashboard or local email preview
6. For image: hit API endpoint, verify PNG output

## File Tree Summary

```
lib/menus/
  foh-menu-data.ts          [EXISTS] Types + mapper
  foh-menu-actions.ts       [EXISTS] Server action (auth-gated)
  foh-public-actions.ts     [CREATE] Public token-based data fetch
  foh-menu-options.ts       [CREATE] Customization options type

components/menus/
  front-of-house-menu.tsx   [EXISTS] Canonical render component
  foh-customization-panel.tsx [CREATE] Toggle controls

components/hub/
  circle-menu-card.tsx      [CREATE] Compact menu card for circle feed

lib/hub/
  circle-lifecycle-hooks.ts [MODIFY] Rich menu post
  circle-first-notify.ts    [READ ONLY] Understand, don't modify

lib/email/templates/
  foh-menu-email.tsx        [CREATE] Email template

lib/documents/
  generate-foh-image.ts     [CREATE] Satori PNG generation
  generate-front-of-house-menu.ts [MODIFY] Refactor to use mapToFOHMenuData

app/(public)/menu/[token]/
  page.tsx                  [CREATE] Public menu view

app/api/menu-image/[menuId]/
  route.ts                  [CREATE] PNG endpoint

app/print/menu/[id]/
  page.tsx                  [EXISTS] Already uses FrontOfHouseMenu
```
