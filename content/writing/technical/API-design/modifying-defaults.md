---
title: 'API Design: Modifying Defaults'
slug: api-design-modifying-defaults
categories: ['Tech', 'API Design']
date: 2019-10-10
---

> This is a quick note on a API Design. I hope to make this an ongoing series.

## Problem Statement

Often you want to provide a default preset for user convenience:

```js
// library-land
const defaultExtensions = ['.md', '.mdx', '.markdown']
export function myPlugin({ extensions = defaultExtensions }) {
  // use extensions
}
```

The cost of this is that the user has to retype whatever is in the default if they just want to add something:

```js
// user-land
const myConfig = [
  myPlugin({ extensions: ['.md', '.mdx', '.markdown', '.mdsvex'] })
]
```

This is a trivial example so it doesnt seem like a big lift, but consider a more complicated set of defaults:

```js
// library-land
// complex set of imports and code for getExt1/2/3()
export async function myPlugin({ extensions }) {
  if (!extensions) {
    extensions = await Promise.all([getExt1(), getExt2(), getExt3()])
  }
  // use extensions
}
```

Now the user has to do:

```js
// user-land
// complex set of imports and code for getExt1/2/3()
// unavoidable imports and code for thingIWantedToAdd()
;(async function() {
  let extensions = await Promise.all([
    getExt1(),
    getExt2(),
    getExt3(),
    thingIWantedToAdd()
  ])
  const myConfig = [await myPlugin({ extensions })]
})()
```

## Bad Solution

I was recently tempted to save the user some of that pain by providing a modifier API instead of a replacement API:

```js
// library-land
// complex set of imports and code for getExt1/2/3()
export async function myPlugin({ modifyExtensions }) {
  let extensions = await Promise.all([getExt1(), getExt2(), getExt3()])
  if (!modifyExtensions) extensions = await modifyExtensions(extensions)
  // use extensions
}
```

so you can append on to it cheaply:

```js
// user-land
// NO NEED for imports and code for getExt1/2/3()
// unavoidable imports and code for thingIWantedToAdd()
const myConfig = [
  myPlugin({
    async modifyExtensions(defaultExtensions) {
      return [...defaultExtensions, await thingIWantedToAdd()]
    }
  })
]
```

However inserting in-place can be hard (made easier with `immer`), and you're not really saving the user from having to think about what's included in the defaultExtensions.

The word "modify" also requires more documentation and is a place for users to shoot themselves in the foot with expensive operations that may be called multiple times

## Better Solution

Export BOTH the function and its defaults and defer execution of async effects:

```js
// library-land
export const defaultExtensions = [getExt1(), getExt2(), getExt3()]
export function myPlugin({ extensions = defaultExtensions }) {
  let usedExtensions = await Promise.all(extensions)
  // use extensions
}
```

so they can be freely and cheaply combined:

```js
// user-land
// NO NEED for imports and code for getExt1/2/3()
// unavoidable imports and code for thingIWantedToAdd()
import { defaultExtensions, myPlugin } from 'my-library'
const myConfig = [
  myPlugin({
    extensions: [...defaultExtensions, thingIWantedToAdd()]
  })
]
```

This way, it is pretty intuitive how to supply the array instead of modify the array, and the surface area of execution is smaller.

That's where I am at right now in terms of plugin design.
