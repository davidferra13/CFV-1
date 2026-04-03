# Food Operator Survey Launch Console

Date: `2026-04-02`
Status: `fallback reference only`
Purpose: preserve the older operator-survey Google Forms operating context without overriding the current internal builder path

Important note:

- This console is now historical / fallback launch context.
- The canonical builder execution path starts at `docs/research/current-builder-start-handoff-2026-04-02.md`.
- Do not treat the Google Forms runbook below as the primary next step if the internal ChefFlow survey route is available.

## Canonical Plan

- Launch spec:
  [food-operator-survey-launch-without-openclaw.md](C:/Users/david/Documents/CFv1/docs/specs/food-operator-survey-launch-without-openclaw.md)
- Builder-start handoff:
  [current-builder-start-handoff-2026-04-02.md](C:/Users/david/Documents/CFv1/docs/research/current-builder-start-handoff-2026-04-02.md)
- Survey execution handoff:
  [survey-wave-1-internal-launch-builder-handoff-2026-04-02.md](C:/Users/david/Documents/CFv1/docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md)
- DEV workflow research:
  [dev-survey-launch-workflows-2026-04-02.md](C:/Users/david/Documents/CFv1/docs/research/dev-survey-launch-workflows-2026-04-02.md)

## Fallback Google Forms Assets

- Main anonymous survey:
  [survey-food-operator-wave-1-google-forms-ready.md](C:/Users/david/Documents/CFv1/docs/research/survey-food-operator-wave-1-google-forms-ready.md)
- Follow-up opt-in form:
  [survey-operator-follow-up-opt-in-google-forms-ready.md](C:/Users/david/Documents/CFv1/docs/research/survey-operator-follow-up-opt-in-google-forms-ready.md)

Google Forms owner surface:

- https://docs.google.com/forms/u/0/

## Outreach Copy

- Launch messages:
  [food-operator-survey-launch-messages.md](C:/Users/david/Documents/CFv1/docs/research/food-operator-survey-launch-messages.md)

## Tracking Templates

- Channel log CSV:
  [food-operator-survey-channel-log.csv](C:/Users/david/Documents/CFv1/data/templates/food-operator-survey-channel-log.csv)
- Warm outreach list CSV:
  [food-operator-survey-warm-outreach-list.csv](C:/Users/david/Documents/CFv1/data/templates/food-operator-survey-warm-outreach-list.csv)

## Analysis And Ops Docs

- Shared analysis codebook:
  [survey-wave-1-analysis-codebook-2026-04-02.md](C:/Users/david/Documents/CFv1/docs/research/survey-wave-1-analysis-codebook-2026-04-02.md)
- Shared launch checklist:
  [survey-launch-checklist-2026-04-02.md](C:/Users/david/Documents/CFv1/docs/research/survey-launch-checklist-2026-04-02.md)

## Save These Live Links Once Created

Paste them here after you create the forms:

- Owner Google account: `davidferra13@gmail.com`
- Live version label: `wave-1-draft-1`
- Created date: `2026-04-02`
- Main survey edit link: `https://docs.google.com/forms/d/1_hIr0ADA0ZS4AzVpPFuYW9lv7531Mtba4yghffnqXlE/edit`
- Main survey public link: `https://docs.google.com/forms/d/e/1FAIpQLSdhVBCLCM7bpyfg4VN9ensAAFt_DR_IJFN2v7_Tqy1vH4W_UQ/viewform?usp=header`
- Follow-up form edit link: `https://docs.google.com/forms/d/1mJLUUTvU6SeiiZMFgflhu2mlMaOLS79XAlJK7vDBOn4/edit`
- Follow-up form public link: `https://docs.google.com/forms/d/e/1FAIpQLScCqStlIUYkML9N6USryTRSlKLPw4tE1QsZdwUzsLqp4w9zyw/viewform?usp=header`
- Main survey raw responses sheet: `https://docs.google.com/spreadsheets/d/10Wuvs_7gRzSOes2jqkP0HDXyOjIHC3de4WJLobum1cQ/edit?resourcekey#gid=2013675198`
- Clean analysis sheet or file:

## Historical Decisions For The Fallback External-Forms Path

These belong to the older Google Forms shortcut and should not override the canonical internal builder flow:

- use Google Forms only if the internal ChefFlow survey path cannot be deployed
- use the short wave-1 survey, not the long 28-question version
- keep the main survey anonymous
- keep identity capture in the separate follow-up form
- require source attribution in the main survey
- create the live forms in the final owner Google account from day one
- keep the linked response sheet raw and analyze in a separate sheet or export
- freeze wave-1 structure once live and version material changes
- launch in this order:
  - warm direct outreach
  - communities
  - small paid tests
  - associations and vendors

## Stage Closure Status

### Fully Closed Inside The Repo

- launch strategy
- question set
- branching logic
- outreach copy
- tracking templates
- analysis rules
- launch checklist

### Still Open Outside The Repo If The Fallback Google Forms Path Is Chosen

- populate the two live Google Forms from the locked question docs
- verify live Google Form settings against the checklist
- prepare the initial warm outreach list
- send the first `20-30` warm contacts
- review the first `10-15` completions before scaling

## Dependencies That Must Exist Before Soft Launch On The Fallback Path

- a live Google account session you control
- the two live forms populated from the locked docs
- the linked response sheet
- the right owner account for those forms
- one tracked link strategy per channel
- one person responsible for weekly response review and coding

## Canonical Current Next Step

For the active wave-1 system, do not start from this console.

Start here instead:

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
4. `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
5. `docs/specs/p0-survey-passive-voluntary-surfacing.md`
6. `docs/specs/p1-survey-public-hardening-and-results-scale.md`

## Minimal Ongoing Workflow For The Fallback Path

1. Edit wording in the repo first.
2. Apply the same changes in the live Google Form.
3. Use one pre-filled or tracked link per channel whenever practical.
4. Log every channel in the channel log.
5. Keep the linked response sheet raw.
6. Do coding and cleanup in a separate analysis sheet or export.
7. Review the first `10-15` responses manually before scaling.
8. Keep the main survey anonymous.
9. Keep follow-up capture in the separate opt-in form.
10. If the live form changes materially after launch, record a new dated version note.

## Live Google Form Settings To Verify

- `Collect email addresses` off on the main survey
- `Require sign-in` off on the main survey
- `Limit to 1 response` off unless a later spec changes that
- response summary visibility off for respondents
- edit-after-submit off for respondents
- progress bar on

## Current Blocker

The remaining steps are now Google-side build and launch work:

- populate the live forms from the locked docs
- verify settings and confirmation copy
- create the clean analysis layer
- copy any additional live asset links back into this console if they change

Everything else inside the repo is complete.
