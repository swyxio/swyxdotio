---
title: Immutability is Changing
subtitle: From Immutable.js to Immer
slug: immutability-is-changing
topic: Immutability
venues: ForwardJS
date: 2019-01-24
url: https://forwardjs.com/schedule
blog: https://www.netlify.com/blog/2018/09/12/the-rise-of-immer-in-react/
video: https://www.youtube.com/watch?v=bFuRvcAEiHg
rehearsal: https://www.youtube.com/watch?v=CbDD3c1KbKI
desc: Why Immutability in JS and why not Immutable.js
description: The need for immutability in JavaScript isn’t obvious, but Immutable.js swept the Javascript world in 2015 when it enforced a stricter, more functional approach to code without any need for deep comparisons. Then Immer was introduced in 2018, and took the Javascript world by storm. What's different? What's better? And what do ES6 Proxies have to do with it?
---

## Talk Structure

- Why Immutability in JS (2 min)
- The Immutable.js API (2 min)
- Problems with the API (1 min)
- Introducing ES6 Proxies (1 min)
- Live coding local mutability (2 min)
- Inserting immer (1 min)
- Demoing more immer functionality (1 min)
- Immutability !== PIDS (2 min)
- General lessons we can draw (3 min)
  - Take something that works well, make it less annoying
  - Small APIs > your own DSL
  - Scope is incredibly powerful
  - DX Mullet

## Details

- Why Immutability in JS (2 min)
  - Traditionally: fearless concurrency
  - No moving parts
    - HDD have MBTF of 500k, SSDs have MBTF of 2.5m
    - More debuggable, less breakable
  - Answering "what changed"

```js
export function foo() {
  var data = { key: 'value' }
  touchFn(data)
  console.log(data.key) // ???
}
```

    - you can either:
      - use Object.observe, dirty bits, "change detection"
      - or you can make it immutable and use reference equality
    - reconciliation goes from O(N^3) to O(N) to O(log N)

- The Immutable.js API (2 min)

```js
export function foo() {
  var data = Immutable.Map({ key: 'value' })
  touchFn(data)
  console.log(data.get('key')) // value
}
```

- Problems with the API (1 min)
  - Learning curve
  - Spreading/Interop
    - no destructuring
    - but doesnt work with anything else so you `.toJS()`
  - Difficult to Debug
    - browser formatter
  - In summary: PIDS
  - DX Mullet
- Introducing ES6 Proxies (1 min)

```js
var target = { foo: 'bar' }
var handler = {
  get(obj, prop) {
    return 42
  },
}
var wrappedTarget = new Proxy(target, handler)
console.log(target.foo) // 'bar'
console.log(wrappedTarget.foo) // 42
```

```js
var target = { foo: 'bar' }
var handler = {
  get(obj, prop) {
    console.log(`accessing ${prop}!`)
    return obj[prop]
  },
}
var wrappedTarget = new Proxy(target, handler)

console.log(target.foo) // 'bar'
// accessing bar!
console.log(wrappedTarget.foo) // 'bar'
```

```js
var target = { foo: 'bar' }
var handler = {
  get(obj, prop) {
    console.log(`accessing ${prop}!`)
    return Reflect.get(obj, prop) // do what you're supposed to do
  },
}
var wrappedTarget = new Proxy(target, handler)

console.log(target.foo) // 'bar'
// accessing bar!
console.log(wrappedTarget.foo) // 'bar'
```

```js
var target = { foo: 'bar' }
var handler = {
  get(obj, prop) {
    return Reflect.get(obj, prop)
  },
  set(obj, prop, value) {
    console.log(`setting ${prop}!`)
    return Reflect.set(obj, prop, value)
  },
}
var wrappedTarget = new Proxy(target, handler)

wrappedTarget.foo = 'baz'
// setting foo!
```

```js
function produce(base, recipe) {
  let newcopy = { ...base }
  const handler = {
    get(target, name) {
      return Reflect.get(target, name)
    },
    set(target, name, value) {
      newcopy[name] = value
      return true // setting was "successful"
    },
  }
  const draft = new Proxy(base, handler)
  recipe(draft)
  return Object.freeze(newcopy)
}
```

```js
const obj1 = { foo: 'bar' }
const obj2 = produce(obj1, (draft) => {
  // local mutability!
  draft.foo = 'forwardJS'
})

console.log('obj1', obj1.foo) // 'bar'
console.log('obj2', obj2.foo) // 'forwardJS'
```

- Live coding local mutability (2 min)
- Inserting immer (1 min)

```js
import produce from 'immer'

const obj1 = [{ foo: 'bar', qux: 4 }]
const obj2 = produce(obj1, (draft) => {
  draft[0].foo = 'forwardJS'
  draft.push({ foo: 'baz' }) // API = JS
  const { foo, qux } = draft[0] // destructuring
})
```

- Demoing more immer functionality (1 min)
- Immutability !== PIDS (2 min)
  - we wanted Immutability but got Immutable.js
  - Immutable.js combines PIDS with Immutability with utility functions
  - Immer achieves Immutability with plain JS
- General lessons we can draw (3 min)
  - Take something that works well, make it less annoying
  - Small APIs > your own DSL
  - Scope is incredibly powerful
  - always bet on JS

## memes

- recursion https://i.redd.it/0wap3cp4khm01.jpg
- unexplained phenomena https://i.redd.it/kjyjtg0o3ij11.jpg
- deleting code https://www.reddit.com/r/ProgrammerHumor/comments/8v024m/kill_me_now/
- programs working https://www.reddit.com/r/ProgrammerHumor/comments/a818p9/why_must_you_torture_me_this_much/
- flat screen TV https://i.redd.it/2ff9scose3521.jpg

## misc

- Dec 2013 - David Nolen Om - wrapper around React that was faster than React
