# Simulation History

Each run is appended below. Fixes applied after each run are noted manually by the developer.

## 2026-02-21 ~09:00 UTC — 17% pass rate — Run (first run)

Passing: none — all modules failed
Failing: inquiry_parse (0%), allergen_risk (0%), correspondence (0%), quote_draft (0%), client_parse (0%), menu_suggestions (0%)
Note: First ever run. All modules failed due to UND_ERR_HEADERS_TIMEOUT — Ollama never returned before Node.js undici's 30s headersTimeout killed the connection.
Fix applied: Created lib/simulation/ollama-client.ts — custom node:http fetch with no headersTimeout. All three simulation inner files (scenario-generator, pipeline-runner, quality-evaluator) switched to makeOllamaClient().

## 2026-02-21 10:19 UTC — 33% pass rate — Run a6a2a6e8

Passing: client_parse, menu_suggestions
Failing: inquiry_parse (0%), allergen_risk (0%), correspondence (0%), quote_draft (0%)
Fix applied after this run:

- inquiry_parse: Added 8 explicit null rules naming hallucination patterns ("Hi there" is NOT a client name, "a few of us" is NOT a guest count, etc.)
- allergen_risk: Added 4-step mandatory scan protocol; safetyFlags MUST be non-empty when any guest has a restriction
- correspondence: Required client name in subject, occasion and guestCount in body — stated in both system and user prompt
- quote_draft: Replaced vague range with explicit pricing formula ($85/$125/$175 per person, 30% grocery, $150 travel, 50% deposit)

## 2026-02-23 12:52 UTC — 33% pass rate — Run cebc0bda

Passing: allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), client_parse (0%), correspondence (0%), quote_draft (0%)

## 2026-02-23 18:52 UTC — 50% pass rate — Run d0f76064

Passing: client_parse, allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), correspondence (0%), quote_draft (0%)

## 2026-02-24 00:53 UTC — 17% pass rate — Run 81941807

Passing: menu_suggestions
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), quote_draft (0%)

## 2026-02-24 19:10 UTC — 50% pass rate — Run ff600558

Passing: client_parse, allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), correspondence (0%), quote_draft (0%)

## 2026-02-24 20:27 UTC — 50% pass rate — Run c4c9e5de

Passing: client_parse, allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), correspondence (0%), quote_draft (0%)

## 2026-02-24 20:54 UTC — 50% pass rate — Run 44e5a6dc

Passing: client_parse, allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), correspondence (0%), quote_draft (0%)

## 2026-02-25 17:11 UTC — 50% pass rate — Run 401cc64d

Passing: client_parse, allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), correspondence (0%), quote_draft (0%)

## 2026-02-26 20:04 UTC — 50% pass rate — Run f06ed190

Passing: client_parse, allergen_risk, menu_suggestions
Failing: inquiry_parse (0%), correspondence (0%), quote_draft (0%)
