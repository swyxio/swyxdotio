---
title: Eponymous Laws
slug: eponymous-laws
description: Interesting Two Word ideas with names of people on them
categories: Philosophy
begun: 2019-01-22
date: 2020-01-27
author: swyx
---

I keep an eye out of interesting "laws" that have names attached to them. They are a special case of [Two Word Ideas](https://www.swyx.io/writing/two-words), where a neat trick has been achieved by cramming an idea or meaning into a name and a law. Usually this also means there is a broader story or richer intellectual history worth diving into.

Sometimes they are just plain funny, sometimes they are so true it hurts.

## Table of Contents

## Software


- [Zawinski's Law](https://en.wikipedia.org/wiki/Jamie_Zawinski#Principles): *Every program attempts to expand until it can read mail. Those programs which cannot so expand are replaced by ones which can.*
  - I tend to interpret this broadly as software having [intrinsic desires](https://twitter.com/swyx/status/1026614064674484224). The proximate cause is customers and PMs having the same needs and imaginations, but abstractly it can look like software is a living thing that has a mind of its own:
  - Every collaboration app wants to be email
  - Every data analysis app wants to be Excel
  - Every marketplace wants to be two-sided
  - Every platform wants be an "operating system" - like [Wordpress](https://rework.fm/open-source-and-power-with-matt-mullenweg/)
  - Every social app wants chat https://medium.com/@tk512/zawinskis-law-a-modern-take-8da3cf89152b
  - Every UGC app wants stories https://theverge.com/2018/11/29/18117670/youtube-stories-creators-subscribers-instagram-philip-defranco
  - Every B2B app wants a dashboard https://twitter.com/swyx/status/1205921170106638336
  - Every site wants a CMS (esp agencies)
- [Polanyi's Paradox](https://en.wikipedia.org/wiki/Polanyi%E2%80%99s_paradox) - "We can know more than we can tell"
  - applicable in AI - we find it hard to describe common sense
  - design - clients that don't know what they want but definitely don't want what you show them
- [Law of Demeter](https://en.wikipedia.org/wiki/Law_of_Demeter) - a given object should assume as little as possible about anything else - its neighbors and subcomponents
  - how to square this against "be liberal in what you accept, conservative in what you output"?
  
Some people combine laws: 

- Zawinski-Greenspun-Atwood-Murphy's Law - ["Anything that *can* expand to read email with lisp in javascript, *will* go wrong."](https://twitter.com/secretGeek/status/1116217143933063169)

More lists: 

- https://haacked.com/archive/2007/07/17/the-eponymous-laws-of-software-development.aspx/
- https://www.timsommer.be/famous-laws-of-software-development/

## Hardware

  - [Moore's Law vs Wright's Law](https://www.forbes.com/sites/jimhandy/2013/03/25/moores-law-vs-wrights-law/#162188f277d2): *each percent increase in cumulative production in a given industry results in a fixed percentage improvement in production efficiency*
  - [Dennard Scaling](https://en.wikipedia.org/wiki/Dennard_scaling): as transistors get smaller, their power density stays constant, so that the power use stays in proportion with area; both voltage and current scale (downward) with length
  - [Wirth's Law](https://en.wikipedia.org/wiki/Wirth%27s_law) - this is a special case of [Jevons paradox](https://en.wikipedia.org/wiki/Jevons_paradox): *software is getting slower more rapidly than hardware is becoming faster* 
    - Spolsky wrote a great counterargument to this [on Bloatware](https://www.joelonsoftware.com/2001/03/23/strategy-letter-iv-bloatware-and-the-8020-myth/)
  - [Amdahl's law](https://en.wikipedia.org/wiki/Amdahl%27s_law): the theoretical speedup in latency of the execution of a task at fixed workload that can be expected of a system whose resources are improved (the "mythical man month" law)
    - Also applied on Software and People https://codahale.com//work-is-work/


## Business of Tech


  - Commoditize your complements - [Gwern](https://www.gwern.net/Complement), [Spolsky](https://www.joelonsoftware.com/2002/06/12/strategy-letter-v/)
  - Rules for how Networks Scale (from [pmarca](https://a16z.com/2019/12/16/starting-greatness-0-to-1-mosaic-netscape-marc-andreessen/))
    - O(N): Sarnoff's Law - the value of a broadcast network increases in direct proportion with the number of users
    - O(N^2): Metcalfe's Law - email is p2p - value is number of connections between two nodes
    - O(2^N): Reed's Law - no of groups and subgroups inside the network - what people do inside social networks and games

## Socio-Psychological

  - The [Gell-Mann amnesia effect](https://www.epsilontheory.com/gell-mann-amnesia/): you ascribe credibility to news on which you are not an expert, despite knowing how badly reported the news can be on things you ARE an expert. The ultimate troll, given that the name of Gell-Mann was given by Crichton to demonstrate this exact phenomena.
  - Poe's Law - sufficiently advanced satire is indistinguishable from extremism
    - *"Without a winking smiley or other blatant display of humor, it is utterly impossible to parody a Creationist in such a way that someone won't mistake for the genuine article."*
  - [Shirky Principle](https://kk.org/thetechnium/the-shirky-prin/): Institutions will try to preserve the problem to which they are the solution
  - [Cromwell's Rule](https://en.wikipedia.org/wiki/Cromwell's_rule) -  the use of prior probabilities of 1 ("the event will definitely occur") or 0 ("the event will definitely not occur") should be avoided, except when applied to statements that are logically true or false, such as 2+2 equaling 4 or 5.
    - *"I beseech you, in the bowels of Christ, think it possible that you may be mistaken."*
  - [Chesterton's Fence](https://florentcrivello.com/index.php/2019/09/04/the-efficiency-destroying-magic-of-tidying-up/) - you should never take down a fence before knowing why it was put up
  - [Ebbinghaus Effect](https://www.psychestudy.com/cognitive/memory/ebbinghaus-forgetting-curve) - mathematical model of how we forget - aka [forgetting curve](https://en.wikipedia.org/wiki/Forgetting_curve)
    - also notable for the visual [Ebbinghaus Illusion (relative size of circles)](https://en.wikipedia.org/wiki/Ebbinghaus_illusion)
  - [Stigler's Law](https://en.wikipedia.org/wiki/Stigler's_law_of_eponymy) - no scientific discovery is named after its original discoverer. Maximum meta!
    - Mark Twain: "*"It takes a thousand men to invent a telegraph, or a steam engine, or a phonograph, or a photograph, or a telephone or any other important thing — and the last man gets the credit and we forget the others. He added his little mite — that is all he did. These object lessons should teach us that ninety-nine parts of all things that proceed from the intellect are plagiarisms, pure and simple; and the lesson ought to make us modest. But nothing can do that.*"
  - [Berkson's Paradox](https://twitter.com/MWStory/status/1205486677369786369?s=20) - positive correlations become negative because of filters that trade factors off.
  - [1% Rule](https://en.wikipedia.org/wiki/1%25_rule_(Internet_culture)) -  90% of the participants of a community only view content, 9% of the participants edit content, and 1% of the participants actively create new content.
    - application of [Zipf's Law](https://en.wikipedia.org/wiki/Zipf%27s_law)
  - [Goodhart's Law](https://medium.com/@coffeeandjunk/campbells-law-goodhart-s-law-when-you-are-measuring-to-fail-c6c64923ad7) - “When a measure becomes a target, it ceases to be a good measure.” 

## Related (for future blogposts)

- Cognitive Biases
- Logical Fallacies:
  - http://utminers.utep.edu/omwilliamson/ENGL1311/fallacies.htm

