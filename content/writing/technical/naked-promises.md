---
title: Why Naked Promises are Not Safe For Work
slug: naked-promises
categories: ['Tech']
begun: 2019-07-15
date: 2019-08-14
---

_Published on [FreeCodeCamp's Developer News](https://www.freecodecamp.org/news/naked-promises-are-not-safe-for-work/)_

This article goes through my personal journey of discovery and struggle adopting the conventional wisdom as it pertains to asynchronous work on the frontend. With any luck, you will come away with at least a deeper appreciation of 3 tricky cases to handle when crossing the synchronous to asynchronous boundary. And we'll possibly even conclude that you will never want to manually account for these edge cases yourself ever again.

My examples are in React, but I believe they are universal principles that have parallels in all frontend apps.

## What is a "Naked Promise" anyway?

To do anything interesting in our app, we will probably use an asynchronous API at some point. In JavaScript, Promises have overtaken callbacks to be the asynchronous API of choice (especially as every platform has come to accept `async`/`await`). They have even become part of the "Web platform" - here's a typical example using the Promise-based `fetch` API in all modern browsers:

```js
function App() {
  const [msg, setMsg] = React.useState('click the button')
  const handler = () =>
    fetch('https://myapi.com/')
      .then((x) => x.json())
      .then(({ msg }) => setMsg(msg))

  return (
    <div className="App">
      <header className="App-header">
        <p>message: {msg}</p>
        <button onClick={handler}> click meeee</button>
      </header>
    </div>
  )
}
```

Here our button's `handler` function returns a "naked" Promise - it isn't wrapped by anything, it is just invoked outright so it can do fetch data and set state. This is an extremely common pattern taught in all introductions. This is fine for demo apps, however in the real world users often run into many edge cases this pattern conveniently forgets to account for.

## Promises Fail: The Error State

Promises fail. It is too easy to only code for the "happy path" where your network is always working and your API always returns a successful result. Most devs are all too familiar with the uncaught exceptions that arise only in production that make your app seem like it didn't work or is stuck in some kind of loading state. There are [ESlint rules to ensure you write `.catch`](https://github.com/xjamundx/eslint-plugin-promise/blob/HEAD/docs/rules/catch-or-return.md) handlers on your promises.

This only helps for promises you chain with a `.then`, but doesn't help when passing a promise to a library you don't control, or when you just call the promise outright.

Either way, ultimately the responsibility for displaying the error state will fall on you, and will look something like this:

```js
function App() {
  const [msg, setMsg] = React.useState('click the button')
  const [err, setErr] = React.useState(null)
  const handler = () => {
    setErr(null)
    fetch('https://myapi.com/')
      .then((x) => x.json())
      .then(({ msg }) => setMsg(msg))
      .catch((err) => setErr(err))
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>message: {msg}</p>
        {err && <pre>{err}</pre>}
        <button onClick={handler}>click meeee</button>
      </header>
    </div>
  )
}
```

We now have two states to handle for every asynchronous operation in our app!

## Promises in Progress: The Loading State

When pinging your APIs on your local machine ([for example, with Netlify Dev](https://alligator.io/nodejs/solve-cors-once-and-for-all-netlify-dev/)), it is pretty common to get rapid responses. However, this ignores the fact that API latency may be a good deal slower in real world, especially mobile, environments. When the button is clicked, the promise fires, however there is no visual feedback at all in the UI to tell the user that the click has been registered and the data is inflight. So users often click again, in case they misclicked, and generate yet more API requests. This is a terrible user experience and there is no reason for writing click handlers this way except that it is the default.

You can make your app more responsive (and less frustrating) by offering some form of loading state:

```js
function App() {
  const [msg, setMsg] = React.useState('click the button')
  const [loading, setLoading] = React.useState(false)
  const handler = () => {
    setLoading(true)
    fetch('https://myapi.com/')
      .then((x) => x.json())
      .then(({ msg }) => setMsg(msg))
      .finally(() => setLoading(false))
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>message: {msg}</p>
        {loading && <pre>loading...</pre>}
        <button onClick={handler} disabled={loading}>
          click meeee
        </button>
      </header>
    </div>
  )
}
```

We now have **three** states to handle for every asynchronous operation in our app: result, loading, and error state! Oy vey.

## Promises are dumb: The Component's State

Once promises fire off, they cannot be canceled. This was a [controversial decision](https://medium.com/@benlesh/promise-cancellation-is-dead-long-live-promise-cancellation-c6601f1f5082) at the time, and while platform specific workarounds like [abortable fetch](https://developers.google.com/web/updates/2017/09/abortable-fetch) exist, it's clear we will never get cancelable promises in the language itself. This causes issues when we fire off promises and then no longer need them, for example when the component it is supposed to update has unmounted (because the user has navigated somewhere else).

In React, this causes a development-only error like:

```bash
Warning: Can only update a mounted or mounting component. This usually means you called setState, replaceState, or forceUpdate on an unmounted component. This is a no-op.

# or

Warning: Can’t call setState (or forceUpdate) on an unmounted component. This is a no-op, but it indicates a memory leak in your application. To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
```

You can avoid this memory leak by tracking the mount state of a component:

```js
function App() {
  const [msg, setMsg] = React.useState('click the button')
  const isMounted = React.useRef(true)
  const handler = () => {
    setLoading(true)
    fetch('https://myapi.com/')
      .then((x) => x.json())
      .then(({ msg }) => {
        if (isMounted.current) {
          setMsg(msg)
        }
      })
  }
  React.useEffect(() => {
    return () => (isMounted.current = false)
  })

  return (
    <div className="App">
      <header className="App-header">
        <p>message: {msg}</p>
        <button onClick={handler}>click meeee</button>
      </header>
    </div>
  )
}
```

We've used a Ref here, as [it is closer to the mental model of an instance variable](https://medium.com/@pshrmn/react-hook-gotchas-e6ca52f49328), but you won't notice too much of a difference if you `useState` instead.

Longtime React users will also remember that [isMounted is an antipattern](https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html), however tracking `_isMounted` as an instance variable is still recommended if you don't use cancellable promises. (Which is ALL. THE. TIME.)

For those keeping count, we're now at **four** states needing to be tracked for a single async operation in a component.

## Solution: Just Wrap It

The problem should be pretty clear by now:

In a simple demo, "naked" promises work fine.

In a production situation, you're going to want to implement all these error handling, loading, and mounting tracker states. Again. And again. And again.

Sounds like a good place to use a library, doesn't it?

Fortunately, quite a few exist.

`react-async`'s `useAsync` hook lets you pass a `promiseFn`, together with several handy [options](https://www.npmjs.com/package/react-async#options) to add callbacks and other advanced usecases:

```js
import { useAsync } from 'react-async'

const loadCustomer = async ({ customerId }, { signal }) => {
  const res = await fetch(`/api/customers/${customerId}`, { signal })
  if (!res.ok) throw new Error(res)
  return res.json()
}

const MyComponent = () => {
  const { data, error, isLoading } = useAsync({ promiseFn: loadCustomer, customerId: 1 })
  if (isLoading) return 'Loading...'
  if (error) return `Something went wrong: ${error.message}`
  if (data)
    return (
      <div>
        <strong>Loaded some data:</strong>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    )
  return null
}
```

It also includes a handy `useFetch` hook you can use in place of the native `fetch` implementation.

`react-use` also offers [a simple `useAsync` implementation](https://github.com/streamich/react-use/blob/master/docs/useAsync.md), where you just pass in a promise (aka `async` function):

```js
import { useAsync } from 'react-use'

const Demo = ({ url }) => {
  const state = useAsync(async () => {
    const response = await fetch(url)
    const result = await response.text()
    return result
  }, [url])

  return (
    <div>
      {state.loading ? (
        <div>Loading...</div>
      ) : state.error ? (
        <div>Error: {state.error.message}</div>
      ) : (
        <div>Value: {state.value}</div>
      )}
    </div>
  )
}
```

Lastly, Daishi Kato's [`react-hooks-async`](https://github.com/dai-shi/react-hooks-async) also offers a very nice `abort` controller for any promises:

```js
import React from 'react'

import { useFetch } from 'react-hooks-async'

const UserInfo = ({ id }) => {
  const url = `https://reqres.in/api/users/${id}?delay=1`
  const { pending, error, result, abort } = useFetch(url)
  if (pending)
    return (
      <div>
        Loading...<button onClick={abort}>Abort</button>
      </div>
    )
  if (error)
    return (
      <div>
        Error: {error.name} {error.message}
      </div>
    )
  if (!result) return <div>No result</div>
  return <div>First Name: {result.data.first_name}</div>
}

const App = () => (
  <div>
    <UserInfo id={'1'} />
    <UserInfo id={'2'} />
  </div>
)
```

You can also choose to [use Observables](https://medium.com/@benlesh/promise-cancellation-is-dead-long-live-promise-cancellation-c6601f1f5082), either by wrapping your Promise in one or just using them outright.

In any case, you can see the emergent pattern that **you'll always want to wrap your promises** to use them safely in a production environment. At a meta-level, what's going on here is JavaScript lets you call both synchronous and asynchronous code with the exact same API, which is an unfortunate design constraint. It means that we need wrappers to safely translate asynchronous execution to synchronous variables we care about, especially in an immediate-mode rendering paradigm like React. We have to choose to either write these ourselves every time, or adopt a library.

If you have any further comments and edge cases that I haven't thought of, please [get in touch!](https://twitter.com/swyx)
