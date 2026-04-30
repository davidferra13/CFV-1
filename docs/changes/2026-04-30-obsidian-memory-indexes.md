# Obsidian Memory Indexes

- Date: 2026-04-30
- Source: Codex session
- Intent: Make ChefFlow and Codex use Obsidian-style linked notes for durable workflow memory.
- Changed:
  - `devtools/obsidian-memory-packet.mjs` now resolves the local vault automatically unless `--no-vault` or `--repo-only` is passed.
  - `devtools/context-continuity-lib.mjs` now preserves repo-local memory packets and optionally mirrors them into the vault.
  - Vault mirrors update `[[ChefFlow Index]]`, `[[Codex Workflow Index]]`, and `[[ChefFlow Decisions]]`.
  - `tests/unit/context-continuity-tools.test.mjs` covers both repo-only packet writes and vault-index mirroring.
- Vault notes created:
  - `F:\OpenClaw-Vault\ChefFlow Index.md`
  - `F:\OpenClaw-Vault\Codex Workflow Index.md`
  - `F:\OpenClaw-Vault\ChefFlow Decisions.md`
  - `F:\OpenClaw-Vault\ChefFlow Obsidian Memory Workflow.md`
