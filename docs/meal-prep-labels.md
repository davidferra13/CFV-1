# Meal Prep Container Labels

## What Was Built

A printable label generation system for meal prep containers. Chefs can create labels with dish names, prep/use-by dates, reheating instructions, allergen warnings, and optional nutrition info.

## Files Created

| File | Purpose |
|------|---------|
| `lib/meal-prep/label-actions.ts` | Server actions: generateLabels, generateLabelsFromEvent, generateLabelsFromMealPrepWeek (stub), saveLabelPreset |
| `components/meal-prep/container-label.tsx` | ContainerLabelCard (single label) and LabelGrid (printable grid) components |
| `app/(chef)/meal-prep/labels/page.tsx` | Label generator page with manual entry, event loading, preview, and print |

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | Added @media print styles for label grid layout and cutting guides |
| `app/(chef)/events/[id]/page.tsx` | Added "Print Labels" button linking to `/meal-prep/labels?eventId={id}` |

## How It Works

1. **Manual Entry**: Chef adds dishes one by one with name, servings count, reheating instructions, allergen checkboxes, and optional nutrition fields
2. **Load from Event**: Paste an event ID (or arrive via the event detail "Print Labels" button) to auto-populate dishes from the event's menu
3. **Generate**: Click "Generate Labels" to create label cards. Each dish produces N labels based on servings count
4. **Print**: Click "Print Labels" to trigger browser print dialog. Print stylesheet hides nav/controls and arranges labels in a 2-column grid with dashed cut lines

## Label Content

Each label shows:
- Dish name (large, bold)
- Prepared date and use-by date (prep + shelf life days)
- Reheating instructions
- Allergen warnings with warning icon
- Nutrition (optional): calories, protein, carbs, fat per serving
- Chef name (branding)
- Client name (optional)
- Serving number (e.g. 3/4) when multiple servings

## Print Layout

- 2-column grid fitting standard label sheets
- Dashed borders for cutting guides
- Page breaks after every 8 labels
- All nav/header/footer hidden in print mode

## Stubs for Future Use

- `generateLabelsFromMealPrepWeek()` returns empty data; the meal_prep_weeks table does not exist yet
- `saveLabelPreset()` validates and returns the preset data for client-side localStorage persistence; no database table for presets yet
