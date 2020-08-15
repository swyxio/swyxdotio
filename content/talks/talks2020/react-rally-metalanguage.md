---
slug: react-rally-metalanguage
title: Growing a Meta-Language
topic: React
venues: ReactRally
date: 2020-08-15
url: https://www.reactrally.com/speakers
desc: My React Rally 2020 talk on Dialects, Distros, Devtools, and the React SFC idea
video: https://www.youtube.com/watch?v=18F5v1diO_A
slides: https://docs.google.com/presentation/d/1sBb7KjhSOiONML61fnYwkVI-7yzJCoP-Zgs6E37T-nY/edit?usp=sharing
description: 7 years after release, React reaches millions of developers and billions of users. Its ideas have influenced other frameworks, even those in other languages like Swift UI and Jetpack Compose. What’s next? The community has been hard at work innovating in React formats, metaframeworks, and developer tooling. This fits an established pattern of how developer languages grow, and likely forms a roadmap for React in the Third Age of JavaScript.
---

## Links from the Talk

Important Links:

- talk video on my channel: https://www.youtube.com/watch?v=18F5v1diO_A
- slides: https://docs.google.com/presentation/d/1sBb7KjhSOiONML61fnYwkVI-7yzJCoP-Zgs6E37T-nY/edit?usp=sharing
- livestream: https://www.youtube.com/watch?v=IRSjD2A1VuA
- proposals: https://github.com/react-sfc/react-sfc-proposal
- my proposal: https://github.com/react-sfc/react-sfc-swyx
- demo: https://github.com/sw-yx/rollup-react-boilerplate

Talks you should check out after this:

- Creating Create-React-App: https://www.swyx.io/speaking/creating-cra/
- Getting Closure on Hooks: https://www.swyx.io/speaking/react-hooks/
- Why React is -NOT- Reactive: https://www.swyx.io/speaking/react-not-reactive/
- Concurrent React from Scratch: https://egghead.io/lessons/react-egghead-talks-concurrent-react-from-scratch

## My original talk plan

- script: https://gist.github.com/sw-yx/b30d7e6bdcc2575f8f02d7fa8afcb587
- Dialects / formats
	- globals
	- style jsx
	- mdx
	- typescript
	- sfc - redwood and storybook
	- coffeescript react, reasonreact
	- jswyx
	- FORMS? ANIMATIONS? NPM CSS PUBLISH?
	- grammar of react - cWM
	- mix syntax rather than create syntax
- Distros / environments
	- bundles of other things
	- RN - expo
	- fullstack react?
	- small apps - preact
	- large apps - server integration
- Devtools
	- Computer aided development
	- Code should not be a 1 way street?
	- TS is the first sign
	- running tests is another -> TDD
	- Compilers -> Language servers
	- Toolchain
	- RN Flipper
	- visual designer tools, react builders

"A language is a dialect with an army and a navy."

core ideas
- cathedral vs bazaar vs shopping mall
- big A, bug(O)
- what got us here wont get us there
- fewer LOC

things i like
- - learnable programming



ideas
- seb: DSL lose to GPLs.
- if you structure your code to use patterns instead of libraries, it is much easier for the next person to read your code and understand what's going on. It's much easier to recover from no abstraction than the wrong abstraction.
- abstratction adds overhead to what a new coder needs to learn jsut to get up to speed w your codebase.
- it can be a lot easier to upgrade verbose repetitive code than it is to upgrade an abstraction.
- large app on the wrong framework - try to upgrade but fail bc need to first understand the underlying framework
- looking ugly is ok if it doesnt lead to bugs.
- remove as much complexity as you add
- functional approach means can drop so much more surface area
- better fat single layer with small api than many small layers?
- react favors explicit apis over built in magic
- difficult to follow code taht depends on implicit bubbling of events
- saving typing is not good enough for an abstraction
- standard features is decoupling between libraries
- lets put JS on a diet