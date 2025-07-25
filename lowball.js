const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());



(async () => { // launcher settings
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Users\\Xander\\AppData\\Local\\Programs\\Opera GX\\opera.exe',
    defaultViewport: null,
    args: ['--start-maximized', '--disable-notifications']
  });



  // opens browser
  const page = await browser.newPage();
  const sessionPath = './session.json';

  // Load session if it exists
  if (fs.existsSync(sessionPath)) {
    const { cookies, localStorage } = JSON.parse(fs.readFileSync(sessionPath));

    // get saved cookies in cache
    await page.setCookie(...cookies);
    console.log('✅ Loaded saved cookies');

    // go to FBM
    await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'domcontentloaded' });

    await page.evaluate(storage => {
      for (const [key, value] of Object.entries(storage)) {
        localStorage.setItem(key, value);
      }
    }, localStorage);

    await page.reload({ waitUntil: 'networkidle2' });
    console.log('🔄 Reloaded with localStorage');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Search term Update if changing search
    const searchTerm = 'rx7';
    const searchUrl = `https://www.facebook.com/marketplace/?query=${encodeURIComponent(searchTerm)}` // fills in query to my search term (note: every search is a query in FB)

    await page.goto(searchUrl, {waitUntil: 'networkidle2'});
    console.log(`🔍 Searching for: ${searchTerm}.....`);

    await page.waitForSelector('a[href*="/marketplace/item/"]');

  const listingLinks = await page.$$eval('a[href*="/marketplace/item/"]', (anchors, searchTerm) => {
    const unique = new Set();
    const results = [];

    for (const anchor of anchors) {
      const titleSpan = anchor.querySelector('span[dir="auto"]');
      const title = titleSpan?.innerText?.toLowerCase() || '';
      const href = anchor.href;

      if (!unique.has(href) && title.includes(searchTerm.toLowerCase())) {
        results.push({ title, href });
        console.log(`Added: ${title}`)
        unique.add(href);
      }
    }

    return results;
  }, searchTerm); 
  
  console.log(`✅ Found ${listingLinks.length} listings with "${searchTerm}" in the title`);

  for (const [i, { title, href }] of listingLinks.entries()) {
    console.log(`➡️ Opening listing ${i + 1}: ${title}`);
    await page.goto(href, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(4000);
  }
}


  else { // this only runs if the cookies are not already saved
    // First-time login
    await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'networkidle2' });
    console.log('⏳ Please log in manually. Then press ENTER in this terminal...');

    // Optional wait buffer
    await new Promise(resolve => setTimeout(resolve, 15000));

    process.stdin.once('data', async () => {
      // Save cookies
      const cookies = await page.cookies();

      // Save localStorage
      const localStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      });

      fs.writeFileSync(sessionPath, JSON.stringify({ cookies, localStorage }, null, 2));
      console.log('✅ Session saved! You can now rerun this script to skip login.');

      // Optionally close browser
      // await browser.close();
    });
  }



})();
