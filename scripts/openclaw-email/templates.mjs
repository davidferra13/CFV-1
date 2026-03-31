/**
 * Email templates for wholesale price list requests.
 * Keep it professional, brief, and human-sounding.
 */

export function initialRequest({ city, state, region }) {
  return {
    subject: `Price list request - small catering operation, ${region}`,
    text: `Hi,

I run a small catering operation in ${city}, ${state} and I'm looking into setting up a wholesale account. Could you send me your current price list or catalog?

I'm primarily interested in:
- Proteins (chicken, beef, pork, seafood)
- Produce (seasonal and staples)
- Dairy and eggs
- Dry goods and pantry staples

A PDF or spreadsheet works great. Thanks for your time.

Best,
OpenCLAW Price Intelligence
ChefFlow - cheflowhq.com`
  }
}

export function followUp({ region }) {
  return {
    subject: `Re: Price list request - small catering operation, ${region}`,
    text: `Hi, just following up on my price list request from two weeks ago. If there's a better contact for wholesale inquiries, I'd appreciate being pointed in the right direction. Thanks!

Best,
OpenCLAW Price Intelligence
ChefFlow - cheflowhq.com`
  }
}

export function weeklyUpdate({ distributorName, contactName }) {
  const greeting = contactName ? `Hi ${contactName}` : 'Hi'
  return {
    subject: `Weekly price check - ${distributorName}`,
    text: `${greeting},

Do you have an updated price list for this week? Particularly interested in any changes to proteins and seasonal produce.

Thanks,
OpenCLAW Price Intelligence
ChefFlow - cheflowhq.com`
  }
}
