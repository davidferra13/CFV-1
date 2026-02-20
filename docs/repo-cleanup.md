# Repo Cleanup — AI Agent Artifact Removal

## Why This Was Done

This project was built entirely by AI agents running in parallel (up to 16 concurrent). Over time, agents generated debug artifacts, temp files with malformed names, and ad-hoc scripts that accumulated in the repo root. None of these files belong in the codebase. This cleanup removes them and hardens `.gitignore` to prevent recurrence.

## What Was Deleted

| File | Why It Existed | Why It's Gone |
|---|---|---|
| `build-output.txt` | Agent tried to capture build output to a file | Build logs don't belong in the repo |
| `.tmp-dev-live.log` | Dev server log artifact | Temp logs don't belong in the repo |
| `.tmp-dev-live.err.log` | Dev server error log artifact | Temp logs don't belong in the repo |
| `build_log_current.txt` | Another build log capture attempt | Build logs don't belong in the repo |

## Files That No Longer Appear (Already Gone Before Cleanup)

The git status snapshot at session start showed many files that had already been removed by the time this cleanup ran — confirming other agents had partially cleaned up. These were covered by the `.gitignore` update to prevent recurrence:
- `nul` (Windows `/dev/null` accident)
- `UsersdavidDocumentsCFv1supabase-types-temp.ts` (full Windows path as filename)
- `supabase-types-temp.ts` (temp Supabase type export)
- `build_out.txt`, `build_output.txt`, `build_output_capture.txt`
- `build.log`, `gen_error.txt`, `types_err.tmp`, `types_output.tmp`
- `find_violations.cjs`, `find_violations.mjs`, `find_violations.ps1`
- `run_tsc_capture.js`, `check-types-gen.js`
- `types/gen-output.txt`, `types/gen-stderr.txt`

## What Was Added to `.gitignore`

```
# Build/debug artifacts (AI agent cleanup)
build-output.txt
build_out.txt
build_output*.txt
build_log_current.txt
build.log
gen_error.txt
nul
*.tmp

# Supabase temp type exports
supabase-types-temp.ts
*supabase-types-temp.ts

# Ad-hoc debug scripts
find_violations.*
run_tsc_capture.js
check-types-gen.js

# Types debug output
types/gen-output.txt
types/gen-stderr.txt

# Playwright test output
/test-results/
/playwright-report/
```

## What Was NOT Touched

- All feature code (`app/`, `components/`, `lib/`) — real work, not junk
- All migrations (`supabase/migrations/`) — schema history, untouched
- `types/database.ts` — the MM conflict state is a separate issue requiring its own investigation
- The hundreds of untracked feature files — committing that work is a separate task

## Architectural Note

The `.gitignore` patterns added here are defensive — they cover categories of files, not just specific filenames. This means future agents generating similar debug artifacts will have them automatically excluded from git tracking.
