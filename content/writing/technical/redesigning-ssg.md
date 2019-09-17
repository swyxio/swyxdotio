---
title: A Better Way to Get Data
slug: better-way-to-get-data
categories: ['Tech', 'Svelte']
date: 2019-09-15
published: false
---

On the back of [Bad Ways to Get Data](/writing/bad-ways-to-get-data), I want to rewrite how I do data fetching, again. This time my design goals are:

- generate a manifest upfront. This means firing off the minimum viable request to index everything, as defined by the user. Do NOT attempt to read everything up front as that blocks execution.
- offer easy profiling. instead of ad hoc console.logs, use `debug` to provide reusable log events.
- Define a transparent plugin interface - pass the input of the main function to a plugin, get the output and pass it out.
  - i don't like passing in a set of strings or objects and letting the thing opaquely call the thing
- (not data related) use a temp folder to store all the Sapper boilerplate
- DON'T cache or precompute anything upfront. rely on the index to be authoritative instead.
- getDataSlice should memoize itself
- allow non SSG work to be done with the data afterward on each build?
  - for RSS
  - for image production?
- allow non SSG work to be done ONCE at author time, fuck building
  - for image production?

Reach goals:

- TypeScript?
- Estimate time for completion
- offer incremental builds by diffing a prior manifest (cheap to read) and/or the actual generated file system (a better source of truth, but more expensive to read)
  - In dev, watch and reload individual files
  - how do you figure out the dependency tree from here?
  - sapper rebuilds everything every time. may have to fork sapper or somehow influence them to merge the export_only PR that's been sitting around.
- offer a dry run? this isn't a priority for me right now. It's just one step lower than a manifest.
- hew as close to the gatsby/11ty developer experience as possible

The API right now:

- `getInitialData`: get and preprocess ALL the data, and cache it. return index.
- `getData`: read individual items from cache. return item.

The API I want:

- `createIndex`: a CHEAP function to get an overview of all data and their hashes/modified dates.
- (invisible API): read prior index if exists and diff and only THEN kick off SSR
- `getDataSlice`: an idempotent function to get a data slice based on a key. results will be temporarily cached and return if request repeats.
- `postProcess`: post process.
- (invisible API): save index and save generated files for next build

The hooks API is very attractive for composition but I'm not sure it works here.

The interface for the index is very important as I'll be passing this around. We could have a "fat index" (and worry about what to include) or a "thin index" (and worry about doing subsequent work):

- `lastModified`: datetime
- `uid`: can be the slug, filename, whatever as long as it is guaranteed to be unique. Right now slug and uid are the same thing, but this will break.

I have no idea what I should do here.

---

Experimenting with the hooks API...

```js
export async function getIndex() {
  const index = getMainIndex() // create index - this should be fast!
  const blogIndex = await myPlugin('blog')
  ssg.postProcess(async () => {
    // make rss feed of index and blogindex
  })
  return {
    index,
    blogIndex
  }
}
async function myPlugin(name, opts) {
  const index = createPluginIndex(name, opts)
  const getSlice = ssg.createSlice(name, async key => {
    // expensively fetch slice
  })
  ssg.postProcess(async () => {
    // do some postbuild thing?
    // you can use getSlice here cheaply since its cached
  })
  return index
}
```

and you can create plugin plugins...

```js
async function myPlugin(name, opts) {
  const index = createPluginIndex(name, opts)
  const getSlice = myPluginPlugin(name)
  ssg.postProcess(async () => {
    // do some postbuild thing?
    getSlice(name).then(console.log)
  })
  return index
}

async function myPluginPlugin(name) {
  const getSlice = ssg.createSlice(name, async key => {
    // expensively fetch slice
  })
  ssg.postProcess(async () => {
    getSlice(name).then(console.log)
  })
  return getSlice
}
```

---

after thinking it through, i dont like this anymore. if everything is run once, there is no sense sequestering it inside a function. this isn't the right use case for plugins.

I reference [Component Story Format](https://medium.com/storybookjs/component-story-format-66f4c32366df) in this - they broke it up, and now it's far more reusable. It makes sense. I don't have an excuse.

I'll just stick to individual exports for now.
