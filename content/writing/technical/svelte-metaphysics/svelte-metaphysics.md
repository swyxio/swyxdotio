---
title: "Notes on 'Metaphysics and JavaScript'"
slug: svelte-metaphysics
categories: ['Tech']
banner: ./metaphysics1.jpg
date: 2019-08-28
---

Rich Harris gave an excellent unrecorded talk tonight at [useReactNYC](http://usereact.nyc) on [Metaphysics and JavaScript](https://twitter.com/Rich_Harris/status/1166342346323238912). Much of it was above my paygrade, and I don't have access to his slides, but I love every opportunity to dissect Rich Harris insights so I figured I would jot down some notes from (my very holey) memory, in my words.

Because this talk had a lot of flair, and I am trying to learn how to package my talks better, I break it up into content vs style points, while acknowledging that it isn't Rich's intention to have these evaluated separately but its my blog so I call the shots.

## Crux of the Argument

- "UI as a function of State" is a [leaky abstraction](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/)
  - Immediate mode rendering is nice for game development (he showed a beautiful 500 line 3d animated scene render example where this does work)
  - BUT the DOM fundamentally is stateful (especially where it comes to transitions as time is seldom explicitly accounted for)
  - React tries to provide an abstraction with a runtime patching DOM diffs. This is good. to a point.
  - **Why not stop fighting the stateful DOM and embrace it with templates, reactivity, and a compiled approach?**
    - leads to the objectively better things he's talked about in prior talks like speed, size, less code
  - But this core argument is why Svelte is _subjectively_ better
    - also it has scoped css, animations, 2 way binding, a11y linting built in.
- Aside: React and functional programming/purity (cf. [wycats on sebmarkbage comment](https://mobile.twitter.com/wycats/status/1161464944648318977))
  - "People are horny for functions". FP is too seductive.
  - React used to have lifecycles in class components. Made it feel OO.
  - React/Eucalyptus Avatar pulled off "syntatical jiu-jitsu" with Hooks, made everything a result of render, even side effects (c.f. [ryanflorence comment on synchronizing with state](https://mobile.twitter.com/ryanflorence/status/1125041041063665666))
  - "Functions all the way" is very nice, but still has impedance mismatch (see above). Also stale closure problems.

I think I noted down all the substantive points in the talk here. A few of us reported losing the thread of the argument particularly in the 180 reversal from admiring immediate mode for gamedev to arguing that DOM's should be retained mode, but this was clarified in post talk drinks.

## Style Points

This talk was heavily wrapped up in a delightful package of metaphysical discussion, involving:

- The [Ship of Theseus](https://en.wikipedia.org/wiki/Ship_of_Theseus) - I don't remember what the analogy was here
- This Heraclitus quote, where I think the message was time matters, UI = f(State) is an illusion

![heraclitus](./heraclitus.jpg)

- Plato's cave which I found the most apt, which was the attraction of developers around the idea of components, but looking at React and thinking that this is the ultimate expression of that ideal, when in reality the core idea can be done without looking through the blurry shadows of FP

![platocave](./platocave.jpg)

I found this approach extremely fun for a meetup talk, especially as someone familiar with all the allegories, but for someone new to any of these it might be too much cognitive load to juggle both the meta and the message.

There were also two other stylistic points I loved in the introduction.

Rich started by recapping his 3 prior talks at [JSConfEU](https://www.youtube.com/watch?v=qqt6YxAZoOc), [YGLF](https://www.youtube.com/watch?v=AdNJ3fydeao), and JSCamp Barcelona (not yet recorded, but meeting Jenn Creighton was the proximate cause of coming to speak at useReactNYC). I dont remember what exactly was said but each talk was neatly wrapped up and contrasted against each other in one sentence each and I thought that this was a very nice shorthand for longtime observers ("Previously on...") as well as homework for newcomers.

One of his last contrast points, that "Svelte is objectively better than React" also served as the context setter for this talk, that "Svelte is subjectively better than React". A bit of a troll framing of course, but very effective.
