// @ts-nocheck
/**
 * Backfills ingredients for recipes that were created without them
 * (due to schema mismatch on first run).
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const adminDbModule = require('../lib/db/admin')
const { createAdminClient } = adminDbModule.default ?? adminDbModule

const TENANT_ID = '90cf03a0-389b-414f-813b-d74c98188e5e'

const RECIPE_INGREDIENTS: Record<
  string,
  Array<{ name: string; quantity: string; unit: string; category: string }>
> = {
  'Pan-Seared Duck Breast with Cherry Gastrique': [
    { name: 'Duck breast', quantity: '4', unit: 'pieces', category: 'protein' },
    { name: 'Dried tart cherries', quantity: '0.5', unit: 'cup', category: 'pantry' },
    { name: 'Sherry vinegar', quantity: '3', unit: 'tbsp', category: 'pantry' },
    { name: 'Sugar', quantity: '2', unit: 'tbsp', category: 'pantry' },
    { name: 'Fresh thyme', quantity: '4', unit: 'sprigs', category: 'fresh_herb' },
  ],
  'Lobster Risotto with Saffron': [
    { name: 'Arborio rice', quantity: '2', unit: 'cups', category: 'pantry' },
    { name: 'Lobster tails', quantity: '4', unit: 'pieces', category: 'protein' },
    { name: 'Saffron threads', quantity: '1', unit: 'pinch', category: 'spice' },
    { name: 'Mascarpone', quantity: '4', unit: 'tbsp', category: 'dairy' },
    { name: 'Dry white wine', quantity: '1', unit: 'cup', category: 'pantry' },
    { name: 'Shallots', quantity: '3', unit: 'pieces', category: 'produce' },
  ],
  'Beef Tenderloin with Bordelaise Sauce': [
    { name: 'Beef tenderloin', quantity: '4', unit: 'pieces', category: 'protein' },
    { name: 'Bone marrow', quantity: '2', unit: 'pieces', category: 'protein' },
    { name: 'Red wine', quantity: '2', unit: 'cups', category: 'pantry' },
    { name: 'Demi-glace', quantity: '1', unit: 'cup', category: 'pantry' },
    { name: 'Shallots', quantity: '2', unit: 'pieces', category: 'produce' },
  ],
  'Burrata with Heirloom Tomatoes and Basil Oil': [
    { name: 'Burrata', quantity: '2', unit: 'balls', category: 'dairy' },
    { name: 'Heirloom tomatoes', quantity: '4', unit: 'large', category: 'produce' },
    { name: 'Fresh basil', quantity: '2', unit: 'cups', category: 'fresh_herb' },
    { name: 'Extra virgin olive oil', quantity: '0.5', unit: 'cup', category: 'oil' },
    { name: 'Flaky sea salt', quantity: '1', unit: 'tbsp', category: 'spice' },
  ],
  'Miso-Glazed Black Cod': [
    { name: 'Black cod fillets', quantity: '4', unit: 'pieces', category: 'protein' },
    { name: 'White miso paste', quantity: '0.5', unit: 'cup', category: 'pantry' },
    { name: 'Mirin', quantity: '3', unit: 'tbsp', category: 'pantry' },
    { name: 'Sake', quantity: '2', unit: 'tbsp', category: 'pantry' },
  ],
  'Truffle Potato Puree': [
    { name: 'Yukon Gold potatoes', quantity: '3', unit: 'lbs', category: 'produce' },
    { name: 'Unsalted butter', quantity: '1', unit: 'lb', category: 'dairy' },
    { name: 'Heavy cream', quantity: '1', unit: 'cup', category: 'dairy' },
    { name: 'Gruyere cheese', quantity: '4', unit: 'oz', category: 'dairy' },
    { name: 'Black truffle oil', quantity: '2', unit: 'tbsp', category: 'oil' },
  ],
  'Grilled Lamb Chops with Chimichurri': [
    { name: 'Lamb rack', quantity: '2', unit: 'racks', category: 'protein' },
    { name: 'Fresh parsley', quantity: '1', unit: 'bunch', category: 'fresh_herb' },
    { name: 'Fresh oregano', quantity: '0.25', unit: 'cup', category: 'fresh_herb' },
    { name: 'Red wine vinegar', quantity: '3', unit: 'tbsp', category: 'pantry' },
    { name: 'Garlic', quantity: '6', unit: 'cloves', category: 'produce' },
  ],
  'New England Clam Chowder': [
    { name: 'Littleneck clams', quantity: '4', unit: 'lbs', category: 'protein' },
    { name: 'Salt pork', quantity: '4', unit: 'oz', category: 'protein' },
    { name: 'Yukon Gold potatoes', quantity: '1.5', unit: 'lbs', category: 'produce' },
    { name: 'Heavy cream', quantity: '2', unit: 'cups', category: 'dairy' },
    { name: 'Yellow onion', quantity: '1', unit: 'large', category: 'produce' },
    { name: 'Celery', quantity: '3', unit: 'stalks', category: 'produce' },
  ],
  'Chocolate Lava Cake': [
    { name: 'Dark chocolate (70%)', quantity: '8', unit: 'oz', category: 'baking' },
    { name: 'Unsalted butter', quantity: '6', unit: 'tbsp', category: 'dairy' },
    { name: 'Eggs', quantity: '4', unit: 'large', category: 'dairy' },
    { name: 'Sugar', quantity: '0.33', unit: 'cup', category: 'baking' },
    { name: 'All-purpose flour', quantity: '2', unit: 'tbsp', category: 'baking' },
    { name: 'Creme fraiche', quantity: '0.5', unit: 'cup', category: 'dairy' },
  ],
  'Seared Scallops with Brown Butter and Capers': [
    { name: 'Dry sea scallops (U10)', quantity: '12', unit: 'pieces', category: 'protein' },
    { name: 'Unsalted butter', quantity: '4', unit: 'tbsp', category: 'dairy' },
    { name: 'Capers', quantity: '2', unit: 'tbsp', category: 'condiment' },
    { name: 'Lemon', quantity: '1', unit: 'piece', category: 'produce' },
    { name: 'Fresh parsley', quantity: '2', unit: 'tbsp', category: 'fresh_herb' },
  ],
  'Wild Mushroom Soup with Truffle Cream': [
    { name: 'Mixed wild mushrooms', quantity: '1.5', unit: 'lbs', category: 'produce' },
    { name: 'Shallots', quantity: '3', unit: 'pieces', category: 'produce' },
    { name: 'Chicken stock', quantity: '4', unit: 'cups', category: 'pantry' },
    { name: 'Dry sherry', quantity: '0.25', unit: 'cup', category: 'pantry' },
    { name: 'Heavy cream', quantity: '0.5', unit: 'cup', category: 'dairy' },
    { name: 'Black truffle oil', quantity: '1', unit: 'tbsp', category: 'oil' },
  ],
  'Pappardelle with Short Rib Ragu': [
    { name: 'Bone-in short ribs', quantity: '4', unit: 'lbs', category: 'protein' },
    { name: 'San Marzano tomatoes', quantity: '28', unit: 'oz', category: 'canned' },
    { name: 'Fresh pappardelle', quantity: '1.5', unit: 'lbs', category: 'pantry' },
    { name: 'Parmigiano-Reggiano', quantity: '4', unit: 'oz', category: 'dairy' },
    { name: 'Red wine', quantity: '2', unit: 'cups', category: 'pantry' },
  ],
  'Citrus-Cured Salmon Crudo': [
    { name: 'Sushi-grade salmon', quantity: '1', unit: 'lb', category: 'protein' },
    { name: 'Yuzu juice', quantity: '2', unit: 'tbsp', category: 'pantry' },
    { name: 'Watermelon radish', quantity: '1', unit: 'piece', category: 'produce' },
    { name: 'Microgreens', quantity: '1', unit: 'cup', category: 'produce' },
    { name: 'Toasted sesame seeds', quantity: '1', unit: 'tbsp', category: 'spice' },
  ],
  'Roasted Beet Salad with Goat Cheese Mousse': [
    { name: 'Mixed beets', quantity: '6', unit: 'medium', category: 'produce' },
    { name: 'Goat cheese', quantity: '6', unit: 'oz', category: 'dairy' },
    { name: 'Walnuts', quantity: '0.5', unit: 'cup', category: 'pantry' },
    { name: 'Sherry vinegar', quantity: '2', unit: 'tbsp', category: 'pantry' },
    { name: 'Heavy cream', quantity: '2', unit: 'tbsp', category: 'dairy' },
  ],
  'Braised Lamb Shank with Gremolata': [
    { name: 'Lamb shanks', quantity: '4', unit: 'pieces', category: 'protein' },
    { name: 'Red wine', quantity: '2', unit: 'cups', category: 'pantry' },
    { name: 'Fresh parsley', quantity: '1', unit: 'cup', category: 'fresh_herb' },
    { name: 'Lemon', quantity: '2', unit: 'pieces', category: 'produce' },
    { name: 'Garlic', quantity: '8', unit: 'cloves', category: 'produce' },
  ],
  'Creme Brulee': [
    { name: 'Heavy cream', quantity: '3', unit: 'cups', category: 'dairy' },
    { name: 'Egg yolks', quantity: '6', unit: 'large', category: 'dairy' },
    { name: 'Vanilla bean', quantity: '1', unit: 'piece', category: 'spice' },
    { name: 'Sugar', quantity: '0.5', unit: 'cup', category: 'baking' },
  ],
  'Grilled Caesar Salad': [
    { name: 'Romaine hearts', quantity: '4', unit: 'pieces', category: 'produce' },
    { name: 'Anchovy fillets', quantity: '6', unit: 'pieces', category: 'canned' },
    { name: 'Parmigiano-Reggiano', quantity: '3', unit: 'oz', category: 'dairy' },
    { name: 'Sourdough bread', quantity: '4', unit: 'slices', category: 'pantry' },
    { name: 'Egg yolk', quantity: '1', unit: 'large', category: 'dairy' },
  ],
  'Herb-Crusted Rack of Lamb': [
    { name: 'Rack of lamb', quantity: '2', unit: 'racks', category: 'protein' },
    { name: 'Dijon mustard', quantity: '3', unit: 'tbsp', category: 'condiment' },
    { name: 'Fresh rosemary', quantity: '2', unit: 'tbsp', category: 'fresh_herb' },
    { name: 'Panko breadcrumbs', quantity: '1', unit: 'cup', category: 'pantry' },
    { name: 'Garlic', quantity: '4', unit: 'cloves', category: 'produce' },
  ],
  'Coconut Panna Cotta with Mango': [
    { name: 'Coconut milk', quantity: '2', unit: 'cans', category: 'pantry' },
    { name: 'Heavy cream', quantity: '1', unit: 'cup', category: 'dairy' },
    { name: 'Gelatin sheets', quantity: '4', unit: 'sheets', category: 'baking' },
    { name: 'Ripe mango', quantity: '2', unit: 'pieces', category: 'produce' },
    { name: 'Toasted coconut flakes', quantity: '0.25', unit: 'cup', category: 'pantry' },
  ],
  'Wagyu Beef Tataki': [
    { name: 'Wagyu beef strip', quantity: '12', unit: 'oz', category: 'protein' },
    { name: 'Ponzu sauce', quantity: '3', unit: 'tbsp', category: 'condiment' },
    { name: 'Daikon radish', quantity: '4', unit: 'inches', category: 'produce' },
    { name: 'Scallions', quantity: '3', unit: 'pieces', category: 'produce' },
    { name: 'Shichimi togarashi', quantity: '1', unit: 'tsp', category: 'spice' },
  ],
}

async function main() {
  const admin = createAdminClient()
  let totalIngredients = 0
  let totalLinks = 0

  for (const [recipeName, ingredients] of Object.entries(RECIPE_INGREDIENTS)) {
    // Find recipe
    const { data: recipe } = await admin
      .from('recipes')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .ilike('name', recipeName)
      .maybeSingle()

    if (!recipe?.id) {
      console.log(`  SKIP: Recipe not found: ${recipeName}`)
      continue
    }

    // Check if already has ingredients
    const { data: existingLinks } = await admin
      .from('recipe_ingredients')
      .select('id')
      .eq('recipe_id', recipe.id)
      .limit(1)

    if (existingLinks && existingLinks.length > 0) continue

    for (const ing of ingredients) {
      // Ensure ingredient exists
      const { data: existingIng } = await admin
        .from('ingredients')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .ilike('name', ing.name)
        .maybeSingle()

      let ingredientId: string
      if (existingIng?.id) {
        ingredientId = existingIng.id
      } else {
        const { data: newIng, error: ingError } = await admin
          .from('ingredients')
          .insert({
            tenant_id: TENANT_ID,
            name: ing.name,
            category: ing.category,
            default_unit: ing.unit,
          })
          .select('id')
          .single()

        if (ingError) {
          console.error(`  FAIL ingredient ${ing.name}: ${ingError.message}`)
          continue
        }
        ingredientId = newIng.id
        totalIngredients++
      }

      // Link to recipe
      const { error: linkError } = await admin.from('recipe_ingredients').insert({
        recipe_id: recipe.id,
        ingredient_id: ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })

      if (linkError) {
        console.error(`  FAIL link ${ing.name} -> ${recipeName}: ${linkError.message}`)
      } else {
        totalLinks++
      }
    }
    console.log(`  + ${recipeName} (${ingredients.length} ingredients)`)
  }

  console.log(`\nDone: ${totalIngredients} ingredients created, ${totalLinks} recipe links`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
