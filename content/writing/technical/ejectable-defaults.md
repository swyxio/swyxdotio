---
title: Ejectable Defaults
slug: ejectable-defaults
subtitle: Zero Config First, Full Config Later
categories: ['Tech', 'JavaScript', 'DX']
date: 2019-10-05
---

## TL;DR

**Bottom Line Up Front: Ejectable Defaults are Great!**

One idea I've been playing around a lot with is the idea of **ejectable defaults**. Broadly speaking, this idea leads to a fantastic developer experience for getting build tools going:

- your build tool carries internal default files with it, so that you can run it with zero config. **Zero config is the best possible initial developer experience.**
- as you grow, you need more control. you can then choose to eject some of these files to modify them and assume full control. **Full config is the best possible subsequent developer experience.**

> ⚠️when I refer to config, I refer to the broad concept of "wiring things up" - so not just simple config files, but also other files that may need to be present, adding plugins, and boilerplate code that may need to be written, just for things to work.

I recently brought this idea to [Sapper](https://sapper.svelte.dev). Here's a list of files you need in a [normal Sapper project](https://github.com/sveltejs/sapper-template/) to get it working:

- `rollup.config.js`
- `src/client.js`
- `src/server.js`
- `src/service-worker.js`
- `src/template.html`
-  I also have other files I typically want in my `ssg` project.

This means that to get started you often have to clone from git ([degit](http://npm.im/degit) is a wonderful tool for doing this!), and clutter up the codebase a bit with boilerplate.

Here's the developer experience I'm implementing in `ssg` ([6 minute demo here](https://www.youtube.com/watch?v=JpsxYhkVC7M))

```bash
$ yarn add ssg
$ echo "<h1>hi</h1>" >> src/routes/index.svelte
$ yarn ssg dev
```

And you have a Hello world site, starting from a blank directory!

`ssg` just ships with default versions of those files by default. If they don't exist in your project, `ssg` just uses its internal default versions as a fallback. This means that there is nothing more in your repo than exactly what you need to get your project going.

As you develop, you often want to customize these defaults. It may mean having to go look up how to modify or copy out these files. That's why `ssg` ships a small CLI to do exactly this.

```bash
$ yarn ssg eject
✔ Pick files to copy out · template.html, client.js
✔ A file exists at src/template.html. Are you sure you want to overwrite? (y/N) (y/N) · false
✔ A file exists at src/client.js. Are you sure you want to overwrite? (y/N) (y/N) · true
copied /Users/swyx/Work/community/node_modules/ssg/ejectableFiles/client.js to src/client.js
```

From here the user is expected to take full ownership of these files, as though it were a regular Sapper project. This is a very simple and predictable assignment of responsibility between tool and user.

The rest of this blogpost covers my journey getting to this point.

## Recent Context

One reason I have been so publicly excited about [Gatsby Themes](https://www.gatsbyjs.org/docs/themes/) is that they represent the next logical step in developer experience and consolidated tooling. 

As you know, [I've Had Thoughts on the state of JS tooling](https://www.swyx.io/writing/js-tooling/). 

In 2016 Dan Abramov and collaborators started a movement for more consolidated tooling in React with [`create-react-app`](https://github.com/facebook/create-react-app). This was hugely influential: 

- you can see my talk on this on [Creating Create-React-App](https://www.swyx.io/speaking/creating-cra/)
- Dan also wrote [The Melting Pot of JavaScript](https://increment.com/development/the-melting-pot-of-javascript/) and [gave a great talk](https://www.youtube.com/watch?v=G39lKaONAlA) on it
- a bunch of copycats sprung up - Travis' [create-react-library](https://github.com/transitive-bullshit/create-react-library), even [tsdx](https://github.com/jaredpalmer/tsdx/) (which I help maintain) is basically `create-react-app` for TypeScript libraries. 
- This idea even sprung up in libraries, not just build tools. [Apollo Boost](https://github.com/apollographql/apollo-client/tree/master/packages/apollo-boost) helped tame the insane mess of apollo things you need to hook together to say hello world. [Redux Starter Kit](https://github.com/reduxjs/redux-starter-kit) gave a recommended bundle of things that help solve most people's pain points in an opinionated bundle.

The idea was to bundle a bunch of unopinionated things into single reusable opinionated things. "Toolboxes" over boilerplates. [Kent called these tool kits](https://kentcdodds.com/blog/concerning-toolkits). Whatever you call them, they're useful and obviously the right idea.

## Zero Config

Since you're going for opinionatedness, it's tempting to go all the way. The less you have to configure, the less you can mess up, the less you need to test, the less you need to read and document and teach, and the easier you can upgrade if you trust in beneficient maintainers. 

`create-react-app` did this, banking on a hard no config requirement. This is a very difficult battle to fight, because needs understandably differ, and you could continue using the thing *if they just added one flag for your thing*. You name it, the CRA maintainers have had to fight it off, from customizing Babel configs to Webpack configs to differential bundling to absolute module resolution...

Certain configs are widespread enough that they "don't count" towards a no-config requirement. For example, most everybody (except CRA) allow you to specify a `.babelrc` to tweak your Babel plugins, even if they don't let you directly modify the underlying webpack or rollup config. `tsconfig.json` has also arguably reached this level of ubiquity. It pretty much serves the same purpose as `.babelrc`.

What's common among them is that they are all flat static files - they just contain simple values, with no executable code. I'll have a followup blogpost on the benefits of Formats over Functions. (let me know if you Have Thoughts on this)

But if you wanted more control, CRA forced you into a scary irreversible decision: `eject`. Eject is a bad word. So bad that CRA even surveys you asking you why you felt you had to eject.

THe problem is, everyone eventually wants more control. I won't bother elaborating, I trust you get this.

## Optional Config

[Next.js does this very well](https://nextjs.org/docs#custom-configuration). You can go very far with Next.js not even knowing that you can configure it with a `next.config.js` file. This is because Next.js has sensible defaults that offer a great out of the box experience. Likewise for Gatsby, although I feel configs are basically required in Gatsby projects due to everybody using the plugin system.

Both of these projects hinge their optional configs on a single file. (I only comment on these because I am more familiar with them, I'm sure there are plenty more examples I have no idea about) This makes it easy to find and document, but can offer challenges for certain needs. 

Most often this is felt in how they allow users to modify the default webpack configs. Asking users to modify your default webpack config often means leaking implementation detail, requiring a bunch of docs (primarily, knowing what's already there without looking at it). I personally have never felt at ease doing it. But again, allowing it is incredibly valuable.

> Aside: some people like to sidestep build tools altogether and ask users to bring their own build chains. This reduces the developer experience but improves maintainability and ensures you don't end up just getting a bunch of issues of people asking you how to debug their webpack config. However, a big value add of tools like CRA, Next.js, and Gatsby, is allowing developers to be productive without being webpack experts. You lose a massive audience and value add by letting go of this one thing. So the jury is still out on whether it is worth it.

This concept applies beyond build tool configs though. Many projects want to help their users add functionality quickly and easily, even though they could code it up themselves, it might take a lot of work to get it right and maintain it, so eventually a plugin system is born. These bring with them microcosms of the design issues their parent tools face, sometimes even necessitating [plugins for plugins](https://www.gatsbyjs.org/packages/gatsby-remark-images/?=remark#how-to-use) and [presets for groups of plugins](https://babeljs.io/docs/en/presets) because why not.

All of this is fine and good and kinda sorta works but I can't quite shake the feeling that it could be better...

## Shadowing and Ejecting

Gatsby Themes took this problem solving to the next level, which is why I have been a very enthusiastic fan of the project. 

> Aside: for background on Gatsby themes, check the [docs](https://www.gatsbyjs.org/docs/themes/), try themes in the [Theme Jam](https://themejam.gatsbyjs.org), check out some posts on [Chris Bisardi](https://www.christopherbiscardi.com/post) and [John Otander](https://johno.com/writing)'s blogs, and in particular [Jason's Gatsby Themes livestream](https://www.gatsbyjs.org/blog/2019-02-11-gatsby-themes-livestream-and-example/)

Gatsby Themes are plugins that ship their own components. These offer the flexibility of configuring plugins with the developer experience of minimal config. With themes, you can basically `npm install` a whole site, including UI. This extends the idea of "toolkits" or "starter kits" to pretty much everything you can possibly want or need in a site. It is a fantastic idea.

However it has some pain points. It's relatively easy to say that themes should be infinitely inheritable, so you can ship themes in themes in themes, and build up a full site that way. It's much harder to actually write components and API boundaries that compose well like this, especially with Shadowing involved (explained below). In practice, I have not found any use to having more than 1 theme layer, for now (I'm sure this will change as we discover what works).

The other pain point comes with actually taking advantage of the shadowing. Theme components can be Shadowed ([What is Component Shadowing?](https://www.christopherbiscardi.com/post/component-shadowing-in-gatsby-child-themes/)) with a [Guessable API](https://johno.com/guessable). However you had to go look up how to shadow the things by reading docs or digging inside `node_modules`. 

More to document, more to remember. Not great!

So Chris spun up a [wonderful little CLI](https://github.com/ChristopherBiscardi/gatsby-theme) to `eject` these components for the purposes of shadowing ([he livestreamed his process working on it, check it out!](https://www.youtube.com/channel/UCiSIL42pQRpc-8JNiYDFyzQ/search?query=cli)). So with this thing you can run `gatsby-theme eject` and see a list of things you can eject, and it pops them out for you to modify to your heart's content. (The CLI does some neat transforms to sort out relative imports for you).

So the combination of shadowable components and the ability to eject them for further work solves this seemingly intractable tradeoff between wanting to offer a low config developer experience, yet a progressive and reversible upgrade for users who feel they might need more power.

## You don't need Full Shadowing

Chris implemented [Component Shadowing as a webpack plugin](https://www.christopherbiscardi.com/post/using-gatsby-component-shadowing-without-gatsby/) you can use without using Gatsby, but what if you want to extend this concept outside of webpack?

In Sapper's core code, it attempts to read this required file and throws if it is not found:

```ts
import * as fs from 'fs';

export default function read_template(dir: string) {
	try {
		return fs.readFileSync(`${dir}/template.html`, 'utf-8');
	} catch (err) {
		if (fs.existsSync(`app/template.html`)) {
			throw new Error(`As of Sapper 0.21, the default folder structure has been changed:
  app/    --> src/
  routes/ --> src/routes/
  assets/ --> static/`);
		}

		throw err;
	}
}
```

So I added a [default `runtime/internal/template.html`](https://github.com/sw-yx/sapper/blob/forkedSapper/runtime/internal/template.html) and replaced the throw with the fallback:

```ts
import * as fs from 'fs';
import * as path from 'path'
export default function read_template(dir: string) {
	try {
		return fs.readFileSync(`${dir}/template.html`, 'utf-8');
	} catch (err) {
		if (fs.existsSync(`app/template.html`)) {
			throw new Error(`As of Sapper 0.21, the default folder structure has been changed:
  app/    --> src/
  routes/ --> src/routes/
  assets/ --> static/`);
		}
		// use fallback template
		const fallbackPath = path.resolve(__dirname, '../runtime/internal/template.html')
		return fs.readFileSync(fallbackPath, 'utf-8')
	}
}
```

Once I could do that, I was pretty hooked. I went through and added fallback defaults for [all of the required files](https://github.com/sw-yx/sapper/tree/forkedSapper/runtime/internal). But I still had one hard dependency... `rollup.config.js`! The big Kahuna.

Reading this was [implemented inside Sapper as a simple `load_config`](https://github.com/sveltejs/sapper/blob/master/src/core/create_compilers/RollupCompiler.ts#L140):

```ts
	static async load_config(cwd: string) {
		if (!rollup) rollup = relative('rollup', cwd);
    const input = path.resolve(cwd, 'rollup.config.js');
    // ....
  }
```

So I did the simplest possible thing I could think of:

```ts
	static async load_config(cwd: string) {
		if (!rollup) rollup = relative('rollup', cwd);
    let input = path.resolve(cwd, 'rollup.config.js');
    if (!require('fs').existsSync(input)) {
      input = path.resolve(__dirname, '../runtime/internal/fallback.rollup.js') // opted for a different name so it is easier to find
    }
```

If I tried the same approach as the other subjects we already discussed, I would have to take on rollup maintenance burden and offer ways to modify it. I was keen on finding another way. So this is what I ended up with - to be clear I didnt think this through very hard, but it seems an interesting solution.

I then implemented [the `eject` code](https://github.com/sw-yx/ssg/blob/d253f841d45694b128cc0091084457f8bb1f10ef/packages/ssg/src/eject.ts). It wasn't hard at all, given my prior experience. You can see the code at that link, but here are some implementation notes if you're doing this:

- I had to ship the ejectable files separately because of technicalities with project governance but arguably the files you eject should be the same files you use in the fallback
- i use Jon Schlinkert's [enquirer](https://github.com/enquirer/enquirer) as best in class CLI UI library. Usual caveats apply with [anything in the Schlinkerverse](https://www.reddit.com/r/webdev/comments/8kq21d/new_to_web_development_is_it_normal_to_have_so/).
- knowing the difference between `path.resolve(__dirname` and `path.resolve(process.cwd` is very helpful
- copying files is a potentially destructive action. Prompt for overwrite and also preserve the old file:

```ts
if (fs.existsSync(destinationPath)) {
  const prompt = new Confirm({
    name: 'question',
    message: `A file exists at ${chalk.cyan(destinationPath)}. Are you sure you want to overwrite? (y/N)`
  });
  const answer = await prompt.run()
  if (!answer) return // dont override, terminate early
  try {
    fs.renameSync( destinationPath, destinationPath + '.old'); // preserve old file
  } catch (err) {
    console.log('renaming failed. copying and overwriting instead.')
    fs.copyFileSync( destinationPath, destinationPath + '.copy');
  }
}
fs.copyFileSync(sourceFile, destinationPath);
```

So that's what i've done so far. If you watch the demo video it has the developer experience I have in mind and described at the start of this article.

## [6 Minute Demo Video](https://www.youtube.com/watch?v=JpsxYhkVC7M)

## Appendix

I'm quite interested in how various tools allow their usess to modify internal configs. Here are some notes I took.

Next.js offers helpful utilities but also relies on nonstandard APIs:

```js
// next.config.js
module.exports = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // buildId - String: the build id used as a unique identifier between builds
    // dev - Boolean: shows if the compilation is done in development mode
    // isServer - Boolean: shows if the resulting configuration will be used for server side (true), or client side compilation (false)
    // defaultLoaders - Object: Holds loader objects Next.js uses internally, so that you can use them in custom configuration

    // Example using webpack option
    config.plugins.push(new webpack.IgnorePlugin(/\/__tests__\//))
    return config
  },
  webpackDevMiddleware: config => {
    // Perform customizations to webpack dev middleware config
    // Important: return the modified config
    return config
  },
}
```

Whereas Gatsby somehow throws Redux actions into the mix:

```js
// gatsby-node.js
exports.onCreateWebpackConfig = ({
  stage,
  rules,
  loaders,
  plugins,
  actions,
}) => {
  actions.setWebpackConfig({
    module: {
      rules: [
        {
          test: /\.less$/,
          use: [
            // We don't need to add the matching ExtractText plugin
            // because gatsby already includes it and makes sure its only
            // run at the appropriate stages, e.g. not in development
            loaders.miniCssExtract(),
            loaders.css({ importLoaders: 1 }),
            // the postcss loader comes with some nice defaults
            // including autoprefixer for our configured browsers
            loaders.postcss(),
            `less-loader`,
          ],
        },
      ],
    },
    plugins: [
      plugins.define({
        __DEVELOPMENT__: stage === `develop` || stage === `develop-html`,
      }),
    ],
  })
}
```

but offer some niceties like ` actions.replaceWebpackConfig(config)` if you need it.

React-Static uses [a plugin with many many lifecycles](https://github.com/react-static/react-static/blob/master/docs/plugins/node-api.md#webpack-functionfunction) to modify its config:


```js
// node.api.js
export default pluginOptions => ({
  // alll the lifecycles!
  afterGetConfig,
  beforePrepareBrowserPlugins,
  afterPrepareBrowserPlugins,
  beforePrepareRoutes,
  normalizeRoute,
  afterPrepareRoutes,
  afterBundle,
  afterDevServerStart,
  beforeRenderToElement,
  beforeRenderToHtml,
  htmlProps,
  beforeHtmlToDocument,
  beforeDocumentToFile,
  afterExport,
  headElements,
  // webpack modification
  webpack: (config, { defaultLoaders }) => {
    config.module.rules = [{
      oneOf: [
        defaultLoaders.jsLoader,
        defaultLoaders.jsLoaderExt,
        {
          // Use this special loader
          // instead of the cssLoader
        }
        defaultLoaders.fileLoader,
      ]
    }]
    return config
  }
})
```