---
name: v1-governor
description: Gate ChefFlow urgency spikes, new feature requests, V1/V2 scope questions, Hermes or multi-agent build delegation, Mission Control progress work, and "what should we build next" decisions. Use before any ChefFlow product build unless the request is a production bug, security issue, financial integrity issue, safety issue, or explicitly uses the override phrase. Classifies ideas into V1 blocker, V1 support, V2, research, duplicate, blocked, or reject, and preserves parked ideas instead of discarding them.
---

# V1 Governor

Use this skill to stop ChefFlow from converting every good idea into immediate code. The goal is not fewer ideas. The goal is one controlled path from idea to build.

Canonical source: `docs/v1-v2-governor.md`.

## Operating Rule

Every new ChefFlow feature, refinement, persona gap, external-site comparison, urgency spike, Hermes build idea, or "we should add" request must be classified before code is edited.

Proceed directly only when one of these is true:

- The request fixes a production bug, security issue, financial integrity issue, safety issue, or broken core workflow.
- The request clearly belongs to the current active V1 lane.
- The user says the exact override phrase: `Override V1 governor: build this anyway.`

Otherwise preserve the idea and do not build it in the same step.

## V1 Definition

V1 is the independent chef operating loop:

`inquiry -> client -> engagement/event -> menu/offer -> quote -> agreement -> payment -> prep -> sourcing -> service -> follow-up -> client memory`

V1 contains only work that protects trust, money, safety, completion, or the chef's ability to run paid culinary work without a shadow system.

## V2 Definition

V2 is everything valuable but not required to prove the V1 operating loop. V2 ideas are not trash. They are parked inventory for later product expansion.

## Classification

Classify each idea as exactly one:

- `V1 blocker`: The V1 loop cannot be trusted or completed without it. Build or repair now.
- `V1 support`: Improves the V1 loop but does not block completion. Queue after blockers.
- `V2`: Valuable expansion, niche mode, power-user surface, polish, or future scale.
- `research`: Needs evidence, codebase validation, user validation, or market proof before scope.
- `duplicate`: Existing surface or spec already owns it. Attach there instead of creating a new one.
- `blocked`: Requires developer action, credentials, hardware, legal decision, external data, or approved migration.
- `reject`: Unsafe, off-domain, recipe-generation, fake automation, or violates ChefFlow rules.

## Filter Questions

Ask these in order:

1. Does this protect trust, money, safety, completion, or return/catch-up for the V1 loop?
2. Would a real independent chef need a spreadsheet, note app, text thread, or memory workaround without it?
3. Does a current canonical surface already own this?
4. Is this a general independent-chef pattern, or only one narrow niche?
5. Can this be deferred without breaking the next real paid job?
6. Is this backed by current code evidence, user evidence, persona evidence, or only urgency?

## Agent And Hermes Rule

Do not let Hermes, Claude, Codex, or any swarm build outside the active V1 lane by default. Agents may:

- classify ideas
- research evidence
- attach ideas to existing surfaces
- write specs
- validate current behavior
- build V1 blockers

Agents may not autonomously expand V2 product surface unless the user explicitly overrides the governor.

## Matt Pocock Lens

For any approved V1 build, use `software-fundamentals` before implementation. Require shared language, clear module boundaries, interface-first design, and feedback loops. Do not use agent volume as a substitute for architecture.

## Output

For requests that trigger this skill, respond or record:

```text
V1 GOVERNOR

CLASSIFICATION: [V1 blocker | V1 support | V2 | research | duplicate | blocked | reject]
REASON: [one sentence]
CAN BUILD NOW: [yes/no]
CANONICAL OWNER: [route/file/spec/doc or unknown]
NEXT ACTION: [build / queue / park / research / attach / ask]
OVERRIDE NEEDED: [yes/no]
```

If the idea is parked, preserve it in the relevant existing source if one is obvious. If no durable sink is obvious, suggest adding it to `docs/v1-v2-governor.md` under the appropriate queue before building anything else.
