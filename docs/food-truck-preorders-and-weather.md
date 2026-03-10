# Food Truck: Pre-Orders and Weather-Based Demand

## Overview

Two new food truck features that help chefs plan prep quantities and manage customer pre-orders.

## Feature 1: Pre-Order System

### What It Does

Customers who know the truck's schedule can pre-order for pickup at a specific stop. The chef sees all pre-orders for a given date, can advance them through a status workflow, and gets an aggregated prep list.

### Database

- Table: `truck_preorders` (migration `20260331000017`)
- Columns: customer info, location, pickup date/time, items (JSONB), total in cents, status, payment status
- Status workflow: pending > confirmed > ready > picked_up (or cancelled / no_show)
- Payment tracking: unpaid, paid, refunded
- RLS on `tenant_id`, indexed on `(tenant_id, pickup_date)`

### Server Actions (`lib/food-truck/preorder-actions.ts`)

- `createPreorder` - new entry with customer info, items, total
- `updatePreorderStatus` - advance through workflow
- `getPreordersForDate` - all orders for a date
- `getPreordersForLocation` - filtered by stop name + date
- `getPreorderSummary` - aggregated item quantities (e.g., "12x Tacos, 8x Burritos")
- `cancelPreorder` - cancel with optional refund flag
- `getPreorderStats` - conversion rate, avg order value, no-show rate over N days

### UI (`components/food-truck/preorder-manager.tsx`)

- Date picker, order cards with status badges
- Status workflow buttons (Confirm > Ready > Picked Up, or Cancel/No-Show)
- Summary panel: total orders, revenue, completion rate, no-show rate
- Item aggregation view: "Items to Prep Today"
- Add pre-order form with dynamic item rows

### Page

- Route: `/food-truck/preorders`

## Feature 2: Weather-Based Demand Adjustment

### What It Does

Uses the Open-Meteo API (free, no key) to fetch weather forecasts, then applies a deterministic formula to calculate demand multipliers. Helps chefs adjust prep quantities based on weather conditions.

### Demand Multiplier Formula (deterministic, no AI)

- Base: 1.0
- Temperature > 85F: +0.15
- Temperature < 40F: -0.25
- Precipitation > 80%: -0.50
- Precipitation > 60%: -0.30
- Wind > 25mph: -0.15
- Weekend (Sat/Sun): +0.20
- Clamped to [0.3, 1.5]

### Server Actions (`lib/food-truck/weather-demand-actions.ts`)

- `getWeatherForecast` - fetches from Open-Meteo, returns typed weather data
- `calculateDemandMultiplier` - pure deterministic function, returns multiplier + reasons
- `getAdjustedParLevels` - applies multiplier to base par levels
- `getWeekForecastWithDemand` - 7-day forecast with multiplier for each day
- `getLocationCoordinates` - reads lat/lng from truck_locations table

### UI (`components/food-truck/weather-demand.tsx`)

- Location selector (from saved locations or manual coordinates)
- 7-day forecast strip with weather icons, temps, rain %, demand multiplier badges
- Day detail panel with adjustment reasons
- Adjusted prep quantities table: normal vs. weather-adjusted with change column
- Color coding: green (above avg), yellow (normal), red (below avg)

### Page

- Route: `/food-truck/weather`

## Architecture Notes

- All monetary amounts in cents (integer)
- tenant_id from session (requireChef), never from request body
- Formula > AI: demand multiplier is pure math, only the weather API fetch is external
- Weather API: Open-Meteo (free, no API key, no private data sent)
- All startTransition calls wrapped in try/catch with rollback
- No em dashes anywhere
