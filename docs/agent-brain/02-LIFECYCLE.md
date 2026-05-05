# Lifecycle States and Email Stage Mapping

> The correspondence engine detects which lifecycle state the inquiry is in
> and gates what kind of content the AI can generate.

---

## 11-State Engagement Arc

| #   | State              | Description                                    | Email Stage  |
| --- | ------------------ | ---------------------------------------------- | ------------ |
| 0   | INBOUND_SIGNAL     | Raw message received, not yet validated        | discovery    |
| 1   | QUALIFIED_INQUIRY  | Legitimate request, basic info partially known | discovery    |
| 2   | DISCOVERY_COMPLETE | All non-financial data captured                | pricing      |
| 3   | PRICING_PRESENTED  | Quote sent, awaiting response                  | pricing      |
| 4   | TERMS_ACCEPTED     | Client accepted scope + pricing verbally       | booking      |
| 5   | BOOKED             | Deposit received, commitment locked            | booking      |
| 6   | MENU_LOCKED        | Final menu confirmed, no changes               | booking      |
| 7   | EXECUTION_READY    | All prep complete, ready to execute            | booking      |
| 8   | IN_PROGRESS        | Service day, actively cooking                  | booking      |
| 9   | SERVICE_COMPLETE   | Event done, closure tasks open                 | post_service |
| 10  | CLOSED             | All tasks done, relationship archived          | post_service |

## Email Stage Gatekeeper

The email stage determines what the AI is ALLOWED to include:

### Discovery Stage (States 0-1)

- CAN: Ask questions, confirm availability, explain process, share past work
- CANNOT: Quote prices, send payment links, discuss specific costs
- EXCEPTION: Can mention general pricing structure ("I price per person based on the menu")

### Pricing Stage (States 2-3)

- CAN: Quote specific prices, itemize costs, explain what's included
- CANNOT: Send payment links, request deposits (not yet accepted)
- MUST: Include all cost components (food, service, travel if applicable)

### Booking Stage (States 4-7)

- CAN: Send payment links, discuss logistics, share menu details, coordinate timing
- CANNOT: Re-negotiate pricing without chef approval flag
- MUST: Reference the accepted quote/agreement

### Post-Service Stage (States 9-10)

- CAN: Thank, request review, follow up on payment, suggest rebooking
- CANNOT: Re-open pricing discussions, change event details retroactively

## Transition Triggers

State advances automatically when:

- 0 -> 1: Source message parsed, contact info captured
- 1 -> 2: All blocking discovery fields filled (date, count, dietary, location)
- 2 -> 3: Quote created and sent
- 3 -> 4: Client confirms acceptance (verbal/written)
- 4 -> 5: Deposit payment received
- 5 -> 6: Menu confirmed by host
- 6 -> 7: Grocery list + execution sheet + equipment list all ready
- 7 -> 8: Event date = today
- 8 -> 9: Event marked complete
- 9 -> 10: Follow-up sent + financially closed + AAR filed
