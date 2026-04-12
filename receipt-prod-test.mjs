import { chromium } from 'playwright';
import http from 'http';

const BASE_URL = 'http://localhost:3000';
const SS = 'C:/tmp';
const RECEIPT = 'C:/Users/david/AppData/Local/Temp/test-receipt-generated.png';

function httpReq(url, opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = { hostname: u.hostname, port: parseInt(u.port)||80, path: u.pathname+u.search, method: opts.method||'GET', headers: opts.headers||{} };
    const req = http.request(o, res => {
      let d = ''; const sc = res.headers['set-cookie']||[];
      res.on('data', c => d+=c);
      res.on('end', () => resolve({status:res.statusCode, body:d, cookies:sc}));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  // Step 1: CSRF
  const cr = await httpReq(BASE_URL+'/api/auth/csrf', {});
  const csrfToken = JSON.parse(cr.body).csrfToken;
  const sc1 = cr.cookies||[];
  console.log('CSRF len:', csrfToken.length, 'cookies:', sc1.map(c=>c.split(';')[0].split('=')[0]));

  // Step 2: Sign in
  const ch = sc1.map(c=>c.split(';')[0]).join('; ');
  const body = 'csrfToken='+encodeURIComponent(csrfToken)+'&email=agent%40local.chefflow&password=CHEF.jdgyuegf9924092.FLOW&callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard&json=true';
  const sr = await httpReq(BASE_URL+'/api/auth/callback/credentials', {
    method:'POST', body,
    headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':ch,'Content-Length':Buffer.byteLength(body)}
  });
  console.log('SignIn status:', sr.status, '| body:', sr.body.substring(0,150));

  const allC = [...sc1, ...(sr.cookies||[])];
  const cm = new Map();
  allC.forEach(c => { const nv=c.split(';')[0]; const ei=nv.indexOf('='); cm.set(nv.substring(0,ei).trim(),c); });
  console.log('Cookies:', [...cm.keys()]);

  // Step 3: Playwright
  const browser = await chromium.launch({headless:true});
  const ctx = await browser.newContext({viewport:{width:1440,height:900}});

  const inject = [];
  cm.forEach((cs,name) => {
    const parts = cs.split(';').map(p=>p.trim());
    const ei = parts[0].indexOf('='); const value = parts[0].substring(ei+1);
    const co = {name, value, domain:'localhost', path:'/'};
    parts.slice(1).forEach(a => {
      if (a.toLowerCase().startsWith('path=')) co.path=a.substring(5);
      if (a.toLowerCase()==='httponly') co.httpOnly=true;
      if (a.toLowerCase().startsWith('samesite=')) { const sv=a.substring(9); if(['Strict','Lax','None'].includes(sv)) co.sameSite=sv; }
    });
    inject.push(co);
  });
  await ctx.addCookies(inject);

  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if(m.type()==='error') errs.push(m.text()); });

  // Step 4: Navigate
  await page.goto(BASE_URL+'/expenses/new', {waitUntil:'domcontentloaded',timeout:30000});
  const url1 = page.url();
  console.log('URL:', url1);
  await page.screenshot({path:SS+'/prod-receipt-01-expenses-new.png',fullPage:true});

  if (url1.includes('signin')||url1.includes('login')||url1.includes('/auth/')) {
    console.log('Redirected to auth page, doing UI sign-in...');
    const ei = page.locator('input[type=email],input[name=email]').first();
    if (await ei.count()>0) {
      await ei.fill('agent@local.chefflow');
      await page.locator('input[type=password]').first().fill('CHEF.jdgyuegf9924092.FLOW');
      await page.screenshot({path:SS+'/prod-receipt-02-signin-filled.png'});
      await page.locator('button[type=submit]').first().click();
      await page.waitForTimeout(4000);
      console.log('After login URL:', page.url());
      await page.goto(BASE_URL+'/expenses/new', {waitUntil:'domcontentloaded',timeout:30000});
      console.log('Expenses URL:', page.url());
      await page.screenshot({path:SS+'/prod-receipt-03-expenses-after-login.png',fullPage:true});
    }
  }

  console.log('Title:', await page.title());

  // Step 5: OCR Scan button
  const ocrBtn = page.locator('button', {hasText:'OCR Scan'});
  if (await ocrBtn.count()>0) {
    await ocrBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({path:SS+'/prod-receipt-04-ocr-mode.png',fullPage:true});
    console.log('Clicked OCR Scan');
  } else {
    console.log('OCR Scan button not found. Buttons:', await page.locator('button').allTextContents());
  }

  // Step 6: Set file
  const fi = page.locator('input[type=file]').first();
  if (await fi.count()>0) {
    await fi.setInputFiles(RECEIPT);
    await page.waitForTimeout(1500);
    await page.screenshot({path:SS+'/prod-receipt-05-file-set.png',fullPage:true});
    console.log('File set');
  } else {
    console.log('No file input');
  }

  // Step 7: Scan Receipt
  const sb = page.locator('button', {hasText:'Scan Receipt'});
  if (await sb.count()>0) {
    await sb.click();
    console.log('Clicked Scan Receipt. Polling up to 300s...');
    await page.screenshot({path:SS+'/prod-receipt-06-scanning-start.png',fullPage:true});
    const start = Date.now();
    let done = false;
    while (!done && (Date.now()-start)<300000) {
      const e = Math.round((Date.now()-start)/1000);
      const c = await page.content();
      const ok = c.includes('Scanned Data')||c.includes('OCR Result')||c.includes('Review & Confirm')||c.includes('line items');
      const fail = (c.includes('Failed')||c.includes('failed')||c.includes('Could not'))&&!c.includes('Scanning...');
      const scan = c.includes('Scanning...');
      console.log('['+e+'s] ok='+ok+' fail='+fail+' scanning='+scan);
      if (ok||fail) done=true; else await page.waitForTimeout(5000);
    }
    await page.screenshot({path:SS+'/prod-receipt-09-result.png',fullPage:true});
    const vt = await page.evaluate(()=>document.body.innerText);
    console.log('=== VISIBLE TEXT (4000 chars) ===');
    console.log(vt.substring(0,4000));
  } else {
    console.log('No Scan Receipt button. Buttons:', await page.locator('button').allTextContents());
  }

  console.log('Console errors:', errs.length ? errs : 'None');
  await browser.close();
  console.log('Done.');
}

main().catch(e=>{console.error('FATAL:',e);process.exit(1);});
