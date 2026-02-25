// HACCP Plan Templates — Pure Deterministic Generator
// One tailored plan per chef archetype, following the 7 HACCP principles.
// Based on FDA Food Code 2022, ServSafe standards, and industry best practices.
// No AI — pure code. Every experienced food safety consultant knows these.
//
// NOT a server action file — no 'use server'.

import type { ArchetypeId } from '@/lib/archetypes/presets'
import type {
  HACCPPlanData,
  ProcessStep,
  CriticalControlPoint,
  PrerequisiteProgram,
  HazardEntry,
} from './types'

// ── Archetype Labels & Descriptions ─────────────────────────────────────

const ARCHETYPE_META: Record<ArchetypeId, { label: string; description: string }> = {
  'private-chef': {
    label: 'Private Chef',
    description:
      'Solo operator providing in-home dining experiences. Food is prepared in client kitchens or transported from a commissary. Unique risks include unfamiliar kitchen environments, transport cold chain, and allergen management in intimate settings.',
  },
  caterer: {
    label: 'Caterer',
    description:
      'Event-based food service for groups. Food is prepared in a commercial kitchen and transported to event venues. Key risks include large-batch production, extended holding times, transport temperature control, and serving in non-kitchen environments.',
  },
  'meal-prep': {
    label: 'Meal Prep Service',
    description:
      'Batch cooking and portioning meals for weekly delivery to recurring clients. Key risks include rapid cooling of large batches, packaging integrity, labeling accuracy (use-by dates), and delivery cold chain maintenance.',
  },
  restaurant: {
    label: 'Restaurant',
    description:
      'Fixed-location daily food service with continuous production. Key risks include high-volume throughput, multiple simultaneous orders, holding temperatures at service line, and reheating previously prepared items.',
  },
  'food-truck': {
    label: 'Food Truck',
    description:
      'Mobile food operation with limited space and equipment. Key risks include restricted water supply, compact storage, ambient temperature exposure, waste management on-site, and maintaining food safety in variable environments.',
  },
  bakery: {
    label: 'Bakery / Pastry Shop',
    description:
      'Order-driven production of baked goods. Key risks include allergen cross-contact (flour, nuts, dairy, eggs), cooling after baking, cream/custard temperature control, and display case management for perishable items.',
  },
}

// ── Shared Process Steps (all archetypes) ───────────────────────────────

function getReceivingStep(): ProcessStep {
  return {
    id: 'step-receiving',
    name: 'Receiving',
    description: 'Inspecting and accepting ingredient deliveries from suppliers.',
    hazards: [
      {
        id: 'h-recv-bio',
        type: 'biological',
        description:
          'Pathogenic bacteria from temperature-abused deliveries (Salmonella, Listeria, E. coli)',
        severity: 'high',
        likelihood: 'medium',
        isCCP: true,
        preventiveMeasure:
          'Check delivery temperatures immediately. Reject items above 41°F (5°C) for refrigerated or not frozen solid.',
      },
      {
        id: 'h-recv-phys',
        type: 'physical',
        description:
          'Foreign objects in raw ingredients (glass, metal, plastic from damaged packaging)',
        severity: 'medium',
        likelihood: 'low',
        isCCP: false,
        preventiveMeasure:
          'Inspect packaging integrity. Reject damaged, dented, or unsealed containers.',
      },
      {
        id: 'h-recv-chem',
        type: 'chemical',
        description:
          'Chemical contamination from improper storage during transport (cleaning agents, fuel)',
        severity: 'high',
        likelihood: 'low',
        isCCP: false,
        preventiveMeasure: 'Verify deliveries are separated from chemicals. Check for off-odors.',
      },
    ],
  }
}

function getColdStorageStep(): ProcessStep {
  return {
    id: 'step-cold-storage',
    name: 'Cold Storage',
    description: 'Storing perishable ingredients under refrigeration or freezing.',
    hazards: [
      {
        id: 'h-cold-bio',
        type: 'biological',
        description: 'Bacterial growth from temperature abuse in walk-in or reach-in units',
        severity: 'high',
        likelihood: 'medium',
        isCCP: true,
        preventiveMeasure:
          'Maintain refrigeration at 41°F (5°C) or below. Monitor daily. FIFO rotation. Date all items.',
      },
      {
        id: 'h-cold-bio2',
        type: 'biological',
        description: 'Cross-contamination from raw meats dripping onto ready-to-eat items',
        severity: 'high',
        likelihood: 'medium',
        isCCP: false,
        preventiveMeasure:
          'Store raw meats on bottom shelves. Keep ready-to-eat items above raw. Use covered containers.',
      },
    ],
  }
}

function getPrepStep(): ProcessStep {
  return {
    id: 'step-preparation',
    name: 'Preparation',
    description: 'Washing, cutting, mixing, and assembling ingredients before cooking.',
    hazards: [
      {
        id: 'h-prep-bio',
        type: 'biological',
        description: 'Cross-contamination between raw proteins and ready-to-eat ingredients',
        severity: 'high',
        likelihood: 'high',
        isCCP: false,
        preventiveMeasure:
          'Use separate cutting boards and utensils for raw and ready-to-eat. Wash hands between tasks. Sanitize surfaces between uses.',
      },
      {
        id: 'h-prep-bio2',
        type: 'biological',
        description: 'Time-temperature abuse during extended prep (items in danger zone 41–135°F)',
        severity: 'high',
        likelihood: 'medium',
        isCCP: false,
        preventiveMeasure:
          'Limit time at room temperature to 2 hours maximum. Work in small batches. Return unused items to refrigeration promptly.',
      },
      {
        id: 'h-prep-chem',
        type: 'chemical',
        description: 'Allergen cross-contact during prep (shared equipment, airborne flour)',
        severity: 'high',
        likelihood: 'medium',
        isCCP: false,
        preventiveMeasure:
          'Prep allergen-free items first. Clean and sanitize all surfaces between allergen and non-allergen prep.',
      },
    ],
  }
}

function getCookingStep(): ProcessStep {
  return {
    id: 'step-cooking',
    name: 'Cooking',
    description: 'Applying heat to destroy pathogens and achieve safe internal temperatures.',
    hazards: [
      {
        id: 'h-cook-bio',
        type: 'biological',
        description: 'Survival of pathogens due to insufficient cooking temperature',
        severity: 'high',
        likelihood: 'medium',
        isCCP: true,
        preventiveMeasure:
          'Verify internal temperature with calibrated probe thermometer. Poultry: 165°F. Ground meat: 155°F. Whole cuts/seafood: 145°F. Eggs for immediate service: 145°F.',
      },
    ],
  }
}

function getCleanupStep(): ProcessStep {
  return {
    id: 'step-cleanup',
    name: 'Cleanup & Sanitization',
    description: 'Cleaning and sanitizing equipment, surfaces, and utensils after service.',
    hazards: [
      {
        id: 'h-clean-bio',
        type: 'biological',
        description: 'Residual pathogens on improperly cleaned surfaces or equipment',
        severity: 'medium',
        likelihood: 'medium',
        isCCP: false,
        preventiveMeasure:
          'Follow wash-rinse-sanitize protocol. Use approved sanitizer at correct concentration. Air dry — never towel-dry sanitized items.',
      },
      {
        id: 'h-clean-chem',
        type: 'chemical',
        description: 'Chemical residue from cleaning agents on food-contact surfaces',
        severity: 'medium',
        likelihood: 'low',
        isCCP: false,
        preventiveMeasure:
          'Rinse thoroughly after cleaning. Use food-safe sanitizers at label-recommended concentrations. Store chemicals away from food.',
      },
    ],
  }
}

// ── Shared CCPs (all archetypes get these) ──────────────────────────────

function getReceivingCCP(): CriticalControlPoint {
  return {
    id: 'ccp-receiving',
    ccpNumber: 1,
    processStep: 'Receiving',
    hazard: 'Pathogenic bacteria from temperature-abused deliveries',
    criticalLimits:
      'Refrigerated items: ≤ 41°F (5°C). Frozen items: frozen solid, no evidence of thawing. Hot items (if applicable): ≥ 135°F (57°C).',
    monitoring: {
      what: 'Internal temperature of delivered items',
      how: 'Calibrated probe thermometer inserted into thickest part of product',
      frequency: 'Every delivery, immediately upon arrival',
      who: 'Person receiving the delivery (chef or designated staff)',
    },
    correctiveActions: [
      'Reject any refrigerated item above 41°F (5°C)',
      'Reject any frozen item showing signs of thawing or refreezing',
      'Document rejected items and notify supplier',
      'Find alternate supplier if pattern of non-compliance',
    ],
    verificationProcedures: [
      'Review receiving logs weekly for trends',
      'Calibrate thermometer monthly (ice-point method: 32°F ± 2°F)',
      'Audit supplier compliance records quarterly',
    ],
    recordKeeping: [
      'Delivery date, time, supplier name',
      'Product name, quantity, temperature reading',
      'Accept/reject decision and reason for rejection',
      'Corrective action taken (if any)',
    ],
  }
}

function getColdStorageCCP(): CriticalControlPoint {
  return {
    id: 'ccp-cold-storage',
    ccpNumber: 2,
    processStep: 'Cold Storage',
    hazard: 'Bacterial growth from refrigeration failure or temperature abuse',
    criticalLimits:
      'Refrigerator: ≤ 41°F (5°C) at all times. Freezer: ≤ 0°F (−18°C). FIFO rotation enforced.',
    monitoring: {
      what: 'Ambient temperature of all refrigeration and freezer units',
      how: 'Built-in thermometer reading or calibrated external thermometer',
      frequency: 'Twice daily (morning and end of day), logged',
      who: 'Chef or designated staff member',
    },
    correctiveActions: [
      'If temp above 41°F: assess how long items were above limit',
      'Items above 41°F for less than 2 hours: move to functioning unit immediately',
      'Items above 41°F for more than 2 hours: discard',
      'Repair or replace malfunctioning unit; use backup cooler/ice in the meantime',
    ],
    verificationProcedures: [
      'Review temperature logs weekly',
      'Calibrate thermometers monthly',
      'Schedule preventive maintenance on refrigeration units annually',
    ],
    recordKeeping: [
      'Date, time, unit name/location',
      'Temperature reading',
      'Corrective action taken (if out of range)',
      'Initials of person monitoring',
    ],
  }
}

function getCookingCCP(): CriticalControlPoint {
  return {
    id: 'ccp-cooking',
    ccpNumber: 3,
    processStep: 'Cooking',
    hazard: 'Survival of pathogens from insufficient internal temperature',
    criticalLimits:
      'Poultry (all forms): ≥ 165°F (74°C) for 15 sec. Ground meats: ≥ 155°F (68°C) for 17 sec. Whole cuts (beef, pork, lamb), seafood, eggs for immediate service: ≥ 145°F (63°C) for 15 sec. Fruits/vegetables (hot holding): ≥ 135°F (57°C).',
    monitoring: {
      what: 'Internal temperature of cooked items at thickest point',
      how: 'Calibrated digital probe thermometer',
      frequency: 'Every batch or individual item, at end of cooking',
      who: 'Chef or cook responsible for the dish',
    },
    correctiveActions: [
      'Continue cooking until required temperature is reached',
      'If item cannot reach temperature, discard and investigate equipment',
      'Recalibrate thermometer if readings seem inaccurate',
    ],
    verificationProcedures: [
      'Review cooking temperature logs daily',
      'Calibrate probe thermometer monthly (ice-point and boiling-point methods)',
      'Observe cooking practices during service periodically',
    ],
    recordKeeping: [
      'Date, menu item, target temperature',
      'Actual temperature reading',
      'Time checked',
      'Corrective action taken (if any)',
      'Initials of person checking',
    ],
  }
}

// ── Archetype-Specific Steps & CCPs ─────────────────────────────────────

function getPrivateChefSteps(): ProcessStep[] {
  return [
    {
      id: 'step-transport-to-client',
      name: 'Transport to Client Home',
      description:
        'Transporting prepared or raw ingredients from commissary/kitchen to client location.',
      hazards: [
        {
          id: 'h-trans-bio',
          type: 'biological',
          description: 'Temperature abuse during vehicle transport (cold chain break)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Use insulated bags/coolers with ice packs. Limit transit to 2 hours maximum. Check temps on arrival.',
        },
        {
          id: 'h-trans-phys',
          type: 'physical',
          description: 'Spills or contamination from improperly secured containers in vehicle',
          severity: 'low',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Use sealed, leak-proof containers. Secure containers to prevent tipping.',
        },
      ],
    },
    {
      id: 'step-client-kitchen',
      name: 'Client Kitchen Assessment',
      description: 'Evaluating and preparing the client kitchen for safe food preparation.',
      hazards: [
        {
          id: 'h-client-bio',
          type: 'biological',
          description:
            'Cross-contamination in unfamiliar kitchen (unknown cleanliness, shared equipment)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Bring own cutting boards, knives, thermometer. Sanitize client surfaces before use. Assess kitchen cleanliness on arrival.',
        },
        {
          id: 'h-client-chem',
          type: 'chemical',
          description: 'Allergen exposure from residues in client kitchen (shared pans, utensils)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Ask client about allergens in household. Bring dedicated allergen-free equipment. Clean all surfaces before preparing allergen-sensitive dishes.',
        },
      ],
    },
    {
      id: 'step-plating-service',
      name: 'Plating & Service',
      description: 'Plating finished dishes and serving to clients in their home.',
      hazards: [
        {
          id: 'h-plate-bio',
          type: 'biological',
          description: 'Time-temperature abuse between plating and service (dishes sitting out)',
          severity: 'medium',
          likelihood: 'low',
          isCCP: false,
          preventiveMeasure:
            'Plate immediately before service. Keep hot items above 135°F and cold items below 41°F until served.',
        },
      ],
    },
  ]
}

function getPrivateChefCCPs(): CriticalControlPoint[] {
  return [
    {
      id: 'ccp-transport',
      ccpNumber: 4,
      processStep: 'Transport to Client Home',
      hazard: 'Cold chain break during vehicle transport',
      criticalLimits:
        'Cold items: ≤ 41°F (5°C) on arrival. Hot items: ≥ 135°F (57°C) on arrival. Maximum transit time: 2 hours.',
      monitoring: {
        what: 'Temperature of transported items upon arrival at client location',
        how: 'Probe thermometer check of representative items',
        frequency: 'Every trip, immediately upon arrival',
        who: 'Chef',
      },
      correctiveActions: [
        'If cold items above 41°F on arrival and transit was under 2 hours: refrigerate immediately',
        'If cold items above 41°F and transit exceeded 2 hours: discard',
        'If hot items below 135°F: reheat to 165°F within 2 hours or discard',
      ],
      verificationProcedures: [
        'Log arrival temperatures for every job',
        'Review logs monthly for patterns',
        'Test insulated bags/coolers quarterly (load test with thermometer)',
      ],
      recordKeeping: [
        'Date, client name, departure time, arrival time',
        'Items transported, temperatures on arrival',
        'Corrective action taken (if any)',
      ],
    },
    {
      id: 'ccp-client-kitchen',
      ccpNumber: 5,
      processStep: 'Client Kitchen Assessment',
      hazard: 'Cross-contamination from unfamiliar kitchen environment',
      criticalLimits:
        'All food-contact surfaces sanitized before use. Dedicated equipment used for allergen-sensitive prep. Client kitchen visually assessed before cooking begins.',
      monitoring: {
        what: 'Kitchen cleanliness, surface sanitation, equipment readiness',
        how: 'Visual inspection and sanitizer concentration test (if using client supplies)',
        frequency: 'Every client visit, before cooking starts',
        who: 'Chef',
      },
      correctiveActions: [
        'If kitchen is unsanitary: clean and sanitize before proceeding',
        'If allergen cross-contact risk exists: use only personal equipment',
        'If kitchen is unsuitable (pest issues, no hot water): discuss with client, reschedule if necessary',
      ],
      verificationProcedures: [
        'Maintain a client kitchen assessment checklist',
        'Review assessments quarterly for recurring issues',
      ],
      recordKeeping: [
        'Date, client name',
        'Kitchen assessment pass/fail',
        'Issues found and corrective actions taken',
      ],
    },
  ]
}

function getCatererSteps(): ProcessStep[] {
  return [
    {
      id: 'step-hot-holding',
      name: 'Hot Holding',
      description: 'Maintaining hot foods at safe temperatures during service.',
      hazards: [
        {
          id: 'h-hot-bio',
          type: 'biological',
          description: 'Bacterial growth from food dropping below 135°F during extended service',
          severity: 'high',
          likelihood: 'high',
          isCCP: true,
          preventiveMeasure:
            'Use chafing dishes, heat lamps, or hot-holding units. Check temps every 30 minutes.',
        },
      ],
    },
    {
      id: 'step-cold-holding',
      name: 'Cold Holding at Events',
      description: 'Maintaining cold foods at safe temperatures during event service.',
      hazards: [
        {
          id: 'h-colde-bio',
          type: 'biological',
          description:
            'Temperature abuse of cold items on buffet (salads, seafood, dairy-based items)',
          severity: 'high',
          likelihood: 'high',
          isCCP: true,
          preventiveMeasure:
            'Use ice beds, refrigerated display units, or swap trays every 2 hours. Monitor temps.',
        },
      ],
    },
    {
      id: 'step-transport-event',
      name: 'Transport to Event Venue',
      description:
        'Transporting large quantities of food from commercial kitchen to event location.',
      hazards: [
        {
          id: 'h-trans-bio',
          type: 'biological',
          description: 'Temperature abuse during bulk transport in vehicles',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Use insulated food carriers, hot boxes, and coolers. Monitor temps. Limit transit to 2 hours.',
        },
        {
          id: 'h-trans-phys',
          type: 'physical',
          description: 'Physical contamination from spills, debris in transport vehicles',
          severity: 'medium',
          likelihood: 'low',
          isCCP: false,
          preventiveMeasure:
            'Clean vehicle before loading. Use sealed containers. Separate chemicals from food.',
        },
      ],
    },
    {
      id: 'step-event-setup',
      name: 'Event Setup & Staging',
      description: 'Setting up food stations, buffets, and service areas at the event venue.',
      hazards: [
        {
          id: 'h-setup-bio',
          type: 'biological',
          description: 'Extended time at room temperature during setup (danger zone exposure)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Keep food in hot/cold holding until service starts. Time limit: food must not be at room temp for more than 2 hours (1 hour if above 90°F ambient).',
        },
      ],
    },
  ]
}

function getCatererCCPs(): CriticalControlPoint[] {
  return [
    {
      id: 'ccp-hot-holding',
      ccpNumber: 4,
      processStep: 'Hot Holding',
      hazard: 'Bacterial growth from food below safe holding temperature',
      criticalLimits: 'Hot food: ≥ 135°F (57°C) at all times during service.',
      monitoring: {
        what: 'Temperature of hot-held items',
        how: 'Probe thermometer in center of item (not touching container)',
        frequency: 'Every 30 minutes during service',
        who: 'Chef or designated service staff',
      },
      correctiveActions: [
        'If food drops below 135°F: reheat to 165°F within 2 hours',
        'If food has been below 135°F for more than 2 hours: discard',
        'Adjust heat source or replace chafing fuel',
      ],
      verificationProcedures: [
        'Review hot-holding logs after each event',
        'Calibrate thermometers monthly',
        'Test chafing dishes and heat lamps before each event',
      ],
      recordKeeping: [
        'Date, event name, menu item',
        'Temperature readings with timestamps',
        'Corrective actions taken',
        'Initials of person monitoring',
      ],
    },
    {
      id: 'ccp-cold-holding-event',
      ccpNumber: 5,
      processStep: 'Cold Holding at Events',
      hazard: 'Temperature abuse of cold buffet items',
      criticalLimits: 'Cold food: ≤ 41°F (5°C) at all times during service.',
      monitoring: {
        what: 'Temperature of cold-held items (salads, seafood, dairy)',
        how: 'Probe thermometer',
        frequency: 'Every 30 minutes during service, or when replenishing trays',
        who: 'Chef or designated service staff',
      },
      correctiveActions: [
        'If food rises above 41°F for less than 2 hours: add ice, move to refrigeration',
        'If food has been above 41°F for more than 2 hours: discard',
        'Swap out trays with fresh, cold replacements',
      ],
      verificationProcedures: [
        'Review cold-holding logs after each event',
        'Audit ice/cooler supplies before each event',
      ],
      recordKeeping: [
        'Date, event name, menu item',
        'Temperature readings with timestamps',
        'Tray swap times',
        'Corrective actions taken',
      ],
    },
    {
      id: 'ccp-transport-catering',
      ccpNumber: 6,
      processStep: 'Transport to Event Venue',
      hazard: 'Temperature abuse during bulk food transport',
      criticalLimits:
        'Cold items: ≤ 41°F (5°C) on arrival. Hot items: ≥ 135°F (57°C) on arrival. Maximum transit: 2 hours.',
      monitoring: {
        what: 'Temperature of transported items on departure and arrival',
        how: 'Probe thermometer of representative items',
        frequency: 'Every trip — check before loading and after unloading',
        who: 'Chef or transport team lead',
      },
      correctiveActions: [
        'If cold items above 41°F on arrival: assess time above limit, refrigerate or discard',
        'If hot items below 135°F on arrival: reheat to 165°F within 2 hours or discard',
        'Investigate insulation failure, add more ice/hot packs next time',
      ],
      verificationProcedures: [
        'Review transport logs monthly',
        'Test insulated carriers quarterly',
      ],
      recordKeeping: [
        'Date, event, departure time, arrival time',
        'Items, departure temp, arrival temp',
        'Corrective actions taken',
      ],
    },
    {
      id: 'ccp-setup-time',
      ccpNumber: 7,
      processStep: 'Event Setup & Staging',
      hazard: 'Danger zone exposure during event setup',
      criticalLimits:
        'Food must not be at room temperature (41–135°F) for more than 2 hours total. If ambient temperature is above 90°F: 1 hour maximum.',
      monitoring: {
        what: 'Time food is removed from hot/cold holding before service begins',
        how: 'Record the time food leaves holding and when service starts',
        frequency: 'Every event setup',
        who: 'Chef or event lead',
      },
      correctiveActions: [
        'If food has been at room temperature over 2 hours (or 1 hour above 90°F): discard',
        'Keep food in holding until just before service starts',
        'Stagger setup — bring items out in waves, not all at once',
      ],
      verificationProcedures: [
        'Review setup timing logs after each event',
        'Brief staff on time limits before each event',
      ],
      recordKeeping: [
        'Date, event name',
        'Time removed from holding, time service started',
        'Ambient temperature at venue',
        'Any items discarded',
      ],
    },
  ]
}

function getMealPrepSteps(): ProcessStep[] {
  return [
    {
      id: 'step-batch-cooking',
      name: 'Batch Cooking',
      description: 'Cooking large quantities of food for portioning into individual meals.',
      hazards: [
        {
          id: 'h-batch-bio',
          type: 'biological',
          description: 'Uneven cooking in large batches (cold spots)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Stir frequently. Check temperature at multiple points. Use properly calibrated equipment.',
        },
      ],
    },
    {
      id: 'step-rapid-cooling',
      name: 'Rapid Cooling',
      description: 'Cooling cooked food quickly to prevent bacterial growth in the danger zone.',
      hazards: [
        {
          id: 'h-cool-bio',
          type: 'biological',
          description:
            'Bacterial growth during slow cooling (danger zone 135–41°F for extended time)',
          severity: 'high',
          likelihood: 'high',
          isCCP: true,
          preventiveMeasure:
            'Cool from 135°F to 70°F within 2 hours, then from 70°F to 41°F within 4 hours (6 hours total). Use ice baths, shallow pans, blast chiller.',
        },
      ],
    },
    {
      id: 'step-portioning',
      name: 'Portioning & Packaging',
      description: 'Dividing batch-cooked food into individual meal containers with labels.',
      hazards: [
        {
          id: 'h-port-bio',
          type: 'biological',
          description: 'Time-temperature abuse during portioning (food at room temp too long)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Portion quickly in a clean, cool area. Limit exposure to room temperature to 30 minutes per batch. Return to refrigeration immediately after packaging.',
        },
        {
          id: 'h-port-chem',
          type: 'chemical',
          description: 'Allergen cross-contact during portioning (shared utensils or surfaces)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Portion allergen-free meals first. Use clean utensils between different meal types. Label allergens clearly on each container.',
        },
      ],
    },
    {
      id: 'step-labeling',
      name: 'Labeling',
      description:
        'Applying labels with preparation date, use-by date, ingredients, and allergens.',
      hazards: [
        {
          id: 'h-label-chem',
          type: 'chemical',
          description: 'Incorrect or missing allergen labeling causing allergic reaction',
          severity: 'high',
          likelihood: 'low',
          isCCP: false,
          preventiveMeasure:
            'Use standardized labels with allergen declarations. Double-check ingredient lists. Include prep date and use-by date.',
        },
      ],
    },
    {
      id: 'step-delivery',
      name: 'Delivery',
      description:
        'Delivering portioned meals to clients, maintaining cold chain to their doorstep.',
      hazards: [
        {
          id: 'h-del-bio',
          type: 'biological',
          description: 'Cold chain break during delivery route (multiple stops, warm weather)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Use insulated bags with ice packs. Plan delivery route to minimize time. Deliver within 2 hours of leaving kitchen.',
        },
      ],
    },
  ]
}

function getMealPrepCCPs(): CriticalControlPoint[] {
  return [
    {
      id: 'ccp-rapid-cooling',
      ccpNumber: 4,
      processStep: 'Rapid Cooling',
      hazard: 'Bacterial growth during slow cooling of large batches',
      criticalLimits:
        '135°F → 70°F within 2 hours. 70°F → 41°F within 4 hours. Total cooling time: 6 hours maximum.',
      monitoring: {
        what: 'Internal temperature of cooling items',
        how: 'Probe thermometer at 2-hour mark and at 6-hour mark',
        frequency: 'Every cooling cycle — check at 2 hours and 6 hours',
        who: 'Chef or designated staff',
      },
      correctiveActions: [
        'If not at 70°F within 2 hours: use ice bath, blast chiller, or divide into smaller containers',
        'If not at 41°F within 6 hours total: discard the batch',
        'Investigate equipment (is blast chiller working? ice bath adequate?)',
      ],
      verificationProcedures: [
        'Review cooling logs weekly',
        'Verify blast chiller/ice bath effectiveness monthly',
        'Train staff on proper cooling methods at least annually',
      ],
      recordKeeping: [
        'Date, food item, batch size',
        'Time cooking ended, temperature at 2-hour mark, temperature at 6-hour mark',
        'Cooling method used',
        'Corrective action taken (if any)',
      ],
    },
    {
      id: 'ccp-portioning',
      ccpNumber: 5,
      processStep: 'Portioning & Packaging',
      hazard: 'Time-temperature abuse during portioning of cooled food',
      criticalLimits:
        'Food must not be above 41°F for more than 30 minutes during portioning. Return to refrigeration immediately after packaging.',
      monitoring: {
        what: 'Time food is out of refrigeration during portioning',
        how: 'Timer started when food is removed from refrigeration',
        frequency: 'Every portioning session',
        who: 'Chef or designated staff',
      },
      correctiveActions: [
        'If portioning takes longer than 30 minutes: return food to refrigeration, resume later',
        'If food has been above 41°F for more than 2 hours total: discard',
        'Work in smaller batches to reduce exposure time',
      ],
      verificationProcedures: [
        'Review portioning time logs weekly',
        'Observe portioning practices periodically',
      ],
      recordKeeping: [
        'Date, food item',
        'Time removed from refrigeration, time returned',
        'Number of portions',
        'Corrective action taken (if any)',
      ],
    },
    {
      id: 'ccp-delivery',
      ccpNumber: 6,
      processStep: 'Delivery',
      hazard: 'Cold chain break during multi-stop delivery',
      criticalLimits:
        'Meals must remain ≤ 41°F (5°C) throughout delivery. Maximum delivery window: 2 hours from kitchen departure.',
      monitoring: {
        what: 'Temperature inside delivery cooler/bag',
        how: 'Thermometer in cooler bag, spot-check representative items',
        frequency: 'Before departure and at last stop',
        who: 'Chef or delivery person',
      },
      correctiveActions: [
        'If items above 41°F at any stop: add more ice packs, deliver remaining stops quickly',
        'If items have been above 41°F for more than 2 hours: do not deliver, discard affected meals',
        'Notify affected clients and arrange replacement delivery',
      ],
      verificationProcedures: [
        'Review delivery temperature logs weekly',
        'Test cooler bag effectiveness monthly',
        'Optimize delivery routes quarterly',
      ],
      recordKeeping: [
        'Date, departure time, return time',
        'Number of stops, temperature at departure and last stop',
        'Ice pack count used',
        'Any corrective actions taken',
      ],
    },
  ]
}

function getRestaurantSteps(): ProcessStep[] {
  return [
    {
      id: 'step-hot-holding-line',
      name: 'Hot Holding at Service Line',
      description: 'Maintaining hot menu items at safe temperatures on the line during service.',
      hazards: [
        {
          id: 'h-hotline-bio',
          type: 'biological',
          description: 'Food temperature dropping below 135°F during busy or slow service periods',
          severity: 'high',
          likelihood: 'high',
          isCCP: true,
          preventiveMeasure:
            'Use steam tables, heat lamps, or warming drawers. Monitor temps every 30 minutes. Rotate items.',
        },
      ],
    },
    {
      id: 'step-cold-holding-prep',
      name: 'Cold Holding at Prep Stations',
      description:
        'Maintaining cold ingredients at safe temperatures at prep and garnish stations.',
      hazards: [
        {
          id: 'h-coldprep-bio',
          type: 'biological',
          description: 'Cold items warming above 41°F at prep stations (especially during rush)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Use refrigerated prep tables or ice baths. Replenish ice as needed. Check temps regularly.',
        },
      ],
    },
    {
      id: 'step-reheating',
      name: 'Reheating',
      description: 'Reheating previously cooked and cooled items for service.',
      hazards: [
        {
          id: 'h-reheat-bio',
          type: 'biological',
          description: 'Inadequate reheating allowing surviving/growing bacteria to remain',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Reheat to 165°F (74°C) within 2 hours. Never use hot-holding equipment (steam table, crock pot) to reheat — use oven, stove, or microwave.',
        },
      ],
    },
  ]
}

function getRestaurantCCPs(): CriticalControlPoint[] {
  return [
    {
      id: 'ccp-hot-holding-line',
      ccpNumber: 4,
      processStep: 'Hot Holding at Service Line',
      hazard: 'Food temperature dropping below safe holding temperature during service',
      criticalLimits: 'All hot-held items: ≥ 135°F (57°C) at all times.',
      monitoring: {
        what: 'Temperature of hot-held items on the line',
        how: 'Probe thermometer in center of item',
        frequency: 'Every 30 minutes during service hours',
        who: 'Line cook or expeditor',
      },
      correctiveActions: [
        'If below 135°F and was above within last 2 hours: reheat to 165°F',
        'If below 135°F for more than 2 hours: discard',
        'Adjust steam table setting or replace fuel',
      ],
      verificationProcedures: [
        'Review hot-holding logs daily',
        'Calibrate thermometers monthly',
        'Observe line practices during service weekly',
      ],
      recordKeeping: [
        'Date, shift, menu item',
        'Temperature readings with timestamps',
        'Corrective actions taken',
        'Initials of person monitoring',
      ],
    },
    {
      id: 'ccp-cold-holding-prep',
      ccpNumber: 5,
      processStep: 'Cold Holding at Prep Stations',
      hazard: 'Cold ingredients rising above safe temperature during service',
      criticalLimits: 'All cold items at prep stations: ≤ 41°F (5°C).',
      monitoring: {
        what: 'Temperature of cold items at prep stations',
        how: 'Probe thermometer',
        frequency: 'Every hour during service, and whenever replenishing',
        who: 'Prep cook or station lead',
      },
      correctiveActions: [
        'If above 41°F for less than 2 hours: add ice, move to refrigeration',
        'If above 41°F for more than 2 hours: discard',
        'Investigate prep table refrigeration unit',
      ],
      verificationProcedures: [
        'Review cold-holding logs daily',
        'Service prep station refrigeration units as needed',
      ],
      recordKeeping: [
        'Date, shift, item',
        'Temperature readings with timestamps',
        'Corrective actions taken',
      ],
    },
    {
      id: 'ccp-reheating',
      ccpNumber: 6,
      processStep: 'Reheating',
      hazard: 'Inadequate reheating of previously prepared items',
      criticalLimits:
        'Reheat to ≥ 165°F (74°C) within 2 hours. Never reheat using hot-holding equipment alone.',
      monitoring: {
        what: 'Internal temperature of reheated items',
        how: 'Probe thermometer',
        frequency: 'Every reheated batch or item',
        who: 'Cook responsible for reheating',
      },
      correctiveActions: [
        'If not at 165°F within 2 hours: discard',
        'If reheated on steam table: remove, reheat properly on stove/oven, then return',
      ],
      verificationProcedures: [
        'Review reheating logs daily',
        'Train staff on proper reheating methods',
      ],
      recordKeeping: [
        'Date, menu item, reheating method',
        'Time reheating started, final temperature',
        'Corrective action taken (if any)',
      ],
    },
  ]
}

function getFoodTruckSteps(): ProcessStep[] {
  return [
    {
      id: 'step-water-supply',
      name: 'Water Supply & Handwashing',
      description:
        'Maintaining potable water for food prep, cleaning, and handwashing in a mobile unit.',
      hazards: [
        {
          id: 'h-water-bio',
          type: 'biological',
          description: 'Contaminated water supply or depleted handwash station',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Use only potable water from approved sources. Clean and sanitize water tank regularly. Check handwash station supply at start of each shift.',
        },
        {
          id: 'h-water-chem',
          type: 'chemical',
          description:
            'Chemical contamination of water tank (cleaning residue, tank material leaching)',
          severity: 'medium',
          likelihood: 'low',
          isCCP: false,
          preventiveMeasure:
            'Use food-grade water tanks. Flush after cleaning. Test water annually.',
        },
      ],
    },
    {
      id: 'step-hot-holding-truck',
      name: 'Hot Holding (Limited Space)',
      description: 'Maintaining hot food at safe temperatures with compact mobile equipment.',
      hazards: [
        {
          id: 'h-hotft-bio',
          type: 'biological',
          description:
            'Temperature drops due to limited equipment capacity and frequent door opening',
          severity: 'high',
          likelihood: 'high',
          isCCP: true,
          preventiveMeasure:
            'Cook to order when possible. Limit batch sizes. Use covered steam pans. Check temps every 30 minutes.',
        },
      ],
    },
    {
      id: 'step-waste-mobile',
      name: 'Waste Management',
      description:
        'Managing food waste and wastewater in a mobile unit with limited disposal options.',
      hazards: [
        {
          id: 'h-waste-bio',
          type: 'biological',
          description:
            'Attraction of pests and contamination from accumulated waste in enclosed space',
          severity: 'medium',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Use covered waste bins. Empty frequently. Dispose of wastewater at approved facilities only. Never dump grease or wastewater on the ground.',
        },
      ],
    },
  ]
}

function getFoodTruckCCPs(): CriticalControlPoint[] {
  return [
    {
      id: 'ccp-water-supply',
      ccpNumber: 4,
      processStep: 'Water Supply & Handwashing',
      hazard: 'Contaminated or depleted water supply in mobile unit',
      criticalLimits:
        'Water must be from an approved potable source. Handwash station must be operational with soap, warm water, and paper towels at all times during service.',
      monitoring: {
        what: 'Water tank level, handwash station supplies, water source documentation',
        how: 'Visual inspection of tank level, soap, towels; check water source receipt',
        frequency: 'Before each shift and midway through long shifts',
        who: 'Chef or truck operator',
      },
      correctiveActions: [
        'If handwash station runs out of supplies: replenish immediately; pause service if cannot replenish',
        'If water source is questionable: use bottled water until approved source confirmed',
        'If water tank is contaminated: stop service, clean and sanitize tank, refill from approved source',
      ],
      verificationProcedures: [
        'Keep water source receipts on file',
        'Clean and sanitize water tank monthly',
        'Annual water quality test',
      ],
      recordKeeping: [
        'Date, water source, tank fill amount',
        'Handwash station supply check',
        'Tank cleaning/sanitization dates',
      ],
    },
    {
      id: 'ccp-hot-holding-truck',
      ccpNumber: 5,
      processStep: 'Hot Holding (Limited Space)',
      hazard: 'Temperature drops in compact mobile hot-holding equipment',
      criticalLimits:
        'Hot food: ≥ 135°F (57°C) at all times. If below 135°F for more than 2 hours: discard.',
      monitoring: {
        what: 'Temperature of hot-held items',
        how: 'Probe thermometer',
        frequency: 'Every 30 minutes during service',
        who: 'Chef or cook',
      },
      correctiveActions: [
        'If below 135°F and within 2-hour window: reheat to 165°F immediately',
        'If below 135°F for more than 2 hours: discard',
        'Switch to cook-to-order if holding equipment fails',
      ],
      verificationProcedures: [
        'Review hot-holding logs after each shift',
        'Service hot-holding equipment monthly',
      ],
      recordKeeping: [
        'Date, shift location, menu item',
        'Temperature readings with timestamps',
        'Corrective actions taken',
      ],
    },
  ]
}

function getBakerySteps(): ProcessStep[] {
  return [
    {
      id: 'step-mixing',
      name: 'Mixing & Dough Preparation',
      description: 'Measuring, mixing, and preparing doughs, batters, and fillings.',
      hazards: [
        {
          id: 'h-mix-chem',
          type: 'chemical',
          description:
            'Allergen cross-contact from shared mixers, bowls, or measuring tools (flour, nuts, dairy, eggs)',
          severity: 'high',
          likelihood: 'high',
          isCCP: false,
          preventiveMeasure:
            'Clean and sanitize mixers between allergen and allergen-free batches. Use dedicated equipment for allergen-free products when possible.',
        },
        {
          id: 'h-mix-phys',
          type: 'physical',
          description:
            'Foreign objects from equipment (mixer blade fragments, twist ties from ingredient bags)',
          severity: 'medium',
          likelihood: 'low',
          isCCP: false,
          preventiveMeasure:
            'Inspect equipment before use. Remove all packaging materials from work area. Sift dry ingredients.',
        },
      ],
    },
    {
      id: 'step-baking',
      name: 'Baking',
      description: 'Baking products in ovens to proper doneness and safety.',
      hazards: [
        {
          id: 'h-bake-bio',
          type: 'biological',
          description: 'Underbaked products (especially with eggs, dairy, or meat fillings)',
          severity: 'medium',
          likelihood: 'low',
          isCCP: false,
          preventiveMeasure:
            'Follow tested recipes with verified time and temperature. Check internal temperature for filled products.',
        },
      ],
    },
    {
      id: 'step-cooling-baked',
      name: 'Cooling After Baking',
      description:
        'Cooling baked goods to safe temperatures before filling, decorating, or packaging.',
      hazards: [
        {
          id: 'h-coolb-bio',
          type: 'biological',
          description:
            'Bacterial growth in cream/custard/cheese-filled products during slow cooling',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Cool cream/custard-filled items rapidly. Refrigerate within 2 hours of baking. Items with PHF fillings must reach 41°F within 6 hours.',
        },
      ],
    },
    {
      id: 'step-decorating',
      name: 'Decorating & Finishing',
      description: 'Adding frostings, fillings, toppings, and decorative elements to baked goods.',
      hazards: [
        {
          id: 'h-deco-chem',
          type: 'chemical',
          description:
            'Allergen cross-contact from shared decorating tools (piping bags, spatulas)',
          severity: 'high',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Use clean piping bags and tips for each allergen group. Label all frostings/fillings with allergen content.',
        },
        {
          id: 'h-deco-bio',
          type: 'biological',
          description:
            'Temperature abuse of perishable frostings/fillings (cream cheese, whipped cream)',
          severity: 'medium',
          likelihood: 'medium',
          isCCP: false,
          preventiveMeasure:
            'Keep perishable frostings refrigerated when not in use. Work in small quantities at room temperature.',
        },
      ],
    },
    {
      id: 'step-display',
      name: 'Display & Sales',
      description: 'Displaying finished products for sale in cases or on shelves.',
      hazards: [
        {
          id: 'h-disp-bio',
          type: 'biological',
          description: 'Temperature abuse of cream/custard-filled products in display cases',
          severity: 'high',
          likelihood: 'medium',
          isCCP: true,
          preventiveMeasure:
            'Refrigerated display case at ≤ 41°F for perishable items. Dry goods (bread, cookies) may be displayed at room temperature.',
        },
      ],
    },
  ]
}

function getBakeryCCPs(): CriticalControlPoint[] {
  return [
    {
      id: 'ccp-allergen-control',
      ccpNumber: 4,
      processStep: 'Mixing & Dough Preparation',
      hazard: 'Allergen cross-contact from shared equipment (flour, nuts, dairy, eggs, soy)',
      criticalLimits:
        'Equipment must be cleaned and sanitized between allergen and allergen-free batches. Allergen-free products must be prepared first or on dedicated equipment.',
      monitoring: {
        what: 'Equipment cleaning between batches, production order',
        how: 'Visual inspection of cleaned equipment; verify production schedule has allergen-free items first',
        frequency: 'Every batch changeover involving different allergen profiles',
        who: 'Baker or production lead',
      },
      correctiveActions: [
        'If equipment was not cleaned between batches: do not label product as allergen-free',
        'Re-clean equipment and restart allergen-free batch',
        'Review production schedule to prevent recurrence',
      ],
      verificationProcedures: [
        'Review production schedules weekly for allergen sequencing',
        'Audit allergen labeling monthly',
        'Swab test equipment after cleaning quarterly (allergen protein test strips)',
      ],
      recordKeeping: [
        'Date, product, allergen profile',
        'Equipment cleaning confirmation',
        'Production order (what was made before this batch)',
        'Corrective actions taken',
      ],
    },
    {
      id: 'ccp-cooling-baked',
      ccpNumber: 5,
      processStep: 'Cooling After Baking',
      hazard: 'Bacterial growth in perishable-filled products during cooling',
      criticalLimits:
        'Cream, custard, cheese, or meat-filled products: must cool to 41°F within 6 hours (135°F → 70°F in 2 hours, 70°F → 41°F in 4 hours). Non-perishable baked goods (bread, cookies): cool at room temperature, no time limit.',
      monitoring: {
        what: 'Internal temperature of perishable-filled baked goods during cooling',
        how: 'Probe thermometer at 2-hour mark and 6-hour mark',
        frequency: 'Every batch of perishable-filled products',
        who: 'Baker or designated staff',
      },
      correctiveActions: [
        'If not at 70°F within 2 hours: move to blast chiller or ice bath',
        'If not at 41°F within 6 hours: discard the batch',
        'Investigate cooling method — use shallower pans, smaller portions next time',
      ],
      verificationProcedures: [
        'Review cooling logs weekly',
        'Test blast chiller/refrigeration effectiveness monthly',
      ],
      recordKeeping: [
        'Date, product, batch size',
        'Time baking ended, temp at 2h, temp at 6h',
        'Cooling method used',
        'Corrective action taken (if any)',
      ],
    },
    {
      id: 'ccp-display-case',
      ccpNumber: 6,
      processStep: 'Display & Sales',
      hazard: 'Temperature abuse of perishable products in display cases',
      criticalLimits:
        'Refrigerated display case: ≤ 41°F (5°C) for all cream, custard, cheese, or meat-filled products.',
      monitoring: {
        what: 'Display case temperature',
        how: 'Built-in thermometer reading or calibrated external thermometer',
        frequency: 'Twice daily (opening and midday) and whenever case is restocked',
        who: 'Staff member on duty',
      },
      correctiveActions: [
        'If display case above 41°F: check power supply, adjust thermostat',
        'If items have been above 41°F for less than 2 hours: move to walk-in refrigerator',
        'If items have been above 41°F for more than 2 hours: discard',
        'Use backup cooler while display case is repaired',
      ],
      verificationProcedures: [
        'Review display case temperature logs weekly',
        'Service refrigerated display cases as per manufacturer schedule',
      ],
      recordKeeping: [
        'Date, time, display case temperature',
        'Items in case',
        'Corrective actions taken',
      ],
    },
  ]
}

// ── Prerequisite Programs ───────────────────────────────────────────────

function getSharedPrereqs(): PrerequisiteProgram[] {
  return [
    {
      id: 'prereq-hygiene',
      name: 'Personal Hygiene',
      description: 'Standards for personal cleanliness and health to prevent food contamination.',
      procedures: [
        'Wash hands with soap and warm water for 20 seconds: before starting work, after touching raw meat, after using the restroom, after touching face/hair, after handling waste, and between tasks',
        'Wear clean clothing or aprons. Change if visibly soiled',
        'No bare-hand contact with ready-to-eat food — use gloves, tongs, or utensils',
        'Report illness (vomiting, diarrhea, jaundice, sore throat with fever) to supervisor before working. Exclude from food handling when symptomatic',
        'Cover cuts and wounds with bandages and gloves',
        'No eating, drinking, or smoking in food prep areas',
        'Hair must be restrained (hat, hairnet, or tied back)',
      ],
    },
    {
      id: 'prereq-supplier',
      name: 'Supplier Approval & Receiving',
      description: 'Vetting and monitoring suppliers to ensure ingredient safety and quality.',
      procedures: [
        'Source ingredients from approved, licensed suppliers only',
        'Maintain a list of approved suppliers with contact information',
        'Inspect all deliveries upon arrival: temperature, packaging integrity, expiration dates',
        'Reject deliveries that do not meet specifications (temp, quality, damaged packaging)',
        'Keep delivery receipts and invoices on file for traceability',
        'Periodically review supplier food safety certifications',
      ],
    },
    {
      id: 'prereq-pest',
      name: 'Pest Control',
      description: 'Preventing pest contamination in food storage and preparation areas.',
      procedures: [
        'Inspect the facility regularly for signs of pests (droppings, gnaw marks, nesting)',
        'Seal gaps and openings in walls, doors, and windows',
        'Store food off the floor and in sealed containers',
        'Remove garbage promptly; use covered bins',
        'Do not store cardboard boxes long-term (pest harborage)',
        'Engage a licensed pest control operator if needed; keep service records',
      ],
    },
    {
      id: 'prereq-cleaning',
      name: 'Cleaning & Sanitization',
      description:
        'Procedures for cleaning and sanitizing all food-contact and non-food-contact surfaces.',
      procedures: [
        'Follow the wash-rinse-sanitize protocol for all food-contact surfaces and equipment',
        'Use approved sanitizers at correct concentration (test with test strips)',
        'Clean as you go — sanitize surfaces between tasks, especially when switching from raw to ready-to-eat',
        'Deep-clean kitchen and storage areas at least weekly',
        'Maintain a cleaning schedule with assigned responsibilities',
        'Air-dry all sanitized items — never towel-dry',
        'Store cleaning chemicals separately from food, clearly labeled',
      ],
    },
    {
      id: 'prereq-equipment',
      name: 'Equipment Maintenance',
      description: 'Maintaining equipment in good working order to prevent food safety hazards.',
      procedures: [
        'Follow manufacturer instructions for cleaning and maintenance',
        'Calibrate thermometers monthly (ice-point method: 32°F ± 2°F)',
        'Repair or replace damaged equipment promptly (chipped cutting boards, cracked containers)',
        'Schedule preventive maintenance for refrigeration, ovens, and dishwashers',
        'Keep maintenance records on file',
      ],
    },
    {
      id: 'prereq-allergen',
      name: 'Allergen Management',
      description:
        'Procedures for preventing allergen cross-contact and communicating allergen information.',
      procedures: [
        'Maintain a complete ingredient list for every menu item, including allergens',
        'Identify the Big 9 allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame',
        'Train all staff to recognize and respond to allergen requests',
        'Use dedicated equipment for allergen-free preparation when possible',
        'Clean and sanitize shared equipment between allergen and non-allergen use',
        'Communicate allergens clearly to customers (labels, menu notes, verbal confirmation)',
        'Have an emergency protocol for allergic reactions (call 911, know location of EpiPen if available)',
      ],
    },
    {
      id: 'prereq-water',
      name: 'Water & Ice Safety',
      description: 'Ensuring all water and ice used in food preparation is safe and potable.',
      procedures: [
        'Use only potable water from an approved municipal or tested source',
        'Clean and sanitize ice machines regularly',
        'Use clean scoops for ice — never use hands or glasses',
        'If using a water tank (mobile operations): clean monthly, use food-grade materials',
      ],
    },
    {
      id: 'prereq-waste',
      name: 'Waste Disposal',
      description: 'Safe disposal of food waste, wastewater, and other refuse.',
      procedures: [
        'Use covered waste containers in all prep and service areas',
        'Empty bins regularly — do not let waste accumulate',
        'Separate grease waste for proper disposal (never pour down drain)',
        'Dispose of wastewater through approved sewage systems',
        'Clean waste containers and surrounding areas regularly',
      ],
    },
    {
      id: 'prereq-training',
      name: 'Food Safety Training',
      description: 'Ensuring all food handlers are trained in food safety principles.',
      procedures: [
        'All food handlers must have a valid food handler certification (or equivalent as required by local regulations)',
        'Conduct food safety orientation for new hires before they handle food',
        'Provide refresher training at least annually',
        'Train staff on this HACCP plan and their monitoring responsibilities',
        'Document all training with dates, topics, and attendees',
        'Manager/chef should hold ServSafe Manager certification (or equivalent)',
      ],
    },
  ]
}

function getArchetypePrereqs(archetypeId: ArchetypeId): PrerequisiteProgram[] {
  switch (archetypeId) {
    case 'private-chef':
      return [
        {
          id: 'prereq-client-comm',
          name: 'Client Communication & Allergen Inquiry',
          description:
            'Pre-event communication with clients about dietary needs and kitchen environment.',
          procedures: [
            'Collect detailed dietary restrictions and allergies from every client before the first service',
            'Confirm allergies again 48 hours before each event',
            "Ask about other household members' allergies (cross-contact risk in shared kitchen)",
            'Document client preferences and allergies in the client profile',
            'Discuss kitchen layout and available equipment before first visit',
          ],
        },
      ]
    case 'caterer':
      return [
        {
          id: 'prereq-venue-assessment',
          name: 'Venue Assessment',
          description: 'Evaluating event venues for food safety suitability before committing.',
          procedures: [
            'Visit or assess venue facilities before the event (kitchen, water, power, refrigeration)',
            'Confirm availability of handwashing facilities at the venue',
            'Plan for food safety in outdoor settings (shade, wind protection, ambient temperature)',
            'Identify nearest hospital/emergency services for each venue',
            'Bring backup equipment (cutting boards, thermometer, handwash station) to every event',
          ],
        },
      ]
    case 'meal-prep':
      return [
        {
          id: 'prereq-labeling',
          name: 'Labeling & Date Marking',
          description:
            'Ensuring every meal container is properly labeled for safety and traceability.',
          procedures: [
            'Every container must include: product name, preparation date, use-by date, full ingredient list, allergen declarations',
            'Use-by date: maximum 7 days from preparation for refrigerated items (or as required by local regulation)',
            'Use standardized label templates to prevent errors',
            'Double-check ingredient lists against recipes before printing labels',
            'Include reheating instructions on each container',
          ],
        },
      ]
    case 'food-truck':
      return [
        {
          id: 'prereq-mobile-setup',
          name: 'Mobile Unit Setup & Inspection',
          description:
            'Ensuring the truck and equipment are ready for safe operation at each location.',
          procedures: [
            'Level the truck and secure all equipment before starting service',
            'Verify water tank is full and from an approved source',
            'Check that handwash station has hot water, soap, and paper towels',
            'Ensure generator/power source is operational',
            'Verify waste tanks are empty and functioning',
            'Keep a copy of your mobile food vendor permit visible at all times',
          ],
        },
      ]
    case 'bakery':
      return [
        {
          id: 'prereq-allergen-bakery',
          name: 'Bakery-Specific Allergen Controls',
          description:
            'Enhanced allergen management for bakery environments where airborne flour and shared equipment are constant risks.',
          procedures: [
            'Designate a separate area or time for allergen-free (especially gluten-free) production',
            'Use dedicated mixers, bowls, and baking pans for allergen-free products when possible',
            'Clearly label all flour bins, nut containers, and dairy products',
            'Schedule allergen-free production at the start of the day before any allergen-containing products are made',
            'Wet-clean surfaces to remove airborne flour residue (sweeping spreads allergens)',
          ],
        },
      ]
    case 'restaurant':
      return [] // Shared prereqs cover restaurant needs well
    default:
      return []
  }
}

// ── Record-Keeping Summary ──────────────────────────────────────────────

function getRecordKeepingSummary(archetypeId: ArchetypeId): string[] {
  const shared = [
    'Receiving temperature logs — every delivery',
    'Cold storage temperature logs — twice daily',
    'Cooking temperature logs — every batch/item',
    'Thermometer calibration records — monthly',
    'Cleaning and sanitization schedule — daily/weekly',
    'Staff training records — with dates and topics',
    'Supplier approval records — updated annually',
    'Corrective action reports — as needed',
  ]

  const specific: Record<ArchetypeId, string[]> = {
    'private-chef': [
      'Transport temperature logs — every client visit',
      'Client kitchen assessment records — every visit',
      'Client allergen profiles — updated per client',
    ],
    caterer: [
      'Hot-holding temperature logs — every event (every 30 min during service)',
      'Cold-holding temperature logs — every event',
      'Transport temperature logs — every trip',
      'Event setup timing logs — food staging start/end times',
      'Venue assessment records — per venue',
    ],
    'meal-prep': [
      'Cooling temperature logs — every batch (2h and 6h checks)',
      'Portioning time logs — every session',
      'Delivery temperature logs — every route',
      'Labeling accuracy checks — per batch',
    ],
    restaurant: [
      'Hot-holding logs — every shift',
      'Cold-holding (prep station) logs — every shift',
      'Reheating temperature logs — every reheated item',
    ],
    'food-truck': [
      'Water tank fill records — every fill (source, date, amount)',
      'Handwash station supply checks — every shift',
      'Hot-holding temperature logs — every shift',
      'Waste tank emptying records — as needed',
    ],
    bakery: [
      'Allergen batch changeover records — every changeover',
      'Cooling logs for filled products — every batch',
      'Display case temperature logs — twice daily',
      'Production sequence records — daily (allergen-free first)',
    ],
  }

  return [...shared, ...(specific[archetypeId] || [])]
}

// ── Main Generator ──────────────────────────────────────────────────────

/**
 * Generate a complete HACCP plan for the given chef archetype.
 * Pure deterministic — no AI, no network calls.
 * Based on FDA Food Code 2022 and industry best practices.
 */
export function generateHACCPPlan(archetypeId: ArchetypeId): HACCPPlanData {
  const meta = ARCHETYPE_META[archetypeId]

  // Build process steps: shared + archetype-specific
  const sharedSteps = [getReceivingStep(), getColdStorageStep(), getPrepStep(), getCookingStep()]

  const archetypeSteps: Record<ArchetypeId, () => ProcessStep[]> = {
    'private-chef': getPrivateChefSteps,
    caterer: getCatererSteps,
    'meal-prep': getMealPrepSteps,
    restaurant: getRestaurantSteps,
    'food-truck': getFoodTruckSteps,
    bakery: getBakerySteps,
  }

  const specificSteps = archetypeSteps[archetypeId]()
  const processSteps = [...sharedSteps, ...specificSteps, getCleanupStep()]

  // Build CCPs: shared (1-3) + archetype-specific (4+)
  const sharedCCPs = [getReceivingCCP(), getColdStorageCCP(), getCookingCCP()]

  const archetypeCCPs: Record<ArchetypeId, () => CriticalControlPoint[]> = {
    'private-chef': getPrivateChefCCPs,
    caterer: getCatererCCPs,
    'meal-prep': getMealPrepCCPs,
    restaurant: getRestaurantCCPs,
    'food-truck': getFoodTruckCCPs,
    bakery: getBakeryCCPs,
  }

  const specificCCPs = archetypeCCPs[archetypeId]()
  const criticalControlPoints = [...sharedCCPs, ...specificCCPs]

  // Prerequisite programs: shared + archetype-specific
  const prereqs = [...getSharedPrereqs(), ...getArchetypePrereqs(archetypeId)]

  return {
    version: 1,
    archetypeId,
    generatedAt: new Date().toISOString(),
    planTitle: `HACCP Plan — ${meta.label}`,
    businessDescription: meta.description,
    processSteps,
    criticalControlPoints,
    prerequisitePrograms: prereqs,
    recordKeepingSummary: getRecordKeepingSummary(archetypeId),
    reviewSchedule:
      'Review this plan at least annually, or whenever there is a significant change in menu, process, equipment, suppliers, or regulations. Update immediately after any food safety incident.',
    overrides: {},
  }
}
