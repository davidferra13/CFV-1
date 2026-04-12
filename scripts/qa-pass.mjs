import { chromium } from "@playwright/test"
import { readFileSync, mkdirSync } from "fs"

const BASE = "https://app.cheflowhq.com"
const SD = "C:/Users/david/Documents/CFv1/screenshots/qa-pass"
const SP = "C:/Users/david/Documents/CFv1/.auth/developer-storage.json"
mkdirSync(SD, { recursive: true })
const log = (m) => console.log("[QA] " + m)
const issues = []
const addI = (s,p,d,sc) => { issues.push({s,p,d,sc}); console.log("[" + s + "] " + p + ": " + d) }
const ss = async (pg, n) => { const pt = SD + "/" + n + ".png"; await pg.screenshot({ path: pt, fullPage: true }); log("SS: " + n) }