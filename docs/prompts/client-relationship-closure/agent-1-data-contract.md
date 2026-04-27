Read and execute `docs/specs/build-client-relationship-closure-data-contract.md`.

Follow it exactly. First, show the proposed SQL and ask the developer for explicit approval before creating any migration file. Do not run `drizzle-kit push`. Do not edit `types/database.ts`. Run all verification commands allowed by the spec at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
