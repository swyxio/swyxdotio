
## Reacting Ahead of Time

What's faster than O(1)? Step changes in performance and scalability
come from paradigm changes rather than incremental optimizations. The
inexorable march forward in "table stakes" product requirements has
forced developers to explore ways to push computation from client to
server, from runtime to buildtime, from fat SPAs to code-split
frameworks. Cutting edge UX is exploring how to prefetch and cache
resources intelligently, trading off memory usage for compute time.
Lastly, DX has also been pushed forward with fascinating ideas from
hot reloading to GraphQL. Where is all this taking us?

## Learning from 100,000 React Developers

React communities exist in many spaces online, and they don't all overlap. In this talk we explore statistics and quotes from /r/reactjs, answering burning questions everybody wants to know:
What technologies are people interested in? What do beginners struggle with? What are companies hiring for?

At present growth rates, /r/reactjs will surpass 100,000 subscribers in April, and I feel React Amsterdam would be the perfect place to celebrate this benchmark and reflect on our learnings and what the broader community can take away from it.

Talk structure:

- Why do people like discussing React on Reddit?
- The recent history of React in 2018 and 2019
- Projects that React beginners can try
- What do beginners struggle with? A visualization
- Unresolved debates in React
- What are the biggest library and blogpost launches?
- What are companies hiring for?
- Dark Matter Devs and why we all need to participate more in the online discussion

## React Suspense Workers

React Suspense doesn't work without a caching layer, so every Suspense
library has built one - except in service workers! In this talk we go
through what React Suspense is, then explore a prototype of how
"Suspense Workers" could be useful in future Concurrent React apps.

## Better Docs with Docz

We all know good documentation is important for adoption and developer
experience - isn't it worth investing in tooling to make it easier?
Docz burst onto the scene this year as a fantastic new way to make
great documentation for your React libraries with MDX. Let's take it
out for a spin!

## You Gotta Love JAMStack

The JAMStack stands for JavaScript, APIs, and Markup, and at first glance it seems a truism - of course everyone uses that, right? What kind of stack is that? At its core, however, it describes a new architecture for web apps and sites that is at the confluence of multiple trends in serverless, JavaScript frameworks, static site generators, and Git-centric workflows. At the center of it all: The All-Powerful Frontend Developer!

JAMStack, Serverless, Devops, Frontend

## Reusable Time Travel with React Hooks and Immer

Learn how and why to make a `useTimeTravel` React hook that we can use to make Tolerant User Interfaces - and a discussion about how custom hooks open the doors to reusable behavior that make great UX so much easier to write!

## How To Do Everything with Half A Stack

The JAMStack stands for JavaScript, APIs, and Markup, and at first glance it seems a truism - of course everyone uses that, right? What kind of stack is that? At its core, however, it describes a new architecture for web apps and sites that is at the confluence of multiple trends in serverless, JavaScript frameworks, static site generators, and Git-centric workflows. The Half Stack may give the impression of incompleteness, but in truth, it is becoming ever more important as backend services get commoditized and product development and differentiation moves ever forward toward who matters: the Users.

JAMStack, Serverless, Devops, Frontend

pitch: I work at Netlify and have seen many stories about how Frontend developers have been able to build on the JAMstack and I feel like this is a really good story for the "HalfStack" audience. This isn't a sales pitch, as many companies are involved in the JAMstack. This is a fellow halfstack developer telling everyone about all the cool options they now have and giving ideas they can take home with them for the next projects.

## The Dawn of Hybrid Site Generators

There is a sea change afoot in the worlds of frontend frameworks and
static site generators: the two have gotten married! React has Gatsby
and React-Static, Vue has VuePress, even Svelte has Sapper. What’s
going on? In this talk we explore how the UX bar has been raised for
making fast, full-featured sites on the JAMStack, and how new tools
are meeting that bar!

## JS at the Edge of the World

Want to live life on the Edge? Lambda functions open a world of
possibilities for running on-demand, server-side code without having
to run a dedicated server. It's been 4 years - What have people been
using them for? In this talk we explore how people are pushing the
frontiers of serverless Node.js to do everything from making slackbots
to taking money for your next great side project!

## React Suspense For The Rest of Us

Even if you don't work with React, you're likely to have come across a
React dev super excited about the new Suspense feature in React. What
is it? Why are people so hyped? Should I care? This talk is an
introduction for anyone who feels out of the loop - walking through
the history of the idea and the general UI problems it solves. We will approach this in a framework-agnostic way, so that you can see if the Suspense design pattern might make sense in
your next project!

## Atomic React Deploys

React's logo is an atom. The component philosophy encourages Atomic
design. What if our app deployments were atomic too? A backend that is
never out of sync with your frontend - pipe dream or reality?

## Using the React DevTools Profiler at Netlify

How can the new React DevTools Profiler help you identify and fix
performance issues in your app? In this lightning talk we go through a
real life example diving into the Netlify production app to solve
longstanding performance issues, and end with a quick checklist of
things you can try on your app!
