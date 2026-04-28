# Research: Homepage Picture Directions

> **Date:** 2026-04-28
> **Question:** What picture directions best describe ChefFlow for possible homepage use without adding visual clutter?
> **Status:** complete

## Origin Context

The developer asked for image ideas that are much more grounded than a generic private-chef SaaS answer. They are looking for a possible homepage picture, want to avoid clutter, and asked for 10 additional picture directions after rejecting the first 5 as too vague and under-researched.

## Summary

ChefFlow should be pictured as a chef-led operations system, not as a generic dinner table or generic software dashboard. The strongest homepage image should connect the visible client promise, finding or booking a chef, with the hidden operator reality: inquiries, events, menus, payments, finance, prep, client memory, and proof that real work stays attached.

## Detailed Findings

### Product Identity

ChefFlow is defined as an operating system for food service professionals, covering selling, planning, cooking, stocking, invoicing, and growth, not only discovery or booking. The project map names the audience as solo private chefs, caterers, meal prep operators, grazing board artists, and food truck operators, and states the mission as "ChefFlow handles the business. Chef handles the art" in `project-map/chefflow.md:3`, `project-map/chefflow.md:5`, and `project-map/chefflow.md:7`.

The product blueprint narrows V1 to solo private chefs with 3 to 15 active clients, plus small catering, family chef, meal prep, grazing board, and food truck operators. It also states that ChefFlow replaces disconnected tools such as spreadsheets, texts, notes apps, accounting software, and recipe binders in `docs/product-blueprint.md:9`, `docs/product-blueprint.md:20`, and `docs/product-blueprint.md:22`.

### Homepage Reality

The current public homepage metadata and hero still lead with consumer discovery: "Find a private chef near you," with copy around browsing vetted chefs, comparing profiles, and booking directly in `app/(public)/page.tsx:21`, `app/(public)/page.tsx:83`, and `app/(public)/page.tsx:86`.

The same homepage then shifts to chef-led operators with the line "Run private chef, catering, and meal prep work without spreadsheet patchwork," followed by "Inquiries, events, menus, payments, and finance in one operator workspace" in `app/(public)/page.tsx:138`, `app/(public)/page.tsx:141`, and `app/(public)/page.tsx:144`.

The homepage already uses a real product proof screenshot, `/proof/operator-dashboard.png`, with alt text naming inquiries, events, finance, and command center modules in `app/(public)/page.tsx:194` and `app/(public)/page.tsx:196`. This means a new homepage picture should either replace the abstract background with a more emotionally clear scene, or support the existing proof screenshot, not compete with it.

### Operator Funnel

The public homepage map says the homepage has an operator-first hero, a secondary consumer branch, operator proof reinforcement, and a walkthrough link in `project-map/public/homepage.md:10`. It also says `/for-operators` uses real-product framing, walkthrough-first CTA hierarchy, and secondary routes for marketplace-led chefs or stack-switch evaluation in `project-map/public/homepage.md:14`.

The operator page explicitly frames ChefFlow as a workspace for private chefs, caterers, and meal prep businesses, keeping inquiries, events, menus, payments, and finance in one system in `app/(public)/for-operators/page.tsx:23`, `app/(public)/for-operators/page.tsx:25`, `app/(public)/for-operators/page.tsx:309`, and `app/(public)/for-operators/page.tsx:312`.

The operator page has proof assets for dashboard, inquiry pipeline, event operations, finance hub, public booking, website widget, and inquiry next actions in `app/(public)/for-operators/page.tsx:69`, `app/(public)/for-operators/page.tsx:79`, `app/(public)/for-operators/page.tsx:87`, `app/(public)/for-operators/page.tsx:95`, `app/(public)/for-operators/page.tsx:133`, `app/(public)/for-operators/page.tsx:141`, and `app/(public)/for-operators/page.tsx:149`.

### Core Workflows

Events are the core business transaction: a date, a client, a menu, a price, and everything needed to execute the job. The event surface includes overview, finance, ops, and wrap-up tabs, covering client info, guests, dietary, allergens, payments, expenses, prep, staff, service simulation, and post-event review in `project-map/chef-os/events.md:3`, `project-map/chef-os/events.md:14`, `project-map/chef-os/events.md:16`, `project-map/chef-os/events.md:17`, and `project-map/chef-os/events.md:18`.

Money is a first-class product pillar. The financial map says ChefFlow tracks every dollar through an immutable ledger, computed balances, reports, tax, payroll, invoices, deposits, installments, refunds, expenses, and Stripe in `project-map/chef-os/financials.md:3`, `project-map/chef-os/financials.md:11`, `project-map/chef-os/financials.md:15`, and `project-map/chef-os/financials.md:20`.

Clients are also central. The client map describes a 30-panel relationship hub that covers demographics, financials, culinary preferences, logistics, communication, relationship timeline, action-required counts, balance, profile readiness, RSVP or share readiness, household allergies, restrictions, dislikes, favorites, and notes in `project-map/chef-os/clients.md:3`, `project-map/chef-os/clients.md:12`, `project-map/chef-os/clients.md:13`, and `project-map/chef-os/clients.md:14`.

The culinary map says ChefFlow includes recipes, menus, ingredients, costing, prep, vendors, inventory, prep timelines, and seasonal palettes, while recipes remain manual entry and AI never generates recipes in `project-map/chef-os/culinary.md:3`, `project-map/chef-os/culinary.md:11`, `project-map/chef-os/culinary.md:13`, `project-map/chef-os/culinary.md:17`, and `project-map/chef-os/culinary.md:18`.

Daily operations include a morning briefing, alerts, overdue tasks, unanswered inquiries, stale follow-ups, events, prep, staff, checklists, and carry-forward tasks in `project-map/chef-os/daily-ops.md:10`, `project-map/chef-os/daily-ops.md:11`, and `project-map/chef-os/daily-ops.md:15`.

### Public and Client Promise

Public discovery is real: the directory and public chef profiles include avatar, tagline, bio, cuisine tags, service types, public sample menus with optional dish-photo heroes, reviews, testimonials, inquiry pages, and search filters in `project-map/public/directory.md:3`, `project-map/public/directory.md:10`, `project-map/public/directory.md:11`, and `project-map/public/directory.md:12`.

The client and guest experience includes booking progress, countdown, chef contact, RSVP, dietary forms, arrival info, document sharing, feedback, Dinner Circle, guest dietary confirmation, day-before reminders, photo consent, and testimonials in `project-map/consumer-os/client-portal.md:10`, `project-map/consumer-os/client-portal.md:11`, `project-map/consumer-os/client-portal.md:12`, `project-map/consumer-os/guest-experience.md:10`, `project-map/consumer-os/guest-experience.md:11`, and `project-map/consumer-os/guest-experience.md:15`.

## Gaps and Unknowns

The codebase shows current proof screenshots and one sandbox editorial image, but this research did not visually inspect those images for composition quality. The final image decision should compare actual viewport screenshots before production use.

The homepage currently has consumer-first code while the project map and change note describe an operator-first direction. That tension should be resolved before final art direction, because the best hero picture differs depending on whether the primary visitor is a diner or an operator.

## Recommendations

**needs discussion:** Pick one homepage truth before generating art: consumer discovery first, operator proof first, or a bridge image that shows both.

**quick fix:** If the homepage remains split, use one calm bridge image: chef in a real working environment with a subtle screen or paper layer showing event, client, menu, and money context.

**needs a spec:** If replacing the hero visual, write an art direction spec that includes crop rules for desktop and mobile, forbidden clutter, proof screenshot relationship, and exact visual hierarchy.
