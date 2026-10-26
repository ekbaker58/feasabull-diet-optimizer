// Browser check of web/index.html with Playwright (run: npm run test:web). Needs Chromium + the playwright package.
// Checks: no console errors, every section renders for the example person, the main interactions work, and the page
// never scrolls sideways at phone width (375 px). Screenshots go to tests/out/.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const page_url = 'file://' + fileURLToPath(new URL('../web/index.html', import.meta.url));
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };

const browser = await chromium.launch();
for (const [w, h, scheme] of [[1280, 900, 'light'], [375, 800, 'dark']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  await page.goto(page_url);
  await page.waitForSelector('.opt');
  await page.waitForFunction(() => document.querySelectorAll('#diets tbody tr').length > 0);
  const n = await page.locator('.opt').count();
  check(n >= 3, `${w}px: ${n} plan options shown`);
  const cost = await page.locator('.opt .p').first().innerText();
  check(/\$\d+\.\d\d/.test(cost), `${w}px: lowest-cost option shows a price (${cost.replace(/\s+/g, ' ')})`);
  check(await page.locator('#meals .meal').count() === 4, `${w}px: four meals`);
  check(await page.locator('#check td.no').count() === 0, `${w}px: plan meets every target`);
  check(await page.locator('#diets tbody tr').count() >= 10, `${w}px: every-diet table filled`);
  check(await page.locator('#shop tbody tr').count() > 5, `${w}px: shopping list filled`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${w}px: no horizontal page scroll (overflow ${overflow}px)`);
  // interactions
  await page.locator('.opt').nth(1).click();
  check((await page.locator('#day-title').innerText()).includes((await page.locator('.opt .t').nth(1).innerText()).split('\n')[0].trim()), `${w}px: clicking an option shows that day`);
  await page.locator('#days input').first().fill('7');
  check(/days add up to/.test(await page.locator('#week-totals').innerText()), `${w}px: editing days updates the week totals`);
  await page.locator('label[for="al-peanut"]').click();
  await page.waitForTimeout(400);
  check(!(await page.locator('#meals').innerText()).includes('Peanut butter'), `${w}px: peanut allergy removes peanut butter`);
  await page.locator('#picker-box summary').click();
  await page.locator('.pf[data-id="mango"] button.like').click();
  await page.waitForTimeout(400);
  check(await page.locator('.opt .t', { hasText: 'Your picks' }).count() === 1, `${w}px: liking a food adds a "Your picks" option`);
  await page.selectOption('#diet', 'Vegan');
  await page.waitForTimeout(400);
  check(await page.locator('.opt').count() >= 3, `${w}px: Vegan diet gives options`);
  await page.screenshot({ path: fileURLToPath(new URL(`./out/web_${w}.png`, import.meta.url)), fullPage: true });
  check(errors.length === 0, `${w}px: no console errors ${errors.length ? JSON.stringify(errors) : ''}`);
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} web checks failed` : 'web checks passed');
process.exit(fails ? 1 : 0);
