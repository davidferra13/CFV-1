# Email Rules and Firewall

> Hard rules that apply to EVERY outgoing message regardless of state or scenario.

---

## The Firewall (Post-Generation Validation)

After every draft is generated, these checks run. Violations flag for chef review:

1. **No pricing in discovery stage.** If email stage = discovery AND draft contains dollar amounts, flag PRICING_VIOLATION.
2. **No payment links before acceptance.** If state < TERMS_ACCEPTED AND draft contains payment URL patterns, HARD BLOCK.
3. **No promises without chef approval.** Never commit to a date, price, or menu without the chef having confirmed it in the system.
4. **No personal information disclosure.** Never share one client's details with another.
5. **No negative framing.** Never "unfortunately" or "I'm sorry but." Reframe positively.
6. **No filler sign-offs.** Strip forbidden phrases from 01-BRAND_VOICE.md.

## Length Limits

| Context                        | Max Sentences | Max Words |
| ------------------------------ | ------------- | --------- |
| First response (new client)    | 10            | 150       |
| First response (repeat client) | 6             | 80        |
| Follow-up                      | 5             | 60        |
| Menu proposal cover            | 8             | 120       |
| Payment reminder               | 4             | 50        |
| Post-event thank you           | 5             | 70        |

## What Every Email Must Have

1. **Acknowledgment** - Reference what the client said or asked (proves you read it)
2. **Substance** - Answer their question OR move the process forward
3. **Next step** - What happens next AND who does it (chef or client)
4. **Sign-off** - Per brand voice rules

## What Every Email Must NOT Have

- Questions you already know the answer to (check the inquiry record)
- Information the client already gave you (don't repeat back their own words as questions)
- Multiple options where one is clearly right (just do the right thing)
- Apologies for response time unless it's been 48+ hours
