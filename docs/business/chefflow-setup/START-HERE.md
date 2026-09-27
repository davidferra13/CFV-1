# ChefFlow Setup — first-client launch campaign

Prepared 27 September 2026 on DESKTOP-DKCONSS.

A practical service: set up a restaurant's direct online pickup on a suitable existing platform, verify orders reach its staff, then hand over the owner-controlled account.

**Working brand:** ChefFlow Setup, a proposed service line of ChefFlow. This is a service name, not a claim of separate incorporation, provider certification, or an established customer base. Confirm the legal seller before invoices or contracts.

**Pilot offer:** $500 once for one location, up to 30 standard menu items and simple options. Three initial projects. $250 after scope approval, $250 after acceptance. Provider charges are separately approved. This is a proposed test price, not demonstrated market demand.

**Immediate prospect queue:** Chef Co Restaurant in Methuen, MA, and Gourmet Bites Catering / Cafe in Salem, NH. Both need owner qualification. Neither is a confirmed customer. Of 20 researched businesses, 4 remain on hold and 14 already have ordering or are outside the offer.

## Use the existing workflow

1. Review 01-Offer.md and 04-Outreach-for-review.md.
2. Use 02-Prospect-review.csv for the evidence and exclusions.
3. 03-ChefFlow-import.csv contains only the two investigation candidates in the existing /prospecting/import format. Its description and notes preserve the uncertainty and sources. Importing creates ordinary new prospects; it does not qualify them or approve contact. Do not enroll them in an automated sending sequence.
4. Use 07-Client-intake-and-acceptance.md for qualification and agreed scope.
5. Follow 05-Fulfillment.md for the installation and owner handover.
6. Record actual results in 08-Sales-and-delivery-ledger.csv.

## What is ready, and what remains

Ready: service scope, pilot price, evidence-backed research, two personalized outreach drafts, importer-compatible data, intake, acceptance checklist, delivery process, and referral application copy.

Not performed: sending or calling prospects, importing records into the live database, creating a mailbox, registering a business/domain, submitting partner applications, collecting money, or installing a restaurant's ordering system. No claim of provider approval or commission earned is made.

The existing application was not changed. These files are in an isolated branch of the real ChefFlow repository on David's computer because the main checkout contains unrelated work. No new application, cloud prototype, or hosting target was created for this correction.

The internal defaults are now selected in 13-Build-decisions.md. ChefFlow Setup is the service brand, setup@cheflowhq.com is the planned but uncreated mailbox, and DF Private Chef LLC is the internal seller default. David explicitly instructed NO OUTREACH. No contact, application, enrollment or send scheduling is authorized.

## Files

- 01-Offer.md — customer-facing offer and scope
- 02-Prospect-review.csv — all 20 research records with sources and exclusions
- 03-ChefFlow-import.csv — two investigation candidates in ChefFlow's import format
- 04-Outreach-for-review.md — unsent email, call and follow-up copy
- 05-Fulfillment.md — delivery and account handover
- 06-Referral-programs.md — verified program limitations and application copy
- 07-Client-intake-and-acceptance.md — qualification and signed-off facts
- 08-Sales-and-delivery-ledger.csv — blank operating ledger; no invented results

## Working internal generator

The native tool now validates all twenty research records, evaluates scope and estimated contribution, and produces internal quote/acceptance packets. It makes no network calls and has no sending command.

- [Current operating report](generated/a9f920ca14785f201881e61046e72f43a95a98347bfc32b9f8bb6732e7d5f46c/report.md)
- [Two internal quote packets](generated/a9f920ca14785f201881e61046e72f43a95a98347bfc32b9f8bb6732e7d5f46c/quote-packets.md)
- [Verification evidence](12-Internal-build-proof.json)
- [Selected defaults and no-outreach instruction](13-Build-decisions.md)
- [Provider routing and referral reality](15-Provider-routing.md)

Use Build internal packets.cmd to regenerate on this computer after updating the source data. Real merchant facts belong in 11-Qualification-inputs.json; do not fill unknown answers with guesses. The existing import CSV remains a reference artifact and must not be enrolled in sending automation.
