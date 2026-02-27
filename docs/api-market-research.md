# API Market Research — ChefFlow V1

> Generated Feb 2026. Comprehensive scan of free + paid APIs across 25+ categories.
> Use this as a reference when deciding what to add next.

---

## What We Already Have (24 APIs)

| #   | API                       | Category           | Key?         |
| --- | ------------------------- | ------------------ | ------------ |
| 1   | Open-Meteo                | Weather            | No key       |
| 2   | Nager.Date                | Holidays           | No key       |
| 3   | Frankfurter               | Currency           | No key       |
| 4   | IP-API                    | Geolocation        | No key       |
| 5   | reSmush.it                | Image compression  | No key       |
| 6   | QR Code (goqr.me)         | QR generation      | No key       |
| 7   | LibreTranslate            | Translation        | No key       |
| 8   | Email Validator           | Email validation   | No key       |
| 9   | URL Shortener (ulvis.net) | Links              | No key       |
| 10  | TheCocktailDB             | Cocktail recipes   | No key       |
| 11  | Open Food Facts           | Food/barcode data  | No key       |
| 12  | REST Countries            | Country data       | No key       |
| 13  | Spoonacular Wine          | Wine pairing       | Existing key |
| 14  | USDA                      | Nutrition          | API key      |
| 15  | Geocodio                  | Geocoding          | API key      |
| 16  | API Ninjas                | Sales tax          | API key      |
| 17  | Unsplash                  | Stock photos       | API key      |
| 18  | Pexels                    | Stock photos       | API key      |
| 19  | Sentry                    | Error tracking     | DSN          |
| 20  | PostHog                   | Analytics          | API key      |
| 21  | Cloudinary                | Image CDN          | Cloud name   |
| 22  | Mapbox                    | Maps               | Token        |
| 23  | Upstash                   | Redis cache        | URL + Token  |
| 24  | OneSignal                 | Push notifications | App ID + Key |

---

## Top Free APIs We Should Consider Adding

### Tier 1 — High Impact, No Card

| API                      | What It Does                  | Free Tier               | Why                                     |
| ------------------------ | ----------------------------- | ----------------------- | --------------------------------------- |
| **Cloudflare Turnstile** | Invisible CAPTCHA             | Unlimited, free         | Protect inquiry forms from bots         |
| **OCR.space**            | Receipt/document scanning     | 500 req/day             | Expense receipt scanning                |
| **Groq**                 | Ultra-fast LLM inference      | 14,400 req/day          | Fast classification when Ollama is slow |
| **Inngest**              | Background job engine         | 25K runs/month          | Scheduled tasks, async processing       |
| **Trigger.dev**          | Background jobs for Next.js   | 50K runs/month          | Alternative to Inngest                  |
| **Edamam**               | Nutrition + allergen data     | 10K calls/month         | Complement to USDA + Spoonacular        |
| **Meilisearch**          | Self-hosted instant search    | Unlimited (self-hosted) | Recipe/client/event search              |
| **Umami**                | Privacy-focused web analytics | 100K events/month       | GDPR-compliant alternative to PostHog   |
| **DeepL API Free**       | High-quality translation      | 500K chars/month        | Better than LibreTranslate quality      |
| **Puppeteer/PDFKit**     | PDF generation                | Free (library)          | Invoices, quotes, menus as PDF          |

### Tier 2 — Worth Watching

| API                       | What It Does                | Free Tier               | Why                                 |
| ------------------------- | --------------------------- | ----------------------- | ----------------------------------- |
| **Cloudflare R2**         | Object storage, zero egress | 10 GB free              | Cheaper than Supabase Storage       |
| **Cal.com**               | Open-source scheduling      | Free self-hosted        | Client consultation booking         |
| **Knock / Novu**          | Notification infrastructure | 10K notifications/month | Unified multi-channel notifications |
| **Whisper (self-hosted)** | Speech-to-text              | Free                    | Voice notes from chefs              |
| **GrowthBook**            | Feature flags + A/B testing | Free self-hosted        | Experimentation                     |

---

## Top Paid APIs Worth Paying For (When Revenue Justifies)

### Tier 1 — Add When Revenue Hits $1K/month

| API                     | What It Does      | Starting Price     | Why                                    |
| ----------------------- | ----------------- | ------------------ | -------------------------------------- |
| **Twilio / Plivo**      | SMS notifications | $0.005-0.008/SMS   | Event reminders, booking confirmations |
| **DocuSign / PandaDoc** | E-signatures      | $50/month          | Catering contracts, event agreements   |
| **Inngest**             | Background jobs   | Free → usage-based | Async invoice generation, reminders    |

### Tier 2 — Add When Revenue Hits $5K/month

| API                | What It Does       | Starting Price         | Why                                           |
| ------------------ | ------------------ | ---------------------- | --------------------------------------------- |
| **QuickBooks API** | Accounting sync    | Included with QB sub   | Sync invoices/payments to chef's books        |
| **Nylas**          | Calendar sync      | $10/month + $1/account | Two-way Google/Outlook calendar sync          |
| **Square**         | In-person payments | 2.6% + $0.10           | Accept cards at catering events               |
| **Algolia**        | Hosted search      | Free → usage-based     | If search volume exceeds self-hosted capacity |

### Tier 3 — Enterprise Scale

| API              | What It Does          | Starting Price      | Why                                  |
| ---------------- | --------------------- | ------------------- | ------------------------------------ |
| **Intercom**     | Customer support + AI | $29/seat/month      | AI-powered chef support              |
| **LaunchDarkly** | Feature flags         | Free → $20/seat     | Controlled feature rollouts          |
| **Datadog**      | Full observability    | $15/host/month      | When Sentry isn't enough             |
| **Mux**          | Video streaming       | $0.032/min encoding | Chef portfolio videos, cooking demos |

---

## APIs NOT Recommended

| API                 | Why Not                                           |
| ------------------- | ------------------------------------------------- |
| OpenAI / Claude API | Privacy architecture — PII stays local via Ollama |
| Salesforce          | Overkill and expensive for current scale          |
| Adyen               | Enterprise pricing, overkill                      |
| MongoDB Atlas       | Already using PostgreSQL/Supabase                 |
| PlanetScale         | MySQL-only, ChefFlow uses Postgres                |

---

_This document is a snapshot. Update when new services launch or pricing changes._
