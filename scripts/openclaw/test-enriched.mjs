// Test the enriched endpoint after tier passthrough + outlier filter fixes
const items = ['chicken breast', 'garlic', 'cream cheese', 'filet mignon', 'eggs'];

const res = await fetch('http://10.0.0.177:8081/api/prices/enriched', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items }),
});
const data = await res.json();

for (const [name, r] of Object.entries(data.results)) {
  if (!r) { console.log(name + ': NOT FOUND'); continue; }
  const bp = r.best_price;
  if (!bp) { console.log(name + ': ' + r.name + ' (no prices)'); continue; }
  console.log(name + ': $' + (bp.cents/100).toFixed(2) + '/' + bp.normalized_unit + ' | tier=' + bp.tier + ' | store=' + bp.store);
  console.log('  all prices (' + r.all_prices.length + '):');
  r.all_prices.forEach(p =>
    console.log('    $' + (p.cents/100).toFixed(2) + '/' + p.original_unit + ' tier=' + p.tier + ' @ ' + p.store)
  );
}
