---
name: close-session
description: Standard session close-out. Stage, commit, and push current agent work, update session log and build state when applicable, and preserve unrelated dirty work unless the user explicitly asks to ship everything.
---

# Session Close-Out

Run these steps in order:

1. **Inspect status** - `git status --short --branch`
2. **Classify dirty files** - current-task files vs unrelated existing work
3. **Stage current-task changes** - stage only files owned by this session unless the user explicitly requested all dirty files
4. **Commit** - clear, descriptive commit message
5. **Push the current branch** - `git push origin <current-branch>`
6. **Update CLAUDE.md** - if any new patterns, rules, or decisions were made this session, add them now
7. **Update `docs/session-log.md`** - append departure entry:
   ```
   ## YYYY-MM-DD HH:MM EST
   - Agent: [type]
   - Task: [what you did]
   - Status: completed | partial | blocked
   - Files touched: [list every file you modified]
   - Commits: [commit hashes]
   - Build state on departure: [green | broken]
   - Notes: [anything the next agent needs to know]
   ```
8. **Update `docs/build-state.md`** if you ran a build or type check
9. **Report** - tell the developer what was committed and pushed

## Evidence Rule

If typecheck, build, test, commit hook, or push hook output is mixed because the working tree contains unrelated dirty files, use `evidence-integrity` language:

- State whether the result applies to a clean commit, current dirty snapshot, or only the files changed by this session.
- Do not write `green` or `healthy` unless the current evidence supports it.
- If a hook is bypassed, state the targeted validation that was run and the unrelated blocker that made bypassing necessary.
