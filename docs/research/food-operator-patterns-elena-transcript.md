# Research: Food Operator Patterns from Beta Tester Transcript

> **Date:** 2026-03-31
> **Question:** What universal food operator patterns does a real charcuterie/grazing board business reveal, and what ChefFlow gaps do they expose?
> **Status:** complete

## Origin Context

The developer's friend (a grazing board / charcuterie operator) posted an Instagram story about her Easter offerings. The developer shared the transcript to identify features that would help "every food operator." This is the second message from the same beta tester (first message drove the Chef Opportunity Network spec for hiring/networking). She represents a business archetype ChefFlow doesn't explicitly serve yet: order-driven artisan food production with delivery/pickup fulfillment.

Her words (cleaned up):

> "We're getting in some really exciting products for Easter. The most exciting one is this alpine blossom cheese, a raw cow's milk cheese from Austria with flower petals on the rind. I'm so excited to work with it on graze boards. It feels very brand-aligned. We've got citrus and ginger artisan crisps from Rustic Bakery. We'll have beautiful flowers on all the boards. If you just want to order the Easter specials and don't necessarily need a charcuterie board, you can do that. Pick and choose what you want from the menu. We're offering delivery and pickup. Smaller orders, you can pick up in Kittery at We Feel Good. Delivery for those doing a graze board and a something, a crudite or a quiche."

## Summary

This transcript reveals 6 universal food operator patterns. ChefFlow fully serves 0 of them today. The highest-impact gap is the social-to-order pipeline: food operators use social media to market, then lose customers to manual DM/text ordering. ChefFlow has backend commerce infrastructure (product_projections table, order queue, POS) but zero customer-facing ordering.

## Detailed Findings

### 6 Universal Patterns Identified

#### 1. Seasonal/Holiday Menu Rotation

**What she does:** Creates Easter-specific offerings with spring-themed products. Time-limited availability.

**What exists in ChefFlow:**

- Menus with cuisine type, service style, dates, notes
- No "seasonal" flag, no "available until" date, no "holiday" tag
- No concept of limited-time offerings that auto-expire

**Universal applicability:** Every food business rotates seasonally. Private chefs do seasonal tasting menus. Caterers have holiday packages. Bakeries have Valentine's/Easter/Christmas lines. Food trucks rotate seasonal specials.

**Gap severity:** Low-medium. Could be solved with a `seasonal_tag` and `available_until` date on menus/products.

#### 2. Ingredient Sourcing Stories

**What she does:** "Raw cow's milk cheese from Austria, rind is flower petals." "Citrus and ginger artisan crisps from Rustic Bakery." Every ingredient has a story that IS the marketing.

**What exists in ChefFlow:**

- `ingredients` table: name, category, unit, average_price_cents, is_staple
- `ingredient_price_history`: price tracking from retail chains
- Vendor notes page at `/culinary/ingredients/vendor-notes`
- No narrative/story field, no producer name, no origin/provenance, no "why I chose this"

**Universal applicability:** HIGH. Every artisan food operator differentiates through sourcing. Farm-to-table restaurants, specialty caterers, craft bakers, cheese shops. The story IS the premium.

**Gap severity:** Medium. Adding `sourcing_story`, `producer_name`, `origin` fields to ingredients is straightforward. Making them visible on public menus/products is the harder part (requires public-facing pages).

#### 3. A La Carte Flexibility

**What she does:** "Pick and choose what you want from the menu." Customers can order a full board OR individual items (just the eggs, just the cheese).

**What exists in ChefFlow:**

- Menus are course-structured (Appetizer -> Entree -> Dessert)
- `product_projections` table has individual items with SKU, price, modifiers, inventory
- No customer-facing way to browse or order individual items
- Commerce module exists but is POS-only (staff-facing, not customer-facing)

**Universal applicability:** HIGH. Bakeries sell individual pastries AND custom cakes. Meal prep services sell individual meals AND weekly packages. Caterers offer add-ons beyond the main menu.

**Gap severity:** Medium. The `product_projections` table already models individual items. The gap is customer-facing UI.

#### 4. Multi-Fulfillment (Delivery + Pickup)

**What she does:** Delivery for larger orders, pickup at a specific location (We Feel Good in Kittery) for smaller orders. Order size determines fulfillment options.

**What exists in ChefFlow:**

- `delivery_type` and `delivery_status` enums exist
- Meal-prep archetype has delivery fields (day, window, address, instructions)
- No delivery zones, no distance-based fees, no pickup location management
- No customer-facing fulfillment selection

**Universal applicability:** HIGH. Every food business that isn't a fixed-location restaurant needs delivery/pickup options. Caterers deliver. Meal prep delivers. Bakeries offer both. Food trucks have pickup locations.

**Gap severity:** High. This requires: pickup location CRUD, delivery zone definition, fulfillment selection UI in ordering flow.

#### 5. Social-to-Order Pipeline

**What she does:** Posts Instagram story about products -> customers see it -> they order (presumably via DM, text, or phone). The content IS the sales channel.

**What exists in ChefFlow:**

- Public chef profile at `/chef/[slug]` with "Inquire" button (inquiry flow, not ordering)
- Embed widget for inquiries (not ordering)
- No public product catalog page
- No "order from this chef" flow
- No link between social content and ordering

**Universal applicability:** HIGHEST. This is the #1 pain point for every independent food operator. They post beautiful content on Instagram, customers want to buy, and then... DMs. Texts. Phone calls. Lost orders. No tracking.

**Gap severity:** Critical. This is the gap between "food business management tool" and "food business growth tool." Closing it means: chef creates menu/products in ChefFlow -> gets a public ordering link -> shares on social media -> customers order directly -> order flows into ChefFlow's queue.

#### 6. Composite Product Assembly

**What she does:** A "graze board" = specific cheeses + specific crackers + flowers + arrangement. It's a composed product, not a single ingredient.

**What exists in ChefFlow:**

- Menu components (dishes with sub-ingredients, make-ahead windows, prep offsets)
- Product projections with modifiers (size variants, add-ons)
- No "build a board" or product-assembly UI
- No visual board/plate composition tool

**Universal applicability:** Moderate. Relevant for charcuterie, catering packages, meal kits, custom cakes. Less relevant for private chefs, food trucks.

**Gap severity:** Low. Nice to have, not blocking. Existing menu components can model this.

### Commerce Module Audit

The backend is more ready than expected:

| Table/Feature          | Status  | Notes                                                                                     |
| ---------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `product_projections`  | EXISTS  | Full product catalog with SKU, price, cost, inventory, modifiers, dietary tags, allergens |
| `commerce_orders`      | EXISTS  | Order queue: received -> preparing -> ready -> picked_up/cancelled                        |
| `commerce_order_items` | EXISTS  | Line items with quantity, unit_price, modifiers                                           |
| `commerce_sales`       | EXISTS  | Sale records with channel tracking (counter, order_ahead, invoice, online, phone)         |
| POS Register           | EXISTS  | In-location sales UI at `/commerce/register`                                              |
| Product management UI  | EXISTS  | `/commerce/products` for CRUD                                                             |
| Public ordering page   | MISSING | No customer-facing catalog or checkout                                                    |
| Online payment         | PARTIAL | Stripe exists for subscriptions, not for product orders                                   |
| Fulfillment management | MISSING | No delivery zones, pickup locations, time slots                                           |

## Gaps and Unknowns

1. **Unknown:** How many other beta testers/prospects have this same pattern (social -> order -> fulfill)? If it's common, this is the highest-ROI feature to build.
2. **Unknown:** Does the developer want ChefFlow to become a Shopify-for-food-operators, or stay focused on ops/management? This transcript pushes toward e-commerce.
3. **Unknown:** Stripe Connect or similar would be needed for multi-chef payment processing if this becomes a marketplace.
4. **Gap:** The archetype system has no "Artisan Producer" or "Charcuterie" option. Closest is Bakery.

## Recommendations

### Quick Wins (could be part of existing specs)

1. **Add `sourcing_story` and `producer_name` fields to ingredients** - quick migration, enriches existing data. Tag: "quick fix"
2. **Add `seasonal_tag` and `available_until` to menus/products** - enables seasonal rotation. Tag: "quick fix"
3. **Add "Artisan/Producer" archetype option** - or rename "Bakery" to "Bakery & Artisan" to cover charcuterie, specialty food producers. Tag: "quick fix"

### Needs a Spec

4. **Public Ordering Page** - The big one. A public-facing `/shop/[chefSlug]` page where customers browse products, add to cart, select fulfillment, and pay. Uses existing `product_projections` + `commerce_orders` tables. This is a P1 spec on its own. Tag: "needs a spec"
5. **Fulfillment Management** - Pickup locations CRUD, delivery zones with fee tiers, time slot management. Prerequisite for or concurrent with #4. Tag: "needs a spec"

### Needs Discussion

6. **E-commerce direction** - Is ChefFlow becoming a Shopify competitor for food operators? The developer needs to decide how far to go. The backend is surprisingly ready, but the customer-facing side is a significant build. Tag: "needs discussion"
