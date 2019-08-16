---
title: Getting Closure on Hooks (JSConf Edition)
slug: react-hooks
topic: React
venues: JSConf Asia
date: 2019-06-18
video: https://youtu.be/9jWwO7McMbU?t=9451
rehearsal: https://youtu.be/6zDQBnbGQx8
meetup: https://www.youtube.com/watch?v=il43iId9JQA
url: https://2019.jsconf.asia/#program
codesandbox: https://codesandbox.io/s/izqhl
desc: Cloning the React Hooks API in raw JS
description: The design of React Hooks requires a good understanding of closures in JavaScript. In this talk, we’ll reintroduce closures by building a tiny clone of React! This will serve two purposes – to demonstrate the effective use of closures, and to show how you can build a Hooks clone in just 29 lines of readable JS. Finally, we arrive at how you get Custom Hooks and the Rules of Hooks out of this incredible mental model!
---

👉🏼You can see the final livecodesandbox [here](https://codesandbox.io/s/izqhl)! 👈🏼

## Twitter feedback

- @dalanmiller: [@swyx
  giving one of the most confident and well executed live coding presentations I've ever seen](https://mobile.twitter.com/dalanmiller/status/1139741383248375810)

## further references

- https://dev.to/kayis/react-hooks-demystified-2af6

## Livecoding plan

1. stateful functions
2. move var inside function
3. function inside funciton
4. module pattern
5. simple useState (nonworking)
6. useState with getter (working)
7. React module with getter (working)
8. Component
9. React module with render (working)
10. Hooks array refactor
11. useEffect always running
12. useEffect dep comparison
13. useEffect dep hack
14. `import { createElement, render } from "./utils";`
15. render: render(hooks)
16. workloop
17. fetch
18. this is not react

## rehearsal notes to self

- cut useState example first and then paste in React module
- refer WAY MORE OFTEN to the official docs
- increment index in useeffect
- get css to show on screen first
  - then jsx/createElement
  - then workloop

## style points:

- https://en.wikipedia.org/wiki/The_Treachery_of_Images
- http://www.bbc.com/culture/story/20171205-magritte-and-the-subversive-power-of-his-pipe
- http://enculturation.net/3_2/introduction3.html
- https://www.theguardian.com/artanddesign/jonathanjonesblog/2016/sep/22/rene-magritte-pompidou-centre-surrealism
- https://aeon.co/videos/how-rene-magritte-turned-philosophy-into-painting

# Everything Below Is Discarded Ideas and Code

## useEffect hack (eventually unused)

```js
function useEffect(cb, _depArray = [Math.random()]) {
  const depArray = [true, ..._depArray]
  const oldDeps = hooks[idx]
  let hasChangedDeps = oldDeps ? depArray.some((dep, i) => !Object.is(dep, oldDeps[i])) : true
  if (hasChangedDeps) cb()
  hooks[idx] = depArray
  idx++
}
```

## Final prep

```js
import './styles.css'
import { createElement, render } from './utils'

const React = (function() {
  let hooks = []
  let idx = 0
  function useState(initVal) {
    const state = hooks[idx] || initVal
    const _idx = idx
    const setState = (newVal) => {
      hooks[_idx] = newVal
    }
    idx++
    return [state, setState]
  }

  function workLoop() {
    idx = 0
    render(hooks)()
    setTimeout(workLoop, 300)
  }
  setTimeout(workLoop, 300)
  function useEffect(cb, _depArray = [Math.random()]) {
    const depArray = [true, ..._depArray]
    const oldDeps = hooks[idx]
    let hasChangedDeps = oldDeps ? depArray.some((dep, i) => !Object.is(dep, oldDeps[i])) : true
    if (hasChangedDeps) cb()
    hooks[idx] = depArray
    idx++
  }
  return {
    createElement,
    useState,
    render: render(hooks),
    useEffect,
  }
})()

/** @jsx React.createElement */
function Component() {
  const [count, setCount] = React.useState(1)
  const [list, setList] = React.useState([])
  React.useEffect(() => {
    fetch('https://dogceo.netlify.com/.netlify/functions/pics?count=' + count)
      .then((x) => x.json())
      .then((x) => setList(x))
  }, [count])
  return (
    <main>
      <h1>
        {' '}
        This is <i>NOT</i> React{' '}
      </h1>
      <button onClick={() => setCount(count + 1)}>Click me: {count}</button>
      {list.map((url) => (
        <img src={url} />
      ))}
    </main>
  )
}

const rootElement = document.getElementById('root')
React.render(<Component />, rootElement)
```

## Early Prep

more info from pomber: https://codesandbox.io/s/crazy-mcnulty-7gxrd
sunil's reorg: https://mobile.twitter.com/threepointone/status/1056594421079261185

- https://codesandbox.io/s/8u5qj

```js
import { createElement, render } from './utils'

const React = (function() {
  let hooks = []
  let currentHook = 0

  function workLoop() {
    currentHook = 0
    render()
    setTimeout(workLoop, 300)
  }
  requestIdleCallback(workLoop)

  return {
    createElement,
    render: render,
    useState(initialValue) {
      hooks[currentHook] = hooks[currentHook] || initialValue
      const setStateHookIndex = currentHook
      const setState = (newState) => (hooks[setStateHookIndex] = newState)
      return [hooks[currentHook++], setState]
    },
    useEffect(callback, depArray) {
      const hasNoDeps = !depArray
      const deps = hooks[currentHook]
      const hasChangedDeps = !deps || !depArray.every((el, i) => el === deps[i])
      if (hasNoDeps || hasChangedDeps) {
        callback()
        hooks[currentHook] = depArray
      }
      currentHook++
    },
  }
})()

/** @jsx React.createElement */
function Counter() {
  const [state, setState] = React.useState(3)
  const [state2, setState2] = React.useState([])
  const list = ['hi', 'hi2']
  React.useEffect(() => {
    fetch('https://dog.ceo/api/breeds/list/all')
      .then((x) => x.json())
      .then((x) => setState2(Object.keys(x.message)))
  }, [])
  return (
    <div>
      <button onClick={() => setState(state + 1)}>Click me {state}</button>
      <ul>
        {state2.map((foo) => (
          <li>{foo}</li>
        ))}
      </ul>
    </div>
  )
}

const element = <Counter />
const container = document.getElementById('root')
React.render(element, container)

// utils.js
let _Component = null
let _root = null
export let render = (Component = _Component, root = _root) => {
  while (root.firstChild) {
    root.removeChild(root.firstChild)
  }
  const Comp = reconcile(Component, root)
  _Component = Component
  _root = root
  const dom = createDom(Comp)
  root.appendChild(dom)
}

// recursive funciton
export function reconcile(Component, root) {
  const type = Component.type
  if (Array.isArray(Component)) {
    return Component.map((child) => reconcile(child, root))
  }
  const Comp = typeof type === 'string' ? Component : type()
  if (Comp.props && Comp.props.children) {
    Comp.props.children.forEach((child, idx) => {
      if (child.type !== 'string') {
        // recursive call for children
        Comp.props.children[idx] = reconcile(Comp.props.children[idx], root)
      }
    })
  }
  return Comp
}

export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => (typeof child === 'object' ? child : createTextElement(child))),
    },
  }
}
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

// recursive
export function createDom(fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)
  const props = fiber.props || {}
  updateDom(dom, {}, props)
  if (props.children) {
    props.children.forEach((child) => {
      // recursion
      if (Array.isArray(child)) {
        child.forEach((x) => {
          dom.appendChild(createDom(x))
        })
      } else {
        dom.appendChild(createDom(child))
      }
    })
  }
  return dom
}
const isEvent = (key) => key.startsWith('on')
const isProperty = (key) => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => (key) => prev[key] !== next[key]
const isGone = (prev, next) => (key) => !(key in next)
function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = ''
    })
  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name]
    })
  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}
```
