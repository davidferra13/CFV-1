# ChefFlow MemPalace Search

AnythingLLM custom agent skill for live search against the active ChefFlow MemPalace corpus.

What it does:
- searches `C:\Users\david\.mempalace\palace2` by default
- returns top semantic matches with `wing`, `room`, `source`, and similarity
- is meant for `@agent` runs when the answer may live in recovered session history, mined docs, or semantic memory

What it is not:
- it does not replace the normal AnythingLLM workspace documents
- it does not mutate MemPalace
- it does not search the legacy `palace` store unless you explicitly reconfigure it

Files:
- `plugin.json`: AnythingLLM skill definition
- `handler.js`: Node entrypoint used by AnythingLLM
- `mempalace_query.py`: Python helper that queries Chroma directly

Usage:
- Ask AnythingLLM in agent mode about ChefFlow history or buried context.
- Examples:
  - `Find prior ChefFlow work on invoice numbering race conditions.`
  - `Search codex conversations for earlier SEO deploy debugging.`
  - `Look in cfv1 docs for MemPalace integration notes.`
