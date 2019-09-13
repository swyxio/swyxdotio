const fs = require('fs')
const path = require('path')
const { get_posts } = require('./sapper_markdown_code')
exports.getData = async () => {
  let _talks = get_posts('content/talks', 'talks')
  const talks = extractSlugObjectFromArray(_talks)
  const talks_index = _talks.map((v) => ({
    title: v.metadata.title,
    slug: v.slug,
    date: v.metadata.date,
  }))
  talks.talks_index = talks_index
  let _writing = get_posts('content/writing', 'writing')
  const writing = extractSlugObjectFromArray(_writing)
  const writing_index = _writing.map((v) => ({
    title: v.metadata.title,
    slug: v.slug,
    date: v.metadata.date,
  }))

  writing.writing_index = writing_index
  return { talks, writing }
}

/**
 *
 * will be moved to jdown plugin
 *
 */
// const jdown = require('jdown')
// const getJdownOpts = (prefix) => ({
//   prefix,
//   jdownOpts: {
//     // so that markdown images show nicely
//     assets: {
//       output: './static/jdown-assets',
//       path: '/jdown-assets',
//     },
//   },
// })
// async function getJdown(_path, getJdownOpts) {
//   let data = await jdown(_path, getJdownOpts.jdownOpts)
//   data = flatten(data, getJdownOpts.prefix && getJdownOpts.prefix + '___ssg___')
//   const index = [] // build up array of objects for the top level list
//   Object.entries(data).forEach(([_, v]) => {
//     index.push({
//       title: v.title,
//       slug: v.slug,
//       date: v.date,
//     })
//   })
//   data = extractSlugObjectFromArray(Object.values(data))
//   return { data, index }
// }
// function flatten(obj, prefix = '') {
//   let _obj = {}
//   Object.entries(obj).map(([k, v]) => {
//     if (typeof v.contents === 'string') {
//       _obj[prefix + k] = v
//     } else {
//       // console.log('flattening', flatten(v))
//       Object.assign(_obj, flatten(v, `${k}_`))
//     }
//   })
//   return _obj
// }

function extractSlugObjectFromArray(arr) {
  let obj = {}
  arr.forEach((item) => (obj[item.slug] = item))
  return obj
}
