# Spec: Canonical Culinary Dictionary

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date             | Agent/Session | Commit |
| --------------------- | ---------------- | ------------- | ------ |
| Created               | 2026-04-29 17:36 | Codex         |        |
| Status: ready         | 2026-04-29 17:36 | Codex         |        |
| Claimed (in-progress) |                  |               |        |
| Spike completed       |                  |               |        |
| Pre-flight passed     |                  |               |        |
| Build completed       |                  |               |        |
| Type check passed     |                  |               |        |
| Build check passed    |                  |               |        |
| Playwright verified   |                  |               |        |
| Status: verified      |                  |               |        |

---

## Developer Notes

### Raw Signal

The developer asked: "does chef flow have a culinary dictionary? should it?" After the codebase review showed partial systems but no single canonical dictionary, the developer asked: "Build out an entire building spec please."

### Developer Intent

- **Core goal:** Turn ChefFlow's scattered culinary vocabulary, ingredient knowledge, dietary rules, substitution data, and normalization logic into one deterministic reference layer.
- **Key constraints:** Do not let AI generate recipes. Do not replace chef creativity. Do not create fake culinary facts. Keep the system additive, tenant-safe, and deterministic first.
- **Motivation:** The app already depends on culinary meaning for costing, recipe parsing, dietary safety, menu intelligence, ingredient pages, substitutions, and search. Those systems currently share concepts but not one canonical source of truth.
- **Success from the developer's perspective:** Builders can implement a culinary dictionary that improves ingredient matching, synonym resolution, dietary checks, search, and chef-facing vocabulary without guessing the architecture.

---

## Validation Gate

REQUEST: Build a spec for a new canonical culinary dictionary layer.

EVIDENCE: developer-intent plus existing internal gap evidence.

DECISION: plan.

WHY:

- The developer explicitly requested the spec.
- Existing docs record a concrete missing synonym table where "scallion", "green onion", and "spring onion" resolve differently (`docs/autodocket.md:283-284`).
- Existing app surfaces already expose ingredient knowledge, culinary words, dietary rules, and chef taxonomy, but they are not unified (`docs/app-complete-audit.md:2046-2086`, `docs/taxonomy-extensions.md:7-10`).

NEXT STEP:

- Build the deterministic dictionary core first, then wire only the lowest-risk consumers: ingredient search, ingredient matching suggestions, and dictionary browse UI.

---

## Current State Summary

ChefFlow already has dictionary-like pieces, but no canonical dictionary service.

- Public ingredient browse exists at `/ingredients`. It is described as a searchable A-Z culinary encyclopedia and reads `ingredient_knowledge_slugs`, `system_ingredients`, and `ingredient_knowledge` (`app/(public)/ingredients/page.tsx:4`, `app/(public)/ingredients/page.tsx:84-100`, `docs/app-complete-audit.md:2046-2056`).
- Public ingredient detail exists at `/ingredient/[id]`. It shows ingredient summary, flavor, culinary uses, pairings, dietary flags, nutrition, origin, and pricing when available (`app/(public)/ingredient/[id]/page.tsx:657-726`, `docs/app-complete-audit.md:2078-2086`).
- Ingredient knowledge queries bridge canonical price ingredients with encyclopedic system ingredients through fuzzy name matching (`lib/openclaw/ingredient-knowledge-queries.ts:5`, `lib/openclaw/ingredient-knowledge-queries.ts:67-100`).
- Chef-facing Culinary Board exists as a composition word list with categories for texture, flavor, temperature, mouthfeel, aroma, technique, visual, composition, emotion, sauce, and action (`lib/culinary-words/constants.ts:15-38`, `app/(chef)/culinary-board/page.tsx:29`).
- Chefs can add personal culinary words to `chef_culinary_words`, scoped by chef RLS (`database/migrations/20260322000041_chef_culinary_words.sql:5-36`, `lib/culinary-words/actions.ts:59-97`).
- Ingredient normalization exists for pricing, with deterministic abbreviation expansion and singularization (`lib/pricing/ingredient-matching-utils.ts:7-49`).
- Chef ingredients can be linked to system ingredients through `ingredient_aliases` for pricing and unit conversion (`database/migrations/20260401000112_ingredient_aliases.sql:1-27`).
- Chef-specific substitutions exist in `ingredient_substitutions` (`database/migrations/20260401000095_ingredient_substitutions.sql:8-30`, `lib/ingredients/substitution-actions.ts:65-67`).
- Dietary rules are deterministic keyword dictionaries with violation and caution keyword lists (`lib/constants/dietary-rules.ts:47-54`, `lib/constants/dietary-rules.ts:1054-1075`).
- Per-chef taxonomy extensions already support chef custom entries and hidden defaults (`docs/taxonomy-extensions.md:7-10`, `lib/taxonomy/actions.ts:14-34`, `lib/taxonomy/actions.ts:96-128`).

---

## What This Does (Plain English)

ChefFlow gets a canonical Culinary Dictionary that can answer: "What does this culinary term mean?", "Which ingredient does this phrase refer to?", "What aliases should resolve together?", "What dietary or allergen risks attach to this term?", "Which units, yields, storage, flavor, technique, and substitution metadata are trustworthy?", and "What chef-specific words should be layered on top?" Chefs see it as a searchable dictionary and review queue. The system uses it behind the scenes for ingredient matching, menu search, substitutions, recipe parsing, dietary checks, and public ingredient pages.

---

## Why It Matters

The current app makes high-stakes culinary decisions from disconnected vocabularies. A canonical dictionary removes duplicate logic, reduces silent costing errors, improves search, and makes safety checks more trustworthy without using AI to invent recipes.

---

## Files to Create

| File | Purpose |
| ---- | ------- |
| `database/migrations/[next]_culinary_dictionary_core.sql` | Add dictionary tables, review queue tables, and additive indexes. Builder must choose the timestamp after listing existing migrations. |
| `lib/culinary-dictionary/types.ts` | Shared TypeScript types for dictionary terms, aliases, meanings, safety flags, and review states. |
| `lib/culinary-dictionary/normalization.ts` | Deterministic normalization helpers reused by dictionary search and ingredient matching. |
| `lib/culinary-dictionary/queries.ts` | Non-server-action read helpers for public and chef dictionary queries. |
| `lib/culinary-dictionary/actions.ts` | Chef-authenticated server actions for chef overrides and review decisions. |
| `lib/culinary-dictionary/publication.ts` | Public visibility policy for dictionary terms and ingredient knowledge reuse. |
| `components/culinary-dictionary/dictionary-search.tsx` | Search and filter UI for chef dictionary page. |
| `components/culinary-dictionary/dictionary-term-card.tsx` | Term card reused on chef and public surfaces. |
| `components/culinary-dictionary/dictionary-review-queue.tsx` | Chef review UI for aliases and unresolved terms. |
| `app/(chef)/culinary/dictionary/page.tsx` | Chef dictionary page. |
| `app/(public)/dictionary/page.tsx` | Public dictionary browse page for public-safe terms only. |
| `app/(public)/dictionary/[slug]/page.tsx` | Public-safe dictionary detail page. |
| `tests/unit/culinary-dictionary-normalization.test.ts` | Normalization, alias, and conflict tests. |
| `tests/unit/culinary-dictionary-actions.test.ts` | Server-action contract tests for auth, tenant scope, errors, and cache invalidation. |
| `tests/unit/culinary-dictionary-publication.test.ts` | Public visibility tests. |
| `tests/launch/culinary-dictionary.spec.ts` | Browser verification for chef dictionary browse and review queue. |
| `docs/changes/[date]-culinary-dictionary.md` | Change note after build. |

---

## Files to Modify

| File | What to Change |
| ---- | -------------- |
| `lib/pricing/ingredient-matching-utils.ts` | Delegate reusable normalization to `lib/culinary-dictionary/normalization.ts`, preserving existing behavior and tests. |
| `lib/pricing/ingredient-matching-actions.ts` | Use dictionary alias lookup before trigram fallback, preserving chef approval before confirmed matches. |
| `lib/pricing/ingredient-health-actions.ts` | Include dictionary alias and review status in unresolved ingredient health output. |
| `lib/openclaw/ingredient-knowledge-queries.ts` | Add optional dictionary join helpers for canonical public-safe knowledge, without changing existing return shape until callers are migrated. |
| `app/(public)/ingredients/page.tsx` | Link ingredient cards to dictionary terms when the term is public-safe and directly mapped. |
| `app/(public)/ingredient/[id]/page.tsx` | Add "Also known as" and public-safe term facts from dictionary data. |
| `app/(chef)/culinary/page.tsx` | Add nav tile for Culinary Dictionary. |
| `components/culinary/culinary-board.tsx` | Optionally show dictionary-backed definitions for technique and composition words, read-only in this spec. |
| `lib/constants/dietary-rules.ts` | No large rewrite. Add adapter tests that prove dictionary safety flags and existing keyword rules agree for seeded terms. |
| `docs/app-complete-audit.md` | Document new chef and public dictionary pages after implementation. |
| `project-map/chef-os/culinary.md` | Add dictionary page and data flow after implementation. |
| `project-map/public/directory.md` | Add public dictionary browse and detail pages after implementation. |

---

## Database Changes

Additive only. Do not write a migration until the builder lists `database/migrations/*.sql`, chooses a timestamp higher than the highest existing migration, and shows the final SQL to the developer.

### New Tables

```sql
CREATE TABLE IF NOT EXISTS culinary_dictionary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_slug TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  term_type TEXT NOT NULL CHECK (term_type IN (
    'ingredient',
    'technique',
    'cut',
    'sauce',
    'texture',
    'flavor',
    'dietary',
    'allergen',
    'equipment',
    'service',
    'composition',
    'other'
  )),
  category TEXT,
  short_definition TEXT,
  long_definition TEXT,
  public_safe BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'chef', 'import', 'manual_review')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en-US',
  alias_kind TEXT NOT NULL DEFAULT 'synonym' CHECK (alias_kind IN (
    'synonym',
    'spelling',
    'abbreviation',
    'plural',
    'regional',
    'brand',
    'misspelling',
    'prep_form'
  )),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'chef', 'import', 'manual_review')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (normalized_alias, locale, alias_kind)
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN (
    'system_ingredient',
    'openclaw_canonical_ingredient',
    'dietary_rule',
    'allergen',
    'culinary_word',
    'substitution_original',
    'taxonomy_entry'
  )),
  target_id TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'equivalent' CHECK (relationship IN (
    'equivalent',
    'broader',
    'narrower',
    'related',
    'unsafe_for',
    'substitute_for',
    'used_in'
  )),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_id, target_type, target_id, relationship)
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('allergen', 'dietary_violation', 'dietary_caution', 'cross_contact')),
  flag_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'caution' CHECK (severity IN ('info', 'caution', 'critical')),
  explanation TEXT,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'chef', 'manual_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_id, flag_type, flag_key)
);

CREATE TABLE IF NOT EXISTS chef_culinary_dictionary_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  term_id UUID REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  alias_id UUID REFERENCES culinary_dictionary_aliases(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (override_type IN (
    'custom_alias',
    'hide_alias',
    'custom_definition',
    'review_decision',
    'preferred_term'
  )),
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (term_id IS NOT NULL OR alias_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  source_surface TEXT NOT NULL,
  source_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  suggested_term_id UUID REFERENCES culinary_dictionary_terms(id) ON DELETE SET NULL,
  suggested_alias_id UUID REFERENCES culinary_dictionary_aliases(id) ON DELETE SET NULL,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'dismissed')),
  resolution JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_terms_type
  ON culinary_dictionary_terms(term_type, category);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_terms_public
  ON culinary_dictionary_terms(public_safe, term_type)
  WHERE public_safe = true;

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_aliases_normalized
  ON culinary_dictionary_aliases(normalized_alias);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_links_target
  ON culinary_dictionary_links(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_chef_culinary_dictionary_overrides_chef
  ON chef_culinary_dictionary_overrides(chef_id);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_review_queue_chef_status
  ON culinary_dictionary_review_queue(chef_id, status);
```

### New Columns on Existing Tables

None in the first build. Keep the first version additive and loosely coupled through link tables.

### Migration Notes

- This spec includes proposed SQL only. The builder must not write a migration file until the developer has seen the final SQL and migration timestamp.
- RLS is required for `chef_culinary_dictionary_overrides` and `culinary_dictionary_review_queue`.
- System dictionary tables can be globally readable by server code. Public routes must still filter with `public_safe = true`.
- Do not modify `types/database.ts` manually.

---

## Data Model

The dictionary has four layers:

1. `culinary_dictionary_terms`: canonical concept records.
2. `culinary_dictionary_aliases`: synonyms, abbreviations, plural forms, regional names, and misspellings.
3. `culinary_dictionary_links`: joins terms to existing system concepts such as system ingredients, canonical price ingredients, dietary rules, allergens, culinary words, substitutions, and taxonomy entries.
4. Chef overlays: `chef_culinary_dictionary_overrides` and `culinary_dictionary_review_queue`.

Important invariants:

- A term is not public unless `public_safe = true`.
- A high-confidence alias can suggest a match, but chef-owned ingredient matching still requires existing confirmation behavior.
- Chef overrides never mutate system terms directly.
- Dictionary definitions are reference data, not recipe generation.
- `target_type = 'openclaw_canonical_ingredient'` is internal only and must not leak that name into public UI.

---

## Server Actions

| Action | Auth | Input | Output | Side Effects |
| ------ | ---- | ----- | ------ | ------------ |
| `searchCulinaryDictionary(input)` | `requireChef()` | `{ query: string, termType?: string, includeChefOverrides?: boolean }` | `{ success: true, terms: DictionaryTerm[] }` or `{ success: false, error: string }` | None |
| `getCulinaryDictionaryTerm(idOrSlug)` | `requireChef()` | `string` | `{ success: true, term: DictionaryTermDetail }` or `{ success: false, error: string }` | None |
| `addChefDictionaryAlias(input)` | `requireChef()` | `{ termId: string, alias: string, aliasKind?: string }` | `{ success: boolean, alias?: DictionaryAlias, error?: string }` | Revalidate `/culinary/dictionary` |
| `hideChefDictionaryAlias(input)` | `requireChef()` | `{ aliasId: string }` | `{ success: boolean, error?: string }` | Revalidate `/culinary/dictionary` |
| `createChefDictionaryTerm(input)` | `requireChef()` | `{ canonicalName: string, termType: string, definition?: string, aliases?: string[] }` | `{ success: boolean, termId?: string, error?: string }` | Inserts chef override or pending review item, revalidates `/culinary/dictionary` |
| `resolveDictionaryReviewItem(input)` | `requireChef()` | `{ reviewId: string, decision: 'approved' | 'rejected' | 'dismissed', termId?: string }` | `{ success: boolean, error?: string }` | Updates review queue, revalidates dictionary and affected costing pages |
| `getDictionaryReviewQueue()` | `requireChef()` | none | `{ success: true, items: ReviewItem[] }` or `{ success: false, error: string }` | None |

Server action rules:

- Every action starts with `requireChef()`.
- Every chef-owned query includes `.eq('chef_id', user.entityId)` or equivalent tenant-safe SQL.
- Inputs must be Zod-validated before DB calls.
- Mutations return `{ success, error? }`.
- No mutation may silently return success if no row changed.
- Cache invalidation must include `/culinary/dictionary`, `/culinary/costing`, and `/culinary/ingredients` when review decisions affect ingredient matching.

---

## UI / Component Spec

### Page Layout

Chef page: `/culinary/dictionary`

- Header: "Culinary Dictionary"
- Search input with filters: All, Ingredients, Techniques, Cuts, Sauces, Flavor, Texture, Dietary, Allergens.
- Summary strip with real counts only: total terms, aliases, pending reviews, chef custom entries.
- Main split layout:
  - Left: search results and term cards.
  - Right: selected term detail panel.
- Review queue section below search when pending items exist.
- Chef custom alias modal for adding a local alias.

Public page: `/dictionary`

- Public-safe search and category browse only.
- No chef-specific overrides.
- No review queue.
- No internal provider names.

Public detail page: `/dictionary/[slug]`

- Term name, definition, aliases, related ingredients, safety flags, and links to public ingredient guide pages when available.
- Only public-safe fields render.

### States

- **Loading:** Skeleton rows with no fake counts.
- **Empty:** "No dictionary terms match this search." Include reset filter action.
- **Error:** Show a clear error state and retry action. Do not show zero counts on fetch failure.
- **Populated:** Real counts and rows from DB.
- **Pending review:** Show suggested match, confidence, source surface, and approve/reject/dismiss actions.

### Interactions

- Search updates URL params for shareable state.
- Adding a chef alias uses optimistic UI only with try/catch and rollback.
- Review queue approve/reject/dismiss uses explicit pending state per row.
- Public dictionary routes are read-only.
- Dictionary term cards link to ingredient pages only when the mapped target is public-safe.

---

## Edge Cases and Error Handling

| Scenario | Correct Behavior |
| -------- | ---------------- |
| Alias conflicts with existing normalized alias | Return `{ success: false, error }`, show conflict message, do not insert duplicate. |
| Search DB fails | Show error state, not empty results. |
| Public route receives non-public term slug | Return `notFound()`. |
| Chef creates custom alias for hidden system alias | Store chef override without mutating system alias. |
| Review item points to deleted term | Show stale review item with dismiss action. |
| Dictionary match has low confidence | Queue for review, never auto-confirm. |
| Alias suggests a dietary or allergen risk | Show caution or critical flag, do not silently apply. |
| Multiple chefs define different aliases | Keep aliases chef-scoped through overrides, do not pollute system defaults. |

---

## Verification Steps

1. Run unit tests for normalization and publication:
   - `node --test --import tsx tests/unit/culinary-dictionary-normalization.test.ts`
   - `node --test --import tsx tests/unit/culinary-dictionary-publication.test.ts`
2. Run server action tests:
   - `node --test --import tsx tests/unit/culinary-dictionary-actions.test.ts`
3. Run type check:
   - `npm run typecheck`
4. With permission to use the running dev environment, sign in as the agent account.
5. Navigate to `/culinary/dictionary`.
6. Search "scallion" and verify aliases resolve with "green onion" and "spring onion" if seeded.
7. Add a chef custom alias. Verify optimistic state rolls back on simulated failure and persists on success.
8. Review a pending term. Verify it leaves the queue and affected dictionary results update.
9. Navigate to `/dictionary`. Verify only public-safe terms appear.
10. Navigate to a non-public dictionary slug. Verify 404.
11. Screenshot chef dictionary populated state and public dictionary populated state.

---

## Out of Scope

- No AI recipe generation.
- No AI-suggested dishes, recipes, menus, or cooking instructions.
- No destructive database operations.
- No modification to `types/database.ts`.
- No replacement of the existing public Ingredient Guide in the first build.
- No automatic confirmation of ingredient matches without chef review.
- No migration of all existing dietary rules into DB in the first build.
- No public display of internal provider or pipeline names.

---

## Notes for Builder Agent

- Start with dictionary core plus search. Do not wire every consumer in one pass.
- Preserve current ingredient matching behavior before adding dictionary alias lookup.
- Use existing patterns from `lib/taxonomy/actions.ts`, `lib/ingredients/substitution-actions.ts`, and `lib/pricing/ingredient-matching-actions.ts`.
- Keep public dictionary reads separate from chef reads. Public routes must use `public_safe = true`.
- For seeded terms, begin with a small deterministic set that proves the model: scallion, green onion, spring onion; extra virgin olive oil, EVOO; all purpose flour, AP flour; brunoise; julienne; confit; nappé.
- Do not create a full data import pipeline in this spec. That should be a follow-up once the core model and review queue are verified.

---

## Spec Validation

1. **What exists today that this touches?**
   Public Ingredient Guide (`app/(public)/ingredients/page.tsx:4`, `docs/app-complete-audit.md:2046-2056`), ingredient detail knowledge panel (`app/(public)/ingredient/[id]/page.tsx:657-726`), ingredient knowledge queries (`lib/openclaw/ingredient-knowledge-queries.ts:5-100`), Culinary Board (`lib/culinary-words/constants.ts:15-77`), chef culinary words (`database/migrations/20260322000041_chef_culinary_words.sql:5-36`), ingredient aliases (`database/migrations/20260401000112_ingredient_aliases.sql:1-27`), substitutions (`database/migrations/20260401000095_ingredient_substitutions.sql:8-30`), dietary rules (`lib/constants/dietary-rules.ts:47-54`), and taxonomy extensions (`docs/taxonomy-extensions.md:7-10`).

2. **What exactly changes?**
   Add new dictionary tables, read helpers, server actions, chef and public pages, tests, and light adapters in ingredient matching and public ingredient pages. No existing table is altered in the first build.

3. **What assumptions are being made?**
   Verified: current app lacks one synonym table and has scattered dictionary-like systems (`docs/autodocket.md:283-284`). Verified: chef-scoped customization exists through taxonomy and culinary words (`docs/taxonomy-extensions.md:7-10`, `lib/culinary-words/actions.ts:59-97`). Unverified: final seed list size. Builder should keep seed list small.

4. **Where will this most likely break?**
   Alias collisions, public/private leakage, and accidental changes to existing ingredient matching. Tests must cover all three.

5. **What is underspecified?**
   Full import pipeline and large-scale seeding are intentionally underspecified and out of scope.

6. **What dependencies or prerequisites exist?**
   Additive migration approval, RLS policies, seed data decision, and test fixtures.

7. **What existing logic could this conflict with?**
   Ingredient matching upsert behavior (`lib/pricing/ingredient-matching-actions.ts:75-112`), public ingredient publication policy, and dietary keyword checks.

8. **What is the end-to-end data flow?**
   Chef searches dictionary -> server action reads system terms plus chef overrides -> UI displays results. Chef adds alias -> server action validates and inserts override -> revalidates dictionary routes -> UI refreshes. Ingredient matching asks dictionary for alias candidates -> low confidence goes to review queue -> chef approves -> matching flow continues through existing alias confirmation.

9. **What is the correct implementation order?**
   Migration SQL approval, schema migration, types, normalization helper, queries, server actions, chef UI, public UI, ingredient matching adapter, tests, docs.

10. **What are the exact success criteria?**
    Scallion alias family resolves together in dictionary search, chef custom alias persists, public routes hide non-public terms, ingredient matching suggestions include dictionary aliases without auto-confirming, all tests and typecheck pass.

11. **What are the non-negotiable constraints?**
    Auth on chef actions, chef scoping on overrides and reviews, public-safe filtering, no AI recipe generation, no destructive DB operations, no manual `types/database.ts` edits.

12. **What should NOT be touched?**
    Existing recipe generation restrictions, ledger, event FSM, Stripe, production deploy scripts, `types/database.ts`, and destructive migrations.

13. **Is this the simplest complete version?**
    Yes for the platform layer. It cuts import pipelines and full dietary migration while still solving the core dictionary shape.

14. **If implemented exactly as written, what would still be wrong?**
    Coverage would be intentionally small until a separate seeding/import pipeline is built. The first build proves architecture and correctness, not complete culinary coverage.

## Final Check

This spec is production-ready for a first builder pass with one caveat: the final migration timestamp and exact SQL must be shown to the developer immediately before writing the migration file, per project migration safety rules.
