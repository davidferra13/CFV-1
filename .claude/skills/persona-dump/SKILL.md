---
name: persona-dump
description: Ingest huge pasted persona conversations or persona blurbs into the ChefFlow persona pipeline. Use when the user wants to paste many personas at once, import third-party ChatGPT persona output, split a large persona dump, classify personas by type, add them to `Chef Flow Personas/Uncompleted/`, or prepare persona material for `persona-inbox`, `persona-stress-test`, or `persona-build`.
---

# Persona Dump

Convert a large pasted persona blob into pipeline-ready persona files without requiring the user to paste each persona separately.

## Saturation Check

Before asking for or importing a large persona dump, read `system/persona-batch-synthesis/saturation.json` when it exists.

If `saturation.saturated` is `true`:

1. Tell the user the corpus is saturated and that more generic personas are unlikely to reveal new categories.
2. Still accept a paste when the user explicitly wants it, but classify each accepted persona as `edge-case`, `real-user`, `missing-domain`, `strategic`, or `user-explicit`.
3. Reject duplicate generic personas more aggressively.
4. After import, route to `findings-triage`, `persona-inbox queue`, or `persona-build` instead of more generation.

Do not use saturation as a reason to ignore real customer/persona material. Use it to stop generic persona churn.

## Intake Contract

Tell the user they can paste the whole blob in chat. This includes large third-party ChatGPT persona output, mixed persona notes, or rough copied conversations. If it may exceed the chat limit, ask them to split it into numbered chunks and say "END OF DUMP" on the final chunk.

Do not process an incomplete multi-chunk dump until the final marker arrives.

If the corpus is already saturated, include the saturation warning before asking for the dump.

If the user asks "can I paste them all here?", answer yes, then give the chunking contract. Do not require one persona per message.

## Parse Workflow

1. Preserve the raw pasted content in the conversation. Do not invent missing persona details.
2. Split the blob into persona candidates using headings, names, role labels, separators, or repeated profile structure.
3. For each candidate, extract:
   - Persona name.
   - Persona type: `Chef`, `Client`, `Guest`, `Vendor`, `Staff`, `Partner`, or `Public`.
   - Operating context.
   - Pains, workflow gaps, desired outcomes, and evidence phrases.
4. If type is ambiguous, infer conservatively from the persona's relationship to ChefFlow.
5. Reject or flag candidates that are not ChefFlow-relevant instead of forcing them into the pipeline.
6. If the paste contains both agent operating guidance and persona material, route operating guidance to `skill-garden` and persona material through this skill.

## File Placement

Create one text file per accepted persona:

`Chef Flow Personas/Uncompleted/[Type]/[slug].txt`

Use lowercase hyphenated slugs. If a slug already exists in `Uncompleted`, `Completed`, or the vault, append a numeric suffix and note the duplicate.

## File Format

Use this compact format:

```text
Name: [persona name]
Type: [Chef|Client|Guest|Vendor|Staff|Partner|Public]
Source: pasted external ChatGPT conversation

Context:
[grounded summary from the pasted text]

Operational reality:
[how this person works, buys, cooks, coordinates, manages, or experiences events]

Pain points:
- [pain]

ChefFlow implications:
- [gap or capability pressure]

Raw source excerpt:
[short identifying excerpt from the paste]
```

Keep the source excerpt short enough to identify the origin. Do not copy a whole external conversation into every file.

## Validation

After writing files:

1. Run `node devtools/persona-validator.mjs --all` when appropriate and not blocked by the user's instruction.
2. If validating all is too noisy, validate the new files one by one.
3. Report accepted, rejected, duplicate, and ambiguous counts.
4. Hand off to `persona-inbox` for status, queue, synthesize, or run steps.

## Guardrails

- Never delete persona files.
- Never move existing completed personas back to uncompleted.
- Never fabricate personas from vague fragments.
- Never generate recipes or chef creative IP.
- Keep all imports additive.
- If the paste contains private or sensitive information, preserve only what is needed for persona analysis.
- If the corpus is saturated, prioritize novel edge cases and real user evidence over broad celebrity-style personas.
