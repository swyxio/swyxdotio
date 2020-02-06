---
title: Scrollbar Shenanigans
slug: scrollbar-shenanigans
categories: ['CSS']
date: 2020-02-06
description: Styling scrollbars for my space on the Internet
---

If you visit this site on a desktop Webkit browser (Chrome, Safari, Opera, new Edge) you will see a new fancy scrollbar:

![zengarden](https://user-images.githubusercontent.com/6764957/73976710-cae4e100-4920-11ea-976e-cc5e1d3373bd.gif)

This is a result of me constantly admiring the chunky fat scrollbar on CSS Tricks. They have a really good guide on it: https://css-tricks.com/the-current-state-of-styling-scrollbars/. For now this is a webkit prefixed feature, but `scrollbar-gutter` is [on its way to being a standardized CSS property](https://css-tricks.com/almanac/properties/s/scrollbar-gutter/) in [Overflow Module Level 4](https://drafts.csswg.org/css-overflow-4/#scollbar-gutter-property).

I like that it is kind of a frivolous thing that has a natural fallback (on non Webkit and on mobile) so you don't have to worry about getting fancy.

On a total whim I decided to try it out on [Svelte Zen Garden](https://www.swyx.io/writing/svelte-zen-garden). Here is what I discovered in my messing around.

## Minimal styled scrollbar example

Go put this on your site:

```css
body::-webkit-scrollbar {
  width: 2rem;
}
body::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.9);
  background-color: #444444;
}
body::-webkit-scrollbar-thumb {
  background-color: red;
}
```

Or even better, try it out on [Svelte Zen Garden](https://svelte-zengarden.netlify.com/).

## The PseudoElements

You have to specify `::-webkit-scrollbar` for any styling to work. (Try removing it, you'll see) It doesn't really matter what you specify, so you can specify a nonsensical property, but you need something:

```css
body::-webkit-scrollbar {
  color: red;
}
```

But most often, you will want to specify the width:

```css
body::-webkit-scrollbar {
  width: 10px;
}
```

You can specify any [CSS length unit](https://www.swyx.io/writing/line-lengths) - I found `vw` a nice one as it scales down as you resize the window smaller and never gets too small.

Once you've specified `::-webkit-scrollbar`, you can then style `::-webkit-scrollbar-track` (the bigger gutter of the scrollbar) and `::-webkit-scrollbar-thumb` (the smaller thing that actually moves as you scroll).

Those 3 are good enough to use, but [there is a full list of other elements and selectors](https://css-tricks.com/custom-scrollbars-in-webkit/):

```css
::-webkit-scrollbar              { /* 1 */ }
::-webkit-scrollbar-button       { /* 2 */ }
::-webkit-scrollbar-track        { /* 3 */ }
::-webkit-scrollbar-track-piece  { /* 4 */ }
::-webkit-scrollbar-thumb        { /* 5 */ }
::-webkit-scrollbar-corner       { /* 6 */ }
::-webkit-resizer                { /* 7 */ }

/* pseudo-class selectors */
:horizontal
:vertical
:decrement
:increment
:start
:end 
:double-button
:single-button
:no-button
:

```

You can style them *almost* however you like!

## Things you can do

You can add fancy gradient patterns! Pick gradients from [Lea Verou](https://leaverou.github.io/css3patterns/).

```css
/* other selectors omitted */
body::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: #D62929;
    background-image: -webkit-linear-gradient(45deg,
                                              rgba(255, 255, 255, .2) 25%,
                                              transparent 25%,
                                              transparent 50%,
                                              rgba(255, 255, 255, .2) 50%,
                                              rgba(255, 255, 255, .2) 75%,
                                              transparent 75%,
                                              transparent)
}
```

[You can add margins!](https://twitter.com/swyx/status/1225272701494972416)

```css
/* other selectors omitted */
body::-webkit-scrollbar-track {
    margin: 20vh;
}
```

[You can add transparency!](https://twitter.com/swyx/status/1225276009206992896)

Media queries work!

You can target scrollbars on any `overflow: scroll` element, not just `body`!

Note: Unspecified, styling applies to horizontal as well as vertical scrollbars, which you can customize with `:horizontal` and `:vertical`.

## Not Everything Works

It doesnt work on mobile!

Setting `cursor: pointer` doesn't work, but it'd be fun to change the cursor on scrollbar hover.

## Don't Do This

You can [put your scrollbar on the left!](https://twitter.com/chordbug/status/1101645780962734081)

## Crazy Scrollbar Examples On The Web

Of course most people should be more subtle with their scrollbars.

But I like a little personality.

- [CSS Tricks](https://css-tricks.com/)
- Where else?