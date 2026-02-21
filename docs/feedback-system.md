# Feedback System

## What Changed

Added a lightweight, non-invasive in-app feedback system that lets any ChefFlow user share what they love, what frustrates them, or anything in between — optionally anonymously.

---

## User-Facing Entry Points

### Chefs
**Settings → Share Feedback** (`/settings`)

A collapsible `SettingsCategory` accordion at the bottom of the settings page, between "Sample Data" and "Account & Security."

### Clients
**My Profile → Share Feedback** (`/my-profile`)

A card section at the bottom of the client profile page, after notification preferences.

Neither location is intrusive — users naturally find it when they're already in a settings context.

---

## What the Form Collects

| Field | Description |
|---|---|
| **Sentiment** | One of: 😍 Love it, 😤 Frustrated, 💡 Suggestion, 🐛 Bug, 💬 Other |
| **Message** | Free-text, 1–2000 characters |
| **Anonymous** | Checkbox — if checked, user_id and role are NOT stored |
| **Page context** | Auto-captured `window.location.pathname` at submission time |

---

## Admin View

**Admin Panel → Feedback** (`/admin/feedback`)

- Lists all submissions newest-first
- Sentiment summary chips at the top (counts per type + total)
- Table: Date, Sentiment, Message (truncated to 140 chars), Who (role or "Anonymous"), Page
- Guarded by `requireAdmin()` — service-role Supabase client used to read all rows

---

## Files Created / Modified

| File | Change |
|---|---|
| `supabase/migrations/20260313000002_user_feedback.sql` | New `user_feedback` table with RLS |
| `lib/feedback/actions.ts` | `submitFeedback` server action (Zod-validated) |
| `components/feedback/feedback-form.tsx` | Reusable client component — sentiment picker, textarea, anonymous toggle |
| `app/(chef)/settings/page.tsx` | Added "Share Feedback" SettingsCategory + FeedbackForm import |
| `app/(client)/my-profile/page.tsx` | Added feedback card + FeedbackForm import |
| `app/(admin)/admin/feedback/page.tsx` | New admin page — reads and displays all feedback |
| `components/admin/admin-sidebar.tsx` | Added "Feedback" nav item with MessageSquare icon |

---

## Architecture Notes

- **Server action** (`lib/feedback/actions.ts`) calls `getCurrentUser()` — works for both chef and client sessions. If `anonymous=true`, `user_id` and `user_role` are stored as `NULL`.
- **RLS**: `anyone_insert_feedback` allows any role (including unauthenticated, since the insert goes through the server action). Reads are restricted to `service_role` only.
- The `FeedbackForm` component is fully self-contained — no props required, captures `window.location.pathname` via `useEffect` for context.
- No floating button, no toast-overlay, no modal. Deliberately quiet — it lives where the user already is.

---

## Migration: `20260313000002_user_feedback.sql`

**Additive only.** Creates `user_feedback` table + RLS policies + two indexes. No existing tables modified. Safe to apply to production without data risk.

Apply with:
```bash
supabase db push --linked
```
