# ChefFlow-Brain: Agent Handoff Prompts

Copy-paste one prompt per Codex agent window. Agents A, B, C run in parallel. Agent D runs after all three finish.

---

## Agent A (parallel)

```
Read the file at prompts/brain-agent-a-scaffold.md in full. It is your complete build spec.

Execute every step in order, from Step 1 through Step 15. Each step has the exact shell commands to run and the expected file counts to verify. Do not skip steps. Do not modify source files. Only create directories and copy files to ChefFlow-Brain/.

After completing all steps, run the Completion Check at the bottom of the spec and paste the output. If any count is zero, investigate and fix before reporting done.

Do not write code. Do not install packages. This is a file-copy job.
```

---

## Agent B (parallel)

```
Read the file at prompts/brain-agent-b-claude-converter.md in full. It is your complete build spec.

Your job: write a Node.js script (scripts/convert-claude-jsonl.mjs) that converts Claude Code JSONL session files into readable markdown. The spec contains the exact JSONL format with real examples, the exact output markdown format, every edge case, and the 9 run commands to execute after writing the script.

Steps:
1. Read the full spec.
2. Write the script to scripts/convert-claude-jsonl.mjs using only Node.js built-ins (fs, path, readline). No npm packages.
3. Test it on the smallest source first (build-chefflow, 1 session) to verify output format.
4. Run all 9 conversion commands from the spec.
5. Run the Verification check at the bottom and paste output.

The script must be idempotent and stream files line-by-line (some inputs are 100MB+). Never load a full file into memory.
```

---

## Agent C (parallel)

```
Read the file at prompts/brain-agent-c-codex-converter.md in full. It is your complete build spec.

Your job: write a Node.js script (scripts/convert-codex-jsonl.mjs) that converts Codex JSONL session files into readable markdown. The spec contains the exact JSONL format with real examples, the exact output markdown format, every edge case, and the run command.

Steps:
1. Read the full spec.
2. Write the script to scripts/convert-codex-jsonl.mjs using only Node.js built-ins (fs, path, readline). No npm packages.
3. Run the script.
4. Run the Verification check at the bottom and paste output.

The script must be idempotent. Filter out system context injections (developer role messages, environment_context, AGENTS.md instructions, permissions instructions). Only real user messages and assistant responses go in the output.
```

---

## Agent D (runs AFTER A, B, C are all done)

```
Read the file at prompts/brain-agent-d-index-builder.md in full. It is your complete build spec.

Your job: build three index files for the ChefFlow-Brain folder. This agent depends on Agents A, B, and C having already populated ChefFlow-Brain/ with conversation files.

Steps:
1. Read the full spec.
2. Run the Pre-check. If any threshold is not met, STOP and report which agent's output is missing.
3. Build _SOURCES.md by reading actual file counts from disk.
4. Write the timeline script (scripts/build-brain-timeline.mjs) and run it to generate _TIMELINE.md.
5. Build _INDEX.md with stats, folder structure, and top-30 table.
6. Update _BUILD_LOG.md.
7. Run the Verification check at the bottom and paste output.

All file counts and links must come from disk, not from the spec. The spec has estimates; your job is to write the real numbers.
```

---

## Execution Order

```
Time 0:   Start Agent A, Agent B, Agent C (all three in parallel)
          A copies files (~5 min)
          B writes script + converts ~1,200 Claude sessions (~20 min)
          C writes script + converts 535 Codex sessions (~10 min)

After all three report done:
          Start Agent D (builds indexes from completed output, ~10 min)
```

Agent D's pre-check will fail if you start it too early. Wait for A, B, and C to confirm their verification checks pass.
