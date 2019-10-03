const urljoin = require('url-join')
const fs = require('fs')
const path = require('path')
const RSS = require('rss')
const screenshot = require('./screenshot-plugin/screenshot')

// https://github.com/zeit/og-image
module.exports = async function generateRSS(mainIndex, opts) {
  const rssExportPath = opts.rssExportPath || '__sapper__/export/rss.xml'
  const authorName = required(opts, 'authorName')
  const baseUrl = required(opts, 'baseUrl')
  const rssFeedUrl = required(opts, 'rssFeedUrl')
  const rssFaviconUrl = required(opts, 'rssFaviconUrl')
  const {
    title = opts.title || 'RSS Feed',
    description = opts.rssDescription || 'RSS Feed for ' + rssFeedUrl,
    feed_url = rssFeedUrl,
    site_url = baseUrl,
    image_url = rssFaviconUrl,
    docs = 'http://example.com/rss/docs.html',
    managingEditor = authorName,
    webMaster = authorName,
    copyright = '2019 ' + authorName,
    language = 'en',
    categories = ['Tech', 'Blog'],
    pubDate = new Date().toUTCString(),
    ttl = '60'
  } = opts
  const feed = new RSS({
    title,
    description,
    feed_url,
    site_url,
    image_url,
    docs,
    managingEditor,
    webMaster,
    copyright,
    language,
    categories,
    pubDate,
    ttl
  })

  let PostsToScreenshot = []
  Object.keys(mainIndex).forEach(category => {
    const subIndex = mainIndex[category]
    Object.values(subIndex).forEach(item => {
      let itemDescription = item.metadata.subtitle
        ? `[${item.metadata.subtitle}] `
        : ''
      itemDescription +=
        item.metadata.description ||
        item.metadata.desc ||
        'No description offered - suggest one! <a href="https://github.com/sw-yx/swyxdotio/issues/new">https://github.com/sw-yx/swyxdotio/issues/new</a>'
      if (item.metadata.url) {
        itemDescription += ` (External Link: <a href="${item.metadata.url}">${item.metadata.url}</a>)`
      }
      PostsToScreenshot.push([
        category + '/' + item.metadata.slug,
        item.metadata.title,
        item.metadata.subtitle
      ])
      feed.item({
        title: item.metadata.title,
        url: urljoin(baseUrl, category, item.metadata.slug),
        description: itemDescription,
        date: item.metadata.pubdate
        // todo: enclosure?
      })
    })
  })
  console.log('writing RSS file...')
  fs.writeFileSync(path.resolve(rssExportPath), feed.xml())
  return screenshot(PostsToScreenshot) // is a promise
}

function required(obj, key) {
  if (typeof obj[key] === 'undefined') {
    console.error('Error: ' + key + ' is required')
    process.exit(1)
  }
  return obj[key]
}
