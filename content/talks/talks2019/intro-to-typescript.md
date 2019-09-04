---
title: Introduction to TypeScript
slug: intro-to-typescript
topic: TypeScript
venues: Netlify
date: 2019-09-03
url: https://mobile.twitter.com/swyx/status/1166487148331184128
video: https://www.youtube.com/watch?v=YDK8sYCgbDw
desc: a 1hr netlify workshop introducing people to TS
description: TypeScript is a megatrend in JavaScript, going from 46% of npm survey respondents in 2018 to 62% in 2019. This is an introduction to TypeScript for those familiar with JavaScript with a Q&A at the end. A 1hr internal Netlify lunch & learn.
---

## Twitter Comments

- [From Leslie](https://mobile.twitter.com/lesliecdubs/status/1168968624956198915)
- [From Me](https://mobile.twitter.com/swyx/status/1166487148331184128)

## Basic Questions

- What is TypeScript?
  - Officially: "JavaScript that scales™". A typed superset of JavaScript that compiles to plain JavaScript.
  - Constraints, Compiler, Community
  - NOT a frontend-only technology
- When did TS start?
  - ~2011, released 2012.
  - Context: HTML5, ES6 standardized, people trying to write larger web apps.
  - Started life as Script# (cross compiled C# to JavaScript).
  - Google had a similar compiler GWT, from Java.
  - [Adopted by Angular in 2015](https://techcrunch.com/2015/03/05/microsoft-and-google-collaborate-on-typescript-hell-has-not-frozen-over-yet/)
- TS Team
  - ~30 people in Microsoft, mostly Redmond
  - Chief Architect Anders Hejlsberg
    - Turbo Pascal
    - Delphi
    - J++
    - C#
    - TypeScript
  - Program Manager [Dan Rosenwasser](https://twitter.com/drosenwasser?lang=en)
- TS Value System
  - Open source and open development
    - does not follow semver
    - 2-3 month [release schedule](https://github.com/Microsoft/TypeScript/wiki/Roadmap)
    - Dogfooding (TS written in TS)
  - Choose to innovate in type system, not in language features
  - Closely track ECMAScript for features
  - Tooling support
  - Continually lower barrier to entry
  - Community focus
- Who's using it?
  - BigCos
    - [Airbnb](https://www.youtube.com/watch?v=P-J9Eg7hJwE)
    - [Lyft](https://eng.lyft.com/typescript-at-lyft-64f0702346ea)
    - [Google](http://neugierig.org/software/blog/2018/09/typescript-at-google.html)
    - [Slack](https://slack.engineering/typescript-at-slack-a81307fa288d)
    - [Hootsuite](https://medium.com/hootsuite-engineering/thoughts-on-migrating-to-typescript-5e1a04288202)
    - [Atlassian](https://github.com/atlassian/react-beautiful-dnd/issues/982)
    - [Priceline](https://medium.com/priceline-labs/trying-out-typescript-part-1-15a5267215b9)
    - [Tiny](https://www.slideshare.net/tiny/porting-100k-lines-of-code-to-typescript)
  - Open Source
    - [Vue](https://medium.com/the-vue-point/plans-for-the-next-iteration-of-vue-js-777ffea6fabf)
    - [Jest](https://github.com/facebook/jest/pull/7554#issuecomment-454358729)
    - [Yarn](https://github.com/yarnpkg/yarn/issues/6953)
    - [OClif](https://oclif.io/)
    - [VSCode](https://code.visualstudio.com/api)
  - Surveys
    - [#10 Language on StackOverflow, #3 Most Loved](https://insights.stackoverflow.com/survey/2019#technology)
    - [#7 Language on GitHub](https://octoverse.github.com/projects#languages)
    - 46% in 2018 to 62% in 2019 [based on NPM survey](https://mobile.twitter.com/seldo/status/1142599065110061056)
    - [Survey from 2016 => 2017 => 2018 in StateofJS](https://mobile.twitter.com/swyx/status/1168920026201690112):
      - Would use again: 21 => 34 => 47%
      - Want to learn: 39 => 38 => 34%
      - Not interested: 34 => 21 => 14%

Conclusion: if you're not interested now you may not stay that way.

## Primary Motivations

![https://www.monkeyuser.com/assets/images/2017/70-runtime-vs-compile-time-errors.png](https://www.monkeyuser.com/assets/images/2017/70-runtime-vs-compile-time-errors.png)

Increased Benefits

- Move Runtime Errors to Compile Time
  - Move Compile Time Errors to Write Time Errors with Tooling
  - [Airbnb reports 38% of production bugs preventable with TypeScript](https://www.youtube.com/watch?v=P-J9Eg7hJwE)
    - remember Airbnb has extensive linting and testing already
  - Choose to have More Errors Nearer to the Origin rather than Fewer Errors but Further Away
- [Increased Developer Velocity](https://medium.com/hootsuite-engineering/thoughts-on-migrating-to-typescript-5e1a04288202)
  - Hidden cost of defensive programming and local dev manual testing
- Enforced Documentation
  - including [inline documentation with TSDoc](https://github.com/microsoft/tsdoc)

Lower Costs

- Refactoring
  - Tooling as a first class focus aka "Compiler as a Service", not a black box
- Benefit from Types written by
  - [Community](https://github.com/DefinitelyTyped/DefinitelyTyped/)
  - [Machines](https://github.com/dotansimha/graphql-code-generator)
  - Inferred by TypeScript itself
- Easy interop with JavaScript

## Wat

Here's [Gary Bernhardt's famous Wat talk](https://www.destroyallsoftware.com/talks/wat) in TypeScript:

```ts
[] + [] // Error: Operator '+' cannot be applied to types 'never[]' and 'never[]'.
[] + {}  // Error: Operator '+' cannot be applied to types 'never[]' and '{}'.
Array(16).join('wat' - 1) + " Batman!" // Error: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

{} + []  // legal!
{} + {}  // legal!
```

## TypeScript Type System Attributes

- TS Type System Attributes:
  - Erasable
  - Inferable
  - Gradual
  - Structural
  - Generic
  - Expressive
  - Both Object Oriented and Functional

### Erasable

The first and most important attribute of the TS Type System to note is that it gets compiled away. This TS code:

```tsx
type Person = {
  firstName: string
  lastName: string
}
function greeting(person: Person) {
  return 'Hello, ' + person.firstName + ' ' + person.lastName
}
let user: Person = { firstName: 'Jane', lastName: 'Doe' }
document.body.innerHTML = greeting(user)
```

compiles to perfectly readable JS to be run:

```js
function greeting(person) {
  return 'Hello, ' + person.firstName + ' ' + person.lastName
}
let user = { firstName: 'Jane', lastName: 'Doe' }
document.body.innerHTML = greeting(user)
```

This is why criticism from people who claim you should not adopt TypeScript because ECMAScript may someday have types, mostly fall flat.

In particular, note that Types do not get sent to the browser because they are compiled away.

### Inferable

The same JS code is also valid (though not necessarily strict) TS. However even then we can still infer types based on usage:

```ts
function greeting(person) {
  // person: any <= not infered bc TS doesn't do non-local type inference
  return 'Hello, ' + person.firstName + ' ' + person.lastName
}
let user = { firstName: 'Jane', lastName: 'Doe' }
// user: {firstName: string, lastName: string }
document.body.innerHTML = greeting(user)
```

### Gradual

TypeScript has a spectrum of strictness. At the loose end it will infer everything to the maximally permissive `any` type, which will let you run all JS code, but offers no type safety. At the other end is `strict` mode, which includes:

- `noImplicitAny`
- `noImplicitThis`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictPropertyInitialization`
- `strictBindCallApply`

You can also opt in to type checking on a file by file basis, or even use TypeScript tooling inside JS with JSDoc [as Webpack does](https://medium.com/@trukrs/type-safe-javascript-with-jsdoc-7a2a63209b76).

### Structural

By default, TypeScript compares type structure instead of type name (aka duck typed). We do this to increase interoperability with JavaScript itself. This can cause confusion, for example, this doesn't raise an error when it would in other type systems:

```ts
type UserID = string
type FoodID = string
function getUserID(): UserID {
  return readFromFile('/userid')
}
let foodId: FoodID = getUserID() // this is a mistake, but TS doesn't raise an error
```

Instead, TS chooses to compare shapes. This is most useful in complex data types like objects:

```ts
function greet(person: { name: string }) {
  return 'Hello, ' + person.name + '!'
}
class Person {
  name: string
  constructor(name: string) {
    this.name = name
  }
}
greet(new Person('John')) // no error
greet({ name: 'Jane' }) // no error
```

Many people wish for nominal types, which C# and Java have. We opt in to it with [Type Branding](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet#simulating-nominal-types) and, [in future](https://github.com/microsoft/TypeScript/pull/33038), the `unique` keyword.

### Generic

TS allows you to declare generic interfaces for reusable code where you don't know the types til much later:

```ts
type Node<P> = {
  data: string
  parent: P
  children: Node<Node<P>>[] // can recurse
}
```

You can use limitations and keywords to offer even more type checks with generics, for example "stringly typed" return values:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
const obj = { text: 'hello', count: 42 }
getProp(obj, 'text') // string
getProp(obj, 'count') // number
getProp(obj, 'doesntexist') // Error
```

In fact, the dynamic expressiveness of JavaScript leads to TypeScript's type system, not the other way round. This is why there are so many generic type patterns that may look scary at first:

```ts
{ x: T, y: U }     // Object
T | U              // Union
T & U              // Intersection
keyof T            // Index
T[K]               // Lookup
{ [P in K]: X }    // Mapped Types
T extends U ? X: Y // Conditional Types
```

The Generic Type system is very powerful (even [Turing Complete](https://github.com/Microsoft/TypeScript/issues/14833)) and deserve much fuller treatment in a separate intro. But more important for beginners to know that it is an opt in system to provide better type safety, not a required part of using TypeScript.

### Expressive

Union Types and Control Flow Analysis allow smart localization of the type system. For example here we can make sure to perform null checks and proceed the rest of the code with the type system assuring us that we've done it:

```ts
function foo(x: string | undefined) {
  if (typeof x === 'undefined') {
    return 'no x parameter given to foo!'
  }
  x // string
  // etc...
}
```

We can use string and number literals in Union Types which basically act like enums. This is used, for example, in the Discriminated Union design pattern:

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; w: number; h: number }

function area(shape: Shape) {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'square':
      return shape.size ** 2
    case 'rectangle':
      return shape.w * shape.h
  }
}
```

For those who know Haskell/ML, this looks like Algebraic Data Types.

## Tooling

Official Tooling

- TypeScript Server/Language Service
- Plugins to VSCode, IntelliJ, vim, emacs, etc
- Babel 7 released with TypeScript Support
- Webpack Typescript Loader maintainer on the TS team
- [TS Playground](https://www.typescriptlang.org/play/)
- Focus on 250ms response time

Community Tooling

- https://github.com/typescript-cheatsheets/typescript-utilities-cheatsheet
- "End to End Types" = codegen from backend API (GraphQL/OpenAPI/Swagger/Thrift) to frontend
- Design System: Generate prop tables
  - [Storybook](https://storybook-design-system.netlify.com/?path=/docs/design-system-button--all-buttons)
  - [Docz](https://www.docz.site/docs/built-ins-components#component-props)
  - [Styleguidist](http://www.episodeyang.com/react-component-props-table/)

## Criticisms of TypeScript

- Reliance on build tools means you cant just write TypeScript in a script tag
- Not ES Standard
- Doesn't offer _enough_ type safety for things
  - like restricting what children a React component accepts (@react/ui)
- Some things are still TOO dynamic for the type system:
  - HoCs
  - Redux
- Slow for very large codebases, requires [Project References](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet/blob/master/ADVANCED.md#user-content-typescript-30)
- Learning curve = Gatekeeping
- https://twitter.com/samccone/status/1168661794954592257
- Not fast enough for Gary Bernhardt https://mobile.twitter.com/garybernhardt/status/1073004317794160640
- Flow advocates says it has a better inference system (tho it was [mostly MIA in 2018](https://medium.com/flow-type/what-the-flow-team-has-been-up-to-54239c62004f))

## Migrating to TypeScript

[I keep a guide here](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet/edit/master/MIGRATING.md). The technical part is easy, the hard part is getting organization buy-in. Do not ever force it on people.

- Automated conversion
  - https://github.com/JoshuaKGoldberg/TypeStat
  - https://github.com/urish/typewiz
- Manual, Whole Hog with loose setting
  - `find src -name "*.js" -exec sh -c 'mv"$0" "${0%.js}.tsx"' {} \;`
  - `//@ts-nocheck` doesnt work the way you'd think. To opt out of entire files you have to [use this hack for now](https://stackoverflow.com/questions/55632954/ignore-all-errors-in-a-typescript-file):
    - add `/// <reference no-default-lib="true"/>`
    - set `skipDefaultLibCheck` compiler option to `true`
- Manual, File by file
  - `//@ts-check`

TSconfig for loose method:

```json
{
  "compilerOptions": {
    "allowJs": true, // level 0
    "checkJs": true, // level 2
    "noImplicitAny": true // level 3
  }
}
```

Then keep adding `noImplicitThis`, `strictNullChecks`, until you have [all the `strict` mode flags](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

People often use a `type TODO_TYPEME = any;` while they do the conversions.

In converting the Netlify codebase, I found some other compiler options handy.

```js
{
  "compilerOptions": {
    "allowJs": true,
    "esModuleInterop": true,
    "incremental": true,
    "lib": ["esnext", "dom"],
    "moduleResolution": "node",
    "jsx": "react",
    "outDir": "tsdist",
    "skipDefaultLibCheck": true, // opt out of entire file type checks with /// <reference no-default-lib="true"/>
    "skipLibCheck": true // really ignore node_modules
    "rootDir": "src"
  },
  "include": ["src/pages/*"], // one folder at a time
  "exclude": ["node_modules", "build", "scripts"] // ignore node_modules
}
```

## Call To Action

Copy and Paste your JS code to [TypeScript Playground](https://typescriptlang.org/play/), play with the compiler options, see what it finds!

## Resources

More of My Talks

- [Cultural Learnings of Programming for Make Benefit Glorious Users of TypeScript](https://www.swyx.io/talks/programming-typescript)
- [A Gentle Introduction to React and TypeScript](https://www.swyx.io/talks/react-typescript)

Other People

- TypeScript for Non-Technical People: https://artsy.github.io/blog/2019/04/05/omakase-typescript/
- Types for People Who Don't Like Types: https://www.swyx.io/writing/types-already
- Types for People Who Think Tests are Good Enough https://css-tricks.com/types-or-tests-why-not-both/
- TypeScript for React Devs: https://github.com/typescript-cheatsheets/react-typescript-cheatsheet/
- Anders Hejlsberg reintroducing TypeScript: https://www.youtube.com/watch?v=ET4kT88JRXs (much of this intro cribs directly from there)
- Simple Courses
  - https://www.executeprogram.com
  - My Egghead course https://egghead.io/courses/design-systems-with-react-and-typescript-in-storybook
  - Mike North [TypeScript workshop on FrontEndMasters](https://github.com/mike-works/typescript-fundamentals)
- Books:
  - https://github.com/basarat/typescript-book
  - https://www.amazon.com/Programming-TypeScript-Making-JavaScript-Applications/dp/1492037656
