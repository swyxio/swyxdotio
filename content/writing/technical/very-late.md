---
title: 'Very Late: Fighting for the Open Web'
subtitle: What I Learned from meeting Alex Russell
slug: very-late
categories: ['Tech']
date: 2018-10-22
description: My notes on Alex Russell's views on Mobile Web and React/JS
---

Anyone active in Web Dev Twitter will have a certain trepidation when [Alex Russell](https://twitter.com/slightlylate/) gets involved.

As a rule, I never comment on his threads. In general, the scale and problems he focuses on aren't ones I share, so I have nothing of value to add, nor am I ever going to change any of his opinions. I will also admit to being intimidated by general shoutyness and experience. I'm just a scrub that learned to code to get a better job, yknow? I have no business being involved in arguments that feel "above my paygrade" (I know we all have a role to play, etc., but the feeling is valid).

However, meeting Alex was an inevitability given where I work, and it finally happened this week!

I thought it might be valuable to interpret his arguments through me, a **not-yelling-at-you** fellow member of the React/JS Framework community who just got here trying to make a living. As much as I love React and JS and the lifechanging opportunities it has given, I think a lot of his arguments make sense, and I think "my people" might benefit via me acting as interpreter.

## Table of Contents

## Preface: Not Safe for Twitter

First - a preface from me. There are a number of reasons why this topic is "NSFT" - it is complex, multicausal, high stakes, personal, situation-dependent, with bad-faith behavior and easy strawmen on both sides.

As humans we exist in the middle of all this chaos, so our discussion is filled with this stuff, however it is not very helpful for clear thinking. I struggle with understanding things when arguments get conflated and goalposts shift. I prefer to organize arguments into primary categories so they can be addressed, with of course the understanding that they are related in some way.

So the rest of this recount will try to split up the arguments so they can be discussed "cleanly", recognizing it is a little futile to do so but trying anyway.

There is also, in the second half, a discussion about React, which gets very muddled with JS in general because it is the current dominant JS framework. I choose to apply **the substitution rule** here - if you swap React for some other framework out of the argument and it still makes sense, then you're not really arguing about React.

## Death of Mobile Web = Death of Open Web

> swyx here: Alex mostly assumes you know and agree with this, so all of this is assumed context whenever you talk to him

![https://cloud.netlifyusercontent.com/assets/344dbf88-fdf9-42bb-adb4-46f01eedd629/4401052b-487f-4349-a901-5fbe018b4a6f/9-will-pwas-replace-native-mobile-apps.png](https://cloud.netlifyusercontent.com/assets/344dbf88-fdf9-42bb-adb4-46f01eedd629/4401052b-487f-4349-a901-5fbe018b4a6f/9-will-pwas-replace-native-mobile-apps.png) - more on [Will PWAs Replace Native Mobile Apps?
](https://www.smashingmagazine.com/2018/12/pwa-native-mobile-apps/)

This first argument is more a factual one than anything subjective:

- the web does fine on desktop vs native desktop apps. nobody has any issues there. In fact Alex says he has reports of Chromium being >50% of desktop cycles, aka we spend the majority of our time in web rather than native on desktop. However...
- it is a fact that mobile has overtaken desktop as the primary computing/consumption platform, and is continuing to take share with no end in sight.
- it is a fact that on mobile, time spent on mobile native apps hugely dominate time spent on mobile web apps. The general number Alex uses is ~7% on mobile web, and in some countries as little as 5%. This number is _still dropping_. Mobile web is essentially "MIA" (this is the topic of [Alex's talk](https://vimeo.com/364402896)).
- it is a fact that mobile native apps are less open than mobile web apps.

Now, an opinion: **keeping the web open is paramount**. I struggle to completely articulate the importance of this, as to me "open" means free from censorship (and the value of censorship is complicated - until they come for you, then it gets _real simple real fast_), but also relying on open standards leaves the way for new companies and technologies to arise, as well as the developer experience of not needing arbitrary app store review. This alone is convincing enough for me, but different arguments will appeal to different folks.

I think where we fall down in this Brave New (mobile) World is wanting the benefits of closed and open ecosystems with none of the costs of either, and via our actions voting for closed ecosystems because of the overwhelming advantages they currently offer.

> Alex's view

Alex's alarmist conclusion from all this is that we will be **the last generation of web developers**, because everything will go to mobile and every mobile application will be native rather than web based (so who's going to try to develop for the open web when nobody's on it?).

Of course this feels incongruous given anecdotal stories of people doing well learning web development, but this more about overall macro trends over decades-long timespans than any particular datapoint you can bring up. And the trends, which are facts nobody disputes, are dire.

## It's Not Just about Perf

> swyx here: these are mostly my reflections

It's a fact that Mobile Web is losing, but _why_ it's losing has a lot of reasons, and the debate gets fantastically muddled here. Everyone has their pet topic (my pet peeve is the people that immediately blame bootcamps, which shows you their biases) but here are the big ones:

- **Mobile Perf**: web developers irresponsibily use too much JS which causes poor performance on mobile phones, leading to a much better UX on mobile apps
- **Capability**: mobile web apps simply don't have the same capabilities that native apps have. There's the big ones, like having access to large file storage and non sandboxed execution capabilities (I'll mention more next), but also the little nuances like touch interaction and animation performance and default component behavior that make mobile web UX subpar (and are the cause of awesome projects like React Native Web and Dom and Ionic etc)
- **Compounding Disparity**: companies (like Medium and Reddit) actively making UX decisions ("have you installed our app??" x infinity) to ruin their mobile web experience to promote their mobile app, further widening the already unfair UX disparity mostly because there is an incentive to double down

That "Capability" bucket includes UX and other platform considerations. Here is a sobering [list I saved of PWA capability deficiencies in iOS](https://reddit.com/r/webdev/comments/abkggl/_/ed1mxrz/?context=1) I refer to from time to time.

I'm eliding a loong, loong list of disadvantages mobile web has to mobile apps in this bucket, but you can see how perf might not even rank as the top reason why people pick native apps over PWAs.

## PWAs as Savior?

> swyx mostly interpreting Alex here, altho a lot of this was assumed context

It's no surprise that Alex (who co-invented PWAs) views growing the scope of PWAs as a primary solution for this issue. Part of Alex's job involves shepherding through a lot of the web API additions necessary to add the same capabilities native apps have. He's working on some really cool stuff - native filesystem storage, WebUSB, WebBluetooth, Serial, HID, SMS Receiver API, Contact access and about 40? more that he leads. ([Project Fugu appears to have about 100+ items](https://docs.google.com/spreadsheets/d/1de0ZYDOcafNXXwMcg4EZhT0346QM-QFvZfoD8ZffHeA/edit))

**Notifications, notifications, notifications**: In particular he is very keen on adding native-like notifications to PWAs, which I don't think anybody is clamoring for (hah, understatement?), but of course they drive engagement and Alex is so committed to saving mobile web that he will fight for notifications that "nobody" wants. The truth, of course, is that we users, by our actions, let them work on us, indicating we do want them, therefore app makers also want them.

PWAs of course, also help solve perf by caching assets via service workers, so we get a 2-for-1 deal here.

My hesitation to all this is that I'm not sure it _would_ save the mobile web. Apple literally has hundreds of billions of market value at stake making native apps and the app store proprietary to Apple. If I could wave a magic wand and grant Alex his current 40-50 specific wishes, I don't have any confidence the balance would swing significantly in favor of the mobile web. Partially, this is because we can't imagine something we've never seen, so this hypothetical counterargument already isn't helpful, but also because Apple would simply add more shit tomorrow to re-tilt the playing field.

Of course, Alex works at Google (and constantly points out his own conflict of interest, no need to do it for him) and Android has its cross to bear too, but Alex recently won a fight to list PWAs on par with Native Apps on the Android Play Store and so there has been good, substantive progress on this front. Apple continues to insist, for example, that [every browser on iOS uses Safari's Webkit](https://www.howtogeek.com/184283/why-third-party-browsers-will-always-be-inferior-to-safari-on-iphone-and-ipad/) - ([more on this from Alex](https://convopage.com/c/1176856950086275072)), so there isn't even room to compete on browser features, and then on top of that comparatively underinvests in Safari (Chrome has ~1000 engineers on it, Safari has ~100). Alex thinks **the web community should sue Apple** for anticompetitive behavior and frankly I find it hard to disagree here.

> 100% swyx here

Incentives explain everything, and I'm sure Apple has good reasons I haven't been exposed to yet. But you see why I'm doubtful PWAs can be a solution for this. The runaway success of Apple's integrated strategy has created a system where, even if you leveled the playing field today, it may still tilt back towards native apps (altho to be clear it'd be a lot better than what we have today). Still, it's no reason to not try - after all, the web really did win Desktop - and a defeatist attitude of "this is how its going to play out anyway" doesn't really help anyone.

## But it's also about Perf: Alex's Problems with React

> swyx interpreting Alex. this is likely the most heated part of the conversation even though it is far from the most important, as evidenced by the stuff above, so please take **extra notice that all of this is my recollection and interpretation of someone else's views so absolutely do not get outraged without asking for clarification/confirmation**.

Of course, the majority of the world doesn't have Apple phones. They have Android phones, mostly not high end. Android by itself should be able to set the agenda, but insetad the opposite is true. the dominance of iPhone as an aspirational phone has caused a perverse "trickle down" effect - where the desires of the 1% impact products that serve the other 99%.

This of course manifests the most in terms of mobile web performance. We tend to use high end phones so we are only sensitive to perf issues when they are bad enough to register on high end phones, yet the median phone is a lot lower spec. (To be clear, there are also plenty of examples when JS-filled websites don't even perform well on high end phones.)

[Alex's standards for critical-path assets](https://infrequently.org/2017/10/can-you-afford-it-real-world-web-performance-budgets/) are probably lower (higher?) than yours, but at least they are publicly documented and argued from a consistent foundation. I'll not argue the validity of the budget (130-170kb compressed, which is around 1MB uncompressed), but just try to interpret how React figures among other frameworks here in his eyes.

It's well known that React is around 30kb compressed, so, while significant, it is far from the whole budget, and it is totally feasible to create React apps that meet his performance budgets. In fact, in that same blogpost he mentions Next.js as a preferred tool that embeds "strong opinions about app structure, code splitting, and build targets". Alex is _not irrationally against React_ on principle. However he like many others judges React alongside its ecosystem, and it is here that two main types of criticisms are leveled.

> the structure and discussion of these criticisms come entirely from swyx

The first criticism is the easy one to address - **the sheer size of sites, regardless of budget**:

- React is often used where it is not needed, for example in blogs (note, I am not saying that React is _never_ needed in blogs, just saying it is _often_ not needed in blogs)
- **Substitution rule** works here - blaming React is pretty much a result of React's dominance in frameworks (and, yes, Gatsby makes it easy, but a Gatsby would have appeared if some other framework was on top)
- Still, the valid logic to focus on is the amount of JS served for the functionality given. Are you being wasteful if you serve 30kb of JS to do something you can do with 3kb? Absolutely. We should strive to do better for our readers.
- However, we must also clearly delineate that this is a different and smaller offense than busting the performance budget. I will also forever be a staunch defender that people should do whatever they want on their personal blogs, because ["breakable toys"](https://www.oreilly.com/library/view/apprenticeship-patterns/9780596806842/ch05s03.html) are important, and you should always have a place to practice your craft even if the exact use doesnt quite fit. (someday I will have a separate blogpost "[In Defence of Hammers](/writing/hammers)")

React does wonders for making sites. You can easily add progressive image upgrades, and clientside navigation, and interactive demos. I held out on this one for a long, long while (Helps when your paycheck depends on it). But eventually I found that [you can do the same with less with Svelte/Sapper and so began the painful process of moving over](/writing/svelte-static). As you can see from this site, it's not great yet. But it's workable.

The second criticism is the much gnarlier one, because there is no direct causal link - **the overall resulting size of apps** made by React devs:

- For example, [Imgur sends you 1.2mb of JS, including React, to show you an image](https://twitter.com/csswizardry/status/1185604806901207045).
- **Substitiution rule applies**: React gets an undue amount of flak because it is currently in pole position. Anyone can create bad sites with any stack.
- selection bias also applies - anyone picking Preact or Svelte at this point is also going to care about bundle size and that affects their subsequent choices.
- blaming npm is a really bad take, I'm sorry
- however, it is just generally true overall that production React apps continue to be irresponsibly big and the React ecosystem could do more to encourage saner defaults.

> from Alex

Alex understands all this. So of course he is going to want the React team to use their influence more here. He says he has three things he wants to see (this is important but my memory is also hazy, please forgive me if I misrepresent him here):

- a much smaller `create-react-app` (i'm not sure what specifically can be smaller in production, I didn't ask)
- differential loading (aka the `module`/`nomodule` pattern) supported everywhere
- outright size of React and React-Dom getting smaller each year

He doesn't see improvement on all 3 fronts, so he has written off React as caring about perf and regards using it as "unethical". 

> from swyx

Again, an extremely strong statement here and the React team would prefer React to be measured by other metrics. I'd leave it at that.

I haven't understood why [CRA hasn't implemented differential loading yet](https://github.com/facebook/create-react-app/pull/4964), so I can't counter or comment, but it does make a lot of sense to have it by default. 

I would also point out that React has indeed made code splitting a lot easier with React.lazy, and of course Next.js and Gatsby make page code splitting trivial. Vendor chunks make subsequent loads a lot lighter as well, and [Michael Jackson has gone so far as to propose CDN loading of React](https://www.youtube.com/watch?v=2rhkgB8Cohc) which gets cached across sites.

Also, of course, the actual majority of the JS we add is **Business Requirements**, as [Jason and Sunil put so eloquently](https://twitter.com/_developit/status/1186264151334764546). Again, **the substitution rule applies**: if some other framework were the dominant paradigm and not React, would this problem still exist?

> Off topic Alex comments

Just linking to Alex's other comments on React, for my reference:

- [An abridged list of requirements to use React the way FB does for mobile web](https://twitter.com/slightlylate/status/1159286674817351681)
- [Why *not* to build React into the Browser](https://threader.app/thread/1135342338606153729)

## Never-Slow Mode

The final important piece to cover was the "Never-Slow Mode" for Chromium. [Here's the proposal](https://github.com/slightlyoff/never_slow_mode), and here is [some](https://www.infoq.com/news/2019/02/chrome-never-slow-mode/) [media](https://www.xda-developers.com/google-chrome-never-slow-mode/) [coverage](https://arstechnica.com/gadgets/2019/02/with-experimental-never-slow-mode-chrome-tries-to-stop-web-devs-making-it-slow/) to explain in English.

I think this could be a fantastic idea on mobile browsers. I direct your attention to the [Per-interaction Resource Limits](https://github.com/slightlyoff/never_slow_mode#per-interaction-resource-limits).

This is essentially building the good parts of AMP into the browser, without the unethical search ad and URL shit Google is pulling with the current AMP. You can quibble about the exact numbers, and maybe have a looser setting for initial adoption, but this is directionally what the mobile web needs. As someone on roaming data often I want to know when I'm being forced to load a ton of JS, and for the sites to be shamed and threats of bouncing (if possible) to be real.

In fact I liked it so much, I was surprised [it had to be opted into](https://github.com/slightlyoff/never_slow_mode#why-would-anyone-ever-opt-in-to-nsm) with a Feature Policy: `Feature-Policy: allow-slow 'none'; geolocation 'none'`. This dramatically reduces the potential immediate impact of Never-Slow mode. Alex is sympathetic but says Feature Policies are effective, despite being opt-in and therefore small in scope. The "[outrageous](https://github.com/slightlyoff/never_slow_mode#references--acknowledgements)" effectiveness of TLS is an inspiration here.

To be clear, implementing this is going to cause several years of confusion for web developers, who will need webpack plugins and more to get their assets in order for this. But once we have stable standards, tooling can emerge remarkably quickly to help meet those standards (OSS is *very* good at this) and the result really is better defaults.

And we can all stop yelling at each other and get building.

## Conclusion: So, can the Open Web be saved?

As pessimistic as Alex often sounds, I think the reason he is still out there making talks and twitter threads is because he is still optimistic that something can be done. As you've seen in this entire recap, there are many angles to attack this:

- Adding PWA capabilities
- Suing Apple
- Improving JS (and overall web) Perf
- Never-Slow Mode

The numbers are dire but the story isn't over yet. It's **very late** on the [Doomsday Clock](https://en.wikipedia.org/wiki/Doomsday_Clock) of the Open Web, but the clock has not yet struck 12.

## Postscripts

### Yes, There was More

Alex had also deliciously hot takes on some other Google initiatives that are related to this topic but aren't ultimately core to the debate, so I left them out. If you ever get the chance to ask him, though, I highly recommend bringing those up if you can guess what they are :)

### Alex in his own Words

An important caveat to the above is that this is an incomplete recollection from someone with a holey memory, about a conversation had over a couple hours of drinks, so this isn't going to be the best representation of his thoughts. Any misrepresentation is my fault and you shouldn't take my precise phrasing as something he'd sign off on as he has not reviewed this blogpost. However he did just give a talk at Fronteers Conf on [the Mobile Web: MIA](https://vimeo.com/364402896) where you can hear his words for yourself.

### References and Other Perspectives

I think this is a tremendously complex and important topic and I certainly won't do it justice alone. I'm going to update this article over time with links to other related pieces I recommend reading to get a few different voices:

- [Tim Kadlec: Using the Platform](https://timkadlec.com/remembers/2019-10-21-using-the-platform/): "Use the platform until you can’t, then augment what’s missing. And when you augment, do so with care because the responsibility of ensuring the security, accessibility, and performance that the platform tries to give you by default now falls entirely on you."
- [Anil Dash: The Web We Lost](https://twitter.com/anildash/status/1060754945434157056): "the tech industry fought like hell to erect barriers against platforms like MySpace & Neopets that were letting underrepresented folks actually *make* the web instead of just consuming it."
- [Addy Osmani](https://twitter.com/slightlylate/status/783343244725760000?lang=en): "You can make React fast enough, but you have to put in the work"