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
   - Tactical extraction: steps, inputs, tools, costs, risks, and effort.
   - Implementation plan: ordered tasks, dependencies, files or systems likely affected, and validation.
   - Critique: strong claims, weak claims, missing evidence, incentives, and failure modes.

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

Open questions:

- [only include real gaps]
```
