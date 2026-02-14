# VSCode Setup Contract

**Document ID**: 042
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines recommended VSCode configuration for ChefFlow V1 development.

---

## Required Extensions

**Extension IDs**:
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `bradlc.vscode-tailwindcss`
- `Supabase.supabase-vscode`

**Install**:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension Supabase.supabase-vscode
```

---

## Workspace Settings

**File**: `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## References

- **Local Dev Model**: `041-local-dev-model.md`
