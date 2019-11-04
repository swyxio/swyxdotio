---
title: 'Compile Svelte in Your Head (Lightning Talk)'
slug: svelte-compile-lightning
categories: ['Tech', 'Svelte']
description: A lightning talk for Svelte Society Oct 1
date: 2019-10-01
topic: Svelte
venues: SvelteSociety
---

A great way to break the black box of Svelte is to look at the compiled output. This helps you understand both the runtime and the compiler.

## Hello World

Let's start with Hello World: https://svelte.dev/tutorial/basics

```html
<h1>Hello world!</h1>
```

which compiles to

```js
import {
  SvelteComponent, // the base component class
  detach, // node.parentNode.removeChild
  element, // document.createElement
  init, // we'll look at this
  insert, // target.insertBefore(node, anchor || null)
  safe_not_equal
} from 'svelte/internal'

function create_fragment(ctx) {
  var h1
  return {
    c() {
      h1 = element('h1')
      h1.textContent = 'Hello world!'
    },
    m(target, anchor) {
      insert(target, h1, anchor)
    },
    // redacted stuff
    d(detaching) {
      if (detaching) {
        detach(h1)
      }
    }
  }
}

export default class App extends SvelteComponent {
  constructor(options) {
    super()
    // attach $$
    init(this, options, null, create_fragment, safe_not_equal, [])
  }
}
```

## The `init` function

Let's understand the `init` function because it is that important:

https://github.com/sveltejs/svelte/blob/3d0a3cd943d6ab9991317777975aa3033627067d/src/runtime/internal/Component.ts#L72

```ts
export function init(
  component,
  options,
  instance,
  create_fragment, /* etc */
  not_equal,
  prop_names
) {
  // omitted some setup
  const $$: T$$ = (component.$$ = {
    fragment: null,
    ctx: null,

    // state
    props: prop_names,
    update: noop,
    not_equal,
    bound: blank_object(),

    // lifecycle
    on_mount: [],
    on_destroy: [],
    before_update: [],
    after_update: [],
    context: new Map(parent_component ? parent_component.$$.context : []),

    // everything else
    callbacks: blank_object(),
    dirty: null
  })

  // omitted ctx and lifecycle code
  $$.fragment = create_fragment($$.ctx)

  if (options.target) {
    // omitted hydration and transition code
    mount_component(component, options.target, options.anchor) // calls fragment.m(target, anchor);
  }
  // etc
}
```

## Aside: Styles

Pretty simple:

```html
<style>
  h1 {
    color: rebeccapurple;
  }
</style>

<h1>Hello world!</h1>
```

Compiles to:

```css
h1.svelte-yjl878 {
  color: purple;
}
```

and

```js
import {
  attr // (node, attribute, value) => node.setAttribute(attribute, value);
  // etc
} from 'svelte/internal'

function create_fragment(ctx) {
  var h1
  return {
    c() {
      h1 = element('h1')
      h1.textContent = 'Hello world!'
      attr(h1, 'class', 'svelte-yjl878') // new
    }
    // etc
  }
}
// etc
```

## Parameters!

Now lets put that text in a script tag...

```html
<script>
  let name = 'world'
</script>

<h1>Hello {name}!</h1>
```

Compiles to

```js
// imports omitted
function create_fragment(ctx) {
  var h1, t0, t1, t2
  return {
    c() {
      h1 = element('h1')
      t0 = text('Hello ')
      t1 = text(name)
      t2 = text('!')
    },
    m(target, anchor) {
      insert(target, h1, anchor)
      append(h1, t0)
      append(h1, t1)
      append(h1, t2)
    },
    d(detaching) {
      if (detaching) {
        detach(h1)
      }
    }
  }
}

let name = 'world' // verbatim from <script> tag!

export default class App extends SvelteComponent {
  // etc
}
```

## Event Handlers

This lifting verbatim applies based on anything at the top level scope:

```html
<script>
  let count = 0
  function handleClick() {
    console.log(count)
  }
</script>

<button on:click="{handleClick}">
  Clicked {count}
</button>
```

```js
import {
  // omitted imports
  listen // runs node.addEventListener(event, handler, options)
  // returns () => node.removeEventListener(event, handler, options);
} from 'svelte/internal'

function create_fragment(ctx) {
  var button, t0, t1, dispose // new!
  return {
    c() {
      button = element('button')
      t0 = text('Clicked ')
      t1 = text(count)
      dispose = listen(button, 'click', handleClick) // addEventListener
    },
    m(target, anchor) {
      insert(target, button, anchor)
      append(button, t0)
      append(button, t1)
    },
    d(detaching) {
      // omitted detach code
      dispose() // removeEventListener
    }
  }
}

let count = 0
function handleClick() {
  console.log(count) // verbatim
}

export default class App extends SvelteComponent {
  // etc
}
```

## Reactivity

Finally we add the assignment to make our pages interactive and see how data flow works in Svelte:

```html
<script>
  let count = 0
  function handleClick() {
    count += 1 // assignment!
  }
</script>

<button on:click="{handleClick}">
  Clicked {count}
</button>
```

Compiles to:

```js
import {
  // omitted imports
  set_data // (text, data) => text.data = data;
} from 'svelte/internal'

function create_fragment(ctx) {
  var button, t0, t1, dispose
  return {
    c() {
      button = element('button')
      t0 = text('Clicked ')
      t1 = text(ctx.count)
      dispose = listen(button, 'click', ctx.handleClick)
    },
    // omitted m code
    p(changed, ctx) {
      if (changed.count) {
        set_data(t1, ctx.count)
      }
    }
    // omitted d code
  }
}

// wrapped in an instance!
function instance(_, _, $$invalidate) {
  let count = 0
  function handleClick() {
    $$invalidate('count', (count += 1)) // new!
  }
  return { count, handleClick } // used in fragment ctx above
}

export default class App extends SvelteComponent {
  // etc
}
```

## Conclusion

Based on what we have learned so far, a `.svelte` component gets compiled into:

- `<html>`: a fragment (accessible with `$$.fragment`) which has
  - `c()`: to create elements
  - `m()`: to mount the elements
  - `d()`: to detach the elements (and remove event listeners)
  - `p()`: to update elements with `set_*` functions
- `<style>`: do both of:
  - output a css class
  - attach with `setAttribute`
- `<script>`: either do:
  - verbatim pasting the js code, or
  - pasting it in an `instance` with access to `($$self, $$props, $$invalidate)`
    - transform all assignments with `$$invalidate` so it can set off `$$.fragment.p()`
    - destructure/assign props from `$$props`
    - `$` reactive declarations use `$$self.$$.update` hook
    - return all top scope variables for `$$.ctx`

The two source files to study alongside the REPL are:

- https://github.com/sveltejs/svelte/blob/3d0a3cd943d6ab9991317777975aa3033627067d/src/runtime/internal/Component.ts#L72
- https://github.com/sveltejs/svelte/blob/3d0a3cd943d6ab9991317777975aa3033627067d/src/runtime/internal/dom.ts
