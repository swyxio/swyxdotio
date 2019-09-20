const puppeteer = require('puppeteer')
;(async () => {
  // const headless = true
  const headless = false
  const browser = await puppeteer.launch({ headless })
  const page = await browser.newPage()
  page.setViewport({ width: 1200, height: 628 })
  const getHtml = require('./template')
  const text = 'lorem ipsum dolor sit amet'
  const html = getHtml({
    fileType: 'jpg',
    text,
    theme: 'light',
    md: true,
    fontSize: Math.max(7, Math.floor(100 / text.length)) + 'vw',
    images: [
      'https://kentcdodds.com/static/shawn-wang-card-c7351f1039c377d8e3bf5ccf2e574641.png'
    ],
    widths: ['auto'],
    heights: ['225']
  })
  await page.setContent(html)
  await page.screenshot({ path: 'screenshot-plugin/swyx.png' })
  if (headless) {
    await browser.close()
  }
})()
// ;(async () => {
//   const { writeTempFile, pathToFileURL } = require('./writeTempFile')
// const getHtml = require('./template')
// const html = getHtml({
//   fileType: 'jpg',
//   text: 'potato',
//   theme: 'light',
//   md: true,
//   fontSize: '16px',
//   images: ['swyx.jpg'],
//   widths: ['auto'],
//   heights: ['225']
// })
//   const filePath = await writeTempFile('myfilename', html)
//   const fileUrl = pathToFileURL(filePath)
//   console.log({ filePath, fileUrl })
// })()

// var canvas = document.getElementsByTagName('canvas')
// undefined
// var canvas = document.body.getElementsByTagName('canvas')
// undefined
// var canvas = body.getElementsByTagName('canvas')
// VM177:1 Uncaught ReferenceError: body is not defined
//     at <anonymous>:1:14
// (anonymous) @ VM177:1
// document.body.children[0]
// <canvas width=​"100" height=​"100">​
//   var img = document.createElement('img')
//     img.src = 'https://swyx.io/swyx.jpg'
//     img.height = 100
//     img.width = 100
// 100
// var canvas = document.body.children[0]
// undefined
// var ctx = canvas.getContext('2d')
// undefined
// ctx.drawImage(img, 0, 0, 100,100)
// undefined
// ctx.fillStyle = 'rgba(0, 0, 200, 0.5)'
//     ctx.fillText('potato', 40, 80)
// undefined
// canvas.display = 'none'
// "none"

// await page.goto('https://www.swyx.io/writing/svelte-blogging-fit')
// page.evaluate(async () => {
//   var img = document.createElement('img')
//   img.src = 'https://swyx.io/swyx.jpg'
//   img.height = 100
//   img.width = 100
//   document.body.appendChild(img)
//   await page.waitForSelector('img')
//   var canvas = document.createElement('canvas')
//   document.body.appendChild(canvas)
//   var ctx = canvas.getContext('2d')
//   canvas.width = 100
//   canvas.crossOrigin = 'Anonymous'
//   canvas.height = 100
//   // ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
//   ctx.font = '36pt Verdana'
//   // ctx.clearRect(0, 0, canvas.width, canvas.height)
//   ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
//   //refill text
//   ctx.fillStyle = 'rgba(0, 0, 200, 0.5)'
//   ctx.fillText('potato', 40, 80)
// })
