// Client Intake Form types
// Shared between server actions, chef UI, and public form

export type IntakeFieldType =
  | 'text'
  | 'textarea'
  | 'checkbox_group'
  | 'radio'
  | 'select'
  | 'allergy_picker'
  | 'number'
  | 'date'

export interface IntakeFormField {
  id: string
  type: IntakeFieldType
  label: string
  description?: string
  required: boolean
  options?: string[]
  placeholder?: string
  mapToClientField?: string
}

export interface IntakeForm {
  id: string
  tenant_id: string
  name: string
  description: string | null
  fields: IntakeFormField[]
  is_default: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface IntakeResponse {
  id: string
  tenant_id: string
  form_id: string
  client_id: string | null
  client_name: string | null
  client_email: string | null
  responses: Record<string, unknown>
  applied_at: string | null
  submitted_at: string
  share_token: string
}

export interface IntakeShare {
  id: string
  tenant_id: string
  form_id: string
  client_id: string | null
  client_email: string | null
  client_name: string | null
  share_token: string
  response_id: string | null
  created_at: string
  expires_at: string
}

// Mappable client fields (for auto-applying responses to client profiles)
export const MAPPABLE_CLIENT_FIELDS: Record<string, string> = {
  dietary_restrictions: 'Dietary Restrictions',
  allergies: 'Allergies',
  dislikes: 'Dislikes',
  spice_tolerance: 'Spice Tolerance',
  favorite_cuisines: 'Favorite Cuisines',
  favorite_dishes: 'Favorite Dishes',
  wine_beverage_preferences: 'Wine/Beverage Preferences',
  preferred_contact_method: 'Preferred Contact Method',
  kitchen_size: 'Kitchen Size',
  kitchen_constraints: 'Kitchen Constraints',
  equipment_available: 'Equipment Available',
  house_rules: 'House Rules',
  parking_instructions: 'Parking Instructions',
  access_instructions: 'Access Instructions',
  partner_name: 'Partner Name',
  vibe_notes: 'Vibe Notes',
  what_they_care_about: 'What They Care About',
}

// Default form templates seeded for new chefs
export const DEFAULT_FORM_TEMPLATES: Omit<
  IntakeForm,
  'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'is_deleted'
>[] = [
  {
    name: 'New Client Assessment',
    description:
      'A comprehensive intake form for new clients covering dietary needs, kitchen setup, and preferences.',
    is_default: true,
    fields: [
      {
        id: 'full_name',
        type: 'text',
        label: 'Full Name',
        required: true,
        placeholder: 'Your full name',
      },
      {
        id: 'email',
        type: 'text',
        label: 'Email Address',
        required: true,
        placeholder: 'you@example.com',
      },
      {
        id: 'phone',
        type: 'text',
        label: 'Phone Number',
        required: false,
        placeholder: '(555) 123-4567',
      },
      {
        id: 'household_size',
        type: 'number',
        label: 'How many people in your household?',
        required: true,
        placeholder: '4',
      },
      {
        id: 'dietary_restrictions',
        type: 'checkbox_group',
        label: 'Dietary Restrictions',
        description: 'Select all that apply to anyone in your household.',
        required: false,
        options: [
          'Vegetarian',
          'Vegan',
          'Gluten-Free',
          'Dairy-Free',
          'Kosher',
          'Halal',
          'Pescatarian',
          'Keto',
          'Paleo',
          'Low-Sodium',
          'None',
        ],
        mapToClientField: 'dietary_restrictions',
      },
      {
        id: 'allergies',
        type: 'allergy_picker',
        label: 'Food Allergies',
        description: 'Please list any food allergies. This is critical for your safety.',
        required: false,
        mapToClientField: 'allergies',
      },
      {
        id: 'dislikes',
        type: 'textarea',
        label: 'Food Dislikes',
        description: 'Any foods you or your household strongly dislike?',
        required: false,
        placeholder: 'e.g., olives, blue cheese, cilantro...',
        mapToClientField: 'dislikes',
      },
      {
        id: 'favorite_cuisines',
        type: 'checkbox_group',
        label: 'Favorite Cuisines',
        required: false,
        options: [
          'Italian',
          'French',
          'Japanese',
          'Mexican',
          'Thai',
          'Indian',
          'Mediterranean',
          'American',
          'Chinese',
          'Korean',
          'Middle Eastern',
          'Other',
        ],
        mapToClientField: 'favorite_cuisines',
      },
      {
        id: 'spice_tolerance',
        type: 'radio',
        label: 'Spice Tolerance',
        required: false,
        options: ['None (no spice at all)', 'Mild', 'Medium', 'Hot', 'Very Hot'],
        mapToClientField: 'spice_tolerance',
      },
      {
        id: 'kitchen_size',
        type: 'radio',
        label: 'Kitchen Size',
        required: false,
        options: [
          'Small (apartment-sized)',
          'Medium (standard home)',
          'Large (spacious, double oven)',
          'Commercial/Professional',
        ],
        mapToClientField: 'kitchen_size',
      },
      {
        id: 'equipment_available',
        type: 'checkbox_group',
        label: 'Kitchen Equipment Available',
        description: 'What equipment do you have that the chef can use?',
        required: false,
        options: [
          'Standard Oven',
          'Convection Oven',
          'Gas Stovetop',
          'Electric Stovetop',
          'Induction Cooktop',
          'Blender',
          'Food Processor',
          'Stand Mixer',
          'Outdoor Grill',
          'Smoker',
          'Sous Vide',
          'Instant Pot',
          'Air Fryer',
          'Deep Fryer',
        ],
        mapToClientField: 'equipment_available',
      },
      {
        id: 'budget_range',
        type: 'radio',
        label: 'Typical Budget Range (per event)',
        required: false,
        options: [
          'Under $500',
          '$500 - $1,000',
          '$1,000 - $2,500',
          '$2,500 - $5,000',
          '$5,000+',
          'Flexible / not sure yet',
        ],
      },
      {
        id: 'additional_notes',
        type: 'textarea',
        label: 'Anything else we should know?',
        required: false,
        placeholder: 'Special occasions, preferences, goals for hiring a private chef...',
      },
    ],
  },
  {
    name: 'Dietary Questionnaire',
    description:
      'A focused form for capturing dietary restrictions, allergies, and food preferences.',
    is_default: true,
    fields: [
      {
        id: 'full_name',
        type: 'text',
        label: 'Full Name',
        required: true,
        placeholder: 'Your full name',
      },
      {
        id: 'dietary_restrictions',
        type: 'checkbox_group',
        label: 'Dietary Restrictions',
        description: 'Select all that apply.',
        required: false,
        options: [
          'Vegetarian',
          'Vegan',
          'Gluten-Free',
          'Dairy-Free',
          'Kosher',
          'Halal',
          'Pescatarian',
          'Keto',
          'Paleo',
          'Low-Sodium',
          'None',
        ],
        mapToClientField: 'dietary_restrictions',
      },
      {
        id: 'allergies',
        type: 'allergy_picker',
        label: 'Food Allergies',
        description: 'Critical for your safety. Select all known allergies.',
        required: false,
        mapToClientField: 'allergies',
      },
      {
        id: 'dislikes',
        type: 'textarea',
        label: 'Foods You Dislike',
        required: false,
        placeholder: 'List any foods you strongly dislike...',
        mapToClientField: 'dislikes',
      },
      {
        id: 'spice_tolerance',
        type: 'radio',
        label: 'Spice Tolerance',
        required: false,
        options: ['None (no spice at all)', 'Mild', 'Medium', 'Hot', 'Very Hot'],
        mapToClientField: 'spice_tolerance',
      },
      {
        id: 'favorite_dishes',
        type: 'textarea',
        label: 'Favorite Dishes',
        description: 'What are your all-time favorite meals or dishes?',
        required: false,
        placeholder: 'e.g., pasta carbonara, sushi, grilled lamb chops...',
        mapToClientField: 'favorite_dishes',
      },
      {
        id: 'wine_beverage_preferences',
        type: 'textarea',
        label: 'Wine and Beverage Preferences',
        required: false,
        placeholder: 'e.g., red wine, sparkling water, no alcohol...',
        mapToClientField: 'wine_beverage_preferences',
      },
      {
        id: 'portion_preference',
        type: 'radio',
        label: 'Portion Size Preference',
        required: false,
        options: [
          'Light / small portions',
          'Standard portions',
          'Generous / large portions',
          'Family-style (shared plates)',
        ],
      },
      {
        id: 'meal_frequency',
        type: 'radio',
        label: 'How many meals per day do you typically eat?',
        required: false,
        options: ['1-2 meals', '3 meals', '3 meals + snacks', 'Grazing / many small meals'],
      },
    ],
  },
  {
    name: 'Kitchen Equipment Checklist',
    description:
      "A quick checklist of what equipment your client's kitchen has available for the chef to use.",
    is_default: true,
    fields: [
      {
        id: 'full_name',
        type: 'text',
        label: 'Full Name',
        required: true,
        placeholder: 'Your full name',
      },
      {
        id: 'oven_type',
        type: 'checkbox_group',
        label: 'Oven',
        required: false,
        options: [
          'Standard Electric Oven',
          'Standard Gas Oven',
          'Convection Oven',
          'Double Oven',
          'Wall Oven',
          'Toaster Oven',
          'None',
        ],
      },
      {
        id: 'stovetop_type',
        type: 'checkbox_group',
        label: 'Stovetop / Cooktop',
        required: false,
        options: [
          'Gas Burners',
          'Electric Coil',
          'Glass/Ceramic Electric',
          'Induction',
          'Portable Burner',
        ],
      },
      {
        id: 'countertop_appliances',
        type: 'checkbox_group',
        label: 'Countertop Appliances',
        required: false,
        options: [
          'Blender',
          'Food Processor',
          'Stand Mixer (e.g., KitchenAid)',
          'Hand Mixer',
          'Instant Pot / Pressure Cooker',
          'Air Fryer',
          'Slow Cooker / Crock Pot',
          'Rice Cooker',
          'Toaster',
          'Waffle Iron',
          'Juicer',
          'Coffee Machine / Espresso',
        ],
      },
      {
        id: 'outdoor_cooking',
        type: 'checkbox_group',
        label: 'Outdoor Cooking',
        required: false,
        options: [
          'Gas Grill',
          'Charcoal Grill',
          'Smoker',
          'Pizza Oven',
          'Outdoor Burner / Wok Station',
          'None',
        ],
      },
      {
        id: 'specialty_equipment',
        type: 'checkbox_group',
        label: 'Specialty Equipment',
        required: false,
        options: [
          'Sous Vide / Immersion Circulator',
          'Deep Fryer',
          'Mandoline',
          'Pasta Machine',
          'Ice Cream Maker',
          'Dehydrator',
          'Vacuum Sealer',
          'Torch (for brulee, etc.)',
        ],
      },
      {
        id: 'cookware',
        type: 'checkbox_group',
        label: 'Cookware Highlights',
        description: 'Check anything notable that the chef should know about.',
        required: false,
        options: [
          'Cast Iron Skillet',
          'Dutch Oven',
          'Stainless Steel Pans',
          'Non-Stick Pans',
          'Wok',
          'Baking Sheets',
          'Muffin/Cake Pans',
          'Sheet Pan Set',
          'Roasting Pan',
        ],
      },
      {
        id: 'kitchen_notes',
        type: 'textarea',
        label: 'Additional Kitchen Notes',
        description: 'Anything else the chef should know about your kitchen setup?',
        required: false,
        placeholder: 'e.g., limited counter space, no dishwasher, pantry items to use up...',
      },
    ],
  },
]
