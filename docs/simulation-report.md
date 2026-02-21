# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-21T09:59:45.777Z_
_Run ID: 0bb0e43d-caf8-474e-8a63-adaad5094307_

---

## Summary

The AI system is failing across most modules with a 17% pass rate. The inquiry_parse, client_parse, allergen_risk, correspondence, and quote_draft modules all need immediate attention. Only menu_suggestions is working correctly.

## Failures & Root Causes

### inquiry_parse

The module fails to extract basic client information like names and guest counts. It's not parsing structured data properly from raw notes. The system likely lacks clear extraction instructions for required fields.

### client_parse

The parser is not handling complex dietary restriction data correctly. It's either missing multi-allergy extraction logic or not properly distinguishing between different client records. It also fails to accurately represent contact information status (provided vs. not provided) from the source notes.

### allergen_risk

The module returns no risk combinations when at least one should exist. It's not properly identifying allergen interactions or triggering safety flags for severe allergens like nuts, shellfish, and celiac triggers. The logic for risk calculation appears broken.

### correspondence

The generated correspondence is generic and lacks client-specific details. The system isn't properly mapping parsed data to template variables or isn't using the extracted information to personalize content.

### quote_draft

The quote system is producing unrealistic pricing and missing required line items. It's not properly calculating costs or applying service fees. The pricing logic likely lacks proper validation or threshold checks.

## Prompt Fix Recommendations

### inquiry_parse

Add explicit extraction rules: "Extract client_name and guest_count from the note. If either field is missing, return undefined. Use regex patterns to match 'name: [text]' and 'guests: [number]' formats."

### client_parse

Revise to: "For dietary restrictions, extract all allergy items listed in the note, including dairy, nut, shellfish, and celiac. For contact info, check if 'No phone number provided' is mentioned for each client. If so, set phone to null or undefined for that client."

### allergen_risk

Update to: "When parsing notes, identify all allergen combinations and return at least one risk row for each potential interaction. If nut, shellfish, or celiac allergens are present, always include safetyFlags with appropriate severity levels."

### correspondence

Change to: "Use the extracted client_name, dietaryRestrictions, and guest_count to personalize the subject line and body. Replace placeholders with actual parsed values from the client data."

### quote_draft

Modify to: "Calculate total price using standard pricing rules. If total exceeds $5000, include a service fee line item. Validate that all required line items are present in the final quote."

## What's Working Well

The menu_suggestions module correctly generates appropriate menu recommendations, indicating that the core AI reasoning capabilities are functional.

---

_This report is overwritten after each simulation run. View history in the Simulation Lab at /dev/simulate._
