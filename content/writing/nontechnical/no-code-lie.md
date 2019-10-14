---
title: '"No Code" Is A Lie'
subtitle: Why Coders should take a second look at "No Code" tools
slug: no-code-lie
categories: ['Reflections', 'No Code']
date: 2019-10-11
published: false
---

Developers often mistake the "No Code" movement to mean "No Coders" or "Not for Coders". As a developer, I used to either regard "No Code" as a threat, or dismiss "No Code" tools as something beneath me, something you only resort to if you, well, can't code.

But there is an open secret behind the current generation of "No Code" tools - **it's ALL code**.

"No Code" tools generate code. "No Code" tools run on _mountains_ of code. "No Code" tools can even interact with your code. They still require technical users - people who can debug, people who can think in abstractions, and, above all, people who know how to glue just the right tools together in the right way to produce business value.

If you're thinking that sounds like a developer, you'd be right. Just like "serverless" just means "not your servers", "no code" means "not your code".

## The API Economy + "No Code" = The GUI Economy

You may have heard of [the API Economy](https://a16z.com/2018/03/09/api-world-summit/) - the idea that as software increasingly [eats the world](https://techcrunch.com/2016/06/07/software-is-eating-the-world-5-years-later/), a whole generation of software companies are arising to tackle individual hard problems in software. The average person on the street will never hear of Stripe or Twilio, but they may be customers of some startups which in turn are customers of Stripe or Twilio for payments or communication.

Where developers used to be responsible for the full stack of code and integration needed to make these capabilities possible, API companies make adding commoditized functionality as easy as dropping in a few lines of code. This makes sense on multiple dimensions: it transforms a high *fixed, upfront, uncertain* cost, into a *variable, deferred, predictable* expense, and a specialized service is likely to be more robust and cheaper (due to scale) than a self-written one. This is hugely beneficial for both sides, which has resulted in an entire economy of API's blossoming for every "hard problem" imaginable:

![https://monsoonblockchain.org/wp-content/uploads/2019/03/https-blogs-images.forbes.com-louiscolumbus-files-2017-04-api-bessemer-venture-partners.jpg](https://monsoonblockchain.org/wp-content/uploads/2019/03/https-blogs-images.forbes.com-louiscolumbus-files-2017-04-api-bessemer-venture-partners.jpg)

_Source: [Bessemer Venture Partners](https://www.slideshare.net/ByronDeeter/state-of-the-cloud-2017-72021644)_

One (unforeseen?) outcome of the API economy is how hugely enabling it has been for individual developers as well. Suddenly, if you understood HTTP and REST, you now had access to the PhD-level search capabilities of [Algolia](https://www.algolia.com), or the nationwide banking relationships forged by [Plaid](https://plaid.com/). This isn't a threat to developers, nor is it something "real" developers wouldn't use - it just redefined what the job is. Instead of doing the same undifferentiated heavy lifting every other developer does, the developer can now focus on writing just the core code the business needs to deliver on its unique value proposition, leaving other specialists to deliver on theirs. Developer salaries _rose_, instead of fell, through this API Economy transformation.

This is the context with which I now approach the current "No Code" movement.

Where developers used to be responsible for writing the code to link together business logic and various APIs together, they can now do it visually. When you look at Zapier's interface:

![https://www.process.st/wp-content/uploads/2016/01/what-is-zapier-select-filters2.png](https://www.process.st/wp-content/uploads/2016/01/what-is-zapier-select-filters2.png)

_Source: [Process.st](https://www.process.st/what-is-zapier/)_

and see users literally manipulating Boolean logic to get their work done, it is hard to deny that they are coding their business logic in terms that the machine understands. It just doesn't look like a coder's idea of coding.

It is no secret that Graphical User Interfaces (GUI's) are more intuitive and easier to use for more people than verbose API documentation that then require additional engineering resources to write the code needed to take advantage of it. So the next generation of tools are all-in on this idea - deliver their core functionality with a GUI for direct manipulation as well as interlinking with other tools. Even heavily developer-focused companies like [Netlify](https://https//www.netlify.com/products?utm_source=blog&utm_medium=webflow-swyx&utm_campaign=devex), where I work, have heavy investments in GUIs, with an extensive [design system](https://storybook.netlify.com/) to boot. An additional benefit of a GUI focus, particularly with web apps, is the ability to use the software while on mobile, the primary computing platform of our time.

I'll dub this **the GUI Economy**. Just like the API movement before it, it will allow a larger concentric circle of people (who don't identify as developers, but are nevertheless technical) to build and interact with software, and yet it will be less a threat to developers than an enabler. This is what we discuss next.

## Visual Developer Tools

At first, a developer might resist the idea that visual tools can help in coding. But once you look for it, you see it everywhere.

![https://i.ytimg.com/vi/0BzinTi8Z7A/maxresdefault.jpg](https://i.ytimg.com/vi/0BzinTi8Z7A/maxresdefault.jpg)

_Source: [Dark](https://darklang.com/)_

**Visual Development Environment**. With a [51% market share](https://insights.stackoverflow.com/survey/2019#technology), the most popular development environment these days is [VS Code](https://code.visualstudio.com/), despite only being released in 2015. What explains it's meteoric rise in popularity over simpler code editors like [Notepad++](https://notepad-plus-plus.org/downloads/), [Atom](https://atom.io/) and [Sublime](https://www.sublimetext.com/)? Among other things, it offers a point and click interface for search, file navigation, type hints, customizing settings, adding extensions, and so on. That is what it and other full featured IDE's provide over simpler tools. In fact, [Dark Lang](https://darklang.com/) recently coupled IDE and language, taking the IDE and visual coding metaphor to an even higher level by guaranteeing you can't write invalid code because the IDE won't let you. Nobody argues that this is less legitimate coding. 

![https://i.imgur.com/3pEB0B3.png](https://i.imgur.com/3pEB0B3.png)

_Source: [XState](https://xstate.js.org/docs/)_

**Visual State Machines**. Similarly, there is a widespread movement to [embrace statecharts](https://statecharts.github.io/) and visually designed state machines governing app logic. This visualizes complex state transitions and makes missing holes due to bad planning painfully obvious. Changes in business logic due to changing business requirements are intuitively added, validated, and translated to the view layer in a consistent manner. With [xstate's Viz tool](https://xstate.js.org/viz/), you can visually simulate any transitions and side effects to your state machine. Nobody argues that this is a less legitimate way to model state machines - in fact, [quite the opposite](https://www.youtube.com/watch?v=VU1NKX6Qkxc).

![https://cli.vuejs.org/ui-analyzer.png](https://cli.vuejs.org/ui-analyzer.png)

_Source: [Vue CLI](https://cli.vuejs.org/guide/cli-service.html#using-the-binary)_

**Visual Command Line Interfaces**. At first this seems an oxymoron. Aren't Command Line Interfaces (CLI's) the canonical opposite of GUI's? Recently, this line is being blurred in creative and interesting ways. [Vue CLI](https://cli.vuejs.org) led the way building a full desktop app layer atop their CLI, to ease discoverability and visualization. But the desire to graphically represent code execution state and options is as old as CLI's - from [the most basic spinners](https://github.com/sindresorhus/ora#readme) to [navigatable, interactive forms and templates](https://github.com/enquirer/enquirer/) to [writing entire layout engines and interactive renders with React](https://github.com/vadimdemedes/ink). Nobody argues that this is a less legitimate way to execute code!

![https://www.portalzine.de/wp-content/uploads/sites/3/2019/02/visbug_browser_design_tool.jpg](https://www.portalzine.de/wp-content/uploads/sites/3/2019/02/visbug_browser_design_tool.jpg)

_Source: [Visbug](https://github.com/GoogleChromeLabs/ProjectVisBug)_

**Visual Interface Editing**. The "What You See Is What You Get" (WYSIWYG) experience is one fraught with history - because this is a particularly thorny problem, early attempts like FrontPage and Dreamweaver weren't particularly great at producing human readable and maintainable code. But web technologies have grown a lot since - [Firebug](https://blog.getfirebug.com/) allowed direct editing of sites 12 years ago, has a modern clone in [Visbug](https://github.com/GoogleChromeLabs/ProjectVisBug), and even has a built-in solution in the [`document.designMode`](https://developer.mozilla.org/en-US/docs/Web/API/Document/designMode) Browser API. Of course, [Webflow](https://webflow.com) is leading the vanguard in terms of "No Code" web design/authoring tools, even coming with intergrated CMS and Ecommerce solutions. Nobody should argue that this is a less legitimate way to write UI's!

At the heart of all this is Developer Experience. At the end of the day, developers are humans too - we respond the same positive way to GUI's that the rest of our users do. If we learn to treat visual tools as friends instead of enemies, they can become massive productivity boosters for us as much as they do for our friends who don't do traditional coding.

## Creation over Code

The old, tired debate in code is that of ["convention over configuration"](https://en.wikipedia.org/wiki/Convention_over_configuration). What it misses is that these are more or less ways of shifting the responsibility of code around.



goto -> imperative -> object oriented -> functional

- scaffolding
- design tools -> design system pull out components
- no need translation -> single source of truth
- bezier curve
- 

## Not All Roses

sd

## Conclusion

sd

---

## Webflow Guidelines

http://voiceandtone.webflow.io/patterns/blog-posts

1. Who’s your audience? Developers who are dismissive of Webflow bc it is "no code"
1. What will they get out of your article? Look at Webflow as a tool instead of a threat
1. Why should they read it? They are getting hung up on Webflow based on identity.
1. How will they act on it? They will try to use Webflow as an exportable design tool
1. When: does some current event or topic make it relevant? none
1. What’s your target keyword/keyphrase? This helps ensure a topic's relevant. "No code"
1. What graphics/videos/audio would help you make your point? At minimum, your article should include at least 3 to 5 images. "No idea"
1. What structure will you use? Our posts have strong structure with frequent subheads. Consider outlining before you write. see above

- Title: "No Code" Is A Lie
- Subtitle: Why Coders should take a second look at "No Code" tools
- Lede: |
  Developers often mistake the "No Code" movement to mean "No Coders" or "Not for Coders". But there is an open secret behind the current generation of "No Code" tools - it's ALL code. "No Code" tools generate code. "No Code" tools run on mountains of code. "No Code" tools still require technical users - people who can debug, people who can think in abstractions, and, above all, people who know how to glue just the right tools together in the right way to produce business value.
- Hero image
- At least 3 subheads to provide structure and easy takeaways
- At least 3 images for body content: whenever possible, use a screenshot, GIF, or other graphic that illustrates your point, as opposed to a generic photo.
- Link generously, but not in the first few paragraphs.

If citing data or quotes, always link to the source
Try to link to 3 other Webflow blog posts or pages
Always embed links in clear language that communicates the topic of the destination page. Never embed links in the word "here."
