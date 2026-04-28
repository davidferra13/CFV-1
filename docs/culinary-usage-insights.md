# Culinary Usage Insights

## What Changed

ChefFlow now has a Culinary Usage tab inside `/insights`. It surfaces the most-used ingredients, most-used recipes, most-picked menus, coverage health, and a 12-month usage signal.

## Why

The chef portal needed an automatic way to answer operational questions such as which ingredient, menu, or recipe is used most often over time. The first implementation derives those answers from existing canonical records rather than adding manual counters.

## How It Works

`getCulinaryUsageStats()` reads accepted through completed events, then follows linked menus, dishes, components, recipes, recipe ingredients, and ingredients. Rankings are based only on records that are actually linked together. Events without linked menus are included in coverage, but they are not used for ingredient or recipe rankings.

The feature is read-only. It does not generate recipe ideas, mutate records, or apply migrations.
