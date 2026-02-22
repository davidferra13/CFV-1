# Remy Features Phase 2 — Master Implementation Document

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`
**Status:** PLANNED — NOT YET IMPLEMENTED

---

## Overview

8 new features to make Remy the ultimate private chef companion. Phase 1 (17 improvements) is complete and committed. This document captures everything needed to implement Phase 2 without re-reading the codebase.

---

## Features to Build

### 1. Chef Q&A / Culinary Profile Questionnaire

**What:** A structured questionnaire the chef fills out about their food philosophy, style, and identity. Remy reads and internalizes all answers to deeply understand the chef.

**Database:** New table `chef_culinary_profiles`

```sql
CREATE TABLE chef_culinary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, question_key)
);
```

**Questions (predefined keys):**
| Key | Question |
|-----|----------|
| `cooking_philosophy` | What's your cooking philosophy in one sentence? |
| `signature_dish` | What's your signature dish — the one that defines you? |
| `favorite_cuisines` | What cuisines inspire you most? |
| `cant_live_without` | What 5 ingredients can you not live without? |
| `cooking_style` | How would you describe your cooking style? (e.g., rustic, refined, modern, comfort) |
| `food_memory` | What's a food memory that shaped who you are as a chef? |
| `plating_philosophy` | How do you approach plating and presentation? |
| `sourcing_values` | What matters most to you about ingredient sourcing? (organic, local, seasonal, etc.) |
| `comfort_food` | What do you cook when you cook just for yourself? |
| `dream_dinner_party` | If you could cook for anyone (living or dead), who and what would you make? |
| `culinary_hero` | Who is the chef that influenced you most and why? |
| `flavor_profile` | What flavor profiles do you gravitate toward? (bright/acidic, umami-rich, spice-forward, etc.) |

**Server Actions:** `lib/ai/chef-profile-actions.ts`

- `getCulinaryProfile()` → returns all Q&A answers for the chef
- `saveCulinaryProfileAnswer(questionKey, answer)` → upserts one answer
- `saveCulinaryProfileBulk(answers: Record<string, string>)` → upserts all at once

**UI Page:** `app/(chef)/settings/culinary-profile/page.tsx`

- Form with all 12 questions
- Textarea for each answer
- Save all at once
- Progress indicator (X of 12 answered)

**Remy Integration:**

- `loadRemyContext()` or system prompt builder loads culinary profile answers
- Injected as `CULINARY PROFILE` section in the system prompt
- Remy references these naturally when discussing food

---

### 2. Favorite Chefs (Wire into Remy)

**What:** The `favorite_chefs` table and UI already exist. Just need to wire into Remy so it knows about the chef's culinary heroes.

**Already exists:**

- Table: `favorite_chefs` (migration `20260322000038`)
- Actions: `lib/favorite-chefs/actions.ts` — `getFavoriteChefs()`, `createFavoriteChef()`, etc.
- UI: `app/(chef)/settings/favorite-chefs/page.tsx`

**What's needed:**

- Load favorite chefs in `loadRemyContext()` or system prompt builder
- Add to system prompt as `CULINARY HEROES` section
- New command task `chef.favorite_chefs` (tier 1) — list the chef's favorite chefs
- Remy references these when suggesting techniques, dishes, or styles

---

### 3. Document/Folder Management via Remy

**What:** Remy can create, list, and organize documents and folders on the chef's behalf.

**Already exists:**

- Table: `chef_documents` (migration `20260216000004`) — has `title`, `content_text`, `document_type`, `tags`, etc.
- Document generators in `lib/documents/` (contracts, invoices, checklists, etc.)

**Database changes needed:** New table `chef_folders` + alter `chef_documents`

```sql
CREATE TABLE chef_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES chef_folders(id),
  color TEXT DEFAULT '#94a3b8',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chef_documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES chef_folders(id);
```

**Server Actions:** `lib/ai/document-management-actions.ts`

- `createDocumentViaRemy(title, content, type?, folderId?, tags?)` → creates a chef_document
- `createFolderViaRemy(name, parentFolderId?, color?)` → creates a chef_folder
- `listDocuments(folderId?, type?)` → lists documents, optionally filtered
- `listFolders(parentFolderId?)` → lists folders
- `moveDocumentToFolder(documentId, folderId)` → moves a document

**New command tasks:**
| Task Type | Tier | Description |
|-----------|------|-------------|
| `document.create` | 2 | Create a document (chef reviews before saving) |
| `document.list` | 1 | List documents, optionally by folder or type |
| `folder.create` | 1 | Create a folder |
| `folder.list` | 1 | List folders |

---

### 4. Voice Input (Microphone Button)

**What:** A microphone button in the Remy drawer that uses the browser's Web Speech API to transcribe voice into text input. No API key needed — fully free and built into Chrome/Edge/Safari.

**Implementation in `remy-drawer.tsx`:**

- Add `Mic` and `MicOff` icons from lucide-react
- New state: `isListening`, `speechSupported`
- Check `window.SpeechRecognition || window.webkitSpeechRecognition` on mount
- On mic click: start recognition → append transcript to input field
- On stop: finalize and set input
- Visual indicator: red pulsing dot when listening
- Place mic button between paperclip and send button

**Key code pattern:**

```typescript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = new SpeechRecognition()
recognition.continuous = true
recognition.interimResults = true
recognition.lang = 'en-US'
recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map((r) => r[0].transcript)
    .join('')
  setInput(transcript)
}
```

**No database changes needed.**

---

### 5. Dietary/Allergy Cross-Check

**What:** "Can I serve this menu to the Hendersons?" — Remy checks the client's dietary restrictions against every ingredient in the menu's recipes and flags conflicts.

**Existing data:**

- `clients.dietary_restrictions` — text field with client allergies/restrictions
- `recipe_ingredients` — junction table linking recipes to ingredients
- `ingredients` — has `name` field
- `menu_sections` + `menu_section_items` — link menus to recipes
- `events` → `menu_id` — links events to menus

**Server Actions:** `lib/ai/dietary-check-actions.ts`

- `checkDietaryConflicts(clientId, menuId?)` → returns conflicts
- `checkDietaryConflictsForEvent(eventId)` → looks up client + menu from event

**Logic:**

1. Get client's `dietary_restrictions` text
2. Parse into keywords (e.g., "nut allergy, gluten-free, no shellfish")
3. Get all ingredients from the menu's recipes via: menu → menu_sections → menu_section_items → recipes → recipe_ingredients → ingredients
4. Cross-reference ingredient names against restriction keywords
5. Return `{ safe: boolean, conflicts: [{ recipeName, ingredientName, restriction }] }`

**New command task:**
| Task Type | Tier | Description |
|-----------|------|-------------|
| `dietary.check` | 1 | Check a client's dietary restrictions against a menu or event |

**SAFETY NOTE:** This is a safety feature. Remy should flag allergens in **ALL CAPS** and never minimize risks. When conflicts are found, the response should be urgent and clear.

---

### 6. Prep Timeline Generator

**What:** "What do I need to prep for Saturday?" — Remy looks at the event, menu, recipes, and generates a reverse-engineered prep schedule.

**Existing data:**

- `events` — has `event_date`, `serve_time`, `guest_count`
- `recipes` — has `prep_time_minutes`, `cook_time_minutes`, `instructions`
- Menu → recipes chain (via menu_sections, menu_section_items)

**Server Actions:** `lib/ai/prep-timeline-actions.ts`

- `generatePrepTimeline(eventId)` → returns structured timeline

**Logic:**

1. Look up event → get date, serve time, guest count, menu
2. Get all recipes from the menu
3. For each recipe: get prep_time, cook_time, instructions
4. Use Ollama (local, private data) to generate a timeline:
   - What to do 2-3 days before (marinating, brining, stocks)
   - What to do the day before (mise en place, pre-cook components)
   - What to do morning-of (final prep, staging)
   - What to do 2 hours before (cooking sequence)
   - What to do at service time (plating, finishing)
5. Return structured timeline with time slots and tasks

**New command task:**
| Task Type | Tier | Description |
|-----------|------|-------------|
| `prep.timeline` | 1 | Generate a prep timeline for an upcoming event |

---

### 7. Proactive Nudges / Smart Reminders

**What:** Remy proactively notices things and alerts the chef when the drawer opens. "You have an event tomorrow but the menu isn't finalized," "Inquiry from 5 days ago hasn't been responded to."

**Database:** New table `chef_reminders`

```sql
CREATE TABLE chef_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  reminder_type TEXT NOT NULL DEFAULT 'general'
    CHECK (reminder_type IN ('general', 'follow_up', 'prep', 'inquiry', 'birthday', 'event', 'payment')),
  title TEXT NOT NULL,
  message TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto', 'manual', 'remy')),
  related_event_id UUID REFERENCES events(id),
  related_client_id UUID REFERENCES clients(id),
  related_inquiry_id UUID REFERENCES inquiries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Server Actions:** `lib/ai/reminder-actions.ts`

- `checkProactiveNudges()` → scans for actionable items, returns nudge list
- `createReminder(title, message, type, dueAt?, relatedIds?)` → manual reminder
- `dismissNudge(nudgeId)` → marks as dismissed
- `completeReminder(reminderId)` → marks as completed

**Auto-detected nudges (no table needed — computed on the fly):**
| Nudge Type | Logic |
|------------|-------|
| Stale inquiry | Inquiries with status 'new' or 'awaiting_chef' older than 3 days |
| Event tomorrow, no menu | Events within 24h where menu_id is null |
| Event this week, status still 'draft' | Draft events with event_date within 7 days |
| Unpaid event approaching | Events within 7 days where status is 'accepted' (not 'paid') |
| Client birthday coming | Clients with birthday within 7 days (if birthday stored) |
| Follow-up overdue | Completed events with no follow-up email sent within 3 days |

**Drawer Integration:**

- When drawer opens, call `checkProactiveNudges()` (non-blocking, like memory decay)
- If nudges exist, show a dismissible banner/pill at the top of the chat area
- Each nudge has a dismiss button and an action button (e.g., "Go to inquiry", "Finalize menu")

**New command task:**
| Task Type | Tier | Description |
|-----------|------|-------------|
| `nudges.check` | 1 | Check for proactive nudges and reminders |
| `reminder.create` | 1 | Create a manual reminder |

---

### 8. Quick-Add from Chat

**What:** "Add 2 lbs butter and shallots to Saturday's grocery list" — Remy writes directly to the event's ingredient/grocery list.

**Existing data:**

- `recipe_ingredients` table — links recipes to ingredients with quantity/unit
- `ingredients` table — master ingredient list
- Events have menus, menus have recipes, recipes have ingredients
- Grocery quote system exists at `lib/grocery/pricing-actions.ts`

**Server Actions:** `lib/ai/grocery-quick-add-actions.ts`

- `quickAddGroceryItems(eventIdentifier, items: Array<{name, quantity?, unit?}>)` → adds items

**Logic:**

1. Resolve event by name/date search
2. For each item, check if ingredient exists in `ingredients` table
3. If not, create the ingredient
4. Add to the event's grocery list (link via recipe_ingredients or a dedicated shopping list)
5. Return confirmation with what was added

**New command task:**
| Task Type | Tier | Description |
|-----------|------|-------------|
| `grocery.quick_add` | 2 | Add items to an event's grocery list (chef confirms) |

---

## Files to Create

| File                                                 | Purpose                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `supabase/migrations/20260322000040_remy_phase2.sql` | New tables: chef_culinary_profiles, chef_folders, chef_reminders + ALTER chef_documents |
| `lib/ai/chef-profile-actions.ts`                     | CRUD for culinary profile Q&A                                                           |
| `lib/ai/document-management-actions.ts`              | Create/manage documents and folders via Remy                                            |
| `lib/ai/dietary-check-actions.ts`                    | Cross-check menu vs client allergies                                                    |
| `lib/ai/prep-timeline-actions.ts`                    | Generate prep timeline from event data                                                  |
| `lib/ai/reminder-actions.ts`                         | Proactive nudges + manual reminders                                                     |
| `lib/ai/grocery-quick-add-actions.ts`                | Quick-add grocery items to event                                                        |
| `app/(chef)/settings/culinary-profile/page.tsx`      | Chef Q&A form page                                                                      |

## Files to Modify

| File                                   | Changes                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `lib/ai/command-task-descriptions.ts`  | Add 10 new task types                                                   |
| `lib/ai/command-orchestrator.ts`       | Add 10 new executor functions + imports                                 |
| `lib/ai/remy-classifier.ts`            | Add new command examples for all new task types                         |
| `lib/ai/remy-personality.ts`           | Add culinary profile awareness, new capabilities                        |
| `app/api/remy/stream/route.ts`         | Load culinary profile + favorite chefs into system prompt, nudge banner |
| `components/ai/remy-drawer.tsx`        | Voice input mic button, proactive nudge banner, new starters            |
| `components/ai/remy-task-card.tsx`     | Data renderers for all new task types                                   |
| `components/navigation/nav-config.tsx` | Add culinary profile to settings shortcuts                              |

---

## New Command Tasks Summary

| Task Type               | Tier | Name                    |
| ----------------------- | ---- | ----------------------- |
| `chef.favorite_chefs`   | 1    | List Favorite Chefs     |
| `chef.culinary_profile` | 1    | View Culinary Profile   |
| `dietary.check`         | 1    | Dietary/Allergy Check   |
| `prep.timeline`         | 1    | Prep Timeline           |
| `document.create`       | 2    | Create Document         |
| `document.list`         | 1    | List Documents          |
| `folder.create`         | 1    | Create Folder           |
| `folder.list`           | 1    | List Folders            |
| `nudges.check`          | 1    | Check Nudges            |
| `reminder.create`       | 1    | Create Reminder         |
| `grocery.quick_add`     | 2    | Quick-Add Grocery Items |

---

## Migration SQL (Ready to Write)

```sql
-- Remy Phase 2: Culinary Profile, Folders, Reminders
-- Migration: 20260322000040

-- 1. Chef Culinary Profiles (Q&A)
CREATE TABLE IF NOT EXISTS chef_culinary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, question_key)
);

ALTER TABLE chef_culinary_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY chef_culinary_profiles_tenant ON chef_culinary_profiles
  FOR ALL USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
CREATE INDEX idx_chef_culinary_profiles_chef ON chef_culinary_profiles(chef_id);

-- 2. Chef Folders
CREATE TABLE IF NOT EXISTS chef_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES chef_folders(id),
  color TEXT DEFAULT '#94a3b8',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chef_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY chef_folders_tenant ON chef_folders
  FOR ALL USING (tenant_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (tenant_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
CREATE INDEX idx_chef_folders_tenant ON chef_folders(tenant_id);
CREATE INDEX idx_chef_folders_parent ON chef_folders(parent_folder_id);

-- Add folder_id to chef_documents
ALTER TABLE chef_documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES chef_folders(id);
CREATE INDEX IF NOT EXISTS idx_chef_documents_folder ON chef_documents(folder_id);

-- 3. Chef Reminders
CREATE TABLE IF NOT EXISTS chef_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  reminder_type TEXT NOT NULL DEFAULT 'general'
    CHECK (reminder_type IN ('general', 'follow_up', 'prep', 'inquiry', 'birthday', 'event', 'payment')),
  title TEXT NOT NULL,
  message TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto', 'manual', 'remy')),
  related_event_id UUID REFERENCES events(id),
  related_client_id UUID REFERENCES clients(id),
  related_inquiry_id UUID REFERENCES inquiries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chef_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY chef_reminders_tenant ON chef_reminders
  FOR ALL USING (tenant_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (tenant_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
CREATE INDEX idx_chef_reminders_tenant ON chef_reminders(tenant_id);
CREATE INDEX idx_chef_reminders_due ON chef_reminders(tenant_id, due_at) WHERE completed_at IS NULL AND dismissed_at IS NULL;

-- Triggers
CREATE TRIGGER chef_culinary_profiles_updated_at BEFORE UPDATE ON chef_culinary_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chef_folders_updated_at BEFORE UPDATE ON chef_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Research Completed (Don't Re-Read These Files)

All files below have been fully read and analyzed. No need to re-read on resume:

- `components/ai/remy-drawer.tsx` — 1159 lines, complete rewrite from Phase 1
- `components/ai/remy-task-card.tsx` — 409 lines, all current data renderers
- `lib/ai/command-task-descriptions.ts` — 176 lines, 18 existing task types
- `lib/ai/command-orchestrator.ts` — 635 lines, full DAG execution engine
- `lib/ai/remy-personality.ts` — 218 lines, all personality blocks
- `lib/ai/remy-classifier.ts` — 82 lines, intent classifier
- `lib/ai/remy-types.ts` — 88 lines, all type definitions
- `lib/ai/remy-web-actions.ts` — 224 lines, web search + read
- `app/api/remy/stream/route.ts` — 717 lines, SSE streaming handler
- `supabase/migrations/20260216000004_chef_documents.sql` — existing documents table
- `supabase/migrations/20260322000038_favorite_chefs.sql` — existing favorite chefs table

**Key facts from research:**

- Highest migration: `20260322000039_daily_ops.sql` → next = `20260322000040`
- `favorite_chefs` table + actions + page ALREADY EXIST — just wire into Remy
- `chef_documents` table EXISTS but has no `folder_id` column — needs ALTER
- No documents page at `app/(chef)/documents/` yet
- `recipe_ingredients` junction table links recipes → ingredients (has quantity, unit)
- `checkCalendarAvailability()` returns `{ available: boolean, conflicts: [{occasion, time}] }`
- Nav config at `components/navigation/nav-config.tsx` — 815 lines, 6 domain groups

---

## Implementation Order (When Resuming)

1. **Migration** — Write `20260322000040_remy_phase2.sql`
2. **Server actions** (all 6 new files — can be created in parallel)
3. **Command system updates** (task descriptions, orchestrator, classifier)
4. **Personality update** (new capabilities in system prompt)
5. **Stream route update** (load culinary profile + favorite chefs)
6. **Drawer UI** (voice input, nudge banner)
7. **Task card renderers** (new data renderers for all task types)
8. **Chef Q&A settings page**
9. **Nav config** (add culinary profile link)
10. **Session doc** (this file, updated with completion status)

---

## Notes

- All new server actions follow the `'use server'` + `requireChef()` + tenant-scoping pattern
- Dietary check uses LOCAL Ollama for parsing restrictions (private data)
- Prep timeline uses LOCAL Ollama for generating the schedule (private data)
- Voice input uses Web Speech API (browser-native, no API key, no cost)
- Proactive nudges are computed on-the-fly (no LLM needed — pure DB queries)
- Quick-add is tier 2 (chef confirms before items are added)
- Document creation is tier 2 (chef reviews before saving)
