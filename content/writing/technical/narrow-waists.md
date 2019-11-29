---
title: Narrow Waists
subtitle: Taming Abstraction Explosion
slug: narrow-waists
categories: ['Tech']
date: 2019-11-10
---

When talking about "Narrow Waists" I should clarify that I'm only referring to the term from the somewhat obscure "Internet Architecture" model of the different technology layers ([my notes here](https://dev.to/swyx/networking-essentials-architecture-and-principles-2g5e)):

![https://res.cloudinary.com/practicaldev/image/fetch/s--y7YIZZVj--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://images.slideplayer.com/24/7320353/slides/slide_25.jpg](https://res.cloudinary.com/practicaldev/image/fetch/s--y7YIZZVj--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://images.slideplayer.com/24/7320353/slides/slide_25.jpg)

I guess depending on your background it's either obscure or really archaic. I'd love a better name for it, but haven't come across one so am sticking to this for now.

## Real Life Analogy

I'm spending all day today transiting between three cities (the return leg of one trip and the outbound leg of the next). This is a surprisingly complicated logistical maneuver. Here are the chain of events that have to happen:

- Check out of my hotel
- Get from hotel to airport
- Check into airline
- Get through security to the airline gate
- Land at destination (if I checked bags, I'd have to go pick them up)
- Get from airport to home
- (do misc stuff at home)
- Get from home to airport
- Check into airline
- Get through security to the airline gate
- Land at destination
- Get from airport to hotel
- Check in to hotel

I have to do this all on time, or downstream dependencies are ruined (including beyond this immediate list of events). Yet there is very little guidance to doing it right apart from the raw cost of a mistake. Checking out of a hotel is as simple as returning the keycards - they couldn't care less where I head to next, or whether I'm checking out on time. I can take any number of transportation options to the airport - the airport doesn't care. When I check in to the airline, it's on me to make it through security and in general show up in time for boarding - if I miss it, the airline doesn't care apart from issuing a "last call".

But also notable is the _lack_ of some options. There is no first party "integrated" option where the hotel kicks me out on time with scheduled transportation to get in to the airport. Of course there are third party tour groups and concierges that do these, but the enforcement is weak. And unless you have a private flight, there is no getting around airport security. The Airport is the "narrow waist" everything else in the chain must work towards.

## Why Narrow Waists are Underrated

Technology is layer upon layer of abstraction. This could be considered extremely wasteful.

However, while there are convincing arguments (like [Jonathan Blow's](https://www.youtube.com/watch?v=pW-SOdj4Kkk)) for being "FULL stack", most mortal humans will never know it all, and historical defaults are often bad for modern usecases, so abstractions are important.

So we aren't 100% pro abstraction, nor are we 100% anti abstraction either. It's nice to acknowledge extremes, but I'd like more rules focusing on the middle cases which we deal with most of the time anyway. That's where narrow waists come in (I'll assume you've read my notes above, more info [here](https://www.sciencedirect.com/topics/computer-science/internet-architecture) and [here](https://named-data.net/project/execsummary/)).

The problem with abstraction layers is combinatorial explosion. Each combination bears "[impedance mismatch](https://devblogs.microsoft.com/oldnewthing/20180123-00/?p=97865)", which is engineer-speak for "abstraction I don't like". Abstractions leak all the time; there is an explicit cost in terms of hooking things up, and implicit costs in terms of edge cases, dependency management/upgrade/maintenance costs and decision fatigue. Individually, each abstraction might bring enough value to overcome its costs. However the combinatorics of M x N x O x P abstractions in each layer is an externality weighing down the entire ecosystem.

So a "narrow waist" intentionally keeps one or more of the middle layers small. This allows for two things:

- **the marketplace effect**: lower and upper layers can specialize and optimize to that narrow waist, to the point that they don't have to worry about the existence of other layers on the other side
- **focus**: the concentration of resources on optimizing the specific technology at the waist to make it the best it can be, since there is little other choice

Another aspect of "narrow waists" are the typically very limited nature that frustrates users. Narrow waists often benefit from "Worse is Better" type software dynamics. Often you hear people proposing radical new alternatives that would solve the problems of the incumbent technology. These proposals sound great, but are unable to overcome the network effect of the incumbent and fail to gain traction. This is a trademark sign of a narrow waist existing (or a normal waist narrowing).

## Types of Narrow Waists

I don't have a ton of examples for you as I am just writing up these thoughts, but I will revisit with more examples in future:

- **Containers**: containers are the classic narrow waist in the physical world. I won't repeat the superlative descriptions of their impact, but will also note their endearing analogues in software.
- **Roads**: every vehicle can travel faster on roads (particularly highways) because we have a social pact that things are allowed to travel faster there
- **Language**: every person can communicate with others around them if they speak the same language. A "lingua franca" superlanguage can make international trade and collaboration much smoother
- **Newspapers/Yellow Pages**: for a period of time, they were the narrow waists for getting information, getting news, connecting with neighbors, looking up contact information
- **Specs and Protocols**: narrow waists don't have to be tangible or functional. A spec isn't core functional code, but describes how a protocol or interface should work. There can then be multiple implementations that fit or extend the spec, and they can all benefit from tooling or counterparts that are written for the ecosystem instead of for each implementation.
  - **GraphQL**: In this category I like how the GraphQL spec has helped invisibly coordinate different parts of the GraphQL ecosystem for overall benefit. I dont have direct experience but I'm told Python typehints also have a spec-like behavior with multiple major implementations which has been very healthy for that ecosystem.
  - **Email**: the [IMAP and SMTP](https://www.socketlabs.com/blog/smtp-or-imap/) protocols make email both universally deliverable and universally accessible by any client
  - **RSS and Podcasts**: ditto
  - **SMS**: ditto, any phone can receive and read SMS
  - **BGP** the announcement process is decentralized and works as long as each AS meets specs
    - as a distributed system, this isn't without controversy by any means, there are frequent [country-scale incidents of BGP hijacking](https://en.wikipedia.org/wiki/BGP_hijacking#Public_incidents) and [irresponsible implementations can screw up innocent participants](https://blog.cloudflare.com/how-verizon-and-a-bgp-optimizer-knocked-large-parts-of-the-internet-offline-today/)
  - **x86 instruction set architecture**: any processor that implemented x86 could benefit from firmware/operating systems that speak it
  - **Operating systems**: the three major systems - windows, linux, freebsd (macos) - make it so that programs that operate on them dont usually care about the underlying hardware, and the underlying hardware just needs to be able to support those OSes to support those end user software

## When do they die?

Quite relevant is the Newspaper/Yellow Pages example - Narrow Waists seem to have a deadlock dual network effect going on that is quite unbreakable, but nothing lasts forever. When do Narrow Waists fall?

Notes:

- Ben Thompson on [Integration and Monopoly](https://stratechery.com/2019/integration-and-monopoly/) (MSFT vs AAPL + GOOGL)
  - integration provides for a superior user experience
  - integration maximizes the likelihood of success for new products
  - integration is incredibly profitable because it is, from a money-making perspective, a monopoly: Apple devices are the only ones that run iOS.
