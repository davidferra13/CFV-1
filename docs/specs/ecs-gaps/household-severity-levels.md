# ECS Gap: Household Allergy Severity Levels

> Source: ECS Scorecard 2026-04-27 | User Type: Household (77/100) | Dimension: Polish (14/20)

## Problem
No severity level per allergy (preference vs intolerance vs life-threatening anaphylaxis). All allergies treated equally. "Mild lactose sensitivity" and "anaphylactic peanut allergy" get the same data treatment.

## Spec
1. Add `severity` field to household member allergy entries
2. Three levels: `preference` (avoid if possible), `intolerance` (causes discomfort), `life_threatening` (anaphylaxis risk)
3. Default: `intolerance` for backward compatibility
4. UI: severity selector per allergy item in both chef-side and hub-side editors
5. Display: color-code by severity (yellow=preference, orange=intolerance, red=life_threatening)
6. Downstream: constraint radar and menu safety should flag life-threatening at highest priority

## Schema Change
This likely needs a migration to change allergies from string[] to a structured type, or add a parallel `allergy_severities` JSONB column. Evaluate which is safer.

## Acceptance
- Each allergy has a severity level
- Life-threatening allergies visually distinct
- Downstream safety systems prioritize by severity
- Backward compatible with existing data
