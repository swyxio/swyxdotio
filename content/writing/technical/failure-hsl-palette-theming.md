---
title: Failing to use HSL to do Palette Theming
slug: failure-hsl-palette-theming
categories: ['CSS']
date: 2020-01-28
description: Learning from Slack and Refactoring UI to create color palettes, then using HSL colors to do customizable theming with CSS variables
---

This isn't a typical blogpost, because it reflects a failure to ship a feature I wanted, but I am noting down what I learned through this. I think I will come back and pick it back up again.

> [The top feedback I got from this post](https://twitter.com/swyx/status/1222307420396875776) is that instead of HSL, I should try the [HSLuv](https://hsluv.org) color space. I will try that in future.

## Motivation - add Customizable Palette Theming

I previously mainly lifted my old blog theme from [Max Boeck](https://github.com/maxboeck/mxb/blob/981be67c2167928782fdf979cec43f86db02f539/src/assets/styles/base/_properties.scss): 

```css
html {
  --bg-color: #1d1f21;
  --bg-color-semitransparent: rgba(33, 33, 33, 0.75);
  --bg-color-secondary: #252526;
  --text-color: rgb(220, 220, 220);
  --text-color-secondary: #818a91;
  --link-color: #2cb67d;
  --border-color: #2d2d2d;
  --brand-color-primary: #ff335f;
  --brand-color-primary-offset: #ff1447;
  --brand-color-secondary: #43a9a3;
  --hover-color-primary: #6d1f21;
  --hover-color-secondary: #1d1f61;
}
```

However I realized I wasn't using this color system very well (it's messy and hacky) and also wanted it to be themable. So I started by adding a little theme editor that let you set the css variables. However this editor wasn't very consciously designed, and also didn't help generate the full range of colors I would need (I didn't want to add a picker for every little thing). 

So to do this right, I needed to start from a small color system, and then darken/lighten accordingly.  This is most typically done in SASS with its `darken()` function, but I want to do this dynamically, so I don't have that option. 

To be clear, here were my requirements:

- user should be able to pick a preset theme for this site (doable statically)
- user should be able to pick (and eventually persist) colors to make a custom theme for this site (must be dynamic)

I was about to do this in JavaScript, when [my colleague Marcus](https://twitter.com/mraerino?lang=en) suggested using using HSL colors with CSS variables! so that's what this experiment is going to do.

## Studying Slack 

Slack is a great example of a successful custom palette theming app at scale. So to start with I studied what they offer.

Colors go from: `Column BG, Menu BG Hover, ActiveItem, ActiveItemText, Hover Item, Text Color, Active Presence, MentionBadge`

- Light
  - Aubergine: `#3F0E40,#350d36,#1164A3,#FFFFFF,#350D36,#FFFFFF,#2BAC76,#CD2553`
  - Aubergine Classic: `#4D394B,#3E313C,#4C9689,#FFFFFF,#3E313C,#FFFFFF,#38978D,#EB4D5C`
  - Hoth: `#F8F8FA,#F8F8FA,#2D9EE0,#FFFFFF,#FFFFFF,#383F45,#60D156,#DC5960`
  - Monument: `#0D7E83,#076570,#F79F66,#FFFFFF,#D37C71,#FFFFFF,#F79F66,#F15340`
  - Choco Mint: `#544538,#42362B,#5DB09D,#FFFFFF,#4A3C30,#FFFFFF,#FFFFFF,#5DB09D`
  - Ochin: `#303E4D,#2C3849,#6698C8,#FFFFFF,#4A5664,#FFFFFF,#94E864,#78AF8F`
  - Work Hard: `#4D5250,#444A47,#D39B46,#FFFFFF,#434745,#FFFFFF,#99D04A,#DB6668`
  - Nocturne: `#1A1D21,#000000,#0576B9,#FFFFFF,#000000,#FFFFFF,#39E500,#CC4400`
  - Tritanopia: `#4F2F4C,#452842,#8C5888,#FFFFFF,#1C0B1A,#FFFFFF,#00FFB7,#DE4C0D`
  - Protanopia: `#4F2F4C,#452842,#8C5888,#FFFFFF,#1C0B1A,#FFFFFF,#D0FF00,#889100`
- Dark
  - Aubergine: `#19171D,#121016,#1164A3,#FFFFFF,#27242C,#D1D2D3,#2BAC76,#CD2553`
  - Aubergine Classic: `#19171D,#121016,#4C9689,#FFFFFF,#27242C,#D1D2D3,#38978D,#EB4D5C`
  - Dagobah: `#333333,#3F3F3F,#2D9EE0,#FFFFFF,#3F3F3F,#F8F8FA,#60D156,#DC5960`
  - Monument: `#173438,#152A2D,#EBA270,#FFFFFF,#C78074,#FFFFFF,#EBA270,#F15340`
  - Choco Mint: `#212121,#353330,#5DB09D,#FFFFFF,#353330,#FFFFFF,#FFFFFF,#5DB09D`
  - Ochin: `#1D2229,#0B161E,#537AA6,#FFFFFF,#313843,#FFFFFF,#94E864,#78AF8F`
  - Work Hard: `#222629,#121518,#D39B46,#FFFFFF,#2C3136,#FFFFFF,#99D04A,#DB6668`
  - Nocturne: `#1A1D21,#000000,#0576B9,#FFFFFF,#000000,#FFFFFF,#39E500,#CC4400`
  - Tritanopia: `#19171D,#121016,#5B415B,#FFFFFF,#27242C,#D1D2D3,#74FABC,#CE5628`
  - Protanopia: `#19171D,#121016,#5B415B,#FFFFFF,#27242C,#D1D2D3,#DAFC51,#8A902C`

So the main way they seem to think about this is that the customizable colors are mostly menu related:

- 3 Darker colors: backgrounds (1 bg, 1 hovered bg - not very impt, 1 hovered item)
- 5 Lighter colors: 
  - text color for items
  - 2 highlights (presence, and mention)
  - 2 active item (active item bg, and active item bg text)

They also shared [great notes on implementing Dark mode](https://slack.engineering/building-dark-mode-on-desktop-811508b5d15f). The main thing to note is that you don't simply flip every color. Slack has preset values for primary and inverted foreground/background based on mode.

Regardless of mode, Slack always uses blue for links (sapphire blue in light mode, sky blue in dark mode, with hover versions), highlight accents, secondary highlights for search results and keywords. This is not customizable.

## Refactoring UI

The next source I turned to was Refactoring UI: https://refactoringui.com/previews/building-your-color-palette/

Thinking through this, a minimal color palette for an app includes:

- a primary color
- a grey/neutral color
- a link color (maybe this is a highlight color)
- a text color (maybe this is a neutral color)
- accent colors:
  - highlight
  - danger
  - warning
  - success

So that's 8 basic colors for an app. You might add a secondary color and other accents.

## Takeaways

For a site, we can probably do away with some accent colors and get it down to 4 colors:

- a highlight color
- a background color
- a neutral text color
- a link color

## HSL Color Palette

We can place hues in CSS Variables:

```css
html {
  --highlight-hue: 100;
  --background-hue: 249;
  --text-hue: 0;
  --link-hue: 148;
}
```

And then generate the range of colors:

```css
html {
  --highlight-1: hsl(var(--highlight-hue), 100%, 20%);
  --highlight-3: hsl(var(--highlight-hue), 100%, 40%);
  --highlight-5: hsl(var(--highlight-hue), 100%, 60%);
  --highlight-9: hsl(var(--highlight-hue), 100%, 80%);
  --highlight-color: var(--highlight-5);
  --background-1: hsl(var(--background-hue), 100%, 20%);
  --background-3: hsl(var(--background-hue), 100%, 40%);
  --background-5: hsl(var(--background-hue), 100%, 60%);
  --background-9: hsl(var(--background-hue), 100%, 80%);
  --background-color: var(--background-5);
  --text-1: hsl(var(--text-hue), 100%, 20%);
  --text-3: hsl(var(--text-hue), 100%, 40%);
  --text-5: hsl(var(--text-hue), 100%, 60%);
  --text-9: hsl(var(--text-hue), 100%, 80%);
  --text-color: var(--text-5);
  --link-1: hsl(var(--link-hue), 100%, 20%);
  --link-3: hsl(var(--link-hue), 100%, 40%);
  --link-5: hsl(var(--link-hue), 100%, 60%);
  --link-9: hsl(var(--link-hue), 100%, 80%);
  --link-color: var(--link-5);
}
```

and now we can reference these all over the site. Users can set the top level css variables to their heart's content, and I can provide some preset themes using the same system.

## Failure to Forsee - HSL isn't the right tool

I got this far and wrote a bunch of code without realizing that I can't just theme things with hue. You can try the color switcher now (in the menu) - you can tweak hues, sure, but you also need to adjust saturation and lightness dynamically and before long you're looking for a HSL color picker and wondering why exactly you rewrote things from RGB to HSL.

I'm not really sure how we should play off saturation and lightness yet, but I'm vaguely aware that there is some color balance thing that needs to be done. I know that [Erik Kennedy has strong opinions here](https://learnui.design/blog/the-hsb-color-system-practicioners-primer.html) but I dont have time to adapt it yet.

## My plan going forward

I am ready to call the HSL palette theming attempt a failure. I wanted to achieve a small set of user specified colors that I could then use to theme the rest of the site. I made two mistakes:

- Not realizing that tweaking colors to theme a site also means adjusting S and L
- Not realizing that I don't really use all the generated color gradients I would get from using HSL

I feel pretty dumb about this but that's what happened today.


## Resources Referenced

- CSS Tricks: HSL is great for programmatic color control https://css-tricks.com/hsl-hsla-is-great-for-programmatic-color-control/
- ana tudor codepen: css variables calc inside hsl to generate palettes codepen tuldl - support inside ie/firefox is no bueno
- https://darkmodedesign.xyz/
- https://refactoringui.com/previews/building-your-color-palette/
- https://slack.engineering/building-dark-mode-on-desktop-811508b5d15f
- http://hslpicker.com/