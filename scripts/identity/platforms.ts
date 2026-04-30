export const HANDLE_FALLBACK_CHAIN = [
  'ChefFlow',
  'ChefFlowHQ',
  'ChefFlowApp',
  'ChefFlowOfficial',
  'ChefFlowCo',
  'GetChefFlow',
  'UseChefFlow',
  'JoinChefFlow',
  'ChefFlowAI',
  'ChefFlowSystem',
] as const

export type HandleCandidate = (typeof HANDLE_FALLBACK_CHAIN)[number]

export type PlatformClassification =
  | 'CLAIM_NOW'
  | 'RESERVE_SOON'
  | 'CREATE_WHEN_NEEDED'
  | 'INFRA_DEV_CREATE_ONLY_WHEN_USED'
  | 'CHEFFLOW_INTERNAL_REQUIRED'
  | 'DO_NOT_CREATE'

export type PlatformKind = 'browser' | 'deferred' | 'internal'

export type PlatformJob = {
  id: string
  name: string
  classification: PlatformClassification
  kind: PlatformKind
  signupUrl: string | null
  resumeUrl: string | null
  notes: string
  lightweightReserve?: boolean
}

function browserJob(
  id: string,
  name: string,
  classification: 'CLAIM_NOW' | 'RESERVE_SOON',
  signupUrl: string,
  notes: string,
  lightweightReserve = false
): PlatformJob {
  return {
    id,
    name,
    classification,
    kind: 'browser',
    signupUrl,
    resumeUrl: signupUrl,
    notes,
    lightweightReserve,
  }
}

function deferredJob(
  id: string,
  name: string,
  classification: 'CREATE_WHEN_NEEDED' | 'INFRA_DEV_CREATE_ONLY_WHEN_USED' | 'DO_NOT_CREATE',
  signupUrl: string | null,
  notes: string
): PlatformJob {
  return {
    id,
    name,
    classification,
    kind: 'deferred',
    signupUrl,
    resumeUrl: signupUrl,
    notes,
  }
}

function internalJob(id: string, name: string, notes: string): PlatformJob {
  return {
    id,
    name,
    classification: 'CHEFFLOW_INTERNAL_REQUIRED',
    kind: 'internal',
    signupUrl: null,
    resumeUrl: null,
    notes,
  }
}

export const PLATFORM_JOBS: PlatformJob[] = [
  browserJob(
    'instagram',
    'Instagram',
    'CLAIM_NOW',
    'https://www.instagram.com/accounts/emailsignup/',
    'Primary consumer identity claim.'
  ),
  browserJob(
    'tiktok',
    'TikTok',
    'CLAIM_NOW',
    'https://www.tiktok.com/signup',
    'Primary short-form video identity claim.'
  ),
  browserJob(
    'youtube',
    'YouTube',
    'CLAIM_NOW',
    'https://www.youtube.com/create_channel',
    'Claim base channel identity after Google account access exists.'
  ),
  browserJob(
    'x-twitter',
    'X (Twitter)',
    'CLAIM_NOW',
    'https://x.com/i/flow/signup',
    'Primary public handle claim.'
  ),
  browserJob(
    'discord',
    'Discord (server + account)',
    'CLAIM_NOW',
    'https://discord.com/register',
    'Create account first, then human creates server when prompted.'
  ),
  browserJob(
    'whatsapp-business',
    'WhatsApp Business',
    'CLAIM_NOW',
    'https://business.whatsapp.com/products/business-app',
    'Phone verification is expected and must remain human controlled.'
  ),
  browserJob(
    'google',
    'Google (Account + Brand + YouTube base)',
    'CLAIM_NOW',
    'https://accounts.google.com/signup',
    'Base account used for brand and YouTube setup.'
  ),
  browserJob(
    'cloudflare',
    'Cloudflare',
    'CLAIM_NOW',
    'https://dash.cloudflare.com/sign-up',
    'Infrastructure control account.'
  ),
  browserJob(
    'stripe',
    'Stripe',
    'CLAIM_NOW',
    'https://dashboard.stripe.com/register',
    'Payments control account.'
  ),
  browserJob(
    'twilio',
    'Twilio',
    'CLAIM_NOW',
    'https://www.twilio.com/try-twilio',
    'Messaging and phone control account.'
  ),
  browserJob(
    'github-organization',
    'GitHub Organization',
    'CLAIM_NOW',
    'https://github.com/organizations/plan',
    'Create or reserve the organization handle.'
  ),

  browserJob(
    'threads',
    'Threads',
    'RESERVE_SOON',
    'https://www.threads.net/',
    'Reserve via linked Meta identity if lightweight.',
    true
  ),
  browserJob(
    'bluesky',
    'Bluesky',
    'RESERVE_SOON',
    'https://bsky.app/',
    'Reserve social handle.',
    true
  ),
  browserJob(
    'mastodon',
    'Mastodon',
    'RESERVE_SOON',
    'https://joinmastodon.org/servers',
    'Instance choice requires human confirmation.',
    true
  ),
  browserJob(
    'facebook-page',
    'Facebook Page',
    'RESERVE_SOON',
    'https://www.facebook.com/pages/create',
    'Reserve brand page handle.',
    true
  ),
  browserJob(
    'linkedin',
    'LinkedIn',
    'RESERVE_SOON',
    'https://www.linkedin.com/company/setup/new/',
    'Reserve company page identity.',
    true
  ),
  browserJob(
    'reddit',
    'Reddit',
    'RESERVE_SOON',
    'https://www.reddit.com/register/',
    'Reserve presence if account creation is lightweight.',
    true
  ),
  browserJob(
    'pinterest',
    'Pinterest',
    'RESERVE_SOON',
    'https://www.pinterest.com/business/create/',
    'Reserve brand account.',
    true
  ),
  browserJob(
    'snapchat',
    'Snapchat',
    'RESERVE_SOON',
    'https://accounts.snapchat.com/accounts/signup',
    'Reserve username only if lightweight.',
    true
  ),
  browserJob(
    'twitch',
    'Twitch',
    'RESERVE_SOON',
    'https://www.twitch.tv/signup',
    'Reserve channel handle.',
    true
  ),
  browserJob(
    'telegram',
    'Telegram',
    'RESERVE_SOON',
    'https://web.telegram.org/',
    'Phone verification expected.',
    true
  ),
  browserJob(
    'signal',
    'Signal',
    'RESERVE_SOON',
    'https://signal.org/download/',
    'Presence is phone-app based and likely human only.',
    true
  ),
  browserJob(
    'product-hunt',
    'Product Hunt',
    'RESERVE_SOON',
    'https://www.producthunt.com/signup',
    'Reserve founder or brand presence.',
    true
  ),
  browserJob(
    'indie-hackers',
    'Indie Hackers',
    'RESERVE_SOON',
    'https://www.indiehackers.com/sign-up',
    'Reserve startup community presence.',
    true
  ),
  browserJob(
    'hacker-news',
    'Hacker News (presence only)',
    'RESERVE_SOON',
    'https://news.ycombinator.com/login?goto=news',
    'Presence only, no brand posting system.',
    true
  ),
  browserJob(
    'crunchbase',
    'Crunchbase',
    'RESERVE_SOON',
    'https://www.crunchbase.com/register',
    'Reserve company profile if lightweight.',
    true
  ),
  browserJob(
    'wellfound',
    'AngelList / Wellfound',
    'RESERVE_SOON',
    'https://wellfound.com/recruit/signup',
    'Reserve startup profile if lightweight.',
    true
  ),

  deferredJob(
    'medium',
    'Medium',
    'CREATE_WHEN_NEEDED',
    'https://medium.com/m/signin',
    'Publishing surface, do not create yet.'
  ),
  deferredJob(
    'substack',
    'Substack',
    'CREATE_WHEN_NEEDED',
    'https://substack.com/sign-up',
    'Publishing surface, do not create yet.'
  ),
  deferredJob(
    'beehiiv',
    'Beehiiv',
    'CREATE_WHEN_NEEDED',
    'https://www.beehiiv.com/signup',
    'Newsletter surface, do not create yet.'
  ),
  deferredJob(
    'slack',
    'Slack',
    'CREATE_WHEN_NEEDED',
    'https://slack.com/get-started',
    'Workspace only when team workflow requires it.'
  ),
  deferredJob(
    'notion',
    'Notion',
    'CREATE_WHEN_NEEDED',
    'https://www.notion.so/signup',
    'Workspace only when needed.'
  ),
  deferredJob(
    'linear',
    'Linear',
    'CREATE_WHEN_NEEDED',
    'https://linear.app/signup',
    'Issue tracker only when needed.'
  ),
  deferredJob(
    'sentry',
    'Sentry',
    'CREATE_WHEN_NEEDED',
    'https://sentry.io/signup/',
    'Error tracking only when wired.'
  ),
  deferredJob(
    'posthog',
    'PostHog',
    'CREATE_WHEN_NEEDED',
    'https://app.posthog.com/signup',
    'Analytics only when wired.'
  ),
  deferredJob(
    'plausible',
    'Plausible',
    'CREATE_WHEN_NEEDED',
    'https://plausible.io/register',
    'Analytics only when wired.'
  ),
  deferredJob(
    'uptimerobot',
    'UptimeRobot',
    'CREATE_WHEN_NEEDED',
    'https://uptimerobot.com/signUp',
    'Monitoring only when selected.'
  ),
  deferredJob(
    'better-stack',
    'Better Stack',
    'CREATE_WHEN_NEEDED',
    'https://betterstack.com/users/sign-up',
    'Monitoring only when selected.'
  ),
  deferredJob(
    'paypal-business',
    'PayPal Business',
    'CREATE_WHEN_NEEDED',
    'https://www.paypal.com/business/sign-up',
    'Payments alternative, do not create yet.'
  ),
  deferredJob(
    'square',
    'Square',
    'CREATE_WHEN_NEEDED',
    'https://squareup.com/signup',
    'Payments alternative, do not create yet.'
  ),
  deferredJob(
    'sendgrid',
    'SendGrid',
    'CREATE_WHEN_NEEDED',
    'https://signup.sendgrid.com/',
    'Email provider only when selected.'
  ),
  deferredJob(
    'mailchimp',
    'Mailchimp',
    'CREATE_WHEN_NEEDED',
    'https://login.mailchimp.com/signup/',
    'Marketing email only when selected.'
  ),
  deferredJob(
    'convertkit',
    'ConvertKit',
    'CREATE_WHEN_NEEDED',
    'https://app.kit.com/users/signup',
    'Creator email only when selected.'
  ),
  deferredJob(
    'zapier',
    'Zapier',
    'CREATE_WHEN_NEEDED',
    'https://zapier.com/app/signup',
    'Automation only when needed.'
  ),
  deferredJob(
    'make',
    'Make',
    'CREATE_WHEN_NEEDED',
    'https://www.make.com/en/register',
    'Automation only when needed.'
  ),
  deferredJob(
    'ifttt',
    'IFTTT',
    'CREATE_WHEN_NEEDED',
    'https://ifttt.com/join',
    'Automation only when needed.'
  ),
  deferredJob(
    'typeform',
    'Typeform',
    'CREATE_WHEN_NEEDED',
    'https://admin.typeform.com/signup',
    'Forms only when needed.'
  ),
  deferredJob(
    'tally',
    'Tally',
    'CREATE_WHEN_NEEDED',
    'https://tally.so/signup',
    'Forms only when needed.'
  ),
  deferredJob(
    'calendly',
    'Calendly',
    'CREATE_WHEN_NEEDED',
    'https://calendly.com/signup',
    'Scheduling only when selected.'
  ),
  deferredJob(
    'cal-com',
    'Cal.com',
    'CREATE_WHEN_NEEDED',
    'https://app.cal.com/signup',
    'Scheduling only when selected.'
  ),
  deferredJob(
    'zoom',
    'Zoom',
    'CREATE_WHEN_NEEDED',
    'https://zoom.us/signup',
    'Video only when needed.'
  ),
  deferredJob(
    'loom',
    'Loom',
    'CREATE_WHEN_NEEDED',
    'https://www.loom.com/signup',
    'Video only when needed.'
  ),
  deferredJob(
    'canva',
    'Canva',
    'CREATE_WHEN_NEEDED',
    'https://www.canva.com/signup/',
    'Design only when needed.'
  ),
  deferredJob(
    'figma',
    'Figma',
    'CREATE_WHEN_NEEDED',
    'https://www.figma.com/signup/',
    'Design only when needed.'
  ),
  deferredJob(
    'framer',
    'Framer',
    'CREATE_WHEN_NEEDED',
    'https://www.framer.com/signup/',
    'Site builder only when needed.'
  ),
  deferredJob(
    'webflow',
    'Webflow',
    'CREATE_WHEN_NEEDED',
    'https://webflow.com/dashboard/signup',
    'Site builder only when needed.'
  ),
  deferredJob(
    'wix',
    'Wix',
    'CREATE_WHEN_NEEDED',
    'https://users.wix.com/signin/signup',
    'Site builder only when needed.'
  ),
  deferredJob(
    'shopify',
    'Shopify',
    'CREATE_WHEN_NEEDED',
    'https://www.shopify.com/signup',
    'Commerce only when needed.'
  ),
  deferredJob(
    'etsy',
    'Etsy',
    'CREATE_WHEN_NEEDED',
    'https://www.etsy.com/register',
    'Marketplace only when needed.'
  ),
  deferredJob(
    'gumroad',
    'Gumroad',
    'CREATE_WHEN_NEEDED',
    'https://gumroad.com/signup',
    'Commerce only when needed.'
  ),
  deferredJob(
    'lemon-squeezy',
    'Lemon Squeezy',
    'CREATE_WHEN_NEEDED',
    'https://app.lemonsqueezy.com/register',
    'Commerce only when needed.'
  ),
  deferredJob(
    'patreon',
    'Patreon',
    'CREATE_WHEN_NEEDED',
    'https://www.patreon.com/create',
    'Membership only when needed.'
  ),
  deferredJob(
    'ko-fi',
    'Ko-fi',
    'CREATE_WHEN_NEEDED',
    'https://ko-fi.com/account/signup',
    'Membership only when needed.'
  ),
  deferredJob(
    'yelp-business',
    'Yelp Business',
    'CREATE_WHEN_NEEDED',
    'https://biz.yelp.com/signup',
    'Business listing only when ready.'
  ),
  deferredJob(
    'tripadvisor',
    'Tripadvisor',
    'CREATE_WHEN_NEEDED',
    'https://www.tripadvisor.com/Owners',
    'Business listing only when ready.'
  ),
  deferredJob(
    'trustpilot',
    'Trustpilot',
    'CREATE_WHEN_NEEDED',
    'https://www.trustpilot.com/users/connect',
    'Review platform only when ready.'
  ),
  deferredJob(
    'g2',
    'G2',
    'CREATE_WHEN_NEEDED',
    'https://sell.g2.com/signup',
    'B2B review platform only when ready.'
  ),
  deferredJob(
    'capterra',
    'Capterra',
    'CREATE_WHEN_NEEDED',
    'https://www.capterra.com/vendors/sign-up',
    'B2B review platform only when ready.'
  ),
  deferredJob(
    'glassdoor',
    'Glassdoor',
    'CREATE_WHEN_NEEDED',
    'https://www.glassdoor.com/employers/sign-up/',
    'Employer profile only when hiring.'
  ),
  deferredJob(
    'indeed-employer',
    'Indeed Employer',
    'CREATE_WHEN_NEEDED',
    'https://www.indeed.com/hire',
    'Employer profile only when hiring.'
  ),
  deferredJob(
    'ziprecruiter',
    'ZipRecruiter',
    'CREATE_WHEN_NEEDED',
    'https://www.ziprecruiter.com/signup',
    'Employer profile only when hiring.'
  ),
  deferredJob(
    'handshake',
    'Handshake',
    'CREATE_WHEN_NEEDED',
    'https://joinhandshake.com/employers/',
    'Employer profile only when hiring.'
  ),

  deferredJob(
    'aws',
    'AWS',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://portal.aws.amazon.com/billing/signup',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'gcp',
    'GCP',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://console.cloud.google.com/freetrial',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'azure',
    'Azure',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://azure.microsoft.com/free/',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'digitalocean',
    'DigitalOcean',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://cloud.digitalocean.com/registrations/new',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'hetzner',
    'Hetzner',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://accounts.hetzner.com/signUp',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'fly-io',
    'Fly.io',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://fly.io/user/personal_access_tokens',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'render',
    'Render',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://dashboard.render.com/register',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'railway',
    'Railway',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://railway.app/login',
    'Cloud infra only when selected.'
  ),
  deferredJob(
    'docker-hub',
    'Docker Hub',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://hub.docker.com/signup',
    'Registry only when used.'
  ),
  deferredJob(
    'npm',
    'npm',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://www.npmjs.com/signup',
    'Package registry only when publishing.'
  ),
  deferredJob(
    'hugging-face',
    'Hugging Face',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://huggingface.co/join',
    'Model hub only when used.'
  ),
  deferredJob(
    'openai-platform',
    'OpenAI Platform',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://platform.openai.com/signup',
    'Registry completeness only. Do not create without explicit Founder Authority policy change.'
  ),
  deferredJob(
    'anthropic-console',
    'Anthropic Console',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://console.anthropic.com/',
    'Registry completeness only. Do not create without explicit Founder Authority policy change.'
  ),
  deferredJob(
    'google-ai-studio',
    'Google AI Studio',
    'INFRA_DEV_CREATE_ONLY_WHEN_USED',
    'https://aistudio.google.com/',
    'Registry completeness only. Do not create without explicit Founder Authority policy change.'
  ),

  internalJob(
    'chefflow-main-system-account',
    'ChefFlow main system account',
    'Canonical system identity.'
  ),
  internalJob(
    'chefflow-admin-account',
    'ChefFlow admin account',
    'Founder Authority admin identity.'
  ),
  internalJob('chefflow-support-account', 'ChefFlow support account', 'Support inbox identity.'),
  internalJob(
    'chefflow-bot-service-account',
    'ChefFlow bot/service account',
    'Automation service identity.'
  ),
  internalJob('chefflow-monitoring-account', 'ChefFlow monitoring account', 'Monitoring identity.'),
  internalJob('chefflow-billing-account', 'ChefFlow billing account', 'Billing identity.'),
  internalJob(
    'chefflow-test-chef-account',
    'ChefFlow test chef account',
    'Internal test chef identity.'
  ),
  internalJob(
    'chefflow-test-client-account',
    'ChefFlow test client account',
    'Internal test client identity.'
  ),
  internalJob(
    'chefflow-demo-public-account',
    'ChefFlow demo/public account',
    'Demo and public account identity.'
  ),
]

export function getRunnableJobs(includeReserve: boolean): PlatformJob[] {
  return PLATFORM_JOBS.filter((job) => {
    if (job.classification === 'CLAIM_NOW') return true
    if (includeReserve && job.classification === 'RESERVE_SOON') return true
    if (job.classification === 'CHEFFLOW_INTERNAL_REQUIRED') return true
    return false
  })
}

export function getDeferredJobs(): PlatformJob[] {
  return PLATFORM_JOBS.filter((job) => job.kind === 'deferred')
}
