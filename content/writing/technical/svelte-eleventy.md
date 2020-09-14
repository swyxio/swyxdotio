---
title: Svelte as an Eleventy Template Engine
slug: svelte-eleventy
categories: ['Svelte', 'ssg']
date: 2020-02-01
description: Svelte is a really nice authoring format for HTML components. I wanted to explore if I could extend Eleventy to use it.
---

Eleventy is great, but I wanted to see if I could use Eleventy with the Svelte component authoring experience.

This post explores the main knowledge you will need to know to add any templating language to Eleventy, not that much is really Svelte specific. There is no demo and no call to action, because this is an unreleased work in progress. But of course, if this interests you please reach out to have a chat.

## Table of Contents

## JS vs No-JS

A big part of why JS SSG's like Gatsby and Sapper are enjoyable is that the upgrade path for adding interactivity is very natural and idiomatic. Scoped CSS is also a nice to have. No-JS SSG's tend to treat JS as something to be "sprinkled on" later (I am often amused by how much people love that phrase), which can be a little awkward to write when you have to hop in and out of folders and build systems. Many sites start completely static, and then add and add and add dynamic elements over time as people naturally want features and a more interactive user experience. It would be nice if the upgrade path was seamless.

However, JS SSG's can also add unnecessary JS weight. Most offer SPA-like clientside navigation to subsequent pages by default. The argument for this is that by just downloading json, you skip downloading the repeated HTML of your layout, and gain the ability to offer things like [native-like page transitions](https://css-tricks.com/native-like-animations-for-page-transitions-on-the-web/) and [predictive prefetching](https://noti.st/shortdiv/jsHO3Z) (not impossible without a framework, just a little harder). The argument against this is that most traffic is view-one-page-and-bounce, so you are optimizing for the minority multi-page-viewer at the expense of the majority-single-page-bouncer. And [most of the time we don't do any page transitions](https://twitter.com/ryanflorence/status/1186515553285857280).

I wanted to see if I could blur the lines a little bit.

## Eleventy Templating

Eleventy allows you to specify the layout of each page. You can see in [Phil's Eleventyone project](https://github.com/philhawksworth/eleventyone) the wide variety of ways you are allowed to specify a layout, but the outcome is the same - the filesystem determines the route, and markdown content is piped through a specified layout. 

The concept of a layout may feel a little ambiguous to you, as it did to me. [Eleventy Layouts](https://www.11ty.dev/docs/layouts/) are special templates that can be used to wrap other content. It basically spells out the exact html structure that you want to be output, given some data. Here is a [nunjucks](https://mozilla.github.io/nunjucks/) layout:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="/css/styles.css">
    <title>{{ title }}</title>
  </head>
  <body {% if bodyClass %}class="{{ bodyClass }}"{% endif %}>

    <div class="container">
      {% include "header.njk" %}
      {{ content | safe }}
      {% include "footer.njk" %}
    </div>

    {% set js %}
      {% include "js/core.js" %}
      {% include "js/hello.js" %}
    {% endset %}
    <script>{{ js | jsmin | safe }}</script>

  </body>
</html>
```

Eleventy offers [no less than 11 templating languages](https://www.11ty.dev/docs/languages/) to write these layouts in. These, internally, are known as templating engines, and you can [set defaults for data, markdown, and html](https://www.11ty.dev/docs/config/#default-template-engine-for-global-data-files) so you don't need to explicitly specify every time.

## Eleventy Template Engines

Here is a minimal Eleventy Template Engine that doesn't really do much:

```js
// @11ty/src/Engines/MyTemplate.js
const TemplateEngine = require("./TemplateEngine");

class MyTemplate extends TemplateEngine {
  async compile(str, inputPath) {
    console.log({
      str, // the user's raw template
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

To add a template, you'd currently have to PR it into Eleventy, eg. [JSX](https://github.com/11ty/eleventy/issues/235) is a popular one. This process, as you might imagine, doesn't scale. The proposal for an official template customization API is currently [the top pinned issue](https://github.com/11ty/eleventy/issues/117) for the project.

## Svelte Template Engine

So you could conceivably use Svelte's compile API to power a template engine, just like the others:

```js
// untested pseudocode!!!
const TemplateEngine = require("./TemplateEngine");
const svelte = require('svelte')

class SvelteEngine extends TemplateEngine {
  async compile(str, inputPath, svelteOptions) {
    // first pass for html
    const ssrApp = svelte.compile(str, 
      Object.assign({}, svelteOptions, {
        generate: 'ssr' // output html, not js
      }) 
    ) 
    // second pass for js
    const clientApp = svelte.compile(str, 
      Object.assign({}, svelteOptions, {
        hydrate: true // output hydrating js
      }) 
    ) 
    fs.writeFileSync('somewhere', clientApp.js.code)

    return function(data) {
      // data being passed in to your template, do something with it
      const { head, html, css } = ssrApp.render(data);
      fs.writeFileSync('somewhere else', css)
      return head + html
    };
  }
}

module.exports = SvelteEngine;
```

But this isn't good enough, because the Svelte compiler only works on a single component level. Most likely, to build up pages, you will want to import multiple levels of components to build up to a page. 

## Svelte's Node Hook

I actually went down a bundling rabbit hole (the next section) before finding this solution. [Svelte has a Node register hook](https://svelte.dev/docs#Server-side_component_API), similar to [babel/register](https://babeljs.io/docs/en/babel-register). Those who have never tried to hook stuff into Node will find this capability very surprising and slightly disturbing, as I did. It is [an extremely old deprecated API](https://nodejs.org/api/modules.html#modules_require_extensions) that [everybody uses](https://stackoverflow.com/questions/28884377/better-way-to-require-extensions-with-node-js) because Node has offered no real better solution. It simplifies our job a helluva lot:


```js
// untested pseudocode!!!
const TemplateEngine = require("./TemplateEngine");
const svelte = require('svelte')
require('svelte/register'); // https://svelte.dev/docs#Server-side_component_API

class SvelteEngine extends TemplateEngine {
  async compile(str, inputPath, svelteOptions) {
    // not sure how to involve svelteOptions in there
    return function(data) {
      // data being passed in to your template, do something with it
      const App = require(inputPath).default; // directly require the svelte component, hope it imports
      const { head, html, css } = App.render(
        data // top level component's props
      )
      fs.writeFileSync('build/lastCss.css', css) // TODO: make sure this goes in the right place
      return head + html // feeble concat of html
    };
  }
}

module.exports = SvelteEngine;
```

So this is a nice way to use Svelte to write components, and output only HTML and CSS.

But if you want clientside interactivity... you will need a bundler to also output the JS.

## Rollup Plugin Svelte

I [wrote up](https://twitter.com/swyx/status/1223334283693084672?s=20) my exploration of [rollup-plugin-svelte](https://github.com/sveltejs/rollup-plugin-svelte) previously. So I won't cover that here and will just see if I can integrate it with my SvelteEngine.

The strategy I've settled on is to use [Svelte's native Node hook](https://svelte.dev/docs#svelte_register) to generate the html without bundling, and then to use rollup to generate the bundle for that path. Maybe this could be optimized since this would generate a lot of bundles. I'm not entirely sure that's avoidable.

```js
// untested pseudocode
const TemplateEngine = require("./TemplateEngine");
const svelte = require('svelte')
require('svelte/register'); // https://svelte.dev/docs#Server-side_component_API
const rollup = require("rollup");
const sveltePlugin = require("rollup-plugin-svelte");

class SvelteEngine extends TemplateEngine {
  async compile(str, inputPath, svelteOptions) {
    // https://github.com/sveltejs/sapper/blob/52f40f9e63dab19ad11f5073b2446b2632c85179/src/core/create_compilers/RollupCompiler.ts#L63
		const start = Date.now();
    let rollupResult;
		try {
			const bundle = await rollup.rollup({
        input: inputPath, // path to the file that is being imported
        plugins: [
          sveltePlugin({
            // preprocess // in future, allow typescript
            // plugin copies all properties. docs on options from https://svelte.dev/docs#svelte_compile
            generate: 'ssr',
            hydratable: true
          })
        ]
      });
			await bundle.write({
        dir: 'build/client.js',
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        format: 'esm',
        sourcemap: 'inline' // or false
      });
			rollupResult = new RollupResult(Date.now() - start, this);
		} catch (err) {
			if (err.filename) {
				// TODO this is a bit messy. Also, can
				// Rollup emit other kinds of error?
				err.message = [
					`Failed to build — error in ${err.filename}: ${err.message}`,
					err.frame
				].filter(Boolean).join('\n');
			}
      console.error(err)
      rollupResult = err
    }
    console.log(rollupResult) // :shrug:

    for (let warning of compiledJS.warnings) {
      console.warn(warning)
    }
    console.log('writing js and css')
    fs.writeFileSync('build/mainJS.js', compiledJS.js.code)
    fs.writeFileSync('build/mainJS.js.map', compiledJS.js.map)
    fs.writeFileSync('build/mainCSS.css', compiledJS.css.code)
    fs.writeFileSync('build/mainCSS.css.map', compiledJS.css.map)

    return function(data) {
      // data being passed in to your template, do something with it
      const App = require(inputPath).default; // directly require the svelte component, hope it imports
      const { head, html, css } = App.render(
        data // top level component's props
      )
      fs.writeFileSync('build/lastCss.css', css) // TODO: make sure this goes in the right place
      return head + html // feeble concat of html
    };
  }
}

module.exports = SvelteEngine;
```

As an aside - Rollup isn't compatible with non ESM modules. I've found myself dropping to the webpack loader more often than I want.
