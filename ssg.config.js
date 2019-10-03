const fs = require('fs')
const path = require('path')
const generateRSS = require('./generateRSS')
const remark = require('@ssgjs/source-remark')
const writing = remark({
  dirPath: 'content/writing',
  onCreateIndex: idx => console.log('Number of talks:', Object.keys(idx).length)
})
const speaking = remark({
  dirPath: 'content/talks',
  onCreateIndex: idx => console.log('Number of posts:', Object.keys(idx).length)
})

// used only in rss feed for now but can repeat elsewhere
const sitedata = {
  title: 'swyx.io Writing and Speaking',
  baseUrl: 'https://swyx.io',
  rssFeedUrl: 'https://swyx.io/rss.xml',
  rssFaviconUrl: 'https://swyx.io/favicon.png',
  authorName: 'shawn @swyx wang',
  categories: ['Technology', 'JavaScript', 'React', 'Svelte']
}

// optional config
// exports.ssgDotFolder = '.ssg'

// optional data plugins. must be object, so we can namespace
exports.plugins = {
  writing,
  speaking
}

// optional. called repeatedly, can be expensive
exports.getDataSlice = async (key, uid) => {
  console.log('optional getDataSlice action')

  // // not needed but.. just in case
  // if (key === 'writing') {
  //   return writing.getDataSlice(uid)
  // } else if (key === 'talks') {
  //   return speaking.getDataSlice(uid)
  // }
  // throw new Error('no data found for key: ' + key + ' uid: ' + uid)
}

// mandatory. called once, should be cheap
exports.createIndex = async (mainIndex = {}) => {
  console.log('getting intial data')
  console.log(Object.keys(mainIndex))
  // can add more data to index here
  return mainIndex
}

// optional lifecycle hook
exports.postExport = async mainIndex => {
  // sitedata fits https://www.npmjs.com/package/rss#user-content-example-usage
  return generateRSS(mainIndex, sitedata)
}
