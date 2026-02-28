# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-28T18:49:23.217Z_
_Run ID: a9bdfbe8-b5ef-4e37-9c88-df78bb220c94_

---

## Summary

The system's overall pass rate remains low at 50%. The inquiry_parse, correspondence, and quote_draft modules are consistently failing. There has been no improvement in performance since the last run. The client_parse, allergen_risk, and menu_suggestions modules are now passing consistently.

## Failures & Root Causes

**inquiry_parse**
The module fails to extract client name and guest count from inquiries. It's not reliably parsing structured information from natural language inputs. The module likely lacks sufficient examples or explicit rules for identifying these key data points.

**correspondence**
The module generates emails that are either too formal or lack personalization for the expected lifecycle stage. It also fails to incorporate client-specific details or reference previous interactions. The module appears to lack clear guidance on tone matching and personalization requirements.

**quote_draft**
The module produces quotes with unrealistic pricing. It's not properly constraining total price and per-person rates to expected ranges. The pricing logic appears to be generating values outside the defined bounds without proper validation.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit extraction rules for client name and guest count. Include examples showing expected vs. incorrect parsing. Require the model to output "Client name: [name]" and "Guest count: [number]" in its response format.

**correspondence**
Specify tone requirements for each lifecycle stage. Include examples of appropriate personalization and client history references. Require the model to include at least one client-specific detail and match the expected tone level.

**quote_draft**
Define clear pricing constraints in the prompt. Specify maximum per-person rates and total price ranges. Require the model to validate that outputs fall within acceptable bounds before finalizing the quote.

## What's Working Well

The client_parse, allergen_risk, and menu_suggestions modules are consistently passing. These modules have shown stable performance and appear to be well-defined. The recent improvement in these modules suggests the fixes applied in earlier runs have been effective.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
