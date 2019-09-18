---
title: Using Next.js as a Static Site Generator for Netlify
published: true
slug: netlify-nextjs-ssg
description: How to deploy a Static Next.js Site to Netlify, and then upgrade it to use Dynamic Route Segments to become a full fledged Static Site Generator!
tags: nextjs, netlify
categories: ['Tech', 'Netlify', 'Nextjs']
date: 2019-09-11
---

[Next.js](https://nextjs.org) is an incredible React framework, being the premier Server-side Rendering solution for React which is absolutely critical for performance and SEO of non-static React apps. It also comes with first-class [TypeScript Support](https://nextjs.org/blog/next-9), [Hook-based Routing](https://nextjs.org/learn/basics/navigate-between-pages), and a [fantastic scoped CSS-in-JS solution](https://github.com/zeit/styled-jsx).

## Three Export Modes

One misperception among the community (certainly something I used to have) is that it has other export modes. Next.js can build to a standard Node.js app with `next build`, however, there are actually three export modes:

- Serverful Node.js: created with the `next build` command
- Serverless Node.js: with a `serverless` target in `next.config.js` and the `next build` command
- Static HTML: created with the `next export` command

While [Zeit's](https://zeit.co/) `now` v1 is the best host for Serverful Next.js, and `now` v2 is the best host for Serverless Next.js, the Static HTML mode is a diamond in the rough - literally exporting the app to a folder of static assets (both HTML/JS/CSS bundles as well as prefetched data) that can be served from as simple a utility as [Zeit's `serve` CLI](https://github.com/zeit/serve)!

## Static is Universal

What is great about a folder you can statically export is that it is the one configuration that literally *everybody* supports. You can host it on a Raspberry Pi if you wish, or on an AWS S3 Bucket, or on a Node server, or heck you can print it out and have a dance crew do an interpretive dance of the code if you want (results may vary)! And if you ever outgrow your chosen hosting solution, you can pick up and move to the next one that suits you best!

This is the heart of the [JAMstack](https://jamstack.org) idea - reducing vendor lock-in, promoting fast and secure defaults (because there is nothing as fast as serving a static file with all pre-computation already done). Even concerns about programming environment, like operating system and Node.js version, melt away because it literally doesn't matter, therefore you never need to debug them.

The best part of all, the only configuration to do gets no more complex than figuring out what folder to upload. It harkens back to the drag-and-drop, FTP days that have been with us since the dawn of Web Development.

## Deploying Next.js Static Export to Netlify

For any basic Next.js app ([you can grab one here if you don't have one](https://github.com/zeit/next-learn-demo)), all you need to do to turn it into a static export app is run:

```bash
next build
next export
```

This builds your site to an `out` folder, which you can host locally by running `npx serve out`.

You can then use the Netlify CLI to deploy this as a static site:

```bash
## in case you need to download the CLI and log in
# npm i -g netlify-cli
# netlify login
netlify init
## or alternatively
netlify deploy
```

The only thing you need to know to configure the app is your "build command" and "publish directory". You can answer these in the CLI prompts, or skip that by creating [a `netlify.toml` config](https://www.netlify.com/docs/netlify-toml-reference/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#getting-started) file:

```toml
## netlify.toml
[build]
  command = "yarn build && yarn export"
  publish = "out"
```

If you have your project on a Git provider like GitHub, GitLab, and Bitbucket, you can also set up [Continuous Deployment](https://www.netlify.com/docs/continuous-deployment/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) to build and deploy your site after every merge. This is your gateway drug to adding on the rest of Netlify's functionality onto your Next.js app:

- Serverless [Functions](https://www.netlify.com/docs/functions/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex)
- [Branch Deploys and Deploy Previews](https://www.netlify.com/docs/continuous-deployment/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#branches-deploys)
- [HTTPS/SSL by default](https://www.netlify.com/docs/ssl/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex)
- [Unblockable Site Analytics](https://www.netlify.com/docs/analytics/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex)
- Authentication via [Netlify Identity](https://www.netlify.com/docs/identity/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex)
- [Forms](https://www.netlify.com/docs/form-handling/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex)
- and more!

## Next.js as a Static Site *Generator*

By default, Next.js's static export works on a 1 for 1 basis: if you have a `potato.js` file in your `/pages` folder, that directly maps to `potato.html`. This is fine for authoring static pages with React components and the rest of the React ecosystem, but to truly qualify as a Static Site Generator, it should *generate* pages from data. So for example, given a `/content` folder of markdown files, I should be able to generate a corresponding list of HTML pages from a template. [Gatsby](https://www.gatsbyjs.org) and [React-Static](http://react-static.js.org) are best known for doing this in the React ecosystem, but you may be surprised to learn that Next.js holds it's own here!

Data-driven static generation has always been possible with Next.js, but it used to involve a lot of nonstandard [custom server](https://nextjs.org/docs#custom-server-and-routing) coding that raised the bar too high for something predicated on simplicity.

However, with [Dynamic Route Segments released in Next.js 9](https://nextjs.org/blog/next-9#dynamic-route-segments), as well as constantly improving static export bugfixes and support, data-driven static site generation in Next.js has never been easier!

First we write a `next.config.js` file with the routes we want Next.js to statically export:

```js
module.exports = {
  exportPathMap: function() {
    return {
      '/': { page: '/' }
      '/about': { page: '/about' }
      // etc...
    }
  }
}
```

In the static export process we previously wrote about, we didn't need to write this file because [Next.js autogenerates your route map since v6](https://zeit.co/blog/next6#static-react-applications). However, there is no way for Next.js to know ahead of time what dynamically generated routes to statically render. That's where Dynamic Route Segments come in.

With Next.js 9, we can declare a file structure like this:

```bash
- /pages
  - index.js
  - about.js
  - /blog
    - [slug].js
```

Within `[slug].js`, we can receive that parameter and render the content in React accordingly, effectively turning it into a page template!

```js
import { useRouter } from 'next/router'
export default () => {
  const router = useRouter()
  return <h1>Slug: {router.query.slug}</h1>
}
```

However this still isn't good enough to make Next.js into a Static Site Generator. We need to pass other information other than the slug to the page, and we also need to tell Next.js how many of each slug it should render. It turns out that `next.config.js` is a very nice place to do this!

```js
// parses a folder of markdown files into objects. very handy!
const jdown = require('jdown') 

module.exports = {
  exportPathMap: async function() {
    // pages we know about beforehand
    const paths = {
      '/': { page: '/' },
      '/about': { page: '/about' }
    }
    // dynamic, data-generated pages
    const content = await jdown('content') // assumes some markdown files in a `/content` folder, with frontmatter that offers a slug
    const posts = [] // build up array of objects for the top level list
    Object.entries(content).forEach(([filename, fileContent]) => {
      // the filename becomes the slug
      paths[`/blog/${filename}`] = { page: '/blog/[slug]', query: { 
          slug: filename, 
          ...fileContent 
        } 
      }
    })
    return paths
  }
}
```

Now we are telling Next.js everything it needs to know - the full path with the slug, and passing in the extra information it needs to fill out the `[slug].js` template.

And that's that! If you are familiar with React Static, you'll see strong parallels with [`getRoutes` and `getData` in `static.config.js`](https://github.com/react-static/react-static/blob/master/docs/config.md#route). Gatsby opts for a Redux action based model, and so you use [the provided `createPage`](https://www.gatsbyjs.org/docs/creating-and-modifying-pages/) function to progammatically create pages in plugins and themes.

With this many choices for static site generation in React, the only task left to do is the hardest one: go forth and write that content!