---
title: How to Contribute to Open Source Frameworks
subtitle: for First Time Contributors, with Svelte example
slug: svelte-contributing
categories: ['Tech', 'Svelte']
description: One of the best ways to level up in programming is to contribute to a high quality open source project, especially a framework.
date: 2020-02-15
---

I've [contributed to React](https://www.swyx.io/speaking/contributing-to-react/) before, and though I didn't become a regular contributor, it definitely gave me a deeper appreciation of how React worked internally, and how a high quality open source framework is run (which is a whole nother level of abstraction from normal app code). 

At the time, I was just looking to get something nontrival on the board for Hacktoberfest. But recently I [ran into a minor problem in Svelte](https://github.com/sveltejs/svelte/issues/4405) and [Conduitry opened it up as an issue](https://github.com/sveltejs/svelte/issues/4408) to be addressed. 

This was my call to action.

## Table of Contents

## Why Contribute

One of the best ways to level up in programming is to contribute to a high quality open source project, especially a framework. You level up specifically in two ways: 

1. You learn to think one level lower in terms of abstraction. With an app, you are typically consuming code ([according to Seldo, 97% of app code is OSS code](https://medium.com/npm-inc/this-year-in-javascript-2018-in-review-and-npms-predictions-for-2019-3a3d7e5298ef)). With an OSS library or framework, you are writing code to be consumed by other code, with probably wider usecases than you have experience with. Be ready for the "this doesn't work on Windows" or "What about IE11" or "Did you consider React Native?" or any number of cases you may not normally think about.
2. You can get by only manually testing things in an app. But with an OSS framework, nobody has time to manually test everything for regressions with every PR. So an extensive test suite and CI automation is a must - this is to *save time* rather than a *nice to have*. Ditto documentation, error messages, etc etc. So you level up by being forced to think through all these factors that a typical app developer might normally skip for expedience.

## What to Contribute

One of the best ways to contribute to a high quality open source project (or even an app at a new job) is to work on something with a small scope and add tests. In fact [you can even skip adding functionality - Just add tests and people will thank you!](https://twitter.com/swyx/status/1064742523426430976?s=20). 

In practice, for OSS frameworks, I've found adding devmode warnings is a nice entry point. You don't risk adding any JS weight to production bundles, you learn how the library differs between dev and prod, and you improve the developer experience for everyone who comes after you.

> ⚠️ Note: Make sure your contribution is welcome! 

For example, there should be an open issue acknowledged by maintainers. Don't skip this unless you know the context well enough to be sure. **Driveby PRs are not welcome**, and cause extra maintainer stress when they have to reject your code. 

## How to Contribute

Here are the high level steps to follow:

1. Setup
  - Fork the repo
  - `git clone` it locally
  - `npm install` 
    - `yarn install` doesn't work on the Svelte codebase for some reason
  - Run the full test suite
    - You're gonna have to run it at the end, so might as well run it at the start to make sure you have everything setup right. Sometimes you need to setup extra env vars and stuff like that. For Svelte, nothing is needed, just run `npm test`
  - Read `CONTRIBUTING.md`
    - many projects have uninformative `CONTRIBUTING.md`'s, but often you at least get some good hints on project structure and contribution requirements (e.g. a [CLA](https://en.wikipedia.org/wiki/Contributor_License_Agreement))
2. Look for similar code
	- it is unlikely that you're contributing something totally novel, so hopefully there is something similar nearby
	- For me, I found [this code](https://github.com/sveltejs/svelte/blob/2b3c2daafb854d04100e0648910083d493bcb1d7/src/runtime/internal/keyed_each.ts#L111), which was used [here](https://github.com/sveltejs/svelte/blob/6250046c052eb360e51b272c55870cff71f41a70/src/compiler/compile/render_dom/wrappers/EachBlock.ts#L377). It isn't EXACTLY a copy and paste job, but it gave me enough context that my solution was going to look the same.
3. Look for similar tests
	- That code is (hopefully) tested - so let's look for the corresponding tests!
	- For me, I used the error `Cannot have duplicate keys in a keyed each` and [found this test](https://github.com/sveltejs/svelte/tree/1a343b165c577429e968cea48607cccabf714b9b/test/runtime/samples/keyed-each-dev-unique).
	- There are also often several different ways to test things, so use this as an opportunity to study which approach is used to test which kinds of features - you may have to defend your choice in future.
4. Write your own test
  - I copied the test out and adapted it to expect the error/warning I was aiming to add
	- For Svelte, you can [prototype it in the REPL](https://svelte.dev/repl/hello-world?version=3) to ensure your test case fails as you expect
5. Run your tests
	- To know that the test is properly written, and that you understand the test harness, you should run your test to see it *fail* first before you try to make it succeed.
  - In Svelte, you can run `npm test` for all tests and `npm run test -- -g REGEX_FOR_SPECIFIC_TESTS` for individual groups of tests by regex so that you can iterate faster. For me, I ended up running `npm run test -- -g dev-warning-each-block` - you get this instruction from `CONTRIBUTING.md`
6. Write your code
	- Now you know how your test fails, time to make your tests pass!
	- You may run into other dependencies, and have to yak shave a bit. For me, I ran into the new and not-well documented `code-red` dependency, and [sent in a PR](https://github.com/Rich-Harris/code-red/pull/34) to update the docs for myself and for others. I think it is quite common to run into further documentation issues while working on an existing PR, because existing maintainers have the info in their heads, and so this is often a further contribution opportunity.
	- By now you have seen a decent part of the codebase - try to match the code style/conventions of the surrounding code, including Prettier/Linting settings.
7. Pass local tests
	- Bounce between 6 and 7 ad infinitum until you are sure your tests fail and pass in the right scenarios and not in each others' scenarios.
	- Speed is important here - run local test groups (eg `npm run test -- -g REGEX_FOR_SPECIFIC_TESTS`) rather than rerun all tests every time (eg `npm run test`)
	- Because Svelte is a compiler, when you run the test, every test folder gets an `/_output` folder generated with the intermediate compiled code, which you can manually inspect to ensure where your code is going wrong
8. Fix fixtures
	- If you affect any output code, you will probably break some fixtures and snapshots. Make sure nothing untoward is going on, then copy and paste into the fixtures to update them!
9. Blog about it, do a Talk about it
	- What, you expect me not to encourage you to pass on your knowledge? 

## [Here is the final PR](https://github.com/sveltejs/svelte/pull/4419) I made.

Good luck!