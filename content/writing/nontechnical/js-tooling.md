---
title: Why JavaScript Tooling Sucks
slug: js-tooling
description: JavaScript Tooling is just too hard to use, and it's not your fault.
categories: ['Tech', 'JavaScript']
date: 2019-09-15
---

**JavaScript Tooling is just too hard to use, and [it's not your fault](https://www.theverge.com/2017/5/25/15686870/walt-mossberg-final-column-the-disappearing-computer).**

If you clicked on this title ready to agree, you are part of the problem. Don't worry, so am I. I work on JavaScript Tooling and I think my tools can be a lot better. "[Let he who is without sin](https://en.wiktionary.org/wiki/let_him_who_is_without_sin_cast_the_first_stone)" and all that.

If you hate-clicked on this title ready to do an Epic Takedown™ of me, don't worry, I don't 100% agree with the premise of the title either. But you can probably find examples in your life where tooling sometimes _does_ suck. As JavaScripters, we spend a lot of time learning how to fix and paper over our tools and less time asking why. (This is rational behavior and the rest of this post proposes some reasons)

If you clicked on this title with an open mind, you probably don't exist, but welcome anyway.

These are hypotheses, not presented as objective facts. **I'm trying to explain, not justify**. All my blogposts come with an implicit "In My Current Opinion" disclaimer and I am constantly looking to change my mind (someday I'll get around to putting this in a "Terms of Use" because some people don't understand the social contract around personal blogging and [epistemic status](https://devonzuegel.com/post/epistemic-statuses-are-lazy-and-that-is-a-good-thing)). There are also massive benefits to JS tooling I don't cover.

## Table of Contents

## JavaScript wasn't made for this

_JavaScript Tooling Sucks because JavaScript wasn't designed with business critical tooling and apps in mind_

JS was famously [created in 10 days](https://en.wikipedia.org/wiki/JavaScript), and back then almost nobody saw that [software would eat the world](https://a16z.com/2011/08/20/why-software-is-eating-the-world/) and then [browser software would eat operating system software](https://blog.jurgen.ca/post/46428131771/a-poorly-debugged-set-of-device-drivers/amp) and then [JavaScript would move out of the browser into operating systems](https://www.youtube.com/watch?v=ztspvPYybIY).

JS' culture derives very much from its original design decisions. Being easy to get up and running opened doors for many programmers, but with it come all the flaws, right down to undefined property access not causing a runtime error and causing the famous "`undefined` is not a function" errors. Why I assert original sin has cultural weight is because of the enormous, sometimes morally charged, resistance to adding compile time checks for JavaScript. There are even people who [refuse to use Prettier](https://mobile.twitter.com/evilpingwin/status/1158404492586573824).

[Web Assembly](https://hacks.mozilla.org/2017/02/a-cartoon-intro-to-webassembly/) may one day free up people who rather not use JavaScript from using JavaScript, but until then, they're stuck here with the rest of us.

Which leads to...

## Massive Community

_JavaScript Tooling Sucks because it wasn't made for just you alone_

As the largest non-spreadsheet programming language on Earth, you are guaranteed to have near-religious schisms in everything from code style to software delivery to testing approaches. One of the chief tools is even called Babel, for crying out loud! (This is deliciously ironic [given the story it references](https://en.wikipedia.org/wiki/Tower_of_Babel), on many layers)

A huge community is usually a plus, but people also forget it can have downsides. Having to make everybody happy when it literally means EVERYBODY is a very different and sometimes conflicting proposition from "do one thing well".

The simplest way to make people happy is to add config after config, so that's what we do. However this way lies config hell and still doesn't help tools interoperate. I like Jared Palmer's approach of [paying attention to composition and the 80% usecase](https://palmer.net/blog/render-control). More people should also try tools like [`patch-package`](https://www.npmjs.com/package/patch-package) for maintaining low cost forks.

> 📺Dan Abramov tells the story of [how the Melting Pot of JavaScript came to be](https://increment.com/development/the-melting-pot-of-javascript/) (you can watch the [talk version here](https://www.youtube.com/watch?v=G39lKaONAlA)) and how the way out is less configuration and more toolkits

A huge community is great, until it leads to...

## Moving Target, Moving Goalposts

_JavaScript Tooling Sucks because it wasn't made for one target runtime_

We don't agree on whether JS libraries should work in both the browser and in Node.

We don't agree on whether JS tools should [transpile their own dependencies](https://github.com/facebook/create-react-app/issues/1125#issuecomment-264214478).

We don't agree on how to deal with legacy browsers. As time goes on, this will become less and less of an issue, but we're still in the thick of it. [Create-React-App has had ongoing debates about differential serving for 2 years](https://github.com/facebook/create-react-app/search?q=nomodule+is%3Aissue&type=Issues).

We don't agree on how to test our tools, if they're tested at all. Kent C Dodds is [doing a lot here with Testing JavaScript](https://testingjavascript.com/) but vast swathes of our tools are completely untested, much less tested on different environments like in Windows (sorry!). Try arguing if we are better off having no tool than having an untested (but working!) tool.

Ultimately, we don't agree on the problems our tools are meant to solve. At one extreme, this manifests as beginners asking what's the difference between A and B (which are frequently mentioned as alternatives) and their maintainers replying that A and B are "orthogonal". At the other extreme, this causes experts in A (who care a lot about one thing) to yell at experts in B (who are trying to do something else).

The moment we even come close to agreeing on something, goalposts move, and something else comes up to disagree on. We rather tear each other down on small things we disagree on, more than support and remind each other about the big things we all want, causing burnout.

Which brings me to...

## No One is in Charge

_JavaScript Tooling Sucks because it is bottom-up, not top-down_

JavaScript is more than just the language, yet there is no "Javascript SDK" or "standard library".

[TC39](https://github.com/tc39) governs the language (it has flaws - I can't find a source but I think I recall someone commenting that wholistic language design shouldn't be approached on a per-feature, annually scheduled basis), but nobody controls tooling. npm had a shot, but now nobody wants them in charge of anything else. Node is extraordinarily successful, but is so mired in original sin [its creator is now working on a replacement](https://www.youtube.com/watch?v=M3BM9TB-8yA). In the spectrum of [Cathedral vs Bazaar](https://en.wikipedia.org/wiki/The_Cathedral_and_the_Bazaar), JavaScript embraces the Bazaar to the extreme (it also isn't alone, Python is similar, although [Anaconda](https://www.anaconda.com/distribution/) makes it a bit more cathedraic).

Yes, we will have a new frontend framework every so often (not every day, nor every month, stop being disingenuous, **it isn't funny making jokes about dimissing people's work without even looking at it**). Yes, we have 3-4 different bundlers that all do different things. Yes we have [file formats nobody uses](https://2ality.com/2017/05/es-module-specifiers.html) (yet?). Yes, we download [3-liner packages 93 million times a month](https://github.com/jonschlinkert/isobject/blob/master/index.js).

This is extremely wasteful and duplicative and [insecure](https://medium.com/hackernoon/im-harvesting-credit-card-numbers-and-passwords-from-your-site-here-s-how-9a8cb347c5b5) and exhausting and hard to learn.

**We know.** It's also the best way to ensure we have tried and tested ideas before committing them forever to some monolithic thing everyone has to use. If some tool goes bad, we have another waiting in the wings. If the alternative thing is materially better, the incumbent will initially ignore it but eventually try to catch up. It may fail to do so.

I'm not saying JavaScript is a real, perfect-information meritocracy. ["Use the Right tool for the job" is a cop-out](https://twitter.com/swyx/status/1171549189064613888) - the vast majority of us don't have time or risk tolerance to try anything other than what everyone else uses.

Which in fact means that we don't bother checking if we're using the right tool, and can't because our tools use thousands of tools...

## We _Can't_ Take Ownership of Our Tools

_JavaScript Tooling Sucks because it is stacks on stacks of brittle abstraction_

I'll break the writing style of this column so far by relating a recent incident. I can do this because I don't have an editor tut-tutting at me. If I lose you, though, [let me know.](https://twitter.com/swyx)

By default, all `npm install`s assign packages with the caret (`^`) which matches minor and major versions of a package, assuming that packages follow [semver](https://www.jvandemo.com/a-simple-guide-to-semantic-versioning/). However, [semver is a social contract](https://twitter.com/sophiebits/status/1063601210144387072) - trivially, if any users rely on bugs, then a bugfix is a breaking change, so semver relies on the definition of a bug, which has the very technical definition of "software not working as we thought we intended". More importantly, semver isn't enforced in any meaningful way when published, so it can't be relied upon when downloading. Yet that is exactly what we do when we use the caret by default.

[`event-stream` happened](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident), and a package was removed even though it was on the register, so all JS tooling and apps built on that tooling started failing. Package management security is above my paygrade, but the reason it had so much _impact_ was because of a single character: `^`.

All my continuously deployed JavaScript builds broke that day, because `flatmap-stream` depended on `event-stream`, and that is in `fs-events`, which everyone depends on, so [Vue](https://github.com/vuejs/vue-cli/issues/3039), [React](https://github.com/facebook/create-react-app/issues/5908), [Angular](https://github.com/angular/angular/pull/27274), and probably everyone else went down. How could a supposedly competitive, massive, varied ecosystem have a single point of failure? I panicked a bit, but knew how to fix it. I imagine a lot of beginners were turned off that day. I imagine some people (like me) had demos to show people my software and ran into this at the first try and immediately got a bad impression like it was my fault.

It kind of is, but it kind of isn't. npm could fix my scenario above by making default installations pinned versions (apparently the Go ecosystem does this), but that doesn't address the real root of the problem - I didn't know what I was using. That day was the first day I even heard of `flatmap-stream`.

Here is where I get heretical. I'm supposed to tell you it's my fault. That implies it's your fault too, if you've had it happen to you. I originally titled this section "We _Don't_ Take Ownership of our Tools".

I changed my mind.

A lot of prominent developers like to say that you should treat `node_modules` like your own code, but that just doesn't ring true, and makes it sound like it's your fault. It's near impossible ([Brian from Begin](https://twitter.com/brianleroux) comes to mind as an exception) to own your entire dependency chain all the way down. [Thomas Young was the Last Man Who Knew Everything](https://en.wikipedia.org/wiki/The_Last_Man_Who_Knew_Everything) and he died in 1829.

Rich Harris, He who Kicks Hornet Nests for Fun, also pointed out [the flaws of the small modules approach](https://medium.com/@Rich_Harris/small-modules-it-s-not-quite-that-simple-3ca532d65de4). In particular, he picks on discoverability and software integrity: "**Everyone has an idea about how to make it easier to find needles in the haystack, but no-one bothers to ask what all this hay is doing here in the first place.**" He was largely ignored - how do you stop an absolutely massive community in its tracks?

Even if you're the model developer, you are not an island. You will work with people who are not model developers, and who don't own their tools. Therefore, it is a statistical eventuality that you will start using tools you don't know you use. I call this the Hashimoto lemma, after one of [Mitchell Hashimoto's reponses on Why Multicloud](https://www.reddit.com/r/devops/comments/91afzz/why_multicloud/?utm_source=share&utm_medium=ios_app).

Basically, if our entire toolchain/productivity strategy relies on owning every dependency just to be reliable, we should probably explore other ideas. (To be clear: I don't have one. Just thinking out loud.)

## We Treat Toolmakers Like Tools

_JavaScript Tooling Sucks because we don't make them and we don't treat people who make them like people_

You don't have to know _everything_, but that doesn't mean not caring about the makers behind the tools you use. But this is a real problem, and it is an _epidemic_.

It may not feel that way, but you are probably an extreme outlier if you spend significant time making JavaScript tooling. The download numbers don't lie. TypeScript has 412. Webpack has 547 contributors. Babel has 757. React has 1331. All of these tools have at least 3 orders of magnitude more users than contributors. And you know there's even a power law within _that_ where most of those contributors just fixed typos and docs (not that this is bad at all!).

If you are a regular JavaScript Jane or TypeScript Tom, you don't work on tooling. You don't even know or care who the maintainers of the tools you use are. You work at a Fortune 500 company, or a struggling startup, or a flashy digital agency, or you're between jobs and trying to change careers, and you just want what everyone wants: _get stuff to show up on screen_!

This asymmetry means that a _vast_ other-ness applies when users of tools interact with makers of tools. And because of the relative knowledge difference, as well as just general support goodwill, it's the makers of the tools who often have to bend over backwards to help users diagnose and even fill out basic bug reports.

This problem extends even more pervasively than bad bug reports, though. JavaScript educators make millions teaching how to use tools, while the toolmakers beg for dollars on Patreon and GitHub. Engineering managers and CTOs make _multiple_ millions while being "above all this" and obsessing over [pretty charts](https://www.thoughtworks.com/radar/tools). If you've ever, like them, had a "wait and see" approach to tools instead of diving in and checking it out and helping, you've been a part of the problem, like I have. Tools, especially baby ones, don't just get better on their own accord. They need **you** to get better.

What's worse is, _there is a rational explanation for all of this_. There _really is_ value in putting together a bunch of things you didn't make and selling it as a cohesive package. It _really is_ wise to be more cautious in some tech choices. But for goodness sake don't stop trying things out and contributing back. And don't ever feel smug about treating toolmakers like tools.

It's endemic that more junior engineers work on tools while senior engineers tend to sit back and thing about bigger picture things. However I wish we could pass knowledge down better. It's too glib to say "back in my day we knew how to do software _right_! Kids these days just don't know how to code!" (Usually leading to some gatekeeping on bootcamps and degrees) It's unrealistic to expect senior people _don't_ move beyond just thinking about tools, because there is so much more to software production and management than tools. But I wish we had better ways to pass down and communicate lessons learned, instead of being snarky on social media.

> 📺Jonathan Blow on [Preventing the Collapse of Civilization](https://www.youtube.com/watch?v=pW-SOdj4Kkk) - and [subsequent discussion from Rich Harris and others](https://mobile.twitter.com/Rich_Harris/status/1139967668662996995)

Of course, nobody's going to change their behavior just because I wrote this, so that leads toolmakers to say... [f\*\*\* you, pay me](https://vimeo.com/22053820).

## Funding

_JavaScript Tooling Sucks because we are still learning how to make great free open source_

I saved the biggest for last. [JavaScript is 97% open source](https://medium.com/npm-inc/this-year-in-javascript-2018-in-review-and-npms-predictions-for-2019-3a3d7e5298ef#49d6), so open source's problems are JavaScript's problems.

> 🗣️As an aside, 97-99% is a fun recurring number in anything to do with the commons. It corresponds to the ratio between consumers and creators of content. And also the amount of DNA we share with chimps.

The problems with open source maintainership are well documented. There are many, many, many failed experiments with getting funding for open source. (To be clear, a lot of them were bad ideas to begin with) After one of the most recent attempts, [Feross concluded that "An open source maintainer is a startup founder but with none of the upside."](https://twitter.com/feross/status/1172185645705359362) This rings very true, although occasionally open source maintainers do eventually create startups around their work.

Solutions I do dislike:

- Advertising business models (on docs and in my console)
- Begging on Patreon
- Begging on Github
- any form of financial contribution where developers pay out of their own pockets instead of their employers (if applicable)
- Bounty systems like Gitcoin

Solutions I do like:

- Training (aka React Training)
- Managed Service (Laravel Forge, Meteor Galaxy)
- I highly recommend [Joseph Jacks' thinking on "Open Core"](https://medium.com/open-consensus/2-open-core-definition-examples-tradeoffs-e4d0c044da7c) and [OSS business models](https://medium.com/open-consensus/3-oss-business-model-progressions-dafd5837f2d). However, do note that all of these are forms of trading off increasingly less open cooperation and software for more money.

![OSS business models](https://miro.medium.com/max/1541/1*xzERBcXu7PtNbzZ8wKM9mQ.png)

Meditations on economics of open business models aside, expecting extrinsic motivation to beat intrinsic motivation is a bad bet. But we can't help it, we're addicted to it. [Dan Pink's Drive](https://www.amazon.com/Drive-Surprising-Truth-About-Motivates/dp/1594484805) puts it best:

![Extrinsic promises destroy intrinsic motivation](https://pbs.twimg.com/media/DXF5WoZW4AEfnFW?format=jpg&name=medium)

With the important caveat that basic needs are taken care of, I do fundamentally agree with DHH that **intrinsic motivation is the best way to create sustainable open source**. You may be financially successful with the OSS business model you pick, but if you are driven by external incentives, then at some point down the line your external incentives lead you to make choices and compromises that aren't to do with solving the problem you set out to solve.

> 📺Do yourself a favor and watch or read DHH's RailsConf 2019 keynote on [Open Source Beyond the Market](https://m.signalvnoise.com/open-source-beyond-the-market/) to understand.

## It doesn't all suck

_JavaScript Tooling doesn't all suck and is much better than we used to have!_

I wanted to leave you with something positive so it's clear I'm not just indiscriminately shitting on everything. There is a LOT of love for our tools today. Just in [the 2018 State of JavaScript alone](https://2018.stateofjs.com/awards/) you can see how Jest, Express, GraphQL are almost universally loved, and I can't find any mention but I'm pretty sure Yarn and Prettier are in there too.

In the most recent [State of JavaScript survey](https://2018.stateofjs.com/opinions/), _all_ the opinion polls were trending more positive. Make of that what you will:

![https://pbs.twimg.com/media/EEij9ttXoAEarsq?format=jpg&name=large](https://pbs.twimg.com/media/EEij9ttXoAEarsq?format=jpg&name=large)

As to counter the individual points I made:

- **Design**: JavaScript the language got a lot more serious and usable with ES6, so it is being designed as we go along. Acceptance of TypeScript has also come along nicely and stands at 63% of npm users (not that that is the solution to everything but it is better than what we had).
- **Community**: We are getting better at establishing Codes of Conduct, GitHub implemented issue templates and reactions to prompt people to work together better. We are constantly learning about better composition and abstraction patterns in the highest stress-test of these patterns there has ever been
- **Moving Target**: Increasing adoption of evergreen browsers are helping to offer a stable target. Although cross-browser inconsistencies still necessitate abstraction layers, their differences are far smaller and have less impact on tool choice then ever before.
- **No One in Charge**: This is a feature, not a bug.
- **Ownership**: I don't have ideas here.
- **Toolmakers**: We are passing on _some_ knowledge. [Anders Hejlsberg](https://en.wikipedia.org/wiki/Anders_Hejlsberg), with his 35 years of language and tooling experience, is now working on TypeScript and training a generation of tooling engineers. We are actively passing on knowledge at developer conferences - see how [Christoph and Konstantin talk about "Building High-Quality JavaScript Tools"](http://talkfrom.com/video?name=building-highquality-javascript-tools), and in particular [what Christoph and team did to save Jest](https://www.youtube.com/watch?v=3YDiloj8_d0).
- **Funding**: Although I've explained my reservations, there are plenty of initiatives to help address open source funding and they are all needed. I would follow closely [Devon Zuegel of GitHub](https://increment.com/open-source/the-city-guide-to-open-source/) and also plug my friend [Travis Fischer](https://twitter.com/transitive_bs) if you are interested in this.

## Other references

- Seth Godin - [Why is software so bad?](https://www.akimbo.link/blog/s-5-e-14-why-is-software-so-bad)
