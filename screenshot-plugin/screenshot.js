const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

module.exports = screenshot
async function screenshot(
  PostArray,
  headful = null // set truthy to design/debug
) {
  const headless = !headful
  const browser = await puppeteer.launch({ headless })
  const page = await browser.newPage()
  page.setViewport({ width: 1200, height: 628 })
  const getHtml = require('./template')
  console.log('taking screenshots...')
  let i = 0
  for (const post of PostArray) {
    i++
    const [metadata, text, subtitle] = post
    const slug = metadata.slug

    // prep
    // const filePath = path.resolve(`static/og_image/${slug}.png`)
    const filePath = path.resolve(`__sapper__/export/og_image/${slug}.png`)
    ensureDirectoryExistence(filePath)
    if (fs.existsSync(filePath)) continue // skip any images that were already there

    // do work
    if (text.length > 59)
      console.log(
        'warning: post "' + slug + '" has a long title that will look bad: ',
        text
      )
    const html = getHtml({
      fileType: 'jpg',
      text,
      subtitle,
      theme: 'light',
      md: true,
      fontSize: Math.min(20, Math.max(7, Math.floor(80 / text.length))) + 'vw'
    })
    await page.setContent(html)
    await page.screenshot({ path: filePath })
    console.log('screenshotted ', filePath)
  }

  if (headless) {
    await browser.close()
  }
  console.log(i + ' screenshots done!')
}

let seenDirName = ''
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath)
  if (dirname === seenDirName) return // short circuit if seen
  seenDirName = dirname // set seen
  if (fs.existsSync(dirname)) {
    return true
  }
  ensureDirectoryExistence(dirname)
  fs.mkdirSync(dirname)
}
