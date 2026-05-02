# Persona Build Category -> Module Mapping

> Generated 2026-05-02. Every persona gap MUST map to a module slug before it gets built.
> No module = no build. Period.

## The Rule

Nothing from persona synthesis gets built unless:

1. It maps to an existing module slug
2. The build goes INTO that module's file tree
3. Nav items register under that module's navGroupId

## Category -> Module Map

| Category              | Module Slug            | Gaps | Notes                                                                                                 |
| --------------------- | ---------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| Payment Financial     | `finance`              | 87   | Direct fit. Invoicing, billing, pricing, costing                                                      |
| Communication         | `clients`              | 66   | Client/vendor comms, messaging, bilingual drafts                                                      |
| Scheduling Calendar   | `events`               | 40   | Timelines, sync, conflict flagging                                                                    |
| Compliance Legal      | `protection`           | 27   | Audit trails, traceability, compliance gates                                                          |
| Sourcing Supply       | `operations`           | 30   | Vendor portals, supplier vetting, supply chain                                                        |
| Reporting Analytics   | `more`                 | 32   | Dashboards, data aggregation, role-based views                                                        |
| Recipe Menu           | `culinary`             | 25   | Menu builders, recipe costing, prep workflows                                                         |
| Documentation Records | `protection`           | 21   | Audit logs, decision logging, doc version control                                                     |
| Costing Margin        | `culinary` + `finance` | 13   | Recipe costing -> culinary. Labor/waste -> finance                                                    |
| Dietary Medical       | `culinary`             | 10   | Allergen matrix, dietary constraints, cross-contact                                                   |
| Staffing Team         | `station-ops`          | 7    | Staff scheduling, labor costing, delegation                                                           |
| Scaling Multi         | `multi-location`       | 5    | Multi-unit dashboards, cross-site ops                                                                 |
| Event Lifecycle       | `events`               | 4    | Pop-up mode, ephemeral events, sales channels                                                         |
| Ticketing Drops       | `commerce`             | 3    | Drop engine, high-demand release                                                                      |
| Location Venue        | `events`               | 3    | Venue constraints, resource allocation                                                                |
| Delivery Logistics    | `operations`           | 3    | Traceability exports, logistics tracking                                                              |
| Access Control        | `commerce`             | 2    | Tiered access, waitlist management                                                                    |
| Audience Community    | `social-hub`           | 2    | Audience curation, guest vetting                                                                      |
| Dosing Cannabis       | **REJECTED**           | 7    | Hyper-niche (3 personas). Basic cannabis compliance already exists. Full dose-curve engine is not V1. |
| Uncategorized         | **NEEDS TRIAGE**       | 205  | See triage section below                                                                              |

## Uncategorized Triage Rules

The 205 "uncategorized" gaps split into existing modules:

| Pattern                                                              | Target Module           |
| -------------------------------------------------------------------- | ----------------------- |
| Inventory, yield tracking, usage deduction, lot tracking             | `operations`            |
| Project management, centralized command, scope creep, dependency map | `events`                |
| Dynamic quoting, fulfillment invoicing                               | `pipeline` or `finance` |
| Loyalty programs, tiered rewards                                     | `finance`               |
| Multi-signature approval, executive override                         | `protection`            |
| Workflow/UX (flexibility, information overload, visual workflow)     | `dashboard`             |
| Story depth, curator/expert layer                                    | `more`                  |
| Staff delegation, multi-chef governance                              | `station-ops`           |
| POS, counter sales                                                   | `commerce`              |

## Module Build Priority (by gap count)

1. `finance` - 87+ gaps (payment + costing margin labor side)
2. `clients` - 66 gaps (communication)
3. `events` - 47+ gaps (scheduling + lifecycle + location + uncategorized project mgmt)
4. `more` - 32 gaps (reporting analytics)
5. `operations` - 33+ gaps (sourcing + delivery + uncategorized inventory)
6. `protection` - 48 gaps (compliance + documentation)
7. `culinary` - 48 gaps (recipe + dietary + costing margin recipe side)
8. `station-ops` - 7+ gaps (staffing)
9. `commerce` - 5 gaps (ticketing + access)
10. `social-hub` - 2 gaps (audience)
11. `multi-location` - 5 gaps (scaling)
12. `dashboard` - uncategorized UX items
13. `pipeline` - uncategorized quoting items

## Quality Gate

The 304 persona build plan directories (`system/persona-build-plans/`) are LOW QUALITY:

- Hallucinated file paths (pages/\_app.tsx, index.tsx instead of page.tsx)
- Wrong patterns (React Router instead of Next.js Link)
- No awareness of existing features
- Generic acceptance criteria
- Massive duplication across personas

**Do NOT hand these to Codex agents.** Use the category build docs as gap inventories instead.
Regenerate module-aware specs with real file paths before building.
