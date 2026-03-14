# ChefFlow Prospecting Pipeline - n8n Workflows

Three n8n workflows that connect Google Maps scraping to Ollama personalization to Instantly.ai email delivery, with reply ingestion back into ChefFlow.

## Prerequisites

- n8n running on PC (Docker: `docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n`)
- ChefFlow dev server on `localhost:3100`
- Ollama running on `localhost:11434` with `qwen3:8b` loaded
- Instantly.ai account with warmed domains
- Environment variables in n8n:
  - `PROSPECTING_API_KEY` - matches `.env.local` value
  - `GOOGLE_MAPS_API_KEY` - Google Places API key (for workflow 01)
  - `INSTANTLY_API_KEY` - Instantly.ai API key (for workflow 02)

## Workflows

### 01 - Google Maps Lead Sourcer

Scrapes Google Maps for businesses matching a search query and location, deduplicates against existing ChefFlow prospects, and bulk imports new leads.

**Setup:**

1. Import `01-google-maps-lead-sourcer.json` into n8n
2. Edit the "Campaign Config" node with your search query and location
3. For richer data (emails, phones, social profiles), replace the Google Maps Search node with an Outscraper or Apify node

**Note:** The basic Google Places API returns name, address, rating, and coordinates. For emails and phone numbers, use Outscraper ($0.002/result) or Apify Google Maps Scraper (free tier available).

### 02 - Personalizer

Fetches uncontacted prospects from ChefFlow, generates personalized cold emails via local Ollama, saves drafts back to ChefFlow, and logs outreach events.

**Setup:**

1. Import `02-personalizer.json` into n8n
2. Edit the "Config" node with your chef name, title, and location
3. In production, add an Instantly.ai HTTP node between "Save Draft" and "Log Outreach" to actually send the email via Instantly

### 03 - Reply Handler

Receives Instantly.ai reply webhooks and forwards them to ChefFlow's webhook endpoint, which handles prospect matching, sentiment classification, pipeline updates, and auto-conversion of hot leads to inquiries.

**Setup:**

1. Import `03-reply-handler.json` into n8n
2. The webhook URL will be `http://your-n8n:5678/webhook/instantly-reply`
3. Configure this URL in Instantly.ai's webhook settings for reply events
4. If n8n is behind a tunnel (e.g., Cloudflare), use the tunnel URL

## ChefFlow Environment Variables

Add these to `.env.local`:

```
PROSPECTING_API_KEY=your-secret-key-here
PROSPECTING_TENANT_ID=your-chef-uuid-here
```

## Data Flow

```
Google Maps -> n8n (scrape + dedup) -> ChefFlow (import)
                                            |
ChefFlow (queue) -> n8n (Ollama personalize) -> Instantly.ai (send)
                                                      |
Instantly.ai (reply) -> n8n (relay) -> ChefFlow (match + classify + convert)
                                            |
                                     ChefFlow Inquiry (GOLDMINE scoring)
```
