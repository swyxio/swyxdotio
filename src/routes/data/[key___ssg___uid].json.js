const { getDataSlice, getIndex } = require('ssg/readConfig')

export async function get(req, res) {
  const { key___ssg___uid } = req.params
  const splitSlug = key___ssg___uid.split('___ssg___')
  const key = splitSlug[0]
  const uid = splitSlug[1]
  const mainIndex = getIndex()
  let data
  if (uid === 'index') {
    data = mainIndex[key]
  } else {
    data = await getDataSlice(key, uid)
  }
  if (typeof data !== 'undefined') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `Not found` }))
  }
}
