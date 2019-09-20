function required(obj, key) {
  if (typeof obj[key] === 'undefined') {
    console.error('Error: ' + key + ' is required')
    process.exit(1)
  }
  return obj[key]
}
const urljoin = require('url-join')
const fs = require('fs')
const path = require('path')

module.exports = function generateRSS(mainIndex, opts) {
  const rssExportPath = opts.rssExportPath || '__sapper__/export/rss.xml'
  const title = opts.title || 'RSS Feed'
  const baseUrl = required(opts, 'baseUrl')
  const rssFeedUrl = required(opts, 'rssFeedUrl')
  const rssDescription = opts.rssDescription || 'RSS Feed for ' + rssFeedUrl
  const rssFaviconUrl = required(opts, 'rssFaviconUrl')

  let allItems = []
  Object.keys(mainIndex).forEach(category => {
    const subIndex = mainIndex[category]
    Object.values(subIndex).forEach(item => {
      let itemDescription =
        item.metadata.description ||
        item.metadata.desc ||
        'No description offered - suggest one! <a href="https://github.com/sw-yx/swyxdotio/issues/new">https://github.com/sw-yx/swyxdotio/issues/new</a>'
      if (item.metadata.url) {
        itemDescription += ` (External Link: <a href="${item.metadata.url}">${item.metadata.url}</a>)`
      }
      allItems.push({
        itemTitle: item.metadata.title,
        itemUrl: urljoin(baseUrl, category, item.metadata.slug),
        itemDescription,
        itemPubDate: item.metadata.pubdate
      })
    })
  })
  allItems = allItems.sort((a, b) => (a.itemPubDate > b.itemPubDate ? -1 : 1))

  const xmlString = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
	<title>${title}</title>
	<link>${rssFeedUrl}</link>
	<description>${rssDescription}</description>
	<image>
		<url>${rssFaviconUrl}</url>
    <title>${title}</title>
    <link>${rssFeedUrl}</link>
	</image>
	${allItems
    .map(
      item => `
		<item>
			<title>${item.itemTitle}</title>
			<link>${item.itemUrl}</link>
			<description><![CDATA[${item.itemDescription}]]></description>
			<pubDate>${item.itemPubDate.toUTCString()}</pubDate>
		</item>
	`
    )
    .join('\n')}
</channel>
</rss>`

  console.log('writing RSS file...')
  fs.writeFileSync(path.resolve(rssExportPath), xmlString)
}
