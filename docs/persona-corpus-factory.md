# Persona Corpus Factory

`devtools/persona-corpus-factory.mjs` is the high-volume persona intake path.
It is built for thousands of candidates, but it keeps the useful ones by
running validation and corpus-level novelty checks before import.

## Why This Exists

The normal persona generator can create one persona at a time. The corpus
factory creates a plan from product-pressure axes, generates candidates with
Ollama, validates structure, rejects duplicates, and imports only accepted
personas into the local persona inbox.

Use it when you want an eval and stress-test corpus, not just more text.

## Safe Commands

Preview the axis plan without calling Ollama:

```bash
npm run personas:corpus -- --plan-only --count 50
```

Generate a small real batch, validate novelty, and import accepted personas
to the local inbox at `127.0.0.1:3977`:

```bash
npm run personas:corpus -- --execute --count 25
```

Focus one type or one product domain:

```bash
npm run personas:corpus -- --execute --type Client --domain dinner-circles --count 100
```

Generate a large candidate run with stricter novelty:

```bash
npm run personas:corpus -- --execute --count 1000 --novelty 0.48 --max-attempts 3500
```

Increase edge-case pressure when a domain starts producing generic repeats:

```bash
npm run personas:corpus -- --execute --count 100 --domain pricing-checkout --edge-mode chaos
```

Write directly to `Chef Flow Personas/Uncompleted/<Type>/` instead of relying
only on the inbox import:

```bash
npm run personas:corpus -- --execute --count 100 --no-inbox --write-files
```

## Domains

List the supported domains:

```bash
npm run personas:corpus -- --list-domains
```

The current product-pressure domains are:

- `dinner-circles`
- `pricing-checkout`
- `wallet-payments`
- `first-timer-guidance`
- `premium-concierge`
- `privacy-stealth`
- `venue-logistics`
- `dietary-safety`
- `accessibility`
- `international`
- `legal-disputes`
- `offline-rural`
- `adversarial`
- `loyalty-rewards`
- `ai-local-private`

## Edge Cases

Every axis plan now includes explicit edge cases. These are not optional prompt
flavor. The generation prompt requires the persona to build around them and
requires at least four pass/fail conditions to test those edge cases directly.

List the edge-case pools:

```bash
npm run personas:corpus -- --list-edge-cases
```

Choose edge intensity:

- `--edge-mode light`: 2 edge cases per persona for clean focused runs
- `--edge-mode heavy`: 4 edge cases per persona, default for normal corpus work
- `--edge-mode chaos`: 7 edge cases per persona for saturation-breaking stress tests

Good edge cases are concrete failure conditions, not vague personality traits.
They should involve exact roles, devices, payment states, permissions, messages,
venue constraints, legal states, stale data, or recovery paths.

## Quality Gates

Each candidate is rejected if:

- the persona validator fails required sections
- validator score is below `--min-score` (default `70`)
- novelty score is below `--novelty` (default `0.38`)
- Ollama fails or returns malformed output

Novelty is scored against completed, uncompleted, and failed persona files. The
comparison uses the primary failure, pass/fail conditions, and overall text
tokens, then rejects candidates that are too close to the existing corpus.

## Reports

Execute mode writes a JSON report to:

```text
reports/persona-corpus-factory/
```

The report includes accepted personas, rejected counts, novelty scores, nearest
matches, feature implications, and inbox import paths.

## Operating Standard

Run by focused domain when you are hunting for new build pressure. Broad runs
are useful for coverage, but domain runs are better when you need actionable
feature gaps.

Recommended rhythm:

1. Run `--plan-only` to inspect the axis mix.
2. Run `--execute --count 25` as a smoke batch.
3. Review the report rejection counts.
4. Switch to `--edge-mode chaos` when accepted personas start sounding too familiar.
5. Increase to 100, then 1000 only when novelty is holding.
6. Run the existing synthesis pipeline after import.
