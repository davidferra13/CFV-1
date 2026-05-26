# Everything Staff Never Need to Leave ChefFlow For

> **Purpose:** The inverse of `staff-exit-points-analysis.md`. Every workflow a staff
> member, contractor, sous chef, server, bartender, dishwasher, or kitchen assistant can
> complete inside ChefFlow from start to finish, no outside tool required.
>
> **Codebase grounding:** Staff auth is enforced by `requireStaff()` in
> `lib/auth/get-user.ts`, which resolves the staff record, tenant `chef_id`, and active
> status. Staff routes are registered in `STAFF_PROTECTED_PATHS` in
> `lib/auth/route-policy.ts`. The authenticated staff portal is `app/(staff)` with
> dashboard, tasks, time, station, recipes, and schedule. Token event briefings are
> backed by `lib/staff/staff-event-portal-actions.ts` and rendered through
> `components/staff/staff-event-view.tsx`.
>
> **Companion docs:**
>
> - `docs/research/staff-exit-points-analysis.md` (staff-side exit scenarios)
> - `docs/research/chef-never-leaves-analysis.md` (chef-side in-app workflows)
> - `docs/research/client-never-leaves-analysis.md` (client-side in-app workflows)
>
> **Date:** 2026-05-25

---

## Category 1: AUTHENTICATION, SHELL & ROLE CONTEXT

| #   | What Staff Do Entirely In-App                                                       |
| --- | ----------------------------------------------------------------------------------- |
| 1   | Sign in through `/staff-login` with email and password                              |
| 2   | Stay signed in with the staff login remember-me option                              |
| 3   | Land on `/staff-dashboard` after successful staff sign-in                           |
| 4   | Stay inside a staff-only portal guarded by `requireStaff()`                         |
| 5   | Get redirected away from staff routes when not authenticated as active staff        |
| 6   | Use staff top navigation for Dashboard, Tasks, Time, Station, Recipes, and Schedule |
| 7   | See the current staff name and email in the portal shell                            |
| 8   | Sign out from the staff navigation                                                  |
| 9   | Switch roles through the shared role switcher when the session has multiple roles   |
| 10  | Use skip-to-main-content accessibility navigation in the staff shell                |
| 11  | See staff portal report/help affordances through the global report button           |
| 12  | Keep staff portal presence active through the staff layout presence beacon          |

---

## Category 2: STAFF DASHBOARD & DAILY OVERVIEW

| #   | What Staff Do Entirely In-App                                       |
| --- | ------------------------------------------------------------------- |
| 13  | See a personalized dashboard greeting                               |
| 14  | View today's date in staff context                                  |
| 15  | Toggle the dashboard between Today and Tomorrow                     |
| 16  | See count of pending tasks for the selected day                     |
| 17  | See count of tasks completed for the selected day                   |
| 18  | See count of upcoming event assignments                             |
| 19  | See count of assigned stations                                      |
| 20  | Open today's task list from the dashboard                           |
| 21  | Complete or uncomplete a task directly from the dashboard checkbox  |
| 22  | See task due time from the dashboard                                |
| 23  | See task priority badges from the dashboard                         |
| 24  | See event context attached to a task                                |
| 25  | Open assigned station links from the dashboard                      |
| 26  | Open upcoming event assignments from the dashboard summary          |
| 27  | See scheduled hours and assignment status for upcoming events       |
| 28  | View staff-specific rail intelligence in the dashboard rail section |

---

## Category 3: TASK EXECUTION

| #   | What Staff Do Entirely In-App                                           |
| --- | ----------------------------------------------------------------------- |
| 29  | Open `/staff-tasks` to view all assigned work                           |
| 30  | See tasks grouped into To Do, In Progress, and Done                     |
| 31  | Start a pending task                                                    |
| 32  | Mark an in-progress task done                                           |
| 33  | Move an in-progress task back to To Do                                  |
| 34  | Reopen a done task                                                      |
| 35  | See task descriptions without leaving the staff portal                  |
| 36  | See event name and guest count context on task cards                    |
| 37  | See due date and due time on task cards                                 |
| 38  | See overdue task state                                                  |
| 39  | See task notes on task cards                                            |
| 40  | Get optimistic in-app task status updates with rollback if saving fails |

---

## Category 4: EVENT BRIEFING VIA TOKEN PORTAL

| #   | What Staff Do Entirely In-App                                                   |
| --- | ------------------------------------------------------------------------------- |
| 41  | Open a tokenized `/staff-portal/[id]` event briefing without a full staff login |
| 42  | See invalid, revoked, and expired token states in the portal                    |
| 43  | View event occasion and chef name from the staff briefing                       |
| 44  | See staff role for the event                                                    |
| 45  | See assigned station for the event                                              |
| 46  | View event date, serve time, arrival time, guest count, and service style       |
| 47  | Read special requests relevant to the event                                     |
| 48  | Read chef notes for the specific staff assignment                               |
| 49  | Read access instructions, location notes, kitchen notes, and site notes         |
| 50  | View collaborators also working the event                                       |
| 51  | Complete token-portal task checklist items                                      |
| 52  | See task completion progress in the token briefing                              |
| 53  | Submit event hours from the token briefing                                      |
| 54  | Add optional shift notes when submitting token-portal hours                     |
| 55  | Receive confirmation that token-portal hours were submitted                     |
| 56  | Hit rate-limited protection for abusive token access attempts                   |

---

## Category 5: SAFETY, DIETARY & EVENT RISK CONTEXT

| #   | What Staff Do Entirely In-App                                         |
| --- | --------------------------------------------------------------------- |
| 57  | See dietary alerts first in the token event briefing                  |
| 58  | See life-threatening allergies as explicit alert badges               |
| 59  | See dietary restrictions as warning badges                            |
| 60  | Keep dietary risk tied to the event rather than scattered in messages |
| 61  | Read kitchen notes before service                                     |
| 62  | Read site notes before service                                        |
| 63  | Read location notes before service                                    |
| 64  | Read access instructions before arrival                               |
| 65  | See assignment-specific notes without accessing chef-private data     |

---

## Category 6: SCHEDULE & ASSIGNMENT HISTORY

| #   | What Staff Do Entirely In-App                                             |
| --- | ------------------------------------------------------------------------- |
| 66  | Open `/staff-schedule` to view personal assignments                       |
| 67  | See upcoming assignments                                                  |
| 68  | See past assignments                                                      |
| 69  | See event date for each assignment                                        |
| 70  | See serve and departure times where available                             |
| 71  | See role override for an assignment                                       |
| 72  | See scheduled hours                                                       |
| 73  | See actual hours after they are recorded                                  |
| 74  | See assignment status such as scheduled, confirmed, completed, or no-show |
| 75  | See empty schedule state when no assignments exist                        |
| 76  | Review the most recent past assignments without asking the chef           |

---

## Category 7: TIME TRACKING

| #   | What Staff Do Entirely In-App                                                       |
| --- | ----------------------------------------------------------------------------------- |
| 77  | Open `/staff-time` as the dedicated staff time surface                              |
| 78  | Load a default staffing window for time tracking                                    |
| 79  | See time tracker data scoped to the logged-in staff member                          |
| 80  | Clock in for assigned events or prep shifts through the time tracker                |
| 81  | Clock out through the time tracker                                                  |
| 82  | Keep time tracker locked to the current staff member                                |
| 83  | Preserve time workflow even when the tracker data load falls back to an empty state |
| 84  | Use token event briefing to submit hours when working from a one-off event link     |

---

## Category 8: STATION WORK & SHIFT HANDOFF

| #   | What Staff Do Entirely In-App                                                                     |
| --- | ------------------------------------------------------------------------------------------------- |
| 85  | Open `/staff-station` to view assigned station work                                               |
| 86  | Select among assigned stations                                                                    |
| 87  | Change the station clipboard date                                                                 |
| 88  | See station component names                                                                       |
| 89  | See menu item context for station components                                                      |
| 90  | See par level and par unit for components                                                         |
| 91  | Update on-hand quantity                                                                           |
| 92  | See need-to-make values as read-only operational guidance                                         |
| 93  | See made quantity as read-only operational guidance                                               |
| 94  | Record waste quantity                                                                             |
| 95  | Select a waste reason such as expired, over-production, dropped, contamination, quality, or other |
| 96  | Add station notes                                                                                 |
| 97  | Save all changed station clipboard entries                                                        |
| 98  | See success or error feedback after saving clipboard changes                                      |
| 99  | See 86'd component state in the station clipboard                                                 |
| 100 | Check into an open, mid, or close station shift                                                   |
| 101 | See active shift state after refresh                                                              |
| 102 | Add handoff notes before shift checkout                                                           |
| 103 | Check out of an active station shift                                                              |

---

## Category 9: RECIPE ACCESS

| #   | What Staff Do Entirely In-App                                                 |
| --- | ----------------------------------------------------------------------------- |
| 104 | Open `/staff-recipes` to see staff-visible recipes                            |
| 105 | Browse all recipes visible to the staff member's tenant                       |
| 106 | Filter recipes by assigned station                                            |
| 107 | See recipe name                                                               |
| 108 | See recipe description                                                        |
| 109 | See serving count                                                             |
| 110 | See prep time                                                                 |
| 111 | See cook time                                                                 |
| 112 | Read recipe method text                                                       |
| 113 | See empty state when no recipes are available                                 |
| 114 | See empty state when no recipes are linked to a selected station              |
| 115 | Use recipes as read-only execution reference without risking accidental edits |

---

## Category 10: VERIFICATION & COVERAGE ALREADY PRESENT

| #   | What Is Proven Inside The Repo                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| 116 | `tests/product/12-staff-portal.spec.ts` verifies staff dashboard, recipes, schedule, tasks, time, and station pages load    |
| 117 | `tests/coverage/11-staff-routes.spec.ts` covers static staff route loading                                                  |
| 118 | `tests/unit/route-policy.client-staff-partner-coverage.test.ts` verifies static staff route policy coverage                 |
| 119 | `tests/diagnostic/03-staff-portal.spec.ts` covers staff login, staff dashboard, staff tasks, station, recipes, and schedule |
| 120 | `tests/system-integrity/q26-staff-tenant-scoping.spec.ts` checks staff tenant scoping                                       |
| 121 | `tests/system-integrity/q40-staff-action-auth.spec.ts` checks staff action auth completeness                                |
| 122 | Staff routes are discoverable through route inventory by role                                                               |
| 123 | Staff portal tour grounding is tested through the onboarding tour helper                                                    |
| 124 | Staff portal theme persistence is covered by interaction tests                                                              |
| 125 | `tests/interactions/21-staff-management.spec.ts` exercises chef-side staff management pages that feed staff portal data     |

---

## THE PATTERN: What Staff Can Already Do Without Leaving

### 1. EXECUTION IS STRONGEST

Staff can receive the day's work, see assignments, move tasks through status, check station state, log station quantities and waste, check in/out of station shifts, and submit hours.

- Dashboard overview (13-28)
- Task execution (29-40)
- Station clipboard and shift controls (85-103)
- Time tracking (77-84)

**Product read:** ChefFlow already covers the core "what do I do now?" staff loop.

### 2. EVENT CONTEXT IS STAFF-SAFE

The token event portal gives staff enough context to execute without exposing the whole chef tenant.

- Event details and role/station context (41-50)
- Dietary alerts and safety context (57-65)
- Token checklist and hours submission (51-56)

**Product read:** Staff can participate in an event without needing a full account, which is useful for contractors and one-off help.

### 3. REFERENCE IS READ-ONLY BY DESIGN

Staff can read recipes and station guidance without mutating chef IP or changing planning data.

- Staff recipes (104-115)
- Read-only station guidance for par, need-to-make, and made counts (90-93)

**Product read:** The portal protects the chef's source of truth while still exposing execution detail.

### 4. COVERAGE IS PRESENT AROUND THE STAFF SURFACE

The repo has route, product, diagnostic, interaction, and system-integrity coverage around the staff portal and the chef-side management surfaces that feed it.

- Staff portal page loading and onboarding grounding (116, 119, 123-124)
- Static route registration and route-policy coverage (117-118, 122)
- Staff tenant scoping and auth checks (120-121)
- Chef-side staff management coverage as upstream proof (125)

**Product read:** The staff-facing surface is intentionally narrower than the chef management console, but it has explicit tests around access, routing, and core page availability.

---

## PRIORITY RANKING (By In-App Completeness)

**Most complete staff workflows:**

1. Viewing daily task and assignment context
2. Moving task status from To Do to In Progress to Done
3. Reading event briefing and dietary alerts
4. Updating station clipboard quantities, waste, and notes
5. Checking in/out of station shifts
6. Reading assigned recipes and station recipes
7. Submitting hours from staff time or token briefing surfaces

**Strongest foundations to deepen next:**

1. Add staff-side comments/questions to the already-solid task workflow
2. Add staff-side availability and schedule-change requests to the existing schedule read model
3. Add attachment capture to station/event surfaces for photos, receipts, and evidence
4. Add staff-facing pay/time correction visibility on top of existing labor and payroll records
5. Make token event briefings downloadable or offline-friendly

**Staff product boundary:**

ChefFlow already lets staff execute assigned work, understand event risk, see their schedule, access recipes, and log time without leaving. The main remaining in-app opportunity is self-service communication and evidence capture, not broad replacement of maps, payroll rails, hardware, or external training systems.
