---
title: Bad Ways to Get Data
slug: bad-ways-to-get-data
categories: ['Tech', 'Svelte']
date: 2019-09-14
---

In working on my [Sapper export library](https://www.npmjs.com/package/ssg), I ran into a very peculiar problem: my pages were being generated a lot more slowly than expected:

- I was generating ~100 pages, and it took about 16 seconds (0.16s/page)
- https://insiderx.com/ does 30k pages, and it takes 15 minutes (0.03s/page)
- an extremely simple tweak of the default Sapper app generates 100k very content light pages in 95 seconds (0.001s/page)
- [Gatsby v2](https://github.com/gatsbyjs/gatsby/pull/6226/) built about 5000 pages in 37 seconds, 25k pages in 7.5mins (0.01 - 0.02s/page)

## Do Expensive Reads Over and Over

So I was at least an order of magnitude off of where I should be. I originally thought that this was justified, as I'd been told Sapper uses puppeteer to crawl pages, but this was wrong. I thought it might be json serialization/desrialization over the local server, but this was wrong.

It was the fetching of the data.

Because I had handcooked my own data process to be a single function that, when called, returned a Big Ball of Data, it was easy to code each page call to fetch this Big Ball every single page despite not needing it. If the reads were expensive (which they were, with [syntax highlighting](https://github.com/octref/shiki)), then they were executed for each file, for each page, over and over and over again.

Once I realized this, the fix was obvious. Refactor the data pipeline to have an upfront data read, dump it somewhere as a static, postprocessed file, and then only refer to that static file where reads are guaranteed to be cheap. 

As of writing, this blog now exports its ~100 pages in 7s (0.07s/page). Still slow but half as bad.

## Do One Big Read Upfront

So this is where we are now. everything happens in sequence. I can't do anything with the result of the first file read until I am done with the last file read. I am storing the data as one big ball, which means reading it is also one big ball. Which of these are the bottlenecks? Or is it something else I don't even know about?

## Have No Way to Profile

It seems like a really good way to be bad at getting data quickly is to not have any information with which to improve.

## Have No Way to Test Cheaply

Some plugin systems encourage tacking plugin after plugin with no way to debug apart from just running the code and seeing if it works. Plugins should be led by an introspection API that can be logged out and studied without actually executing. A strong parallel is GraphQL's schema system and GraphiQL.

In short: have a [Dry Run](https://mobile.twitter.com/swyx/status/1172212419764064256).

## Use synchronous I/O in an asynchronous environment

[Sapper uses `writeFileSync` to write files.](https://github.com/sveltejs/sapper/pull/894) This means essentially each file writing blocks the next. Pretty silly when Node is supposed to be async by default? Very nice way to mutex yourself for convenience.

## Do Everything Twice

Currently I read source data, combine and save it to the Big Ball, then query against it for a slice, and then save the slice again. Why not directly read and save slices and be the end of it?

There's a need to store indexes that cut across slices. Should we do that during, between, or after the slice read/writes?

## Have No Idea if You Need to Redo Work

[Immediate mode](https://en.wikipedia.org/wiki/Immediate_mode_(computer_graphics)) is easy to debug and write, because you throw away all state and so you are only responsible for declaring new state, however of course Retained mode can be more efficient if you do it right.

The way to do this is to have the idea of "pure functions" in data fetches. Given this assumption, you can memoize on these inputs, and skip fetches.

There's a related idea as well, where if you consider that data fetch processes can be expensive both in the initial fetch and also in the postprocessing, to do two things:

- if it is possible to fetch an index, memoize on that index and only fetch items based on specific invalidated caches.
- You can still do the full initial fetch, but still memoize the postprocessing.

## Have No Way to Estimate Time For Completion

The halting problem is intractable, but you can at least give a credible estimate of time to completion by using cumulative and prior results. This is important for long processes like Machine Learning.

## Ultimate lesson: Have a Plan

I think this lesson is a general one from the Database world - before making big data queries, make a [Query Plan](https://en.wikipedia.org/wiki/Query_plan)! Also called a manifest. I guess the difference between a plan and a manifest is that a manifest can have useful info for others to consume, while a plan has no such obligation.

You can then make optimizations *across* the plan, as well as memoize parts of it based off a manifest, and so on. 

That any large data pipeline should learn lessons from the data world seems so brutally obvious in retrospect, but we consistently fail to design prototypes and API's that respect this basic principle.