const screenshot = require('./screenshot')

;(async function() {
  await screenshot(
    [
      // [
      //   'writing/jamstack-og-images',
      //   "Your Site's Calling Card",
      //   'Five Ways to add `og:image`s to your JAMstack site'
      // ]
      ['writing', "swyx's Blogposts and Writing"],
      ['speaking', "swyx's Talks and Podcasts"]
      // [
      //   'plsignore',
      //   "JAMstack or 'Pilha de Atolamento'? Let Your User Decide",
      //   'i18n in Gatsby + Netlify'
      // ]
    ],
    false
    // true
  )
})()
