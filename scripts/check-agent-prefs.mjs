import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres');

const prefs = await sql.unsafe(`SELECT primary_nav_hrefs, mobile_tab_hrefs, enabled_modules, archetype, focus_mode FROM chef_preferences WHERE chef_id = 'c0000000-0000-0000-0000-000000000099'`);
console.log('Prefs:', JSON.stringify(prefs, null, 2));

// Also check column default
const colInfo = await sql.unsafe(`SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'chef_preferences' AND column_name = 'focus_mode'`);
console.log('Column default:', JSON.stringify(colInfo));

await sql.end();
