const { chromium } = require('playwright')
const fs = require('fs')

const BASE = 'http://127.0.0.1:3000'
const OUT = process.env.OUT || '/tmp/shots'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function ok(cond, msg, extra) {
  if (!cond) throw new Error('FAIL: ' + msg + (extra ? '\n' + JSON.stringify(extra) : ''))
  console.log('PASS:', msg)
}

const orderOf = (page, sel) =>
  page.$$eval(sel, els => els.map(e => e.getAttribute('data-section-id')))

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  // Use the npm-delivered Chromium build (the Playwright CDN is unreachable here).
  let launchOpts = {}
  try {
    const pack = (await import('@sparticuz/chromium')).default
    launchOpts = {
      executablePath: process.env.PW_CHROME || await pack.executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  } catch (e) {
    if (process.env.PW_CHROME) launchOpts = { executablePath: process.env.PW_CHROME }
  }
  const browser = await chromium.launch(launchOpts)
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e.message || e)))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  const login = await ctx.request.post(BASE + '/api/auth/login', {
    data: { email: 'admin@shopflar.dev', password: 'admin12345' }
  })
  ok(login.ok(), 'admin session created')
  // Playwright's request client drops the secure session cookie over http,
  // so send it explicitly for the API assertions.
  const sessionCookie = (await ctx.cookies()).map(c => `${c.name}=${c.value}`).join('; ')
  const req = (method, path, data) => ctx.request.fetch(BASE + path, {
    method,
    headers: { cookie: sessionCookie },
    ...(data ? { data } : {})
  })

  // The page may be empty in this database — seed sections so the drag flows
  // exercise real content, and remove only what we created at the end.
  const apiBefore = await (await req('GET', '/api/admin/sections?pageType=home')).json()
  const seededIds = []
  if (apiBefore.sections.length < 3) {
    const seeds = [
      { sectionType: 'hero', config: { title: 'Builder verification hero', subtitle: 'A hero section', buttonText: 'Shop', buttonUrl: '/products' } },
      { sectionType: 'text', config: { title: 'Section two', body: 'Second section' } },
      { sectionType: 'product-grid', config: { title: 'Section three', limit: 4, source: 'featured' } },
      { sectionType: 'testimonials', config: { title: 'Section four', items: [{ author: 'Test', rating: 5, text: 'Great' }] } }
    ]
    for (let i = 0; i < seeds.length; i++) {
      const r = await req('POST', '/api/admin/sections', { pageType: 'home', ...seeds[i], sortOrder: i, isVisible: true })
      const d = await r.json()
      if (d.section?.id) seededIds.push(d.section.id)
    }
    ok(seededIds.length === seeds.length, `seeded ${seededIds.length} sections for the drag flows`)
  }

  // ---------- 1. Load builder ----------
  await page.goto(BASE + '/admin/builder', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-builder-canvas] [data-section-id]', { timeout: 20000 })
  await sleep(500)

  const canvasOrder0 = await orderOf(page, '[data-builder-canvas] [data-section-id]')
  const listOrder0 = await orderOf(page, '[data-builder-tree] [data-section-id]')
  ok(canvasOrder0.length >= 3, `canvas renders ${canvasOrder0.length} sections in saved order`)
  ok(JSON.stringify(canvasOrder0) === JSON.stringify(listOrder0), 'structure list matches canvas order', { canvasOrder0, listOrder0 })

  await page.screenshot({ path: OUT + '/01-builder-initial.png' })

  // ---------- 2. Drag first section below the second via grip ----------
  const sections = page.locator('[data-builder-canvas] [data-section-id]')
  // Drag the second section up above the first: lifting it does not move the
  // first section, so the drop point stays under the pointer (deterministic).
  const source = sections.nth(1)
  await source.hover()
  const grip = source.locator('button[aria-label^="Reorder"]').first()
  await grip.waitFor({ state: 'visible' })
  const gb = await grip.boundingBox()
  ok(!!gb, 'grip handle is visible and measurable')
  const boxes = await page.locator('[data-builder-canvas] [data-section-id]').evaluateAll(els => els.map(e => {
    const r = e.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }))
  const target = boxes[0]
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2)
  await page.mouse.down()
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2 - 12, { steps: 6 })
  await page.mouse.move(target.x + target.w / 2, target.y + Math.min(80, target.h * 0.3), { steps: 25 })
  await sleep(600)
  await page.screenshot({ path: OUT + '/02-drag-mid.png' })
  await page.mouse.up()
  await sleep(1500)

  const expected = [...canvasOrder0]
  ;[expected[0], expected[1]] = [expected[1], expected[0]]
  const canvasOrder1 = await orderOf(page, '[data-builder-canvas] [data-section-id]')
  const listOrder1 = await orderOf(page, '[data-builder-tree] [data-section-id]')
  ok(JSON.stringify(canvasOrder1) === JSON.stringify(expected), 'canvas order changed after drag', { expected, canvasOrder1 })
  ok(JSON.stringify(listOrder1) === JSON.stringify(expected), 'structure list order changed after drag', { expected, listOrder1 })
  await page.screenshot({ path: OUT + '/03-after-drag.png' })

  // ---------- 3. Persisted order (API + reload) ----------
  const apiRes = await req('GET', '/api/admin/sections?pageType=home')
  const apiJson = await apiRes.json()
  const apiOrder = apiJson.sections.map(s => s.id)
  ok(JSON.stringify(apiOrder) === JSON.stringify(expected), 'API returns the dragged order', { apiOrder, expected })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-builder-canvas] [data-section-id]')
  await sleep(600)
  const canvasOrder2 = await orderOf(page, '[data-builder-canvas] [data-section-id]')
  const listOrder2 = await orderOf(page, '[data-builder-tree] [data-section-id]')
  ok(JSON.stringify(canvasOrder2) === JSON.stringify(expected), 'canvas order persists after reload', { expected, canvasOrder2 })
  ok(JSON.stringify(listOrder2) === JSON.stringify(expected), 'structure list order persists after reload')

  // ---------- 4. Drag a block from Add onto the canvas ----------
  const beforeAdd = await orderOf(page, '[data-builder-canvas] [data-section-id]')
  await page.locator('[data-builder-left]').getByRole('button', { name: 'Add', exact: true }).click()
  const block = page.locator('[data-block-type="text"]')
  await block.waitFor({ state: 'visible' })
  let dropped = false
  try {
    await block.dragTo(page.locator('[data-builder-canvas] [data-section-id]').first(), { timeout: 5000 })
    dropped = true
  } catch (e) {
    console.log('note: native dragTo failed, using DataTransfer fallback')
  }
  if (!dropped) {
    await page.evaluate(() => {
      const src = document.querySelector('[data-block-type="text"]')
      const dst = document.querySelector('[data-builder-canvas] [data-section-id]')
      const dt = new DataTransfer()
      src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
      dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }))
      dst.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }))
      src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
    })
  }
  await sleep(2000)
  const afterAdd = await orderOf(page, '[data-builder-canvas] [data-section-id]')
  ok(afterAdd.length === beforeAdd.length + 1, `block dropped from Add panel (${beforeAdd.length} → ${afterAdd.length})`, { afterAdd })
  const newId = afterAdd[afterAdd.length - 1]
  const lastType = await page.locator('[data-builder-canvas] [data-section-id]').last().getAttribute('data-section-type')
  ok(lastType === 'text', 'dropped block is appended at the end as a text section', { lastType })
  const listAfterAdd = await orderOf(page, '[data-builder-tree] [data-section-id]')
  ok(listAfterAdd[listAfterAdd.length - 1] === newId, 'structure list also shows the appended block')
  await page.screenshot({ path: OUT + '/04-after-add.png' })

  const apiAdd = await (await req('GET', '/api/admin/sections?pageType=home')).json()
  ok(apiAdd.sections[apiAdd.sections.length - 1].id === newId, 'API persisted the appended block')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-builder-canvas] [data-section-id]')
  await sleep(600)
  const afterReload = await orderOf(page, '[data-builder-canvas] [data-section-id]')
  ok(afterReload.length === afterAdd.length && afterReload[afterReload.length - 1] === newId, 'appended block persists after reload', { afterReload })

  // ---------- 5. Preview ----------
  let previewRequests = 0
  page.on('request', r => { if (r.url().includes('preview=1')) previewRequests++ })
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const frameEl = await page.waitForSelector('iframe[title="Storefront preview"]', { timeout: 15000 })
  await sleep(2500)
  const frame = await frameEl.contentFrame()
  ok(!!frame, 'preview iframe exists')
  const bodyText = await frame.locator('body').innerText().catch(() => '')
  ok(bodyText.trim().length > 80, `preview iframe renders real content (${bodyText.trim().length} chars)`, { sample: bodyText.slice(0, 160) })
  ok(!/Application error|Internal Server Error|This page could not be found/i.test(bodyText), 'preview iframe is not an error page', { sample: bodyText.slice(0, 160) })
  const h1 = await frame.locator('h1, h2').count()
  ok(h1 > 0, 'preview iframe contains storefront headings')

  const hostChrome = await page.locator('[data-builder-canvas-area]').innerText()
  ok(hostChrome.includes('127.0.0.1:3000'), 'browser chrome shows the real host', { sample: hostChrome.slice(0, 120) })
  ok(hostChrome.includes('/'), 'browser chrome shows the path')

  const frameBox = async () => (await page.locator('iframe[title="Storefront preview"]').boundingBox()).width
  const desktopW = await frameBox()
  await page.locator('button[title="Tablet preview"]').click()
  await sleep(900)
  const tabletW = await frameBox()
  await page.screenshot({ path: OUT + '/05-preview-tablet.png' })
  await page.locator('button[title="Mobile preview"]').click()
  await sleep(900)
  const mobileW = await frameBox()
  await page.screenshot({ path: OUT + '/06-preview-mobile.png' })
  await page.locator('button[title="Desktop preview"]').click()
  await sleep(900)
  const desktopW2 = await frameBox()
  await page.screenshot({ path: OUT + '/07-preview-desktop.png' })
  ok(desktopW > tabletW + 50, `desktop frame (${Math.round(desktopW)}px) wider than tablet (${Math.round(tabletW)}px)`)
  ok(tabletW > mobileW + 100, `tablet frame (${Math.round(tabletW)}px) wider than mobile (${Math.round(mobileW)}px)`)
  ok(Math.abs(mobileW - 390) < 3, `mobile frame is 390px (${Math.round(mobileW)}px)`)
  ok(Math.abs(desktopW - desktopW2) < 2, 'returning to desktop restores the frame width')

  const reqBefore = previewRequests
  await page.locator('button[aria-label="Reload preview"]').click()
  await sleep(2000)
  ok(previewRequests > reqBefore, `reload re-requests the storefront preview (${reqBefore} → ${previewRequests})`)
  const frame2 = await (await page.$('iframe[title="Storefront preview"]')).contentFrame()
  const text2 = await frame2.locator('body').innerText().catch(() => '')
  ok(text2.trim().length > 80, 'iframe still renders after reload')

  await page.getByRole('button', { name: 'Exit preview', exact: true }).click()
  await sleep(500)
  ok(await page.locator('[data-builder-canvas] [data-section-id]').first().isVisible(), 'exiting preview returns to the editable canvas')

  // ---------- 7. Laptop viewport usability ----------
  const laptop = await ctx.newPage()
  await laptop.setViewportSize({ width: 1366, height: 768 })
  await laptop.goto(BASE + '/admin/builder', { waitUntil: 'domcontentloaded' })
  await laptop.waitForSelector('[data-builder-canvas] [data-section-id]')
  await sleep(600)
  const overflow = await laptop.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(overflow <= 1, `no horizontal overflow at 1366px (overflow ${overflow}px)`)
  for (const label of ['Publish', 'Preview']) {
    const btn = laptop.getByRole('button', { name: label, exact: true })
    const box = await btn.boundingBox()
    ok(!!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1366 && box.y + box.height <= 768, `${label} button fully inside the laptop viewport`, box)
  }
  const publishBox = await laptop.getByRole('button', { name: 'Publish', exact: true }).boundingBox()
  const hitsPublish = await laptop.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return !!(el && (el.textContent || '').includes('Publish'))
  }, { x: publishBox.x + publishBox.width / 2, y: publishBox.y + publishBox.height / 2 })
  ok(hitsPublish, 'Publish is the topmost clickable element (not covered)')
  const addTab = await laptop.locator('[data-builder-left]').getByRole('button', { name: 'Add', exact: true }).boundingBox()
  ok(!!addTab && addTab.y >= 0 && addTab.y + addTab.height <= 768, 'Add tab is visible at laptop size')
  await laptop.locator('[data-builder-canvas] [data-section-id]').first().click()
  await sleep(400)
  const inspectorVisible = await laptop.getByText('Section', { exact: true }).first().isVisible()
  ok(inspectorVisible, 'inspector opens when selecting a section')
  await laptop.screenshot({ path: OUT + '/08-laptop.png' })

  // ---------- 8. Cleanup: remove test sections, restore prior state ----------
  await req('DELETE', '/api/admin/sections/' + newId)
  if (seededIds.length) {
    for (const id of seededIds) await req('DELETE', '/api/admin/sections/' + id)
    const after = await (await req('GET', '/api/admin/sections?pageType=home')).json()
    ok(after.sections.length === apiBefore.sections.length, 'test sections cleaned up', { remaining: after.sections.length })
  } else {
    for (let i = 0; i < canvasOrder0.length; i++) {
      await req('PATCH', '/api/admin/sections/' + canvasOrder0[i], { sortOrder: i })
    }
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-builder-canvas] [data-section-id]')
    await sleep(600)
    const restored = await orderOf(page, '[data-builder-canvas] [data-section-id]')
    ok(JSON.stringify(restored) === JSON.stringify(canvasOrder0), 'test changes cleaned up and original order restored', { restored, canvasOrder0 })
  }

  // ---------- 9. Console health ----------
  const blocking = consoleErrors.filter(e =>
    !/Failed to load resource|net::ERR|favicon|Download the React DevTools/i.test(e)
  )
  console.log('console errors:', JSON.stringify(consoleErrors, null, 2))
  console.log('page errors:', JSON.stringify(pageErrors, null, 2))
  ok(pageErrors.length === 0, 'no uncaught page errors during the flows')
  ok(blocking.length === 0, 'no blocking console errors during the flows', { blocking })

  await browser.close()
  console.log('\nALL CHECKS PASSED')
}

main().catch(async (e) => {
  console.error('\n' + (e.stack || e.message))
  process.exit(1)
})
