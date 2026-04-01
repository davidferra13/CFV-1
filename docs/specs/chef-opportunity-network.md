# Spec: Chef Opportunity Network

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-7 files)

## Timeline

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-03-31 20:30 | Planner (Opus 4.6) |        |
| Status: ready         | 2026-03-31 20:30 | Planner (Opus 4.6) |        |
| Claimed (in-progress) |                  |                    |        |
| Spike completed       |                  |                    |        |
| Pre-flight passed     |                  |                    |        |
| Build completed       |                  |                    |        |
| Type check passed     |                  |                    |        |
| Build check passed    |                  |                    |        |
| Playwright verified   |                  |                    |        |
| Status: verified      |                  |                    |        |

---

## Developer Notes

### Raw Signal

The developer received a voice message from a chef friend (first real external beta tester) who is excited to try ChefFlow. Her exact words, cleaned up:

> "I'm so excited to get a sense of the app. Really interested to see what you've built. Love to see all your inquiries, that's amazing. Happy spring to the seasonal businesses like us. Spring is good, it's gonna be a pretty good steady season. I'm hiring for a sous chef and a kitchen manager, if you know anybody. I'm telling all of my chef friends. If you know of anybody in my region that's looking for a fun creative gig and also the management aspect, I'm on the hunt."

The developer wants to use her real needs to validate and extend the platform. She represents a common archetype: a chef who hires through word-of-mouth, thinks of hiring as a community activity ("if you know anybody"), frames roles by culture ("fun creative gig") not just job title, and is regional/seasonal.

### Developer Intent

- **Core goal:** A chef can post structured hiring opportunities in the network feed, and local chefs can discover and respond to them. Build on what exists (social feed, connections, staff roster), don't create a separate job board.
- **Key constraints:** Must feel like community word-of-mouth, not a corporate job listing site. Must integrate into the existing network feed, not a separate tab or board. No ATS, no resumes, no applicant tracking.
- **Motivation:** First real external user with concrete unmet needs. Her use case (hiring through chef network, regional discovery) is exactly what the community features should enable but currently can't.
- **Success from the developer's perspective:** This friend signs up, posts "I'm hiring a sous chef and kitchen manager in [her region]," and chefs nearby find it and express interest.

---

## What This Does (Plain English)

A chef can create a structured "opportunity" post in the network feed that includes a role title, location, compensation range, and duration type. These posts appear in the normal feed but with a distinct visual treatment (role badge, location pin, compensation range, "I'm Interested" button). Other chefs can browse opportunities, filter the feed to show only opportunities, and express interest with an optional message. The posting chef sees who's interested and can connect with them. Separately, chef search now supports filtering by city/state so chefs can find other chefs in their region.

---

## Why It Matters

The first real external user's top need (hiring through her chef network) maps to a gap: the social feed has no structured hiring format, and chef search has no location filtering. Closing these two gaps turns ChefFlow's community features from "social media for chefs" into "how chefs actually find each other for work."

---

## Files to Create

| File                                                        | Purpose                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `database/migrations/20260401000150_chef_opportunities.sql` | Add kitchen_manager role, opportunity post support, interest tracking                  |
| `lib/network/opportunity-actions.ts`                        | Server actions for creating opportunity posts, expressing interest, managing responses |

---

## Files to Modify

| File                                         | What to Change                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/network/actions.ts`                     | Add city/state filter params to `searchChefs()` (lines 358-439). Add WHERE clauses for `home_city` and `home_state` on `chef_preferences`.                                                     |
| `lib/social/chef-social-actions.ts`          | Add `'opportunity'` to PostType union (line 32). Add opportunity fields to CreatePostSchema (lines 675-695). Wire opportunity detail insert inside `createSocialPost()` (line 697+).           |
| `components/social/social-post-composer.tsx` | Add "opportunity mode" toggle. When active, show structured fields: role title, location (city/state), compensation range, duration type. These fields populate the opportunity detail record. |
| `app/(chef)/network/page.tsx`                | Add "Opportunities" filter to the feed tab. Show opportunity posts with distinct card layout (role badge, location, comp range, "I'm Interested" button).                                      |
| `app/(chef)/network/chef-search.tsx`         | Add city/state filter inputs to the search UI. Pass new params to `searchChefs()`.                                                                                                             |

---

## Database Changes

### New Enum Value on Existing Type

```sql
-- Add kitchen_manager to staff_role enum
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'kitchen_manager';
```

### New Tables

```sql
-- Structured data for opportunity posts (linked to chef_social_posts)
CREATE TABLE chef_opportunity_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL,                -- Free text: "Sous Chef", "Kitchen Manager", etc.
  location_city TEXT,                      -- e.g. "Haverhill"
  location_state TEXT,                     -- e.g. "MA"
  compensation_type TEXT NOT NULL DEFAULT 'negotiable'
    CHECK (compensation_type IN ('hourly', 'salary', 'day_rate', 'negotiable')),
  compensation_low_cents INTEGER,          -- Nullable: floor of range
  compensation_high_cents INTEGER,         -- Nullable: ceiling of range
  duration_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (duration_type IN ('permanent', 'seasonal', 'per_event', 'contract')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'filled', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunity_posts_chef ON chef_opportunity_posts(chef_id);
CREATE INDEX idx_opportunity_posts_status ON chef_opportunity_posts(status);
CREATE INDEX idx_opportunity_posts_location ON chef_opportunity_posts(location_state, status);

-- Interest expressions on opportunity posts
CREATE TABLE chef_opportunity_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES chef_opportunity_posts(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  message TEXT,                            -- Optional intro message
  status TEXT NOT NULL DEFAULT 'expressed'
    CHECK (status IN ('expressed', 'viewed', 'connected', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, chef_id)          -- One interest per chef per opportunity
);

CREATE INDEX idx_opportunity_interests_opp ON chef_opportunity_interests(opportunity_id);
CREATE INDEX idx_opportunity_interests_chef ON chef_opportunity_interests(chef_id);
```

### Migration Notes

- Migration filename: `20260401000150_chef_opportunities.sql` (checked: highest existing is `20260401000149_add_missing_chains.sql`)
- All changes are additive. No DROP, DELETE, or ALTER on existing columns.
- `ALTER TYPE ... ADD VALUE` cannot run inside a transaction in PostgreSQL. This statement must be the first in the file, before `BEGIN`/`COMMIT` if any.

---

## Data Model

**chef_opportunity_posts** - Structured metadata for a social post with `post_type = 'opportunity'`. One-to-one with `chef_social_posts`. The social post holds the free-text description, visibility, channel, media, reactions, and comments. The opportunity record holds the structured fields (role, location, compensation, duration, status).

**chef_opportunity_interests** - An expression of interest from one chef to another's opportunity. Unique per chef-opportunity pair. Status tracks the lifecycle: expressed (chef clicked "I'm Interested") -> viewed (posting chef saw it) -> connected (posting chef accepted, they're now in touch) -> declined (posting chef passed).

**Relationships:**

- `chef_social_posts` 1:1 `chef_opportunity_posts` (via post_id FK)
- `chef_opportunity_posts` 1:N `chef_opportunity_interests` (via opportunity_id FK)
- Interest creates a natural bridge to the existing connections/collab spaces system for follow-up conversation

---

## Server Actions

| Action                                   | Auth            | Input                                                                                                                                                                                  | Output                         | Side Effects                                                                                                  |
| ---------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `createOpportunityPost(input)`           | `requireChef()` | `{ content, role_title, location_city?, location_state?, compensation_type, compensation_low_cents?, compensation_high_cents?, duration_type, visibility?, channel_id?, media_urls? }` | `{ success, postId?, error? }` | Creates chef_social_posts row (post_type='opportunity') + chef_opportunity_posts row. Revalidates `/network`. |
| `expressInterest(input)`                 | `requireChef()` | `{ opportunityId, message? }`                                                                                                                                                          | `{ success, error? }`          | Inserts chef_opportunity_interests row. Sends notification to posting chef. Revalidates opportunity post.     |
| `updateInterestStatus(input)`            | `requireChef()` | `{ interestId, status: 'viewed' \| 'connected' \| 'declined' }`                                                                                                                        | `{ success, error? }`          | Updates interest status. If 'connected', optionally creates a collab space between the two chefs.             |
| `closeOpportunity(input)`                | `requireChef()` | `{ opportunityId, status: 'filled' \| 'closed' }`                                                                                                                                      | `{ success, error? }`          | Updates opportunity status. Post remains visible but shows "Filled"/"Closed" badge.                           |
| `getOpportunityInterests(opportunityId)` | `requireChef()` | `{ opportunityId }`                                                                                                                                                                    | `Interest[]`                   | Returns all interests for an opportunity. Only the posting chef can call this.                                |
| `getOpportunityFeed(filters?)`           | `requireChef()` | `{ state?, status? }`                                                                                                                                                                  | `OpportunityPost[]`            | Returns opportunity posts, optionally filtered by state and open status.                                      |

**Location-enhanced existing action:**

| Action                                           | Change                                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchChefs(input)` in `lib/network/actions.ts` | Add optional `city?: string` and `state?: string` to SearchChefsSchema. When provided, add `.ilike('home_city', city)` and/or `.eq('home_state', state)` to the chef_preferences join filter. |

---

## UI / Component Spec

### Post Composer Enhancement (social-post-composer.tsx)

Add an "Opportunity" toggle button (briefcase icon) next to the existing media/location/channel buttons. When active:

- Show structured fields below the content textarea:
  - **Role title** (text input, required) - placeholder: "e.g. Sous Chef, Kitchen Manager"
  - **Location** (city + state inputs) - auto-populated from chef's own profile if available
  - **Compensation** (type dropdown + optional range) - hourly/salary/day rate/negotiable. If not negotiable, show low/high cent inputs
  - **Duration** (radio or dropdown) - permanent/seasonal/per event/contract
- Content textarea placeholder changes to: "Describe the opportunity, your kitchen culture, what makes this gig great..."
- Post button label changes from "Post" to "Post Opportunity"

### Opportunity Post Card (in feed)

Distinct from regular posts. Same base card (avatar, name, timestamp, content, reactions, comments) plus:

- **Role badge** at top of content area (e.g. pill badge "Sous Chef")
- **Location line** with MapPin icon (e.g. "Haverhill, MA")
- **Compensation line** with DollarSign icon (e.g. "$25-35/hr" or "Negotiable")
- **Duration badge** (e.g. "Seasonal", "Permanent")
- **Status badge** if filled/closed (grayed out, "Filled" or "Closed")
- **"I'm Interested" button** (primary style) - only shows to other chefs, not the posting chef
- **Interest count** visible to posting chef (e.g. "3 chefs interested")

### Interest Management (for posting chef)

When a posting chef clicks their own opportunity post's interest count, show a dropdown/panel listing interested chefs:

- Chef name, avatar, location, optional message
- Action buttons: "Connect" (creates collab space), "Decline" (updates status)
- Interest status badges: "New", "Viewed", "Connected", "Declined"

### Chef Search Enhancement (chef-search.tsx)

Add below the existing name search input:

- **State dropdown** (US states, optional) - filters by `home_state`
- **City text input** (optional) - filters by `home_city` (ilike match)
- Clear filters link

### Feed Filter (network page)

Add an "Opportunities" pill/button to the feed tab's filter area. When active, the feed shows only posts with `post_type = 'opportunity'` and `status = 'open'`.

### States

- **Loading:** Skeleton cards (same as existing feed loading)
- **Empty (no opportunities):** "No open opportunities right now. Check back soon, or post your own!" with CTA button
- **Error:** "Could not load opportunities" (never fake zeros, per Zero Hallucination rule)
- **Populated:** Standard feed with opportunity-styled cards

---

## Edge Cases and Error Handling

| Scenario                                                                     | Correct Behavior                                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Chef expresses interest on their own posting                                 | Button not rendered (self-interest blocked in UI). Server action also rejects with error.                 |
| Chef expresses interest twice                                                | UNIQUE constraint prevents duplicate. Server action returns friendly "You've already expressed interest." |
| Opportunity is closed/filled, chef tries to express interest                 | Server action checks status, returns error. UI shows disabled state.                                      |
| Chef has no home_city/home_state set                                         | Location fields in search return no filter (show all). Opportunity post location is optional.             |
| Compensation fields: low > high                                              | Client-side validation prevents. Server action also validates.                                            |
| createOpportunityPost fails mid-way (post created, opportunity detail fails) | Wrap in transaction. Rollback both on failure.                                                            |
| Network post deleted by author                                               | CASCADE deletes opportunity_posts and interests. Clean.                                                   |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/network` (feed tab)
3. Click opportunity toggle in post composer
4. Fill in: role="Sous Chef", location="Haverhill, MA", compensation="hourly $25-35", duration="seasonal", content="Looking for a creative sous chef for spring season"
5. Post. Verify it appears in feed with role badge, location, compensation, duration
6. Click "Opportunities" filter. Verify only opportunity posts show
7. Sign in as a different user (or verify the "I'm Interested" button renders for non-authors)
8. Navigate to `/network` > Connections tab > search
9. Filter by state "MA". Verify results filtered by state
10. Filter by city "Haverhill". Verify results filtered
11. Clear filters. Verify all results return
12. Screenshot all states

---

## Out of Scope

- Applicant tracking system (ATS) - no pipeline stages, interview scheduling, etc.
- Resume/portfolio uploads
- Background checks or verification
- Job board as a separate page/tab (opportunities live in the feed)
- Notifications for "new opportunity in your area" (could be a follow-up spec)
- Onboarding flow changes (already solid)
- Changes to the staff portal
- External job board posting (Indeed, LinkedIn, etc.)

---

## Notes for Builder Agent

1. **`ALTER TYPE ... ADD VALUE` cannot be in a transaction.** The `kitchen_manager` enum addition must be the first statement in the migration, before any `BEGIN` block. See PostgreSQL docs on enum modification.

2. **Post type extension.** The `post_type` CHECK constraint on `chef_social_posts` (migration `20260304000005`, line 43-44) currently allows `text, photo, video, reel, poll, share`. You need to ALTER this constraint to add `'opportunity'`:

   ```sql
   ALTER TABLE chef_social_posts DROP CONSTRAINT IF EXISTS chef_social_posts_post_type_check;
   ALTER TABLE chef_social_posts ADD CONSTRAINT chef_social_posts_post_type_check
     CHECK (post_type IN ('text', 'photo', 'video', 'reel', 'poll', 'share', 'opportunity'));
   ```

3. **PostType in TypeScript.** Update the union type at `lib/social/chef-social-actions.ts:32` to include `'opportunity'`. Also update the `CreatePostSchema` z.enum at line 682.

4. **searchChefs location filter.** The `chef_preferences` join at `lib/network/actions.ts:376` already fetches `home_city` and `home_state`. You just need to add optional WHERE clauses. The compat shim supports `.ilike()` and `.eq()` on joined tables.

5. **Transaction safety for createOpportunityPost.** The social post and opportunity detail must be created atomically. Use `db.rpc` or a raw SQL transaction via the compat shim's `.from().insert()` pattern, then insert the opportunity detail in the same transaction.

6. **Do NOT touch** the staff roster pages, staff portal, onboarding flow, subcontracting system, or collab spaces (except the optional "create collab space on connect" in `updateInterestStatus`).

7. **Feed query.** When fetching feed posts, the existing `getFeedPosts()` in `chef-social-actions.ts` will naturally include opportunity posts. For the "Opportunities" filter, add an optional `post_type` filter parameter to the existing feed query.

8. **Interest notification.** Use the existing `chef_social_notifications` table pattern for notifying the posting chef when someone expresses interest. Type: `'opportunity_interest'` (add to notification type enum if needed).
