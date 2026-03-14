# PROGRESS.md - What's Been Done

> Updated by the team as work is completed. Most recent entries at top.
> Include: what was done, which files were changed, any decisions made and why.

---

## Deployment Date: 2026-03-12

Initial autonomous team deployment. ROADMAP loaded with 6 priority areas.
Starting from Priority 1: Menu Builder System.

### Existing Infrastructure (already in codebase, don't rebuild)

- Event lifecycle (8-state FSM): `lib/events/transitions.ts`
- Ledger system (immutable, append-only): `lib/ledger/`
- Recipe model exists but needs enhancement for portion-level costing
- Quote system exists but needs connection to menu costing
- Client management with dietary tracking
- GOLDMINE lead scoring (deterministic, no AI)
- Remy AI concierge (Ollama-powered, local only)
- Calendar integration
- Loyalty system
- Embeddable inquiry widget
- Email integration with Gmail

### What Needs Building (from ROADMAP)

1. Menu Builder System (Priority 1) - the crown jewel
2. Inquiry Pipeline refinement (Priority 2)
3. Time Tracking (Priority 3)
4. Quote Builder connected to menu costing (Priority 4)
5. Communication Automation (Priority 5)
6. Financial Dashboard (Priority 6)
