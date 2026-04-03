# Developer Research: Survey Launch Workflows

Date: `2026-04-02`

Important note:

- This research reflects the earlier external-form workflow analysis.
- It remains useful background, but it is no longer the canonical execution path for the current wave-1 system.
- For actual builder execution, start with `docs/research/current-builder-start-handoff-2026-04-02.md`.

## Why This Research Exists

This research was done to tighten the current survey-launch package from a developer and operations perspective.

The question was not "how do people write surveys?"

The question was:

`How do developers and technical operators actually manage live survey assets, attribution, ownership, response handling, and change control without creating operational drift or data confusion?`

This document focuses on the workflows around the survey system, not just the questionnaire itself.

## Method

Cross-checked using current official documentation from:

- Google Forms / Google Drive
- Typeform
- Qualtrics
- SurveyMonkey
- GitHub

Angles reviewed:

- branching and form logic
- live asset ownership and transfer rules
- source attribution capture
- response handling and exports
- live-form change risk
- documentation and ownership patterns

## What Developers Commonly Do

### 1. Use external form platforms first, not custom build first

The common operating pattern is:

- launch with an external form tool
- connect responses to a sheet or analysis workflow
- only build custom product-native survey surfaces later if the workflow proves valuable

This matched the earlier shortcut decision to use Google Forms before the internal path existed.

Current state:

- the canonical wave-1 path is now the internal ChefFlow survey system
- this document remains useful as external-form workflow background and fallback context only

### 2. Use logic and segmentation early

Official tools consistently support logic-based respondent paths:

- Google Forms official docs are inconsistent here: one help page frames section routing around multiple choice and dropdown, while another question-type page also mentions checkbox-based section routing
- SurveyMonkey supports skip logic and recommends careful placement of logic-driving questions
- Qualtrics uses branch logic and embedded data in survey flow

Cross-check outcome:

- our choice to use one single-select screener plus branching is correct
- the first branching question should remain structurally simple
- Google Forms is workable, but not ideal for more advanced multi-branch logic
- for wave 1, the safest rule is still to drive all primary branching from one single-select screener and not depend on checkbox branching behavior

### 3. Capture attribution in the form system, not only in a separate spreadsheet

Higher-end survey tools expose this directly:

- Typeform supports URL parameters / hidden fields for respondent source and segmentation
- Qualtrics uses embedded data in survey flow to save metadata with the response

Google Forms does not expose hidden fields the same way, but it does support pre-filled links.

Cross-check outcome:

- the current explicit `Where did you first see this survey?` question is necessary
- the stronger operational version is to generate pre-filled links that set the source answer by channel
- that reduces attribution noise and keeps the source stored with the response itself

### 4. Keep raw response data separate from cleaned analysis

Google Forms officially supports:

- linked Sheets for live response storage
- CSV export of all responses
- email notifications for new responses

The standard ops pattern is:

- keep the linked response dataset raw and untouched
- do cleaning, tagging, and interpretation in a separate sheet or exported file

Cross-check outcome:

- the existing analysis codebook is correct
- the launch docs should explicitly prohibit "cleaning" the raw linked sheet in place

### 5. Treat live asset ownership as a real operational decision

Google Drive ownership rules matter:

- ownership transfer requires prior sharing
- in work or school environments, ownership transfer is limited to the same organization
- admin transfer support is organization-scoped

Cross-check outcome:

- the survey should be created in the correct owner account from day one
- this is not a minor preference; it is an asset-control decision
- if the form is created in the wrong account, later transfer can become messy or impossible depending on account type and org boundaries

### 6. Freeze active form structure once a wave is live

Google's autosave behavior introduces a subtle risk:

- deleting a question deletes that draft answer
- changing selected options can unset draft answers
- changing branching logic can remove access to certain pages

Cross-check outcome:

- once warm distribution begins, do not materially edit the active form in place
- if questions, options, or branching need real structural changes, create a new dated version instead of mutating the active wave

### 7. Explicitly control responder-visible settings

Google Forms now has publish and access controls plus responder-facing settings like:

- allow response editing
- view results summary
- collect email addresses

Important behavior:

- if `View results summary` is enabled, anyone who can respond may see charts and full-text response summaries

Cross-check outcome:

- for this survey, `View results summary` should stay off
- `Allow response editing` should stay off for cleaner wave-1 analysis
- anonymity must be protected by settings, not only by wording

### 8. Use clear ownership and change-request patterns around the docs

GitHub's common patterns for structured operational work are:

- CODEOWNERS for ownership routing
- issue forms and templates for consistent change intake

Cross-check outcome:

- the survey package should have named owners even if we do not implement CODEOWNERS right now
- survey changes should be documented as versioned execution notes, not silent edits

## Where These Workflows Break

Across tools and docs, the same failure modes appear:

1. the live form drifts away from the documented spec
2. attribution is tracked externally but not stored with the response
3. the form is owned by the wrong account
4. responders see settings that were never intended, like editable responses or shared summaries
5. the raw response source gets "cleaned" directly and loses auditability
6. form changes happen after launch and make wave data harder to compare

## What Was Missing In The Current ChefFlow Survey Package

Before this research pass, the docs were strong on strategy and content, but weaker on:

- live owner-account discipline
- pre-filled attribution links
- raw-vs-clean analysis separation in the launch console
- explicit freeze/version rules for active waves
- responder-visible settings like results summary and response editing

## Direct Implications For The Current Docs

The current launch docs should now enforce:

1. create the live forms in the correct owner account from day one
2. store live owner/public/sheet links in one console file
3. keep `View results summary` off
4. keep `Allow response editing` off
5. use pre-filled responder links by channel for attribution where possible
6. treat the linked responses sheet as raw data only
7. create a new dated version if the live survey needs structural changes after launch
8. name operational ownership explicitly

## Bottom Line

Developer workflow research supports the current launch direction.

It sharpens it in four important ways:

- ownership matters more than convenience
- attribution should be captured with the response, not just beside it
- raw data needs protection from accidental "cleanup"
- live survey waves need version discipline

That is the difference between a usable survey launch and a messy one.

## Sources

- Google Forms: Show questions based on answers: https://support.google.com/docs/answer/141062
- Google Forms: Choose a type of question for your form: https://support.google.com/docs/answer/7322334
- Google Forms: Publish & share your form with responders: https://support.google.com/docs/answer/2839588
- Google Forms: View & manage form responses: https://support.google.com/docs/answer/139706
- Google Forms: Autosave your response progress on a Google Form: https://support.google.com/docs/answer/10952360
- Google Drive: Make someone else the owner of your file: https://support.google.com/drive/answer/2494892
- Google Workspace Admin: Transfer Drive files to a new owner as an admin: https://support.google.com/a/answer/1247799
- Typeform: Using URL parameters (formerly Hidden Fields): https://help.typeform.com/hc/en-us/articles/360052676612-Using-URL-parameters-formerly-Hidden-Fields
- SurveyMonkey: Question Skip Logic: https://help.surveymonkey.com/en/surveymonkey/create/question-skip-logic/
- SurveyMonkey: Mobile-friendly survey best practices: https://www.surveymonkey.com/learn/survey-best-practices/mobile-friendly-surveys/
- Qualtrics: Embedded Data: https://www.qualtrics.com/support/survey-platform/survey-module/survey-flow/standard-elements/embedded-data/
- GitHub Docs: About code owners: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub Docs: Configuring issue templates for your repository: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository
- GitHub Docs: About issue and pull request templates: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates
