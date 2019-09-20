const fs = require('fs')
const path = require('path')
const generateRSS = require('./generateRSS')

const writingPlugin = require('@ssgjs/source-remark')({
  dirPath: 'content/writing'
})
const talksPlugin = require('@ssgjs/source-remark')({
  dirPath: 'content/talks'
})

exports.getDataSlice = async (key, uid) => {
  let result // initialize to undefined
  if (key === 'writing') {
    return writingPlugin.getDataSlice(uid)
  } else if (key === 'talks') {
    return talksPlugin.getDataSlice(uid)
  }
  if (typeof result === 'undefined')
    throw new Error('no data found for ' + slug)
  return result
}
exports.getIndex = () => {
  return require(path.resolve('.ssg/data.json'))
}
let mainIndex = {} // failed attempt to keep in memory
exports.createIndex = async () => {
  console.log('getting intial data')
  mainIndex.talks = await talksPlugin.createIndex()
  console.log('Number of talks:', Object.keys(mainIndex.talks).length)
  mainIndex.writing = await writingPlugin.createIndex()
  console.log('Number of posts:', Object.keys(mainIndex.writing).length)
  return mainIndex
}

exports.postExport = async mainIndex => {
  // https://www.npmjs.com/package/rss#user-content-example-usage
  await generateRSS(mainIndex, {
    title: 'swyx.io Writing and Speaking',
    baseUrl: 'https://swyx.io',
    rssFeedUrl: 'https://swyx.io/rss.xml',
    rssFaviconUrl: 'https://swyx.io/favicon.png',
    authorName: 'shawn @swyx wang',
    categories: ['Technology', 'JavaScript', 'React', 'Svelte']
  })
}
