---
title: Avoiding Flash of Unthemed Code
description: If your site has a dark mode or custom theme, you might have a flash of the default theme before JavaScript loads. Here is the solution.
slug: avoid-fotc
categories: ['Tech', 'Svelte']
date: 2020-02-17
---

If your site has a dark mode or custom theme, you might have a flash of the default theme before JavaScript loads. This site has both a light mode and a custom-settable theme, serialized into localStorage. 

Previously it would load the default (dark mode) and then as the JS ran it would transition smoothly into your custom set theme. Obviously not great if you keep landing on my site and it keeps flashing you with the colors you don't want.

I was [browsing /r/reactjs and saw this post on a dark mode toggle](https://www.reddit.com/r/reactjs/comments/f5i7zc/i_has_fun_making_this_little_dark_mode_toggle/), which led me to [Donavon's useDarkMode](https://github.com/donavon/use-dark-mode) hook, which then led me to [noflash.js.txt](https://github.com/donavon/use-dark-mode/blob/develop/noflash.js.txt). Ah! Here was the solution!

Basically, inline the localStorage reading into the html you generate. I tried putting this in `<svelte:head>` in my Sapper `_layout.svelte` file and it worked! (It's still WIP, because I want to add this to an auth system, but try it out!)


Here's the code snippet for implementing custom theming in your Svelte/Sapper app!

```html
<script>
  import { onMount } from 'svelte'
  import { themeStore } from '../theme.js' // a writable store

  onMount(renderCSS)
  themeStore.subscribe(renderCSS) // subscribe to theme updates elsewhere in the UI
  function renderCSS() {
    if (typeof document === 'undefined') return // SSR
    const stylesheet = document.getElementById("unique-stylesheet-id");
    if (!stylesheet) return // not rendered yet
    let string = ``
    if ($themeStore.bgColor) string += `--bg-color: ${$themeStore.bgColor};`
    if ($themeStore.textColor) string += `--text-color: ${$themeStore.textColor};`
    if ($themeStore.linkColor) string += `--link-color: ${$themeStore.linkColor};`
    if ($themeStore.lineLength) string += `--line-length: ${$themeStore.lineLength};`
    stylesheet.innerHTML = `html { ${string} }`
  }
</script>

<svelte:head>
  <style id="unique-stylesheet-id"> </style>
  <script>
    // read the stored theme if it exists, 
    // and add it to stylesheet, before the user sees it
    (function() {
      let temp = localStorage.getItem('swyx_io_themeStore')
      if (temp) {
        temp = JSON.parse(temp) // store object
        if (typeof document === 'undefined') return // SSR
        const stylesheet = document.getElementById("unique-stylesheet-id");
        let string = ``
        if (temp.bgColor) string += `--bg-color: ${temp.bgColor};`
        if (temp.textColor) string += `--text-color: ${temp.textColor};`
        if (temp.linkColor) string += `--link-color: ${temp.linkColor};`
        if (temp.lineLength) string += `--line-length: ${temp.lineLength};`
        stylesheet.innerHTML = `html { ${string} }`
      }
    })()
  </script>
</svelte:head>
```