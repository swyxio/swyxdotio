const fs = require('fs')
const path = require('path')
const { langs, link_renderer } = require('./sapper_sitekit')
const marked = require('marked')
const fm = require('front-matter')
const { makeSlugProcessor } = require('./sapper_markdown_slug')
const SLUG_PRESERVE_UNICODE = false
const shiki = require('shiki')

const makeSlug = makeSlugProcessor(SLUG_PRESERVE_UNICODE)

exports.get_posts = getPosts
async function getPosts(contentPath, linkPrefix = '') {
  const highlighter = await shiki.getHighlighter({
    theme: 'Material-Theme-Palenight'
  })
  const potato = await Promise.all(
    fs.readdirSync(contentPath).map(async file => {
      const fullFilePath = path.join(contentPath, file)
      if (fs.lstatSync(fullFilePath).isDirectory()) {
        // recursive
        const data = await getPosts(fullFilePath, linkPrefix)
        return data
      }
      if (path.extname(file) !== '.md') return

      const match = /^(.+)\.md$/.exec(file)
      // if (!match) throw new Error(`Invalid filename '${file}'`)

      const [, slug] = match

      const markdown = fs.readFileSync(fullFilePath, 'utf-8')

      const { body: content, attributes: metadata } = fm(markdown)
      let pubdate = metadata.date || new Date().toString().slice(4, 15)
      const date = new Date(`${pubdate} EDT`) // cheeky hack
      metadata.pubdate = pubdate
      metadata.date = new Date(pubdate)
      metadata.dateString = date.toDateString()

      const renderer = new marked.Renderer()

      renderer.link = link_renderer

      renderer.code = (source, lang = 'javascript') => {
        // const plang = langs[lang] || 'javascript'
        lang = lang.split(':')[0]
        if (lang === 'toml') lang = 'markdown'
        if (lang === '') lang = 'markdown'
        return highlighter.codeToHtml(source, lang)
        // return `<pre class='language-${plang}'><code>${highlighted}</code></pre>`
      }

      renderer.heading = (text, level, rawtext) => {
        const fragment = makeSlug(rawtext)

        return `
					<h${level}>
						<span id="${fragment}" class="offset-anchor"></span>
						<a href="/${linkPrefix}/${slug}#${fragment}" class="anchor" aria-hidden="true"></a>
						${text}
					</h${level}>`
      }

      const temp = content.replace(/^\t+/gm, match =>
        match.split('\t').join('  ')
      )
      const html = marked(temp, {
        gfm: true,
        breaks: true,
        headerIds: true,
        headerPrefix: 'id_',
        renderer
      })

      const newSlug = slug
      return {
        html,
        metadata,
        slug: newSlug
      }
    })
  )
  // potato.forEach((x) => {
  //   if (x && x.slug === 'typescript-generics') {
  //     console.log('peek', { x })
  //   }
  // })

  return (
    potato
      .filter(Boolean)
      .reduce(
        (acc, cur) => (Array.isArray(cur) ? [...acc, ...cur] : [...acc, cur]),
        []
      )
      .filter(x => x.metadata && Boolean(x.metadata.title)) // require metadata and title
      // .map(x => {
      //   console.log(Object.keys(x.metadata))
      //   return x
      // })
      .filter(x =>
        typeof x.metadata.published === 'undefined'
          ? true
          : x.metadata.published
      ) // take out published false
      .sort((a, b) => {
        return a.metadata.pubdate < b.metadata.pubdate ? 1 : -1
      })
      .filter(Boolean)
  )
}
