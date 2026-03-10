# Public Data / Asset Scan - 2026-03-10

This memo maps current ChefFlow surfaces to public datasets and reusable assets that can improve the product without inventing content or scraping closed platforms.

## Highest-value additions

1. USDA food data for ingredients, packaged products, and nutrition
2. USDA market pricing and local food directories for sourcing and vendor insights
3. Census + NOAA/EPA location and weather layers for directory quality and event planning
4. FDA allergen and recall data for safety signals
5. Openly licensed imagery for marketing pages, blog covers, and empty states

## Best immediate fits in this repo

- `app/(chef)/culinary/ingredients/seasonal-availability/page.tsx`
  - Current state: seasonality is guessed from ingredient-name keywords.
  - Upgrade path: replace heuristic groupings with USDA-backed ingredient metadata plus a maintained seasonal lookup table by region.

- `lib/food-truck/weather-demand-actions.ts`
  - Current state: uses Open-Meteo forecast data only.
  - Upgrade path: keep the forecast source if desired, but add official NWS alerts and AirNow AQI for outdoor-service risk.

- `app/(public)/chefs/page.tsx`
  - Current state: directory filters rely on free-text city/state coverage from partner locations.
  - Upgrade path: normalize coverage with Census geocoding and geography layers.

- `lib/marketing/customer-stories.ts`
  - Current state: intentionally empty until approved real stories exist.
  - Upgrade path: do not fill this with public reviews or scraped testimonials. Use licensed photography and public industry stats elsewhere until first-party approvals exist.

## Source catalog

### 1. USDA FoodData Central

- Links:
  - https://fdc.nal.usda.gov/api-guide
  - https://fdc.nal.usda.gov/download-datasets/
  - https://fdc.nal.usda.gov/data-documentation/
- Why it fits:
  - Foundation foods, branded foods, nutrient detail, portion data, and downloadable datasets.
- Useful facts:
  - Public domain / CC0.
  - API key required via `data.gov`.
  - Default limit noted by USDA: 1,000 requests/hour/IP.
  - Branded foods update monthly; foundation foods release on a slower cadence.
- ChefFlow uses:
  - Ingredient detail enrichment
  - Nutrition badges on recipe / menu pages
  - Better product normalization for inventory and commerce imports

### 2. Open Food Facts

- Links:
  - https://openfoodfacts.github.io/documentation/docs/
  - https://openfoodfacts.github.io/openfoodfacts-js/
  - https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/
- Why it fits:
  - Barcode-oriented product data, allergens, additives, ingredients, product images, and an official JS/TS SDK.
- Useful facts:
  - Database is under ODbL.
  - Product images are under CC BY-SA.
  - Official guidance says reusers must comply with attribution / share-alike obligations and contribute back data they add.
- ChefFlow uses:
  - Barcode lookup for packaged products
  - Vendor catalog import assistance
  - Product thumbnails and label extraction support

### 3. USDA My Market News / MARS API

- Links:
  - https://mymarketnews.ams.usda.gov/mymarketnews-api
  - https://mymarketnews.ams.usda.gov/mars-api/getting-started
  - https://mymarketnews.ams.usda.gov/mars-api/getting-started/technical-instructions
  - https://mymarketnews.ams.usda.gov/general-resources
- Why it fits:
  - USDA pricing and market reports for specialty crops, retail, terminal, shipping point, trends, and more.
- Useful facts:
  - Requires a My Market News account and personal API key.
  - Official endpoint documented by USDA: `https://marsapi.ams.usda.gov/`.
  - Specialty crops coverage includes terminal, shipping point, retail, trends, and truck-rate resources.
- ChefFlow uses:
  - Vendor price alerts
  - Food-cost dashboard benchmarks
  - Seasonal sourcing intelligence

### 4. USDA Local Food Directories

- Links:
  - https://www.ams.usda.gov/local-food-directories/farmersmarkets
  - https://www.ams.usda.gov/services/local-regional/food-directories
  - https://www.usda.gov/about-usda/policies-and-links/digital/developer-resources
- Why it fits:
  - Farmers markets and local-food operation listings with locations, hours, payments, and product availability.
- Useful facts:
  - AMS explicitly notes an API is available for developers.
  - USDA currently describes the national directory as covering over 8,600 farmers markets nationwide.
- ChefFlow uses:
  - Procurement suggestions near event locations
  - Local-farm / market recommendations for chefs
  - "Source local nearby" UX in seasonal-availability and vendor flows

### 5. FDA allergen guidance

- Links:
  - https://www.fda.gov/food/food-labeling-nutrition/food-allergies
  - https://www.fda.gov/food/food-allergies/faster-act-sesame-ninth-major-food-allergen
- Why it fits:
  - Official U.S. allergen definitions and labeling rules.
- Useful facts:
  - FDA recognizes 9 major allergens.
  - Sesame became the 9th major allergen effective January 1, 2023.
- ChefFlow uses:
  - Canonical allergen dictionary
  - Label parsing / warning UI
  - Compliance copy on dietary and guest-safety flows

### 6. openFDA food enforcement reports

- Links:
  - https://open.fda.gov/apis/food/enforcement/
  - https://open.fda.gov/apis/food/enforcement/how-to-use-the-endpoint/
  - https://open.fda.gov/apis/authentication/
- Why it fits:
  - Weekly food recall enforcement data with structured query support.
- Useful facts:
  - Covers publicly releasable records from 2004-present.
  - Updated weekly.
  - No key: 240 requests/minute and 1,000/day/IP.
  - With key: 240 requests/minute and 120,000/day/key.
  - FDA warns this should not be used by itself to issue public alerts or track recall lifecycle completion.
- ChefFlow uses:
  - Internal recall flags on products / vendors
  - Safety banner on packaged inventory imports
  - Operations inbox alerts for affected items

### 7. U.S. Census Geocoder and TIGER geography

- Links:
  - https://www.census.gov/data/developers/data-sets/Geocoding-services.html
  - https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
  - https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/census-geocoder.html
  - https://tigerweb.geo.census.gov/tigerwebmain/TIGERweb_main.html
- Why it fits:
  - Free address normalization, lat/lng, and geography lookup for U.S. locations.
- Useful facts:
  - Supports single-record and batch geocoding.
  - Census documents the Geocoder for up to 10,000-address batches.
  - U.S., Puerto Rico, and U.S. Island Areas only.
- ChefFlow uses:
  - Normalized chef service areas
  - Better public chef directory search facets
  - Reliable event / venue geographies for analytics and travel planning

### 8. National Weather Service API

- Links:
  - https://www.weather.gov/documentation/services-web-api
  - https://www.weather.gov/documentation/services-web-alerts
- Why it fits:
  - Official forecasts, alerts, and observations for U.S. operations.
- Useful facts:
  - Open data and free to use.
  - Requires a descriptive `User-Agent`.
  - Official API base: `https://api.weather.gov`.
- ChefFlow uses:
  - Weather-risk overlays on food truck pages
  - Severe weather alerts for outdoor events
  - Operations warnings before travel / setup

### 9. AirNow API

- Links:
  - https://docs.airnowapi.org/
  - https://www.airnow.gov/about-airnow
- Why it fits:
  - AQI forecast and observed air-quality data for outdoor service decisions.
- Useful facts:
  - Public account access is available.
  - AirNow data is intended for AQI reporting and forecasting, not regulatory use.
  - AirNow reports current / forecast air quality for hundreds of cities and receives observations from thousands of monitors.
- ChefFlow uses:
  - Outdoor-event and food-truck operating risk
  - Smoke / air-quality warnings tied to event calendars

### 10. Openverse

- Links:
  - https://docs.openverse.org/
  - https://docs.openverse.org/api/reference/made_with_ov.html
  - https://docs.openverse.org/api/index.html
- Why it fits:
  - Search engine and API for openly licensed public-domain / Creative Commons media.
- Useful facts:
  - Openverse says its API covers over 800 million images and audio tracks.
  - License accuracy should still be verified per asset before use.
- ChefFlow uses:
  - Blog covers
  - Empty-state illustrations
  - Location / seasonal ingredient imagery

### 11. Wikimedia Commons

- Links:
  - https://commons.wikimedia.org/wiki/Commons:Licensing
  - https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
  - https://commons.wikimedia.org/wiki/Commons:Simple_media_reuse_guide
- Why it fits:
  - Huge library of public-domain and freely licensed images, including many ingredient, region, and public-institution photos.
- Useful facts:
  - Commons only accepts free or public-domain media.
  - Reusers still need to verify the license on each file page and check non-copyright restrictions.
- ChefFlow uses:
  - Seasonal ingredient photography
  - Editorial / educational blog assets
  - Public-domain regional imagery

### 12. Pexels and Unsplash

- Links:
  - https://www.pexels.com/license/
  - https://unsplash.com/license
- Why they fit:
  - Fast path to high-quality marketing imagery.
- Useful facts:
  - Both allow broad free use for commercial projects.
  - Pexels and Unsplash both restrict republishing or compiling images into a competing stock-style service.
  - Pexels also warns against implying endorsement and against trademark use.
- ChefFlow uses:
  - Homepage and blog hero visuals
  - Directory empty states
  - Social cards and campaign graphics

### 13. BLS market context for content

- Links:
  - https://www.bls.gov/ooh/food-preparation-and-serving/home.htm
  - https://www.bls.gov/news.release/cesan.nr0.htm
  - https://www.bls.gov/opub/ted/2026/housing-and-transportation-accounted-for-50-percent-of-household-spending-in-2024.htm
- Why it fits:
  - Credible public stats for landing pages, investor materials, and blog posts.
- Useful facts:
  - BLS currently lists 2024 median pay for chefs and head cooks at $60,990 in the Occupational Outlook Handbook.
  - BLS reported 2024 average household food-away-from-home spending at $3,945.
- ChefFlow uses:
  - Citation-backed blog posts
  - Public site trust copy
  - Benchmark callouts in thought-leadership content

## Recommended implementation order

1. FoodData Central + Open Food Facts
2. My Market News + Local Food Directories
3. Census Geocoder + TIGER
4. NWS + AirNow
5. FDA allergen / recall layers
6. Openverse / Pexels / Unsplash / Commons for editorial media

## Things to avoid

- Do not scrape Airbnb, Google Reviews, Yelp, Take a Chef, or similar platforms unless you have a clear contractual right or approved API path.
- Do not use public reviews as substitute customer stories in `lib/marketing/customer-stories.ts`.
- Do not mix ODbL data from Open Food Facts into a proprietary dataset without checking the resulting license obligations.
