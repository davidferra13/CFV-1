# ChefFlow Embeddable Inquiry Widget

> Add a ChefFlow booking form to any website — Wix, Squarespace, WordPress, custom HTML, anything.

## Overview

The embed widget lets ChefFlow users add a professional inquiry form to their existing website. When a visitor fills out the form, it creates a full inquiry + client + draft event inside ChefFlow automatically. The chef never leaves their ChefFlow dashboard.

## Architecture

```
External Website (Wix, Squarespace, etc.)
    │
    ├── <script> tag loads chefflow-widget.js
    │       │
    │       └── Creates an <iframe> pointing to ChefFlow
    │               │
    │               └── /embed/inquiry/[chefId] — renders the form
    │                       │
    │                       └── Submits to /api/embed/inquiry (CORS-enabled)
    │                               │
    │                               ├── Creates client record (idempotent by email)
    │                               ├── Creates inquiry (channel: website, status: new)
    │                               ├── Creates draft event
    │                               ├── Sends confirmation email (non-blocking)
    │                               └── Triggers AI lead scoring (non-blocking)
    │
    └── Chef sees new inquiry in ChefFlow dashboard
```

## Files

| File                                       | Purpose                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `public/embed/chefflow-widget.js`          | The JavaScript file chefs paste on their sites. Creates iframe, handles popup mode. |
| `app/embed/layout.tsx`                     | Minimal layout for embed pages (no header/footer/nav).                              |
| `app/embed/inquiry/[chefId]/page.tsx`      | Server component that resolves chef and renders the form.                           |
| `components/embed/embed-inquiry-form.tsx`  | Client component — the actual booking form with inline styles.                      |
| `app/api/embed/inquiry/route.ts`           | CORS-enabled API route that processes submissions.                                  |
| `app/(chef)/settings/embed/page.tsx`       | Settings page where chefs copy their embed code.                                    |
| `components/settings/embed-code-panel.tsx` | UI for customizing and copying embed code, with platform guides.                    |

## Embed Script Options

```html
<script
  src="https://app.cheflowhq.com/embed/chefflow-widget.js"
  data-chef-id="YOUR_CHEF_ID"     <!-- Required: chef's UUID -->
  data-accent="#e88f47"            <!-- Optional: accent color, default terracotta -->
  data-theme="light"              <!-- Optional: "light" or "dark" -->
  data-mode="inline"              <!-- Optional: "inline" or "popup" -->
  data-button-text="Book Now"     <!-- Optional: popup button text -->
></script>
```

### Inline Mode (default)

Embeds the form directly in the page where the script tag is placed. Best for dedicated "Book Now" pages.

### Popup Mode

Adds a floating button in the bottom-right corner. Clicking it opens a modal with the form. Best for site-wide coverage.

## Alternative: Direct iframe

For platforms that block external JavaScript (e.g. Shopify page content):

```html
<iframe
  src="https://app.cheflowhq.com/embed/inquiry/YOUR_CHEF_ID?accent=%23e88f47&theme=light"
  style="width:100%;min-height:900px;border:none;border-radius:16px;"
  title="Book a Private Chef"
  loading="lazy"
></iframe>
```

## API Endpoint

### `POST /api/embed/inquiry`

CORS-enabled. No authentication required. Rate-limited by IP (10 per 5 min).

**Request body:**

```json
{
  "chef_id": "uuid", // Required
  "full_name": "string", // Required
  "email": "string", // Required
  "event_date": "YYYY-MM-DD", // Required
  "serve_time": "string", // Required
  "guest_count": 4, // Required (integer)
  "occasion": "string", // Required
  "phone": "string", // Optional
  "address": "string", // Optional
  "budget_range": "enum", // Optional: under_500, 500_1500, 1500_3000, 3000_5000, over_5000
  "allergy_flag": "enum", // Optional: none, yes, unknown
  "allergies_food_restrictions": "string", // Optional
  "favorite_ingredients_dislikes": "string", // Optional
  "additional_notes": "string", // Optional
  "website_url": "" // Honeypot (must be empty)
}
```

**Response:**

```json
{ "success": true, "message": "Inquiry submitted successfully." }
```

**Errors:** 400 (validation), 404 (chef not found), 429 (rate limited), 500 (server error)

## Security

1. **Rate limiting** — 10 submissions per IP per 5 minutes (in-memory, no Redis dependency).
2. **Honeypot field** — Hidden `website_url` field. Bots fill it, real users don't. Bot submissions get silently accepted but nothing is created.
3. **Input validation** — Zod schema validates all fields. Max lengths enforced. UUID format required for chef_id.
4. **CORS** — `Access-Control-Allow-Origin: *` on the API route (necessary for cross-origin embeds).
5. **Tenant isolation** — chef_id is validated against the database. Inquiries are scoped to the correct tenant.
6. **No auth bypass** — The API uses the admin client (service role key) server-side only. No credentials exposed to the client.

## What Gets Created

When someone submits the embed form:

1. **Client** — Created or matched by email (idempotent). `referral_source: 'website'`.
2. **Inquiry** — `channel: 'website'`, `status: 'new'`. All form data saved to confirmed fields + `unknown_fields` JSONB. `embed_source: true` flag in unknown_fields.
3. **Draft Event** — Linked to inquiry. Populated with date, time, guest count, location, occasion.
4. **State Transition** — `null → draft` logged on the event.
5. **Confirmation Email** — Sent to client (non-blocking).
6. **AI Lead Score** — Remy enqueues background scoring (non-blocking).

## Middleware

- `/embed` added to `skipAuthPaths` in `middleware.ts` — no auth check on embed pages.
- `/api/embed` added to the API bypass list — no auth check on the API endpoint.

## PostMessage Events

The widget communicates with the parent page via `postMessage`:

| Event                        | Direction       | Data                                     |
| ---------------------------- | --------------- | ---------------------------------------- |
| `chefflow-widget-resize`     | iframe → parent | `{ type, height }` — auto-resize iframe  |
| `chefflow-inquiry-submitted` | iframe → parent | `{ type }` — form submitted successfully |
| `chefflow-widget-loaded`     | script → page   | `{ type }` — iframe finished loading     |

## Platform Compatibility

| Platform    | Script Method | iframe Method | Notes                              |
| ----------- | :-----------: | :-----------: | ---------------------------------- |
| Wix         |      Yes      |      Yes      | Use "Embed HTML" block             |
| Squarespace |      Yes      |      Yes      | Use "Code" block or Code Injection |
| WordPress   |      Yes      |      Yes      | Use "Custom HTML" block            |
| Shopify     |   Pages: No   |  Pages: Yes   | Scripts work in theme.liquid       |
| GoDaddy     |     Maybe     |      Yes      | Depends on plan level              |
| Custom HTML |      Yes      |      Yes      | Full support                       |

## Settings Page

Accessible at `/settings/embed`. Linked from the main Settings page under "Connected Accounts & Integrations."

Features:

- Live preview of the widget with current settings
- Mode selector (inline vs popup)
- Theme selector (light vs dark)
- Accent color picker (presets + custom hex)
- Popup button text customization
- One-click copy for both script and iframe code
- Platform-specific step-by-step guides (Wix, Squarespace, WordPress, Shopify, GoDaddy, Custom HTML)
- Troubleshooting section
- Explanation of what happens when someone submits

## Future Enhancements

- Menu display widget (show current menus from ChefFlow)
- Availability calendar widget
- Reviews widget
- Custom field configuration per chef
- Analytics dashboard (embed impressions, conversion rates)
- Webhook notifications on submission
