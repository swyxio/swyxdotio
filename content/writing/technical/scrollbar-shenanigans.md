---
title: Scrollbar Shenanigans
slug: scrollbar-shenanigans
categories: ['CSS']
date: 2019-09-14
published: false
---

https://css-tricks.com/the-current-state-of-styling-scrollbars/

- you can add transparency
- you can add margins
- you can add fancy gradient patterns
- it doesnt work on mobile
- media queries work tho

this is important somehow

```css
  body::-webkit-scrollbar {
      width: 2rem;
  }
```

also applies horizontally

you can also target individual elements

```css

#design-selection::-webkit-scrollbar {
  width: 2rem;
}
#design-selection::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.9);
  background-color: #444444;
}
#design-selection::-webkit-scrollbar-thumb {
  background-color: red;
}
```