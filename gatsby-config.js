const pathPrefix = '/' // Prefix for all links. If you deploy your site to example.com/blog your pathPrefix should be "blog"
const siteTitle = 'swyx.io' // Navigation and Site Title
const siteUrl = 'https://www.swyx.io' // Domain of your site. No trailing slash!
const siteLogo = 'swyx.jpg' // Used for SEO and manifest, path to your image you placed in the 'static' folder
const siteDescription = 'Personal site for shawn swyx wang'
module.exports = {
  siteMetadata: {
    siteUrl: siteUrl + pathPrefix,
    title: siteTitle,
    description: siteDescription,
    keywords: ['gatsby', 'netlify', 'react', 'learn in public'],
    description: siteDescription,
    canonicalUrl: siteUrl,
    twitterUrl: 'https://twitter.com/swyx/',
    twitterHandle: '@swyx',
    fbAppID: '12345',
    githubUrl: 'https://github.com/sw-yx/swyxdotio',
    githubHandle: 'sw-yx',
    image: siteLogo,
    author: {
      name: 'swyx', // Author for schemaORGJSONLD
      minibio: `
        <strong>swyx</strong> is an Infinite Builder working on Developer Experience at Netlify. 
        In his free time he helps people Learn in Public at <a href="https://egghead.io">Egghead.io</a> and <a href="https://reddit.com/r/reactjs">/r/reactjs</a>.
      `,
    },
    organization: {
      name: 'swyx.io LLC',
      url: siteUrl,
      logo: siteLogo,
    },
  },
  plugins: [
    {
      resolve: 'gatsby-theme-dev-blog',
      options: {
        contentPath: 'content/writing',
        draftsPath: 'content/drafts',
        talksPath: 'content/talks',
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: 'content/about',
        name: 'aboutfiles',
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `swyx dot io`,
        short_name: `swyx`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#fff`,
        display: `standalone`,
        icon: `favicon.png`,
      },
    },
  ],
}
