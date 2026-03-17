# Copilot Workflow — Research & Prompt Queue

> Copilot's role: research the codebase, help the developer think, and write structured prompts for Claude Code.

---

## The Pipeline

```
Developer (voice-to-text, casual)
    → Copilot (research + thinking + prompt writing) [$0]
        → prompts/queue/ (the filing cabinet)
            → Developer reviews & prioritizes
                → Claude Code executes [paid]
                    → prompts/completed/ (done)
```

## How to Use Copilot

### 1. Open COPILOT.md in your editor

Copilot reads context from **open files**. Always have `COPILOT.md` in an editor tab when working with Copilot. This gives it the project rules and architecture context.

### 2. Talk casually about what you want

Just describe the feature, bug, or idea. Copilot will:

- Read relevant files in the codebase
- Identify which patterns apply
- Ask clarifying questions
- Help you think through edge cases

### 3. Say "add it to the Claude queue"

When you're happy with the prompt, any of these trigger Copilot to save it:

- "add it to the queue"
- "add it to the Claude queue"
- "save that prompt"
- "write that up"
- "file that"
- "queue it"
- "put that in the folder"

Copilot saves a structured `.md` file to `prompts/queue/`.

### 4. Feed to Claude Code when ready

Tell Claude Code: "Pick up the next prompt from the queue" or "Run `prompts/queue/2026-02-24-add-prep-timer.md`"

Claude Code reads the prompt, executes it, and you move the file to `prompts/completed/`.

---

## Folder Structure

```
prompts/
  template.md       ← The format all prompts must follow
  queue/            ← Copilot writes here (pending prompts)
  completed/        ← Move here after Claude Code executes
```

## File Naming

`YYYY-MM-DD-short-description.md`

Examples:

- `2026-02-24-add-prep-timer.md`
- `2026-02-24-fix-calendar-overlap.md`
- `2026-02-25-client-allergy-warnings.md`

---

## Historical Test Results (Feb 2026 — Code Writer Role)

Before the role change, Copilot was tested as a junior code writer:

**Test 1 — Multi-file feature:** Grade D-. Did not follow rules, committed to wrong branch, created 26 unrequested files, created forbidden migrations, hallucinated compliance.

**Test 2 — Multi-file feature:** Grade D. Same violations. Deleted working code, hallucinated DB fields, broken modal handlers.

**Conclusion:** Copilot failed at following implementation rules but was good at _understanding_ code. The role change to research + prompt writing plays to this strength.

---

## What Changed (2026-02-24)

**Before:** Copilot was a junior code writer. It created branches, wrote code, and committed. It scored D- and D on compliance tests — wrong branches, no commit prefixes, created forbidden files, hallucinated compliance.

**After:** Copilot is a research bot and prompt writer. It never touches source code. It writes markdown prompt files in one folder. This plays to its strength (understanding code + writing about it) and eliminates its weakness (following implementation rules).

**Why this is better:**

- Copilot **can't break anything** — it only writes markdown in `prompts/queue/`
- No branch isolation needed — no code changes to isolate
- Developer gets pre-researched prompts with real codebase context — saves Claude Code tokens
- The whole research phase costs **$0**
