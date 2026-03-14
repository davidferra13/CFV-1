                                                                                                                    # OPENCLAW MISSION: ChefFlow Prospecting Lead Scraper

                                                                                                                    ## What You Are Building

                                                                                                                    A systematic internet-wide lead discovery pipeline that finds every private chef, personal chef, and small catering business in the United States who could become a ChefFlow user. You will scrape, search, extract, verify, and compile these leads into email-ready lists posted to `#openclaw-leads`.

                                                                                                                    ## Why This Matters

                                                                                                                    ChefFlow is preparing for launch. We need a pre-built database of thousands of verified leads (name + email + location + business type) ready to receive cold outreach the day we flip the switch. Every lead you find now is a potential paying customer later. Speed and volume matter, but accuracy matters more. One bad email = spam complaint = domain reputation damage.

                                                                                                                    ## Your Constraints

                                                                                                                    - You run on the Pi. You have `web_search` and `web_fetch`. Use them.
                                                                                                                    - ALWAYS use `web_search` with keywords. NEVER guess URLs or fabricate links.
                                                                                                                    - When you find a real URL from search results, THEN use `web_fetch` to scrape it.
                                                                                                                    - Post all findings to `#openclaw-leads` in structured format.
                                                                                                                    - Keep a running tally of total leads found (cumulative across all runs).

                                                                                                                    ### CRITICAL: Search Budget Conservation

                                                                                                                    **Serper has 2,500 LIFETIME searches (not monthly). Every `web_search` call costs 1 search. Budget wisely.**

                                                                                                                    Rules:
                                                                                                                    1. **Batch queries with OR operators** to combine related searches into one call. Example: `"private chef" OR "personal chef" site:yelp.com` instead of two separate Yelp searches.
                                                                                                                    2. **Never repeat a search you already ran.** Keep a log of completed queries per session.
                                                                                                                    3. **Prioritize high-yield sources first.** If a directory gives 50 leads per search, hit it before a source that gives 2.
                                                                                                                    4. **Skip dead-end sources permanently.** If a query returns zero useful results, log it and never run it again.
                                                                                                                    5. **Use `web_fetch` freely** (500/month on Firecrawl, resets monthly). Once you find a real URL from search, scrape it without hesitation.
                                                                                                                    6. **Target: ~15-30 searches per run, max 2 runs per day.** That gives ~80-160 total runs before the budget is gone.
                                                                                                                    7. **Every search must have a purpose.** Don't search speculatively. Know what you expect to find before burning a query.

                                                                                                                    ## Target Personas (Who We Want)

                                                                                                                    | Priority | Type | Why They Need ChefFlow |
                                                                                                                    |----------|------|----------------------|
                                                                                                                    | 1 (highest) | Solo private chefs | They're overwhelmed doing ops alone. ChefFlow replaces their spreadsheets. |
                                                                                                                    | 2 | Personal chef businesses (1-3 people) | Small team, need client management, scheduling, invoicing. |
                                                                                                                    | 3 | Small catering companies (under 10 staff) | Event management, quotes, menu costing, client comms. |
                                                                                                                    | 4 | Meal prep services (solo/small) | Recipe management, client dietary tracking, scheduling. |
                                                                                                                    | 5 (lowest) | Private chef agencies/staffing | They place chefs. Less direct fit but high volume referral potential. |

                                                                                                                    ## DO NOT Target

                                                                                                                    - Large catering companies (50+ employees, enterprise software already)
                                                                                                                    - Restaurants, food trucks, ghost kitchens (different business model)
                                                                                                                    - Food bloggers, recipe creators, cooking influencers (not our market)
                                                                                                                    - Grocery delivery services

                                                                                                                    ## Search Strategy (Execute in This Order)

                                                                                                                    ### Phase 1: Directory Scraping (Highest ROI)

                                                                                                                    Search for and scrape these sources. For each, extract every chef/business listed with name, location, website, email if visible.

                                                                                                                    **Batched search queries (5 searches instead of 13):**
                                                                                                                    ```
                                                                                                                    BATCH 1 - Directories (Yelp + Thumbtack + Bark):
                                                                                                                    "private chef" OR "personal chef" site:yelp.com OR site:thumbtack.com OR site:bark.com

                                                                                                                    BATCH 2 - Smaller directories:
                                                                                                                    "private chef" OR "personal chef" site:takelessons.com OR site:gighive.com OR site:angi.com

                                                                                                                    BATCH 3 - Associations and directories:
                                                                                                                    "United States Personal Chef Association" OR "USPCA" OR "American Personal & Private Chef Association" OR "private chef directory"

                                                                                                                    BATCH 4 - Email harvesting (booking sites with contact info):
                                                                                                                    "private chef" OR "personal chef" "book now" OR "contact us" -restaurant -blog -recipe

                                                                                                                    BATCH 5 - Direct email patterns:
                                                                                                                    "private chef" OR "personal chef" "info@" OR "hello@" OR "book@" OR "gmail.com" OR "outlook.com"
                                                                                                                    ```

                                                                                                                    ### Phase 2: Social Media Discovery

                                                                                                                    **Batched social media queries (4 searches instead of ~22):**
                                                                                                                    ```
                                                                                                                    BATCH 6 - Instagram discovery:
                                                                                                                    site:instagram.com "private chef" OR "personal chef" OR #privatechef OR #personalchef

                                                                                                                    BATCH 7 - Instagram by city (split into 2 runs, 8 cities each):
                                                                                                                    Run A: site:instagram.com "private chef" OR "personal chef" NYC OR "Los Angeles" OR Miami OR Chicago OR Dallas OR Houston OR Atlanta OR "San Francisco"
                                                                                                                    Run B: site:instagram.com "private chef" OR "personal chef" Seattle OR Denver OR Boston OR "Washington DC" OR Nashville OR Austin OR Phoenix OR "Las Vegas"

                                                                                                                    BATCH 8 - Facebook + LinkedIn combined:
                                                                                                                    "private chef" OR "personal chef" site:facebook.com OR site:linkedin.com "book now" OR "self-employed" OR "owner"
                                                                                                                    ```

                                                                                                                    ### Phase 3: Google Maps / Business Listings

                                                                                                                    **Batched by region (5 searches instead of 200):**
                                                                                                                    ```
                                                                                                                    BATCH 9 - Northeast metros:
                                                                                                                    "private chef" OR "personal chef" "New York" OR "Boston" OR "Philadelphia" OR "Washington DC" OR "Pittsburgh" OR "Baltimore" OR "Hartford" OR "Providence"

                                                                                                                    BATCH 10 - Southeast metros:
                                                                                                                    "private chef" OR "personal chef" Miami OR Atlanta OR Charlotte OR Nashville OR "Tampa" OR Orlando OR Jacksonville OR "Raleigh"

                                                                                                                    BATCH 11 - Central metros:
                                                                                                                    "private chef" OR "personal chef" Chicago OR Dallas OR Houston OR "San Antonio" OR Austin OR Denver OR Minneapolis OR "Kansas City"

                                                                                                                    BATCH 12 - West Coast metros:
                                                                                                                    "private chef" OR "personal chef" "Los Angeles" OR "San Francisco" OR Seattle OR "San Diego" OR Portland OR "Las Vegas" OR Phoenix OR Sacramento
                                                                                                                    ```

                                                                                                                    After each batch, `web_fetch` the top results to scrape individual listings. Use Firecrawl freely (500/month, resets).

                                                                                                                    ### Phase 4: Industry-Specific Sources

                                                                                                                    **Batched (2 searches instead of 6):**
                                                                                                                    ```
                                                                                                                    BATCH 13 - Licensing and insurance:
                                                                                                                    "private chef" OR "personal chef" licensing OR insurance OR "food handler" OR "cottage food" directory OR list

                                                                                                                    BATCH 14 - Booking platforms:
                                                                                                                    "private chef" OR "personal chef" booking OR "hire" platform OR app OR service -restaurant -recipe -blog
                                                                                                                    ```

                                                                                                                    ### Phase 5: Competitor User Scraping

                                                                                                                    **Batched (2 searches instead of 6):**
                                                                                                                    ```
                                                                                                                    BATCH 15 - Review sites:
                                                                                                                    "private chef" OR "personal chef" software OR app site:g2.com OR site:capterra.com OR site:trustpilot.com

                                                                                                                    BATCH 16 - General competitor reviews:
                                                                                                                    "private chef software" OR "personal chef app" OR "hire a chef" reviews OR testimonials -recipe -blog
                                                                                                                    ```

                                                                                                                    These people already understand they need software. Highest conversion potential.

                                                                                                                    ### Search Budget Summary

                                                                                                                    | Phase | Old queries | Batched queries | Savings |
                                                                                                                    |-------|------------|----------------|---------|
                                                                                                                    | Phase 1: Directories | 13 | 5 | 62% |
                                                                                                                    | Phase 2: Social Media | ~22 | 4 | 82% |
                                                                                                                    | Phase 3: Google Maps | ~200 | 4 | 98% |
                                                                                                                    | Phase 4: Industry | 6 | 2 | 67% |
                                                                                                                    | Phase 5: Competitors | 6 | 2 | 67% |
                                                                                                                    | **TOTAL** | **~247** | **17** | **93%** |

                                                                                                                    **One full scraper run now uses ~17 searches instead of ~247.** At 2,500 lifetime, that's ~147 full runs instead of ~10.

                                                                                                                    ## Email Extraction Rules

                                                                                                                    For every lead, attempt to find their email in this order:

                                                                                                                    1. **Website contact page** - `web_fetch` their site, look for mailto: links or contact forms
                                                                                                                    2. **Social media bio** - Instagram/Facebook often has email in bio
                                                                                                                    3. **Google search** - `"[business name]" email OR contact OR "@"`
                                                                                                                    4. **Domain pattern** - If you know their domain, try common patterns: info@, hello@, contact@, [firstname]@

                                                                                                                    **Email quality tiers:**
                                                                                                                    - **Tier A (verified):** Found on their own website or confirmed public listing
                                                                                                                    - **Tier B (likely):** Found on social media bio or directory listing
                                                                                                                    - **Tier C (guessed):** Pattern-based guess from domain (needs verification later)

                                                                                                                    Only report Tier A and B. Flag Tier C separately for later Hunter.io verification.

                                                                                                                    ## Output Format (Post to #openclaw-leads)

                                                                                                                    Every run, post a structured report:

                                                                                                                    ```
                                                                                                                    LEAD SCRAPER RUN [date] [time]
                                                                                                                    Source: [what you searched]
                                                                                                                    New leads found: [count]
                                                                                                                    Cumulative total: [running count]

                                                                                                                    NEW LEADS:
                                                                                                                    1. [Name] | [Business Name] | [City, State] | [Type: solo chef/small catering/etc] | [Email] | [Email Tier: A/B] | [Source URL]
                                                                                                                    2. ...

                                                                                                                    LEADS WITHOUT EMAIL (need enrichment):
                                                                                                                    1. [Name] | [Business Name] | [City, State] | [Website] | [Social Media]
                                                                                                                    2. ...

                                                                                                                    NOTES:
                                                                                                                    - [Any interesting patterns, new directories found, dead ends to skip next time]
                                                                                                                    ```

                                                                                                                    ## Schedule

                                                                                                                    Run this as a recurring job. Suggested cadence:
                                                                                                                    - **Daily 9am:** One phase per day, rotating (Mon=directories, Tue=Instagram, Wed=Facebook, Thu=Google Maps, Fri=competitors)
                                                                                                                    - **Daily 2pm:** Email enrichment pass on leads without emails from morning run
                                                                                                                    - **Weekly Sunday 8am:** Consolidation report (total leads, by city, by type, email coverage %)

                                                                                                                    ## Deduplication

                                                                                                                    Before posting any lead, check against all previously posted leads. Match on:
                                                                                                                    1. Exact business name + city
                                                                                                                    2. Exact email address
                                                                                                                    3. Exact website URL

                                                                                                                    If a duplicate is found with NEW information (e.g., you now have their email), post it as an UPDATE, not a new lead.

                                                                                                                    ## Quality Over Quantity

                                                                                                                    - 100 verified leads with real emails > 1,000 names with no contact info
                                                                                                                    - If a search query returns garbage, skip it and note it as a dead end
                                                                                                                    - Focus effort on sources that actually yield emails
                                                                                                                    - A lead without an email is only useful if they have a website (we can email-hunt later)

                                                                                                                    ## Metrics to Track

                                                                                                                    Report these weekly:
                                                                                                                    - Total unique leads (cumulative)
                                                                                                                    - Leads with verified email (Tier A)
                                                                                                                    - Leads with likely email (Tier B)
                                                                                                                    - Leads needing enrichment (no email)
                                                                                                                    - Top 5 cities by lead count
                                                                                                                    - Top 3 most productive sources
                                                                                                                    - Estimated email list size (Tier A + B)

                                                                                                                    ## Goal

                                                                                                                    **10,000 verified leads with emails within 60 days.** That's ~170/day. Aggressive but achievable if you hit directories hard in Phase 1 (they have hundreds of listings each).
