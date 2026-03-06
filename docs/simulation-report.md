# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-06T22:16:24.447Z_
_Run ID: a625a9f5-c239-420f-93ef-d1ff7e279731_

---

## Summary

The system is currently passing 67% of tests, a significant drop from recent runs that were around 83% pass rate. The inquiry_parse and client_parse modules are completely failing, while all other modules are passing. These two modules have been consistently failing across multiple runs and show no recent improvement.

## Failures & Root Causes

**inquiry_parse module**
The module is failing because it's returning incorrect data that doesn't match expected ground truth. It's outputting "Sarah Johnson" instead of "undefined" for client name and "24" instead of "undefined" for guest count. This suggests the parser is incorrectly extracting or defaulting values when they're not present in the input text, or it's not properly handling missing data scenarios.

**client_parse module**
This module is failing because it's including fields in its output that weren't part of the expected ground truth. Specifically, it's including 'preferences' and 'referralSource' fields that don't exist in the original note. Additionally, while it correctly formats phone numbers, it's not properly filtering output to only include fields that are actually present in the input text.

## Prompt Fix Recommendations

**For inquiry_parse module:**
Update the prompt to explicitly state that when specific fields are not mentioned in the input text, the parser should return undefined/null for those fields. Add clear instructions that the parser must not make assumptions or default to arbitrary values. Include examples showing how to properly handle missing data.

**For client_parse module:**
Revise the prompt to require that the parser only output fields that are explicitly mentioned in the input text. Add a step that explicitly checks each potential field against the input content before including it in the output. Include a rule that any field not present in the original note should be excluded from the final JSON response.

## What's Working Well

All modules except inquiry_parse and client_parse are passing consistently. The allergen_risk, correspondence, menu_suggestions, and quote_draft modules have shown stable performance and are working correctly. The recent improvement in overall pass rate from 0% to 67% indicates these modules are functioning properly and should be maintained as baseline standards.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
