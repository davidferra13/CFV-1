# Page X-Ray: Data Schemas

Machine-readable structures for scan records, findings, index entries, and answer classification.

All data stored as JSON files in `docs/xrays/`. No database required.

---

## Scan Record Schema

Stored at `docs/xrays/pages/{route-slug}.json`.

```json
{
  "route": "/events/[id]",
  "route_slug": "events-id",
  "page_file_path": "app/(chef)/events/[id]/page.tsx",
  "route_group": "(chef)",
  "domain_owner": "events",
  "secondary_domains": ["clients", "menus", "finance"],
  "portal_surface": "chef",
  "scan_count": 3,
  "first_scanned_at": "2026-05-18T14:30:00Z",
  "last_scanned_at": "2026-05-20T09:15:00Z",
  "last_scanned_by": "opus-4.6",
  "scan_mode": "full",
  "previous_scan_hash": "abc123",
  "current_scan_hash": "def456",
  "questions_answered": 1060,
  "na_count": 142,
  "user_visible_recommendations": 28,
  "system_only_findings": 15,
  "rail_visible_findings": 19,
  "build_opportunities_count": 34,
  "findings": {
    "new": 8,
    "open": 14,
    "resolved": 31,
    "total_lifetime": 53,
    "wont_fix": 2,
    "superseded": 1,
    "needs_human_decision": 3
  },
  "scores": {
    "cohesion": 0.72,
    "rail_readiness": 0.65,
    "domain_wiring": 0.88,
    "security": 0.91,
    "role_clarity": 0.8,
    "data_completeness": 0.7,
    "page_usefulness": 0.85
  },
  "score_history": [
    {
      "scan_number": 1,
      "date": "2026-05-18T14:30:00Z",
      "cohesion": 0.31
    },
    {
      "scan_number": 2,
      "date": "2026-05-19T10:00:00Z",
      "cohesion": 0.55
    },
    {
      "scan_number": 3,
      "date": "2026-05-20T09:15:00Z",
      "cohesion": 0.72
    }
  ],
  "scans": [
    {
      "scan_number": 1,
      "date": "2026-05-18T14:30:00Z",
      "mode": "full",
      "model": "opus-4.6",
      "findings_created": 45,
      "findings_resolved": 0,
      "hash": "abc123"
    }
  ]
}
```

---

## Finding Schema

Individual findings stored in `docs/xrays/findings/findings.json` as an array.

```json
{
  "id": "events-id-S3-F017",
  "route": "/events/[id]",
  "route_slug": "events-id",
  "domain": "events",
  "category": "domain-wiring",
  "dimension": 0,
  "dimension_name": "Page Identity + Domain Wiring",
  "severity": "high",
  "status": "open",
  "model_tier": "BOTH",
  "source_question_id": 14,
  "source_question": "Is the page reaching around a domain layer?",
  "first_seen_scan": 1,
  "last_seen_scan": 3,
  "first_seen_date": "2026-05-18T14:30:00Z",
  "last_seen_date": "2026-05-20T09:15:00Z",
  "explanation": "Page imports directly from lib/events/internal/helpers.ts instead of using the events domain barrel export at lib/events/index.ts.",
  "recommended_fix": "Refactor import to use lib/events barrel export. If needed function is not exported, add it to the domain interface.",
  "rail_implication": "None directly, but domain coupling makes Rail resolver harder to wire.",
  "build_implication": "Small refactor task. Codex-dispatchable.",
  "security_implication": "None.",
  "files_involved": [
    "app/(chef)/events/[id]/page.tsx",
    "lib/events/index.ts",
    "lib/events/internal/helpers.ts"
  ],
  "codex_buildable": true,
  "requires_human_decision": false,
  "resolution_note": null,
  "resolved_at": null,
  "resolved_by": null
}
```

### Finding Statuses

| Status                                | Meaning                                     | Transitions To                                      |
| ------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `new`                                 | First discovered this scan                  | `open`, `resolved`, `wont_fix`                      |
| `seen_before`                         | Matches a finding from a prior scan         | `open`                                              |
| `open`                                | Confirmed across multiple scans, unresolved | `in_progress`, `resolved`, `wont_fix`, `superseded` |
| `in_progress`                         | Someone is actively working on it           | `resolved`, `open` (if fix fails)                   |
| `resolved`                            | Fixed and confirmed by subsequent scan      | (terminal)                                          |
| `wont_fix`                            | Deliberate decision to not fix              | (terminal, can reopen to `open`)                    |
| `superseded`                          | Replaced by a different finding or approach | (terminal)                                          |
| `needs_human_decision`                | Cannot be fixed without product input       | `open`, `wont_fix`, `resolved`                      |
| `blocked_by_missing_domain`           | Fix requires domain work first              | `open` (when unblocked)                             |
| `blocked_by_missing_data`             | Fix requires data/schema work first         | `open` (when unblocked)                             |
| `blocked_by_missing_ui`               | Fix requires UI component first             | `open` (when unblocked)                             |
| `blocked_by_permissions`              | Fix requires permission system change       | `open` (when unblocked)                             |
| `blocked_by_unclear_product_decision` | Blocked on business logic question          | `needs_human_decision`                              |

### Severity Levels

| Severity   | Meaning                                                     | Examples                                                                    |
| ---------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `critical` | Data loss, security breach, role leakage, broken production | Cross-tenant data leak, missing auth gate, public exposure of internal page |
| `high`     | Feature broken, user blocked, wrong data displayed          | Dead end, stale data shown as current, missing empty state that shows $0    |
| `medium`   | Feature incomplete, poor UX, missing wiring                 | Unwired resolver, missing Rail card, no loading state                       |
| `low`      | Polish, optimization, nice-to-have                          | Inconsistent icon, suboptimal query, missing keyboard shortcut              |
| `info`     | Observation, context, future consideration                  | Competitive insight, strategic opportunity, architecture note               |

---

## Index Schema

Stored at `docs/xrays/index.json`.

```json
{
  "last_updated": "2026-05-20T09:15:00Z",
  "stats": {
    "total_pages_known": 663,
    "total_pages_scanned": 47,
    "total_pages_never_scanned": 616,
    "total_findings_open": 312,
    "total_findings_resolved": 189,
    "total_findings_lifetime": 534,
    "total_build_opportunities_open": 276,
    "total_build_opportunities_dispatched": 12,
    "total_build_opportunities_completed": 8,
    "total_rail_profiles_exist": 23,
    "total_rail_profiles_missing": 640,
    "domains_scanned": 8,
    "domains_total": 90,
    "overall_cohesion_score": 0.41,
    "last_full_batch_scan": null
  },
  "pages": {
    "events-id": {
      "route": "/events/[id]",
      "domain": "events",
      "portal": "chef",
      "scan_count": 3,
      "last_scanned": "2026-05-20T09:15:00Z",
      "findings_open": 14,
      "cohesion": 0.72,
      "rail_readiness": 0.65,
      "status": "active"
    }
  }
}
```

---

## Build Opportunity Schema

```json
{
  "id": "BO-events-id-012",
  "route": "/events/[id]",
  "route_slug": "events-id",
  "domain": "events",
  "category": "rail-resolver",
  "description": "Create readiness resolver for event detail page. Should aggregate: menu completeness, guest confirmations, contract status, payment status, prep checklist.",
  "tier": "CODEX",
  "severity": "medium",
  "effort": "medium",
  "files_involved": [
    "lib/discovery/resolvers/events-readiness.ts",
    "lib/discovery/rail-profiles.ts"
  ],
  "spec_reference": "docs/specs/contextual-rail-research.md",
  "dependencies": ["BO-events-id-010"],
  "status": "open",
  "created_scan": 2,
  "created_date": "2026-05-19T10:00:00Z",
  "dispatched_to": null,
  "completed_at": null,
  "queue_ready_note": "Read docs/specs/contextual-rail-research.md for resolver pattern. Create lib/discovery/resolvers/events-readiness.ts. Must return CompletionResult with recursive dependency resolution (Event->Menu->Recipe->Ingredient). Register in rail-profiles.ts for /events/[id] route. Test: resolver returns valid scores for event with and without menu."
}
```

---

## Answer Classification Reference

### 15 Answer Classes

| #   | Class                      | Code                         | Meaning                                         | Rail Impact                        | Build Impact      |
| --- | -------------------------- | ---------------------------- | ----------------------------------------------- | ---------------------------------- | ----------------- |
| 1   | Exists, Wired              | `EXISTS_WIRED`               | Data/behavior exists and is correctly connected | May already be in Rail             | Maintenance only  |
| 2   | Exists, Unwired            | `EXISTS_UNWIRED`             | Exists somewhere but not connected to this page | Should be wired to Rail            | Wiring task       |
| 3   | Missing                    | `MISSING`                    | Should exist but does not                       | Cannot be in Rail                  | Build task        |
| 4   | Not Applicable             | `NOT_APPLICABLE`             | Question doesn't apply to this page             | Exclude from Rail                  | None              |
| 5   | System Only                | `SYSTEM_ONLY`                | Known by system, not shown to user              | May inform Rail logic, not display | Logic task        |
| 6   | User Visible               | `USER_VISIBLE`               | Should be surfaced in UI                        | Consider for Rail                  | UI task           |
| 7   | Rail Visible               | `RAIL_VISIBLE`               | Should appear in contextual Rail                | Direct Rail item                   | Resolver task     |
| 8   | Role Gated                 | `ROLE_GATED`                 | Must only appear for specific roles             | Conditional Rail                   | Permission task   |
| 9   | Density Gated              | `DENSITY_GATED`              | Appears only when context requires it           | Conditional Rail                   | Logic task        |
| 10  | Future Build Signal        | `FUTURE_BUILD_SIGNAL`        | Should become a future build                    | May unlock Rail items              | Spec + build      |
| 11  | Requires Resolver          | `REQUIRES_RESOLVER`          | Needs a resolver to appear in Rail              | Blocked until resolver exists      | Resolver build    |
| 12  | Requires Schema            | `REQUIRES_SCHEMA`            | Needs database/schema support                   | Blocked until schema exists        | Migration + build |
| 13  | Requires UI                | `REQUIRES_UI`                | Data exists but needs a surface                 | Blocked until UI exists            | UI build          |
| 14  | Requires Action            | `REQUIRES_ACTION`            | Data exists but needs action/button/workflow    | May need Rail action               | Action build      |
| 15  | Requires Permission Review | `REQUIRES_PERMISSION_REVIEW` | Potentially sensitive, needs permission audit   | Hold until reviewed                | Security review   |

### Per-Answer Metadata

Every non-N/A answer MUST include:

```json
{
  "question_id": 14,
  "answer_class": "EXISTS_UNWIRED",
  "home": "lib/events/internal/helpers.ts",
  "property": "getEventReadiness()",
  "source": "computed",
  "freshness_rule": "per-request",
  "visibility_rule": "always",
  "role_rule": ["chef", "admin"],
  "wiring_path": "lib/events/index.ts -> page.tsx -> Rail resolver",
  "rail_implication": "Should feed READINESS category once wired",
  "developer_note": "Function exists but is not exported from domain barrel. Add to exports, then wire to resolver.",
  "build_opportunity": "BO-events-id-003"
}
```

---

## Score Computation

All scores 0.0 to 1.0.

### Cohesion Score (weighted average)

```
cohesion = (
  domain_wiring * 0.20 +
  security * 0.20 +
  role_clarity * 0.15 +
  rail_readiness * 0.15 +
  data_completeness * 0.15 +
  page_usefulness * 0.15
)
```

### Domain Wiring Score

```
Inputs: Dimension 0 + 17 answers
- Domain owner identified: +0.10
- No boundary violations: +0.20
- All imports through barrel: +0.15
- Correct route group: +0.10
- Correct URL structure: +0.10
- Surface grammar declared: +0.10
- No orphan status: +0.10
- Domain-consistent UI patterns: +0.15
```

### Security Score

```
Inputs: Dimension 9 + 15 answers
- Auth gate present: +0.20
- Tenant scoping in all queries: +0.20
- Input validation on all actions: +0.15
- No XSS vectors: +0.15
- No role leakage: +0.15
- No PII overexposure: +0.10
- Destructive actions confirmation-gated: +0.05
```

### Rail Readiness Score

```
Inputs: Dimension 11 + 22 answers
- Rail Profile exists: +0.20
- Categories assigned: +0.15
- Resolvers wired: +0.20
- Entity scoping configured: +0.10
- Quick actions defined: +0.10
- Collapsed metrics defined: +0.10
- No resolver gaps: +0.15
```

### Role Clarity Score

```
Inputs: Dimension 9 answers
- Each UI element has defined role visibility: per-element score
- No role leakage detected: +0.20
- Role-based empty/error states: +0.10
- Pro features marked: +0.10
- Delegation scenarios handled: +0.10
```

### Data Completeness Score

```
Inputs: Dimension 12 + 13 answers
- All expected data loaded: per-field score
- No stubs or fake values: +0.15
- All empty states handled: +0.10
- All error states handled: +0.10
- All loading states present: +0.10
- No N+1 queries: +0.05
- No data waterfalls: +0.05
```

### Page Usefulness Score

```
Inputs: Dimension 19 + 20 + Meta answers (judgment-based)
- Justifies existence: +0.20
- Saves user time: +0.15
- Reduces manual work: +0.15
- Professional feeling: +0.10
- Clear primary action: +0.10
- Not a dead end: +0.10
- Contributes to stickiness: +0.10
- Chef would show to client: +0.10
```

---

## Route Slug Convention

| Route                       | Slug                     |
| --------------------------- | ------------------------ |
| `/events/[id]`              | `events-id`              |
| `/events/[id]/edit`         | `events-id-edit`         |
| `/clients/[id]/preferences` | `clients-id-preferences` |
| `/cannabis/hub`             | `cannabis-hub`           |
| `/dashboard`                | `dashboard`              |
| `/menus`                    | `menus`                  |
| `/settings/billing`         | `settings-billing`       |
| `/` (public home)           | `public-home`            |
| `/portal/[token]`           | `portal-token`           |

Rule: lowercase, replace `/` with `-`, remove `[` and `]`, prefix with route group if ambiguous (e.g., `public-` for `(public)` routes that share a path with `(chef)` routes).
