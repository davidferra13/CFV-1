# Professional Development Tracking

## What Changed

Added structured tracking for professional achievements (competitions, stages, press features, awards, courses, speaking) and learning goals with target dates and completion status.

## Why

Private chefs invest constantly in their professional growth — stages at Michelin restaurants, entering competitions, getting press coverage, taking pastry courses. Before this change, that history lived nowhere in the system. Achievements marked as public can now appear on the chef's public profile page, turning the platform into a lightweight professional portfolio alongside the booking tools.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000018_professional_development.sql`

**`professional_achievements`**

- `achieve_type` enum: competition, stage, trail, press_feature, award, speaking, certification, course, book, podcast, other
- `title`, `organization`, `achieve_date DATE`
- `description`, `outcome` (e.g. "1st place", "Published in Food & Wine")
- `url`, `image_url`
- `is_public BOOLEAN DEFAULT false` — controls public profile visibility
- RLS includes a public policy: `WHERE is_public = true` — accessible without auth for profile pages

**`learning_goals`**

- `title`, `description`, `target_date DATE`
- `category` enum: technique, cuisine, business, sustainability, pastry, beverage, nutrition, other
- `status` enum: active, completed, abandoned
- `completed_at TIMESTAMPTZ`, `notes` (reflection on completion)

### Server Actions

**File:** `lib/professional/actions.ts`

**Achievements:**
| Action | What |
|--------|------|
| `createAchievement(input)` | Log a new achievement |
| `updateAchievement(id, input)` | Edit details |
| `deleteAchievement(id)` | Remove |
| `listAchievements(publicOnly?)` | All achievements or public-only subset |

**Learning Goals:**
| Action | What |
|--------|------|
| `createLearningGoal(input)` | Add a new goal |
| `updateLearningGoal(id, input)` | Edit goal details or status |
| `completeLearningGoal(id, notes?)` | Mark complete with optional reflection |
| `deleteLearningGoal(id)` | Remove |
| `listLearningGoals(status?)` | Filter by active/completed/abandoned |

Exports `ACHIEVE_TYPE_LABELS`, `GOAL_CATEGORY_LABELS`.

### UI

- **`app/(chef)/settings/professional/page.tsx`** — Two-tab page: Achievements / Learning Goals
- **`app/(chef)/settings/professional/professional-development-client.tsx`** — Full client component with tabbed UI, inline add forms for both achievements and goals, complete button, delete actions

## Public Profile Integration

Achievements with `is_public = true` are intended to appear on the public chef profile page (`/chef/[slug]`). The Supabase RLS policy `pa_public_select` allows unauthenticated reads of public achievements, making them safe to surface on the public page without any auth overhead.

## Future Considerations

- Chronological visual career timeline on public profile
- Achievement image gallery (stages, competition photos)
- Learning goal reminders (X days before target date)
- Export portfolio PDF for new client pitches
