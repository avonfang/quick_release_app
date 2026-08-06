const puppeteer = require('puppeteer')
const path = require('path')

const mockupsDir = __dirname
const files = ['E-流式输出', 'F-预生成', 'G-日记流异步', 'H-语音优先']

;(async () => {
  const browser = await puppeteer.launch({ headless: true })
  for (const name of files) {
    const page = await browser.newPage()
    await page.setViewport({ width: 375, height: 740, deviceScaleFactor: 2 })
    await page.goto(`file://${mockupsDir}/${name}.html`, { waitUntil: 'networkidle0' })
    await page.screenshot({ path: path.join(mockupsDir, `${name}.png`), fullPage: false })
    await page.close()
    console.log(`OK ${name}.png`)
  }
  await browser.close()
  console.log('Done!')
})()
