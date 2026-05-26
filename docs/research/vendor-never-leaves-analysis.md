# Everything a Vendor Never Needs to Leave ChefFlow For

> **Purpose:** The inverse of `vendor-exit-points-analysis.md`. Every workflow a vendor,
> supplier, purveyor, distributor, farm, or other supplier-side partner can complete inside the
> current ChefFlow vendor role from start to finish, no outside tool required.
>
> **Codebase grounding:** Current vendor-role surfaces are `requireVendor()` in
> `lib/auth/get-user.ts`, `VENDOR_PROTECTED_PATHS = ['/vendor']` in `lib/auth/route-policy.ts`,
> `/auth/vendor-signup`, and the protected `/vendor/dashboard`, `/vendor/orders`,
> `/vendor/orders/[id]`, `/vendor/invoices`, `/vendor/catalog`, and `/vendor/profile` pages.
>
> **Date:** 2026-05-25

---

## Category 1: INVITE, SIGNUP & LEGAL ACCEPTANCE

| #   | What They Do Entirely In-App                                                     |
| --- | -------------------------------------------------------------------------------- |
| 1   | Open a vendor invite token at `/auth/vendor-signup`                              |
| 2   | See an invalid or expired invite state without entering the portal               |
| 3   | Enter the invited email address                                                  |
| 4   | Create a password for the vendor account                                         |
| 5   | Accept the ChefFlow privacy policy during signup                                 |
| 6   | Accept the vendor agreement during signup                                        |
| 7   | Claim the invitation when the token, email, and legal acceptance pass validation |
| 8   | Sign in immediately after invite claim                                           |
| 9   | Land on `/vendor/dashboard` after successful signup                              |

---

## Category 2: AUTH, ROLE GATING & PORTAL SHELL

| #   | What They Do Entirely In-App                                    |
| --- | --------------------------------------------------------------- |
| 10  | Authenticate as a vendor through the vendor portal sign-in path |
| 11  | Get redirected away from vendor pages when unauthenticated      |
| 12  | Get blocked when the account does not have the `vendor` role    |
| 13  | Get blocked when the underlying vendor record is inactive       |
| 14  | Use a portal scoped to their own `vendorId`                     |
| 15  | Stay inside tenant-scoped vendor data for the chef relationship |
| 16  | Use the vendor desktop sidebar                                  |
| 17  | Use the vendor mobile bottom navigation                         |
| 18  | Sign out from the vendor portal                                 |

---

## Category 3: DASHBOARD OVERVIEW

| #   | What They Do Entirely In-App                           |
| --- | ------------------------------------------------------ |
| 19  | See the vendor business name in the dashboard greeting |
| 20  | View open order count                                  |
| 21  | Distinguish sent and acknowledged open orders          |
| 22  | View pending invoice count                             |
| 23  | Jump from dashboard to purchase orders                 |
| 24  | Jump from dashboard to invoices                        |
| 25  | Jump from dashboard to catalog management view         |

---

## Category 4: PURCHASE ORDER VISIBILITY

| #   | What They Do Entirely In-App                                   |
| --- | -------------------------------------------------------------- |
| 26  | Open the purchase order list at `/vendor/orders`               |
| 27  | View all purchase orders scoped to the vendor account          |
| 28  | See purchase order number                                      |
| 29  | See order date                                                 |
| 30  | See expected delivery date when present                        |
| 31  | See purchase order total                                       |
| 32  | See order status badge                                         |
| 33  | Open an individual purchase order detail page                  |
| 34  | Get a not-found state instead of seeing another vendor's order |

---

## Category 5: PURCHASE ORDER DETAIL & STATUS ACTIONS

| #   | What They Do Entirely In-App                              |
| --- | --------------------------------------------------------- |
| 35  | Review purchase order line items                          |
| 36  | Review quantity and unit per line item                    |
| 37  | Review unit price and line total when present             |
| 38  | Review order notes from the chef                          |
| 39  | Acknowledge a sent order                                  |
| 40  | Mark an acknowledged order partially received             |
| 41  | Mark an acknowledged or partially received order received |
| 42  | Refresh the order detail after a successful status update |

---

## Category 6: INVOICE VISIBILITY

| #   | What They Do Entirely In-App                                        |
| --- | ------------------------------------------------------------------- |
| 43  | Open the vendor invoice list at `/vendor/invoices`                  |
| 44  | View invoices scoped to the vendor account                          |
| 45  | See invoice number or a no-number fallback                          |
| 46  | See invoice date                                                    |
| 47  | See invoice total                                                   |
| 48  | See invoice status: pending, matched, disputed, or fallback state   |
| 49  | Return later to check whether submitted invoices have changed state |

---

## Category 7: CATALOG VISIBILITY

| #   | What They Do Entirely In-App                                        |
| --- | ------------------------------------------------------------------- |
| 50  | Open the vendor catalog at `/vendor/catalog`                        |
| 51  | View catalog items scoped to the vendor account                     |
| 52  | See item name                                                       |
| 53  | See unit price                                                      |
| 54  | See unit size and unit measure when present                         |
| 55  | See vendor SKU when present                                         |
| 56  | Understand that no catalog items are available from the empty state |

---

## Category 8: PROFILE & ACCOUNT CONTEXT

| #   | What They Do Entirely In-App                                              |
| --- | ------------------------------------------------------------------------- |
| 57  | Open the vendor profile at `/vendor/profile`                              |
| 58  | View business name                                                        |
| 59  | View vendor type                                                          |
| 60  | View contact name, email, phone, address, website, and notes when present |

---

## THE SCORE

| Metric                            | Count                                                                      |
| --------------------------------- | -------------------------------------------------------------------------- |
| **Total in-app vendor workflows** | **60**                                                                     |
| **Total vendor exit scenarios**   | **56**                                                                     |
| **Ratio**                         | **52% of the supplier-side digital relationship is inside ChefFlow today** |

---

## What This Means

A vendor using the current ChefFlow vendor role can stay in-app for:

1. **Invite claim and legal acceptance**: token signup, vendor agreement acceptance, and portal login.
2. **Basic account security boundaries**: vendor-only route gating, active vendor enforcement, and scoped data access.
3. **Operational visibility**: dashboard counts, order list/detail, invoice list, catalog list, and profile view.
4. **Simple PO lifecycle updates**: acknowledge, partially received, and received transitions.

The current vendor portal is useful as a supplier-side status window. It is not yet a full supplier
collaboration workspace.

---

## The Remaining Gap (What Would Get This to 75%+)

| Fix                                       | Exits Eliminated or Reduced                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Vendor-side invoice upload                | Email/accounting invoice submission and correction loops                             |
| Vendor-side catalog upload/edit proposals | Spreadsheet and ERP price-sheet round-trips                                          |
| Order comments/questions                  | Email and phone clarification loops                                                  |
| Accept with changes / reject with reason  | Substitution, short-stock, and cannot-fulfill exits                                  |
| Line-level fulfillment confirmation       | Coarse order-status ambiguity                                                        |
| ETA and delivery proof capture            | Dispatch, proof-of-delivery, and receiving evidence gaps                             |
| Vendor-safe dispute follow-up             | External dispute threads without exposing chef-private trust memory                  |
| Vendor support/account recovery           | Lost invite, access, and account help                                                |
| Certificate and terms upload              | Insurance, license, W-9, and payment-term document handling                          |
| Multi-chef vendor workspace               | Suppliers serving multiple ChefFlow chefs without repeated account context switching |

Ten improvements would move the vendor role from a read-mostly portal to a controlled supplier
collaboration layer while preserving ChefFlow's chef-owned trust, pricing, and procurement records.
