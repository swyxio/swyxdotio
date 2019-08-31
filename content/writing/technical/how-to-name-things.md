---
title: How To Name Things
slug: how-to-name-things
categories: ['Tech']
begun: 2019-05-09
date: 2019-05-16
---

> There are 2 hard problems in computer science: cache invalidation, naming things, and off-by-1 errors. - [Leon Bambrick](https://twitter.com/secretgeek/status/7269997868?lang=en)

I've vacillated on my opinion on naming things. I think most people start out with no or weak opinions, looking slightly askance at the weirdos who do have strong opinions. They absorb naming conventions by osmosis, and then run into real problems at scale/over time, and then develop extremely strong opinions informed by that experience. The Weirdo's Journey.

I've given this essay a slightly clickbaity title. Spoiler: I'm not going to solve the problem of naming things today. All I hope to do is describe some opinions I've formed from my experience in Python and JS, list some considerations, invite you to [share yours](https://twitter.com/swyx), and suggest you have this debate on your team.

## Not Naming Things

[Aug 2019 Edit] One option people sometimes forget they have at their disposal is to just _not_ name things where possible. I have a couple examples for you.

**Example 1: Not giving different names at module and function boundaries**

Mind your "name stack". This is the number of names you have to keep in your head as you read code.

You can name the same thing 8 different ways at boundaries and hate life when you have to refactor or grep your own code:

```js
// index.js
const grault = require('./corge')
const foo = grault('baz')

// corge.js
export default function doBar(qux) {
  let quux = parse(qux)
  return quux
}
```

or just 2 ways and hate life less:

```js
// index.js
const { getFoo } = require('./getFoo')
const foo = getFoo('bar')

// getFoo.js
export function getFoo(bar) {
  return parse(bar)
}
```

**Example 2: Using Tooling to autogenerate names**

Instead of naming a `title` in CSS and then also a `<Title className="title">` in React, opening yourself up to global conflicts and subsequent refactoring, you could choose to use either a CSS Module or CSS in JS approach to scope and manage them together. Credit for this idea comes from [Max Stoiber](https://www.smashingmagazine.com/2016/09/how-to-scale-react-applications/#unique-class-names).

Notable Exception: Kyle Simpson famously does not use `=>` function syntax, preferring explicit `function` declaration, because he wants to avoid anonymous functions in the stack trace. That is his prerogative, but I don't think this is a battle worth fighting.

## Probably Bad Names

Inherent in having any opinion on naming things is some intuition that some names are worse than others.

This can feel a bit silly in languages where naming has no impact on program behavior, especially in JavaScript where everything gets minified. In that sense, naming is [bikeshedding](https://en.wiktionary.org/wiki/bikeshedding).

But code is not just written for correctness, it is also written for other humans to read (and maintain). In a strong form of [Sapir Whorf](https://en.wikipedia.org/wiki/Linguistic_relativity), what you name a thing can totally shape and artificially limit your creativity. In that sense, naming is -not- bikeshedding.

And yes, I've unironically been in standups where we _bikeshedded on whether something was bikeshedding_. The rabbit hole goes deep.

I'll motivate the discussion with some examples:

- [**Metasyntactic names**](https://en.wikipedia.org/wiki/Metasyntactic_variable), the "lorem ipsum" of code: `foo`, `bar`, `baz`. You're not likely to see these in actual code. But you might.
- **Vague names**: `thething`, `that`, `someObject`. Everything's a thing. `that` is no more descriptive than `this`. In JS, everything's an object. So what?
- **Too short, likely overloaded names**: `id`, `name`, `url`. There's nothing inherently wrong with these, but often you need more than one of these. So you start with one `id` in your code, and then later on have an `product.id`, then a `user.id`, and pretty soon its no longer clear what `id` means. It is then harder and harder to grep and rename names in your code. This is especially important when the language allows shadowing (_ahem JS_). Probably my most controversial, and recent, opinion.
- **Overly Long names**: >30 characters is pushing it IMO. You can namespace names inside a dict/object. (see below)
- **Scary Technical names**: `ModifiedApplicativeFunctor`. As much as this makes sense to you, it has to make sense to the next person. Again, if you're on a team that all shares your context, go ahead. But at least pause to consider if they do.
- **Nonconventional names**: Naming conventions don't exist in a vacuum. If everyone in a community does `import React from 'react'` and you do `import Bunny from 'react'` because you thought it would be a fun idea... it loses its fun quickly. More seriously, you can establish convenient aliases for names and concepts, but be careful that your code becomes an unreadable mess of custom convention.

## Name Pollution

It is possible to have too much of a good thing! Even if _all_ names technically fit whatever guidelines you choose, it is still possible to have way too many names. Every new name demands more space in your working memory. One very pervasive way this happens is when names cross file and module boundaries:

- `styleInjection.js` has only one export.
- That export is a function, which is named `genStylesCode` because that's what it does.
- A different file imports `styleInjection.js` and calls it `styleInjector` because that's what **it** uses it for.
- `styleInjection.js` isn't imported anywhere else, it isn't a reusable utility.

This was adapted from real code in a popular framework. Here we end up with 3 different names for the exact same thing. Triple the bikeshedding. As [Joe Fiorini](https://twitter.com/joegrammer2/status/1127744685978652679) puts it, **name files after their default export**. (If it makes sense).

## Controversial Names

Not all names are obviously bad, even though they may seem bad to you.

- **Single Letter Names**: You may dislike the TypeScript community using `T`, `U`, or `V` for generic type variables, but that does genuinely reflect the mathematical/set theory framing of the type system, and emphasize the genericness of the type variable. You may dislike using `e` for errors or for events, but if its usage is scoped, the impact really is very small and not worth arguing over. However, non-descriptive abbreviations that show up in errors seen by end users and your library consumers are bad news. Other forms of abbreviations may or may not be worth banning, check [this ESLint rule](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/docs/rules/prevent-abbreviations.md) for ideas.
- **Plurals vs Arrays**: You can have `names` variable be an array of `name`s, or a `nameArray`, which is more verbose and explicit but less aesthetic. [Don't choose lazy pluralization](https://mobile.twitter.com/swyx/status/1159462137745629185) and beware substrings.
- **[Block, Element, Modifier](http://getbem.com/introduction/)**: BEM was wildly popular for a reason - the global nature of CSS - but scoping methods have evolved a lot since then and BEM is far less necessary than used to be. It is also, to put it mildly, verbose.

## Probably Good Ideas and their Considerations

Having dealt with the easy stuff above, I'm now on much more equivocal territory. Here we deal with some considerations you may want to think about in forming your naming guidelines and where I stand:

- **Encoding Types**: In dynamically typed languages it can be helpful to give a hint as to what the variable is. But even in statically typed languages it can help give hints to the reader, especially where type inference means there isn't explicit annotation at every step:
  - **Is it an array?** I mentioned this is controversial, and I've gone both ways between `names` and `nameArray`. But I do like giving a hint that something is an array.
  - **Is it nullable?** I -really- like this for JavaScript, and because I have done some Haskell I often inject a monad, e.g. `maybeResult`. This reminds me to check if the result is falsy first. However, be warned that this can often not be the right choice for variables that can have more than two states, e.g. `undefined | Error | Success`. Pick a name that reflects the true nature of the concept.
  - **Is it sync?** A similar monadic hint. The Node-style convention where [the default, shorter name is async](https://twitter.com/swyx/status/1127663193722060800) and the blocking, synchronous version has the longer name is a good idea, especially because asynchrony tends to be introduced and spread through codebases later on. Since you probably want to write async code wherever possible, let's make that the more concise name.
  - **Is it a boolean?** I do like boolean verb prefixes: `isDone`, `hasProperty`, `didChange` over `done`, `!!object[property]`, `changed`. [Here is an ESLint rule for that.](https://github.com/typescript-eslint/typescript-eslint/issues/515). [Daniel Lo Nigro](https://twitter.com/Daniel15/status/1127736210590289921) mentions that banning inverse booleans also seems like a good idea - `notDone`, `noHeaders` - to avoid double negatives - but I haven't personally done that yet.
  - **Is it an important enum or constant?** use SCREAMING_CASE, e.g. `DISPLAY_MODE_NONE`, `DISPLAY_MODE_INLINE`, `DISPLAY_MODE_BLOCK`. Often used in Redux action constants, and environment variables.
  - **Is it an internal variable?** This one I like a _lot_ - if the variable is not meant to be exposed, it can often help to prefix `_internal` variables, especially if you are mirroring an argument just for mutability in order to output it again.
  - **Not just for "type system" types**: In the mailing list preview, [Massimiliano](https://massimilianomirra.com/) wrote in with an outstanding pointer to Joel Spolsky's [Making Wrong Code Look Wrong](https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/), which advocates the original idea behind Hungarian notation, which encodes types in names far beyond what normal types can cover, reflecting ideas like "string safety" and "width" and "index" and so on. A strong recommend!
- **Filenames**: We already discussed crossing file and module boundaries above. [Jonathan Johnson](https://twitter.com/LaughingBrook/status/1127805752905748480) also mentions that dates should come first in YYYY-MM-DD format.
- **Namespacing**: We all agree descriptive names are better, but also that names that are too long are bad. One way to break this knot is by various namespacing strategies. Use your language's module system and data structures when naming convention fails you. For example, break up a collection of longish names like `DISPLAY_MODE_NONE`, `DISPLAY_MODE_INLINE`, `DISPLAY_MODE_BLOCK` into a `displayModes` dict or enum that you can access, like `displayModes.NONE`. It doesnt have to just be variables, it can be functions too.
- **Grammar**: One of the most impactful naming decisions documented was in [the React lifecycle naming](https://reactjs.org/blog/2016/09/28/our-first-50000-stars.html#api-churn), which established a grammar of **Concepts, Actions and Operands** to help make lifecycles easier to remember. For CLI's, Heroku insists that `topics` are plural nouns and `commands` are verbs in their [CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide#naming-the-command). Your users will very quickly learn your grammar and that is a fantastic way to communicate and structure your public API.

> **Sidenote**: Naming is a subdiscipline of a broader art I call "API Design" - a very important and difficult-to-study topic I hope to one day write about.

As usual, it is possible to take good ideas too far - encoding types into EVERYTHING and being concise leads you to the commonly misused form of [Hungarian Notation](https://twitter.com/jose_r_varela/status/1127651367861018625), which nobody likes.

## The Cost of Enforcement

I do have a strong opinion that naming opinions should be breakable guidelines rather than strict rules. If you are spending more than 30 seconds discussing a name in a code review, and opinions differ, its probably not worth further debate. Your team's time is valuable and this costs more the bigger your team is. (Although if someone comes up with a name that everyone agrees better fits the concept/domain, then that is a great use of time!)

But wait, what about code standards? Without constant vigilance, my codebase will descend into a pit of chaos!

Well, first of all, nice to see that you trust your colleagues that much.

Second, **whatever can't be automated can't be enforced.** Code reviews cost. Human code review will have inconsistencies. The person who nitpicks names all the time will either be resented or joked about because they don't see the bigger picture. It just never ends well. [Don't be the bad cop](https://hackernoon.com/dont-be-the-bad-cop-in-pull-request-reviews-let-software-do-that-job-1eb9e574c2d1) - let the machine do it.

The base level is trusting in syntax and tests - if the code is valid and works as advertised, you very likely already have bigger problems you should pay attention to. The next level is autoformatting ([prettier](https://prettier.io) for JS, [black](https://github.com/python/black) for python) and linting where you write or adopt code that looks at your AST and enforces simple naming rules. Be careful: Overly eager linting is a problem.

As Nick Shrock says: **Delegate to Tooling Whenever Possible**. [His advice on Code Reviews](https://medium.com/@schrockn/on-code-reviews-b1c7c94d868c) is worth a full read here. Importantly: **the goal of a code review is not to make it so that the code looks as if you wrote it**. Internalize that.

Sindre Sorhus has some strong opinions on naming. You may not agree with all of them, but at least they are enforced in code. [Check `eslint-plugin-unicorn`](https://github.com/sindresorhus/eslint-plugin-unicorn#rules).

## Domain Driven Design

(Aug 2019 Update) I was fortunate enough to attend a workshop by [Andrew Cassell on Domain Driven Design](https://www.youtube.com/watch?v=bgJafJI8mp8) ([slides](https://speakerdeck.com/cassell/domain-driven-design-2)) where the concept of "Ubiquitous Language" drives naming and I really like this concept. However some of the application examples I've seen bleed the domain all over the place whereas I really only think it matters most at the public API.

## Collections of Things

(Aug 2019 Update) Don't pluralize lazily, e.g. `blog.js` and `blogs.js`. This is terrible to grep especially with one name being a substring of the other. Prefer to name both items and collections visibly. This is similar to the Hungarian notation idea, but works even if you use a type system. [Tweet](https://mobile.twitter.com/swyx/status/1159462137745629185)

## Your Opinion Here!

I [asked for more opinions on Twitter](https://twitter.com/swyx/status/1127648507676983296), and here are some I got:

- Dan Abramov: [Longer names to discourage use](https://twitter.com/dan_abramov/status/1127664407239114752) - for context, React uses this a lot in [dangerouslySetInnerHTML](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml) and more subtly in [getDerivedStateFromProps](https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html) and most famously in [DO_NOT_USE_OR YOU_WILL_BE_FIRED](https://news.ycombinator.com/item?id=11447020)
- Jamie Wong: The [Grep Test](http://jamie-wong.com/2013/07/12/grep-test/)
- Ivan Babak: Use [Context-independent names](https://twitter.com/sompylasar/status/1127694272604413952)
- b_sted: [Don't camelcase filenames](https://twitter.com/b_sted/status/1127650071393136640) for Unix compatibility
- Danny Eck: [Mark unstable, sync and unsafe code!](https://twitter.com/EckDaniel/status/1127694055054266368)
- Ersagun Kuruca: [More bad names](https://twitter.com/JimmyTheXploder/status/1127704565762142208): `script, callback, data, object, value, event, number, list`
- Matthew Weeks: [Keep it Simple but Descriptive](https://twitter.com/weeksling/status/1127669880302522370)
- Eric Bischard [recommends](https://mobile.twitter.com/httpJunkie/status/1127650526047264768) a very great talk by Kevlin Henney: ["Giving Code a Good Name"](https://www.youtube.com/watch?v=CzJ94TMPcD8).

Last but not least, in [the mailing list](https://tinyletter.com/swyx) preview, [Massimiliano](https://massimilianomirra.com/) also recommended Joel Spolsky's [Making Wrong Code Look Wrong](https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/), which I can't help but recommend again.
