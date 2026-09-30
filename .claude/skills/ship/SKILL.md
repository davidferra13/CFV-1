---
name: ship
description: Stage only task-owned changes, commit them atomically, and push the current branch. The safe full "ship it" chain.
disable-model-invocation: true
---

# Ship It

Run the full ship chain. No confirmation needed, no questions asked.

1. Inspect `git status --short` and identify only files owned by the current task
2. `git add` those specific task-owned files only, never `git add .` or `git add -A`
3. `git commit` with a clear, descriptive commit message summarizing the work done
4. `git push origin <current-branch>` to GitHub
5. Report exactly what was committed and pushed; preserve unrelated dirty work

Use a HEREDOC for the commit message. Include `Co-Authored-By: Claude <noreply@anthropic.com>` at the end so attribution does not go stale when the configured model changes.

If there are no changes to commit, report that and stop.
