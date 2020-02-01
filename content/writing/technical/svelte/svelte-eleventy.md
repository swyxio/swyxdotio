---
title: Svelte as an Eleventy Template Engine
slug: svelte-eleventy
categories: ['DX']
date: 2020-01-31
published: false
description: Svelte is a really nice authoring format for HTML components. I wanted to explore if I could extend Eleventy to use it.
---

Eleventy is great, but the supported template formats like Handlebars and Mustache leave something to be desired. 

A big part of why JS SSG's like Gatsby and Sapper are enjoyable is that the upgrade path for adding interactivity is very natural and idiomatic. With Svelte, scoped CSS and animations are also a nice consideration. No-JS SSG's tend to treat JS as something to be "sprinkled on" later, which can be a little awkward to write when you have top hop in and out of folders and build systems.

I wanted to see if I could blur the lines a little bit.

Here is a minimal Eleventy Template Engine:

```js
// @11ty/src/Engines
const TemplateEngine = require("./TemplateEngine");

class MyTemplate extends TemplateEngine {
  async compile(str, inputPath) {
    console.log({
      str, // your raw template
      inputPath // where it is located
    })
    return function(data) {
      // data being passed in to your template, do something with it
      let newStr = str + data
      return newStr
    };
  }
}

module.exports = MyTemplate;
```

So you could conceivably use Svelte's compiler API:


```js
// @11ty/src/Engines
const TemplateEngine = require("./TemplateEngine");
const svelte = require('svelte')

class SvelteEngine extends TemplateEngine {
  async compile(str, inputPath, svelteOptions) {
    const opts = Object.assign(
      {}, 
      svelteOptions, 
      {
        generate: 'ssr'
      }
    )
    const compiled = svelte.compile(str, opts)
    
    return function(data) {
      // data being passed in to your template, do something with it
      const App = new compiled({
        target: document.body // not sure
        ...data
      })
      return App
    };
  }
}

module.exports = SvelteEngine;
```

But this isn't good enough, because the Svelte compiler only works on a single component level. Most likely, to build up pages, you will want to import multiple levels of components to build up to a page. So you will need a bundler.

## Rollup Plugin Svelte

I [wrote up](https://twitter.com/swyx/status/1223334283693084672?s=20) my exploration of [rollup-plugin-svelte](https://github.com/sveltejs/rollup-plugin-svelte) today. So I won't cover that here and will just see if I can integrate with my SvelteEngine.



