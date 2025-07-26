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
    
    console.log("Waiting for localStorage....")
    await new Promise(resolve => setTimeout(resolve, 1000));



    // Search term Update if changing search
    const searchTerm = 'bike';


    await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.waitForSelector('input[placeholder*="Search Marketplace"]', { timeout: 10000 });
    await page.click('input[placeholder*="Search Marketplace"]', { delay: 100 });
    await page.keyboard.type(searchTerm, { delay: 100 });
    await page.keyboard.press('Enter');

    console.log(`Triggered real search for: ${searchTerm}`);
    await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 10000 });

    console.log(`🔍 Searching for: ${searchTerm}.....`);

    await page.waitForSelector('a[href*="/marketplace/item/"]');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const listingLinks = await page.$$eval(
    'a[href*="/marketplace/item/"]',
    anchors => {
        const unique = new Set();
        const links = [];

        for (const anchor of anchors) {
        const href = anchor.href;
        if (!unique.has(href)) {
            unique.add(href);
            links.push(href);
        }
        if (links.length >= 10) break;
        }

        return links;
    }
    );
    console.log(`✅ Found ${listingLinks.length} listings. Opening each one...`);

    // loop through listings and open each with 1.5s delay
    for (const [i, link] of listingLinks.entries()) {
        console.log(`➡️  Opening listing ${i + 1}: ${link}\n`);
        await page.goto(link, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("All listings Viewed.....")
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
