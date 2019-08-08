'use strict'
require('dotenv').config()

const log = (msg, section) => console.log(`\n\x1b[36m${msg} \x1b[4m${section}\x1b[0m\x1b[0m\n`)

const path = require('path')

const templatesDir = path.resolve('src/templates')
const templates = {
  talkList: path.resolve(templatesDir, 'talkList.js'),
  talkPage: path.resolve(templatesDir, 'talkPage.js'),
}

const query = `
edges {
  node {
    id
    childMdx {
      fileAbsolutePath
      excerpt
      body
      frontmatter {
        slug
        title
        venues
        topic
        date
        url
        video
        description
        desc
      }
    }
  }
}
`
const talks2019Query = `{
  allFile(filter: {sourceInstanceName: {eq: "talks2019"}}) {
    ${query}
  }
}
`
const talks2018Query = `{
  allFile(filter: {sourceInstanceName: {eq: "talks2018"}}) {
    ${query}
  }
}
`

const transform = (res) => {
  const edges = res.data.allFile.edges
  return edges
    .map((edge) => {
      if (!edge.node.childMdx) return
      const fm = edge.node.childMdx.frontmatter
      fm.excerpt =
        // edge.node.childMdx.excerpt ||
        fm.desc || (fm.description && fm.description.slice(0, 90) + '...') || 'EXCERPT_MISSING'
      fm.body = edge.node.childMdx.body
      return fm
    })
    .filter(Boolean)
}

module.exports = async ({ actions: { createPage }, graphql }) => {
  const result2019 = await graphql(talks2019Query)
  const result2018 = await graphql(talks2018Query)
  const talks = [...transform(result2018), ...transform(result2019)].reverse()

  log('Creating', 'talks page')
  createPage({
    path: 'talks',
    component: templates.talkList,
    context: { talks },
  })
  log('Creating', 'per talk pages')
  talks.forEach((pop, index) => {
    const talk = pop
    if (typeof talk === 'undefined') return

    let next = talks.slice(index + 1, index + 3)

    // If it's the last item in the list, there will be no articles. So grab the first 2
    if (next.length === 0) next = talks.slice(0, 2)

    // If there's 1 item in the list, grab the first article
    if (next.length === 1 && talks.length !== 2) next = [...next, talks[0]]

    if (talks.length === 1) next = []

    createPage({
      path: '/talks/' + talk.slug,
      component: templates.talkPage,
      context: {
        talk,
        next: next.map((n) => ({ node: n })),
      },
    })
  })
}
