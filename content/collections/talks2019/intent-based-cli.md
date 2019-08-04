---
title: Adaptive Intent-based CLI State Machines
slug: intent-based-cli
topic: CLI
venues: OclifConf
date: May 2019
gist: https://gist.github.com/sw-yx/3af1e264b8460af8897768045b2c229f
desc: better intelligence behind oclif
description: Oclif does a lot of nice things, like offering flag and argument parsing, help documentation, and pluggability. That's good for the CLI developer. But what about the CLI user? Instead of viewing our CLI's as simple harnesses for procedure calls, how can we add an intelligent layer to interpret to user intent and guide them down a pit of success? How can we make our CLI's improve using information gained over time?
---

Pitch:

I was the primary CLI dev for the Netlify Dev launch, and we found several user pain points that resulted in forming this thesis around needing an intelligent layer sitting behind Oclif for better UX (and DX for that UX).

Structure:

- intro to Netlify and JAMstack (1min)
- intro to Netlify CLI and how we got to v3 (2min)
- Netlify Dev (2 min)
- discovering 12 factor CLI apps (2min)
  - commentary on feedback: invite tweets and issues
- compare with 12 HCI principles (1min)
- cli-cheatsheet (2min)
- Memory, the 13th factor (2 mins)
  - introduce rupa/z
- The State is Hard problem: resolving state (5mins)
  - screenshot of issue
  - conflicts of state, manually coding overrides
  - get global state
  - get project state
  - implement frecency
  - DEBUG overrides
- solution 1: cli-state (5mins)
  - xdg spec
  - constrained model of state
    - the ladder
  - Looking for Help - offline caching
    - remote data
    - remote requires
  - TESTING?
- The Death by Default problem: resolving requirements (5mins)
  - screenshot of issue
  - what do we want, nero linguistic programming
  - 1 more example inside of netlify dev for the death by default problem
  - How we solve the death by default problem today
    - Bad UX: silent error
    - OK UX: error code with instructions
    - Better UX: prompt to resolve
    - Adaptive UX: remember past inputs, offer useful defaults
    - Progressive Disclosure UX: step through for beginners, offer escape hatches
- solution 2: cli-state-machine (5mins)
  - demo of cli-state-machine
  -

---

todo:

- cli-state: rename "config" to "state"
- cli-state-machine: error on `noPrompt` setting, tie flag to requirement

---

12 factor: https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46

x help docs

- flags > args
  x version
- mind the streams
- handle things going wrong - err msg, debug module
- be fancy
  - colors (TERM=dumb, NO_COLOR, --no-color)
  - spinners, progress bars
  - OS notifications
- prompt if you can
  - never require a prompt
  - need to be able to automate your CLI in a script
  - confirm for dangerous actions
  - checkboxes/radio buttons for options
- use tables
  - no table borders
  - mind screen width
  - make greppable, entry per row
  - --no-headers
  - --sort
  - --output
- speed: 100-2000ms
- encourage contributions
  - licence
  - contrib guideline
  - CoC
  - plugins system
- subcommands: multi vs single
- xdg spec

```js
const chalk = require("chalk")
const { prompt } = require("enquirer")
class Example2 extends Command {
  // ...
  async run() {
    // ...
    if (state.name) {
      myBusinessLogic(state.name)
    } else {
      const name = prompt("give me a name")
      if (name) {
        console.log("next time you can pass a --name flag!")
        myBusinessLogic(name)
      } else {
        this.error(`Error code`)
        this.error(`Error title`)
        this.error(`Error description (Optional)`)
        this.error(`How to fix the error URL for more information`)
      }
    }
  }
}
```
