/**
 * Bulk generator for loading.tsx skeleton files.
 * Run: node scripts/gen-loading-skeletons.js
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'app', '(chef)');

const BONE_BLOCK = [
  'function Bone({ className }: { className: string }) {',
  '  return <div className={`loading-bone loading-bone-dark ${className}`} />',
  '}',
].join('\n');

const HEADER = "import { ContextLoader } from '@/components/ui/context-loader'";
const CARD_IMPORT = "import { Card, CardContent, CardHeader } from '@/components/ui/card'";

function makeList(contextId, rows) {
  return [
    HEADER,
    '',
    BONE_BLOCK,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <Bone className="h-8 w-48" />',
    '      <Bone className="h-4 w-72" />',
    '      <div className="space-y-2">',
    '        {Array.from({ length: ' + rows + ' }).map((_, i) => (',
    '          <Bone key={i} className="h-12 w-full rounded-lg" />',
    '        ))}',
    '      </div>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeDetail(contextId) {
  return [
    CARD_IMPORT,
    HEADER,
    '',
    BONE_BLOCK,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <Bone className="h-4 w-32" />',
    '      <Bone className="h-8 w-56" />',
    '      <Card>',
    '        <CardHeader>',
    '          <Bone className="h-5 w-40" />',
    '        </CardHeader>',
    '        <CardContent className="space-y-3">',
    '          <Bone className="h-4 w-full" />',
    '          <Bone className="h-4 w-3/4" />',
    '          <Bone className="h-4 w-1/2" />',
    '        </CardContent>',
    '      </Card>',
    '      <Card>',
    '        <CardHeader>',
    '          <Bone className="h-5 w-32" />',
    '        </CardHeader>',
    '        <CardContent className="space-y-2">',
    '          {Array.from({ length: 4 }).map((_, i) => (',
    '            <Bone key={i} className="h-10 w-full" />',
    '          ))}',
    '        </CardContent>',
    '      </Card>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeForm(contextId, maxW, fields) {
  return [
    HEADER,
    '',
    BONE_BLOCK,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="' + maxW + ' mx-auto space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <Bone className="h-4 w-28" />',
    '      <Bone className="h-8 w-56" />',
    '      <Bone className="h-4 w-72" />',
    '      <div className="space-y-4">',
    '        {Array.from({ length: ' + fields + ' }).map((_, i) => (',
    '          <div key={i} className="space-y-2">',
    '            <Bone className="h-4 w-24" />',
    '            <Bone className="h-10 w-full rounded-lg" />',
    '          </div>',
    '        ))}',
    '        <Bone className="h-10 w-32 rounded-lg" />',
    '      </div>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeDashboard(contextId, cols, cards) {
  return [
    CARD_IMPORT,
    HEADER,
    '',
    BONE_BLOCK,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <Bone className="h-8 w-56" />',
    '      <Bone className="h-4 w-80" />',
    '      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-' + cols + '">',
    '        {Array.from({ length: ' + cards + ' }).map((_, i) => (',
    '          <Card key={i}>',
    '            <CardContent className="pt-6 space-y-3">',
    '              <Bone className="h-4 w-24" />',
    '              <Bone className="h-7 w-20" />',
    '              <Bone className="h-3 w-32" />',
    '            </CardContent>',
    '          </Card>',
    '        ))}',
    '      </div>',
    '      <Card>',
    '        <CardHeader>',
    '          <Bone className="h-5 w-36" />',
    '        </CardHeader>',
    '        <CardContent className="space-y-2">',
    '          {Array.from({ length: 5 }).map((_, i) => (',
    '            <Bone key={i} className="h-10 w-full" />',
    '          ))}',
    '        </CardContent>',
    '      </Card>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeHub(contextId, cards) {
  return [
    CARD_IMPORT,
    HEADER,
    '',
    BONE_BLOCK,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <Bone className="h-8 w-48" />',
    '      <Bone className="h-4 w-72" />',
    '      <div className="grid gap-4 sm:grid-cols-2">',
    '        {Array.from({ length: ' + cards + ' }).map((_, i) => (',
    '          <Card key={i}>',
    '            <CardContent className="pt-6 space-y-3">',
    '              <Bone className="h-5 w-32" />',
    '              <Bone className="h-4 w-full" />',
    '              <Bone className="h-4 w-2/3" />',
    '            </CardContent>',
    '          </Card>',
    '        ))}',
    '      </div>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeRedirect(contextId) {
  return [
    HEADER,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <div className="flex items-center justify-center min-h-[40vh]">',
    '        <div className="h-8 w-8 rounded-full border-2 border-stone-700 border-t-stone-400 animate-spin" />',
    '      </div>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeContent(contextId, maxW, sections) {
  return [
    HEADER,
    '',
    BONE_BLOCK,
    '',
    'export default function Loading() {',
    '  return (',
    '    <div className="' + maxW + ' mx-auto px-4 py-8 space-y-6">',
    '      <ContextLoader contextId="' + contextId + '" size="sm" />',
    '      <Bone className="h-4 w-32" />',
    '      <Bone className="h-8 w-64" />',
    '      <Bone className="h-4 w-96" />',
    '      <div className="space-y-4">',
    '        {Array.from({ length: ' + sections + ' }).map((_, i) => (',
    '          <div key={i} className="space-y-2">',
    '            <Bone className="h-5 w-48" />',
    '            <Bone className="h-4 w-full" />',
    '            <Bone className="h-4 w-5/6" />',
    '          </div>',
    '        ))}',
    '      </div>',
    '    </div>',
    '  )',
    '}',
    '',
  ].join('\n');
}

function makeFile(type, contextId, opts) {
  opts = opts || {};
  switch (type) {
    case 'list': return makeList(contextId, opts.rows || 6);
    case 'detail': return makeDetail(contextId);
    case 'form': return makeForm(contextId, opts.maxW || 'max-w-2xl', opts.fields || 4);
    case 'dashboard': return makeDashboard(contextId, opts.cols || 3, opts.cards || 4);
    case 'hub': return makeHub(contextId, opts.cards || 4);
    case 'redirect': return makeRedirect(contextId);
    case 'content': return makeContent(contextId, opts.maxW || 'max-w-3xl', opts.sections || 5);
    default: return makeList(contextId, opts.rows || 6);
  }
}

var files = [
  // loyalty (3 remaining - raffle & raffle/[id] already created)
  ['loyalty/settings/loading.tsx', 'form', 'nav-loyalty-settings', { fields: 5 }],
  ['loyalty/learn/loading.tsx', 'content', 'nav-loyalty-learn', { sections: 6 }],
  ['loyalty/rewards/new/loading.tsx', 'form', 'nav-loyalty-rewards-new'],

  // leads (5)
  ['leads/converted/loading.tsx', 'list', 'nav-leads-converted'],
  ['leads/qualified/loading.tsx', 'list', 'nav-leads-qualified'],
  ['leads/archived/loading.tsx', 'list', 'nav-leads-archived'],
  ['leads/contacted/loading.tsx', 'list', 'nav-leads-contacted'],
  ['leads/new/loading.tsx', 'list', 'nav-leads-new'],

  // explore (5)
  ['explore/loading.tsx', 'hub', 'nav-explore', { cards: 4 }],
  ['explore/book/loading.tsx', 'list', 'nav-explore-book'],
  ['explore/events/loading.tsx', 'list', 'nav-explore-events'],
  ['explore/discover/loading.tsx', 'list', 'nav-explore-discover'],
  ['explore/local/loading.tsx', 'list', 'nav-explore-local'],

  // locations (4)
  ['locations/loading.tsx', 'dashboard', 'nav-locations', { cols: 3, cards: 4 }],
  ['locations/[id]/loading.tsx', 'detail', 'nav-locations-detail'],
  ['locations/compliance/loading.tsx', 'list', 'nav-locations-compliance'],
  ['locations/purchasing/loading.tsx', 'dashboard', 'nav-locations-purchasing', { cols: 2, cards: 4 }],

  // vendors (3)
  ['vendors/price-comparison/loading.tsx', 'list', 'nav-vendors-price-comparison', { rows: 8 }],
  ['vendors/invoices/loading.tsx', 'list', 'nav-vendors-invoices'],
  ['vendors/[id]/loading.tsx', 'detail', 'nav-vendors-detail'],

  // tasks (3)
  ['tasks/templates/loading.tsx', 'list', 'nav-tasks-templates', { rows: 5 }],
  ['tasks/va/loading.tsx', 'list', 'nav-tasks-va'],
  ['tasks/gantt/loading.tsx', 'dashboard', 'nav-tasks-gantt', { cols: 1, cards: 1 }],

  // proposals (3)
  ['proposals/builder/loading.tsx', 'form', 'nav-proposals-builder', { maxW: 'max-w-4xl', fields: 5 }],
  ['proposals/addons/loading.tsx', 'list', 'nav-proposals-addons', { rows: 5 }],
  ['proposals/templates/loading.tsx', 'list', 'nav-proposals-templates', { rows: 5 }],

  // prices (3)
  ['prices/loading.tsx', 'dashboard', 'nav-prices', { cols: 3, cards: 4 }],
  ['prices/seasonal/loading.tsx', 'dashboard', 'nav-prices-seasonal', { cols: 4, cards: 12 }],
  ['prices/store/[storeId]/loading.tsx', 'list', 'nav-prices-store-detail', { rows: 8 }],

  // meal-prep (3)
  ['meal-prep/batch/loading.tsx', 'dashboard', 'nav-meal-prep-batch', { cols: 2, cards: 4 }],
  ['meal-prep/retro/loading.tsx', 'dashboard', 'nav-meal-prep-retro', { cols: 2, cards: 4 }],
  ['meal-prep/[programId]/loading.tsx', 'detail', 'nav-meal-prep-program'],

  // inbox (3)
  ['inbox/triage/loading.tsx', 'redirect', 'nav-inbox-triage'],
  ['inbox/triage/[threadId]/loading.tsx', 'detail', 'nav-inbox-thread'],
  ['inbox/history-scan/loading.tsx', 'list', 'nav-inbox-history-scan'],

  // import (3)
  ['import/history/loading.tsx', 'list', 'nav-import-history'],
  ['import/csv/loading.tsx', 'redirect', 'nav-import-csv'],
  ['import/mxp/loading.tsx', 'redirect', 'nav-import-mxp'],

  // culinary (3)
  ['culinary/supplier-calls/loading.tsx', 'redirect', 'nav-culinary-supplier-calls'],
  ['culinary/vendors/loading.tsx', 'redirect', 'nav-culinary-vendors'],
  ['culinary/menus/loading.tsx', 'redirect', 'nav-culinary-menus'],

  // calls (3)
  ['calls/new/loading.tsx', 'form', 'nav-calls-new'],
  ['calls/[id]/loading.tsx', 'detail', 'nav-calls-detail'],
  ['calls/[id]/edit/loading.tsx', 'form', 'nav-calls-edit'],

  // settings (2)
  ['settings/journey/loading.tsx', 'redirect', 'nav-settings-journey'],
  ['settings/journey/[id]/loading.tsx', 'redirect', 'nav-settings-journey-detail'],

  // remy (2)
  ['remy/signals/loading.tsx', 'list', 'nav-remy-signals'],
  ['remy/operating/loading.tsx', 'dashboard', 'nav-remy-operating', { cols: 2, cards: 4 }],

  // help (2)
  ['help/food-costing/loading.tsx', 'content', 'nav-help-food-costing', { sections: 8 }],
  ['help/[slug]/loading.tsx', 'content', 'nav-help-article'],

  // guests (2)
  ['guests/[id]/loading.tsx', 'detail', 'nav-guests-detail'],
  ['guests/reservations/loading.tsx', 'list', 'nav-guests-reservations'],

  // expenses (2)
  ['expenses/new/loading.tsx', 'form', 'nav-expenses-new', { fields: 5 }],
  ['expenses/[id]/loading.tsx', 'detail', 'nav-expenses-detail'],

  // contracts (2)
  ['contracts/new/loading.tsx', 'form', 'nav-contracts-new', { fields: 5 }],
  ['contracts/[id]/history/loading.tsx', 'detail', 'nav-contracts-history'],

  // content (2)
  ['content/loading.tsx', 'hub', 'nav-content', { cards: 3 }],
  ['content/vault/loading.tsx', 'list', 'nav-content-vault'],

  // communication (2)
  ['communication/loading.tsx', 'hub', 'nav-communication', { cards: 2 }],
  ['communication/drafts/loading.tsx', 'list', 'nav-communication-drafts'],

  // calendar (2)
  ['calendar/travel/loading.tsx', 'dashboard', 'nav-calendar-travel', { cols: 2, cards: 2 }],
  ['calendar/share/loading.tsx', 'form', 'nav-calendar-share', { maxW: 'max-w-3xl', fields: 3 }],

  // 1-file domains (23)
  ['wix-submissions/[id]/loading.tsx', 'detail', 'nav-wix-submissions-detail'],
  ['welcome/loading.tsx', 'redirect', 'nav-welcome'],
  ['shopping/bulk/loading.tsx', 'dashboard', 'nav-shopping-bulk', { cols: 2, cards: 4 }],
  ['reputation/mentions/loading.tsx', 'list', 'nav-reputation-mentions'],
  ['reminders/loading.tsx', 'list', 'nav-reminders'],
  ['quick-log/loading.tsx', 'form', 'nav-quick-log', { maxW: 'max-w-lg', fields: 3 }],
  ['pulse/loading.tsx', 'list', 'nav-pulse'],
  ['prep/consolidation/loading.tsx', 'dashboard', 'nav-prep-consolidation', { cols: 2, cards: 4 }],
  ['pie-cart/loading.tsx', 'list', 'nav-pie-cart', { rows: 5 }],
  ['payments/splitting/loading.tsx', 'dashboard', 'nav-payments-splitting', { cols: 2, cards: 4 }],
  ['marketplace/capture/loading.tsx', 'form', 'nav-marketplace-capture', { maxW: 'max-w-5xl', fields: 3 }],
  ['kitchen/loading.tsx', 'dashboard', 'nav-kitchen', { cols: 1, cards: 1 }],
  ['journey/loading.tsx', 'redirect', 'nav-journey'],
  ['insights/time-analysis/loading.tsx', 'dashboard', 'nav-insights-time-analysis', { cols: 2, cards: 4 }],
  ['imports/business-history/loading.tsx', 'dashboard', 'nav-imports-business-history', { cols: 2, cards: 4 }],
  ['food-cost/revenue/loading.tsx', 'form', 'nav-food-cost-revenue', { maxW: 'max-w-3xl', fields: 4 }],
  ['features/loading.tsx', 'redirect', 'nav-features'],
  ['circles/admin/loading.tsx', 'dashboard', 'nav-circles-admin', { cols: 2, cards: 4 }],
  ['chef/cannabis/handbook/loading.tsx', 'redirect', 'nav-chef-cannabis-handbook'],
  ['chef/cannabis/rsvps/loading.tsx', 'redirect', 'nav-chef-cannabis-rsvps'],
  ['capture/loading.tsx', 'list', 'nav-capture', { rows: 4 }],
  ['availability/loading.tsx', 'list', 'nav-availability', { rows: 5 }],
  ['autopilot/loading.tsx', 'list', 'nav-autopilot', { rows: 4 }],
  ['activity/audit/loading.tsx', 'list', 'nav-activity-audit', { rows: 8 }],
];

var created = 0;
var skipped = 0;

for (var i = 0; i < files.length; i++) {
  var entry = files[i];
  var relPath = entry[0];
  var type = entry[1];
  var contextId = entry[2];
  var opts = entry[3];

  var fullPath = path.join(BASE, relPath);
  var dir = path.dirname(fullPath);

  if (fs.existsSync(fullPath)) {
    skipped++;
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });

  var content = makeFile(type, contextId, opts);
  fs.writeFileSync(fullPath, content, 'utf8');
  created++;
}

console.log('Created: ' + created + ', Skipped (already exist): ' + skipped);
console.log('Total entries: ' + files.length);
