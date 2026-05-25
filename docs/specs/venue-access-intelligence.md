# Venue Access Intelligence

> **Status:** SPEC-READY
> **Exit Scenario:** #90 (reclassified: Bridgeable -> Reducible + Client-Collaborative)
> **Source:** Developer stress-test evaluation, 2026-05-25
> **Principle:** Institutional knowledge captured once, valuable forever. Client provides what Google cannot.

---

## Problem

Chef leaves to Google Maps/Street View or calls the venue to figure out parking, loading, entrance, and access. ChefFlow already has the address. After the first visit, the chef KNOWS this info but has nowhere to store it. Next time at the same venue: same friction again.

Bigger problem: The CLIENT knows their own building better than anyone. But nobody asks them.

## Design

### Venue Profile (persists per address across all events)

Structured fields, not freetext. Chef fills once, auto-surfaces forever.

**Fields:**

- Parking type: (driveway / street / garage / loading dock / valet area)
- Parking notes: (freetext, e.g., "circular drive, fits a van")
- Entrance for chef: (front / side / back / service / loading dock)
- Entrance notes: (freetext, e.g., "blue door on Oak St side")
- Gate/door code: (stored, revealed on tap, easy to update)
- Elevator: (none / residential / freight / service, with floor number)
- Carry distance: (at door / short / medium / long haul)
- Stairs: (yes/no, how many flights)
- Time restrictions: (freetext, e.g., "no unloading after 6pm")
- Security/front desk: (yes/no, with protocol notes)
- Contact on-site: (name + phone for building manager, doorman, etc.)
- Photos: (chef snaps loading area, entrance, parking. Visual memory.)

### Street View Embed (first-visit scouting)

- Google Maps Street View iframe embedded directly on event detail page
- Pre-pointed at venue address. Chef sees the building immediately.
- No searching, no typing, no app switching.
- Chef can rotate, zoom, identify entrances, spot loading zones, see the neighborhood.
- Optional: save a Street View screenshot as a "venue photo" for quick reference later.

### Client-Collaborative Collection (Dinner Circle)

During Circle setup or event confirmation, client sees:

> **"Access notes for your chef"**
> Help your chef arrive smoothly. Any of these apply?
>
> - Parking instructions
> - Gate or door code
> - Best entrance for carrying equipment
> - Elevator details
> - Anything else about getting to your kitchen

Client fills this in ONCE. It populates the venue profile. Chef never asks.

For repeat clients: system pre-fills from last event. Client confirms or updates. "Still the same? (yes/update)"

### Where it appears

| Surface                    | What shows                                                                  |
| -------------------------- | --------------------------------------------------------------------------- |
| Event detail (chef)        | Venue access panel: Street View + structured fields + photos + client notes |
| Day-of quick view          | One-line summary: "Back entrance, code 4455, freight elevator to 3"         |
| Calendar day view          | Access icon per event (green = notes exist, gray = no notes yet)            |
| Dinner Circle (client)     | "Access notes" collection prompt                                            |
| Remy day-of email to chef  | Venue access summary for each event that day                                |
| Repeat event auto-populate | "Same venue as Mar 12 dinner. Access notes carried forward."                |

### Compounding value

| Events at venue                    | Chef experience                              |
| ---------------------------------- | -------------------------------------------- |
| First visit, no client notes       | Street View scout + "I'll figure it out"     |
| First visit, client provided notes | Perfect access info before arriving          |
| Second visit onward                | Zero friction. Everything pre-loaded.        |
| Chef with 50 regular clients       | 50 venues with permanent access intelligence |

### What remains as permanent exit

- Google Street View deep exploration (rotating, zooming beyond the embed) for complex commercial venues
- Calling a commercial venue's event coordinator for specific dock/insurance requirements
- Visiting in person to scout (rare, for very large events)

These are first-time-only exits for unfamiliar commercial venues. For residential clients (majority of private chef work): the client tells you everything via Circle.

### Integration with other exit scenarios

- **#43 Route planning:** Day map view shows pins. Tapping a pin shows venue access summary.
- **#45 Nearby stores:** "Nearest Whole Foods to this venue" uses the same address.
- **#58 Weather:** Weather widget on same event page. Full event intelligence in one view.
- **#18 Client venue on map:** Street View embed serves this too.

## Chef-facing language

- "Access notes" not "Venue logistics profile"
- "Where do I park?" not "Parking configuration"
- "How do I get in?" not "Ingress protocol"

## Done when

1. Event detail shows Street View embed for any event with an address
2. Venue profile fields persist across events at same address
3. Dinner Circle prompts client for access notes during setup
4. Repeat events auto-populate from previous venue data
5. Day-of view shows one-line access summary per event
6. Chef never calls a repeat client to ask "where do I park?"
