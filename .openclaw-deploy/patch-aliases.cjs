const fs = require('fs');
const path = '/home/davidferra/openclaw-prices/lib/smart-lookup.mjs';
let content = fs.readFileSync(path, 'utf-8');

// Remove any broken single-line Indian aliases block
content = content.replace(/^.*\/\/ Indian cuisine essentials.*$/gm, '');

// New aliases to add (before the closing };)
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
  'hing': 'asafoetida',
`;

// Insert before the closing }; of COMMON_ALIASES
content = content.replace(
  /  'red wine': 'red-wine-cooking',\n\};/,
  `  'red wine': 'red-wine-cooking',\n${newAliases}};`
);

fs.writeFileSync(path, content);
console.log('Aliases patched successfully');
