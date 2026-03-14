# Prospecting Pipeline - Automated Lead Generation

ChefFlow's automated prospecting system connects Google Maps scraping (via n8n) to Ollama-powered email personalization to Instantly.ai email delivery, with reply ingestion back into the ChefFlow inquiry pipeline.

## Architecture

```
PC (10.0.0.153)
├── ChefFlow Dev (port 3100) - API endpoints for prospect CRUD
├── ChefFlow Beta (port 3200) - Production preview
├── Ollama (port 11434) - Email personalization (data stays local)
└── n8n (port 5678) - Workflow orchestration (Docker)
```

External:

- Instantly.ai - Email delivery, warmup, rotation, deliverability
- Google Maps API / Outscraper - Lead sourcing

## Data Flow

```
SOURCING                    PERSONALIZATION              DELIVERY
────────                    ───────────────              ────────

Google Maps ─┐
Outscraper  ─┤  n8n          Ollama (PC)                 Instantly.ai
Directories ─┤  ┌────────┐   ┌─────────────┐            ┌──────────────┐
Manual CSV ──┘  │ Scrape  │→  │ Personalize │→  Push  →  │ Send emails  │
                │ Dedup   │   │ (qwen3:8b)  │   leads    │ 6 accounts   │
                │ Score   │   │ Local only  │            │ 3 domains    │
                └────────┘   └─────────────┘            └──────┬───────┘
                     │                                          │
                     │ Import API                    Reply webhook
                     ▼                                          │
                ChefFlow ──────────────────────────────────────┘
                ├── Prospects table (50+ fields, lead scoring)
                ├── Pipeline (new → contacted → responded → converted)
                ├── Outreach log (every email, call, reply)
                └── Auto-convert hot replies → Inquiries (GOLDMINE scoring)
```

## API Endpoints

All endpoints authenticate via `X-Prospecting-Key` header or `Bearer cf_live_*` API key.

| Method | Endpoint                             | Purpose                     |
| ------ | ------------------------------------ | --------------------------- |
| POST   | `/api/prospecting/check-dups`        | Dedup check before import   |
| POST   | `/api/prospecting/import`            | Bulk import scraped leads   |
| GET    | `/api/prospecting/queue`             | Fetch uncontacted prospects |
| GET    | `/api/prospecting/by-email`          | Lookup prospect by email    |
| PATCH  | `/api/prospecting/[id]/draft-email`  | Save personalized draft     |
| POST   | `/api/prospecting/[id]/log-outreach` | Log outreach events         |
| POST   | `/api/prospecting/[id]/convert`      | Convert prospect to inquiry |
| POST   | `/api/prospecting/webhook/reply`     | Instantly reply webhook     |

## Environment Variables

```env
# .env.local
PROSPECTING_API_KEY=your-secret-key-here
PROSPECTING_TENANT_ID=your-chef-uuid-here
```

## n8n Workflows

Stored in `scripts/n8n/` for version control:

1. `01-google-maps-lead-sourcer.json` - Scrape, dedup, import
2. `02-personalizer.json` - Fetch queue, Ollama personalize, push to Instantly
3. `03-reply-handler.json` - Relay Instantly reply webhooks to ChefFlow

## Database Schema

### outreach_campaigns table

Tracks Instantly.ai campaigns linked to ChefFlow.

| Column                | Type | Purpose                               |
| --------------------- | ---- | ------------------------------------- |
| instantly_campaign_id | text | Instantly's campaign ID               |
| name                  | text | Campaign name                         |
| status                | text | draft/warming/active/paused/completed |
| leads_count           | int  | Total leads in campaign               |
| sent_count            | int  | Emails sent                           |
| open_count            | int  | Emails opened                         |
| reply_count           | int  | Replies received                      |
| bounce_count          | int  | Bounces                               |
| meeting_count         | int  | Meetings booked                       |
| converted_count       | int  | Converted to inquiries                |

### prospects table extensions

| Column               | Type        | Purpose                           |
| -------------------- | ----------- | --------------------------------- |
| outreach_campaign_id | uuid        | FK to outreach_campaigns          |
| instantly_lead_id    | text        | Instantly's lead ID               |
| email_sent_at        | timestamptz | When cold email was sent          |
| email_opened_at      | timestamptz | When email was opened             |
| reply_received_at    | timestamptz | When reply was received           |
| reply_sentiment      | text        | interested/not_interested/unknown |
| reply_text           | text        | Full reply text                   |

## Cost

| Item                 | Monthly  | Notes                         |
| -------------------- | -------- | ----------------------------- |
| n8n                  | $0       | Self-hosted Docker            |
| Google Maps scraping | $0       | Open source tools             |
| Ollama               | $0       | Already running               |
| Instantly.ai         | ~$30     | Unlimited accounts            |
| 3 domains            | ~$2.50   | ~$10/yr each                  |
| Email hosting        | $0-21    | Zoho free or Google Workspace |
| **Total**            | **~$33** |                               |

## Auto-Conversion Logic

When Instantly fires a reply webhook:

1. ChefFlow matches reply email to prospect record
2. Classifies sentiment (interested/not_interested/unknown)
3. Updates pipeline stage (responded or lost)
4. If interested AND lead_score >= 60: auto-converts to inquiry
5. Inquiry gets channel = 'outbound_prospecting' and GOLDMINE scoring
6. Chef gets notification about hot inbound from cold outreach

## Legal Compliance

- CAN-SPAM (US): Opt-out model, physical address required, honest subject lines, honor unsubscribe within 10 days
- Never send from primary domain (cheflowhq.com)
- Always include unsubscribe link (Instantly handles this)
- Max 30-50 emails/day/inbox
- 2-3 week warmup before first campaign
