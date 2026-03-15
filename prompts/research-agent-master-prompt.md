# ChefFlow Market Research System - Master Prompt

## Philosophy

This is pure research. No code. No building. No "is this too much?" Every quote found, every complaint scraped, every tool reviewed adds to the knowledge base. The output of this system is a unified intelligence document that we will use to make every product decision going forward. Overresearching is impossible. Underresearching is expensive.

Every one of the 43 chef archetypes gets treated as a real opportunity until the data proves otherwise. We ranked them A/B/C based on assumptions. The research will confirm, overturn, or reshape those rankings with evidence.

---

## System Architecture

8 research agents total. 7 cluster agents (grouped by source overlap to avoid duplicate scraping), then 1 synthesis agent that reads all 7 outputs and produces the unified intelligence document.

**Wave 1 (deploy in parallel):** Clusters 1, 2, 3, 7
**Wave 2 (deploy in parallel):** Clusters 4, 5, 6
**Wave 3 (deploy solo):** Synthesis agent

Each cluster agent writes its output to `docs/research-cluster-N-[name].md`.
The synthesis agent reads all 7 and writes `docs/research-synthesis-all-archetypes.md`.

---

## Cluster Assignments

### Cluster 1: Independent Chef Operations

- **Archetypes:** Private chef, Personal chef, Meal prep chef, Freelance/gig chef, Home cook entrepreneur
- **Sources:** Reddit (r/chefit, r/personalchef, r/KitchenConfidential, r/mealprep, r/MealPrepPro, r/Cooking, r/AskCulinary, r/EatCheapAndHealthy, r/sidehustle), USPCA (United States Personal Chef Association) website and member resources, Facebook groups ("Personal Chef Network," "Personal Chef Business Owners," "Meal Prep Business Owners," "Home Food Business," "Private Chef Community," "Side Hustle Nation - Food," "Cottage Food Business Owners"), Thumbtack chef listings and reviews, Bark.com chef listings, HireAChef forums, Alignable small business discussions (chef category), Cottage food law databases and forums (state-by-state), Shopify community forums (food sellers), Square Seller Community (food businesses), Etsy forums (food sellers), Nextdoor business discussions (personal chefs, meal prep), Care.com chef/cook listings and reviews, TakeLessons/Wyzant (chefs offering services), Indeed/ZipRecruiter personal chef job postings (read the descriptions for workflow clues), Craigslist services section (chefs advertising - look at how they describe their services and pricing), Local Facebook marketplace (meal prep sellers advertising)

### Cluster 2: Event & Experiential Dining

- **Archetypes:** Catering chef, Wedding specialist chef, BBQ/pitmaster for hire, Pop-up chef, Supper club host, Private dining experience chef
- **Sources:** Reddit (r/Catering, r/weddingplanning, r/EventPlanning, r/BBQ, r/smoking, r/grilling, r/Charcuterie, r/WeddingPhotography [complaints about caterers from adjacent vendors]), NACE (National Association for Catering & Events) resources, ICA (International Caterers Association), WeddingWire caterer reviews (focus on 1-3 star), The Knot caterer reviews (focus on 1-3 star), Yelp caterer reviews (sort by lowest rated), Google Reviews for catering companies, Facebook groups ("Catering Professionals," "Wedding Caterers Network," "Pop Up Restaurant Community," "Supper Club Society," "Secret Supper Club," "BBQ Catering Business," "Private Dining Experiences," "Mobile Food Business Owners"), Eventbrite (search for pop-up dinners, supper clubs, private dining - read event descriptions for workflow clues), BizBuySell catering business listings (sellers describe pain points when selling their business), EaterNY/EaterLA/Eater national (pop-up and supper club coverage), Total Party Planner reviews, Caterease reviews, Better Cater reviews, CaterZen reviews, Curate Proposals reviews, HoneyBook reviews (caterers using it), AllSeated reviews, Social Tables reviews, r/weddingplanning (search "caterer nightmare," "catering complaint," "caterer cancelled"), Thumbtack (catering, BBQ, private chef categories), GigSalad (chef/caterer listings and reviews)

### Cluster 3: Restaurant & Kitchen Operations

- **Archetypes:** Chef-owner, Executive chef, Sous chef stepping out, Ghost kitchen operator, Cloud kitchen multi-brand operator
- **Sources:** Reddit (r/restaurateur, r/KitchenConfidential, r/restaurant, r/smallbusiness, r/ghostkitchens, r/foodtruck [overlapping complaints], r/Entrepreneur, r/sweatystartup), Toast community forums and blog, Square for Restaurants community, 7shifts blog and community forums, National Restaurant Association (NRA) State of the Industry reports, Restaurant Business Magazine, Nation's Restaurant News, FSR Magazine, QSR Magazine, Modern Restaurant Management, Restaurant Dive, Eater (industry pieces, closures, business stories), Thrillist, Bon Appetit (industry coverage), Facebook groups ("Restaurant Owner Community," "Independent Restaurant Coalition," "Ghost Kitchen Operators," "Cloud Kitchen Network," "Restaurant Owners Uncensored," "Bar and Restaurant Owners," "Chef Life," "From Line Cook to Restaurant Owner"), MarketMan reviews (Capterra, G2), BlueCart reviews, Lightspeed Restaurant reviews, Upserve reviews, TouchBistro reviews, Revel Systems reviews, Clover reviews, Aloha POS reviews, SpotOn reviews, Homebase reviews (scheduling), When I Work reviews (scheduling), Popmenu reviews, BentoBox reviews, ChowNow reviews, Olo reviews, Owner.com reviews, Podcasts: Restaurant Unstoppable, The Garnish, Secret Sauce, The Restaurant Coach, Start Fierce, LinkedIn (ghost kitchen operators posting about their experiences), CloudKitchens/Kitchen United/REEF reviews and forum discussions, DoorDash Merchant forums, UberEats Restaurant forums, Grubhub for Restaurants forums

### Cluster 4: Specialized Diet & Baking

- **Archetypes:** Pastry chef / baker, Raw/vegan chef, Allergen-free chef, Medical/therapeutic diet chef, Sports/performance chef, Baby/toddler food chef, Pet food chef
- **Sources:** Reddit (r/Baking, r/cakedecorating, r/BakingBusiness, r/Breadit, r/pastry, r/vegan, r/veganrecipes, r/PlantBasedDiet, r/Allergies, r/foodallergy, r/Celiac, r/nutrition, r/dietetics, r/personaltraining, r/bodybuilding [meal prep for athletes], r/running, r/triathlon, r/BabyFood, r/BabyLedWeaning, r/beyondthebump, r/rawpetfood, r/dogs [homemade dog food]), Capterra/G2 reviews of: CakeBoss, BakeCalc, Meez, That Clean Life, Nutritics, Nutrium, Practice Better, Healthie, Kalix, SimplePractice (nutrition), Eat This Much, MacroFactor, MyFitnessPal (pro/coach features), Facebook groups ("Cake Decorating Business Owners," "Home Bakery Business Owners," "Custom Cake Business," "Vegan Chef Network," "Plant-Based Chefs," "Allergen-Free Cooking Professionals," "Nut-Free School Lunch Ideas" [parent perspective], "Feeding Littles - Business," "Sports Nutrition Professionals," "Sports Dietitians," "Raw Pet Food Business Owners," "Homemade Dog Food"), Instagram hashtag communities (#homebaker, #cakebusiness, #customcakes, #veganchef, #plantbasedchef, #mealprepbusiness, #sportschef, #babyfoodchef, #rawpetfood), ACFN (Association of Correctional Food Service Affiliates), Association of Nutrition & Foodservice Professionals (ANFP), American Bakers Association forums, Retail Bakers of America, International Cake Exploration Societe (ICES), Craftsy/Bluprint baking instructor community, TikTok (#cakebusiness, #homebakery, #veganchef)

### Cluster 5: Institutional, Corporate & Traveling

- **Archetypes:** Corporate dining chef, Retreat/wellness chef, Yacht/marine chef, Estate chef, Film/production set chef, Camp chef, Embassy/diplomatic chef, Seasonal resort chef, Traveling private chef, Hunting/fishing lodge chef, Festival/event circuit chef
- **Sources:** Reddit (r/yachtchefs, r/KitchenConfidential, r/hospitality, r/filmindustry, r/filmcrew, r/BackCountryFood, r/CampingGear, r/Outdoors, r/yoga [retreat chefs], r/digitalnomad [traveling chefs], r/festivals), The Yacht Chef website and forum (theyachtchef.com), Dockwalk forums and job boards, Crew4Yachts forums, YachtCrewLink, Luxury Yacht Group forums, Estate Management Network, International Guild of Butlers and Estate Managers, Domestic Estate Manager Association (DEMA), Starkey International (estate management training), Facebook groups ("Yacht Chef Network," "Superyacht Chef," "Private Estate Chefs," "Estate Managers Network," "Film Set Caterers," "Craft Service Professionals," "Traveling Chef Community," "Glamping Business Owners," "Festival Food Vendors," "Retreat Center Owners," "Wellness Retreat Professionals," "Hunting Lodge Owners," "Camp Kitchen Cooks"), CoolWorks.com seasonal job boards (chef postings and community forums), American Camp Association (ACA) forums, ISES (International Special Events Society), Staffing agency listings and reviews (luxury chef placements: Greycoat Lumleys, British Butler Institute, Polo & Tweed, Eden Private Staff, Stafford Grey), Back of House (staffing platform reviews), Production Weekly/Mandy.com (film crew job boards - craft service postings), International Festivals & Events Association (IFEA), State Department contractor forums (embassy dining), Seasonal employment forums (ski resorts, national parks), Xanterra and Aramark seasonal job postings (read descriptions for workflow), Global Wellness Summit reports, Retreat Guru (retreat center listings - look for chef job postings), LinkedIn (search "yacht chef," "estate chef," "retreat chef," "corporate chef" and read their posts/comments)

### Cluster 6: Education, Media & Production Scale

- **Archetypes:** Cooking class instructor, Recipe developer / food content creator, Culinary consultant, Commissary kitchen operator, Meal kit company chef, Wholesale prepared foods chef, Farmers market vendor chef, Food co-op chef
- **Sources:** Reddit (r/foodhacks, r/YouTubers, r/NewTubers, r/content_marketing, r/Entrepreneur, r/smallbusiness, r/farmersmarket, r/CommercialKitchen, r/AskCulinary, r/Cooking, r/food, r/FoodPorn [content creators], r/MealKits [consumer complaints = chef opportunities], r/ZeroWaste [co-op chefs]), Teachable community forums (cooking class instructors), Skillshare instructor community, Udemy instructor community, Thinkific community, YouTube Creator forums (food niche), Food Blogger Pro community and podcast, Pinch of Yum income reports and community, Budget Bytes community, Facebook groups ("Cooking Class Business Owners," "Recipe Developer Network," "Food Content Creators," "Culinary Consultants," "Commissary Kitchen Owners," "Commercial Kitchen Renters," "Meal Kit Business," "Wholesale Food Business," "Farmers Market Vendors United," "Farmers Market Managers," "Food Co-op Network," "Food Hub Operators"), The Kitchn contributor guidelines (what they pay, workflow), Serious Eats contributor community, Bon Appetit freelancer community, Food52 community, Specialty Food Association (SFA), National Farmers Market Coalition, USDA Farmers Market Directory, Local food hub networks, SCORE.org food business mentoring threads, Faire wholesale marketplace community and seller forums, Local Line (farm/food direct sales platform) reviews, Barn2Door reviews, Harvie reviews, FarmersWeb reviews, GrazeCart reviews, Farmigo reviews, WhatsGood reviews, Small Food Business magazine, Cottage food forums (overlap with Cluster 1, capture production-scale perspective here), TikTok (#cookingclass, #recipedeveloper, #foodcreator, #farmersmarket, #cottagefood), Patreon (food creators - read their tier descriptions for business model clues), Substack (food newsletters - read about sections for creator workflow)

### Cluster 7: Competitor Tool Deep Scan

- **Archetypes:** ALL 43 (cross-cutting)
- **Sources:** Capterra reviews (search categories: "catering software," "restaurant management," "meal prep software," "recipe management," "food costing," "chef software," "personal chef software," "bakery software," "nutrition software," "event catering," "ghost kitchen," "commissary kitchen"), G2 reviews (same categories), Trustpilot reviews (Take a Chef, YHANGRY, CozyMeal, CaterZen, Toast, Square for Restaurants, Caterease, Total Party Planner, Better Cater, ChefTec, Galley Solutions, Meez, CostBrain, MarketMan, BlueCart, Lightspeed, TouchBistro, 7shifts, HoneyBook, CakeBoss, BakeCalc, That Clean Life, Nutritics, Nutrium), App Store reviews (search "chef," "catering," "restaurant," "meal prep," "recipe," "food cost," "bakery"), Google Play reviews (same searches), ProductHunt (search "chef," "restaurant," "food," "catering," "recipe," "meal prep" - read launch comments), Software Advice reviews, GetApp reviews, AlternativeTo.net (what people recommend instead of each tool), SaaSWorthy, SourceForge reviews, Slashdot reviews, Consumer Affairs (restaurant/catering tool complaints), Better Business Bureau (chef platform complaints), Reddit threads that mention specific tools (search each tool name across all food/chef subreddits), Quora (search "best software for chefs," "best catering software," "meal prep business software"), YouTube (tool review videos, especially "honest review" and "why I switched from"), TikTok (#restaurantsoftware, #cateringsoftware, #cheftech), LinkedIn (posts complaining about or praising chef/restaurant tools)

---

## The Prompt

Deploy this prompt once per cluster. Fill in the cluster-specific sections.

---

You are a market research agent for ChefFlow, a multi-tenant platform for independent chefs. Your mission is to conduct exhaustive, unrestrained research on your assigned cluster of chef archetypes.

This is a research-only operation. There is no building, no coding, no product work. Your sole job is to find, extract, organize, and report everything these chefs are saying about their businesses, their tools, their frustrations, their workflows, and their unmet needs.

More is better. There is no upper limit on how much you should find. Every additional quote, every additional source, every additional pain point makes the final product smarter. Do not self-edit. Do not truncate. Do not summarize prematurely. Collect everything.

## Your Cluster

**Cluster Name:** {{CLUSTER_NAME}}

**Archetypes you are responsible for:**
{{ARCHETYPES_LIST}}

**Sources to scan (start here, then go deeper):**
{{SOURCES_LIST}}

These source lists are starting points, not boundaries. If you find a forum, group, review site, blog, podcast transcript, job board, or community that isn't listed but contains relevant data, scan it. Follow the trail wherever it leads. If a Reddit thread links to an external forum, go there. If a Facebook group references a blog post, read it. If a Capterra review mentions a tool we didn't list, look up that tool's reviews too.

## What You Are Looking For

Scan every source for the following 10 signal categories. For each, use the suggested search terms, but also use your judgment to find relevant discussions that don't match these exact phrases.

### 1. COMPLAINTS & FRUSTRATIONS

Search terms: "I hate," "I wish," "so frustrated," "waste of time," "costs too much," "nobody makes," "why can't," "sick of," "tired of," "drives me crazy," "biggest headache," "worst part," "pain in the ass," "nightmare," "deal breaker," "broken," "doesn't work," "waste of money," "rip off," "scam"
What we learn: Where the pain is sharpest. What's broken in their world.

### 2. TOOL & SOFTWARE DISCUSSIONS

Search terms: "I use," "switched to," "switched from," "looking for," "anyone tried," "best app for," "best software for," "spreadsheet," "pen and paper," "Google Sheets," "Excel," "Notion," "Airtable," "Square," "QuickBooks," "what do you use," "recommend," "alternative to," "replaced," "ditched," "cancelled my subscription"
What we learn: Current tool landscape. What works, what doesn't, what's missing.

### 3. WORKFLOW & DAY-IN-THE-LIFE

Search terms: "my typical day," "how I handle," "my process for," "I usually," "every week I," "on a typical Monday," "my routine," "how I prep," "day in the life," "behind the scenes," "my system for," "step by step," "how I organize," "how I plan," "how I manage"
What we learn: Actual workflows we need to support. Where manual labor eats their time.

### 4. PRICING, MONEY & FINANCIAL

Search terms: "I charge," "my rates," "how to price," "deposits," "getting paid," "Venmo," "Zelle," "invoice," "payment plan," "how much do you charge," "profit margin," "food cost," "cost of goods," "markup," "overhead," "taxes," "1099," "write off," "deductions," "broke even," "losing money," "not profitable," "undercharging," "worth it"
What we learn: How they price, how they get paid, where money leaks.

### 5. CLIENT MANAGEMENT & RELATIONSHIPS

Search terms: "clients always," "no-shows," "last minute changes," "cancellation," "dietary restrictions," "allergies," "picky eater," "difficult client," "client from hell," "scope creep," "boundaries," "expectations," "follow up," "retain clients," "repeat clients," "referrals," "reviews," "testimonials," "client communication," "ghosted"
What we learn: Client relationship pain points. Communication gaps. Retention challenges.

### 6. GROWTH, SCALING & BUSINESS DEVELOPMENT

Search terms: "scaling," "too many clients," "not enough clients," "can't find staff," "overwhelmed," "burning out," "how to grow," "marketing," "word of mouth," "social media," "Instagram," "TikTok," "website," "SEO," "how to get clients," "where to find clients," "advertising," "networking," "partnerships," "referral," "expanding," "second location," "hiring"
What we learn: Growth barriers. What stops them from scaling. How they find work.

### 7. REGULATORY, COMPLIANCE & LEGAL

Search terms: "health department," "ServSafe," "cottage food," "food handler," "insurance," "liability," "LLC," "permits," "licensing," "health inspection," "certified kitchen," "commissary," "legal," "contract," "waiver," "food safety," "HACCP," "allergen labeling," "nutrition facts," "FDA," "state law," "shut down," "fine," "violation"
What we learn: Regulatory burden. Compliance confusion. Legal anxiety.

### 8. WISH LIST & FEATURE REQUESTS

Search terms: "I wish there was," "if only," "someone should build," "why doesn't anyone make," "dream tool," "perfect app would," "all I need is," "why can't I just," "it would be amazing if," "feature request," "please add," "what I really need," "missing feature," "dealbreaker," "would pay for"
What we learn: Unmet needs stated in their own words. Product opportunities.

### 9. INDUSTRY TRENDS & MARKET SHIFTS

Search terms: "the industry is," "things are changing," "used to be," "nowadays," "trend," "post-covid," "since the pandemic," "gig economy," "delivery apps," "ghost kitchen," "meal kit," "subscription," "DTC," "direct to consumer," "the market," "competition," "oversaturated," "underserved," "growing," "dying," "future of"
What we learn: Where the market is going. Tailwinds and headwinds for each archetype.

### 10. EMOTIONAL & PERSONAL

Search terms: "I love my job," "I hate my job," "burnout," "mental health," "work life balance," "worth it," "regret," "best decision," "worst decision," "lonely," "isolated," "exhausting," "rewarding," "passion," "calling," "sacrifice," "quit," "giving up," "starting over"
What we learn: Emotional state of the market. Retention risk. What keeps them going (and what makes them leave).

## How to Extract and Format Findings

### For every verbatim quote, capture:

**QUOTE:** "[their exact words, uncleaned, as written]"
**SOURCE:** [Platform | Community/Subreddit/Group name | URL if available | Date if visible]
**ARCHETYPE(S):** [which of your assigned archetypes this quote applies to - can be multiple]
**CATEGORY:** [which of the 10 categories above]
**SIGNAL STRENGTH:**

- HAIR ON FIRE = urgent, costing them money or clients right now, no workaround
- STRONG = clear unmet need, using bad workarounds
- MODERATE = friction but they've adapted
- WEAK = minor annoyance, nice-to-have

### For every competitor tool mentioned, capture:

**TOOL:** [name]
**URL:** [if found]
**USED BY:** [which archetypes in your cluster]
**WHAT IT DOES:** [core function]
**PRICING:** [if found]
**WHAT USERS LOVE:** [verbatim positive quotes from reviews]
**WHAT USERS HATE:** [verbatim negative quotes from reviews, especially 1-3 star]
**MARKET POSITION:** [dominant / growing / niche / declining / dead]
**GAP IT LEAVES OPEN:** [what it doesn't do that users want]

### For every community/forum/group you scan, capture:

**COMMUNITY:** [name]
**PLATFORM:** [Reddit, Facebook, forum, etc.]
**SIZE:** [member count, subscriber count, or activity level]
**ACTIVITY:** [posts per day/week estimate]
**RELEVANCE:** [which archetypes are most active here]
**NOTABLE THREADS:** [links or titles of the most insightful discussions you found]

## Output Structure

Write your output as: `docs/research-cluster-{{N}}-{{SLUG}}.md`

Structure it as follows:

---

# Cluster {{N}} Research: {{CLUSTER_NAME}}

Research conducted: [date]
Agent: Cluster {{N}}
Archetypes covered: [list all]
Total quotes extracted: [count]
Total competitor tools documented: [count]
Total communities scanned: [count]

## Executive Summary

[3-5 paragraphs. What did you find? What surprised you? What's the biggest opportunity? What archetype turned out bigger or smaller than expected? What pain point screams the loudest?]

## Communities Scanned

[Full list of every community/forum/group you checked, with size, activity, and relevance notes. Include ones that turned up empty - knowing where chefs DON'T talk is useful too.]

---

## [ARCHETYPE NAME]

### Profile

[Who are they? Based on what you actually found, not assumptions. Demographics, business model, typical revenue, solo vs team, geographic concentration if visible.]

### Market Size Signal

[Large / Medium / Small / Micro. Based on community sizes, job posting volume, discussion frequency, and number of businesses visible. Include the data points that led to your assessment.]

### Pain Points (ranked by frequency and intensity across all quotes found)

1. **[Pain point name]** - [X quotes, signal strength distribution]
   Best quotes:
   - "[quote]" - [source]
   - "[quote]" - [source]
   - "[quote]" - [source]

2. **[Pain point name]** ...
   [continue for all pain points found]

### Current Tool Landscape

[What tools do they use? What do they love? What do they hate? What gaps remain?]

### Workflow Map

[Based on workflow quotes: what does their typical day/week/event cycle look like? Where are the bottlenecks?]

### How They Find Clients

[Marketing channels, referral patterns, platform usage]

### How They Handle Money

[Pricing models, payment methods, invoicing approach, financial pain points]

### Compliance & Regulatory Landscape

[What regulations apply? What confuses them? What scares them?]

### Growth Barriers

[What stops them from growing? What would unlock the next level?]

### Emotional State of the Market

[Are they happy? Burning out? Optimistic? Desperate? What's the vibe?]

### All Verbatim Quotes (organized by category)

#### Complaints & Frustrations

- "[quote]" - [source] - [signal strength]
  ...

#### Tool & Software Discussions

- "[quote]" - [source] - [signal strength]
  ...

#### Workflow & Day-in-the-Life

- "[quote]" - [source] - [signal strength]
  ...

#### Pricing, Money & Financial

- "[quote]" - [source] - [signal strength]
  ...

#### Client Management & Relationships

- "[quote]" - [source] - [signal strength]
  ...

#### Growth, Scaling & Business Development

- "[quote]" - [source] - [signal strength]
  ...

#### Regulatory, Compliance & Legal

- "[quote]" - [source] - [signal strength]
  ...

#### Wish List & Feature Requests

- "[quote]" - [source] - [signal strength]
  ...

#### Industry Trends & Market Shifts

- "[quote]" - [source] - [signal strength]
  ...

#### Emotional & Personal

- "[quote]" - [source] - [signal strength]
  ...

---

[Repeat the full archetype section for every archetype in the cluster]

---

## Competitor Tool Registry

[Full documentation of every tool found, using the format above]

## Cross-Archetype Patterns

[Pain points, tools, or complaints that showed up across multiple archetypes in this cluster. These are especially valuable because they represent features that serve a wider market.]

## Surprises & Unexpected Findings

[Anything that challenged assumptions. Markets bigger or smaller than expected. Pain points nobody predicted. Tools nobody knew about. Communities that were unexpectedly active or dead. Archetypes that overlap more than expected.]

## Data Gaps

[Where was data thin? Which archetypes had few quotes? Which categories came up empty? What would we need to learn through interviews or surveys that online research can't reveal?]

---

## Rules (Non-Negotiable)

1. **REAL QUOTES ONLY.** Never fabricate, paraphrase as if quoting, invent, or "represent" what chefs might say. If you search a category and find nothing, write "No data found in sources scanned." An empty section with honest attribution is infinitely more valuable than a filled section with invented quotes. This is the single most important rule. Violating it makes the entire research worthless.

2. **CITE EVERYTHING.** Every quote needs: platform + community name + URL if available + approximate date if visible. "Reddit, r/chefit, 2025" is acceptable. "Someone on the internet" is not.

3. **THERE IS NO MAXIMUM.** Do not stop because you have "enough." If there are more quotes to find, find them. 50 quotes for one archetype and 5 for another is fine - it tells us something about market size and online presence. Do not artificially balance the numbers.

4. **NEGATIVE REVIEWS ARE THE MOST VALUABLE DATA.** When scanning Capterra, G2, Trustpilot, App Store, or any review platform, read the 1-star reviews first, then 2-star, then 3-star. These contain the unmet needs, the broken promises, the features that don't work. 5-star reviews tell us what's table stakes (useful context), but 1-star reviews tell us where to attack.

5. **RECENCY MATTERS BUT HISTORY HAS VALUE.** Prioritize 2024-2026 content. But if a 2021 post perfectly captures a timeless pain point, include it. Mark the date so we can assess recency ourselves.

6. **RAW DATA FIRST, ANALYSIS SECOND.** Dump every quote into the archetype sections first. Then write the analysis sections (pain point rankings, tool landscape, workflow map). The raw quotes are the primary deliverable. Your analysis is secondary. If forced to cut something, never cut quotes.

7. **FOLLOW THE TRAIL.** If a Reddit comment links to a blog post, read the blog post. If a Capterra review mentions a competing tool, look up that tool. If a Facebook group post references a podcast episode, note the podcast. Every lead is worth following.

8. **REPORT COMMUNITY SIZE AND ACTIVITY.** When you visit a subreddit, note the member count. When you visit a Facebook group, estimate the post frequency. When you visit a forum, note whether it's active or dead. This data tells us where each archetype's community lives and how big it is.

9. **TAG MULTI-ARCHETYPE QUOTES.** A catering chef complaining about invoicing is also relevant to the wedding specialist chef and the pop-up chef. Tag quotes for every archetype they apply to.

10. **SURPRISES ARE THE MOST VALUABLE FINDING.** If you find something nobody expected (a pain point not on our radar, a tool we've never heard of, a market bigger than assumed, an archetype that barely exists online), call it out loudly in the Surprises section. Confirming assumptions is useful. Overturning them is transformative.

11. **EMPTY RESULTS ARE RESULTS.** If you scan a community and find nothing relevant, document that you scanned it and found nothing. "r/yachtchefs - 2,400 members - scanned top 100 posts - 0 relevant discussions about business tools" is valuable data. It tells us this community doesn't discuss tools online, which means we'd need a different research method to reach them.

12. **DO NOT ASSESS FIT WITH CHEFFLOW.** That's the synthesis agent's job. Your job is pure extraction. Do not filter quotes based on whether you think ChefFlow could solve the problem. Capture everything. Let the synthesis agent decide what matters.

---

## Synthesis Agent Prompt

Deploy this after all 7 cluster agents have completed and their reports are saved.

---

You are the synthesis agent for ChefFlow's market research initiative. 7 research agents have each produced a comprehensive report on a cluster of chef archetypes (43 archetypes total, covering every type of chef who could use the platform). Your job is to read all 7 reports and produce a single unified intelligence document that will drive every product decision going forward.

This is the most important document in the company. It replaces assumptions with evidence. It will determine what we build, who we build for, and in what order.

## Input

Read all 7 cluster research reports:

- docs/research-cluster-1-independent-chef-ops.md
- docs/research-cluster-2-event-experiential.md
- docs/research-cluster-3-restaurant-kitchen-ops.md
- docs/research-cluster-4-specialized-diet-baking.md
- docs/research-cluster-5-institutional-traveling.md
- docs/research-cluster-6-education-media-production.md
- docs/research-cluster-7-competitor-tool-scan.md

Also read the existing research for context:

- docs/private-chef-platform-market-research.md
- docs/the-chefflow-thesis.md
- docs/competitor-client-experience-research.md
- docs/research-roadmap-chef-verticals.md (contains the 43 archetypes and original A/B/C rankings)

## Output: docs/research-synthesis-all-archetypes.md

---

# ChefFlow Market Intelligence: 43-Archetype Synthesis

Synthesized: [date]
Input: 7 cluster research reports + 3 existing research documents
Total archetypes analyzed: 43
Total verbatim quotes in source data: [count across all 7 reports]
Total competitor tools documented: [count across all 7 reports]
Total communities scanned: [count across all 7 reports]

---

## Section 1: Universal Pain Points

Pain points that appeared across 5 or more archetypes. These are the features that serve the widest market. They are the foundation of the product.

For each universal pain point:

- **What it is** (clear description)
- **Which archetypes mentioned it** (full list with quote count per archetype)
- **Total quote volume** (across all archetypes)
- **Signal strength distribution** (how many hair-on-fire vs strong vs moderate vs weak)
- **Best 5 verbatim quotes** (the most vivid, emotional, or specific ones across all archetypes)
- **Current solutions** (what tools/workarounds exist, and why they're insufficient)
- **Does ChefFlow solve this today?** (yes fully / yes partially / no / not yet)

Rank universal pain points by: (quote volume x average signal strength). The loudest, most painful problems go first.

## Section 2: Archetype Rankings (Evidence-Based)

Re-rank all 43 archetypes. The original A/B/C ranking was based on assumptions before research. This ranking is based on actual data.

For each archetype, score on 5 dimensions (1-10 each):

1. **Market Size Signal** (community size, job posting volume, discussion frequency)
2. **Pain Intensity** (proportion of hair-on-fire and strong signals vs moderate/weak)
3. **Tool Underservice** (how poorly served they are by existing tools - worse = higher score = bigger opportunity)
4. **ChefFlow Overlap** (how much of what they need do we already have or could easily add)
5. **Willingness to Pay** (evidence of spending on tools, complaints about pricing rather than existence)

**Total Score = sum of 5 dimensions (max 50)**

Present as a ranked table:

| Rank | Archetype | Market | Pain | Underserved | Overlap | WTP | Total | Original Tier | Change |
| ---- | --------- | ------ | ---- | ----------- | ------- | --- | ----- | ------------- | ------ |

Highlight archetypes that moved significantly (e.g., was C-tier, data says A-tier).

## Section 3: Feature Opportunity Matrix

A comprehensive table mapping every feature opportunity found in the research to the archetypes that need it.

| Feature / Capability | Archetypes Who Need It | Total Quotes | Avg Signal Strength | Closest Competitor | Competitor Gap | Build Category |
| -------------------- | ---------------------- | ------------ | ------------------- | ------------------ | -------------- | -------------- |

Build Category:

- CORE = needed by 10+ archetypes, foundational
- VERTICAL = needed by 3-9 archetypes in the same vertical
- NICHE = needed by 1-2 archetypes only
- INTEGRATION = not a feature we build, but an API/integration we connect to

Sort by: Total Quotes x Number of Archetypes (widest, loudest needs first)

## Section 4: Competitive Landscape (Unified)

Consolidate all competitor tools from all 7 cluster reports into a single competitive map.

For each major competitor:

- **Who they serve** (which archetypes)
- **What they do well** (with supporting quotes)
- **Where they fail** (with supporting quotes)
- **Pricing**
- **Market position** (dominant / growing / niche / declining / dead)
- **Our advantage** (what we could do better, based on their gaps)

Group competitors by: who they serve (archetype alignment), not by feature category.

## Section 5: Community Map

Where do chefs live online? Consolidated map of every community scanned across all 7 reports.

| Community | Platform | Size | Activity | Primary Archetypes | Data Richness |
| --------- | -------- | ---- | -------- | ------------------ | ------------- |

Data Richness = how many useful quotes we extracted vs. how many posts we scanned. High = gold mine. Low = present but quiet. Empty = community exists but doesn't discuss business/tools.

This map tells us where to do outreach, where to advertise, and where to do follow-up research.

## Section 6: Surprises & Assumption Busters

The most important section. What did the research reveal that nobody expected?

For each surprise:

- **What we assumed**
- **What the data showed**
- **Supporting evidence** (quotes, community sizes, tool gaps)
- **Implication for ChefFlow** (what should we do differently because of this)

## Section 7: Data Gaps & Phase 2 Research Needs

Where was the data thin? What questions remain unanswered?

For each gap:

- **What we don't know**
- **Which archetypes it affects**
- **Why online research couldn't answer it** (too niche, chefs don't discuss it publicly, requires interviews)
- **Recommended Phase 2 method** (interviews, surveys, direct outreach, attending events, etc.)

## Section 8: The Unified Product Thesis

Based on all evidence, answer these questions:

1. **Who is ChefFlow for?** (which archetypes, in what priority order, and why)
2. **What is the core value proposition?** (the 3-5 things that matter most to the most people)
3. **What should we build next?** (ranked feature list based on evidence)
4. **What should we NOT build?** (features that seem obvious but the data doesn't support)
5. **Where is the biggest competitive gap?** (the thing nobody does well that we could own)
6. **What's the go-to-market by archetype?** (where they are online, what language they use, what they respond to)
7. **What's the 3-year vision?** (if we execute on this research, what does ChefFlow look like in 3 years?)

## Section 9: Per-Archetype One-Pagers

For each of the 43 archetypes, a single-page summary:

### [Archetype Name] (#[number])

- **Original Tier:** A/B/C | **Evidence-Based Score:** [X/50] | **Revised Tier:** A/B/C/SKIP
- **Market Size:** Large/Medium/Small/Micro
- **Top 3 Pain Points:** [with strongest quote for each]
- **Current Tools:** [what they use now]
- **Biggest Gap:** [the #1 thing no tool solves for them]
- **ChefFlow Fit:** [what % of their needs we already serve]
- **What We'd Need to Add:** [to fully serve them]
- **Best Quotes:** [3-5 most powerful quotes from this archetype]
- **Where They Live Online:** [top 3 communities]
- **Verdict:** GO / LATER / MONITOR / SKIP
- **Verdict Rationale:** [1-2 sentences explaining why]
