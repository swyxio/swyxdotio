const path = require('path')
const glob = require('glob')
const fs = require('fs-extra')
const RSS = require('rss')

const hooks = [
  // {
  //   hook: "html",
  //   name: "compressHtml",
  //   description: "Uses regex to compress html",
  //   priority: 100, // last please :D
  //   run: async ({ htmlString }) => {
  //     return {
  //       htmlString: htmlString
  //         .replace(/[ \t]/gi, " ")
  //         .replace(/[ \n]/gi, " ")
  //         .replace(/[ ]{2,}/gi, " ")
  //         .replace(/>\s+</gi, "><"),
  //     };
  //   },
  // },

  {
    hook: 'bootstrap',
    name: 'copyAssetsToPublic',
    description:
      'Copies /src/assets/ to the assets folder defined in the elder.config.js. This function helps support the live reload process.',
    run: ({ settings }) => {
      // note that this function doesn't manipulate any props or return anything.
      // It is just executed on the 'bootstrap' hook which runs once when Elder.js is starting.

      // copy assets folder to public destination
      glob
        .sync(path.join(settings.rootDir, './src/assets/**/*'))
        .forEach((file) => {
          const parsed = path.parse(file)
          // Only write the file/folder structure if it has an extension
          if (parsed.name === '_redirects' || parsed.ext && parsed.ext.length > 0) {
            const relativeToAssetsFolder = path.relative(path.join(settings.rootDir, './src/assets'), file)
            const p = path.parse(
              path.resolve(settings.distDir, relativeToAssetsFolder)
            )
            fs.ensureDirSync(p.dir)
            fs.outputFileSync(
              path.resolve(
                settings.distDir,
                `${relativeToAssetsFolder}${parsed.name === '_redirects' ? '' : parsed.base}`
              ),
              fs.readFileSync(file)
            )
          }
        })
    }
  },

  {
    hook: 'allRequests',
    name: 'makeRSS',
    priority: 50,
    description:
      'Makes RSS file',
    run: async ({ settings, data }) => {
      if (!settings.build) return // dont build RSS during Dev
      const rssExportPath = path.resolve(
        settings.distDir,
        `rss.xml`
      )
      const authorName = 'swyx'
      const baseUrl = 'https://swyx.io/'
      const rssFeedUrl = 'https://swyx.io/rss.xml'
      const rssFaviconUrl = 'https://swyx.io/favicon.png'
      const title = 'Swyx.io RSS Feed'
      const description = 'RSS Feed for Swyx.io'
      const feed_url = rssFeedUrl
      const site_url = baseUrl
      const image_url = rssFaviconUrl
      const docs = 'http://example.com/rss/docs.html'
      const managingEditor = authorName
      const webMaster = authorName
      const copyright = '2020 ' + authorName
      const language = 'en'
      const categories = ['Tech', 'JavaScript', 'AWS', 'Careers', 'Blog']
      const pubDate = new Date().toUTCString()
      const ttl = '60'

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

      // fs.writeFileSync('testrss.json', JSON.stringify(data, null, 2))
      let _data = [
        ...data.podcasts.map((x) => void (x.type = 'Podcasts') || x),
        ...data.talks.map((x) => void (x.type = 'Talks') || x),
        ...data.markdown.map((x) => void (x.data.type = 'Essays') || x.data)
      ].map(x => {
        if (x.date) x.effectiveDate = new Date(x.date)
        if (x.instances) x.effectiveDate = new Date(x.instances[0].date)
        return x
      }).sort((a, z) => z.effectiveDate - a.effectiveDate)
        .slice(0, 100)

      _data.forEach(item => {
        const slug = item.slug || (item.data ? item.data.slug : null)
        if (!slug) {
          console.log('missing slug: ', { baseUrl, item })
          return // early return
        }
        let itemDescription = 'No description offered - suggest one! <a href="https://github.com/sw-yx/swyxdotio/issues/new">https://github.com/sw-yx/swyxdotio/issues/new</a>'
        // if (item.data && item.data.subtitle) itemDescription = `[${item.data.subtitle}] `
        if (item.data) {
          itemDescription = item.data.description ||
            item.data.desc
        } else if (item.description || item.desc) {
          itemDescription = item.description || item.desc
        }
        if (item.data && item.data.url) {
          itemDescription += ` (External Link: <a href="${item.data.url}">${item.data.url}</a>)`
        }
        if (item.data && item.data.canonical) {
          itemDescription += ` (Canonical Link: <a href="${item.data.canonical}">${item.data.canonical}</a>)`
        }
        feed.item({
          title: item.title || item.data.title,
          url: baseUrl + slug,
          description: itemDescription,
          date: item.date || (item.data && item.data.date) || item.instances && item.instances[0].date,
          // todo: enclosure?
          custom_elements: customElements(item)
        })
      })
      console.log('writing RSS file...')
      fs.writeFileSync(path.resolve(rssExportPath), feed.xml())
      console.log('writing RSS file... done')
      
    }
  }
]
module.exports = hooks

function customElements(item) {
  if (item.html) return [
    {
      'content:encoded': {
        _cdata: item.html
      }
    }
  ]
  const part1 = type => `<h1>${type}: ${item.title}</h1>`
  const rawPart = `<p><pre>${JSON.stringify(item, null, 2)}</pre></p>`
  let instancesPart = ``
  if (item.instances) {
    instancesPart = `<ul>`
    item.instances.forEach(inst => {
      let video = inst.video ? `[<a href="${inst.video}">video</a>]` : ``
      let slides = inst.slides ? `[<a href="${inst.slides}">slides</a>]` : ``
      let url = inst.url ? `[<a href="${inst.url}">url</a>]` : ``
      let github = inst.github ? `[<a href="${inst.github}">github</a>]` : ``
      instancesPart += `<li>${inst.date ? String(inst.date).slice(0, 10) : ''} @ ${inst.venue}: ${[video, slides, url, github].join(', ')}</li>`
    })
    instancesPart += `</ul>`
  }

  if (item.type === 'Talks') return [
    {
      'content:encoded': {
        _cdata: item.url ?
          `<a href="${item.url}">${part1("Talk")}</a>
          ${instancesPart}
          ${rawPart}`
          : `${part1}
          ${instancesPart}
          ${rawPart}`
      }
    }
  ]
  if (item.type === 'Podcasts') return [
    {
      'content:encoded': {
        _cdata: item.url ?
          `<a href="${item.url}">${part1("Podcast")}</a>
          ${instancesPart}
          ${rawPart}`
          : `${part1}
          ${instancesPart}
          ${rawPart}`
      }
    }
  ]
}