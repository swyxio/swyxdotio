---
title: Best Practice Open Source Repo Setup
slug: oss-repo-setup
categories: ['Tech']
date: 2020-01-19
description: Quick and simple ways to set up Open Source Repos with Best Practices
---

*Essay status: mostly baked. Meant for beginners to OSS.*

I often make the joke that GitHub doesn't do enough to encourage community standards:

[![https://pbs.twimg.com/media/EA-CXDMWkAEtMKI?format=png&name=small](https://pbs.twimg.com/media/EA-CXDMWkAEtMKI?format=png&name=small)](https://twitter.com/swyx/status/1157286966733496323)

## Why Standards Are Important

These standards aren't just made up for shits and giggles. They genuinely help the open source community work better together:

- Descriptions are important as short oneliners for people to understand what your repo is for.
- Readme's are important for people to understand what your repo does and how to use it. I have [strong views here!](https://twitter.com/swyx/status/1218711368989278208)
- Codes of Conduct help define what is permissible behavior in your community. And yes, every open source repo is a community.
- CONTRIBUTING.md welcomes potential contributors and gives them information they need to get started. This is [particularly prone to unhelpful boilerplate](https://twitter.com/swyx/status/983467648997609477) - more thoughtful customization would help contributors.
- Licenses are important so people know what they can or cannot do with your code. [GitHub's default is no license](https://twitter.com/swyx/status/1218711368989278208) - this is bad, because without a license, some people are technically not even allowed to LOOK at your code.
- Issue and PR templates help maintainers ask basic checklist questions to improve the quality of issues and contributions (and waste less time on back-and-forth).
- `.gitignore` is important because people often forget to ignore their `node_modules` and `.DS_Store` and other non-core folders.
- (Nice to have) - CHANGELOG.md for updates.

This isn't a huge list of stuff, but it can be a bit of a drag to set all this up manually especially if you operate [Open Source by Default](http://artsy.github.io/series/open-source-by-default/). Most of my own repos don't even meet these standards because it is such a drag to set them up. 

In GitHub, you can check what you're missing by going to the `More > Insights > Community` page on your repo:

![https://github.com/jeroenouw/cgx/raw/master/community-score.png](https://github.com/jeroenouw/cgx/raw/master/community-score.png)

And it has nice UI prompts to help you add things if you are missing them.

## Automate It

Here are some tools and bash scripts to run thanks to my friend [Tierney](https://twitter.com/bitandbang/status/1212223793898373120): 

```bash
npx license mit > http://LICENSE.md  # initialize your license
npx gitignore node  # initialize your gitignore
npx covgen YOUR_EMAIL_ADDRESS # code of conduct
git init # initialize git
npm init -y # initialize package.json, accept all defaults
```

You can inline this into a oneliner bash command: `npx license mit > http://LICENSE.md && npx gitignore node && npx covgen YOUR_EMAIL_ADDRESS` (adding in git and npm init if you wish).

[Kyle](https://twitter.com/kylewelch/status/1219011921812316160) puts this in his bash scripts to add making a directory, initializing npm and git, all in a single `init_repo` command:

```bash
init_repo() {
  mkcd $1
  git init
  npm init -y
  npx license mit > LICENSE
  npx gitignore node
  npx covgen kwelch0626@gmail.com
}
```

Of course, these steps don't take care of ALL the standards listed above - so far the only tool I have come across that handles them all is [CGX](https://github.com/jeroenouw/cgx)

![https://github.com/jeroenouw/cgx/raw/master/cgx-demo.gif?raw=true](https://github.com/jeroenouw/cgx/raw/master/cgx-demo.gif?raw=true)

This generates (according to their README):

### Github, Gitlab and Bitbucket
* License 
  - MIT
  - ISC
  - Apache 2.0
  - BSD 2-Clause
  - GPLv3
* Changelog
* Contributing
* Readme
* Todo
* Code of Conduct

### Github specific
* Bug report (issue)
* Security vulnerability report
* Feature request (issue)
* Pull request template
* All files at once

### Gitlab specific
* CI template
* Bug (issue)
* Feature proposal (issue)
* Merge request
* All files at once

### Bitbucket specific
* In future versions

## Other Useful Tools

- https://github.com/donavon/init-readme
- (other tools? [Let me know](https://twitter.com/swyx))