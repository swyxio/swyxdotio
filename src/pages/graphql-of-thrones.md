---
title: GraphQL of Thrones
date: "2017-10-18"
indexscreenshot: /images/graphql.jpg-large
landingscreenshot: /images/graphqlofthrones.gif
link: "https://graphql-of-thrones.herokuapp.com"
github: "https://github.com/sw-yx/FSA-GraphQL-of-Thrones"
blurb: "What if Game of Thrones characters used GraphQL? 🎲"
blurb2: "Inspired by Flexbox Froggy and CSS Grid Garden, this is a game to progressively learn the basic API of GraphQL without getting lost in all the tooling. Alternate between LEARN and PLAY modes reimagining how Game of Thrones characters could solve their problems with GraphQL."
stack: apollo graphql react redux swyx styled-components css-animation
---

GraphQL is seemingly taking over the world and I decided to learn by teaching.

The problem with the GraphQL tutorials out there is that things generally go from "hey watch this video to see why GraphQL is theoretically awesome" to "here is 5 pages of code you need to copy and paste to get the client and server up and running trust me don't worry about it. Oh also be aware of the differences between the 3-4 different server implementations and between Relay and Apollo".

The user hasn't had a chance to be sold yet! Let's take it easy.

To achieve this:

- I created the entire course platform (state managed and persisted clientside with redux) from scratch, cloning css from [Codecademy](http://codecademy.com/learn/learn-html) using [styled components](https://www.styled-components.com/docs/basics).
- [Forked Facebook's `graphiql` implementation](https://www.npmjs.com/package/swyx-graphiql) and put it up on the frontend (not advised!) to put my own tweaks on it
- Created 15 levels of content (all in simple markdown thanks to [react-markings](http://thejameskyle.com/react-markings.html)) to teach the user GraphQL's basic API in an entertaining way
- implemented [CSS animation buttons](https://codepen.io/aundrekerr/pen/GtLul/) after taking feedback from user testing
- Backend provided by my own experimental thin framework <https://www.npmjs.com/package/swyx>

This was done in 1 week as a Fullstack capstone project guided by Gabriel.

It is already paying dividends days later as I can use GraphQL in GatsbyJS without much afterthought.