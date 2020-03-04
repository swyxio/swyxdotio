---
title: Documentation Levels
slug: documentation-levels
subtitle: for Open Source Projects
categories: ['DX']
date: 2020-01-29
description: People can't use your code without docs. People might get overwhelmed with too many docs. How can we match the maturity of docs to the maturity of the project?
---

We had an [interesting discussion](https://twitter.com/swyx/status/1222365733436346369) yesterday on what makes great docs (in this context we are only talking about OSS docs). We all know docs are important, but we can't necessarily articulate what makes good docs. It's more of a "I'll know it when I see it" situation.

- No docs is bad. 
- More docs is good. 
- A pile of disorganized, out of date docs is bad. 
- The best docs are the ones I don't have to read (until just before I need them, or visual affordances make them unnecessary).

Can we do better than this vague intuition?

## Table of Contents

## Matching Maturity

There are docs extremists - they aren't happy until every last thing is spelled out, and they want every project to have tip top docs quality. The thing is, docs do have a maintenance cost, and docs are expensive (in developer time) to write. Possibly the only thing worse than no docs are out-of-date docs that don't help you figure out if they are out of date. The idea of docs driven design is a popular solution for this - if you know you have perfect discipline - but it doesn't answer the question of what kinds of docs you can offer to help the user.

I think we need to articulate a spectrum of acceptable docs. The maturity of docs should match the maturity of the project. 

I'm not a technical writer or documentarian so I don't know if there is existing thinking on this, but this is mine so far.

## Docs Goals

High level user centric goals of docs:

- Beginners: get to success as quickly as possible, avoid/recover from mistakes
- Intermediate: contrast with comparable projects, learn every API/option
- Experts: keep up with changes and future plans
- Contributors: How to contribute, how the project is setup

[Quote Dan Abramov](https://twitter.com/dan_abramov/status/1083472984252260352):

> Top two mistakes in documentation:
>
> - Assuming people know everything
> - Assuming people are stupid

## Brainstorming Docs Features

I tried to loosely order this but ofc it is up to interpretation. A lot of this is my brainstorm, plus [Mark's summary of the great Divio blogpost](https://github.com/reduxjs/redux/issues/3609):

- Homepage/Readme:
  - Set a good first impression
  - Answer What is this?
  - Answer What can it do for me?
  - Answer Where to learn more?
- Answer questions where the user expects them
  - **One sentence description for github headline**
  - One paragraph description with more context
  - Comparison vs comparable libraries
  - **Feature list/Project Goals**
  - **Problem Statement** - what you solve, how the developer/end user is better off with your thing than handwritten. aka Why You Exist
- **Project Status**
  - CI badges, version badges
  - [there is research](https://twitter.com/sback_/status/1047134062597611520) that shows that the kind of maintainer that adds more maintenance badges is correlated with better project quality ([15 is the minimum, okay?](https://twitter.com/swyx/status/1070592812977217536?s=20))
  - short sentence if the project is inactive or looking for maintainers
- **Install + Config Instructions**
  - split by user group
  - Migration docs from other tools
  - types/testing notes
- **Config/API Docs**
  - what it expects, what outcome to expect
  - Warn about mistakes just before people are likely to make them
  - comparison to deprecated APIs for old users to find them
  - state at which version new APIs were added, or deprecated
- API **Examples**
  - can colocate with API docs, but careful not to crowd out the docs
  - **make sure it is copy- and paste-able**. leave comments for where the user will have to fill in with their own code
  - Only describe
  - Code / information oriented
  - Austere and to the point
  - Structure around the code
  - Be consistent and accurate
- **How-To Guide/Cookbook/Recipes**
  - copy and paste for common usecases
  - Answer questions that a beginner might not formulate
  - Can assume some understanding of the basics
  - Provide a series of steps
  - Focus on results
  - Solve a specific problem
  - Don't explain concepts
  - Give some flexibility / ways to adapt
  - Leave things out - keep it practical, not complete
  - Name it well
- Recovering from Failure
  - **Common Mistakes** (incl pre-emptive warnings - [Eleventy](http://11ty.io/) does a great job of this)
  - Link to community slack/gitter/twitter
  - **Known Issues**
- **Tutorial**
  - can take the form of **Getting Started**, assume no knowledge
  - Explain acronyms, jargon
  - step through APIs
  - Learn by doing
  - Get the user started, even if it's not the "correct" way
  - Make sure it works
  - Ensure they see results immediately
  - Tutorial must be repeatable
  - Focus on concrete steps, not abstract concepts
  - Provide minimum necessary explanation, and focus on only steps they need now
- **Live Demos**
  - real use cases
  - dont force people to clone and install and run just to see your demo
  - for bundler/compiler/transpiler type projects, offer a REPL
- **Third Party Plugins/Libraries**
- User/Maintainer Content
  - Official Blog
  - Talks
  - 3rd Party Blogs
  - Video Tutorials
  - Podcasts
- Meta (as in [MetaLanguage](https://www.youtube.com/watch?v=_0T5OSSzxms))
  - Origin Story/Naming
  - Conceptual Understanding
    - Clarify and broaden coverage of a topic
    - Provide background and context ("how X works with Y", "why a design decision", etc)
    - Discuss alternatives and opinions
    - Don't give instruction or technical reference
  - Who Uses Us
    - Logos
    - Quotes/endorsements/testimonials
    - Link to production use
  - Funding
  - Migration from previous versions
  - Versioned docs
  - Roadmap
  - Reader-friendly Changelog
  - Helping Contributors
    - Maintainer Responsibilities
    - Contributor Recognition
    - How it Works under the hood
    - CONTRIBUTING.md
    - Easy Local Edits - when someone spots something wrong, or wants to add something, how easy is it?
- Search
- Anti-Docs
  - **Project NonGoals** - things we will never do
  - **When NOT to use us**
- "1 to N" Docs
  - Different docs for different audiences (eg JS/Android/iOS)
  - **i18n for Different languages**
- Build Docs into the tool
  - dev-mode warnings
  - minified production error codes (eg React/[TSDX](https://twitter.com/jaredpalmer/status/1161678891209113601))

## Brevity as a MetaFeature

- Docs don't linearly increase in quality with word count. You cannot hedge by throwing more words at a problem. 
- Try to have your target user persona in mind and write specifically for them, only what they need and what they are about to need. 
- Use links and other UI options to branch out for other user types. 
- Be very conscious of visual hierarchy - don't put irrelevant details, in-depth explanations, jokes and anecdotes where someone is looking to get quick hits. 
- Code examples should be small yet useful - don't dump entire apps that would take more time to customize than it would be to write from scratch.

Here's [Tania Rascia](https://twitter.com/taniarascia/status/1222361724143226881):

> - specific goals, laid out upfront
> - prerequisites 
> - demo with source code
> - irrelevant details, in-depth explanations, and anecdotes removed
> - small! blocks of code
> - provide a one sentence explanation and example for each term, no more.
> - run through the example as you make it

## Bottom Line Up Front

I call this the Recipe Rule - Recipe Blogs making you scroll through 10 pages of life stories and long walks on the beach before showing the damn recipe.

[Here's David Khourshid](https://twitter.com/DavidKPiano/status/1046833198146228225): 

> The top 3️⃣ things I want to read in READMEs, vs. actual READMEs:
> 
> - Introduction
> - License
> - Philosophy
> - Features
> - Compatibility
> - Contributing
> - Changelog
> - Community
> - Preface
> - Overview
> - Installation 1️⃣
> - Examples 2️⃣
> - API 3️⃣

## Levels

I also like [Brian Chesky's idea of growing customer experience by hotel analogy](https://mastersofscale.com/brian-chesky-handcrafted/). If a 1 star hotel is just a bed, a 3 star hotel has a gym, 4 star has a pool, and 5 star hotel has dining, spa and concierge, etc. What is a 6 star hotel? 10 star? and so on.

So let's split up those features above by levels - and pair the levels with where the project is. Every level includes the prior level.

- **Level 0: Basic proof of concept**
  - *Example audience: you/colleagues/hobbyists*
  - One sentence description for github headline
  - README with API docs - goal is to save yourself from looking at source code
- **Level 1: v0.x**
  - *Example audience: greenfield early adopters. Ok with missing documentation, they are here for the idea. can contribute code/docs*
  - One paragraph description with more context - could be a sales pitch but also give an idea of when to use you
  - Feature list/Project Goals
  - Install + Config Instructions
- **Level 2: v1**
  - *Example audience: brownfield early adopters. Ok with bugs, they have some problem that isnt well addressed. Needs convincing.*
  - Comparison vs comparable libraries
  - Problem Statement - what you solve, how the developer/end user is better off with your thing than handwritten. aka Why You Exist
  - Basic Examples
  - Live Demos
- **Level 3: vX**
  - *Example audience: early majority user. Wants ease of use, quick wins. Need to be very reliable. Needs content to sell solution to team*
  - Project Status badges
  - Tutorial
  - Third Party Plugins/Libraries
  - How-To Guide/Cookbook/Recipes
  - User/Maintainer Content
    - Official Blog/Project and Meeting Notes
    - Talks
    - 3rd Party Blogs
    - Video Tutorials
    - Podcasts
  - Comprehensive Examples
  - Examples
    - [Svelte](https://twitter.com/swyx/status/1220905001926696962?s=20)
- **Level 4: Production use for multiple years**
  - *Example audience: expert user. Needs API stability/migration instructions, deep insight on how the project works and how it can solve problems. Needs to customize/adapt for at-scale/weird usecases*
  - Growing the MetaLanguage
    - Origin Story/Naming
    - Who Uses Us
      - Logos
      - Quotes/endorsements/testimonials
      - Link to production use
    - Funding
    - Migration docs from previous versions
    - Roadmap
    - Reader-friendly Changelog
  - Anti-Docs
  - Helping Contributors
    - Maintainer Responsibilities
    - Contributor Recognition
    - How it Works under the hood
    - CONTRIBUTING.md
    - Easy Local Edits - when someone spots something wrong, or wants to add something, how easy is it?
  - Examples
    - [Eleventy](https://www.11ty.dev/)
- **Level 5: Community of Production users**
  - *Example audience: Industry beginner. They may not know any alternatives. You are the entire world to them.*
  - Explain acronyms, jargon
  - "1 to N" Docs
    - Different docs for different audiences (eg JS/Android/iOS)
    - Different languages
  - Examples
    - [Vue](https://vuejs.org/)
    - [Django](https://docs.djangoproject.com/en/3.0/)
    - [React](https://reactjs.org)
- **Level 6: ????**
  - "Too Big To Fail" projects?
  - What belongs here? how to push the boundaries of docs?
    - build docs into the tool
  - Establishing a foundation or ECMA spec
  - Docs that are Useful for non-users? 
  - [Corporate/professional docs team?](https://twitter.com/TensorNo/status/1222664055011213312)

A more ambitious framing of this might put them into a pyramid "hierarchy of needs". However I don't think it is appropriate yet at this stage while I explore this idea.

## Further Reading

- https://github.com/reduxjs/redux/issues/3609 has a bunch of great links
- https://vimeo.com/32957711 John Resig on JQuery's OSS community
- Google on Technical Writing https://developers.google.com/tech-writing
- IA questions https://medium.com/eightshapes-llc/information-architecture-lenses-8a3929a106dd
- Personas https://articles.uie.com/when-it-comes-to-personas-the-real-value-is-in-the-scenarios/
- Empathy mapping https://www.nngroup.com/articles/ux-mapping-cheat-sheet/
  - and journey mapping https://www.nngroup.com/articles/storyboards-visualize-ideas/