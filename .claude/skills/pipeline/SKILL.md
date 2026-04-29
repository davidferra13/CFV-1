---
name: pipeline
description: OpenClaw pricing pipeline status. Use when the user asks about pricing pipeline coverage, freshness, targets, actuals, sync health, or ingredient price data progress.
user-invocable: true
---

# Pipeline Audit

Run the existing pipeline audit script and summarize results.

```bash
node scripts/pipeline-audit.mjs
```

Summarize output in a scannable table. Flag anything below target. Keep under 200 words.
