# UI Primitives Freeze Lanes

- Date: 2026-05-01
- Branch: feature/v1-builder-runtime-scaffold
- Scope: generic UI primitive orphan classification
- Decision rule: delete only unused duplicate wrappers with exact path proof and a replacement owner.

## Deleted Duplicates

| File | Classification | Proof | Replacement owner |
| --- | --- | --- | --- |
| `components/ui/external-link.tsx` | duplicate | No exact path imports. `ExternalLink` symbol refs resolve to `components/ui/icons.ts` or local icons, not this wrapper. | Native `<a target="_blank" rel="noopener noreferrer">` plus `components/ui/icons.ts` for the icon. |
| `components/ui/offline-banner.tsx` | duplicate | No exact path imports. Only `tsconfig.ci.expanded.json` listed the file. | `components/offline/offline-provider.tsx` and `components/offline/offline-status-bar.tsx`, already mounted by chef and admin layouts. |
| `components/ui/page-header.tsx` | duplicate | No exact path imports and no external `PageHeader` symbol refs. | Route-owned page headers and `components/ui/card.tsx` card headers where framed panels need headings. |
| `components/ui/section-divider.tsx` | duplicate | No exact path imports and no external `SectionDivider` symbol refs. | `.section-label` in `app/globals.css`, already used directly by dashboard and settings surfaces. |
| `components/ui/success-check.tsx` | duplicate | No exact path imports and no external `SuccessCheck` symbol refs. | `toast.success`, `CheckCircle` icons from `components/ui/icons.ts`, and existing `success-flash` CSS utility. |
| `components/ui/theme-toggle.tsx` | duplicate | No exact path imports. Remaining `theme-toggle` refs are test selectors or local theme controls, not imports of this component. | Existing theme provider plus local controls in settings/embed surfaces. |

## Kept Or Recover

| File | Classification | Reason |
| --- | --- | --- |
| `components/ui/combobox-input.tsx` | keep/recover | Documented by smart input specs as the single-value combobox owner. No clear canonical replacement. |
| `components/ui/responsive-table.tsx` | keep/recover | App audit claims this mobile table wrapper as a reusable owner. No equivalent mobile card/table adapter exists. |
| `components/ui/rich-note-editor.tsx` | keep/recover | `docs/specs/rich-text-editor-dinner-circles.md` explicitly says not to delete it, even though `components/ui/tiptap-editor.tsx` is the current editor owner. |

## Uncertain

| File | Classification | Reason |
| --- | --- | --- |
| `components/ui/inline-edit-cell.tsx` | uncertain | No refs, but no canonical inline edit owner exists and old accessibility audit names the file directly. |
| `components/ui/progress-ring.tsx` | uncertain | No refs, but circular progress has no exact canonical replacement. `StepProgress` handles multi-step flows, not this primitive contract. |
