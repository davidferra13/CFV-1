# Google Forms - Ready to Paste

> **Scope note:** This is fallback Google Forms content, not the primary wave-1 operating model. Use it as question-copy reference or emergency fallback only. For the canonical internal ChefFlow launch path, start with `docs/research/current-builder-start-handoff-2026-04-02.md`.

# SURVEY: FOOD OPERATOR SURVEY - WAVE 1

## Form Settings

- **Title:** Food Operator Survey - Wave 1
- **Description:** A short survey for independent food operators. We are learning how real operators handle pricing, workflow, sourcing, and day-to-day operations so we can build something genuinely useful. This takes about 5-7 minutes. Responses are anonymous.
- **Collect email addresses:** Off
- **Require sign-in:** Off
- **Limit to 1 response:** Off
- **Respondent can see response summaries:** Off
- **Respondent can edit after submit:** Off
- **Show progress bar:** On
- **Shuffle question order:** Off
- **Confirmation message:** Thanks. Your input is helping shape a tool for real food operators. If you want early access, interview invites, pilot access, or a summary of the results, use this separate form: [PASTE FOLLOW-UP FORM LINK HERE]

## Live Form Governance Notes

- Create this live form in the final owner Google account from day one.
- Record the owner account, created date, and live version in the launch console.
- After launch, treat the linked Google Sheet as raw response data.
- Do cleaned coding and analysis in a separate sheet or export.
- If a material wording or branching change is needed after launch, create a dated version note instead of silently mutating the live wave.

## Attribution Note

- Keep the `Where did you first see this survey?` question required.
- Where practical, create one pre-filled form link per channel or partner so the attribution value defaults correctly before the respondent starts.

---

## Section 1: Screener

**Section title:** About Your Business
**Section description:** First, tell us what kind of food operation you run.

---

**Question 1**

- Text: What best describes your primary business today?
- Type: Multiple choice
- Required: Yes
- Options:
  - Private chef / personal chef
  - Caterer
  - Meal prep service
  - Bakery or dessert business
  - Food truck / pop-up
  - Restaurant / cafe / storefront food business
  - Other food operator

**Branching rule**

- `Private chef / personal chef` -> Chef / Caterer branch
- `Caterer` -> Chef / Caterer branch
- `Meal prep service` -> Chef / Caterer branch
- `Bakery or dessert business` -> Location-based branch
- `Food truck / pop-up` -> Location-based branch
- `Restaurant / cafe / storefront food business` -> Location-based branch
- `Other food operator` -> Location-based branch

---

## Section 2: Core Questions

**Section title:** Core Questions
**Section description:** These questions go to everyone.

---

**Question 2**

- Text: What state or metro area are you based in?
- Type: Short answer
- Required: Yes

---

**Question 3**

- Text: How long have you been operating?
- Type: Multiple choice
- Required: Yes
- Options:
  - Less than 1 year
  - 1-3 years
  - 3-5 years
  - 5-10 years
  - 10+ years

---

**Question 4**

- Text: How many people regularly help run the business?
- Type: Multiple choice
- Required: Yes
- Options:
  - Just me
  - 2-3 people
  - 4-10 people
  - 11+ people

---

**Question 5**

- Text: Which tools do you currently rely on most? (Pick up to 4)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 4 selections
- Options:
  - Text messages / WhatsApp / iMessage
  - Email
  - Instagram DMs
  - Google Docs / Sheets
  - Notion / Trello / Airtable
  - QuickBooks / FreshBooks / Wave
  - Square / Stripe / Venmo / Zelle
  - HoneyBook / Dubsado / 17hats
  - Pen and paper / notebook
  - POS system
  - Inventory or costing software
  - My own memory
  - Other

---

**Question 6**

- Text: What takes the most time outside the actual food work? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Responding to inquiries and messages
  - Creating quotes or proposals
  - Menu planning
  - Grocery shopping or sourcing
  - Scheduling and calendar management
  - Invoicing and payment follow-up
  - Inventory or purchasing
  - Bookkeeping and expense tracking
  - Marketing and social media
  - Recipe documentation and costing
  - Staff coordination
  - Other

---

**Question 7**

- Text: Do you feel confident you know your true profit or margin on each job, product, or menu?
- Type: Multiple choice
- Required: Yes
- Options:
  - Yes, I track it closely
  - I have a rough idea
  - Not really
  - No, and that is a real problem

---

**Question 8**

- Text: How important would real-time ingredient pricing or food-cost visibility be for you?
- Type: Multiple choice
- Required: Yes
- Options:
  - Critical
  - Very important
  - Somewhat important
  - Not that important
  - Not relevant to how I work

---

**Question 9**

- Text: If one platform handled your most painful workflow well, how interested would you be in trying it?
- Type: Multiple choice
- Required: Yes
- Options:
  - Extremely interested
  - Interested
  - Maybe
  - Probably not
  - Not interested

---

**Question 10**

- Text: What monthly price range feels reasonable if a tool truly saves time or protects margin?
- Type: Multiple choice
- Required: Yes
- Options:
  - Free only
  - $1-$15/month
  - $15-$30/month
  - $30-$50/month
  - $50-$100/month
  - $100+/month if the value is there
  - I would rather pay per transaction

---

**Question 11**

- Text: Where did you first see this survey?
- Type: Multiple choice
- Required: Yes
- Options:
  - Direct email or text
  - Facebook group
  - Instagram
  - LinkedIn
  - Reddit
  - Paid ad
  - Association or newsletter
  - Supplier or vendor
  - Friend / referral
  - Other

---

## Section 3A: Chef / Caterer Branch

**Section title:** Clientflow Questions
**Section description:** These questions are for chefs, caterers, and meal prep operators.

---

**Question 12A**

- Text: Where do most new inquiries come from today? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Word of mouth / referral
  - Instagram DM
  - Email
  - Phone call or text
  - Website inquiry form
  - Marketplace platform
  - Facebook
  - Event planner or venue partner
  - Other

---

**Question 13A**

- Text: How do you currently handle quotes, deposits, or approvals?
- Type: Multiple choice
- Required: Yes
- Options:
  - Mostly by text or email
  - PDF or document workflow
  - HoneyBook / Dubsado / similar tool
  - Invoice tool plus manual follow-up
  - Verbal agreement / informal process
  - Other

---

**Question 14A**

- Text: What part of client communication breaks down most often?
- Type: Multiple choice
- Required: Yes
- Options:
  - Slow response time
  - Messages across too many channels
  - Menu changes and revisions
  - Getting approvals or decisions
  - Deposit or payment follow-up
  - Expectations and scope clarity
  - Other

---

**Question 15A**

- Text: How do you usually handle grocery costs?
- Type: Multiple choice
- Required: Yes
- Options:
  - I include them in my fee
  - Client reimburses me afterward
  - Client gives a budget upfront
  - Client shops themselves
  - It varies by job

---

## Section 3B: Location-Based Branch

**Section title:** Operations Questions
**Section description:** These questions are for restaurants, bakeries, food trucks, pop-ups, and similar operators.

---

**Question 12B**

- Text: How do you currently track ingredient costs?
- Type: Multiple choice
- Required: Yes
- Options:
  - Spreadsheet
  - POS or back-office software
  - Accounting software only
  - Inventory / costing platform
  - Manual checks / memory
  - I do not track this consistently

---

**Question 13B**

- Text: How often do you revisit menu pricing or product pricing?
- Type: Multiple choice
- Required: Yes
- Options:
  - Weekly
  - Monthly
  - Every few months
  - Only when something feels wrong
  - Rarely

---

**Question 14B**

- Text: What is the biggest operational source of margin loss?
- Type: Multiple choice
- Required: Yes
- Options:
  - Ingredient cost increases
  - Waste or spoilage
  - Portion inconsistency
  - Poor pricing visibility
  - Vendor / purchasing issues
  - Labor inefficiency
  - I am not sure
  - Other

---

**Question 15B**

- Text: What part of purchasing, inventory, or pricing feels most manual?
- Type: Multiple choice
- Required: Yes
- Options:
  - Tracking vendor prices
  - Updating recipes or yield assumptions
  - Counting inventory
  - Adjusting menu or product pricing
  - Comparing vendors
  - Matching purchases to sales / usage
  - Other

---

## Section 4: Final Question

**Section title:** Final Thought
**Section description:** Last question.

---

**Question 16**

- Text: If we could solve one painful part of running your food business, what should it be?
- Type: Paragraph
- Required: No

---

End of survey.
