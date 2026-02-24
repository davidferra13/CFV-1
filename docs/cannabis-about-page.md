# Cannabis Portal — About Page

**Created:** 2026-02-24
**Route:** `/cannabis/about`
**Branch:** `feature/risk-gap-closure`

---

## What Was Built

A comprehensive "About" page for the cannabis portal that tells the full story of why the portal exists, who built it, the regulatory journey, and what's coming. Every claim is source-linked to public records.

## Why

Users of the cannabis portal need to understand the legitimacy and credibility behind it. This page shows — with verifiable public sources — that the portal was built by a member of Maine's Cannabis Hospitality Task Force, an appointed Expert on Cannabis Culinary Arts, and a private chef with 15+ years of experience who has spent a decade perfecting cannabis dining.

The tone is transparency, not marketing. Every fact links to its source. Users can verify everything themselves.

## Page Structure

### Always-Visible Intro

Short paragraph establishing the two key facts: task force membership + operational expertise.

### 7 Collapsible Accordion Sections

1. **The Background** (default open) — Cannabis hospitality as an emerging regulated industry, Maine's approach, ~12 states with programs
2. **The Task Force** — Full detail: P.L. 2023 ch. 679, all 15 members by name/org/seat, meeting dates, links to all 4 agendas, all 4 YouTube recordings, member bios, survey results, national footprint
3. **What the Task Force Recommended** — Two business models, edibles consensus, local control, disagreements on licensing, outstanding issues (insurance, smoking laws, highway safety data)
4. **The Legislation — LD 1365** — Full bill title, sponsor, key provisions, legislative timeline with dates (May 2025 → Feb 2026), current status
5. **How This Portal Was Built** — 15 years private chef experience, learning from mistakes, perfecting the process, encoding operational knowledge into software
6. **Why ChefFlow Built This** — Same person shapes regulation and builds software, Phase 2 maps to task force requirements
7. **What's Here & What's Coming** (default open) — Feature status list with Live/Planned badges

### Always-Visible: Public Sources & Records

Grouped external links panel at the bottom:

- Official Government (OCP, legislation, final report)
- Meeting Materials (all 4 agendas, bios, national footprint, survey, presentations)
- Meeting Recordings (4 individual + playlist)
- Legislation (LD 1365 on LegiScan)
- News Coverage (Maine Public, Central Maine, Spectrum News, MaineBiz)
- Office of Cannabis Policy (website, social media)

## Integration Points

- **Hub page** (`/cannabis`): Added "Learn the full story" link in the "How the Portal Works" info panel
- **Chef nav** (desktop + mobile): Added "About" as 6th item in cannabis nav section
- **Page info registry**: Registered `/cannabis/about`
- **App audit**: Added entry in Cannabis Vertical section

## Files Created

- `app/(chef)/cannabis/about/page.tsx` — Server component, auth-gated
- `components/cannabis/about-sections.tsx` — Client components (AboutSection accordion, AboutParagraph, AboutExternalLink, AboutHighlight, AboutMemberTable, AboutTimeline, AboutFeatureStatus, AboutLinkGroup)
- `docs/cannabis-about-page.md` — This file

## Files Modified

- `app/(chef)/cannabis/page.tsx` — Added info panel link
- `components/navigation/chef-nav.tsx` — Added nav items (desktop + mobile)
- `lib/help/page-info-registry.ts` — Registered page
- `docs/app-complete-audit.md` — Added audit entry

## How to Update

This is a **living page**. Update it when:

- New features ship → update the "What's Here & What's Coming" section
- Legislation progresses → update the LD 1365 timeline
- New news coverage appears → add to the sources panel
- Phase 2 compliance features are built → move items from Planned to Live
