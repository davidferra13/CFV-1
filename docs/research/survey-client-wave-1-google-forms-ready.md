# Google Forms - Ready to Paste

> **Scope note:** This is fallback Google Forms content, not the primary wave-1 operating model. Use it as question-copy reference or emergency fallback only. For the canonical internal ChefFlow launch path, start with `docs/research/current-builder-start-handoff-2026-04-02.md`.

# SURVEY: CLIENT SURVEY - WAVE 1

## Form Settings

- **Title:** Hiring a Private Chef - Quick Experience Survey
- **Description:** A short survey for people who have hired, seriously considered, or are curious about hiring a private chef or similar food service for a personal event. We are learning what makes discovery, booking, pricing, and planning feel easy or difficult. This takes about 4-6 minutes. Responses are anonymous.
- **Collect email addresses:** Off
- **Require sign-in:** Off
- **Limit to 1 response:** Off
- **Respondent can see response summaries:** Off
- **Respondent can edit after submit:** Off
- **Show progress bar:** On
- **Shuffle question order:** Off
- **Confirmation message:** Thanks. Your input is helping us learn what actually makes hiring a chef feel easy and trustworthy. If you want a results summary, interview invite, future pilot or test invite, or product updates, use this separate form: [PASTE FOLLOW-UP FORM LINK HERE]

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

**Section title:** About You
**Section description:** First, tell us where you are coming from.

---

**Question 1**

- Text: Which best describes you today?
- Type: Multiple choice
- Required: Yes
- Options:
  - I have hired a private chef or caterer more than once
  - I have hired one once
  - I have not hired one, but I have seriously considered it
  - I have not hired one, I am mostly curious

**Branching rule**

- `I have hired a private chef or caterer more than once` -> Experienced branch
- `I have hired one once` -> Experienced branch
- `I have not hired one, but I have seriously considered it` -> Consideration branch
- `I have not hired one, I am mostly curious` -> Consideration branch

---

## Section 2: Core Questions

**Section title:** Core Questions
**Section description:** These questions go to everyone.

---

**Question 2**

- Text: What type of event was it or would it most likely be for?
- Type: Multiple choice
- Required: Yes
- Options:
  - Dinner party at home (6-20 guests)
  - Large event or celebration (20+ guests)
  - Weekly meal prep
  - Date night or intimate dinner (2-4 people)
  - Holiday gathering
  - Corporate event
  - Wedding or rehearsal dinner
  - Cooking class or food experience
  - Other

---

**Question 3**

- Text: What state or metro area are you based in?
- Type: Short answer
- Required: Yes

---

**Question 4**

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
  - Planner or venue
  - Newsletter or blog
  - Friend / referral
  - Other

---

## Section 3A: Experienced Branch

**Section title:** Booking Experience
**Section description:** These questions are for people who have actually hired before.

---

**Question 5A**

- Text: How did you find the chef you hired? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Friend or family recommendation
  - Google search
  - Instagram
  - Marketplace platform
  - Yelp or Google Reviews
  - Planner or venue recommendation
  - I already knew them
  - Other

---

**Question 6A**

- Text: What mattered most when choosing? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Recommendation from someone I trust
  - Reviews and ratings
  - Photos of past work
  - Pricing
  - Availability
  - Menu customization
  - Dietary accommodation
  - Professional communication
  - Speed of response
  - Other

---

**Question 7A**

- Text: What part of booking or planning felt most annoying or uncertain?
- Type: Multiple choice
- Required: Yes
- Options:
  - Finding someone trustworthy
  - Waiting for a response
  - Back-and-forth on menu details
  - Understanding what the price included
  - Paying a deposit or balance
  - Sharing event details up front
  - I did not find the process difficult
  - Other

---

**Question 8A**

- Text: If a chef sends a quote, how would you prefer to receive and review it?
- Type: Multiple choice
- Required: Yes
- Options:
  - A clean mobile-friendly document
  - A PDF attached to email
  - A link to an online portal where I can review, accept, and pay
  - A simple text or email with the essentials

---

**Question 9A**

- Text: How comfortable are you paying a deposit through an online portal?
- Type: Multiple choice
- Required: Yes
- Options:
  - Very comfortable
  - Comfortable after a quick call or message exchange
  - Somewhat uncomfortable
  - Not comfortable

---

**Question 10A**

- Text: Which menu approach feels best to you?
- Type: Multiple choice
- Required: Yes
- Options:
  - I want to choose exact dishes
  - I want to share preferences and let the chef propose the menu
  - I want the chef to propose a menu and I will approve it
  - I am happy to trust the chef completely

---

**Question 11A**

- Text: What would most increase the chance you rebook or recommend a chef? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Outstanding food quality
  - Easy planning and communication
  - Fast professional responses
  - Clear pricing and no surprises
  - Great handling of dietary needs
  - Feeling comfortable having them in my home
  - A memorable overall experience
  - Other

---

## Section 3B: Consideration Branch

**Section title:** Booking Expectations
**Section description:** These questions are for people who have not booked yet.

---

**Question 5B**

- Text: How would you most likely try to find a chef? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Friend or family recommendation
  - Google search
  - Instagram
  - Marketplace platform
  - Yelp or Google Reviews
  - Planner or venue recommendation
  - Local Facebook or neighborhood groups
  - Other

---

**Question 6B**

- Text: What would matter most when deciding whom to trust? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Recommendation from someone I trust
  - Reviews and ratings
  - Photos of past work
  - Clear pricing
  - Availability for my date
  - Dietary accommodation
  - Professional communication
  - A phone call before booking
  - Other

---

**Question 7B**

- Text: What has stopped you from booking so far? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - It feels too expensive
  - I do not know how to find the right person
  - The process seems complicated
  - I am not sure what to expect
  - I am not comfortable with a stranger in my home
  - Timing or occasion has not been right yet
  - Nothing specific, I just have not done it yet
  - Other

---

**Question 8B**

- Text: When first reaching out, how much information feels reasonable to share up front?
- Type: Multiple choice
- Required: Yes
- Options:
  - Just basic interest and the date
  - Date, guest count, and occasion
  - Date, guest count, budget, and dietary info
  - I am fine with a detailed form if the questions feel relevant
  - I would rather talk before filling out much

---

**Question 9B**

- Text: If a chef sends a quote, how would you prefer to receive and review it?
- Type: Multiple choice
- Required: Yes
- Options:
  - A clean mobile-friendly document
  - A PDF attached to email
  - A link to an online portal where I can review, accept, and pay
  - A simple text or email with the essentials

---

**Question 10B**

- Text: How comfortable are you paying a deposit through an online portal?
- Type: Multiple choice
- Required: Yes
- Options:
  - Very comfortable
  - Comfortable after a quick call or message exchange
  - Somewhat uncomfortable
  - Not comfortable

---

**Question 11B**

- Text: Which menu approach feels best to you?
- Type: Multiple choice
- Required: Yes
- Options:
  - I want to choose exact dishes
  - I want to share preferences and let the chef propose the menu
  - I want the chef to propose a menu and I will approve it
  - I am happy to trust the chef completely

---

**Question 12B**

- Text: What would most increase your trust enough to book? (Pick up to 2)
- Type: Checkboxes
- Required: Yes
- Validation: Maximum 2 selections
- Options:
  - Recommendation from someone I trust
  - Strong reviews
  - Photos or sample menus
  - Clear pricing and what is included
  - Fast professional response
  - Easy booking process
  - A quick phone call before paying
  - Other

---

## Section 4: Final Question

**Section title:** Final Thought
**Section description:** Last question.

---

**Question 13**

- Text: If one thing made hiring a chef feel easier, what would it be?
- Type: Paragraph
- Required: No

---

End of survey.
