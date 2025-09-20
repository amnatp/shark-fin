const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async ()=>{
  const outDir = path.join(__dirname, '..', 'public', 'manual', 'assets');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  // Helper to set current user via localStorage then navigate
  async function loginAs(username){
    const user = {
      username,
      display: username.replace('.', ' '),
      role: username.startsWith('salesmanager.') ? 'SalesManager' : (username.split('.')[0] || 'Guest')
    };
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' }).catch(()=>{});
    await page.evaluate(u => localStorage.setItem('currentUser', JSON.stringify(u)), user);
  }

  // Ensure app uses the latest user, then navigate to path
  async function capture(pathname, outName){
    await page.goto('http://localhost:5174'+pathname, { waitUntil: 'networkidle2' });
    // wait a short time for client render
    await page.waitForTimeout(600);
    const full = path.join(outDir, outName);
    await page.screenshot({ path: full, fullPage: true });
    console.log('Saved', full);
  }

  try{
    await loginAs('salesmanager.top');
    // Capture Inquiry Cart
    await capture('/inquiry-cart', 'inquiry-cart-salesmanager.png');
    // Capture Quotation list/new (open new)
    await capture('/quotations/new', 'quotation-edit-salesmanager.png');
    // Capture Bundled Rates
    await capture('/bundles', 'bundled-rates-salesmanager.png');
  }catch(err){
    console.error('Screenshot error', err);
  }finally{
    await browser.close();
  }
})();