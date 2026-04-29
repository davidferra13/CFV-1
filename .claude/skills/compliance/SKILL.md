---
name: compliance
description: Run compliance scan. Use when checking em dashes, OpenClaw in UI, ts-nocheck exports, invalid server exports, or quick ChefFlow rule violations.
user-invocable: true
---

# Compliance Scan

Run the existing compliance scanner and report violations.

```bash
bash scripts/compliance-scan.sh
```

Summarize: total violations by category, top offending files. If clean, say "all clear" and stop. Keep under 150 words.
