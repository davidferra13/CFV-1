# Cloudflare Email Routing Setup

Routes `{alias}@cheflowhq.com` to ChefFlow's inbound email webhook.
Each chef gets a unique alias (auto-generated, e.g. `cf-a1b2c3d4@cheflowhq.com`).

## One-time setup (Cloudflare dashboard)

### 1. Enable Email Routing on cheflowhq.com

Cloudflare dashboard > cheflowhq.com > Email > Email Routing > Enable

### 2. Create an Email Worker

Cloudflare dashboard > Workers & Pages > Create Worker

Name it `chefflow-email-inbound`. Paste this code:

```javascript
export default {
  async email(message, env) {
    // Parse the to address to extract the alias
    const to = message.to

    // Read raw message (limit 1MB)
    const rawBytes = []
    const reader = message.raw.getReader()
    let totalBytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      rawBytes.push(value)
      totalBytes += value.length
      if (totalBytes > 1_000_000) break
    }

    // Parse headers from raw for subject and message-id
    const rawText = new TextDecoder().decode(
      rawBytes.reduce((a, b) => {
        const merged = new Uint8Array(a.length + b.length)
        merged.set(a)
        merged.set(b, a.length)
        return merged
      }, new Uint8Array(0))
    )

    const headerEnd = rawText.indexOf('\r\n\r\n')
    const headerSection = headerEnd > 0 ? rawText.slice(0, headerEnd) : rawText
    const bodySection = headerEnd > 0 ? rawText.slice(headerEnd + 4) : ''

    function extractHeader(name) {
      const re = new RegExp('^' + name + ':\\s*(.+)', 'im')
      const m = headerSection.match(re)
      return m ? m[1].trim() : ''
    }

    const subject = extractHeader('Subject')
    const messageId = extractHeader('Message-ID')
    const from = message.from || extractHeader('From')
    const threadId = extractHeader('References') || extractHeader('In-Reply-To') || messageId

    // Strip quoted replies (basic - take text before first "On ... wrote:")
    const bodyText = bodySection
      .replace(/\r\n/g, '\n')
      .split(/\nOn .{10,100} wrote:/)[0]
      .trim()

    await fetch(env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: bodyText,
        message_id: messageId,
        thread_id: threadId,
      }),
    })
  },
}
```

### 3. Set Worker environment variables

In the Worker settings > Variables:

| Variable         | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| `WEBHOOK_URL`    | `https://app.cheflowhq.com/api/webhooks/email/inbound`    |
| `WEBHOOK_SECRET` | Value of `INBOUND_EMAIL_WEBHOOK_SECRET` from `.env.local` |

### 4. Create a catch-all routing rule

Cloudflare dashboard > cheflowhq.com > Email > Email Routing > Routing Rules

Add rule:

- Match: `*@cheflowhq.com`
- Action: Send to Worker > `chefflow-email-inbound`

## Per-chef aliases

Each chef's unique alias is generated automatically on first inbox visit.
The address is shown at the top of their inbox page.

Format: `cf-{8 hex chars}@cheflowhq.com`

Chefs can forward anything to this address. It lands in their ChefFlow inbox
as an inbound communication signal.

## Testing

```bash
# Send a test email (requires curl + valid alias from the DB)
curl -X POST https://app.cheflowhq.com/api/webhooks/email/inbound \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <INBOUND_EMAIL_WEBHOOK_SECRET>" \
  -d '{
    "from": "Test Client <testclient@example.com>",
    "to": "cf-a1b2c3d4@cheflowhq.com",
    "subject": "Dinner inquiry for June 5",
    "text": "Hi, I am looking for a chef for 10 people on June 5th. Budget around $2,000.",
    "message_id": "<test-001@example.com>"
  }'
```

Expected: 200 `{"ok":true,"routed":true}`. Refresh /inbox to see the new thread.
