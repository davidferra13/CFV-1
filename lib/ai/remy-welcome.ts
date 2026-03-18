// Remy - New User Welcome Messages & Starters
// No 'use server' - constants only.
// Used by the Remy drawer to greet first-time authenticated chefs.

export const REMY_WELCOME_MESSAGE = `Welcome to ChefFlow! I'm Remy - your AI sous chef.

I'm here to help you get set up and running. Here are some things I can help with right now:

- **Import your clients** - paste names, upload a CSV, or just tell me about them
- **Log a past event** - seed your financials with real data from day one
- **Set up your public page** - so clients can find you and submit inquiries
- **Just chat** - tell me about your business and I'll remember the details

What would you like to start with?`

export const NEW_USER_STARTERS = [
  { label: 'Import my clients', message: 'Help me import my existing clients' },
  { label: 'Log a past event', message: 'I want to log a past event to get my financials started' },
  { label: 'Set up my page', message: 'Help me set up my public chef profile page' },
  {
    label: 'Tell you about my business',
    message: 'Let me tell you about my private chef business',
  },
]

/** LocalStorage key to track whether the welcome has been shown */
export const REMY_WELCOME_SHOWN_KEY = 'remy-welcome-shown'
