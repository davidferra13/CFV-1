# Private Chef Core Packet (Generic Templates)

This packet is generic by design.

- No personal or client-specific content is stored in templates.
- The reference PDFs are used only to infer structure, not content.
- Every sheet can be filled manually or generated automatically from JSON input.

## Core Operating Packet (print order)

1. `01-master-menu-sheet-template.md` (FOH + BOH + dietary matrix)
2. `02-grocery-list-template.md` (shopping stops, substitutions, on-hand)
3. `03-prep-service-sheet-template.md` (at-home prep, on-site fire plan, run of show)
4. `04-packing-list-template.md` (transport zones, equipment, load order)

Optional extension:

5. `05-closeout-sheet-template.md` (food safety + leftovers + reset + admin closeout)

## Auto-Fill Files

- `template-pack.schema.json` (input contract)
- `template-pack.example.json` (safe sample payload)
- `FIELD-MAP.md` (manual template fields <-> JSON keys)
- `RESEARCH-SOURCES.md` (external references used for structure decisions)
- `scripts/render-chef-template-pack.mjs` (generator)

## Manual Fill Mode

1. Copy each `*-template.md` file for a new event.
2. Fill placeholders directly.
3. Keep each sheet to one page by limiting list length.

## Automatic Fill Mode

Run from repo root:

```powershell
node scripts/render-chef-template-pack.mjs `
  --input docs/PDFref/templates/template-pack.example.json `
  --out docs/PDFref/generated-core `
  --include-closeout true
```

Generated output files:

- `01-menu-sheet.md`
- `02-grocery-list.md`
- `03-prep-service-sheet.md`
- `04-packing-list.md`
- `05-closeout-sheet.md` (only when `--include-closeout true`)

## One-Page Guardrails

- Menu: max 4 courses, max 8 BOH components per course.
- Grocery: max 4 stops, max 15 items per stop.
- Prep/service: max 12 prep tasks, max 10 run-of-show rows.
- Packing: max 10 rows per transport zone.
- Closeout: max 8 checklist lines per section.

If input exceeds limits, the renderer truncates and prints warnings so sheets stay printable.
