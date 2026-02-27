# Dish Index Polish — 6-Fix Session

Date: 2026-02-27

## What Changed

Six issues identified during self-assessment, all resolved in this session.

### 1. first_served Date Bug (data integrity)

**Problem:** `approveAndIndexDishes()` in `upload-actions.ts` always set `last_served` when a dish already existed, but never checked if the new `event_date` was earlier than the existing `first_served`.

**Fix:** Added conditional check: if the job's `event_date` is earlier than the dish's `first_served` (or `first_served` is null), update it. Also added `first_served` to the select query.

**File:** `lib/menus/upload-actions.ts` (lines 289-299)

### 2. FormData Multipart Upload (scalability)

**Problem:** File upload used base64 encoding inside a JSON body. This doubled file size in transit and hit Next.js's ~4MB body size limit for JSON requests.

**Fix:**

- API route (`app/api/menus/upload/route.ts`) now accepts `multipart/form-data` for file uploads and `application/json` for pasted text
- Client component (`components/menus/menu-upload-zone.tsx`) now sends files via `FormData` — no base64, no JSON bloat
- Max file size: 50 MB per file

### 3. Supabase Storage Preservation (data retention)

**Problem:** The `file_storage_path` column existed in the migration but nothing ever stored files. Original menus were processed and discarded.

**Fix:** API route now uploads original files to a `menu-uploads` Supabase Storage bucket at path `{tenant_id}/{job_id}/{filename}`, then saves the path to the job record. Storage upload is non-blocking — if it fails, processing continues from the buffer.

**Requires:** Create a `menu-uploads` bucket in Supabase Storage (Settings > Storage > New Bucket). Set to private.

### 4. Sidebar Navigation (discoverability)

**Problem:** The Dish Index page existed but wasn't properly linked in the sidebar. The old nav pointed to `/menus/dishes` (the original per-menu dish list), not the new `/culinary/dish-index`.

**Fix:** Updated `components/navigation/nav-config.tsx`:

- Changed "Dish Index" link from `/menus/dishes` to `/culinary/dish-index`
- Added "Menu Upload" link to `/menus/upload` with Upload icon
- Added "Dish Insights" link to `/culinary/dish-index/insights`
- Imported `Upload` from lucide-react

### 5. Manual Rapid-Entry Mode (no-file workflow)

**Problem:** Chefs without historical files (or who prefer typing) had no way to build their Dish Index without uploading a file.

**Fix:** Created `components/menus/dish-quick-add.tsx` — a collapsible inline form on the Dish Index page:

- Course dropdown + dish name + optional description + Add button
- After adding, input clears and refocuses for rapid entry
- Shows running count of dishes added in this session
- Uses existing `createDishIndexEntry()` with dedup checking

### 6. Menu Builder Bridge (automatic indexing)

**Problem:** The Menu Builder and Dish Index were disconnected systems. Dishes created in the menu builder didn't flow into the index.

**Fix:** Created `lib/menus/dish-index-bridge.ts` with two functions:

1. **`indexDishesFromMenu()`** — Called automatically when a menu transitions to `locked` status (non-blocking side effect in `transitionMenu()`). For each dish in the menu:
   - If matching dish exists in index (canonical name + course), increments `times_served`
   - If new, creates dish index entry
   - Creates `dish_appearance` record with menu_id, event_id, event_date, client_name
   - Includes `normalizeCourseForIndex()` to map free-text course names to the fixed course list

2. **`searchDishIndexForMenu()`** — Server action that searches the dish index by name, ordered by times_served. Ready for the menu editor to integrate a "search from index" autocomplete.

**Integration point:** `lib/menus/actions.ts` `transitionMenu()` now dynamically imports the bridge when `toStatus === 'locked'`.

## Files Changed

| File                                                   | Change                                                 |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `lib/menus/upload-actions.ts`                          | Fixed first_served bug, added first_served to select   |
| `app/api/menus/upload/route.ts`                        | Rewritten: FormData support, Supabase Storage upload   |
| `components/menus/menu-upload-zone.tsx`                | Switched from base64/JSON to FormData                  |
| `components/navigation/nav-config.tsx`                 | Added Dish Index, Menu Upload, Dish Insights nav items |
| `components/menus/dish-quick-add.tsx`                  | **NEW** — manual rapid-entry component                 |
| `app/(chef)/culinary/dish-index/dish-index-client.tsx` | Integrated DishQuickAdd component                      |
| `lib/menus/dish-index-bridge.ts`                       | **NEW** — menu→dish index bridge                       |
| `lib/menus/actions.ts`                                 | Added auto-index hook in transitionMenu()              |

## Storage Bucket Setup

After deploying, create the Supabase Storage bucket:

1. Go to Supabase Dashboard > Storage
2. Create bucket: `menu-uploads`
3. Set to **Private** (files accessed via signed URLs only)
4. No size limit needed (API enforces 50 MB per file)
