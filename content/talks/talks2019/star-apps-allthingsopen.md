---
title: STAR Apps (All Things Open)
slug: star-apps-allthingsopen
topic: STAR
venues: All Things Open
date: 2019-10-14
url: https://allthingsopen.org/schedule/
video: https://www.youtube.com/watch?v=vLVnwlrMDD0
tweet: https://twitter.com/swyx/status/1183884912321060864
article: https://css-tricks.com/star-apps-a-new-generation-of-front-end-tooling-for-development-workflows/
desc: Storybook, TypeScript, Apollo GraphQL, and React
description: A new front-end stack is emerging, with one theme - constraints that scale. They involve building Design Systems for visual consistency, using TypeScript for internal consistency, Apollo GraphQL for data manipulation, and server- or statically-rendered React for data representation. In this talk we explore how these trends fit together, and _why_ leading product teams from AirBnb to the New York Times are embracing them.
---

## Structure

- Cold Open: What is driving Front-End Architecture decisions today?
- Look at various stories
  - Airbnb TypeScript
  - NYT
  - Shopify
  - Artsy
  - Paypal
  - Circle CI
  - maybe:
    - Medium
    - Codepen
    - Netlify
    - Twitter
- What are people using?
  - Storybook
  - TypeScript
  - Apollo GraphQL
  - React (Next.js/Gatsby)
- 🌟STAR Apps
  - Design Systems
  - Static Typing
  - Smart APIs
  - Static or Server Rendering
- Why are people using it?
  - Visual Consistency
  - Internal Consistency
  - Data Manipulation
  - Data Representation
- Dangers
  - Learning Curve
  - Tool Churn
  - Open Source
  - Upfront Work
- All about the workflow!
  - Stronger Types (T + A)
  - Designer - Developer Workflow (S + R)
  - Documentation (T + S)
  - Performance (A + R)
  - Optimized for Change (R)
- Close: What is driving ~~Front-End~~ Product Architecture decisions today?

---

## Resources

- https://softwareengineeringdaily.com/2018/10/22/react-and-graphql-at-the-nytimes/
  - React has already been paying dividends at the Times. Development teams have been able to collaborate faster and with less duplications in code via reusable components on the front end. Being able to plan around components has helped many teams centralize around one central language, rather than the collection of disparate languages and repositories in the past.
  - GraphQL has also been a benefit because it allows one central API to read data from on the front-end, while on the back-end lots of different services and databases can connect to GraphQL to deliver that data to end-user devices.
  - The real benefit of a GraphQL client lies in binding the data to to your React components. While GraphQL does a great job of abstracting away all of the different data sources you want to fetch from, it doesn’t do the best job when it returns all of that varied data. That’s where these clients come in. Tools like Relay and Apollo will take in all of that data and make it easy to consume for your React components. They are meant to be the front-end frameworks for hooking up your UI to your data.
- https://blog.codepen.io/2019/07/18/230-apollo/
  - What is cool about Apollo and GraphQL is that it is very modular. If I'm writing a component, I can make a query for that component without having to deal with all the data pulling boilerplate. All you have to do is say "this is the data I want" at the top of the file and in the component code, you use that data. And that is it. It empowers the frontend to do what the frontend does best.
  - cassidoo
- https://www.infoq.com/presentations/jamstack-enterprise/
  - You've probably heard of static site generators and Gatsby's lumped in as a static site generator, but it does way more than generating a static site. It doesn't just generate HTML, as you can see in this very complicated diagram from the Gatsby web page, it pulls in content from whatever sources you have, whether it's services, things like that, it then takes all the React components that you're using to build your site and sort of spits out both HTML as well as optimize JavaScript. Then when your web page actually loads, it will hydrate your application. Meaning it will become a fully interactive web application. Some people will describe Gatsby as a progressive web app generator, a PWA generator. I think that's a better name than static site generator because these are fully interactive web apps.

## Recasting STAR

- Rationale/Framing
  - Design Systems
  - Static Typechecks
  - Smart APIs
  - Static or Server Rendering

## Original Pitch

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
