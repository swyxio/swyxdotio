---
title: React Distros
subtitle: and The Deployment Age of JavaScript Frameworks
slug: react-distros
categories: ['React']
date: 2020-02-19
---

## Table of Contents

James K Nelson [raised an interesting point](https://twitter.com/james_k_nelson/status/1229649680872558592) recently:

> So Mr. Abramov has been telling us #reactjs is a UI runtime. 
>
> To me, that sounds like React is a kernel. Webpack/Create React App are bootloaders. Next.js and Gatsby are the closest things we've got to distros.
>
> I think we need more distros.

In case you, like me, weren't sure what bootloaders are, Google says a "*Bootloader is a piece of code that runs before any operating system is running. Bootloader are used to boot other operating systems, usually each operating system has a set of bootloaders specific for it*". I guess Webpack's runtime is that, but it is also a compiling mechanism from, well, `/src` to `/dist`.

Anyway, the analogy [rings true](https://twitter.com/dan_abramov/status/1229884766394232838). I'd like to expand on it a little.

## The Carlota Perez Framework

The VC world is particularly enamored with [The Carlota Perez Framework](http://reactionwheel.net/2015/10/the-deployment-age.html) right now. Both [Fred Wilson](https://avc.com/2015/02/the-carlota-perez-framework/) and [Marc Andreesen](https://www.stanforddaily.com/2014/03/05/marc-andreessens-view-from-the-top-part-2-of-2/) love it, and [Ben Thompson](https://stratechery.com/2020/the-end-of-the-beginning/), [Benedict Evans](https://twitter.com/benedictevans/status/1059865573608239105?lang=en) and [Tuur Demeester](https://twitter.com/TuurDemeester) have extended it to BigTech, Smartphones, and Cryptocurrency recently.

People love dissing techbros as reinventing things every 10 years in an endless and meaningless cycle. But in reality the real Megatrends often take on a different shape.

![https://i0.wp.com/reactionwheel.net/wp-content/uploads/2015/09/The-Deployment-Age.004.png?w=1280](https://i0.wp.com/reactionwheel.net/wp-content/uploads/2015/09/The-Deployment-Age.004.png?w=1280)

The X axis takes place on the order of 20-50 years, and the Y axis is % of population penetration. This has played out repeatedly in the past century and adoption is accelerating as we get better at distribution:

[![https://steemitimages.com/1280x0/https://steemitimages.com/DQmVcSfmG5y1J3n3qKCkm53AbMkQiSGrU4XV8QaRbg3i3D4/blackrock-tech-adoption.jpg](https://steemitimages.com/1280x0/https://steemitimages.com/DQmVcSfmG5y1J3n3qKCkm53AbMkQiSGrU4XV8QaRbg3i3D4/blackrock-tech-adoption.jpg)](https://www.visualcapitalist.com/rising-speed-technological-adoption/)

The basic idea is that there is an initial innovation, then a "frenzy" of competing technologies with massive growth, then a turning point comes where the technology reaches synergy and maturity (often compared to [the "late majority" and "laggards" group from Everett Rogers](https://en.wikipedia.org/wiki/Diffusion_of_innovations)).

The concerns of the Installation Age are growth and innovation, often resulting in creative destruction (read: massive churn). The concerns of the Deployment Age are stability and addressing the needs of later, often larger, market segments. In the former, hobbyists and speculators rule, and things are often simpler. In the latter, the suits take over, and a lot of time is spent over the nitty gritty details.

## The Deployment Age of JavaScript Frameworks

I think the turning point for JS Frameworks began a year or two ago. We no longer have a new frontend framework every month. [React has been on top of Hacker News Job Board for 31 months](https://www.reddit.com/r/reactjs/comments/f4kr7h/another_year_on_top_for_react_hacker_news_hiring/). But it isn't just React - Vue and Angular both have found very stable adoption among sizable companies who are not going to migrate anytime soon.

The Deployment Age has led to the rise of metaframeworks - frameworks built around frameworks to **literally address deployment concerns** the original frameworks were not designed for. React has Next.js and Gatsby, Vue has [Nuxt.js](https://nuxtjs.org/) and [Gridsome](https://gridsome.org/), Svelte has [Sapper](https://sapper.svelte.dev/), and [Angular even got Scully recently](https://www.youtube.com/watch?list=PLz8Iz-Fnk_eTpvd49Sa77NiF8Uqq5Iykx&v=ugTx-14jRrI&feature=emb_title). In most cases, the frameworks were designed for taking control of a single DOM element and managing a tree of dynamic elements in it, and their metaframework extends that to cover the entire site/app, including routing and static/server side rendering. 

I always liken metaframeworks to the Hulkbuster armor wrapping around the Iron Man suit, because they are heavier but more powerful, but also because I'm a massive Marvel fan.

## React Distros

So let's talk about React Distros.

Clearly the analogy is an apt one. If React is Linux, Vue is MacOS and Angular is Windows. Except here Linux has the most numbers. There are [dozens of Linux distros](https://www.techradar.com/best/best-linux-distros) built for varying kinds of users, all sharing the same underlying tech. To the extent that [React performs many of the functions of an operating system atop the browser](https://twitter.com/swyx/status/1139489436079542273), this is almost a literally true analogy. This is why I observed [last year](https://twitter.com/swyx/status/1139489436079542273):

> React’s refusal to have an opinion on things like styling and routing are the biggest source of frustration for users and also its biggest reason for success. 
>
> There isnt 1 framework called React, there are 1000s of artisanally handrolled fw’s. React gets credit for ALL of them.

This is at once React's best and worst feature - it's small surface area and unopinionatedness about many essential things means you not only get to pick and choose what you pair with it, you kind of *have to*.

I disagree with James that CRA is a bootloader - I think it is also a React distro, a decent one for Single Page Apps, but not even close to a perfect one.

Here is an incomplete list of React Distros:

- [React Native](https://facebook.github.io/react-native/) - a distro that builds to iOS and Android apps. One of few React distros to actually include good default components (because the target ecosystems do)
- [React Boilerplate](https://github.com/react-boilerplate/react-boilerplate) - probably the earliest React distro, just a boilerplate to be cloned
- [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) - for desktop apps
- [React 360](https://facebook.github.io/react-360/) - React for VR? sure.
- [React Ink](https://github.com/vadimdemedes/ink) - React for CLI's? why not.
- [Next.js](https://nextjs.org/) - Hybrid Server, Serverless, and Static Rendering. Plugin story surprisingly [nascent](https://github.com/zeit/next.js/issues/9133). Pages pull data.
- [Gatsby.js](https://www.gatsbyjs.org/) - Static Rendering with GraphQL data layer. Plugins galore. You can push and pull data to/from pages.
- [React Static](https://github.com/react-static/react-static) - Static Rendering with a simpler data layer. You push data to pages.
- [Create React App](https://create-react-app.dev/docs/getting-started/) - Single Page App starter with no data layer.
- [Ionic React](https://ionicframework.com/docs/react) - 100+ great React components, with cross platform targets and React Router built in under the hood
- [Docusaurus](https://docusaurus.io/) - Static Rendering with documentation focus. Locked down workflow from markdown to preset templates.
- [Storybook](https://storybook.js.org/) - Component Library playground that can do documentation and display non React components.
- [Meteor.js](https://guide.meteor.com/react.html) - A full stack framework that later adopted React.
- [Redwood](https://github.com/redwoodjs/redwood) - Tom Preston-Werner's upcoming full stack framework that includes a backend GraphQL layer
- [Blitz.js](https://github.com/blitz-js/blitz) - Brandon Bayer's new Rails + React metaframework

There are even metaframeworks atop metaframeworks:

- [Navi](https://github.com/frontarm/navi) and [CURA](Create Universal React App) - James' projects that add some level of routing and SSR on top of CRA
- [Docz](https://www.docz.site/) - Static Rendering of Docs with default TypeScript and MDX setups on top of Gatsby
- [Expo](https://expo.io/) - an excellent React Native distro focused on developer experience
- [React Native Web](https://github.com/necolas/react-native-web) - a RN distro for the web. See [my post on the RN singularity](https://www.swyx.io/writing/react-native-web-singularity/)
- [React XP](https://microsoft.github.io/reactxp/) - Microsoft's RN distro that includes building to Windows native apps

And [Parcel](https://parceljs.org/) and likely [Rome](http://romejs.dev/) follow the [Collapsing Layers](https://www.swyx.io/writing/collapsing-layers/) thesis and collapse the metaframework into the build tool (instead of having the metaframework circumscribe the build tool).

## What other React Distros should exist?

However I agree with James that there should be more React Distros, especially as we start addressing clearly defined usecases within the community. [He writes](https://twitter.com/james_k_nelson/status/1229653411336839169):

> But anyway, here's my ideal React distro:
> 
> ・ Out-of-the-box SSR
> ・ CSS-in-JS is easy － if you want it
> ・ Sane defaults for routing and data fetching/caching, and...
> ・ Works without GraphQL
> ・ Builds like CRA, but...
> ・ Allows Webpack configuration
> ・ And 🙅‍♂️ to fs-based routing

I agree with most of these except I like fs-based routing 😂

I think there are a bunch of toggles that you can play with to think about your needs and roll your own React distro or use one off the shelf. We covered some of this in the [State of /r/Reactjs Survey](https://www.swyx.io/writing/react-survey-2019/)

- Build Target
- State Management
- Data Layer
- Styling
- TypeScript support
- Testing

Notice that Routing is missing because of the de facto dominance of React Router, but of course Gatsby,  Next.js, React-Static, and Navi include their own router due to the need to integrate the data layer. React Native used to have more contention in routing, but React Navigation seems to be de facto now.

I happen to think [STAR apps](https://www.swyx.io/talks/star-apps/) are a good set of opinions for well-maintained apps. I also particularly like the pairing of Tailwind with the React model of classNames, which is why I have made [Rincewind](https://github.com/sw-yx/rincewind) as a basic proof of concept.

I also think we have a ways to go when it comes to authoring format. JSX files is almost certainly not the end state of things. I made an initial attempt at a [React SFC proposal](https://github.com/sw-yx/react-sfc-proposal) inspired by Vue, but I think Storybook actually got it right with [the Component Story Format](https://storybook.js.org/docs/formats/component-story-format/), and I think a React SFC will look closer to a standardized ESM file format than a custom template (The [Formats over Functions](https://www.swyx.io/writing/formats) thesis). Of course, [MDX](http://mdxjs.org/) also exists as a content format with React shortcodes, but I think it has potential as a full fledged Single File Component format - [MDSvex from the Svelte ecosystem](https://github.com/pngwn/mdsvex) is evolving towards this.

## React Distros for Toolmakers

Why should only app makers get React Distros?

I first made friends with Travis Fischer through discovering [create-react-library](https://www.npmjs.com/package/create-react-library). I also help maintain [TSDX](https://github.com/jaredpalmer/tsdx), a toolchain for building React + TypeScript libraries like [Formik](https://github.com/jaredpalmer/formik). As we start being able to bet on a stable foundation in the Deployment Phase, we can start making tools to help us make tools.