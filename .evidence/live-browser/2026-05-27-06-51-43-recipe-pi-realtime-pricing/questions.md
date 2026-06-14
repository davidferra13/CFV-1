# Questions And Assumptions

## Asked Before Browsing

1. None. The request was low-risk enough to proceed with a synthetic local recipe.
2.
3.

## Assumptions Made

- Use a disposable synthetic recipe.
- Use desktop Playwright against `http://localhost:3100`.
- Stay inside ChefFlow local app; no external purchasing, messaging, or account actions.
- Creating a test recipe in the authenticated local workspace was within the user's "simulate this and do it for real" request.

## New Questions Discovered During Browsing

- Should the recipe-making moment be a live pipeline with visible stages and timings?
- Should pre-save price hints use the same resolver as post-save costing?
- Should the recipe detail page block contradictory states like "All ingredients priced" plus "2 missing"?
- Should a hung PIE drawer fail open with a timeout message and retry action?
