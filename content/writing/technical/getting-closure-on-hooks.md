---
title: Getting Closure on Hooks
slug: getting-closure-on-hooks
categories: ['Tech', 'React']
date: 2019-03-11
canonical: https://www.netlify.com/blog/2019/03/11/deep-dive-how-do-react-hooks-really-work/
---

_Published on the Netlify Blog as [Deep dive: How do React hooks really work?](https://www.netlify.com/blog/2019/03/11/deep-dive-how-do-react-hooks-really-work/)_

_Given as a talk at JSConf Asia 2019_

{% youtube KJP1E-Y-xyo %}

[Hooks](https://reactjs.org/hooks) are a fundamentally simpler way to encapsulate stateful behavior and side effects in user interfaces. They were [first introduced in React](https://www.youtube.com/watch?v=dpw9EHDh2bM) and have been broadly embraced by other frameworks like [Vue](https://css-tricks.com/what-hooks-mean-for-vue/), [Svelte](https://twitter.com/Rich_Harris/status/1093260097558581250), and even adapted for [general functional JS](https://github.com/getify/TNG-Hooks). However, their functional design requires a good understanding of closures in JavaScript.

In this article, we reintroduce closures by building a tiny clone of React Hooks. This will serve two purposes – to demonstrate the effective use of closures, and to show how you can build a Hooks clone in just 29 lines of readable JS. Finally, we arrive at how Custom Hooks naturally arise.

> ⚠️ Note: You don't need to do any of this in order to understand Hooks. It might just help your JS fundamentals if you go through this exercise. Don’t worry, it’s not that hard!

## What are Closures?

One of the [many selling points](https://reactjs.org/docs/hooks-intro.html#classes-confuse-both-people-and-machines) of using hooks is to avoid the complexity of classes and higher order components altogether. However, with hooks, some feel we may have swapped one problem for another. Instead of [worrying about bound context](https://overreacted.io/how-are-function-components-different-from-classes/), we now have to [worry about closures](https://overreacted.io/making-setinterval-declarative-with-react-hooks/). As [Mark Dalgleish memorably summarized](https://twitter.com/markdalgleish/status/1095025468367990784):

![A Star Wars meme about React Hooks and closures](/img/blog/tweet-markdalgleish-hooks.jpg 'A Star Wars meme about React Hooks and closures')

Closures are a fundamental concept in JS. In spite of this, they are notorious for being confusing to many especially newer developers. Kyle Simpson of [You Don’t Know JS](https://github.com/getify/You-Dont-Know-JS/blob/master/scope%20%26%20closures/ch5.md) fame defines closures as such:

_Closure is when a function is able to remember and access its lexical scope even when that function is executing outside its lexical scope._

They’re obviously closely tied to the concept of lexical scoping, which [MDN defines](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) as "how a parser resolves variable names when functions are nested”. Let’s look at a practical example to better illustrate this:

```js
// Example 0
function useState(initialValue) {
  var _val = initialValue // _val is a local variable created by useState
  function state() {
    // state is an inner function, a closure
    return _val // state() uses _val, declared by parent funciton
  }
  function setState(newVal) {
    // same
    _val = newVal // setting _val without exposing _val
  }
  return [state, setState] // exposing functions for external use
}
var [foo, setFoo] = useState(0) // using array destructuring
console.log(foo()) // logs 0 - the initialValue we gave
setFoo(1) // sets _val inside useState's scope
console.log(foo()) // logs 1 - new initialValue, despite exact same call
```

Here, we’re creating a primitive clone of React’s `useState` hook. In our function, there are 2 inner functions, `state` and `setState`. `state` returns a local variable `_val` defined above and `setState` sets the local variable to the parameter passed into it (i.e. `newVal`).

Our implementation of `state` here is a getter function, [which isn’t ideal](https://twitter.com/sebmarkbage/status/1098809296396009472), but we’ll fix that in a bit. What’s important is that with `foo` and `setFoo`, we are able to access and manipulate (a.k.a. “close over”) the internal variable `_val`. They retain access to `useState` ‘s scope, and that reference is called closure. In the context of React and other frameworks, this looks like state, and that’s exactly what it is.

If you’d like deeper dives on closure, I recommend reading [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures), [YDKJS](https://github.com/getify/You-Dont-Know-JS/blob/master/scope%20%26%20closures/ch5.md), and [DailyJS](https://medium.com/dailyjs/i-never-understood-javascript-closures-9663703368e8) on the topic, but if you understood the code sample above, you have everything you need.

## Usage in Function Components

Let’s apply our newly minted `useState` clone in a familiar looking setting. We’ll make a `Counter` component!

```js
// Example 1
function Counter() {
  const [count, setCount] = useState(0) // same useState as above
  return {
    click: () => setCount(count() + 1),
    render: () => console.log('render:', { count: count() }),
  }
}
const C = Counter()
C.render() // render: { count: 0 }
C.click()
C.render() // render: { count: 1 }
```

Here, instead of rendering to the DOM, we’ve opted to just `console.log` out our state. We’re also exposing a programmatic API for our Counter so we can run it in a script instead of attaching an event handler. With this design we are able to simulate our component rendering and reacting to user actions.

While this works, calling a getter to access state isn’t quite the API for the real `React.useState` hook. Let’s fix that.

## Stale Closure

If we want to match the real React API, our state has to be a variable instead of a function. If we were to simply expose `_val` instead of wrapping it in a function, we’d encounter a bug:

```js
// Example 0, revisited - this is BUGGY!
function useState(initialValue) {
  var _val = initialValue
  // no state() function
  function setState(newVal) {
    _val = newVal
  }
  return [_val, setState] // directly exposing _val
}
var [foo, setFoo] = useState(0)
console.log(foo) // logs 0 without needing function call
setFoo(1) // sets _val inside useState's scope
console.log(foo) // logs 0 - oops!!
```

This is one form of the Stale Closure problem. When we destructured `foo` from the output of `useState`, it refers to the `_val` as of the initial `useState` call… and never changes again! This is not what we want; we generally need our component state to reflect the _current_ state, while being just a variable instead of a function call! The two goals seem diametrically opposed.

## Closure in Modules

We can solve our `useState` conundrum by… moving our closure inside another closure! (_Yo dawg I heard you like closures…_)

```js
// Example 2
const MyReact = (function() {
  let _val // hold our state in module scope
  return {
    render(Component) {
      const Comp = Component()
      Comp.render()
      return Comp
    },
    useState(initialValue) {
      _val = _val || initialValue // assign anew every run
      function setState(newVal) {
        _val = newVal
      }
      return [_val, setState]
    },
  }
})()
```

Here we have opted to use [the Module pattern](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#modulepatternjavascript) to make our tiny React clone. Like React, it keeps track of component state (in our example, it only tracks one component, with a state in `_val`). This design allows `MyReact` to “render” your function component, which allows it to assign the internal `_val` value every time with the correct closure:

```js
// Example 2 continued
function Counter() {
  const [count, setCount] = MyReact.useState(0)
  return {
    click: () => setCount(count + 1),
    render: () => console.log('render:', { count }),
  }
}
let App
App = MyReact.render(Counter) // render: { count: 0 }
App.click()
App = MyReact.render(Counter) // render: { count: 1 }
```

Now this looks a lot more like React with Hooks!

You can [read more about the Module pattern and closures in YDKJS](https://github.com/getify/You-Dont-Know-JS/blob/master/scope%20%26%20closures/ch5.md#modules).

## Replicating `useEffect`

So far, we’ve covered `useState`, which is the first basic React Hook. The next most important hook is [`useEffect`](https://reactjs.org/docs/hooks-effect.html). Unlike `setState` , `useEffect` executes asynchronously, which means more opportunity for running into closure problems.

We can extend the tiny model of React we have built up so far to include this:

```js
// Example 3
const MyReact = (function() {
  let _val, _deps // hold our state and dependencies in scope
  return {
    render(Component) {
      const Comp = Component()
      Comp.render()
      return Comp
    },
    useEffect(callback, depArray) {
      const hasNoDeps = !depArray
      const hasChangedDeps = _deps ? !depArray.every((el, i) => el === _deps[i]) : true
      if (hasNoDeps || hasChangedDeps) {
        callback()
        _deps = depArray
      }
    },
    useState(initialValue) {
      _val = _val || initialValue
      function setState(newVal) {
        _val = newVal
      }
      return [_val, setState]
    },
  }
})()

// usage
function Counter() {
  const [count, setCount] = MyReact.useState(0)
  MyReact.useEffect(() => {
    console.log('effect', count)
  }, [count])
  return {
    click: () => setCount(count + 1),
    noop: () => setCount(count),
    render: () => console.log('render', { count }),
  }
}
let App
App = MyReact.render(Counter)
// effect 0
// render {count: 0}
App.click()
App = MyReact.render(Counter)
// effect 1
// render {count: 1}
App.noop()
App = MyReact.render(Counter)
// // no effect run
// render {count: 1}
App.click()
App = MyReact.render(Counter)
// effect 2
// render {count: 2}
```

To track dependencies (since `useEffect` reruns when dependencies change), we introduce another variable to track `_deps`.

## Not Magic, just Arrays

We have a pretty good clone of the `useState` and `useEffect` functionality, but both are badly implemented [singletons](https://en.wikipedia.org/wiki/Singleton_pattern) (only one of each can exist or bugs happen). To do anything interesting (and to make the final stale closure example possible), we need to generalize them to take arbitrary numbers of state and effects. Fortunately, as [Rudi Yardley has written](https://medium.com/@ryardley/react-hooks-not-magic-just-arrays-cd4f1857236e), React Hooks are not magic, just arrays. So we’ll have a `hooks` array. We’ll also take the opportunity to collapse both `_val` and `_deps` into our `hooks` array since they never overlap:

```js
// Example 4
const MyReact = (function() {
  let hooks = [],
    currentHook = 0 // array of hooks, and an iterator!
  return {
    render(Component) {
      const Comp = Component() // run effects
      Comp.render()
      currentHook = 0 // reset for next render
      return Comp
    },
    useEffect(callback, depArray) {
      const hasNoDeps = !depArray
      const deps = hooks[currentHook] // type: array | undefined
      const hasChangedDeps = deps ? !depArray.every((el, i) => el === deps[i]) : true
      if (hasNoDeps || hasChangedDeps) {
        callback()
        hooks[currentHook] = depArray
      }
      currentHook++ // done with this hook
    },
    useState(initialValue) {
      hooks[currentHook] = hooks[currentHook] || initialValue // type: any
      const setStateHookIndex = currentHook // for setState's closure!
      const setState = (newState) => (hooks[setStateHookIndex] = newState)
      return [hooks[currentHook++], setState]
    },
  }
})()
```

Note our usage of `setStateHookIndex` here, which doesn’t seem to do anything, but is used to prevent `setState` from closing over the `currentHook` variable! If you take that out, `setState` again stops working because the closed-over `currentHook` is stale. (Try it!)

```js
// Example 4 continued - in usage
function Counter() {
  const [count, setCount] = MyReact.useState(0)
  const [text, setText] = MyReact.useState('foo') // 2nd state hook!
  MyReact.useEffect(() => {
    console.log('effect', count, text)
  }, [count, text])
  return {
    click: () => setCount(count + 1),
    type: (txt) => setText(txt),
    noop: () => setCount(count),
    render: () => console.log('render', { count, text }),
  }
}
let App
App = MyReact.render(Counter)
// effect 0 foo
// render {count: 0, text: 'foo'}
App.click()
App = MyReact.render(Counter)
// effect 1 foo
// render {count: 1, text: 'foo'}
App.type('bar')
App = MyReact.render(Counter)
// effect 1 bar
// render {count: 1, text: 'bar'}
App.noop()
App = MyReact.render(Counter)
// // no effect run
// render {count: 1, text: 'bar'}
App.click()
App = MyReact.render(Counter)
// effect 2 bar
// render {count: 2, text: 'bar'}
```

So the basic intuition is having an array of `hooks` and an index that just increments as each hook is called and reset as the component is rendered.

You also get [custom hooks](https://reactjs.org/docs/hooks-custom.html) for free:

```js
// Example 4, revisited
function Component() {
  const [text, setText] = useSplitURL('www.netlify.com')
  return {
    type: (txt) => setText(txt),
    render: () => console.log({ text }),
  }
}
function useSplitURL(str) {
  const [text, setText] = MyReact.useState(str)
  const masked = text.split('.')
  return [masked, setText]
}
let App
App = MyReact.render(Component)
// { text: [ 'www', 'netlify', 'com' ] }
App.type('www.reactjs.org')
App = MyReact.render(Component)
// { text: [ 'www', 'reactjs', 'org' ] }}
```

**This truly underlies how “not magic” hooks are** – Custom Hooks simply fall out of the primitives provided by the framework – whether it is React, or the tiny clone we’ve been building.

## Deriving the Rules of Hooks

Note that from here you can trivially understand the first of the [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html): [Only Call Hooks at the Top Level](https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level). We have explicitly modeled React’s reliance on call order with our `currentHook` variable. You can read through [the entirety of the rule’s explanation](https://reactjs.org/docs/hooks-rules.html#explanation) with our implementation in mind and fully understand everything going on.

Notice also that the second rule, “[Only Call Hooks from React Functions](https://reactjs.org/docs/hooks-rules.html#only-call-hooks-from-react-functions)”, isn’t a necessary result of our implementation either, but it is certainly good practice to explicitly demarcate what parts of your code rely on stateful logic. (As a nice side effect, it also makes it easier to write tooling to make sure you follow the first Rule. You can’t accidentally shoot yourself in the foot by wrapping stateful functions named like regular JavaScript functions inside of loops and conditions. Following Rule 2 helps you follow Rule 1.)

## Conclusion

At this point we have probably stretched the exercise as far as it can go. You can try [implementing useRef as a one-liner](https://www.reddit.com/r/reactjs/comments/aufijk/useref_is_basically_usestatecurrent_initialvalue_0/), or [making the render function actually take JSX and mount to the DOM](https://www.npmjs.com/package/vdom), or a million other important details we have omitted in this tiny 28-line React Hooks clone. But hopefully you have gained some experience using closures in context, and gained a useful mental model demystifying how React Hooks work.

_I'd like to thank [Dan Abramov](https://twitter.com/dan_abramov) and [Divya Sasidharan](https://twitter.com/shortdiv) for reviewing early drafts of this eassay and improving it with their valuable feedback. All remaining errors are mine.._
