# ChefFlow - Project Map

> Browse this folder like Google Drive. Each file is a card describing one area of the product.
> Agents: update these files when you build or change features in that area.

## Structure

```
project-map/
  chefflow.md              What ChefFlow is. Mission. V1 scope.
  chef-os/                 Everything the chef sees and uses
    dashboard.md           Command center, widgets, daily snapshot
    events.md              Event lifecycle (inquiry to wrap-up)
    clients.md             CRM, relationship hub, 30 panels
    inquiries.md           Sales pipeline (inquiries, quotes, leads, calls)
    financials.md          Money in, money out, ledger, tax, reporting
    culinary.md            Recipes, menus, ingredients, costing, prep
    calendar.md            Schedule views, sync, production calendar
    staff.md               Team management, tasks, stations, activity
    daily-ops.md           Morning briefing, daily plan, shift handoff
    analytics.md           Business intelligence, funnel, metrics
    settings.md            54 configuration pages
  consumer-os/             Everything the client/guest sees
    client-portal.md       Event pages, RSVP, dietary, feedback
    guest-experience.md    Pre-event, day-of, post-event journey
    loyalty.md             Points, tiers, rewards, gift cards
  public/                  What anyone can see (no login)
    homepage.md            Landing page, booking, Remy widget
    directory.md           Food operator discovery, public profiles
    embed-widget.md        External inquiry capture (any website)
  infrastructure/          What powers everything
    auth.md                Authentication, roles, sessions
    database.md            PostgreSQL, schema, migrations
    ai.md                  Ollama, Gemini, Remy, Gustav
    realtime.md            SSE, presence, live updates
    storage.md             Files, signed URLs, uploads
    email.md               Gmail integration, templates
    openclaw.md            Price scraping, data pipeline (Raspberry Pi)
    mission-control.md     Developer ops dashboard (localhost:41937)
```

## Rules

- Each file is SHORT (30-50 lines max). Just the facts.
- Format: what it is, key routes, key files, status, open items.
- When you build something, update the relevant file here.
- When something breaks, note it in the file's "Open Items" section.
- This folder is for orientation, not documentation. Keep it scannable.
