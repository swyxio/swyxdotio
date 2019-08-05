---
title: Avengers Endgame Explained With Git
published: false
description: time travel is easy once you realize it git-based
tags: git
category: Rants
date: 2019-01-15
slug: endgame-git
author: swyx
---

> ⚠️ Warning: It goes without saying that this entire article is full of spoilers for Avengers: Endgame!

The convoluted time-travel based plot of Avengers: Endgame was a source of much fan-service (Going back to the Battle of New York! Getting Mjolnir! Tony reconciling with Howard!) as it was confusion. Many fan theories were spawned about how time travel works in the MCU, and the movie itself even dedicated some time to making fun of popular time travel movie tropes:

> "Look, we go back, we get the stones before Thanos gets them, Thanos doesn't have the stones. Problem solved."

> "That's not how it works... Who told you that?"

> "Star Trek, Terminator, TimeCop, Time After Time, Quantum Leap. A Wrinkle in Time, Somewhere in Time, Hot Tub Time Machine. Bill and Ted's Excellent Adventure. Basically, any movie that deals with time travel."

There was even a brief exposition with The Ancient One and Bruce Banner:

![https://qph.fs.quoracdn.net/main-qimg-cb979fb18815cdd541ca1bb80fe64ffb](https://qph.fs.quoracdn.net/main-qimg-cb979fb18815cdd541ca1bb80fe64ffb)

> "The Infinity Stones create what you experience as the flow of time. Remove one of the stones, and that flow splits. Now this may benefit your reality. But my new one, not so much. In this new branched reality, without our chief weapon against the forces of darkness, our world will be overrun. Millions will suffer. So, tell me, doctor, can your science prevent all that?" - The Ancient One

However, I'm here to tell you that as a software engineer, you're already extremely well equipped to understand time travel with a tool you use every day: Git!

## Timeline

Thor

- 2012: Battle of New York
- 2013: Thor the Dark World
- 2018: Infinity War Snap
- 2023: Time Heist and Final Battle

Tony

- 1970: Howard Stark at Camp Lehigh
- 2012: Battle of New York
- 2018: Infinity War Snap
- 2023: Time Heist and Final Battle

Steve

- 1945: Captain America
- 1970: Peggy at Camp Lehigh
- 2012: Battle of New York
- 2018: Infinity War Snap
- 2023: Time Heist and Final Battle

Main git commands to know

- `git branch --delete [branch name]`
- `git merge`
- `git stash`?

## The Hawkeye Test

- bisect? : https://flaviocopes.com/git-bisect/
