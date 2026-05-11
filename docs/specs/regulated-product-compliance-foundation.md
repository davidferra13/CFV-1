# Regulated Product Compliance Foundation

Created: 2026-05-11

## Purpose

This foundation turns the cannabis tincture research into reusable ChefFlow infrastructure. The goal is not to make cannabis-specific code deeper. The goal is to promote the strongest cannabis patterns into platform capabilities that also support HACCP, allergen service records, vendor provenance, specialty ingredients, fermented products, meal-prep batches, and venue compliance.

## New Interfaces

### `lib/formulas/regulated-product.ts`

Deterministic math for regulated product calculations:

- acidic-to-neutral cannabinoid conversion
- dry-weight potency correction
- potential cannabinoid mass
- process-loss adjusted final mass
- liquid potency in mg/mL
- dose volume
- density conversion
- transfer efficiency
- label variance

This module follows the Formula > AI rule. AI should explain results, not calculate them.

### `lib/compliance/coa-intake.ts`

COA intake evaluation for source materials:

- lot matching
- lab identity and accreditation presence
- sample/report date presence
- cannabinoid panel presence
- required contaminant panel checks
- residual solvent requirement for solvent extracts
- total THC and total CBD calculation

The interface returns `accepted`, `review`, or `rejected` with red flags.

### `lib/compliance/batch-record.ts`

Builds an audit-ready regulated batch summary from:

- source material
- COA
- process efficiencies
- final volume
- target dose
- optional label claim

The output is a release-oriented summary, not a database row. It is ready to back a UI and migration.

### `lib/compliance/compliance-packet.ts`

Generic plan -> execute -> verify -> lock primitives:

- snapshot completeness
- reconciliation completeness
- evidence completeness
- finalization mutation guard

Cannabis control packets can eventually become an adapter over this generic packet model.

## Next Build Slice

The next implementation should be migration-backed and additive:

1. Add `regulated_batch_records`.
2. Add `regulated_batch_sources`.
3. Add `regulated_batch_coas`.
4. Add `regulated_batch_release_checks`.
5. Add `compliance_packets`.
6. Add `compliance_packet_evidence`.
7. Wire an Inventory or Compliance UI for creating a batch record.
8. Add export/print support for a completed compliance packet.

Before writing those migrations, show the SQL and back up the database.

## Test Coverage

Focused unit tests cover the public interfaces:

- `tests/unit/regulated-product-formulas.test.ts`
- `tests/unit/coa-intake.test.ts`
- `tests/unit/batch-record.test.ts`
- `tests/unit/compliance-packet.test.ts`
