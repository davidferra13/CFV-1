// Post-Event Circle Message Templates
// Deterministic (Formula > AI) templates for post-event circle communication.

export function generateThankYouCircleMessage(input: {
  clientName: string
  chefFirstName: string
  occasion: string | null
}): { body: string } {
  const clientFirst = input.clientName.split(' ')[0]

  let body = `Thank you for a wonderful evening, ${clientFirst}!`

  if (input.occasion) {
    body += ` I hope the ${input.occasion.toLowerCase()} was everything you wanted.`
  } else {
    body += ' I hope everyone enjoyed the meal.'
  }

  body += " I'll share photos here soon."
  body += `\n\n${input.chefFirstName}`

  return { body }
}

export function generatePhotoShareMessage(input: { chefFirstName: string; photoCount: number }): {
  body: string
} {
  const noun = input.photoCount === 1 ? 'photo' : 'photos'
  const body = `Here are some highlights from the evening! ${input.photoCount} ${noun} from your event are available on the event page.\n\n${input.chefFirstName}`

  return { body }
}
