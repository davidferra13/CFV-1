# Marketing Analytics Dashboard Spec (Public Growth)

## Goal

Build one dashboard that answers:

1. Which public pages attract qualified traffic?
2. Which comparison and FAQ pages create signup intent?
3. Where visitors drop before inquiry or signup?

## Event Taxonomy (Current)

### Canonical events

- `page_viewed`
- `search_performed`
- `feature_used`
- `cta_clicked`
- `signup_started`
- `contact_form_submitted`
- `newsletter_subscribed`
- `inquiry_submitted`

### Key properties now emitted

#### `page_viewed`

- `page`: `chef_directory` | `compare_index` | `compare_detail` | `faq`
- `section`: `public_growth` (compare/faq) or omitted depending page
- `compare_slug` (for compare detail)
- Directory-specific fields from results tracker:
  - `has_active_filters`
  - `query_length`
  - `state_filter`
  - `partner_type_filter`
  - `sort_mode`
  - `result_count`
  - `total_count`
  - `zero_results`

#### `search_performed`

- `search_area`: `chef_directory`
- `query_length`
- `has_state_filter`
- `has_partner_type_filter`
- `sort_mode`

#### `feature_used`

- `feature`: one of:
  - `chef_directory_filters_applied`
  - `chef_directory_filtered_results_viewed`
  - `chef_directory_zero_results`
  - `chef_directory_filters_reset`
- Shared fields:
  - `query_length`
  - `state_filter`
  - `partner_type_filter`
  - `sort_mode`
  - `result_count` (when applicable)

#### `cta_clicked`

- `cta_name` from `TrackedLink`:
  - Compare:
    - `compare_index_open_guide`
    - `compare_index_primary_cta`
    - `compare_detail_primary_cta`
    - `compare_detail_back_index`
  - FAQ:
    - `faq_primary_cta`
    - `faq_trust_link`
  - Directory:
    - `directory_inquire`
    - `directory_profile_view`
- `cta_href`
- Optional fields like `compare_slug`, `chef_slug`, `launch_mode`, `section`

## Dashboard Layout

## 1) Acquisition Overview

- KPI: Unique visitors (7d / 30d) on:
  - `/chefs`
  - `/compare`
  - `/compare/*`
  - `/faq`
- KPI: Landing page share by route
- KPI: New vs returning visitor split

## 2) Directory Funnel

- KPI: Directory visitors (`page_viewed` where `page=chef_directory`)
- KPI: Filter apply rate:
  - numerator: `feature_used` where `feature=chef_directory_filters_applied`
  - denominator: directory visitors
- KPI: Zero-result rate:
  - numerator: `feature_used` where `feature=chef_directory_zero_results`
  - denominator: `chef_directory_filters_applied`
- KPI: Inquiry click-through rate:
  - numerator: `cta_clicked` where `cta_name=directory_inquire`
  - denominator: directory visitors
- Breakdowns:
  - by `state_filter`
  - by `partner_type_filter`
  - by `sort_mode`

## 3) Compare Funnel

- KPI: Compare index visitors (`page_viewed page=compare_index`)
- KPI: Guide open rate:
  - numerator: `cta_clicked` where `cta_name=compare_index_open_guide`
  - denominator: compare index visitors
- KPI: Compare detail signup CTR:
  - numerator: `cta_clicked` where `cta_name=compare_detail_primary_cta`
  - denominator: compare detail visitors
- Breakdown:
  - by `compare_slug`

## 4) FAQ Funnel

- KPI: FAQ visitors (`page_viewed page=faq`)
- KPI: FAQ -> Trust click rate (`cta_name=faq_trust_link`)
- KPI: FAQ -> Signup click rate (`cta_name=faq_primary_cta`)

## 5) Conversion Outcome

- KPI: Signup starts from public growth pages
  - `signup_started` attributed to prior `cta_clicked` from compare/faq/chefs
- KPI: Inquiry submissions from directory sessions
  - `inquiry_submitted` with session containing directory page view

## Suggested Cohorts

- High-intent discovery:
  - viewed `compare_detail` OR used directory filters
- Friction cohort:
  - triggered `chef_directory_zero_results`
- Signup-ready:
  - clicked any primary CTA on compare/faq/customers/pricing

## Tracking Gaps To Close Next

1. Add explicit `signup_source_page` on signup start.
2. Add direct event for FAQ accordion open state.
3. Add compare table interaction event (if table sorting/filtering is introduced).
4. Add UTM normalization properties for first-touch attribution.

## QA Checklist

1. Open `/chefs`, apply filters, verify:
   - `search_performed`
   - `feature_used: chef_directory_filters_applied`
   - `page_viewed` updates with filter properties.
2. Force no-result filter combination, verify:
   - `feature_used: chef_directory_zero_results`
3. Open `/compare`, click a guide:
   - `cta_clicked: compare_index_open_guide`
4. Open `/compare/[slug]`, click primary CTA:
   - `cta_clicked: compare_detail_primary_cta` with `compare_slug`
5. Open `/faq`, click trust + primary CTA:
   - `cta_clicked: faq_trust_link`
   - `cta_clicked: faq_primary_cta`
