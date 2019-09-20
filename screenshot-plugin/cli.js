const screenshot = require('./screenshot')

;(async function() {
  await screenshot([
    [
      'writing/jamstack-og-image',
      "Your Site's Calling Card",
      'Five Ways to add `og:image`s to your JAMstack site and Why Pregenerated is the Best of Them'
    ]
    // ['writing', "swyx's Blogposts and Articles"],
    // potato
    // ['speaking', "swyx's Talks and Podcasts"]
  ])
})()
