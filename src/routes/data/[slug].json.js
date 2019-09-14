const { getData } = require('../../../ssg.config')

export async function get(req, res) {
  const { slug } = req.params
  const splitSlug = slug.split('___ssg___')
  const category = splitSlug[0]
  const realSlug = splitSlug[1]
  const data = await getData(category, realSlug)
  if (data) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `Not found` }))
  }
}
