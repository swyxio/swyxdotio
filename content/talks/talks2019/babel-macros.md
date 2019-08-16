---
title: I can Babel Macros (and So Can You!)
slug: babel-macros
topic: Babel
venues: JSConfHI
date: 2019-02-07
url: https://www.jsconfhi.com/schedule/
video: https://www.youtube.com/watch?v=1WNT5RCENfo
desc: An introduction to Babel Macros and how they can solve DX vs UX tradeoffs
description: Babel macros are a new way to solve DX and UX tradeoffs by metaprogramming to write code the way that is best for you while delivering code that is best for the user. Case in point, JSX - but why stop there? In this talk we explore how I wrote babel-blade to solve the double declaration problem in clientside GraphQL libraries, and how to get started writing your first babel macro!
cfp: Hi organizers! Babel is a core part of the JS ecosystem, and I think still very underexplored/underappreciated because of the perception that it is hard to get into and limited to transpiling JSX and TC39 proposals. With the increasing adoption of babel-plugin-macros (adopted by large ecosystems like React) the addressable space for babel has -exploded-. Essentially making it possible to move computation and metaprogramming from run time to build time making for faster apps -and- a better developer experience! I want to tell the world!!
---

Dan Questions:

- How will you deliver the idea to the audience?
  - Moana
- What is the one thing that you want people to take away from your talk?
  - Babel Macros allow you to write simple compile time libraries
- Why are you giving the talk? What is the emotional core? What do you _believe in_?
  - Compilers are the new Frameworks

Key questions:

- what is a macro
  - babel plugin plugins?
- growing a language - add vocabulary or change rules
  - extra language carries weight
  - bake it in
- cathedral (one design) vs bazaar (no plan)

Points I wanna cover:

- Act 1: Maui stealing Map
  - A brief history of JS
  - Growing a Language:
    - add vocabulary: library, npm
    - change rules: babel, tc39, typescript
  - cathedral vs bazaar
  - There's a third way
- Act 2: Food Problems?
  - Quick Intro to GraphQL
    - combinatorial explosion of APIs
    - colocating data needs
    - faster iteration
  - GraphQL DD problem
    - introduce graphql
    - https://codesandbox.io/s/x6pv6358q
    - adding a field
    - mistyping braces
    - adding aliases
- Act 3: Meet Maui
  - What if we had a babel plugin
  - Introducing ASTExplorer/Babel playground
    - Adding a field
    - braces? psh
    - aliases ezpz
  - yay! solved
- Act 4: Maui breaks Hook
  - Problems with Babel
    - implicit global scope
    - unpredictable conflicts
    - implicit - spooky action at a distance
    - needs config
    - have to test extensively to limit scope
- Act 5: Part the Sea
  - Babel Macros
    - GraphQL: Instead of small custom holes, Punch a big hole
    - Babel Plugin Plugins
    - Compile time Libraries
  - demo some other macros
  - reveal - some visual
  - Compilers are the next frontier
- Act 6: New Voyage
  - how to get started
    - AST explorer
    - familiarize yourself with an AST
    - babel handbook
    - kent dodds' workshops
  - Go Forth and Explore!

Resources:

- lisp macros: https://www.quora.com/What-are-Lisp-Macros
- sweetjs: https://www.sweetjs.org/
  - https://www.disnetdev.com/
  - https://www.disnetdev.com/static/papers/thesis.pdf
- babel blogpost: https://babeljs.io/blog/2018/08/27/7.0.0#babel-macros
- kent's post: https://babeljs.io/blog/2017/09/11/zero-config-with-babel-macros
- how to start with ASTs:
  - https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
  - https://blog.kentcdodds.com/write-your-own-code-transform-for-fun-and-profit-140abde9c5c6?gi=6a776f3c5327
- sunil's RFC:
  - https://github.com/threepointone/babel-macros/blob/master/README.md
  - https://github.com/facebook/create-react-app/issues/2730
- videos
  - 40min intro https://www.youtube.com/watch?v=nlAHtAQlFGk&t=1732s
  - using with CRA https://www.youtube.com/watch?v=1ERAJG9ILhk
  - codegen and preval https://www.youtube.com/watch?v=1queadQ0048&t=24s
  - writing custom babel https://www.youtube.com/watch?v=VicU_XwriWw
  - tiffany white? https://www.youtube.com/watch?v=1ERAJG9ILhk&list=PLyBGKxys5xmeNUgz-DGnfTwq8OGNPIFmb
- GraphQL Demo
  - https://dog-suspense-demo.glitch.me/
  - https://glitch.com/edit/#!/dog-suspense-demo?path=server.js:22:21
  - https://codesandbox.io/s/v39j8x450l

Moana:

- https://sixactstructure.com/story-structure-analysis-moana-movie/
- https://www.scriptmag.com/features/craft-features/screenplay-structure-and-outlining/breaking-down-story-structure-moana-infographic
- https://www.thelist.com/80930/things-notice-moana-adult/
