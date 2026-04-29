---
name: youtube-watch
description: Watch, extract, verify, and apply YouTube video content. Use when the user gives a YouTube or youtu.be URL, asks Codex to watch a video, summarize a video, learn from a channel, extract tactics, turn a video into notes, compare video claims, or optimize a workflow from YouTube content.
---

# YouTube Watch

## Overview

Convert YouTube videos into grounded, useful work products. Prefer transcript and metadata extraction first, inspect visuals when the task depends on what appears on screen, and never imply certainty beyond the source coverage actually reviewed.

## Workflow

1. Capture the user's goal in one sentence. If the goal is vague, default to an actionable brief with summary, key claims, tactics, risks, and next steps.
2. Capture source identity before analysis:
   - URL
   - title
   - channel
   - publish date when available
   - duration when available
   - transcript source, captions, auto captions, manual notes, or visual inspection
3. Get text coverage first:
   - Use browser, web search, available transcript tools, or `yt-dlp` if installed.
   - Prefer manual captions over auto captions.
   - Preserve timestamps whenever available.
   - If no transcript is available, say so and choose the safest fallback for the task.
4. Inspect visuals by default for knowledge videos:
   - Required for UI walkthroughs, code demos, charts, product reviews, cooking technique, physical setup, body language, slide content, screenshots, screen recordings, or anything where the transcript is insufficient.
   - For slide decks, conference talks, code demos, and screen recordings, capture screenshots or frame samples at the linked timestamp, major topic transitions, and any moment the transcript references a visible artifact.
   - Treat "screenshots of screenshots" as a first-class learning surface: if the video shows a slide, diagram, terminal, code editor, browser, chart, product UI, or pasted screenshot, extract a frame and read the visible content.
   - Use screenshots, frame samples, OCR, or browser playback observations when available.
   - Do not infer visual facts from transcript-only coverage.
5. Verify claims when stakes justify it:
   - Browse current primary sources for legal, medical, financial, pricing, product, software, or news claims.
   - Mark unverified claims clearly.
   - Prefer primary sources over blogs or summaries.
6. Produce the optimized output for the user's goal:
   - Executive brief: conclusion first, then evidence.
   - Learning notes: concepts, examples, counterexamples, and retention prompts.
   - Software lecture mode: design concept, shared language, feedback loop, deep module lesson, failure mode, ChefFlow adoption action, and grill-me questions.
   - App optimization mode: translate the video into ChefFlow architecture, product, workflow, skill, and validation opportunities.
   - Tactical extraction: steps, inputs, tools, costs, risks, and effort.
   - Implementation plan: ordered tasks, dependencies, files or systems likely affected, and validation.
   - Critique: strong claims, weak claims, missing evidence, incentives, and failure modes.

## Software Lecture Mode

Use this mode for engineering talks, AI coding lectures, architecture walkthroughs, and this Matt Pocock lecture. Combine it with `software-fundamentals` when the video discusses shared understanding, ubiquitous language, feedback loops, TDD, module design, AI-assisted coding, or human versus agent responsibilities.

For each major lesson, capture:

- Timestamp or section.
- Concept in the speaker's terms.
- Visual evidence: slide, diagram, terminal, editor, UI, screenshot, or none.
- Source confidence: manual captions, auto captions, sampled frames, OCR, browser playback, or missing coverage.
- ChefFlow adoption action: the smallest skill, process, test, or module change implied by the lesson.
- Grill-me prompt: one question that would expose ambiguity before coding.
- Feedback loop: the fastest check that would prove the adoption worked.

When the user wants to keep learning from a specific video, create or update a lecture learning ledger outside the skill body. Store durable notes under `system/video-learning/` unless the user asks for a different location.

## Visual Evidence Index

For visual or slide-heavy videos, include a compact index:

```markdown
Visual evidence:

- [timestamp] Type: [slide | code | terminal | UI | diagram | screenshot | chart]
  Visible text or object: [short paraphrase or tiny quote]
  Why it matters: [concept or action it supports]
  Confidence: [sampled frame | OCR | browser playback | transcript-only gap]
```

If OCR is available, use it to read slide and screenshot text. If OCR is unavailable, inspect the frame directly and label the evidence as visual observation.

## Referenced Assets

When a video mentions GitHub repos, papers, books, CLIs, models, libraries, products, or docs:

1. Extract the asset name and timestamp.
2. Prefer official or primary URLs when browsing is needed.
3. Classify the safe next action: read, vendor, install, ignore, or verify first.
4. Do not install packages, clone repos, or download large media unless the user asked for that action or it is necessary and safe.

## ChefFlow Optimization Mode

When the user says a YouTube video should optimize the app:

1. Extract the video's principles with transcript confidence and visual evidence.
2. Map each principle to ChefFlow surfaces: app architecture, Remy, skills, build queue, UI workflow, data model, tests, or documentation.
3. Separate safe skill/process adoption from risky app refactors.
4. For app refactors, create bounded drills or specs rather than changing broad production code directly.
5. Use `software-fundamentals` to identify shared design concept, ubiquitous language, deep module boundary, fastest feedback loop, and design investment.
6. Update the video ledger under `system/video-learning/` when the same video remains an ongoing learning source.

Default to a full operating packet for ChefFlow videos unless the user asks for a short summary. Include source evidence, visual evidence, principles, ChefFlow optimization map, safe-now changes, needs-spec changes, and queue entries.

## Extraction Commands

Use commands only when they fit the environment and the user has provided a public URL. Keep downloaded files in a temporary task folder, not the repo, unless the user asks to keep artifacts.

Metadata:

```powershell
yt-dlp --skip-download --dump-json "<url>"
```

Captions without video download:

```powershell
yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "en.*,en" --sub-format vtt "<url>"
```

Frame sampling for visual evidence:

```powershell
$dir = Join-Path $env:TEMP "codex-youtube-frames"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "$dir/video.%(ext)s" "<url>"
ffmpeg -ss 00:05:30 -i (Get-ChildItem $dir -Filter "video.*" | Select-Object -First 1).FullName -frames:v 1 "$dir/frame-00-05-30.jpg"
```

Use frame extraction selectively. Prefer the linked timestamp, section starts, and transcript moments where the speaker points to a slide, diagram, code, interface, or screenshot. Keep extracted frames in a temporary task folder unless the user asks to preserve artifacts.

When `yt-dlp` is unavailable, use browser-accessible transcript, page metadata, web search snippets, or ask the user for a transcript. Do not install tools or download large media unless the user approves that approach.

## Guardrails

- Do not reproduce long transcript passages. Quote only short excerpts needed for evidence.
- Do not say "I watched the video" unless video or visual playback was actually inspected. Say "I reviewed the transcript" or "I reviewed sampled frames" when that is the true coverage.
- Do not skip visual inspection for slide-heavy or screen-heavy videos just because a transcript exists.
- Do not treat auto captions as exact. Flag likely transcription uncertainty around names, numbers, commands, and technical terms.
- Do not generate recipes from cooking videos for ChefFlow work. Extract operations, technique observations, sourcing ideas, equipment notes, or safety considerations only.
- Do not create fake timestamps. If timestamps are missing, use section labels instead.
- Do not silently skip unavailable video content. State what could not be accessed and how that limits the answer.

## Output Contract

Default to this compact structure unless the user asks for a different format:

```markdown
Source: [title], [channel], [date if known], [duration if known]
Coverage: [manual captions | auto captions | transcript | visuals | sampled frames | unavailable]

Bottom line:
[1-3 sentences]

Key points:

- [timestamp if available] Point plus why it matters

Actionable takeaways:

- [specific action, expected benefit, risk or dependency]

Verification:

- [claim checked or not checked, source if checked]

Visual evidence:

- [timestamp] [slide/code/UI/diagram/screenshot observed, or "not inspected" with reason]

Software lecture adoption:

- Design concept: [shared model or ambiguity]
- Ubiquitous language: [terms to reuse]
- Deep module lesson: [interface and hidden complexity]
- Feedback loop: [fastest meaningful check]
- Grill-me prompt: [question to resolve before coding]
- ChefFlow adoption action: [specific skill, process, test, or module change]

ChefFlow optimization:

- App surface: [architecture | Remy | skills | queue | UI | data | tests | docs]
- Safe now: [skill/process/doc change]
- Needs spec: [app refactor or risky implementation]
- Module shape: [shallow grid to avoid | deep boundary to move toward]

Referenced assets:

- [timestamp] [repo/tool/paper/book/doc] [read/vendor/install/verify/ignore]

Open questions:

- [only include real gaps]
```
