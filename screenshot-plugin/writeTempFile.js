const { writeFile } = require('fs')
const { join } = require('path')
const { createHash } = require('crypto')
const { promisify } = require('util')
const { tmpdir } = require('os')
const writeFileAsync = promisify(writeFile)

module.exports = {
  writeTempFile,
  pathToFileURL
}
async function writeTempFile(name, contents) {
  const fileName =
    createHash('md5')
      .update(name)
      .digest('hex') + '.html'
  const filePath = join(tmpdir(), fileName)
  console.log(`Writing file ${name} to ${filePath}`)
  await writeFileAsync(filePath, contents)
  return filePath
}

function pathToFileURL(path) {
  const fileUrl = 'file://' + path
  console.log('File url is ' + fileUrl)
  return fileUrl
}
