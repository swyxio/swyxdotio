---
title: 'Git-Centric Workflow'
subtitle: The One API to Rule Them All
slug: netlify-git-centric
categories: ['Tech', 'Netlify']
date: 2019-09-26
canonical: https://www.netlify.com/blog/2019/09/26/git-centric-workflow-the-one-api-to-rule-them-all/
---

_Published on [the Netlify Blog](https://www.netlify.com/blog/2019/09/26/git-centric-workflow-the-one-api-to-rule-them-all/)_

Netlify isn't _only_ about the JAMstack — there are a host of other design principles that inform the developer experience and product strategy users know and love. **Git-Centric Workflow** is a core philosophy embraced by Netlify, and listed as a [JAMstack Best Practice](https://jamstack.org/best-practices/), yet there hasn't been an attempt to define it or explain it's benefits. Let's try to!

## Provider and Platform Agnostic

The first thing to note about using Git is that it belongs to everybody and nobody. As [open source software](https://git-scm.com/about/free-and-open-source), anyone may use it and build on top of it. So although GitHub has a leading market share, you can take your code and move over to BitBucket and GitLab, or even a self-hosted solution, at any time.

Similarly, as a result of asking you to base your workflow in Git rather than on proprietary APIs, there is nothing preventing you from building and deploying your code with any other provider. Everyone can do static asset hosting; Netlify has to continually win your support with other features.

## Extreme Continuous Deployment

Continuous Deployment is [widely recognized to be a best practice](https://www.atlassian.com/continuous-delivery/principles/business-value), but it is still not the default in many environments and is still too hard to set up as a result. A Git-centric workflow in this context means deploying when you make a valid commit to Git (aka tests pass and build steps succeed), and, implicitly, push it to your Git hosting provider (so your code can survive catastrophic damage to your laptop).

**Immutable.** If Continuous Deployment means that the latest valid commit on your master branch is deployed on `[yoursite.com](http://yoursite.com)`, it is a short step to [Immutable Deploys](https://www.netlify.com/blog/2018/10/05/netlify-and-the-functional-immutable-reactive-deploy/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex), which means that EVERY deploy gets an always-live, immutable ID. Deployments are [atomic](https://www.netlify.com/docs/versioning-and-rollbacks/#atomic-deploys?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex), meaning we first upload every file, and only take the entire site live once they are all done. Domains like `yoursite.com` or `yoursite.netlify.com` are effectively references to a Git commit, just like `HEAD` or `origin/HEAD` might be. You can even [roll back](https://www.netlify.com/docs/versioning-and-rollbacks/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) to an old version at any time for any reason, just like with Git.

**Previews.** Git's standout feature of [branching and merging](https://git-scm.com/about/branching-and-merging) also means there is an inbuilt, extremely familiar collaboration model to your workflow, which platforms like Netlify or Heroku can then leverage. Open source projects and team marketing sites love the idea of [Deploy Previews](https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex), where every PR gets its own build with a publicly available URL that you can preview.

**Branches.** Not comfortable with Continuous Deployment? Prefer a `staging` and `uat` environment multistage deployment process? I've been there. Why stop at two environments? Have as many as you like! [Branch Deploys](https://www.netlify.com/blog/2017/11/16/get-full-control-over-your-deployed-branches/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) let you set up a new environment with no more API than `git checkout -b staging`. If you use [Netlify DNS](https://www.netlify.com/docs/custom-domains/#branch-subdomains?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) you can even set them up as a subdomain like `staging.yoursite.com`!

**Split Testing**. If you're already comfortable with feature branches, then you already know all the API you need to A/B test your features. Netlify's [Split Testing](https://www.netlify.com/docs/split-testing/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) is Git-centric too, which means that setting up an A/B test is also as simple as running `git checkout -b staging` and then moving sliders around to determine traffic splits. What's amazing is: _there is nothing else to learn!_ 🤯 **Pro Tip**: If you don't want to randomly roll out features based on traffic split, you can even go for [an opt-in private Beta release](https://dev.to/philhawksworth/netlify-pro-tip-using-split-testing-to-power-private-beta-releases-a7l), using [JavaScript to set the `nf_ab` cookie](https://www.netlify.com/blog/2019/09/11/netlify-pro-tip-using-split-testing-to-power-private-beta-releases/#giving-the-user-control-to-opt-in-and-out?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) for users you want to _launch darkly_ to!

## Not just Frontend Code: Git For Everything

Apart from Git as the API for everything deployment related, Git-centric workflow also means checking some things into Git that you might not have thought to do before.

**Atomic Deploys of Backend and Frontend**. The Git analogy for deployment extends beyond just your frontend code. Your serverless [Netlify Functions](https://www.netlify.com/docs/functions/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) are code too! If your frontend changes require backend changes, the lockstep movement of backend and frontend is assured with [Atomic Deploys](https://www.netlify.com/docs/versioning-and-rollbacks/#atomic-deploys?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex). In practice, truly non-breaking change between backend and frontend is hard to achieve. [Deploy Previews](https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) can help test functionality in production and [Netlify Dev](https://www.netlify.com/docs/cli/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) can help test locally even before you commit.

**Content**. Beyond just writing code, you may be writing documentation, or landing page copy, or a team blog. You need to draft, edit, preview, publish, and revert changes with content just like with any code you write. So it's no surprise that the editorial process can work excellently with Git-centric workflow as well! In fact this very blog itself uses [NetlifyCMS](https://netlifycms.org/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) to write and publish content, alongside any code edits needed to make that content display the way we need it to. NetlifyCMS is site generator and framework agnostic, but sets itself apart from [other Headless CMS solutions](https://headlesscms.org/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) by [putting all content in Git](https://www.netlify.com/blog/2017/03/17/an-open-source-cms-with-a-git-centric-workflow/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex). Version control and publication of content has never been easier.

**Large Files**. At the extremes, Git does have scalability issues. Even if you're not Google, you may be a photographer that needs to store large media files in their raw, highest quality format, even though you may not display them all the time and may need to size them down for better browsing performance. [Netlify Large Media](https://www.netlify.com/docs/large-media/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) still achieves this with Git-centric Workflow, by leveraging the wonderful [Git LFS](https://git-lfs.github.com) project, offering easy APIs for [Image Transformation](https://www.netlify.com/docs/image-transformation/?utm_source=netliblog&utm_medium=swyx-git&utm_campaign=devex) for faster browsing without busting data limits or performance budgets.

## So... What is Git-Centric Workflow?

As you can see, what we mean when we talk about a Git-Centric Workflow is a single analogy that applies throughout your entire architecture — from **putting as much as makes sense in Git** (e.g. Serverless Functions, Content, and Large Files), to taking **continuous deployment to its logical extreme** with no additional API to learn. Lastly, the ultimate expression of **freedom from vendor lock-in**: Git as the ultimate Provider- and Platform-Agnostic workflow.

In short: Everything lives in Git, and Git for Everything, for your site and deployment infrastructure to survive as long as Git does. That's a pretty good bet!
