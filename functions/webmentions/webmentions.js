
/* eslint-disable */
const fetch = require('node-fetch')
exports.handler = async function(event, context) {
  // currently unused



  
  // const page = Number(event.queryStringParameters.page) || 0
  // try {
  //   const token = process.env.WEBMENTION_TOKEN
  //   if (!token) throw new Error('no WEBMENTION_TOKEN environment variable set')
  //   console.log('fetching page ', page)
  //   const response = await fetch(
  //     `https://webmention.io/api/mentions.jf2?token=${token}&page=${page}&sort-by=published`
  //   )
  //   if (!response.ok) {
  //     // NOT res.status >= 200 && res.status < 300
  //     return { statusCode: response.status, body: response.statusText }
  //   }
  //   const data = await response.json()

  //   return {
  //     statusCode: 200,
  //     body: JSON.stringify(data)
  //   }
  // } catch (err) {
  //   console.log(err) // output to netlify function log
  //   return {
  //     statusCode: 500,
  //     body: JSON.stringify({ msg: err.message }) // Could be a custom message or object i.e. JSON.stringify(err)
  //   }
  // }
}
