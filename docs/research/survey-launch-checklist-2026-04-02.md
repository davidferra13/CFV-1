# Survey Launch Checklist

> **Date:** 2026-04-02
> **Use For:** Operator and client wave-1 launches.
>
> **Scope note:** This checklist reflects the earlier external Google Forms launch workflow. Treat it as fallback or historical operational guidance unless the internal ChefFlow launch path is unavailable. For the current canonical execution sequence, read `docs/build-state.md`, then `docs/research/current-builder-start-handoff-2026-04-02.md`, then `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`, then execute `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`, then move to `docs/specs/p1-survey-public-hardening-and-results-scale.md` only after deploy verification passes. If launching via ChefFlow's internal survey routes, adapt these checks around `/beta-survey/public/...` instead of creating live Google Forms.

---

## Before Anything Goes Live

- Use `docs/research/current-builder-start-handoff-2026-04-02.md` as the canonical execution order if launching through ChefFlow.
- Create the live forms in the final owner Google account, not a temporary account.
- Build the live Google Form from the wave-1 doc, not from the long master survey.
- Build the separate follow-up opt-in form.
- Turn `Collect email addresses` off on the anonymous survey.
- Turn `Require sign-in` off on the anonymous survey.
- Turn respondent response-summary visibility off.
- Turn edit-after-submit off.
- Confirm the anonymous survey does not contradict its own description.
- Put the follow-up form link in the survey confirmation message.
- Create the channel log CSV and warm outreach list CSV.
- Create one tracked or pre-filled link per channel or partner.
- Create the linked raw response sheet.
- Create a separate clean analysis sheet or export target.
- Decide the exact soft-launch audience.
- If using ChefFlow's internal public survey routes instead of Google Forms:
  - confirm the public survey pages stay `noindex`
  - confirm `robots.txt` still disallows `/beta-survey/`
  - confirm the real deployed hostname is allowed in the Turnstile site configuration before sending traffic

---

## Soft Launch Gate

- Send to `20-30` warm or adjacent respondents first.
- Do not scale until at least `10-15` completions are reviewed manually.
- Check median completion time.
- Check whether the branching logic works.
- Check whether open-text answers are useful.
- Check whether the opt-in flow works.
- Check whether the source attribution defaults are landing correctly.

---

## Before Community Distribution

- Review completion rate by channel.
- Remove or rewrite confusing questions.
- Confirm source attribution is appearing cleanly in responses.
- Confirm the survey still fits the target time window.
- Confirm the message copy matches the audience and the channel.

---

## Before Paid Or Partner Distribution

- Confirm the survey is producing qualified responses, not just volume.
- Confirm the best-performing message variants.
- Confirm the best-performing audience segments.
- Confirm the follow-up form is generating usable interview or summary opt-ins.
- Confirm someone owns weekly review and coding.

---

## Weekly Operating Checklist

- Preserve the linked response sheet as raw.
- Export or copy into the clean analysis layer.
- Update the channel log.
- Update the response-coding sheet.
- Review top patterns by segment.
- Review top patterns by channel.
- Flag any threshold that now looks clearly supported or clearly weak.
- Decide whether to keep running, revise, or scale.
- If the live form changed materially, record a dated version note.
