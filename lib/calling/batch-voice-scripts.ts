/**
 * Batch Voice Scripts - TwiML for Multi-Ingredient Vendor Calls
 *
 * Generates TwiML XML for batch availability calls where we ask a single vendor
 * about multiple ingredients in one call. Uses the same neural voice and SSML
 * patterns as the single-ingredient voice helpers.
 *
 * Flow:
 *   1. Greet vendor, announce item count
 *   2. Ask about first ingredient (yes/no)
 *   3. Gather route processes response, then serves next-ingredient TwiML
 *   4. Repeat until all ingredients asked
 *   5. Thank vendor and hang up
 */

import { DEFAULT_VOICE, speak, type SpeakPart } from '@/lib/calling/voice-helpers'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate the initial TwiML for a batch availability call.
 * Greets the vendor, states the item count, and asks about the first ingredient.
 */
export function generateBatchAvailabilityScript(params: {
  vendorName: string
  contactName: string | null
  ingredients: string[]
  callbackUrl: string
  gatherUrl: string
}): string {
  const { vendorName, contactName, ingredients, gatherUrl } = params
  const count = ingredients.length
  const firstIngredient = ingredients[0]

  const greetingParts: SpeakPart[] = ['Hey there, ', { type: 'break', ms: 200 }]

  if (contactName) {
    greetingParts.push(
      'this is a call for ',
      { type: 'emphasis', text: contactName },
      ' at ',
      { type: 'emphasis', text: vendorName },
      '. '
    )
  } else {
    greetingParts.push(
      "hope I'm not catching you at a bad time. ",
      { type: 'break', ms: 300 },
      "I'm checking in with ",
      { type: 'emphasis', text: vendorName },
      '. '
    )
  }

  greetingParts.push(
    { type: 'break', ms: 400 },
    `I have ${count} items to check availability on, so this should be quick. `,
    { type: 'break', ms: 500 },
    'First up, do you have ',
    { type: 'emphasis', text: firstIngredient },
    ' in stock right now?'
  )

  const greeting = speak(greetingParts)

  const prompt = speak([
    'Just a quick yes or no, ',
    { type: 'break', ms: 200 },
    'or press 1 for yes and 2 for no.',
  ])

  const escapedGatherUrl = gatherUrl.replace(/&/g, '&amp;')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">${greeting}</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${escapedGatherUrl}" method="POST" hints="yes, yeah, we do, absolutely, we have it, in stock, no, nope, sorry, out of stock, not right now" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">${prompt}</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">${escapeXml('No worries at all. Thanks for picking up, have a good one!')}</Say>
  <Hangup/>
</Response>`
}

/**
 * Generate TwiML to ask about the next ingredient in a batch call.
 * Called by the gather route after processing the previous ingredient's response.
 */
export function generateNextIngredientGather(params: {
  ingredient: string
  ingredientIndex: number
  totalIngredients: number
  gatherUrl: string
}): string {
  const { ingredient, ingredientIndex, totalIngredients, gatherUrl } = params
  const remaining = totalIngredients - ingredientIndex
  const isLast = ingredientIndex === totalIngredients - 1

  const transitionParts: SpeakPart[] = ['Got it, thanks. ', { type: 'break', ms: 300 }]

  if (isLast) {
    transitionParts.push('Last one. ', { type: 'break', ms: 200 })
  } else {
    transitionParts.push(`${remaining} more to go. `, { type: 'break', ms: 200 })
  }

  transitionParts.push(
    'How about ',
    { type: 'emphasis', text: ingredient },
    ', do you have that available?'
  )

  const question = speak(transitionParts)
  const escapedGatherUrl = gatherUrl.replace(/&/g, '&amp;')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">${question}</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${escapedGatherUrl}" method="POST" hints="yes, yeah, we do, absolutely, in stock, no, nope, sorry, out of stock" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">${escapeXml('Yes or no, or press 1 for yes, 2 for no.')}</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">${escapeXml('No worries, thanks for your time. Have a great day!')}</Say>
  <Hangup/>
</Response>`
}

/**
 * Generate closing TwiML after all ingredients have been asked about.
 * Summarizes the count and thanks the vendor.
 */
export function generateBatchClosingScript(totalIngredients: number): string {
  const closing = speak([
    "That's all ",
    { type: 'emphasis', text: `${totalIngredients}` },
    ' items. ',
    { type: 'break', ms: 300 },
    'Really appreciate you running through those with me. ',
    { type: 'break', ms: 200 },
    'Have a great day!',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">${closing}</Say>
  <Hangup/>
</Response>`
}
