---
title: Package Jason
date: "2017-07-13"
indexscreenshot: "/images/packagejason1.png"
landingscreenshot: "https://raw.githubusercontent.com/sw-yx/packageJason/master/public/fulldemo1.gif"
link: "https://packagejason.herokuapp.com/"
github: "https://github.com/sw-yx/packageJason"
blurb: "Rank NodeJS boilerplates by cognitive load 📦"
blurb2: "Boilerplates serve as the catch-all alternative to opinionated ecosystems like NextJS and CRA, but they can be hard to track and evaluate. PackageJason literally analyzes package.json and other metadata to help rank and filter boilerplates by cognitive load and desired stack."
stack: meteor bootstrap
---

This was something I deeply desired when doing FreeCodeCamp and encountering the bewildering array of setups. In particular, these were the pain points that mattered to me as a newbie:

- I wanted webpack configurations figured out for me - just didnt understand any of it
- I wanted some sort of design system already in place, dropping in bootstrap on top of react was beyond my ability back then
- I wanted authentication ([Meteor accounts](https://guide.meteor.com/accounts.html) DX is second to none)
- I wanted to be able to search by stack (right tool, right job) - other attempts exist but didnt have versioning
- I wanted a "cost function" to reduce bias toward all singing, all dancing boilerplates that were so wildly complicated I would never be able to understand them

So over the course of a couple weeks of free time I made this and gave it a name and a [charming backstory](https://github.com/sw-yx/packageJason/blob/master/README.md) (who doesn't want PackageJason to get the girl?)

Ironically looking back at it three months later, I no longer have much need for it because I have gained all the knowledge I need to create my own and the cognitive load is much lower.

I had a strong reliance on Meteor (and Ryan Glover's fantastic [Clever Beagle Pup project](https://cleverbeagle.com/pup/v1/introduction)) as a beginner but with the comfort level I have now I do question what remaining use I have left for Meteor in terms of speed to MVP.