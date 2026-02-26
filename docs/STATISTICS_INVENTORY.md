# ChefFlow Statistics & Measurement Inventory

**Version 1.0 — February 15, 2026**

This document defines every raw data point, derived calculation, aggregation, and time-series metric ChefFlow must track. This inventory drives database schema design, not the other way around.

---

## 1. CLIENT ENTITY

### Raw Data Points

- `client_id` (UUID)
- `chef_id` (tenant)
- `first_name`
- `last_name`
- `email`
- `phone`
- `preferred_contact_method` (text, email, phone, Instagram)
- `acquisition_source` (Take a Chef, referral, Instagram, Google, direct)
- `referral_source_name` (if applicable)
- `created_at` (timestamp)
- `partner_name`
- `children_names` (array)
- `regular_guests` (array) — e.g., Evan and Lindsay always attend with Michel
- `dietary_restrictions` (array)
- `allergies` (array) — NUT ALLERGY flagged permanently
- `dislikes` (array)
- `spice_tolerance` (1-5 scale)
- `favorite_cuisines` (array)
- `favorite_dishes_from_past` (array)
- `wine_beverage_preferences` (text)
- `primary_address`
- `parking_instructions`
- `access_instructions` (e.g., "enter through garage")
- `kitchen_size_constraints` (text)
- `house_rules` (array) — e.g., "no shoes"
- `equipment_available` (array)
- `equipment_must_bring` (array)
- `relationship_vibe` (text notes)
- `tipping_pattern` (generous, standard, none)
- `payment_behavior` (cash, Venmo, always late, etc.)
- `generosity_rating` (1-5)
- `personal_milestones` (birthdays, anniversaries, child births — timestamped)
- `status` (new, active, dormant, repeat-ready, VIP, churned)
- `loyalty_tier` (bronze, silver, gold, platinum — auto-calculated)
- `loyalty_points_balance` (integer)

### Derived Calculations (Per Client)

- `lifetime_revenue` = SUM(all event payments for this client)
- `lifetime_tips` = SUM(all tips for this client)
- `lifetime_combined_value` = lifetime_revenue + lifetime_tips
- `total_events_booked` = COUNT(events where status >= confirmed)
- `total_events_completed` = COUNT(events where status = completed)
- `total_events_cancelled` = COUNT(events where status = cancelled)
- `average_spend_per_event` = lifetime_revenue / total_events_completed
- `average_guests_per_event` = AVG(guest_count across all events)
- `total_guests_served_lifetime` = SUM(guest_count across all completed events)
- `average_tip_percentage` = (lifetime_tips / lifetime_revenue) \* 100
- `booking_completion_rate` = (total_events_completed / total_events_booked) \* 100
- `cancellation_rate` = (total_events_cancelled / total_events_booked) \* 100
- `days_since_last_event` = NOW() - MAX(event_date for completed events)
- `days_since_first_event` = NOW() - MIN(event_date for all events)
- `client_relationship_length_days` = MAX(event_date) - MIN(event_date)
- `rebooking_frequency_days` = AVG(days between consecutive events)
- `is_repeat_client` = BOOLEAN (total_events_completed > 1)
- `repeat_booking_count` = total_events_completed - 1
- `seasonal_booking_pattern` = MODE(month of event_date) — e.g., always books in February
- `outstanding_balance` = SUM(unpaid amounts from all events)
- `loyalty_points_earned_lifetime` = total_guests_served_lifetime (1 point per guest)
- `loyalty_points_redeemed_lifetime` = SUM(points spent on rewards)
- `referrals_generated` = COUNT(other clients where referral_source_name = this client)

### Aggregations (Across All Clients)

- `total_clients` = COUNT(all clients)
- `active_clients` = COUNT(clients with status = active)
- `repeat_clients` = COUNT(clients where total_events_completed > 1)
- `new_clients_this_month` = COUNT(clients where created_at in current month)
- `new_clients_this_year` = COUNT(clients where created_at in current year)
- `VIP_clients` = COUNT(clients where status = VIP)
- `dormant_clients` = COUNT(clients where days_since_last_event > 365)
- `churn_risk_clients` = COUNT(clients where days_since_last_event BETWEEN 180 AND 365)
- `clients_by_acquisition_source` = GROUP BY acquisition_source, COUNT
- `clients_by_tier` = GROUP BY loyalty_tier, COUNT
- `average_client_lifetime_value` = AVG(lifetime_combined_value)
- `top_10_clients_by_revenue` = ORDER BY lifetime_revenue DESC LIMIT 10
- `clients_with_outstanding_balances` = COUNT(clients where outstanding_balance > 0)
- `total_outstanding_across_all_clients` = SUM(outstanding_balance)
- `repeat_client_percentage` = (repeat_clients / total_clients) \* 100
- `average_client_relationship_length` = AVG(client_relationship_length_days)
- `clients_with_dietary_restrictions` = COUNT(clients where dietary_restrictions IS NOT EMPTY)
- `clients_with_allergies` = COUNT(clients where allergies IS NOT EMPTY)
- `nut_allergy_clients` = COUNT(clients where allergies CONTAINS 'nut')

### Time-Series Insights

- `new_clients_by_month` (line chart: month → count)
- `client_acquisition_trend` (12-month rolling count)
- `dormant_clients_by_quarter` (bar chart)
- `repeat_booking_rate_by_cohort` (cohort = month of first booking)
- `client_lifetime_value_by_cohort`
- `churn_rate_by_quarter` = (clients who churned / total clients at start of quarter)
- `reactivation_rate` = (dormant clients who booked again / total dormant clients)

---

## 2. EVENT ENTITY

### Raw Data Points

- `event_id` (UUID)
- `chef_id` (tenant)
- `client_id` (FK)
- `inquiry_id` (FK, if originated from inquiry)
- `event_date`
- `event_time` (serve time anchor)
- `arrival_time` (at client location)
- `departure_time_planned`
- `departure_time_actual`
- `guest_count`
- `guest_count_confirmed_at` (timestamp)
- `location_address`
- `location_city`
- `location_state`
- `location_zip`
- `occasion` (birthday, anniversary, Valentine's Day, casual, etc.)
- `service_style` (seated dinner, buffet, family-style, etc.)
- `dietary_restrictions_for_event` (array — snapshot at time of event)
- `allergies_for_event` (array — snapshot at time of event)
- `special_requests` (text)
- `status` (draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled)
- `status_history` (array of {status, timestamp, changed_by})
- `quoted_price` (in cents)
- `deposit_amount` (in cents)
- `deposit_due_date`
- `deposit_received_at` (timestamp)
- `final_payment_due_date`
- `final_payment_received_at` (timestamp)
- `total_paid` (in cents, computed from ledger)
- `total_tips` (in cents, computed from ledger)
- `total_revenue` (in cents) = total_paid + total_tips
- `outstanding_balance` (in cents) = quoted_price - total_paid
- `payment_method` (cash, Venmo, PayPal, card, etc.)
- `card_used_for_groceries` (Amex 4%, Chase 3%, etc.)
- `grocery_budget_target` (in cents — auto-calculated from margin target)
- `grocery_actual_spend` (in cents — from receipt uploads)
- `additional_expenses` (array: liquor store, specialty items, gas)
- `total_food_cost` (in cents) = grocery_actual_spend + SUM(additional_expenses)
- `leftover_value_carried_forward` (in cents — to next event)
- `leftover_value_received` (in cents — from previous event)
- `adjusted_food_cost` (in cents) = total_food_cost - leftover_value_received
- `gas_mileage` (miles driven)
- `gas_cost` (in cents)
- `shopping_time_minutes` (tracked)
- `prep_time_minutes` (tracked)
- `travel_time_minutes` (tracked)
- `service_time_minutes` (tracked)
- `cleanup_time_minutes` (tracked)
- `reset_time_minutes` (tracked)
- `total_time_invested_minutes` = SUM(all time phases)
- `course_count`
- `total_component_count` (across all courses)
- `course_breakdown` (array: course number, component count per course)
- `menu_id` (FK to locked menu)
- `menu_locked_at` (timestamp)
- `grocery_list_ready_at` (timestamp)
- `prep_list_ready_at` (timestamp)
- `packing_list_ready_at` (timestamp)
- `timeline_ready_at` (timestamp)
- `execution_sheet_printed_at` (timestamp)
- `event_completed_at` (timestamp)
- `follow_up_sent_at` (timestamp)
- `financial_closed_at` (timestamp)
- `reset_completed_at` (timestamp)
- `after_action_review_filed_at` (timestamp)
- `terminal_state_reached_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### After Action Review (Sub-Entity of Event)

- `calm_rating` (1-5 scale)
- `preparation_rating` (1-5 scale)
- `could_have_been_done_earlier` (array: grocery list, prep list, shopping, packing)
- `items_forgotten` (array)
- `what_went_well` (text)
- `what_went_wrong` (text)
- `menu_performance_notes` (text)
- `client_behavior_notes` (text)
- `site_notes` (text)
- `would_repeat_menu` (boolean)
- `stress_level` (1-5 scale)

### Derived Calculations (Per Event)

- `revenue_per_guest` = total_revenue / guest_count (in cents)
- `quoted_price_per_guest` = quoted_price / guest_count (in cents)
- `food_cost_per_guest` = adjusted_food_cost / guest_count (in cents)
- `food_cost_percentage` = (adjusted_food_cost / total_revenue) \* 100
- `gross_profit` = total_revenue - adjusted_food_cost (in cents)
- `gross_margin_percentage` = (gross_profit / total_revenue) \* 100
- `net_profit` = gross_profit - gas_cost - additional_expenses (in cents)
- `effective_hourly_rate` = net_profit / (total_time_invested_minutes / 60) (in cents)
- `tip_percentage` = (total_tips / total_paid) \* 100
- `payment_completion_percentage` = (total_paid / quoted_price) \* 100
- `days_from_inquiry_to_booking` = (status changed to 'accepted') - inquiry_created_at
- `days_from_booking_to_event` = event_date - (status changed to 'accepted')
- `lead_time_days` = event_date - created_at
- `prep_efficiency` = (components_completed_early / total_component_count) \* 100
- `on_time_arrival` = BOOLEAN (arrival_time_actual <= arrival_time_planned)
- `minutes_late` = MAX(0, arrival_time_actual - arrival_time_planned)
- `budget_adherence` = (grocery_actual_spend / grocery_budget_target) \* 100
- `budget_variance` = grocery_actual_spend - grocery_budget_target (in cents)
- `time_from_wake_to_arrival` (minutes — if wake time tracked)
- `days_from_menu_locked_to_event` = event_date - menu_locked_at
- `days_from_grocery_ready_to_event` = event_date - grocery_list_ready_at
- `was_calm` = BOOLEAN (calm_rating >= 4)
- `was_well_prepared` = BOOLEAN (preparation_rating >= 4)
- `forgot_items` = BOOLEAN (items_forgotten.length > 0)
- `hit_terminal_state` = BOOLEAN (terminal_state_reached_at IS NOT NULL)

### Aggregations (Across All Events)

- `total_events` = COUNT(all events)
- `completed_events` = COUNT(events where status = completed)
- `upcoming_events` = COUNT(events where status IN (accepted, paid, confirmed) AND event_date > NOW())
- `in_progress_events` = COUNT(events where status = in_progress)
- `cancelled_events` = COUNT(events where status = cancelled)
- `events_this_month` = COUNT(events where event_date in current month)
- `events_this_year` = COUNT(events where event_date in current year)
- `total_guests_served_lifetime` = SUM(guest_count for completed events)
- `total_revenue_lifetime` = SUM(total_revenue for completed events)
- `total_tips_lifetime` = SUM(total_tips for completed events)
- `total_food_cost_lifetime` = SUM(adjusted_food_cost for completed events)
- `total_gross_profit_lifetime` = SUM(gross_profit for completed events)
- `average_revenue_per_event` = AVG(total_revenue for completed events)
- `average_tip_per_event` = AVG(total_tips for completed events)
- `average_food_cost_percentage` = AVG(food_cost_percentage for completed events)
- `average_margin_percentage` = AVG(gross_margin_percentage for completed events)
- `average_effective_hourly_rate` = AVG(effective_hourly_rate for completed events)
- `average_guests_per_event` = AVG(guest_count for completed events)
- `average_course_count` = AVG(course_count for completed events)
- `average_component_count` = AVG(total_component_count for completed events)
- `average_prep_time` = AVG(prep_time_minutes for completed events)
- `average_service_time` = AVG(service_time_minutes for completed events)
- `average_total_time_invested` = AVG(total_time_invested_minutes for completed events)
- `average_calm_rating` = AVG(calm_rating from AAR)
- `average_preparation_rating` = AVG(preparation_rating from AAR)
- `calm_event_percentage` = (COUNT(events where calm_rating >= 4) / completed_events) \* 100
- `well_prepared_percentage` = (COUNT(events where preparation_rating >= 4) / completed_events) \* 100
- `on_time_arrival_percentage` = (COUNT(events where on_time_arrival = TRUE) / completed_events) \* 100
- `events_with_forgotten_items` = COUNT(events where forgot_items = TRUE)
- `events_reaching_terminal_state` = COUNT(events where hit_terminal_state = TRUE)
- `terminal_state_percentage` = (events_reaching_terminal_state / completed_events) \* 100
- `cancellation_rate` = (cancelled_events / total_events) \* 100
- `conversion_rate_inquiry_to_event` = (total_events / total_inquiries) \* 100
- `average_lead_time_days` = AVG(lead_time_days)
- `events_by_occasion` = GROUP BY occasion, COUNT
- `events_by_service_style` = GROUP BY service_style, COUNT
- `events_by_city` = GROUP BY location_city, COUNT
- `events_by_payment_method` = GROUP BY payment_method, COUNT
- `revenue_this_month` = SUM(total_revenue for events in current month)
- `revenue_vs_10k_target` = (revenue_this_month / 1000000) \* 100 (in cents)
- `revenue_shortfall` = 1000000 - revenue_this_month (in cents)
- `projected_revenue_this_month` = SUM(quoted_price for upcoming events in current month)
- `booked_revenue_this_month` = revenue_this_month + projected_revenue_this_month
- `outstanding_balances_total` = SUM(outstanding_balance for all events)

### Time-Series Insights

- `events_by_month` (line chart: month → count)
- `revenue_by_month` (line chart: month → total_revenue)
- `guests_served_by_month` (line chart: month → total_guests)
- `average_margin_by_month` (line chart: month → avg margin %)
- `food_cost_percentage_by_month` (line chart: month → avg food cost %)
- `effective_hourly_rate_by_month` (line chart: month → avg hourly rate)
- `calm_rating_trend` (line chart: event sequence → calm_rating)
- `preparation_rating_trend` (line chart: event sequence → preparation_rating)
- `lead_time_trend` (line chart: month → avg lead_time_days)
- `cancellation_rate_by_quarter` (bar chart)
- `repeat_vs_new_client_events_by_month` (stacked bar: month → new client events vs repeat)
- `revenue_by_occasion_type` (pie chart)
- `monthly_revenue_vs_target` (bar chart: month → actual vs $10K line)
- `booking_velocity` (rolling 30-day count of new bookings)

---

## 3. MENU ENTITY

### Raw Data Points

- `menu_id` (UUID)
- `chef_id` (tenant)
- `client_id` (FK, nullable if template)
- `event_id` (FK, nullable if draft)
- `menu_name` (e.g., "Valentine's Day 2026 for Michel")
- `menu_type` (custom, template, draft)
- `status` (draft, shared, locked, archived)
- `status_history` (array of {status, timestamp})
- `course_count`
- `total_component_count` (SUM of all components across all courses)
- `courses` (array of course objects)
- `created_at` (timestamp)
- `shared_at` (timestamp — when sent to client)
- `locked_at` (timestamp — no further edits allowed)
- `archived_at` (timestamp)
- `revision_count` (how many times edited)
- `client_facing_version` (text — what client sees)
- `internal_version` (text — chef's notes)
- `allergen_flags` (array: nuts, dairy, gluten, shellfish, etc.)
- `dietary_compliance` (array: vegetarian, vegan, gluten-free, etc.)
- `is_template` (boolean)
- `template_name` (if is_template = true)
- `times_used` (if template, COUNT of events using this template)

### Course Sub-Entity (Part of Menu)

- `course_number` (1, 2, 3, etc.)
- `course_name` (e.g., "Cheese Board", "Steak Diane with Sides")
- `component_count` (count of components in this course)
- `components` (array of component objects)

### Component Sub-Entity (Part of Course)

- `component_id` (UUID)
- `component_name` (e.g., "Diane Sauce", "Roasted Smashed Potatoes")
- `component_category` (protein, sauce, starch, vegetable, dessert, etc.)
- `recipe_id` (FK to recipe bible, nullable if new)
- `is_flexible` (boolean — can be swapped based on market availability)
- `is_high_risk` (boolean — technically challenging)
- `prep_timing` (early-prep, day-of, on-site)
- `texture_sensitive` (boolean — cannot be made too early)
- `storage_notes` (text)
- `allergen_flags` (array)
- `dietary_flags` (array)

### Derived Calculations (Per Menu)

- `total_recipes_used` = COUNT(distinct recipe_id in all components)
- `recipes_missing` = COUNT(components where recipe_id IS NULL)
- `high_risk_component_count` = COUNT(components where is_high_risk = TRUE)
- `flexible_component_count` = COUNT(components where is_flexible = TRUE)
- `early_prep_component_count` = COUNT(components where prep_timing = 'early-prep')
- `day_of_component_count` = COUNT(components where prep_timing = 'day-of')
- `on_site_component_count` = COUNT(components where prep_timing = 'on-site')
- `texture_sensitive_count` = COUNT(components where texture_sensitive = TRUE)
- `projected_food_cost` = SUM(recipe.cost_per_portion \* guest_count for all components)
- `revision_velocity` = revision_count / (locked_at - created_at) in days
- `time_to_lock_days` = locked_at - created_at
- `time_from_shared_to_locked_days` = locked_at - shared_at

### Aggregations (Across All Menus)

- `total_menus_created` = COUNT(all menus)
- `locked_menus` = COUNT(menus where status = locked)
- `draft_menus` = COUNT(menus where status = draft)
- `template_menus` = COUNT(menus where is_template = TRUE)
- `average_course_count` = AVG(course_count)
- `average_component_count` = AVG(total_component_count)
- `most_used_templates` = ORDER BY times_used DESC for templates
- `menus_by_dietary_compliance` = GROUP BY dietary_compliance, COUNT
- `average_time_to_lock` = AVG(time_to_lock_days)
- `average_revisions_per_menu` = AVG(revision_count)
- `menus_with_missing_recipes` = COUNT(menus where recipes_missing > 0)
- `total_components_without_recipes` = SUM(recipes_missing)

### Time-Series Insights

- `menus_locked_by_month` (line chart: month → count)
- `average_component_count_trend` (line chart: month → avg components)
- `template_usage_trend` (line chart: month → % of menus using templates)
- `revision_count_trend` (line chart: month → avg revisions)

---

## 4. RECIPE ENTITY (Recipe Bible)

### Raw Data Points

- `recipe_id` (UUID)
- `chef_id` (tenant)
- `component_name` (e.g., "Diane Sauce")
- `category` (sauce, protein, starch, vegetable, dessert, bread, condiment, etc.)
- `description` (brief text)
- `method` (concise text — outcomes, not step-by-step)
- `yield_amount` (numeric)
- `yield_unit` (cups, servings, portions, grams, etc.)
- `base_guest_count` (e.g., "serves 4")
- `ingredients` (array of ingredient objects: {name, quantity, unit, cost_per_unit})
- `total_ingredient_cost` (in cents, SUM of all ingredient costs)
- `cost_per_batch` (in cents) = total_ingredient_cost
- `cost_per_portion` (in cents) = cost_per_batch / (yield_amount / base_guest_count)
- `allergen_flags` (array: nuts, dairy, gluten, shellfish, soy, eggs, etc.)
- `dietary_flags` (array: vegetarian, vegan, gluten-free, dairy-free, etc.)
- `adaptations` (text — shortcuts, variations)
- `can_make_ahead` (boolean)
- `make_ahead_window_hours` (numeric)
- `storage_instructions` (text)
- `photo_url` (nullable)
- `created_at` (timestamp)
- `last_used_at` (timestamp — MAX of all events using this recipe)
- `times_used` (COUNT of events using this recipe)
- `source_event_id` (FK to event where this recipe was first captured)
- `is_favorite` (boolean — chef flag)
- `client_feedback_rating` (1-5 scale, AVG from events)
- `would_make_again` (boolean)

### Ingredient Sub-Entity (Part of Recipe)

- `ingredient_name`
- `quantity`
- `unit` (oz, cups, grams, tbsp, etc.)
- `cost_per_unit` (in cents — from ingredient price database)
- `total_cost_for_recipe` (in cents) = quantity \* cost_per_unit
- `is_pantry_staple` (boolean — already owned)
- `allergen_flags` (array)

### Derived Calculations (Per Recipe)

- `cost_per_guest` (in cents) = cost_per_portion
- `markup_at_standard_pricing` = (standard_event_revenue_per_guest - cost_per_guest) / cost_per_guest \* 100
- `days_since_last_used` = NOW() - last_used_at
- `usage_frequency` = times_used / chef_tenure_days
- `is_signature_dish` = BOOLEAN (times_used > 10 AND client_feedback_rating >= 4.5)

### Aggregations (Across All Recipes)

- `total_recipes` = COUNT(all recipes)
- `recipes_by_category` = GROUP BY category, COUNT
- `average_cost_per_recipe` = AVG(cost_per_batch)
- `most_expensive_recipes` = ORDER BY cost_per_batch DESC LIMIT 10
- `least_expensive_recipes` = ORDER BY cost_per_batch ASC LIMIT 10
- `most_used_recipes` = ORDER BY times_used DESC LIMIT 20
- `signature_dishes` = WHERE is_signature_dish = TRUE
- `never_used_recipes` = COUNT(recipes where times_used = 0)
- `recipes_with_photos` = COUNT(recipes where photo_url IS NOT NULL)
- `recipes_by_allergen` = GROUP BY allergen_flags, COUNT
- `recipes_by_dietary_flag` = GROUP BY dietary_flags, COUNT
- `can_make_ahead_recipes` = COUNT(recipes where can_make_ahead = TRUE)
- `average_client_feedback_rating` = AVG(client_feedback_rating)
- `top_rated_recipes` = ORDER BY client_feedback_rating DESC LIMIT 20
- `average_ingredient_count_per_recipe` = AVG(COUNT(ingredients))

### Time-Series Insights

- `recipes_added_by_month` (line chart: month → count)
- `recipe_library_growth` (cumulative line chart: month → total recipes)
- `recipe_usage_by_month` (line chart: month → total times_used across all recipes)
- `average_recipe_cost_trend` (line chart: month → avg cost_per_batch for new recipes)
- `signature_dish_emergence` (scatter plot: times_used vs client_feedback_rating)

---

## 5. INQUIRY ENTITY

### Raw Data Points

- `inquiry_id` (UUID)
- `chef_id` (tenant)
- `client_id` (FK, may be client stub)
- `source_channel` (text, email, Instagram, Take a Chef, phone, referral)
- `received_at` (timestamp)
- `first_response_at` (timestamp)
- `verbatim_message` (text — raw message)
- `confirmed_date` (nullable)
- `confirmed_guest_count` (nullable)
- `confirmed_location` (nullable)
- `confirmed_occasion` (nullable)
- `confirmed_budget` (nullable)
- `confirmed_dietary_restrictions` (array, nullable)
- `confirmed_service_style` (nullable)
- `blocking_questions` (array of text)
- `status` (new, awaiting_client, awaiting_chef, quoted, confirmed, declined, expired)
- `status_history` (array of {status, timestamp})
- `next_action_required_by` (chef, client, none)
- `follow_up_timer_started_at` (timestamp)
- `follow_up_flagged_at` (timestamp — if no response in 24 hours)
- `quoted_at` (timestamp)
- `quoted_price` (in cents)
- `quote_accepted_at` (timestamp)
- `quote_rejected_at` (timestamp)
- `declined_reason` (text)
- `converted_to_event_id` (FK, nullable)
- `converted_at` (timestamp)
- `expired_at` (timestamp)
- `closed_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Derived Calculations (Per Inquiry)

- `time_to_first_response_hours` = (first_response_at - received_at) in hours
- `time_to_quote_hours` = (quoted_at - received_at) in hours
- `time_to_conversion_days` = (converted_at - received_at) in days
- `response_delay_severity` (fast < 2h, moderate 2-24h, slow 24-72h, critical > 72h)
- `was_converted` = BOOLEAN (converted_to_event_id IS NOT NULL)
- `was_declined` = BOOLEAN (status = declined)
- `was_expired` = BOOLEAN (status = expired)
- `blocking_question_count` = COUNT(blocking_questions)
- `days_in_pipeline` = (closed_at OR NOW()) - received_at

### Aggregations (Across All Inquiries)

- `total_inquiries` = COUNT(all inquiries)
- `new_inquiries` = COUNT(inquiries where status = new)
- `awaiting_client` = COUNT(inquiries where status = awaiting_client)
- `awaiting_chef` = COUNT(inquiries where status = awaiting_chef)
- `quoted_inquiries` = COUNT(inquiries where status = quoted)
- `converted_inquiries` = COUNT(inquiries where was_converted = TRUE)
- `declined_inquiries` = COUNT(inquiries where was_declined = TRUE)
- `expired_inquiries` = COUNT(inquiries where was_expired = TRUE)
- `inquiries_this_month` = COUNT(inquiries where received_at in current month)
- `inquiries_this_year` = COUNT(inquiries where received_at in current year)
- `conversion_rate` = (converted_inquiries / total_inquiries) \* 100
- `decline_rate` = (declined_inquiries / total_inquiries) \* 100
- `expiry_rate` = (expired_inquiries / total_inquiries) \* 100
- `inquiries_by_channel` = GROUP BY source_channel, COUNT
- `conversion_rate_by_channel` = GROUP BY source_channel, (converted / total) \* 100
- `average_time_to_first_response` = AVG(time_to_first_response_hours)
- `average_time_to_quote` = AVG(time_to_quote_hours)
- `average_time_to_conversion` = AVG(time_to_conversion_days)
- `inquiries_flagged_for_follow_up` = COUNT(inquiries where follow_up_flagged_at IS NOT NULL)
- `overdue_responses` = COUNT(inquiries where next_action_required_by = chef AND (NOW() - updated_at) > 24h)
- `average_blocking_questions` = AVG(blocking_question_count)
- `inquiries_by_occasion` = GROUP BY confirmed_occasion, COUNT
- `declined_reasons_breakdown` = GROUP BY declined_reason, COUNT

### Time-Series Insights

- `inquiries_by_month` (line chart: month → count)
- `conversion_rate_by_month` (line chart: month → conversion %)
- `average_response_time_by_month` (line chart: month → avg time_to_first_response_hours)
- `inquiries_by_channel_over_time` (stacked area chart: month → count by channel)
- `pipeline_velocity` (rolling 30-day conversion rate)
- `expired_inquiry_trend` (line chart: month → expiry rate)

---

## 6. PAYMENT / FINANCIAL ENTITY (Ledger)

### Raw Data Points (Ledger Entry)

- `ledger_entry_id` (UUID)
- `chef_id` (tenant)
- `event_id` (FK)
- `client_id` (FK)
- `entry_type` (deposit, installment, final_payment, tip, refund, adjustment, add_on)
- `amount` (in cents — positive for credits, negative for debits)
- `payment_method` (cash, Venmo, PayPal, Stripe, card, etc.)
- `card_used` (e.g., "Amex Blue Cash 4%") — for cash-back tracking
- `cash_back_earned` (in cents)
- `transaction_date` (timestamp)
- `received_at` (timestamp — when chef actually got the money)
- `receipt_photo_url` (nullable)
- `notes` (text)
- `created_at` (timestamp — append-only, immutable)
- `created_by` (user_id)

### Expense Sub-Entity (Part of Event Financial Record)

- `expense_id` (UUID)
- `event_id` (FK)
- `expense_type` (groceries, liquor, gas, specialty_item, other)
- `vendor` (e.g., "Market Basket", "One Stop Liquor")
- `amount` (in cents)
- `is_business_expense` (boolean — vs personal)
- `receipt_photo_url` (nullable)
- `line_items` (array — if receipt parsed: {item_name, quantity, unit_price, total})
- `purchased_at` (timestamp)
- `card_used` (e.g., "Amex Blue Cash 4%")
- `cash_back_earned` (in cents)

### Derived Calculations (Per Event Financial View)

- `total_deposits` = SUM(amount WHERE entry_type = deposit)
- `total_installments` = SUM(amount WHERE entry_type = installment)
- `total_final_payments` = SUM(amount WHERE entry_type = final_payment)
- `total_tips` = SUM(amount WHERE entry_type = tip)
- `total_refunds` = SUM(amount WHERE entry_type = refund)
- `total_paid` = total_deposits + total_installments + total_final_payments
- `total_revenue` = total_paid + total_tips
- `outstanding_balance` = quoted_price - total_paid
- `payment_status` (unpaid, deposit_paid, partial, paid, overpaid, refunded)
- `total_expenses` = SUM(expense.amount WHERE is_business_expense = TRUE)
- `total_business_grocery_spend` = SUM(expense.amount WHERE expense_type = groceries AND is_business_expense = TRUE)
- `total_personal_grocery_spend` = SUM(expense.amount WHERE expense_type = groceries AND is_business_expense = FALSE)
- `total_liquor_spend` = SUM(expense.amount WHERE expense_type = liquor)
- `total_gas_spend` = SUM(expense.amount WHERE expense_type = gas)
- `total_cash_back_earned` = SUM(cash_back_earned for all payments and expenses)
- `net_revenue_after_expenses` = total_revenue - total_expenses
- `gross_profit` = total_revenue - total_business_grocery_spend
- `gross_margin_percentage` = (gross_profit / total_revenue) \* 100
- `net_profit` = net_revenue_after_expenses
- `net_margin_percentage` = (net_profit / total_revenue) \* 100
- `effective_revenue_after_cash_back` = total_revenue + total_cash_back_earned

### Aggregations (Across All Events — Financial)

- `lifetime_revenue` = SUM(total_revenue for all completed events)
- `lifetime_tips` = SUM(total_tips for all completed events)
- `lifetime_expenses` = SUM(total_expenses for all completed events)
- `lifetime_gross_profit` = SUM(gross_profit for all completed events)
- `lifetime_net_profit` = SUM(net_profit for all completed events)
- `lifetime_cash_back_earned` = SUM(total_cash_back_earned for all events)
- `average_gross_margin` = AVG(gross_margin_percentage)
- `average_net_margin` = AVG(net_margin_percentage)
- `revenue_this_month` = SUM(total_revenue WHERE transaction_date in current month)
- `revenue_this_year` = SUM(total_revenue WHERE transaction_date in current year)
- `expenses_this_month` = SUM(total_expenses WHERE purchased_at in current month)
- `expenses_this_year` = SUM(total_expenses WHERE purchased_at in current year)
- `net_profit_this_month` = revenue_this_month - expenses_this_month
- `net_profit_this_year` = revenue_this_year - expenses_this_year
- `outstanding_balances_total` = SUM(outstanding_balance for all events)
- `revenue_vs_10k_monthly_target` = (revenue_this_month / 1000000) \* 100
- `monthly_revenue_shortfall` = 1000000 - revenue_this_month (if negative, surplus)
- `average_tip_percentage` = (lifetime_tips / lifetime_revenue) \* 100
- `cash_payment_percentage` = (COUNT(payments WHERE payment_method = cash) / COUNT(all payments)) \* 100
- `venmo_payment_percentage` = (COUNT(payments WHERE payment_method = Venmo) / COUNT(all payments)) \* 100
- `total_receipts_uploaded` = COUNT(ledger_entries WHERE receipt_photo_url IS NOT NULL)
- `events_missing_receipts` = COUNT(events WHERE expense receipts missing)

### Time-Series Insights

- `revenue_by_month` (line chart: month → total_revenue)
- `expenses_by_month` (line chart: month → total_expenses)
- `net_profit_by_month` (line chart: month → net_profit)
- `gross_margin_by_month` (line chart: month → avg gross_margin_percentage)
- `tips_by_month` (line chart: month → total_tips)
- `cash_back_earned_by_month` (line chart: month → total_cash_back_earned)
- `revenue_vs_10k_target_by_month` (bar chart: month → actual vs target line)
- `payment_method_distribution_over_time` (stacked bar: month → % by payment method)
- `outstanding_balances_trend` (line chart: month → total outstanding)

---

## 7. MESSAGE / COMMUNICATION ENTITY

### Raw Data Points

- `message_id` (UUID)
- `chef_id` (tenant)
- `event_id` (FK, nullable if inquiry-only)
- `inquiry_id` (FK, nullable if event-only)
- `client_id` (FK)
- `sender_role` (chef, client, system)
- `message_content` (text)
- `channel` (in-app, text, email, Instagram, phone_log)
- `status` (draft, approved, sent, logged)
- `drafted_at` (timestamp — if system-generated)
- `approved_at` (timestamp — chef approval if auto-drafted)
- `sent_at` (timestamp)
- `read_at` (timestamp — if trackable)
- `is_system_generated` (boolean)
- `template_used` (nullable — e.g., "mid-service auto-reply")
- `requires_response` (boolean)
- `flagged_for_follow_up` (boolean)
- `created_at` (timestamp)

### Derived Calculations (Per Message)

- `time_to_approval_minutes` = (approved_at - drafted_at) in minutes (if system-generated)
- `time_to_read_minutes` = (read_at - sent_at) in minutes (if trackable)
- `was_approved_before_sending` = BOOLEAN (approved_at IS NOT NULL AND is_system_generated = TRUE)

### Aggregations (Across All Messages)

- `total_messages` = COUNT(all messages)
- `messages_by_chef` = COUNT(messages WHERE sender_role = chef)
- `messages_by_client` = COUNT(messages WHERE sender_role = client)
- `system_generated_messages` = COUNT(messages WHERE is_system_generated = TRUE)
- `messages_by_channel` = GROUP BY channel, COUNT
- `messages_requiring_response` = COUNT(messages WHERE requires_response = TRUE AND sender_role = client)
- `messages_flagged_for_follow_up` = COUNT(messages WHERE flagged_for_follow_up = TRUE)
- `average_messages_per_event` = AVG(COUNT(messages per event_id))
- `average_time_to_approval` = AVG(time_to_approval_minutes)
- `templates_used_count` = GROUP BY template_used, COUNT

### Time-Series Insights

- `messages_by_month` (line chart: month → count)
- `messages_by_channel_over_time` (stacked area: month → count by channel)
- `system_vs_manual_messages_trend` (stacked bar: month → system vs manual)

---

## 8. SHOPPING / GROCERY LIST ENTITY

### Raw Data Points

- `grocery_list_id` (UUID)
- `event_id` (FK)
- `chef_id` (tenant)
- `menu_id` (FK)
- `status` (skeleton, quantified, finalized, shopped)
- `created_at` (timestamp)
- `finalized_at` (timestamp)
- `shopped_at` (timestamp)
- `total_line_items` (count)
- `items` (array of grocery_item objects)

### Grocery Item Sub-Entity

- `item_name`
- `category` (protein, produce, dairy, pantry, etc.)
- `quantity`
- `unit`
- `is_staple_already_owned` (boolean)
- `is_flexible` (boolean — can be swapped)
- `is_insurance_item` (boolean — backup)
- `preferred_store` (e.g., "Market Basket")
- `planned_cost` (in cents — from recipe costing)
- `actual_cost` (in cents — from receipt)
- `was_substituted` (boolean)
- `substitution_reason` (text — e.g., "store out of stock")
- `substituted_with` (text)

### Derived Calculations (Per Grocery List)

- `total_planned_cost` = SUM(planned_cost for all items)
- `total_actual_cost` = SUM(actual_cost for all items)
- `cost_variance` = total_actual_cost - total_planned_cost
- `substitution_count` = COUNT(items WHERE was_substituted = TRUE)
- `substitution_rate` = (substitution_count / total_line_items) \* 100
- `staple_item_count` = COUNT(items WHERE is_staple_already_owned = TRUE)
- `flexible_item_count` = COUNT(items WHERE is_flexible = TRUE)
- `insurance_item_count` = COUNT(items WHERE is_insurance_item = TRUE)
- `time_from_finalized_to_shopped_hours` = (shopped_at - finalized_at) in hours

### Aggregations (Across All Grocery Lists)

- `average_line_items_per_list` = AVG(total_line_items)
- `average_planned_cost` = AVG(total_planned_cost)
- `average_actual_cost` = AVG(total_actual_cost)
- `average_cost_variance` = AVG(cost_variance)
- `average_substitution_rate` = AVG(substitution_rate)
- `most_substituted_items` = GROUP BY item_name WHERE was_substituted = TRUE, COUNT

---

## 9. EQUIPMENT / PACKING ENTITY

### Raw Data Points

- `packing_list_id` (UUID)
- `event_id` (FK)
- `status` (draft, ready, packed, verified)
- `created_at` (timestamp)
- `packed_at` (timestamp)
- `items` (array of equipment_item objects)

### Equipment Item Sub-Entity

- `item_name` (e.g., "ice cream machine", "gloves", "parchment paper")
- `category` (must_bring, assume_exists, confirm_required, non_negotiable)
- `bin` (cold, dry, tools, fragile)
- `is_fragile` (boolean)
- `quantity`
- `was_forgotten` (boolean — from AAR)
- `is_non_negotiable` (boolean — always needed, frequently forgotten)

### Derived Calculations (Per Packing List)

- `total_items` = COUNT(items)
- `must_bring_count` = COUNT(items WHERE category = must_bring)
- `non_negotiable_count` = COUNT(items WHERE is_non_negotiable = TRUE)
- `fragile_count` = COUNT(items WHERE is_fragile = TRUE)
- `items_forgotten_count` = COUNT(items WHERE was_forgotten = TRUE)
- `forget_rate` = (items_forgotten_count / total_items) \* 100

### Aggregations (Across All Packing Lists)

- `most_forgotten_items` = GROUP BY item_name WHERE was_forgotten = TRUE, COUNT
- `average_items_per_event` = AVG(total_items)
- `average_forget_rate` = AVG(forget_rate)

---

## 10. TIMELINE / SCHEDULE ENTITY

### Raw Data Points

- `timeline_id` (UUID)
- `event_id` (FK)
- `arrival_time` (timestamp — anchor point)
- `serve_time` (timestamp — primary anchor)
- `leave_house_time` (timestamp — calculated backwards)
- `car_packed_by_time` (timestamp)
- `finish_prep_by_time` (timestamp)
- `start_prep_time` (timestamp)
- `home_from_shopping_time` (timestamp)
- `leave_for_shopping_time` (timestamp)
- `wake_up_time` (timestamp — absolute latest)
- `route_stops` (array: {stop_name, address, stop_type (grocery, liquor, client)})
- `total_prep_time_allocated_minutes`
- `total_buffer_time_minutes`
- `created_at` (timestamp)

### Derived Calculations (Per Timeline)

- `time_from_wake_to_arrival_hours` = (arrival_time - wake_up_time) in hours
- `actual_wake_time` (from AAR or time tracking)
- `wake_time_variance_minutes` = (actual_wake_time - wake_up_time) in minutes
- `was_on_time` = BOOLEAN (actual_arrival_time <= arrival_time)
- `minutes_late` = MAX(0, actual_arrival_time - arrival_time)

---

## 11. LOYALTY / REWARDS ENTITY

### Raw Data Points (Per Client)

- `loyalty_points_balance` (integer — 1 point per guest served)
- `loyalty_tier` (bronze, silver, gold, platinum — auto-calculated from lifetime guests)
- `points_earned_lifetime` = total_guests_served_lifetime
- `points_redeemed_lifetime` (integer)
- `rewards_claimed` (array of reward objects)

### Reward Sub-Entity

- `reward_id` (UUID)
- `client_id` (FK)
- `reward_type` ($20 off, 50% off dinner for two, free dinner, bonus course, etc.)
- `points_cost` (integer)
- `redeemed_at` (timestamp)
- `redeemed_on_event_id` (FK, nullable if not yet used)
- `expiry_date` (timestamp)
- `status` (active, redeemed, expired)

### Derived Calculations

- `active_rewards` = COUNT(rewards WHERE status = active)
- `expired_rewards` = COUNT(rewards WHERE status = expired)
- `redemption_rate` = (COUNT(rewards redeemed) / COUNT(rewards issued)) \* 100

---

## 12. CROSS-ENTITY METRICS (Business Intelligence)

### Pipeline Health

- `inquiries_in_last_7_days` = COUNT(inquiries WHERE received_at >= NOW() - 7 days)
- `inquiries_in_last_30_days` = COUNT(inquiries WHERE received_at >= NOW() - 30 days)
- `conversion_rate_last_30_days` = (converted_inquiries_last_30_days / inquiries_last_30_days) \* 100
- `average_inquiry_to_booking_days` = AVG(time_to_conversion_days)
- `pipeline_value` = SUM(quoted_price for all quoted inquiries not yet converted or declined)

### Booking Velocity

- `events_booked_this_week` = COUNT(events WHERE status changed to 'accepted' in last 7 days)
- `events_booked_this_month` = COUNT(events WHERE status changed to 'accepted' in current month)
- `booking_velocity_30_day` = COUNT(events WHERE status changed to 'accepted' in last 30 days)

### Revenue Forecasting

- `booked_revenue_next_30_days` = SUM(quoted_price for events in next 30 days)
- `booked_revenue_next_60_days` = SUM(quoted_price for events in next 60 days)
- `booked_revenue_next_90_days` = SUM(quoted_price for events in next 90 days)
- `projected_monthly_revenue` = SUM(quoted_price for upcoming events this month)
- `revenue_gap_to_10k_target` = 1000000 - (revenue_this_month + projected_monthly_revenue)

### Operational Efficiency

- `average_calm_rating_last_10_events` = AVG(calm_rating for last 10 completed events)
- `average_preparation_rating_last_10_events` = AVG(preparation_rating for last 10 completed events)
- `events_reaching_terminal_state_percentage` = (events with terminal_state / completed_events) \* 100
- `average_time_to_terminal_state_days` = AVG((terminal_state_reached_at - event_completed_at) in days)
- `forgotten_items_frequency` = (events_with_forgotten_items / completed_events) \* 100
- `most_commonly_forgotten_items` = GROUP BY item_name FROM packing lists WHERE was_forgotten = TRUE

### Client Retention

- `repeat_client_rate` = (COUNT(clients with > 1 event) / total_clients) \* 100
- `average_events_per_repeat_client` = AVG(event_count for clients with > 1 event)
- `client_churn_rate` = (clients_dormant_over_1_year / total_clients) \* 100
- `client_reactivation_rate` = (clients who booked after being dormant / clients_dormant_over_1_year) \* 100

### Financial Health

- `gross_margin_last_10_events` = AVG(gross_margin_percentage for last 10 events)
- `net_margin_last_10_events` = AVG(net_margin_percentage for last 10 events)
- `effective_hourly_rate_last_10_events` = AVG(effective_hourly_rate for last 10 events)
- `food_cost_percentage_last_10_events` = AVG(food_cost_percentage for last 10 events)
- `average_budget_adherence_last_10_events` = AVG(budget_adherence for last 10 events)
- `cash_flow_this_month` = revenue_this_month - expenses_this_month
- `cash_flow_next_30_days` = booked_revenue_next_30_days - projected_expenses_next_30_days

### Recipe Bible Maturity

- `recipe_coverage_rate` = (components_with_recipes / total_components_used_in_events) \* 100
- `recipes_added_last_30_days` = COUNT(recipes WHERE created_at in last 30 days)
- `recipe_reuse_rate` = AVG(times_used for all recipes)
- `signature_dish_count` = COUNT(recipes WHERE is_signature_dish = TRUE)

### Stress & Sustainability Indicators

- `calm_trend_improving` = BOOLEAN (calm_rating_avg_last_5_events > calm_rating_avg_previous_5_events)
- `preparation_trend_improving` = BOOLEAN (preparation_rating_avg_last_5_events > preparation_rating_avg_previous_5_events)
- `burnout_risk_score` = CALCULATED (events_per_week \* avg_time_invested_per_event / calm_rating)
- `weeks_with_heavy_load` = COUNT(weeks WHERE events >= 3)
- `weeks_with_light_load` = COUNT(weeks WHERE events <= 1)

---

## 13. TIME-SERIES DASHBOARDS

### Chef Dashboard (Real-Time)

- "What can I safely prepare right now?" (preparable actions list)
- Upcoming events this week (count + list)
- Events requiring action (awaiting response, missing menu, unpaid, etc.)
- Revenue this month vs $10K target (progress bar)
- Inquiries requiring response (count + urgency)
- Outstanding balances (total)
- Calm rating trend (last 10 events, sparkline)

### Monthly Business Review

- Revenue this month vs last month (% change)
- Events this month vs last month (% change)
- Gross margin this month vs last month
- New clients this month
- Repeat bookings this month
- Average effective hourly rate
- Inquiry conversion rate
- Pipeline value (quoted but not yet booked)
- Most forgotten items this month
- Calm rating average
- Recipe library growth

### Quarterly Business Review

- Total revenue (quarter)
- Total events (quarter)
- New clients acquired
- Repeat client percentage
- Average client lifetime value
- Gross profit
- Net profit
- Effective hourly rate trend
- Recipe library size
- Signature dishes developed
- Client retention rate
- Inquiry conversion rate by channel

---

## SUMMARY COUNTS

- **Client Entity:** 38 raw fields, 21 derived calculations, 28 aggregations, 8 time-series
- **Event Entity:** 68 raw fields, 37 derived calculations, 51 aggregations, 13 time-series
- **Menu Entity:** 18 raw fields (+ course & component sub-entities), 11 derived calculations, 11 aggregations, 4 time-series
- **Recipe Entity:** 28 raw fields (+ ingredient sub-entity), 5 derived calculations, 19 aggregations, 5 time-series
- **Inquiry Entity:** 26 raw fields, 8 derived calculations, 21 aggregations, 6 time-series
- **Payment/Financial Entity:** 17 raw ledger fields + 14 expense fields, 27 derived calculations per event, 23 aggregations, 8 time-series
- **Message Entity:** 15 raw fields, 3 derived calculations, 8 aggregations, 3 time-series
- **Grocery List Entity:** 8 raw fields (+ item sub-entity), 9 derived calculations, 5 aggregations
- **Equipment/Packing Entity:** 5 raw fields (+ item sub-entity), 5 derived calculations, 3 aggregations
- **Timeline/Schedule Entity:** 12 raw fields, 4 derived calculations
- **Loyalty/Rewards Entity:** 6 raw fields (+ reward sub-entity), 3 derived calculations
- **Cross-Entity Business Intelligence:** 36 metrics

**GRAND TOTAL INVENTORY:**

- **Raw data points:** ~300+
- **Derived calculations:** ~150+
- **Aggregations:** ~170+
- **Time-series insights:** ~50+

---

## NEXT STEPS

This inventory is now the canonical requirements document for:

1. Database schema design (tables, columns, types, indexes)
2. Calculated field logic (triggers, views, functions)
3. Dashboard UI design (what to display, how to calculate)
4. Analytics & reporting layer
5. API endpoint design (what data to expose)

Every field in this document should map to either:

- A database column (raw data)
- A database view or function (derived calculation)
- An application-layer aggregation query
- A time-series chart component

No statistic should be tracked that is not in this document.
No database field should exist that is not justified by a measurement need in this document.

---

**END OF STATISTICS INVENTORY**
