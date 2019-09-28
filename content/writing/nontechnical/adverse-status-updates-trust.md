---
title: Adverse Status Updates and Trust
slug: adverse-status-updates-trust
categories: ['Reflections']
date: 2019-09-23
---

I noticed an asymmetry between adverse status updates and trust that I figured it would be worth a quick comment on.

I think it's fair to say we provide status updates for two big reasons: build trust, and to enable coordination. (If done synchronously, it's [like a mutex](https://twitter.com/search?q=meetings%20mutexes&src=typed_query), but async updates have maybe ~80% of the value)

When providing adverse status updates, there is an incentive to filter out small issues. E.g. in a team update scenario, if you had a small setback that you expect to get resolved right away (or even one that has already been resolved), you might feel like it isn't worth reporting and so skip over it. If you have a tight schedule, or are rushing through traffic, you might not tell your partner that you might be late because it might turn out to be nothing and you might still make it (and you don't want to stress them out). A small outage of a few minutes may not be worth messing up [a pristine status page](https://twitter.com/QuinnyPig/status/1173370708316975104). **"You can skip the small things, as long as you report the big things".**

This is well intentioned, but probably a bad idea, because trust works the opposite way.

Trust works from a basis of proof points. Obviously, the more proof points that you are trustworthy, the better. But there is another dynamic - size of proof points. And it works cumulatively. The thinking goes: if they won't report this small thing, how much do I trust them about bigger things?

Answer: zero.

When you say nothing is going on, people stop believing you. [Absence of evidence isn't evidence of absence](<https://en.wikipedia.org/wiki/Burden_of_proof_(philosophy)#Proving_a_negative>) and all that.

Obviously this isn't fair to the reporter, who has made a mental commitment to definitely report the big things. But the reporter has the benefit of full knowledge of the sum total of their actions. The other party doesn't. They have a million things going on, and they [disproportionately remember the bad stuff](https://en.wikipedia.org/wiki/Negativity_bias) when they interact with you. They don't know everything you do, but they do see when you miss the little things.

And it's not so little to them.
