# Spec: Public Chef Credentials Showcase

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** `featured-chef-public-proof-and-booking.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session      | Commit |
| --------------------- | -------------------- | ------------------ | ------ |
| Created               | 2026-03-31 21:22 EDT | Planner + Research |        |
| Status: ready         | 2026-03-31 21:22 EDT | Planner + Research |        |
| Claimed (in-progress) | 2026-04-01           | Builder            |        |
| Spike completed       | 2026-04-01           | Builder            |        |
| Pre-flight passed     | 2026-04-01           | Builder            |        |
| Build completed       | 2026-04-01           | Builder            |        |
| Type check passed     | 2026-04-01           | Builder            | clean  |
| Build check passed    |                      |                    |        |
| Playwright verified   |                      |                    |        |
| Status: verified      |                      |                    |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer wants a brand new public-facing feature that helps a chef look deeply credible without making the profile feel like a stiff PDF resume. They have a strong, highly specific culinary background with food-heavy work history, famous people they have cooked for or with, charities they have worked with, and a lot of career accomplishments that do not currently have a real place to live on the public chef profile.

The profile needs to showcase the chef's work history, rewards, accomplishments, and notable credits in a way that feels natural for a premium chef-hiring surface. A normal resume is still needed, but it should be tucked away. High-end clients hiring a private chef for a summer or a premium engagement may want the formal resume, so the system should support that without making the public profile itself look like "here is my resume PDF."

The developer also wants a place to communicate charity impact as part of the chef's professional identity. They specifically mentioned eventually showing that a chef donates a certain percent to charity, and they want that to live alongside the chef's professional story, not in a disconnected admin-only corner of the product.

### Developer Intent

- **Core goal:** Add a public professional-credentials layer to the chef profile so a chef can look hireable for premium opportunities without relying on a plain resume.
- **Key constraints:** Keep the public surface polished, do not turn the profile into a resume dump, respect NDA/privacy boundaries around famous clients, keep the actual resume private, and reuse existing proof systems where they already work.
- **Motivation:** The current public chef funnel shows service capability and reviews, but it does not yet communicate the chef's career story, stature, or cause-driven identity well enough for premium private-chef hiring.
- **Success from the developer's perspective:** A client can open a chef profile and immediately understand that chef's career background, accomplishments, notable public-safe credits, and community impact, while a formal resume still exists privately for clients who ask for it.

### Transcript Capture

- The developer wants help defining a feature that does not exist yet.
- The chef profile needs a way to show strong credentials and a real career story.
- The public-facing version should not look like a weird plain resume.
- A formal resume is still needed and should be tucked away for clients who explicitly want it.
- The public profile should showcase work history, awards, accomplishments, famous people cooked for or with, and charity work.
- Community impact should become part of the chef's public professional identity, including future support for showing that a chef donates a certain percentage to charity.

### Execution Translation

#### Requirements

- Public chef profiles must gain a structured professional-credentials section.
- The professional-credentials section must include work history, public accomplishments, portfolio proof, and community-impact proof when available.
- Public-safe notable credits must be chef-entered and explicitly marked public.
- A formal resume must be storable privately and never exposed as a public file in v1.
- The chef must manage this content from settings, not from raw database-only admin tooling.

#### Constraints

- Do not replace the live public reviews system.
- Do not overload `profile_highlights` into a fake resume builder.
- Do not auto-publish famous-client references or infer them from private data.
- Do not expose the private resume as a public download in v1.
- Do not rely on the admin-gated charity page as the public source of truth.

#### Behaviors

- Reuse `professional_achievements` for awards and accomplishments.
- Reuse `event_photos` public portfolio for visual proof.
- Reuse `charity_hours` for measurable volunteer impact.
- Store the private resume in `chef_documents` with dedicated feature semantics, but keep it private.
- Add a new structured work-history model instead of bending an existing table into the wrong shape.

### Gap Check

The original ask leaves three places where a builder would otherwise guess:

1. Work history does not exist in a usable structured form today, so this spec adds it.
2. The request for a tucked-away resume is not satisfied by the current public profile or by a polished private-document UX, so this spec defines a private resume slot on top of `chef_documents`.
3. The request to show charity percentage is not covered by `charity_hours`, so this spec adds chef-level public charity fields for narrative impact.

---

## What This Does (Plain English)

This feature turns the public chef profile into a professional credentials page instead of only a service listing. A visitor can see where the chef has worked, what they have achieved, selected public-safe notable credits, portfolio proof, and community impact, while the chef can also keep a private formal resume on file for clients who ask for it. The result should feel like a premium culinary profile, not a PDF resume pasted onto the web.

---

## Why It Matters

The current public funnel proves that a chef is active and review-backed, but it does not yet prove stature. Premium private-chef hiring often depends on career credibility, public-safe namedrops, and mission-driven identity, and those signals are currently fragmented or missing.

---

## Current-State Summary

- Public chef discovery currently stops at service proof: homepage cards show service/status/socials, profiles show hero plus reviews/partners/availability, and inquiry is still form-first (`app/(public)/page.tsx:164-287`, `app/(public)/chef/[slug]/page.tsx:152-609`, `app/(public)/chef/[slug]/inquire/page.tsx:30-94`).
- Public profile data currently exposes brand and routing controls but no structured credentials content (`lib/profile/actions.ts:102-273`, `lib/directory/actions.ts:80-268`).
- Awards/accomplishments already exist in `professional_achievements` with a public flag (`lib/db/schema/schema.ts:4972-5000`, `lib/professional/actions.ts:46-116`).
- Portfolio proof already exists through public event photos, but the public chef page does not render it (`lib/events/photo-actions.ts:667-709`, `components/portfolio/portfolio-showcase.tsx:26-227`, `app/(public)/chef/[slug]/page.tsx:152-609`).
- Charity hours and summary logic already exist, but public rendering does not, and the current page is admin-gated (`lib/charity/hours-actions.ts:50-232`, `app/(chef)/charity/hours/page.tsx:18-21`).
- `chef_documents` can hold a private resume asset, but there is no dedicated resume UX yet (`lib/db/schema/schema.ts:23878-23965`, `components/import/smart-import-hub.tsx:353-390`, `lib/documents/import-actions.ts:14-46`).

---

## Files to Create

| File                                                                        | Purpose                                                                                                                          |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/<next_timestamp>_public_chef_credentials_showcase.sql` | Adds structured work-history storage plus small chef-profile charity/resume fields                                               |
| `lib/credentials/actions.ts`                                                | Internal and public server actions for work history, public credentials reads, charity-profile settings, and private resume slot |
| `app/(chef)/settings/credentials/page.tsx`                                  | New chef settings page for public credentials management                                                                         |
| `components/credentials/work-history-editor.tsx`                            | Chef-side editor for work-history timeline entries                                                                               |
| `components/credentials/private-resume-card.tsx`                            | Chef-side upload/manage UI for a private resume asset                                                                            |
| `components/public/chef-credentials-panel.tsx`                              | Public renderer for work history, achievements, portfolio proof, charity impact, and optional resume-available note              |

---

## Files to Modify

| File                                                            | What to Change                                                                                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/db/schema/schema.ts`                                       | Add generated schema for `chef_work_history_entries` and new `chefs` columns after migration                                                    |
| `lib/profile/actions.ts`                                        | Expose new chef-level public fields (`public_charity_percent`, `public_charity_note`, `show_resume_available_note`) in `getPublicChefProfile()` |
| `lib/professional/actions.ts`                                   | Add a public read helper for public achievements without `requireChef()` / `requirePro()`                                                       |
| `lib/charity/hours-actions.ts`                                  | Add a public summary read helper by chef/tenant ID                                                                                              |
| `app/(public)/chef/[slug]/page.tsx`                             | Fetch credentials data and render `ChefCredentialsPanel` on the public chef profile                                                             |
| `app/(public)/chef/[slug]/inquire/page.tsx`                     | Add credentials context into the inquiry experience after the proof/booking shell from the dependency spec is in place                          |
| `app/(chef)/settings/client-preview/page.tsx`                   | Fetch credentials data for preview parity                                                                                                       |
| `app/(chef)/settings/client-preview/public-profile-preview.tsx` | Render the new credentials section in preview                                                                                                   |
| `app/(chef)/settings/page.tsx`                                  | Add navigation entry for the new Credentials settings page                                                                                      |

---

## Database Changes

### New Tables

```sql
CREATE TABLE chef_work_history_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  organization_name text NOT NULL,
  location_label text,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  summary text,
  notable_credits text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chef_work_history_entries_date_order_check
    CHECK (
      start_date IS NULL
      OR end_date IS NULL
      OR end_date >= start_date
    )
);

CREATE INDEX idx_chef_work_history_entries_chef_order
  ON chef_work_history_entries (chef_id, display_order, start_date DESC);

ALTER TABLE chef_work_history_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_work_history_entries_chef_all
  ON chef_work_history_entries
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

CREATE POLICY chef_work_history_entries_public_select
  ON chef_work_history_entries
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_public = true);
```

### New Columns on Existing Tables

```sql
ALTER TABLE chefs
  ADD COLUMN public_charity_percent numeric(5,2),
  ADD COLUMN public_charity_note text,
  ADD COLUMN show_resume_available_note boolean NOT NULL DEFAULT false;

ALTER TABLE chefs
  ADD CONSTRAINT chefs_public_charity_percent_range_check
  CHECK (
    public_charity_percent IS NULL
    OR (
      public_charity_percent >= 0
      AND public_charity_percent <= 100
    )
  );
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/` before creation.
- All changes are additive. No table or column removal is part of this feature.
- Do not add a new resume table. Use existing `chef_documents` for the private resume slot.

---

## Data Model

### `chef_work_history_entries`

This is the missing public-CV primitive. Each row represents one visible career step for a chef.

- `role_title`: chef-entered role label shown publicly.
- `organization_name`: restaurant, venue group, company, or private operation.
- `location_label`: optional city/state or market label.
- `start_date`, `end_date`, `is_current`: drives the career timeline.
- `summary`: short public narrative about the role.
- `notable_credits`: plain-text public-safe callouts such as "Cooked for [public figure]" or "Collaborated with [chef name]". This intentionally stays simple and chef-authored so the system does not infer or verify NDA-sensitive claims.
- `display_order`: manual ordering to keep the public story intentional.
- `is_public`: allows draft/private rows.

### `professional_achievements`

This remains the source of truth for awards, press features, certifications, speaking, courses, books, and similar accomplishments (`lib/db/schema/schema.ts:4972-5000`). Public rendering must use rows where `is_public = true`.

### `charity_hours` plus new chef-level charity fields

- `charity_hours` remains the source of measurable impact such as total hours, unique organizations, and verified 501(c) partners (`lib/db/schema/schema.ts:6612-6639`, `lib/charity/hours-actions.ts:201-232`).
- `chefs.public_charity_percent` and `chefs.public_charity_note` add the missing narrative layer for "I donate X percent" and similar public-impact statements.

### Private resume slot

- The actual resume asset lives in `chef_documents` (`lib/db/schema/schema.ts:23878-23965`).
- The feature uses a single dedicated document tagged `resume_private`.
- Public pages never link to that file directly.
- The only public exposure in v1 is an optional text note such as "Resume available upon request", shown only when a resume exists and `chefs.show_resume_available_note = true`.

---

## Server Actions

| Action                                 | Auth             | Input                                                                                                                                                | Output                                                                                               | Side Effects                                                                          |
| -------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `listWorkHistoryEntries()`             | `requireChef()`  | none                                                                                                                                                 | `ChefWorkHistoryEntry[]` for current chef                                                            | none                                                                                  |
| `saveWorkHistoryEntry(input)`          | `requireChef()`  | `{ id?, roleTitle, organizationName, locationLabel?, startDate?, endDate?, isCurrent, summary?, notableCredits: string[], isPublic, displayOrder? }` | `{ success: boolean, entry?: ChefWorkHistoryEntry, error?: string }`                                 | Revalidates `/settings/credentials`, `/settings/client-preview`, `/chef/[slug]`       |
| `deleteWorkHistoryEntry(id)`           | `requireChef()`  | `id: string`                                                                                                                                         | `{ success: boolean, error?: string }`                                                               | Revalidates same public/profile paths                                                 |
| `reorderWorkHistoryEntries(ids)`       | `requireChef()`  | `string[]`                                                                                                                                           | `{ success: boolean, error?: string }`                                                               | Revalidates same public/profile paths                                                 |
| `getPublicWorkHistory(chefId)`         | none, admin read | `chefId: string`                                                                                                                                     | public `chef_work_history_entries` rows ordered for display                                          | none                                                                                  |
| `getPublicAchievements(chefId)`        | none, admin read | `chefId: string`                                                                                                                                     | public achievements only                                                                             | none                                                                                  |
| `getPublicCharityImpact(chefId)`       | none, admin read | `chefId: string`                                                                                                                                     | `{ totalHours, totalEntries, uniqueOrgs, verified501cOrgs }` plus optional note/percent from `chefs` | none                                                                                  |
| `getPrivateResumeStatus()`             | `requireChef()`  | none                                                                                                                                                 | `{ hasResume: boolean, filename?: string, updatedAt?: string }`                                      | none                                                                                  |
| `savePrivateResume(formData)`          | `requireChef()`  | PDF/DOC/DOCX file upload                                                                                                                             | `{ success: boolean, filename: string }`                                                             | Uploads to storage, upserts `chef_documents` resume row, revalidates settings/preview |
| `deletePrivateResume()`                | `requireChef()`  | none                                                                                                                                                 | `{ success: boolean }`                                                                               | Deletes or archives existing resume doc, revalidates settings/preview                 |
| `updatePublicCredentialProfile(input)` | `requireChef()`  | `{ publicCharityPercent?, publicCharityNote?, showResumeAvailableNote }`                                                                             | `{ success: boolean }`                                                                               | Revalidates public profile, inquiry, preview                                          |

### Notes

- Public credential reads must use admin/no-auth safe reads similar to `getPublicChefProfile()` and `getPublicChefReviewFeed()` (`lib/profile/actions.ts:102-273`, `lib/reviews/public-actions.ts:89-271`).
- Do not add public write actions.
- Do not retrofit public reads into the existing `listAchievements()` chef-only action because it requires `requireChef()` and `requirePro('professional')` (`lib/professional/actions.ts:100-116`).

---

## UI / Component Spec

### Page Layout

#### A. Chef Settings -> Credentials

Create a new settings page focused on the professional-story layer.

Sections, in order:

1. **Career Timeline**
   - Work-history editor with reorder support.
   - Each card shows role, organization, dates, location, summary, notable credits, and public toggle.
2. **Awards & Accomplishments**
   - Do not duplicate achievement CRUD here.
   - Show a short explanation and link to `/settings/professional` because that system already owns achievements.
3. **Community Impact**
   - Inputs for optional public charity percent and public charity note.
   - Read-only summary of current logged charity hours if any.
4. **Private Resume**
   - Dedicated upload slot for one private resume asset.
   - Show filename, last-updated time, replace action, delete action.
   - Checkbox for "Show 'resume available upon request' on public profile" only if a resume exists.

#### B. Public Chef Profile

Render a new `ChefCredentialsPanel` below the hero/proof block and above partners/reviews if any credential data exists.

Section order:

1. **Career Highlights**
   - Vertical timeline or stacked cards from public work-history entries.
   - Each item shows role, organization, date range, location, summary.
   - Notable credits render as small chips or short bullet callouts under the entry.
2. **Awards & Accomplishments**
   - Use public achievements grouped by type/date.
   - Do not show private achievements.
3. **Portfolio Proof**
   - Reuse `PortfolioShowcase` with public portfolio photos.
   - Only render if `getPublicPortfolio()` returns rows.
4. **Community Impact**
   - Show public charity percent/note if set.
   - Show logged charity summary only when totals are non-zero.
5. **Resume Availability**
   - Show one sentence only if a private resume exists and `show_resume_available_note` is true.
   - No download button.

#### C. Public Inquiry Page

After the dependency spec lands, add a compact version of `ChefCredentialsPanel` into the inquiry context area. The inquiry page should show a short career/impact snapshot, not the full portfolio grid.

### States

- **Loading:** Server-rendered page behaves as it does today. New credentials section does not show loading skeletons on the public page.
- **Empty:** If no public work history, no public achievements, no public portfolio, no public charity data, and no resume note exist, omit `ChefCredentialsPanel` entirely.
- **Error:** If one credentials source fails, log the error server-side and render the rest of the profile. Never render fake counts or placeholder achievements.
- **Populated:** Render only the subsections that have real data.

### Interactions

- Work-history editing is optimistic only for local list ordering. Create/update/delete failures must restore the last server-backed state and show an error toast.
- Resume upload must validate file type and size before storage write.
- Replacing a resume must keep the old file until the new upload and document upsert succeed.
- Public profile and preview must update after any credential save via path revalidation.

---

## Edge Cases and Error Handling

| Scenario                                                            | Correct Behavior                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Chef has achievements but no work history                           | Render achievements section only                                                         |
| Chef has work history but no achievements                           | Render timeline only                                                                     |
| Charity hours total is zero but charity note exists                 | Show note/percent, hide empty hour stats                                                 |
| Resume exists but public note toggle is off                         | Keep resume completely invisible on public pages                                         |
| Resume note toggle is on but no resume file exists                  | Save should fail validation and instruct chef to upload a resume first                   |
| Work-history entry has `is_current = true` and `end_date` populated | Save should reject or clear `end_date` based on validation rule chosen in implementation |
| Public credentials subquery fails                                   | Log error, omit that subsection, do not fail the entire chef profile page                |
| Chef lists NDA-sensitive notable credits privately                  | Keep them non-public until explicitly marked public                                      |

---

## Verification Steps

1. Create one chef with a discoverable public profile and at least one review so the base profile still renders.
2. Add two work-history entries from `/settings/credentials`, one current and one historical, each with at least one notable credit.
3. Add two public achievements from `/settings/professional`.
4. Upload at least one public portfolio photo through the existing event-photo portfolio path.
5. Log charity hours and set a public charity percent/note.
6. Upload a private resume and enable the public resume-available note.
7. Open `/chef/[slug]` and verify the new credentials section renders in the expected order without exposing the resume file.
8. Open `/settings/client-preview` and verify the credentials section matches the public profile.
9. Open `/chef/[slug]/inquire` after the dependency spec is present and verify the compact credentials context renders correctly.
10. Turn off each source one at a time and verify the section disappears cleanly instead of showing fake empty placeholders.

---

## Out of Scope

- Public resume download or self-serve resume request workflow.
- Any automated verification or scraping of notable clients/collaborators.
- Replacing the existing review system.
- Rebuilding `profile_highlights` taxonomy.
- Homepage featured-chef card redesign beyond whatever already ships in `featured-chef-public-proof-and-booking.md`.

---

## Notes for Builder Agent

- Keep the public profile elegant. This is a credentials story, not a database dump.
- Do not merge work history into `profile_highlights`. That table is the wrong shape and taxonomy for this feature (`lib/db/schema/schema.ts:8143-8164`, `components/portfolio/highlight-editor.tsx:18-333`).
- Reuse `PortfolioShowcase` instead of inventing a second public gallery (`components/portfolio/portfolio-showcase.tsx:26-227`).
- Reuse `chef_documents` for the private resume slot instead of creating a new file table (`lib/db/schema/schema.ts:23878-23965`).
- Public achievements and public charity summary need new read helpers because the existing actions are chef-authenticated (`lib/professional/actions.ts:100-116`, `lib/charity/hours-actions.ts:135-232`).

---

## Spec Validation

### 1. What exists today that this touches?

- Public routes: homepage featured-chef cards in `app/(public)/page.tsx:164-287`, public chef page in `app/(public)/chef/[slug]/page.tsx:152-609`, public inquiry page in `app/(public)/chef/[slug]/inquire/page.tsx:30-94`.
- Public-profile server data: `lib/profile/actions.ts:102-273`.
- Directory/homepage data: `lib/directory/actions.ts:80-268`.
- Chef profile settings: `lib/chef/profile-actions.ts:68-223`, `app/(chef)/settings/my-profile/chef-profile-form.tsx:20-420`.
- Settings navigation and preview surfaces: `app/(chef)/settings/page.tsx:665-719`, `app/(chef)/settings/client-preview/page.tsx:13-33`, `app/(chef)/settings/client-preview/public-profile-preview.tsx:67-298`.
- Achievements: `lib/db/schema/schema.ts:4972-5000`, `lib/professional/actions.ts:46-116`, `app/(chef)/settings/professional/page.tsx:16-34`.
- Portfolio/highlights: `lib/db/schema/schema.ts:8118-8164`, `lib/portfolio/actions.ts:51-169`, `lib/portfolio/highlight-actions.ts:55-216`, `components/portfolio/portfolio-showcase.tsx:26-227`.
- Charity: `lib/db/schema/schema.ts:6612-6639`, `lib/charity/hours-actions.ts:50-232`, `app/(chef)/charity/hours/page.tsx:18-21`.
- Private documents: `lib/db/schema/schema.ts:23878-23965`, `lib/documents/import-actions.ts:14-46`, `lib/documents/link-actions.ts:24-152`, `lib/documents/search-actions.ts:56-217`.

### 2. What exactly changes?

- Add one new table: `chef_work_history_entries`.
- Add three columns on `chefs`: `public_charity_percent`, `public_charity_note`, `show_resume_available_note`.
- Add one new credentials action module for public reads plus chef-side work-history/resume settings.
- Modify public chef profile and inquiry pages to render credentials.
- Modify client preview to include credentials.
- Modify settings nav and add a new credentials settings page.
- Add public read helpers for achievements and charity summary.

### 3. What assumptions are you making?

- **Verified:** Public pages already have enough room to add another section without changing routing (`app/(public)/chef/[slug]/page.tsx:152-609`).
- **Verified:** `chef_documents` can store a private resume file and metadata because the schema already includes storage/file columns (`lib/db/schema/schema.ts:23897-23903`).
- **Verified:** The current path into `chef_documents` is import-driven, not a resume-specific UX (`components/import/smart-import-hub.tsx:353-390`, `lib/documents/import-actions.ts:14-46`).
- **Verified:** `profile_highlights` is the wrong taxonomy for work history (`lib/db/schema/schema.ts:8143-8164`, `components/portfolio/highlight-editor.tsx:18-333`).
- **Unverified but explicitly resolved by this spec:** Whether credentials management should be Pro-gated. This spec intentionally treats credentials as core public-profile functionality and does not add a billing gate.

### 4. Where will this most likely break?

1. Public profile composition: the page already pulls multiple independent data sources, so adding more reads can create partial-failure or performance issues if not wrapped carefully (`app/(public)/chef/[slug]/page.tsx:160-163`, `lib/profile/actions.ts:155-216`).
2. Resume storage semantics: `chef_documents` is generic, so careless implementation could create duplicate resume rows or expose the file publicly by mistake (`lib/db/schema/schema.ts:23878-23965`).
3. Preview parity: the current preview is a partial inline recreation of the public page, not a shared renderer, so it can drift unless the new credentials panel is reusable in both places (`app/(chef)/settings/client-preview/public-profile-preview.tsx:67-298`).

### 5. What is underspecified?

- The exact visual style of the career timeline. Builder should keep it clean and editorial, not dashboard-like.
- Resume upload constraints. Builder should limit to PDF/DOC/DOCX and set an explicit file-size cap during implementation.
- Whether public charity summary should show exact hour counts or rounded labels when data is small. This spec allows exact counts.

### 6. What dependencies or prerequisites exist?

- This spec depends on `featured-chef-public-proof-and-booking.md` because both features touch the public chef profile, inquiry page, and preview.
- Migration must run before generated schema updates in `lib/db/schema/schema.ts`.
- Public resume storage needs an existing storage bucket strategy consistent with the project's other file-upload flows.

### 7. What existing logic could this conflict with?

- `featured-chef-public-proof-and-booking.md` touches the same public routes and preview surface.
- `professional_achievements` management already exists and is Pro-gated (`lib/professional/actions.ts:47-48,65-66,86-87,101-102`).
- `profile_highlights` may look superficially similar but should not be reused (`lib/portfolio/highlight-actions.ts:14-40`).
- Charity UI is currently admin-gated despite chef-owned data, so do not accidentally tie public reads to that route-level gate (`app/(chef)/charity/hours/page.tsx:18-21`).

### 8. What is the end-to-end data flow?

1. Chef opens `/settings/credentials`.
2. Chef creates work-history entries, sets charity note/percent, and uploads a private resume.
3. Server actions write to `chef_work_history_entries`, `chefs`, and `chef_documents`.
4. Actions revalidate public profile, inquiry page, and preview.
5. Public chef page loads `getPublicChefProfile(slug)` plus new public credential reads by `chef.id`.
6. `ChefCredentialsPanel` renders only the public-safe data.

### 9. What is the correct implementation order?

1. Create and run the migration.
2. Regenerate schema/types if the repo workflow requires it.
3. Build `lib/credentials/actions.ts` and the public achievement/charity helpers.
4. Build the chef settings UI for work history, charity note/percent, and private resume.
5. Add the public `ChefCredentialsPanel`.
6. Wire it into the public profile, inquiry context, and client preview.
7. Verify with real public/profile data end to end.

### 10. What are the exact success criteria?

- A chef can manage public work-history entries from settings.
- Public achievements render from existing `professional_achievements` without duplicating the system.
- Public portfolio proof renders from existing public event-photo portfolio.
- Public charity section can show both logged hours summary and optional percent/note.
- A private resume can be uploaded, replaced, and removed without public file exposure.
- Public pages can optionally show "resume available upon request" and nothing more.
- Client preview matches the live public credentials section.

### 11. What are the non-negotiable constraints?

- Tenant scoping on all new writes must follow chef ownership rules.
- Public data must only show rows/fields explicitly intended for public display.
- No public resume file link.
- No automated extraction of notable credits from private data.
- No fake empty stats or placeholder accomplishments.

### 12. What should NOT be touched?

- Do not rewrite `getPublicChefReviewFeed()` or replace its source-of-truth role (`lib/reviews/public-actions.ts:89-271`).
- Do not migrate `profile_highlights` into a CV system (`lib/db/schema/schema.ts:8143-8164`).
- Do not redesign the homepage directory card in this spec.
- Do not alter inquiry submission semantics in `submitPublicInquiry()`; this feature is profile-context work, not form-business-logic work.

### 13. Is this the simplest complete version?

Yes. It adds only one new structured content model for work history, reuses existing achievements/portfolio/charity/documents systems, and keeps the resume private instead of inventing a bigger request/share workflow.

### 14. If implemented exactly as written, what would still be wrong?

- The public profile still would not support a true selective-sharing workflow for sending the private resume to an interested client. V1 only stores it privately and optionally advertises availability.
- The system still would not verify or legally review notable namedrops. That remains chef-authored public content and must stay explicitly opt-in.

### Builder Risk Check

What would a builder get wrong building this as written?

- They may try to use `profile_highlights` for work history because it already sounds like public profile content. That would be incorrect because the taxonomy and editor shape are wrong (`lib/db/schema/schema.ts:8143-8164`, `components/portfolio/highlight-editor.tsx:18-333`).
- They may assume `chef_documents` already has a resume upload UX. It does not; the table exists, but the visible flow is import-oriented (`components/import/smart-import-hub.tsx:353-390`, `lib/documents/import-actions.ts:14-46`).
- They may wire public charity reads through the admin-gated page instead of through a new public-safe summary helper (`app/(chef)/charity/hours/page.tsx:18-21`, `lib/charity/hours-actions.ts:201-232`).

Is anything assumed but not verified?

- The only intentional product choice not verified by code is billing posture for the new credentials settings page. This spec chooses not to add a billing gate.

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

This spec is production-ready for the defined v1 scope.

The remaining uncertainty is not technical correctness; it is product expansion beyond v1. Specifically: whether the team later wants a true resume-request workflow or legal review for namedrops. Those are intentionally kept out of this scope so the current feature stays complete and buildable.
