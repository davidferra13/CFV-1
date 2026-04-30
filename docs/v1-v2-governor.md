# ChefFlow V1/V2 Governor

This is the finish-line and intake gate for ChefFlow. It exists because ChefFlow has enough good ideas to expand forever, and good ideas are now the main risk to finishing.

## Core Decision

ChefFlow V1 is not "David's private chef app." It is an independent chef operating system, proven first through David's private-chef workflow.

V1 is done when an independent chef can run paid culinary work from inquiry to follow-up without a shadow system.

## V1 Spine

The canonical V1 loop is:

```text
inquiry -> client -> engagement/event -> menu/offer -> quote -> agreement -> payment -> prep -> sourcing -> service -> follow-up -> client memory
```

Every V1 feature must attach to that spine.

## Audience

V1 targets independent chefs who sell direct culinary work to clients:

- private chefs
- personal chefs
- small caterers
- supper club chefs
- pop-up chefs
- retreat, travel, and yacht chefs
- meal prep chefs
- legal private-event cannabis chefs
- chef-owners doing direct client work

V1 does not need to fully support restaurants, schools, hotels, institutional food service, franchises, full manufacturing, or POS-heavy multi-location operations.

## V1 Means

V1 includes work that protects:

- trust
- money
- safety
- completion of the paid job
- return/catch-up after the chef leaves the app
- source-of-truth clarity
- no fake data, fake buttons, fake automation, or silent zeroes

## V2 Means

V2 is valuable expansion that should be preserved but not built immediately:

- niche chef modes
- power-user controls
- large-business scale
- broad marketplace behavior
- extra dashboards
- polish that does not unblock a paid job
- speculative persona gaps
- "Facebook can do everything" breadth
- features that feel exciting but do not protect the V1 spine

V2 ideas are not discarded. They are parked.

## Mandatory Classification

Every new idea, urgency spike, persona gap, external-site comparison, Hermes task, or "we should add" request must be classified before code work.

Use exactly one class:

| Class        | Meaning                                                                                                | Action                   |
| ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------ |
| `V1 blocker` | The V1 loop cannot be trusted or completed without it                                                  | Build or repair now      |
| `V1 support` | Improves the V1 loop but does not block completion                                                     | Queue behind blockers    |
| `V2`         | Valuable future expansion                                                                              | Park                     |
| `research`   | Needs evidence before scope                                                                            | Research only            |
| `duplicate`  | Existing surface/spec owns it                                                                          | Attach, do not duplicate |
| `blocked`    | Requires developer action, external data, hardware, legal approval, credentials, or approved migration | Report blocker           |
| `reject`     | Unsafe, off-domain, fake, recipe-generating, or violates ChefFlow rules                                | Do not pursue            |

## Build Override

Default behavior: do not build outside the active V1 lane.

The developer can bypass the governor only with this exact phrase:

```text
Override V1 governor: build this anyway.
```

Without that phrase, agents classify, queue, park, research, or attach. They do not build V2 work.

## Current Active Lane

`V1 event spine stabilization`

Allowed work:

- repair broken V1 spine behavior
- verify existing V1 surfaces
- consolidate duplicate V1 surfaces
- make Mission Control reflect V1 progress
- improve code architecture for approved V1 work using `software-fundamentals`

Disallowed by default:

- new unrelated dashboards
- new persona expansion
- broad V2 feature builds
- external-platform breadth that does not repair the V1 spine
- "while we are here" refinements

## Filter Questions

Before build:

1. Does this protect trust, money, safety, completion, or return/catch-up for the V1 spine?
2. Would a real independent chef need a spreadsheet, note app, text thread, or memory workaround without it?
3. Does a current canonical surface already own this?
4. Is this a general independent-chef pattern, or only one narrow niche?
5. Can this be deferred without breaking the next real paid job?
6. Is this backed by current code evidence, user evidence, persona evidence, or only urgency?

## Mission Control Requirement

Mission Control must measure the governor, not commit volume.

The autonomous build pipeline contract lives at `docs/specs/autonomous-v1-builder-contract.md`. That contract is the handoff between this governor, the approved V1 queue, Codex builder execution, validation receipts, and Mission Control monitoring.

It should show:

- active V1 lane
- V1 spine completion
- current blockers
- built but unverified V1 work
- parked V2 ideas
- explicit overrides
- next single allowed action

## Hermes And Swarm Rule

Hermes, Claude, Codex, and any multi-agent swarm may not run autonomously across the product surface.

They may:

- classify ideas
- research evidence
- attach ideas to existing surfaces
- write specs
- validate current behavior
- build V1 blockers

They may not build V2 surface area unless the developer explicitly uses the override phrase.

## Matt Pocock Software Fundamentals Rule

For approved V1 builds, use the `software-fundamentals` skill before implementation.

Required standard:

- shared design concept
- ubiquitous language
- clear module boundaries
- interface-first design
- feedback loop before or during implementation
- no shallow helper sprawl
- no generated-code volume as a substitute for architecture

## Parking Lot

Use this section for urgency spikes that are valuable but not V1 blockers. Keep each item short.

For autonomous builder execution, queue records should move into the future file-based queues defined by `docs/specs/autonomous-v1-builder-contract.md`. This parking lot remains the human-readable governor summary.

### V1 Support Queue

- _Empty until classified._

### V2 Queue

- _Empty until classified._

### Research Queue

- _Empty until classified._

### Explicit Overrides

- _Empty until classified._
