# Simulation Forge: ChefFlow booking funnel slice

Status: independently verified offline simulation. Branch: `feat/simulation-forge-booking-20260928`, based on pushed Forge/transport checkpoint `db2abd823`. No production route, API, payment, database, or customer message was invoked.

## Reuse and boundaries

- `lib/events/fsm.ts#validateTransition` is the unchanged pure ChefFlow rule and actor-permission function called for draft → proposed → accepted → paid → confirmed and cancellation. `lib/events/transitions.ts` performs server/DB enforcement and is deliberately not invoked offline.
- `lib/inquiries/actions.ts:VALID_TRANSITIONS` and `app/api/v2/inquiries/[id]/route.ts:VALID_TRANSITIONS` are private equivalent maps. Forge mirrors their statuses for the synthetic inquiry path; it does not claim to exercise the production inquiry action or API route.
- The client inherits `Chef Flow Personas/Completed/Public/the-enthusiast.txt`; chef, platform, availability, messages, quote, menu, client replies, and deposit acknowledgment are synthetic. The synthetic acknowledgment supplies the FSM's `paid` state and has `externalPayment:false` in the trajectory. No real money moved.
- Final confirmation requires a selected available chef, currently supported dietary needs and unchanged quote revision, plus exactly one synthetic acknowledgment. These guards live in the Forge adapter and are not evidence that live ChefFlow enforces them.

## Reproduction and release

Run `node --import tsx --test tools/simulation-forge/booking.test.mjs` and `node --import tsx tools/simulation-forge/cli.mjs release`. The automatic bounded release suite includes the normal booking path, the retained minimized regression case, and six mutations: chef availability lost, dietary change, cancellation, duplicate acknowledgment, early acknowledgment, and initially unavailable chef. Some variants correctly cannot reach confirmation; zero invariant violations does not count those as successful bookings.

Run `node --import tsx tools/simulation-forge/cli.mjs booking-proof` to regenerate `docs/simulation-forge/booking-evidence.json` and the permanent minimal case `tools/simulation-forge/fixtures/booking-availability-regression.json`. The intentionally faulty adapter skips a late availability recheck. Minimization removes an unrelated menu preview; the fixed adapter blocks confirmation. The proof retains before and after trajectories, actor and source provenance, seed, source commit, separate raw observations and scores, ten fixed replays, comparison and mutation-family results.

This change only expands developer simulation tooling. It does not replace the seven missing `/studio*` routes tracked by `CF-STUDIO-NAV-20260928`, and the full native firewall remains blocked until that independent product task is resolved. Do not infer a live booking result from these fixtures.
