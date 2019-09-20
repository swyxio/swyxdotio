const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

module.exports = screenshot
async function screenshot(PostArray) {
  const headless = true
  // const headless = false // for debug
  const browser = await puppeteer.launch({ headless })
  const page = await browser.newPage()
  page.setViewport({ width: 1200, height: 628 })
  const getHtml = require('./template')
  console.log('taking screenshots...')
  for (const post of PostArray) {
    const [slug, text] = post
    const html = getHtml({
      fileType: 'jpg',
      text,
      theme: 'light',
      md: true,
      fontSize: Math.min(20, Math.max(7, Math.floor(100 / text.length))) + 'vw'
    })
    await page.setContent(html)
    const filePath = path.resolve(`static/og_image/${slug}.png`)
    ensureDirectoryExistence(filePath)
    await page.screenshot({ path: filePath })
  }
  if (headless) {
    await browser.close()
  }
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) {
    return true
  }
  ensureDirectoryExistence(dirname)
  fs.mkdirSync(dirname)
}
