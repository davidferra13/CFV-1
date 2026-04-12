import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "fs";
mkdirSync("./screenshots/qa-pass", { recursive: true });
const storageJSON = JSON.parse(readFileSync("./.auth/developer-storage.json", "utf-8"));
console.log("Using developer storage state with", storageJSON.cookies.length, "cookies");
const browser = await chromium.launch({ headless: true });
const storageState = storageJSON;
const ctx = await browser.newContext({ storageState, viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const BASE = "https://app.cheflowhq.com";
const allErrs = [];
page.on("console", function(msg) { if (msg.type() === "error") allErrs.push(msg.text().substring(0, 200)); });
const nav = async function(path) { try { const r = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90000 }); await page.waitForTimeout(3000); return r ? r.status() : null; } catch(e) { console.log("NAV ERR " + path); return null; } };
const txt = async function(lim) { return page.evaluate(function(l) { return document.body.innerText.substring(0, l); }, lim || 800); };
const ss = async function(name) { try { await page.screenshot({ path: "./screenshots/qa-pass/" + name, fullPage: false }); console.log("SS: " + name); } catch(e) { console.log("SS FAIL: " + name); } };

// DASHBOARD
console.log("=== DASHBOARD ===");
await nav("/dashboard");
const dashUrl = page.url();
console.log("URL:", dashUrl);
if (dashUrl.indexOf("signin") > -1) { console.log("CRITICAL: Not authenticated"); await browser.close(); process.exit(1); }
await ss("01-dashboard.png");
const h1els = await page.$("h1,h2,h3");
const h1Txts = await Promise.all(h1els.map(function(e) { return e.innerText(); }));
console.log("Headings:", h1Txts.slice(0,8).filter(Boolean).join(" | "));
await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
await page.waitForTimeout(1500);
await ss("01-dashboard-bottom.png");
await page.evaluate(function() { window.scrollTo(0, 0); });
const dashSkels = await page.$("[class*=skeleton],[class*=Skeleton]");
console.log("Skeletons:", dashSkels.length);
console.log("Content:", (await txt(1500)).substring(0, 600));

// INBOX
console.log("=== INBOX ===");
await nav("/inbox");
await ss("02-inbox.png");
console.log("Inbox:", (await txt()).substring(0, 500));
await nav("/inbox/history-scan");
await ss("03-history-scan.png");
const scanTxt = await txt(2000);
console.log("Scan page:", scanTxt.substring(0, 800));
const allBtns = await page.$("button");
const allBtnTxts = await Promise.all(allBtns.map(function(b) { return b.innerText(); }));
console.log("Buttons:", allBtnTxts.filter(function(t) { return t.trim(); }).join(" | "));
let foundScan = false;
const scanAllBtns = await page.$("button");
for (let si = 0; si < scanAllBtns.length; si++) { const bt = (await scanAllBtns[si].innerText()).toLowerCase(); if (bt.indexOf("scan") > -1 || bt.indexOf("start") > -1) { await scanAllBtns[si].click(); await page.waitForTimeout(15000); await ss("03-history-scan-after.png"); console.log("After scan:", (await txt(1500)).substring(0, 600)); foundScan = true; break; } }
if (!foundScan) { console.log("No scan button found"); await ss("03-history-scan-after.png"); }

// SELL
console.log("=== SELL ===");
await nav("/inquiries");
await ss("04-inquiries.png");
console.log("Inquiries:", (await txt()).substring(0, 400));
await nav("/events");
await ss("05-events.png");
console.log("Events:", (await txt(1200)).substring(0, 600));
const evLinks = await page.$("a[href*='/events/']");
console.log("Event links:", evLinks.length);
if (evLinks.length > 0) {
  const evHref = await evLinks[0].getAttribute("href");
  await nav(evHref.replace(BASE, ""));
  await ss("05-event-detail.png");
  console.log("Event detail:", (await txt(1500)).substring(0, 600));
  const tabs = await page.$("[role=tab]");
  const tabTxts = await Promise.all(tabs.map(function(t) { return t.innerText(); }));
  console.log("Tabs:", tabTxts.map(function(t) { return t.trim(); }).filter(Boolean).join(" | "));
  for (let ti = 0; ti < Math.min(tabs.length, 6); ti++) { try { const tn = tabTxts[ti].trim().replace(/\s+/g, "-").toLowerCase().substring(0, 20); if (tn) { await tabs[ti].click(); await page.waitForTimeout(1500); await ss("05-event-tab-" + tn + ".png"); } } catch(e2) {} }
}
await nav("/quotes");
await ss("06-quotes.png");
console.log("Quotes:", (await txt()).substring(0, 400));

// COOK
console.log("=== COOK ===");
await nav("/culinary/recipes");
await ss("07-recipes.png");
console.log("Recipes:", (await txt()).substring(0, 400));
await nav("/culinary/price-catalog");
await ss("08-price-catalog.png");
console.log("Price catalog:", (await txt()).substring(0, 400));
const searchIn = await page.$("input[type=search]");
if (searchIn) {
  await searchIn.fill("chicken breast"); await page.waitForTimeout(2000); await ss("08-search-chicken.png");
  console.log("Chicken:", (await txt(600)).substring(0, 300));
  await searchIn.fill(""); await searchIn.fill("puntarelle"); await page.waitForTimeout(2000); await ss("08-search-puntarelle.png");
  const puntTxt = await txt(800); console.log("Puntarelle:", puntTxt.substring(0, 400));
  console.log("Web fallback:", puntTxt.toLowerCase().indexOf("web") > -1 || puntTxt.toLowerCase().indexOf("online") > -1 || puntTxt.toLowerCase().indexOf("sourcing") > -1 || puntTxt.toLowerCase().indexOf("find it") > -1);
} else { console.log("No search input on price-catalog"); }
await nav("/culinary/ingredients");
await ss("09-ingredients.png");
console.log("Ingredients URL:", page.url()); console.log("Ingredients:", (await txt()).substring(0, 300));

// MONEY
console.log("=== MONEY ===");
await nav("/finance");
await ss("10-finance.png");
console.log("Finance URL:", page.url()); console.log("Finance:", (await txt(1000)).substring(0, 500));
await nav("/finance/invoices");
await ss("11-invoices.png");
console.log("Invoices:", (await txt()).substring(0, 400));

// CLIENTS
console.log("=== CLIENTS ===");
await nav("/clients");
await ss("12-clients.png");
const clTxt = await txt(1500); console.log("Clients:", clTxt.substring(0, 600));
const clLinks = await page.$("a[href*='/clients/']");
console.log("Client links:", clLinks.length);
if (clLinks.length > 0) { const clHref = await clLinks[0].getAttribute("href"); await nav(clHref.replace(BASE, "")); await ss("12-client-detail.png"); console.log("Client detail:", (await txt()).substring(0, 400)); }

// PLANNING
console.log("=== PLANNING ===");
await nav("/calendar");
await ss("13-calendar.png");
console.log("Calendar:", (await txt()).substring(0, 300));
await nav("/daily");
await ss("14-daily.png");
console.log("Daily URL:", page.url()); console.log("Daily:", (await txt(800)).substring(0, 400));
const dailySkel = await page.$("[class*=skeleton],[class*=Skeleton]");
console.log("Daily skeletons:", dailySkel.length);
await nav("/planning");
await ss("15-planning.png");
console.log("Planning URL:", page.url()); console.log("Planning:", (await txt()).substring(0, 300));

// SETTINGS
console.log("=== SETTINGS ===");
await nav("/settings");
await ss("16-settings.png");
console.log("Settings:", (await txt(2000)).substring(0, 800));
await nav("/settings/gmail");
await ss("17-gmail.png");
const gmailTxt = await txt(2000); console.log("Gmail:", gmailTxt.substring(0, 1000));
await nav("/settings/account");
await ss("18-account.png");
console.log("Account:", (await txt()).substring(0, 500));

// PUBLIC
console.log("=== PUBLIC ===");
const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pub = await pubCtx.newPage();
await pub.goto("http://localhost:3100", { waitUntil: "domcontentloaded", timeout: 45000 });
await pub.waitForTimeout(3000);
await pub.screenshot({ path: "./screenshots/qa-pass/19-landing.png", fullPage: false });
console.log("Landing:", (await pub.evaluate(function() { return document.body.innerText.substring(0, 600); })).substring(0, 400));
await pub.goto("http://localhost:3100/chefs", { waitUntil: "domcontentloaded", timeout: 45000 });
await pub.waitForTimeout(3000);
await pub.screenshot({ path: "./screenshots/qa-pass/20-chefs.png", fullPage: false });
console.log("Chefs:", (await pub.evaluate(function() { return document.body.innerText.substring(0, 600); })).substring(0, 400));
await pub.goto("http://localhost:3100/chef/df-private-chef", { waitUntil: "domcontentloaded", timeout: 45000 });
await pub.waitForTimeout(3000);
await pub.screenshot({ path: "./screenshots/qa-pass/21-chef-profile.png", fullPage: false });
const profTxt = await pub.evaluate(function() { return document.body.innerText.substring(0, 1200); });
console.log("Chef profile URL:", pub.url()); console.log("Chef profile:", profTxt.substring(0, 700));
console.log("Has bio:", profTxt.toLowerCase().indexOf("bio") > -1 || profTxt.toLowerCase().indexOf("about") > -1 || profTxt.toLowerCase().indexOf("specialt") > -1 || profTxt.toLowerCase().indexOf("cuisine") > -1);
console.log("Has booking:", profTxt.toLowerCase().indexOf("book") > -1 || profTxt.toLowerCase().indexOf("inquir") > -1 || profTxt.toLowerCase().indexOf("contact") > -1);
await pubCtx.close();

// NAV AUDIT
console.log("=== NAV AUDIT ===");
await nav("/dashboard"); await ss("22-nav.png");
const navRoutes = ["/dashboard", "/inquiries", "/events", "/clients", "/culinary/recipes", "/finance", "/calendar", "/settings", "/inbox", "/quotes"];
for (const route of navRoutes) { await nav(route); const u = page.url(); const t = await txt(200); console.log(route + ": 404=" + (t.indexOf("404") > -1 || t.indexOf("Not Found") > -1) + " err=" + (t.indexOf("Internal Server Error") > -1) + " url=" + u.replace(BASE, "")); }

console.log("=== CONSOLE ERRORS ===");
Array.from(new Set(allErrs)).forEach(function(e) { console.log(" -", e.substring(0, 150)); });
await browser.close();
console.log("QA PASS COMPLETE");

