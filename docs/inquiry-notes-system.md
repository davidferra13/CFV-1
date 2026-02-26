# Inquiry Notes System

## What Changed

Added a first-class, infinite note-taking system to every inquiry. Replaces the old single-text `unknown_fields.notes` blob (which was display-only and not editable in the UI) with a full relational notes table supporting categories, pins, image attachments, and linked recipes.

---

## Why

A single dinner inquiry can generate dozens of notes across its entire lifecycle — before, during, and after. A chef might capture inspiration photos, external recipe references, internal ChefFlow recipe ideas, sourcing plans (which farm, which store, foraging spots), staffing notes, day-before logistics, travel plans, and post-event reflections — all under the same inquiry. The old blob field couldn't support any of this.

---

## What's New

### Database

**`inquiry_notes` table** (`supabase/migrations/20260228000003_inquiry_notes_system.sql`):

- Infinite notes per inquiry
- 7 categories (see below)
- Pin important notes to the top
- Optional image attachment per note (stored in `inquiry-note-attachments` bucket)
- Tenant-scoped with full RLS

**`inquiry_recipe_links` junction table**:

- Link existing ChefFlow recipes to an inquiry
- Add a per-link note (e.g. "scale to 8 portions" or "use the winter mushroom variation")
- Many recipes can be linked to one inquiry; each recipe can only appear once per inquiry (unique constraint)

**`inquiry_note_category` enum**:
| Value | Label | Use Case |
|---|---|---|
| `general` | General | Catch-all notes |
| `inspiration` | Inspiration | Mood boards, visual ideas, photos |
| `menu_planning` | Menu Planning | Dish ideas, external recipe references, cuisine direction |
| `sourcing` | Sourcing | Grocery stores, farms, foraging, "I have this in stock" |
| `logistics` | Logistics | Travel routes, timing, day-before/day-of plans |
| `staffing` | Staffing | Who's involved, vendor coordination |
| `post_event` | Post-Event | How the dinner went, what worked, chef reflections |

**Storage bucket**: `inquiry-note-attachments` (15 MB limit, images only: JPEG, PNG, WebP, HEIC, HEIF)

### Server Actions

`lib/inquiries/note-actions.ts`:

- `addInquiryNote()` — creates note, logs activity
- `updateInquiryNote()` — update text, category, or attachment
- `deleteInquiryNote()` — hard delete
- `toggleInquiryNotePinned()` — flip pin state
- `getInquiryNotes()` — pinned first, then newest; filterable by category
- `linkRecipeToInquiry()` — link a ChefFlow recipe
- `unlinkRecipeFromInquiry()` — remove recipe link
- `getLinkedRecipes()` — fetch links with recipe details joined
- `getRecipesForLinker()` — slim list (`id, name, category, description, photo_url`) for the picker; required because `getRecipes()` strips photo and description from its return shape

### UI Components

**`components/inquiries/inquiry-notes.tsx`**:

- Category filter tab strip (only shows categories that have notes)
- Pin / edit / delete on hover
- Inline image thumbnail with lightbox on click
- Add Note form inline at top when open
- Sorted: pinned first, then newest

**`components/inquiries/inquiry-note-form.tsx`**:

- Textarea + category select
- Optional image upload (uploads to `inquiry-note-attachments` bucket client-side via Supabase JS, stores the public URL)
- Shows image preview before saving

**`components/inquiries/inquiry-recipe-linker.tsx`**:

- Searchable picker of the chef's recipe library
- Two-step: select recipe → optionally add a note → link
- Linked recipes shown as cards with photo, category, and note
- Unlink via hover action

### Inquiry Detail Page

`app/(chef)/inquiries/[id]/page.tsx`:

- Now fetches `inquiryNotes`, `recipeLinks`, and `allRecipes` in parallel with other data
- `InquiryNotes` and `InquiryRecipeLinker` rendered below the Communication and Actions sections
- Old `unknown_fields.notes` display card removed (data remains safely in the database)

---

## Data Safety

The old `unknown_fields.notes` value is **not deleted**. It stays in the JSONB column. We simply stopped displaying it in the UI. If any old notes existed before this feature, they remain accessible via the raw inquiry record.

---

## Patterns Used

| Pattern                              | Source                                          |
| ------------------------------------ | ----------------------------------------------- |
| Note CRUD server actions             | `lib/notes/actions.ts` (client notes)           |
| Notes component architecture         | `components/clients/quick-notes.tsx`            |
| Storage bucket setup                 | `20260223000011_chef_profile_images_bucket.sql` |
| `update_updated_at_column()` trigger | All prior migrations                            |
| Activity logging                     | `lib/activity/log-chef.ts`                      |
| Tenant scoping on all queries        | Project-wide convention                         |

---

## Testing

1. **Migration**: `supabase db push --linked` → confirm `inquiry_notes` and `inquiry_recipe_links` tables and `inquiry-note-attachments` bucket exist in dashboard
2. **Notes CRUD**: On any inquiry page — add a note, pin it, edit it, unpin, delete it
3. **Categories**: Add notes across all 7 categories, verify filter tabs appear and filter correctly
4. **Image upload**: Add an inspiration note with a photo — confirm thumbnail appears inline, lightbox opens on click, image visible in Supabase Storage dashboard
5. **Recipe linking**: Link a recipe, add a note to the link, unlink it
6. **Legacy data**: Query `SELECT unknown_fields FROM inquiries LIMIT 5` — confirm old notes value still present
