---
title: Why React is -NOT- Reactive
slug: react-not-reactive
topic: React, Reactivity
venues: ReactNYC, React Rally
date: 2018-08-22
url: https://slides.com/swyx/why-react-is-not-reactive
desc: diving into React's push-pull data flow and the importance of scheduling in React
video: https://www.youtube.com/watch?v=nyFHR0dDZo0
video2: https://www.youtube.com/watch?v=ZZoB5frlcnE
github: https://github.com/sw-yx/reactive-react
banner: './DkvCgB6XcAAeYcP.jpeg'
reddit: https://www.reddit.com/r/reactjs/comments/98lbpi/why_react_is_not_reactive_react_rally_2018/
feedback: https://shawnwang3.typeform.com/to/cC7sYD
cfp: https://gist.github.com/sw-yx/9bf1fad03185613a4c19ef5352d90a09
---

Nice Comments:

- "Hey! Just wanted to say as a dev who's aspiring to continuously improve that your talk was amazing."
- "enjoyed your talk! I've been really reading into message queue usage in microservices and so its nice to see it explained in front-end context on while that model makes sense. thanks!"
- "Loved your talk Shawn." - /u/stolinski 😍
- i thought it was awesome! thanks for representing!
- hey! awesome talk and nice to see a fellow FSA repping!

Twitter shoutouts!

- [Jem Young](https://twitter.com/JemYoung/status/1030896519115751424)
- [Kyle Shevlin](https://twitter.com/kyleshevlin/status/1030134445838233600)
- [Amberley Johanna](https://twitter.com/amberleyjohanna/status/1030135278663426048)
- [Michel Weststrate](https://twitter.com/mweststrate/status/1030140251640135680)
- [Kent C. Dodds](https://twitter.com/kentcdodds/status/1030132879827685376)
- [Matthew Gerstman](https://twitter.com/MatthewGerstman/status/1030132442768658432)
- [Brandon Dail](https://twitter.com/aweary/status/1030138785302896640)
- [Kurt Kemple](https://twitter.com/kurtiskemple/status/1030133624807378944)

# CFP for the Talk (Final Submission)

_This is the CFP for my React Rally talk, which was eventually accepted and given here: https://www.youtube.com/watch?v=nyFHR0dDZo0_

## Final Submission: Why React is _not_ Reactive

Functional-reactive libraries like RxJS make it easy to understand how data changes, giving us tools to declaratively handle events and manage state. But while our render methods _react_ to state changes, React isn’t _reactive_. Instead, we write imperative event-handlers, and trip up on gotchas like async setState and race conditions. Why? In this talk we build a Reactive React to show the difference between the "push" and "pull" paradigms of data flow and understand why React chooses to manage Scheduling as a core Design Principle, enabling awesome features like async rendering and Suspense!

**Theme**: This talk is a deep dive into React's core design principle around scheduling. Instead of abstract discussion, we make it accessible and real by exploring an alternate universe in which React was an FRP library and actually running into the problems React solves.

Optional theme song: [Cinderella - Don't Know What You Got (Til It's Gone)](https://www.youtube.com/watch?v=i28UEoLXVFQ)

We follow a three-act structure where we:

- start off in an alternate universe where the prototype Reactive React I have built -is- the current React version,
- and then talk about why we might want interoperability with imperative libraries and more control over scheduling to do things like batching and async rendering,
- in order to propose switching Reactive React from a "push" based Functional Reactive Programming paradigm to a "pull" based approach where computations can be delayed until necessary.

In other words, we use a "what-if" scenario to better understand and appreciate the Design Principles behind React!

Outline:

- Recapping Reactive React
  - A gentle introduction to Functional Reactive Programming
  - Your UI as a stream
  - Building a basic Reactive Component Class and reconciler
  - Demonstrating usage to solve race conditions and other event streams
- Problems with Reactive React
  - Poor interoperability with imperative libraries
    - example with d3js
  - Lack of control over scheduling
    - too easy for the user to accidentally lock up the screen
    - async rendering eg time slicing work would be all in userland
- A "pull" based React

  - the Pull vs Push data flow paradigms
  - exploring what the "pull" paradigm brings side by side with our prior examples
    - interop with imperative libraries
    - async rendering example: time slicing
  - Proposing a complete rewrite of Reactive React ;)

This talk was born out of my frustration at why it felt so unnatural to connect RxJS with React even though I intuited that they embody superficially similar paradigms: ultimately, stuff happens, state changes, and then the dom changes because the state changes. I was also inspired by [Paul O Shannessy's React Rally 2016 talk](https://www.youtube.com/watch?v=_MAD4Oly9yg) where he showed it was possible to "build react from scratch" and show all the key parts in a single talk. So I tried building a reactive version of React, and to my surprise, it wasn't hard. So it begged the question: why -isn't- React reactive?

And that is how I discovered the [Scheduling section](https://reactjs.org/docs/design-principles.html#scheduling) of React's Design Principles, where they explicitly joke that React should have been called "Schedule" because React does not want to be fully "reactive". The React team already thought about this, and _I had NO IDEA_.

I think a lot of React developers (like myself) often take the way things are for granted, and don't spend a lot of time understanding the reasons behind API choices and Design Principles like why React wants control over scheduling. This is why non obvious questions pop up like this [RFClarification: why is `setState` asynchronous](https://github.com/facebook/react/issues/11527). So maybe the best way to do it is explore the alternate universe and actually run head on into the issues that React's Design Principles solve.

I found this rabbit hole fascinating and I think others will too. By better understanding React's design principles, the React community can, on a philosophical level, 1) better understand how React works, 2) better design the broader React ecosystem to work with core React, and 3) better engage with the React core team when doing open source contributions.

## Prior talks

https://www.youtube.com/watch?v=GWCcZ6fnpn4

ReactNYC - Contributing To React (added by Dan Abramov to https://reactjs.org/docs/how-to-contribute.html#introductory-video)

https://www.youtube.com/watch?v=rPuwZJEA-9U

ReactNYC - Never Bundle React Again (lightning talk with some ideas on bundling)

https://www.youtube.com/watch?v=R6pSelWatP0

ReactNYC - React Suspense: The Interactive Experience (livestream link on Mar 28 - the edited video will be up after CFP submission deadline)

# CFP for the Talk (Second Draft)

_this is the second draft, after feedback from great mentors like Josh Comeau and Nader Dabit_

# Second Draft: Why React is not Reactive

## Abstract

**What is your talk about?**

Why DO we write imperative event handlers? You have to deal with an async `setState`, race conditions, and god forbid you forget to bind their context properly! Libraries like RxJS make async event streams first class citizens, giving us the tools to declaratively solve these issues. Since our `render` methods are just reactions to `state`, React _could_ be reactive. In this talk we actually build a Reactive React to show the difference between the "push" and "pull" paradigms of data flow and _finally_ understand why Interoperability and Control over Scheduling are core design principles of React.

## _for review committee_

## Details

**Explain the theme and flow of your talk. What are the intended audience takeaways? is there an outline you plan to follow?**

The theme is "Counterfactual History", and theme song: [Cinderella - Don't Know What You Got (Til It's Gone)](https://www.youtube.com/watch?v=i28UEoLXVFQ)

We follow a three-act structure where we:

- start off in an alternate universe where the prototype Reactive React I have built -is- the current React version,
- and then talk about why we might want interoperability with imperative libraries and more control over scheduling to do things like batching and async rendering,
- in order to propose switching Reactive React from a "push" based Functional Reactive Programming paradigm to a "pull" based approach where computations can be delayed until necessary.

In other words, we use a "what-if" scenario to better understand and appreciate the Design Principles behind React!

Outline:

- Recapping Reactive React
  - Building a basic Reactive Component Class and reconciler
  - Demonstrating usage to solve race conditions and other event streams
- Problems with Reactive React
  - Poor interoperability with imperative libraries
    - example with d3js
  - Lack of control over scheduling
    - too easy for the user to accidentally lock up the screen
    - async rendering eg time slicing work would be all in userland
- A "pull" based React
  - the Pull vs Push data flow paradigms
  - exploring what the "pull" paradigm brings side by side with our prior examples
    - interop with imperative libraries
    - async rendering example: time slicing
  - Proposing a complete rewrite of Reactive React ;)

## Pitch

**Why is this talk pertinent? What is your involvement in the topic? Explain why this talk should be considered and what makes you qualified to speak on the topic.**

This talk was born out of my frustration at why it felt so unnatural to connect RxJS with React even though I intuited that they embody superficially similar paradigms: ultimately, stuff happens, state changes, and then the dom changes because the state changes. I was also inspired by [Paul O Shannessy's React Rally 2016 talk](https://www.youtube.com/watch?v=_MAD4Oly9yg) where he showed it was possible to "build react from scratch" and show all the key parts in a single talk. So I tried building a reactive version of React, and to my surprise, it wasn't hard. So it begged the question: why -isn't- React reactive?

And that is how I discovered the [Scheduling section](https://reactjs.org/docs/design-principles.html#scheduling) of React's Design Principles, where they explicitly joke that React should have been called "Schedule" because React does not want to be fully "reactive". The React team already thought about this, and _I had no idea_.

I think a lot of React developers (like myself) often take the way things are for granted, and don't spend a lot of time understanding the reasons behind API choices and Design Principles like why React wants control over scheduling. This is why non obvious questions pop up like this [RFClarification: why is `setState` asynchronous](https://github.com/facebook/react/issues/11527). So maybe the best way to do it is explore the alternate universe and actually run head on into the issues that React's Design Principles solve.

I am far from the most qualified to speak on the topic, but I found this rabbit hole fascinating and I think others will too. By better understanding React's design principles, we can understand 1) what sets it apart from other libraries, 2) better design the broader React ecosystem to fit core React on a philosophical level, and 3) better engage with the React core team when doing open source contributions.

# CFP for the Talk (Original Draft)

this was the first draft, no feedback from anyone yet

## Original Draft: Why React is _not_ Reactive

## Abstract

**What is your talk about?**

Why DO we write imperative event handlers? You have to deal with an async `setState`, race conditions, and god forbid you forget to bind their context properly! Libraries like RxJS make async event streams first class citizens, giving us the tools to declaratively solve these issues. Since our `render` methods are just reactions to `state`, React _could_ be reactive. In this talk we actually build a Reactive React to show the difference between the "push" and "pull" paradigms of data flow and _finally_ understand why Interoperability and Control over Scheduling are core design principles of React.

## _for review committee_

## Details

**Explain the theme and flow of your talk. What are the intended audience takeaways? is there an outline you plan to follow?**

The theme is "Counterfactual History", and theme song: [Cinderella - Don't Know What You Got (Til It's Gone)](https://www.youtube.com/watch?v=i28UEoLXVFQ)

We follow a three-act structure where we:

- start off in an alternate universe where the prototype Reactive React I have built -is- the current React version,
- and then talk about why we might want interoperability with imperative libraries and more control over scheduling to do things like batching and async rendering,
- in order to propose switching Reactive React from a "push" based Functional Reactive Programming paradigm to a "pull" based approach where computations can be delayed until necessary.

In other words, we use a "what-if" scenario to better understand and appreciate the Design Principles behind React!

Outline:

- Recapping Reactive React
  - Building a basic Reactive Component Class and reconciler
  - Demonstrating usage to solve race conditions and other event streams
- Problems with Reactive React
  - Poor interoperability with imperative libraries
    - example with d3js
  - Lack of control over scheduling
    - too easy for the user to accidentally lock up the screen
    - async rendering eg time slicing work would be all in userland
- A "pull" based React
  - the Pull vs Push data flow paradigms
  - exploring what the "pull" paradigm brings side by side with our prior examples
    - interop with imperative libraries
    - async rendering example: time slicing
  - Proposing a complete rewrite of Reactive React ;)

## Pitch

**Why is this talk pertinent? What is your involvement in the topic? Explain why this talk should be considered and what makes you qualified to speak on the topic.**

This talk was born out of my frustration at why it felt so unnatural to connect RxJS with React even though I intuited that they embody superficially similar paradigms: ultimately, stuff happens, state changes, and then the dom changes because the state changes. I was also inspired by [Paul O Shannessy's React Rally 2016 talk](https://www.youtube.com/watch?v=_MAD4Oly9yg) where he showed it was possible to "build react from scratch" and show all the key parts in a single talk. So I tried building a reactive version of React, and to my surprise, it wasn't hard. So it begged the question: why -isn't- React reactive?

And that is how I discovered the [Scheduling section](https://reactjs.org/docs/design-principles.html#scheduling) of React's Design Principles, where they explicitly joke that React should have been called "Schedule" because React does not want to be fully "reactive". The React team already thought about this, and _I had no idea_.

I think a lot of React developers (like myself) often take the way things are for granted, and don't spend a lot of time understanding the reasons behind API choices and Design Principles like why React wants control over scheduling. This is why non obvious questions pop up like this [RFClarification: why is `setState` asynchronous](https://github.com/facebook/react/issues/11527). So maybe the best way to do it is explore the alternate universe and actually run head on into the issues that React's Design Principles solve.

I am far from the most qualified to speak on the topic, but I found this rabbit hole fascinating and I think others will too. By better understanding React's design principles, we can understand 1) what sets it apart from other libraries, 2) better design the broader React ecosystem to fit core React on a philosophical level, and 3) better engage with the React core team when doing open source contributions.
