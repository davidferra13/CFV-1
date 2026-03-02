# Beta Survey System

Pre-beta and post-beta surveys built natively into ChefFlow for gathering product feedback and market/pricing validation from all beta participants.

## Architecture

**Hybrid schema:** Fixed columns for key metrics (NPS, satisfaction, would_pay, tech_comfort) for fast SQL aggregation, plus a JSONB `answers` column for flexible question/answer data that can change between beta rounds without migrations.

**Three tables:**

- `beta_survey_definitions` — survey templates with JSONB question definitions
- `beta_survey_responses` — all responses (auth users + external testers)
- `beta_survey_invites` — invite tokens for external testers

**Access model:** All tables use RLS with no public policies. All access goes through the admin/service role client. This matches the pattern used by `beta_signups`.

## Surveys

### Pre-Beta (slug: `pre-beta-v1`)

7 questions across 4 steps:

1. **About You** — role, how heard about ChefFlow
2. **Current Workflow** — tools used, pain points
3. **Expectations** — what they hope ChefFlow solves
4. **Tech & Pricing** — tech comfort (1-5), willingness to pay

### Post-Beta (slug: `post-beta-v1`)

12 questions across 4 steps:

1. **Overall Experience** — NPS (0-10), satisfaction (1-10)
2. **Feature Feedback** — features used, broken/confusing, missing
3. **Pricing** — would pay, price range, which features worth paying for
4. **Open Feedback** — recommend score, best/worst thing, one wish

## Access Paths

### Authenticated Users (chefs, clients)

- Chef portal: `/beta-survey` — requires `requireChef()`, auto-detects active survey
- Client portal: `/beta-survey` — requires `requireClient()`, same behavior
- Banner in both layouts prompts users to take the survey (dismissable for 24hrs)

### External Testers (no account needed)

- Public URL: `/beta-survey/{token}` — no auth, token validates the invite
- Admins create invite tokens from the admin dashboard
- Optional email notification sent with the invite link

### Admin Dashboard

- `/admin/beta-surveys` — list all surveys with response counts, toggle active/inactive
- `/admin/beta-surveys/{id}` — detailed results: NPS chart, stats, response table, invite management, CSV export

## Server Actions

| Action                                                     | Auth             | Location                     |
| ---------------------------------------------------------- | ---------------- | ---------------------------- |
| `getActiveSurvey(type)`                                    | Admin client     | `lib/beta-survey/actions.ts` |
| `getSurveyBySlug(slug)`                                    | Admin client     | `lib/beta-survey/actions.ts` |
| `getSurveyByInviteToken(token)`                            | Admin client     | `lib/beta-survey/actions.ts` |
| `submitBetaSurveyAuthenticated(slug, answers)`             | `requireAuth()`  | `lib/beta-survey/actions.ts` |
| `submitBetaSurveyPublic(token, answers, meta)`             | IP rate-limited  | `lib/beta-survey/actions.ts` |
| `getMyBetaSurveyStatus(type)`                              | `requireAuth()`  | `lib/beta-survey/actions.ts` |
| `getBetaSurveyResults(surveyId)`                           | `requireAdmin()` | `lib/beta-survey/actions.ts` |
| `getAllBetaSurveys()`                                      | `requireAdmin()` | `lib/beta-survey/actions.ts` |
| `createBetaSurveyInvites(surveyId, invites[], sendEmails)` | `requireAdmin()` | `lib/beta-survey/actions.ts` |
| `toggleBetaSurveyActive(surveyId, active)`                 | `requireAdmin()` | `lib/beta-survey/actions.ts` |
| `exportBetaSurveyResultsCsv(surveyId)`                     | `requireAdmin()` | `lib/beta-survey/actions.ts` |
| `getBetaSurveyInvites(surveyId)`                           | `requireAdmin()` | `lib/beta-survey/actions.ts` |

## Key Files

| File                                                        | Purpose                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `supabase/migrations/20260330000021_beta_survey_system.sql` | Migration (3 tables + seed)                                |
| `lib/beta-survey/survey-utils.ts`                           | Types, extractFixedColumns, computeStats, step definitions |
| `lib/beta-survey/actions.ts`                                | All server actions                                         |
| `components/ui/radio-group.tsx`                             | Reusable radio group                                       |
| `components/ui/rating-scale.tsx`                            | NPS (0-10) + star rating (1-5)                             |
| `components/ui/checkbox-group.tsx`                          | Multi-select checkboxes                                    |
| `components/beta-survey/beta-survey-form.tsx`               | Multi-step form renderer                                   |
| `components/beta-survey/beta-survey-banner.tsx`             | Dismissable banner (client component)                      |
| `components/beta-survey/beta-survey-banner-wrapper.tsx`     | Banner logic (server component)                            |
| `app/beta-survey/[token]/page.tsx`                          | Public survey page                                         |
| `app/(chef)/beta-survey/page.tsx`                           | Chef survey page                                           |
| `app/(client)/beta-survey/page.tsx`                         | Client survey page                                         |
| `app/(admin)/admin/beta-surveys/page.tsx`                   | Admin survey list                                          |
| `app/(admin)/admin/beta-surveys/[id]/page.tsx`              | Admin survey detail                                        |
| `lib/email/templates/beta-survey-invite.tsx`                | Invite email template                                      |

## Trigger Mechanism

The `BetaSurveyBannerWrapper` server component is rendered in both chef and client layouts (wrapped in `<Suspense fallback={null}>`). It checks for an active survey the user hasn't submitted and renders a dismissable banner linking to the survey page. The banner is non-blocking — if the check fails, nothing is shown.

For external testers, admins share invite links manually or via email from the admin dashboard.

## Adding New Surveys

To create a new round of surveys:

1. Insert a new row in `beta_survey_definitions` with a new slug (e.g., `post-beta-v2`)
2. Deactivate the old one and activate the new one (admin dashboard has a toggle button)
3. The banner will automatically pick up the new survey

No migration needed — the questions are stored in JSONB.
