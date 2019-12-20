---
title: No Code JAMstack with Shawn Wang
slug: sedaily-nocode
topic: No Code
venues: SEDaily
date: 2019-12-19
url: https://softwareengineeringdaily.com/2019/12/19/no-code-with-shawn-wang/
description: We know that no-code tools can create value. But how do they fit into the overall workflow of a software company? How should teams be arranged now that knowledge workers can build certain kinds of software without writing code? And how should no-code systems interface with the monoliths, microservices, and APIs that we have building for years?
---

- [Podcast Link](https://softwareengineeringdaily.com/2019/12/19/no-code-with-shawn-wang/)
- [Download Podcast](http://traffic.libsyn.com/sedaily/2019_12_19_SwyxLowCodeJAMStack.mp3)

## No Code

- Why is no code interesting to Software Engineers?
  - Business opportunity
  - Developer productivity
- Should no code users be worried about platform lockin?
  - Yes
  - We have to understand what the good abstractions are and where complexity overtakes convenience
  - Software Engineers have a unique advantage here
- What duties should no code platforms fulfil? just UI layer? Shopify store? What are the borders?
  - Nothing definite yet
  - [Webflow Blogpost: No Code is a Lie](https://webflow.com/blog/no-code-is-a-lie)
  - But everything can have a GUI layer - leading the API economy to transform into the GUI economy
  - Even the Vue ecosystem has added a [UI on top of their CLI](https://cli.vuejs.org/dev-guide/ui-api.html)
  - State machines in UI Development - [David Khourshid at React Rally](https://www.youtube.com/watch?v=VU1NKX6Qkxc)
  - visual IDEs are winning over text editors
  - [Bret Victor - the Future of Programming](https://vimeo.com/71278954)
  - **EDIT: THINGS I FORGOT TO MENTION**
  - Shopify and Wordpress are basically No Code platforms on top of Rails and PHP
  - there is also a trend of big platforms implementing internal no-code solutions:
    - [Slack Workflow Builder](https://slack.com/intl/en-sg/help/articles/360035692513-Guide-to-Workflow-Builder)
    - [Asana No Code solution](https://webflow.com/nocodeconf/session/making-automation-feel-more-human)
    - [Salesforce No Code](https://webflow.com/nocodeconf/session/progressive-enhancement-a-mindset-for-designing-no-code-platforms)
- What is available in the GUI economy?
  - CSS
  - CMS
  - Ecommerce
  - PaaS
  - As developers, we use no code tools in our daily work
  - Nobody wants to use Passport.js anymore, we rather farm it out to Okta and Auth0

## JAMstack

- What is the JAMstack?
  - [Jamstack Conf](https://jamstackconf.com/)
  - [Jamstack.org](http://jamstack.org/)
  - [GitHub Pages](https://pages.github.com/)
- How do you compare JAMstack to No Code?
  - Very comparable - JAMstack is "No Code backend" - serves frontend developers
  - But there are more people who just aren't developers at all
  - Non developers need a bit more handholding - frontend devs can at least help debug
  - JAMstack vs No Code is similar to Figma vs Canva
- What code are you writing in the JAMstack?
  - Frontend + Glue code
  - In a No Code stack, you have to find your own frontend
  - heavily overlapping paradigms
  - Can go from No Code to JAMstack often, but not other way round
- Are enterprises building JAMstack applications?
  - Sites:
    - [Citrix's migration story](https://www.netlify.com/blog/2019/06/12/jamstack_conf-nyc-session-recap-citrix-delivers-better-ux-with-less-overhead-using-jamstack-and-netlify/)
    - [Trinet on Netlify](https://is-this.netlify.com/trinet.com)
  - Ecommerce:
    - [Loblaw's migration story](https://www.youtube.com/watch?v=6VGu4PvEBag)
    - [Popeye's migration story](https://www.youtube.com/watch?v=dKBDUhGi76o)
    - [Nike agency story](https://www.youtube.com/watch?v=2rA_ucpQ_Fk)
  - Apps:
    - Paypal - [Bringing JAMstack to the Enterprise](https://www.infoq.com/presentations/jamstack-enterprise/)
- JAMstack as the counterpart to serverless
- Precompilation in the JAMstack - help me understand Gatsby
  - Gatsby < React < JS
  - Gatsby helps give a good default Webpack config for performance
  - Webpack allows modules, preprocessing of code and images etc
  - Having build steps has problems, but is a net benefit for users by shipping more optimal
  - Gatsby allows you to pull in data pipeline aka content mesh

## Code

- React vs Vue
  - Vue easier to start with
  - React has more jobs
  - FB dogfoods React
  - React as a universal UI language
  - Tom Dale - [Compilers are the new Frameworks](https://tomdale.net/2017/09/compilers-are-the-new-frameworks/)
- Difference between SSR and Compiling
  - SSR generates HTML
  - Compiling framework runtime/footprint
  - React is trying to help optimize overall app footprint

## Career

- Learning in Public
  - Essay https://www.swyx.io/writing/learn-in-public/
  - Talk https://www.swyx.io/speaking/learn-in-public-nyc
- The Internet rewards spiky people
- [DHH Apple Card story](https://www.bloomberg.com/news/articles/2019-11-09/viral-tweet-about-apple-card-leads-to-probe-into-goldman-sachs)
- [Sophie Alpert \$600 story](https://twitter.com/sophiebits/status/1193686558206877696?lang=en)
- [David Perell: Naked Brands](https://www.perell.com/blog/the-future-of-finance)
- [React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet)
