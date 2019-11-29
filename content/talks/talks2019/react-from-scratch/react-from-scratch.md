---
title: Concurrent React From Scratch
slug: react-from-scratch
topic: React
venues: ReactAdvanced London
url: https://reactadvanced.com/
video: https://www.youtube.com/watch?v=dFO4m7Y-yhs
video2: https://www.youtube.com/watch?v=8opFTK2shAc
date: 2019-10-25
desc: Cloning Concurrent React with React Fiber and discussing Time Slicing and Suspense
description: In this talk, we’ll create an effective mental model of React Hooks by building a tiny clone of React! This will serve two purposes – to demonstrate the effective use of closures, and to show how you can build a Hooks clone in just 29 lines of readable JS. Finally, we arrive at how you get Custom Hooks and the Rules of Hooks out of this incredible mental model!
---

## React Knowledgeable version

I gave a [1hr Singlished version of this talk](https://www.youtube.com/watch?v=8opFTK2shAc), with a lot more mistakes but hopefully better explanations, and Q&A, at Shoppee on Nov 29.

## Final Codesandbox

Click here: https://codesandbox.io/s/reactadvanced-final-uwrx0

## the crazy plan

- start state

```js
import './styles.css'
import {
  reconcileChildren,
  createElement,
  commitDeletion,
  createDom,
  updateDom
} from './utils'
let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = []
let wipFiber = null
let hookIndex = null
const React = { createElement }
```

- declare with an element and a wipRoot

```js
const container = document.getElementById('root')
const element = <h1>Hello world</h1>
wipRoot = {
  // type: 'n/a', // a string or function
  dom: container,
  props: {
    children: [element]
  }
  // // links
  // alternate - pending fiber
  // child - link to first child
  // parent - link to parent
  // sibling - link to next sibling
}
// traversal: https://github.com/facebook/react/issues/7942
```

- simple render

```js
render(element, container)
// render(wipRoot.props.children[0], wipRoot.dom);

function render(element, container) {
  const dom =
    element.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type)
  const isProperty = key => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })
  element.props.children.forEach(
    child => render(child, dom) // recursive call
  )
  container.appendChild(dom)
}
```

- talk about fiber traversal

https://github.com/facebook/react/issues/7942

- reconciling fibers

```js
nextUnitOfWork = wipRoot
while (nextUnitOfWork) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
}
commitWork(wipRoot.child)

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    // it is either a function component... (so call it)
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children.flat())
  } else {
    // or a host component... (so createDom)
    if (!fiber.dom) fiber.dom = createDom(fiber)
    reconcileChildren(fiber, fiber.props.children.flat())
  }
  if (fiber.child) return fiber.child
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}
function commitWork(fiber) {
  if (!fiber) return
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
```

- add simple work loop

```js
// https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
function workLoop(deadline) {
  // reconcile phase
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)
```

- add time sliced work loop

```js
function workLoop(deadline) {
  let shouldYield = false
  // reconcile phase
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)
```

- add useState hook

```js
function useState(initial) {
  const oldHook = wipFiber?.alternate?.hooks[hookIndex]
  const nothing = Symbol('__NONE__')
  const hook = {
    state: oldHook ? oldHook.state : initial,
    pendingState: nothing
  }
  if (oldHook && oldHook.pendingState !== nothing) {
    hook.state = oldHook.pendingState
  }
  const setState = newState => {
    hook.pendingState = newState
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}
```

w basic demo:

```js
// remember to expose useState!
function App() {
  const [state, setState] = React.useState(1)
  const handler = () => setState(state + 1)
  return (
    <main>
      <button onClick={handler}>Click me: {state}</button>
    </main>
  )
}
const element = <App />
```

- add final render method

```js
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
render(element, container)
```

with createRoot

```js
function createRoot(container) {
  return {
    render(element) {
      wipRoot = {
        dom: container,
        props: {
          children: [element]
        },
        alternate: currentRoot
      }
      deletions = []
      nextUnitOfWork = wipRoot
    }
  }
}
createRoot(container).render(element)
```

- add suspense

```js
// fakeapi from https://codesandbox.io/s/vigorous-keller-3ed2b
import { fetchProfileData } from './fakeApi'
const initialResource = fetchProfileData(0)
function App() {
  const [resource, setResource] = React.useState(initialResource)
  const [state, setState] = React.useState(0)
  const handler = () => {
    let newState = state + 1
    if (newState > 3) newState = 0
    setState(newState)
    setResource(fetchProfileData(newState))
  }
  const user = resource.user.read()
  const posts = resource.posts.read()
  return (
    <main>
      <button onClick={handler}>Beatle {state + 1}</button>
      <h1>{user.name}</h1>
      <div>
        {posts.map(post => (
          <p>{post.text}</p>
        ))}
      </div>
    </main>
  )
}
```

catch suspender

```js
function workLoop(deadline) {
  // console.log("workloop start");
  let shouldYield = false
  let suspendedWork = null
  // reconcile phase
  while (nextUnitOfWork && !shouldYield) {
    try {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    } catch (err) {
      console.error('caught', err)
      if (err instanceof Promise) {
        suspendedWork = nextUnitOfWork
        nextUnitOfWork = null
        err.then(() => {
          wipRoot = currentRoot
          nextUnitOfWork = suspendedWork
        })
      } else {
        throw err
      }
    }
    shouldYield = deadline.timeRemaining() < 1
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)
```

## References

- Fiber resources
  - https://github.com/acdlite/react-fiber-architecture
  - Andrew Clark: What's Next for React https://www.youtube.com/watch?v=aV1271hd9ew&feature=youtu.be
- My previous talk
  - Getting Closure on Hooks (JSConf) https://www.youtube.com/watch?v=KJP1E-Y-xyo
  - Final Sandbox https://codesandbox.io/s/izqhl
- Pomber/Didact talks
  - https://deploy-preview-3--pomber.netlify.com/build-your-own-react/
  - https://buildyourownreact.now.sh
  - https://github.com/pomber/didact
- From source
  - Full list of Effect Tags https://github.com/facebook/react/blob/05f5192e8106d006cc3189ae68c523ca123ae297/packages/shared/ReactSideEffectTags.js
  - Scheduler + Priorities https://github.com/facebook/react/blob/901139c2910d0dc33f07f85c748c64371f8664f4/packages/scheduler/src/SchedulerPriorities.js
  - Suspense Component https://github.com/facebook/react/blob/6ff23f2a5da0e60fa008cef97529469945618d06/packages/react-reconciler/src/ReactFiberSuspenseComponent.js

## first version of plan

the fiber path

- 15 min react + hooks clone
- 10 min fiber talk???

the svelte path

- 15 min react + hooks clone
- 10 min svelte clone??

## other references

- (Nov 2019 edit) This uses snabdom https://dev.to/ameerthehacker/build-your-own-react-in-90-lines-of-javascript-1je2
