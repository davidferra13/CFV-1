# Client Intake/Assessment Forms

## Overview

Customizable intake forms that chefs can create, edit, and send to clients via shareable links. Clients fill them out on a public page (no account required), and chefs can review responses and merge data into client profiles.

## Architecture

### Database Tables

- **`client_intake_forms`** - Form templates with JSONB field definitions, tenant-scoped
- **`client_intake_responses`** - Submitted responses linked to forms and optionally to clients
- **`client_intake_shares`** - Share tokens linking forms to clients with 30-day expiration

Migration: `supabase/migrations/20260315000001_client_intake_forms.sql`

### Server Actions

File: `lib/clients/intake-actions.ts`

| Action                                      | Auth | Purpose                                         |
| ------------------------------------------- | ---- | ----------------------------------------------- |
| `getIntakeForms()`                          | Chef | List all forms (seeds defaults on first access) |
| `getIntakeFormById(formId)`                 | Chef | Get single form                                 |
| `createIntakeForm(input)`                   | Chef | Create custom form                              |
| `updateIntakeForm(formId, input)`           | Chef | Edit form fields                                |
| `deleteIntakeForm(formId)`                  | Chef | Soft delete                                     |
| `sendIntakeForm(input)`                     | Chef | Generate share link                             |
| `getIntakeResponses(formId?)`               | Chef | List all responses                              |
| `getClientIntakeResponses(clientId)`        | Chef | Responses for one client                        |
| `applyIntakeToClient(responseId, clientId)` | Chef | Merge response data into client profile         |
| `getIntakeFormByToken(token)`               | None | Load form for public submission                 |
| `submitIntakeResponse(token, data)`         | None | Submit response (public)                        |

### Field Types

| Type             | Widget                       | Notes                                         |
| ---------------- | ---------------------------- | --------------------------------------------- |
| `text`           | Single-line input            | Standard text entry                           |
| `textarea`       | Multi-line input             | For longer responses                          |
| `number`         | Number input                 | Numeric values                                |
| `date`           | Date picker                  | Date selection                                |
| `checkbox_group` | Checkbox list                | Multiple selections, renders in 2-column grid |
| `radio`          | Radio buttons                | Single selection                              |
| `select`         | Dropdown                     | Single selection from dropdown                |
| `allergy_picker` | Checkbox grid + custom input | 18 common allergens with "other" text field   |

### Field-to-Client Mapping

Fields can have a `mapToClientField` property that maps to a column on the `clients` table. When "Apply to Profile" is clicked, responses are merged into the client record. Supported mappings:

`dietary_restrictions`, `allergies`, `dislikes`, `spice_tolerance`, `favorite_cuisines`, `favorite_dishes`, `wine_beverage_preferences`, `preferred_contact_method`, `kitchen_size`, `kitchen_constraints`, `equipment_available`, `house_rules`, `parking_instructions`, `access_instructions`, `partner_name`, `vibe_notes`, `what_they_care_about`

## Default Templates

Three form templates are auto-seeded on first access:

1. **New Client Assessment** - Comprehensive intake covering dietary needs, kitchen setup, budget, and preferences (13 fields)
2. **Dietary Questionnaire** - Focused on allergies, restrictions, dislikes, and food preferences (9 fields)
3. **Kitchen Equipment Checklist** - What equipment the client's kitchen has available (8 fields)

## Routes

| Route             | Auth | Purpose                                            |
| ----------------- | ---- | -------------------------------------------------- |
| `/clients/intake` | Chef | Form management, builder, responses                |
| `/intake/[token]` | None | Public form submission (standalone, no nav chrome) |

## UI Components

| Component            | File                                          | Purpose                                                        |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| `IntakeFormsManager` | `components/clients/intake-forms-manager.tsx` | Main management UI with list/create/edit/send/responses views  |
| `IntakeFormBuilder`  | `components/clients/intake-form-builder.tsx`  | Form builder with field editor, reorder, type selection        |
| `IntakeFormPreview`  | `components/clients/intake-form-preview.tsx`  | Read-only preview of form fields                               |
| `IntakeFormClient`   | `components/clients/intake-form-client.tsx`   | Public interactive form with validation and submission         |
| `ClientIntakePanel`  | `components/clients/client-intake-panel.tsx`  | Panel for client detail page showing responses and send button |

## Integration Points

- **Client Detail Page** - Add `ClientIntakePanel` to show intake history and "Send Intake Form" button
- **Client Profile** - "Apply to Profile" merges mapped fields into the client record
- **Share Links** - 30-day expiration, single use, optionally pre-filled with client name/email

## Security

- Chef-side: `requireChef()` on all management actions, tenant-scoped queries
- Public: Token-based access only, validated server-side, admin supabase client for public reads/writes
- RLS: Tenant-scoped for chef operations, public INSERT on responses, public SELECT on shares and forms
- Share tokens: 32-byte random hex, unique constraint, single-use (linked to response after submission)
