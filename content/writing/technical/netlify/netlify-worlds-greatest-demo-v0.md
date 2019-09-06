---
title: "The World's Greatest Netlify Demo v0"
slug: netlify-worlds-greatest-demo-v0
categories: ['Tech', 'Netlify']
started: 2019-08-26
date: 2019-09-05
published: false
---

Just planning out my demo:

Prerequisites:

- a static site
- a "build" step

Touch points:

Goal: what's available.

# Part 1: 🗺️ Netlify Edge

- 4 methods
  - Netlify Drop
  - Netlify CLI **separate video**
  - Continuous Deploy to Netlify
    - Deploy Hooks
    - Private repos https://community.netlify.com/t/common-issue-how-do-i-access-private-repositories-in-the-build-environment/723
  - Deploy to Netlify Button
    - https://templates.netlify.com/
    - more ways (Siri, Wand, Watch, CodeSandbox) https://community.netlify.com/t/common-issue-deploying-a-site-to-netlify-different-approaches/146
- Functions
  - setting Functions folder in app
  - setting Functions folder in netlify.toml
- Defaults
  - [HTTPS](https://www.netlify.com/docs/ssl/)
  - [Deploy Previews](https://www.netlify.com/docs/continuous-deployment/#branches-deploys)
    - [Branch deploys](https://www.netlify.com/docs/continuous-deployment/#branches-deploys)
    - Split testing
  - Distributed Deploys, Atomic Deploys, Instant Rollbacks
- Post Processing
  - Forms **separate video**
  - Mixed Content
  - Prerendering https://www.netlify.com/docs/prerendering/
  - [Asset Optimization](https://www.netlify.com/blog/2019/08/05/control-your-asset-optimization-settings-from-netlify.toml/)
    - Netlify Large Media
    - https://www.netlify.com/docs/large-media/
  - Snippet Injection
    - for GA, eg its more involved if you do it in Nuxt
- Netlify and Custom Domains
  - Custom Netlify Domain
  - Redirects
    - `_redirects` file
    - netlify.toml version
    - https://play.netlify.com/redirects
  - Headers
    - `_headers` file
    - netlify.toml version
    - https://play.netlify.com/headers
    - Cache control https://www.netlify.com/docs/headers-and-basic-auth/#multi-key-header-rules
    - Auth headers https://www.netlify.com/docs/headers-and-basic-auth/#basic-auth
  - [Custom Domains](https://www.netlify.com/docs/custom-domains/)
  - Netlify DNS
    - https://www.netlify.com/docs/dns/
    - https://community.netlify.com/t/common-issue-should-i-use-netlify-to-manage-my-dns/108
    - https://community.netlify.com/t/common-issue-minimal-downtime-for-a-live-site-dns-migration/141
  - Emails https://community.netlify.com/t/common-issue-how-can-i-receive-emails-on-my-domain/178
- CDN Tips
  - Faster deploys https://community.netlify.com/t/common-issue-making-the-most-of-netlifys-cdn-cache/127
  - Enterprise https://community.netlify.com/t/common-issue-what-is-the-difference-between-netlify-s-enterprise-cdn-and-normal-cdn/104

# Part 2: ⚒️ Netlify Build

- Netlify ❤️ Build Tools and SSGs
  - StaticGen.com
  - https://www.smashingmagazine.com/2015/11/modern-static-website-generators-next-big-thing/
- Understand The Build Process
  - You can always local build!!! You May Not Need CD™
  - Build Settings and where to set them
    - https://www.netlify.com/docs/build-settings/
    - in app
    - netlify.toml (override)
  - the Build Bot
    - https://www.netlify.com/blog/2016/10/18/how-our-build-bots-build-sites/
    - https://github.com/netlify/build-image/blob/master/run-build.sh
  - Build stages and Reading Logs
    - https://app.netlify.com/sites/app/deploys
    - https://app.netlify.com/sites/www/
    - Fetch from cache
      - NETLIFY_CACHE_DIR = "/opt/build/cache"
      - https://github.com/DavidWells/cache-me-outside
    - Install
    - Build
    - Package & optimize
    - Save cache
    - Deploy
    - Output manifest
  - Concurrent Builds and Canceling Builds
  - Gotchas
    - https://www.netlify.com/docs/build-gotchas/
    - 15 min rule
    - Permissions and API Secrets
    - Think about what folder you are deploying
    - https://community.netlify.com/t/common-issue-frequently-encountered-problems-during-builds/213
  - Troubleshooting
    - Read your build logs
    - Make sure you can build locally
    - Hidden Dependencies
      - Environment version
      - Yarn vs npm
      - Preinstalled Grunt/Hugo/Bower etc
    - https://community.netlify.com
- Environment Variables
  - Where to set them
  - https://gist.github.com/sw-yx/c53634e7e63f0015e43c16bc26832283
  - https://scotch.io/@sw-yx/netlify-environment-variables-the-cheat-codes-of-the-internet

# Part 3: 👩🏼‍💻 Netlify Dev

- netlify-lambda
- Netlify Dev => **separate video**

- 4: 📈 Netlify Addons
  - Analytics
  - Forms => **separate video**
  - Identity => **separate video**
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
