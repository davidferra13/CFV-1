# Research: Recipe Scaling and Recipe Import Features

**Date:** 2026-03-15
**Purpose:** Competitive analysis, technical landscape, and implementation guidance for recipe scaling and recipe import features in chef software.

---

## PART 1: RECIPE SCALING

### 1.1 How Competitors Handle Recipe Scaling

**meez** (https://www.getmeez.com)

- Instant batch size adjustment with built-in unit conversions, yield percentages, and ingredient scaling
- Staff make exactly what they need, reducing waste and keeping prep consistent
- Users report $30K-$50K annual COGS reduction from better scaling/costing
- Limitation: some users wish they could mark certain ingredients as percentage-based (don't change when scaling)
- Copy/paste importer gets costed recipes live in 3 days or less

**ChefTec** (https://www.cheftec.com)

- Store, scale, and size unlimited recipes
- Instantly analyze recipe and menu costs by portion size or yield
- Update prices and modify ingredients across all recipes with one action
- Cost entire catering jobs in minutes using current, low, high, and average ingredient pricing
- Three tiers: Basic (single profit center), Plus (5 profit centers, POS/QuickBooks integration), Ultra (full enterprise)

**Traqly** (https://www.gotraqly.com)

- Built for private chefs and catering teams specifically
- Menu library to save and reuse signature dishes and event menus
- Integrated proposals, menus, clients, events, and payments
- No detailed recipe scaling information publicly available; appears more event/ops focused than recipe-centric

**MasterCook**

- Mature desktop software with .mxp/.mx2 export formats
- Recipe scaling exists but details not well documented publicly
- Considered the "gold standard" for recipe export format (.mx2)
- Primarily consumer/prosumer, not professional kitchen focused

**Modernmeal** (https://www.modernmeal.com)

- Meal planning for culinary and health professionals
- Import from Menu Magic, MacGourmet, MasterCook (PC/MAC), Paprika, ShopnCook
- Instant detailed nutritional information for any recipe imported or created
- Customer data import from CSV (service history, notes, favorites, dietary restrictions)

### 1.2 Scaling Algorithms

**Linear Scaling (Simple Multiplier)**

- Multiply all ingredients by (desired servings / original servings)
- Works well for: bulk ingredients (flour, sugar, liquids in savory cooking)
- Fails for: seasonings, leavening, gelatin, thickeners

**Baker's Percentage (Modernist Cuisine Method)**

- Every ingredient expressed as a percentage of the base ingredient (usually flour)
- Base ingredient = 100%
- To scale: (new desired yield) / (sum of all percentages) = conversion factor
- Multiply each ingredient's percentage by conversion factor
- Modernist Cuisine uses this as its primary scaling method
- Key insight: always scale by weight, never by volume (volume measurements are rounded to nearest spoon/cup)

**Non-Linear Scaling Categories**

Ingredients fall into four distinct categories with different scaling behaviors:

| Category      | Scaling Rule                                              | Examples                                               |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| **Bulk**      | Linear (direct multiplier)                                | Flour, butter, milk, meat, vegetables                  |
| **Flavor**    | Sub-linear (start at 1.5x when doubling, adjust to taste) | Salt, pepper, spices, herbs, acids, hot sauce          |
| **Structure** | Sub-linear (~75% of linear rate)                          | Baking soda, baking powder, yeast, gelatin, thickeners |
| **Finishing** | Always adjust to taste, no formula                        | Garnish, fresh herbs, finishing oil, zest              |

**Specific non-linear rules:**

- Seasoning: when doubling, use 1.5x, then taste-adjust. When tripling, use ~2.5x
- Leavening: scales at roughly 75% of linear rate. Double batch = ~1.5x leavening; triple = ~2.5x
- Yeast: absolutely NOT proportional when scaling bread recipes
- Evaporation: larger batches increase evaporation rates, concentrating flavors unevenly; liquids need mid-cook adjustment
- Cooking time: does NOT scale (pasta takes 10 min whether 200g or 800g)
- Temperature: may need REDUCTION when scaling up (larger surface area in bigger pans/vessels)

### 1.3 Edge Cases Chefs Complain About

1. **Seasoning doesn't scale linearly** - the #1 complaint. Flavor compounds accumulate and interact differently at volume. Cold foods taste less salty than hot foods
2. **Leavening agents cause metallic taste or collapse** when scaled linearly (too much CO2 production)
3. **Volume measurements break at scale** - a "pinch" of salt for 4 servings vs. 40 servings is meaningless. Professional scaling must use weight
4. **Equipment constraints** - larger batches may not fit in the same pan, changing cook dynamics entirely
5. **Staged seasoning** - larger batches often require adding salt/spices in phases rather than all at once
6. **Baker's percentage confusion** - not intuitive for savory cooks who never learned it
7. **Sub-recipes don't cascade** - scaling a dish that uses a sauce recipe doesn't always scale the sauce correctly
8. **Temperature changes with scale** - wedding cake layers: each larger layer cooks faster at same temp (larger surface area), so temp must decrease but time must increase

### 1.4 Professional Kitchen Standard Approach

CIA (Culinary Institute of America) standardized method:

1. **Standardized recipe**: physical/electronic record with recipe name, yield, portion size, ingredients, weight, measure, unit cost, total cost
2. **Yield Percentage**: percentage of as-purchased quantity that is edible. Formula: 100 / yield% = conversion factor
3. **Edible Portion (EP) Cost**: cost of usable portion after trimming, peeling, cooking, processing
4. **Q Factor**: 5-10% markup for hidden costs (disposables, waste, accompaniments, condiments)
5. **Waste Factor**: 5-15% depending on ingredient perishability (5-10% standard, 15% for highly perishable)

Industry food cost targets:

- Sit-down restaurants: 30-35%
- Caterers/banquets: 25-30%
- Fast casual: 25-30%

### 1.5 Open-Source Recipe Scaling Libraries

**JavaScript/npm:**

| Package                       | What It Does                                   | Notes                                                                        |
| ----------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `scale-recipe`                | Scales ingredient list + smart unit conversion | Converts units up/down automatically (tsp -> tbsp -> cup)                    |
| `recipe-ingredient-parser-v3` | NLP parsing of ingredient strings              | Returns {quantity, unit, ingredient, minQty, maxQty}. Multi-language support |
| `recipe-ingredient-parser-v2` | Earlier version, uses Natural NLP library      | Stable, well-tested                                                          |
| `parse-ingredient`            | Parses ingredient string to structured object  | Used by recipe-scrapers package                                              |
| `measuring-cup`               | Cooking unit converter (cups, tbsp, oz, etc.)  | Zero dependencies, simple API                                                |
| `recipe-unit-converter`       | Unit conversion including cooking units        | Supports tsp, Tbs, fl-oz, cup, pnt, qt, gal, ea, dz plus metric              |
| `convert-units`               | General unit conversion library                | Not cooking-specific but comprehensive                                       |
| `cooking-converter`           | Cooking measurement conversion                 | JS library for cooking measures                                              |

**Python (reference):**
| Package | What It Does | Notes |
|---------|-------------|-------|
| `recipe-scrapers` (hhursev) | Scrapes 620+ recipe websites | The gold standard. TypeScript port exists as npm `recipe-scrapers` |
| `scrape-schema-recipe` | Extracts schema.org/Recipe from HTML | Microdata/JSON-LD into Python dicts |

### 1.6 Scaling and Food Costing Interaction

**Yield Percentage Impact:**

- Raw ingredient cost != recipe cost. Must account for trim waste, cooking loss
- Example: buying 10 lbs of carrots at $1/lb but yield% is 85% means EP cost is $1.18/lb
- Scaling up amplifies this: 100 lbs of carrots at 85% yield = 15 lbs of waste

**Bulk Discount Thresholds:**

- No standard library handles this; it's vendor-specific
- Typical approach: price breaks at case quantities (e.g., per-pound price drops when buying full case of 25 lbs)
- Implementation pattern: ingredient cost table with quantity tiers

**Waste Factors by Category:**

- Standard produce: 5-10%
- Highly perishable (seafood, herbs, berries): 15%
- Shelf-stable (flour, sugar, oil): 2-3%
- Scaling changes waste profiles: larger batches have proportionally less trim waste but more spoilage risk

---

## PART 2: RECIPE IMPORT

### 2.1 Modernmeal's Import System

**Supported Import Sources:**

- Menu Magic, MacGourmet, MasterCook (PC and MAC), Paprika, ShopnCook
- Uses an importer tool accessible from user's profile page
- Process: select source platform, click "find & import"
- Import time varies with database size and image count (up to 30 minutes)
- Auto-matches nutritional data without manual entry
- Also imports customer data from CSV files

**No public evidence of a web scraper/URL import feature.** Modernmeal focuses on file-based imports from other recipe management software, not scraping recipe websites.

### 2.2 Recipe Import Formats

| Format              | Extension        | Structure                         | Used By                     | Notes                                                       |
| ------------------- | ---------------- | --------------------------------- | --------------------------- | ----------------------------------------------------------- |
| **MasterCook MXP**  | .mxp             | Plain text, column-based          | MasterCook, widely exported | Considered gold standard for interop                        |
| **MasterCook MX2**  | .mx2             | XML-based                         | MasterCook 24+              | More structured than MXP                                    |
| **Paprika**         | .paprikarecipes  | Zip of gzipped JSON files         | Paprika Recipe Manager      | Each recipe is a JSON object once unzipped/ungzipped        |
| **MealMaster**      | .txt, .mmf, .mm  | Strict column-based plain text    | MealMaster (1990s BBS era)  | Huge legacy archive, fragile to parse                       |
| **Cooklang**        | .cook            | Plain text with inline markup     | Cooklang ecosystem          | Open source, growing. @ingredient, #cookware, ~timer syntax |
| **JSON-LD**         | embedded in HTML | schema.org/Recipe structured data | Most modern recipe websites | Google's recommended format                                 |
| **CookBook**        | .zip of .yaml    | YAML files in zip                 | CookBookApp                 | Simple, readable                                            |
| **Living Cookbook** | .fdx             | Proprietary XML                   | Living Cookbook             | Windows desktop software                                    |
| **RecipeKeeper**    | various          | Proprietary                       | Recipe Keeper app           | Limited export options                                      |

**Cooklang deserves special attention:**

- Open-source markup language for recipes (https://cooklang.org)
- Syntax: `@flour{2%cups}` for ingredients, `#pot{}` for cookware, `~{25%minutes}` for timers
- YAML front matter for metadata
- Automatic shopping lists, scaling, and timer extraction
- Files are plain text you own forever, no vendor lock-in
- Growing ecosystem of parsers and tools
- Spec on GitHub: https://github.com/cooklang/spec

### 2.3 URL-Based Recipe Import (How It Works)

**The schema.org/Recipe standard:**

- Most recipe websites embed structured data in JSON-LD format in the page's `<head>` or `<body>`
- Required properties: name, image, URL
- Common properties: recipeIngredient (array of strings), recipeInstructions, cookTime, prepTime, recipeYield, nutrition
- Google requires this for recipe rich results in search

**Three markup formats for recipes on websites:**

1. **JSON-LD** (recommended by Google) - embedded `<script type="application/ld+json">` block
2. **Microdata** - HTML attributes (`itemscope`, `itemprop`) embedded in page elements
3. **RDFa** - Less common, attribute-based

**How scrapers extract recipes:**

1. Fetch the page HTML
2. Look for JSON-LD blocks with `@type: "Recipe"`
3. If not found, look for Microdata/RDFa with Recipe schema
4. If not found, attempt heuristic HTML parsing (unreliable)
5. Parse ingredient strings into structured objects (quantity, unit, ingredient name)

### 2.4 Common Failures and Complaints About Recipe Import

**Technical failures:**

1. **No structured data** - many recipe blogs, especially older ones, lack schema.org markup entirely. Scraper returns nothing
2. **Inconsistent/broken schema** - sites have schema.org markup but with errors (missing required fields, wrong nesting, mismatched types)
3. **JavaScript-rendered content** - recipe data loaded via JS frameworks (React, Vue SPAs) isn't visible in raw HTML fetch
4. **Site layout changes** - scrapers relying on CSS selectors break when sites redesign
5. **Rate limiting/blocking** - sites detect scraping and block requests
6. **Ingredient parsing failures** - NLP parsers struggle with: ranges ("2-3 cups"), alternatives ("butter or margarine"), preparation notes ("1 cup flour, sifted"), Unicode fractions, brand names

**User complaints:**

1. **Works on some sites but not others** - no scraper covers every site
2. **Loses formatting** - imported recipes lose step numbering, section headers, notes
3. **Ingredient quantities wrong** - parser misreads fractions, ranges, or compound measurements
4. **No photos imported** - many scrapers skip images or fail to download them
5. **Handwritten recipes** - copy/paste importers useless for handwritten recipe collections
6. **Duplicate detection** - importing same recipe twice creates duplicates
7. **Sub-recipe references lost** - "use the sauce from recipe X" doesn't translate

### 2.5 Open-Source Recipe Parsers and Scrapers

**npm Packages (JavaScript/TypeScript):**

| Package                       | Stars/Downloads                   | What It Does                                                                               |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `recipe-scrapers` (npm)       | TypeScript port of Python library | Scrapes recipe URLs, returns structured data. Zod validation. parse-ingredient integration |
| `recipe-scraper` (npm)        | Lightweight                       | Accepts URLs, extracts recipe data                                                         |
| `@rethora/url-recipe-scraper` | Lightweight                       | Parses JSON-LD format from URLs or HTML                                                    |
| `@dimfu/recipe-scraper`       |                                   | Supports JSON-LD and microdata schema formats                                              |
| `@jitl/recipe-data-scraper`   |                                   | Recipe data extraction                                                                     |
| `recipe-ingredient-parser-v3` | NLP-based                         | Parses "1 cup flour" into {quantity: 1, unit: "cup", ingredient: "flour"}                  |
| `parse-ingredient`            |                                   | Used internally by recipe-scrapers package                                                 |

**Python Packages (reference/server-side):**

| Package                     | Notes                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| `recipe-scrapers` (hhursev) | **620+ supported sites**, most comprehensive. Active development, great community |
| `scrape-schema-recipe`      | Schema.org/Recipe extraction from HTML (Microdata/JSON-LD)                        |

**The hhursev/recipe-scrapers Python package** is the most mature and comprehensive option with 620+ supported sites. The npm `recipe-scrapers` TypeScript port is inspired by it but has fewer supported sites. For maximum coverage, running the Python scraper as a microservice (or serverless function) and calling it from Node.js is a common pattern.

### 2.6 meez Import and User Feedback

**How meez handles import:**

- "Bulk Add" feature: copy/paste ingredients into left panel, prep method steps into right panel
- Can import from Word docs, Excel, PDFs, and websites
- meez ingredient database auto-matches as you type or paste
- AI-assisted NLP for natural language processing of imported recipes (added ~2025)
- Costed recipes live in 3 days or less from import

**User feedback on meez import:**

- **Positive:** Copy/paste is fast for digital recipes; ingredient database matching works well
- **Negative:** Not helpful for handwritten recipes; conversion/yield modifiers unintuitive; ingredient list is culinary-centric (missing common baking ingredients); limited educational resources for learning import features
- **Pricing concern:** meez is professional-tier pricing ($15-35/user/month), which can be expensive for solo private chefs

### 2.7 Importing from Google Docs/Sheets

**How chefs currently store recipes:**

- Many professional chefs use Google Docs for recipe storage (easy sharing, accessible from any device, printable)
- Google Sheets used for recipe databases with columns for category, prep time, cook time, ingredients, notes
- Some use Notion databases with tags, dropdowns, links, food type filters
- Advanced setups: Sheets with ingredient lookup that auto-pulls prices/units from inventory

**Import challenges:**

- No standard recipe format in Google Docs (every chef formats differently)
- Google Sheets recipes lack standardized column structure
- Docs may contain rich formatting (images, tables, headers) that's hard to parse programmatically
- Google Docs API returns structured document tree (paragraphs, tables, lists) - parseable but requires heuristics
- Google Sheets API returns cell data directly - easier if columns are labeled

**Implementation approaches:**

1. **Google Sheets template** - provide a standardized template (columns: name, yield, ingredients, instructions, category) and import from that
2. **AI-assisted parsing** - paste Google Doc content, use LLM to extract recipe structure (but violates Formula > AI rule if deterministic approach exists)
3. **Copy/paste with NLP** - like meez, let chefs paste text and parse it with ingredient parser libraries
4. **Google Drive API integration** - connect to Drive, list Docs/Sheets, auto-import with user guidance on mapping

---

## PART 3: PHOTO-BASED RECIPE DOCUMENTATION

### 3.1 How meez Handles Step-by-Step Media

**Features:**

- Photos and videos attachable to every prep step
- Slideshow view for step-by-step visual walkthrough
- Upload from photo library (click image icon) or take photo/video directly from phone/tablet
- Video limit: 2 minutes or 200MB per video
- Teams follow recipes on tablets with pictures and step-by-step procedures
- Claims 70% faster staff training with visual recipes

**UX Pattern:**

- Each recipe step has an inline image/video attachment point
- Edit mode: click camera/image icon on any step to add media
- View mode: media displays inline with the step text
- Slideshow mode: full-screen step-by-step with media prominently displayed
- Kitchen teams use tablets, so mobile-first/responsive design is critical

### 3.2 UX Pattern for Attaching Media to Recipe Steps

**Common patterns across recipe apps:**

1. **Inline attachment per step** (meez pattern)
   - Each step has a + or camera icon
   - Click to upload or capture
   - Photo appears below/beside the step text
   - Best for: training-focused apps

2. **Gallery at recipe level** (Tandoor, Mealie pattern)
   - Photos attached to recipe as a whole, not individual steps
   - Simpler implementation, fewer storage requirements
   - Best for: home cooking apps

3. **Step-level media with drag-and-drop** (advanced)
   - Drag photos from a staging area onto specific steps
   - Reorder media within steps
   - Best for: professional documentation

**For ChefFlow, the meez pattern (inline per-step) is the most valuable** because private chefs need to train household staff, leave clear instructions for client kitchens, and document plating for consistency.

### 3.3 Storage Considerations for Recipe Media

**Supabase Storage (current stack):**

- Pro Plan required for image transformations (resize, format conversion, quality adjustment)
- Free plan: 50MB max file upload; Pro plan: up to 500GB
- Smart CDN with automatic caching at edge locations
- Image transformations: resize (cover/contain/fill modes), quality control (20-100, default 80), automatic format selection (AVIF > WebP > JPEG)
- Charged per distinct image transformed during billing period
- Can chain transformations: resize + quality + format in single request

**Best practices for recipe photos:**

1. **Upload originals to Supabase Storage** in a `recipe-media/` bucket
2. **Serve transformed versions** via Supabase image transformations (no need to pre-generate thumbnails)
3. **Recommended sizes:**
   - Thumbnail (recipe list): 300px wide, q=60
   - Step view (tablet): 800px wide, q=80
   - Full resolution (zoom): original, q=90
4. **Format:** Let Supabase auto-select (AVIF for modern browsers, WebP fallback, JPEG for legacy)
5. **Compression impact:** typical 40-70% reduction in file size with Next.js image optimization
6. **Video:** Store in same bucket, set reasonable limits (30s or 60s, 50MB max)

**Cost considerations:**

- Storage: included in Supabase plan (8GB free, 100GB on Pro)
- Bandwidth: included (2GB free, 250GB on Pro)
- Transformations: charged per unique image (not per request due to CDN caching)
- For a solo private chef with 200 recipes, each with 3-5 photos: ~1-3GB storage, well within limits

**Alternative: Cloudinary or ImageKit**

- More sophisticated image/video processing (AI cropping, background removal, face detection)
- Higher cost but more features
- Unnecessary for ChefFlow's use case; Supabase Storage is sufficient

---

## PART 4: KEY TAKEAWAYS FOR CHEFFLOW

### Recipe Scaling Implementation Priorities

1. **Start with linear scaling** - it covers 80% of use cases for private chefs (savory cooking, not baking)
2. **Add ingredient categories** - let chefs tag ingredients as bulk/flavor/structure/finishing so the system can apply appropriate scaling rules
3. **Always use weight** - store all ingredient quantities in grams internally; display in user-preferred units
4. **Yield percentage per ingredient** - critical for accurate food costing at scale
5. **Sub-recipe scaling** - a menu item referencing a sauce recipe must cascade the scale factor

### Recipe Import Implementation Priorities

1. **URL import via schema.org/Recipe** - use the `recipe-scrapers` npm package (TypeScript) as the primary scraper
2. **Copy/paste with NLP parsing** - use `recipe-ingredient-parser-v3` to parse pasted ingredient lists
3. **File import** - support Paprika (.paprikarecipes = zip of gzipped JSON) and MasterCook (.mxp) as the two most common export formats
4. **Google Sheets template** - provide a downloadable template for chefs to structure their recipes, then import via Sheets API or CSV upload
5. **Don't build a custom scraper** - use existing libraries; maintaining site-specific scrapers is a maintenance nightmare

### Recipe Media Priorities

1. **Per-step photo attachment** - meez pattern, inline with each step
2. **Supabase Storage** - already in the stack, sufficient for the use case
3. **Mobile capture** - camera icon on each step for direct phone/tablet capture
4. **Reasonable limits** - 10 photos per recipe, 5MB per photo (auto-compressed), 60s video per step

---

## Sources

- [Traqly - Private Chef & Catering Software](https://www.gotraqly.com/)
- [meez Recipe Management Software](https://www.getmeez.com)
- [meez - Adding images and videos to recipes](https://intercom.help/getmeez/en/articles/4564815-adding-images-and-videos-to-recipes)
- [meez Software Reviews - Software Advice](https://www.softwareadvice.com/retail/meez-profile/)
- [meez Software Reviews - Capterra](https://www.capterra.com/p/246573/meez/)
- [meez Review - Nerdisa](https://nerdisa.com/getmeez/)
- [Four Ways Meez Makes Recipe Management Easier - Chefs Roll](https://chefsroll.com/features/toolsofthetrade/four-ways-meez-makes-recipe-management-easier/)
- [ChefTec Plus Product Information](https://www.cheftec.com/cheftec-plus)
- [ChefTec Ultra Foodservice Management Software](https://www.cheftec.com/recipe-costing)
- [Modernmeal - How to Import Recipe Database](https://modernmeal.freshdesk.com/support/solutions/articles/6000115847-how-do-i-import-my-current-recipe-database)
- [MasterCook MXP Files](https://support.mastercook.com/hc/en-us/articles/29711288560020-MXP-Files)
- [How to Scale a Recipe - Modernist Cuisine](https://modernistcuisine.com/mc/how-to-scale-a-recipe/)
- [Baker's Percentage - King Arthur Baking](https://www.kingarthurbaking.com/pro/reference/bakers-percentage)
- [How to Scale Recipes Without Mistakes - Cooklang](https://cooklang.org/blog/26-how-to-scale-recipes-without-mistakes/)
- [Cooking for a Crowd - Escoffier](https://www.escoffier.edu/blog/recipes/cooking-for-a-crowd-techniques-for-scaling-recipes/)
- [How Chefs Scale Up Dishes - Chemistry World](https://www.chemistryworld.com/opinion/how-chefs-scale-up-dishes-without-sacrificing-taste/2500015.article)
- [Do All Ingredients Scale Linearly? - Quora](https://www.quora.com/Do-all-ingredients-scale-linearly-in-recipes)
- [CIA Kitchen Calculations](https://www.ciachef.edu/wp-content/uploads/2024/07/kitchen-calculations.pdf)
- [Calculating Food Cost - The Culinary Pro](https://www.theculinarypro.com/calculating-food-cost)
- [Recipe and Menu Costing - Penn State](https://psu.pb.unizin.org/hmd329/chapter/ch7/)
- [A Chef's Guide to Accurate Recipe Costing - meez Blog](https://www.getmeez.com/blog/a-chefs-guide-to-accurate-recipe-costing)
- [Cooklang - Recipe Markup Language](https://cooklang.org/)
- [Cooklang Specification](https://cooklang.org/docs/spec/)
- [Recipe File Formats Compared - Cooklang](https://cooklang.org/blog/19-recipe-formats-compared/)
- [schema.org/Recipe Type](https://schema.org/Recipe)
- [Paprika Export Formats](https://paprikaapp.zendesk.com/hc/en-us/articles/360051324613-What-export-formats-do-you-support)
- [Tandoor Import/Export](https://docs.tandoor.dev/features/import_export/)
- [hhursev/recipe-scrapers (Python)](https://github.com/hhursev/recipe-scrapers)
- [recipe-scrapers Supported Sites](https://docs.recipe-scrapers.com/getting-started/supported-sites/)
- [recipe-scrapers npm (TypeScript)](https://www.npmjs.com/package/recipe-scrapers)
- [recipe-ingredient-parser-v3 npm](https://www.npmjs.com/package/recipe-ingredient-parser-v3)
- [scale-recipe npm](https://github.com/rviscomi/scale-recipe)
- [parse-ingredient npm](https://www.npmjs.com/package/parse-ingredient)
- [measuring-cup npm](https://github.com/cgatno/measuring-cup)
- [recipe-unit-converter npm](https://www.npmjs.com/package/recipe-unit-converter)
- [convert-units npm](https://github.com/convert-units/convert-units)
- [Supabase Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing)
- [Supabase Storage v2 - Image Resizing and Smart CDN](https://supabase.com/blog/storage-image-resizing-smart-cdn)
- [Mealie GitHub](https://github.com/mealie-recipes/mealie)
- [Tandoor Recipes](https://tandoor.dev/)
- [Best Open Source Recipe Managers 2026 - Cooklang](https://cooklang.org/blog/18-open-source-recipe-managers-2026/)
- [What Do You Use to Record Recipes? - ChefTalk](https://www.cheftalk.com/threads/what-do-you-use-to-record-your-recipes.117087/)
- [Google Docs as Recipe Organizer](https://food.thefuntimesguide.com/recipe_organizer_software/)
