var unified = require('unified')
// var stream = require('unified-stream')
var vfile = require('to-vfile')
var report = require('vfile-reporter')
var produce = require('immer')

const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const lstat = promisify(fs.lstat)
const frontMatter = require('front-matter')

const tob64 = str => Buffer.from(str).toString('base64')
const fromb64 = str => Buffer.from(str, 'base64').toString()
/**
 *
 * globals, we may have to make per-invocation in future
 *
 */

let _recognizedExtensions = ['.md', '.markdown', '.mdx', '.svexy']
let _preset = {
  settings: {},
  plugins: [
    require('remark-parse'),
    // require('remark-toc'),
    require('remark-rehype'),
    require('rehype-format'),
    [require('remark-frontmatter'), ['yaml']],
    require('rehype-slug'),
    require('rehype-shiki'),
    require('rehype-stringify')
  ]
}
module.exports = function(opts = {}) {
  if (!opts.dirPath) throw new Error('dirpath not supplied to remark plugin')
  if (opts.modifyRecognizedExtensions) {
    _recognizedExtensions = produce(
      _recognizedExtensions,
      opts.modifyRecognizedExtensions
    )
  }
  if (opts.modifyRemarkConfig) {
    _preset = produce(_preset, opts.modifyRemarkConfig)
  }

  // flattens all directories below the dirPath
  async function createIndex(recursiveDir = opts.dirPath) {
    const files = await readdir(recursiveDir)
    const getStats = async (file, _dirPath) => {
      const filePath = path.join(_dirPath, file)
      const st = await stat(filePath)
      if (st.isDirectory()) {
        return await createIndex(filePath)
      } else {
        if (file === '.DS_Store') return // skip ds store...
        if (!_recognizedExtensions.includes(path.extname(file))) return // skip
        return [
          {
            uid: tob64(filePath),
            createdAt: st.birthtime,
            modifiedAt: st.mtime
          }
        ]
      }
    }
    const arrs = await Promise.all(
      files.map(file => getStats(file, recursiveDir))
    )
    const index = [].concat.apply([], arrs) // ghetto flatten
    return index
      .filter(Boolean)
      .map(file => {
        const temp = fs.readFileSync(fromb64(file.uid), 'utf-8')
        const { attributes: metadata } = frontMatter(temp)
        if (!metadata) return // require metadata
        if (!metadata.title) return // require title
        if (metadata.published === false) return // if published is false
        let pubdate = metadata.date || new Date().toString().slice(4, 15)
        const date = new Date(`${pubdate} EDT`) // cheeky hack
        metadata.pubdate = pubdate
        metadata.date = new Date(pubdate)
        metadata.dateString = date.toDateString()
        file.metadata = metadata
        return file
      })
      .filter(Boolean)
      .sort((a, b) => {
        return a.metadata.pubdate < b.metadata.pubdate ? 1 : -1
      })
  }

  async function getDataSlice(uid) {
    const filepath = fromb64(uid)
    const md = vfile.readSync(filepath)
    const file = await unified()
      .use(_preset)
      .process(md)
      .catch(err => {
        console.error(report(file))
        throw err
      })
    file.extname = '.html'
    return file.toString()
  }

  return {
    createIndex,
    getDataSlice
  }
}
