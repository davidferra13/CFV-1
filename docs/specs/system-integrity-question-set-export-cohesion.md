# System Integrity Question Set: Export Cohesion (User Experience)

> **Companion to:** `system-integrity-question-set-data-export.md` (data completeness)
> **Created:** 2026-04-18
> **Purpose:** Every question is a real scenario a chef faces. Forces the export experience from 54 scattered surfaces into a coherent, findable, consistent system.

---

## The Problem Statement

ChefFlow has **54+ export surfaces**: 20+ CSV downloads, 15+ PDF generators, 15+ copy-to-clipboard actions, 2 ZIP exports, 15+ print views. Each was built independently. There is no universal export pattern, no shared component, no consistent placement. A chef thinking "I need to get X out of this app" must discover each surface individually.

**The Takeout page (bulk export) does not fix this.** It is surface #55. The real problem is the other 54.

---

## Domain 1: "Where Do I Go?" (Discoverability)

**Q1. A chef needs to send their accountant tax records. They open ChefFlow. Where do they go?**
Three places compete: `/finance/year-end` (CPA ZIP), `/finance/tax` (Tax Package CSV), `/finance/reporting` (CPA export link). All produce different output formats for the same need. The chef has to know which one their accountant wants, and which page produces it.
**Verdict: FRAGMENTED. One canonical "send to accountant" path should exist. The others should redirect or link to it.**

**Q2. A chef wants to print a recipe to tape on the kitchen wall. They open the recipe. Where is the print button?**
NOWHERE. `RecipePrintView` component exists (`components/print/recipe-print-view.tsx`) with full styling, ingredients, instructions, and checkboxes. `getRecipePrintData` server action exists (`lib/print/print-actions.ts`). But no button on the recipe detail page links to either. The infrastructure is built and orphaned.
**Verdict: BROKEN. Wire the existing print view to a "Print" button on the recipe detail page. Zero new code needed, just one button.**

**Q3. A chef wants to download a quote PDF to review before sending to a client. They open the quote detail page. Where is the download button?**
NOWHERE on the chef quote detail page. The API route exists (`/api/documents/quote/[quoteId]`), the PDF generator works, the client-facing download exists. But `app/(chef)/quotes/[id]/page.tsx` has no link to any of them. The chef must know the API URL or go through the event's Documents tab instead.
**Verdict: BROKEN. Add "Download PDF" link to chef quote detail page. One link, zero new code.**

**Q4. A chef wants to export a single client's complete profile (events, preferences, financials, dietary info) to hand to a colleague who is covering their event. Where do they go?**
NOWHERE. Bulk client CSV export exists, full Takeout exists, but no single-client export. The colleague gets a spreadsheet of ALL clients or nothing.
**Verdict: GAP. Single-client profile export (PDF or JSON) needed on client detail page.**

**Q5. A chef wants to share a conversation thread with their business partner to show how a client negotiation went. Where do they go?**
NOWHERE. No export, no print, no share on any conversation page. The only way to get conversation data out is the full Takeout ZIP.
**Verdict: GAP. Single-conversation export or "copy thread" action needed.**

**Q6. A chef wants to export their menu with ingredient costs and recipe links (not just the pretty front-of-house card). Where do they go?**
NOWHERE for a single menu. The print view at `/print/menu/[id]` shows dish names and descriptions only, not costs or recipes. The `MenuCostSidebar` and `MenuBreakdownView` are screen-only, no export. The Takeout exports menus as JSON with costs, but that is all menus, not one.
**Verdict: GAP. Single-menu back-of-house export (CSV with costs/recipes) needed on menu detail page.**

---

## Domain 2: "Is This the Right Format?" (Format Consistency)

**Q7. A chef exports clients. They get a CSV. They export events. They get a CSV. They export a single event's financials. They get a CSV. They export the CPA package. They get a ZIP. They export a recipe. They cannot. Why does each entity have a different export story?**
Because each was built ad-hoc. There is no policy for "what format does entity X export as?" The answer should be predictable: data tables = CSV, visual documents = PDF, everything = JSON, subscribe = ICS.
**Verdict: DESIGN DECISION NEEDED. Establish a format policy and apply it retroactively. Proposed policy below.**

**Q8. The P&L page has "Download CSV." The Year-End page has "Download CPA Export (ZIP)." The Tax Center has "Download Tax Package (CSV)." A chef in a hurry grabs the wrong one. How do they know which is which?**
They don't. Three financial exports with different names, formats, and contents on three different pages. The CPA ZIP is the most complete, but "Tax Package CSV" sounds like the tax-specific one, and "P&L CSV" sounds like the summary. No page explains what the other pages offer.
**Verdict: FRAGMENTED. Each financial export page should include a one-line description of what it contains and link to the others. "Need the full package? Go to Year-End Export."**

**Q9. The GDPR export produces JSON. The Takeout produces ZIP (with JSON+CSV inside). Are these redundant?**
YES. The GDPR export (`components/settings/gdpr-tools.tsx`) and the Takeout are the same concept (export all my data) in two different wrappers. The GDPR export is less featured (just JSON dump), less organized (no folders), and less discoverable (buried in settings Privacy section).
**Verdict: REDUNDANT. Replace GDPR export button with a link to the Takeout page. One path, not two.**

---

## Domain 3: "Can I Trust This?" (Completeness and Accuracy)

**Q10. A chef exports their client list CSV. It has 23 rows. They know they have 25 clients. Where are the other 2?**
Soft-deleted (archived) clients. The CSV export filters `deleted_at IS NULL`. The chef archived 2 clients months ago but their events and payments still reference them. The chef does not know "archived" means "excluded from export."
**Verdict: AMBIGUOUS. Client CSV export should either (a) include archived with a status column, or (b) show a note "2 archived clients excluded. Include them?" with a toggle.**

**Q11. A chef exports events CSV. The "Quoted ($)" column shows $0.00 for 5 events. Are those free events or events without quotes?**
Could be either. The CSV exports `quoted_price_cents` directly. A null value (no quote) and a zero value (genuinely free) both render as empty string or $0.00. This is a Zero Hallucination violation: showing $0.00 for "unknown" makes it look like the event was free.
**Verdict: SPEC ERROR. CSV should distinguish null (no quote, show "N/A") from zero (show "$0.00"). Apply `csvRowSafe` and null-handling.**

**Q12. A chef exports the CPA package. The manifest says "detailRowCount: 247." They manually count 245 rows in the CSV. Why the discrepancy?**
The manifest counts include headers or summary rows depending on implementation. Or a race condition between manifest generation and CSV generation. Either way, the chef (or their accountant) does not trust the package.
**Verdict: Manifest counts must match file contents exactly. Automated test: parse the CSV, count rows, compare to manifest.**

---

## Domain 4: "I Need Just This One Thing" (Single-Item Export Gaps)

**Q13. A chef wants to email a single recipe to a client who asked "what was that amazing risotto?" Can they?**
NO. They can share the recipe to another CHEF on the platform. They cannot export it as PDF, link, or email to a CLIENT. The `RecipePrintView` exists but is unreachable. There is no `/share/recipe/[token]` public route.
**Verdict: HIGH-VALUE GAP. Recipe is the chef's most shared asset. Needs: (a) print button on recipe page (quick win, component exists), (b) shareable public link (medium effort, like event share tokens).**

**Q14. A chef is at a venue doing a site assessment. They want to pull up the event summary on their phone and show the venue manager the guest count, menu, and dietary restrictions. Can they share a read-only event view?**
YES, partially. The event share link (`/share/[token]`) exists for guest RSVPs, and the viewer link (`/view/[token]`) exists for read-only viewing. The venue manager could use the viewer link. But the share button does not explain this use case, and the viewer link's content may not include the operational details the venue needs (it is guest-facing, not operations-facing).
**Verdict: PARTIALLY COVERED. Viewer link exists but may need an "operations view" variant showing logistical details vs. guest-facing details.**

**Q15. A chef's business partner asks: "Send me everything about the Johnson wedding." The chef wants to export ONE event as a complete package: summary, menu, guest list, contract, invoice, all PDFs, financials, timeline. Can they?**
NO single action. They can download 10+ individual PDFs from the Documents tab, export the financial CSV from the Money tab, and... that is it. There is no "Download Complete Event Package" button that bundles everything.
**Verdict: HIGH-VALUE GAP. Single-event complete package (ZIP) would be the most-used export after individual PDFs. All the generators exist; they just need a "bundle all" wrapper.**

**Q16. A chef is closing their business and needs to export EVERYTHING to archive for 7 years (tax requirement). They use the Takeout page. Does it cover the 7-year tax retention requirement?**
PARTIALLY. The Takeout exports financials and documents, but tax retention requires: (a) all ledger entries with source references, (b) all receipts/invoices, (c) all contracts, (d) all expense records with categorization, (e) mileage logs, (f) payroll records, (g) 1099 contractor records. The Takeout covers most of this across Financials + Documents + Staff categories, but mileage logs and 1099 data are not in any category.
**Verdict: GAP. Add `mileage_logs` to Financials or Profile category. Verify 1099 data is in Staff (contractor_payments). Add note to Takeout page: "This export meets IRS 7-year retention requirements for Schedule C filers."**

---

## Domain 5: "Why Are There Two of These?" (Redundancy)

**Q17. `lib/exports/actions.ts` has `exportExpensesCSV()`. `lib/finance/export-actions.ts` also has `exportExpensesCSV()`. Are these the same function?**
Need to verify. Two different files, same function name, possibly different implementations. One may be the original, one may be a refactor that did not clean up the other.
**Verdict: AUDIT REQUIRED. Deduplicate or document the difference. A builder adding expense export to Takeout does not know which to call.**

**Q18. The Financials page (`/financials`) has "Export Ledger CSV" and "Export All Events CSV." The Finance Reporting pages (`/finance/reporting/*`) have similar CSV exports. Are these different data?**
Yes, they cover different views of the same underlying data. But the user sees "export" buttons on 5+ finance pages and does not know which one to use for their specific need.
**Verdict: FRAGMENTED but not redundant. Each finance export page should include a one-line "What this includes" description.**

**Q19. The commerce export menu (`components/commerce/export-menu.tsx`) has 6 separate CSV buttons. The Takeout's Financials category includes commerce data. Can the 6 individual exports be deprecated once Takeout ships?**
NO. The individual exports are filtered (by date range, by session, by type). The Takeout exports everything. Both have value: individual for "I need today's shift report," Takeout for "I need everything."
**Verdict: KEEP BOTH. Individual exports are not redundant with Takeout; they serve different needs.**

---

## Domain 6: "What Happens When I Click?" (UX Consistency)

**Q20. A chef clicks "Download CSV" on the P&L page. What happens?**
A server action runs, generates the CSV string, creates a blob in the browser, and triggers a download. The filename includes the year. No progress indicator. No success confirmation. It just downloads.
**Verdict: ACCEPTABLE for small CSVs. Pattern is consistent across most CSV exports.**

**Q21. A chef clicks "Download CPA Export" on the Year-End page. What happens?**
A server action builds the ZIP, returns base64, the client decodes it and triggers a download. Takes 2-5 seconds. During this time, the button shows a loading spinner. Filename includes year and export number.
**Verdict: GOOD. The CPA export has the most polished export UX.**

**Q22. A chef clicks "Download My Data" on the Takeout page with 14 categories selected. What happens?**
Per the spec: progress bar replaces button, category-by-category progress, cancel button available. This is the correct UX for a multi-second operation. But: is this UX pattern shared with any other export surface?
**Verdict: The Takeout export UX (progress bar, cancel) should be the TEMPLATE for any export that takes >2 seconds. Currently, only the CPA export has a loading state. All others are fire-and-forget.**

**Q23. A chef opens an event PDF in the viewer modal, then clicks "Print." The browser print dialog opens. They print. They close the modal. Then they click "Print All (8 Sheets)." A new tab opens with all 8 sheets concatenated. They print again. Why are these two different patterns?**
Because single-sheet viewing uses the `PDFViewerModal` (inline), while "Print All" opens a new tab with the concatenated PDF. The chef experiences two different print flows on the same page for the same category of content.
**Verdict: MINOR INCONSISTENCY. Both patterns work. Standardizing to one would be ideal but is low priority.**

---

## Domain 7: "Other People Need This Too" (Multi-User Export)

**Q24. A client wants to download their own data (events, invoices, dietary preferences, conversation history). Can they?**
YES, via the GDPR "Download My Data" button on the client account deletion page (`app/(client)/my-profile/delete-account/delete-account-form.tsx`). But it is only discoverable if the client is trying to DELETE their account. A client who just wants their data (without deleting) must navigate to the deletion page and find the download button there.
**Verdict: BROKEN UX. Client data export should have its own page or section, not be gated behind account deletion. Move to client profile/settings.**

**Q25. A staff member wants to download their time clock records for personal tracking. Can they?**
NO. Staff data is chef-owned. There is no staff-facing export. The chef can export payroll reports, but the staff member cannot self-serve their own hours.
**Verdict: LOW PRIORITY GAP. Staff self-service time export would be valuable but is not V1 scope.**

**Q26. An admin wants to export data across ALL tenants for platform analytics. Can they?**
NO, and this is intentional. The Takeout is per-chef. Admin analytics are a separate concern. The admin panel has its own export surfaces (price catalog CSV, beta survey results CSV).
**Verdict: CORRECT. Multi-tenant export is explicitly out of scope.**

---

## Domain 8: Orphaned Infrastructure (Built But Not Wired)

**Q27. `components/print/recipe-print-view.tsx` exists. `lib/print/print-actions.ts` has `getRecipePrintData()`. How many places in the app render `RecipePrintView`?**
ZERO. The component is fully built (styled recipe card with ingredients, instructions, allergens, checkboxes) but is never imported or rendered anywhere. No route, no button, no link points to it.
**Verdict: ORPHANED. Wire it. This is the highest-value quick win in the entire export audit.**

**Q28. `components/print/event-brief-print-view.tsx` exists. Where is it rendered?**
Needs verification. May be rendered via `PrintableDocument` wrapper or may also be orphaned.
**Verdict: AUDIT REQUIRED.**

**Q29. The FOH Menu PDF route requires an `eventId` (`/api/documents/foh-menu/[eventId]`). A chef wants a menu PDF for a menu that is not yet assigned to an event (a template menu). Can they get one?**
NO. The FOH PDF generator is event-scoped. The print view at `/print/menu/[id]` uses `window.print()` (not a generated PDF). So a template menu can only be printed via browser, not downloaded as a clean PDF.
**Verdict: GAP. Menu PDF generation should accept a `menuId` directly, with event context optional. Low priority since `window.print()` works as a workaround.**

---

## Domain 9: The Universal Export Component (Proposal)

**Q30. Should ChefFlow have a single `<ExportButton>` component that every entity uses?**
YES. A universal export component would:

- Accept `entityType` and `entityId`
- Show a dropdown: "Download PDF" / "Export CSV" / "Copy Link" / "Print" (options vary by entity type)
- Use consistent placement (always top-right of detail pages)
- Use consistent naming ("Export" not "Download" not "Save" not "Share")
- Route to the correct generator based on entity type

This replaces the current situation: 54 ad-hoc export implementations with 54 different UX patterns.
**Verdict: HIGH-VALUE INFRASTRUCTURE. Build `components/exports/universal-export-button.tsx` with entity type registry. Migrate existing exports incrementally.**

**Q31. What should the entity type registry look like?**

```ts
const EXPORT_REGISTRY: Record<string, ExportConfig> = {
  recipe: { pdf: true, print: true, shareLink: true, json: false },
  client: { pdf: true, csv: true, print: false, shareLink: false },
  event: { pdf: true, csv: true, print: true, shareLink: true, bundle: true },
  menu: { pdf: true, csv: true, print: true, shareLink: false },
  invoice: { pdf: true, print: true },
  contract: { pdf: true, print: true },
  quote: { pdf: true, print: true },
  conversation: { json: true, print: true },
}
```

**Verdict: This makes export capabilities declarative and auditable. New entities get export by adding one line.**

---

## Domain 10: Cohesion Scorecard

**Q32. Across all 54+ export surfaces, how many distinct UX patterns exist?**
At least 7:

1. Server action -> blob -> download (most CSVs)
2. API route -> new tab (most PDFs)
3. API route -> inline modal viewer (event operational PDFs)
4. `window.print()` on styled page (menus, station clipboards, grocery lists)
5. Server action -> base64 -> decode -> download (CPA ZIP, Takeout)
6. Copy to clipboard (URLs, text)
7. Email send (contracts)

**Verdict: 7 patterns is manageable but should reduce to 4-5. Patterns 1 and 5 should merge (streaming replaces base64). Pattern 4 should supplement Pattern 2 (add PDF download alongside print).**

**Q33. If ChefFlow had an "Export Philosophy" like it has an "Interface Philosophy," what would it say?**
Proposed:

1. **Every entity is exportable.** If a chef created it, they can get it out. No dead ends.
2. **One button, multiple formats.** Each detail page has one Export button with format options.
3. **Predictable placement.** Export button always top-right of detail pages.
4. **Self-contained output.** Every exported file is useful alone (names resolved, not IDs).
5. **Honest about scope.** Each export page says what it includes and what it does not.
6. **Print is not export.** Print is for kitchen walls. Export is for accountants, partners, and archives. Both should exist but are different actions.
   **Verdict: WRITE THIS. Add to `docs/specs/universal-interface-philosophy.md` as a new section.**

---

## Priority Action Queue

### Quick Wins (zero new code, just wiring)

| #   | Action                                                      | Effort   | Impact                               |
| --- | ----------------------------------------------------------- | -------- | ------------------------------------ |
| 1   | Wire `RecipePrintView` to recipe detail page "Print" button | 1 button | HIGH: most-requested missing export  |
| 2   | Add "Download PDF" link to chef quote detail page           | 1 link   | MEDIUM: API exists, button missing   |
| 3   | Replace GDPR export with link to Takeout page               | 1 edit   | LOW: removes redundancy              |
| 4   | Move client data export away from deletion page             | 1 move   | MEDIUM: fixes broken discoverability |

### Small Builds (< 1 day each)

| #   | Action                                                   | Effort  | Impact                                  |
| --- | -------------------------------------------------------- | ------- | --------------------------------------- |
| 5   | Single-client profile export (PDF) on client detail page | Small   | HIGH: zero single-client export exists  |
| 6   | Single-event complete package (ZIP) on event detail page | Small   | HIGH: bundles existing generators       |
| 7   | Single-conversation "Copy Thread" or export on chat page | Small   | MEDIUM: zero conversation export exists |
| 8   | Add `mileage_logs` to Takeout Financials category        | Trivial | MEDIUM: tax retention completeness      |

### Medium Builds (infrastructure)

| #   | Action                                                     | Effort | Impact                                |
| --- | ---------------------------------------------------------- | ------ | ------------------------------------- |
| 9   | `UniversalExportButton` component with entity registry     | Medium | HIGH: standardizes all future exports |
| 10  | Export Philosophy section in interface philosophy doc      | Small  | HIGH: prevents future fragmentation   |
| 11  | "What this includes" one-liner on all finance export pages | Small  | MEDIUM: reduces confusion             |
| 12  | CSV null vs zero handling across all exports               | Small  | MEDIUM: Zero Hallucination compliance |

---

## Summary Scorecard

| Domain              | Questions | Broken                             | Gaps                                              | Fragmented                             | OK  |
| ------------------- | --------- | ---------------------------------- | ------------------------------------------------- | -------------------------------------- | --- |
| Discoverability     | Q1-Q6     | 2 (recipe print, quote PDF)        | 3 (client, conversation, menu costs)              | 1 (tax export paths)                   | 0   |
| Format Consistency  | Q7-Q9     | 0                                  | 0                                                 | 2 (format policy, GDPR redundancy)     | 1   |
| Trust/Accuracy      | Q10-Q12   | 0                                  | 1 (null vs zero)                                  | 1 (archived clients)                   | 1   |
| Single-Item Gaps    | Q13-Q16   | 0                                  | 4 (recipe share, event bundle, mileage, tax note) | 0                                      | 1   |
| Redundancy          | Q17-Q19   | 0                                  | 0                                                 | 2 (expense duplication, finance pages) | 1   |
| UX Consistency      | Q20-Q23   | 0                                  | 0                                                 | 1 (print modal vs tab)                 | 3   |
| Multi-User          | Q24-Q26   | 1 (client export on deletion page) | 1 (staff self-serve)                              | 0                                      | 1   |
| Orphaned Code       | Q27-Q29   | 2 (recipe print, menu PDF scope)   | 0                                                 | 0                                      | 0   |
| Universal Component | Q30-Q31   | 0                                  | 1 (no universal component)                        | 0                                      | 0   |
| Cohesion            | Q32-Q33   | 0                                  | 1 (no export philosophy)                          | 0                                      | 0   |

**Totals: 5 broken, 11 gaps, 7 fragmented, 8 OK across 33 questions.**

The highest leverage action is **Q27 (wire recipe print)**: zero new code, fixes the most commonly needed single-item export, and proves the pattern for fixing Q3 (quote PDF), Q4 (client export), and Q6 (menu cost export).
