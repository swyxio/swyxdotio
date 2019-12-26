---
title: In Defense of Hammers
subtitle: Why "Right Tool for Most Jobs" beats "Right Tool for the Job"
slug: hammers
categories: ['Tech']
date: 2019-10-21
---

Let's say you needed a multipurpose tool. Which of these would you pick?

![./assets/hammers.png](./assets/hammers.png)

There are probably a few responses possible:

- People who prefer the Right-Hand-Side (RHS) tool, who like having a thing for every scenario
- People who pick the Left-Hand-Side (LHS) tool, who are fine with having a simple set of tools that does most, but not all, things
- People whose first instinct is to say "it depends"

The least helpful response is "it depends", because it is often unaccompanied by a succinct assessment of tradeoffs. Worse, you could get a listing of tradeoffs, but it is _unweighted_, presented as though the tradeoffs were somehow _equal_. They're not, and the more context you give, the more obvious the choice becomes.

But I'm here to call out the RHS people as well.

## Right Tool For the Job

[In September, I observed that](https://twitter.com/swyx/status/1171549189064613888):

**“Right tool for the job” is a cop-out.**

It assumes:

1. **unlimited search time**
2. **”Rightness” wins all debate**
3. **that there -is- a right tool**
4. **everyone agrees on the job**
5. **tradeoffs don’t matter/exist**
6. **People haven’t heard this 1000x already**

**We can do better.**

It wasn't a subtweet of anyone or anything, just a persistent pet peeve that bubbled through my unconscious that day.

I'd like to talk through each point.

### 1. Unlimited Search Time

Of course, you can take this in the most trivial sense: the number of solutions out there is vast, and your time is limited, of course you can't learn everything. Duh, you can't know infinite tools. Don't you remember [How it feels to learn JavaScript in 2016](https://hackernoon.com/how-it-feels-to-learn-javascript-in-2016-d3a717dd577f)?

But the reality is often much more constrained than that - you have mental headspace and time to evaluate 2, maybe 4 tools tops, _because you have other stuff to do_. The way those 2-4 tools even arrive in your consideration set is a heavy amount of marketing and word of mouth, all with their own biases. This is _before_ you are even able to assess objectively which is right for you.

Of course, that's assuming you _are_ able to assess what tools are "right" for you...

### 2. "Rightness" Wins All Debate

Of course, you can take this in the most trivial sense: we are pretty bad at evaluating tools anyway so we should stop pretending we can. FWIW, I don't actually believe this. Trial runs often suss out tool choices very quickly. However we will still make mistakes, because whether or not the tool ends up "right" involves some amount of predicting the future. [False positives and negatives](https://en.wikipedia.org/wiki/False_positives_and_false_negatives) will be made.

What I think is even more pernicious is the idea that the "right" tool **wins all debate**, end of story. Of course, if you have an expansive definition of "right", this is a truism. But often we have critical factors that don't get considered properly:

- There is tremendous value in sticking to tried and tested legacy systems and tools, right down to their known bugs and flaws. There are too many examples to enumerate here but I'll link the reader to Spolsky's seminal [Things You Should Never Do](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/).
- Familiarity and Learning curve are flip sides of the same coin. You're able to do a ton more with a tool you're already familiar with. An unfamiliar tool bears the cost of a learning curve to get back to productive.

This is super nuanced. Insisting on always going with the "right" tool, for a common definition of "right", means taking on a huge amount of churn risk and cost. Insisting on always sticking to legacy and familiarity, however, also risks technical debt and a slow decline to irrelevance. The "right right" lies somewhere in between.

### 3. There -is- a right tool

This one is more about assuming that something out there exists that will solve your problem.

**It may not exist.**

You may churn from tool to tool to tool looking for perfection without realizing none of these tools were made for your situation. This search can never be satisfied, but the process may help you understand your own needs before realizing that you may have to stitch together multiple different tools, or (_gasp_) build your own.

### 4. Everyone agrees on the job

Discussions about tools often zoom too quickly to, well, tools. Comparing tools, Demoing tools, Trialing tools. But we may be better served trying to define and agree on what the job even _is_.

If you work on a team, this involves team dynamics and differing priorities, often based on roles and budgets and policies. But even solo we can be remarkably vague about what it is we actually _want_ out of a tool.

Too often we end up compiling feature checklists between the consideration set of tools and going for whichever has the most green - and forget that most of the things on the checklists we don't even need or care about nor have we verified actually works the way we hope it does (which, in the final analysis, is the same thing). This is a very **tool-focused** approach - we're dealing on their terms (often literally, based on bullet points from the pricing page).

Instead we could perhaps try to identify the 2-3 things the tool absolutely _must_ get done. This is a very **"us"-focused** approach - getting clarity on what we want before letting people tell us what we want.

If internal discussion is chaos: External ones are going to be worse. Even asking well-meaning friends what the "right tool for the job" is, involves them understanding what the job is _on your behalf_. Not impossible, but too often taken for granted.

### 5. Tradeoffs don’t matter/exist

I feel like this one is kinda self evident. Sometimes the "right tool" is beyond your budget (which, again, depending on how you define "right", disqualifies it from being the right tool 😂). Or it could be about familiarity, learning curve, migration cost, whatever. Learning curve is particularly important in my mind - is it better to know how to do everything in one (not necessarily "right") tool, or to be mediocre in every tool (one of which may be "right")?

It's also about the non-existence of perfection - say A and B each have 80% of what you want, but a different 80%. Do you have the capacity to just use both? If no, which 80% do you pick?

Either way, "pick the right tool for the job" is depressingly useless here.

### 6. People haven’t heard this 1000x already

Just a final dig at platitudes. Because "right" is ill-defined, it is hard to disagree with ("Use the wrong tool for the job" anyone?) and often used as "agree to disagree" conversation enders.

This isn't always true, of course. [Laurie Barth chimed in with this great point](https://twitter.com/laurieontech/status/1171550346570850305):

> You’re absolutely correct. But I usually hear this to counter zealots of one technology or another. In which case it’s pointing out that technologies they consider inferior have valid use cases.

With Laurie's caveat, [I think instead of engaging in meaningless platitudes, we can listen and empathise more, fill in knowledge gaps, and ultimately respect choices people make, while daring to have strong opinions.](https://twitter.com/swyx/status/1171580149810237442)

## Conclusion: Right tools for MOST jobs

I ended the mini-rant with a note: "We can do better" - by which I mean improve discourse on tech choices from unhelpful platitudes.

I think **general purpose tools and languages** have a strong case here. We often refer to general purpose languages - Python, JavaScript, Ruby, Java, C++, etc. - as "glue code" - tying together various API signatures and scheduled work and munging data shapes to make the machine run. But a **tool** that is general enough is basically the exact same way as a language.

People who use general purpose tools liberally are often criticized: "**When you have a hammer, everything looks like a nail**".

I guess I'm arguing for **everybody to have a small range of hammers** for the various jobs they need to do.

You may laugh at the horrendous inefficiency of using Excel to write a pricing and risk management system for an 8-figure-revenue interest rate derivatives business, but that's exactly what I did early in my finance career. Of course we should've hired developers and written it in the "right" tool or language. But we didn't have that time or resource. So that's what I did. We shipped it. It worked.

Now swap "Excel" for "React" and "pricing and risk management system" for "static site". Or something else used "inappropriately" for some job in some context you think you know better than the person who did it. You see what I'm getting at?

There's also the reality that jobs change over time. No matter how clear we are on them now, requirements _will_ change (often after the big rollout or migration) and we need to factor in flexibility and portability as an intangible requirement of the systems we create for ourselves. General purpose tools are better [optimized for change](https://overreacted.io/optimized-for-change/) in this respect.

## More Hot Takes

Apart from Laurie I felt some of the other respondents had some interesting comments worth sharing:

- [Tomasz](https://twitter.com/tlakomy/status/1171549864989249536): "Everyone uses what they know best and call it best practice"
- [Will King](https://twitter.com/wking__/status/1171549928511946752): "[Only the Sith deal in absolutes](https://www.wking.dev/content/articles/only-sith-deal-in-absolutes/)"
- [Ramon Garcia](https://twitter.com/rmngrc/status/1171675378555019264): "I think "right tool for the job from your toolbox" would be more correct. Doesn't assume you have unlimited time for investigating and find the best tool out there, and allows you to move on while using something you or your team has experience with."
