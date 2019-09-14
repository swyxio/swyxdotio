---
title: 'The Case for the React Native Web Singularity'
slug: react-native-web-singularity
categories: ['Tech', 'React']
date: 2019-08-30
banner: './assets/react-native-web-singularity.jpeg'
---

Bottom line up front: There is a possible "React Native Web Singularity", when it starts being a better standalone choice for developing for the mobile web than `react-dom`. If this speculation comes true, this would be gamechanging.

## Context

I spent a couple hours looking into [React Native Web](https://github.com/necolas/react-native-web) today. I want to preface this with the very important acknowledgements that I have no knowledge of the React team's plans, and I have not ever built anything with React Native Web so I am really just speculating and thinking out loud.

> ⚠️I REITERATE: I AM JUST SOME INTERNET RANDO SPEWING THOUGHTS, DO NOT IN ANY WAY TAKE WHAT I WRITE HERE AS ANY FORM OF OFFICIAL ROADMAP

I just want to discuss why React Native Web is interesting to me and what I see as a neutral but interested outsider to the project. However I am aware that RNW is a moderately controversial project and if you have your mind made up on it, I suggest doing something else with your time than reading on.

I mean it, please stop reading if you are just going to get mad whenever RNW is mentioned.

Wew. Ok.

## Basic Facts on React Native Web

If you are out of the loop on even knowing what RNW is, here are some resources I would recommend:

- [Their README](https://github.com/necolas/react-native-web#react-native-for-web)
- [@necolas' talk at React Rally 2017](https://www.youtube.com/watch?v=tFFn39lLO-U) and on [the React Podcast](https://changelog.com/reactpodcast/1)
- [Peggy Rayzis's talk: Write Once, Render Anywhere — ReactNext 2017](https://www.youtube.com/watch?v=HLWM2uhv2wI&feature=youtu.be)
- [Using React Native For Web in Production at Curai](https://medium.com/curai-tech/using-react-native-for-web-in-production-at-curai-53202945b0b3)
- _what am I missing?_

Also worth noting that there was a (more ambitious!) experiment, [React Native DOM](https://github.com/vincentriemer/react-native-dom/), that has since gone on [hiatus](https://github.com/vincentriemer/react-native-dom/issues/102). [ReactXP](https://microsoft.github.io/reactxp/) is another notable attempt I know nothing about, backed by MSFT.

Because there is a lot of ground to cover, I will assume from here on that you have read and watched these basic things above. The main selling points that resonate with me are:

- Code reuse across RN and Web codebases
- [Better A11y APIs](https://github.com/necolas/react-native-web/blob/master/docs/guides/accessibility.md) (not a given, and if you reject this out of hand please stop reading)
- [Improved styling model](https://github.com/necolas/react-native-web/blob/master/docs/guides/style.md) (subjective!)
- "native-quality interactions, support for multiple input modes (touch, mouse, keyboard)" (untested! I'd love to read more here)
- ["Free" built-in components and modules that RN developers enjoy](https://github.com/necolas/react-native-web#components) including [an Animated Module](https://github.com/necolas/react-native-web#modules)
- (not so relevant to me) [i18n is better](https://github.com/necolas/react-native-web/blob/master/docs/guides/internationalization.md)

There is one very big downside, which cannot be ignored: it drops all pretense of using APIs that look like normal webdev. No `<div>`s here. No [Media Queries](https://github.com/necolas/react-native-web/blob/master/docs/guides/style.md#what-about-media-queries). And expect fiddling with alien RN ecosystems like Metro with [fun problems with symlinks](https://github.com/facebook/metro/issues/1).

Now, I also pay attention to incidental/leading indicators:

- Both the authors of React-Native-Web and React-Native-DOM have been hired into the React org in the past year. [@necolas](https://twitter.com/necolas) is on React Core and [@vincentriemer](https://twitter.com/vincentriemer) seems to be on Web but is obviously extremely close to the RN team.
- [Rick Hanlon (RN team)'s talk on the Untouchable Web](https://www.youtube.com/watch?v=LhKglxQT4sU) gives a very strong indication of what the RN team wants for mobile web
- [React Fire](https://github.com/facebook/react/issues/13525) gave way to [React Flare](https://github.com/facebook/react/issues/15257) (also worth reading: [`<FocusScope>` and the unreleased `useEvent` hook](https://github.com/facebook/react/issues/16009)). I expect some form of this to be announced, even released at [React Conf 2019](https://conf.reactjs.org/) alongside Suspense for Data Fetching.
- [From Nicolas](https://mobile.twitter.com/necolas/status/1136687268377219073): "You can now build Web, Android, and iOS apps from the same React codebase using Expo. Expect a lot more progress towards a web-first, multi-platform React over the next couple of years."
- Of course, [Twitter's continuing investment](https://twitter.com/paularmstrong/status/1070472670452559872)
- _what am I missing?_

As well as community proof points:

- [Max Stoiber's Regrets](https://mxstbr.com/thoughts/tech-choice-regrets-at-spectrum/)
- [the incredible DevHub app](https://github.com/devhubapp/devhub)
- Evan Bacon's Expo Web efforts with a [Crossy Road clone](https://github.com/EvanBacon/Expo-Crossy-Road), [Instagram](https://github.com/EvanBacon/Instagram), [Flappy Bird](https://flappybacon.netlify.com/), [Lego](https://ldr.netlify.com/), [Doodle Jump](https://doodlejump.netlify.com/) (Evan is my RNW idol right now... jeez)
- _what am I missing?_

## My speculation: The React Native Web Singularity

Now for the really useless part of this blogpost, where I speculate about the potential of RNW without even ever having used it. Yeah, I know. Humor me, contradict me, back me up, I'm just thinking aloud and would love your thoughts.

**Fact**: Mobile is extremely important for web developers. I won't bother substantiating this.

**Fact**: A React-Native-informed approach to Gestures, Focus, and A11y is clearly in the future of React.

**Fact**: It is working for Twitter and [Uber Eats](https://www.youtube.com/watch?v=RV9rxrNIxnY) and others.

**Opinion**: I don't think `react-dom` can or should ever be deprecated, because it will forever be important for web developers coming into React from a HTML/CSS background. I used to entertain this notion, but I recognize it is unnecessarily aggressive.

**Opinion**: Code reuse is very project dependent. Plenty of projects are web-only. BUT...

**Speculation**: There is a decent chance that RNW reaches a crossover point, a singularity, where it simply starts to be a better starting point for developing for mobile web than `react-dom` is. As a standalone tool, **even with no intention of reusing code for native apps**, it could be better than `react-dom`, for reasons I have already stated. At this point, all doubt of premature optimization becomes invalid, and RNW becomes the default for people who are ok not using HTML-like APIs.

If true, **THIS WOULD BE INCREDIBLY FREAKING IMPORTANT.** This is why I keep eyeing the RNW project despite never having needed it.

If true, This would be a fun turn of events from people proclaiming the death of RN after [Airbnb sunset RN](https://medium.com/airbnb-engineering/sunsetting-react-native-1868ba28e30a) in 2018. If anything, judging by [Eli White's talk](https://mobile.twitter.com/Eli_White/status/1123490937785782273), the expanded RN team with Lean Core/community focus, and [open sourcing of Hermes](https://www.youtube.com/watch?v=zEjqDWqeDdg), RN has in the public eye become more relevant than ever in 2019.

It also doesn't have to be RN that "wins". If Flutter is a success, [Bruno Lemos](https://twitter.com/brunolemos) also notes that [Flutter for web](https://flutter.dev/web) is in technical preview.

## Definitely Not Immediate Future

I think all this is years out. I directly pointed this question at Dan a few months ago and this was [his reply](https://mobile.twitter.com/dan_abramov/status/1135421892851064832) (which, again, is not official communication they have committed to so dont hold them to it please):

> Me: does some combination of React Native DOM/Web, React Fire, and React Flare point towards some possible future version of react-dom where we drop the HTML-like basic JSX components and just provide a smaller set that are more accessible/intuitive by default?

> Dan: Not in immediate feature. But finding ways to steer people towards accessible UIs by default is an active exploration with Flare. In shorter term insights will likely feed back into React Native. Maybe someday having a unified opt-in API for folks who prefer it would be nice.

So RN is the near term focus for now. But what if...

## Feedback from early reviewers

I was a bit too web centric in this piece, and was totally blind to the obvious fact that RNW is a bigger win for RN users than for React-Dom users. [Glen Maddern](http://twitter.com/glenmaddern) has ported an RN app to RNW which of course is going to be a great usecase for RNW. He said:

> In general RNW isn't the bottleneck, it's the native bits of RN that cause trouble. So I would speculate that one day maybe Expo becomes better for building for the web than Create React App, that'll be the tipping point. RNW is a small piece of the puzzle but it feels good enough for now.

The RNW DX story itself does have some drawbacks. [Ryan Jerue](https://twitter.com/rjerue) says:

> In terms of using RNW for a bit over a year, I'd say that there's some good and some bad. The good is that it does deliver on its promise. My focus has been working on a design system that my company can use across our web and native apps. If you like CSS in JS, it's 100% that. Dimensions API covers media queries well too. The bad of RNW is mostly from react native, meaning webapps are going to be stuck at the ceiling of being annoying up upgrade, flexbox everywhere. The support of libraries isn't as great either as often ones with native modules require one to be skilled in JS, Swift/ObjC, and Java. React Native doesn't support SVG out of the box (or really at all) either, which is a bummer.

Even if it isn't RNW, something else that looks like it might do it. [Christian Hall](https://twitter.com/jchristianhall) said:

> Given the interest in VR and AR, for devs who want to focus on making the best UI possible, regardless of platform, I think the “RNW Singularity” is essential. If the React Team doesn’t come up with some way to express UI universally, someone else will.

[Bruno Lemos](https://twitter.com/brunolemos) agreed:

> We are definitely trending into more cross-platform dev, all big companies are betting on it (facebook, microsoft, google and even apple with project catalina). Dunno if it will be react-native-web or not, but yes I agree with the predictions

There remain key sticking points in a RNW singularity, like opening in a new tab, and routing. As [Josh Parret put it](https://twitter.com/JTParrett/status/1167853538057379840):

> I feel we are quite far off a RNW singularity, as there’s undeniable cases where a single codebase doesn’t work for both platforms; such as opening a link in a new tab, or changing routes/screens...

---

_PostScript: more resources for my reference_

- [Ben Awad's RNW Series](https://www.reddit.com/r/reactjs/comments/aw65z8/react_native_web_workout_app_tutorial/)
- [Guide for Creating reusable RN and RNW components](https://medium.com/@yannickdot/write-once-run-anywhere-with-create-react-native-app-and-react-native-web-ad40db63eed0)
- [Material Bread RN universal components](https://www.reddit.com/r/reactjs/comments/brgtqb/how_to_make_a_react_component_library_for_both/eoge9yo/)
- [Expo Web tutorial](https://medium.com/@toastui/from-zero-to-publish-expo-web-react-native-for-web-tutorial-e3e020d6d3ff)
- [Routing: React Router](https://github.com/edupooch/simple-crna-routing)
- [Routing: React Navigation](https://pickering.org/using-react-native-react-native-web-and-react-navigation-in-a-single-project-cfd4bcca16d0)
