# ChefFlow Setup internal tools

Native Node.js tools for the existing campaign in docs/business/chefflow-setup. No packages, network service, database, account credentials or external transport are required.

Run from the ChefFlow repository:

    node scripts/setup-service/cli.mjs check
    node scripts/setup-service/cli.mjs report
    node scripts/setup-service/cli.mjs build
    node --test scripts/setup-service/core.test.mjs

check and report validate sources and emit structured state. build additionally writes versioned, content-hashed internal report/quote packets. Repeating the same build reuses identical files. Interrupted builds can finish missing files; differing existing content is preserved and reported as an error. No files are deleted.

Sources:

- docs/business/chefflow-setup/02-Prospect-review.csv — canonical research and exclusions
- docs/business/chefflow-setup/10-Campaign-settings.json — selected business defaults and internal-only mode
- docs/business/chefflow-setup/11-Qualification-inputs.json — genuinely known operator facts, keyed by normalized business name + "|" + normalized town

Do not put hypothetical answers into the qualification inputs. Current inputs are empty because no merchant has confirmed a need. A future entry may supply boolean ownerConfirmed, operatingNow, wantsDirectPickup, simpleOptions, posMigrationRequired, existingSystemKnown, ownerOwnsAccounts, providerFeesApproved; integer locationCount and menuItemCount; and evidenceNote. An asserted owner confirmation requires evidenceNote.

The engine evaluates research age, exclusions, incomplete facts, pilot limits and costing. A fit-for-scope-review result is not a booking, contract, provider application, send approval or guaranteed profitability.

Every generated packet is INTERNAL DRAFT. Outreach and application flags must be false. The command interface only accepts check/report/build; send, email, call, submit, apply, publish, import and activate are unsupported. This is a restriction of this tool; it does not claim to control other applications.

Generated paths are under the campaign's generated directory. No generated artifact is imported into the existing prospecting queue or sent anywhere. The app's existing routes, authentication and providers remain untouched.

Tests cover CSV corruption, quote escaping, missing and false facts, scope boundaries, stale/future evidence, cost arithmetic, unsafe output paths, retry idempotency, interrupted output and preservation of edited reports.
