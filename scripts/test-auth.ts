import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const res = await page.request.post('http://localhost:3100/api/e2e/auth', {
    data: {
      email: 'davidferra13@gmail.com',
      password: process.env.DEV_PASSWORD || 'CHEF.jdgyuegf9924092.FLOW',
    },
  })
  console.log('Status:', res.status())
  console.log('Body:', await res.text())

  await browser.close()
}
main()
