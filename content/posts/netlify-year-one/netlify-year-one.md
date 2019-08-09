---
title: One Year at Netlify
slug: netlify-year-one
category: Reflections
date: 2019-08-09
author: swyx
---

The official date is a bit fuzzy because visas but I joined the Netlify Slack a year ago today as like the 40ishth (🤷🏼‍) employee. I thought it'd be nice to do some public reflections for myself and perhaps also for others thinking of joining. (Just please note that I only speak for myself, wrote this on a friday in a couple hours so I cannot possibly be comprehensive, and also have things I cannot say publicly).

This isn't just about my work in the past year, its also about the perspectives i've gained from my seat at netlify. I'm just one person, so undoubtedly I don't see things other Netlifiers see and lack context on other stuff. I am pretty much dumping this stream of consciousness style. If something is grossly mistaken, please reach out and I will rectify post haste.

---

## Joining

When Mathias first brought up working at Netlify, I was a frontend developer at NYC_HEDGE_FUND. Just getting going with sporadic writing, [egghead.io involvement](https://egghead.io/lessons/react-set-up-storybook-for-react-from-scratch) and [#LearnInPublic](https://www.swyx.io/writing/learn-in-public/), yet to even do my first conference talk. I had used Netlify, but basically just to deploy Gatsby and CRA apps and had yet to even know about any of the more advanced Forms/Functions/Identity/etc stuff I now explain to people on a daily basis. So the founders (including everyone that interviewed me like [Phil](https://twitter.com/philhawksworth)) definitely bet early on me and I am eternally grateful. I make no bones about the fact that I would never have considered myself qualified to work at Netlify had they not asked, and so wouldn't even have thought of applying. But for redacted reasons I happened to be in the exact right place to explore leaving when Netlify came knocking.

I dropped everything and went for it.

A story I haven't told much is about -what- job I interviewed for. At the time, Netlify had a policy of bringing in the _person_ and finding the best fit for them. That was really nice, although I don't think it applies so much at current scale and needs. I looked through the open https://netlify.com/careers listings at the time and picked out **Solutions Engineer**. Basically working with Sales, but handling all the technical questions as far as possible. In retrospect this was a terrible choice for me and I think my interview with the Head of Sales at the time was probably the only one that didn't go well. Netlify could have stopped the process at that point, but they persisted, and pointed me towards **DX Engineer**, which, lets be honest, isn't a widely understood job title at all. But I clicked really well with David Wells and Phil Hawksworth (the other DevRel, [Divya Sasidharan](https://twitter.com/shortdiv) was still yet to join at the time iirc) and it had elements of open source engineering as well as developer relations, which I was interested in. Anyway; I was also interviewing at another place at the time, and was fortunate enough that Netlify moved lightning fast to make all this happen in the space of two(ish) weeks to seal the deal.

## The Job

Here is what I saved of [my job desc](https://github.com/sw-yx/README/blob/79a43f89e097b3b6f32482fc4ed18a08febfab49/README.md#my-role) when I joined. These three sentences highlight the scope, and I am still as excited about it today as I was on day 1:

- The DX team is focused on empowering developers (customers & partners) by making it as easy & streamlined as possible for them to build awesome stuff on top of the expanding Netlify Platform.
- The DX team are the internal dogfooders. They stretch, bend, and break the tools Netlify offer to make things better for the ever expanding group of developers.
- DX work closely with product, support, docs, users & partners to push the product to new heights, teach users what is possible with the JAMstack, and build tooling/docs/demos to attract people into the Netlify ecosystem.

I can say substantially all of these three points have been met and are fully accurate descriptions of what I do.

The formal details of the job, though, changed at least twice in the past year. I'm not sure how much I can say about org charts, which move around a lot anyway at a small fast growing company. Up until recently "the DX team" was a loose complement of "Developer Relations" (hence our combined slack channel was "#devrel*ish*", which also is a nice internal pun) and kinda-sorta-not-really part of Marketing. When I joined I remember a pretty awkward and hilarious discussion where our Office Manager and I shared a lot of confusion over where I was in the org chart.

I was mainly glad to just be in it.

## DX ❤️ Product

With [Sarah joining in May](https://sarah.dev/blog/why-netlify) though, this has become a lot clearer. _sighs of relief_. Sarah, Phil, Divya and myself make up the Developer Experience team (she prefers "Devex", I like "DX"), with Phil as Principal and Sarah as Head. Divya and I have assigned 3 month rotations on to the product team now run by [Jacob](https://twitter.com/jakecodes), to draw work on our developer relations by _being developers_. I have scheduled mine for November, and I greatly look forward to it, although I am also a bit cautious about being a "tourist" and the need to acclimate to the pre-existing engineering culture. (For example, I am the only outspoken TypeScript fan at the company. Netlify Dev has no TypeScript templates to this day.)

I don't at all expect this will be a problem though. In fact I'm not new to the codebase at all. Pretty much in my first month at Netlify I got the inspiration to dive into the React codebase since I thought it would be of interest to the users some inside baseball on how the platform they use also has some of the same issues they deal with. I immediately ran into the problem that we needed integration test coverage to do some of the stuff I wanted to do. I happened to have met [Gleb Bahmutov](https://twitter.com/bahmutov?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor) at a meetup recently, and so wound up leading the initial implementation of Cypress at Netlify, inspiring one of my most popular tweets ever:

[./tweet-tests.png](https://mobile.twitter.com/swyx/status/1064742523426430976)

Based on [meeting Brian Vaughn at React Rally](https://mobile.twitter.com/swyx/status/1034822793295286272), I then also dove into a longstanding issue with our build logging and used his new DevTools Profiler to understand what was going on. I [wrote it up](https://www.netlify.com/blog/2018/08/29/using-the-react-devtools-profiler-to-diagnose-react-app-performance-issues/) and, as a practical testimonial of a new React devtool, people were quite interested in the topic, so it did pretty well! I also looked at [Netlify's usage and philosophical synergy with Immutable.js](https://www.netlify.com/blog/2018/10/05/netlify-and-the-functional-immutable-reactive-deploy/) and made [the case for moving to Immer](https://www.netlify.com/blog/2018/09/12/the-rise-of-immer-in-react/), which I think is the top post I've done on the Netlify Blog.

The synergy between DX and Product is obvious. However I never felt a part of the Product team (because I wasn't) and didn't want to be randomly adding code review burden on the team lead just on my own initiative and no roadmap or prioritization, so I eventually stopped. But it is clearly a very productive area of exploration and I look foward to mining this fertile vein again, this time under formally blessed auspices.

## DX ❤️Sales/Engineering

recently i've also been performing a small amount of "field reporting". I'm naturally pretty immersed in the Gatsby/Nextjs newsflow, and colleagues seem to want to hear about the competitive/SSG landscape from me. So I've been doing that. It's one of those "feedback loop" parts of the job that sets DX apart from straight marketing. I will confess that I don't know if its constructive to hear from me vs just hear it straight from the CEO, who generally always has more context. I also believe startups die more by suicide than homicide and it doesnt do us any favors to watch other people all the time.

## Netlify Dev

I helped Mathias, David C, and David W heavily in the lead up to [the Netlify Dev launch in April 2019](https://mobile.twitter.com/Netlify/status/1115632898378534912). I recall the first inkling I ever had about Netlify Dev was [at the Netlify Allhands in January](https://mobile.twitter.com/swyx/status/1088860536156999680). I was more excited about the Addon Marketplace at the time, as I loooove platforms and the "Netlify = Serverless Heroku" thesis.

[Things dragged for a bit, and then picked up a lot leading into the launch](https://github.com/netlify/netlify-dev-plugin/graphs/contributors). What I loved about it was that I had pretty much full discretion to build whatever developer experience I wanted into the Netlify Dev CLI plugin (the actual CLI, which ND is embedded in, was managed by Bret Comnes until recently). What scared me about it is that I had any discretion at all for one of the strategic launches of the company. I saw a small demo by David Wells, saw what was left to do, and it was pretty much pedal to the metal from there until launch. There was no product management or docs process, just a small core group of engaged people doing the best they could in the time they had.

I'm not a fan of process that doesn't add value, but I'm equally not a fan of no process, both in the leadup to launch and the subsequent care and feeding. This is something that is hard to do well given infinite resources on a good day, so the fact that we're still figuring things out as a small startup is no surprise. We've hired people now and absorbed it into product team ownership. That was something I was very keen on and I am glad it happened.

I _could_ have volunteered to change my job to formally actually maintain Netlify Dev. That wasn't ever explicitly on the table, but it also wasn't off the table. I made a conscious nondecision not to do that, but I weighed it for a long time. I like my DX role too much, and I didn't know if I wanted a career being primarily a CLI dev. I may yet live to regret this nondecision. [Raees](https://raeesbhatti.com/) has that job now and is far more qualified than I.

Overall I loved it though, and although I don't relish being viewed as a "spiky" person, its clear that I did fine under those circumstances and there wasn't anyone else doing what I did. 🤷🏼‍♂️ There are also other similar opportunities to be had in the DX space as I see it right now, with at least 2 nonpublic projects ongoing I am excited about contributing to. So there's that.

Our subsequent [Netlify Analytics](https://www.netlify.com/products/analytics/) launch was quite a different story. Being primarily a backend thing, with the only frontend part tightly integrated with the App UI, I had 0 part to play in it. It had design and docs input from the get go, has no learning curve apart from the "click here and pay us money" button, and launched to smaller fanfare, but, because we charge for it, it makes money and is doing well (surprise! i dont think i can say how well its doing tho :)).

This compared to the 0 directly attributable dollars Netlify Dev has brought in, together with the increased support burden from Netlify Dev, has made for some very interesting calculus in terms of resource allocation. On one hand, you want to play the long game and solve hard problems. On the other, you want to build things people want to pay for. As an employee, its a little confusing where and how your initiative and efforts will be rewarded too. Fortunately I expect management will be reasonable and realistic about the pros and cons of incrementalism vs moonshots.

Marketplace efforts are a very slow burner. It's a potentially huge money maker, but back-loaded, and getting it going requires a lot of business development time and good partners. We've got a good start.

## Momentum

I think Momentum is a very powerful thing. It's something my college friend and mentor Alex called "the Mo", it's something I wrote about in [my investment case for Atlassian](https://sentieo.com/blog/no-high-in-team-why-atlassian-will-10x-or-get-acquired/), and I see it in nonmonetary tech trends too. [The state of JS tracks this over time](https://stateofjs.com/), as well as [HN Hiring trends](https://www.hntrends.com/) too.

I recall the first time I saw "el Mo" at Netlify - [JAMstack Conf 2018](https://2018.jamstackconf.com/). Having just joined, I pretty much had no hand in it, but I remember looking at the speaker list and talking to attendees and realizing that "_no, really, this thing is huge and both people you've never heard of, and people you have, really fucking believe in it_".

I'm dense in that way - I know what Netlify does for me, but I'm a chump so it doesn't count.

I know about all the online love, but give away a great product for free and effusive love is easy to find.

But show me real people with real businesses and clients and companies to run and they have the same love? Heck yeah, now I am all in.

In [my career change into web dev](https://hackernoon.com/no-zero-days-my-path-from-code-newbie-to-full-stack-developer-in-12-months-214122a8948f) I learned extensively from Quincy Larson and Wes Bos and Chris Coyier; and at JAMstack Conf I found myself sitting at the same dinner table as them! WTF? This is a thing, huh?

Seriously, stop reading right now and watch Chris Coyier advocate for the All Powerful Front End Developer. I dont have youtube embeds on this blog yet so here:

> WATCH: [All Powerful Front End Developer](https://www.youtube.com/watch?v=grSxHfGoaeg)

And then watch him this year, with [the same thesis on steroids](https://full-stack.netlify.com) (click into the details for the video):

> WATCH: [oooops I guess we’re\* full-stack developers now](https://full-stack.netlify.com/)

Then see [Ghost loudly advocate for the JAMstack](https://ghost.org/blog/jamstack/).

Then see [Jamund Ferguson bring JAMstack to Paypal.me](https://www.infoq.com/presentations/jamstack-enterprise/).

Then see [Citrix tell their JAMstack story](https://www.netlify.com/blog/2019/06/12/jamstack_conf-nyc-session-recap-citrix-delivers-better-ux-with-less-overhead-using-jamstack-and-netlify/).

Then read [the Hacker News comments on Netlify Dev](https://news.ycombinator.com/item?id=19615546).

Then see [Sarah Drasner reaching _inbound_ to work at Netlify](https://sarah.dev/blog/why-netlify).

That's The Mo. Netlify has it. I don't know much but I know that much.

The most awkward part about Netlify is the JAMstack terminology. I have a love hate relationship with it, because it isn't self explanatory but does represent a fundamentally simpler infrastructure that we try to advocate for. It's here to stay because people are adopting it and I'm very fine with that!

It does make for very strange bedfellows:

- On one hand, "lol dont overengineer everything" people like Phil and [Zach Leatherman](https://mobile.twitter.com/zachleat/status/1148924107477663745) and [Sara Soueidan](https://mobile.twitter.com/SaraSoueidan/status/1094214772055334912) love Netlify for its return to simplicity without managing servers. As someone who has wrestled with setting up pm2 on a digital ocean box, I am so glad never to do that undifferentiated heavy lifting again.
- On the other hand, double digit percents of Netlify sites -are- "overengineered" Gatsby sites, which love Netlify because it helps build their complex setups better than Github Pages can, and has good defaults which passes for good DX when compared to AWS.
- there's also a third contingent of people who use SSGs like Jekyll and Hugo and are generally kinda bemused at all the drama in JS land

In case it wasn't clear, i'm being ridiculously reductionist in either of the above bullet points and of course there are many other very good reasons and contingents.

I like to explain it this way:

- first watch [Mathias' appearance at Smashing Conf 2016](https://vimeo.com/163522126) explaining why the JAMstack
- then watch ANY of Phil's talks ([here's one I found off a quick google](https://www.youtube.com/watch?v=B-ku9enw3Fg)) on how he pitches JAMstack, from a perspective of serious agency experience
- And for me, in March I went to JS.LA and gave a talk titled [JAMstack: The Total Victory of JavaScript](https://www.youtube.com/watch?v=vOUcPI2mljU) to put it in my own words
- I recently (July) also went to [JSCamp Barcelona](https://jscamp.tech/schedule) to give a souped up version of the same talk.
- I've also conducted [two workshops on JAMstack and Gatsby](https://github.com/sw-yx/jamstack-jumpstart), at [JSConfAsia](https://2019.jsconf.asia/) and [MidDevConf](https://www.middevcon.com/sessions/jamstack-jumpstart-gatsby-netlify/)
- as well as made the Gatsby [JAMstack hackathon starter](https://github.com/sw-yx/jamstack-hackathon-starter) after I saw difficulties people had at JAMstackConf 2018. The starter comes [with an accompanying blogpost](https://www.gatsbyjs.org/blog/2018-12-17-turning-the-static-dynamic/) that was very well received and I also picked up maintenance of Netlify's [`netlify-lambda`](https://github.com/netlify/netlify-lambda) and [Netlify Identity OSS tools](https://react-netlify-identity-widget.netlify.com) along the way.

This isn't an exhaustive list, it's just a smattering of what has come to mind as I learn about and try to interpret and evangelize this trend that is the entire founding thesis of the company I work at. (no big deal!) For a more edited version of all this, [Phil and Mathias recently released a free Oreilly book](https://www.netlify.com/oreilly-jamstack/) about the whole thing.

## Speaking and Writing

I gave [my first conference talk at React Rally](https://www.youtube.com/watch?v=nyFHR0dDZo0) in August last year, just as I joined Netlify, and since Jan 2019 then I have done _checks notes_ 20ish events including podcast and meetup and conference talks, on everything from [JAMstack](https://www.youtube.com/watch?v=vOUcPI2mljU) to [CLIs](https://oclif.io/conf) to [Babel Macros](https://www.youtube.com/watch?v=1WNT5RCENfo) to [React](https://www.youtube.com/watch?v=KJP1E-Y-xyo) to [React](https://www.reddit.com/r/reactjs/comments/9xjnym/reacts_new_defaults_concurrent_react_and_react/) to [React](https://twitter.com/swyx/status/1086153419927089153) to [Learn In Public](https://kentcdodds.com/chats-with-kent-podcast/seasons/01/episodes/you-can-learn-a-lot-for-the-low-price-of-your-ego-with-shawn-wang).

I'm starting to have a love hate relationship with speaking.

I would say I am somewhat experienced at being a speaker now. I'm obviously not the best speaker in the world, nor do I want to be, although Sarah has engaged great speaker training for us and I want to be **good**. But I can get by at a pinch, and have some basic talent.

What I like is that now I approximately know who to talk to and what to do and how to prepare and how to behave to get on a conference somewhere and do a passable, maybe even good, job.

It is extraordinarily good for networking - having that momentary peerage with others waaaay more accomplished than I am. I don't for a second take it for granted or pretend that I am on the same level. But it opens the door, establishes the relationship. And I can go pretty far with just that.

It is not so great for _reach_. A good size event in our space is like 300-500 people (we don't do the extremely corporate >5k mega events, although we did go to re:invent last year). Online, conference videos maybe get 3-30k views. In exchange for that, we (the company) often (but not always) have to pay for travel, and I personally pay in terms of life disruption (often a lot of out of pocket stuff is spent incidentally on travel as well which I have just sucked up) as well as tanked productivity for pretty much the week leading up to it (although this has gotten a bit better as I start to recycle talks.

This has made conferences hard to justify in ROI terms apart from a vague "we want to be present at the important ones" goal. I don't care to do it one bit; I'm extremely glad we have a capable Head of Marketing now who leads that.

Writing has wider reach: Sarah easily gets 6 figures in eyeballs on any given post. The engagement may not be as deep as in-person or via video, however the financial outlay is WAY less, and the personal cost is less too. So that is the strategy we're pursuing at the moment. as you can see i have no problem spamming thoughts to digital ink :)

I have a -lot- more comments here I am redacting for now. suffice to say that this is my current area of struggle. I don't intend to make this a permanent bugbear though, as this is pretty basic in the grand scheme of things, but I will fess up to the fact that I have yet to really find a workflow and cadence that I REALLY like, that keeps me in flow.

When I'm in flow, you'll know.

## Community Engagement

running the company Twitter is part of the job. I don't know what the goals are, but I'm a Twitter addict anyway so it's no problem to queue up some nice stuff.

I also do some amount of engagement on community.netlify.com, on our github issues, on Reddit, as well as on my personal Twitter, as well as started [an unofficial Office Hours thing](https://github.com/sw-yx/NetliFridays). All of which is good, but I can't shake the feeling that I wouldn't be missed if I didn't do that.

OSS maintenance and community engagement are the kind of thing that are table stakes for developer experience, but it doesn't make it onto OKRs, nor does anyone try to measure ROI out of that stuff. We do it because we feel responsible for the developer experience, with a safety net of support. I don't have any other way to phrase it, nor do I see any other way to manage it, but I do wish that it counted for more so that incentives align well.

## Remote

The company is headquartered in SF, I work remotely out of NYC. We're about 50-50 in remote vs SF, across US and EU timezones. I was also a "slowmad" for about half of the year as I combined travel with conference speaking.

I have more comments on remote work in a separate post, but the main points to hit are that I love working from home (even moved to a new place with a 24hr coworking space downstairs to facilitate my weird hours) and also that [I hate Slack being central to everything](https://mobile.twitter.com/swyx/status/1120050592263692293). But I'll live.

## Fin

That's all I can think of for now. I budgeted 2 hours for this and am now at hour 3 so I'm gonna wrap this up and hit send. super psyched for the `redacted` projects coming down the pike, for my product rotation, for new hires coming in, and to continue learning from Sarah and the rest of my team in this weird new job!

_P.S. This post was inspired by [David Wells](https://davidwells.io/blog/netlify-year-one), a great colleague, mentor and friend. Check out his post for more stuff we've done, some of which I supported. I don't think like him so this format doesn't match, but I wrote it my way._
