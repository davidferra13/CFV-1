---
name: failure-rubric
description: Foundational failure philosophy - 12 product mirrors, 3 failure types (Void/Island/Facade), passing grades per domain, scoring A-F
metadata:
  type: project
---

ChefFlow mirrors 12+ product categories (CRM, events, recipes, finance, proposals, kitchen ops, inventory, staff, marketing, pipeline, calendar, guest/loyalty). Each has a defined passing grade based on real competitors (HoneyBook, Meez, QuickBooks, Pipedrive, etc.).

Three universal failure types:

1. **The Void** - action taken, no visible feedback
2. **The Island** - data exists but disconnected from related entities
3. **The Facade** - page exists but feature is shallow/non-functional

**Why:** Every human digests the world visually. Invisible work = no work. Disconnected data = manual work. Shallow features = broken promises.

**How to apply:** Before shipping any feature, check: (1) does every action produce visible feedback? (2) is data connected to related entities? (3) does it actually DO what it claims? Compare to the passing grade for the mirrored product. Score A-F.

Universal law: **If the user has to leave your app to do the thing your app claims to do, you failed.**

Full doc: `docs/specs/failure-rubric.md`
Current scorecard: `docs/specs/failure-rubric-scorecard.md`

Related: [[foundational-philosophy]], [[ultimate-instrument-ui]], [[operational-copilot-philosophy]]
