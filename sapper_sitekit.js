const fleece = require('golden-fleece')

exports.extract_frontmatter = (markdown) => {
  const match = /---\r?\n([\s\S]+?)\r?\n---/.exec(markdown)
  if (match) {
    // has frontmatter
    const frontMatter = match[1]
    const content = markdown.slice(match[0].length)

    const metadata = {}
    frontMatter.split('\n').forEach((pair) => {
      const colonIndex = pair.indexOf(':')
      let value = pair.slice(colonIndex + 1).trim()
      if (value === 'false') value = false // SWYX
      metadata[pair.slice(0, colonIndex).trim()] = value
    })

    return { metadata, content }
  } else {
    // no frontmatter
    return { metadata: {}, content: markdown }
  }
}

exports.extract_metadata = (line, lang) => {
  try {
    if (lang === 'html' && line.startsWith('<!--') && line.endsWith('-->')) {
      return fleece.evaluate(line.slice(4, -3).trim())
    }

    if (lang === 'js' || (lang === 'json' && line.startsWith('/*') && line.endsWith('*/'))) {
      return fleece.evaluate(line.slice(2, -2).trim())
    }
  } catch (err) {
    // TODO report these errors, don't just squelch them
    return null
  }
}

// map lang to prism-language-attr
exports.langs = {
  bash: 'bash',
  html: 'markup',
  sv: 'markup',
  js: 'javascript',
  css: 'css',
}

// links renderer
exports.link_renderer = (href, title, text) => {
  let target_attr = ''
  let title_attr = ''

  if (href.startsWith('http')) {
    target_attr = ' target="_blank"'
  }

  if (title !== null) {
    title_attr = ` title="${title}"`
  }

  return `<a href="${href}"${target_attr}${title_attr}  rel="noopener noreferrer">${text}</a>`
}
