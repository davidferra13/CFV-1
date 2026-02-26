# Booking & Payment Execution

This document governs how ChefFlow handles the transition from pricing acceptance to confirmed booking, and defines the legal terms of engagement.

---

## When These Rules Apply

These rules activate once a client has:

- Confirmed interest in moving forward, OR
- Confirmed a menu or course count, OR
- Explicitly stated readiness to pay a deposit, OR
- Asked for "next steps," "payment," or "how to lock the date"

---

## Deposit Requirement (Non-Negotiable)

A **50% non-refundable deposit** is required to lock the date.

- No date is held, soft-held, or reserved until the deposit is received
- The remaining balance is due 24 hours before service begins
- The deposit is applied toward the total invoice

---

## Execution Rule: When Client Is Ready to Pay

If the client says they are ready to pay, asks for the deposit, or asks for next steps after confirming:

**The payment instruction must be included in the same email.**

Do not defer payment to a future message. Ever.

### Required Structure

1. Acknowledge confirmation (menu, guest count, or intent)
2. State the deposit requirement
3. Provide the payment action immediately
4. State what happens once payment is completed

### Approved Language

> "To lock the date, a 50% non-refundable deposit is required. You can take care of that here: [PAYMENT LINK]. Once the deposit is received, your date is confirmed and I'll continue refining the menu."

This language may be adjusted for tone but **cannot remove the payment action**.

### Prohibited Language (Strict)

- "I'll send the invoice shortly"
- "I'll follow up with payment details"
- "I'll send the deposit information next"
- "Once I send the invoice..."
- Any wording that delays payment execution to a future message

---

## After Payment Is Received

Once deposit is received:

1. Date is confirmed — event transitions to `paid` then `confirmed`
2. Menu refinement continues
3. Ledger entry is created automatically (via Stripe webhook)
4. No additional confirmation request is needed
5. System generates client-facing confirmation in chef's voice (requires approval)

---

## Cancellation Policy

All cancellations must be made in writing.

| Timing                 | Policy                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Within 7 days of event | No refunds of any kind                                                                         |
| More than 7 days out   | Retainer non-refundable; additional payments may be refunded minus costs, at chef's discretion |

Rescheduling is treated as a cancellation unless explicitly approved in writing.

---

## Guest Count Changes

- Final guest count must be confirmed no later than 5 days before event date
- Late changes may result in additional fees, increased grocery costs, or adjusted menu scope
- **Reductions in guest count after confirmation do not reduce pricing**

---

## Grocery & Ingredient Billing

- Groceries are billed at **actual cost** based on real receipts
- No markup on food or ingredients
- Grocery costs are separate from the service fee
- Client agrees to reimburse grocery expenses in full
- Receipts provided upon request
- Ingredient quality and sourcing at chef's discretion

---

## Master Booking Agreement — Key Terms

The full agreement is presented when the client reaches Booking stage. Key provisions:

### Services Provided

Private chef services including menu planning, ingredient sourcing, on-site food preparation, cooking, and kitchen cleanup. Independent service provider, one-person business. No assistants, servers, bartenders, rentals, tableware, or beverages unless explicitly agreed in writing.

### Venue & Kitchen

Client is responsible for:

- Legal access to the property
- Safe, functional kitchen with working utilities
- Adequate workspace and standard equipment
- Compliance with building/HOA/venue rules

Chef reserves the right to refuse service or modify execution if conditions are unsafe.

### Allergies & Dietary

Client must disclose all allergies and restrictions in writing. Reasonable care is taken but a completely allergen-free environment cannot be guaranteed.

### Intellectual Property

Menus, concepts, and written materials remain IP of DF Private Chef LLC. Chef reserves the right to photograph food for portfolio unless client objects in writing prior to service.

### Force Majeure

Not liable for failure to perform due to illness, accidents, extreme weather, government action, or emergencies. Liability limited to refund of amounts paid excluding retainer.

---

## Relationship to Codebase

The codebase handles booking execution through:

- **Stripe PaymentIntent** for deposit collection
- **Webhook handler** for payment confirmation → ledger append + event FSM transition
- **Quote acceptance** triggers the booking flow
- **Event status transitions**: `accepted → paid → confirmed`

The AI agent's role is to draft the booking email with payment link. The codebase handles the financial mechanics.
