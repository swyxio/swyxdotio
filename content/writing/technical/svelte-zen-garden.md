---
title: Svelte Zen Garden
subtitle: with Monaco Editor and Netlify Dev
slug: svelte-zen-garden
categories: ['Tech', 'Svelte']
description: reigniting the Zen Garden era with modern technology
date: 2020-01-24
---

The [CSS Zen Garden](http://www.csszengarden.com/) era was hugely inspirational to many. I figured I could try making my own with modern technologies.

## Demo Up Front

- Try Live Demo at: https://svelte-zengarden.netlify.com/
- View Source at: https://github.com/sw-yx/svelte-zen-garden

You can edit your CSS and it updates live.

![sveltezen](https://user-images.githubusercontent.com/6764957/73112468-73845100-3edc-11ea-978a-74bb9537833a.gif)

you can also paste in a link to github gist in the editor. if the github gist has a file called `zengarden.css` it will pull that css and apply it. Once you're happy with what you have, you can send it as a url by appending a `path` search param, e.g.

- https://svelte-zengarden.netlify.com/?path=https://gist.github.com/sw-yx/0e1d14276ef9d2608453fed3c7dfa4ec
- https://svelte-zengarden.netlify.com/?path=https://gist.github.com/sw-yx/67a8c6f39aae5e206b43eb662edb75b9

## Table of Contents

## Design Goals

The original project was served on a PHP server, and people who wanted to take part had to host it themselves or PR into the project.

-  I wanted to update it to [JAMstack](https://jamstack.org/?utm_source=zengarden-swyx&utm_medium=swyx&utm_campaign=devex) 
- I wanted to use [GitHub Gists](http://gist.github.com/) which are a wonderfully low friction way of sharing code
- I also wanted to be able to edit live with modern editor experience (where, for example, i can save to localStorage or expand gist URLs) instead of living in browser devtools. Basically I want Monaco.

## Svelte CSS in JS

To dynamically render the CSS, i'd have to come up with a strategy to "CSS in JS" in Svelte. At first I tried using [the svelte:head tag](https://svelte.dev/docs#svelte_head):

```html
<script>
  let myCSS = 'body { color: red }'
</script>
<svelte:head>
	<style>
    {myCSS}
	</style>
</svelte:head>
```

But Svelte doesn't work like that - all css is statically compiled, and changing `myCSS` doesn't update the head component.

So what I ended up with was something like this:


```html
<script>
  import { onMount, onDestroy } from 'svelte'
  import { userCSS } from './store'
  onMount(renderCSS)
  onDestroy(() => {
    var ss = document.getElementById("unique-stylesheet-id")
    ss.innerHTML = '' // not actually sure if i need this
  })
  let _userCSS // $ store syntax buggy
  userCSS.subscribe(v => {
    _userCSS = v
  })
  function renderCSS() {
    var ss = document.getElementById("unique-stylesheet-id");
    if (!ss) return // not rendered yet
    ss.innerHTML = _userCSS
  }
  $: {
    console.log({ _userCSS })
    renderCSS()
  }
</script>
<svelte:head>
  <style id="unique-stylesheet-id"> </style>
</svelte:head>
```

This means that whatever CSS string I put in `userCSS`, will be applied to my Zen Garden HTML. Great! Now the hard part.

## Monaco Editor

[Monaco](https://microsoft.github.io/monaco-editor/) is what VScode, and CodeSandBox, use for code editing. It's obviously one of the best code editors in the world. It's always been on my want-to-try-list and this is the perfect proejct. 

In my eyes, the docs for Monaco aren't very friendly. It took me a bit of digging around to find anything and it doesnt work with rollup and when I initially tried to set it up with webpack, the web workers would fail randomly. They seem stable now but it seems a way heavier build than optimal. 

Still, it works! 🎉 So here is my "baby's first Monaco Editor" tutorial.

### Webpack Setup and rendering the Editor

There is a Parcel setup for Monaco too, but I only tried Webpack with ESM.

Resources:

- https://github.com/microsoft/monaco-editor-samples/tree/master/browser-esm-webpack
- https://github.com/microsoft/monaco-editor-samples/tree/master/browser-esm-webpack-small
- https://github.com/microsoft/monaco-editor/blob/master/docs/integrate-esm.md

I went with option 1 in the Readme, configuring `webpack.config.js` as instructed.

The basic Svelte integration with Monaco looks something like this (improvements welcome!)

```html
<script>
  import { onMount, onDestroy } from 'svelte'
  import * as monaco from 'monaco-editor';
  let editor
  onMount(mountEditor)
  function mountEditor() {
      editor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: [
          'function x() {',
          '\tconsole.log("Hello world!");',
          '}'
        ].join('\n'),
        language: 'css',
      });
  }
  onDestroy(() => {
    if (editor) {
      editor.dispose();
      const model = editor.getModel();
      if (model) model.dispose();
    }
  })
</script>

<style>
  #monaco-container {
    height: 40vh;
    width: 40vw;
    min-width: 600px;
    position: fixed;
    z-index: 999;
    bottom: 0;
    left: 0;
  }
</style>
<div id="monaco-container"></div>
```

### Monaco-Svelte Data Flow

We need to tell Monaco to update Svelte, and more trickily, tell Svelte to update Monaco. 

```html
<script>
  import { onMount, onDestroy } from 'svelte'
  import { userCSS } from './store'
  import * as monaco from 'monaco-editor';
  import { pannable } from './pannable.js';
  let editor, modelChangeSub
  let x = 0
  let y = 0
  onMount(mountEditor)
  function mountEditor() {
    setTimeout(() => {
      editor = monaco.editor.create(document.getElementById('monaco-container'), {
        // redacted
      });
      modelChangeSub = editor.getModel().onDidChangeContent(v => {
        userCSS.set(editor.getModel().getValue()) // if Monaco is updated, update Svelte store
      })
    }, 200)
  }
  userCSS.subscribe(v => {
    if (!editor || !editor.getModel()) return
    const curVal = editor.getModel().getValue()
    if (curVal !== v) {
      editor.setValue(v) // if svelte store is updated, update Monaco accordingly
    }
  })
  onDestroy(() => {
    if (editor) {
      editor.dispose();
      const model = editor.getModel();
      if (model) model.dispose();
    }
    if (modelChangeSub) modelChangeSub.dispose() // clean up subscription
  })
</script>
<!-- etc -->
```

### Draggable Editor using a Svelte Action

This was so easy to implement thanks to [Svelte's great docs on actions!](https://svelte.dev/examples#actions)

Actions are like hooks that can help abstract logic, like dispatching [DOM CustomEvents](https://developer.mozilla.org/en/docs/Web/API/CustomEvent) so you can basically invent your own special events as a user of the action. I copied `pannable.js` completely and implemented it to get a draggable editor:

```html
<script>
  // etc
  import { pannable } from './pannable.js';
  let x = 0
  let y = 0
  function handlePanMove(event) {
    x = x + event.detail.dx
    y = y + event.detail.dy
  }
</script>
<div use:pannable
  on:panmove={handlePanMove}
  style="transform:
  translate({x}px,{y}px)"
  id="monaco-container"
>
</div>
```

And there you have a draggable element!!! amazing!!!

### On/Off Toggle

I also added a toggle, becaue I don't want the editor on screen at all times.

```html
<script>
  // etc
  let showEditor = true
  function toggleEditor() {
    showEditor = !showEditor
    if (showEditor) mountEditor()
  }
</script>
<style>
  #editorWithButton {
    height: 40vh;
    width: 40vw;
    min-width: 600px;
    position: fixed;
    z-index: 999;
    bottom: 0;
    left: 0;
  }
  #monaco-container {
    height: 100%;
    width: 100%;
  }
  #handButton {
    position: fixed;
    width: 60px;
    height: 60px;
    z-index: 9999;
    top: -30px;
    right: -30px;
    background-color: #0C9;
    border-radius: 50px;
    text-align: center;
    box-shadow: 2px 2px 3px #999;
    font-size: 3rem;
  }
</style>
<div use:pannable
  on:panmove={handlePanMove}
  style="transform:
  translate({x}px,{y}px)"
  id="editorWithButton"
>
  <button id="handButton" on:click={toggleEditor}>✍️</button>
  {#if showEditor}
  <div id="monaco-container"></div>
  {/if}
</div>
```

## Gist API and Netlify Functions

The backend section of this is in the store. I've written about [my love for Svelte Stores](https://www.swyx.io/writing/svelte-auth) before. 

Frankly I'm not super proud of the code I wrote here but basically I wrote a writable store that persists to localStorage. You can also intercept value updates but be careful not to make an infinite loop:


```js
// store.js
import { writable } from 'svelte/store';

let _userCSS = localStorage.getItem('userCSS');
_userCSS = _userCSS ? JSON.parse(_userCSS) : defaultUserCSS();
export const userCSS = writable(_userCSS);

// special hacks to respond
userCSS.subscribe((value) => {
  // secret hack - to restore default css - type 'default'
  if (value === 'default') userCSS.set(defaultUserCSS());
  if (value) localStorage.setItem('userCSS', JSON.stringify(value));
});

// defaultUserCSS is a getter function that gets a css string
```

So far so good. The more interesting feature I want is to be able to paste in a path to a gist, and have it resolve to CSS.

The code below works in the browser console, but if you try to do this from the clientside, you get CORS errors:


```js
fetch('https://api.github.com/gists/0e1d14276ef9d2608453fed3c7dfa4ec')
// CORS Error
  .then(results => {
    return results.json();
  })
  .then(data => {
    console.log(data.files);
  });
```

Fortunately I already have advice on [Solving CORS once and for all](https://www.swyx.io/writing/netlify-dev-cors/)!

### Getting around CORS with Netlify Functions

The rough idea is that you never get CORS if you ping an api on your own domain, and once you're in Node, you're free to ping any other API domain. So you should set up a little proxy serverless function to do this.

This is the same tech underlying the fun little http://is-this.netlify.com/ utility I wrote for Netlifiers :)

```js
const fetch = require('node-fetch');
exports.handler = async function(event, context) {
  let path = event.queryStringParameters.path || null;
  const segments = path.split('/');
  // loosely rewrite the gist URL to the API form
  // this means people who self host their own css can do so if they respond with the right structure
  if (segments[2] === 'gist.github.com') {
    path = `https://api.github.com/gists/${segments[4]}`;
  }
  try {
    const server = await fetch(path).then(async (res) => {
      const data = await res.json();
      return data;
    });
    return {
      statusCode: 200,
      body: JSON.stringify(server)
    };
  } catch (err) {
    console.log(err); // output to netlify function log
    return {
      statusCode: 500,
      body: JSON.stringify({ msg: err.message }) // Could be a custom message
    };
  }
};
```

However, this Netlify Function would only work once you deploy to Netlify.

You can use [Netlify Dev](https://github.com/netlify/cli/blob/master/docs/netlify-dev.md) to run local emulation of Netlify to develop locally:

```toml
# netlify .toml
[build]
  functions="functions"
  command="yarn build"

[dev]
  command = "yarn start" # Command to start your dev server
  targetPort=8080     # svelte webpack template's port
  publish = "public"
```

Again, you can see all this in action here https://github.com/sw-yx/svelte-zen-garden.


## Future?

We could add a "save to Gist" feature.

We could add ability to pull image, font, and other assets from Gist.

We could add some sort of leaderboard or dynamic link list of other people who have submitted their zen gardens

[If you want to work on this lmk!](https://twitter.com/swyx)