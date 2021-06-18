---
title: The Many Jobs of JS Build Tools
subtitle: For new JS developers
description: A discussion of why JS developers use build tools like Webpack and what we do with them, for new JS developers.
slug: jobs-of-js-build-tools
categories: ['Tech']
started: 2019-12-22
date: 2020-01-06
---

_Essay status: mostly baked, sat on this for about 3 weeks and got some amount of peer review_

One of my regrets in [my recent SE Daily interview](https://www.swyx.io/speaking/sedaily-nocode) was my rather poor, panicked description of "Why Webpack" and "Why Gatsby". Jeff, the host, doesn't do much frontend coverage, whereas I have lived and breathed this stuff for the past 2+ years.

It felt rather like that phenomenon of how "Fish have no word for Water" - Water just _is_. Having to justify the existence of Water from first principles called on explanation muscles I rarely use. And then when I checked Webpack's [Why Webpack](https://webpack.js.org/concepts/why-webpack/) docs, I felt it focused mostly on modules and didn't spend enough time on the other important jobs that build tools provide for us.

I'd like another shot at explaining this.

## Table of Contents

## Build Tools are Optional

The first thing to acknowledge is that build tools (which imply having a "build step" before deploying code, instead of directly being able to go from source code to deploy) aren't technically required.

JavaScript is meant to be an [interpreted language](https://en.wikipedia.org/wiki/Interpreted_language) - write some in a `<script>` tag or in browser console, and it runs. No mandatory compile step unlike some other languages. So, then, to put a build step - that kinda looks like a compile step - in front of it evidently takes something away from that benefit.

Some people I greatly admire, like [Luke](https://twitter.com/lukejacksonn/status/1208473242903687178?s=20) and [Brian](https://twitter.com/brianleroux/status/1115376303631298560), write their apps entirely without a build step. The universal result of doing this is lightning fast deploy times.

## Only Scripts

I wasn't around for much of this history, but as best as I can tell, build tools came to JavaScript primarily because we wanted a sane way to reuse code.

For almost 20 years since creation in 1995, reusable JavaScript code looked something like this:

```html
<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.6/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js"></script>
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
<script src="magnific-popup/jquery.magnific-popup.js"></script>
```

Variables are scoped to each file, so in order to make a script that depended on another script, you had to throw them on the global `window` object:

```js
window.MyScript = /* etc */
```

and then the subsequent script would access that magic global on the window:

```js
var MyScriptCore = window.MyScript
console.log(MyScriptCore())
```

This is all kinds of bad - causing a namespace pollution problem, and requiring scripts to be loaded in the exact right order or face inscrutable `undefined is not a function` errors. What we really wanted was **modules**, rather than scripts.

I will not dwell further on the importance of modules - refer to [Why Webpack](https://webpack.js.org/concepts/why-webpack/) and [Why Would I Use a Webpack?](http://tinselcity.net/whys/packers) if you need more convincing.

## Task Runners

Relying on script CDNs introduced security and latency costs, so the alternative was to _download_ the code and glue them together in the right way to create one (or more) custom JS bundles entirely within your control and hosted on your infrastructure. To gloss over a huge amount of development in the space (that I don't know much about), "task runners" arose to automate this process for you - [Grunt](https://gruntjs.com/), [Gulp](https://gulpjs.com/), [Broccoli](https://broccoli.build/).

But something else also happened at the same time - server-side JavaScript became a thing.

## Multiple Targets, Multiple Assets: the rise of Bundlers

Since [introduction in 2009](https://blog.risingstack.com/history-of-node-js/), Node paved the way for Server-side JavaScript, with `npm` becoming the de facto package manager for Node packages, but eventually all JavaScript. Developers naturally want to reuse code across Node and the browser, and this caused a rather unfortunate rift in the community between different module specifications [CommonJS](https://requirejs.org/docs/commonjs.html) (from the Node camp) and [AMD](https://en.wikipedia.org/wiki/Asynchronous_module_definition) (from the browser people).

The job of task runners quickly expanded to help developers build to these different build targets, which is where "task runners" eventually gave way to "bundlers" like [Browserify](http://browserify.org/) and [Webpack](http://webpack.js.org/)

> Important caveats: [Fred Schott](https://twitter.com/FredKSchott/status/1216858767410622464) notes that this account may overattribute causality - but it isn't disputed that Browserify and Webpack were necessary enablers of "universal" or "isomorphic" JavaScript. Also, the chronology overlaps a lot - [Mike Sherov](https://twitter.com/mikesherov/status/1216875477627031552) notes that bundlers atop like RequireJS and Closure Compiler predated some task runners like Grunt and Gulp.

We realized that the act of concatenating scripts requires building a dependency graph and managing any namespace conflicts via static analysis. Where "task runners" mostly stopped at concatenating files per your explicit instructions, bundlers can use ASTs to statically analyze imports, ensure everything is initialized in the right order, and produce a minimal number of bundles for optimized loading.

To facilitate static analysis of dependency graphs, Webpack pioneered the `import` syntax, which has since been standardized into ESModules (here's [Lin Clark on ESModules](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)) and begun healing the divide between the various module specifications.

Incidentally, the job of task runners were also chipped away as package managers, primarily [npm](http://npmjs.com/) but also [bower](https://bower.io/), built in simple and effective scripting to their CLI's. The similarity and overlapping responsibilities [caused much confusion](https://stackoverflow.com/questions/35062852/npm-vs-bower-vs-browserify-vs-gulp-vs-grunt-vs-webpack) but hopefully I have given a good accounting here.

Today, Webpack is in wide use for apps and metaframeworks (tools that bundle other tools to lessen the pain of configuration) like `create-react-app`, Next.js and Gatsby. [Rollup](https://rollupjs.org/) is in second place and is widely used for building _libraries_ as opposed to apps, partially for [historical reasons](https://medium.com/webpack/webpack-and-rollup-the-same-but-different-a41ad427058c) but its hard reliance on ES Modules lets it build smaller bundles at the cost of [some incompatibility](https://twitter.com/swyx/status/1200381421174558720#m). [Parcel](https://parceljs.org/) is the newest kid on the block (launched Dec 2017), aiming for a batteries-included approach with parallelizable, origin-agnostic graph crawling.

Writing web apps often involves coordinating non-JS assets, like images and css files. It's often better to co-locate related assets with their associated code, than to have to manage them in separate folders. Webpack made it a norm to simply `import Image from './image.png'` and `import 'style.css'` inside of a JavaScript file to include these for bundling. Yes, you're "importing" non-JS assets into a JavaScript file, and this is Webpack magic [made possible by its loaders](https://webpack.js.org/loaders/).

A final, notable outcome of JavaScript being run both on the server and client is the rise of Server-side Rendering that "hydrate" into Clientside Apps - variously known as "Isomorphic apps" or, simply, "SSR". [Next.js and other Metaframeworks](#metaframeworks---reducing-many-jobs-to-one) take advantage of this for speed, SEO, and a unified JavaScript framework based approach to writing sites and apps (and all the shades of gray between the two).

## Multiple Targets, Multiple Languages: the rise of Transpilers and Compile-to-JS

The other thing about clientside JavaScript is the incremental rollout of new language features. [ES6 was released in 2015](https://en.wikipedia.org/wiki/ECMAScript#6th_Edition_-_ECMAScript_2015), a -huge- update that comprised over a decade of work and argument on the language. It made JavaScript a lot more tolerable to write serious apps in.

On one hand, people wanted to use this syntax right away (or even before release), but they were handcuffed by the fact that they would have to wait for the various JavaScript engines to implement them, and _then_ for the individual browser updates to roll out to billions of users. That would take forever.

So [Traceur](https://github.com/google/traceur-compiler) and eventually [Babel](https://babeljs.io/) arose to allow people to write modern JavaScript, but that would "transpile" (compile from JavaScript to JavaScript) that code to the lowest common denominator understandable by all the engines the developer chooses to target. Similarly for new APIs (as opposed to new syntax, which Babel handles), you need to [polyfill](<https://en.wikipedia.org/wiki/Polyfill_(programming)>) them with tools like [core-js](https://github.com/zloirock/core-js).

You technically could run these transpilations on their own, but more often than not you were including them somewhere in the plugin chain of your bundler for the creation of your final output JavaScript.

One issue that divided the community for a long time was whether you should transpile _only your code_ or whether you should transpile _all code including your code's dependencies and so on_. With the former, you risked your app ugly-crashing if the dependencies weren't transpiled to your target browsers (hurting developer experience). The inverse was also a problem - if your dependencies preemptively transpiled to browsers you didn't really care about, their code was also _a lot bigger_ than you actually needed (hurting user experience). 

With the latter, you took your fate in your own hands - at the cost of much longer build times. IMO the consensus has recently shifted to the latter, but with passionate disagreement - [more reading here](https://github.com/facebook/create-react-app/issues/1125#issuecomment-426120762). A final important note on JS compatibility - With the advent of evergreen browsers and the undying nature of legacy browsers, it is now common to use the [module/nomodule](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/) pattern and build twice (one bundle for each group of browser targets, to ensure optimal size for evergreen browsers -and- maximum compatibility for legacy browsers).

Other non-standardized additions to JavaScript gained popularity as well. [React added JSX](https://reactjs.org/docs/introducing-jsx.html) as a way of keeping the HTML-like authoring experience of writing components inside JavaScript files. [Ractive](https://github.com/ractivejs/component-spec), [Vue](https://vuejs.org/v2/guide/single-file-components.html) and [Svelte](http://svelte.dev/) adopted Single File Components that lean on bundlers to compile to JS, CSS, and sometimes HTML. [Babel-Macros](https://www.swyx.io/speaking/babel-macros/) put metaprogramming and compile-time execution inside of Babel.

By the way - If you're gonna be writing make-believe JavaScript and compiling to JavaScript anyway, **why keep writing JavaScript**? [CoffeeScript](https://coffeescript.org/) led the way to adding a Ruby-like developer experience, eventually supplanted by ES6. [TypeScript](http://typescriptlang.org/) and [Flow](https://flow.org/) added static type annotations and inference atop existing JavaScript syntax. [ReasonML](https://reasonml.github.io/), [Purescript](http://www.purescript.org/), [Elm](https://elm-lang.org/) and [ClojureScript](https://clojurescript.org/) abandoned that familiarity in favor of stronger typing and more functional paradigms. Of these Compile-to-JS breeds, TypeScript currently polls highest at ~60% adoption in [recent surveys](https://2019.stateofjs.com/javascript-flavors/).

Again - you can compile-to-JS all of these independently, but more likely than not you're also going to want to tie this work to a step in your overall bundler workflow.

## Production Optimizations

The other job of task runners and eventually bundler plugins, apart from all this **module**, **target**, and **language** related work, is all production optimizations that were usually stuck on to the build pipeline. (Not core to bundling, but usually coupled with it) Here is a nonexhaustive list of optimizations in rough order of importance:

- Reduce JS bundle size: [Strip out comments and minify JavaScript variable names](https://webpack.js.org/plugins/terser-webpack-plugin/). [Google Closure Compiler](https://developers.google.com/closure/compiler/docs/api-tutorial3) deserves special mention as best-in-class here although it is not native to the Webpack ecosystem. You can also [do the same for CSS](https://github.com/NMFR/optimize-css-assets-webpack-plugin) - in fact, utility-first CSS frameworks like [Tailwind](https://tailwindcss.com/docs/installation/#webpack) rely on build tools stripping out unused classes.
- [Code Splitting](https://webpack.js.org/guides/code-splitting/): Making it trivial to reduce _initial_ bundle size, outputting multiple JavaScript chunks that are only loaded on demand
- [Image and Font Optimization](http://images.guide/) - these can be very large raw files that you can downsample to just the quality/glyphs you actually use. However, if you stick a bunch of image processing into your build process, especially without caching, you slow it down. Gatsby-Transformer-Sharp does a lot of pre-emptive image processing that you may wish to avoid - [caching can help](https://www.npmjs.com/package/netlify-plugin-gatsby-cache). I [favor one-time work](https://www.swyx.io/writing/jamstack-og-images) but the best approach is probably to use an Image CDN like Cloudinary or [Netlify Large Media](https://www.netlify.com/products/large-media/).
- [Prerendering or Server Side Rendering](https://github.com/chrisvfritz/prerender-spa-plugin) - so that first-loads of HTML show content instead of having to download and parse JS to be rendered clientside.
- [Creating HTML files](https://webpack.js.org/plugins/html-webpack-plugin/) that load your generated assets optimally: so you don't have to
- [Inlining Critical CSS](http://developers.google.com/speed/docs/insights/OptimizeCSSDelivery) - so pages show up with important styles already loaded
- [Injecting environment variables](https://webpack.js.org/plugins/environment-plugin/) - so you can vary Constants used in your code based on production/staging/other environments
- [PWA](https://blog.bitsrc.io/what-is-a-pwa-and-why-should-you-care-388afb6c0bad) creation - plugins for an offline-first/cached speed ([1](https://github.com/NekR/offline-plugin), [2](https://github.com/arthurbergmz/webpack-pwa-manifest))
- [Content Hashing](https://webpack.js.org/guides/caching/) - for cachebusting - less relevant with some modern CDN configurations, but still can be relevant for browser caching scenarios
- [Tree Shaking](https://webpack.js.org/guides/tree-shaking/) and [Dead Code Elimination](https://medium.com/@Rich_Harris/tree-shaking-versus-dead-code-elimination-d3765df85c80): static analysis for stripping out unused code also for the purpose of reducing JS bundle size - but overrated in terms of actual impact

As you can see, enough of these are critical to modern web apps that build tools often become critically important for most teams and framework communities.

## Developer Experience

Secondary to Production Optimizations (which impact end users), modern bundlers also offer niceties for Developer Experience (which end users don't see):

- Automatic Dependency Collection - Old school Task Runners and even Google Closure Compiler require you to manually declare all dependencies upfront. Bundlers like Webpack automatically build and infer your [dependency graph](https://webpack.js.org/concepts/dependency-graph/) based on what is imported and exported.
- [Dev Server](https://webpack.js.org/configuration/dev-server/) - for Single Page Apps and JAMstack apps, there is no running Node server to run locally, so the bundler boots one up for local testing.
- [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/) - reduces the feedback loop of code changes by swapping out modules _while an app is running_, without a full reload. Reliant on having a running Dev Server. A higher level of hot reloading preserves the **state** of _components_ while changing them, not just modules - [this is an active area of development in React](https://overreacted.io/my-wishlist-for-hot-reloading/) and [a first class citizen in Elm](https://www.youtube.com/watch?v=Agu6jipKfYw). (See Addendum for more details)
- [Source Maps](https://bendyworks.com/blog/getting-started-with-webpack-source-maps) - production code isn't human readable after all the production optimizations - bundlers can map source to production code, and browsers can request and display errors pointing to the original source if given a sourcemap. Useful both in production and in development.
- [Bundle Analyzer/Visualizer plugin](https://www.npmjs.com/package/webpack-bundle-analyzer) - the modern app uses too many modules to manually account for. Visualization and analysis can help identify the biggest points to work on first. [Formidable Labs makes a nice Dashboard](https://github.com/FormidableLabs/webpack-dashboard) for this.

## Metaframeworks - reducing Many Jobs to One

Specifically for frontend developers using frameworks, all of the above can be a lot to setup just to say "Hello World" with best practices. It is natural to want to [subsume these build tools under a single abstraction](https://increment.com/development/the-melting-pot-of-javascript/) to form a new starting point. Dan Abramov, with inspiration from Ember CLI, led the way on this in React with `create-react-app` (this was [the subject of my second ever talk](https://www.swyx.io/speaking/creating-cra)).

In particular, Server-side Rendering is a pain point and of critical importance for performance while using a front-end framework, leading to [Gatsby](https://gatsbyjs.org/) and [Next.js](https://nextjs.org/) (React), [Gridsome](https://gridsome.org/) and [Nuxt.js](https://nuxtjs.org/) (Vue), and [Scully](https://www.netlify.com/blog/2019/12/16/introducing-scully-the-angular-static-site-generator/) (Angular).

Even stepping outside the frontend web developer role, there is a case for abstracting over build tools, as with [TSDX](https://github.com/jaredpalmer/tsdx/) which helps write TypeScript libraries.

## Conclusion - The Pandora's Box

A small and passionate part of the webdev community is working very hard to make build tools more optional than they are today. Given that modules are the primary/original reason for the rise of build tools, and have since been [standardized in ECMAScript](https://exploringjs.com/es6/ch_modules.html), each runtime is working on making them usable without a build tool. [ES Modules arrived in browsers in 2017](https://jakearchibald.com/2017/es-modules-in-browsers/), and [Node.js unflagged them in Nov 2019](https://twitter.com/mylesborins/status/1194375751774064647) (putting them on track for [widespread use in Node 14 in 2020](https://github.com/nodejs/Release)). [Pika](https://www.pika.dev/registry/) and [Rollup](https://github.com/rollup/rollup) are banking especially hard on the universal, ESM-enabled future.

However, legacy browsers still exist, and legacy, battletested code is still in wide use. I'm also not sure how transitive dependencies are handled ([the import map proposal](https://twitter.com/swyx/status/1208820201623437312) may help! but... how would you build your import maps?). But the overriding issue for the "no-build-tools" future is that the bar has been raised _so much higher_ than just "we want modules in JavaScript", as the rest of this blogpost has painted. We still want asset management, static types, prerendering, image optimization, and whatever else we take for granted in modern web apps. So despite the progress in ESM-everywhere, I don't see a clear path toward it materially impacting JavaScript in the near term.

Here's [V8's advice](https://v8.dev/features/modules#bundle):

> With modules, it becomes possible to develop websites without using bundlers such as webpack, Rollup, or Parcel. It’s fine to use native JS modules directly in the following scenarios:
>
> - during local development
> - in production for small web apps with less than 100 modules in total and with a relatively shallow dependency tree (i.e. a maximum depth less than 5)

[Addy Osmani put it like this](https://twitter.com/addyosmani/status/932494593832075264):

> Imo module bundlers will be necessary for prod builds for a good while yet. In a few years, ES modules perf + modulepreload + H2 Push + Cache Digests might give us a compelling story, but it's a long road ahead. Modules for dev/authoring format may take off in short term.

Build Tools in JavaScript are a Pandora's Box. We opened them, and from what little I can see, they are here to stay. Hopefully this has been a good intro to what jobs they perform in JavaScript.

## Related Reads

Other reads I recommend on this topic:

- https://stackoverflow.com/questions/35062852/npm-vs-bower-vs-browserify-vs-gulp-vs-grunt-vs-webpack
- https://www.robinwieruch.de/webpack-advanced-setup-tutorial
- https://nystudio107.com/blog/an-annotated-webpack-4-config-for-frontend-web-development
- https://webpack.js.org/concepts/why-webpack/
- [Blogpost: Why would I use a Webpack?](http://tinselcity.net/whys/packers)
- [Talk: Unbundling the JavaScript module bundler by Luciano Mammino](https://www.youtube.com/watch?v=WGlT921ixx4&feature=youtu.be)
- [Webpack and Rollup: the same but different](https://medium.com/webpack/webpack-and-rollup-the-same-but-different-a41ad427058c)
- [Comparing bundlers: Webpack, Rollup & Parcel](https://medium.com/js-imaginea/comparing-bundlers-webpack-rollup-parcel-f8f5dc609cfd)
- [ESModules: A Cartoon Deep Dive](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)
- [ESModules Support vs Build Tools](https://www.contentful.com/blog/2017/04/04/es6-modules-support-lands-in-browsers-is-it-time-to-rethink-bundling/)
- [Kyle Simpson on the divergence between Human-written JS and Machine-run JS](https://www.youtube.com/watch?v=lDLQA6lQSFg)
- [Sean Larkin's Webpack Academy Workshop](https://docs.google.com/presentation/d/1RuTDSvfaEFBFQ-3OiyxtuPTaGhv-xv7OG4jt5mpIdUw/edit#slide=id.g3762099682_0_46) starts with 1 hour on Why Webpack - [view on Frontend Masters](https://frontendmasters.com/courses/webpack-fundamentals/)

## Thanks

Thanks to [Sean Larkin](https://twitter.com/theLarkInn/), [Mark Erikson](https://twitter.com/acemarke), [Robin Wieruch](https://twitter.com/rwieruch) and [Joe Previte](https://twitter.com/jsjoeio) for reviewing early drafts of this!

## Addendum on Hot Reloading

I don't have much experience in the details of HMR. These are notes from [Mark Erikson](https://twitter.com/acemarke):

- Module reloading: recompile, push new code to client, allow app to do something
- "Plain" client reloading: just reimport and use affected modules. For React, this is mostly just reimport <App> and re-render.
- "Clever" reloading: attempting to preserve state in the component tree, but this requires much more complex work. React-Hot-Loader works by using Babel to insert `http://module.hot.accept()` and "proxy components" around every component it can identify, and moving the state up into the proxy component, but this is fragile. That's why the new "Fast Refresh" capability is actually half-built into React itself, with bundler-specific use of the APIs.

[His full explanation of Webpack vs React's Hot reloading is on his blog.](https://blog.isquaredsoftware.com/2017/08/blogged-answers-webpack-hmr-vs-rhl/).
