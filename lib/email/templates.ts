// Email HTML templates — plain HTML with inline styles for broad email client support.

/** Base email shell. All action-specific emails compose into this. */
export function baseTemplate({
  title,
  body,
  actionUrl,
  actionLabel = 'Open ChefFlow',
  preheader,
}: {
  title: string
  body: string
  actionUrl?: string | null
  actionLabel?: string
  preheader?: string
}): string {
  const ctaBlock = actionUrl
    ? `
      <tr>
        <td align="center" style="padding: 28px 0 0;">
          <a href="${actionUrl}"
             style="display:inline-block;background:#c2410c;color:#fff;font-family:sans-serif;
                    font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;
                    padding:12px 28px;">
            ${actionLabel}
          </a>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escHtml(preheader)}&nbsp;‌</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f5f4f0;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;width:100%;background:#fff;border-radius:12px;
                      border:1px solid #e7e5e4;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#1c1917;padding:20px 32px;">
              <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                ChefFlow
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 0;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;
                         color:#1c1917;line-height:1.3;">
                ${escHtml(title)}
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                ${body}
              </p>
            </td>
          </tr>
          ${ctaBlock}
          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px 32px;">
              <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.5;">
                You're receiving this because you have a ChefFlow account.
                Log in to manage your notification preferences.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Escape HTML special characters to prevent injection in templates */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Convert plain newlines to <br> for use inside <p> tags */
export function nl2br(s: string): string {
  return escHtml(s).replace(/\n/g, '<br />')
}
