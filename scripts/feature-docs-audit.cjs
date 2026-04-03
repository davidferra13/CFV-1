const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

function normalizeAppRoute(file) {
  let route = file.replace(/^app/, '');
  route = route.replace(/\\/g, '/');
  route = route.replace(/\/(page\.tsx|route\.(ts|tsx))$/, '');
  route = route.replace(/\/\([^/]+\)\//g, '/');
  route = route.replace(/\/\([^/]+\)/g, '');
  if (!route) route = '/';
  if (!route.startsWith('/')) route = '/' + route;
  return route;
}

function firstMatch(rules, value) {
  for (const [re, feature] of rules) {
    if (re.test(value)) return feature;
  }
  return null;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function pct(part, whole) {
  return whole ? ((part / whole) * 100).toFixed(1) : '0.0';
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ].join('\n');
}

function writeDoc(file, content) {
  fs.writeFileSync(file, `${content.trim()}\n`, 'utf8');
}

function readRegistryIds() {
  const text = fs.readFileSync('features/registry.ts', 'utf8');
  return [...text.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
}

function readInventoryMeta() {
  const text = fs.readFileSync('docs/feature-inventory.md', 'utf8');
  const lines = text.split(/\r?\n/);
  const map = new Map();

  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length !== 10) continue;
    if (cells[0] === 'id' || cells[0] === '---') continue;

    map.set(cells[0], {
      id: cells[0],
      name: cells[1],
      description: cells[2],
      category: cells[3],
      classification: cells[4],
      entryPoint: cells[5],
      location: cells[6],
      dependencies: cells[7],
      visibility: cells[8],
      status: cells[9],
    });
  }

  return map;
}

function collectPageRoutes() {
  const files = walk('app').filter((file) => /\/page\.tsx$/.test(file));
  return [...new Set(files.map(normalizeAppRoute))].sort();
}

function collectApiRoutes() {
  const files = walk('app').filter((file) => /\/route\.(ts|tsx)$/.test(file));
  return [...new Set(files.map(normalizeAppRoute))].sort();
}

function collectTables() {
  const text = fs.readFileSync('clean-schema.sql', 'utf8');
  return [...new Set([...text.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"public"\."([^"]+)"/g)].map((m) => m[1]))].sort();
}

function mapItems(values, rules, metaById) {
  return values.map((value) => {
    const feature = firstMatch(rules, value);
    return {
      value,
      feature,
      meta: feature ? metaById.get(feature) || null : null,
    };
  });
}

function bucketRoute(route) {
  if (route === '/') return '/';
  const parts = route.split('/').filter(Boolean);
  return parts[0] || '/';
}

function bucketTable(table) {
  const parts = table.split('_');
  return parts.length > 1 ? parts.slice(0, 2).join('_') : parts[0];
}

function summarizeBuckets(values, bucketFn) {
  const buckets = new Map();
  for (const value of values) {
    const bucket = bucketFn(value);
    const current = buckets.get(bucket) || [];
    current.push(value);
    buckets.set(bucket, current);
  }
  return [...buckets.entries()]
    .map(([bucket, members]) => ({
      bucket,
      count: members.length,
      members: members.sort(),
    }))
    .sort((a, b) => b.count - a.count || a.bucket.localeCompare(b.bucket));
}

function validateMappedFeatures(mapped, registryIds) {
  const unknown = [...new Set(mapped.map((item) => item.feature).filter(Boolean))]
    .filter((id) => !registryIds.has(id));

  if (unknown.length) {
    throw new Error(`Unknown feature ids in mapping rules: ${unknown.join(', ')}`);
  }
}

const PAGE_RULES = [
  [/^\/admin\/price-catalog(?:\/|$)/, 'admin-price-catalog-ops'],
  [/^\/admin\/flags(?:\/|$)/, 'admin-feature-flags'],
  [/^\/admin\/(beta|beta-surveys)(?:\/|$)/, 'admin-beta-research'],
  [/^\/admin\/(directory|directory-listings|referral-partners)(?:\/|$)/, 'admin-directory-moderation'],
  [/^\/admin\/(communications|conversations|hub|social|feedback)(?:\/|$)/, 'admin-communications-social'],
  [/^\/admin\/(users|clients|events|inquiries|cannabis)(?:\/|$)/, 'admin-user-event-ops'],
  [/^\/admin\/(financials|reconciliation|notifications|silent-failures|openclaw|system\/payments|presence)(?:\/|$)/, 'admin-financial-health-ops'],
  [/^\/admin(?:\/|$)/, 'admin-platform-overview'],
  [/^\/events\/new(?:\/|$)/, 'event-intake-builders'],
  [/^\/events\/[^/]+\/(schedule|guest-cards|dop|kds|service-time)(?:\/|$)/, 'event-run-of-show'],
  [/^\/events\/[^/]+\/(close-out|aar|financial|invoice|receipts?)(?:\/|$)/, 'event-closeout'],
  [/^\/aar(?:\/|$)/, 'event-closeout'],
  [/^\/events(?:\/|$)/, 'event-workspace'],
  [/^\/inquiries(?:\/|$)/, 'inquiry-pipeline'],
  [/^\/quotes(?:\/|$)/, 'quote-workbench'],
  [/^\/rate-card(?:\/|$)/, 'rate-card'],
  [/^\/calls(?:\/|$)/, 'calls-consultations'],
  [/^\/leads(?:\/|$)/, 'website-leads'],
  [/^\/guest-leads(?:\/|$)/, 'guest-lead-pipeline'],
  [/^\/prospecting(?:\/|$)/, 'prospecting-engine'],
  [/^\/proposals(?:\/|$)/, 'proposals-addons'],
  [/^\/contracts(?:\/|$)/, 'contracts-approvals'],
  [/^\/partners(?:\/|$)/, 'referral-partner-management'],
  [/^\/partner-signup(?:\/|$)/, 'referral-partner-management'],
  [/^\/partner-report\/[^/]+(?:\/|$)/, 'referral-partner-management'],
  [/^\/marketplace\/capture(?:\/|$)/, 'marketplace-capture-ingestion'],
  [/^\/marketplace(?:\/|$)/, 'marketplace-command-center'],
  [/^\/embed\/inquiry\/[^/]+(?:\/|$)/, 'embed-inquiry-widget'],
  [/^\/(book|book-now)(?:\/|$)/, 'public-booking-funnels'],
  [/^\/waitlist(?:\/|$)/, 'waitlist-management'],
  [/^\/culinary-board(?:\/|$)/, 'culinary-ideation-board'],
  [/^\/culinary\/menus\/engineering(?:\/|$)/, 'menu-engineering'],
  [/^\/culinary\/dish-index(?:\/|$)/, 'menu-engineering'],
  [/^\/recipes\/(sprint|import|dump)(?:\/|$)/, 'recipe-capture-import'],
  [/^\/recipes(?:\/|$)/, 'recipe-library'],
  [/^\/culinary\/recipes(?:\/|$)/, 'recipe-library'],
  [/^\/print\/menu\/[^/]+(?:\/|$)/, 'menu-management'],
  [/^\/menus(?:\/|$)/, 'menu-management'],
  [/^\/culinary\/menus(?:\/|$)/, 'menu-management'],
  [/^\/culinary\/ingredients(?:\/|$)/, 'ingredient-catalog'],
  [/^\/(prices|culinary\/price-catalog)(?:\/|$)/, 'ingredient-price-engine'],
  [/^\/culinary\/costing(?:\/|$)/, 'costing-suite'],
  [/^\/culinary\/(components|substitutions)(?:\/|$)/, 'culinary-components'],
  [/^\/culinary\/prep(?:\/|$)/, 'prep-planning'],
  [/^\/(vendors|culinary\/vendors)(?:\/|$)/, 'vendor-management'],
  [/^\/inventory(?:\/|$)/, 'inventory-procurement'],
  [/^\/food-cost(?:\/|$)/, 'food-cost-operations'],
  [/^\/(kitchen|stations)(?:\/|$)/, 'kitchen-stations-kds'],
  [/^\/meal-prep(?:\/|$)/, 'meal-prep-operations'],
  [/^\/nutrition\/[^/]+(?:\/|$)/, 'nutrition-analysis'],
  [/^\/guests(?:\/|$)/, 'guest-crm'],
  [/^\/culinary(?:\/|$)/, 'culinary-home'],
  [/^\/clients\/loyalty(?:\/|$)/, 'loyalty-rewards'],
  [/^\/clients\/(intake|preferences)(?:\/|$)/, 'client-preferences-intake'],
  [/^\/clients\/[^/]+\/preferences(?:\/|$)/, 'client-preferences-intake'],
  [/^\/intake\/[^/]+(?:\/|$)/, 'client-preferences-intake'],
  [/^\/clients\/communication(?:\/|$)/, 'client-communications'],
  [/^\/chat(?:\/|$)/, 'client-communications'],
  [/^\/clients\/insights(?:\/|$)/, 'client-insights'],
  [/^\/clients\/[^/]+\/recurring(?:\/|$)/, 'recurring-service-programs'],
  [/^\/clients\/recurring(?:\/|$)/, 'recurring-service-programs'],
  [/^\/clients\/gift-cards(?:\/|$)/, 'gift-cards-vouchers'],
  [/^\/clients(?:\/|$)/, 'client-crm'],
  [/^\/my-events(?:\/|$)/, 'client-portal-events'],
  [/^\/my-bookings(?:\/|$)/, 'client-portal-events'],
  [/^\/(my-profile|my-quotes|my-inquiries|my-chat|my-spending)(?:\/|$)/, 'client-portal-account'],
  [/^\/(circles|my-hub)(?:\/|$)/, 'dinner-circles-social-hub'],
  [/^\/hub\/[^/]+(?:\/|$)/, 'dinner-circles-social-hub'],
  [/^\/g\/[^/]+(?:\/|$)/, 'dinner-circles-social-hub'],
  [/^\/loyalty\/raffle(?:\/|$)/, 'monthly-raffle'],
  [/^\/(loyalty|my-rewards)(?:\/|$)/, 'loyalty-rewards'],
  [/^\/(feedback|surveys)(?:\/|$)/, 'feedback-surveys'],
  [/^\/(survey|guest-feedback)\/[^/]+(?:\/|$)/, 'feedback-surveys'],
  [/^\/(reviews|testimonials|reputation)(?:\/|$)/, 'reviews-testimonials-reputation'],
  [/^\/marketplace-chefs(?:\/|$)/, 'public-brand-marketing-site'],
  [/^\/chefs(?:\/|$)/, 'public-chef-marketplace'],
  [/^\/chef\/[^/]+(?:\/|$)/, 'public-chef-marketplace'],
  [/^\/discover(?:\/|$)/, 'public-food-discovery-directory'],
  [/^\/$/, 'public-brand-marketing-site'],
  [/^\/(for-operators|compare.*|customers.*|about|faq|contact|trust|privacy.*|terms)(?:\/|$)/, 'public-brand-marketing-site'],
  [/^\/network(?:\/|$)/, 'network-community'],
  [/^\/community\/templates(?:\/|$)/, 'community-template-exchange'],
  [/^\/marketing(?:\/|$)/, 'marketing-campaigns'],
  [/^\/social(?:\/|$)/, 'social-publishing'],
  [/^\/content(?:\/|$)/, 'content-pipeline'],
  [/^\/portfolio(?:\/|$)/, 'portfolio-public-assets'],
  [/^\/settings\/favorite-chefs(?:\/|$)/, 'favorite-chef-curation'],
  [/^\/settings\/(public-profile|highlights|portfolio|culinary-profile|repertoire)(?:\/|$)/, 'portfolio-public-assets'],
  [/^\/guest-analytics(?:\/|$)/, 'guest-analytics'],
  [/^\/charity(?:\/|$)/, 'charity-programs'],
  [/^\/(cannabis|chef\/cannabis|my-cannabis)(?:\/|$)/, 'cannabis-vertical'],
  [/^\/cannabis-invite\/[^/]+(?:\/|$)/, 'cannabis-vertical'],
  [/^\/(beta|beta-survey)(?:\/|$)/, 'public-beta-program'],
  [/^\/finance\/expenses(?:\/|$)/, 'expense-management'],
  [/^\/finance\/invoices(?:\/|$)/, 'invoicing-billing'],
  [/^\/finance\/payments(?:\/|$)/, 'payments-collections'],
  [/^\/finance\/payouts(?:\/|$)/, 'payouts-reconciliation'],
  [/^\/finance\/ledger(?:\/|$)/, 'ledger-accounting'],
  [/^\/finance\/reporting(?:\/|$)/, 'finance-reporting'],
  [/^\/finance\/(tax|sales-tax|year-end)(?:\/|$)/, 'tax-compliance'],
  [/^\/finance\/payroll(?:\/|$)/, 'payroll-contractors'],
  [/^\/finance\/(forecast|goals|planning|plate-costs|recurring|retainers)(?:\/|$)/, 'goals-planning'],
  [/^\/finance\/bank-feed(?:\/|$)/, 'ledger-accounting'],
  [/^\/finance\/disputes(?:\/|$)/, 'payments-collections'],
  [/^\/finance(?:\/|$)/, 'finance-home'],
  [/^\/dashboard(?:\/|$)/, 'dashboard-command-center'],
  [/^\/activity(?:\/|$)/, 'activity-queue'],
  [/^\/daily(?:\/|$)/, 'daily-ops-planner'],
  [/^\/(calendar|schedule|production)(?:\/|$)/, 'calendar-schedule'],
  [/^\/availability\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/availability(?:\/|$)/, 'availability-broadcaster'],
  [/^\/travel(?:\/|$)/, 'travel-production'],
  [/^\/operations\/(equipment|kitchen-rentals)(?:\/|$)/, 'operations-equipment'],
  [/^\/operations(?:\/|$)/, 'dashboard-command-center'],
  [/^\/staff-(dashboard|recipes|schedule|station|tasks|time)(?:\/|$)/, 'public-staff-experience'],
  [/^\/staff-login(?:\/|$)/, 'public-staff-experience'],
  [/^\/staff-portal\/[^/]+(?:\/|$)/, 'public-staff-experience'],
  [/^\/staff\/(availability|clock|labor|live|performance|schedule)(?:\/|$)/, 'staff-management'],
  [/^\/staff\/[^/]+(?:\/|$)/, 'staff-management'],
  [/^\/staff(?:\/|$)/, 'staff-management'],
  [/^\/tasks(?:\/|$)/, 'tasks-stations'],
  [/^\/notifications(?:\/|$)/, 'notifications-center'],
  [/^\/inbox(?:\/|$)/, 'inbox-and-chat'],
  [/^\/documents(?:\/|$)/, 'documents-workspace'],
  [/^\/analytics\/reports(?:\/|$)/, 'custom-reports'],
  [/^\/analytics(?:\/|$)/, 'analytics-hub'],
  [/^\/reports(?:\/|$)/, 'custom-reports'],
  [/^\/insights(?:\/|$)/, 'insights-suite'],
  [/^\/intelligence(?:\/|$)/, 'intelligence-hub'],
  [/^\/remy(?:\/|$)/, 'remy-ai-platform'],
  [/^\/settings\/dashboard(?:\/|$)/, 'dashboard-command-center'],
  [/^\/settings\/automations(?:\/|$)/, 'automations-touchpoints'],
  [/^\/settings\/touchpoints(?:\/|$)/, 'automations-touchpoints'],
  [/^\/settings\/modules(?:\/|$)/, 'module-gating-and-focus-mode'],
  [/^\/settings\/notifications(?:\/|$)/, 'notifications-center'],
  [/^\/settings\/remy(?:\/|$)/, 'remy-ai-platform'],
  [/^\/settings\/menu-engine(?:\/|$)/, 'menu-engineering'],
  [/^\/settings\/menu-templates(?:\/|$)/, 'menu-management'],
  [/^\/settings\/(compliance|protection|emergency|health|incidents)(?:\/|$)/, 'safety-protection'],
  [/^\/settings\/embed(?:\/|$)/, 'embed-inquiry-widget'],
  [/^\/settings\/stripe-connect(?:\/|$)/, 'payments-collections'],
  [/^\/settings\/(webhooks|zapier|yelp|integrations|platform-connections|calendar-sync|api-keys)(?:\/|$)/, 'integrations-webhooks'],
  [/^\/settings\/client-preview(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/settings\/contracts(?:\/|$)/, 'contracts-approvals'],
  [/^\/settings\/event-types(?:\/|$)/, 'public-booking-funnels'],
  [/^\/settings\/delete-account(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/settings\/ai-privacy(?:\/|$)/, 'remy-ai-platform'],
  [/^\/settings\/print(?:\/|$)/, 'documents-workspace'],
  [/^\/settings\/professional(?:\/|$)/, 'growth-hub'],
  [/^\/settings\/(billing|communication|credentials|custom-fields|devices|journal|journey|my-profile|my-services|payment-methods|pricing|profile|store-preferences|taxonomy|templates)(?:\/|$)/, 'settings-control-plane'],
  [/^\/settings(?:\/|$)/, 'settings-control-plane'],
  [/^\/auth(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/onboarding(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/unauthorized(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/view\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/client\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/partner\/(?:dashboard|events|locations|preview|profile)(?:\/|$)/, 'partner-portal'],
  [/^\/kiosk(?:\/|$)/, 'kiosk-device-fleet'],
  [/^\/demo(?:\/|$)/, 'public-demo-mode'],
  [/^\/help(?:\/|$)/, 'help-guidance'],
  [/^\/import(?:\/|$)/, 'import-pipelines'],
  [/^\/unsubscribe(?:\/|$)/, 'marketing-campaigns'],
  [/^\/dev\/simulate(?:\/|$)/, 'developer-simulation-lab'],
  [/^\/commerce\/(products|promotions)(?:\/|$)/, 'commerce-catalog'],
  [/^\/commerce\/(orders|schedules|table-service)(?:\/|$)/, 'commerce-service-modes'],
  [/^\/commerce\/(register|virtual-terminal)(?:\/|$)/, 'commerce-register'],
  [/^\/commerce\/(reports|reconciliation|sales|settlements|observability|parity)(?:\/|$)/, 'commerce-reporting-settlements'],
  [/^\/commerce(?:\/|$)/, 'commerce-register'],
  [/^\/safety(?:\/|$)/, 'safety-protection'],
  [/^\/goals(?:\/|$)/, 'goals-planning'],
  [/^\/expenses(?:\/|$)/, 'expense-management'],
  [/^\/share\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/wix-submissions(?:\/|$)/, 'wix-processing'],
  [/^\/briefing(?:\/|$)/, 'morning-briefing'],
  [/^\/commands(?:\/|$)/, 'mission-control-launcher'],
  [/^\/consulting(?:\/|$)/, 'consulting-toolkit'],
  [/^\/event\/[^/]+\/guest\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/financials(?:\/|$)/, 'finance-home'],
  [/^\/growth(?:\/|$)/, 'growth-hub'],
  [/^\/payments\/splitting(?:\/|$)/, 'payments-collections'],
  [/^\/proposal\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/queue(?:\/|$)/, 'activity-queue'],
  [/^\/reactivate-account(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/receipts(?:\/|$)/, 'expense-management'],
  [/^\/review\/[^/]+(?:\/|$)/, 'reviews-testimonials-reputation'],
  [/^\/scheduling(?:\/|$)/, 'calendar-schedule'],
  [/^\/team(?:\/|$)/, 'team-collaboration'],
  [/^\/tip\/[^/]+(?:\/|$)/, 'payments-collections'],
  [/^\/worksheet\/[^/]+(?:\/|$)/, 'tokenized-service-pages'],
];

const API_RULES = [
  [/^\/auth\/callback(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/api\/auth(?:\/|$)/, 'auth-and-onboarding'],
  [/^\/api\/e2e\/auth(?:\/|$)/, 'developer-simulation-lab'],
  [/^\/api\/demo(?:\/|$)/, 'public-demo-mode'],
  [/^\/api\/activity(?:\/|$)/, 'activity-queue'],
  [/^\/api\/admin\/directory(?:\/|$)/, 'admin-directory-moderation'],
  [/^\/api\/ai(?:\/|$)/, 'remy-ai-platform'],
  [/^\/api\/book(?:\/|$)/, 'public-booking-funnels'],
  [/^\/book\/[^/]+\/availability(?:\/|$)/, 'public-booking-funnels'],
  [/^\/api\/calendar\/event(?:\/|$)/, 'calendar-schedule'],
  [/^\/api\/cannabis(?:\/|$)/, 'cannabis-vertical'],
  [/^\/api\/clients\/preferences(?:\/|$)/, 'client-preferences-intake'],
  [/^\/api\/comms\/sms(?:\/|$)/, 'notifications-center'],
  [/^\/api\/cron\/(openclaw-polish|openclaw-sync|price-sync)(?:\/|$)/, 'price-sync-local-mirror'],
  [/^\/api\/cron\/morning-briefing(?:\/|$)/, 'morning-briefing'],
  [/^\/api\/cron\/circle-digest(?:\/|$)/, 'dinner-circles-social-hub'],
  [/^\/api\/scheduled\/wix-process(?:\/|$)/, 'wix-processing'],
  [/^\/api\/scheduled\/campaigns(?:\/|$)/, 'marketing-campaigns'],
  [/^\/api\/scheduled\/reviews-sync(?:\/|$)/, 'reviews-testimonials-reputation'],
  [/^\/api\/scheduled\/raffle-draw(?:\/|$)/, 'monthly-raffle'],
  [/^\/api\/scheduled\/waitlist-sweep(?:\/|$)/, 'waitlist-management'],
  [/^\/api\/scheduled\/social-publish(?:\/|$)/, 'social-publishing'],
  [/^\/api\/scheduled\/daily-report(?:\/|$)/, 'morning-briefing'],
  [/^\/api\/scheduled\/email-history-scan(?:\/|$)/, 'inbox-and-chat'],
  [/^\/api\/scheduled\/follow-ups(?:\/|$)/, 'client-communications'],
  [/^\/api\/scheduled\/revenue-goals(?:\/|$)/, 'goals-planning'],
  [/^\/api\/scheduled\/simulation(?:\/|$)/, 'developer-simulation-lab'],
  [/^\/api\/scheduled\/integrations(?:\/|$)/, 'integrations-webhooks'],
  [/^\/api\/scheduled\/sequences(?:\/|$)/, 'marketing-campaigns'],
  [/^\/api\/scheduled\/monitor(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/cron(?:\/|$)/, 'background-job-orchestrator'],
  [/^\/api\/scheduled(?:\/|$)/, 'background-job-orchestrator'],
  [/^\/api\/documents(?:\/|$)/, 'pdf-document-services'],
  [/^\/api\/v2\/documents(?:\/|$)/, 'pdf-document-services'],
  [/^\/api\/embed\/inquiry(?:\/|$)/, 'embed-inquiry-widget'],
  [/^\/api\/feeds\/calendar(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/feed\.xml(?:\/|$)/, 'public-chef-marketplace'],
  [/^\/api\/gmail\/sync(?:\/|$)/, 'inbox-and-chat'],
  [/^\/api\/monitoring(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/qol(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/health(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/system\/(?:health|heal)(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/sentinel(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/build-version(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/ollama-status(?:\/|$)/, 'platform-health-monitoring'],
  [/^\/api\/inngest(?:\/|$)/, 'background-job-orchestrator'],
  [/^\/api\/integrations(?:\/|$)/, 'integrations-webhooks'],
  [/^\/api\/social\/(?:google|instagram)(?:\/|$)/, 'integrations-webhooks'],
  [/^\/api\/stripe\/connect\/callback(?:\/|$)/, 'payments-collections'],
  [/^\/api\/kiosk(?:\/|$)/, 'kiosk-device-fleet'],
  [/^\/api\/menus\/upload(?:\/|$)/, 'menu-management'],
  [/^\/api\/notifications(?:\/|$)/, 'notifications-center'],
  [/^\/api\/openclaw\/image(?:\/|$)/, 'price-sync-local-mirror'],
  [/^\/api\/prospecting(?:\/|$)/, 'prospecting-engine'],
  [/^\/api\/public\/client-lookup(?:\/|$)/, 'tokenized-service-pages'],
  [/^\/api\/push(?:\/|$)/, 'realtime-push-fabric'],
  [/^\/api\/realtime(?:\/|$)/, 'realtime-push-fabric'],
  [/^\/api\/remy(?:\/|$)/, 'remy-ai-platform'],
  [/^\/api\/reports\/financial(?:\/|$)/, 'finance-reporting'],
  [/^\/api\/scheduling\/availability(?:\/|$)/, 'availability-broadcaster'],
  [/^\/api\/storage(?:\/|$)/, 'api-service-layer'],
  [/^\/api\/v2\/booking\/instant-checkout(?:\/|$)/, 'public-booking-funnels'],
  [/^\/api\/v2\/calls(?:\/|$)/, 'calls-consultations'],
  [/^\/api\/v2\/clients(?:\/|$)/, 'client-crm'],
  [/^\/api\/v2\/commerce\/products(?:\/|$)/, 'commerce-catalog'],
  [/^\/api\/v2\/commerce\/promotions(?:\/|$)/, 'commerce-catalog'],
  [/^\/api\/v2\/commerce\/checkout(?:\/|$)/, 'commerce-service-modes'],
  [/^\/api\/v2\/commerce\/register(?:\/|$)/, 'commerce-register'],
  [/^\/api\/v2\/commerce\/(?:reports|sales|settlements)(?:\/|$)/, 'commerce-reporting-settlements'],
  [/^\/api\/v2\/events(?:\/|$)/, 'event-workspace'],
  [/^\/api\/v2\/expenses(?:\/|$)/, 'expense-management'],
  [/^\/api\/v2\/financials\/summary(?:\/|$)/, 'finance-reporting'],
  [/^\/api\/v2\/goals(?:\/|$)/, 'goals-planning'],
  [/^\/api\/v2\/inquiries(?:\/|$)/, 'inquiry-pipeline'],
  [/^\/api\/v2\/inventory(?:\/|$)/, 'inventory-procurement'],
  [/^\/api\/v2\/invoices(?:\/|$)/, 'invoicing-billing'],
  [/^\/api\/v2\/ledger(?:\/|$)/, 'ledger-accounting'],
  [/^\/api\/v2\/loyalty\/raffles(?:\/|$)/, 'monthly-raffle'],
  [/^\/api\/v2\/loyalty\/vouchers(?:\/|$)/, 'gift-cards-vouchers'],
  [/^\/api\/v2\/loyalty(?:\/|$)/, 'loyalty-rewards'],
  [/^\/api\/v2\/marketing\/social-templates(?:\/|$)/, 'social-publishing'],
  [/^\/api\/v2\/marketing(?:\/|$)/, 'marketing-campaigns'],
  [/^\/api\/v2\/menus(?:\/|$)/, 'menu-management'],
  [/^\/api\/v2\/notifications(?:\/|$)/, 'notifications-center'],
  [/^\/api\/v2\/partners(?:\/|$)/, 'referral-partner-management'],
  [/^\/api\/v2\/payments(?:\/|$)/, 'payments-collections'],
  [/^\/api\/v2\/queue(?:\/|$)/, 'activity-queue'],
  [/^\/api\/v2\/quotes(?:\/|$)/, 'quote-workbench'],
  [/^\/api\/v2\/recipes(?:\/|$)/, 'recipe-library'],
  [/^\/api\/v2\/remy(?:\/|$)/, 'remy-ai-platform'],
  [/^\/api\/v2\/safety(?:\/|$)/, 'safety-protection'],
  [/^\/api\/v2\/search(?:\/|$)/, 'api-service-layer'],
  [/^\/api\/v2\/settings\/automations(?:\/|$)/, 'automations-touchpoints'],
  [/^\/api\/v2\/settings\/booking(?:\/|$)/, 'public-booking-funnels'],
  [/^\/api\/v2\/settings\/dashboard(?:\/|$)/, 'dashboard-command-center'],
  [/^\/api\/v2\/settings\/menu-engine(?:\/|$)/, 'menu-engineering'],
  [/^\/api\/v2\/settings\/modules(?:\/|$)/, 'module-gating-and-focus-mode'],
  [/^\/api\/v2\/settings\/notification-tiers(?:\/|$)/, 'notifications-center'],
  [/^\/api\/v2\/settings\/pricing(?:\/|$)/, 'settings-control-plane'],
  [/^\/api\/v2\/settings\/tax-rates(?:\/|$)/, 'tax-compliance'],
  [/^\/api\/v2\/settings\/(?:preferences|taxonomy)(?:\/|$)/, 'settings-control-plane'],
  [/^\/api\/v2\/staff(?:\/|$)/, 'staff-management'],
  [/^\/api\/v2\/taxonomy(?:\/|$)/, 'settings-control-plane'],
  [/^\/api\/v2\/vendors(?:\/|$)/, 'vendor-management'],
  [/^\/api\/v2\/webhooks(?:\/|$)/, 'integrations-webhooks'],
  [/^\/api\/webhooks\/docusign(?:\/|$)/, 'contracts-approvals'],
  [/^\/api\/webhooks\/resend(?:\/|$)/, 'marketing-campaigns'],
  [/^\/api\/webhooks\/stripe(?:\/|$)/, 'payments-collections'],
  [/^\/api\/webhooks\/twilio(?:\/|$)/, 'notifications-center'],
  [/^\/api\/webhooks\/wix(?:\/|$)/, 'wix-processing'],
  [/^\/api\/webhooks\/[^/]+(?:\/|$)/, 'integrations-webhooks'],
  [/^\/admin\/price-catalog\/csv-export(?:\/|$)/, 'admin-price-catalog-ops'],
  [/^\/clients\/csv-export(?:\/|$)/, 'client-crm'],
  [/^\/culinary\/price-catalog\/csv-export(?:\/|$)/, 'ingredient-price-engine'],
  [/^\/events\/csv-export(?:\/|$)/, 'event-workspace'],
  [/^\/finance\/year-end\/export(?:\/|$)/, 'tax-compliance'],
  [/^\/finance\/export(?:\/|$)/, 'finance-reporting'],
];

const TABLE_RULES = [
  [/^after_action_reviews$/, 'event-closeout'],
  [/^event_(feedback|surveys|waste|leftover)s?$/, 'event-closeout'],
  [/^events$/, 'event-workspace'],
  [/^event_/, 'event-run-of-show'],
  [/^inquiries$/, 'inquiry-pipeline'],
  [/^inquiry_/, 'inquiry-pipeline'],
  [/^quotes$/, 'quote-workbench'],
  [/^quote_/, 'quote-workbench'],
  [/^scheduled_calls$/, 'calls-consultations'],
  [/^guest_leads$/, 'guest-lead-pipeline'],
  [/^prospects?$|^prospect_/, 'prospecting-engine'],
  [/^proposal_/, 'proposals-addons'],
  [/^(contract_templates|client_ndas|subcontract_agreements)$/, 'contracts-approvals'],
  [/^event_contract/, 'contracts-approvals'],
  [/^(referral_partners|referral_request)$/, 'referral-partner-management'],
  [/^booking_/, 'public-booking-funnels'],
  [/^waitlist_entries$/, 'waitlist-management'],
  [/^(marketplace_client|marketplace_profiles|chef_marketplace|rebook_tokens)$/, 'marketplace-command-center'],
  [/^contact_submissions$/, 'inquiry-pipeline'],
  [/^(chef_culinary_words|chef_creative|seasonal_palettes)$/, 'culinary-ideation-board'],
  [/^(menus|menu_.*|tasting_menu|tasting_menus|service_courses|plating_guides)$/, 'menu-management'],
  [/^(dishes|dish_.*)$/, 'menu-engineering'],
  [/^(recipes|recipe_.*)$/, 'recipe-library'],
  [/^(ingredients|ingredient_shelf|sourcing_entries|aisle_preferences|seasonal_availability|system_ingredients)$/, 'ingredient-catalog'],
  [/^(ingredient_price|grocery_price_.*|grocery_spend|smart_grocery.*|store_item|vendor_price.*|public_ingredient)$/, 'ingredient-price-engine'],
  [/^components$/, 'culinary-components'],
  [/^(shopping_.*|pantry_.*|packing_.*)$/, 'prep-planning'],
  [/^(vendors|vendor_catalog|vendor_document|vendor_items|vendor_preferred)$/, 'vendor-management'],
  [/^(vendor_invoices|vendor_invoice_.*)$/, 'vendor-management'],
  [/^(purchase_order|purchase_orders|inventory_.*|stocktake_.*|storage_locations)$/, 'inventory-procurement'],
  [/^(waste_log|waste_logs|unused_ingredients|demand_forecasts)$/, 'food-cost-operations'],
  [/^(meal_prep.*|client_meal.*|container_.*)$/, 'meal-prep-operations'],
  [/^(guests|guest_.*|household_members|households)$/, 'guest-crm'],
  [/^(kds_tickets|stations|station_.*|clipboard_entries|front_of_.*)$/, 'kitchen-stations-kds'],
  [/^(recipe_nutrition|dietary_.*)$/, 'nutrition-analysis'],
  [/^(bakery_.*|truck_.*|wholesale_.*|display_case_.*|daily_specials|commerce_dining.*|order_queue|order_requests|product_modifier.*|product_public|product_projections|public_product|business_locations)$/, 'food-operator-retail-ops'],
  [/^clients$/, 'client-crm'],
  [/^(client_tags|client_segments|client_quick|client_invitations|client_connections|client_kitchen|client_photos|client_referrals)$/, 'client-crm'],
  [/^(client_preferences|client_preference|client_allergy_.*|client_intake_.*)$/, 'client-preferences-intake'],
  [/^(client_notes|client_followup_.*|client_outreach|follow_up|followup_rules|communication_log|communication_.*)$/, 'client-communications'],
  [/^(chat_messages|messages|conversation_.*|conversations|conversation_threads)$/, 'inbox-and-chat'],
  [/^(client_reviews|client_satisfaction|guest_testimonials|testimonials|external_review|external_reviews|feedback_requests|feedback_responses)$/, 'reviews-testimonials-reputation'],
  [/^favorite_chefs$/, 'favorite-chef-curation'],
  [/^(recurring_services|recurring_schedules|recurring_menu|recurring_invoice|recurring_invoices)$/, 'recurring-service-programs'],
  [/^(client_gift_.*|gift_cards|gift_card_.*|gift_certificates)$/, 'gift-cards-vouchers'],
  [/^(cooking_classes|class_registrations)$/, 'cooking-classes'],
  [/^(hub_.*|community_messages|community_profiles)$/, 'dinner-circles-social-hub'],
  [/^(loyalty_config|loyalty_reward|loyalty_rewards|loyalty_transactions|client_incentives|incentive_deliveries|incentive_redemptions)$/, 'loyalty-rewards'],
  [/^(raffle_entries|raffle_rounds)$/, 'monthly-raffle'],
  [/^community_templates$/, 'community-template-exchange'],
  [/^(chef_network.*|chef_connections|chef_follows|hub_chef)$/, 'network-community'],
  [/^mentorship_.*$/, 'mentorship-exchange'],
  [/^(beta_signup_trackers|beta_signups|beta_signup|beta_survey_.*|feature_requests|feature_votes)$/, 'public-beta-program'],
  [/^(campaign_recipients|campaign_templates|marketing_campaigns|email_sequences|email_sequence_.*|outreach_campaigns|newsletter_subscribers|ab_tests)$/, 'marketing-campaigns'],
  [/^(social_.*|chef_post.*|chef_social.*|content_performance)$/, 'social-publishing'],
  [/^(portfolio_items|profile_highlights|professional_achievements|entity_photos|entity_templates|chef_portfolio|chef_story.*|chef_stories|chef_brand|public_media)$/, 'portfolio-public-assets'],
  [/^chefs$/, 'public-chef-marketplace'],
  [/^(public_data|public_food|public_location|public_weather|chef_directory)$/, 'public-food-discovery-directory'],
  [/^(expenses|expense_tax|mileage_logs|marketing_spend)$/, 'expense-management'],
  [/^(invoices|invoice_.*)$/, 'invoicing-billing'],
  [/^(payment_disputes|payment_plan)$/, 'payments-collections'],
  [/^(platform_payouts|stripe_transfers|settlement_records)$/, 'payouts-reconciliation'],
  [/^(bank_connections|bank_transactions|ledger_entries)$/, 'ledger-accounting'],
  [/^(tax_.*|sales_tax.*|tax_collected|tax_filings|tax_jurisdictions|tax_settings)$/, 'tax-compliance'],
  [/^(payroll_.*|employees|contractor_payments|contractor_service)$/, 'payroll-contractors'],
  [/^(goal_.*|learning_goals|retainers|retainer_periods|retirement_contributions|chef_goals|chef_budgets)$/, 'goals-planning'],
  [/^(cash_drawer|register_sessions|sales|sale_.*|daily_reconciliation|daily_revenue|pos_alert|pos_metric)$/, 'commerce-reporting-settlements'],
  [/^commerce_promotions$/, 'commerce-catalog'],
  [/^(activity_events|activity_events_archive|chef_activity|chef_breadcrumbs)$/, 'activity-queue'],
  [/^(daily_plan.*|daily_reports|chef_daily)$/, 'daily-ops-planner'],
  [/^(scheduled_calls|chef_calendar|chef_scheduling|time_blocks)$/, 'calendar-schedule'],
  [/^(chef_availability.*|booking_availability_.*|booking_date_.*|booking_daily_.*|availability_signal_.*|chef_capacity)$/, 'availability-broadcaster'],
  [/^(travel_leg|vehicle_maintenance)$/, 'travel-production'],
  [/^(event_equipment.*|chef_equipment.*|equipment_.*|kitchen_rentals)$/, 'operations-equipment'],
  [/^(staff_.*|scheduled_shifts|shift_.*|tip_distributions|tip_entries|tip_pool)$/, 'staff-management'],
  [/^(chef_handoff.*|chef_handoffs|chef_team)$/, 'team-collaboration'],
  [/^(tasks|task_.*|chef_todos|va_tasks|sops|sop_completions)$/, 'tasks-stations'],
  [/^(notifications|notification_.*|sms_messages|sms_send)$/, 'notifications-center'],
  [/^(document_comments|document_versions|chef_documents|chef_folders)$/, 'documents-workspace'],
  [/^(document_intelligence.*|receipt_extractions|receipt_line|receipt_photos)$/, 'document-intelligence'],
  [/^(automation_.*|automated_sequences|workflow_.*|zapier_webhook.*|chef_automation)$/, 'automations-touchpoints'],
  [/^(integration_.*|webhook_.*|google_connections|google_mailboxes|wix_connections|chef_api)$/, 'integrations-webhooks'],
  [/^wix_submissions$/, 'wix-processing'],
  [/^(devices|device_events|device_sessions)$/, 'mobile-portal-surfaces'],
  [/^(qr_codes|qr_scans)$/, 'kiosk-device-fleet'],
  [/^push_subscriptions$/, 'realtime-push-fabric'],
  [/^mutation_idempotency$/, 'api-service-layer'],
  [/^(cron_executions|workflow_executions|workflow_execution|ai_task_queue|job_retry|dead_letter)$/, 'background-job-orchestrator'],
  [/^(admin_audit_log|admin_time_logs)$/, 'admin-platform-overview'],
  [/^(platform_action|platform_records|platform_snapshots|audit_log)$/, 'founder-command-hub'],
  [/^(platform_settings|tenant_settings|custom_field.*|reorder_settings|response_templates|smart_field|chef_business)$/, 'settings-control-plane'],
  [/^(chef_feature|user_roles)$/, 'feature-flag-and-tier-system'],
  [/^(ai_preferences|copilot_.*|remy_.*|fine_tuning)$/, 'remy-ai-platform'],
  [/^(benchmark_snapshots|community_benchmarks|competitor_benchmarks|website_stats)$/, 'analytics-hub'],
  [/^qol_metric$/, 'platform-health-monitoring'],
  [/^(chef_journal.*|chef_journey.*|chef_journeys|chef_growth|chef_momentum)$/, 'growth-hub'],
  [/^(chef_backup|chef_crisis|chef_emergency|chef_incidents|chef_certifications|chef_insurance|insurance_.*|health_insurance|haccp_plans|compliance_.*|permits|cancellation_policies)$/, 'safety-protection'],
  [/^cannabis_.*$/, 'cannabis-vertical'],
  [/^charity_hours$/, 'charity-programs'],
  [/^(chef_service.*|chef_capability|experience_packages)$/, 'rate-card'],
  [/^chef_preferred.*$/, 'ingredient-catalog'],
  [/^chef_profiles$/, 'portfolio-public-assets'],
  [/^(grocery_trip.*|grocery_trips)$/, 'ingredient-price-engine'],
  [/^onboarding_progress$/, 'auth-and-onboarding'],
  [/^(partner_images|partner_locations)$/, 'referral-partner-management'],
  [/^(sequence_enrollments|sequence_steps)$/, 'marketing-campaigns'],
  [/^(simulation_results|simulation_runs)$/, 'developer-simulation-lab'],
  [/^(vendor_catalog.*|vendor_document.*|vendor_preferred.*)$/, 'vendor-management'],
  [/^receipt_line.*$/, 'expense-management'],
  [/^purchase_order.*$/, 'inventory-procurement'],
  [/^cash_drawer.*$/, 'commerce-register'],
  [/^(commerce_payment.*|commerce_payments|commerce_refunds)$/, 'commerce-reporting-settlements'],
  [/^platform_fee.*$/, 'payouts-reconciliation'],
  [/^served_dish.*$/, 'menu-management'],
  [/^stocktakes$/, 'inventory-procurement'],
  [/^suggested_links$/, 'client-communications'],
  [/^user_feedback$/, 'feedback-surveys'],
  [/^tip_requests$/, 'payments-collections'],
  [/^rsvp_reminder.*$/, 'tokenized-service-pages'],
  [/^chef_api.*$/, 'integrations-webhooks'],
  [/^chef_activity.*$/, 'activity-queue'],
  [/^chef_automation.*$/, 'automations-touchpoints'],
  [/^chef_backup.*$/, 'safety-protection'],
  [/^chef_brand.*$/, 'portfolio-public-assets'],
  [/^chef_business.*$/, 'settings-control-plane'],
  [/^chef_calendar.*$/, 'calendar-schedule'],
  [/^chef_capability.*$/, 'rate-card'],
  [/^chef_capacity.*$/, 'availability-broadcaster'],
  [/^chef_channel.*$/, 'inbox-and-chat'],
  [/^chef_comment.*$/, 'inbox-and-chat'],
  [/^chef_creative.*$/, 'culinary-ideation-board'],
  [/^chef_crisis.*$/, 'safety-protection'],
  [/^chef_culinary.*$/, 'culinary-home'],
  [/^chef_daily.*$/, 'morning-briefing'],
  [/^chef_deposit.*$/, 'payments-collections'],
  [/^chef_directory.*$/, 'public-chef-marketplace'],
  [/^chef_education.*$/, 'growth-hub'],
  [/^chef_emergency.*$/, 'safety-protection'],
  [/^chef_event.*$/, 'event-workspace'],
  [/^chef_feedback$/, 'feedback-surveys'],
  [/^chef_growth.*$/, 'growth-hub'],
  [/^chef_insurance.*$/, 'safety-protection'],
  [/^chef_marketplace.*$/, 'marketplace-command-center'],
  [/^chef_momentum.*$/, 'growth-hub'],
  [/^chef_portfolio.*$/, 'portfolio-public-assets'],
  [/^chef_preferences$/, 'settings-control-plane'],
  [/^chef_reminders$/, 'settings-control-plane'],
  [/^chef_scheduling.*$/, 'calendar-schedule'],
  [/^chef_seasonal.*$/, 'availability-broadcaster'],
  [/^chef_team.*$/, 'team-collaboration'],
  [/^chef_trusted.*$/, 'network-community'],
  [/^client_kitchen.*$/, 'client-crm'],
  [/^client_outreach.*$/, 'client-communications'],
  [/^client_preference.*$/, 'client-preferences-intake'],
  [/^client_quick.*$/, 'client-crm'],
  [/^client_satisfaction.*$/, 'reviews-testimonials-reputation'],
  [/^contractor_service.*$/, 'payroll-contractors'],
  [/^daily_reconciliation.*$/, 'commerce-reporting-settlements'],
  [/^daily_tax.*$/, 'tax-compliance'],
  [/^dead_letter.*$/, 'background-job-orchestrator'],
  [/^direct_outreach.*$/, 'client-communications'],
  [/^dop_task.*$/, 'event-run-of-show'],
  [/^email_sender.*$/, 'marketing-campaigns'],
  [/^expense_tax.*$/, 'expense-management'],
  [/^external_review.*$/, 'reviews-testimonials-reputation'],
  [/^fermentation_logs$/, 'culinary-home'],
  [/^fine_tuning.*$/, 'remy-ai-platform'],
  [/^follow_up.*$/, 'client-communications'],
  [/^gmail_historical.*$/, 'inbox-and-chat'],
  [/^gmail_sync.*$/, 'inbox-and-chat'],
  [/^grocery_spend.*$/, 'expense-management'],
  [/^health_insurance.*$/, 'safety-protection'],
  [/^ingredient_price.*$/, 'ingredient-price-engine'],
  [/^ingredient_shelf.*$/, 'ingredient-catalog'],
  [/^job_retry.*$/, 'background-job-orchestrator'],
  [/^loyalty_reward.*$/, 'loyalty-rewards'],
  [/^marketing_spend.*$/, 'expense-management'],
  [/^marketplace_client.*$/, 'marketplace-command-center'],
  [/^ops_log$/, 'daily-ops-planner'],
  [/^public_ingredient.*$/, 'ingredient-price-engine'],
  [/^public_media.*$/, 'portfolio-public-assets'],
  [/^public_product.*$/, 'food-operator-retail-ops'],
  [/^purchase_order_items$/, 'inventory-procurement'],
  [/^qol_metric.*$/, 'platform-health-monitoring'],
  [/^recurring_invoice.*$/, 'recurring-service-programs'],
  [/^recurring_menu.*$/, 'recurring-service-programs'],
  [/^referral_request.*$/, 'referral-partner-management'],
  [/^seasonal_availability.*$/, 'ingredient-catalog'],
  [/^smart_field.*$/, 'settings-control-plane'],
  [/^sms_send.*$/, 'notifications-center'],
  [/^store_item.*$/, 'ingredient-price-engine'],
  [/^tasting_menu.*$/, 'menu-management'],
  [/^tip_pool.*$/, 'staff-management'],
  [/^travel_leg.*$/, 'travel-production'],
  [/^website_stats.*$/, 'analytics-hub'],
  [/^account_deletion_audit$/, 'auth-and-onboarding'],
  [/^bake_schedule$/, 'food-operator-retail-ops'],
  [/^beverages$/, 'menu-management'],
  [/^chef_feature.*$/, 'feature-flag-and-tier-system'],
  [/^payment_plan.*$/, 'payments-collections'],
  [/^platform_action.*$/, 'founder-command-hub'],
  [/^pos_alert.*$/, 'commerce-reporting-settlements'],
  [/^pos_metric.*$/, 'commerce-reporting-settlements'],
  [/^product_public.*$/, 'food-operator-retail-ops'],
  [/^public_data.*$/, 'public-food-discovery-directory'],
  [/^public_food.*$/, 'public-food-discovery-directory'],
  [/^public_location.*$/, 'public-food-discovery-directory'],
  [/^public_weather.*$/, 'public-food-discovery-directory'],
];

function buildRouteMapDoc(mappedPages) {
  const mapped = mappedPages.filter((item) => item.feature);
  const unmatched = mappedPages.filter((item) => !item.feature);

  return `
# ChefFlow Feature Route Map

This appendix maps every discovered page route in \`app/\` to the normalized feature registry. The mapping is route-family based and is intended to support discoverability, handoff, and future surface audits.

Summary:

- total page routes: ${mappedPages.length}
- mapped page routes: ${mapped.length} (${pct(mapped.length, mappedPages.length)}%)
- unmatched page routes: ${unmatched.length} (${pct(unmatched.length, mappedPages.length)}%)

## Route Map

${mdTable(
  ['route', 'feature id', 'feature name', 'classification', 'visibility', 'status'],
  mappedPages.map((item) => [
    item.value,
    item.feature || 'UNMAPPED',
    item.meta?.name || '',
    item.meta?.classification || '',
    item.meta?.visibility || '',
    item.meta?.status || '',
  ]),
)}

## Unmatched Routes

${unmatched.length
    ? mdTable(
        ['route', 'bucket'],
        unmatched.map((item) => [item.value, bucketRoute(item.value)]),
      )
    : 'No unmatched page routes.'}
`;
}

function buildApiMapDoc(mappedApis) {
  const mapped = mappedApis.filter((item) => item.feature);
  const unmatched = mappedApis.filter((item) => !item.feature);

  return `
# ChefFlow Feature API Map

This appendix maps route handlers and service endpoints to the normalized feature registry. API mappings intentionally favor owning service families when the endpoint is internal or scheduled.

Summary:

- total API routes: ${mappedApis.length}
- mapped API routes: ${mapped.length} (${pct(mapped.length, mappedApis.length)}%)
- unmatched API routes: ${unmatched.length} (${pct(unmatched.length, mappedApis.length)}%)

## API Map

${mdTable(
  ['api route', 'feature id', 'feature name', 'classification', 'visibility', 'status'],
  mappedApis.map((item) => [
    item.value,
    item.feature || 'UNMAPPED',
    item.meta?.name || '',
    item.meta?.classification || '',
    item.meta?.visibility || '',
    item.meta?.status || '',
  ]),
)}

## Unmatched API Routes

${unmatched.length
    ? mdTable(
        ['api route', 'bucket'],
        unmatched.map((item) => [item.value, bucketRoute(item.value)]),
      )
    : 'No unmatched API routes.'}
`;
}

function buildSchemaMapDoc(mappedTables) {
  const mapped = mappedTables.filter((item) => item.feature);
  const unmatched = mappedTables.filter((item) => !item.feature);

  return `
# ChefFlow Feature Schema Map

This appendix maps database tables from \`clean-schema.sql\` to the dominant feature they imply. Schema mappings are capability inference rather than strict ownership and are meant to surface hidden systems that may not have first-class UI.

Summary:

- total tables: ${mappedTables.length}
- mapped tables: ${mapped.length} (${pct(mapped.length, mappedTables.length)}%)
- unmatched tables: ${unmatched.length} (${pct(unmatched.length, mappedTables.length)}%)

## Table Map

${mdTable(
  ['table', 'feature id', 'feature name', 'classification', 'visibility', 'status'],
  mappedTables.map((item) => [
    item.value,
    item.feature || 'UNMAPPED',
    item.meta?.name || '',
    item.meta?.classification || '',
    item.meta?.visibility || '',
    item.meta?.status || '',
  ]),
)}

## Unmatched Tables

${unmatched.length
    ? mdTable(
        ['table', 'bucket'],
        unmatched.map((item) => [item.value, bucketTable(item.value)]),
      )
    : 'No unmatched tables.'}
`;
}

function buildGapReport(mappedPages, mappedApis, mappedTables, inventoryMeta) {
  const unmatchedPages = mappedPages.filter((item) => !item.feature).map((item) => item.value);
  const unmatchedApis = mappedApis.filter((item) => !item.feature).map((item) => item.value);
  const unmatchedTables = mappedTables.filter((item) => !item.feature).map((item) => item.value);

  const routeBuckets = summarizeBuckets(unmatchedPages, bucketRoute);
  const apiBuckets = summarizeBuckets(unmatchedApis, bucketRoute);
  const tableBuckets = summarizeBuckets(unmatchedTables, bucketTable);

  const coveredFeatures = new Set(
    [...mappedPages, ...mappedApis, ...mappedTables]
      .map((item) => item.feature)
      .filter(Boolean),
  );

  const uncoveredFeatures = [...inventoryMeta.values()]
    .filter((meta) => !coveredFeatures.has(meta.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  return `
# ChefFlow Feature Gap Report

This report captures remaining coverage gaps after the route, API, and schema hardening pass. A gap here does not necessarily mean the system is invalid; it means the normalized registry still relies on component, service, or document evidence rather than one of these three appendix layers.

Summary:

- page-route coverage: ${mappedPages.filter((item) => item.feature).length}/${mappedPages.length} (${pct(mappedPages.filter((item) => item.feature).length, mappedPages.length)}%)
- API coverage: ${mappedApis.filter((item) => item.feature).length}/${mappedApis.length} (${pct(mappedApis.filter((item) => item.feature).length, mappedApis.length)}%)
- schema coverage: ${mappedTables.filter((item) => item.feature).length}/${mappedTables.length} (${pct(mappedTables.filter((item) => item.feature).length, mappedTables.length)}%)
- registry features with no route/API/schema appendix coverage: ${uncoveredFeatures.length}

## Unmatched Page Route Buckets

${routeBuckets.length
    ? mdTable(
        ['bucket', 'count', 'members'],
        routeBuckets.map((bucket) => [bucket.bucket, bucket.count, bucket.members.join(', ')]),
      )
    : 'No unmatched page-route buckets.'}

## Unmatched API Buckets

${apiBuckets.length
    ? mdTable(
        ['bucket', 'count', 'members'],
        apiBuckets.map((bucket) => [bucket.bucket, bucket.count, bucket.members.join(', ')]),
      )
    : 'No unmatched API buckets.'}

## Unmatched Schema Buckets

${tableBuckets.length
    ? mdTable(
        ['bucket', 'count', 'members'],
        tableBuckets.map((bucket) => [bucket.bucket, bucket.count, bucket.members.join(', ')]),
      )
    : 'No unmatched schema buckets.'}

## Registry Features Without Route/API/Schema Coverage

${uncoveredFeatures.length
    ? mdTable(
        ['feature id', 'name', 'classification', 'visibility', 'status', 'entry point'],
        uncoveredFeatures.map((meta) => [
          meta.id,
          meta.name,
          meta.classification,
          meta.visibility,
          meta.status,
          meta.entryPoint,
        ]),
      )
    : 'All registry features are represented in at least one appendix layer.'}
`;
}

function main() {
  const registryIds = new Set(readRegistryIds());
  const inventoryMeta = readInventoryMeta();

  const mappedPages = mapItems(collectPageRoutes(), PAGE_RULES, inventoryMeta);
  const mappedApis = mapItems(collectApiRoutes(), API_RULES, inventoryMeta);
  const mappedTables = mapItems(collectTables(), TABLE_RULES, inventoryMeta);

  validateMappedFeatures(mappedPages, registryIds);
  validateMappedFeatures(mappedApis, registryIds);
  validateMappedFeatures(mappedTables, registryIds);

  writeDoc('docs/feature-route-map.md', buildRouteMapDoc(mappedPages));
  writeDoc('docs/feature-api-map.md', buildApiMapDoc(mappedApis));
  writeDoc('docs/feature-schema-map.md', buildSchemaMapDoc(mappedTables));
  writeDoc('docs/feature-gap-report.md', buildGapReport(mappedPages, mappedApis, mappedTables, inventoryMeta));

  console.log(JSON.stringify({
    pages: {
      total: mappedPages.length,
      mapped: mappedPages.filter((item) => item.feature).length,
      unmatched: mappedPages.filter((item) => !item.feature).length,
    },
    apis: {
      total: mappedApis.length,
      mapped: mappedApis.filter((item) => item.feature).length,
      unmatched: mappedApis.filter((item) => !item.feature).length,
    },
    tables: {
      total: mappedTables.length,
      mapped: mappedTables.filter((item) => item.feature).length,
      unmatched: mappedTables.filter((item) => !item.feature).length,
    },
  }, null, 2));
}

main();
