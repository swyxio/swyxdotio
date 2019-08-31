---
title: 'The case for the React Native Web Singularity'
slug: react-native-web-singularity
categories: ['Tech', 'React']
date: 2019-08-30
---

Bottom line up front: There is a possible "React Native Web Singularity" when it starts being a better standalone choice for developing for the mobile web than `react-dom`. If this speculation comes true, this would be gamechanging.

## Context

I spent a couple hours looking into [React Native Web](https://github.com/necolas/react-native-web) today. I want to preface this with the very important acknowledgements that I have no knowledge of the React team's plans, and I have not ever built anything with React Native Web so I am really just speculating and thinking out loud.

> ⚠️I REITERATE: I AM JUST SOME INTERNET RANDO SPEWING THOUGHTS, DO NOT IN ANY WAY TAKE WHAT I WRITE HERE AS ANY FORM OF OFFICIAL ROADMAP

I just want to discuss why React Native Web is interesting to me and what I see as a neutral but interested outsider to the project. However I am aware that RNW is a moderately controversial project and if you have your mind made up on it, I suggest doing something else with your time than reading on.

I mean it, please stop reading if you are just going to get mad whenever RNW is mentioned.

Wew. ok.

## Basic Facts on React Native Web

If you are out of the loop on even knowing what RNW is, here are some resources I would recommend:

- [Their README](https://github.com/necolas/react-native-web#react-native-for-web)
- [@necolas' talk at React Rally 2017](https://www.youtube.com/watch?v=tFFn39lLO-U) and on [the React Podcast](https://changelog.com/reactpodcast/1)
- _what am I missing?_

Also worth noting that there was a (more ambitious!) experiment, [React Native DOM](https://github.com/vincentriemer/react-native-dom/), that has since gone on [hiatus](https://github.com/vincentriemer/react-native-dom/issues/102). [ReactXP](https://microsoft.github.io/reactxp/) is another notable attempt I know nothing about, backed by MSFT.

Because there is a lot of ground to cover, I will assume from here on that you have read and watched these basic things above. The main selling points that resonate with me are:

- Code reuse across RN and Web codebases
- POSSIBLE "A11y by default" (not a given, and if you reject this out of hand please stop reading)
- [Improved styling model](https://github.com/necolas/react-native-web/blob/master/docs/guides/style.md) (subjective!)
- ["Free" built-in components that RN developers enjoy](https://github.com/necolas/react-native-web#components) including [an Animated Module](https://github.com/necolas/react-native-web#modules)

There is one very big downside, which cannot be ignored: it drops all pretense of using APIs that look like normal webdev. No `<div>`s here. And expect fiddling with alien RN ecosystems like Metro with [fun problems with symlinks](https://github.com/facebook/metro/issues/1).

Now, I also pay attention to incidental/leading indicators:

- Both the authors of React-Native-Web and React-Native-DOM have been hired into the React org in the past year. [@necolas](https://twitter.com/necolas) is on React Core and [@vincentriemer](https://twitter.com/vincentriemer) seems to be on Web but is obviously extremely close to the RN team.
- [Rick Hanlon (RN team)'s talk on the Untouchable Web](https://www.youtube.com/watch?v=LhKglxQT4sU) gives a very strong indication of what the RN team wants for mobile web
- [React Fire](https://github.com/facebook/react/issues/13525) gave way to [React Flare](https://github.com/facebook/react/issues/15257) (also worth reading: [`<FocusScope>` and the unreleased `useEvent` hook](https://github.com/facebook/react/issues/16009)). I expect some form of this to be announced, even released at [React Conf 2019](https://conf.reactjs.org/) alongside Suspense for Data Fetching.
- Of course, [Twitter's continuing investment](https://twitter.com/paularmstrong/status/1070472670452559872)
- _what am I missing?_

As well as community proof points:

- [Max Stoiber's Regrets](https://mxstbr.com/thoughts/tech-choice-regrets-at-spectrum/)
- [the incredible DevHub app](https://github.com/devhubapp/devhub)
- Evan Bacon's Expo Web efforts with a [Crossy Road clone](https://github.com/EvanBacon/Expo-Crossy-Road), [Instagram](https://github.com/EvanBacon/Instagram), [Flappy Bird](https://flappybacon.netlify.com/), [Lego](https://ldr.netlify.com/), [Doodle Jump](https://doodlejump.netlify.com/) (Evan is my RNW idol right now... jeez)

## My speculations: The React Native Web Singularity

Now for the really useless part of this blogpost, where I speculate about the potential of RNW without even ever having used it. Yeah, I know. Humor me, contradict me, back me up, I'm just thinking aloud and would love your thoughts.

**Fact**: Mobile is terribly important for web developers. I won't bother substantiating this point.

**Opinion**: I don't think `react-dom` can or should ever be deprecated, because it will forever be important for web developers coming into React from a HTML/CSS background.

**Opinion**: I also don't think code reuse is an inherently worthy goal in and of itself. Plenty of projects are web-only and premature optimization, particularly for projects you will never use, is to be avoided.

**Speculation**: However there is a decent chance that RNW reaches a crossover point, a singularity, where it simply starts to be a better starting point for developing for mobile web than `react-dom` is. As a standalone tool, even with no intention of reusing code for native apps, it could be better than `react-dom`.

If true, **THIS WOULD BE INCREDIBLY FREAKING IMPORTANT.** Like, drop everything and invest in this now important.

This is why I keep eyeing the RNW project despite never having needed it.

## Definitely Not Immediate Future

I think all this is years out. I directly pointed this question at Dan a few months ago and this was [his reply](https://mobile.twitter.com/dan_abramov/status/1135421892851064832) (which, again, is not official communication they have committed to so dont hold them to it please):

> Me: does some combination of React Native DOM/Web, React Fire, and React Flare point towards some possible future version of react-dom where we drop the HTML-like basic JSX components and just provide a smaller set that are more accessible/intuitive by default?

> Dan: Not in immediate feature. But finding ways to steer people towards accessible UIs by default is an active exploration with Flare. In shorter term insights will likely feed back into React Native. Maybe someday having a unified opt-in API for folks who prefer it would be nice.

So RN is the near term focus for now. But what if...

---

PostScript: more resources for my reference

- [Ben Awad's RNW Series](https://www.reddit.com/r/reactjs/comments/aw65z8/react_native_web_workout_app_tutorial/)
- [Guide for Creating reusable RN and RNW components](https://medium.com/@yannickdot/write-once-run-anywhere-with-create-react-native-app-and-react-native-web-ad40db63eed0)
- [Material Bread RN universal components](https://www.reddit.com/r/reactjs/comments/brgtqb/how_to_make_a_react_component_library_for_both/eoge9yo/)
- [Expo Web tutorial](https://medium.com/@toastui/from-zero-to-publish-expo-web-react-native-for-web-tutorial-e3e020d6d3ff)
