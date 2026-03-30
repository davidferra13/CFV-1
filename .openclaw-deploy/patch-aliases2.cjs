const fs = require('fs');
const path = '/home/davidferra/openclaw-prices/lib/smart-lookup.mjs';
let content = fs.readFileSync(path, 'utf-8');

const marker = "  'red wine': 'red-wine-cooking',";
const idx = content.indexOf(marker);
if (idx === -1) { console.error('Marker not found'); process.exit(1); }

const insertPoint = idx + marker.length;
const newAliases = `

  // Indian cuisine essentials
  'ghee': 'butter-clarified',
  'clarified butter': 'butter-clarified',
  'jackfruit': 'jackfruit',
  'canned jackfruit': 'jackfruit',
  'iceberg lettuce': 'lettuce-iceberg',
  'romaine lettuce': 'lettuce-romaine',
  'red chili powder': 'chili-powder',
  'papad': 'usda-papad',
  'papadum': 'usda-papad',
  'poppadom': 'usda-papad',
  'paneer': 'paneer',
  'cottage cheese': 'paneer',
  'naan': 'naan',
  'naan bread': 'naan',
  'basmati rice': 'rice-basmati',
  'milk powder': 'milk-powder',
  'powdered milk': 'milk-powder',
  'rose water': 'rose-water',
  'cardamom': 'cardamom-ground',
  'green cardamom': 'cardamom-ground',
  'green chili': 'jalapeno',
  'green chilies': 'jalapeno',
  'serrano pepper': 'jalapeno',
  'raita': 'yogurt-plain',
  'tamarind': 'tamarind',
  'curry leaves': 'curry-leaves',
  'mustard seeds': 'mustard-seeds',
  'fenugreek': 'fenugreek',
  'asafoetida': 'asafoetida',
  'hing': 'asafoetida',`;

content = content.slice(0, insertPoint) + newAliases + content.slice(insertPoint);
fs.writeFileSync(path, content);
console.log('Done. Verifying...');

// Verify
const check = fs.readFileSync(path, 'utf-8');
const count = (check.match(/'green chili'/g) || []).length;
console.log("'green chili' appears", count, 'time(s)');
console.log("'cardamom' found:", check.includes("'cardamom': 'cardamom-ground'"));
