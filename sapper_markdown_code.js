const fs = require('fs')
const path = require('path')
const { extract_frontmatter, langs, link_renderer } = require('./sapper_sitekit')
const marked = require('marked')
const { makeSlugProcessor } = require('./sapper_markdown_slug')
const SLUG_PRESERVE_UNICODE = false
const PrismJS = require('prismjs')
require('prismjs/components/prism-markdown')
require('prismjs/components/prism-typescript')
require('prismjs/components/prism-jsx')
require('prismjs/components/prism-tsx')

const makeSlug = makeSlugProcessor(SLUG_PRESERVE_UNICODE)

exports.get_posts = getPosts
function getPosts(contentPath, linkPrefix = '') {
  return fs
    .readdirSync(contentPath)
    .map((file) => {
      const fullFilePath = path.join(contentPath, file)
      if (fs.lstatSync(fullFilePath).isDirectory()) {
        // recursive
        const data = getPosts(fullFilePath, linkPrefix)
        return data
      }
      if (path.extname(file) !== '.md') return

      const match = /^(.+)\.md$/.exec(file)
      // if (!match) throw new Error(`Invalid filename '${file}'`)

      const [, slug] = match

      const markdown = fs.readFileSync(fullFilePath, 'utf-8')

      const { content, metadata } = extract_frontmatter(markdown)
      let pubdate = metadata.date || new Date().toString().slice(4, 15)
      const date = new Date(`${pubdate} EDT`) // cheeky hack
      metadata.pubdate = pubdate
      metadata.date = new Date(pubdate)
      metadata.dateString = date.toDateString()

      const renderer = new marked.Renderer()

      renderer.link = link_renderer

      renderer.code = (source, lang) => {
        const plang = langs[lang] || 'javascript'
        const temp = Object.keys(PrismJS.languages)
        const highlighted = PrismJS.highlight(source, PrismJS.languages[plang], lang)

        return `<pre class='language-${plang}'><code>${highlighted}</code></pre>`
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

      const temp = content.replace(/^\t+/gm, (match) => match.split('\t').join('  '))
      const html = marked(temp, { renderer })

      const newSlug = slug
      return {
        html,
        metadata,
        slug: newSlug,
      }
    })
    .filter(Boolean)
    .reduce((acc, cur) => (Array.isArray(cur) ? [...acc, ...cur] : [...acc, cur]), [])
    .sort((a, b) => {
      if (!a.metadata) console.log('nometadata', Object.keys(a[0]))
      return a.metadata.pubdate < b.metadata.pubdate ? 1 : -1
    })
}
