const { readFileSync } = require('fs')
const marked = require('marked')

const twemoji = require('twemoji')
const twOptions = { folder: 'svg', ext: '.svg' }
const emojify = text => twemoji.parse(text, twOptions)

const rglr = readFileSync(`${__dirname}/_fonts/Inter-Regular.woff2`).toString(
  'base64'
)
const bold = readFileSync(`${__dirname}/_fonts/Inter-Bold.woff2`).toString(
  'base64'
)
const mono = readFileSync(`${__dirname}/_fonts/Vera-Mono.woff2`).toString(
  'base64'
)

function getCss(theme, fontSize) {
  let background = 'white'
  let foreground = 'black'
  let radial = 'lightgray'

  if (theme === 'dark') {
    background = 'black'
    foreground = 'white'
    radial = 'dimgray'
  }

  return `
    @font-face {
        font-family: 'Inter';
        font-style:  normal;
        font-weight: normal;
        src: url(data:font/woff2;charset=utf-8;base64,${rglr}) format('woff2');
    }

    @font-face {
        font-family: 'Inter';
        font-style:  normal;
        font-weight: bold;
        src: url(data:font/woff2;charset=utf-8;base64,${bold}) format('woff2');
    }

    @font-face {
        font-family: 'Vera';
        font-style: normal;
        font-weight: normal;
        src: url(data:font/woff2;charset=utf-8;base64,${mono})  format("woff2");
      }

    .bodywrapper {
        background: ${background};
        background-image: url("https://www.swyx.io/swyx-og-card-blank.png");
        background-size: cover;
        font-family: 'Inter', sans-serif;
        object-fit: cover;
        width: auto;
        min-height: calc(100vh - 20px);
        margin: 5px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    body:before {
      content: '';
      position: fixed;
      max-width: 100vw;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: -1;
      border-radius: inherit;
      background: linear-gradient(#e66465, #9198e5);
    }
    code {
        color: #D400FF;
        font-family: 'Vera';
        white-space: pre-wrap;
        letter-spacing: -5px;
    }

    code:before, code:after {
        content: '\`';
    }

    .logo-wrapper {
        display: flex;
        align-items: center;
        align-content: center;
        justify-content: center;
        justify-items: center;
    }

    .logo {
        /*margin: 0 75px;*/
    }

    .plus {
        color: #BBB;
        font-family: Times New Roman, Verdana;
        font-size: 100px;
    }

    .spacer {
      display: flex;
      flex-direction: row;
    }

    .emoji {
        height: 1em;
        width: 1em;
        margin: 0 .05em 0 .1em;
        vertical-align: -0.1em;
    }
    p {
      margin: 0;
      font-weight: bold;
    }
    .heading {
      padding-left: 3rem;
      font-size: ${sanitizeHtml(fontSize)};
      font-style: normal;
      color: ${foreground};
      line-height: 1.25;
      width: 55vw;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .subtitle {
      padding: 3rem;
      font-size: 2em;
      font-style: normal;
      color: ${foreground};
      line-height: 1.25;
      width: 40vw;
    }
    
    .footer {
      padding: 2rem;
      width: 40vw;
      font-size: 3rem;
      display: flex;
      justify-content: space-between;
    }
    `
}

module.exports = function getHtml(parsedReq) {
  const { text, subtitle, theme, md, fontSize } = parsedReq
  return `<!DOCTYPE html>
<html>
    <meta charset="utf-8">
    <title>Generated Image</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        ${getCss(theme, fontSize)}
    </style>
    <body>
      <div class="bodywrapper">
        <div class="heading">${emojify(
          md ? marked(text) : sanitizeHtml(text)
        )}</div>
        ${
          subtitle
            ? `<div class="subtitle">${subtitle}</div>`
            : `
        <div class="footer">
        <div>swyx.io</div>
        <div>@swyx</div>
        </div>
        `
        }
      </div>
    </body>
</html>`
}

function getImage(src, width = 'auto', height = '225') {
  return `<img
        class="logo"
        alt="Generated Image"
        src="${sanitizeHtml(src)}"
        width="${sanitizeHtml(width)}"
        height="${sanitizeHtml(height)}"
    />`
}

function getPlusSign(i) {
  return i === 0 ? '' : '<div class="plus">+</div>'
}

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
}

function sanitizeHtml(html) {
  return String(html).replace(/[&<>"'\/]/g, key => entityMap[key])
}
