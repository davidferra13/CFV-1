# QR Code Digital Menu + Event/Order Templates

Two features added in a single implementation pass.

## U17: QR Code Digital Menu

Generate QR codes that link to your public menu (or any URL). Print-ready, customizable size, scan tracking.

### How it works

1. Chef goes to Commerce > QR Menu (`/commerce/qr-menu`)
2. Clicks "Generate QR Code," enters a label (e.g. "Table 5," "Front Counter") and optional target URL
3. System generates a short code and builds a QR image via the free `api.qrserver.com` API
4. The QR code points to `/qr/{shortCode}`, which records the scan and redirects to the target URL
5. Scan analytics show total scans, daily breakdown, and peak day

### Architecture

- **Migration:** `20260331000026_qr_codes_and_templates.sql` (adds `qr_codes` and `qr_scans` tables)
- **Server actions:** `lib/commerce/qr-menu-actions.ts` (generateMenuQRCode, getActiveQRCodes, updateQRCode, deleteQRCode, trackQRScan, getQRScanStats)
- **UI component:** `components/commerce/qr-code-generator.tsx` (create, list, print, download, toggle active, delete, analytics)
- **Page:** `app/(chef)/commerce/qr-menu/page.tsx`
- **Public redirect:** `app/qr/[shortCode]/route.ts` (GET handler, no auth, tracks scan, redirects)

### QR image generation

Uses the free `api.qrserver.com` API. No dependency to install. The generated URL is cached in the `qr_image_url` column. Sizes: 200px, 300px, 500px.

### Scan tracking

Each scan creates a row in `qr_scans` (with timestamp and user agent) and increments `scan_count` on the QR code. Tracking is non-blocking; if it fails, the redirect still works.

### RLS

- `qr_codes`: chef manages own codes (tenant_id = auth.uid())
- `qr_scans`: chef can read own scans; anyone can insert (public scan tracking)

---

## U20: Event/Order Templates

Save any event, order, or production plan as a reusable template. One-click duplicate.

### How it works

1. On any event/order detail page, click "Save as Template" (reusable button component)
2. Enter a name and optional description
3. System strips IDs, dates, and tenant-specific data, saves the rest as JSONB
4. Browse all templates in the Template Library (`/templates`), grouped by type
5. Click "Use" to load the template data with optional overrides (new date, new client)
6. Template tracks use count and last used date

### Template types

- `event` - recurring dinners, corporate lunches
- `bakery_order` - standard bread batches, pastry orders
- `wholesale_order` - recurring wholesale deliveries
- `meal_plan` - weekly meal prep templates
- `production_batch` - production schedules

### Architecture

- **Migration:** same file as QR codes (`20260331000026_qr_codes_and_templates.sql`, adds `entity_templates` table)
- **Server actions:** `lib/templates/template-actions.ts` (saveAsTemplate, getTemplates, getTemplate, updateTemplate, deleteTemplate, createFromTemplate, getPopularTemplates)
- **Library UI:** `components/templates/template-library.tsx` (search, filter by type, edit, delete, use)
- **Save button:** `components/templates/save-as-template-button.tsx` (reusable, embed on any detail page)
- **Page:** `app/(chef)/templates/page.tsx`

### Data sanitization

When saving a template, these fields are automatically stripped:

- `id`, `tenant_id`, `chef_id`, `auth_user_id`
- `client_id`, `event_id`, `quote_id`
- `created_at`, `updated_at`
- Date fields: `event_date`, `start_date`, `end_date`, `due_date`

This ensures templates are portable and don't carry stale references.

### RLS

- `entity_templates`: chef manages own templates (tenant_id = auth.uid())

---

## Design decisions

- **Formula > AI:** Both features are 100% deterministic. No Ollama, no LLM calls.
- **QR image API:** External free API avoids needing a QR library dependency. The URL is stored so it can be cached/served directly.
- **Scan count denormalization:** `scan_count` on `qr_codes` is denormalized for fast display. The `qr_scans` table is the source of truth for detailed analytics.
- **Template JSONB:** Using JSONB for template data keeps the schema flexible across different entity types without needing separate columns for each.
