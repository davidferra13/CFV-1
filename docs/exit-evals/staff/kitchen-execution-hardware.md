# Staff / Kitchen Execution & Hardware Exit Evaluation

Mode: Solo evaluation. Every scenario is marked `NEEDS-DEVELOPER-REVIEW`.

## Scenario #28: Run active cooking timers

**Original classification:** Permanent
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need an interrupting, hands-light countdown while food is actively cooking, holding, resting, cooling, or staging. The operational need is not "a clock"; it is "tell me when this item needs action while my attention and hands are elsewhere."
**Context ChefFlow has:**

- Staff assignment, station, task, event date, serve time, arrival time, guest count, and role context.
- Staff station clipboard entries with component name, menu item, par level, need-to-make, made, on-hand, waste, 86'd state, and notes.
- Staff-visible recipes with prep time, cook time, servings, description, and method.
- Chef-side kitchen mode already has local timers, preset/custom timers, large timer displays, beep alerts, and voice command support through browser speech recognition.
- Chef-side prep timers exist for briefing use, but the inspected staff portal does not expose active cooking timers.

**Data source?** No. A timer is an active device/runtime behavior, not just a reference source. ChefFlow can source recipe timing and create timer presets, but the alarm surface itself must still be reliable on the active device.
**Client-collaborative angle:** Minimal. Clients can influence service timing and course pacing, but they do not know the active cooking timer state.
**Physical reality:** This is a messy-hands, loud-kitchen, glance-and-hear workflow. Large text, loud/vibrating alerts, voice start/stop, and printable timing backup matter more than dense timer management. Physical oven, probe, and phone timers will remain useful redundancy.
**Compounding:** Medium. Individual timers are one-off, but recipe/station timer presets, common hold windows, and late/early timing outcomes can improve future prep plans.

**Solution design:**

- Expose a staff-safe timer mode from `/staff-station` and token briefings with large preset buttons based on recipe cook times and station tasks.
- Reuse the existing kitchen timer primitives and voice command model, but scope the surface to assigned staff, station, and event data.
- Add timer labels generated from component, menu item, or recipe step context so staff do not run anonymous phone alarms.
- Keep a clear handoff to physical timers as backup and avoid making ChefFlow the only alarm path.

**Where it appears:**

- `/staff-station`
- `/staff-portal/[id]` token event briefing
- Chef-side `/events/[id]/kitchen-mode` as the existing primitive to adapt

**What remains as permanent exit:**
Oven timers, physical timers, phone alarms, and redundant hardware alerts remain necessary when the browser is backgrounded, muted, offline, or not trusted for safety-critical timing.

**Priority:** High frequency x medium effort = high staff execution candidate
**Spec needed?** yes

## Scenario #29: Use a thermometer or probe app

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need an actual temperature reading from physical food or equipment, often to decide whether to keep cooking, hold, chill, discard, or prove safety compliance.
**Context ChefFlow has:**

- Event, menu, guest, dietary, kitchen notes, station, task, and recipe context.
- Food-safety reference data for safe internal temperatures, hold temps, cooling protocols, and storage guidance.
- Formula-based temperature anomaly detection for logged temperature entries against FDA-style cooking, holding, cooling, and suspicious-reading thresholds.
- Recipe peak-window and safety-ceiling logic for hold time and holding temperature context.
- Staff station and token briefing surfaces where manual temp capture could be tied to the exact event/station/item.

**Data source?** Partly. Food-safety thresholds are a data source ChefFlow can drink from. Probe readings are not just data source access; they require hardware, calibration, and sometimes vendor apps.
**Client-collaborative angle:** Low. Clients may disclose allergies, vulnerable guests, or venue equipment constraints, but they cannot supply the measured temperature. Venue/client kitchen profile can still identify available thermometers, oven quirks, or refrigeration constraints.
**Physical reality:** The thermometer is a physical instrument used with wet or gloved hands. Staff need fast manual entry, voice entry, or device integration later; a small typed form in the middle of service is the wrong primary interface.
**Compounding:** Medium-high. Temperature logs, recurring recipe hold behavior, equipment drift, calibration notes, and venue refrigerator/oven quirks become safety intelligence over time.

**Solution design:**

- Add staff temp-log capture tied to event, station, menu item, recipe, stage, reading, timestamp, and optional note.
- Show source-backed safe minimums and hold/cooling warnings inline after entry using the existing deterministic temp anomaly logic.
- Allow quick "probe app used" notes or attachment placeholders when the reading lives in a vendor app.
- Later bridge Bluetooth/probe integrations, but keep manual capture as the reliable baseline.

**Where it appears:**

- `/staff-station`
- `/staff-portal/[id]` safety or station section
- Chef-side event safety/AAR surfaces that already reason about temperature logs

**What remains as permanent exit:**
The physical thermometer, probe hardware, calibration workflow, and vendor-specific live probe graphs remain external. ChefFlow should capture and interpret the result, not pretend to be the probe.

**Priority:** Medium-high frequency x medium effort = strong safety bridge
**Spec needed?** yes

## Scenario #30: Weigh ingredients during prep

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to measure real ingredient quantity against the prep target, especially when scaled recipes, yield loss, batch size, or package units make the written recipe ambiguous.
**Context ChefFlow has:**

- Staff-visible station clipboard quantities, par units, need-to-make values, made counts, on-hand values, and station notes.
- Staff-visible recipes with servings, prep time, cook time, and method.
- Recipe scaling, yield adjustment, waste buffer, pack rounding, and unit conversion primitives in the codebase.
- Event guest count, service style, menu context, and station assignment that can determine target quantities.
- Chef-side print and prep-sheet patterns that can become staff-safe measurement references.

**Data source?** No for the actual measurement. The scale is physical hardware. ChefFlow's useful data is the target quantity, unit conversion, yield expectation, and variance capture.
**Client-collaborative angle:** Minimal. Clients affect guest count and service style, which drive quantities, but they do not participate in the weighing moment.
**Physical reality:** Scale work happens at a counter with containers, gloves, wet hands, and visual confirmation. A printed or large-format target sheet is often better than phone interaction; voice can help record actuals after weighing.
**Compounding:** Medium. Repeated actual-vs-target measurements improve recipe yield, batch sizing, station par levels, and waste expectations.

**Solution design:**

- Add a staff prep quantity view that shows target weight/volume/count, unit, scaled basis, and yield note per station component.
- Provide printable or large-format weigh sheets from the same data so staff can prep without touching a phone.
- Let staff record actual measured quantity or variance when useful, without requiring it for every prep item.
- Leave physical scale operation external, but make the round trip back to ChefFlow obvious.

**Where it appears:**

- `/staff-station`
- `/staff-recipes`
- Chef-side station clipboard print/prep sheet surfaces

**What remains as permanent exit:**
Scale hardware, taring, calibration, container handling, and any Bluetooth scale vendor app remain outside ChefFlow.

**Priority:** High frequency x medium effort = high bridge priority
**Spec needed?** yes

## Scenario #31: Scan or print labels

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need physical labels for containers, courses, allergens, reheating, prep dates, or station organization, and sometimes need to scan labels to identify or verify the right item.
**Context ChefFlow has:**

- Event menu, dishes, course names, allergens, recipe methods, event date, and prep/reheating notes used by the existing serving-label PDF generator.
- Staff station clipboard data with component, menu item, location, notes, par, on-hand, waste, and 86'd state.
- Staff token briefings with event details, dietary alerts, tasks, schedule, chef notes, location, kitchen notes, and staff assignment context.
- Chef-side serving labels dialog that generates printable PDFs for event labels, but not an inspected staff-facing label queue.
- Event/staff briefing print patterns already exist.

**Data source?** Partly. The label content is internal ChefFlow data. Label printers, print drivers, scanner hardware, and QR scanning remain external or device-specific action surfaces.
**Client-collaborative angle:** Medium. Dinner Circle and client/guest flows can provide exact guest names, allergens, dietary notes, reheating constraints, and service preferences that should appear on labels before staff need to ask.
**Physical reality:** Printing is physical and failure-prone. Staff need PDFs, printer-friendly layouts, large labels for service, optional QR/barcode labels, and a fallback to plain paper when adhesive labels or printer drivers fail.
**Compounding:** Medium-high. Label templates, allergen patterns, reheating notes, and station label conventions become reusable across events, clients, menus, and venues.

**Solution design:**

- Promote existing serving-label generation into a staff-safe "labels packet" when the chef allows staff access.
- Generate station/prep labels from station clipboard components as well as event serving labels from menu/dish data.
- Add QR/barcode values that route back to a staff-safe item, station, or event context rather than exposing chef-private data.
- Keep final print/scanner interaction external, but make ChefFlow own label content, preview, PDF generation, and post-print status.

**Where it appears:**

- `/staff-station`
- `/staff-portal/[id]`
- Chef-side event label dialog and `/events/[id]/staff` briefing packet

**What remains as permanent exit:**
Printer setup, printer drivers, label stock selection, physical scanning hardware, and failed-print troubleshooting remain outside ChefFlow.

**Priority:** Medium frequency x medium effort = useful reduction with hardware bridge
**Spec needed?** yes

## Scenario #32: Check equipment instructions

**Original classification:** Permanent
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to know how to operate, troubleshoot, clean, reset, or safely use specific equipment under event pressure, often for a venue appliance, rented unit, or chef-owned tool they do not use every day.
**Context ChefFlow has:**

- Chef-side equipment inventory with item name, category, brand, model, serial number, condition, warranty, service contact, service URL, and notes.
- Event equipment rental records and event equipment redundancy checklists.
- Client and venue kitchen profile concepts including access notes, kitchen notes, site notes, and available equipment.
- Staff event briefing fields for kitchen notes, site notes, access instructions, assignment notes, and tasks.
- Staff recipes and station work surfaces that can point to required equipment but do not currently appear to expose equipment-specific SOPs.

**Data source?** Partly. Manufacturer manuals and support pages are sourceable reference data. YouTube, live troubleshooting, vendor calls, and unfamiliar venue hardware remain external bridge targets.
**Client-collaborative angle:** Strong for venue/client-owned equipment. Dinner Circle or client profile should collect what appliances are available, model/brand where known, quirks, induction/gas status, breaker/power limits, oven calibration notes, and photos before staff arrive.
**Physical reality:** Instructions are needed at the equipment, often with hands busy and time pressure. Short SOP cards, print/QR labels, photos, and voice-readable steps matter more than a long manual link.
**Compounding:** High. Equipment notes, venue appliance quirks, rented unit setup, service contacts, and staff troubleshooting outcomes become durable operational knowledge.

**Solution design:**

- Add staff-visible equipment SOP cards linked from event, station, recipe, and briefing contexts.
- Attach manual URL, service URL, chef notes, photos, quick-start steps, cleaning/reset steps, and "known quirks" to equipment records.
- Let Dinner Circle or venue intake capture client-owned kitchen equipment and quirks into a chef-reviewed profile.
- Keep a clean handoff to manufacturer/manual/video links while storing what staff learned on return.

**Where it appears:**

- `/staff-portal/[id]` kitchen or equipment section
- `/staff-station` station equipment notes
- Chef-side equipment inventory, event equipment checklist, and client/venue kitchen profile surfaces

**What remains as permanent exit:**
Manufacturer portals, videos, vendor support calls, and real-time troubleshooting of unknown equipment remain external when ChefFlow has not captured the SOP yet.

**Priority:** Medium frequency x medium effort = high compounding bridge
**Spec needed?** yes

## Scenario #33: Play music or ambiance during service

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to start, adjust, or troubleshoot audio or ambiance in the physical service environment so the event feels right to the client and guests.
**Context ChefFlow has:**

- Event occasion, service style, client context, special requests, kitchen/site notes, and staff assignment context.
- Staff token event data includes `ambianceNotes`, although the inspected staff event view does not render them.
- Client and event workflows can collect preferences, dislikes, vibe, timing, and venue constraints before service.
- Staff briefing generation can print/copy event notes for the team.

**Data source?** No. Spotify, Apple Music, Sonos, Bluetooth speakers, smart lighting, and venue AV systems are external action surfaces. ChefFlow may store playlist links or ambiance notes, but should not become the media player.
**Client-collaborative angle:** Strong. The client or Dinner Circle can collect music style, explicit do-not-play items, preferred playlist link, ceremony/dinner timing cues, volume constraints, speaker availability, and venue AV rules before staff arrive.
**Physical reality:** This is usually a phone/speaker/venue-control workflow, often handled by front-of-house staff. One-tap playlist/link handoff and visible ambiance notes are enough; full playback control would expand ChefFlow into the wrong product boundary.
**Compounding:** Medium-high for client preferences and venue AV quirks; low for any single playback session.

**Solution design:**

- Render ambiance notes in staff-facing event briefing when present.
- Store optional playlist/speaker/AV links as bridge targets from the event briefing.
- Add Dinner Circle/client prompts for music, volume, vibe, do-not-play, speaker ownership, and venue AV constraints.
- Capture post-event ambiance notes only when they improve future client or venue memory.

**Where it appears:**

- `/staff-portal/[id]` event briefing
- Chef-side `/events/[id]/staff` briefing panel
- Dinner Circle or client event-preference collection

**What remains as permanent exit:**
Playback, speaker pairing, streaming account auth, smart-light controls, venue AV controls, and live media troubleshooting remain in dedicated external apps or physical systems.

**Priority:** Low-medium frequency x low effort = small bridge, not core hardware replacement
**Spec needed?** no

## Batch Summary

| #   | Title                                 | Reclassified To     | Spec Needed? |
| --- | ------------------------------------- | ------------------- | ------------ |
| 28  | Run active cooking timers             | Partially Reducible | yes          |
| 29  | Use a thermometer or probe app        | Bridgeable          | yes          |
| 30  | Weigh ingredients during prep         | Bridgeable          | yes          |
| 31  | Scan or print labels                  | Partially Reducible | yes          |
| 32  | Check equipment instructions          | Partially Reducible | yes          |
| 33  | Play music or ambiance during service | Bridgeable          | no           |

Spec notes only, per solo-mode override: potential future specs are staff kitchen timer mode, staff temperature log bridge, staff prep quantity/weigh sheet, staff label packet/queue, and staff equipment SOP cards. No roadmap, RUNNER, or standalone spec files were updated.
