# Communication Orphan Lanes

Date: 2026-05-01

Scope:

- `lib/communication/guest-change-actions.ts`
- `lib/communication/menu-revision-actions.ts`
- `lib/communication/payment-milestone-actions.ts`
- `lib/communication/survey-actions.ts`
- `lib/communication/template-actions.ts`

## Import Path Proof

Command:

```powershell
rg -n "guest-change-actions|menu-revision-actions|payment-milestone-actions|survey-actions|template-actions" .
```

Results:

- `lib/communication/guest-change-actions.ts`: no live app, component, lib, script, or test imports. Only explicit CI include and docs/spec references were found.
- `lib/communication/menu-revision-actions.ts`: no live app, component, lib, script, or test imports. Only explicit CI include and docs/spec references were found.
- `lib/communication/payment-milestone-actions.ts`: no live app, component, lib, script, or test imports. Only explicit CI include, docs/spec references, and build queue metadata were found.
- `lib/communication/survey-actions.ts`: no live app, component, lib, script, or test imports. Only explicit CI include, docs/spec references, and migration comment references were found.
- `lib/communication/template-actions.ts`: no live app, component, lib, script, or test imports. Only explicit CI include and docs/spec references were found.

## Exported Symbol Proof

Commands:

```powershell
rg -n "\b(getGuestChanges|requestGuestChange|approveGuestChange|GuestCountChange)\b" app components lib scripts tests . --glob "!lib/communication/guest-change-actions.ts"
rg -n "\b(getRevisions|getRevisionById|createRevision|approveRevision|rejectRevision|MenuRevision)\b" app components lib scripts tests . --glob "!lib/communication/menu-revision-actions.ts"
rg -n "\b(getMilestones|createMilestone|markMilestonePaid|updateMilestone|sendMilestoneReminder|PaymentMilestone)\b" app components lib scripts tests . --glob "!lib/communication/payment-milestone-actions.ts"
rg -n "\b(getSurveys|getSurveyResults|createSurvey|submitSurveyResponse|requestReview|PostEventSurvey|SurveyResults)\b" app components lib scripts tests . --glob "!lib/communication/survey-actions.ts"
rg -n "\b(getTemplates|getTemplatesByCategory|getTemplateById|createTemplate|updateTemplate|deleteTemplate|incrementTemplateUsage|ResponseTemplate|TemplateCategory)\b" app components lib scripts tests . --glob "!lib/communication/template-actions.ts"
```

Results:

- Guest count symbols are live through `lib/guests/count-changes.ts`, with app usage in client and chef event guest count surfaces. The orphan exports `getGuestChanges`, `requestGuestChange`, and `approveGuestChange` were not imported by live code.
- Menu revision symbols have canonical revision history in `lib/menus/revisions.ts` and client approval flow in `lib/events/menu-approval-actions.ts`. The orphan exports `getRevisions`, `getRevisionById`, `createRevision`, `approveRevision`, and `rejectRevision` were not imported by live code.
- Payment milestone symbols have canonical event milestone ownership in `lib/payments/milestones.ts`. The orphan exports were not imported by live code, but this file was retained because it touches money behavior.
- Survey response symbols are live through `lib/feedback/surveys-actions.ts` and `lib/post-event/trust-loop-actions.ts`. The orphan exports were not imported by live code, but this file was retained because it touches post-event client feedback behavior.
- Communication template symbols are live through `lib/communication/templates/actions.ts` and app settings/components import that canonical owner. The orphan exports `getTemplates`, `getTemplatesByCategory`, `getTemplateById`, `createTemplate`, `updateTemplate`, `deleteTemplate`, and `incrementTemplateUsage` were not imported by live code.

## Deleted

- `lib/communication/guest-change-actions.ts`
  - Canonical owner: `lib/guests/count-changes.ts`
  - Reason: no live imports, duplicate guest count change domain, canonical owner has richer chef/client auth, pricing impact, notification, chat, cache invalidation, and event update behavior.
- `lib/communication/menu-revision-actions.ts`
  - Canonical owners: `lib/menus/revisions.ts` and `lib/events/menu-approval-actions.ts`
  - Reason: no live imports, duplicate menu revision lane, canonical owner has current revision history plus approval and revision request workflow.
- `lib/communication/template-actions.ts`
  - Canonical owner: `lib/communication/templates/actions.ts`
  - Reason: no live imports, duplicate response template CRUD, canonical owner is used by `app/(chef)/settings/communication/page.tsx` and `components/communication/*`.

## Retained

- `lib/communication/payment-milestone-actions.ts`
  - Canonical owner: `lib/payments/milestones.ts`
  - Reason retained: no live imports were found, but this touches monetary milestone records and reminder state. Treat as recover/uncertain until a payment owner confirms whether any legacy table or reminder semantics should be folded into the canonical payment module.
- `lib/communication/survey-actions.ts`
  - Canonical owners: `lib/post-event/trust-loop-actions.ts` and `lib/feedback/surveys-actions.ts`
  - Reason retained: no live imports were found, but this touches client survey submission, review eligibility, and post-event feedback state. Treat as recover/uncertain until the post-event trust loop owner confirms any remaining behavior is obsolete.

## CI Include Changes

Removed explicit `tsconfig.ci.expanded.json` entries only for deleted files:

- `./lib/communication/guest-change-actions.ts`
- `./lib/communication/menu-revision-actions.ts`
- `./lib/communication/template-actions.ts`

Retained explicit entries for:

- `./lib/communication/payment-milestone-actions.ts`
- `./lib/communication/survey-actions.ts`
