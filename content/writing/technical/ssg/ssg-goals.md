---
title: ssg's Goals
slug: ssg-goals
categories: ['Tech', 'Svelte']
date: 2019-10-27
published: false
---

I have been dragging my feet on `ssg` mostly because I wish someone else was working on it rather than me (it will never make money and I don't have time for it).

However the conversations I have daily at work always bother me and make me wish there was a better solution out there. Because nobody is working on exactly what I want, I'm forced to be the one to do it :( despite not having a better usecase for it than my own blog.

I am not at all optimistic this will ever be a wise venture so this is literally for shits n giggles until someone more serious than me picks this up. Because I'm not serious about it, it has an even higher chance of failure than the abysmal chance it had :(. at least i hope somebody else comes along and picks this up.

## SSG v0

whatever i have now, the Sapper-based slow monstrosity. I can add:

- an incremental build api
- zero config filestructure based markdown
  - default ejectable theme
- preprocessed typescript and postcss
- DEBUG=*

## SSG v1

What I want SSG to launch with is:

- 0kb of JS for a page that doesnt use it. this probably means not using Sapper.
- ludicrous speed. this probably means not using Sapper, and possibly using Rust/WASM.
- visual editor? use netlifycms? fork sapper studio?
- pure incremental builds
- ejectable themes
- Zero config:
  - RSS
  - filestructure based markdown
- ship your own docs in CLI
- proper docsite
- DEBUG=*
- dev mode?

open questions:

- no clientside routing?
- graphql?
- 404 search
- react import path?
- tailwind?
- graphql support?
- support 11ty's templating (mustache etc) and exact api?

## SSG v2

I actually wish i could work on this earlier, but Netlify doesn't support datastores now so there's no point:

- serverless serving if updates are found (so you get instant refresh)
- smart clientside routing? need to learn a lot more about this
- service worker layer?

TODO: check if there's a way to see if there's a new version of a page updated

- nested ssgconfigs so you can section up sites?

What else?