// Renders character-id-card.html to a true-RGBA PNG (transparent outside
// the card). Usage: node assets/ui/character-id-card/render.mjs
import { chromium } from 'playwright'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../../public/assets/special/character-id-card.png')

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 2 })
await page.goto(pathToFileURL(resolve(here, 'character-id-card.html')).href)
await page.evaluate(() => document.fonts.ready)
await page.locator('#card').screenshot({ path: out, omitBackground: true })
await browser.close()
console.log(out)
