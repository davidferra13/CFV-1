# Dish Photo System

## What It Does

Every dish the chef makes can now have a photo. Photos live in two places:

| Where            | What it captures                                            | Storage field       |
| ---------------- | ----------------------------------------------------------- | ------------------- |
| **Recipe**       | Canonical photo — "this is how I make this dish"            | `recipes.photo_url` |
| **Dish on menu** | Plating photo — "this is how it looked at the Smith dinner" | `dishes.photo_url`  |

Both levels are independent. A recipe can have a canonical reference photo while each specific event shows a different plate. Or the chef can just tag the recipe and leave the dish-level blank.

---

## How the Chef Uses It

### On the Recipe Detail Page

An "Add a photo of this dish" prompt appears between the header and the ingredients card. If a photo already exists, it displays as a 16:9 hero image with hover controls to **Replace** or **Remove**.

### In the Menu Doc Editor

Each dish row now has a **64×64 photo thumbnail** on the right side. A camera icon with a dashed border appears when empty — a quiet nudge, not a blocker. Clicking uploads a photo. Hovering over an existing thumbnail shows a camera overlay to replace it.

---

## Files Changed / Created

### New

| File                                                 | Purpose                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260305000009_dish_photos.sql` | Adds `dishes.photo_url` column + creates `dish-photos` public storage bucket with RLS          |
| `lib/dishes/photo-actions.ts`                        | Server actions: `uploadRecipePhoto`, `removeRecipePhoto`, `uploadDishPhoto`, `removeDishPhoto` |
| `components/dishes/dish-photo-upload.tsx`            | Client component: full-width hero (recipes) and compact 64×64 thumbnail (menu editor)          |

### Modified

| File                                               | Change                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Imports `DishPhotoUpload`, renders it below the recipe header                                   |
| `lib/menus/editor-actions.ts`                      | Added `photo_url` to `EditorDish` type; updated `getEditorContext` to fetch and map `photo_url` |
| `components/menus/menu-doc-editor.tsx`             | `CourseBlock` gets `photoUrl` state + renders `<DishPhotoUpload compact />` beside each dish    |

---

## Storage Bucket: `dish-photos`

| Property      | Value                                              |
| ------------- | -------------------------------------------------- |
| Visibility    | **Public** — permanent URLs, no signed URLs needed |
| Max file size | 10 MB                                              |
| Allowed types | JPEG, PNG, HEIC, HEIF, WebP                        |
| Path — recipe | `{tenantId}/recipes/{recipeId}.{ext}`              |
| Path — dish   | `{tenantId}/dishes/{dishId}.{ext}`                 |

**Why public?** Recipe and dish photos are portfolio/showcase content. The chef may share them with clients, use them for social posts, or display them on their public profile. Signed URLs would expire and break those links. A public bucket with tenant-namespaced paths is the right trade-off.

RLS policies ensure only the chef can upload/replace/delete photos in their own tenant prefix. Reads are open to everyone.

---

## Upload Pattern

The `uploadDishPhoto` and `uploadRecipePhoto` actions share the same approach:

1. Validate file type (from MIME, never filename) and size
2. Derive a deterministic storage path: `{tenantId}/{type}/{entityId}.{ext}`
3. If the existing `photo_url` points to a _different_ path (the extension changed), delete the old file first
4. Upload with `upsert: true` (handles same-path replacement)
5. Store the permanent public URL in the DB
6. `revalidatePath` to bust SSR caches

---

## Types Note

`dishes.photo_url` was added by migration `20260305000009` and **is not yet in `types/database.ts`**. Until `supabase db pull` is run after migration, code accesses it via `(supabase as any)` casts. Once types are regenerated the casts can be removed.

`recipes.photo_url` already existed in `types/database.ts` from Layer 4 (it was defined but never used until now).

---

## Applying the Migration

```bash
# Back up first (live production data — always back up before schema changes)
supabase db dump --linked > backup-$(date +%Y%m%d).sql

# Apply
supabase db push --linked

# Regenerate types
supabase gen types typescript --linked > types/database.ts
```

After regeneration, remove the `(supabase as any)` casts in:

- `lib/dishes/photo-actions.ts` (4 cast sites)
- `lib/menus/editor-actions.ts` (1 cast site, 1 explicit `any[]` cast)
