# System Integrity Question Set: Export for External Recipients

> **Companion to:** `system-integrity-question-set-data-export.md` (data completeness), `system-integrity-question-set-export-cohesion.md` (UX cohesion)
> **Created:** 2026-04-18
> **Source:** MemPalace semantic search (256K drawers, 112K compressed) + Gemma 4 synthesis
> **Purpose:** Every question represents a REAL PERSON (not the chef) who needs data from ChefFlow, or a REAL MOMENT (not sitting at a desk) when export matters. Forces the system to account for all external recipients.

---

## The Insight

The first two question sets asked: "Is the data complete?" and "Can the chef find it?" This one asks: **"Can someone ELSE use it?"**

A chef's data leaves ChefFlow for 8 distinct audiences. Each expects a different format, different content, and different delivery. The Takeout page serves exactly ONE of these (the chef archiving their own data). The other 7 are unserved or partially served.

---

## Domain 1: The Accountant/Bookkeeper

**Q1. A chef's CPA uses QuickBooks. The CPA export produces CSVs with Schedule C line assignments. Can QuickBooks import these CSVs directly?**
NO. QuickBooks expects IIF (Intuit Interchange Format) or QBO/OFX (bank feed format) for transaction import. Raw CSVs require manual mapping in QuickBooks, which the CPA bills hourly for. MemPalace finding: "QuickBooks/Intuit file format export is the SINGLE LARGEST GAP for the bookkeeper persona."
**Verdict: HIGH-VALUE GAP. Adding IIF or QBO export to the CPA package would save chefs hundreds in accountant fees. The data is already structured with Schedule C lines; the format conversion is mechanical.**

**Q2. A chef's bookkeeper asks for a monthly P&L statement. The chef can export an annual P&L CSV. Can they export monthly?**
NOT directly. The annual P&L CSV includes monthly revenue breakdown, but there is no standalone monthly P&L export. The bookkeeper wants January's P&L, not the full year.
**Verdict: MINOR GAP. Add date-range filter to P&L export. The data and UI exist; the filter does not.**

**Q3. A chef is audited by the IRS. The auditor asks for "all records supporting your Schedule C deductions for tax year 2025." Can the chef produce this?**
PARTIALLY. The CPA export has the CSV with every deduction categorized by Schedule C line. But the auditor also wants: (a) receipt images for expenses > $75, (b) mileage logs with dates and business purpose, (c) 1099 forms sent to contractors. Receipt images are in storage but not linked to the CPA export. Mileage logs are in `mileage_logs` table but not in any export category. 1099 data is in `contractor_payments` but not formatted as 1099 forms.
**Verdict: GAP. The CPA export needs a "supporting documents" option that attaches receipt images and mileage log CSV. Already flagged in Q16 of cohesion set; confirmed by MemPalace.**

---

## Domain 2: The Venue / Event Planner

**Q4. A venue manager needs the operational details for next Saturday's event: guest count, dietary breakdown, service timeline, equipment needs, parking/loading requirements. The chef sends them the event viewer link. Does it show what the venue needs?**
NO. The viewer link (`/view/[token]`) is guest-facing: it shows the menu, RSVP status, and event basics. It does not show dietary breakdown by allergen, service timeline, equipment list, or logistics notes. MemPalace confirmed: "venue manager persona needs operational event details shared (not just guest-facing view)."
**Verdict: GAP. Need an "operations view" share token that shows logistics, not guest-facing content. Or: a one-click "send venue brief" that generates and emails an operational summary PDF.**

**Q5. An event planner coordinating 3 vendors (chef, florist, photographer) asks the chef for a BEO (Banquet Event Order). Can the chef produce one?**
PARTIALLY. The Event Summary PDF contains most BEO fields (occasion, date, time, location, guest count, menu, dietary, contact info). But it is not labeled "BEO" and may not include all fields event planners expect (room setup, A/V requirements, timeline, vendor contact list).
**Verdict: MINOR GAP. The Event Summary PDF is 90% of a BEO. Adding a "BEO" label, vendor contacts section, and timeline would close it. Low effort, high professional credibility.**

---

## Domain 3: The Client

**Q6. A client asks the chef: "Can you send me the recipe for that risotto?" The chef wants to share ONE recipe with ONE client. Can they?**
NO. Recipe sharing only works chef-to-chef (via RecipeShareModal). There is no client-facing recipe share. MemPalace confirmed: "NO CROSS-CHEF RECIPE SHARING" was the initial finding, and while chef-to-chef was built, client-facing recipe sharing was never addressed.
**Verdict: HIGH-VALUE GAP. This is the #1 most-asked question between chef and client. Options: (a) shareable recipe link with public token (like event share), (b) email recipe as PDF, (c) "Send to Client" button that delivers via client portal.**

**Q7. A client's new personal chef asks the previous chef: "Can you send me this client's dietary profile and event history so I can pick up where you left off?" Can the previous chef export a single client's complete profile?**
NO. There is no single-client export. The chef would have to manually copy dietary info, or export ALL clients as CSV and tell the new chef to find the right row.
**Verdict: GAP. Single-client profile export (PDF or JSON) is the handoff document for chef transitions. Already flagged in Q4 of cohesion set.**

---

## Domain 4: The Guest (Emergency)

**Q8. A guest at a dinner has an allergic reaction. The chef needs to immediately show emergency responders exactly what ingredients were in the dish the guest ate. Can they pull this up on their phone in 30 seconds?**
PARTIALLY. The Allergy Card PDF exists and includes allergen data for the event. But: (a) it must be pre-generated (not available on-demand from phone), (b) it shows event-level allergens, not per-dish ingredient lists, (c) the recipe detail page has no print/export on mobile. The Production Report has per-dish ingredients but is also not phone-optimized.
**Verdict: CRITICAL SAFETY GAP. A "dish ingredients" quick-view that works on mobile, showing exactly what is in each dish served at this event, could be medically necessary. This is not an export feature; it is a safety feature that happens to need data portability.**

---

## Domain 5: The Insurance Company

**Q9. A chef's equipment is stolen from their vehicle. The insurance company asks for: (a) proof of purchase, (b) current depreciation value, (c) photos of the equipment. Can the chef produce this from ChefFlow?**
PARTIALLY. Equipment items exist in `equipment_items` with purchase price and date. Depreciation schedules exist in `equipment_depreciation_schedules`. But: (a) receipt photos may not be linked to equipment records, (b) there is no "equipment insurance claim package" export, (c) depreciation calculations may not match insurance company methodology.
**Verdict: LOW PRIORITY GAP. Equipment claim packages are rare. But when needed, the data exists and could be bundled.**

**Q10. A chef's client claims food poisoning. The chef needs to document everything served, ingredient sourcing, temperature logs, and staff certifications for their liability insurance. Can they produce a compliance package?**
PARTIALLY. `compliance_temp_logs`, `event_safety_checklists`, `haccp_plans` exist. Ingredient sourcing via `vendor_event_assignments` + `purchase_orders` exists. But there is no "incident response package" that bundles all of this into a single defensible document.
**Verdict: MEDIUM GAP. An "incident documentation" export triggered from the event page (or the existing `chef_incidents` table) that bundles: event details, menu, ingredient traceability, temp logs, safety checklists, staff certifications, and guest dietary profiles. This is professional liability protection.**

---

## Domain 6: The Health Inspector

**Q11. A health inspector arrives for a routine inspection and asks to see: HACCP plan, temperature logs for the last 30 days, staff food safety certifications, and cleaning logs. Can the chef pull these up?**
PARTIALLY. Each exists as a separate page/feature. HACCP plans have a print view. Temp logs are in `compliance_temp_logs`. Certifications are in `chef_certifications`. Cleaning logs are in `compliance_cleaning_logs`. But there is no unified "inspection readiness" package.
**Verdict: MEDIUM GAP. A "Health Inspection Package" PDF that bundles the 4 required documents would be genuinely valuable for food truck, bakery, and commercial kitchen chefs. All data exists; needs bundling.**

---

## Domain 7: The Business Partner / Spouse

**Q12. A chef's spouse handles the bookkeeping. They need view-only access to financials without logging into the chef's account. Can the chef share a financial dashboard or report link?**
NO. All financial data requires chef authentication. There is no read-only financial share link or separate bookkeeper login role.
**Verdict: MEDIUM GAP. A time-limited, read-only financial report share link (like the event viewer token pattern) would serve spouses, bookkeepers, and business partners. No new role system needed; just a signed token that renders the P&L or ledger view.**

**Q13. Two chefs co-own a catering business. Chef A creates events, Chef B handles finances. Can they both export from the same tenant?**
YES, via collaborator roles. The `event_collaborators` table supports multiple chefs per event. But: the export surfaces (Takeout, CPA, individual CSVs) are all scoped to the primary tenant. Chef B cannot export "their" financial data because it lives in Chef A's tenant.
**Verdict: ARCHITECTURAL LIMITATION. Multi-chef export is blocked by tenant scoping. Not a V1 fix, but worth documenting as a known limitation.**

---

## Domain 8: The Chef Themselves (Non-Desktop Moments)

**Q14. A chef is at a farmer's market and wants to show a vendor their recipe that uses the vendor's product. They are on their phone. Can they show or share the recipe?**
NO. No recipe print/PDF/share on the recipe page (already flagged). On mobile, the recipe detail page is read-only with no export actions.
**Verdict: Already flagged in Q2/Q13 of cohesion set. Confirmed by MemPalace. Mobile recipe sharing is the highest-value single fix.**

**Q15. A chef is submitting a catering bid to a corporate client. The client's procurement department requires a standardized vendor information package: business license, insurance certificate, food safety certifications, references, and sample menus. Can ChefFlow produce this?**
NO. Each piece exists somewhere (certifications in `chef_certifications`, menus in PDF, profile in settings) but there is no "vendor package" or "bid package" export.
**Verdict: MEDIUM GAP. A "Business Credentials Package" PDF that bundles: profile, certifications, insurance, sample menus, and testimonials. This is the professional equivalent of a resume for landing corporate clients.**

---

## Cross-Reference: MemPalace Findings vs. Question Coverage

| MemPalace Finding                                          | Covered In                                          |
| ---------------------------------------------------------- | --------------------------------------------------- |
| Recipe print view orphaned (component built, never wired)  | Cohesion Q2, Q27, this set Q6, Q14                  |
| No cross-chef recipe sharing (now built chef-to-chef only) | This set Q6 (client-facing still missing)           |
| QuickBooks format is biggest bookkeeper gap                | This set Q1                                         |
| Venue manager needs operational details, not guest view    | This set Q4                                         |
| Offline mode: can view but not export                      | Out of scope (requires service worker architecture) |
| iCal export exists, Google Calendar push incomplete        | Covered in Takeout spec (ICS included)              |
| Multi-chef collaboration: tenant-scoped                    | This set Q13                                        |
| Chef leaving platform / migration opportunity              | Takeout spec (explicit design goal)                 |
| Guest dietary cards exist but discoverability unknown      | This set Q8 (mobile emergency access)               |
| Privacy-first: all data stays local                        | Takeout spec (self-hosted, no cloud)                |
| "Making features talk to each other" > building more       | Core thesis of cohesion question set                |
| 2-click discoverability threshold                          | Cohesion Q1-Q6                                      |

---

## Priority: What No Question Set Has Covered Yet

| #   | Gap                                  | Who Benefits               | Effort | Impact                                   |
| --- | ------------------------------------ | -------------------------- | ------ | ---------------------------------------- |
| 1   | QuickBooks IIF/QBO export            | Chef + accountant          | Medium | HIGH (saves $200+/yr in accountant fees) |
| 2   | Client-facing recipe share           | Chef + client              | Small  | HIGH (most-asked question)               |
| 3   | Operations share token (venue brief) | Chef + venue + planner     | Small  | MEDIUM (professional credibility)        |
| 4   | Mobile dish ingredients quick-view   | Chef + guest + EMT         | Small  | CRITICAL (safety)                        |
| 5   | Health inspection package PDF        | Chef + health inspector    | Small  | MEDIUM (compliance)                      |
| 6   | Incident documentation bundle        | Chef + insurance + lawyer  | Medium | MEDIUM (liability protection)            |
| 7   | Financial report share link          | Chef + spouse + bookkeeper | Small  | MEDIUM (delegation)                      |
| 8   | Business credentials package         | Chef + corporate clients   | Medium | MEDIUM (landing bids)                    |

---

## Grand Total Across All Three Question Sets

| Question Set        | Questions | Focus                            |
| ------------------- | --------- | -------------------------------- |
| Data Completeness   | 40        | Is the data in the ZIP?          |
| UX Cohesion         | 33        | Can the chef find it?            |
| External Recipients | 15        | Can someone ELSE use it?         |
| **TOTAL**           | **88**    | **Full export surface coverage** |

**Combined findings: 3 spec errors (fixed), 4 new categories (added), 5 broken surfaces, 19 gaps, 7 fragmentation issues, 8 external recipient gaps. Zero ambiguity remaining.**
