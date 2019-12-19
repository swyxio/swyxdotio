---
title: The introduction to TypeScript Generics you've been missing
slug: typescript-generics
categories: ['Tech']
date: 2019-08-30
published: false
decription: The explainer of TS Generics I want
---

_by [@swyx](https://twitter.com/swyx), with direct attribution and acknowledgement of [@andrestaltz](https://twitter.com/andrestaltz)'s [introduction to Reactive Programming](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754)_

> ⚠️Note: this is a work in progress - I am not even a TypeScript expert, I am merely [Learning In Public](https://www.swyx.io/writing/learn-in-public/) and jotting down non obvious, useful notes.

First thing to do is read [the official Generics guide from the TS Handbook](http://www.typescriptlang.org/docs/handbook/generics.html). I am not here to compete with the docs.

Based on this, I assume you know:

- where to place angle brackets
  - especially in classes and interfaces
- etc from the intro

---

Structure

- Why you can't avoid Generics
- Concepts
  - Assignable ([Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#subtype-vs-assignment))
- Constructor Generics
  - `Promise<>`
- Interface Modification Inbuilt Generics
  - Partial
  - Readonly
  - Pick
  - Omit
- Union Type Inbuilt Generics
  - Exclude (parallel to Omit)
  - Extract
  - NonNullable
- Union Type AND Interface Modification Inbuilt Generics
  - Record
- Extractor Inbuilt Generics
  - ReturnType
  - InstanceType
  - ThisType (ignore)
  - Required
- Know the Keywords
  - readonly
  - extends and implements
  - keyof
  - [Mapped Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html#mapped-types) -> partial
- Resources You Might Miss
  - TS Release notes https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html
  - Basarat on Generics https://basarat.gitbooks.io/typescript/docs/types/generics.html
  - 2ality https://2ality.com/2018/04/type-notation-typescript.html
  - sharifsbeat https://dev.to/busypeoples/notes-on-typescript-pick-exclude-and-higher-order-components-40cp
  - https://dev.to/busypeoples/-notes-on-typescript-react-and-generics-35c9
