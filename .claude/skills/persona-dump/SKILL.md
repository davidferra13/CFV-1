---
name: persona-dump
description: Ingest huge pasted persona conversations or persona blurbs into the ChefFlow persona pipeline. Use when the user wants to paste many personas at once, import third-party ChatGPT persona output, split a large persona dump, classify personas by type, add them to `Chef Flow Personas/Uncompleted/`, or prepare persona material for `persona-inbox`, `persona-stress-test`, or `persona-build`.
---

# Persona Dump

Convert a large pasted persona blob into pipeline-ready persona files without requiring the user to paste each persona separately.

## Intake Contract

Tell the user they can paste the whole blob in chat. If it may exceed the chat limit, ask them to split it into numbered chunks and say "END OF DUMP" on the final chunk.

Do not process an incomplete multi-chunk dump until the final marker arrives.

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
