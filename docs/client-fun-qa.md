# Client Fun Q&A

## What It Is

An optional, zero-pressure personality questionnaire that lives at the bottom of the client's **My Profile** page. Clients answer as many or as few of the twelve questions as they like. The chef sees all submitted answers on their **Client Detail** page.

The feature exists for two reasons:

1. **Rebooking** — questions like `prove_yourself` and `dream_menu_theme` give chefs a natural, personalised hook for re-engagement.
2. **Personalisation** — knowing a client's vibe, dream dinner theme, and obsessed ingredient lets chefs design more resonant menus and conversations.

---

## Questions

| Key                   | Emoji | Question                                                                                                               |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| `time_travel_meal`    | ⏳    | If you could eat in any time period, what would you eat, with who, and where?                                          |
| `last_meal`           | 🥂    | Last meal on earth — what is it? (food + drink)                                                                        |
| `trash_food`          | 🍟    | What's your "trash food" that you love way too much?                                                                   |
| `sweet_or_savory`     | 🍫    | Sweet or savory — and what's the one thing that always wins you over?                                                  |
| `prove_yourself`      | 👨‍🍳    | If I could only cook you one dish to prove myself, what should it be?                                                  |
| `food_you_hate`       | 🤢    | What's a food you hate that everyone else seems to love?                                                               |
| `midnight_snack`      | 🌙    | What's the most "you" snack at 11pm?                                                                                   |
| `dinner_vibe`         | ✨    | Pick one: cozy dinner party, chaotic feast, or quiet two-person meal — what's your vibe?                               |
| `dream_menu_theme`    | 🌊    | What's your dream menu theme: seafood night, steakhouse, Italian, coastal New England, or "surprise me"?               |
| `obsessed_ingredient` | 🧄    | What's one ingredient you're obsessed with right now?                                                                  |
| `best_meal_ever`      | 🏆    | What's the best meal you've ever had, and what made it unforgettable?                                                  |
| `meal_preference`     | 🍳    | What do you prefer: breakfast, lunch, dinner, brunch, breakfast for dinner, midnight snack, or just constant snacking? |

**Chef tip:** `prove_yourself` is the highest-value answer for rebooking — a client who tells you their "chef test" dish is giving you the exact opener for a re-engagement message. `dream_menu_theme` and `obsessed_ingredient` are great for planning a tailored next event proposal.

---

## Architecture

### Database

Migration: `supabase/migrations/20260301000002_client_fun_qa.sql`

```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS fun_qa_answers JSONB DEFAULT '{}';
```

Answers are stored as a flat JSONB object on the `clients` row, keyed by the stable string identifiers above. Blank answers are stripped before saving so the object only contains real content.

### Server Actions (`lib/clients/client-profile-actions.ts`)

| Action                     | Who calls it | What it does                                         |
| -------------------------- | ------------ | ---------------------------------------------------- |
| `getMyFunQA()`             | Client       | Reads their own `fun_qa_answers`                     |
| `updateMyFunQA(answers)`   | Client       | Full-replaces `fun_qa_answers`, strips blank strings |
| `getClientFunQA(clientId)` | Chef         | Reads a client's answers (tenant-scoped)             |

The question definitions (`FUN_QA_QUESTIONS`) and types (`FunQAAnswers`, `FunQAKey`) are also exported from this file so the client form and chef display share a single source of truth.

### Components

| Component      | Path                                    | Used by                       |
| -------------- | --------------------------------------- | ----------------------------- |
| `FunQAForm`    | `components/clients/fun-qa-form.tsx`    | Client portal (`/my-profile`) |
| `FunQADisplay` | `components/clients/fun-qa-display.tsx` | Chef portal (`/clients/[id]`) |

**`FunQAForm`** (client-facing):

- Textarea for each question, pre-populated with saved answers
- Shows a "X/12 answered" badge once the client starts filling in answers
- "Save Answers" button — single action, no auto-save
- Friendly success/error feedback

**`FunQADisplay`** (chef-facing):

- Read-only; chefs cannot edit client answers
- If no answers yet: shows a gentle prompt explaining how to use the data
- If answers present: shows each filled answer in a clean `dt/dd` layout

### Page Wiring

- `app/(client)/my-profile/page.tsx` — renders `<FunQAForm initialAnswers={funQAAnswers} />` below the main profile form
- `app/(chef)/clients/[id]/page.tsx` — fetches `getClientFunQA` in the parallel `Promise.all` and renders `<FunQADisplay answers={funQAAnswers} clientName={client.full_name} />` between PersonalInfoEditor and QuickNotes

---

## How to Use It for Rebookings

1. After an event completes, visit the client's detail page.
2. Scroll to **Just for Fun** and read their answers.
3. Use `prove_yourself` as the hook: _"You said the test is [dish] — I've been thinking about how I'd do it. Want to find out?"_
4. Use `dream_menu_theme` to pitch a specific next event: _"You mentioned a full Italian spread — I have an idea for a Sunday gravy dinner."_
5. Use `obsessed_ingredient` for a seasonal outreach: _"Calabrian chili season is here and I have something in mind for you."_

---

## What It's Not

- The Q&A does **not** replace the existing dietary/preference profile. Those fields remain the operational source of truth for menus, allergies, and logistics.
- Answers are **not** used for any automated actions. A chef must read them and choose to act on them.
- Clients are **never** prompted or reminded to fill it in — it appears quietly at the bottom of the profile page with "no pressure" copy.
