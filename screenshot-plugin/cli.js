const screenshot = require('./screenshot')

;(async function() {
  await screenshot([
    ['writing', "swyx's Blogposts and Articles"],
    // potato
    ['speaking', "swyx's Talks and Podcasts"]
  ])
})()
