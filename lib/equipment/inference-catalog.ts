// Equipment Inference Catalog
// ~80 deterministic rules. No AI, no LLM calls.
// Signal types: technique, component, service, guest_count, ingredient

import type { InferenceRule } from './types'

export const INFERENCE_CATALOG: InferenceRule[] = [
  // ============================================
  // TECHNIQUE SIGNALS
  // ============================================
  {
    id: 'tech-sous-vide',
    signal_type: 'technique',
    pattern: /sous[\s-]?vide|water[\s-]?bath|circulator/i,
    equipment: ['Immersion Circulator', 'Vacuum Sealer', 'Cambro (Water Bath)'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'tech-torch',
    signal_type: 'technique',
    pattern: /torch|brûlée|brulee|caramelize\s+sugar/i,
    equipment: ['Kitchen Torch'],
    category_slug: 'small-appliances',
    base_confidence: 0.9,
  },
  {
    id: 'tech-sear',
    signal_type: 'technique',
    pattern: /\bsear\b|pan[\s-]?sear|hard[\s-]?sear/i,
    equipment: ['Cast Iron Skillet', 'Tongs'],
    category_slug: 'cookware',
    base_confidence: 0.7,
  },
  {
    id: 'tech-saute',
    signal_type: 'technique',
    pattern: /\bsauté\b|\bsaute\b/i,
    equipment: ['Saute Pan'],
    category_slug: 'cookware',
    base_confidence: 0.65,
  },
  {
    id: 'tech-braise',
    signal_type: 'technique',
    pattern: /\bbraise\b|braised|braising/i,
    equipment: ['Dutch Oven'],
    category_slug: 'cookware',
    base_confidence: 0.8,
  },
  {
    id: 'tech-roast',
    signal_type: 'technique',
    pattern: /\broast\b|roasted|roasting/i,
    equipment: ['Roasting Pan', 'Probe Thermometer'],
    category_slug: 'cookware',
    base_confidence: 0.7,
  },
  {
    id: 'tech-grill',
    signal_type: 'technique',
    pattern: /\bgrill\b|grilled|grilling|charcoal/i,
    equipment: ['Grill', 'Grill Tongs', 'Grill Brush'],
    category_slug: 'cookware',
    base_confidence: 0.8,
  },
  {
    id: 'tech-deep-fry',
    signal_type: 'technique',
    pattern: /deep[\s-]?fr[yi]|tempura|batter[\s-]?fr[yi]/i,
    equipment: ['Deep Fryer', 'Spider Strainer', 'Instant-Read Thermometer'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'tech-shallow-fry',
    signal_type: 'technique',
    pattern: /shallow[\s-]?fr[yi]|pan[\s-]?fr[yi]/i,
    equipment: ['Skillet', 'Spider Strainer'],
    category_slug: 'cookware',
    base_confidence: 0.65,
  },
  {
    id: 'tech-blanch',
    signal_type: 'technique',
    pattern: /\bblanch\b|blanched|blanching|ice[\s-]?bath/i,
    equipment: ['Stockpot', 'Spider Strainer', 'Mixing Bowl (ice bath)'],
    category_slug: 'cookware',
    base_confidence: 0.75,
  },
  {
    id: 'tech-smoke',
    signal_type: 'technique',
    pattern: /\bsmoke\b|smoked|smoking|cold[\s-]?smoke|hot[\s-]?smoke/i,
    equipment: ['Smoker', 'Probe Thermometer'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'tech-blend',
    signal_type: 'technique',
    pattern: /\bblend\b|blended|purée|puree|emulsif/i,
    equipment: ['Immersion Blender'],
    category_slug: 'small-appliances',
    base_confidence: 0.7,
  },
  {
    id: 'tech-whip',
    signal_type: 'technique',
    pattern: /\bwhip\b|whipped|whipping|soft[\s-]?peaks|stiff[\s-]?peaks/i,
    equipment: ['Stand Mixer', 'Whisk'],
    category_slug: 'prep-tools',
    base_confidence: 0.7,
  },
  {
    id: 'tech-fold',
    signal_type: 'technique',
    pattern: /\bfold\b|folding|gently fold/i,
    equipment: ['Rubber Spatula'],
    category_slug: 'prep-tools',
    base_confidence: 0.6,
  },
  {
    id: 'tech-julienne',
    signal_type: 'technique',
    pattern: /julienne|brunoise|chiffonade|fine[\s-]?dice/i,
    equipment: ["Chef's Knife", 'Cutting Board'],
    category_slug: 'knives-cutting',
    base_confidence: 0.6,
  },
  {
    id: 'tech-mandoline-slice',
    signal_type: 'technique',
    pattern: /mandoline|paper[\s-]?thin|uniformly[\s-]?slic/i,
    equipment: ['Mandoline', 'Cut-Resistant Glove'],
    category_slug: 'prep-tools',
    base_confidence: 0.8,
  },
  {
    id: 'tech-strain',
    signal_type: 'technique',
    pattern: /\bstrain\b|strained|straining|pass through|chinois/i,
    equipment: ['Fine Mesh Strainer'],
    category_slug: 'prep-tools',
    base_confidence: 0.7,
  },
  {
    id: 'tech-reduce',
    signal_type: 'technique',
    pattern: /\breduce\b|reduction|nappé|nappe/i,
    equipment: ['Saucepan'],
    category_slug: 'cookware',
    base_confidence: 0.6,
  },
  {
    id: 'tech-deglaze',
    signal_type: 'technique',
    pattern: /deglaze|fond|pan[\s-]?sauce/i,
    equipment: ['Saute Pan'],
    category_slug: 'cookware',
    base_confidence: 0.6,
  },
  {
    id: 'tech-bake',
    signal_type: 'technique',
    pattern: /\bbake\b|baked|baking|in[\s-]?the[\s-]?oven/i,
    equipment: ['Sheet Tray', 'Parchment Paper'],
    category_slug: 'bakeware',
    base_confidence: 0.65,
  },
  {
    id: 'tech-broil',
    signal_type: 'technique',
    pattern: /\bbroil\b|broiled|broiling|salamander/i,
    equipment: ['Sheet Tray'],
    category_slug: 'bakeware',
    base_confidence: 0.65,
  },
  {
    id: 'tech-steam',
    signal_type: 'technique',
    pattern: /\bsteam\b|steamed|steaming|steam[\s-]?basket/i,
    equipment: ['Stockpot', 'Steamer Insert'],
    category_slug: 'cookware',
    base_confidence: 0.75,
  },
  {
    id: 'tech-confit',
    signal_type: 'technique',
    pattern: /\bconfit\b|confited|slow[\s-]?poach/i,
    equipment: ['Dutch Oven', 'Probe Thermometer'],
    category_slug: 'cookware',
    base_confidence: 0.8,
  },
  {
    id: 'tech-cure',
    signal_type: 'technique',
    pattern: /\bcure\b|cured|curing|dry[\s-]?cure|wet[\s-]?cure/i,
    equipment: ['Sheet Tray', 'Plastic Wrap', 'Digital Scale'],
    category_slug: 'prep-tools',
    base_confidence: 0.75,
  },
  {
    id: 'tech-ferment',
    signal_type: 'technique',
    pattern: /ferment|fermented|fermentation|lacto/i,
    equipment: ['Mason Jars', 'Digital Scale', 'Fermentation Weights'],
    category_slug: 'storage-transport',
    base_confidence: 0.8,
  },
  {
    id: 'tech-vacuum-seal',
    signal_type: 'technique',
    pattern: /vacuum[\s-]?seal|vac[\s-]?pack|cryovac/i,
    equipment: ['Vacuum Sealer', 'Vacuum Sealer Bags'],
    category_slug: 'storage-transport',
    base_confidence: 0.9,
  },
  {
    id: 'tech-pasta-roll',
    signal_type: 'technique',
    pattern: /pasta[\s-]?machine|roll[\s-]?out[\s-]?pasta|laminate[\s-]?dough|sheet[\s-]?pasta/i,
    equipment: ['Pasta Machine', 'Bench Scraper'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'tech-dehydrate',
    signal_type: 'technique',
    pattern: /dehydrat|dried|drying|dehydrator/i,
    equipment: ['Dehydrator'],
    category_slug: 'small-appliances',
    base_confidence: 0.8,
  },
  {
    id: 'tech-temper-chocolate',
    signal_type: 'technique',
    pattern: /temper[\s-]?chocolate|chocolate[\s-]?temper|seed[\s-]?method/i,
    equipment: ['Double Boiler', 'Instant-Read Thermometer', 'Offset Spatula'],
    category_slug: 'prep-tools',
    base_confidence: 0.85,
  },
  {
    id: 'tech-pipe',
    signal_type: 'technique',
    pattern: /\bpipe\b|piped|piping[\s-]?bag|pastry[\s-]?bag/i,
    equipment: ['Piping Bags', 'Piping Tips'],
    category_slug: 'prep-tools',
    base_confidence: 0.8,
  },

  // ============================================
  // COMPONENT / DISH TYPE SIGNALS
  // ============================================
  {
    id: 'comp-ice-cream',
    signal_type: 'component',
    pattern: /ice[\s-]?cream|gelato|sorbet|frozen[\s-]?dessert/i,
    equipment: ['Ice Cream Machine', 'Freezer-Safe Container'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'comp-bread',
    signal_type: 'component',
    pattern: /\bbread\b|brioche|focaccia|sourdough|ciabatta|baguette/i,
    equipment: ['Sheet Tray', 'Bench Scraper', 'Proofing Basket', 'Digital Scale'],
    category_slug: 'bakeware',
    base_confidence: 0.75,
  },
  {
    id: 'comp-pastry',
    signal_type: 'component',
    pattern: /pastry|puff[\s-]?pastry|pie[\s-]?crust|tart[\s-]?shell|phyllo/i,
    equipment: ['Rolling Pin', 'Pie Dish', 'Bench Scraper'],
    category_slug: 'bakeware',
    base_confidence: 0.75,
  },
  {
    id: 'comp-cake',
    signal_type: 'component',
    pattern: /\bcake\b|layer[\s-]?cake|genoise|sponge[\s-]?cake/i,
    equipment: ['Cake Pan', 'Cooling Rack', 'Offset Spatula', 'Cake Stand'],
    category_slug: 'bakeware',
    base_confidence: 0.8,
  },
  {
    id: 'comp-sauce',
    signal_type: 'component',
    pattern: /\bsauce\b|vinaigrette|dressing|jus|gravy|beurre/i,
    equipment: ['Saucepan', 'Whisk'],
    category_slug: 'cookware',
    base_confidence: 0.6,
  },
  {
    id: 'comp-stock',
    signal_type: 'component',
    pattern: /\bstock\b|bone[\s-]?broth|fumet|dashi|consommé|consomme/i,
    equipment: ['Stockpot', 'Fine Mesh Strainer', 'Cheesecloth'],
    category_slug: 'cookware',
    base_confidence: 0.75,
  },
  {
    id: 'comp-risotto',
    signal_type: 'component',
    pattern: /risotto|arborio|carnaroli/i,
    equipment: ['Heavy Saucepan', 'Ladle', 'Wooden Spoon'],
    category_slug: 'cookware',
    base_confidence: 0.7,
  },
  {
    id: 'comp-salad',
    signal_type: 'component',
    pattern: /\bsalad\b|mixed[\s-]?greens|composed[\s-]?salad/i,
    equipment: ['Salad Spinner', 'Large Mixing Bowl', 'Tongs'],
    category_slug: 'prep-tools',
    base_confidence: 0.6,
  },
  {
    id: 'comp-ceviche',
    signal_type: 'component',
    pattern: /ceviche|crudo|tartare|carpaccio/i,
    equipment: ['Sharp Knife', 'Mixing Bowl', 'Ring Mold'],
    category_slug: 'knives-cutting',
    base_confidence: 0.7,
  },
  {
    id: 'comp-terrine',
    signal_type: 'component',
    pattern: /terrine|pâté|pate|forcemeat/i,
    equipment: ['Terrine Mold', 'Food Processor', 'Plastic Wrap'],
    category_slug: 'bakeware',
    base_confidence: 0.8,
  },
  {
    id: 'comp-custard',
    signal_type: 'component',
    pattern: /custard|crème[\s-]?anglaise|creme[\s-]?anglaise|panna[\s-]?cotta/i,
    equipment: ['Saucepan', 'Fine Mesh Strainer', 'Ramekins'],
    category_slug: 'cookware',
    base_confidence: 0.75,
  },
  {
    id: 'comp-mousse',
    signal_type: 'component',
    pattern: /mousse|bavarian|chiffon/i,
    equipment: ['Stand Mixer', 'Rubber Spatula', 'Ring Mold'],
    category_slug: 'prep-tools',
    base_confidence: 0.75,
  },
  {
    id: 'comp-ravioli',
    signal_type: 'component',
    pattern: /ravioli|tortellini|agnolotti|filled[\s-]?pasta|dumpling/i,
    equipment: ['Pasta Machine', 'Bench Scraper', 'Sheet Tray'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'comp-steak',
    signal_type: 'component',
    pattern: /\bsteak\b|filet[\s-]?mignon|strip[\s-]?steak|ribeye|tomahawk/i,
    equipment: ['Cast Iron Skillet', 'Tongs', 'Instant-Read Thermometer'],
    category_slug: 'cookware',
    base_confidence: 0.7,
  },
  {
    id: 'comp-whole-fish',
    signal_type: 'component',
    pattern: /whole[\s-]?fish|fish[\s-]?en[\s-]?croute|branzino|snapper/i,
    equipment: ['Fish Spatula', 'Sheet Tray', 'Probe Thermometer'],
    category_slug: 'prep-tools',
    base_confidence: 0.75,
  },

  // ============================================
  // SERVICE STYLE SIGNALS
  // ============================================
  {
    id: 'svc-buffet',
    signal_type: 'service',
    pattern: /\bbuffet\b|self[\s-]?serve|buffet[\s-]?style/i,
    equipment: ['Chafing Dishes', 'Sterno', 'Serving Spoons', 'Serving Tongs'],
    category_slug: 'serving',
    base_confidence: 0.75,
  },
  {
    id: 'svc-cocktail',
    signal_type: 'service',
    pattern: /cocktail[\s-]?(?:party|hour|reception)|passed[\s-]?(?:apps|hors|canap)/i,
    equipment: ['Small Platters', 'Cocktail Napkins', 'Picks'],
    category_slug: 'serving',
    base_confidence: 0.75,
  },
  {
    id: 'svc-plated',
    signal_type: 'service',
    pattern: /plated[\s-]?(?:dinner|service|course)|sit[\s-]?down/i,
    equipment: ['Dinner Plates', 'Salad Plates', 'Ring Molds', 'Squeeze Bottles'],
    category_slug: 'serving',
    base_confidence: 0.7,
  },
  {
    id: 'svc-tasting-menu',
    signal_type: 'service',
    pattern: /tasting[\s-]?menu|multi[\s-]?course|degustation|\d+[\s-]?course/i,
    equipment: ['Small Plates', 'Tasting Spoons', 'Squeeze Bottles', 'Tweezers'],
    category_slug: 'serving',
    base_confidence: 0.8,
  },
  {
    id: 'svc-family-style',
    signal_type: 'service',
    pattern: /family[\s-]?style|communal|shared[\s-]?platter/i,
    equipment: ['Large Platters', 'Serving Spoons', 'Serving Forks'],
    category_slug: 'serving',
    base_confidence: 0.7,
  },
  {
    id: 'svc-bbq',
    signal_type: 'service',
    pattern: /\bbbq\b|barbecue|cookout|outdoor[\s-]?grill/i,
    equipment: ['Grill', 'Charcoal/Propane', 'Grill Tongs', 'Sheet Trays', 'Cooler'],
    category_slug: 'cookware',
    base_confidence: 0.8,
  },
  {
    id: 'svc-catering',
    signal_type: 'service',
    pattern: /cater|catering|off[\s-]?site[\s-]?event/i,
    equipment: ['Cambros', 'Hotel Pans', 'Sheet Tray Rack', 'Cooler'],
    category_slug: 'storage-transport',
    base_confidence: 0.75,
  },

  // ============================================
  // GUEST COUNT SIGNALS
  // ============================================
  {
    id: 'guest-large-25',
    signal_type: 'guest_count',
    pattern: /^(2[5-9]|[3-4]\d)$/,
    equipment: ['Extra Sheet Trays', 'Extra Hotel Pans', 'Cambro'],
    category_slug: 'storage-transport',
    base_confidence: 0.65,
  },
  {
    id: 'guest-large-50',
    signal_type: 'guest_count',
    pattern: /^([5-9]\d|\d{3,})$/,
    equipment: [
      'Cambros (2+)',
      'Hotel Pans (6+)',
      'Sheet Tray Rack',
      'Cooler',
      'Hand Washing Station',
    ],
    category_slug: 'storage-transport',
    base_confidence: 0.7,
  },

  // ============================================
  // INGREDIENT SIGNALS
  // ============================================
  {
    id: 'ing-liquid-nitrogen',
    signal_type: 'ingredient',
    pattern: /liquid[\s-]?nitrogen|LN2|cryo/i,
    equipment: ['Dewar', 'Cryo Gloves', 'Safety Goggles'],
    category_slug: 'small-appliances',
    base_confidence: 0.9,
  },
  {
    id: 'ing-truffle',
    signal_type: 'ingredient',
    pattern: /\btruffle\b|truffle[\s-]?shav/i,
    equipment: ['Truffle Slicer', 'Microplane'],
    category_slug: 'prep-tools',
    base_confidence: 0.75,
  },
  {
    id: 'ing-siphon',
    signal_type: 'ingredient',
    pattern: /N2O|whip[\s-]?cream[\s-]?charger|siphon|ISI[\s-]?whip/i,
    equipment: ['ISI Siphon', 'N2O Chargers'],
    category_slug: 'small-appliances',
    base_confidence: 0.85,
  },
  {
    id: 'ing-agar',
    signal_type: 'ingredient',
    pattern: /\bagar\b|gellan|methylcellulose|xanthan|spherification/i,
    equipment: ['Digital Scale', 'Immersion Blender', 'Squeeze Bottles', 'Slotted Spoon'],
    category_slug: 'prep-tools',
    base_confidence: 0.8,
  },
  {
    id: 'ing-whole-animal',
    signal_type: 'ingredient',
    pattern: /whole[\s-]?pig|whole[\s-]?lamb|whole[\s-]?animal|suckling/i,
    equipment: ['Boning Knife', 'Butcher Block', 'Meat Hooks'],
    category_slug: 'knives-cutting',
    base_confidence: 0.85,
  },
  {
    id: 'ing-shellfish',
    signal_type: 'ingredient',
    pattern: /oyster|clam|mussel|lobster|crab/i,
    equipment: ['Oyster Knife', 'Lobster Crackers', 'Sheet Tray (ice)'],
    category_slug: 'knives-cutting',
    base_confidence: 0.65,
  },
  {
    id: 'ing-citrus-zest',
    signal_type: 'ingredient',
    pattern: /\bzest\b|zested|microplane|citrus[\s-]?zest/i,
    equipment: ['Microplane'],
    category_slug: 'prep-tools',
    base_confidence: 0.7,
  },
  {
    id: 'ing-spice-grind',
    signal_type: 'ingredient',
    pattern: /\bgrind\b|ground[\s-]?fresh|toasted[\s-]?and[\s-]?ground|spice[\s-]?grinder|mortar/i,
    equipment: ['Spice Grinder', 'Mortar and Pestle'],
    category_slug: 'prep-tools',
    base_confidence: 0.7,
  },
  {
    id: 'ing-phyllo',
    signal_type: 'ingredient',
    pattern: /phyllo|filo|baklava|spanakopita/i,
    equipment: ['Pastry Brush', 'Sheet Tray', 'Parchment Paper'],
    category_slug: 'prep-tools',
    base_confidence: 0.7,
  },
  {
    id: 'ing-sushi',
    signal_type: 'ingredient',
    pattern: /sushi|sashimi|nigiri|maki|nori/i,
    equipment: ['Sushi Mat', 'Sharp Knife', 'Rice Paddle', 'Hangiri'],
    category_slug: 'prep-tools',
    base_confidence: 0.8,
  },
  {
    id: 'ing-wok-cooking',
    signal_type: 'ingredient',
    pattern: /\bwok\b|stir[\s-]?fr[yi]/i,
    equipment: ['Wok', 'Wok Spatula', 'Spider Strainer'],
    category_slug: 'cookware',
    base_confidence: 0.85,
  },
  {
    id: 'ing-espresso',
    signal_type: 'ingredient',
    pattern: /espresso|coffee[\s-]?service|cappuccino|latte/i,
    equipment: ['Espresso Machine', 'Milk Frother', 'Espresso Cups'],
    category_slug: 'small-appliances',
    base_confidence: 0.75,
  },
  {
    id: 'ing-cocktail-bar',
    signal_type: 'ingredient',
    pattern: /cocktail[\s-]?bar|mixology|shaker|muddl/i,
    equipment: ['Cocktail Shaker', 'Jigger', 'Muddler', 'Strainer', 'Bar Spoon'],
    category_slug: 'serving',
    base_confidence: 0.8,
  },

  // ============================================
  // ADDITIONAL TECHNIQUE SIGNALS (to reach ~80)
  // ============================================
  {
    id: 'tech-poach',
    signal_type: 'technique',
    pattern: /\bpoach\b|poached|poaching/i,
    equipment: ['Saucepan', 'Slotted Spoon', 'Instant-Read Thermometer'],
    category_slug: 'cookware',
    base_confidence: 0.65,
  },
  {
    id: 'tech-flambé',
    signal_type: 'technique',
    pattern: /flambé|flambe|flame|ignite/i,
    equipment: ['Saute Pan', 'Long Lighter'],
    category_slug: 'cookware',
    base_confidence: 0.8,
  },
  {
    id: 'tech-press',
    signal_type: 'technique',
    pattern: /panini|press|grill[\s-]?press|sandwich[\s-]?press/i,
    equipment: ['Panini Press'],
    category_slug: 'small-appliances',
    base_confidence: 0.8,
  },
  {
    id: 'tech-zest-grate',
    signal_type: 'technique',
    pattern: /\bgrate\b|grated|grater|box[\s-]?grater/i,
    equipment: ['Box Grater', 'Microplane'],
    category_slug: 'prep-tools',
    base_confidence: 0.6,
  },
  {
    id: 'tech-caramelize',
    signal_type: 'technique',
    pattern: /carameliz|caramel[\s-]?sauce|dry[\s-]?caramel/i,
    equipment: ['Heavy Saucepan', 'Silicone Spatula'],
    category_slug: 'cookware',
    base_confidence: 0.65,
  },
  {
    id: 'tech-deep-poach',
    signal_type: 'technique',
    pattern: /court[\s-]?bouillon|poach[\s-]?whole|poached[\s-]?salmon/i,
    equipment: ['Fish Poacher', 'Stockpot'],
    category_slug: 'cookware',
    base_confidence: 0.75,
  },
  {
    id: 'tech-candy',
    signal_type: 'technique',
    pattern: /candy[\s-]?thermometer|sugar[\s-]?work|hard[\s-]?crack|soft[\s-]?ball/i,
    equipment: ['Candy Thermometer', 'Heavy Saucepan', 'Silicone Mat'],
    category_slug: 'prep-tools',
    base_confidence: 0.85,
  },
  {
    id: 'tech-plating-fine',
    signal_type: 'technique',
    pattern: /tweezers|fine[\s-]?plating|dot[\s-]?sauce|quenelle/i,
    equipment: ['Plating Tweezers', 'Squeeze Bottles', 'Offset Spatula', 'Ring Molds'],
    category_slug: 'serving',
    base_confidence: 0.75,
  },
  {
    id: 'tech-garnish',
    signal_type: 'technique',
    pattern: /micro[\s-]?greens|edible[\s-]?flowers|garnish[\s-]?work/i,
    equipment: ['Plating Tweezers', 'Small Scissors'],
    category_slug: 'serving',
    base_confidence: 0.65,
  },
]

/**
 * Extract applicable rules from recipe text (method, instructions, notes).
 * Returns matched rules with the text that triggered them.
 */
export function matchInferenceRules(
  text: string,
  guestCount?: number
): Array<{ rule: InferenceRule; match: string }> {
  const results: Array<{ rule: InferenceRule; match: string }> = []

  for (const rule of INFERENCE_CATALOG) {
    if (rule.signal_type === 'guest_count') {
      if (guestCount != null) {
        const countStr = String(guestCount)
        const m = countStr.match(rule.pattern)
        if (m) {
          results.push({ rule, match: `${guestCount} guests` })
        }
      }
      continue
    }

    const m = text.match(rule.pattern)
    if (m) {
      results.push({ rule, match: m[0] })
    }
  }

  return results
}

/**
 * Calculate final confidence score with boosters and penalties.
 */
export function calculateConfidence(
  baseConfidence: number,
  recipeCount: number,
  eventCount: number,
  coOccurrences: number,
  dismissPenalty: boolean
): number {
  let score = baseConfidence

  // Boosters
  if (recipeCount >= 3) score += 0.1
  if (eventCount >= 2) score += 0.15
  if (coOccurrences >= 1) score += 0.05

  // Penalties
  if (dismissPenalty) score -= 0.3

  // Cap at 0.95 (only manual = 1.0)
  return Math.max(0, Math.min(0.95, score))
}
