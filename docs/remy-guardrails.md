# Remy Guardrails & Abuse Prevention

> Implemented: Feb 2026
> Branch: `feature/risk-gap-closure`

## What Changed

Added a comprehensive safety layer to Remy that blocks abuse before it reaches the LLM, logs violations for admin review, and auto-blocks repeat offenders.

## Architecture

### Defense in Depth (Two Layers)

1. **Pre-LLM regex layer** (`remy-guardrails.ts`) — runs before any Ollama call. Zero cost, deterministic, catches obvious attacks instantly.
2. **System prompt layer** (`remy-personality.ts`) — topic boundaries and anti-injection rules baked into Remy's personality. Catches subtle/borderline attempts the regex misses.

### Message Flow

```
User types message
  → CLIENT: maxLength=2000 on textarea, character counter
  → SERVER: requireChef() — auth
  → SERVER: isRemyAdmin() — admin? skip ALL guardrails
  → SERVER: isRemyBlocked() — auto-blocked from prior violations?
  → SERVER: checkRemyRateLimit() — 12 msgs/min
  → SERVER: validateRemyInput() — length, dangerous content, abuse, injection
      → CRITICAL? logRemyAbuse() + stern refusal + possible auto-block
      → WARNING? logRemyAbuse() + lighter refusal
      → PASS? continue to existing Remy flow
```

### Admin Bypass

Admins (defined by `ADMIN_EMAILS` env var) bypass ALL guardrails:

- Never rate-limited
- Never content-filtered
- Never blocked
- No abuse logging for admin messages

This is checked via `isRemyAdmin()` → `isAdmin()` from `lib/auth/admin.ts`.

## Escalation Ladder

| Severity       | Trigger                                                                 | Action                                                               |
| -------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Pass**       | Normal message                                                          | Processed normally                                                   |
| **Warning**    | Prompt injection, off-topic probing                                     | Logged to `remy_abuse_log`, friendly redirect                        |
| **Critical**   | Dangerous content (weapons, violence, drugs, self-harm), slurs, threats | Logged to `remy_abuse_log`, stern refusal ("This has been flagged.") |
| **Auto-block** | 2+ prior critical incidents from same user                              | `chefs.remy_blocked_until` set to +24h, user locked out of Remy      |

## What Gets Blocked

### Dangerous Content (Critical)

- Weapons/explosives (bomb-making, firearms manufacturing)
- Violence (how to kill/murder/poison/kidnap)
- Drug synthesis (meth, cocaine, fentanyl, etc.)
- Self-harm (suicide methods, lethal doses)
- Hacking/fraud (identity theft, money laundering)
- CSAM / child exploitation
- Terrorism / mass violence

### Abuse/Harassment (Critical)

- Racial/ethnic slurs
- Homophobic/transphobic slurs
- Direct threats of violence
- Self-harm encouragement
- Sexual harassment

### Prompt Injection (Warning)

- Instruction overrides ("ignore all previous instructions")
- System prompt extraction ("show me your rules")
- Role-play escapes ("you are now DAN")
- Jailbreak patterns ("developer mode", "god mode")
- Tag injection (`<system>`, `<instruction>`)

### Memory Validation

- Max 500 characters
- No URLs (phishing prevention)
- No code/SQL (injection prevention)
- Must contain business-relevant keywords (off-topic prevention)

## Database

### `remy_abuse_log` table

- `id`, `tenant_id`, `auth_user_id` — who did it
- `severity` (warning/critical/blocked) — how bad
- `category` — what type of violation
- `blocked_message` — exact text they tried to send
- `guardrail_matched` — which pattern triggered
- `user_blocked` — was auto-block triggered?
- `reviewed_by_admin` — for future admin review UI

### `chefs.remy_blocked_until` column

- Nullable timestamptz
- If set and > now(), user cannot use Remy
- Auto-set to +24h after 3rd critical violation

## Files

| File                                                    | Role                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `lib/ai/remy-guardrails.ts`                             | Pure functions + constants — validation, detection, rate limiting |
| `lib/ai/remy-abuse-actions.ts`                          | Server actions — abuse logging, block checking, admin bypass      |
| `lib/ai/remy-personality.ts`                            | System prompt additions — topic boundaries, anti-injection rules  |
| `lib/ai/remy-actions.ts`                                | Main entry point — guardrail chain wired in before LLM calls      |
| `lib/ai/remy-memory-actions.ts`                         | Memory extraction — validates content before DB insert            |
| `components/ai/remy-drawer.tsx`                         | Client-side — maxLength, character counter                        |
| `supabase/migrations/20260321000008_remy_abuse_log.sql` | Migration — abuse log table + blocking column                     |

## Future Work

- Admin UI to review `remy_abuse_log` entries and unblock users
- Configurable block duration (currently hardcoded to 24h)
- Rate limit configuration per tier (free vs pro)
- Analytics dashboard for abuse patterns
