# Flexible Payment Structures

ChefFlow now lets a quote carry a structured payment plan without requiring a database migration.

## What Changed

- Quote creation can store one of five payment structures: full upfront, deposit plus balance, thirds, split-even, or custom terms.
- The selected structure is saved inside the existing quote `pricing_context` JSON.
- Chef and client quote detail pages render the same structured plan.
- When a quote is sent or accepted for a linked event, ChefFlow seeds `payment_plan_installments` from the structure only if that event does not already have installments.

## Why This Shape

The current system already has quote pricing context and event payment installments. Using those existing surfaces gives chefs more charging flexibility now without adding schema risk or creating a second source of truth.

## Current Boundary

This is a quote-to-billing connector, not a new ledger allocation engine. Actual money received remains ledger-first through existing Stripe and offline payment flows. A future migration can add per-payer obligations and ledger allocations if split collection needs to become payment-intent specific.

