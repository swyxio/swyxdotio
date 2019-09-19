---
title: You Already Use Types
slug: types-already
categories: ['Tech']
date: 2019-08-29
canonical: https://www.freecodecamp.org/news/you-already-use-types/
decription: Even if you are a skeptic about type systems, you probably already use one in your code. However, because you refuse to use a formal type system, you are missing out on better tooling that takes advantage of the type work you do anyway, and that the open source community can do for you.
---

_[Published on Freecodecamp](https://www.freecodecamp.org/news/you-already-use-types/)_

This post is for skeptics and newcomers to type systems, and aims to articulate rather than hard sell.

1. First we'll look at how static type conventions appear in your dynamically typed coding.
2. Then we'll step back and try to think about what this phenomenon tells us about how we want to code.
3. Lastly, we'll ask some (leading!) questions that should arise from these insights.

## Table of Contents

## 1A: Types in Names

Regardless of language, your journey with types starts almost as soon as you learn to code. The basic list data structure invites a corresponding plural:

```js
var dog = 'Fido'
var dogs = ['Fido', 'Sudo', 'Woof']
```

As you work with more and more and more code, you start to form opinions that you may mandate to your team or style guide:

- always use specific names like `dogID` vs `dogName` vs `dogBreed` or a namespace/class/object like `dog.name` or `dog.id` or `dog.breed`
- singles should not be substrings of plurals, e.g. BAD: `blog` and `blogs`, GOOD: `blogPost` vs `blogList`
- booleans [should have a boolean-ish prefix](https://github.com/typescript-eslint/typescript-eslint/issues/515), like `isLoading`, `hasProperty`, `didChange`
- functions with side effects should have verbs
- internal variables should have a `_prefix`

This may seem trivial since we're talking about variable names, but this vein runs _extremely_ deep. Names in our coding reflect the concepts and constraints we place on our code to make it more maintainable at scale:

- [Presentational Components vs Stateful/Connected Containers](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
- [Atoms, Molecules, Organisms, Templates, Pages](http://bradfrost.com/blog/post/atomic-web-design/)
- [Concepts, Actions, Operands](https://reactjs.org/blog/2016/09/28/our-first-50000-stars.html#api-churn) (one of the most successful name grammars ever)
- [Block\_\_Element--Modifier](http://getbem.com/naming/)
- [Higher Order Components](https://reactjs.org/docs/higher-order-components.html)

These all seep into your code accordingly: `*Container`, `*Component`, `*Reducer`, `*Template`, `*Page`, `with*`.

Once you start crossing execution paradigms, you start feeling your way into monadic type hints.

Node.js felt this early on:

```js
fs.readFile(myfile, callback)
fs.readFileSync(myfile) // introduced when people realized callback hell might not be worth non-blocking
```

React introduced the `use` prefix to indicate hooking into the runtime that must respect [certain rules](https://reactjs.org/docs/hooks-rules.html):

```js
function Component() {
  const [bool, setBool] = React.useState(true)
  React.useEffect(callback)
  const foo = useCustomHook()
  // ...
}
```

I am personally fond of reminders of nullability:

```js
const maybeResult = await fetchAPI()
if (maybeResult) {
  const result = maybeResult
  // do things with result
} else {
  // maybeResult is falsy, dont assume it is there
}
```

**In almost everything you name, you're already using types.**

So what, you ask?

Keep reading, I'm building up to it.

## 1B: Types in Data Structures

The problem with encoding types in names is that the language probably doesn't care about your meticulously named variables (indeed, in JavaScript, it probably gets mercilessly minified beyond recognition). It will happily run your code and throw a runtime error if you forget to respect your own nametypehints. What if we made types formally checkable through data structures?

The most basic are constants. In Redux, it is [common to explicitly (and redundantly) set SCREAMING_CASE_CONSTANTS](https://decembersoft.com/posts/a-simple-naming-convention-for-action-creators-in-redux-js/):

```js
const ADD_TODO = 'slice/ADD_TODO'

// later in redux code:
import { ADD_TODO } from './redux/types'
switch (action.type) {
  case ADD_TODO:
  // do stuff based on the action
  // ...
}
```

This is mostly done because you can't trust your fellow developer not to typo their strings.

However even these strings offer too much trust, and we found it important enough to add a new language feature to guarantee uniqueness:

```js
const ADD_TODO = Symbol('slice/ADD_TODO')
```

We also fake our way toward enums this way:

```js
const colors = {
  BLUE: Symbol(1),
  GREEN: Symbol(2),
  RED: Symbol(3)
}
```

But simple values (strings, numbers, booleans) are actually easy to compare and treat accordingly.

More pressing is encoding types in complex values.

This usually happens when you have arrays of objects and the objects are different in some ways and similar in others:

```js
const animals = [
  { name: 'Fido', legs: 4, says: 'woof' },
  { name: 'Kermit', legs: 2, marriedTo: 'Piggy' }
]
// will have bugs if an animal with both `says` and `marriedTo` exists
animals.forEach(animal => {
  if (animal.says) {
    // i guess it's a dog?
  }
  if (animal.marriedTo) {
    // i guess it's a frog?
  }
})
```

Buggy checking and implicitly assumed types is often a cause for much pain. Better to type explicitly:

```js
const animals = [
  {
    type: 'dog', // new!
    name: 'Fido',
    legs: 4,
    says: 'woof'
  },
  {
    type: 'frog', // new!
    name: 'Kermit',
    legs: 2,
    marriedTo: 'Piggy'
  }
]
animals.forEach(animal => {
  if (animal.type === 'dog') {
    // must be a dog!
  }
  if (animal.type === 'frog') {
    // must be a frog!
  }
})
```

This is in fact what happens for Redux (and, interestingly enough, handy for other things like [Discriminated Unions](https://basarat.gitbooks.io/typescript/docs/types/discriminated-unions.html)), but you will see this **everywhere** in [Gatsby](https://github.com/sw-yx/overreacted.io/blob/master/gatsby-config.js#L25-L50) and [Babel](https://babeljs.io/docs/en/plugins/#plugin-options) and [React](https://reactjs.org/docs/react-without-jsx.html) and I'm sure you know of cases I don't.

Types even exist in HTML: `<input type="file">` and `<input type="checkbox">` behave so differently! (and I already mentioned Types in CSS with [Block\_\_Element--Modifier](http://getbem.com/naming/))

**Even in HTML/CSS, you're already using types.**

## 1C: Types in APIs

I'm almost done. Even outside your programming language, the interfaces between machines involve types.

REST's big innovation was basically a primitive form of typing client-server requests: `GET`, `PUT`, `POST`, `DELETE`. Web conventions have introduced other type fields in requests, like the `accept-encoding` header, that you must adhere to to get what you want. However, RESTfulness is basically not enforced, and because it doesn't offer guarantees, downstream tooling cannot assume properly behaved endpoints.

GraphQL takes that idea and dials it up to 11: Types are key to queries and mutations and fragments, but also on every field and every input variable, validated on both clientside and serverside by spec. With much stronger guarantees, it is able to ship [much better tooling](https://github.com/graphql/graphiql) as a community norm.

I don't know the history of SOAP and XML and gRPC and other machine-machine communication protocols but I'm willing to bet there are strong parallels.

## Part 2: What Does This Tell Us?

This was a very long, and yet inexhaustive examination of types permeating everything you do. Now that you've seen these patterns, you can probably think of more examples I'm forgetting right now. But at every turn, it seems the way toward more maintainable code, and better tooling is to add types in some way.

I mentioned parts of this thesis in [How To Name Things](https://www.swyx.io/writing/how-to-name-things), but basically all of the naming schemas fall under an enlightened form of Hungarian notation, as described in Joel Spolsky's [Making Wrong Code Look Wrong](https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/).

If none of what I have described resonates with you, and isn't something you've already been doing, then types may not be for you.

But if it does, and you've been doing this in slipshod fashion, you may be interested in more structure around how you use types in your code, and in using better tooling that takes advantage of all the hard work you already put into types.

You may be working your way toward a type system, without even knowing it.

## Part 3: Leading Questions

So knowing what we know now about using types in our code without a type system. I'll ask some hard questions.

**Question 1: What do you currently do to enforce types without a type system?**

At an individual level, you engage in defensive coding and manual verification. Basically manually eyeballing your own code and reflexively adding checks and guards without knowing if they're really needed (or, worse, NOT doing it and figuring out after seeing run time exceptions).

At a team level, you spend multiples of developer-hours in code review, inviting bike shedding over names, which we all know is great fun.

These two processes are manual methods, and a very poor use of developer time. [Don't be the bad cop](https://hackernoon.com/dont-be-the-bad-cop-in-pull-request-reviews-let-software-do-that-job-1eb9e574c2d1) - this wrecks team dynamics. At scale, you are mathematically guaranteed to have lapses in code quality (therefore causing production bugs), either because everyone missed something, or there just wasn't enough time and you just had to ship something, or there wasn't a good enough policy in place yet.

The solution, of course, is to automate it. As Nick Schrock says, [Delegate to Tooling Whenever Possible](https://medium.com/@schrockn/on-code-reviews-b1c7c94d868c). Prettier and ESLint help to hold up your code quality - only to the extent to which the program can understand you based on an AST. It does not offer any help crossing function and file boundaries - if function `Foo` expects 4 arguments and you only pass it 3, no linter will yell at you and you'll have to defensively code inside `Foo`.

So there's only so much you can automate with a linter. What about the rest you can't automate?

Therein lies the last option: Do Nothing.

Most people do nothing to enforce their informally designed type systems.

**Question 2: How much of these types are you writing yourself?**

It goes without saying that if all your type policies are created by you, then they must be written by you and enforced by you.

That's totally different from how we write code today. We lean heavily on open source - [97% of modern web app code is from npm](https://mobile.twitter.com/housecor/status/1078634947831914496). We import shared code, and then write the last mile parts that make our app special (aka business logic).

Is there a way to share types?

([yes](https://github.com/DefinitelyTyped/DefinitelyTyped/))

**Question 3: What if your types were standardized?**

Research has shown that the #1 reason programmers adopt a language is the existing capabilities and functionality available for them to use. I will learn Python to use TensorFlow. I will learn Objective C to create native iOS experiences. Correspondingly, JS has been so successful because it runs everywhere, compounded by the wide availability of free open source software written _by other people_. With some standardized type system, we can [import types just as easily as we import open source software](https://github.com/DefinitelyTyped/DefinitelyTyped/) written by other people.

Just like GraphQL vs REST, Standardized types in a language unlock much better tooling. I will offer 4 examples:

**Example 1: Faster Feedback**

We might take months and days to learn from **runtime errors**, and these are exposed to users, so they are the worst possible outcome.

We write tests and apply lint rules and other checks to move these errors to **build time errors**, which shortens feedback cycles to minutes and hours. (As I wrote recently: [Types don't replace Tests!](https://css-tricks.com/types-or-tests-why-not-both/))

Type Systems can shorten this feedback by yet another order of magnitude, to seconds, checking during **write time**. (Linters can also do this. Both are conditional on a supportive IDE like VS Code) As side effect, you get autocomplete for free, because autocomplete and write time validation are two sides of the same coin.

**Example 2: Better Error Messages**

```js
const Foo = {
  getData() {
    return 'data'
  }
}
Foo['getdata']() // Error: undefined is not a function
```

JavaScript is intentionally lazy evaluation by design. Instead of the dreaded and nondescript `undefined is not a function` during runtime, we can move this to write time. Here's the write time error message for the exact same code:

```ts
const Foo = {
  getData() {
    return 'data'
  }
}
Foo['getdata']() // Property 'getdata' does not exist on type '{ getData(): string; }'. Did you mean 'getData'?
```

Why yes, TypeScript, I did.

**Example 3: Edge Case Exhaustion**

```ts
let fruit: string | undefined
fruit.toLowerCase() // Error: Object is possibly 'undefined'.
```

Over and above the built in nullable checking (which takes care of issues like passing in 3 arguments when a function expects 4), a type system can make the most of your enums (aka union types). I struggled coming up with a good example but here is one:

```ts
type Fruit = 'banana' | 'orange' | 'apple'
function makeDessert(fruit: Fruit) {
  // Error: Not all code paths return a value.
  switch (fruit) {
    case 'banana':
      return 'Banana Shake'
    case 'orange':
      return 'Orange Juice'
  }
}
```

**Example 4: Fearless Refactoring**

Many people mentioned this and I'll be honest that it took me a long while to come around to this. The thinking is: "so what? I don't refactor that much. so that means TypeScript's benefit is smaller to me than to you because I'm better than you."

This is the wrong take.

When we start off exploring a problem, we start off with a vague idea of the solution. As we progress, we learn more about the problem, or priorities change, and unless we've done it a million times we probably picked something wrong along the way, whether it be function API, data structure, or something larger scale.

![chart](https://www.methodsandtools.com/archive/refact8.png)

The question is then to either stick with it until it breaks or to refactor the moment you can sense that you're going to outgrow whatever you used to have. I'll assume you accept that there are often benefits to refactoring. So why do we avoid refactoring?

**The reason you put off that refactor is that it is costly, not because it isn't beneficial to you. Yet putting it off only increases future cost.**

Type System tooling helps to dramatically lower the cost of that refactor, so you can experience the benefits earlier. It lowers that cost via faster feedback, exhaustiveness checking, and better error messages.

## Truth in Advertising

There is a cost to learning Type Systems you didn't write. This cost may offset any imagined benefit to automated type checking. This is why I put a great deal of effort into helping to lower that learning curve. However, be aware that it is a new language and will involve unfamiliar concepts, and also that even the tooling is an imperfect work in progress.

But it is good enough for [AirBnb](https://www.reddit.com/r/typescript/comments/aofcik/38_of_bugs_at_airbnb_could_have_been_prevented_by/) and [Google](http://neugierig.org/software/blog/2018/09/typescript-at-google.html) and [Atlassian](https://github.com/atlassian/react-beautiful-dnd/issues/982) and [Lyft](https://eng.lyft.com/typescript-at-lyft-64f0702346ea) and [Priceline](https://medium.com/priceline-labs/trying-out-typescript-part-1-15a5267215b9) and [Slack](https://slack.engineering/typescript-at-slack-a81307fa288d) and it may be for you.

<!--

Structure of this post:

- Hungarian-lite
  - isLoading
  - \_internal vars
- Plurals
  - posts
  - postIndex
- Naming Grammar
  - *Container, *Component
  - Atoms, Molecules, Organisms, Templates, Pages
- Monads
  - use\*
  - sync\*
  - maybe\*
- form effects
  - {type: 'foo'}
  - <input type="button" />
  - ENUMS and Symbols
- APIs
  - REST: GET PUT POST DELETE
  - GraphQL: types all the way down
- Big Brain Time
  - Joel Spolsky's [Making Wrong Code Look Wrong](https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/)
  - How to Name Things
- Questions to ask:
  - What do we do to enforce types without a type system?
    - Linting
    - Code Review
    - Defensive coding
    - Nothing
  - How much of these types are you writing yourself? What if your types were standardized?
    - better error messages
    - autocomplete and write time errors > build time errors > run time errors
    - Other people can write them for you
    - edge case exhaustion

-->
