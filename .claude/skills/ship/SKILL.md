---
name: ship
description: Git add, commit, and push the intended work to GitHub. Use when the user says ship, close out, commit, push, or asks to publish current agent work. If the user explicitly says "ship everything" or "commit all dirty files", include all dirty files; otherwise stage only the files owned by the current task and preserve unrelated dirty work.
---

# Ship It

Run the full ship chain. No confirmation needed unless file ownership is ambiguous.

1. Check `git status --short --branch`.
2. Identify files owned by the current task.
3. Stage only current-task files unless the user explicitly asked to ship all dirty files.
4. Commit with a clear, descriptive commit message summarizing the work done.
5. Push the current branch to GitHub.
6. Report what was committed and pushed.

Use a HEREDOC for the commit message. Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` at the end.

If there are no changes to commit, report that and stop.

## Dirty Tree Rule

If unrelated dirty files exist:

- Do not stage them by default.
- Do not revert them.
- Mention that they remain dirty.
- If a hook fails because of unrelated dirty code, classify that as `current-dirty` evidence and report the exact blocker.
- Use `--no-verify` only after the files being shipped have their own targeted validation and the hook failure is clearly unrelated.
