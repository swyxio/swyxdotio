const { getData } = require('../../../ssg.config')

export async function get(req, res) {
  const { slug } = req.params
  const data = await getData()
  const splitSlug = slug.split('___ssg___')
  const category = splitSlug[0]
  const realSlug = splitSlug[1]
  if (data[category][realSlug]) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data[category][realSlug]))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `Not found` }))
  }
}
