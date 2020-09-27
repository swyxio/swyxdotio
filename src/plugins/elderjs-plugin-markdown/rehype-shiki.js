const shiki = require('shiki')
const visit = require('unist-util-visit')
// const {
//   commonLangIds,
//   commonLangAliases,
//   otherLangIds
// } = require('shiki-languages')
const hastToString = require('hast-util-to-string')
const u = require('unist-builder')

// const languages = [...commonLangIds, ...commonLangAliases, ...otherLangIds]

module.exports = attacher

function attacher(options) {
  var settings = options || {}
  var theme = settings.theme || 'nord'
  var useBackground =
    typeof settings.useBackground === 'undefined'
      ? true
      : Boolean(settings.useBackground)
  var shikiTheme
  var highlighter

  try {
    shikiTheme = shiki.getTheme(theme)
  } catch (_) {
    try {
      shikiTheme = shiki.loadTheme(theme)
    } catch (_) {
      throw new Error('Unable to load theme: ' + theme)
    }
  }

  return transformer

  async function transformer(tree) {
    highlighter = await shiki.getHighlighter({
      theme: shikiTheme,
    })
    visit(tree, 'element', visitor)
  }

  function visitor(node, index, parent) {
    if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
      return
    }

    if (useBackground) {
      addStyle(parent, 'background: ' + shikiTheme.bg)
    }

    const lang = codeLanguage(node)

    if (!lang) {
      // Unknown language, fall back to a foreground colour
      addStyle(node, 'color: ' + shikiTheme.settings.foreground)
      return
    }

    const tokens = highlighter.codeToThemedTokens(hastToString(node), lang)
    const tree = tokensToHast(tokens)

    node.children = tree
  }
}

function tokensToHast(lines) {
  let tree = []

  for (const line of lines) {
    if (line.length === 0) {
      tree.push(u('text', '\n'))
    } else {
      for (const token of line) {
        tree.push(
          u(
            'element',
            {
              tagName: 'span',
              properties: {style: 'color: ' + token.color}
            },
            [u('text', token.content)]
          )
        )
      }

      tree.push(u('text', '\n'))
    }
  }

  // Remove the last \n
  tree.pop()

  return tree
}

function addStyle(node, style) {
  var props = node.properties || {}
  var styles = props.style || []
  styles.push(style)
  props.style = styles
  node.properties = props
}

function codeLanguage(node) {
  const className = node.properties.className || []
  var value

  for (const element of className) {
    value = element

    if (value.slice(0, 9) === 'language-') {
      return value.slice(9)
    }
  }

  return null
}