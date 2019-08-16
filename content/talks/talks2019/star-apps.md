---
title: STAR Apps
slug: star-apps
topic: STAR
venues: Oredev
date: 2019-11-07
published: false
url: https://oredev.org/
article: https://css-tricks.com/star-apps-a-new-generation-of-front-end-tooling-for-development-workflows/
desc: Design Systems, TypeScript, Apollo GraphQL, and React
description: A new front-end stack is emerging, with one theme - constraints that scale. They involve building Design Systems for visual consistency, using TypeScript for internal consistency, Apollo GraphQL for data manipulation, and server- or statically-rendered React for data representation. In this talk we explore how these trends fit together, and _why_ leading product teams from AirBnb to the New York Times are embracing them.
---

Details:

This will be a high-level architecture, patterns, and tooling talk, that will tie together multiple disparate trends and hopefully present a convincing thesis: that we are at a beginning of a movement that is leading large tech companies to invest heavily in front-end technologies that impose constraints that allow teams to collaborate and ship at scale.

Having these opinions allow us to build a React-based framework that bake in these opinions, and that is something I hope to demo as React's answer to the outstanding work that has been done by the Vue CLI/UI team.

Talk structure:

- Introducing and defining Design Systems and the tools used
- Introducing TypeScript and why teams have embraced it for large React apps
- Introducing Apollo and why it has become the leading GraphQL client for React
- Discussing server-side (Next.js) vs static (Gatsby) React why React is still growing at >70% annually
- Exploring combinations:
  - Design Systems + React: React-sketchapp, Framer X
  - GraphQL + React: Discussing the componentization of Data
  - TypeScript + React: Documentation, and static checking vs proptypes
- Introducing a React-based framework and CLI that ties in all these patterns as a proof of concept
- Inviting the audience to explore how these trends are expressions of a deeper underlying desire for better tooling that matches the needs of product engineering teams.

Pitch:

Sometimes it can be hard to find method among the madness of all the different trendy technologies in web development. Old hands are rightfully cynical and fatigued with hot new things. However, some trends, like React, do end up "winning" and persisting over many years, making them very worthwhile investments. Much like we invest in stocks and real estate, it is worth developing an investment thesis around open source technologies and architectures, in order to have a framework for deciding what to invest in and build on.

As a former investment analyst, I hope to bring that market analysis perspective to developers who may not view the open source world through this lens, and hopefully explain why these trends may come together in a "superframework" that covers Design Systems, TypeScript, ApolloGraphQL, and React, or something that looks like it. My personal involvement is having worked on an app that uses all these technologies and seeing the benefits of a cohesive philosophy around consistency and data, as well as having taken stock of what multiple large tech companies are reporting they invest in.
