---
title: 2019 /r/ReactJS Survey Results
subtitle: Lessons from the Front Page of React
slug: react-survey-2019
categories: ['React']
date: 2020-02-13
---

[![https://pbs.twimg.com/media/EQrqygkW4AIxT0c?format=jpg&name=large](https://pbs.twimg.com/media/EQrqygkW4AIxT0c?format=jpg&name=large)](https://docs.google.com/presentation/d/1M-JUtp9I5_gSk8OpV9Adk9sYzhoU-VNcwz9RUJ1-8Sw/edit?usp=sharing)

I presented at [This Dot's online React meetup today](https://twitter.com/ThisDotLabs/status/1228049999537360897?s=20). 

## Here are [the slides that I made](https://docs.google.com/presentation/d/1M-JUtp9I5_gSk8OpV9Adk9sYzhoU-VNcwz9RUJ1-8Sw/edit#slide=id.p) 

Note that I do not at all take credit for the survey - I only made the slides and gave initial ideas - The survey and data munging only happened with the heavy lifting made of [/u/timmonsjg](http://reddit.com/u/timmonsjg) and reviews from the mod team on Reddit.

## TL;DW

Here are some pull quote facts for the lazy:

![https://pbs.twimg.com/media/EQrqygkWAAAkH-I?format=jpg&name=large](https://pbs.twimg.com/media/EQrqygkWAAAkH-I?format=jpg&name=large)

- **Demographics**
  - we hit 167k subscribers, with 1.2m pageviews a month. 
  - Mostly Europe and North America audience given our English bias. 
  - 37% of /r/reactjs subscribers don't identify as professional React devs - they work on other things and only incidentally use React (23%), or they are PMs and Designers looking to stay in touch (5%), or they are students (10%)
- **Build setup**
  - **Webpack powers 92% of React apps** via CRA, Nextjs, Gatsby, and other handrolled setups
- **State management**
  - No consensus here: 1/3 of devs use inbuilt tooling (Prop Drilling + React Context), 1/3 use Redux, 1/3 use other stuff like MobX/Apollo
- **Styling**
  - Wew. even less consensus.
  - Sass > Styled Components > Vanilla CSS > everything else
- **Hooks vs Classes**
  - 64% now code primarily in Hooks
  - 17% an equal mix of Hooks and Classes
  - 19% primarily in Classes
- **Types**
  - 48% don't use Types
  - 47% use TypeScript
  - Flow/PropTypes/ReasonML were all offered options but vanishingly small compared to others
- **Backend API**
  - 59% REST
  - 21% GraphQL
  - 16% JSON-API
- **Hosting**
  - 44% Static + Serverless
  - 34% VPS
  - 20% Self Hosted/Onsite
- **Testing**
  - Tricky one here as we allowed multiple choice and just did simple addition of all selected answers
  - **19% of React users don't write tests**
  - Jest is still the dominant testing tool at 31% of total responses
  - react-testing-library at 18% beat out Cypress and Enzyme at 10-11% each

## Qualitative

- What does well
  - Interactive Demos
  - React Native Demos
  - Portfolios
  - Chrome Extensions
  - Nostalgia (eg iPod, Windows 95 clones)
  - Free Workshops/YouTube Courses
  - Learning Roadmaps
  - Cheatsheets
  - Career advice and Encouragement
  - Algorithms
  - React Core Team

### What people want more of

![https://pbs.twimg.com/media/EQrqygiWoAEoAnb?format=jpg&name=large](https://pbs.twimg.com/media/EQrqygiWoAEoAnb?format=jpg&name=large)

  - “Weekly or monthly challenges to learn how to solve specific problems.”
  - “Would be glad if there is a megathread of tutorials. too many poorly written beginner articles out there”
  - “Maybe some educational sources can be compiled or prepared for advanced users.”
  - “stay up to date with new React standards and features; as well as to get other people's insight on good practice”

### What Beginners struggle with

![https://pbs.twimg.com/media/EQrqyg3WAAwjT6h?format=jpg&name=large](https://pbs.twimg.com/media/EQrqyg3WAAwjT6h?format=jpg&name=large)  

  - Code Review
  - Friendlier StackOverflow
  - “Why doesn’t this work!!!”
  - Styled-Components Questions
  - How do I get my first job?
  - “Do I have to learn classes if it is going to be deprecated?”
  - “I bound `this` and it still doesn’t work?”
  - CSS Questions
  - How to do skeleton loading?
  - How do I make parents and children communicate state?
  - What is `Uncaught SyntaxError: Unexpected token '<'`


## Meta

I didn't present this as it was less relevant to the meetup attendees but the main takeaways:

- people generally happy with the state of moderation
- 50% of respondents check /r/reactjs daily
- people want less newbie questions and blogspam
- people want more curation at all levels

I also adopted the branding of "/r/Reactjs is the Front Page of React" inspired by Reddit's "Front Page of the Internet" branding.

## Things we could have done better

We made a metric TON of mistakes. For example, running this survey in the dead of December at our seasonal traffic low when nobody is at work or wants to think or talk about work.

We also collected people's `package.json`s in an attempt to look at dependency correlations. It would have probably yielded some VERY promising insights unavailable anywhere else (particularly in closed source codebases). However, I don't think we did it very well (eg, not warning people in advance, so that if you were doing the survey on mobile you suddenly were ambushed with this "pls dump your deps here" question that you would need to head back to a laptop for) and so not many people did this.

We didn't ask anything about linting, or vim/IDEs, or Prettier, or animations, or specific questions on adoption of React Native.

What is maybe more important, we didn't ask GOOD questions about what people want.    
- What problems do they have in learning? 
- What arguments do they have at work? 
- Do they feel better or worse about the state of React today?
- What is one "crazy idea" that they wish someone would make (or build into React)?

We could have focused a lot more on asking these questions in order to probe deeper on solving "real" problems rather than stay at surface level numbers.

Next year I want to get past surface level shit and get deeper to the heart of understanding what people want and what people struggle with. Do that well and I think we give creators the intel to serve the community better. I'm realizing that that is ultimately the role of the community moderator - not to provide the answers but to provide the platform for great answers to emerge.