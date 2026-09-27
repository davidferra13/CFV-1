# Chef Operator Release

Status: in-progress
Date: 2026-09-27

## Objective

Make the chef workspace the primary product surface. One working chef should be able to carry one job from inquiry through follow-up without reconstructing client, proposal, event, production, service, or payment context in separate applications.

## Canonical path

inquiry -> client -> quote + menu -> booking -> event plan -> shop + prep + pack -> service -> payment -> follow-up

The path is one connected job. It does not create a second client record, a second menu truth, or a second event truth to make the UI easier.

## First operating case

Use DF Private Chef as the first real operator case. Keep any future Anthony workspace tenant-isolated and unpublished. Do not contact Anthony or move his data as part of this release.

A brand-new chef with no records must start with one obvious action: capture the first inquiry. Existing chefs must land on the most useful unresolved action for the job they are already running.

## Abstraction contract

The operator journey reads existing canonical IDs and facts:

- inquiry id
- client id
- quote id
- menu id
- event id
- event plan readiness
- grocery, prep, and packing readiness
- service state
- payment truth
- follow-up state

The abstraction may point to deeper workflow routes, but it must not duplicate the underlying business record.

Failed or unavailable payment reads must fail closed. A missing financial read is not a zero balance.

## UI contract

The same operator journey component should appear where the chef needs continuity:

1. Today: the next useful action for the most relevant job.
2. Inquiry detail: intake, client, proposal, and booking continuity.
3. Event detail: planning, production, service, payment, and follow-up continuity.

Mobile shows the next action first. Deeper tools remain accessible contextually and through search/navigation. No useful capability is deleted to reduce visual noise.

## Capability proof

This release follows docs/specs/2026-09-17-capability-proof-loop.md.

Do not mark a capability VERIFIED from code, a route, a flag, or a unit test. The final proof must replay a current chef scenario through the running product and record every remaining external app switch.

Expected capability receipts after runtime proof:

- orders-catering-booking
- events-beo
- events-run-of-show
- prep-production-plan
- prep-packing
- payments-deposits

Receipt status must remain INCOMPLETE for any scenario that still requires an unaggregated manual application switch.

## Release gates

- focused unit tests for the operator journey
- existing event operating-spine tests
- launch inquiry, quote, event lifecycle, finance, culinary, and mobile coverage where relevant
- npm run regression:firewall
- desktop and phone-width browser proof
- completed DF Private Chef scenario
- diff review
- task-owned commit and push
- established production deployment
- production behavior and revision verification

Do not call the release ready for Anthony, ten chefs, or public promotion until those gates pass.
