# GOLDMINE Email Reference Build

- Generated: 2026-03-02T06:39:12.894Z
- Input: Dinner Email Export.mbox
- Total emails: 299
- Threads: 49 (avg 6.1 msgs, max 26)

## Category Breakdown

- **outbound**: 146
- **direct_followup**: 97
- **direct_first_contact**: 24
- **partner_ember**: 19
- **wix_form**: 8
- **platform_takeachef**: 3
- **post_event_feedback**: 1
- **bounce**: 1

## Heuristic Accuracy (First-Contact Emails)

- First contacts tested: 41
- Caught at score ≥2 (medium): 36 (88%)
- Caught at score ≥3 (high): 26 (63%)

### Missed First Contacts (score < 2)

- **dfprivatechef"** (dfprivatechef@wix-forms.com): "Dinner Inquiry got a new submission" — score 1 [occasion]
- **Susan Trischman** (strischman@optonline.net): "Dinner party on 10/4" — score 1 [date_mention]
- **Jill Tzortzis** (jilltzortzis@gmail.com): "Sunday Dinner" — score 1 [local_geography]
- **Mail Delivery Subsystem** (mailer-daemon@googlemail.com): "Delivery Status Notification (Failure)" — score 0 [no signals]
- **Gina Mannarino** (greengeans207@gmail.com): "Green Geans LLC: Next Steps for Your Freeze-Drying Inquiry" — score 1 [price_or_booking_ask]

## Top Inquiry Signals

- date_mention: 142×
- price_or_booking_ask: 115×
- local_geography: 102×
- dietary: 86×
- guest_count: 49×
- occasion: 43×
- cannabis: 43×
- airbnb_referral: 29×
- referral: 10×
- website_followup: 7×

## Partner Domains

- emberbrandfire.com → ember_brand_fire (19 emails)

## Notes

- This build is deterministic from the provided MBOX.
- Outbound emails (from chef) are included for thread context but not classified as opportunities.
- Post-event feedback emails are detected via pattern matching to prevent false inquiry classification.

## Thread Intelligence Summary

- Threads analyzed: 49
- Outcomes: expired=18, declined_by_chef=4, likely_booked=8, booked=15, declined_by_client=4
- Conversion rate: 30.6%
- Avg first response: 2547 min
- Median first response: 2001 min

## Outbound Pattern Highlights

- Outbound emails analyzed: 146
- Avg response latency: 2655 min
- Emails with pricing: 88
- Unique menu items: 0
