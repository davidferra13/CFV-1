// Ingredient Substitution Seed Data
// Curated common substitutions (NOT AI-generated).
// These are system-level defaults available to all chefs.
// Chefs can add their own personal substitutions on top of these.

export interface SubstitutionSeed {
  original: string
  substitute: string
  ratio: string
  notes: string
  dietary_safe_for: string[]
}

export const SYSTEM_SUBSTITUTIONS: SubstitutionSeed[] = [
  // Dairy
  {
    original: 'Butter',
    substitute: 'Coconut Oil',
    ratio: '1:1',
    notes: 'Works for baking and sauteing. Adds slight coconut flavor.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Butter',
    substitute: 'Olive Oil',
    ratio: '3/4 cup per 1 cup',
    notes: 'Best for savory dishes. Not ideal for pastry.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Heavy Cream',
    substitute: 'Coconut Cream',
    ratio: '1:1',
    notes: 'Full-fat coconut cream. Adds coconut flavor.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Heavy Cream',
    substitute: 'Cashew Cream',
    ratio: '1:1',
    notes: 'Blend soaked cashews with water. Neutral flavor.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Milk',
    substitute: 'Oat Milk',
    ratio: '1:1',
    notes: 'Closest texture to dairy milk. Good for baking and sauces.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Milk',
    substitute: 'Almond Milk',
    ratio: '1:1',
    notes: 'Thinner than dairy milk. Contains tree nuts.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Sour Cream',
    substitute: 'Greek Yogurt',
    ratio: '1:1',
    notes: 'Similar tang and thickness. Lower fat.',
    dietary_safe_for: [],
  },
  {
    original: 'Sour Cream',
    substitute: 'Cashew Cream + Lemon',
    ratio: '1:1',
    notes: 'Blend cashews with lemon juice for tang.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Cream Cheese',
    substitute: 'Silken Tofu',
    ratio: '1:1',
    notes: 'Blend until smooth. Works in cheesecakes and dips.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },
  {
    original: 'Parmesan',
    substitute: 'Nutritional Yeast',
    ratio: '1:1',
    notes: 'Adds umami and cheesy flavor. Use for finishing.',
    dietary_safe_for: ['vegan', 'dairy-free'],
  },

  // Eggs
  {
    original: 'Egg (binding)',
    substitute: 'Flax Egg',
    ratio: '1 tbsp ground flax + 3 tbsp water per egg',
    notes: 'Mix and rest 5 min until gel forms. Best for cookies and quick breads.',
    dietary_safe_for: ['vegan', 'egg-free'],
  },
  {
    original: 'Egg (binding)',
    substitute: 'Chia Egg',
    ratio: '1 tbsp chia + 3 tbsp water per egg',
    notes: 'Similar to flax egg. Slightly visible seeds.',
    dietary_safe_for: ['vegan', 'egg-free'],
  },
  {
    original: 'Egg (leavening)',
    substitute: 'Aquafaba',
    ratio: '3 tbsp per egg',
    notes: 'Chickpea brine. Whips like egg whites. Great for meringues.',
    dietary_safe_for: ['vegan', 'egg-free'],
  },
  {
    original: 'Egg (moisture)',
    substitute: 'Applesauce',
    ratio: '1/4 cup per egg',
    notes: 'Adds moisture and mild sweetness. Good for cakes and muffins.',
    dietary_safe_for: ['vegan', 'egg-free'],
  },
  {
    original: 'Egg (moisture)',
    substitute: 'Mashed Banana',
    ratio: '1/4 cup per egg',
    notes: 'Adds banana flavor. Best for banana bread and pancakes.',
    dietary_safe_for: ['vegan', 'egg-free'],
  },

  // Flour / Gluten
  {
    original: 'All-Purpose Flour',
    substitute: 'Almond Flour',
    ratio: '1:1 (adjust liquid)',
    notes: 'Denser result. Reduce liquid by 10-15%. Contains tree nuts.',
    dietary_safe_for: ['gluten-free'],
  },
  {
    original: 'All-Purpose Flour',
    substitute: 'Oat Flour',
    ratio: '1:1',
    notes: 'Slightly nuttier flavor. Use certified GF oats for celiac.',
    dietary_safe_for: ['gluten-free'],
  },
  {
    original: 'All-Purpose Flour',
    substitute: '1:1 GF Blend',
    ratio: '1:1',
    notes: "Pre-mixed blends (Bob's Red Mill, King Arthur). Most reliable swap.",
    dietary_safe_for: ['gluten-free'],
  },
  {
    original: 'Breadcrumbs',
    substitute: 'Crushed Rice Crackers',
    ratio: '1:1',
    notes: 'Similar crunch for breading and topping.',
    dietary_safe_for: ['gluten-free'],
  },
  {
    original: 'Breadcrumbs',
    substitute: 'Panko',
    ratio: '1:1',
    notes: 'Lighter, crunchier coating. Check for GF panko if needed.',
    dietary_safe_for: [],
  },
  {
    original: 'Pasta',
    substitute: 'Rice Noodles',
    ratio: '1:1',
    notes: 'Different texture, cooks faster. Works with Asian and Italian sauces.',
    dietary_safe_for: ['gluten-free'],
  },

  // Sweeteners
  {
    original: 'White Sugar',
    substitute: 'Coconut Sugar',
    ratio: '1:1',
    notes: 'Lower glycemic index. Adds caramel-like flavor.',
    dietary_safe_for: ['refined-sugar-free'],
  },
  {
    original: 'White Sugar',
    substitute: 'Maple Syrup',
    ratio: '3/4 cup per 1 cup, reduce liquid by 3 tbsp',
    notes: 'Adds distinct maple flavor. Adjust liquid in recipe.',
    dietary_safe_for: ['refined-sugar-free'],
  },
  {
    original: 'White Sugar',
    substitute: 'Honey',
    ratio: '3/4 cup per 1 cup, reduce liquid by 2 tbsp',
    notes: 'Sweeter than sugar. Not vegan.',
    dietary_safe_for: ['refined-sugar-free'],
  },
  {
    original: 'Brown Sugar',
    substitute: 'Coconut Sugar + Molasses',
    ratio: '1 cup coconut sugar + 1 tbsp molasses',
    notes: 'Mimics the moisture and flavor of brown sugar.',
    dietary_safe_for: ['refined-sugar-free'],
  },
  {
    original: 'Corn Syrup',
    substitute: 'Honey',
    ratio: '1:1',
    notes: 'Works for candy and caramel. Crystallizes differently.',
    dietary_safe_for: [],
  },

  // Proteins
  {
    original: 'Chicken Breast',
    substitute: 'Turkey Breast',
    ratio: '1:1',
    notes: 'Similar texture and cook time. Slightly leaner.',
    dietary_safe_for: [],
  },
  {
    original: 'Chicken Breast',
    substitute: 'Firm Tofu',
    ratio: '1:1 by weight',
    notes: 'Press and marinate for best results. Sear for crispy exterior.',
    dietary_safe_for: ['vegan', 'vegetarian'],
  },
  {
    original: 'Ground Beef',
    substitute: 'Ground Turkey',
    ratio: '1:1',
    notes: 'Leaner, may need added fat for moisture.',
    dietary_safe_for: [],
  },
  {
    original: 'Ground Beef',
    substitute: 'Lentils',
    ratio: '1 cup cooked per pound',
    notes: 'Best mixed 50/50 or as full substitute in tacos, bolognese.',
    dietary_safe_for: ['vegan', 'vegetarian'],
  },
  {
    original: 'Bacon',
    substitute: 'Mushroom Bacon',
    ratio: 'Thin-sliced shiitake, roast at 375F',
    notes: 'Brush with soy sauce and smoked paprika before roasting.',
    dietary_safe_for: ['vegan', 'vegetarian', 'pork-free'],
  },
  {
    original: 'Gelatin',
    substitute: 'Agar Agar',
    ratio: '1 tsp agar per 1 tsp gelatin',
    notes: 'Sets firmer. Dissolve in hot liquid. Does not melt at room temp.',
    dietary_safe_for: ['vegan', 'vegetarian'],
  },

  // Herbs (fresh)
  {
    original: 'Basil',
    substitute: 'Thai Basil',
    ratio: '1:1',
    notes: 'Stronger anise flavor. Works in Asian and Italian dishes.',
    dietary_safe_for: [],
  },
  {
    original: 'Basil',
    substitute: 'Oregano',
    ratio: '1:1 dried, 2:1 fresh',
    notes: 'Different flavor profile but works in Italian dishes.',
    dietary_safe_for: [],
  },
  {
    original: 'Cilantro',
    substitute: 'Flat-Leaf Parsley + Lime',
    ratio: '1:1 parsley + squeeze of lime',
    notes: 'Best approximation for cilantro-averse guests.',
    dietary_safe_for: [],
  },
  {
    original: 'Tarragon',
    substitute: 'Chervil',
    ratio: '1:1',
    notes: 'Milder anise flavor. More delicate.',
    dietary_safe_for: [],
  },
  {
    original: 'Tarragon',
    substitute: 'Fennel Fronds',
    ratio: '1:2',
    notes: 'Stronger anise. Use half the amount and adjust.',
    dietary_safe_for: [],
  },
  {
    original: 'Rosemary',
    substitute: 'Thyme',
    ratio: '1:1',
    notes: 'Less pine-like, more earthy. Works in most roasted dishes.',
    dietary_safe_for: [],
  },
  {
    original: 'Dill',
    substitute: 'Fennel Fronds',
    ratio: '1:1',
    notes: 'Similar wispy texture. Slightly sweeter.',
    dietary_safe_for: [],
  },
  {
    original: 'Mint',
    substitute: 'Basil',
    ratio: '1:1',
    notes: 'Different flavor but works in salads and cocktails.',
    dietary_safe_for: [],
  },
  {
    original: 'Chives',
    substitute: 'Green Onion Tops',
    ratio: '1:1',
    notes: 'Slightly stronger onion flavor. Slice thin.',
    dietary_safe_for: [],
  },

  // Acids / Vinegars
  {
    original: 'Lemon Juice',
    substitute: 'Lime Juice',
    ratio: '1:1',
    notes: 'Slightly different citrus profile. Works in most recipes.',
    dietary_safe_for: [],
  },
  {
    original: 'Lemon Juice',
    substitute: 'White Wine Vinegar',
    ratio: '1/2 the amount',
    notes: 'More acidic. Start with less and adjust.',
    dietary_safe_for: [],
  },
  {
    original: 'Rice Vinegar',
    substitute: 'Apple Cider Vinegar',
    ratio: '1:1, add pinch of sugar',
    notes: 'Slightly sharper. The sugar balances the acidity.',
    dietary_safe_for: [],
  },
  {
    original: 'Balsamic Vinegar',
    substitute: 'Red Wine Vinegar + Honey',
    ratio: '1 tbsp RWV + 1/2 tsp honey per tbsp',
    notes: 'Approximates the sweetness. Not as complex.',
    dietary_safe_for: [],
  },
  {
    original: 'White Wine',
    substitute: 'Chicken/Veg Broth + Lemon',
    ratio: '1:1 broth + 1 tsp lemon per cup',
    notes: 'For deglazing and sauces. Skip the lemon for delicate dishes.',
    dietary_safe_for: ['alcohol-free'],
  },
  {
    original: 'Red Wine',
    substitute: 'Beef Broth + Red Wine Vinegar',
    ratio: '1 cup broth + 1 tbsp vinegar per cup',
    notes: 'For braises and sauces. Adds depth without alcohol.',
    dietary_safe_for: ['alcohol-free'],
  },

  // Thickeners
  {
    original: 'Cornstarch',
    substitute: 'Arrowroot Powder',
    ratio: '1:1',
    notes: 'Freezes better than cornstarch. Becomes clear when cooked.',
    dietary_safe_for: ['corn-free'],
  },
  {
    original: 'Cornstarch',
    substitute: 'Tapioca Starch',
    ratio: '2 tsp tapioca per 1 tbsp cornstarch',
    notes: 'Creates glossier texture. Good for pie fillings.',
    dietary_safe_for: ['corn-free'],
  },
  {
    original: 'Flour (thickener)',
    substitute: 'Cornstarch',
    ratio: '1 tbsp cornstarch per 2 tbsp flour',
    notes: 'Twice the thickening power. Make a slurry first.',
    dietary_safe_for: ['gluten-free'],
  },

  // Oils / Fats
  {
    original: 'Vegetable Oil',
    substitute: 'Avocado Oil',
    ratio: '1:1',
    notes: 'Higher smoke point. Neutral flavor. More expensive.',
    dietary_safe_for: [],
  },
  {
    original: 'Sesame Oil',
    substitute: 'Tahini + Neutral Oil',
    ratio: '1/2 tsp tahini + oil to volume',
    notes: 'Approximates the nutty flavor. Not as aromatic.',
    dietary_safe_for: [],
  },
]
