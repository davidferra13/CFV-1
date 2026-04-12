import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
const sip = await sql`SELECT COUNT(*) FROM openclaw.system_ingredient_prices`;
const iph = await sql`SELECT COUNT(*) FROM ingredient_price_history`;
console.log('system_ingredient_prices:', sip[0].count);
console.log('ingredient_price_history:', iph[0].count);
await sql.end();
