---
title: Branding Bundles
slug: branding-bundles
subtitle: Effective Marketing of Incremental Progress
description: The best way to communicate a group of benefits is to slap a label on it.
categories: ['Marketing']
date: 2020-02-16
---

## Preface on Glitches

I'm always on the lookout for "[Glitches in the Matrix](https://www.youtube.com/watch?v=icID__07xBI)" - breakages in how you think the world works. [Eric Weinstein calls it Truman Show Breaks](https://www.youtube.com/watch?v=nM9f0W2KD5s). A less attuned person might brush it off as a random fluke, but very often it demonstrates serious flaws in your mental model of how the world works, particularly the gap between what people say and what they actually end up doing.

For example, many people brushed off the upsets of Toyota vs GM, Intel vs Cyrix, HP vs DEC as fluke after fluke of management missteps, but it took Clay Christensen to reframe these as management acting as they "should" ([great recent discussion on the Exponent podcast](https://exponent.fm/episode-180-its-been-a-week/)). Other glitches? I don't have a list but [the famous stripper scene in The Big Short](https://www.youtube.com/watch?v=MesrrYyuoa4) is another. [John Backus also points to the 2000s warez scene](https://twitter.com/backus/status/1006391268216205312) as a break in typical human behavior models.

I guess I should do a bigger blogpost on Glitches in future but that's the general idea.

## CSS4

I experienced a "Glitch in the Matrix" this week when I saw that [Jen Simmons was now advocating for CSS4](https://github.com/w3c/csswg-drafts/issues/4770). This just 2 years after [swearing up and down on her channel that there would never ever be a CSS4](https://www.youtube.com/watch?v=Jtmkk6odggs). And all of a sudden it seems like the [Who's Who of CSS are mostly aligned on having a CSS4](https://css-tricks.com/css4/).

Oh, of course, those of us in the know will nod and wink that there won't _really_ be a CSS4, because independent modules are a thing. However, to the wider world, it will just seem like a weird about-face, but they'll get over it.

I think CSS4 is a great idea and especially applaud anyone who can change their minds for the greater good.

## Get Out Of Your Head

I think the lesson here is that living standards don't work for the late majority. Nobody other than your in-crowd is keeping up on the intricacies and progress of every little spec, because they have better things to do. It's great for _the people who work on the spec_, but a complete mess when it comes to "casuals".

[PPK](https://www.quirksmode.org/blog/archives/2020/01/css4_is_here.html) framed it most convincingly for me as segmenting users between the engaged "head", interested "torso", and super long "tail" - although I find [Ilya's original framing](https://www.youtube.com/watch?v=vtIfVPtN6io&list=PLjnstNlepBvMqV4uPl3coTTTjPXgh-OMj&index=9&t=0s) phrased with a little more humility.

I liken this effect to doing updates at standups and at company allhands.

- At a standup, everyone there cares and has the context to know about every little bump and victory in what you're working on.
- At an all-hands, nobody has time for your little problems. They just want to know when you're done and what the high level takeaways are.

If you care about impact rather than preaching to your own choir, you should care about getting best practices out of your "head" and into the "torso" and "tail".

## What are Branding Bundles?

Branding bundles communicate readiness for broader adoption. They give some thematic coherence to a bunch of smaller features that, on their own, may not have as much impact. Perhaps equally importantly, they give a single hook for "torso" and "tail" people to learn up, prioritize, and check off the list.

This behavior of "checking boxes" might evoke some derision from "head" people, the people who know how much more there is to go. But it helps to define an acceptable upper bound in the investment needed from the business, and helps developers to build business cases based on success stories from earlier adopters (again, based on the same branding bundle).

In web development we try _really hard_ to not break the web. However this not-breaking of things runs directly into the other maxim of "if it ain't broken, don't fix it". So when we make a commitment to incremental, non-breaking change, it can be hard to communicate the business value of implementing the results of those changes. Even in the "head", it can feel like things are always in flux. Branding Bundles help create a feeling of forward momentum for everyone.

You don't have to contribute to the letter soup of acronyms and buzzwords to create a bundle. The [React 15->16 rewrite](https://engineering.fb.com/web/react-16-a-look-inside-an-api-compatible-rewrite-of-our-frontend-ui-library/) was backward compatible, so technically did not warrant a major version bump, but because there was a semver bump I guarantee masses of engineering teams invested in the upgrade. On a smaller scale, I was recently able to make the case for upgrading a library we had, by noting that we were on v2 and the library was currently at v9. People want to keep up with the Joneses.

> Side note: This may sound silly, but a logo can be very important to branding bundles. People slap that on their slides and sites, and accordingly it creates social proof. Give your bundle a nice logo if you want it to go far.

## Other Branding Bundles

CSS3 itself was a fairly successful branding bundle.

[PWAs](https://developers.google.com/web/progressive-web-apps) are a little vaguer bundle, with a "baseline" and an "exemplary" standard. But the marketing is working.

[JAMstack](https://twitter.com/philhawksworth/status/1226947263982948352) is intended in that vein too. [I frame it](https://www.swyx.io/speaking/jamstack-victory/) as, yes, a return to static sites, but also the confluence of 5 trends: Git Centric Workflow, Build Tools, next generation SSGs, the [API economy](https://www.swyx.io/api-economy/) (third party APIs), and Serverless (and 1st party APIs). (_There's a deeper discussion here, and a lot of buts dependent on context, but I'm not going to go into that here_)

I think we can also study Branding Bundles in other aspects of life as well. I think FICO score is a nice bundle of financial health metrics, even if easily gamed. [Intel Inside](https://en.wikipedia.org/wiki/Intel#Intel_Inside) was one of the most successful bundles of all time. You could view [SOC2](https://www.imperva.com/learn/data-security/soc-2-compliance/) and [HIPAA](https://www.dhcs.ca.gov/formsandpubs/laws/hipaa/Pages/1.00WhatisHIPAA.aspx) compliance as a regulatorily imposed branding bundle. Companies like Stripe run their own [Partner Programs](https://stripe.com/docs/partners) that give some assurance that acceptable standards have been met.
