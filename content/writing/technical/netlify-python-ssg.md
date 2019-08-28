---
title: 'Python <3 the JAMstack (Case Study: Portray Docs on Netlify)'
published: true
slug: netlify-python-ssg
description: How to deploy Python projects to Netlify
tags: python, netlify
categories: ['Tech']
date: 2019-08-27
canonical: https://scotch.io/@sw-yx/python-the-jamstack
cover_image: https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVyXO9qi9y9KqWqYLcofhkaCaxQGMcXIkXht9YOGxLXP9jx1-W
---

Recently I was floored to hear Netlify's name on the excellent [TalkPython](https://talkpython.fm/episodes/show/224/12-lessons-from-100-days-of-web) podcast as a place to host Python web development projects. Let's talk about why I originally thought Python doesn't work on Netlify, and why that is wrong.

**TL;DR**: In this post we cover how to set up any Python Static Site Generator to deploy on Netlify, using the newly launched [Portray](https://timothycrosley.github.io/portray/) documentation generator as an example.

![Example Usage Gif](https://raw.githubusercontent.com/timothycrosley/portray/master/art/example.gif)

## Python is for the Web, too

First, some personal history. In my previous career, [I used Python for data analysis](https://podcast.freecodecamp.org/ep-59-shawn-wang-left-a-350kyear-finance-job-to-learn-to-code), thanks to the awesome time series and data munging capabilities of [pandas](https://pandas.pydata.org/) and [numpy](https://www.numpy.org/). Today, as a part time [Machine Learning student](http://www.omscs.gatech.edu/), I use frameworks like [scipy](https://www.scipy.org/) and [Tensorflow](https://www.tensorflow.org/) to declaratively create neural networks and data pipelines. So: a lot of number crunching, not very much web development.

Over time, I slowly learned that people are creating web experiences using Python too. A previous startup I worked at used the venerable and full featured [Django](https://www.djangoproject.com/) framework, while I am aware that [Flask](https://palletsprojects.com/p/flask/) and [Pyramid](https://trypyramid.com/) are lighter weight frameworks ([here's a full list I found](https://wiki.python.org/moin/WebFrameworks)).

However, these are all server-side based technologies. This comes with all the complexities of deploying and scaling servers, which are [well documented issues](https://www.netlify.com/blog/2018/10/09/netlify-raises-30m-to-replace-webservers-with-a-global-application-delivery-network/?utm_source=blog&utm_medium=devto&utm_campaign=devex) that often have little to do with the business goals you actually want to achieve, like continuously deploying your site. So I figured that Python would not be a popular JAMstack language.

## 40 Python Static Site Generators (and counting!)

It turns out I had a massive blind spot. Python has a rich set of Static Site Generators! I went to [StaticGen.com](https://www.staticgen.com/?utm_source=blog&utm_medium=devto&utm_campaign=devex) and filtered for the Python language and found 40 SSG's:

- [Acrylamid](http://posativ.org/acrylamid/): Static blog or site generator
- [Bang](https://github.com/squdle/Bang): Quirky text processor and static website generator.
- [Blended](http://jmroper.com/blended/): The Most Versatile Static HTML Site Generator
- [Blo](https://github.com/savuir/blo): Static site generator for easy personal blogging
- [Blogofile](http://blogofile.com): A static website compiler and blog engine, written and extended in Python
- [BootDown](http://project.geekweaver.com/): Extremely simple static sites with Markdown and BootStrap.
- [Cactus](https://github.com/koenbok/Cactus/): Static site generator for designers.
- [django-distill](https://github.com/mgrp/django-distill): django-distill lets you to create and publish a static website from any Django project.
- [docnado](https://heinventions.github.io/docnado-site/): A rapid documentation tool to blow you away! Batteries and style included; you just need to type.
- [drupan](https://github.com/fallenhitokiri/drupan): trying to hit the sweet spot between simplicity and being feature rich enough for every use case.
- [Elsa](https://github.com/pyvec/elsa): Helper module for hosting Frozen-Flask-based websites on GitHub Pages
- [Frozen-Flask](https://pythonhosted.org/Frozen-Flask/): Frozen-Flask freezes a Flask application into a set of static files.
- [Grow](https://grow.io/): Grow is a declarative, file-based static site generator for building maintainable, high-quality websites.
- [Halwa](https://github.com/mhlakhani/halwa): Halwa is a single file static site generator written in Python.
- [Hyde](http://hyde.github.io/): Jekyll's evil Python powered twin
- [Landspout](https://github.com/gmr/landspout): A simple static site generation tool
- [Lektor](https://www.getlektor.com/): A static content management system that can deploy to any webserver.
- [makesite.py](https://github.com/sunainapai/makesite): Simple, lightweight, and magic-free static site/blog generator for Python coders.
- [MkDocs](http://www.mkdocs.org/): Project documentation with Markdown.
- [Nikola](http://www.getnikola.com): A static website and blog generator
- [Pagegen](http://pagegen.phnd.net): Manage sites and blogs, SEO friendly.
- [Pelican](http://blog.getpelican.com/): A static site generator, imports from Wordpress, multi-lang publishing.
- [PieCrust2](http://bolt80.com/piecrust): PieCrust is a static website generator and flat-file CMS
- [Poole](https://bitbucket.org/obensonne/poole/): A simple Markdown static site generator.
- [Prosopopee](https://github.com/Psycojoker/prosopopee): A static website generator that allows you to tell a story with your pictures
- [PyKwiki](http://pykwiki.nullism.com): Markdown based authoring with static search.
- [pystatic](https://github.com/Zedelghem/pystatic): Dead simple, one-line, few options static website generator. Just write your stuff instead of learning generators.
- [QPage](http://www.qpage.ir): QPage or QuickPage is a free project for creating academic homepage without any code
- [Sphinx](http://www.sphinx-doc.org/): A tool that makes it easy to create intelligent and beautiful documentation, written by Georg Brandl.
- [staticjinja](http://staticjinja.readthedocs.org/en/latest/): Effortlessly deploy static sites with Jinja2.
- [Statify](https://github.com/NBens/Statify): Simple, lightweight, one file static site generator, Powered by Python 3 & Jninja2.
- [Statik](https://getstatik.com/): A simple, generic, static web site generator for developers.
- [Tags](http://tags.brace.io/): The simplest static site generator
- [Tarbell](http://tarbell.io): Simple static sites for storytellers.
- [Tinkerer](http://tinkerer.me): Tinkerer is a blogging engine/static website generator powered by Sphinx
- [Tiny SSG](https://github.com/Herve07h22/tinySSG): static site generator built with Python, with some interesting features for pre-processing the images.
- [Urubu](http://urubu.jandecaluwe.com): A micro CMS for static websites
- [Vite](https://github.com/icyphox/vite): A simple and minimal static site generator
- [wok](http://wok.mythmon.com/): Toss some content, templates, and media in a pan and fry it up!
- [YASBE](http://github.com/underr/yasbe): Yet Another Static Blog Engine

And just yesterday, I found a new one, [Portray](https://timothycrosley.github.io/portray/), at the [top of Hacker News](https://news.ycombinator.com/item?id=20800157)! Clearly this innovation is not over.

[Static Site Generators are resoundingly JAMstack](https://www.smashingmagazine.com/2015/11/modern-static-website-generators-next-big-thing/). That means Netlify should support Python based SSGs too. Let's see if we can!

## Deploying Portray (or any Python SSG) on Netlify

First I have to figure out how to get `portray` up and running. I have Python 3 installed, so I installed `portray` using pip3:

```bash
pip3 install portray
```

I needed a sample `portray` project to show some docs, so why not portray `portray`? I [forked the project](https://github.com/sw-yx/portray) and cloned it locally:

```bash
git clone https://github.com/YOUR_USERNAME_HERE/portray
cd portray
portray in_browser
```

This launched a local dev server in `127.0.0.1:8000` and ensured that I knew how this web development thing works 😅

Portray has a built in deploy to GitHub Pages functionality, but we'll want to configure this for deployment to Netlify for some other features:

- [Deploy Previews](https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex), the #1 killer feature for open source documentation projects or team collaboration
- [HTTPS by default](https://www.netlify.com/docs/ssl/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex)
- [Continuous Deployment](https://www.netlify.com/docs/continuous-deployment/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) (so all you need to do to update your docs is literally edit them in GitHub, which you can do on your phone)
- [Forms](https://www.netlify.com/docs/form-handling/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) for comments, file storage and other simple user input
- [Functions](https://www.netlify.com/docs/functions/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) for anything else more complex

Netlify still defaults to Python 2.7 (👿) so we'll need to fix it to 3.7 (which Portray needs) [according to the Netlify docs](https://www.netlify.com/docs/build-settings/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#python):

```python
# runtime.txt
3.7
```

We'll also want to get Netlify to install Portray itself via `requirements.txt`:

```python
# requirements.txt
portray==1.0.5
```

That sets up the environment, but the final step is to configure the build commands. There are a few equivalent ways to do this, so I'll walk through 3 of the most popular. What's common among all of them is you need to know upfront:

- the build command: `portray as_html` (what command you type into your terminal to do a production build of your site)
- the deploy directory: `site` (what folder the above build command builds to, so we only deploy this specific folder)

## Option 1: Configuring Build Commands through Netlify Web UI

With an existing Netlify account, head to `https://app.netlify.com/start` and select the appropriate repo. Then fill in the build command and deploy directory:

![image](https://user-images.githubusercontent.com/6764957/63789820-1f8e2580-c8c6-11e9-9445-b4950f710b22.png)

That's it! That sets up the site and continuous deployment for you and gives you the basis for all the other [features of Netlify](https://www.netlify.com/pricing/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#features).

## Option 2: Configuring Build Commands through the Netlify Dev CLI

This is for the people (like me!) who rather not leave their terminals. With the [Netlify CLI](https://www.netlify.com/docs/cli/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) installed and logged in, you can take any project and run a single command to set it up for a new site:

```bash
# at the project root
netlify init
```

If your project has a git remote (on GitHub, GitLab or Bitbucket), it will set up continuous deployment for you, else it will assume you want a "manual deploy" (you can fix this later with `netlify link`). The CLI will ask you for the build command and deploy directory and scaffold out the [netlify.toml config file](https://www.netlify.com/docs/netlify-toml-reference/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) for you:

```toml
# example netlify.toml
[build]
  command = "portray as_html"
  publish = "site"

## more info https://www.netlify.com/docs/netlify-toml-reference/
```

If you need to do manual deployments, you can always run `netlify deploy --prod`, but we do encourage continuous deployment from git as a best practice.

## Option 3: One Click Deploy Buttons

The `netlify.toml` file explained above is useful for more than deploying just your site. If you check it into git, then people who fork your repo also get this configuration for free. Try it! We have this set up as a nice [Deploy to Netlify](https://www.netlify.com/docs/deploy-button/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) button you can add to your README:

![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)[Deploy To Netlify](https://app.netlify.com/start/deploy?repository=https://github.com/sw-yx/portray) (I used a text link because Scotch.io is buggy)

That sets up the fork and a new site in one click!

## Python is my JAM

Hopefully this is helpful for any Python users out there looking for a great way to host their JAMstack sites (particularly docs) on Netlify.
