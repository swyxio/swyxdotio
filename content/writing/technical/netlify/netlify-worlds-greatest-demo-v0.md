---
title: The World's Greatest Netlify Demo v0
slug: netlify-worlds-greatest-demo-v0
categories: ['Tech', 'Netlify']
started: 2019-08-26
date: 2019-09-24
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
    - Private repos https://url.netlify.com/rJ-WZsqwS
  - Deploy to Netlify Button
    - https://url.netlify.com/SkmMWo5wH
    - more ways (Siri, Wand, Watch, CodeSandbox) https://url.netlify.com/rkRMZjcPB
- Functions
  - add a sample JS and Go function
  - setting Functions folder in app
  - setting Functions folder in netlify.toml
  - Event Triggered Functions
    - `deploy-building`, `deploy-succeeded`, `deploy-failed`, `deploy-locked`, `deploy-unlocked`
    - Env variables
      - INCOMING_HOOK_TITLE, INCOMING_HOOK_URL, INCOMING_HOOK_BODY https://url.netlify.com/ryqXbo5Pr
  - AWS Lambda versions: AWS_LAMBDA_JS_RUNTIME nodejs10.x
- Defaults
  - [HTTPS](https://url.netlify.com/S1LVbsqDH)
  - [Deploy Previews](https://url.netlify.com/By4cWi5Pr)
    - [Branch deploys](https://url.netlify.com/HyBHboqvB)
    - Split testing
      - `split-test-activated`, `split-test-deactivated`, `split-test-modified`
  - Distributed Deploys, Atomic Deploys, Instant Rollbacks
- Post Processing
  - Forms **separate video**
  - Mixed Content
  - Prerendering https://url.netlify.com/S1Hj-i9wr
  - [Asset Optimization](https://url.netlify.com/r1fnZjqvS)
    - Netlify Large Media
    - https://url.netlify.com/HyRnZsqDH
  - Snippet Injection
    - for GA, eg its more involved if you do it in Nuxt
- Netlify and Custom Domains
  - Custom Netlify Domain
  - Redirects
    - `_redirects` file
    - netlify.toml version
    - Redirects Playground https://url.netlify.com/Syk0-s5wB
  - Headers
    - `_headers` file
    - netlify.toml version
    - Headers Playground https://url.netlify.com/SJlkMiqDr
    - Cache control https://url.netlify.com/By2kfoqwr
    - Auth headers https://url.netlify.com/HkLlfjcwr
  - [Custom Domains](https://url.netlify.com/B16efs9vr)
  - Netlify DNS
    - DNS Docs https://url.netlify.com/Bk5-GsqwB
    - Community Common Issue: Should you use Netlify DNS? https://url.netlify.com/Sy_MficDr
    - Migrating to Netlify DNS with minimal downtime https://url.netlify.com/HykBGocvB
  - Emails https://url.netlify.com/SkWIMi5PH
- CDN Tips
  - Faster deploys https://url.netlify.com/BJiLMscDB
  - Enterprise https://url.netlify.com/B1zvGsqDS

# Part 2: ⚒️ Netlify Build

- Netlify ❤️ Build Tools and SSGs
  - StaticGen.com https://url.netlify.com/ryQFMscwr
  - https://www.smashingmagazine.com/2015/11/modern-static-website-generators-next-big-thing/
- Understand The Build Process
  - You can always local build!!! You May Not Need CD™
  - Build Settings and where to set them
    - Build Settings Docs https://url.netlify.com/Syr5ficPH
    - in app
    - netlify.toml (override)
  - the Build Bot
    - How it Works https://url.netlify.com/BJMifs9wS
    - https://github.com/netlify/build-image/blob/master/run-build.sh
  - Build stages and Reading Logs
    - Netlify App Logs https://url.netlify.com/SJEpGi9wH
    - Netlify Site Logs https://url.netlify.com/BykRMi9Pr
    - Fetch from cache
      - NETLIFY_CACHE_DIR = "/opt/build/cache"
      - https://github.com/DavidWells/cache-me-outside
    - Install
    - Build
    - Package & optimize
    - Save cache
    - (post processing)
    - Deploy
    - Output manifest
  - Concurrent Builds and Canceling Builds
  - Gotchas
    - Common Build Gotchas https://url.netlify.com/H1hAMocDH
    - 15 min rule
    - Permissions and API Secrets
    - Think about what folder you are deploying
    - Community Build tips https://url.netlify.com/BJjJ7jqDH
  - Troubleshooting
    - Read your build logs
    - Make sure you can build locally
    - Hidden Dependencies
      - Environment version
      - Yarn vs npm
      - Preinstalled Grunt/Hugo/Bower etc
    - Netlify Community https://url.netlify.com/BysgQs5wS
- Environment Variables
  - Where to set them
  - https://gist.github.com/sw-yx/c53634e7e63f0015e43c16bc26832283
  - https://scotch.io/@sw-yx/netlify-environment-variables-the-cheat-codes-of-the-internet

# Part 3: 👩🏼‍💻 Netlify Dev

- Netlify Dev
  - Docs https://url.netlify.com/B1k5Xjcvr
  - netlify dev (netlify.toml)
    - command
    - port
  - netlify dev (detector)
    - env vars
    - redirects
  - netlify dev --live (_beta_)
  - netlify functions:create
  - netlify functions:invoke
- netlify-lambda
  - netlify-lambda install
  - netlify-lambda build

# Part 4: 🗒️ Netlify Forms

- Introducing Forms in plain HTML
- File Uploads
- Customize Post-Submit page
- Slack/Email/Webhook Notifications
- Zapier
- `submission-created`
- Spam Filtering
  - Akismet
  - Honeypot
  - Recaptcha
- Forms in Single Page Apps
- Forms in Gatsby
- AJAX form submissions

# Part 5: 🆔 Netlify Identity

- Before Identity: Password Protection and Role Based Access Control
  - Netlify Password Protection https://url.netlify.com/Sk1fQoqvB
  - Netlify RBAC https://url.netlify.com/HkoMXjqvH
- Identity
  - Enable Netlify Identity
  - Identity on a boilerplate
  - Adding `netlify-identity-widget`
  - Important settings
    - open signup vs invite only
    - confirm vs don't confirm
    - External providers
    - Email templates
  - Metadata
    - User metadata
    - App metadata
  - `gotrue-js` and friends
    - `gotrue`
    - `react-netlify-identity`
    - `react-netlify-identity-widget`
    - `gatsby-plugin-react-netlify-identity`
  - Authenticated Functions: Identity + Functions
    - `netlify functions:invoke`
  - Event Triggered Functions
    - `identity-validate`: before sign up
    - `identity-signup`: on sign up
      - Note: this fires for only email+password signups, not for signups via external providers e.g. Google/GitHub
    - `identity-login`: on log in
  - Retrieving Netlify Form Info in Function
    - https://jamstack-comments.netlify.com
    - https://open-api.netlify.com/
  - Paid features
    - Branded OAuth
    - SSO
    - Audit log
    - Custom sender

# Part 6: ✍️ NetlifyCMS

- Concepts and Config
  - Admin Endpoint: /admin
  - Writing: WYSIWYG and Previewing
  - Editorial Workflow: Draft - Review - Ready
  - Media and Public folders
  - NetlifyCMS Backends
    - Git Gateway + Netlify Identity
      - Docs https://url.netlify.com/SyTimjcwS
      - https://github.com/netlify/git-gateway
      - https://www.netlifycms.org/docs/authentication-backends/
    - GitHub backend
    - GitLab backend
    - Bitbucket backend
- Clone from Template
- Config
  - https://www.netlifycms.org/docs/configuration-options/
  - Collections
    - Folder vs File
      - https://www.netlifycms.org/docs/collection-types/
    - Filter (published?)
    - https://www.netlifycms.org/docs/add-to-your-site/#collections
  - Widgets
    - Default Widgets
    - Custom Widgets
- Scheduled Posts
  - Zapier Netlify Integration https://url.netlify.com/SkP77i9DH
  - https://flaviocopes.com/netlify-auto-deploy/
  - https://davidwells.io/work/static-site-post-scheduler
- Media
  - Cloudinary
  - Uploadcare
  - Netlify Large Media

# Part 7: ➕ Netlify Addons: Everything Else!

- Analytics
  - Netlify Analytics Product Page https://url.netlify.com/SkNVQs9wB
  - Analytics Docs https://url.netlify.com/r1OB7ocwB
  - Unblockable, No personal info
  - What unique visitors are
  - Missing files
- Large Media
  - https://git-lfs.github.com/
  - Large Media Docs https://url.netlify.com/HyRnZsqDH
  - Large Media Product Page https://url.netlify.com/SJoX4i9DS
  - https://netlify-photo-gallery.netlify.com
  - Image Transformation Docs https://url.netlify.com/BkOEEi5wB
- Addon Marketplace
  - Partner Addon Docs https://url.netlify.com/SyrSNo5PB
  - Fauna DB
    - What is Fauna? https://softwareengineeringdaily.com/2019/03/21/faunadb-with-evan-weaver/
    - Functions + Fauna Blogpost https://url.netlify.com/B1MLEi9vr
    - Fauna Addon Announcement https://url.netlify.com/HJ0UVicDH
    - https://github.com/fauna/netlify-faunadb-todomvc
    - https://github.com/netlify/netlify-faunadb-example
    - https://docs.fauna.com/fauna/current/start/netlify
  - Very Good Security
    - https://www.youtube.com/watch?v=k2I_4u8_I9s
    - https://www.youtube.com/watch?v=wtYzLdpSeJo
    - https://www.verygoodsecurity.com/docs/getting-started
    - https://www.verygoodsecurity.com/docs/integrations/netlify
    - https://github.com/verygoodsecurity/netlify-addon-demo
    - https://github.com/verygoodsecurity/netlify-addon-example
- Premium Addons
  - Support
  - Performance ADN

# Part 8: 🍻 Netlify API

- Make Your Own Netlify Client
- Example Clients
  - https://app.netlify.com
  - https://github.com/netlify/cli
  - https://github.com/stefanjudis/netlify-menubar
  - https://github.com/ShailenNaidoo/Netlify
- API docs https://url.netlify.com/H1zONoqDr
- OpenAPI docsite https://url.netlify.com/rJ6dVo5wH
- Netlify Libraries
  - https://github.com/netlify/js-client
  - https://github.com/netlify/open-api
  - https://github.com/netlify/cli-utils/

# Part 9: ❓ Learn More

- Status
  - https://twitter.com/netlifystatus
  - https://www.netlifystatus.com/
- Troubleshoot
  - https://www.netlify.com/docs/build-gotchas/
  - http://community.netlify.com
  - https://www.netlify.com/support/
  - https://twitter.com/netlifysupport
- Talks
  - Mathias Biilmann https://vimeo.com/163522126
  - Chris Coyier https://youtu.be/VwjXUGFQjYg
  - Sarah Drasner https://youtu.be/COAVmST41Q0
  - Phil Hawksworth https://vimeo.com/348733803
  - Citrix's Beth Pollock & Luis Ugarte - Delivering more to customers with less overhead https://youtu.be/kvS5h5domf0
  - Quincy Larson - How freeCodeCamp Serves Millions of Learners Using the JAMstack https://youtu.be/NVRsYrUl6Cg
  - Paypal's Jamund Ferguson https://www.infoq.com/presentations/jamstack-enterprise/
- VC perspective
  - a16z https://a16z.com/2017/08/09/netlify/
  - KPCB https://www.kleinerperkins.com/perspectives/netlify-modernizing-the-web/
  - Redpoint https://medium.com/memory-leak/the-jamstack-its-pretty-sweet-e0834e4e6bb7
  - CRV https://medium.com/crv-insights/the-jamstack-startup-landscape-c06cc3cdb917
- Learn More
  - jamstackconf.com
  - http://jamstack.org
  - https://jamstack.slack.com
  - https://www.thenewdynamic.org/community/
  - JAMstack Radio https://www.heavybit.com/library/podcasts/jamstack-radio/ep-1-introducing-jamstack-radio/
  - OReilly Book https://www.netlify.com/oreilly-jamstack/?utm_source=freecodecamp&utm_medium=fcc9partswyx&utm_campaign=devex
