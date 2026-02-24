# Marketing & Social Pages -- Element-by-Element UI Audit

## MARKETING PAGES

---

### 1. `/marketing` -- Marketing Hub

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\page.tsx`
**Page title:** "Marketing -- ChefFlow"

#### Header Section

- **H1:** "Marketing"
- **Subtitle text:** "Reach clients by email, SMS, or personal note -- in bulk or one-by-one."
- **Link:** Label "Sequences", navigates to `/marketing/sequences`, rendered as `<Button variant="ghost" size="sm">`
- **Link:** Label "Templates", navigates to `/marketing/templates`, rendered as `<Button variant="ghost" size="sm">`

#### Summary Stats (conditional: shown when `campaigns.length > 0`)

Three stat cards in a 3-column grid:

- **Stat card 1:** Value = total campaign count, label "Campaigns"
- **Stat card 2:** Value = total emails sent (sum of `recipient_count` across sent campaigns), label "Emails sent"
- **Stat card 3:** Value = scheduled campaign count, label "Scheduled"

#### Campaign List (conditional: shown when `campaigns.length > 0`)

- **Section heading:** "Campaigns" (uppercase, small text)
- **For each campaign -- a clickable card link** to `/marketing/${c.id}`:
  - **Data: Campaign name** (bold, truncated)
  - **Badge:** Campaign type label (from `CAMPAIGN_TYPE_LABELS` -- options: "Re-Engagement", "Seasonal", "Announcement", "Thank You", "Promotion", "Push Dinner", "Other"), variant `default`
  - **Badge:** Status (Draft/Scheduled/Sending.../Sent/Cancelled), variant varies (`default`/`warning`/`success`)
  - **Data: Subject line** (truncated, secondary text)
  - **Conditional data: "Sent {date}"** -- shown when `c.sent_at` exists, formatted as "MMM d, yyyy"
  - **Conditional data: "{count} recipients"** -- shown when `c.recipient_count` is not null
  - **Conditional data: "Scheduled for {date time}"** -- shown when `c.scheduled_at` and status is `scheduled`, formatted as "MMM d, h:mm a"
  - **Arrow icon** ">" (decorative)

#### Empty State (conditional: shown when `campaigns.length === 0`)

- **Text:** "No campaigns yet. Create your first below."

#### New Campaign Section

- **Section heading:** "New Campaign"
- Contains `<CampaignBuilderClient />` (detailed below)

#### AI Testimonial Section

- Contains `<TestimonialPanel />` (detailed below)

---

### 1a. CampaignBuilderClient (embedded in `/marketing`)

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\campaign-builder-client.tsx`

This is a **3-step wizard** (compose -> preview -> sent).

#### COMPOSE STEP (`step === 'compose'`)

**Template Picker (conditional: shown when templates exist and finished loading):**

- **Label:** "Start from a template (optional)"
- **Grid of template buttons** (up to 6 shown), each is a `<button type="button">`:
  - Displays template name (bold) and subject line
  - Clicking applies the template's `campaign_type`, `subject`, and `body_html` to the form

**Form fields (inside a `<form>`):**

1. **Campaign name** -- `<Input>`, text, required, placeholder "Spring re-engagement 2026", label "Campaign name \*"
2. **Type** -- `<select>`, label "Type", options from `CAMPAIGN_TYPE_LABELS`:
   - Re-Engagement (default)
   - Seasonal
   - Announcement
   - Thank You
   - Promotion
   - Push Dinner
   - Other
3. **Audience** -- `<select>`, label "Audience", options from `SEGMENT_OPTIONS` (excluding `client_ids`):
   - All subscribed clients
   - Clients with no bookings in 90+ days (default)
   - VIP clients
   - Clients with a birthday in the next 30 days
   - Clients whose last event was 30-60 days ago
   - High-value clients (lifetime spend >= $1,500)
   - Clients who have never booked an event
4. **Subject** -- `<Input>`, text, required, placeholder "Spring is here -- let's plan your next dinner", label "Subject \*"
5. **Message body** -- `<textarea>`, monospace font, required, min-height 160px, resizable, placeholder "Hi {{first_name}},\n\nWrite your message here. Plain text is perfect.\n\n{{chef_name}}", label "Message body \*"
   - **Token toolbar** above the textarea -- row of buttons that insert merge tokens at cursor position:
     - `{{first_name}}` -- label "First Name"
     - `{{last_name}}` -- label "Last Name"
     - `{{full_name}}` -- label "Full Name"
     - `{{chef_name}}` -- label "Chef Name"
     - `{{last_event_date}}` -- label "Last Event Date"
   - **Helper text below:** "Use tokens like `{{first_name}}` -- they get replaced with each client's real name before sending."

**Schedule Toggle:**

- **Toggle link:** `<button type="button">` -- text toggles between "+ Schedule for a future date" and "Send immediately (remove schedule)"
- **Conditional: datetime-local input** -- `<Input type="datetime-local">`, shown when schedule is toggled on

**Error display (conditional):** Red text showing error message

**Submit button:** `<Button type="submit">` -- label "Preview & audience split -->" (or "Saving..." while loading), disabled when saving

#### PREVIEW STEP (`step === 'preview'`)

**Message preview card:**

- **Data: Campaign name** (bold)
- **Data: Subject line**
- **Data: Body content** (in a white box, scrollable, max 40 lines)

**Channel breakdown card:**

- **Section heading:** "Channel breakdown"
- Each channel row is conditional on count > 0:
  - **Email row:** Icon "envelope", count, text "{N} clients will receive this by email automatically" (blue)
  - **SMS row:** Icon "chat", count, text "{N} prefer text -- see SMS queue below" (emerald), plus:
    - Draft SMS preview (first 160 chars of body)
    - List of client names
  - **Call row:** Icon "phone", count, text "{N} prefer phone calls -- call list:" (amber), plus:
    - List of names with phone numbers
  - **Instagram row:** Icon "camera", count, text "{N} prefer Instagram -- DM copy ready:" (purple), plus:
    - Draft DM preview (first 300 chars of body)
    - List of client names
  - **No-method row:** Icon "--", count, text "{N} no preference set -> defaulting to email" (gray)
  - **Empty state:** "No clients match this segment." (amber text, shown when all counts are 0)

**Buttons:**

- **Send button (conditional: not scheduled):** `<Button>` -- label "Send to {N} clients by email" (or "Sending..."), disabled when saving or `emailCount === 0`. Triggers `confirm()` dialog: "Send to {N} clients by email now?"
- **Schedule button (conditional: scheduled):** `<Button>` -- label "Schedule for {datetime}" (or "Scheduling...")
- **Edit button:** `<Button variant="ghost" size="sm">` -- label "<- Edit", returns to compose step

**Helper text (conditional: non-email channels exist):** "Non-email clients require manual outreach -- their preferred channels are shown above."

#### SENT STEP (`step === 'sent'`)

- **Text:** "Campaign sent!"
- **Text:** "Your emails are on their way."
- **Button:** `<Button variant="secondary" size="sm">` -- label "Create another", resets the form

---

### 1b. TestimonialPanel (embedded in `/marketing`)

**File:** `c:\Users\david\Documents\CFv1\components\ai\testimonial-panel.tsx`

#### Initial State (no results loaded)

- **Icon:** Quote icon (brand-600)
- **Label:** "Testimonial Highlights"
- **Badge:** "Auto" (variant `info`)
- **Button:** `<Button variant="secondary">` -- label "Find Best Quotes" (or "Scanning..." with spinner while loading). Calls `selectTestimonialHighlights()`.
- **Helper text:** "Finds the strongest client quotes from your AARs and surveys for portfolio use."

#### Results State

- **Icon:** Quote icon
- **Label:** "Testimonial Highlights"
- **Badge:** "{N} ready" (variant `success`)
- **Badge (conditional):** "{N} need editing" (variant `warning`) -- shown when `needsEditing.length > 0`
- **Button:** `<Button variant="ghost">` -- label "Refresh" (or spinner while loading)
- **Summary text:** Auto-generated summary string

**Portfolio Ready section (conditional: `portfolioReady.length > 0`):**

- **Section heading:** "Portfolio Ready"
- **For each testimonial:**
  - **Blockquote:** The quote text (italic)
  - **Copy button:** `<Button variant="ghost">` -- copies quote to clipboard, shows "Testimonial copied" toast
  - **Metadata row:** Client initial + event type, star icon with score, best platform label
  - **Explanation:** Why this quote was selected (green text)

**Needs Editing section (conditional: `needsEditing.length > 0`):**

- **Section heading:** "Needs Minor Editing"
- **For each testimonial:**
  - **Blockquote:** The quote text (italic)
  - **Metadata row:** Client initial + event type, star icon with score

**Footer text:** "Auto draft - Get client permission before publishing testimonials publicly"

---

### 2. `/marketing/[id]` -- Campaign Detail & Analytics

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\[id]\page.tsx`
**Page title:** "Campaign Details -- ChefFlow"

#### Header

- **Back link:** "<- Campaigns" linking to `/marketing`
- **H1:** Campaign name (dynamic)
- **Badge:** Campaign type (variant `default`)
- **Badge:** Status (Draft/Scheduled/Sending.../Sent/Cancelled), variant varies
- **Conditional text:** "Sent {date}" formatted "MMM d, yyyy"
- **Save as Template button (conditional: shown when `status === 'sent'`):** see SaveTemplateButton below

#### Stats Row (conditional: `isSent === true`) -- 4-column grid

- **StatCard "Sent":** value = `stats.sent`, denominator = `stats.total`
- **StatCard "Opened":** value = `stats.opened`, denominator = `stats.sent`, suffix = "{open_rate}%"
- **StatCard "Clicked":** value = `stats.clicked`, denominator = `stats.sent`, suffix = "{click_rate}%"
- **StatCard "Unsubscribed":** value = `stats.unsubscribed`, denominator = `stats.sent`

Each StatCard shows:

- Label text (uppercase, small)
- Large value or percentage
- Computed percentage (if no suffix provided and total > 0)

#### Revenue Attribution Card (conditional: `isSent === true`)

- **Data: Booking count** -- large bold number
- **Data: Text** -- "{N} client booked / clients booked within 30 days"
- **Conditional data: Revenue** -- "${amount} in attributed revenue" (when `revenue_cents > 0`)

#### Message Preview Card

- **Header:** "Message"
- **Subject line:** Label "Subject", value is campaign subject
- **Body preview:** `<pre>` block, whitespace-preserving, max-height 48 with scroll, shows `campaign.body_html`

#### Recipients Card (conditional: `recipients.length > 0`)

- **Header:** "Recipients ({count})"
- **For each recipient (list, divided by lines):**
  - **Data: Email address**
  - **Conditional: Error message** (red text, shown when `r.error_message` exists)
  - **Status indicators (rightmost column), each conditional:**
    - "Opened" (emerald text) -- when `r.opened_at`
    - "Clicked" (blue text) -- when `r.clicked_at`
    - "Unsubscribed" (gray text) -- when `r.unsubscribed_at`
    - "Delivered" (default text) -- when `r.sent_at` and no error and no open
    - "Failed" (red text) -- when `r.error_message`

#### Draft Prompt (conditional: status is `draft`)

- **Text:** "This campaign is a draft." with link "Go to Campaigns" to `/marketing`

---

### 2a. SaveTemplateButton (in `/marketing/[id]`)

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\[id]\save-template-button.tsx`

**Three states:**

1. **Saved state:** Shows text "Saved as template" (emerald)
2. **Collapsed state (default):** `<Button variant="secondary" size="sm">` -- label "Save as template"
3. **Expanded state (open):**
   - **Text input:** `<Input>` pre-filled with campaign name, placeholder "Template name"
   - **Save button:** `<Button size="sm">` -- label "Save" (or "Saving..."), disabled when saving or name is empty
   - **Cancel button:** `<Button variant="ghost" size="sm">` -- label "Cancel"

---

### 3. `/marketing/sequences` -- Automated Sequences

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\sequences\page.tsx`
**Page title:** "Sequences -- ChefFlow"

#### Header

- **Back link:** "<- Marketing" linking to `/marketing`
- **H1:** "Automated Sequences"
- **Subtitle:** "Set-and-forget emails that fire automatically based on triggers."

#### Explainer Card

- **Heading:** "How sequences work"
- **Body:** Explanation of trigger-based sequences, enrollment, and unsubscribe skipping

#### Existing Sequences List (conditional: `sequences.length > 0`)

**For each sequence -- a Card:**

- **Data: Sequence name** (bold)
- **Badge:** Active/Paused status (variant `success` for active, `default` for paused)
- **Badge:** Trigger type label (variant `default`), options:
  - Birthday
  - Re-engagement (90-day dormant)
  - Post-event follow-up
  - Seasonal
- **Data: Trigger description** (small text)
- **Data: "{N} steps"** and conditional **"{N} clients enrolled"**
- **Step summary (conditional: steps exist):** For each step, shows "Step {N} Day +{delay}: {subject}"
- **Toggle button:** `<SequenceToggleButton>` -- label "Pause" (if active) or "Activate" (if paused), see below

#### Empty State (conditional: `sequences.length === 0`)

- **Text:** "No sequences yet. Create your first below."

#### Create Sequence Card

- **Card heading:** "Create Sequence"
- Contains `<SequenceBuilderClient />` (detailed below)

---

### 3a. SequenceToggleButton

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\sequences\sequence-toggle-button.tsx`

- **Button:** `<Button>` -- variant `ghost` when active, `secondary` when paused, size `sm`
  - Label: "Pause" (when active) / "Activate" (when paused) / "..." (when loading)
  - Action: Calls `toggleSequence(sequenceId, !isActive)` then refreshes the page

---

### 3b. SequenceBuilderClient

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\sequences\sequence-builder-client.tsx`

**Form fields (`<form>`):**

1. **Sequence name** -- `<Input>`, text, required, placeholder "Birthday greetings", label "Sequence name \*"
2. **Trigger** -- `<select>`, label "Trigger", options:
   - Birthday -- fires N days before client birthday (default)
   - Re-engagement -- fires when client hits 90 days dormant
   - Post-event -- fires N days after event completes
3. **Days before birthday (conditional: `triggerType === 'birthday'`)** -- `<Input type="number">`, min 1, max 30, default 7, label "Days before birthday"

**Email Steps section:**

- **Heading:** "Email steps"
- **Token reference:** Shows available tokens list

**For each step (repeatable, minimum 1):**

- **Step header:** "Step {N}"
- **Remove button (conditional: more than 1 step):** `<button>` -- label "Remove" (red text)
- **Delay field** -- `<Input type="number">`, min 0, label "Delay from trigger (days)" for step 1 or "Delay from previous (days)" for subsequent steps
- **Subject field** -- `<Input>`, text, required, placeholder "Happy birthday, {{first_name}}!", label "Subject \*"
- **Body field** -- `<textarea>`, monospace, required, min-height 100px, resizable, placeholder "Hi {{first_name}},\n\nWrite your message here.\n\n{{chef_name}}", label "Body \*"

**Add step link:** `<button type="button">` -- label "+ Add another step"

**Error display (conditional):** Red text

**Submit button:** `<Button type="submit">` -- label "Create sequence" (or "Creating..."), disabled when saving or name is empty

---

### 4. `/marketing/templates` -- Template Library

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\templates\page.tsx`
**Page title:** "Templates -- ChefFlow"

#### Header

- **Back link:** "<- Marketing" linking to `/marketing`
- **H1:** "Template Library"
- **Subtitle:** "Pre-built starters and your own saved templates. Pick one in the campaign builder to pre-fill the form."

#### Starter Templates Section (conditional: `systemTemplates.length > 0`)

- **Section heading:** "Starter Templates"
- **For each system template -- a Card:**
  - **Data: Template name** (bold)
  - **Badge:** Campaign type (variant `default`)
  - **Badge:** "Starter" (variant `info`)
  - **Data: Subject line** (truncated)
  - **Data: Body preview** (first 200 chars with ellipsis)

#### Your Templates Section (conditional: `ownTemplates.length > 0`)

- **Section heading:** "Your Templates"
- **For each user template -- a Card:**
  - **Data: Template name** (bold)
  - **Badge:** Campaign type (variant `default`)
  - **Data: Subject line** (truncated)
  - **Data: Body preview** (first 200 chars with ellipsis)
  - **Delete button:** `<TemplateActionsClient>` -- see below

#### Empty State for User Templates (conditional: `ownTemplates.length === 0`)

- **Text:** "No custom templates yet. You can save any sent campaign as a template from its detail page."

#### Create Template Card

- **Card heading:** "Create Template"
- Contains `<CreateTemplateClient />` (detailed below)

---

### 4a. TemplateActionsClient

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\templates\template-actions-client.tsx`

- **Button:** `<Button variant="ghost" size="sm">` -- label "Delete" (or "..." while loading), gray text that turns red on hover
  - Action: Shows `confirm()` dialog "Delete this template? This cannot be undone." then calls `deleteCampaignTemplate(templateId)` and refreshes

---

### 4b. CreateTemplateClient

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\templates\create-template-client.tsx`

**Form fields (`<form>`):**

1. **Template name** -- `<Input>`, text, required, placeholder "My re-engagement", label "Template name \*"
2. **Type** -- `<select>`, label "Type", options from `CAMPAIGN_TYPE_LABELS` (same as campaign builder: Re-Engagement, Seasonal, Announcement, Thank You, Promotion, Push Dinner, Other)
3. **Subject** -- `<Input>`, text, required, placeholder "Hi {{first_name}}, it's been a while", label "Subject \*"
4. **Body** -- `<textarea>`, monospace, required, min-height 120px, resizable, placeholder "Hi {{first_name}},\n\nYour message here.\n\n{{chef_name}}", label "Body \*"

**Error display (conditional):** Red text

**Submit button:** `<Button type="submit">` -- label "Save template" (or "Saving..."), disabled when saving or name is empty

---

### 5. `/marketing/push-dinners` -- Push Dinners List

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\push-dinners\page.tsx`
**Page title:** (inherits from layout)

#### Header

- **H1:** "Push Dinners"
- **Subtitle:** "Create a dinner concept, invite clients personally, fill your calendar on your terms."
- **Button:** `<Button variant="primary">` with Plus icon -- label "New push dinner", links to `/marketing/push-dinners/new`

#### Empty State (conditional: `campaigns.length === 0`)

- **Icon:** Utensils icon (stone-300)
- **Heading:** "Push your first dinner"
- **Text:** "Create a themed dinner -- Halloween, Valentine's Day, anything -- and invite past clients with personalised messages. Get a shareable booking link to fill your seats."
- **Button:** `<Button variant="primary">` with Plus icon -- label "Create push dinner", links to `/marketing/push-dinners/new`

#### Campaign List (conditional: `campaigns.length > 0`)

**For each campaign -- a clickable card link** to `/marketing/push-dinners/${campaign.id}`:

- **Data: Campaign name** (bold, truncated)
- **Badge:** Status (Draft/Sending/Sent/Scheduled/Cancelled) with color variants
- **Badge (conditional):** "Full" (variant `success`) -- shown when `seats_booked >= seats_available`
- **Data row:** Date (formatted "EEE, MMM d, yyyy"), price per person ("$N/person"), occasion
- **Seat capacity bar (conditional: `seats_available` exists):**
  - Green progress bar showing `seats_booked / seats_available`
  - Text label: "{booked}/{available} seats"
- **Arrow icon** (right chevron, animated on hover)

---

### 6. `/marketing/push-dinners/new` -- New Push Dinner

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\push-dinners\new\page.tsx`

#### Header

- **Back link:** "<- Push Dinners" linking to `/marketing/push-dinners`
- **H1:** "Create a push dinner"
- **Subtitle:** "Build the concept, pick who to invite, review auto-drafted personal messages, then choose how to share it."

Contains `<PushDinnerBuilder />` -- a **5-step wizard** (detailed below).

---

### 6a. PushDinnerBuilder (5-Step Wizard)

**File:** `c:\Users\david\Documents\CFv1\components\campaigns\push-dinner-builder.tsx`

#### Step Tracker (always visible)

- Horizontal step indicator with 5 pill buttons:
  1. "The Dinner"
  2. "Menu"
  3. "Who to Invite"
  4. "Drafts"
  5. "Launch"
- Current step highlighted (brand-600 bg), completed steps (green bg with checkmark, clickable to go back), future steps (gray, disabled)

#### STEP 1: The Dinner

- **H2:** "What dinner do you want to push?"
- **Subtitle:** "Build the concept. We'll write the pitch."

**Form elements:**

1. **Occasion** -- label "Occasion", rendered as **pill buttons** (21 options):
   - Halloween, Valentine's Day, Thanksgiving, Christmas Eve, Christmas, New Year's Eve, New Year's Day, Mother's Day, Father's Day, Easter, Passover, Birthday, Anniversary, Date Night, Engagement, Baby Shower, Graduation, Corporate Dinner, Wine Pairing, Tasting Menu, Weekend Brunch, Custom
   - Active pill has brand-600 styling
   - **Custom occasion text input (conditional: `occasion === 'Custom'`):** `<input type="text">`, placeholder "Describe your occasion..."

2. **Date** -- `<input type="date">`, label "Date", with Calendar icon
3. **Start time** -- `<input type="time">`, label "Start time"
4. **Max guests** -- `<input type="number">`, min 1, max 50, default 12, label "Max guests", with Users icon
5. **Price per person** -- `<input type="number">`, min 0, placeholder "150", label "Price per person", with DollarSign icon

**AI Concept Draft section:**

- **Icon:** Sparkles (brand-600)
- **Label:** "Dinner Pitch"
- **Badge:** "Auto" (variant `info`) or "Draft" (variant `warning`)
- **Auto Draft button (conditional: no concept yet):** `<Button variant="secondary">` with Sparkles icon -- label "Auto Draft" (or "Drafting..." with spinner), disabled when no occasion or loading
- **Reset button (conditional: concept exists):** `<Button variant="ghost">` -- label "Reset", clears concept
- **Editable textarea (conditional: concept exists):** `<textarea>`, 5 rows, prefilled with AI-generated hook + description + CTA
- **Placeholder text (conditional: no concept):** "Select an occasion above, then click Auto Draft..."

6. **Campaign name** -- `<input type="text">`, label "Campaign name (optional -- auto-named from occasion)", placeholder shows auto-generated name

**Next button:** `<Button variant="primary">` -- label "Next -- Choose a Menu" (or "Saving..." with spinner), disabled when no occasion or no date, full width

#### STEP 2: Menu

- **H2:** "Attach a menu"
- **Subtitle:** "Clients will see course names (not costs) on the booking page. Optional -- skip if you prefer to describe it yourself."
- **Placeholder card:** Utensils icon, text "Menu picker coming soon." and "For now your dinner description will serve as the menu preview."
- **Back button:** `<Button variant="ghost">` -- "<- Back"
- **Next button:** `<Button variant="primary">` -- "Next -- Who to Invite"

#### STEP 3: Who to Invite

- **H2:** "Who should get invited?"
- **Subtitle:** "Pick a segment or handpick individual clients. Only subscribed clients are shown."

**Segment buttons** (6 options, full-width, radio-style selection):

1. "Past clients who booked {occasion}" (key: `occasion`)
2. "VIP clients" (key: `vip`)
3. "Clients I haven't seen in 3+ months" (key: `dormant`)
4. "Clients who booked in this season (past years)" (key: `seasonal`)
5. "All subscribed clients" (key: `all`)
6. "Handpick clients" (key: `handpick`)

**Handpick search (conditional: `segment === 'handpick'`):**

- **Search input:** `<input type="text">`, placeholder "Search by name or email..."
- **Search results list** (conditional: results exist): Scrollable list with checkbox toggle per client:
  - Checkbox (brand-colored when selected), client full name, email (right-aligned)

**Client list result (conditional: non-handpick segment, clients loaded):**

- Scrollable list of clients, each with:
  - Checkbox (pre-selected, brand-colored), client full name, last event occasion (if available)
  - Clicking toggles selection

**Loading spinner** shown while loading segments

**Open Slots panel:**

- **Expandable button:** Calendar icon, text "Your open weekends near this date", Badge "Fill my schedule" (variant `info`), chevron
- **Slot pills (conditional: expanded and slots exist):** Up to 12 date pill buttons showing "DayOfWeek Date", clicking sets the proposed date

**Selected count display (conditional):** "{N} clients selected"

- **Back button:** `<Button variant="ghost">` -- "<- Back"
- **Next button:** `<Button variant="primary">` -- "Next -- Review {N} Drafts" (or "Next (no recipients)" if none selected, or "Saving..." with spinner)

#### STEP 4: Review Drafts

- **H2:** "Review personalised drafts"
- **Subtitle:** "Drafts a unique message for each client based on your history together. You approve -- nothing sends without your OK."

**Ollama offline warning (conditional: `ollamaOffline === true`):**

- Alert box with AlertCircle icon
- **Heading:** "Ollama is not running"
- **Text:** "Start Ollama to generate personalised drafts. Or write each message manually below -- click Edit on any card."

**Control buttons:**

- **Generate All Drafts button:** `<Button variant="secondary">` with Sparkles icon -- label "Generate All Drafts" (or "Generating..." with spinner)
- **Approve All button (conditional: unapproved drafts with body exist):** `<Button variant="secondary">` with Check icon -- label "Approve All"
- **Approved count badge (conditional):** Badge "{N} approved" (variant `success`)

**Empty state (conditional: no recipients and not loading):**

- Text: 'Click "Generate All Drafts" to start.'
- Text: "Or load existing recipients."
- **Load recipients button:** `<Button variant="ghost">` -- label "Load recipients"

**Draft cards** -- one `<DraftReviewCard>` per recipient (detailed below)

- **Back button:** `<Button variant="ghost">` -- "<- Back"
- **Next button:** `<Button variant="primary">` -- "Next -- Launch"

#### STEP 5: Launch

**Pre-launch state:**

- **H2:** "How do you want to share this dinner?"
- **Subtitle:** "Choose one or more. You control how visible and how loud this invitation is."

**Delivery mode cards** (3 options, multi-select checkboxes):

1. **Personal email** (key: `email`, default selected):
   - Checkbox, Mail icon
   - Title: "Personal email"
   - Description: "Sends each approved draft directly to the client's inbox. {N} approved." or "You approved the drafts in step 4."

2. **Client portal banner** (key: `portal_banner`):
   - Checkbox, Bell icon
   - Title: "Client portal banner"
   - Description: "A quiet banner appears on each client's ChefFlow dashboard next time they log in. Non-invasive -- they discover it on their own time. No email."
   - Badge: "Low-key" (variant `info`)

3. **Shareable link only** (key: `link_only`):
   - Checkbox, Link2 icon
   - Title: "Shareable link only"
   - Description: "You get a link + QR code to share however you want -- Instagram story, text, DM. You control who sees it."
   - Badge: "Organic" (variant `info`)

**Booking link preview card:**

- **Label:** "Your booking link"
- **Data:** URL preview (monospace), shows "{origin}/book/[generates on launch]"
- **Helper text:** "Clients tap this -> see the dinner concept -> click 'Count me in' -> done. No login required."

**Validation (conditional: no delivery modes selected):** "Select at least one delivery method above." (amber text)

- **Back button:** `<Button variant="ghost">` -- "<- Back"
- **Launch button:** `<Button variant="primary">` -- "Launch dinner push" (or "Launching..." with spinner), disabled when launching or no delivery modes

**Post-launch success state:**

- **Green checkmark circle**
- **H2:** "Dinner is live!"
- **Conditional stats:** "{N} emails sent" + optional " - {N} failed"
- **Conditional text:** "Shareable link is active." (when email not selected)
- **Button:** `<Button variant="primary">` -- "View campaign dashboard", navigates to `/marketing/push-dinners/{id}`

---

### 6b. DraftReviewCard (used in Step 4)

**File:** `c:\Users\david\Documents\CFv1\components\campaigns\draft-review-card.tsx`

**Each card represents one recipient:**

**Header row:**

- **Avatar circle:** Initials (from name or email), brand-100 bg
- **Data: Display name** (name or email, truncated)
- **Badge (conditional: approved):** "Approved" (variant `success`)
- **Badge (conditional: no draft and not approved):** "No draft yet" (variant `warning`)
- **Subject preview (conditional: has draft, not editing, not approved):** truncated subject line
- **Expand/collapse button (conditional: has draft):** ChevronDown/ChevronUp icon

**Draft content (conditional: has draft AND (expanded OR editing)):**

_View mode:_

- **Subject card:** Label "Subject", value
- **Message card:** Label "Message", whitespace-preserved body text

_Edit mode:_

- **Subject input:** `<input type="text">`, label "Subject", prefilled with draft subject
- **Message textarea:** `<textarea>`, 6 rows, label "Message", prefilled with draft body

**Action buttons (conditional: not approved):**

_Non-editing mode:_

- **Approve button (conditional: has draft):** `<Button variant="primary">` with Check icon -- label "Approve" (or spinner)
- **Edit button (conditional: has draft):** `<Button variant="secondary">` with Pencil icon -- label "Edit"
- **Skip button:** `<Button variant="ghost">` with X icon -- label "Skip" (gray, red on hover)

_Editing mode:_

- **Save edits button:** `<Button variant="primary">` -- label "Save edits" (or spinner)
- **Cancel button:** `<Button variant="ghost">` -- label "Cancel"

**Approved confirmation (conditional: approved):**

- Check icon + text "Will be sent when you launch"

---

### 7. `/marketing/push-dinners/[id]` -- Push Dinner Detail

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\marketing\push-dinners\[id]\page.tsx`

#### Header

- **Back link:** "<- Push Dinners" linking to `/marketing/push-dinners`
- **H1:** Campaign name (dynamic)
- **Badge:** Status (Draft/Sending/Sent/Scheduled/Cancelled)
- **Data row:** Calendar icon + date (formatted "EEEE, MMMM d, yyyy"), price per person, occasion

#### Seat Capacity Bar (conditional: `seats_available` exists)

- **Label:** "Seat capacity"
- **Data:** "{booked}/{available} booked"
- **Progress bar:** Green, percentage fill

#### Stats Grid (4 columns)

- **Invited:** `stats.total_recipients`, Users icon
- **Approved:** `stats.drafts_approved`, CheckCircle icon
- **Sent:** `stats.sent`, Mail icon
- **Booked:** `stats.booked`, CheckCircle icon

#### Shareable Booking Link Card (conditional: `bookingUrl` exists)

- **Label:** "Shareable booking link"
- **Data:** URL in monospace code block (truncated)
- **Copy button:** `<Button variant="ghost">` (icon-only, Copy icon), title "Copy link"
- **Open link button:** `<a>` wrapping `<Button variant="ghost">` (icon-only, ExternalLink icon), title "Open booking page", opens in new tab
- **Helper text:** "Share this link anywhere -- Instagram story, text, DM. Clients tap it, see the dinner, and book in under 30 seconds. No account required."

#### Dinner Concept Card (conditional: `concept_description` exists)

- **Label:** "Dinner concept"
- **Data:** Whitespace-preserved description text

#### Recipients List

- **Header:** "Recipients ({count})"
- **Empty state:** "No recipients yet. Go back to edit and add clients."
- **For each recipient (divided list):**
  - **Data: Email address**
  - **Conditional: Draft subject** (truncated)
  - **Badge:** Status label with variant:
    - "Booked" (success) -- when `converted_to_inquiry_id` exists
    - "Responded" (info) -- when `responded_at` exists
    - "Sent" (info) -- when `sent_at` exists
    - "Approved" (success) -- when `chef_approved`
    - "Draft ready" (warning) -- when `draft_body` exists
    - "No draft" (default) -- otherwise

---

## SOCIAL PAGES

All social pages share a common layout.

### Social Layout (wraps all `/social/*` pages)

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\layout.tsx`

- **H1:** "Content Planner"
- **Subtitle:** "Build your year of content once -- ChefFlow posts it automatically on every platform."
- **Tab navigation** (`<SocialLayoutTabs />`):
  - **Planner** -- Calendar icon, links to `/social/planner`, active when pathname starts with `/social/planner`
  - **Media Vault** -- Image icon, links to `/social/vault`, active when pathname starts with `/social/vault`
  - **Connections** -- Link2 icon, links to `/social/connections`, active when pathname starts with `/social/connections`
  - **Settings** -- Settings icon, links to `/social/settings`, active when pathname starts with `/social/settings`

---

### 8. `/social` -- Root (Redirect)

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\page.tsx`

- Immediately **redirects** to `/social/planner`. No UI elements.

---

### 9. `/social/planner` -- Annual Content Calendar

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\planner\page.tsx`

#### Queue Summary Bar (`<SocialQueueSummaryBar />`)

7 stat cards in a row (4-col on mobile, 7-col on desktop):

- **Total Posts** -- stone-700 color
- **Ideas** -- stone-500
- **Drafts** -- amber-600
- **Approved** -- sky-600
- **Queued** -- violet-600
- **Published** -- emerald-600
- **Next 30 Days** -- brand-600

#### Calendar Header

- **H2:** "{year} Content Calendar"
- **Data text:** "{N} posts - {N}/week"
- **Link:** `<Button variant="secondary" size="sm">` -- label "Settings", links to `/social/settings`

#### Empty State (conditional: `totalPosts === 0`)

- **Emoji:** Calendar
- **H3:** "No posts generated yet"
- **Text:** "Head to Settings to configure your posting schedule, then generate your annual content calendar."
- **Button:** `<Button variant="primary">` -- label "Set Up Schedule", links to `/social/settings`

#### Annual Calendar Grid (`<SocialAnnualCalendar />`) (conditional: posts exist)

12 month cells in a responsive grid (2-col / 3-col / 4-col).

**Each month cell (`<SocialMonthCell />`) -- clickable Link to `/social/planner/{month}`:**

- **Month name** (abbreviated, e.g. "Jan")
- **Post count:** "{N} posts"
- **Progress bar:** Green fill representing percentage of posts that are published + queued + approved
- **Status mini-pills (each conditional on count > 0):**
  - "{N} done" (emerald)
  - "{N} queued" (violet)
  - "{N} approved" (sky)
  - "{N} drafts" (amber)
  - "{N} ideas" (stone)
- **Empty month text (conditional: no posts):** "No posts planned"

---

### 10. `/social/planner/[month]` -- Monthly View

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\planner\[month]\page.tsx`

#### Navigation Header

- **Back button:** `<Button variant="ghost" size="sm">` -- "<- Year View", links to `/social/planner`
- **H2:** "{Month Name} {Year}" (e.g. "February 2026")
- **Data:** "{N} posts this month"
- **Previous month button (conditional: not January):** `<Button variant="ghost" size="sm">` -- "<- {PrevMonthName}", links to `/social/planner/{prevMonth}`
- **Next month button (conditional: not December):** `<Button variant="ghost" size="sm">` -- "{NextMonthName} ->", links to `/social/planner/{nextMonth}`

#### Month Grid (`<SocialMonthGrid />`)

**Summary bar:**

- **Data:** "{N} posts this month"
- **Data:** "{N} ready" (emerald)
- **Data:** "{N} need attention" (amber)

**Week-by-week layout:**

**For each week:**

- **Week label:** "Week {N}" (uppercase, small)
- **Grid of slot cards** (columns based on `postsPerWeek`)

**Each filled slot (`<SocialSlotCard />`):**

- **Pillar badge:** Color-coded badge with label (Recipe, Behind the Scenes, Education, Social Proof, Offers, Seasonal)
- **Schedule:** Day-of-week and time (e.g. "Tue - 9:00 AM")
- **Preflight indicator (conditional: not published/archived):**
  - Green CheckCircle -- preflight ready
  - Amber AlertCircle -- preflight not ready
- **Post title** (2-line clamp, or "Untitled post" in gray italic)
- **Platforms list** (comma-separated platform names, e.g. "instagram, facebook")
- **Status badge:** Idea/Draft/Approved/Queued/Published/Archived with appropriate variant
- **Edit link:** Link to `/social/posts/{id}` with Pencil icon -- label "Edit"

**Each empty slot (`<SocialEmptySlotCard />`):**

- Clock icon
- Text: "Reserved slot"

**Empty month state (conditional: no posts):**

- Emoji mailbox
- Text: "No posts scheduled this month."

---

### 11. `/social/posts/[id]` -- Post Editor

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\posts\[id]\page.tsx`

#### Header

- **Back button:** `<Button variant="ghost" size="sm">` -- "<- {Month Year}", links to `/social/planner/{month}`
- **Data:** Post code + "Scheduled {Day, Mon D} at {Time}"

Contains `<SocialPostEditor />` -- detailed below.

---

### 11a. SocialPostEditor (Full Post Editor)

**File:** `c:\Users\david\Documents\CFv1\components\social\social-post-editor.tsx`

#### Header Card

- **Pillar badge:** Color-coded (Recipe/Behind the Scenes/Education/Social Proof/Offers/Seasonal)
- **Status badge:** Idea/Draft/Approved/Queued/Published/Archived
- **Schedule text:** Formatted "EEE, MMM d, yyyy - h:mm a"
- **Title input:** `<Input>` -- placeholder "Post title (internal reference only)"

#### Tab Navigation (4 tabs)

- **Caption** tab
- **Platforms & Preview** tab
- **Media** tab
- **Settings** tab

#### CAPTION TAB

**Caption editor (`<SocialCaptionEditor />`):**

_Platform sub-tabs (horizontal scrollable):_

- Master (default)
- Instagram
- Facebook
- TikTok
- LinkedIn
- X (Twitter)
- Pinterest
- YouTube Shorts
- Each tab shows a green dot indicator when it has content

_Caption textarea:_ `<Textarea>`, 8 rows, non-resizable

- Placeholder varies: "Write your master caption here..." for Master, "Caption for {Platform}..." for others
- **Auto-fill link (conditional: not Master tab):** `<button>` -- "Auto-fill from master" (underlined)
- **Character counter:** "{count}" or "{count}/{limit}" with red "over limit" when exceeded
  - Character limits: Instagram 2200, Facebook 63206, TikTok 2200, LinkedIn 3000, X 280, Pinterest 500, YouTube Shorts 5000

**Hashtags section:**

- **Label:** "Hashtags"
- **Hashtag set picker dropdown (`<SocialHashtagSetPicker />`):**
  - **Toggle button:** BookMarked icon + "Insert hashtag set" + ChevronDown
  - **Dropdown menu (conditional: open):** Lists saved hashtag sets, each showing set name and first 5 tags preview. Clicking inserts tags.
- **Tag input:** `<TagInput>` -- placeholder "Type a hashtag and press Enter"
  - Helper text: "{N} hashtags - Instagram recommends 3-5 for reach"

**Other caption fields:**

- **Call to Action** -- `<Input>`, placeholder "e.g. Book your table tonight", label "Call to Action"
- **Location Tag** -- `<Input>`, placeholder "e.g. San Francisco, CA", label "Location Tag"
- **Mentions / @Tags** -- `<TagInput>`, placeholder "@username and press Enter", label "Mentions / @Tags"
- **Alt Text** -- `<Textarea>`, 2 rows, placeholder "Describe the image for screen readers...", label "Alt Text (accessibility)"

#### PLATFORMS & PREVIEW TAB

**Publish to section:**

- **Label:** "Publish to"
- **Platform checkboxes** (grid, 2-4 columns) -- 7 checkboxes, each with:
  - Checkbox input
  - Platform name (Instagram, Facebook, TikTok, LinkedIn, X (Twitter), Pinterest, YouTube Shorts)
  - Connected indicator: Green Wifi icon if OAuth-connected, gray dot if not
- **Helper text:** Green Wifi icon + "Connected account -- will auto-publish when Queued."
- **Conditional link (when no platforms connected):** "Connect platforms ->" linking to `/social/connections`

**Platform Preview section:**

- **Label:** "Platform Preview"
- **Platform selector** -- row of pill buttons (7 platforms), clicking switches preview
- **Preview component** (`<SocialPlatformPreview />`) -- shows a mock-up of the post as it would appear on the selected platform

#### MEDIA TAB

**Primary Media section:**

- **Label:** "Primary Media"
- **If primary asset exists:** Thumbnail (96x96), asset name, kind + file size, optional duration
- **If no primary asset:** Image icon + "No primary media attached"

**Media URL override:**

- **Input:** `<Input>`, label "Media URL (optional override)", placeholder "https://... (leave blank to use vault asset)"

**Linked Assets section (conditional: `linkedAssetObjs.length > 0`):**

- **Label:** "Linked Assets ({count})"
- **For each linked asset:**
  - Thumbnail (40x40), asset name
  - "Primary" label (conditional, emerald text)
  - **Detach button:** X icon button, aria-label "Detach asset", calls `handleDetachAsset`

**Browse button:** `<Button variant="secondary" size="sm">` with Image icon -- label "Browse Media Vault", opens vault overlay

#### SETTINGS TAB

**Status selector:**

- **Label:** "Status"
- **Pill buttons** (6 options): Idea, Draft, Approved, Queued, Published, Archived
  - Active selection has dark bg
- **Warning (conditional: status is queued and preflight not ready):** "Complete the preflight checklist before queuing for auto-publishing." (amber)

**Content Pillar selector:**

- **Label:** "Content Pillar"
- **Pill buttons** (6 options): Recipe, Behind the Scenes, Education, Social Proof, Offers, Seasonal
  - Active selection has dark bg

**Other settings fields:**

- **Campaign Name** -- `<Input>`, placeholder "e.g. Summer 2026", label "Campaign Name"
- **Offer Link** -- `<input type="url">` with Link icon prefix, placeholder "https://...", label "Offer Link"
- **Seasonal post checkbox** -- `<input type="checkbox">`, label "Seasonal post"
- **Hot-swap ready checkbox** -- `<input type="checkbox">`, label "Hot-swap ready"
- **Internal Notes** -- `<Textarea>`, 3 rows, placeholder "Private notes about this post...", label "Internal Notes"

#### Preflight + Save Bar (sticky at bottom)

- **Preflight status (`<SocialPostPreflight />`):**
  - _Ready:_ Green CheckCircle + "Preflight ready -- all checks passed"
  - _Not ready:_ Amber AlertCircle + "{N} items missing" + list of missing item pills (amber)
- **Save success text (conditional, auto-hides after 3s):** Green CheckCircle + "Saved"
- **Save error text (conditional):** Red error message
- **Save button:** `<Button variant="primary" loading={isPending}>` with Save icon -- label "Save Post"

#### Media Vault Picker Modal (conditional: `vaultOpen === true`)

- **Backdrop:** Black overlay (40% opacity), clicking closes
- **Modal panel:**
  - **Header:** "Select from Media Vault" + close button (X icon)
  - **Asset grid** (3-4 columns, scrollable):
    - Each asset is a clickable button
    - Image assets show thumbnail, video assets show Film icon + duration
    - Already-linked assets show green CheckCircle overlay, are disabled
    - Hover reveals asset name tooltip
  - **Empty state:** "No assets in vault yet."
  - **Footer text:** "First attachment becomes the primary media. Additional attachments create a carousel."

---

### 12. `/social/connections` -- Platform Connections

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\connections\page.tsx`

#### Page Header

- **H2:** "Platform Connections"
- **Subtitle:** "Connect your social accounts once -- ChefFlow handles all the posting automatically."

#### OAuth Error Flash (conditional: `searchParams.error` exists)

- Red alert box with error message. Error codes mapped to human-readable messages:
  - `access_denied`: "Connection was cancelled -- you denied access. You can try again any time."
  - `invalid_state`: "OAuth session expired. Please try connecting again."
  - `token_exchange_failed`: "Failed to complete the connection. The platform may be temporarily unavailable."
  - `account_info_failed`: "Connected but couldn't retrieve your account info. Try reconnecting."
  - `config_error`: "Platform configuration error. Please contact support."
  - Default: "Something went wrong while connecting. Please try again."

#### Connections Manager (`<SocialConnectionsManager />`)

**Explainer banner:**

- **H3:** "How platform connections work"
- **Text:** Explains OAuth flow, Queued auto-publish, and disconnect capability.

**Just-connected flash (conditional: `justConnected` URL param):**

- Green alert: "{Platform} connected successfully."

**Platform cards** (2-column grid, 7 cards total):

For each platform (Instagram, Facebook, TikTok, LinkedIn, X (Twitter), Pinterest, YouTube Shorts):

- **Color swatch** (9x9 square, platform-specific color)
- **Platform name** (bold)
- **Connection badge:**
  - "Not connected" (gray pill)
  - "Connected" (emerald pill)
  - "Needs attention" (amber pill) -- when errors or token expiring

**When connected:**

- **Account info:** Handle or account name, optional " - Page: {pageName}"
- **Error notice (conditional: `lastError` and `errorCount > 0`):** Amber alert with AlertCircle -- "{error} ({N} errors). Reconnect to reset."
- **Token expiry warning (conditional: expiring within 7 days):** Amber alert with RefreshCw -- "Access token expires {relative date}. Reconnect to refresh."

**When not connected:**

- **Description text** (e.g. "Feed posts, Reels, and carousels via Meta Content Publishing API.")
- **Requirements note:** Amber box with platform-specific requirement text

**Actions per card:**

_When connected:_

- **Reconnect link:** `<a>` styled as button -- "Reconnect", links to `/api/integrations/social/connect/{platform}`
- **Disconnect button:** `<button>` with Unlink icon -- "Disconnect" (or "Disconnecting..."), red styling, shows `confirm()` dialog
- **Docs link:** `<a>` external -- "Docs" with ExternalLink icon, links to platform-specific API docs

_When not connected:_

- **Connect link:** `<a>` styled as primary button -- "Connect {Platform}", links to `/api/integrations/social/connect/{platform}`
- **Docs link:** same as above

---

### 13. `/social/settings` -- Queue Settings

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\settings\page.tsx`

#### Page Header

- **H2:** "Queue Settings"
- **Subtitle:** "Configure your posting schedule, then generate your annual content calendar."

Contains `<SocialQueueSettingsForm />` (detailed below).

---

### 13a. SocialQueueSettingsForm

**File:** `c:\Users\david\Documents\CFv1\components\social\social-queue-settings-form.tsx`

**Form fields:**

1. **Target Year** -- `<select>`, label "Target Year", options: 2025, 2026, 2027, 2028

2. **Posts Per Week** -- label "Posts Per Week ({N}/week = ~{N\*52} posts/year)"
   - **Range slider:** `<input type="range">`, min 1, max 14
   - **Value display:** Large bold number
   - **Quick-set pill buttons** (4 options): 3x/week, 5x/week, 7x/week, 14x/week

3. **Timezone** -- `<select>`, label "Timezone", 13 options:
   - America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Phoenix, America/Anchorage, Pacific/Honolulu, Europe/London, Europe/Paris, Europe/Berlin, Asia/Tokyo, Asia/Shanghai, Australia/Sydney

4. **Posting Schedule** -- label "Posting Schedule", description "Which days and times to post each week. Add one slot per scheduled post."
   - **Add Slot button:** `<Button variant="secondary" size="sm">` with Plus icon -- "Add Slot"
   - **For each slot (repeatable):**
     - **Day select:** Options Mon/Tue/Wed/Thu/Fri/Sat/Sun
     - **Time input:** `<input type="time">`
     - **Remove button:** Trash2 icon button
   - **Empty state:** "No slots configured -- add at least one."

5. **Reserved Slots Per Month** -- label "Reserved Slots Per Month (kept empty for timely content)"
   - **Range slider:** `<input type="range">`, min 0, max 10
   - **Value display:** Large bold number

**Estimate card:**

- Text: "Your schedule will generate approximately **{N}** posts for {year}."
- Conditional encouragement: (when >= 250) "That's {N} posts/week -- a full content planner on autopilot."
- Conditional: "You currently have **{N}** posts generated for {year}." (when `postCount > 0`)

**Error display (conditional):** Red alert with AlertCircle icon
**Success display (conditional, auto-hides):** Green alert "Settings saved successfully."

**Action buttons:**

- **Save Settings:** `<Button variant="primary" loading={isPending}>` -- label "Save Settings"
- **Save & Generate Plan:** `<Button variant="secondary" loading={isPending}>` -- label "Save & Generate Plan", disabled when `postCount > 0`
- **Regenerate (Replace All) (conditional: `postCount > 0`):** `<Button variant="danger" loading={isPending}>` -- label "Regenerate (Replace All)"

**Regenerate Confirmation Modal (conditional: `confirmRegenerate === true`):**

- **Backdrop:** Black overlay (40% opacity), clicking closes
- **Modal panel:**
  - **Header:** AlertCircle icon + "Replace all posts?"
  - **Text:** "This will delete all **{N}** existing posts for {year} and generate a fresh set. Any content you've written will be permanently lost."
  - **Cancel button:** `<Button variant="ghost">` -- "Cancel"
  - **Confirm button:** `<Button variant="danger" loading={isPending}>` -- "Yes, Replace All"

---

### 14. `/social/vault` -- Media Vault

**File:** `c:\Users\david\Documents\CFv1\app\(chef)\social\vault\page.tsx`

#### Page Header

- **H2:** "Media Vault"
- **Subtitle:** "All your photos and videos -- upload once, use across any post on any platform."

Contains `<SocialVaultBrowser />` (detailed below).

---

### 14a. SocialVaultBrowser

**File:** `c:\Users\david\Documents\CFv1\components\social\social-vault-browser.tsx`

#### Upload Zone

- **Drag-and-drop area** (also clickable):
  - Upload icon
  - Text: "Drop files here or click to upload"
  - Accepted formats: "Images (JPEG, PNG, WebP, HEIC) - Videos (MP4, MOV, WebM) - Max 100MB per file"
  - **Hidden file input:** `<input type="file" multiple>`, accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
  - **Uploading state:** Spinner + "Uploading..."

#### Error Display (conditional)

- Red alert with error message and dismiss X button

#### Search & Filter Bar

- **Search input:** `<input type="search">` with Search icon prefix, placeholder "Search by name or tag..."
- **Filter buttons** (3 options, toggle-style):
  - "All ({N})"
  - "Images ({N})"
  - "Videos ({N})"

#### Asset Grid (responsive: 2/3/4/5 columns)

**For each asset:**

- **Thumbnail:** Aspect-square
  - Images: `<img>` with object-cover
  - Videos: Film icon + optional duration
- **Usage badge (conditional: attached to posts):** "{N} posts" overlay
- **Kind icon overlay:** ImageIcon for images, Film for videos
- **Info section:**
  - Asset name (truncated)
  - File size (formatted: B/KB/MB)
  - Tags (up to 3 shown as pills, then "+N" overflow count)
- **Action buttons:**
  - **Edit button:** Tag icon + "Edit", opens edit modal
  - **Remove button:** Archive icon + "Remove", calls `deleteSocialAsset`

**Empty state:**

- Emoji image
- Text: "No assets match your search." or "Your vault is empty -- upload some media to get started."

#### Edit Asset Modal (conditional: `editingAsset` is set)

- **Backdrop:** Black overlay (40% opacity), clicking closes
- **Modal panel:**
  - **Header:** "Edit Asset" + close button (X icon)
  - **Name field:** `<input type="text">`, label "Name", prefilled
  - **Tags field:** `<input type="text">`, label "Tags (comma separated)", placeholder "dinner, summer, 4th of july", prefilled with comma-joined tags
  - **Cancel button:** `<Button variant="ghost">` -- "Cancel"
  - **Save button:** `<Button variant="primary" loading={isPending}>` -- "Save"

---

## SUMMARY TOTALS

| Category                                 | Count                                                   |
| ---------------------------------------- | ------------------------------------------------------- |
| Marketing pages                          | 7                                                       |
| Social pages                             | 7 (including redirect)                                  |
| Total page routes                        | 14                                                      |
| Client components                        | 16                                                      |
| Form fields (inputs, selects, textareas) | ~62                                                     |
| Buttons (including action buttons)       | ~58                                                     |
| Modals/dialogs                           | 3 (vault picker, regenerate confirm, edit asset)        |
| Confirm dialogs (browser native)         | 3 (send campaign, delete template, disconnect platform) |
| Links/navigation                         | ~32                                                     |
| Badges/status indicators                 | ~35 distinct badge configurations                       |
| Conditional elements                     | ~85                                                     |
| Data display cards                       | ~25                                                     |
