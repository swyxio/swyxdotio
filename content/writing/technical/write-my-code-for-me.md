---
title: Write My Code For Me
subtitle: Cheating at Developer Experience
slug: write-my-code-for-me
categories: ['Tech']
date: 2019-03-21
---

_My thoughts to self while weighing adding `netlify functions:create` to Netlify Dev. [Originally a gist](https://gist.github.com/sw-yx/6f97b9d7f3efbfad4c8e5b8a14b5bd27)_

I've recently been working on some CLI that involves printing out a bunch of boilerplate template code for developer convenience. I found that there were a few interesting DX angles to this and figured I should write down the rough problem areas and the stances I chose. Most of us are familiar with CLIs like https://yeoman.io/, this task is variously called "scaffolding" or "templating" or some such similar term, with varying degrees of intelligence in the task. I'll refer to it as "templating" in this essay.


# Part 1: Should You?

## Caramel, not just Sugar

If there's a Maslow's hierarchy of Developer Experience, templating has to be at the top (i.e. it is not core). It trails the "core" DX. Breaking changes in core will easily break anything built on top of it (though of course that shouldn't happen often). However, it is closer to the user, and both removes the activation energy of trying you out, and provides a tool for power users to be very productive. Templating is *concentrated* sugar, aka Caramel!.

Overall My top reservation with the very concept of templating is maintainability:

- Developer productivity only jumps at the single point where code that is scaffolded out, and then the developer has to own the code from there on out
- From the maintainer perspective - The templates need to individually be maintained too; we have a catch-22 where the more nontrivial the template, the more useful it is, so we want to have those, but then the more nontrivial the template, the more work it will be to maintain.

When it comes to developer experience there is a spectrum of convention vs configuration. (Note: by configuration here i also mean writing code, not just writing json files)

On the configuration side, we have a really random assortment of tools to help. At the base level we have documentation - READMEs, blogposts, doc sites, and if we're really fancy, the CLI guides you through the configuration so you don't have to RTFM (the best docs are the ones you don't have to write! and they don't have to read). Templates best help to patch up configuration (mostly in the form of fixing boilerplate code) and go from copy-and-paste to tap-tap-tap.

Toward the convention side of the spectrum, there are zero config options, as well as single-point-of-entry [toolkits](https://kentcdodds.com/blog/concerning-toolkits/) like `react-scripts`, `redux-starter-kit`, and `apollo-boost`, all of which are layers on top of more powerful underlying primitives that solve the 80% use case.

Configuration is fine. Configuration is powerful. But we should continue to look out for cases where relying on templating is making us lazy toward finding opportunities to make conventions better.

> as an aside: there's often a question of "syncing" - syncing updates, updating a template that has been scaffolded out, and so on. This adds a lot of additional complexity and I prefer not to do it (and accordingly, not promise the user that I can do it).

## Templates vs Packages

The two forms of "write code for me that is immediately usable" are templates and packages (here, "packages" mean npm packages). Here are some pros and cons to consider:

- Packages can be individually released and imported and maintained. Templates (as far as I know) have to be maintained and released together. People have to be prompted to upgrade their CLIs to get the new templates, which is a pain point. 
- Packages can only be installed. Templates can execute other forms of arbitrary code before and after templating... including prompting the user for more info, so no docs are required
- Packages can't be edited by users. Allowing for more usecases means growing the API surface area. Templates can be edited and can be repurposed by users for any usecase.

You can paper over this choice by essentially turning templates into your own proprietary package ecosystem (so you have a nice middle ground between templates and packages), but that means further investment in infrastructure. Meteor tried this, and it didn't work well. I don't know of an example that has worked well, but perhaps there are more examples in heaven and earth than exist in my imagination.

Ultimately the choice here is dependent on the surface area of your tool. If there -is- a concrete, useful, 80% usecase, make a package. If you are more of a platform where no one use case dominates, templates may be better.

## Templates vs Documentation

The other competition against templates is documentation (READMEs, blogs, docsites, videos, gifs, etc). Pros and cons:

- Docs also double as content marketing - they are SEO friendly. Templates can be complemented by blogposts, but in themselves aren't discoverable by google.
- Docs require copy-and-paste. Templates don't.
- Blogposts are dated, and developers know how to track down and account for API changes since the publish date, although it involves more work on their part. This means maintenance overhead is kept low. However templates and docs promise to be current, and therefore mean more maintenance on our part while there is less overhead on the developer's part.
- Docs allow longer form conceptual explanation that can be more generally useful for educational purposes. Templates at best offer small inline comment opportunities or it starts to get obnoxious.
- Templates are available and discoverable in-terminal, whereas the developer often has to break flow to look up docs (the negative impact of this is debatable).
- Your userbase will not be homogenous. Some will straight up prefer docs, others will prefer templates, and you'll be tempted to offer both without a conscious strategy. Maybe just only do docs, keep it simple?

I cant think of a right answer here except that templates are a nice to have at a certain scale.

# Part 2: How to do it well?

## Utility vs Discoverability

Ok, so we've decided to invest in, and maintain, templates. **How many should we have?**

- On one hand, more templates make the templating feature more useful and marketable. It shows the range of use cases the developer can apply your tool for, and makes them available in literally the lowest friction manner possible - *we write the code for them and literally put it in their filesystem*. Great!
- On the other, more templates make it hard to know what is or isn't available, especially when the possible space is infinite. Particularly in a CLI environment, discoverability is the primary issue, but a close second is just sheer overwhelm and the paradox of choice. Should each template be as distinct as possible from the other and we should only offer a "minimum spanning tree" of templates? Or do we allow slight variations (e.g. "graphql template!" + "graphql template with auth!" + "graphql template with typescript!" + "graphql template with auth and typescript!") to keep it useful? How to inform (and maintain) the combinatorial explosion of possibilities?

This seems a Hard Problem™. However, there are a host of things you can do to tip the scales toward more templates.

- **Use fuzzy autocomplete/filtering**: Many CLI tools like [inquirer](https://www.npmjs.com/package/inquirer#list---type-list) default to just listing out available options. You can scroll up and down and that's it. However, you can add a plugin like [inquirer-autocomplete-prompt](https://www.npmjs.com/package/inquirer-autocomplete-prompt) combined with [fuzzy](https://github.com/mattyork/fuzzy) matching to offer an experience of narrowing down the list by typing whatever is on the user's mind. Sort by match score instead of alphabetical. The newer kid on the block, `enquirer`, [comes with this built in!](https://github.com/enquirer/enquirer#autocomplete-prompt)

![autocomplete](https://raw.githubusercontent.com/mokkabonna/inquirer-autocomplete-prompt/HEAD/inquirer.gif)

- **Adapt to usage**: Many CLI tools are stateless by default. You can unintrusively add "memory" to your tool by saving recent or frequent selections and putting them first. https://github.com/rupa/z is the single best CLI tool I have ever used - it just works, and adapts to *me*. I use it dozens of times a day, every day, without thinking. You, too, can add memory to your tool with something like https://npm.im/data-store or https://npm.im/configstore. At a larger scale, adding telemetry to your CLI gets you overall usage statistics, where you can adjust things on a more macro scale (more highly used stuff should be placed higher, less used stuff either has a description problem or should be retired).

- **Nest variants**: Every top level template should have a primary feature that people would probably search for, and if you offer variants (like "with typescript!" or "with auth!") make it a second prompt. The cost of an extra prompt is nothing compared to the code you save your user :)

- **Userland extensibility**: Allow users to input templates they own and host as long as they conform to a format you specify. This allows them to use your templating feature without you having to maintain a template for them.

- **Follow up**: After your template has done its thing, you can also ask for issues and PRs to keep it up to date. Every time a template is used, you have provided some benefit to your user. This is a good point to ask for feedback, or to invite the user to tweet their love for your tool (and in the process educate other users on use cases). Reciprocity works.

- **Do more than write code**: The cost of using (or learning to use) your templating feature can be offset if it saves using (or learning to use) other features by bundling them. For example, your template may have dependencies. Install them. The template's code may expect other setup code and commands to be run - just run it for them.


## How "Smart" should we be?

Templates offer the opportunity to do more than code dumps. Tools like https://www.npmjs.com/package/copy-template-dir allow very basic mustache variable swapping - but can we do more than that? Should we?

I don't have profound thoughts to share on this, but i think it is a worthwhile area to explore. For example, lets say our tool offers indepdendent capabilities A and B, and there are mutually exclusive usecases X and Y. We can offer:

- `O(n!)`: just 6 templates: X + A, X + B, Y + A, Y + B, X + A + B, Y + A + B
- `O(n)`: at the top level, offer a choice between X and Y, then prompt again to add A or B or both.

Think about how this scales with your capabilities and usecases. and how some capabilities may not work well with some usecases, and how you'll accommodate for that. 

If the second choice: How will you code that up? One core template per usecase that you then write more code to modify for each capability? Will that code be idiomatic or look weird? (as in, no developer would actually write that if they wrote your thing from scratch - `create-react-app` famously ejects into a monster webpack config that scares off all but the most determined.) What if the capabilities are not entirely modular and have some interrelationships? 

What opportunities am I not thinking about that could be done for templating? Is the "write code for me" framing limiting my imagination?

I don't know the answer to this.

- [Airbnb uses Yeoman and babel AST parsing to augment existing files](https://youtu.be/JsvElHDuqoA?t=1630)

## Misc notes

- Don't worry about CI. Templating isn't used in CI, so you can lean on user prompting as much as you like :)
- Do you want to acommodate different languages (eg TS vs JS) and versions?
