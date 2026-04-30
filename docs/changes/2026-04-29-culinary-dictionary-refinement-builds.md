# Culinary Dictionary Refinement Builds

Built the operational refinement layer for the Culinary Dictionary and controlled vocabulary work.

## What Changed

- Added deterministic term intelligence for impact surfaces, related terms, alias conflicts, and coverage.
- Added vocabulary standards and publication gate utilities for preferred terms, chef-only terms, review candidates, alias gaps, avoid labels, and ambiguous labels.
- Added deterministic menu and staff prep language auditing for repeated adjectives, vague words, unresolved controlled vocabulary, missing texture/flavor/temperature signals, and prep ambiguity.
- Added a chef dictionary command center on `/culinary/dictionary`.
- Added a selected-term side panel with used-by surfaces, risk level, publication gate status, and related terms.
- Reworked the review queue into a decision builder: approve new private term, map as alias to a suggested term, reject, or dismiss.
- Added a dictionary outcomes engine for text surface matching, menu publish preflight, public/internal language guard, prep specificity prompts, safety coverage, term history, batch review grouping, search-miss candidates, and alias conflict resolution options.
- Added a Dictionary Outcomes Workbench to test menu, prep, ingredient, public, and recipe-note text against controlled vocabulary without drafting replacement language.
- Added Operations panels for review-source impact drilldown, safety coverage, batch review groups, alias conflict options, and selected-term history.
- Added no-result dictionary search capture so real chef search misses can enter the existing review queue.

## Safety Notes

- No AI recipe generation was introduced.
- No destructive SQL or schema migration was introduced.
- Review queue decisions remain chef-scoped and use existing review JSON.
- The language auditor returns findings and dictionary next steps only. It does not draft menu copy.
- Menu publish preflight blocks only critical safety issues. Other vocabulary issues remain warnings and review next steps.
