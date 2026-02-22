# Draft → Integrate Workflow: How to Use This System

This is the complete guide for using the model-tier handoff system. **Read this when you're rate-limited on Claude and want to keep working locally.**

---

## The 30-Second Summary

1. You run out of Claude tokens
2. Open Continue in VS Code, select `ChefFlow Drafter (qwen3-coder:30b)`
3. Tell it what to build — it outputs a **patch ticket** (markdown file with diffs)
4. Save the ticket to `.patches/queue/`
5. When Claude is back, tell it: **"Integrate queued patches"**
6. Claude reviews, applies, type-checks, and commits — or rejects with notes

You never lose momentum. Claude never accepts bad code blindly.

---

## Step-by-Step: Working Locally (While Rate-Limited)

### 1. Open Continue in VS Code

Press `Ctrl+L` to open Continue chat. Select the **`ChefFlow Drafter`** model (the local Ollama one you configured — see config below).

### 2. Give it context

Start every local session by telling the model:

```
Read .patches/handoff.md for what I'm working on.
Read .constraints/server-actions.json and .constraints/privacy-boundary.json for the rules.
```

Or just paste the handoff.md contents directly into the chat.

### 3. Ask it to draft a patch ticket

Example prompt:

```
Draft a patch ticket for: Add a travel time display panel to the event detail page.

Follow the ticket format in .patches/queue/. Include:
- Unified diffs for each file
- Self-assessment checklist
- Verification steps

Reference these constraints: server-actions.json (auth guard + tenant scoping).
This is a Free tier feature — no requirePro() needed.
Do not touch lib/events/transitions.ts or lib/ledger/append.ts.
```

### 4. Save the output

**Option A — One command (recommended):**

1. Select and copy the model's entire response (`Ctrl+A` in the chat, then `Ctrl+C`)
2. Run in your terminal:

   ```bash
   npm run save:ticket -- "short description of the change"
   ```

   Example: `npm run save:ticket -- "add-travel-panel"`

   The script reads your clipboard, auto-numbers the file, and saves it to `.patches/queue/`.

**Option B — Manual:**
Copy the model's output and save it as `.patches/queue/NNNN-description.md`. Number sequentially (0001, 0002, etc.).

### 5. Repeat for more tickets

You can draft multiple tickets in one session. Each ticket should be focused on ONE change.

---

## Step-by-Step: Integrating (When Claude Returns)

Tell Claude:

```
Integrate queued patches. Read .patches/queue/ and process each ticket.
```

Claude will:

1. Read each ticket in order
2. Review the diffs against the constraint files
3. Apply accepted patches (or reject with notes)
4. Run `npm run check:constraints`
5. Run `npx tsc --noEmit --skipLibCheck`
6. Fix any issues
7. Commit and move tickets to `.patches/applied/` or `.patches/rejected/`

---

## Patch Ticket Format

Save tickets as `.patches/queue/NNNN-short-description.md`:

````markdown
# Ticket: [Short title]

## Meta

- Created: [ISO timestamp]
- Model: ollama/qwen3-coder:30b
- Parent branch: [current branch]
- Parent commit: [latest commit hash]

## Intent

[1-2 sentences: what this change does and why]

## Constraints Referenced

- [constraint-file.json] ([rule-ids that apply])
- Tier: [Free / Pro — if Pro, which module slug?]

## Files NOT to Touch

- [file path — reason]

## Patches

### File: [path/to/file.ts] (NEW or MODIFY)

\```diff
--- a/path/to/file.ts
+++ b/path/to/file.ts
@@ -1,5 +1,10 @@
existing line
+new line
\```

## Self-Assessment

- [x] Auth guard present (if server action)
- [x] Tenant ID from session (if DB query)
- [x] No parseWithAI in private-data file
- [x] No direct event status mutations
- [ ] NOT type-checked (no tsc run)
- [ ] NOT build-tested

## Verification Steps

1. [How to verify this works — specific commands or UI actions]
2. [What to check for correctness]
````

---

## Continue Configuration for Local Drafting

Your Continue config is at `~/.continue/config.yaml`. Add this model entry:

```yaml
models:
  - name: ChefFlow Drafter
    provider: ollama
    model: qwen3-coder:30b
    systemMessage: |
      You are a code drafting assistant for the ChefFlow project. You produce PATCH TICKETS only — you never edit files directly.

      RULES:
      1. Output ONLY markdown patch tickets in the format specified by the user.
      2. Every ticket must include: Meta, Intent, Constraints Referenced, unified diffs, Self-Assessment, Verification Steps.
      3. Use unified diff format (--- a/file, +++ b/file, @@ line numbers @@).
      4. Reference constraint files from .constraints/ in every ticket.
      5. Mark your self-assessment honestly — flag what you did NOT verify.
      6. Never claim builds or tests were run.
      7. Never make architectural decisions — if unsure, flag it as an Open Question.

      ARCHITECTURAL CONSTRAINTS (always follow):
      - Server actions: requireChef()/requireClient()/requireAuth() as first statement
      - Tenant ID: always from session (user.tenantId!), never from request body
      - Money: always integers in cents
      - AI privacy: use parseWithOllama for PII data, never parseWithAI
      - Event status: only change via transitionEvent(), never direct .update()
      - Ledger: append-only, never UPDATE/DELETE
      - 'use server' files: only export async functions, never export const
```

### Day-to-Day Commands

```bash
# Check what models are available
ollama list

# Check if the model is loaded
ollama ps

# Pre-load the model (optional — speeds up first response)
ollama run qwen3-coder:30b "hello" && exit

# Run the constraint checker
npm run check:constraints

# Run it on just staged files
npm run check:constraints:staged
```

---

## Constraint Files Reference

Located in `.constraints/`. The local model should read these before drafting.

| File                       | Key rules                                                                      |
| -------------------------- | ------------------------------------------------------------------------------ |
| `server-actions.json`      | Auth guard on every exported function, tenant_id from session, no export const |
| `privacy-boundary.json`    | Explicit list of files where parseWithAI is forbidden                          |
| `financial-integrity.json` | Cents-only, immutable ledger, derived balances                                 |
| `event-fsm.json`           | 8 states, valid transitions, no AI transitions                                 |
| `migration-safety.json`    | No DROP/DELETE/TRUNCATE, timestamps ascending                                  |
| `tier-gating.json`         | Pro features need requirePro() + registration                                  |

---

## Handoff Protocol

### Before ending a paid-model session

Claude writes `.patches/handoff.md` with:

- What branch you're on
- What's in progress
- Prioritized list of tickets to draft
- Which constraints apply
- Files not to touch
- Risk level

### Before starting a local session

Read `.patches/handoff.md` first. It tells you exactly what to work on.

### Before starting a paid-model session (after local work)

Tell Claude: "Read .patches/handoff.md and integrate queued patches from .patches/queue/"

---

## What NOT to Do Locally

- **Never edit source files directly** — only write patch tickets
- **Never commit or push** — the integrator does that
- **Never run tsc or the build** — you can't verify types locally without the full context
- **Never make architectural decisions** — flag them as Open Questions in the ticket
- **Never touch** `lib/events/transitions.ts`, `lib/ledger/append.ts`, or `types/database.ts` — these are high-risk files that require paid-model review

---

## FAQ

**Q: What if I need to change something small and obvious?**
A: Still write a ticket. It takes 30 seconds and prevents drift.

**Q: What if the local model gets something wrong?**
A: That's expected. The self-assessment checklist flags what it didn't verify. The integrator catches the rest.

**Q: What if I need to draft a migration?**
A: Write the SQL in the ticket. Flag it as high-risk. The integrator will review the SQL, check timestamp ordering, and apply it.

**Q: Can I draft multiple tickets at once?**
A: Yes. Number them sequentially. The integrator processes them in order.

**Q: What if a ticket is rejected?**
A: It moves to `.patches/rejected/` with notes explaining why. You can revise and resubmit.
