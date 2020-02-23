require('dotenv-safe').config()
const fs = require('fs')
const path = require('path')
const generateRSS = require('./generateRSS')
require('dotenv-safe').config()
const devToPlugin = require('@ssgjs/source-devto')({
  apiKey: process.env.DEV_TO_API_KEY
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
  writing: {
    async createIndex(mainIndex) {
      let writingIndex = mainIndex.ssgCoreData.filter(item =>
        item.shortFilePath.startsWith('writing/')
      )
      let devToIndex = await devToPlugin.createIndex()
      console.log(`importing ${devToIndex.length} articles from dev.to`)
      return [...writingIndex, ...devToIndex].sort(
        (b, a) => a.metadata.date - b.metadata.date
      )
    },
    async getDataSlice(uid, coreDataPlugin) {
      let slice = await coreDataPlugin.getDataSlice(uid)
      if (slice) return slice
      // else its a devto
      return await devToPlugin.getDataSlice(uid)
    }
  },
  speaking: {
    createIndex(mainIndex) {
      return mainIndex.ssgCoreData.filter(item =>
        item.shortFilePath.startsWith('talks/')
      )
    },
    getDataSlice(uid, coreDataPlugin) {
      return coreDataPlugin.getDataSlice(uid)
    }
  }
}

// optional. called repeatedly, can be expensive
exports.getDataSlice = async (key, uid) => {
  console.log('optional getDataSlice action')
  // etc
}

exports.coreDataOpts = {
  coreDataDirPath: 'content'
}

// mandatory. called once, should be cheap
exports.createIndex = async (mainIndex = {}) => {
  console.log('getting intial data')
  // can add more data to index here
  console.log('Number of talks:', Object.keys(mainIndex.speaking).length)
  console.log('Number of articles:', Object.keys(mainIndex.writing).length)
  return mainIndex
}

// optional lifecycle hook
exports.postExport = async mainIndex => {
  // sitedata fits https://www.npmjs.com/package/rss#user-content-example-usage
  return generateRSS(mainIndex, sitedata)
}
