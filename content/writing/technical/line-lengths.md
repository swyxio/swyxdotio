---
title: Line Lengths
slug: line-lengths
subtitle: and CSS Length Units
categories: ['CSS', 'Design']
date: 2020-01-30
description: Reflecting on what I have learned about CSS Units and Line Lengths
---

Yesterday I [made an observation about blog line lengths](https://twitter.com/swyx/status/1222768044767727619) that got a *really* unexpected amount of traction, and I thought I would write down what I know and learned.

## What's the big deal about line length?

The [Refactoring UI](https://refactoringui.com/) guys note:

> ## Keep your line length in check
> When styling paragraphs, it’s easy to make the mistake of fitting the text to
> your layout instead of trying to create the best reading experience.
>
> Usually this means lines that are too long, making text harder to read.
>
> For the best reading experience, make your paragraphs wide enough to fit
> between 45 and 75 characters per line. The easiest way to do this on the
> web is using em units, which are relative to the current font size. A width of
> 20-35em will get you in the right ballpark.

For the totally uninitiated: by default, content on a page goes from the extreme left of the screen to the extreme right of the screen. This just "looks ugly", which is an unscientific term at best, but one plausible justification you can hang your hat on is that eyes get tired scanning left/right and prefer going up/down with scrolling.

The usual advice, from multiple sources, is to **aim for about 45-80 characters per line**, which works out to be 9-14 words per line. Of course this applies for blogs more than other types of sites and apps, but it is still applicable for other forms of site layout like landing page copy.

If you're design blind like me, you won't immediately believe how important this is. I went for 80 characters at first, but discovered that It feels good going as far down as 50.

## CSS Units

So given the above advice, it seems an obvious immediate win to apply `max-width: 69ch` to your blog content blocks. However I found that most people don't do this! Usually people seem to prefer specifying absolute pixels, or (rarer) using `%`'s of parent width, or ([if you're Basecamp](https://twitter.com/swyx/status/1222980190260744193?s=20)) spanning the middle sections of a grid system.

I found that a big reason this happens is many people don't seem to know the `ch` unit even exists! There are actually like [a dozen length units in CSS](https://css-tricks.com/the-lengths-of-css/), most of them not as useful.

Some people argued for `em`s over `ch`, on the basis that `ch` [can be unpredictable](https://twitter.com/nystudio107/status/1222769390929707009) as it based on the width of the `0` glyph. The counterargument is `ch` is apparently closer to the average letter length, and indeed you can easily verify this is so. `70ch` is something like `35-40em`'s. If you're really aiming for 70 chars per line anyway, which is more intuitive to use? However, there are some that feel [intuition runs the other way](https://twitter.com/transitive_bs/status/1222773214193094661?s=20) in the bigger context of overall CSS architecture.

There are other approaches. Andy Bell and others use [the "root `rem` plus `vw` viewport unit" trick](https://twitter.com/souporserious/status/1222904538333532161). Basecamp [ONLY uses CSS grid](https://twitter.com/swyx/status/1222980190260744193?s=20).

I don't ultimately think it really matters what units you use - in the end the browser is going to convert it to pixels for you anyway and you just have to come up with something your readers can live with. If the rest of the elements in your design depend on your content width being [pixel perfect](https://twitter.com/_brotzky/status/1222934466638692352) (e.g. [wanting header and footer to line up](https://twitter.com/JoshWComeau/status/1222851328197758982) exactly with text) then you might have to use `px`, but of course you could equally do the same effect with any other unit. 


I do think it's easier to use `px` if you design in a design tool or [on a grid](https://twitter.com/wolfr_2/status/1222773273462824960), and `ch` if you "design in the browser" like I do. Designs with [multiple fonts](https://twitter.com/kossnocorp/status/1222774667448070146) may also be inconsistent on what the `ch` means.

## Managing Breakouts

Often in a blog you will want a consistent line length, but have some elements like images and code blocks "break out" of your content line to break the monotony and add emphasis. [Dave Geddes](https://twitter.com/geddski/status/1222772485570957314) has [a wonderful approach mixing CSS Grid and minmaxing the `ch` unit](https://gedd.ski/post/article-grid-layout/).

## Magic Numbers

I know this is lazy, but I like to get real life magic numbers to try on my own things :)

- Leigh likes `33em`: https://twitter.com/ExcitedLeigh/status/1223007439760412672?s=20
- Patrick likes `44em`: https://twitter.com/concreteniche/status/1222774565643751425?s=20
- This person likes `38rem`: https://jrl.ninja/etc/1/
- [Tachyons](https://github.com/tachyons-css/tachyons/blob/5cd259d0b2f75a472f6febdcc0e5b558a22a01af/src/_typography.css#L16-L18) uses a spartan `30rem` as base, with `34rem` and `20rem` as wide and narrow variants.
- [Tailwind](https://tailwindcss.com/docs/max-width) has a wide range from `20rem` to `72rem`. `28rem` is medium.
- [Bootstrap's Containers](https://getbootstrap.com/docs/4.0/layout/grid/) use media queries and exact widths:
  - Extra small devices (<768px): width: auto (or no width)
  - Small Devices (≥576px): width: `540px`
  - Medium Devices (≥768px): width: `720px`
  - Larger Devices (≥992px): width: `960px`
  - XLarge Devices (≥1200px): width: `1140px`
- what else?

[Preet](https://twitter.com/preetster/status/1263361587584196609?s=20) also pointed me to this study on [The Effects of Line Length on Reading Online News](https://www.researchgate.net/publication/253615156_The_Effects_of_Line_Length_on_Reading_Online_News).

## Try it yourself!

You can now edit line lengths of this blog. 

Its line length starts off at a nice `69ch` but if you hit "change theme" and opt to customize, you can edit it to whatever line length you like. Of course, you could always do this in browser devtools, but now you can do it on mobile too (where, admittedly, max width doesnt actually matter 😅).

This is still a WIP experimental feature (I still have to add persistence and maybe auth) but it has been a fun toy to play around with to make a site your own.