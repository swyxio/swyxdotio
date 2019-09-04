---
title: "The World's Greatest Netlify Demo v0"
slug: netlify-worlds-greatest-demo-v0
categories: ['Tech', 'Netlify']
date: 2019-08-26
published: false
---

Just planning out my demo:

Prerequisites:

- a static site
- a "build" step

Touch points:

Goal: what's available.

- 1: Deploy
  - 4 methods
    - Netlify Drop
    - Netlify CLI **separate video**
    - Continuous Deploy to Netlify
      - Deploy Hooks
    - Deploy to Netlify Button
  - Defaults
    - [HTTPS](https://www.netlify.com/docs/ssl/)
    - [Deploy Previews](https://www.netlify.com/docs/continuous-deployment/#branches-deploys)
      - [Branch deploys](https://www.netlify.com/docs/continuous-deployment/#branches-deploys)
    - Distributed Deploys, Atomic Deploys, Instant Rollbacks
    - [Asset Optimization](https://www.netlify.com/blog/2019/08/05/control-your-asset-optimization-settings-from-netlify.toml/)
  - Netlify and Custom Domains
    - Custom Netlify Domain
    - Redirects
    - [Custom Domains](https://www.netlify.com/docs/custom-domains/)
    - [Managed DNS](https://www.netlify.com/docs/dns/)
- 2: Build
  - Understand The Build Process
  - Environment Variables
    - https://www.netlify.com/docs/build-settings/
    - https://scotch.io/@sw-yx/netlify-environment-variables-the-cheat-codes-of-the-internet
- 3: Develop
  - netlify-lambda
  - Netlify Dev => **separate video**
- 4: Add
  - Functions => **separate video**
  - Snippet Injection
    - for GA, eg its more involved if you do it in Nuxt
  - Forms => **separate video**
  - Identity => **separate video**
  - Analytics
  - Split Testing
  - NetlifyCMS => **separate video**
- Troubleshoot
  - http://community.netlify.com
  - https://www.netlify.com/support/
  - https://www.netlify.com/docs/build-gotchas/
- Learn More
  - jamstackconf.com
  - http://jamstack.org
  - https://jamstack.slack.com
  - https://www.thenewdynamic.org/community/
  - OReilly Book https://www.netlify.com/oreilly-jamstack/
