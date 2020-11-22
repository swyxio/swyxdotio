---
title: The Rise of Immer in React
slug: rise-of-immer
categories: ['Tech', 'React']
date: 2018-09-12
canonical: https://www.netlify.com/blog/2018/09/12/the-rise-of-immer-in-react/
---

> 2018: _Published on the Netlify Blog as [The Rise of Immer in React](https://www.netlify.com/blog/2018/09/12/the-rise-of-immer-in-react/)_

> 2019: This was given as a talk at ForwardJS - [Immutability is Changing](https://www.youtube.com/watch?v=CbDD3c1KbKI)

> 2020: Daishi Kato notes that [Valtio is the new option](https://twitter.com/dai_shi/status/1330490462642192384)


Immutability is changing. At least, the way we do immutability in React is changing. (The irony isn't lost on us.)

![plsdelete](https://user-images.githubusercontent.com/6764957/45408018-b48c1480-b69d-11e8-951f-227774c9f852.png)

## History

The need for immutability in JavaScript isn't obvious. Classically, the primary advantage of immutability is [fearless concurrency](https://www.infoq.com/articles/dhanji-prasanna-concurrency), but as JavaScript is single-threaded it isn't much of a benefit.

The history of immutability in React can be traced as far back as December 2013 when [David Nolen first introduced Om](https://swannodette.github.io/2013/12/17/the-future-of-javascript-mvcs). Om was a wrapper around React for ClojureScript users to be able to use it, but the weird thing about Om was that it turned out to be _faster than React_.

**How can a wrapper over a thing be faster than the thing itself?** David did a great talk about it [here](https://www.youtube.com/watch?v=DMtwq3QtddY) but the primary reason is immutable data. The bulk of React's work is [reconciliation](https://reactjs.org/docs/reconciliation.html), and it turns out that you can skip a lot of it if you can shallow compare objects and arrays and [memoize functions](https://github.com/reactjs/react-basic#memoization). React Fiber's data structure effectively does a lot of memoization under the hood to avoid repeat work.

The prolific Lee Byron brought this further into the React mainstream with [Immutable.js in 2015](https://www.youtube.com/watch?v=I7IdS-PbEgI)
(other versions of that ReactConf talk [here](https://vimeo.com/144790954), and [here with Q&A](https://blog.adroll.com/news/lee-byron-immutable)) which is a [dedicated library for immutability in JavaScript](https://facebook.github.io/immutable-js/). Note, in particular, his point that mutable objects [complect](https://www.youtube.com/watch?v=34_L7t7fD_U) time and value, and the benefits of low-level structural sharing.

Given its philosophical similarity to Flux, Immutable.js was [quickly adopted within the Redux community](https://redux.js.org/recipes/usingimmutablejs) (along with [67 other alternatives](https://github.com/markerikson/redux-ecosystem-links/blob/master/immutable-data.md#immutable-update-utilities), because Redux) and we [adopted it at Netlify, too](https://www.netlifycms.org/docs/architecture/)! Immutability was solved! Right?

Right?

## The People, Culture, Community of Immer

Early in 2018, Michel Weststrate open-sourced Immer. I will simply insist that you read his [introduction blogpost](https://hackernoon.com/introducing-immer-immutability-the-easy-way-9d73d8f71cb3) and [project readme](https://github.com/mweststrate/immer) rather than repeat it here. I also recommend his [React Finland](https://www.youtube.com/watch?v=-gJbS7YjcSo) talk (you'll need the [slides here](https://immer.surge.sh/)) as follow-up.

The reaction to Immer has been ecstatic from companies:

> Despite its downsides, Immer not only fulfills both of these requirements, but is also lightweight, simple, and generally performant. Thus far, **developers enjoy using Immer**; it has been extremely non-intrusive and easy to uptake with little-to-no learning curve. — [Workday Engineering](https://medium.com/workday-engineering/workday-prism-analytics-the-search-for-a-strongly-typed-immutable-state-a09f6768b2b5)

and instructors:

> **I currently prefer Immer**. — [Cory House](https://medium.freecodecamp.org/handling-state-in-react-four-immutable-approaches-to-consider-d1f5c00249d5)

and open source maintainers:

> **I'd go with Immer** — [Mark Erikson](https://twitter.com/acemarke/status/999436116280262656)

> **react-copy-write uses @mweststrate's Immer internally**. It lets you mutate a draft of an object to process an immutable update. Since this uses structural-sharing, react-copy-write is very good about only re-rendering when it needs to — [Brandon Dail](https://twitter.com/aweary/status/984828941595652096)

and the React team:

> "If you like MobX, I highly recommend following along @mweststrate’s work on Immer. While MobX is pretty far removed from the vision of where we’re going with React. **Immer is dead on.**" — [Sebastian Markbåge](https://twitter.com/sebmarkbage/status/1032684851063705600)

## React and the "Why" of Immer

So there is something obviously magic going on with Immer and it is worth spending some time thinking about how Immer's philosophy may fit particularly well with React's principles to understand what is going on.

When it comes to understanding React's philosophy (as separate from React the library as it exists today) there are two documents I constantly refer to: the [Design Principles](https://reactjs.org/docs/design-principles.html) on the official docs and [react-basic](https://github.com/reactjs/react-basic), a pseudocode progression through core beliefs in React. I'll highlight three concepts relevant to Immer:

**Temporal Mutability**

[React's data model is immutable](https://github.com/reactjs/react-basic#state) with state updater functions. Taking a simple Click Counter application, we intentionally don't do this in React:

```js
// MobX?
clickHandler = () => this.state.count++
```

Although you could rewrite React internally to support it (or [do it in userland with MobX](https://dev.to/swyx/introduction-to-mobx-4-for-reactredux-developers-3k07)). Instead, we write:

```js
// React
clickHandler = () =>
  this.setState((state) => ({
    count: state.count + 1,
  }))
```

This bears a great parallel to Immer's Producers:

```js
// Immer
const nextState = produce(currentState, (draft) => {
  draft.count = draft.count + 1
})
```

**Interoperability**

[The biggest issue with Immutable.js](https://redux.js.org/recipes/usingimmutablejs#what-are-the-issues-with-using-immutable-js) is the difficulty of interoperability. Although we have been happy users of Immutable.js at Netlify over 2 years, we get constant reminders we are not using "just JavaScript" every time we try to destructure Immutable.js `Map`s:

```js
// Immutable.js
const map1 = Immutable.Map({ foo: 1, bar: 2 })
const { foo, bar } = map1
console.log(foo) // undefined
console.log(bar) // undefined
```

This makes Immutable.js a fairly leaky abstraction as we have to constantly think about whether the variable we are manipulating is wrapped in Immutable.js.

With Immer, your objects and arrays are really JavaScript objects and arrays, so you can do everything you would normally do:

```js
// Immer
const map1 = { foo: 1, bar: 2 }
const map2 = produce(map1, (draft) => {
  draft.foo += 10
})
const { foo, bar } = map2
console.log(foo) // 11
console.log(map1.bar === bar) // true
```

This is the same philosophy that led to React's success as well — [React's focus on interoperability](https://reactjs.org/docs/design-principles.html#interoperability) allowed gradual adoption (instead of having to convert everything everywhere at once) as well as the general ability to work with other libraries in the JavaScript ecosystem that assume data structures passed to them are plain JS. This is the same goal pitched by Brendan Eich back when [proxies were introduced around 2010](https://www.youtube.com/watch?v=sClk6aB_CPk). Immer is a great use case for unobtrusively extending the language!

**Debugging**

Immer's advanced [Patches](https://github.com/mweststrate/immer#patches) feature allows opportunities for fine-grained debugging and tracing, potentially even building developer tools on top of it.

This is very similar to [React's focus on debuggability](https://reactjs.org/docs/design-principles.html#debugging), which includes allowing erroneous UI updates to be traced to the source, and building great devtools like the [React DevTools](https://www.netlify.com/blog/2018/08/29/using-the-react-devtools-profiler-to-diagnose-react-app-performance-issues/) on top of these guarantees from React.

As a nice bonus, Patches also allow for [Redux-like undo/redo implementations](https://redux.js.org/recipes/implementingundohistory) to be done without too much ceremony. Please see the linked resources for code as full examples are too long to be included here.

## Staying Power

Churn is a tired meme in the JavaScript ecosystem, and **the ability to identify technologies with staying power** is the key to sustainable growth. [Our CEO Mathias Biilmann wrote about three lessons for doing this well](https://medium.com/netlify/leveling-up-why-developers-need-to-be-able-to-identify-technologies-with-staying-power-and-how-to-9aa74878fc08):

- Learn your history
- People, culture, and community matter
- Always understand the "why"

My confession to you is that I've been slowly walking you through this mental framework as you read through this article. I think it is a great way to evaluate technologies and also explain why some open source projects gain greater adoption in some communities than others.

Immer's meteoric rise is notable, but it is not without reason — it comes from a lot of historical learning and has already gained a great following within the React community, and none of it would be possible if it didn't get its fundamental philosophy right.

Dan Abramov also noted recently how these cycles of evolution in technology go, and how people break paradigms successfully:

> Recipe for success: take something that’s easy to debug, and make it less annoying to write. **Thanks to @mweststrate for immer!** — [Dan Abramov](https://twitter.com/dan_abramov/status/1016783114381639680)

I think this is a profound insight — Immer would not have been possible if prior art hadn't already established the core developer experience benefit of immutability, making the remaining problem the leaky API. Immer thus focuses on keeping the same benefits while improving the API in the same ways that made React successful.

The best way to incrementally try Immer today is in reducing your [Redux](https://github.com/mweststrate/immer#reducer-example) or [React setState](https://github.com/mweststrate/immer#reactsetstate-example) boilerplate. In the future, look for many more Immer-powered libraries like the highly anticipated [redux-starter-kit](https://github.com/markerikson/redux-starter-kit) project as well as non-Redux state-management solutions like [react-copy-write](https://github.com/aweary/react-copy-write), [immer-wieder](https://github.com/drcmda/immer-wieder#readme) and [bey](https://github.com/jamiebuilds/bey) for building fast, boilerplate-free apps!
