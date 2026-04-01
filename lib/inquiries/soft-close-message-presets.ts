// Soft-close A/B courtesy closeout presets.
// A = email-only, no Dinner Circle link, no snapshot.
// B = Dinner Circle link woven in, no snapshot by default.
// Both defaults are confirmed per spec: A is the default in soft-close mode.

export interface SoftClosePreset {
  subject: string
  body: string
  includeCircleLink: boolean
  includeSnapshot: boolean
}

export function buildPresetA(contactName: string, chefName: string): SoftClosePreset {
  const greeting = contactName ? `Hi ${contactName},` : 'Hi,'

  return {
    subject: `Thank you, ${contactName || 'and safe travels'}`,
    body: `${greeting}

Thank you for letting me know. I completely understand.

I would love to cook for you on a future visit, so please feel free to reach out anytime the timing lines up again.

Warmly,
${chefName}`,
    includeCircleLink: false,
    includeSnapshot: false,
  }
}

export function buildPresetB(
  contactName: string,
  chefName: string,
  circleUrl: string
): SoftClosePreset {
  const greeting = contactName ? `Hi ${contactName},` : 'Hi,'

  return {
    subject: 'Keeping this ready for a future visit',
    body: `${greeting}

Thank you for letting me know. I completely understand.

I kept your dinner page handy here in case you would like to revisit the ideas on a future trip:

${circleUrl}

No rush at all, and email is always fine too.

Warmly,
${chefName}`,
    includeCircleLink: true,
    includeSnapshot: false,
  }
}
