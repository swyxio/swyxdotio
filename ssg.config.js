const fs = require('fs')
const path = require('path')

const jdown = require('jdown')
const getJdownOpts = (prefix) => ({
  prefix,
  jdownOpts: {
    // so that markdown images show nicely
    assets: {
      output: './static/jdown-assets',
      path: '/jdown-assets',
    },
  },
})
exports.getData = async () => {
  let writing = await getJdown('content/writing', getJdownOpts('writing'))
  writing.data.writing_index = writing.index
  let talks = await getJdown('content/talks', getJdownOpts('talks'))
  talks.data.talks_index = talks.index
  return { writing: writing.data, talks: talks.data }
}

/**
 *
 * will be moved to jdown plugin
 *
 */
async function getJdown(_path, getJdownOpts) {
  let data = await jdown(_path, getJdownOpts.jdownOpts)
  data = flatten(data, getJdownOpts.prefix && getJdownOpts.prefix + '___ssg___')
  const index = [] // build up array of objects for the top level list
  Object.entries(data).forEach(([_, v]) => {
    index.push({
      title: v.title,
      slug: v.slug,
      date: v.date,
    })
  })
  data = extractSlugObjectFromArray(Object.values(data))
  return { data, index }
}

function extractSlugObjectFromArray(arr) {
  let obj = {}
  arr.forEach((item) => (obj[item.slug] = item))
  return obj
}

function flatten(obj, prefix = '') {
  let _obj = {}
  Object.entries(obj).map(([k, v]) => {
    if (typeof v.contents === 'string') {
      _obj[prefix + k] = v
    } else {
      // console.log('flattening', flatten(v))
      Object.assign(_obj, flatten(v, `${k}_`))
    }
  })
  return _obj
}
