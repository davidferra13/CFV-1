#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'live-browser-run';
}

const slug = slugify(argValue('slug', 'live-browser-run'));
const mode = slugify(argValue('mode', 'standard'));
const browserContext = argValue('browser-context', '');
const root = argValue('root', '.evidence/live-browser');
const now = new Date();
const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
const dir = path.join(root, `${stamp}-${slug}`);
const screenshotsDir = path.join(dir, 'screenshots');

const report = `# Live Experience Research Pack

## Executive Takeaway


## Setup

- Task:
- Site/app/route:
- Date/time: ${now.toISOString()}
- Browser context used: ${browserContext}
- Confidence impact of browser context:
- Session/auth state:
- Viewport/device:
- Location sensitivity:
- Permissions used:
- Action boundary:
- Run mode: ${mode}
- Evidence folder: ${dir}

## User Need Learned

- User goal:
- Audience/persona:
- Evaluation lens:
- Success criteria:
- Output expected: descriptive / strategic / research Markdown / build-ready / queue-ready
- Assumptions:
- Questions asked: ${path.join(dir, 'questions.md')}
- Clarifying answers:

## Method

- Steps planned:
- Comparisons planned:
- Stopping point:
- Redaction approach:

## Step-by-Step Observations

| Step | Action | Screenshot | Visible result | User-need learning |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |

## What Happened


## Findings

### User Need Fit


### Trust And Proof


### Friction And Failure Points


### Actionability


### Personalization Or Context Signals


### Missing Affordances


## Evaluation Scores

| Dimension | Score | Evidence |
| --- | --- | --- |
| Relevance |  |  |
| Personalization |  |  |
| Trust |  |  |
| Friction |  |  |
| Actionability |  |  |
| Local/context fit |  |  |
| Conversion pressure |  |  |
| Missing affordances |  |  |
| ChefFlow opportunity |  |  |
| Evidence confidence |  |  |

## Product Lessons

- What to copy:
- What to avoid:
- What to adapt:
- What to investigate next:

## ChefFlow Implications

- Relevant surface:
- Build/spec candidate:
- Queue candidate:
- Acceptance signal:
- Risks/dependencies:
- Verification idea:

## Evidence Pack

- Screenshots: ${screenshotsDir}
- Notes: ${path.join(dir, 'notes.md')}
- URLs:
- Console/network/server findings:
- Redactions: ${path.join(dir, 'redactions.md')}

## Limitations

- Browser-context limits:
- Personalization/session limits:
- Location/time limits:
- A/B test/ads variability:
- Tooling limits:

## What Not To Conclude

- Do not generalize:
- Do not infer:
- Needs another run:

## Open Questions

1.
2.
3.

## Recommended Next Run

- Suggested mode:
- Suggested browser context:
- Suggested comparison:
`;

const notes = `# Live Browser Notes

## Intent Model

- User goal:
- Audience/persona:
- Evaluation lens:
- Success criteria:
- Output expected:
- Run mode: ${mode}
- Browser context: ${browserContext}

## Browser Context Decision

- Candidate contexts:
- Selected context:
- Reason:
- Confidence impact:

## Timeline

| Time | Step | URL | Action | Observation | Screenshot |
| --- | --- | --- | --- | --- | --- |

## Raw Non-Private Observations

`;

const redactions = `# Redactions

Record anything omitted, blurred, cropped, summarized, or intentionally not shared.

| Item | Location | Redaction action | Reason |
| --- | --- | --- | --- |
`;

const questions = `# Questions And Assumptions

## Asked Before Browsing

1.
2.
3.

## Assumptions Made

- 

## New Questions Discovered During Browsing

- 
`;

await mkdir(screenshotsDir, { recursive: true });
await writeFile(path.join(dir, 'report.md'), report, 'utf8');
await writeFile(path.join(dir, 'notes.md'), notes, 'utf8');
await writeFile(path.join(dir, 'redactions.md'), redactions, 'utf8');
await writeFile(path.join(dir, 'questions.md'), questions, 'utf8');

console.log(dir);
