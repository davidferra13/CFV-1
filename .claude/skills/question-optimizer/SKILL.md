---
name: question-optimizer
description: Rewrite vague, broad, strategic, market, product, research, or "what should Codex do with this question" ChefFlow requests into the strongest answerable question before responding. Use when the user asks a random project question, asks whether Codex knows how to use its skills, asks what to research, asks what to build next, asks whether a product idea is valid, or asks to optimize a ChefFlow question using all relevant skills and evidence.
---

# Question Optimizer

Use this as the front door for ambiguous ChefFlow questions. The output is a better question and an execution route, not an answer by itself.

## Workflow

1. Restate the user's raw question in one sentence.
2. Classify the question type:
   - `codebase`: asks what exists, how it works, or what is broken.
   - `market`: asks who needs something, whether users want it, or how a segment behaves.
   - `product`: asks what to build, refine, remove, or prioritize.
   - `validation`: asks whether evidence is strong enough to act.
   - `strategy`: asks for direction, risk, positioning, or highest leverage.
   - `research`: asks for a written investigation or external context.
   - `agent-behavior`: asks how Codex should route, reason, or improve itself.
3. Rewrite the request into an optimized question with:
   - the decision being made,
   - the audience or actor,
   - the evidence threshold,
   - the code or docs surface to inspect,
   - the allowed output type.
4. Select the primary skill and sidecars:
   - Market or segment demand: use `market-research-router`, `evidence-broker`, and `validation-gate`.
   - Product build priority: use `validation-gate`, `findings-triage`, `massive-win`, or `persona-build`.
   - Code truth: use `context-continuity`, `research`, `debug`, or `review`.
   - Agent behavior: use `skill-garden`, `heal-skill`, or `research-brief-generator`.
5. State the optimized route before answering when it materially changes the work.

## Output

Use this compact form when a question is unclear or strategic:

```text
QUESTION OPTIMIZER

RAW QUESTION: [user question]
OPTIMIZED QUESTION: [stronger question]
TYPE: [classification]
PRIMARY SKILL: [skill]
SIDECARS: [skills]
EVIDENCE THRESHOLD: [real-user | codebase | persona | public research | developer intent]
ANSWER TYPE: [decision memo | research brief | build plan | code finding | validation gate]
```

## Guardrails

- Do not call every skill. Pick one primary owner and only the sidecars that reduce a real risk.
- Do not treat persona simulation as market proof.
- Do not answer a market question without naming the audience lens and evidence level.
- Do not build from an optimized question until validation, continuity, and task ownership are clear.
