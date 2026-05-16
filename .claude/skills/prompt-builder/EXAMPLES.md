# Prompt Builder Examples

## Example Invocation

User:

```text
Use prompt-builder on this: I want clients to see menu progress after an inquiry, without the chef manually updating status.
```

Expected behavior:

- Read required context.
- Check queue state.
- Inspect inquiry, menu, client, and circle docs/files only as needed.
- Output a `COPY-PASTE PROMPT` block that asks the next agent to turn the idea into spec questions or a queue item.

## Example Queue Draft Use

User:

```text
Turn this into a queue-ready prompt, do not build it yet: restore light mode as default but keep copper dark mode.
```

Expected behavior:

- Check active queue for theme overlap.
- Produce a queue item draft.
- Do not run `build-queue.mjs add` unless explicitly asked.

## Example Fire-Ready Use

User:

```text
Use prompt-builder and make the fire-ready prompt for BQ-20260515T214008Z. I am going to paste it into a build agent.
```

Expected behavior:

- Read the queue item.
- Check whether it is active or in-flight.
- Produce a fire-ready prompt requiring `build-queue.mjs fire` first if needed.
- Include run ID, context-pack, ownership, proof pack, runtime proof, and finish-check requirements.

## Example Prompt QA Use

User:

```text
Lint this prompt before I paste it into Codex.
```

Expected behavior:

- If the prompt is saved, run `npm run prompt:lint -- --file <path>`.
- If the prompt is in chat, run `node scripts/prompt-lint.mjs --stdin` only when practical, otherwise manually apply the same checklist.
- Report PASS/FAIL, score, missing safeguards, and a repaired copy-paste prompt when the fix is small.

## Example Prompt Repair Use

User:

```text
Repair this prompt before I paste it into Codex: Build the client menu progress thing.
```

Expected behavior:

- Preserve the raw weak prompt.
- Add repo-grounded context, queue checks, dirty workspace protection, file ownership, security rules, verification, and proof gates.
- Use `npm run prompt:lint -- --file <path> --repair-template` when the weak prompt is saved.
- Output a corrected `COPY-PASTE PROMPT` in chat.

## Example Context Pack Use

User:

```text
Generate the context pack for RUN-20260515-menu-progress with BQ-123 and BQ-124.
```

Expected behavior:

- Run `npm run prompt:context-pack -- --run RUN-20260515-menu-progress --ids BQ-123,BQ-124`.
- Report the context pack path.
- Mention missing queue items or unavailable queue status if the script reports them.

## Example Prompt Archive Use

User:

```text
Archive this generated prompt under RUN-20260515-theme.
```

Expected behavior:

- Save the prompt to a temporary file only if needed.
- Run `npm run prompt:archive -- --file <prompt.md> --run RUN-20260515-theme --slug theme-default`.
- Report the docs archive path and run prompt path.

## Example Prompt Debrief Use

User:

```text
Debrief whether this build prompt caused the weak final report.
```

Expected behavior:

- Read the original prompt and final report.
- Run `npm run prompt:debrief -- --report <final-report.md> --prompt <prompt.md>`.
- Report missing outcome signals and the specific prompt additions to use next time.

## Example Manifest And Preflight Use

User:

```text
Prepare the run handoff for RUN-20260515-theme before I paste this into a build agent.
```

Expected behavior:

- Run `npm run prompt:manifest -- --run RUN-20260515-theme --prompt <prompt.md> --queue-ids <BQ IDs>`.
- Run `npm run prompt:preflight -- --prompt <prompt.md> --queue-files <queue item paths>`.
- Report manifest path and any dirty-workspace or queue file collisions.

## Example Verification And Security Use

User:

```text
Add verification and security appendices to this fire-ready prompt.
```

Expected behavior:

- Run `npm run prompt:verify -- --file <prompt.md>`.
- Run `npm run prompt:security -- --file <prompt.md>`.
- Add focused commands, runtime proof, and exact auth/tenant/route-policy rules when the prompt touches protected surfaces.

## Bad Output

```text
Here is a polished prompt. Build the theme system and make it look good.
```

This is bad because it is not repo-grounded, has no file ownership, no queue status, no auth/security rules, no acceptance criteria, and no proof gate.

## Good Repair Command

```powershell
npm run prompt:lint -- --file docs/prompts/generated/weak-prompt.md --repair-template --strict
```

## Good Run Handoff Commands

```powershell
npm run prompt:context-pack -- --run RUN-20260515-theme --ids BQ-20260515T214008Z
npm run prompt:archive -- --file docs/prompts/generated/theme-fire-prompt.md --run RUN-20260515-theme --slug theme-fire-prompt
npm run prompt:debrief -- --report .agents/build-queue/runs/RUN-20260515-theme/final-report.md --prompt .agents/build-queue/runs/RUN-20260515-theme/prompt.md
npm run prompt:manifest -- --run RUN-20260515-theme --prompt .agents/build-queue/runs/RUN-20260515-theme/prompt.md --queue-ids BQ-20260515T214008Z
npm run prompt:preflight -- --prompt .agents/build-queue/runs/RUN-20260515-theme/prompt.md --queue-files .agents/build-queue/in-flight/BQ-20260515T214008Z.md
npm run prompt:verify -- --file .agents/build-queue/runs/RUN-20260515-theme/prompt.md
npm run prompt:security -- --file .agents/build-queue/runs/RUN-20260515-theme/prompt.md
```

## Good Output Shape

```text
COPY-PASTE PROMPT

You are the ChefFlow Prompt Builder. Do not implement code.

Raw idea:
...

Canonical context to read first:
...

Before output:
...

Output:
...
```
