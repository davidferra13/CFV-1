# D8: Constraint Profiles - How Dietary, Accessibility, and Preference Constraints Shape Food Service Discovery

**Research Date:** 2026-03-15
**Cluster:** Demand-Side Research
**Status:** Complete

---

## Executive Summary

Over 85 million Americans have a food allergy, follow a medically required diet, or adhere to a religious dietary code. Another 100+ million follow elective dietary patterns (keto, vegetarian, gluten-free by choice). These constrained eaters spend more, search harder, and trust less when finding food services. Current discovery tools (Yelp, Google, Spokin, Fig) address restaurant dining but completely ignore the private chef and catering market. ChefFlow's existing per-client, per-event dietary tracking creates a verified constraint-handling track record that no competitor can replicate. Constraint-based matching is the single most defensible feature a food services platform can build.

---

## 1. The Scale of Dietary Constraints in America

### 1.1 Food Allergies

Food allergies affect a significant and growing portion of the U.S. population:

- **Adults:** 6.7% of U.S. adults have a food allergy (approximately 17 million people). Women are disproportionately affected at 7.8% vs 4.6% for men. (CDC, 2024)
- **Children:** 5.3% of U.S. children have a diagnosed food allergy (approximately 4 million children). (CDC, 2024)
- **Combined:** Nearly 1 in 13 Americans has at least one food allergy, placing the total at roughly 21 million people with clinically verified food allergies.
- **Growth by race:** Childhood food allergy prevalence has increased fastest among Black Americans (2.1% per decade) and Hispanic Americans (1.2% per decade) compared to White Americans (1% per decade). (FARE, 2024)
- **Broader allergic conditions:** Almost 1 in 3 U.S. adults and children reported having a seasonal allergy, eczema, or food allergy in 2024. (CDC/NCHS, January 2026)

**Emergency impact:** Every 10 seconds, a food allergy reaction sends someone to the emergency room in the U.S., totaling 3.4 million food allergy-related ER visits per year. Food-induced anaphylaxis causes approximately 150-200 deaths annually. (FARE; CDC)

### 1.2 Celiac Disease and Gluten-Free Diets

- **Celiac disease prevalence:** 1 in 133 Americans (approximately 1% of the population, or 3.3 million people) have celiac disease. (Beyond Celiac)
- **Undiagnosed rate:** Up to 83% of Americans with celiac disease are undiagnosed or misdiagnosed. This means roughly 2.7 million people have undiagnosed celiac disease. (Beyond Celiac)
- **Gluten-free diet adoption:** 1.7% of the U.S. population follows a gluten-free diet (NHANES, 2014), significantly exceeding the celiac prevalence, indicating substantial voluntary adoption.
- **One-third awareness:** One-third of Americans say they are trying to avoid gluten, whether diagnosed with celiac or not. (NYU Langone)
- **Market size:** The U.S. gluten-free market is projected to reach $14 billion by 2032, more than doubling its 2022 value. (Statista)

### 1.3 Diabetes and Medical Dietary Needs

- **Diabetes:** 40.1 million Americans have diagnosed or undiagnosed diabetes (12% of the U.S. population), with 29.1 million diagnosed. Prevalence doubled from 6.26% to 12% between 1990 and 2024. (CDC National Diabetes Statistics Report, 2024)
- **Prediabetes:** 97.6 million American adults (38% of the adult population) have prediabetes, requiring dietary modification to prevent progression. (CDC)
- **Chronic kidney disease:** 1 in 3 adults with diabetes also has CKD, and 20-40% of all people with diabetes will develop CKD during their lifetime, requiring specialized renal diets. (CDC)
- **Combined medical diet population:** Diabetes, CKD, celiac disease, and other medical conditions requiring dietary management affect well over 50 million Americans.

### 1.4 Elective Dietary Patterns

The 2024 IFIC Food and Health Survey found that **54% of Americans follow a specific eating pattern or diet**, up from 36% in 2018. The most popular patterns:

| Diet                 | Approximate U.S. Following | Market Size                     |
| -------------------- | -------------------------- | ------------------------------- |
| High protein         | 20% of adults              | -                               |
| Mindful eating       | 18-19% of adults           | -                               |
| Calorie counting     | 15% of adults              | -                               |
| Intermittent fasting | 15% of adults              | -                               |
| Clean eating         | 13% of adults              | -                               |
| Low-carb / keto      | 5-16% of adults            | $12.45B globally (2024)         |
| Vegetarian           | 4-5% of adults             | -                               |
| Vegan                | 1-3% of adults             | $8.1B plant-based retail (2024) |
| Paleo                | ~7% of adults              | $3.85B (2024)                   |

Sources: IFIC 2024 Survey; Gallup; Forbes Health; Market.us

### 1.5 Religious Dietary Requirements

- **Halal:** 83% of U.S. Muslims either prefer or require halal food (37% strictly require certification, 46% mostly prefer). U.S. halal consumers spent ~$20 billion on food in 2020. The North America halal food market is projected to grow from $100B (2024) to $226B (2033) at 9.47% CAGR. The U.S. Muslim population is projected to be the second-largest faith community in the country by 2040. (ISPU; Technavio)
- **Kosher:** 35% of U.S. Jews keep kosher. Approximately 40% of packaged foods carry kosher certification, making it the most common label claim in the U.S. food industry. The kosher food market is expected to reach ~$60 billion in annual sales by 2025. (Pew Research; Industry data)

### 1.6 Total Constrained Population

| Constraint Type                          | Estimated U.S. Population |
| ---------------------------------------- | ------------------------- |
| Food allergies (clinical)                | ~21 million               |
| Celiac disease (diagnosed + undiagnosed) | ~3.3 million              |
| Diabetes (all types)                     | ~40 million               |
| Prediabetes                              | ~97.6 million             |
| Chronic kidney disease                   | ~37 million               |
| Halal-observant                          | ~4-5 million              |
| Kosher-observant                         | ~2-3 million              |
| Vegetarian/vegan                         | ~16-26 million            |
| Gluten-free (by choice)                  | ~5-10 million             |
| Keto/low-carb                            | ~13-40 million            |

**Conservative estimate of Americans with at least one hard dietary constraint (allergy, medical, religious):** 85+ million. When including elective dietary patterns, the number exceeds 170 million (more than half the adult population).

---

## 2. The Failure of Current Discovery for Constrained Eaters

### 2.1 How People Currently Find Safe Food

Constrained eaters rely on a fragmented, unreliable patchwork:

- **Word of mouth:** The primary method. Parents of allergic children share restaurant names in Facebook groups, Reddit threads, and local allergy support groups. This does not scale and is geographically limited.
- **Trial and error:** Many people simply ask at restaurants and hope for the best. The AAFA "My Life with Food Allergy" survey found that food allergies cause significant social isolation because families avoid eating out entirely rather than risk exposure.
- **Specialty apps:** A small ecosystem of allergy-focused apps exists (see below), but coverage is thin, reviews are sparse outside major cities, and none address the private chef or catering market.
- **Google/Yelp:** General restaurant platforms allow keyword searches ("gluten-free") but do not verify claims, track allergen handling records, or provide structured constraint matching.

### 2.2 Existing Allergy Discovery Apps

**Spokin (iOS only)**

- 73,000+ reviews across 80 countries
- Filters by allergen and cuisine for restaurants, bakeries, ice cream shops, hotels
- Community-driven reviews from allergy sufferers
- Limitation: iOS only, restaurant-focused, no chef or catering coverage

**Fig (iOS and Android)**

- 1 million+ members
- Supports 2,800+ dietary restrictions and allergens
- Includes grocery product scanning and restaurant discovery
- Limitation: Product-scanning focus, restaurant coverage is secondary

**AllergyEats**

- Restaurant ratings based on allergy-friendliness
- User reviews from the allergy community
- Covers restaurants across the U.S.
- Limitation: Restaurant-only, no private chef or catering discovery

**Nima (discontinued sensor)**

- Was a portable gluten/peanut testing device
- Hardware product, not a discovery platform
- Demonstrated demand for verification tools

### 2.3 The Gap: Zero Coverage for Private Chefs and Caterers

Every existing allergy/constraint discovery tool focuses on restaurants. None address:

- Finding a private chef who can cook for multiple dietary constraints
- Verifying a caterer's track record with specific allergens
- Matching a chef's competency to a client's constraint profile
- Event catering where 10+ guests each have different restrictions

This is the gap ChefFlow fills.

### 2.4 The "Allergy Tax": Higher Costs for Constrained Eaters

Constrained eaters pay a measurable premium:

- **Gluten-free foods cost 79-242% more** than their conventional equivalents. Gluten-free bread is 4.59x as expensive per ounce as regular bread. (Multiple peer-reviewed studies, 2008-2025)
- **Annual food allergy costs:** $4,184 per child per year in direct costs. The total U.S. economic burden of food allergies is estimated at $24.8 billion annually for children alone. A 2025 study estimated the total societal cost (adults and children) at $370.8 billion, or $22,234 per patient per year. (JAMA Pediatrics; Annals of Allergy)
- **Low-income disparities:** Food-allergic households with lower incomes spend less on medication but face 2.5x greater healthcare costs from allergy-related ER visits and hospitalizations. (PMC/Springer)
- **Opportunity costs:** Mean household opportunity costs of $4,881 per year from parents restricting careers, avoiding travel, and managing allergen-safe childcare. (JAMA Pediatrics)

### 2.5 Safety Failures and Fatal Consequences

Recent high-profile incidents demonstrate the life-or-death stakes of inadequate allergen communication:

- **Dr. Kanokporn Tangsuan, Disney Springs (October 2023):** A 42-year-old physician with dairy and nut allergies died after eating at Raglan Road Irish pub. She had been reassured by staff that her meal was allergen-free. The case was settled in 2026.
- **Abraham Williams, Las Vegas (April 2024):** Died after eating at Beauty and Essex despite warning staff of his shellfish allergy. One bite of pesto spaghettini triggered fatal anaphylaxis.
- **Dominique Brown, Los Angeles (December 2024):** A 34-year-old Disney influencer died from a peanut allergy reaction at a holiday event after being told the food was safe.
- **Alison Pickering, Texas (May 2023):** A 23-year-old student died on a first date at a restaurant after ordering a meal she'd eaten safely before, which now contained an undisclosed peanut sauce.

These deaths share a common pattern: the person asked about allergens, was told the food was safe, and it was not. The discovery and communication layer failed completely.

---

## 3. Constraint-Based Matching: Technical Approaches

### 3.1 The Matching Problem

The core question for a food services platform: "I need a chef who can safely cook nut-free, dairy-free, low-sodium meals for 50 people, 3 of whom also need kosher." This is a multi-dimensional constraint satisfaction problem.

### 3.2 Approaches from Other Industries

**Dating apps (constraint + preference matching):**

- Hard filters (age range, location, religion) that eliminate candidates
- Soft preferences (interests, lifestyle) that rank remaining candidates
- The food equivalent: hard constraints (must be nut-free) vs. preferences (prefer organic)

**Job boards (skill + requirement matching):**

- Structured skill tags on candidate profiles
- Boolean requirement matching (must have X, Y, Z)
- The food equivalent: chef skill tags (certified gluten-free kitchen, halal training, etc.)

**Real estate (multi-dimensional filtering):**

- Price range, bedrooms, location, school district, pet policy
- Saved searches with notifications
- The food equivalent: dietary filters, cuisine type, guest count, budget, location

### 3.3 Tagging vs. Structured Data vs. Free Text

| Approach                           | Pros                                                  | Cons                                                              |
| ---------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| **Free-text search**               | Easy to implement, flexible                           | Misses synonyms ("dairy-free" vs "lactose-free"), no verification |
| **Tag-based**                      | Structured, filterable, chef self-reports             | Tags require maintenance, no verification of competency           |
| **Structured constraint profiles** | Precise matching, verified by track record            | More complex to build, requires data from completed events        |
| **Hybrid (ChefFlow approach)**     | Tags for discovery + verified event history for trust | Best of both, requires platform adoption                          |

### 3.4 The Combinatorial Explosion Problem

A dinner party for 10 guests might include:

- 2 guests with nut allergies
- 1 guest who is vegan
- 1 guest with celiac disease
- 1 guest keeping kosher
- 1 guest on a renal diet

A chef must create a menu that satisfies ALL constraints simultaneously, not just accommodate each one in isolation. This is where simple tagging fails and structured constraint profiles become essential. The platform must:

1. Decompose each guest's constraints into atomic requirements
2. Find the intersection of all requirements (the "safe zone")
3. Match that intersection against chef competencies
4. Rank results by verified track record in each constraint category

### 3.5 How Meal Kit Companies Handle Dietary Filtering (and Where They Fail)

**HelloFresh:**

- Does NOT offer allergen-specific meal plans
- Labels the 8 major allergens on recipes but cannot guarantee against cross-contamination
- All kits prepared in the same facility
- Users must self-filter and substitute ingredients
- Not suitable for severe allergies

**Green Chef:**

- Offers certified gluten-free meals
- Ingredients packaged separately for easy substitution
- Better allergen labeling than HelloFresh
- Still limited to pre-designed menus, not custom constraint matching

**The gap:** Meal kits offer preset dietary categories (keto plan, vegetarian plan). They cannot handle the combinatorial, per-guest, per-event constraint matching that private chef services require. A private chef is the only solution for complex multi-constraint events.

---

## 4. Chef-Side Constraint Competency

### 4.1 Allergen Training Programs

**ServSafe Allergens (National Restaurant Association):**

- ~1 hour online course covering the "Big Nine" allergens (including sesame, added by FDA)
- Covers: identifying allergens, preventing cross-contact, communication with guests, epinephrine administration
- ANAB/ASTM accredited certification, valid for 3 years
- Cost: approximately $22 per certification

**State requirements:** Only 5 states and 1 county currently mandate allergen training: Illinois, Michigan, Rhode Island, Massachusetts, Virginia, and Montgomery County, MD. This means the vast majority of food service workers in the U.S. have no required allergen training. (ServSafe)

### 4.2 How Private Chefs Currently Handle Dietary Restrictions

Private chefs handle dietary constraints through:

- **Intake questionnaires:** Most professional private chefs ask about allergies and dietary preferences during initial client consultation
- **Menu customization:** Menus are built around stated restrictions
- **Kitchen protocols:** Dedicated cutting boards, separate prep areas, cleaned equipment between allergen and non-allergen cooking
- **Communication:** Verbal confirmation with clients before serving

The problem: none of this is tracked, verified, or discoverable by new clients. A chef's allergen handling track record exists only in their personal memory and client relationships.

### 4.3 Liability and Insurance

- **General liability coverage** for private chefs typically offers $1-2 million for foodborne illness and allergy-related personal injury claims.
- **Product liability:** A chef's prepared food is legally their "product." If someone becomes ill, the chef's product liability insurance covers medical expenses, legal defense, and settlements.
- **Key risk factors:** Undeclared allergens, cross-contamination from shared prep surfaces, and miscommunication about ingredients are the primary liability triggers.
- **Best practices for risk reduction:** Dedicated allergen-free prep areas, separate equipment, hand-washing protocols between dishes, written allergen documentation for each meal served. (The Hartford; ChefInsurance.com)

A platform that creates a verifiable record of allergen-safe meals served reduces liability exposure for both the chef and the platform.

---

## 5. Accessibility and Cultural Constraints

### 5.1 Religious Dietary Requirements and Discovery Challenges

**Halal:**

- Finding halal catering for events is a significant challenge, especially outside major metro areas
- Verification of halal compliance (sourcing, slaughter method, cross-contamination avoidance) requires trust or certification
- Most halal food discovery relies on word of mouth within Muslim communities
- No mainstream platform connects halal-certified private chefs with event hosts

**Kosher:**

- Kosher catering requires separate meat and dairy kitchens, certified supervision (mashgiach), and approved ingredient sourcing
- The infrastructure for kosher catering exists in major Jewish population centers (NYC, LA, Chicago, Miami) but is sparse elsewhere
- Kosher event catering is a high-value niche (weddings, bar/bat mitzvahs, holiday celebrations)

### 5.2 Cultural Food Requirements for Events

**Indian/South Asian weddings:**

- Multiple events over multiple days (Mehndi, Sangeet, ceremony, reception), each with different menu expectations
- Must accommodate vegetarian guests (many Hindu families are fully vegetarian), Jain dietary restrictions (no root vegetables, no onion, no garlic), and sometimes halal requirements for Muslim guests
- Regional cuisine expectations vary dramatically: Punjabi vs Tamil vs Bengali vs Gujarati
- Service style preferences range from banana-leaf to plated to buffet
- Finding a single caterer or chef who understands all these cultural nuances is extremely difficult through current discovery channels

**Chinese banquets:**

- Symbolic food requirements (dishes representing togetherness, fertility, prosperity)
- Dragon and phoenix banquet format balancing six essential flavor profiles
- Specific ingredients with cultural significance (whole fish for abundance, noodles for longevity)
- Guest counts often 200+ with multiple courses

**Cross-cultural events:**

- Interfaith weddings require navigating multiple dietary codes simultaneously (halal + kosher + vegetarian)
- Non-alcoholic alternatives must be robust and clearly labeled
- Separate prep areas and utensils for different dietary categories

### 5.3 Accessibility Beyond Diet

- **Mobility considerations for food trucks and outdoor events:** Not all food service formats are accessible to wheelchair users or people with mobility limitations
- **Sensory considerations:** Some guests may need low-stimulation dining environments (relevant for event planning)
- **Texture modifications:** Elderly guests or those with dysphagia may require modified food textures
- **Communication accommodations:** Printed menus, allergen cards, visual indicators for guests with hearing impairments

---

## 6. The ChefFlow Opportunity

### 6.1 What ChefFlow Already Has

ChefFlow's existing architecture creates a unique foundation for constraint-based matching:

- **Per-client dietary tracking:** Every client record includes dietary restrictions, allergies, and preferences
- **Per-event constraint documentation:** Each event captures the specific dietary requirements that were communicated and handled
- **Verified track record:** Every completed event creates a data point: "This chef cooked for these constraints, and the event was completed successfully"
- **Recipe management:** Chefs maintain their recipe books in ChefFlow, allowing the platform to verify that a chef has recipes compatible with specific constraints

### 6.2 Constraint Matching as the Killer Feature

No competitor in the private chef or catering discovery space offers structured constraint matching. The competitive landscape:

| Platform                   | Constraint Handling                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Yelp / Google              | Keyword search only ("gluten-free restaurant"). No verification.                                    |
| Spokin / Fig / AllergyEats | Restaurant-focused. Community reviews. No chef matching.                                            |
| Thumbtack / Bark           | Generic service marketplace. Free-text description of needs. No structured dietary matching.        |
| Meal kit services          | Pre-designed plans (keto, vegetarian). No per-guest customization.                                  |
| **ChefFlow (potential)**   | Structured constraint profiles, verified event history, per-guest matching, chef competency scoring |

### 6.3 The Trust Angle

The most powerful feature ChefFlow can build is trust through verified history:

> "This chef has successfully cooked 47 nut-free meals across 23 events with zero reported incidents."

This kind of statement is impossible on any existing platform because:

1. No platform tracks per-event dietary constraint handling
2. No platform connects completed events back to the chef's profile as verified competency
3. No platform allows clients to confirm that their constraints were properly handled post-event

ChefFlow already captures the data needed to generate these trust signals. The constraint matching feature does not require new data collection; it requires surfacing data the platform already gathers.

### 6.4 Revenue Implications

Constrained eaters represent a premium market:

- They spend more (the "allergy tax" means they are accustomed to paying premiums for safety)
- They search harder (average search time for safe dining options is significantly longer than for unconstrained eaters)
- They have higher loyalty (once they find a trusted provider, switching costs are very high because trust is hard to rebuild)
- They refer aggressively (word of mouth is the primary discovery channel, meaning satisfied constrained clients become organic growth engines)

A platform that solves constraint matching captures a market that:

- Is 85+ million people deep (hard constraints only)
- Has $370+ billion in annual economic impact (food allergy costs alone)
- Is growing (allergy prevalence increasing, dietary pattern adoption rising from 36% to 54% of Americans in six years)
- Is underserved (zero platforms address private chef constraint matching)

### 6.5 Implementation Path

ChefFlow's constraint matching can be built in phases:

**Phase 1: Chef constraint tags (low effort)**

- Chefs self-report their dietary competencies (allergen-free cooking, halal, kosher, vegan, etc.)
- Tags are displayed on chef profiles
- Clients can filter by constraint tags

**Phase 2: Verified constraint history (medium effort)**

- Completed events with dietary constraint data feed back into chef profiles
- "Verified: 47 nut-free meals" badges appear on profiles
- Client post-event confirmation: "Were your dietary needs properly handled?"

**Phase 3: Multi-guest constraint solver (high effort)**

- Event creation includes per-guest constraint entry
- Platform computes the constraint intersection
- Matching algorithm ranks chefs by: constraint coverage, verified history, proximity, availability
- Chef receives a structured constraint brief for the event

**Phase 4: Trust scoring and safety record (highest value)**

- Composite safety score based on verified constraint handling across all events
- Incident reporting mechanism (if an allergen issue occurs, it is recorded)
- Insurance-grade documentation for chef liability coverage
- "ChefFlow Certified Allergen-Safe" designation for chefs meeting threshold criteria

---

## 7. Key Takeaways

1. **The constrained eater market is massive and growing.** Over 85 million Americans have hard dietary constraints. Over 170 million follow some form of dietary pattern. Prevalence is increasing across all categories.

2. **Current discovery completely fails for private chef and catering services.** Every existing tool (Spokin, Fig, AllergyEats) focuses exclusively on restaurants. No platform addresses the private chef constraint matching problem.

3. **The stakes are literally life and death.** 3.4 million ER visits per year, 150-200 deaths annually, and high-profile lawsuits demonstrate that inadequate allergen communication kills people. A platform that provides verified constraint handling saves lives.

4. **Constrained eaters are a premium, high-loyalty market.** They pay more (gluten-free foods cost 79-242% more), search harder, and once they find a trusted provider, they stay and refer aggressively.

5. **ChefFlow already captures the data needed.** Per-client dietary tracking and per-event constraint documentation are already in the system. The constraint matching feature surfaces existing data as a discovery and trust mechanism.

6. **Constraint matching is the most defensible competitive moat.** A marketplace competitor can copy chef profiles and booking flows. They cannot replicate a verified track record of 10,000+ constraint-safe meals across hundreds of chefs. That data only accumulates through platform usage over time.

---

## Sources

- [FARE Food Allergy Facts and Statistics](https://www.foodallergy.org/resources/facts-and-statistics)
- [CDC/NCHS Allergy Prevalence Report (January 2026)](https://www.cdc.gov/nchs/pressroom/releases/20260108.html)
- [Beyond Celiac: Celiac Disease Facts and Figures](https://www.beyondceliac.org/celiac-disease/facts-and-figures/)
- [NYU Langone: One-Third of Americans Trying to Avoid Gluten](https://nyulangone.org/news/one-third-americans-are-trying-avoid-gluten-it-villain-we-think-it-is)
- [CDC National Diabetes Statistics Report](https://www.cdc.gov/diabetes/php/data-research/index.html)
- [2024 IFIC Food and Health Survey](https://ific.org/research/2024-food-health-survey/)
- [ISPU: Halal Preferences Among U.S. Muslims](https://ispu.org/halal-preferences/)
- [North America Halal Food Market Report](https://finance.yahoo.com/news/north-america-halal-food-market-094300922.html)
- [JAMA Pediatrics: Economic Impact of Childhood Food Allergy](https://jamanetwork.com/journals/jamapediatrics/fullarticle/1738764)
- [Societal Economic Burden of Food Allergy (2025)](https://www.tandfonline.com/doi/full/10.1080/13696998.2025.2563462)
- [Gluten-Free Food Cost Studies (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11815601/)
- [Columbia University: Persistent Economic Burden of Gluten-Free Diet](https://celiacdiseasecenter.columbia.edu/wp-content/uploads/2019/07/2019-Persistent-Economic-Burden-of-the-Gluten-Free-Diet.pdf)
- [ServSafe Allergens Certification](https://www.servsafe.com/ServSafe-Allergens/Get-Certified)
- [ServSafe: States Requiring Allergen Training](https://www.servsafe.com/Allergens-Microsite/Current-States)
- [The Hartford: Private Chef Insurance](https://www.thehartford.com/business-insurance/private-chef-insurance)
- [ChefInsurance.com: Cross-Contamination Risks](https://chefinsurance.com/resources/f/risky-business-part-4-food-cross-contamination)
- [Food Allergy Liability Insurance (Horton Group)](https://www.thehortongroup.com/resources/food-allergy-liability-insurance-protection/)
- [Spokin App](https://www.spokin.com/about-the-spokin-app)
- [Fig Food Scanner](https://apps.apple.com/us/app/fig-food-scanner-discovery/id1564434726)
- [AAFA: My Life with Food Allergy Report](https://aafa.org/asthma-allergy-research/our-research/my-life-with-food-allergy-report/)
- [Allergic Living: Disney Allergy Death Case](https://www.allergicliving.com/2025/01/04/vegas-lawsuit-claims-negligence-led-to-allergic-diners-tragedy/)
- [SnackSafely: Restaurant Anaphylaxis Lawsuits](https://snacksafely.com/2025/01/family-sues-vegas-restaurant-for-anaphylactic-death-longhorn-sued-for-landing-diner-in-er-trigger-warning/)
- [Keto Diet Statistics (Bodyketosis)](https://bodyketosis.com/keto-diet-statistics/)
- [Vegetarian Statistics 2026 (World Animal Foundation)](https://worldanimalfoundation.org/advocate/vegetarian-statistics/)
- [HelloFresh Dietary Requirements FAQ](https://hellofreshusa.zendesk.com/hc/en-us/articles/360000466247)
- [Cross-Cultural Event Catering Guide (Caterease)](https://www.caterease.com/cross-cultural-event-catering-understanding-global-dietary-preferences/)
- [South Asian Wedding Catering Mistakes (District Events)](https://www.districtecm.com/blog/2025/11/21/south-asian-wedding-catering-7-mistakes-youre-making-when-planning-your-menu-and-how-to-fix-them)
