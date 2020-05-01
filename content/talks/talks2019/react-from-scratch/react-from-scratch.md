---
title: Concurrent React From Scratch v2
slug: react-from-scratch
topic: React
venues: ByteConfReact
url: https://www.bytesized.xyz/react-2020
date: 2020-05-02
desc: Cloning Concurrent React with React Fiber and discussing Time Slicing and Suspense
description: In this talk, we’ll create an effective mental model of Concurrent React by building a tiny clone of React! We will start with a blank js file and learn about how React renders components, schedules Time-Slicing updates with a Work Loop, add Hooks, and end off with a mini-clone of Suspense!
---

This is version 2 of my Concurrent React From Scratch talk - I gave [version 1](https://swyx.io/speaking/react-from-scratch-v1) in ReactAdvanced London previously.

## Step 1 - simple rendering a text element

```js
import { render } from './utils'
const textEl = {
  type: 'TEXT_ELEMENT',
  props: { nodeValue: 'Hello world' }
}
const container = document.getElementById('root')
render(textEl, container)
```

## Step 2 - simple rendering a text element

```js
import { render, createTextElement } from './utils'
const textEl = createTextElement('hello world')
const container = document.getElementById('root')
render(textEl, container)
```

## Step 3 - simple rendering a h1

```js
import { render, createTextElement } from './utils'
const textEl = createTextElement('hello world')
const element = {
  type: 'h1',
  props: {
    children: [textEl]
  }
}
const container = document.getElementById('root')
render(element, container)
```

## Step 4 - simple rendering createElement

```js
import { render, createElement, createTextElement } from './utils'
const textEl = createTextElement('hello world')
const element = createElement('h1', undefined, textEl)
const container = document.getElementById('root')
render(element, container)
```

## Step 5 - simple rendering JSX

```js
import { render, createElement } from './utils'
const React = { createElement }
const element = <h1>hello world</h1>
const container = document.getElementById('root')
render(element, container)
```

## Step 6 - simple rendering an app

```js
import { render, createElement } from './utils'
const React = { createElement }
function App() {
  return (
    <div>
      <h1>hello</h1>
      <ul>
        <li>foo</li>
        <li>bar</li>
      </ul>
    </div>
  )
}
const container = document.getElementById('root')
render(<App />, container)
```

## Step 6 - introducing a root fiber

```js
import { render, createElement } from './utils'
const React = { createElement }
let wipRoot = null
function App() {
  return (
    <div>
      <h1>hello</h1>
      <ul>
        <li>foo</li>
        <li>bar</li>
      </ul>
    </div>
  )
}
const container = document.getElementById('root')
wipRoot = {
  // type: 'n/a', // a string or function
  dom: container,
  props: {
    children: [<App />]
  }
  // // links
  // alternate - pending fiber
  // child - link to first child
  // parent - link to parent
  // sibling - link to next sibling
}
render(wipRoot, container)
```

## Step 7 - recursive fiber creation and committing

```js
import { createElement, performUnitOfWork, commitWork } from './utils'
const React = { createElement }
let wipRoot,
  nextUnitOfWork = null
function App() {
  return (
    <div>
      <h1>hello</h1>
      <ul>
        <li>foo</li>
        <li>bar</li>
      </ul>
    </div>
  )
}
const container = document.getElementById('root')
wipRoot = {
  dom: container,
  props: {
    children: [<App />]
  }
}
nextUnitOfWork = wipRoot
while (nextUnitOfWork) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
}
commitWork(wipRoot.child)
```

## Step 8 - new render

```js
render(<App />, container)
function render(el, _container) {
  wipRoot = {
    // type: 'n/a', // a string or function
    dom: _container,
    props: {
      children: [el]
    },
    hooks: [],
    alternate: {
      hooks: []
    }
  }
  nextUnitOfWork = wipRoot
}
```

## Step 9 - createRoot

```js
createRoot(container).render(<App />)
function createRoot(_container) {
  return {
    render(el) {
      wipRoot = {
        // type: 'n/a', // a string or function
        dom: _container,
        props: {
          children: [el]
        },
        hooks: [],
        alternate: {
          hooks: []
        }
      }
      nextUnitOfWork = wipRoot
    }
  }
}
```

## Step 10 - Work Loop

```js
import { createElement, performUnitOfWork, commitWork } from './utils'
const React = { createElement }
let wipRoot,
  nextUnitOfWork = null

// ...

while (nextUnitOfWork) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
}
commitWork(wipRoot.child)

// https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline#methods
function workLoop(deadline) {
  // render phase
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    commitWork(wipRoot.child)
    // currentRoot = wipRoot;
    wipRoot = null
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)
```

## Step 11 - time slicing

```js
// https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline#methods
function workLoop(deadline) {
  // render phase
  let shouldYield = false
  while (!shouldYield && nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot;
    commitWork(wipRoot.child)
    // currentRoot = wipRoot;
    wipRoot = null
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)
```

## Step 12 - hook and currentRoot/wipRoot

```js
let hookIndex = 0
function scheduleRerender() {
  nextUnitOfWork = wipRoot = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot,
    hooks: []
  }
}

// ...
wipRoot = {
  // type: 'n/a', // a string or function
  dom: container,
  props: {
    children: [<App />]
  },
  hooks: [],
  alternate: {
    hooks: []
  }
}

// workloop
hookIndex = 0

const NONE = Symbol('__NONE__')
function useState(initial) {
  const oldHook = wipRoot?.alternate?.hooks[hookIndex++]
  const hasPendingState = oldHook && oldHook.pendingState !== NONE
  const oldState = oldHook ? oldHook.state : initial
  const hook = {
    state: hasPendingState ? oldHook?.pendingState : oldState,
    pendingState: NONE
  }
  const setState = newState => {
    hook.pendingState = newState
    scheduleRerender()
  }
  wipRoot.hooks.push(hook)
  return [hook.state, setState]
}
```

## Step 13 - react.js

```js
import { createElement, performUnitOfWork, commitWork } from './utils'
export const React = { createElement, createRoot, useState }
let wipRoot,
  currentRoot,
  nextUnitOfWork = null
let hookIndex = 0

function scheduleRerender() {
  nextUnitOfWork = wipRoot = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot,
    hooks: []
  }
}

function createRoot(_container) {
  return {
    render(el) {
      wipRoot = {
        // type: 'n/a', // a string or function
        dom: _container,
        props: {
          children: [el]
        },
        hooks: [],
        alternate: {
          hooks: []
        }
      }
      nextUnitOfWork = wipRoot
    }
  }
}

// https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline#methods
function workLoop(deadline) {
  // render phase
  let shouldYield = false
  while (!shouldYield && nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot;
    commitWork(wipRoot.child)
    currentRoot = wipRoot // <- new
    wipRoot = null
    hookIndex = 0
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

const NONE = Symbol('__NONE__')
function useState(initial) {
  const oldHook = wipRoot?.alternate?.hooks[hookIndex++]
  const hasPendingState = oldHook && oldHook.pendingState !== NONE
  const oldState = oldHook ? oldHook.state : initial
  const hook = {
    state: hasPendingState ? oldHook?.pendingState : oldState,
    pendingState: NONE
  }
  const setState = newState => {
    hook.pendingState = newState
    scheduleRerender()
  }
  wipRoot.hooks.push(hook)
  return [hook.state, setState]
```

## Step 14 - suspense

js

```js
try {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
} catch (err) {
  if (err instanceof Promise) {
    nextUnitOfWork = null
    // eslint-disable-next-line
    err.then(() => {
      wipRoot = currentRoot
      wipRoot.hooks = []
      nextUnitOfWork = wipRoot
    })
  } else {
    throw err
  }
}
```

app

```js
import './styles.css'
import { React } from './react'
import { createResource } from './dogApi'
const resource = createResource()
function App() {
  const [state, setState] = React.useState(1)
  const dogs = resource.read(state)
  return (
    <main>
      <h1>Fetching Dogs</h1>
      <button onClick={() => setState(state + 1)}>{state}</button>
      {dogs.map(dog => (
        <img src={dog} alt="dog" />
      ))}
    </main>
  )
}
const container = document.getElementById('root')
React.createRoot(container).render(<App />)
```
