-- ============================================
-- Public market-research surveys on beta survey infrastructure
-- ============================================
-- Timestamp: 20260402000118
-- Purpose:
--   1. Extend beta survey definitions to support public market research launches
--   2. Allow generalized respondent roles for operator/client discovery surveys
--   3. Seed the two wave-1 launch surveys so they are shareable in-app

ALTER TABLE beta_survey_definitions
  DROP CONSTRAINT IF EXISTS beta_survey_definitions_survey_type_check;

ALTER TABLE beta_survey_definitions
  ADD CONSTRAINT beta_survey_definitions_survey_type_check
  CHECK (
    survey_type IN (
      'pre_beta',
      'post_beta',
      'market_research_operator',
      'market_research_client'
    )
  );

ALTER TABLE beta_survey_responses
  DROP CONSTRAINT IF EXISTS beta_survey_responses_respondent_role_check;

ALTER TABLE beta_survey_responses
  ADD CONSTRAINT beta_survey_responses_respondent_role_check
  CHECK (
    respondent_role IN (
      'chef',
      'client',
      'tester',
      'staff',
      'partner',
      'food_operator',
      'consumer'
    )
  );

COMMENT ON COLUMN beta_survey_definitions.questions IS 'JSON array of question objects: [{id, type, label, options?, required, order, section?, show_if?, max_selections?}].';

INSERT INTO beta_survey_definitions (slug, title, description, survey_type, questions, is_active)
VALUES (
  'food-operator-wave-1',
  'Food Operator Survey - Wave 1',
  'A short survey for independent food operators. We are learning how real operators handle pricing, workflow, sourcing, and day-to-day operations so we can build something genuinely useful. This takes about 5-7 minutes. Responses are anonymous.',
  'market_research_operator',
  $food_operator_questions$
  [
    {
      "id": "business_type",
      "type": "single_select",
      "label": "What best describes your primary business today?",
      "options": [
        "Private chef / personal chef",
        "Caterer",
        "Meal prep service",
        "Bakery or dessert business",
        "Food truck / pop-up",
        "Restaurant / cafe / storefront food business",
        "Other food operator"
      ],
      "required": true,
      "order": 1,
      "section": "About Your Business"
    },
    {
      "id": "location",
      "type": "short_text",
      "label": "What state or metro area are you based in?",
      "required": true,
      "order": 2,
      "section": "Core Questions",
      "placeholder": "City, state, or metro area"
    },
    {
      "id": "years_operating",
      "type": "single_select",
      "label": "How long have you been operating?",
      "options": [
        "Less than 1 year",
        "1-3 years",
        "3-5 years",
        "5-10 years",
        "10+ years"
      ],
      "required": true,
      "order": 3,
      "section": "Core Questions"
    },
    {
      "id": "team_size",
      "type": "single_select",
      "label": "How many people regularly help run the business?",
      "options": [
        "Just me",
        "2-3 people",
        "4-10 people",
        "11+ people"
      ],
      "required": true,
      "order": 4,
      "section": "Core Questions"
    },
    {
      "id": "tools_used",
      "type": "multi_select",
      "label": "Which tools do you currently rely on most?",
      "options": [
        "Text messages / WhatsApp / iMessage",
        "Email",
        "Instagram DMs",
        "Google Docs / Sheets",
        "Notion / Trello / Airtable",
        "QuickBooks / FreshBooks / Wave",
        "Square / Stripe / Venmo / Zelle",
        "HoneyBook / Dubsado / 17hats",
        "Pen and paper / notebook",
        "POS system",
        "Inventory or costing software",
        "My own memory",
        "Other"
      ],
      "required": true,
      "order": 5,
      "section": "Core Questions",
      "max_selections": 4
    },
    {
      "id": "time_sink",
      "type": "multi_select",
      "label": "What takes the most time outside the actual food work?",
      "options": [
        "Responding to inquiries and messages",
        "Creating quotes or proposals",
        "Menu planning",
        "Grocery shopping or sourcing",
        "Scheduling and calendar management",
        "Invoicing and payment follow-up",
        "Inventory or purchasing",
        "Bookkeeping and expense tracking",
        "Marketing and social media",
        "Recipe documentation and costing",
        "Staff coordination",
        "Other"
      ],
      "required": true,
      "order": 6,
      "section": "Core Questions",
      "max_selections": 2
    },
    {
      "id": "profit_confidence",
      "type": "single_select",
      "label": "Do you feel confident you know your true profit or margin on each job, product, or menu?",
      "options": [
        "Yes, I track it closely",
        "I have a rough idea",
        "Not really",
        "No, and that is a real problem"
      ],
      "required": true,
      "order": 7,
      "section": "Core Questions"
    },
    {
      "id": "ingredient_pricing_importance",
      "type": "single_select",
      "label": "How important would real-time ingredient pricing or food-cost visibility be for you?",
      "options": [
        "Critical",
        "Very important",
        "Somewhat important",
        "Not that important",
        "Not relevant to how I work"
      ],
      "required": true,
      "order": 8,
      "section": "Core Questions"
    },
    {
      "id": "tool_interest",
      "type": "single_select",
      "label": "If one platform handled your most painful workflow well, how interested would you be in trying it?",
      "options": [
        "Extremely interested",
        "Interested",
        "Maybe",
        "Probably not",
        "Not interested"
      ],
      "required": true,
      "order": 9,
      "section": "Core Questions"
    },
    {
      "id": "price_expectation",
      "type": "single_select",
      "label": "What monthly price range feels reasonable if a tool truly saves time or protects margin?",
      "options": [
        "Free only",
        "$1-$15/month",
        "$15-$30/month",
        "$30-$50/month",
        "$50-$100/month",
        "$100+/month if the value is there",
        "I would rather pay per transaction"
      ],
      "required": true,
      "order": 10,
      "section": "Core Questions"
    },
    {
      "id": "survey_source",
      "type": "single_select",
      "label": "Where did you first see this survey?",
      "options": [
        "Direct email or text",
        "Facebook group",
        "Instagram",
        "LinkedIn",
        "Reddit",
        "Paid ad",
        "Association or newsletter",
        "Supplier or vendor",
        "Friend / referral",
        "Other"
      ],
      "required": true,
      "order": 11,
      "section": "Core Questions"
    },
    {
      "id": "inquiry_sources",
      "type": "multi_select",
      "label": "Where do most new inquiries come from today?",
      "options": [
        "Word of mouth / referral",
        "Instagram DM",
        "Email",
        "Phone call or text",
        "Website inquiry form",
        "Marketplace platform",
        "Facebook",
        "Event planner or venue partner",
        "Other"
      ],
      "required": true,
      "order": 12,
      "section": "Clientflow Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Private chef / personal chef",
          "Caterer",
          "Meal prep service"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "quote_process",
      "type": "single_select",
      "label": "How do you currently handle quotes, deposits, or approvals?",
      "options": [
        "Mostly by text or email",
        "PDF or document workflow",
        "HoneyBook / Dubsado / similar tool",
        "Invoice tool plus manual follow-up",
        "Verbal agreement / informal process",
        "Other"
      ],
      "required": true,
      "order": 13,
      "section": "Clientflow Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Private chef / personal chef",
          "Caterer",
          "Meal prep service"
        ]
      }
    },
    {
      "id": "communication_breakdown",
      "type": "single_select",
      "label": "What part of client communication breaks down most often?",
      "options": [
        "Slow response time",
        "Messages across too many channels",
        "Menu changes and revisions",
        "Getting approvals or decisions",
        "Deposit or payment follow-up",
        "Expectations and scope clarity",
        "Other"
      ],
      "required": true,
      "order": 14,
      "section": "Clientflow Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Private chef / personal chef",
          "Caterer",
          "Meal prep service"
        ]
      }
    },
    {
      "id": "grocery_cost_handling",
      "type": "single_select",
      "label": "How do you usually handle grocery costs?",
      "options": [
        "I include them in my fee",
        "Client reimburses me afterward",
        "Client gives a budget upfront",
        "Client shops themselves",
        "It varies by job"
      ],
      "required": true,
      "order": 15,
      "section": "Clientflow Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Private chef / personal chef",
          "Caterer",
          "Meal prep service"
        ]
      }
    },
    {
      "id": "cost_tracking",
      "type": "single_select",
      "label": "How do you currently track ingredient costs?",
      "options": [
        "Spreadsheet",
        "POS or back-office software",
        "Accounting software only",
        "Inventory / costing platform",
        "Manual checks / memory",
        "I do not track this consistently"
      ],
      "required": true,
      "order": 16,
      "section": "Operations Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Bakery or dessert business",
          "Food truck / pop-up",
          "Restaurant / cafe / storefront food business",
          "Other food operator"
        ]
      }
    },
    {
      "id": "pricing_review_cadence",
      "type": "single_select",
      "label": "How often do you revisit menu pricing or product pricing?",
      "options": [
        "Weekly",
        "Monthly",
        "Every few months",
        "Only when something feels wrong",
        "Rarely"
      ],
      "required": true,
      "order": 17,
      "section": "Operations Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Bakery or dessert business",
          "Food truck / pop-up",
          "Restaurant / cafe / storefront food business",
          "Other food operator"
        ]
      }
    },
    {
      "id": "margin_loss_source",
      "type": "single_select",
      "label": "What is the biggest operational source of margin loss?",
      "options": [
        "Ingredient cost increases",
        "Waste or spoilage",
        "Portion inconsistency",
        "Poor pricing visibility",
        "Vendor / purchasing issues",
        "Labor inefficiency",
        "I am not sure",
        "Other"
      ],
      "required": true,
      "order": 18,
      "section": "Operations Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Bakery or dessert business",
          "Food truck / pop-up",
          "Restaurant / cafe / storefront food business",
          "Other food operator"
        ]
      }
    },
    {
      "id": "manual_ops_pain",
      "type": "single_select",
      "label": "What part of purchasing, inventory, or pricing feels most manual?",
      "options": [
        "Tracking vendor prices",
        "Updating recipes or yield assumptions",
        "Counting inventory",
        "Adjusting menu or product pricing",
        "Comparing vendors",
        "Matching purchases to sales / usage",
        "Other"
      ],
      "required": true,
      "order": 19,
      "section": "Operations Questions",
      "show_if": {
        "questionId": "business_type",
        "equals": [
          "Bakery or dessert business",
          "Food truck / pop-up",
          "Restaurant / cafe / storefront food business",
          "Other food operator"
        ]
      }
    },
    {
      "id": "one_painful_problem",
      "type": "textarea",
      "label": "If we could solve one painful part of running your food business, what should it be?",
      "required": false,
      "order": 20,
      "section": "Final Thought",
      "placeholder": "What should we solve first?"
    }
  ]
  $food_operator_questions$::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  survey_type = EXCLUDED.survey_type,
  questions = EXCLUDED.questions,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO beta_survey_definitions (slug, title, description, survey_type, questions, is_active)
VALUES (
  'private-chef-client-wave-1',
  'Hiring a Private Chef - Quick Experience Survey',
  'A short survey for people who have hired, seriously considered, or are curious about hiring a private chef or similar food service for a personal event. We are learning what makes discovery, booking, pricing, and planning feel easy or difficult. This takes about 4-6 minutes. Responses are anonymous.',
  'market_research_client',
  $client_questions$
  [
    {
      "id": "role_status",
      "type": "single_select",
      "label": "Which best describes you today?",
      "options": [
        "I have hired a private chef or caterer more than once",
        "I have hired one once",
        "I have not hired one, but I have seriously considered it",
        "I have not hired one, I am mostly curious"
      ],
      "required": true,
      "order": 1,
      "section": "About You"
    },
    {
      "id": "event_type",
      "type": "single_select",
      "label": "What type of event was it or would it most likely be for?",
      "options": [
        "Dinner party at home (6-20 guests)",
        "Large event or celebration (20+ guests)",
        "Weekly meal prep",
        "Date night or intimate dinner (2-4 people)",
        "Holiday gathering",
        "Corporate event",
        "Wedding or rehearsal dinner",
        "Cooking class or food experience",
        "Other"
      ],
      "required": true,
      "order": 2,
      "section": "Core Questions"
    },
    {
      "id": "location",
      "type": "short_text",
      "label": "What state or metro area are you based in?",
      "required": true,
      "order": 3,
      "section": "Core Questions",
      "placeholder": "City, state, or metro area"
    },
    {
      "id": "survey_source",
      "type": "single_select",
      "label": "Where did you first see this survey?",
      "options": [
        "Direct email or text",
        "Facebook group",
        "Instagram",
        "LinkedIn",
        "Reddit",
        "Paid ad",
        "Planner or venue",
        "Newsletter or blog",
        "Friend / referral",
        "Other"
      ],
      "required": true,
      "order": 4,
      "section": "Core Questions"
    },
    {
      "id": "how_found_chef",
      "type": "multi_select",
      "label": "How did you find the chef you hired?",
      "options": [
        "Friend or family recommendation",
        "Google search",
        "Instagram",
        "Marketplace platform",
        "Yelp or Google Reviews",
        "Planner or venue recommendation",
        "I already knew them",
        "Other"
      ],
      "required": true,
      "order": 5,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "choice_factors",
      "type": "multi_select",
      "label": "What mattered most when choosing?",
      "options": [
        "Recommendation from someone I trust",
        "Reviews and ratings",
        "Photos of past work",
        "Pricing",
        "Availability",
        "Menu customization",
        "Dietary accommodation",
        "Professional communication",
        "Speed of response",
        "Other"
      ],
      "required": true,
      "order": 6,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "booking_friction",
      "type": "single_select",
      "label": "What part of booking or planning felt most annoying or uncertain?",
      "options": [
        "Finding someone trustworthy",
        "Waiting for a response",
        "Back-and-forth on menu details",
        "Understanding what the price included",
        "Paying a deposit or balance",
        "Sharing event details up front",
        "I did not find the process difficult",
        "Other"
      ],
      "required": true,
      "order": 7,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      }
    },
    {
      "id": "quote_preference",
      "type": "single_select",
      "label": "If a chef sends a quote, how would you prefer to receive and review it?",
      "options": [
        "A clean mobile-friendly document",
        "A PDF attached to email",
        "A link to an online portal where I can review, accept, and pay",
        "A simple text or email with the essentials"
      ],
      "required": true,
      "order": 8,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      }
    },
    {
      "id": "deposit_comfort",
      "type": "single_select",
      "label": "How comfortable are you paying a deposit through an online portal?",
      "options": [
        "Very comfortable",
        "Comfortable after a quick call or message exchange",
        "Somewhat uncomfortable",
        "Not comfortable"
      ],
      "required": true,
      "order": 9,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      }
    },
    {
      "id": "menu_preference",
      "type": "single_select",
      "label": "Which menu approach feels best to you?",
      "options": [
        "I want to choose exact dishes",
        "I want to share preferences and let the chef propose the menu",
        "I want the chef to propose a menu and I will approve it",
        "I am happy to trust the chef completely"
      ],
      "required": true,
      "order": 10,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      }
    },
    {
      "id": "rebook_driver",
      "type": "multi_select",
      "label": "What would most increase the chance you rebook or recommend a chef?",
      "options": [
        "Outstanding food quality",
        "Easy planning and communication",
        "Fast professional responses",
        "Clear pricing and no surprises",
        "Great handling of dietary needs",
        "Feeling comfortable having them in my home",
        "A memorable overall experience",
        "Other"
      ],
      "required": true,
      "order": 11,
      "section": "Booking Experience",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have hired a private chef or caterer more than once",
          "I have hired one once"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "find_path",
      "type": "multi_select",
      "label": "How would you most likely try to find a chef?",
      "options": [
        "Friend or family recommendation",
        "Google search",
        "Instagram",
        "Marketplace platform",
        "Yelp or Google Reviews",
        "Planner or venue recommendation",
        "Local Facebook or neighborhood groups",
        "Other"
      ],
      "required": true,
      "order": 12,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "trust_factors",
      "type": "multi_select",
      "label": "What would matter most when deciding whom to trust?",
      "options": [
        "Recommendation from someone I trust",
        "Reviews and ratings",
        "Photos of past work",
        "Clear pricing",
        "Availability for my date",
        "Dietary accommodation",
        "Professional communication",
        "A phone call before booking",
        "Other"
      ],
      "required": true,
      "order": 13,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "booking_blockers",
      "type": "multi_select",
      "label": "What has stopped you from booking so far?",
      "options": [
        "It feels too expensive",
        "I do not know how to find the right person",
        "The process seems complicated",
        "I am not sure what to expect",
        "I am not comfortable with a stranger in my home",
        "Timing or occasion has not been right yet",
        "Nothing specific, I just have not done it yet",
        "Other"
      ],
      "required": true,
      "order": 14,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "upfront_info_preference",
      "type": "single_select",
      "label": "When first reaching out, how much information feels reasonable to share up front?",
      "options": [
        "Just basic interest and the date",
        "Date, guest count, and occasion",
        "Date, guest count, budget, and dietary info",
        "I am fine with a detailed form if the questions feel relevant",
        "I would rather talk before filling out much"
      ],
      "required": true,
      "order": 15,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      }
    },
    {
      "id": "quote_preference_considering",
      "type": "single_select",
      "label": "If a chef sends a quote, how would you prefer to receive and review it?",
      "options": [
        "A clean mobile-friendly document",
        "A PDF attached to email",
        "A link to an online portal where I can review, accept, and pay",
        "A simple text or email with the essentials"
      ],
      "required": true,
      "order": 16,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      }
    },
    {
      "id": "deposit_comfort_considering",
      "type": "single_select",
      "label": "How comfortable are you paying a deposit through an online portal?",
      "options": [
        "Very comfortable",
        "Comfortable after a quick call or message exchange",
        "Somewhat uncomfortable",
        "Not comfortable"
      ],
      "required": true,
      "order": 17,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      }
    },
    {
      "id": "menu_preference_considering",
      "type": "single_select",
      "label": "Which menu approach feels best to you?",
      "options": [
        "I want to choose exact dishes",
        "I want to share preferences and let the chef propose the menu",
        "I want the chef to propose a menu and I will approve it",
        "I am happy to trust the chef completely"
      ],
      "required": true,
      "order": 18,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      }
    },
    {
      "id": "trust_boost",
      "type": "multi_select",
      "label": "What would most increase your trust enough to book?",
      "options": [
        "Recommendation from someone I trust",
        "Strong reviews",
        "Photos or sample menus",
        "Clear pricing and what is included",
        "Fast professional response",
        "Easy booking process",
        "A quick phone call before paying",
        "Other"
      ],
      "required": true,
      "order": 19,
      "section": "Booking Expectations",
      "show_if": {
        "questionId": "role_status",
        "equals": [
          "I have not hired one, but I have seriously considered it",
          "I have not hired one, I am mostly curious"
        ]
      },
      "max_selections": 2
    },
    {
      "id": "ease_driver",
      "type": "textarea",
      "label": "If one thing made hiring a chef feel easier, what would it be?",
      "required": false,
      "order": 20,
      "section": "Final Thought",
      "placeholder": "What would make the process feel easier?"
    }
  ]
  $client_questions$::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  survey_type = EXCLUDED.survey_type,
  questions = EXCLUDED.questions,
  is_active = EXCLUDED.is_active,
  updated_at = now();
