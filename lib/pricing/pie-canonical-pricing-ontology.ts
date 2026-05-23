import { PIE_FOOD_CATEGORIES } from './pie-categories'
import { SUBCATEGORY_FLOOR_CENTS } from './subcategory-floors'

export type PieOntologyCoverageStatus = 'covered' | 'gap'
export type PiePriceIdentityKind =
  | 'direct_price_identity'
  | 'buyable_equivalence'
  | 'fallback_only'
  | 'unsafe_equivalence'

export interface PieCanonicalCategoryMatrixEntry {
  existingCategory: string
  canonicalFamilyIds: string[]
  ontologyFamilies: string[]
  coverageStatus: PieOntologyCoverageStatus
  notes: string
}

export interface PieCanonicalSubcategoryMatrixEntry {
  existingSubcategory: string
  canonicalId: string
  canonicalName: string
  parentIds: string[]
  priceFamily: string
  priceIdentityKind: PiePriceIdentityKind
  unitBasis: string[]
  yieldBasis: string
  proofRequirements: string[]
  coverageStatus: PieOntologyCoverageStatus
}

export interface PieHighRiskFamilyMatrixEntry {
  family: string
  canonicalBranchIds: string[]
  directPriceIdentities: string[]
  buyableEquivalenceGroups: string[][]
  unsafeEquivalences: string[]
  substitutionGroup: string
  unitBasis: string[]
  yieldBasis: string
  fallbackOrder: string[]
  pricingRisks: string[]
  proofRequirements: string[]
}

export const PIE_CANONICAL_ONTOLOGY_SCOPE_FAMILIES = [
  'produce',
  'proteins',
  'seafood',
  'dairy',
  'dry_goods',
  'spices',
  'oils',
  'sweeteners',
  'prepared_goods',
  'beverages',
  'bakery',
  'frozen',
  'canned',
  'fermented',
  'extracts',
  'additives',
] as const

export const PIE_REQUIRED_HIGH_RISK_FAMILIES = [
  'tomatoes',
  'cilantro_coriander',
  'chiles_peppers',
  'dairy_cream',
  'soy',
  'wheat',
  'chicken',
  'citrus',
  'sugar',
  'seafood',
  'herbs',
  'oils',
  'spices',
  'canned_goods',
  'frozen_goods',
  'fermented_goods',
  'extracts',
  'additives',
] as const

const DEFAULT_PRICE_PROOF = [
  'canonical ingredient id',
  'store or vendor',
  'product label',
  'unit and package normalization',
  'observed timestamp',
]

const YIELD_PRICE_PROOF = [...DEFAULT_PRICE_PROOF, 'trim, bone, shell, hydration, or drained yield']

export const PIE_CATEGORY_COMPLETION_MATRIX: PieCanonicalCategoryMatrixEntry[] =
  PIE_FOOD_CATEGORIES.map((existingCategory) => {
    const normalized = existingCategory.toLowerCase()
    const categoryFamilies = canonicalFamiliesForCategory(normalized)

    return {
      existingCategory,
      canonicalFamilyIds: categoryFamilies.map((family) => `pie.family.${family}`),
      ontologyFamilies: categoryFamilies,
      coverageStatus: categoryFamilies.length > 0 ? 'covered' : 'gap',
      notes:
        existingCategory === 'flipp-circular'
          ? 'Circular source rows must resolve through the normalized product and canonical ingredient before pricing.'
          : 'Mapped from existing PIE food category into canonical price-family ontology.',
    }
  })

function buildPieSubcategoryCompletionMatrix(): PieCanonicalSubcategoryMatrixEntry[] {
  return Object.keys(SUBCATEGORY_FLOOR_CENTS)
    .sort()
    .map((existingSubcategory) => {
      const parentIds = parentIdsForSubcategory(existingSubcategory)
      const family = priceFamilyForSubcategory(existingSubcategory)

      return {
        existingSubcategory,
        canonicalId: canonicalSubcategoryId(existingSubcategory),
        canonicalName: titleize(existingSubcategory),
        parentIds,
        priceFamily: family,
        priceIdentityKind: priceIdentityKindForSubcategory(existingSubcategory),
        unitBasis: unitBasisForSubcategory(existingSubcategory),
        yieldBasis: yieldBasisForSubcategory(existingSubcategory),
        proofRequirements: proofForSubcategory(existingSubcategory),
        coverageStatus: parentIds.length > 0 ? 'covered' : 'gap',
      }
    })
}

export const PIE_HIGH_RISK_PRICE_IDENTITY_MATRIX: PieHighRiskFamilyMatrixEntry[] = [
  {
    family: 'tomatoes',
    canonicalBranchIds: [
      'ingredient.raw.plant.fruit.tomato.fresh',
      'ingredient.preserved.canned.tomato',
      'ingredient.processed.tomato.paste',
      'ingredient.processed.tomato.passata',
      'ingredient.preserved.dried.tomato',
    ],
    directPriceIdentities: [
      'fresh tomato',
      'cherry tomato',
      'heirloom tomato',
      'canned tomato',
      'tomato paste',
      'passata',
      'sun-dried tomato',
    ],
    buyableEquivalenceGroups: [
      ['roma tomato', 'vine tomato', 'field tomato'],
      ['cherry tomato', 'grape tomato'],
      ['canned whole tomato', 'canned diced tomato', 'canned crushed tomato'],
    ],
    unsafeEquivalences: [
      'fresh tomato != canned tomato',
      'fresh tomato != tomato paste',
      'tomato sauce != passata without label proof',
      'sun-dried tomato != fresh tomato',
    ],
    substitutionGroup: 'tomato_by_freshness_and_process',
    unitBasis: ['lb', 'each', 'oz', 'can', 'jar'],
    yieldBasis: 'fresh edible weight, drained canned weight, or concentrated paste weight',
    fallbackOrder: [
      'exact form',
      'same process and package',
      'same tomato price family',
      'manual review',
    ],
    pricingRisks: ['fresh versus processed collapse', 'can size ambiguity', 'concentration factor'],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'cilantro_coriander',
    canonicalBranchIds: [
      'ingredient.raw.plant.leaf.herb.cilantro.fresh',
      'ingredient.raw.plant.seed.spice.coriander.whole',
      'ingredient.processed.spice.coriander.ground',
      'ingredient.raw.plant.root.herb.coriander_root',
    ],
    directPriceIdentities: [
      'fresh cilantro leaf',
      'coriander seed',
      'ground coriander',
      'coriander root',
    ],
    buyableEquivalenceGroups: [['cilantro', 'fresh coriander', 'coriander leaf']],
    unsafeEquivalences: [
      'cilantro leaf != coriander seed',
      'ground coriander != whole coriander seed without grind conversion',
      'coriander root != cilantro bunch',
    ],
    substitutionGroup: 'coriander_by_part_and_form',
    unitBasis: ['bunch', 'oz', 'lb', 'jar'],
    yieldBasis: 'trimmed leaf weight or whole/ground seed weight',
    fallbackOrder: ['exact part and form', 'same part different package', 'manual review'],
    pricingRisks: [
      'leaf versus seed false friend',
      'bunch weight variance',
      'ground spice jar size',
    ],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'chiles_peppers',
    canonicalBranchIds: [
      'ingredient.raw.plant.fruit.chile.fresh',
      'ingredient.preserved.dried.chile',
      'ingredient.preserved.smoked.chile',
      'ingredient.processed.chile.powder',
      'ingredient.processed.chile.paste',
      'ingredient.prepared.hot_sauce',
      'ingredient.raw.plant.fruit.capsicum.bell_pepper',
    ],
    directPriceIdentities: [
      'fresh chile',
      'fresh bell pepper',
      'dried chile',
      'smoked chile',
      'chile powder',
      'chile paste',
      'hot sauce',
    ],
    buyableEquivalenceGroups: [
      ['bell pepper', 'capsicum', 'sweet pepper'],
      ['serrano pepper', 'serrano chile'],
      ['jalapeno', 'jalapeno pepper'],
    ],
    unsafeEquivalences: [
      'fresh chile != dried chile',
      'poblano != ancho without dried-form proof',
      'chipotle != fresh jalapeno',
      'hot sauce != fresh chile',
      'bell pepper != hot chile',
    ],
    substitutionGroup: 'capsicum_by_heat_freshness_and_process',
    unitBasis: ['lb', 'each', 'oz', 'jar', 'bottle'],
    yieldBasis: 'edible fresh weight or dried/ground package weight',
    fallbackOrder: [
      'exact cultivar and process',
      'same heat class and process',
      'same chile family',
      'manual review',
    ],
    pricingRisks: ['fresh/dried name pairs', 'heat-class mismatch', 'powder blend ambiguity'],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'dairy_cream',
    canonicalBranchIds: [
      'ingredient.raw.animal.milk.cow.cream.heavy',
      'ingredient.raw.animal.milk.cow.cream.whipping',
      'ingredient.fermented.dairy.sour_cream',
      'ingredient.fermented.dairy.creme_fraiche',
      'ingredient.extract.plant.coconut.cream',
    ],
    directPriceIdentities: [
      'heavy cream',
      'whipping cream',
      'sour cream',
      'creme fraiche',
      'coconut cream',
    ],
    buyableEquivalenceGroups: [
      ['heavy cream', 'heavy whipping cream'],
      ['creme fraiche', 'creme fraiche cultured cream'],
    ],
    unsafeEquivalences: [
      'heavy cream != sour cream',
      'heavy cream != coconut cream',
      'half and half != heavy cream',
      'creme fraiche != sour cream without cultured-dairy proof',
    ],
    substitutionGroup: 'cream_by_source_fat_and_culture',
    unitBasis: ['fl oz', 'pint', 'quart', 'oz', 'container'],
    yieldBasis: 'as-purchased liquid volume or cultured container weight',
    fallbackOrder: ['exact source and fat class', 'same dairy cream class', 'manual review'],
    pricingRisks: ['source confusion', 'fat percentage variance', 'container-size conversion'],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'soy',
    canonicalBranchIds: [
      'ingredient.raw.plant.seed.legume.soybean',
      'ingredient.raw.plant.seed.legume.edamame',
      'ingredient.processed.soy.tofu',
      'ingredient.processed.soy.yuba',
      'ingredient.extract.soy.soy_milk',
      'ingredient.fermented.soy.miso',
      'ingredient.fermented.soy.soy_sauce',
      'ingredient.fermented.soy.tamari',
      'ingredient.fermented.soy.tempeh',
      'ingredient.fermented.soy.natto',
      'ingredient.extract.soy.soy_oil',
    ],
    directPriceIdentities: [
      'soybean',
      'edamame',
      'tofu',
      'yuba',
      'soy milk',
      'miso',
      'soy sauce',
      'tamari',
      'tempeh',
      'natto',
      'soy oil',
    ],
    buyableEquivalenceGroups: [
      ['soy sauce', 'shoyu'],
      ['tamari', 'gluten-free tamari when label confirms'],
    ],
    unsafeEquivalences: [
      'soybean != tofu',
      'edamame != dried soybean',
      'soy milk != soy sauce',
      'miso != soy sauce',
      'soy oil != soybean',
    ],
    substitutionGroup: 'soy_by_process_and_role',
    unitBasis: ['lb', 'oz', 'block', 'bottle', 'carton', 'tub'],
    yieldBasis: 'as-purchased edible package, drained block, or liquid volume',
    fallbackOrder: [
      'exact soy form',
      'same process class',
      'same role within soy family',
      'manual review',
    ],
    pricingRisks: [
      'fermented versus unfermented collapse',
      'liquid versus solid unit mismatch',
      'gluten/allergen label dependency',
    ],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'wheat',
    canonicalBranchIds: [
      'ingredient.raw.plant.seed.cereal.wheat.berry',
      'ingredient.processed.wheat.flour.all_purpose',
      'ingredient.processed.wheat.flour.bread',
      'ingredient.processed.wheat.semolina',
      'ingredient.processed.wheat.bulgur',
      'ingredient.staple.wheat.couscous',
      'ingredient.processed.wheat.seitan',
      'ingredient.processed.wheat.breadcrumb',
    ],
    directPriceIdentities: [
      'wheat berries',
      'all purpose flour',
      'bread flour',
      'semolina',
      'bulgur',
      'couscous',
      'seitan',
      'bread crumbs',
    ],
    buyableEquivalenceGroups: [
      ['all purpose flour', 'plain flour'],
      ['breadcrumbs', 'bread crumbs'],
    ],
    unsafeEquivalences: [
      'wheat berries != flour',
      'semolina != all purpose flour',
      'couscous != bulgur',
      'seitan != flour',
      'fresh bread != dry breadcrumbs',
    ],
    substitutionGroup: 'wheat_by_milling_and_preparation',
    unitBasis: ['lb', 'oz', 'bag', 'box', 'loaf'],
    yieldBasis: 'as-purchased dry weight or prepared package weight',
    fallbackOrder: ['exact grind/preparation', 'same wheat process class', 'manual review'],
    pricingRisks: [
      'flour grade mismatch',
      'prepared staple versus raw grain',
      'gluten concentration',
    ],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'chicken',
    canonicalBranchIds: [
      'ingredient.raw.animal.bird.chicken.whole',
      'ingredient.raw.animal.bird.chicken.breast',
      'ingredient.raw.animal.bird.chicken.thigh',
      'ingredient.raw.animal.bird.chicken.wing',
      'ingredient.processed.chicken.ground',
      'ingredient.liquid.stock.chicken',
      'ingredient.fat.schmaltz',
      'ingredient.raw.animal.bird.chicken.bone',
      'ingredient.raw.animal.bird.chicken.skin',
    ],
    directPriceIdentities: [
      'whole chicken',
      'chicken breast',
      'chicken thigh',
      'chicken wing',
      'ground chicken',
      'chicken stock',
      'schmaltz',
      'chicken bones',
      'chicken skin',
    ],
    buyableEquivalenceGroups: [
      ['chicken breast', 'chicken cutlet'],
      ['chicken thigh', 'chicken leg quarter when bone-in proof exists'],
    ],
    unsafeEquivalences: [
      'whole chicken != chicken breast',
      'bone-in thigh != boneless skinless thigh',
      'chicken stock != raw chicken',
      'schmaltz != chicken skin without render yield',
      'ground chicken != chicken breast',
    ],
    substitutionGroup: 'chicken_by_cut_bone_skin_and_process',
    unitBasis: ['lb', 'each', 'quart', 'package'],
    yieldBasis: 'raw edible meat yield after bone, skin, trim, or render',
    fallbackOrder: [
      'exact cut and bone/skin state',
      'same cut family with yield transform',
      'whole-bird fallback',
      'manual review',
    ],
    pricingRisks: [
      'bone/skin state',
      'cut defaulting to breast',
      'stock/rendered-fat unit mismatch',
    ],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'citrus',
    canonicalBranchIds: [
      'ingredient.raw.plant.fruit.citrus.whole',
      'ingredient.processed.citrus.zest',
      'ingredient.extract.citrus.juice',
      'ingredient.preserved.citrus.peel',
      'ingredient.extract.citrus.essential_oil',
      'ingredient.extract.citrus.flavor',
    ],
    directPriceIdentities: [
      'whole citrus',
      'citrus zest',
      'citrus juice',
      'preserved citrus peel',
      'citrus oil',
      'citrus extract',
    ],
    buyableEquivalenceGroups: [
      ['lemon', 'fresh lemon'],
      ['lime', 'fresh lime'],
      ['orange', 'fresh orange'],
    ],
    unsafeEquivalences: [
      'whole lemon != lemon juice',
      'zest != juice',
      'preserved peel != fresh peel',
      'citrus oil != citrus extract',
    ],
    substitutionGroup: 'citrus_by_part_and_extract',
    unitBasis: ['each', 'lb', 'fl oz', 'oz', 'bottle', 'jar'],
    yieldBasis: 'whole fruit yield, juice volume, zest weight, or extract bottle volume',
    fallbackOrder: [
      'exact species and part',
      'same species different package',
      'same citrus role',
      'manual review',
    ],
    pricingRisks: [
      'whole fruit versus juice',
      'extract concentration',
      'preserved form salt/sugar content',
    ],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'sugar',
    canonicalBranchIds: [
      'ingredient.raw.plant.stem.sugarcane',
      'ingredient.raw.plant.root.sugar_beet',
      'ingredient.sweetener.sugar.white',
      'ingredient.sweetener.sugar.brown',
      'ingredient.sweetener.sugar.powdered',
      'ingredient.sweetener.molasses',
      'ingredient.sweetener.syrup',
    ],
    directPriceIdentities: [
      'cane sugar',
      'beet sugar',
      'white sugar',
      'brown sugar',
      'powdered sugar',
      'molasses',
      'syrup',
    ],
    buyableEquivalenceGroups: [
      ['granulated sugar', 'white sugar', 'table sugar'],
      ['powdered sugar', 'confectioners sugar', 'icing sugar'],
    ],
    unsafeEquivalences: [
      'white sugar != brown sugar',
      'powdered sugar != granulated sugar without anti-caking conversion',
      'molasses != brown sugar',
      'syrup != dry sugar',
    ],
    substitutionGroup: 'sweetener_by_source_refinement_and_water_content',
    unitBasis: ['lb', 'oz', 'bag', 'fl oz', 'bottle'],
    yieldBasis: 'dry weight or liquid sweetener volume with density conversion',
    fallbackOrder: ['exact refinement and water state', 'same sweetener class', 'manual review'],
    pricingRisks: ['dry versus syrup', 'source and refinement', 'powdered anti-caking ingredient'],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'seafood',
    canonicalBranchIds: [
      'ingredient.raw.animal.aquatic.finfish.fresh',
      'ingredient.raw.animal.aquatic.crustacean.shell_on',
      'ingredient.raw.animal.aquatic.crustacean.peeled',
      'ingredient.raw.animal.aquatic.mollusk.shell_on',
      'ingredient.preserved.seafood.smoked',
      'ingredient.preserved.seafood.canned',
      'ingredient.fermented.seafood.sauce',
    ],
    directPriceIdentities: [
      'fresh finfish',
      'shell-on shrimp',
      'peeled shrimp',
      'mollusk',
      'smoked fish',
      'canned seafood',
      'fish sauce',
    ],
    buyableEquivalenceGroups: [
      ['shrimp', 'prawn'],
      ['salmon fillet', 'salmon filet'],
    ],
    unsafeEquivalences: [
      'shell-on shrimp != peeled shrimp without yield factor',
      'fresh salmon != smoked salmon',
      'fresh tuna != canned tuna',
      'fish sauce != fresh fish',
      'scallop != mixed seafood',
    ],
    substitutionGroup: 'seafood_by_species_process_and_yield',
    unitBasis: ['lb', 'oz', 'can', 'bottle', 'each'],
    yieldBasis: 'edible meat yield after shell, bone, skin, drained, or smoked state',
    fallbackOrder: [
      'exact species and process',
      'same seafood class with yield transform',
      'manual review',
    ],
    pricingRisks: ['species substitution', 'shell yield', 'fresh/frozen/canned/smoked collapse'],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'herbs',
    canonicalBranchIds: [
      'ingredient.raw.plant.leaf.herb.fresh',
      'ingredient.preserved.dried.herb',
      'ingredient.processed.ground.herb',
      'ingredient.prepared.herb.paste',
    ],
    directPriceIdentities: ['fresh herb', 'dried herb', 'ground herb', 'herb paste'],
    buyableEquivalenceGroups: [
      ['parsley', 'fresh parsley'],
      ['basil', 'fresh basil'],
    ],
    unsafeEquivalences: [
      'fresh herb != dried herb',
      'dried herb != herb paste',
      'bunch != jar without yield conversion',
    ],
    substitutionGroup: 'herb_by_freshness_and_process',
    unitBasis: ['bunch', 'oz', 'lb', 'jar', 'tube'],
    yieldBasis: 'trimmed fresh leaf weight or dried jar weight',
    fallbackOrder: ['exact herb and form', 'same freshness class', 'manual review'],
    pricingRisks: ['bunch weight variance', 'fresh/dried collapse', 'premium herb grouping'],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'oils',
    canonicalBranchIds: [
      'ingredient.fat.plant.oil.olive',
      'ingredient.fat.plant.oil.extra_virgin_olive',
      'ingredient.fat.plant.oil.vegetable',
      'ingredient.fat.plant.oil.sesame',
      'ingredient.fat.plant.oil.coconut',
      'ingredient.fat.animal.rendered',
    ],
    directPriceIdentities: [
      'olive oil',
      'extra virgin olive oil',
      'vegetable oil',
      'sesame oil',
      'coconut oil',
      'rendered animal fat',
    ],
    buyableEquivalenceGroups: [
      ['extra virgin olive oil', 'evoo'],
      ['vegetable oil', 'canola oil', 'neutral oil when label allows'],
    ],
    unsafeEquivalences: [
      'extra virgin olive oil != olive oil blend',
      'toasted sesame oil != neutral sesame oil',
      'coconut oil != coconut cream',
      'animal fat != plant oil',
    ],
    substitutionGroup: 'fat_by_source_refinement_and_smoke_point',
    unitBasis: ['fl oz', 'liter', 'bottle', 'oz', 'lb'],
    yieldBasis: 'as-purchased liquid volume or rendered fat weight',
    fallbackOrder: ['exact source and refinement', 'same smoke-point/role group', 'manual review'],
    pricingRisks: ['refinement mismatch', 'premium oil label', 'volume-to-weight conversion'],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'spices',
    canonicalBranchIds: [
      'ingredient.raw.plant.seed.spice.whole',
      'ingredient.processed.spice.ground',
      'ingredient.processed.spice.blend',
      'ingredient.extract.spice.vanilla',
      'ingredient.raw.plant.flower.stigma.saffron',
    ],
    directPriceIdentities: [
      'whole spice',
      'ground spice',
      'spice blend',
      'vanilla extract',
      'saffron',
    ],
    buyableEquivalenceGroups: [
      ['black peppercorn', 'peppercorn'],
      ['cinnamon', 'ground cinnamon when form proof exists'],
    ],
    unsafeEquivalences: [
      'whole spice != ground spice without grind/yield rule',
      'spice blend != single spice',
      'saffron != turmeric',
      'vanilla extract != vanilla bean',
    ],
    substitutionGroup: 'spice_by_part_form_and_blend',
    unitBasis: ['oz', 'g', 'jar', 'bottle'],
    yieldBasis: 'as-purchased dry spice or extract bottle volume',
    fallbackOrder: ['exact spice and form', 'same form family', 'manual review'],
    pricingRisks: ['jar-size normalization', 'blend ambiguity', 'premium spice volatility'],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'canned_goods',
    canonicalBranchIds: [
      'ingredient.preserved.canned.vegetable',
      'ingredient.preserved.canned.legume',
      'ingredient.preserved.canned.seafood',
      'ingredient.preserved.canned.fruit',
    ],
    directPriceIdentities: ['canned vegetable', 'canned bean', 'canned seafood', 'canned fruit'],
    buyableEquivalenceGroups: [
      ['canned beans', 'canned bean'],
      ['canned tuna', 'tuna can'],
    ],
    unsafeEquivalences: [
      'canned item != fresh item',
      'drained weight != net weight without label proof',
      'oil-packed != water-packed',
      'salted/sweetened can != unsalted/unsweetened can',
    ],
    substitutionGroup: 'canned_by_material_pack_medium_and_drained_yield',
    unitBasis: ['can', 'oz', 'case'],
    yieldBasis: 'net weight, drained weight, or pack-medium-adjusted edible weight',
    fallbackOrder: ['exact material and can size', 'same material canned', 'manual review'],
    pricingRisks: ['can size', 'drained yield', 'pack medium', 'fresh/canned collapse'],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'frozen_goods',
    canonicalBranchIds: [
      'ingredient.preserved.frozen.produce',
      'ingredient.preserved.frozen.seafood',
      'ingredient.preserved.frozen.prepared',
    ],
    directPriceIdentities: ['frozen produce', 'frozen seafood', 'frozen prepared good'],
    buyableEquivalenceGroups: [['frozen shrimp', 'raw frozen shrimp when shell state matches']],
    unsafeEquivalences: [
      'frozen item != fresh item without thaw/drip yield',
      'frozen prepared good != raw frozen ingredient',
      'IQF seafood != block frozen seafood without package proof',
    ],
    substitutionGroup: 'frozen_by_material_process_and_yield',
    unitBasis: ['lb', 'oz', 'bag', 'box'],
    yieldBasis: 'frozen package weight with thaw/drip loss when relevant',
    fallbackOrder: ['exact frozen material and process', 'same material frozen', 'manual review'],
    pricingRisks: ['thaw loss', 'prepared versus raw', 'package-size conversion'],
    proofRequirements: YIELD_PRICE_PROOF,
  },
  {
    family: 'fermented_goods',
    canonicalBranchIds: [
      'ingredient.fermented.dairy',
      'ingredient.fermented.legume',
      'ingredient.fermented.vegetable',
      'ingredient.fermented.grain',
      'ingredient.fermented.seafood',
    ],
    directPriceIdentities: [
      'yogurt',
      'cheese',
      'miso',
      'soy sauce',
      'kimchi',
      'sourdough',
      'fish sauce',
    ],
    buyableEquivalenceGroups: [
      ['soy sauce', 'shoyu'],
      ['fish sauce', 'nam pla', 'nuoc mam'],
    ],
    unsafeEquivalences: [
      'fermented good != raw source',
      'miso != soy sauce',
      'kimchi != cabbage',
      'yogurt != milk',
      'fish sauce != fish',
    ],
    substitutionGroup: 'fermented_by_source_microbe_and_role',
    unitBasis: ['oz', 'lb', 'jar', 'bottle', 'tub'],
    yieldBasis: 'as-purchased fermented package weight or liquid volume',
    fallbackOrder: ['exact fermented identity', 'same source and role', 'manual review'],
    pricingRisks: ['raw-source collapse', 'culture/role mismatch', 'premium imported label'],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'extracts',
    canonicalBranchIds: [
      'ingredient.extract.flavor.vanilla',
      'ingredient.extract.citrus',
      'ingredient.extract.nut',
      'ingredient.extract.starch',
      'ingredient.extract.gum',
      'ingredient.extract.protein',
    ],
    directPriceIdentities: [
      'vanilla extract',
      'citrus extract',
      'almond extract',
      'starch',
      'gum',
      'protein isolate',
    ],
    buyableEquivalenceGroups: [['vanilla extract', 'pure vanilla extract']],
    unsafeEquivalences: [
      'extract != raw source',
      'vanilla extract != vanilla bean',
      'citrus oil != citrus juice',
      'starch != flour',
      'protein isolate != whole legume',
    ],
    substitutionGroup: 'extract_by_source_concentration_and_function',
    unitBasis: ['fl oz', 'oz', 'g', 'bottle', 'bag'],
    yieldBasis: 'as-purchased concentration, dry weight, or bottle volume',
    fallbackOrder: [
      'exact extract and concentration',
      'same functional extract class',
      'manual review',
    ],
    pricingRisks: [
      'concentration mismatch',
      'natural/artificial label',
      'functional substitution risk',
    ],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
  {
    family: 'additives',
    canonicalBranchIds: [
      'ingredient.additive.leavener',
      'ingredient.additive.thickener',
      'ingredient.additive.emulsifier',
      'ingredient.additive.curing_agent',
      'ingredient.additive.acidulant',
      'ingredient.additive.flavor_enhancer',
      'ingredient.additive.colorant',
    ],
    directPriceIdentities: [
      'leavener',
      'thickener',
      'emulsifier',
      'curing agent',
      'acidulant',
      'flavor enhancer',
      'colorant',
    ],
    buyableEquivalenceGroups: [
      ['baking soda', 'bicarbonate of soda'],
      ['xanthan gum', 'xanthan'],
    ],
    unsafeEquivalences: [
      'additive != raw source',
      'baking soda != baking powder',
      'nitrate/nitrite curing salt != table salt',
      'gelatin != agar',
      'MSG != yeast extract without label proof',
    ],
    substitutionGroup: 'additive_by_function_and_regulatory_identity',
    unitBasis: ['oz', 'g', 'jar', 'box', 'packet'],
    yieldBasis: 'as-purchased functional ingredient weight',
    fallbackOrder: [
      'exact additive and function',
      'same function with manual approval',
      'manual review',
    ],
    pricingRisks: ['function mismatch', 'regulatory identity', 'strength/concentration'],
    proofRequirements: DEFAULT_PRICE_PROOF,
  },
]

export const PIE_ONTOLOGY_CONSUMING_SURFACES = [
  {
    surface: 'pricing resolver',
    file: 'lib/pricing/resolve-price.ts',
    contract: 'Resolve by canonical price identity before fallback tier selection.',
  },
  {
    surface: 'buyable price contract',
    file: 'lib/pricing/buyable-price-contract.ts',
    contract: 'Expose required proof and missing proof for the exact buyable identity.',
  },
  {
    surface: 'reliability',
    file: 'lib/pricing/pie-reliability.ts',
    contract: 'Downgrade confidence for fallback-only or unsafe-equivalence matches.',
  },
  {
    surface: 'normalizer',
    file: 'lib/pricing/name-normalizer.ts',
    contract: 'Normalize aliases without collapsing unsafe source/part/form/process boundaries.',
  },
  {
    surface: 'matching utilities',
    file: 'lib/pricing/ingredient-matching-utils.ts',
    contract: 'Suggest canonical identities with explicit parent and unsafe-equivalence metadata.',
  },
  {
    surface: 'vendor catalog ingestion',
    file: 'lib/openclaw/catalog-actions.ts',
    contract: 'Attach vendor SKUs to canonical IDs and preserve package, process, and unit proof.',
  },
  {
    surface: 'recipe costing',
    file: 'lib/recipes/bulk-price-actions.ts',
    contract: 'Cost recipe lines against exact price identities and yield transforms.',
  },
  {
    surface: 'substitutions',
    file: 'lib/ingredients/substitution-actions.ts',
    contract: 'Use substitution groups, never unsafe price equivalence, for culinary alternatives.',
  },
]

function buildPieCanonicalOntologyCompletionMatrix() {
  return {
    scopeFamilies: PIE_CANONICAL_ONTOLOGY_SCOPE_FAMILIES,
    existingCategories: PIE_CATEGORY_COMPLETION_MATRIX,
    existingSubcategories: PIE_SUBCATEGORY_COMPLETION_MATRIX,
    highRiskFamilies: PIE_HIGH_RISK_PRICE_IDENTITY_MATRIX,
    consumingSurfaces: PIE_ONTOLOGY_CONSUMING_SURFACES,
    proofSummary: {
      categoryCount: PIE_CATEGORY_COMPLETION_MATRIX.length,
      subcategoryCount: PIE_SUBCATEGORY_COMPLETION_MATRIX.length,
      highRiskFamilyCount: PIE_HIGH_RISK_PRICE_IDENTITY_MATRIX.length,
      categoryGaps: PIE_CATEGORY_COMPLETION_MATRIX.filter(
        (entry) => entry.coverageStatus === 'gap'
      ),
      subcategoryGaps: PIE_SUBCATEGORY_COMPLETION_MATRIX.filter(
        (entry) => entry.coverageStatus === 'gap'
      ),
      requiredHighRiskFamilies: PIE_REQUIRED_HIGH_RISK_FAMILIES,
    },
  } as const
}

function canonicalFamiliesForCategory(normalizedCategory: string): string[] {
  if (normalizedCategory.includes('produce')) return ['produce']
  if (normalizedCategory.includes('protein')) return ['proteins']
  if (normalizedCategory.includes('meat') || normalizedCategory.includes('seafood')) {
    return ['proteins', 'seafood']
  }
  if (normalizedCategory.includes('dairy')) return ['dairy']
  if (normalizedCategory.includes('bakery')) return ['bakery', 'dry_goods']
  if (normalizedCategory.includes('grain') || normalizedCategory.includes('dry goods')) {
    return ['dry_goods']
  }
  if (normalizedCategory.includes('pantry')) {
    return ['dry_goods', 'oils', 'spices', 'canned', 'fermented', 'extracts', 'additives']
  }
  if (normalizedCategory.includes('frozen')) return ['frozen']
  if (normalizedCategory.includes('deli') || normalizedCategory.includes('prepared')) {
    return ['prepared_goods', 'proteins', 'fermented']
  }
  if (normalizedCategory.includes('snack')) return ['prepared_goods', 'dry_goods']
  if (normalizedCategory.includes('condiment'))
    return ['prepared_goods', 'fermented', 'spices', 'oils']
  if (normalizedCategory.includes('oil') || normalizedCategory.includes('vinegar')) {
    return ['oils', 'spices', 'fermented']
  }
  if (normalizedCategory.includes('baking'))
    return ['dry_goods', 'sweeteners', 'extracts', 'additives']
  if (normalizedCategory.includes('canned')) return ['canned']
  if (normalizedCategory.includes('beverage') || normalizedCategory.includes('alcohol')) {
    return ['beverages', 'fermented', 'extracts']
  }
  if (normalizedCategory.includes('breakfast')) return ['dry_goods', 'dairy', 'prepared_goods']
  if (normalizedCategory.includes('international')) {
    return ['produce', 'proteins', 'seafood', 'dry_goods', 'spices', 'oils', 'fermented']
  }
  if (normalizedCategory.includes('organic') || normalizedCategory.includes('natural')) {
    return ['produce', 'proteins', 'seafood', 'dairy', 'dry_goods']
  }
  if (normalizedCategory.includes('flipp')) {
    return ['produce', 'proteins', 'seafood', 'dairy', 'dry_goods', 'prepared_goods']
  }
  return []
}

function canonicalSubcategoryId(subcategory: string): string {
  return `pie.price_identity.${subcategory.replace(/_/g, '.')}`
}

function titleize(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function priceFamilyForSubcategory(subcategory: string): string {
  return `pie.price_family.${parentFamilyForSubcategory(subcategory)}`
}

function parentFamilyForSubcategory(subcategory: string): string {
  if (proteinSubcategories.has(subcategory)) return 'proteins'
  if (seafoodSubcategories.has(subcategory)) return 'seafood'
  if (produceSubcategories.has(subcategory)) return 'produce'
  if (dairySubcategories.has(subcategory)) return 'dairy'
  if (herbSubcategories.has(subcategory)) return 'herbs'
  if (grainSubcategories.has(subcategory)) return 'dry_goods'
  if (spiceSubcategories.has(subcategory)) return 'spices'
  if (oilSubcategories.has(subcategory)) return 'oils'
  if (nutSubcategories.has(subcategory)) return 'nuts'
  if (legumeSubcategories.has(subcategory)) return 'legumes'
  if (beverageSubcategories.has(subcategory)) return 'beverages'
  if (condimentSubcategories.has(subcategory)) return 'prepared_goods'
  if (sweetSubcategories.has(subcategory)) return 'sweeteners'
  return 'unmapped'
}

function parentIdsForSubcategory(subcategory: string): string[] {
  const family = parentFamilyForSubcategory(subcategory)
  if (family === 'unmapped') return []

  const parents = [`pie.family.${family}`]

  if (subcategory.includes('chicken')) parents.push('ingredient.raw.animal.bird.chicken')
  if (subcategory.includes('tomato')) parents.push('ingredient.raw.plant.fruit.tomato')
  if (subcategory.includes('cream')) parents.push('ingredient.raw.animal.milk.cream')
  if (subcategory.includes('shrimp'))
    parents.push('ingredient.raw.animal.aquatic.crustacean.shrimp')
  if (subcategory.includes('tuna')) parents.push('ingredient.raw.animal.aquatic.finfish.tuna')
  if (subcategory.includes('salmon')) parents.push('ingredient.raw.animal.aquatic.finfish.salmon')
  if (subcategory.includes('oil')) parents.push('ingredient.fat')
  if (subcategory.includes('vinegar')) parents.push('ingredient.seasoning.acid.vinegar')
  if (subcategory.includes('sugar')) parents.push('ingredient.sweetener.sugar')
  if (subcategory.includes('vanilla')) parents.push('ingredient.extract.flavor.vanilla')

  return parents
}

function priceIdentityKindForSubcategory(subcategory: string): PiePriceIdentityKind {
  if (/canned|smoked|dried|cooked|fresh|ground|premium|artisan/.test(subcategory)) {
    return 'direct_price_identity'
  }
  if (/common|whole|breast|thigh|wing|steak|roast|chop|loin|shoulder|rib/.test(subcategory)) {
    return 'buyable_equivalence'
  }
  return 'fallback_only'
}

function unitBasisForSubcategory(subcategory: string): string[] {
  if (beverageSubcategories.has(subcategory) || oilSubcategories.has(subcategory)) {
    return ['fl oz', 'bottle', 'liter']
  }
  if (dairySubcategories.has(subcategory)) return ['oz', 'lb', 'fl oz', 'container']
  if (spiceSubcategories.has(subcategory)) return ['oz', 'g', 'jar']
  if (condimentSubcategories.has(subcategory)) return ['oz', 'fl oz', 'jar', 'bottle']
  if (produceEachSubcategories.has(subcategory)) return ['each', 'lb']
  return ['lb', 'oz', 'package']
}

function yieldBasisForSubcategory(subcategory: string): string {
  if (/bone|whole|wing|thigh|rib|shrimp|crab|lobster|clam|mussel|oyster/.test(subcategory)) {
    return 'edible yield after bone, shell, trim, or drained loss'
  }
  if (/canned|can/.test(subcategory)) return 'net weight or drained edible weight'
  if (/dried|ground|spice|herb/.test(subcategory)) return 'as-purchased dry weight'
  if (beverageSubcategories.has(subcategory) || oilSubcategories.has(subcategory)) {
    return 'as-purchased liquid volume'
  }
  return 'as-purchased edible weight'
}

function proofForSubcategory(subcategory: string): string[] {
  if (
    /whole|bone|rib|shrimp|crab|lobster|clam|mussel|oyster|canned|dried|ground/.test(subcategory)
  ) {
    return YIELD_PRICE_PROOF
  }
  return DEFAULT_PRICE_PROOF
}

const proteinSubcategories = new Set([
  'chicken_whole',
  'chicken_breast',
  'chicken_thigh',
  'chicken_wing',
  'ground_beef',
  'beef_steak',
  'beef_roast',
  'beef_premium',
  'beef_ribs',
  'pork_chop',
  'pork_loin',
  'pork_shoulder',
  'pork_ribs',
  'pork_bacon',
  'pork_ground',
  'lamb',
  'lamb_rack',
  'lamb_ground',
  'veal',
  'turkey_whole',
  'turkey_breast',
  'turkey_ground',
  'duck',
  'bison',
  'venison',
  'sausage',
  'hot_dog',
  'deli_meat',
])

const seafoodSubcategories = new Set([
  'shrimp',
  'shrimp_cooked',
  'salmon',
  'salmon_smoked',
  'tuna_fresh',
  'tuna_canned',
  'cod',
  'halibut',
  'tilapia',
  'catfish',
  'trout',
  'sea_bass',
  'swordfish',
  'crab',
  'lobster',
  'scallop',
  'mussel',
  'clam',
  'oyster',
  'calamari',
  'sardine',
])

const produceSubcategories = new Set([
  'tomato',
  'tomato_cherry',
  'tomato_heirloom',
  'onion',
  'garlic',
  'potato',
  'potato_sweet',
  'carrot',
  'celery',
  'bell_pepper',
  'lettuce',
  'spinach',
  'kale',
  'broccoli',
  'cauliflower',
  'zucchini',
  'squash_winter',
  'mushroom_common',
  'mushroom_specialty',
  'mushroom_truffle',
  'avocado',
  'lemon',
  'lime',
  'apple',
  'banana',
  'berry_common',
  'berry_premium',
  'grape',
  'mango',
  'pineapple',
  'melon',
  'citrus',
  'corn',
  'asparagus',
  'artichoke',
  'eggplant',
  'green_bean',
  'pea',
  'cucumber',
  'radish',
  'beet',
  'turnip',
  'cabbage',
])

const dairySubcategories = new Set([
  'milk',
  'cream',
  'half_and_half',
  'butter',
  'butter_premium',
  'cheese_common',
  'cheese_premium',
  'cheese_artisan',
  'yogurt',
  'sour_cream',
  'cream_cheese',
  'egg',
])

const herbSubcategories = new Set(['herb_common', 'herb_premium', 'herb_dried'])

const grainSubcategories = new Set([
  'rice',
  'rice_premium',
  'pasta_dry',
  'pasta_fresh',
  'flour',
  'bread',
  'bread_artisan',
  'oat',
  'quinoa',
  'couscous',
])

const spiceSubcategories = new Set([
  'spice_common',
  'spice_premium',
  'saffron',
  'peppercorn',
  'cinnamon',
  'vanilla_extract',
])

const oilSubcategories = new Set([
  'olive_oil',
  'olive_oil_premium',
  'vegetable_oil',
  'sesame_oil',
  'coconut_oil',
  'vinegar',
  'vinegar_balsamic',
])

const nutSubcategories = new Set([
  'almond',
  'walnut',
  'pecan',
  'cashew',
  'pistachio',
  'pine_nut',
  'macadamia',
  'peanut',
])

const legumeSubcategories = new Set(['bean_dry', 'bean_canned', 'lentil', 'chickpea'])

const beverageSubcategories = new Set(['coffee', 'tea', 'juice', 'wine_cooking', 'beer'])

const condimentSubcategories = new Set([
  'soy_sauce',
  'hot_sauce',
  'mustard',
  'ketchup',
  'mayo',
  'salsa',
  'fish_sauce',
  'miso',
  'tahini',
  'harissa',
])

const sweetSubcategories = new Set([
  'sugar',
  'honey',
  'maple_syrup',
  'chocolate',
  'chocolate_premium',
])

const produceEachSubcategories = new Set([
  'avocado',
  'lemon',
  'lime',
  'mango',
  'pineapple',
  'melon',
  'corn',
  'artichoke',
  'cucumber',
])

export const PIE_SUBCATEGORY_COMPLETION_MATRIX = buildPieSubcategoryCompletionMatrix()

export const PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX = buildPieCanonicalOntologyCompletionMatrix()
