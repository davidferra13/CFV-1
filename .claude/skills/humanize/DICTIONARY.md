# Humanize Dictionary

Canonical replacements for developer jargon in user-facing text. Left = bad (developer speak). Right = good (human speak). Context matters; pick the replacement that fits the sentence.

## System & Infrastructure

| Developer Term            | Human Alternative                            |
| ------------------------- | -------------------------------------------- |
| Sync / Synchronize        | Update, Refresh, Keep up to date             |
| Sync failed               | Couldn't update your information             |
| Revalidate / Revalidating | Refresh / Refreshing                         |
| Cache / Cached            | Saved copy (or just omit)                    |
| Clear cache               | Refresh your data                            |
| Server error              | Something went wrong on our end              |
| Server is down            | We're having trouble right now               |
| API / Endpoint            | Connection, Service (or omit)                |
| Webhook                   | Automatic notification (or omit)             |
| Pipeline                  | Process, Workflow                            |
| Deploy / Deployment       | Update, Release, Go live                     |
| Instance                  | Account, Workspace, Your [thing]             |
| Initialize / Initializing | Setting up, Getting ready                    |
| Configuration / Config    | Settings, Preferences, Setup                 |
| Invalid configuration     | Something needs to be fixed in your settings |
| Middleware                | (omit entirely, rephrase around it)          |
| Provider                  | Service, Connection                          |

## Data & Database

| Developer Term       | Human Alternative                                     |
| -------------------- | ----------------------------------------------------- |
| Entity               | Item, Entry, [specific thing: dinner, recipe, client] |
| Entity not found     | We couldn't find that                                 |
| Record               | Entry, Item, [specific thing]                         |
| No records found     | Nothing here yet                                      |
| Field                | (use the actual label name instead)                   |
| Required field       | Required, Please fill this in                         |
| Invalid field        | Please check this entry                               |
| Schema               | Structure, Layout (or omit)                           |
| Migration            | Update (or omit)                                      |
| Query                | Search, Lookup, Request                               |
| Query failed         | Search didn't work. Try again?                        |
| Payload              | Data, Information, Details                            |
| Serialize / Parse    | Process, Read (or omit)                               |
| Null / Undefined     | Missing, Not set, Empty                               |
| Duplicate entry      | This already exists                                   |
| Constraint violation | This conflicts with existing information              |
| Foreign key error    | Related information is missing                        |

## Authentication & Sessions

| Developer Term              | Human Alternative                  |
| --------------------------- | ---------------------------------- |
| Session                     | (omit, or "your login")            |
| Session expired             | You've been signed out             |
| Token                       | (omit entirely)                    |
| Invalid token               | Please sign in again               |
| Authentication failed       | Couldn't sign you in               |
| Unauthorized                | You don't have access to this      |
| Forbidden (403)             | You don't have permission for this |
| Not found (404)             | Page not found, We can't find that |
| Internal server error (500) | Something went wrong. We're on it  |
| Rate limited (429)          | Too many requests. Wait a moment   |
| Tenant                      | Account, Workspace, Your business  |
| Multi-tenant                | (omit, never user-facing)          |

## Actions & State

| Developer Term        | Human Alternative                           |
| --------------------- | ------------------------------------------- |
| Mutation              | Change, Update, Save                        |
| Callback              | (omit, describe the result instead)         |
| State / State machine | Status, Progress                            |
| Transition (FSM)      | Move to, Change to, Update status           |
| Dispatch              | Send, Start, Process                        |
| Emit                  | Send, Notify                                |
| Subscribe             | Follow, Get notified, Turn on notifications |
| Render / Re-render    | Show, Display, Update                       |
| Toggle (feature flag) | Turn on / Turn off                          |
| Flag                  | Option, Setting                             |
| Param / Parameter     | Option, Detail                              |
| Propagate             | Spread, Apply, Update                       |
| Handler               | (omit, describe what happens)               |
| Resolver              | (omit, describe what happens)               |
| Validate / Validation | Check, Verify, Review                       |
| Validation error      | Please check your entries                   |

## UI & Components

| Developer Term             | Human Alternative                           |
| -------------------------- | ------------------------------------------- |
| Component                  | Section, Part, Area                         |
| Route / Routing            | Page, Screen, Navigation                    |
| Modal                      | Pop-up, Dialog, Window                      |
| Dropdown                   | Menu, List, Options                         |
| Tooltip                    | Hint, Help tip                              |
| Placeholder                | Example, Hint text                          |
| Skeleton / Skeleton loader | (just show the loading animation, no label) |
| Fallback                   | Backup, Alternative (or omit)               |
| Overflow                   | More options                                |

## Feedback Messages

| Developer Pattern    | Human Pattern                                       |
| -------------------- | --------------------------------------------------- |
| Operation successful | Done! / Saved / Updated / Sent                      |
| Operation failed     | Something went wrong. [what to do]                  |
| Request timed out    | Taking too long. Try again?                         |
| Unexpected error     | Something went wrong. Try again, or contact support |
| An error occurred    | [Be specific about what didn't work]                |
| Error: [code]        | [Describe the problem in plain words]               |
| Loading...           | Getting your [specific thing]...                    |
| Processing...        | Working on it... / Saving...                        |
| Fetching data        | Loading your [specific thing]                       |
| No data available    | Nothing here yet. [How to add something]            |
| 0 results            | No matches found. Try different filters?            |

## Settings & Preferences

| Developer Term       | Human Alternative                               |
| -------------------- | ----------------------------------------------- |
| Enable / Disable     | Turn on / Turn off                              |
| Boolean              | Yes/No, On/Off                                  |
| Preferences          | Settings                                        |
| User preferences     | Your settings                                   |
| Default value        | Standard setting, Recommended                   |
| Override             | Custom, Change from default                     |
| Permissions          | Access, Who can see this                        |
| Role-based access    | Access levels                                   |
| Environment variable | (never user-facing)                             |
| Feature flag         | (never user-facing, just show the setting name) |

## Tone Guide

**Instead of:** "Failed to fetch client data from the server."
**Write:** "Couldn't load your client list. Check your connection and try again."

**Instead of:** "No entities match the provided query parameters."
**Write:** "No results match your search. Try different filters?"

**Instead of:** "Successfully created new event instance."
**Write:** "Your dinner is on the calendar!"

**Instead of:** "Error: duplicate key constraint on email field."
**Write:** "An account with this email already exists."

**Instead of:** "Initializing workspace configuration..."
**Write:** "Setting up your workspace..."

**Instead of:** "WebSocket connection terminated unexpectedly."
**Write:** "Lost connection. Reconnecting..."
