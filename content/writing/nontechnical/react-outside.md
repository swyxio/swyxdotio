---
title: To Understand Concurrent React, Look Outside React
subtitle: 3 Talks from Outside React
slug: react-outside
categories: ['React']
date: 2020-02-12
---

## Table of Contents

## TL;DR

Watch these 3 talks:

- [Raymond Hettinger's Keynote on Concurrency](https://www.youtube.com/watch?v=9zinZmE3Ogk) in Python
- [Daan Leijen's Asynchrony with Algebraic Effects](https://www.youtube.com/watch?v=hrBq8R_kxI0&app=desktop) in Koka
- [Let’s Get Lazy: Explore the Real Power of Streams by Venkat Subramaniam](https://www.youtube.com/watch?v=F73kB4XZQ4I) in Java/Haskell/Scala

## Why Even Try

Something I struggled a lot with when [first trying to understand React Suspense](https://sw-yx.js.org/2018/03/01/that-react-suspense-demo) was the onslaught of jargon that suddenly seemed relevant:

[![https://pbs.twimg.com/media/DZWu8i0XkAEx4mr?format=jpg&name=medium](https://pbs.twimg.com/media/DZWu8i0XkAEx4mr?format=jpg&name=medium)](https://twitter.com/swyx/status/978880884031066112?s=20)

For most of us, this was completely alien, and for many of us today, it still is. You don't need to know these concepts and jargon to *use* Concurrent React, just like you don't need to know how a car works to drive one. 

But for new abstractions, it is always wise to look under the hood if you can, so that **when the inevitable abstraction leak occurs, you know what to do**. 

More to the point, if you are going to advocate for refactoring to use React Suspense in your company, you will want to convincingly *explain* what it is and how it does what it does, to bosses that don't care and have actual issues with money attached for you to pick up. 

2 years on from [JSConf Iceland](https://www.youtube.com/watch?v=nLF0n9SACd4), this is the final, arduous challenge for React Suspense.

## Why Look Outside React

A lot of us will try to explain Concurrent React by comparison to existing frontend paradigms. But you can only watch Andrew get frustrated at spinners [again](https://www.youtube.com/watch?v=ByBPyMBTzM0) and [again](https://www.youtube.com/watch?v=z-6JC0_cOns) and [again](https://www.youtube.com/watch?v=xrLIeSYRKIc) so many times. Of course, [like me](https://www.swyx.io/speaking/react-suspense/), you can try to make memes out of it, but there's only so much you can do, and I have a strong suspicion that most bosses won't care.

My insight is this: **We're not good at this because we're new at this.** 

But you know who's gotten good at explaining these concepts? **Non-frontend developers**. Why? Because they've had to, and because they've been using this stuff a lot longer than we have.

You know what you get when you get when you google [Fibers](https://en.wikipedia.org/wiki/Fiber_(computer_science)) and [Time Slicing](https://en.wikipedia.org/wiki/Preemption_(computing)#Time_slice)? Links to Operating System articles! Because that's where we took the ideas from! Maybe we should look at how *those* people explain their ideas! (except please do it [more coherently than I did](https://www.swyx.io/speaking/react-not-reactive/)).

## Looking Outside

I was reminded of this today when watching some excellent talks from outside the JavaScript world today. 

I will recommend them to you here, in brief and completely insufficient context - I just want to leave pointers.

### Learning Async from the Python world

First was [Raymond Hettinger's Keynote on Concurrency](https://www.youtube.com/watch?v=9zinZmE3Ogk) in Python. In this talk he discusses two contrasting concurrency models - [threading vs async](https://pybay.com/site_media/slides/raymond2017-keynote/intro.html#threads-vs-async). 

Here he explains Threads and why we don't like them:

> Threads switch preemptively. This is convenient because you don’t need to add explicit code to cause a task switch. The cost of this convenience is that you have to assume a switch can happen at any time. Accordingly, critical sections have to be guarded with locks.

Yes, JS is single-threaded, except [not really](https://www.red-gate.com/simple-talk/dotnet/asp-net/javascript-single-threaded/). You've encountered threads in React when you run into race conditions resulting from separate components fetching data independently, for example. And to solve them, you've had to [lift state up](https://reactjs.org/docs/lifting-state-up.html) in order to resolve the race condition. That, to me, sounds like a "lock".

[Here's Seb on "working around the lack of threads"](https://github.com/facebook/react/issues/7942#issuecomment-254984862).

Now Async:

> the cost of task switches is very low. Calling a pure Python function has more overhead than restarting a generator or awaitable. This means that async is very cheap. **In return, you’ll need a non-blocking version of just about everything you do**. Accordingly, the async world has a huge ecosystem of support tools. **This increases the learning curve.**

Yup, the nonblocking version of everything we do, otherwise known as our [fallback](https://reactjs.org/docs/code-splitting.html#reactlazy). And, yeah, it increases the learning curve. For example, a stated goal of Concurrent React is to [bring Algebraic Effects to our rendering work](https://github.com/reactjs/react-basic#algebraic-effects), which makes restarting rendering even cheaper than restarting a generator. 

Confused already? I know I am. What even are Algebraic Effects?

### Learning Algebraic Effects from Koka

The second talk is [Daan Leijen's Asynchrony with Algebraic Effects](https://www.youtube.com/watch?v=hrBq8R_kxI0&app=desktop) in Koka.  This is the talk that made them accessible to me. Because I like [two word](https://www.swyx.io/writing/two-words) summaries, I mostly go with "resumable exceptions". 

However this glosses over an important design goal, which is able to write components without worrying about what is in their children or siblings. That's how you get non-leaky abstractions. [Sophie](https://twitter.com/sophiebits) calls this [facilitating local reasoning](https://sophiebits.com/2020/01/01/fast-maintainable-db-patterns.html), which you again see if you look at [DataLoader](https://github.com/graphql/dataloader) from the GraphQL world.

All good. But wait, didn't Raymond Hettinger also say about Async:

> Async switches cooperatively, so you do need to add explicit code “yield” or “await” to cause a task switch.

Where is the cooperative, voluntary yielding in React Suspense? We don't write it or see it!

### Learning Lazy Eval from the Java world

Third talk is [Let’s Get Lazy: Explore the Real Power of Streams by Venkat Subramaniam](https://www.youtube.com/watch?v=F73kB4XZQ4I) using Java, but also Haskell and Scala.

For a while, I had a problem with Concurrent React being described as "cooperative scheduling" because, as Wikipedia says:

> Processes voluntarily yield control periodically or when idle or logically blocked in order to enable multiple applications to be run concurrently. This type of multitasking is called "cooperative" because **all programs must cooperate for the entire scheduling scheme to work**. 

But there is no explicit cooperation going on in React! Or is there?

I think this is where [React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) and [React Fiber](https://www.swyx.io/speaking/react-from-scratch/) come in. Every component is a Fiber, and every Fiber is a unitary piece of work whose children and siblings can be rendered later (aka Time Slicing), and can be committed later too (aka Suspense). 

As Venkat quotes in his talk, "*We can solve any problem by introducing an extra level of indirection*". Concurrent React achieves maximum responsiveness by rendering each Fiber bit by bit, lazily (hence the stark difference in the [Stack vs Fiber Sierpinski Reconciler demo](https://claudiopro.github.io/react-fiber-vs-stack-demo/)). It *also* solves for the API design issue of Algebraic Effects and one-ups [other scheduling frameworks](https://github.com/facebook/react/issues/7942#issuecomment-254987818) by introducing this extra layer of indirection called React Fiber.



