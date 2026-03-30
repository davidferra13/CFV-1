# Research: USDA SR Legacy Database Structure (Exact CSV Format)

> **Date:** 2026-03-30
> **Question:** What is the exact structure of the USDA SR Legacy CSV download files, including file names, column headers, data types, sample rows, food group counts, and NDB/FDC ID mapping?
> **Status:** complete

## Summary

The SR Legacy CSV download contains **18 CSV files** inside a zip at `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip` (5.8 MB). It covers **7,793 food items** across **25 active food groups** with **644,125 nutrient value rows** and **474 distinct nutrients**. SR Legacy is a frozen dataset (April 2018 release, published 2019-04-01) that will never be updated. NDB numbers (1001-93600) are the stable food identifiers; FDC IDs (167512-175304) are the FoodData Central identifiers.

## Download Details

- **Exact URL:** `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`
- **File size:** ~5.8 MB (zip), ~39.8 MB uncompressed
- **Folder inside zip:** `FoodData_Central_sr_legacy_food_csv_2018-04/`
- **Release status:** Final release. SR Legacy will not be updated. The FDC Published date is permanently `2019-04-01`.
- **Latest release note:** There is no December 2025 or April 2026 update. This dataset is frozen at April 2018 data, published April 2019.

## All 18 CSV Files (with row counts)

| File                                                      | Rows (excl. header) | Description                                      |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------ |
| `food.csv`                                                | 7,793               | Master food table                                |
| `sr_legacy_food.csv`                                      | 7,793               | NDB number mapping                               |
| `food_nutrient.csv`                                       | 644,125             | Nutrient values per food (largest file, 36 MB)   |
| `food_portion.csv`                                        | 14,449              | Portion/measure weights                          |
| `food_nutrient_conversion_factor.csv`                     | 10,770              | Links foods to conversion factor tables          |
| `food_update_log_entry.csv`                               | 7,793               | Last update date per food                        |
| `food_protein_conversion_factor.csv`                      | 6,077               | Nitrogen-to-protein factors                      |
| `food_calorie_conversion_factor.csv`                      | 4,693               | Calorie conversion factors (protein/fat/carb)    |
| `food_attribute.csv`                                      | 1,074               | Common names, additional descriptions            |
| `nutrient.csv`                                            | 474                 | Nutrient definitions                             |
| `retention_factor.csv`                                    | 270                 | Cooking retention factors                        |
| `measure_unit.csv`                                        | 122                 | Unit of measure definitions                      |
| `food_nutrient_derivation.csv`                            | 64                  | How nutrient values were derived                 |
| `food_category.csv`                                       | 28                  | Food group definitions (25 active for SR Legacy) |
| `food_nutrient_source.csv`                                | 10                  | Source type for nutrient values                  |
| `all_downloaded_table_record_counts.csv`                  | 9                   | Record count summary                             |
| `food_attribute_type.csv`                                 | 5                   | Attribute type definitions                       |
| `Download & API Field Descriptions-2019-10-11-16-22.xlsx` | N/A                 | Documentation spreadsheet                        |

---

## Exact Column Headers and Sample Data

### 1. `food.csv` (Master Food Table)

**Headers:** `"fdc_id","data_type","description","food_category_id","publication_date"`

| Column           | Type        | Example                                                                             | Notes                                       |
| ---------------- | ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| fdc_id           | integer     | `167512`                                                                            | Unique FDC identifier. Range: 167512-175304 |
| data_type        | string      | `sr_legacy_food`                                                                    | Always `sr_legacy_food` for this dataset    |
| description      | string      | `Pillsbury Golden Layer Buttermilk Biscuits, Artificial Flavor, refrigerated dough` | Food name                                   |
| food_category_id | integer     | `18`                                                                                | FK to food_category.id                      |
| publication_date | date string | `2019-04-01`                                                                        | Always `2019-04-01` for SR Legacy           |

**Sample rows:**

```csv
"fdc_id","data_type","description","food_category_id","publication_date"
"167512","sr_legacy_food","Pillsbury Golden Layer Buttermilk Biscuits, Artificial Flavor, refrigerated dough","18","2019-04-01"
"167513","sr_legacy_food","Pillsbury, Cinnamon Rolls with Icing, refrigerated dough","18","2019-04-01"
"167514","sr_legacy_food","Kraft Foods, Shake N Bake Original Recipe, Coating for Pork, dry","18","2019-04-01"
"167515","sr_legacy_food","George Weston Bakeries, Thomas English Muffins","18","2019-04-01"
```

### 2. `sr_legacy_food.csv` (NDB Number Mapping)

**Headers:** `"fdc_id","NDB_number"`

| Column     | Type    | Example  | Notes                                     |
| ---------- | ------- | -------- | ----------------------------------------- |
| fdc_id     | integer | `167512` | FK to food.fdc_id                         |
| NDB_number | integer | `18634`  | Stable food identifier. Range: 1001-93600 |

**Sample rows:**

```csv
"fdc_id","NDB_number"
"167512","18634"
"167513","18635"
"167514","18637"
"167515","18639"
"167516","18932"
```

**Key insight:** NDB_number is the stable identifier that persists even when the FDC record is updated with a new fdc_id. NDB numbers start from 1001 (Butter, salted). The number is NOT zero-padded in the CSV but the first two digits loosely correspond to the food group code (e.g., NDB 1001-1323 = group 0100 Dairy; NDB 11090 = group 1100 Vegetables).

### 3. `food_category.csv` (Food Groups)

**Headers:** `"id","code","description"`

| Column      | Type             | Example                  | Notes                       |
| ----------- | ---------------- | ------------------------ | --------------------------- |
| id          | integer          | `1`                      | Surrogate key               |
| code        | string (4 chars) | `0100`                   | Zero-padded food group code |
| description | string           | `Dairy and Egg Products` | Human-readable name         |

**Complete active food groups with item counts:**

| id  | code | description                         | items |
| --- | ---- | ----------------------------------- | ----- |
| 1   | 0100 | Dairy and Egg Products              | 291   |
| 2   | 0200 | Spices and Herbs                    | 63    |
| 3   | 0300 | Baby Foods                          | 345   |
| 4   | 0400 | Fats and Oils                       | 216   |
| 5   | 0500 | Poultry Products                    | 383   |
| 6   | 0600 | Soups, Sauces, and Gravies          | 254   |
| 7   | 0700 | Sausages and Luncheon Meats         | 167   |
| 8   | 0800 | Breakfast Cereals                   | 195   |
| 9   | 0900 | Fruits and Fruit Juices             | 355   |
| 10  | 1000 | Pork Products                       | 336   |
| 11  | 1100 | Vegetables and Vegetable Products   | 814   |
| 12  | 1200 | Nut and Seed Products               | 137   |
| 13  | 1300 | Beef Products                       | 954   |
| 14  | 1400 | Beverages                           | 366   |
| 15  | 1500 | Finfish and Shellfish Products      | 264   |
| 16  | 1600 | Legumes and Legume Products         | 290   |
| 17  | 1700 | Lamb, Veal, and Game Products       | 464   |
| 18  | 1800 | Baked Products                      | 517   |
| 19  | 1900 | Sweets                              | 358   |
| 20  | 2000 | Cereal Grains and Pasta             | 181   |
| 21  | 2100 | Fast Foods                          | 312   |
| 22  | 2200 | Meals, Entrees, and Side Dishes     | 81    |
| 23  | 2500 | Snacks                              | 176   |
| 24  | 3500 | American Indian/Alaska Native Foods | 165   |
| 25  | 3600 | Restaurant Foods                    | 109   |

Three additional categories exist in the file but have 0 items in SR Legacy:

- 26 | 4500 | Branded Food Products Database | 0
- 27 | 2600 | Quality Control Materials | 0
- 28 | 1410 | Alcoholic Beverages | 0

**Total: 7,793 items across 25 active food groups**

### 4. `food_nutrient.csv` (Nutrient Values - Largest File)

**Headers:** `"id","fdc_id","nutrient_id","amount","data_points","derivation_id","min","max","median","footnote","min_year_acquired"`

| Column            | Type    | Example       | Notes                                       |
| ----------------- | ------- | ------------- | ------------------------------------------- |
| id                | integer | `1283674`     | Unique row ID                               |
| fdc_id            | integer | `167512`      | FK to food.fdc_id                           |
| nutrient_id       | integer | `1003`        | FK to nutrient.id                           |
| amount            | decimal | `5.88`        | Amount per 100g of food, in nutrient's unit |
| data_points       | integer | `1`           | Number of analytical observations           |
| derivation_id     | integer | `46`          | FK to food_nutrient_derivation.id           |
| min               | decimal | (often empty) | Minimum observed value                      |
| max               | decimal | (often empty) | Maximum observed value                      |
| median            | decimal | (often empty) | Median observed value                       |
| footnote          | string  | (often empty) | Comments on unusual aspects                 |
| min_year_acquired | integer | (often empty) | Earliest acquisition year                   |

**Sample rows:**

```csv
"id","fdc_id","nutrient_id","amount","data_points","derivation_id","min","max","median","footnote","min_year_acquired"
"1283674","167512","1003","5.88","1","46","","","","",""
"1283675","167512","1007","3.5","1","46","","","","",""
"1283676","167512","1062","1286","0","49","","","","",""
"1283677","167512","1079","1.2","1","46","","","","",""
```

### 5. `nutrient.csv` (Nutrient Definitions)

**Headers:** `"id","name","unit_name","nutrient_nbr","rank"`

| Column       | Type    | Example   | Notes                                |
| ------------ | ------- | --------- | ------------------------------------ |
| id           | integer | `1003`    | Nutrient ID (FK target)              |
| name         | string  | `Protein` | Nutrient name                        |
| unit_name    | string  | `G`       | Unit (G, MG, UG, KCAL, kJ, IU, etc.) |
| nutrient_nbr | string  | `203`     | USDA nutrient number                 |
| rank         | decimal | `600.0`   | Display sort order                   |

**Key nutrients (sample):**

```csv
"id","name","unit_name","nutrient_nbr","rank"
"1003","Protein","G","203","600.0"
"1004","Total lipid (fat)","G","204","800.0"
"1005","Carbohydrate, by difference","G","205","1110.0"
"1008","Energy","KCAL","208","300.0"
"1051","Water","G","255","100.0"
"1079","Fiber, total dietary","G","291","1200.0"
"1087","Calcium, Ca","MG","301","5300.0"
"1089","Iron, Fe","MG","303","5400.0"
"1162","Vitamin C, total ascorbic acid","MG","401","6300.0"
"2000","Total Sugars","G","269","1510.0"
```

### 6. `food_portion.csv` (Portion Sizes)

**Headers:** `"id","fdc_id","seq_num","amount","measure_unit_id","portion_description","modifier","gram_weight","data_points","footnote","min_year_acquired"`

| Column              | Type    | Example       | Notes                                                                                |
| ------------------- | ------- | ------------- | ------------------------------------------------------------------------------------ |
| id                  | integer | `81549`       | Unique row ID                                                                        |
| fdc_id              | integer | `167512`      | FK to food.fdc_id                                                                    |
| seq_num             | integer | `1`           | Display order                                                                        |
| amount              | decimal | `1`           | Number of units                                                                      |
| measure_unit_id     | integer | `9999`        | FK to measure_unit.id. `9999` = "undetermined" (most SR Legacy foods use this)       |
| portion_description | string  | (often empty) | Additional description                                                               |
| modifier            | string  | `serving`     | Unit description (e.g. "cup chopped", "waffle, square", "serving 1 roll with icing") |
| gram_weight         | decimal | `34`          | Weight in grams                                                                      |
| data_points         | integer | (often empty) | Number of observations                                                               |
| footnote            | string  | (often empty) | Comments                                                                             |
| min_year_acquired   | integer | (often empty) | Earliest acquisition year                                                            |

**Sample rows:**

```csv
"id","fdc_id","seq_num","amount","measure_unit_id","portion_description","modifier","gram_weight","data_points","footnote","min_year_acquired"
"81549","167512","1","1","9999","","serving","34","","",""
"81550","167513","1","1","9999","","serving 1 roll with icing","44","1","",""
"81553","167516","1","1","9999","","waffle, square","39","10","",""
```

### 7. `food_nutrient_derivation.csv`

**Headers:** `"id","code","description","source_id"`

| Column      | Type    | Example      | Notes                               |
| ----------- | ------- | ------------ | ----------------------------------- |
| id          | integer | `1`          | Derivation ID                       |
| code        | string  | `A`          | Short code                          |
| description | string  | `Analytical` | How the nutrient value was obtained |
| source_id   | integer | `1`          | FK to food_nutrient_source.id       |

**Key derivation codes:**

- `A` = Analytical
- `NC` = Calculated
- `NR` = Nutrient Ratio
- `Z` = Assumed zero

### 8. `food_nutrient_source.csv`

**Headers:** `"id","code","description"`

**Complete data (10 rows):**
| id | code | description |
|----|------|-------------|
| 1 | 1 | Analytical or derived from analytical |
| 2 | 4 | Calculated or imputed |
| 3 | 5 | Value manufacturer based label claim for added nutrients |
| 4 | 6 | Aggregated data involving combinations of source codes 1, 6, 12 and/or 13 |
| 5 | 7 | Assumed zero |
| 6 | 8 | Calculated from nutrient label by NDL |
| 7 | 9 | Calculated by manufacturer, not adjusted or rounded for NLEA |
| 8 | 11 | Aggregated data involving comb. of codes other than 1, 12 or 6 |
| 9 | 12 | Manufacturer's analytical; partial documentation |
| 10 | 13 | Analytical data from the literature, partial documentation |

### 9. `food_attribute.csv`

**Headers:** `"id","fdc_id","seq_num","food_attribute_type_id","name","value"`

Types (from `food_attribute_type.csv`):

- 998 = Update Log
- 999 = Attribute
- 1000 = Common Name
- 1001 = Additional Description
- 1002 = Adjustments

### 10. `food_calorie_conversion_factor.csv`

**Headers:** `"food_nutrient_conversion_factor_id","protein_value","fat_value","carbohydrate_value"`

**Sample:**

```csv
"food_nutrient_conversion_factor_id","protein_value","fat_value","carbohydrate_value"
"11672","4","9","4"
"11675","2.7","8.7","3.9"
```

### 11. `food_protein_conversion_factor.csv`

**Headers:** `"food_nutrient_conversion_factor_id","value"`

Most values are `6.25` (standard nitrogen-to-protein factor). Some foods use different factors (e.g., 5.7 for wheat, 6.38 for dairy).

### 12. `food_nutrient_conversion_factor.csv`

**Headers:** `"id","fdc_id"`

Links a food to its conversion factor rows (used by calorie and protein factor tables).

### 13. `retention_factor.csv`

**Headers:** `"id","code","food_group_id","description"`

**Sample:**

```csv
"id","code","food_group_id","description"
"1","1","1","CHEESE, BAKED"
"2","3","1","CHEESE, BROILED"
"5","101","1","EGGS, BAKED"
```

---

## NDB Number to FDC ID Mapping

- **NDB Number** is the stable food identifier from the original SR database. It persists across FDC updates.
- **FDC ID** is the FoodData Central identifier. It can change when a food record is updated.
- The `sr_legacy_food.csv` file provides the 1:1 mapping between them.
- NDB numbers range from **1001** to **93600**.
- FDC IDs range from **167512** to **175304**.
- NDB numbers loosely correlate to food groups: first 2 digits match the food group code divided by 100 (e.g., NDB 1xxx = group 0100 Dairy, NDB 11xxx = group 1100 Vegetables).

**API access:** `https://api.nal.usda.gov/fdc/v1/food/{fdcId}?api_key=DEMO_KEY`

**API search:** `https://api.nal.usda.gov/fdc/v1/foods/search?query={term}&dataType=SR%20Legacy&api_key=DEMO_KEY`

The API returns `ndbNumber` (no underscore, camelCase) in search results.

---

## Entity Relationship Diagram (for import)

```
food_category (28 rows)
  id  <--  food.food_category_id

food (7,793 rows)
  fdc_id  <--  sr_legacy_food.fdc_id
  fdc_id  <--  food_nutrient.fdc_id
  fdc_id  <--  food_portion.fdc_id
  fdc_id  <--  food_attribute.fdc_id
  fdc_id  <--  food_nutrient_conversion_factor.fdc_id
  fdc_id  <--  food_update_log_entry.id (note: this file uses "id" not "fdc_id")

sr_legacy_food (7,793 rows)
  fdc_id  -->  food.fdc_id
  NDB_number (unique stable identifier)

nutrient (474 rows)
  id  <--  food_nutrient.nutrient_id

food_nutrient (644,125 rows)
  fdc_id  -->  food.fdc_id
  nutrient_id  -->  nutrient.id
  derivation_id  -->  food_nutrient_derivation.id

food_nutrient_derivation (64 rows)
  source_id  -->  food_nutrient_source.id

food_portion (14,449 rows)
  fdc_id  -->  food.fdc_id
  measure_unit_id  -->  measure_unit.id

food_nutrient_conversion_factor (10,770 rows)
  fdc_id  -->  food.fdc_id
  id  <--  food_calorie_conversion_factor.food_nutrient_conversion_factor_id
  id  <--  food_protein_conversion_factor.food_nutrient_conversion_factor_id
```

---

## PostgreSQL Import Notes

### CSV Format Details

- All values are double-quoted
- Comma-separated
- UTF-8 encoding
- Empty strings for NULL values (e.g., `""` for missing min/max/median)
- Boolean fields use `Y`/`N` (per USDA conventions doc)
- Dates are `YYYY-MM-DD` format

### Recommended Import Order (respecting FK constraints)

1. `food_category` (no dependencies)
2. `measure_unit` (no dependencies)
3. `nutrient` (no dependencies)
4. `food_nutrient_source` (no dependencies)
5. `food_nutrient_derivation` (depends on food_nutrient_source)
6. `food` (depends on food_category)
7. `sr_legacy_food` (depends on food)
8. `food_nutrient_conversion_factor` (depends on food)
9. `food_calorie_conversion_factor` (depends on food_nutrient_conversion_factor)
10. `food_protein_conversion_factor` (depends on food_nutrient_conversion_factor)
11. `food_nutrient` (depends on food, nutrient, food_nutrient_derivation)
12. `food_portion` (depends on food, measure_unit)
13. `food_attribute_type` (no dependencies)
14. `food_attribute` (depends on food, food_attribute_type)
15. `food_update_log_entry` (depends on food)
16. `retention_factor` (depends on food_category via food_group_id)

### PostgreSQL COPY command example

```sql
COPY usda_food_category(id, code, description)
FROM '/path/to/food_category.csv'
WITH (FORMAT csv, HEADER true, QUOTE '"');
```

### Handling empty strings as NULL

```sql
COPY usda_food_nutrient(id, fdc_id, nutrient_id, amount, data_points, derivation_id, min, max, median, footnote, min_year_acquired)
FROM '/path/to/food_nutrient.csv'
WITH (FORMAT csv, HEADER true, QUOTE '"', NULL '');
```

---

## Gaps and Unknowns

- The `food_update_log_entry.csv` uses column name `id` instead of `fdc_id` for the food identifier, and `last_updated` instead of `publication_date`. This is an inconsistency to handle in import scripts.
- The `measure_unit_id` value `9999` ("undetermined") is used for most SR Legacy food portions. The actual unit description is in the `modifier` column instead.
- Three food_category entries (ids 26-28) have 0 items in SR Legacy but exist in the file because the category table is shared across all FDC data types.
- The USDA documentation PDF at `https://www.ars.usda.gov/arsuserfiles/80400525/data/sr-legacy/sr-legacy_doc.pdf` exists but could not be parsed (binary PDF). It contains the original SR Legacy documentation from the pre-FDC era.

## Sources

- [USDA FoodData Central Download Page](https://fdc.nal.usda.gov/download-datasets/)
- [FoodData Central Download Field Descriptions (PDF)](https://fdc.nal.usda.gov/portal-data/external/dataDictionary)
- [FDC API Guide](https://fdc.nal.usda.gov/api-guide/)
- [FDC FAQ](https://fdc.nal.usda.gov/faq/)
- [Data.gov SR Legacy Dataset](https://catalog.data.gov/dataset/usda-national-nutrient-database-for-standard-reference-legacy-release-d1570)
- [Ag Data Commons SR Legacy](https://agdatacommons.nal.usda.gov/articles/dataset/USDA_National_Nutrient_Database_for_Standard_Reference_Legacy_Release/24661818)
- Direct analysis of extracted CSV files from `FoodData_Central_sr_legacy_food_csv_2018-04.zip`
