# Remy Runtime Memory

## What Changed

Remy can now load repo-local memory from `memory/runtime/remy.json` on every request in local and dev environments. Editing that file in VS Code changes the runtime memory immediately on the next Remy message. No database write, no restart, no sync step.

## File Format

```json
{
  "memories": [
    {
      "id": "garcia-cake",
      "category": "client_insight",
      "content": "The Garcia family prefers tres leches cake for celebrations.",
      "importance": 7,
      "relatedClientName": "Garcia",
      "enabled": true
    }
  ]
}
```

## Supported Fields

- `id`: Optional stable slug. If omitted, ChefFlow hashes the entry.
- `category`: One of `chef_preference`, `client_insight`, `business_rule`, `communication_style`, `culinary_note`, `scheduling_pattern`, `pricing_pattern`, `workflow_preference`.
- `content`: The exact fact Remy should remember.
- `importance`: Optional 1-10 priority. Defaults to `5`.
- `relatedClientName`: Optional name hint for client-specific matching.
- `enabled`: Optional boolean. Set to `false` to disable an entry without deleting it.

## Runtime Rules

- This file is read fresh on each request, so VS Code edits show up on the next message.
- Runtime file memories are merged with database memories in the drawer and memory hub.
- Runtime file memories are marked as `VS Code` in the UI and cannot be deleted from the app.
- Production stays unchanged unless `REMY_RUNTIME_MEMORY_ENABLED=1` is set.

## Why This Exists

The existing memory path only read from `remy_memories` in Supabase. That made direct agent edits in the repo invisible at runtime. This file-backed layer gives Codex and Claude a shared memory surface inside the codebase itself.
