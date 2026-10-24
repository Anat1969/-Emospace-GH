// End-to-end smoke test: npm run build && npm run preview, then node e2e/flow.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://localhost:4173/';
const MENU = process.env.AI_MENU_FILE; // optional local copy when the CDN is unreachable
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const mk = async (opts) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], ...opts });
    if (MENU) await ctx.route('https://appofapp-gh.vercel.app/ai-menu.js', (r) => r.fulfill({ body: fs.readFileSync(MENU, 'utf8'), contentType: 'text/javascript' }));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    return page;
  };
  const arch = await mk({ viewport: { width: 1280, height: 860 } });
  await arch.goto(URL + '#/projects/new');
  ok(await arch.locator('ai-menu .logo').isVisible(), 'A&I logo button in the top bar');
  ok(!(await arch.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'no loose development buttons in the bar');
  await arch.fill('input[required]', 'משפחת כהן');
  await arch.fill('input[type=number]', '140');
  await arch.click('button[type=submit]');
  await arch.waitForSelector('.link-box');
  const invite = await arch.locator('.link-box').innerText();
  ok(invite.includes('#/q/'), 'invite link shown');

  // Client on another device
  const client = await mk({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await client.goto(invite);
  await client.click('text=מתחילים');
  await client.click('.tile >> text=שלווה');
  await client.click('.tile >> text=ריכוז');
  await client.fill('textarea', 'שקט אחרי יום ארוך');
  await client.click('text=הבא');
  await client.click('.palette >> text=מרווה');
  await client.click('.palette >> text=ים תיכון');
  await client.click('.palette >> text=אוכרה'); await client.click('.palette >> text=אוכרה');
  await client.click('text=הבא');
  await client.click('.memory >> text=יער');
  await client.click('text=הבא');
  await client.click('.pick >> text=רוח בעלים');
  await client.click('text=הבא');
  await client.click('text=הבא');
  await client.click('.material >> text=עץ');
  await client.click('.material >> text=בטון');
  await client.click('text=הבא');
  await client.click('.chip-btn >> text=עבודה מהבית');
  await client.click('.chip-btn >> text=קריאה');
  await client.click('text=סיום');
  await client.waitForSelector('text=שליחת התשובות לאדריכל');
  await client.click('text=שליחת התשובות לאדריכל');
  await client.waitForTimeout(300);
  const reply = await client.evaluate(() => navigator.clipboard.readText());
  ok(reply.includes('#/import?r='), 'reply link copied');

  // Architect imports
  await arch.goto(reply);
  await arch.click('text=קליטה לפרויקט');
  await arch.waitForSelector('text=הפעלת ניתוח');
  ok((await arch.locator('.module-list .done').count()) === 7, 'all seven modules imported');
  await arch.click('text=הפעלת ניתוח');
  await arch.waitForSelector('.result-title h1', { timeout: 10000 });
  await arch.waitForTimeout(5000);
  console.log('archetype:', await arch.locator('.result-title h1').innerText());

  // Dashboard and editing via the menu
  await arch.goto(URL + '#/dashboard');
  await arch.waitForSelector('.project');
  await arch.locator('ai-menu .logo').click();
  await arch.locator('ai-menu .item', { hasText: 'מצב עריכה' }).click();
  ok(await arch.locator('.project .btn.danger').first().isVisible(), 'delete appears only in edit mode');

  // Mobile results
  const m = await mk({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(URL);
  await m.waitForTimeout(4000);
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, 'no horizontal scroll on phone (' + sw + ')');
  await browser.close();
})();
