import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
mkdirSync("./screenshots/qa-pass", { recursive: true });
const SESSION = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiV1pDbVlxSXBtakxXT2QzajFfUXJveTNKajVEWDhjVHFiVzZXejUwZm8xQnV3ZmxWeC1hZGV0MHU5WTZNRFR3NDBTbDJCV1VLMkk2ZmFBR3FNS2xPWVEifQ..5WiUA45oWyFHJGUe73imfg.l3PdGKQvGig9rqcnIUfLIwtt6MYJQ1YlcrnHHg36s-3Ry-QOU9Xh-oAIkgRZF9SDpCYZ4Ic6R4NBjLMIeTOmBSqNiZzyhv_NNbFvRknTBZIRlFzc-asJl1EuSLEXcYURo7XD9rqyb8QTRmhVohQpy4sjWARbw4KsVdL02apbSvnCFxfi_wMuyZzTcS-YLdv6eSoGLV8ggtkOfmXO71BsVFpH6G1JJmCtWymw817gYh05xYbvoeEQo9YuYnc_2Uoa3nFo4g7dDCInuO8XK9h1LTi2ggId5y2VkVuLzAuNXatey8_Dwf2xhWDN7CipyN4BxLK-LaXCoRjf0zxRg7fhfXLm2YSMDhTCdw54ycDTL52QygG-dut6h_KZcB8GQSyM.EOFUiUj9PFC5SYjSMrGLKKoTjWYoY-PZPZ_DTL1ZX8g";
const BASE = "http://localhost:3100";
const storageState = { cookies: [{ name: "authjs.session-token", value: SESSION, domain: "localhost", path: "/", expires: 1778469839, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const allErrs = [];
page.on("console", msg => { if (msg.type() === "error") allErrs.push(msg.text().substring(0, 200)); });
const nav = async (path, wait) => {
  try {
    const r = await page.goto(BASE + path, { waitUntil: "commit", timeout: 30000 });
    await page.waitForTimeout(wait || 4000);
    return { status: r ? r.status() : null, url: page.url() };
  } catch(e) {
    console.log("NAV ERR " + path + ": " + e.message.substring(0, 80));
    return { status: null, url: page.url() };
  }
};
const ss = async name => {
  try { await page.screenshot({ path: "./screenshots/qa-pass/" + name, fullPage: false }); console.log("SS: " + name); }
  catch(e) { console.log("SS FAIL: " + name); }
};
const txt = async lim => {
  try { return await page.evaluate(l => document.body ? document.body.innerText.substring(0, l) : "NO BODY", lim || 800); }
  catch(e) { return "TXT ERR"; }
};

// B1 DASHBOARD
console.log("=== BLOCK 1: DASHBOARD ===");
let r = await nav("/dashboard", 7000);
console.log("URL:", r.url);
if (r.url.includes("signin")) { console.log("FAIL: Not authenticated"); await browser.close(); process.exit(1); }
await ss("b1-01-dashboard.png");
const dashTxt = await txt(2000);
console.log("Content:", dashTxt.substring(0, 600));
const skelCount = await page.evaluate(() => document.querySelectorAll("[class*=skeleton],[class*=Skeleton]").length);
console.log("Skeletons:", skelCount);
const headings = await page.evaluate(() => Array.from(document.querySelectorAll("h1,h2,h3")).slice(0,8).map(e => e.innerText.trim()).filter(Boolean));
console.log("Headings:", headings.join(" | "));
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
await ss("b1-02-dashboard-scroll.png");

// B2 INBOX
console.log("=== BLOCK 2: INBOX ===");
r = await nav("/inbox", 3000);
await ss("b2-01-inbox.png");
console.log("Inbox:", (await txt(800)).substring(0, 400));
r = await nav("/inbox/history-scan", 3000);
await ss("b2-02-history-scan.png");
console.log("Scan page:", (await txt(1500)).substring(0, 500));
const allBtns = await page.$$("button");
let foundScan = false;
for (const btn of allBtns) {
  const bt = (await btn.innerText().catch(() => "")).toLowerCase();
  if (bt.includes("scan") || bt.includes("start") || bt.includes("import")) {
    console.log("Scan button:", bt.trim());
    await btn.click().catch(e => console.log("click err"));
    await page.waitForTimeout(3000);
    await ss("b2-03-scan-clicked.png");
    console.log("After scan:", (await txt(800)).substring(0, 400));
    foundScan = true;
    break;
  }
}
if (!foundScan) console.log("No scan button found");

// B3 SELL
console.log("=== BLOCK 3: SELL ===");
r = await nav("/inquiries", 3000);
await ss("b3-01-inquiries.png");
console.log("Inquiries:", (await txt(600)).substring(0, 300));
r = await nav("/events", 3000);
await ss("b3-02-events.png");
console.log("Events:", (await txt(1000)).substring(0, 400));
const evLinks = await page.$$("a[href*='/events/']");
console.log("Event links:", evLinks.length);
if (evLinks.length > 0) {
  const href = await evLinks[0].getAttribute("href");
  r = await nav(href.replace(BASE, ""), 4000);
  console.log("Event detail URL:", r.url);
  await ss("b3-03-event-detail.png");
  console.log("Event detail:", (await txt(1200)).substring(0, 400));
  const tabs = await page.$$("[role=tab]");
  const tabNames = [];
  for (const tab of tabs) { tabNames.push((await tab.innerText().catch(() => "")).trim()); }
  console.log("Tabs:", tabNames.filter(Boolean).join(" | "));
  for (let i = 0; i < Math.min(tabs.length, 5); i++) {
    const tn = (tabNames[i] || "").toLowerCase().replace(/s+/g, "-").substring(0, 20);
    if (!tn) continue;
    await tabs[i].click().catch(() => {});
    await page.waitForTimeout(1500);
    await ss("b3-04-event-tab-" + tn + ".png");
  }
}
r = await nav("/quotes", 3000);
await ss("b3-05-quotes.png");
console.log("Quotes:", (await txt(600)).substring(0, 300));

// B4 COOK
console.log("=== BLOCK 4: COOK ===");
r = await nav("/culinary/recipes", 3000);
await ss("b4-01-recipes.png");
console.log("Recipes:", (await txt(800)).substring(0, 400));
const recLinks = await page.$$("a[href*='/culinary/recipes/']");
console.log("Recipe links:", recLinks.length);
if (recLinks.length > 0) {
  const rh = await recLinks[0].getAttribute("href");
  await nav(rh.replace(BASE, ""), 3000);
  await ss("b4-02-recipe-detail.png");
  console.log("Recipe detail:", (await txt(600)).substring(0, 300));
}
r = await nav("/culinary/price-catalog", 4000);
await ss("b4-03-price-catalog.png");
console.log("Price catalog:", (await txt(800)).substring(0, 400));
const searchEl = await page.$("input[type=search]");
if (searchEl) {
  await searchEl.fill("chicken breast");
  await page.waitForTimeout(2500);
  await ss("b4-04-search-chicken.png");
  console.log("Chicken:", (await txt(600)).substring(0, 300));
  await searchEl.click({ clickCount: 3 });
  await searchEl.fill("puntarelle");
  await page.waitForTimeout(2500);
  await ss("b4-05-search-puntarelle.png");
  const puntTxt = await txt(800);
  console.log("Puntarelle:", puntTxt.substring(0, 300));
  console.log("Web fallback:", puntTxt.toLowerCase().includes("sourcing") || puntTxt.toLowerCase().includes("find") || puntTxt.toLowerCase().includes("online"));
} else { console.log("WARN: No search input"); }
r = await nav("/culinary/ingredients", 3000);
await ss("b4-06-ingredients.png");
console.log("Ingredients:", (await txt(600)).substring(0, 300));

// B5 MONEY
console.log("=== BLOCK 5: MONEY ===");
r = await nav("/finance", 4000);
await ss("b5-01-finance.png");
console.log("Finance:", (await txt(1000)).substring(0, 500));
r = await nav("/finance/invoices", 3000);
await ss("b5-02-invoices.png");
console.log("Invoices:", (await txt(600)).substring(0, 300));

// B6 CLIENTS
console.log("=== BLOCK 6: CLIENTS ===");
r = await nav("/clients", 3000);
await ss("b6-01-clients.png");
console.log("Clients:", (await txt(1000)).substring(0, 400));
const clLinks = await page.$$("a[href*='/clients/']");
console.log("Client links:", clLinks.length);
if (clLinks.length > 0) {
  const ch = await clLinks[0].getAttribute("href");
  r = await nav(ch.replace(BASE, ""), 4000);
  console.log("Client detail URL:", r.url);
  await ss("b6-02-client-detail.png");
  console.log("Client detail:", (await txt(800)).substring(0, 400));
  const clTabs = await page.$$("[role=tab]");
  const clTabNames = [];
  for (const t of clTabs) { clTabNames.push((await t.innerText().catch(() => "")).trim()); }
  console.log("Client tabs:", clTabNames.filter(Boolean).join(" | "));
}

// B7 PLANNING
console.log("=== BLOCK 7: PLANNING ===");
r = await nav("/calendar", 3000);
await ss("b7-01-calendar.png");
console.log("Calendar:", (await txt(500)).substring(0, 250));
r = await nav("/daily", 4000);
await ss("b7-02-daily.png");
console.log("Daily:", (await txt(800)).substring(0, 400));
const dailySkel = await page.evaluate(() => document.querySelectorAll("[class*=skeleton],[class*=Skeleton]").length);
console.log("Daily skeletons:", dailySkel);
r = await nav("/planning", 3000);
await ss("b7-03-planning.png");
console.log("Planning:", (await txt(500)).substring(0, 250));

// B8 SETTINGS
console.log("=== BLOCK 8: SETTINGS ===");
r = await nav("/settings", 3000);
await ss("b8-01-settings.png");
console.log("Settings:", (await txt(1500)).substring(0, 600));
r = await nav("/settings/gmail", 4000);
await ss("b8-02-gmail.png");
const gmailTxt = await txt(2000);
console.log("Gmail:", gmailTxt.substring(0, 800));
r = await nav("/settings/account", 3000);
await ss("b8-03-account.png");
console.log("Account:", (await txt(800)).substring(0, 400));
r = await nav("/settings/store-preferences", 3000);
await ss("b8-04-store-prefs.png");
console.log("Store prefs:", (await txt(800)).substring(0, 400));
r = await nav("/settings/webhooks", 3000);
await ss("b8-05-webhooks.png");
console.log("Webhooks:", (await txt(600)).substring(0, 300));
r = await nav("/settings/api-keys", 3000);
await ss("b8-06-api-keys.png");
console.log("API keys:", (await txt(600)).substring(0, 300));
r = await nav("/settings/zapier", 3000);
await ss("b8-07-zapier.png");
console.log("Zapier:", (await txt(600)).substring(0, 300));
r = await nav("/settings/embed", 3000);
await ss("b8-08-embed.png");
console.log("Embed:", (await txt(600)).substring(0, 300));

// B9 PUBLIC
console.log("=== BLOCK 9: PUBLIC ===");
const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pub = await pubCtx.newPage();
const pubErrors = [];
pub.on("console", msg => { if (msg.type() === "error") pubErrors.push(msg.text().substring(0, 150)); });
const pubNav = async (path, wait) => {
  try { await pub.goto(BASE + path, { waitUntil: "commit", timeout: 20000 }); await pub.waitForTimeout(wait || 3000); } catch(e) { console.log("PUB ERR " + path); } return pub.url();
};
const pubTxt = async lim => {
  try { return await pub.evaluate(l => document.body.innerText.substring(0, l), lim || 800); } catch(e) { return "PUB ERR"; }
};
const pubSS = async name => {
  try { await pub.screenshot({ path: "./screenshots/qa-pass/" + name, fullPage: false }); console.log("SS: " + name); } catch(e) { console.log("SS FAIL: " + name); }
};
let pu = await pubNav("/", 3000);
console.log("Landing URL:", pu);
await pubSS("b9-01-landing.png");
console.log("Landing:", (await pubTxt(1000)).substring(0, 400));
pu = await pubNav("/chefs", 3000);
await pubSS("b9-02-chefs.png");
console.log("Chefs:", (await pubTxt(800)).substring(0, 400));
pu = await pubNav("/chef/df-private-chef", 4000);
console.log("Chef profile URL:", pu);
await pubSS("b9-03-chef-profile.png");
const profTxt = await pubTxt(1500);
console.log("Profile:", profTxt.substring(0, 600));
const hasBio = profTxt.toLowerCase().includes("bio") || profTxt.toLowerCase().includes("about") || profTxt.toLowerCase().includes("specialt") || profTxt.toLowerCase().includes("cuisine");
const hasBook = profTxt.toLowerCase().includes("book") || profTxt.toLowerCase().includes("inquir") || profTxt.toLowerCase().includes("contact");
console.log("Has bio:", hasBio, "Has booking:", hasBook);
pu = await pubNav("/book", 3000);
await pubSS("b9-04-book.png");
console.log("Book:", (await pubTxt(600)).substring(0, 300));
pu = await pubNav("/how-it-works", 3000);
await pubSS("b9-05-how-it-works.png");
console.log("How it works:", (await pubTxt(600)).substring(0, 300));
pu = await pubNav("/faq", 3000);
await pubSS("b9-06-faq.png");
console.log("FAQ:", (await pubTxt(600)).substring(0, 300));
pu = await pubNav("/signin", 2000);
await pubSS("b9-07-signin.png");
pu = await pubNav("/nearby", 3000);
await pubSS("b9-08-nearby.png");
console.log("Nearby:", (await pubTxt(400)).substring(0, 200));
await pubCtx.close();
console.log("Public errors:", pubErrors.slice(0,5).join(" | ") || "none");

// B10 NAV AUDIT
console.log("=== BLOCK 10: NAV AUDIT ===");
const navRoutes = ["/dashboard","/inquiries","/events","/quotes","/culinary/recipes","/culinary/price-catalog","/culinary/ingredients","/finance","/finance/invoices","/clients","/calendar","/daily","/planning","/inbox","/inbox/history-scan","/settings","/settings/gmail","/settings/account","/settings/store-preferences","/settings/webhooks","/settings/api-keys","/settings/zapier","/settings/embed","/settings/modules"];
for (const route of navRoutes) {
  r = await nav(route, 2000);
  const t = await txt(300);
  const is404 = t.includes("404") || t.includes("Not Found");
  const isErr = t.includes("Internal Server Error") || t.includes("Application error");
  console.log(route + ": 404=" + is404 + " err=" + isErr + " url=" + r.url.replace(BASE, ""));
}

console.log("=== CONSOLE ERRORS ===");
const uniq = Array.from(new Set(allErrs));
if (uniq.length === 0) { console.log("None"); }
else { uniq.forEach(e => console.log(" - " + e.substring(0, 150))); }
await browser.close();
console.log("QA COMPLETE");
