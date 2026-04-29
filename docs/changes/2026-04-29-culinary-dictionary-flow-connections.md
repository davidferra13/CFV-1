# Culinary Dictionary Flow Connections

Expanded the dictionary and culinary word flow after the initial dictionary build.

## What Changed

- Chef-added Culinary Board words now queue chef-scoped dictionary review candidates.
- Approved dictionary review items now become private searchable chef dictionary terms.
- Culinary Board list and board views link canonical vocabulary words to the chef dictionary.
- Public dictionary detail pages link to existing public ingredient guides when a matching ingredient slug is already available.

## Safety Notes

- Dictionary review queue writes are non-blocking from the Culinary Board add-word action.
- Public ingredient guide links only render after an existing public ingredient lookup resolves.
- No AI recipe generation was introduced.
- No destructive SQL was introduced.
