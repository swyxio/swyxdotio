---
title: How rollup-plugin-svelte Works
slug: rollup-plugin-svelte
categories: ['Svelte']
date: 2020-01-31
description: Svelte is often thought of as a compiler. But really it is a compiler within a bundler.
---

*[Tweeted today from the bus](https://twitter.com/swyx/status/1223334283693084672?s=20)*

Svelte has a dirt-simple compiler API - [literally `svelte.compile(source)`](https://svelte.dev/docs#Compile_time) - but it only works at the single component level. Most apps need a bundler solution!

`rollup-plugin-svelte` is [only 338 lines of code](https://github.com/sveltejs/rollup-plugin-svelte/blob/master/index.js) and I thought I would dig into it today! I was originally gearing up for a bigger post, but didn't have much time today due to the final day of Netlify allhands.

## Supporting breaking changes in Svelte

Check out how it finds the app's Svelte version! This is used for supporting old versions of Svelte.

```js
const { version } = require('svelte/package.json'); // directly requiring the file that must be there

const major_version = +version[0]; // coerce + get first number

const { compile, preprocess } = major_version >= 3 // branch based on version
	? require('svelte/compiler.js')
	: require('svelte');
```

## Plugin Part 1: Resolving Shared Svelte Components

Shared Svelte component packages have [a "svelte" field in the package.json](https://github.com/sveltejs/component-template/blob/master/package.json#L3). Svelte apps have to be able to access shared Svelte components in their source form, so as to be able to bundle them accordingly. This is what makes that happen.

```js
resolveId(importee, importer) {
  if (cssLookup.has(importee)) { return importee; }
  if (!importer || importee[0] === '.' || importee[0] === '\0' || path.isAbsolute(importee))
    return null; // swyx: seriously, we dont handle any absolute or relative imports. only modules.

  // if this is a bare import, see if there's a valid pkg.svelte
  const parts = importee.split('/');
  let name = parts.shift();
  if (name[0] === '@') name += `/${parts.shift()}`; // swyx: allow for @namespaced packages

  const resolved = tryResolve( // swyx: step 1: try resolving for package.json
    `${name}/package.json`,
    path.dirname(importer)
  );
  if (!resolved) return null;
  const pkg = tryRequire(resolved); // swyx: step 2: try requiring it
  if (!pkg) return null;

  const dir = path.dirname(resolved);

  if (parts.length === 0) {
    if (pkg.svelte) { // swyx: if we get here, there IS a pkg.svelte field!!
      return path.resolve(dir, pkg.svelte);
    }
  } else {
    // swyx: import sub paths of that shared component package
    if (pkg['svelte.root']) {
      // TODO remove this. it's weird and unnecessary - swyx: not sure why this comment is here
      const sub = path.resolve(dir, pkg['svelte.root'], parts.join('/'));
      if (exists(sub)) return sub;
    }
  }
},
```

## Plugin Part 2: Svelte Transform

The first really important part - the rollup plugin's `transform` method. I went and simplified the code. it basically calls `svelte.compile` with that file's code and adds the css onto a `Set` for later.

```js
transform(code, id) {
  // swyx: etc.
  // swyx: preprocess code
  // swyx: etc.
  return preprocessPromise.then(code => {
    let warnings = [];
    const base_options = {}
    const compiled = compile( // swyx: svelte.compile(code, options)
      code,
      Object.assign(base_options, fixed_options, { filename: id })
    );

    // swyx redacted: emit warnings
    
    if ((css || options.emitCss) && compiled.css.code) {
      let fname = id.replace(extension, '.css');
      if (options.emitCss) { // css sourcemaps
        const source_map_comment = `/*# sourceMappingURL=${compiled.css.map.toUrl()} */`;
        compiled.css.code += `\n${source_map_comment}`;
        compiled.js.code += `\nimport ${JSON.stringify(fname)};\n`;
      }
      cssLookup.set(fname, compiled.css); // save the css of the Svelte component
    }
    if (this.addWatchFile) { // rollup api for adding extra watches on all dependencies of this file
      dependencies.forEach(dependency => this.addWatchFile(dependency));
    } else {
      compiled.js.dependencies = dependencies;
    }
    return compiled.js; // only return the js of the Svelte component
  });
},
```

## Plugin Part 3 - Generating CSS and SourceMaps

Rollup already takes care of the JS so only CSS needs handling for the final bundle output. It is a straight concat of code and sourcemap and then writeFileSync https://github.com/sveltejs/rollup-plugin-svelte/blob/master/index.js#L295-L336

```js
generateBundle() {
  if (css) {
    let result = '';

    const mappings = [];
    const sources = [];
    const sourcesContent = [];

    for (let chunk of cssLookup.values()) {
      if (!chunk.code) continue;
      result += chunk.code + '\n';
      // swyx redacted: sourcemap stuff
    }

    const writer = new CssWriter(result, {
      sources,
      sourcesContent,
      mappings: encode(mappings) // swyx: sourcemap stuff
    }, this.warn);

    css(writer); // swyx: call user supplied `css()` function with a "writer" that has a `.write` method
  }
}
```

That final `css` function call is supplied by the rollup plugin user. It's a really simple one but can be as complex as you want - here's the standard Svelte rollup template:

```js
svelte({
    // enable run-time checks when not in production
    dev: !production,
    // we'll extract any component CSS out into
    // a separate file — better for performance
    css: css => {
        css.write('public/build/bundle.css');
    }
}),
```