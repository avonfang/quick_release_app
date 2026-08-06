const puppeteer = require('puppeteer')
const path = require('path')

const mockupsDir = __dirname
const files = ['A-沉浸式对话', 'B-卡片式引导', 'C-日记流', 'D-极简聚焦']

;(async () => {
  const browser = await puppeteer.launch({ headless: true })
  for (const name of files) {
    const page = await browser.newPage()
    await page.setViewport({ width: 375, height: 740, deviceScaleFactor: 2 })
    await page.goto(`file://${mockupsDir}/${name}.html`, { waitUntil: 'networkidle0' })
    await page.screenshot({ path: path.join(mockupsDir, `${name}.png`), fullPage: false })
    await page.close()
    console.log(`✓ ${name}.png`)
  }
  await browser.close()
  console.log('Done!')
})()
