---
title: Why I Enjoy Svelte
slug: svelte-why
categories: ['Tech', 'Svelte']
description: Reasons I enjoy Svelte, despite not using it for work.
date: 2020-01-26
---

As someone who is primarily associated with React both at work and in my personal capacity, I get frequent questions on why I am messing around with Svelte so much. So I'm writing them down to organize my thoughts.

## Table of Contents

There is absolutely some New Toy Syndrome going on. I don't deny that. It's fun to try new things. But what follows is what features I think really makes me smile when I play with Svelte in my free time.

## Batteries Included

One of the first things that will probably hit you on first contact is that Svelte is very much on the Batteries Included side of frameworks, even more than Vue (which is a LOT more than React). (*i cant compare with other frameworks because I dont know them*)

I have to agree with Rich that a proper frontend framework should come with a styling solution. One that lets you [Just Write CSS](https://svelte.dev/blog/the-zen-of-just-writing-css).

But Svelte keeps going. Transitions and Animations. State Management. Even the server-side rendering metaframework is first-class. Here is a list of First class Svelte features and their third party React equivalents

- **Static Scoped Styling** - `<style>` vs Linaria/Astroturf/Styled-Components + Babel Plugin
- **Transitions**: `transition:fn` and `in:fn/out:fn` vs React Transition Group
- **Animations**: `animate:fn` vs React Spring/Framer Motion
- **Head management**: `<svelte:head>` vs react-helmet/react-async-helmet
- **Class toggling**: `bind:class` vs `classnames`
- **State management**: Svelte Stores(?) vs Redux/Mobx
- **A11y linting**: in the compiler vs `react-axe` and `eslint-plugin-jsx-a11y`
- **SSR Metaframework**: Sapper vs Next.js
- **Routing** is a notable omission from both. Default starter CLIs are also loosely managed by both.

For someone like me where decision fatigue and the paradox of choice is very real, it is very nice to have first party solutions for many of these things. Of course, it comes at a cost of maintainers that are spread very thin.

To be fair to React, here are things React has first party that Svelte doesn't:

- DevTools: https://github.com/RedHatter/svelte-devtools
- Portals: https://github.com/romkor/svelte-portal
- Suspense: https://github.com/sveltejs/svelte/issues/3203
- Lazy/Code Splitting: https://github.com/sveltejs/svelte/issues/742 
- Mobile/Native: https://github.com/halfnelson/svelte-native
- useMemo/useCallback: 🤷🏽‍♂️
- Streaming SSR: 🤷🏽‍♂️
- Test Utilities: 🤷🏽‍♂️
- I'm not sure about how events are normalized xbrowser but probably React does more

## The Joy of Mutability

Svelte is the `let` to React's `const`.

Here is an idiomatic Svelte counter:

```html
<script>let i = 0</script>
<button on:click={() => i += 1}>count {i}</button>
```

and an idiomatic React counter:

```js
const [i, setI] = useState(0)
<button onClick={() => setI(i + 1)}>count {i}</button>
```
Rich makes a big deal about the concision, and it is true that in refactorings I have noticed about 15-30% less application code. But that's neither here nor there if tradeoffs negate the benefits of saving keystrokes. (this is contested, of course)

I think the bigger deal is **mental model**. It is just plain easier to directly mutate variables by setting them, instead of pulling setters from the runtime and scheduling an async update (the majority of React beginners don't even know this, and we have learned to just accept it). It's not just more concise, it's genuinely simpler and more familiar. [Rich has argued that mutability is the fundamental mode we naturally want to interact with the DOM too.](http://swyx.io/writing/svelte-metaphysics)

Svelte, and Rich's programming style in general, is extremely mutable. Many people would recoil in horror at the way Rich uses state in modules. Many variables are just held in scope and directly mutated with setters. *Are you supposed to hold singleton values in ES modules?* I think many people already do, but pretend they don't by sticking a bunch of functions between them and the cold hard truth.

I get the value of [functional, immutable programming](https://www.netlify.com/blog/2018/10/05/netlify-and-the-functional-immutable-reactive-deploy/). However, [even React embraces local mutability](https://www.swyx.io/writing/rise-of-immer/). Svelte is obviously a little more aggressive about the mutability, but mutability is still scoped within component and store boundaries. [Rich even acknowledges](https://youtu.be/ogXETl_I0Dg) that React got one-way data flow right.

By the way, Svelte allows for immutability too. You can mark arrays as immutable, for performance needs. It just isn't required to function.

## $ugar $yntax

### Two Way Binding

Forms are hard in React, hence [Formik](https://github.com/jaredpalmer/formik). A typical React form would be something like:

```js
const submitForm = () => {/* etc */}
const [name, setName] = useState('')
const handleChange = e => setName(e.target.value)
const handleSubmit = e => e.preventDefault() || submitForm(name)
// not real code; needs labels and submit button too
return <form onSubmit={handleSubmit}>
<input type="text" value={name} onChange={handleChange} />
</form>
```

Whereas Svelte offers two-way binding and handy helpers:

```html
<script>
  let value = ""
  const submitForm = () => {/* etc */}
</script>
<!-- not real code; needs labels and submit button too -->
<form onSubmit|preventDefault={submitForm}>
  <input type="text" bind:value >
</form>
```

I used to think two-way binding was bad. One can argue it makes code a bit less auditable. But now I think it optimises for what developers need to write the most. React forces you to write change handlers, which you often don't need. Data validation and transformation best belongs in submit handlers.

React of course famously prides itself on having a small API surface area. This has at once made 3rd party library compatibility and API preservation easier, but has also shifted a lot of learning and boilerplate burden to app authors. This isn't a criticism, it is a conscious tradeoff - for example, this enabled the React community to explore design patterns like HoCs and Render Props with zero change to the library.

### Stores

I have [written about my love for Svelte Stores](https://www.swyx.io/writing/svelte-auth). The fact that with the `$` syntax, we can read from stores (and, for that matter, any Observable) is great, but we can also set them by assignment! 🤯 And the beauty of it is that it automates teardown of subscriptions:

```html
<script>
// normal way to read from svelte store
import { onDestroy } from 'svelte'
import { store } from './store.js'
let localVar
let unsub = store.subscribe(v => {
  localVar = v
})
onDestroy(unsub)
const handler = () => store.set(localVar + 1)
</script>
<button on:click={handler}>{localVar}</button>

<script>
// sugar syntax - unsubscribe on unmount is also done for you
import { store } from './store.js'
const handler = () => $store += 1
</script>
<button on:click={handler}>{$store}</button>
```

[Yehuda Katz recently said](https://twitter.com/samselikoff/status/1194622768274460672) that the value of React Hooks is in the self contained teardown mechanism. This lets Hooks be nicely bounded abstractions. I would apply this analogy to all frameworks too. After all, the biggest code saving of using a framework over vanilla JS is in not having to write teardown code for every element!

Svelte is full of stuff like this. Have I told you about [promise unrolling??](https://twitter.com/swyx/status/1220052804485746690)

Yes, that is a lot of syntax to hold in your head. That's why it is important to have...

## Good Docs

Svelte sets an extraordinarily high bar for a side project of a tiny group of people:

- [API docs](https://svelte.dev/docs)
- [Tutorial](https://svelte.dev/tutorial)
- [Gist-linked REPLs](https://svelte.dev/repl)
- [Examples](https://svelte.dev/examples)

Recently, I was able to find `actions` would help solve my usecase [without even knowing they existed.](https://twitter.com/swyx/status/1220905001926696962)

## Simple Internals

I actually think this is a SUPER underrated aspect of Svelte. I can [pull up the source code](https://github.com/sveltejs/svelte/tree/master/src), read it, follow it, and understand it. Wow! You can't say that for other frameworks, which, admittedly, have extremely different goals.

However the simple internals and simple contracts let me be EXTREMELY confident in knowing when to eject or handwrite the code myself. Stores and Animations are explicitly designed this way, where the first party stuff is merely included for convenience but the expectation is that you could absolutely write your own if needed.

[On a recent podcast](https://www.swyx.io/speaking/sedaily-nocode) Jeff Meyerson recently remarked something like "if React went in a different direction you could fork the code and maintain it". That's not true. [I've tried](https://www.swyx.io/speaking/contributing-to-react), and it is very hard to keep React's codebase in my head. 

But, very conceivably, **I could fork and maintain Svelte myself**.

## No Baggage

React is a very highly charged topic for many people, because of its impact. Svelte has negligible impact, and results in lighter JS bundles in many (not all) cases, so it's nicer to play around with and not get yelled at simply for using and talking about it.

## Because I Can

I do have the privilege that I am secure in my React knowledge, so I don't have to prove myself to feed myself. I do have free time because I don't have dependents. So being able to do this is absolutely a privilege.

However I've also been challenged, at React meetups, on why I spend time on non React things. I strongly object to this view. I would assert that a React developer who only knows React will not understand React as well as someone who has come from, or knows well, other frameworks.

## Svelte is Fun, But

People always want to put other people in boxes. I think I might be viewed as pivoting away from React towards Svelte. I'm not. 

I think Svelte has serious challenges to growth, not least of which the [nonstandard language](https://gist.github.com/Rich-Harris/0f910048478c2a6505d1c32185b61934) it really is, but also the governance model of loose volunteers. At some point (I'm not qualified to know when), there should be regular, even full-time maintenance with more well defined roles and responsiveness expectations. 

Svelte has had no problem attracting early adopters, but as it looks toward early and late majority, what got it here won't get them there. It will have to scale people more than code.

Community will be a major lever in this. [I'm involved](https://github.com/sveltejs/community) in this, again mainly because I hope to have fun and learn, but I'm far from sure I can do a good job of it. I have more existential needs I'm not taking care of.

React has plenty going for it, and is [good enough](https://twitter.com/swyx/status/1221125270989692928) for a vast majority of people. Network effect alone may be insurmountable. They also have [top notch release quality](https://reactjs.org/blog/2019/10/22/react-release-channels.html) and are working on awesome things no other framework is working on. If I were to start a new work app today, I'd still use React. I also think a compiler layer can be built for React to copy over some ideas from Svelte.

For now, my approach is "**Svelte for sites, React for apps**".