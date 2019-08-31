---
title: 'JAMstack for Indie Hackers'
slug: netlify-jamstack-indiehackers
categories: ['Tech', 'Netlify']
date: 2019-09-01
published: false
---

You can make money _with_ the JAMstack or _on_ the JAMstack. I have spent the last year at Netlify, working at the heart of the JAMstack ecosystem, and when [Derrick Reimer](https://derrickreimer.com) reached out to have a chat about [StaticKit](http://statickit.com), I immediately realized that what I've learned could be helpful to a broader Indie Hacker audience. Here's what I know.

## What is the JAMstack?

There are two ways to discuss the JAMstack:

- **What it stands for**: JAMstack is a modern web architecture emphasizing **J**avaScript, **A**PIs, and prerendered **M**arkup, _served without web servers_. That last part is important; for example, deploying on Netlify means directly deploying to a CDN. There is no origin server to manage or scale. In fact, [Chris Coyier](https://twitter.com/chriscoyier/) recently argued that [Static Hosting is the only necesssary part](https://css-tricks.com/jamstack-more-like-shamstack/) of JAMstack. However, the JAMstack movement does also promote optional [best practices](https://jamstack.org/best-practices/) including using [Static Site Generators](https://www.smashingmagazine.com/2015/11/modern-static-website-generators-next-big-thing/) and [Git-centric Workflow](https://www.software.com/review/supercharge-web-development-with-git-and-netlify).
- **Why it's better**: Well, let's be honest, everything has tradeoffs. But the argument is that you can create fast and secure sites, as well as dynamic apps, with JAMstack technologies.
  - For people coming from a traditional CMS setup, decoupling your stack not only reduces the hackable surface area, but frees you up to use more modern technologies and designs on the frontend, as well as the ability to bring in content from other sources like Airtable without needing to find just the right plugin. This is why major CMSes like [Wordpress](https://www.elegantthemes.com/blog/wordpress/headless-wordpress), [Drupal](https://decoupleddays.com/) and [Ghost](https://ghost.org/blog/jamstack/) are all going headless, and new CMSes like [Sanity](https://headlesscms.org/projects/sanity) and [Contentful](https://headlesscms.org/projects/butter-cms) are gaining traction being [headless from the start](https://headlesscms.org).
  - For developers, the (optional) emphasis on [Static Site Generators](https://www.smashingmagazine.com/2015/11/modern-static-website-generators-next-big-thing/) and [Git-centric Workflow](https://www.software.com/review/supercharge-web-development-with-git-and-netlify) gets you fast performance and continuous deployment by default. More on developer friendly-angles below. What's wonderful about JAMstack is that it doesn't have to be cutting edge at all - it is more about architecture than technology, and more a return to simplicity than a new fad. However, JAMstack apps _are_ undeniably given new capabilities by the new generation of JS frameworks that rehydrate from static sites into fully dynamic apps on the client, offering a seamless progressive upgrade of experience.
  - For the financially minded, total cost of ownership is also often lower, because static hosting is cheap, and the cost of pinging first and third party APIs scales up effortlessly and scales down to zero. This means fixed costs become variable costs, which seems to right way to start any MVP. This opens up new opportunities for indie businesses, which we will discuss below.

The best person to learn about the JAMstack from is the co-founder of Netlify, [Mathias Biilmann](https://twitter.com/biilmann). My first real a-ha moment was when watching [his talk at SmashingConf on The New Front-end Stack](https://vimeo.com/163522126). It's probably worth mentioning you don't have to use Netlify to be JAMstack - [Zeit](https://zeit.co), [Firebase](https://firebase.google.com) and [Amplify Console](https://aws.amazon.com/amplify/console/) all count and you can even [wire up your own JAMstack infrastructure if you have to, like Paypal](https://www.infoq.com/presentations/jamstack-enterprise/)! I have been continually awed by other perspectives from [Chris Coyier](https://full-stack.netlify.com), founder of Codepen and CSS Tricks, and [Tom Preston-Werner](https://twitter.com/mojombo/status/1016506622477135872), founder of GitHub and creator of both [Jekyll](https://github.com/mojombo/mojombo.github.io) and [GitHub Pages](https://github.blog/2008-12-18-github-pages/), arguably the first movers of the modern static site revival, as well as all the other speakers in the new-ish [JAMstack_Conf series of conferences](https://jamstackconf.com).

If you prefer reading to watching talks, you can check out [JAMstack.org](https://jamstack.org/) as well as the recently published [O'Reilly book on JAMstack](https://www.netlify.com/oreilly-jamstack/).

## At Least Your Landing Page Should Be JAMstack

I find there is very little argument for having your marketing site NOT be JAMstack. A Twitter friend of mine recently lauched a side project he'd been laboring over for 9 months on Product Hunt. Unbeknownst to him it got to the top of HN a day later when he wasn't watching. HN brought in tens of thousands of hits and the site went down for hours... and my friend didn't know, because he thought his launch was done. Given a conservative estimate of 10,000 missed visitors and a 1% conversion rate, that is 100 users that were lost because the server went down.

That's real money.

Of course, on managed platforms like Heroku, you can simply set auto restart and auto scale settings, but that will still cost. Better to just have a clean separation of `www.mysweetproject.com` and `app.mysweetproject.com`.

In particular, if your marketing site is JAMstack, launch days are far less stressful because your landing pages aren't vulnerable to being "hugged to death", keeping the top of your funnel open and only assigning compute resources to users that actually sign up. As a result of JAMstackifying, your marketing pages will probably also load faster, which matters for a first impression.

## Continuous Deployment

## Platform by Default

Additionally, ensuring strict separation between your APIs (which can either be microservices or serverless functions you maintain, or third party APIs others provide) and your markup generation means that you don't need a major refactor if you decide to add a mobile or desktop client. In particular, especially if you run a strict ["backend for frontend" or API Gateway](https://samnewman.io/patterns/architectural/bff/) layer, you can consider yourself simply the first consumer of a generalizable developer platform you are creating, which makes opening up your ~~app~~ platform to whitelabel or third party developers trivial.
