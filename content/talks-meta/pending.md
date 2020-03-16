## Svelte: the Space Elevator Framework

Modern JS frameworks have run into a quandary - what we write is what we ship. Despite our best efforts at minifying and treeshaking, we cannot fight the fact that adding features means adding JS bundle size. This means we are often trading off user experience against developer experience for every fatiguing decision we make.

But it doesn't have to be this way: as Tom Dale predicted, Compilers are the new Frameworks. Svelte is an exciting, newer JavaScript framework that was designed from the ground up with compilation and speed. In this talk, we'll look under its hood to understand how it works, so you know when and why you'd want to use it in future. Don't worry, it isn't Rocket Science!



## JSConfHI Brainstorm

- How Svelte Works

Svelte is an exciting, newer JavaScript framework that was designed from the ground up with compilation and developer experience in mind. Yet the compiler can be a black box - how can a tiny framework ship so many features? This talk is a deep dive into Svelte's compiler and runtime to demystify this brilliant approach to solving the tradeoff between DX and UX.

Organizers: Hi Organizers! I went through the Svelte source code in the process of making my own Svelte based static site generator and I learned a ton of fascinating lessons. I think people might be scared off of learning a new thing because of the black box nature of compilers. But Tom Dale was right when he said that Compilers are the new Frameworks. I'd love to share what a framework, designed as a compiler from the ground up with no API baggage, can look like and why that is so important for building fast while shipping the least amount of JavaScript.

(unused)
Compilers are the new Frameworks: Angular is working on Ivy, Ember is firing up Octane, and Vue compiles Single File Components.
Vue uses a compiler for Single File Components, Angular's Ivy slashes bundle size by excluding unused functionality, and Ember Octane compiles down to bytecode.

- Learning In Public

Developers are used to the idea of constant learning, especially in the fast moving Javascript ecosystem. But how often do we take a step back from learning to consider -how- we learn? In this talk we explore how Learning in Public can accelerate your career, bring value to your professional network, and ultimately make you a better developer, with examples all drawn from personal experience.

Hi Organizers! I think learning how to learn is the only meta-skill we can focus on that will outlive JavaScript. I've been a vocal proponent of the "Learn in Public" motto as it has helped me tremendously in my own career and technical skills, while also benefiting the community in the best possible win-win way. I've presented this talk at a couple of meetups and it was very well received, but am still looking to present it at a conference to get the message out!

- Solving "Works on My Machine" with Netlify Dev

  It's 2020, yet the process of development is still remarkably coupled to deployment. Far too many important production details, like serverless functions, redirects, and API integrations, rely on the "deploy and pray" methodology. This requires duplicative and complex config and still doesn't solve the problem of long iteration cycles. Instead of shipping our code up, why not pull our production environment down?

  This talk is a deep dive into the recently launched Netlify Dev, which is a new tool to improve the local development experience, yet solving "works on my machine" syndrome by simulating Edge routing logic via WASM. We will cover how Netlify Dev achieves a zero config experience with any project like Gatsby and Nuxt.js, while remaining technology agnostic. We will explore how we can dramatically improve the setup and provisioning of serverless functions and third party APIs for event driven architectures. And finally conclude with some ideas on possible directions for the future, and an invitation to discuss, collaborate, and build the future together.

- Node CLIs: The Missing Manual

Command Line Interfaces power a surprising amount of what JavaScript developers do. You can't `npm install`, run a `webpack` build, or `create-react-app` without a CLI. But if these tools improve developer experience and productivity so much, why don't we make more for ourselves? Because _nobody taught us how_. Unfamiliarity causes even more frustration when things go wrong, because if we don't know how CLI's work, we can't debug them. And things go wrong often, because we aren't taught how to write great CLI's. This is the comprehensive talk you always wished you'd had!

Organizers: Hi Organizers! I've spent a significant amount of time working on Node.js CLI's, having had to fix problems up and down my toolchain, and helping to maintain tsdx, Gatsby, docz and react-static, and finally working on Netlify Dev, a significant product launch that is entirely CLI based. I've had to learn a lot of informal lessons and it seems everybody learns this way, which completely doesn't make sense for something this important. So this is my talk to organize the dizzying wide world of CLI knowledge out there for the JS community and to get them building and contributing more to CLI's!

- The TypeScript Generics Talk for Kids Who Can't Math Good and Want to Do Code Good Too
- Why JS Tooling Sucks
- Write React from Scratch

## Does Svelte Make React Look Fat?

Svelte has gained a lot of attention this year as a serious player in the web framework space by -not- playing the same game as everyone else: As Tom Dale predicted in 2017, Compilers are becoming the new "Frameworks". In this talk we take a serious exploration into Svelte from the perspective of React, and ask what we can learn from this exciting new paradigm, including the Big Question: Could Svelte dethrone React?

## The Future of Local Serverless Development

The feedback cycle for serverful development is short - you just run it locally. That just isn't true for serverless development, where "deploy and pray" is the norm. This talk is a deep dive into the recently launched Netlify Dev, which is a new tool to improve the local development experience. We will explore how we can dramatically improve the setup and provisioning of serverless functions and third party APIs for event driven architectures.

## The Future of Local Development on the JAMstack

As much as we like decoupled architectures, the process of development is still remarkably coupled to deployment. This talk is a deep dive into the recently launched Netlify Dev, which is a new tool to improve the local development experience, yet solving "works on my machine" syndrome by simulating Edge routing logic via WASM. We will cover how Netlify Dev achieves a zero config experience with your static site generator of choice, while remaining technology agnostic. We will explore how we can dramatically improve the setup and provisioning of serverless functions and third party APIs for event driven architectures. And finally conclude with some ideas on possible directions for the future, and an invitation to discuss, collaborate, and build the future together.

## Turning the Static Dynamic

One of the most beautiful things about the JAMstack is how you can progressively add functionality to a static site just like you would add visual components. In particular, often want to add authentication and serverless functions to make our sites more and more dynamic... and, of course, authenticated serverless functions! In this talk we discuss the why and the how of the blurring line between static and dynamic, and show how to do it with React, Gatsby, and Netlify!

## Let's Put Everything-In-JS

6 years ago, React put HTML-in-JS. More recently, CSS-in-JS has become as popular as it has been controversial. What if... we just skipped ahead and took this to its logical conclusion? An exploration of the absolutely insane, totally illogical, standards-bending future of Single File Components that might just be possible.

> This is my "lets go wild" talk. I've been doing some research recently on bringing Vue's Single File Components to React, and concluded that most people are still too unambitious when it comes to the possibilities. I think a framework agnostic SFC spec may be possible, and that it can cover a whole lot more than templates, styling, and javascript. I will have practical demos, but I also want people to go nuts thinking about what they can do when Compilers are the new Frameworks.

Details:

This talk is takes things to a humorous extreme in order to prove a point. We recap a brief history of JSX, how CSS-in-JS APIs have evolved (despite much controversy), and then discusses how we are starting to include everything from explicit types (TypeScript) and data dependencies (GraphQL, React-Redux), to documentation (JSDoc? MDX?), tests, serverless functions, and anything else we can colocate together with a component. Ultimately, we will demonstrate this in a live demo of a webpack plugin finally bringing Single File Components to React.

- History
  - In the Beginning: JS-in-HTML
  - JSX: HTML-in-JS
  - Tailwind: CSS-in-HTML
  - Aphrodite, Radium, Styled-Components, Emotion: CSS-in-JS
  - Colocation vs Separation of Concerns
- How Vue Single File Components Work
  - Why Vue users love SFCs
  - an exploration of the vue-loader source code
  - Why doesn't React have SFCs?
- A Modest React SFC Proposal
  - Resolving the CSS-in-JS vs CSS Modules debate
  - Adding GraphQL
  - Adding React-Redux
  - Adding MDX
  - Adding Tests
  - Adding literally anything else webpack runs

Pitch:

From helping beginners and discussing developer experience with friends who use Vue, it is abundantly clear that Vue's Single File Components are a helpful convention in creating Vue apps. While React is wonderfully unopinionated about project structure, we don't _have_ to completely reject all structure and convention.

I've been doing some research recently on bringing Vue's Single File Components to React, and concluded that most people are still too unambitious when it comes to the possibilities. For one thing, having an easy, standard interface for switching between static CSS Modules to more dynamic CSS-in-JS solutions like styled-components, will help resolve a lot of performance and standards-compliance criticisms often leveled at the React community. For another, colocating documentation alongside components help ensure that information that needs to be updated together always stays together.

Ultimately I think a framework agnostic SFC spec may be possible, and that it can cover a whole lot more than "templates", styling, and Javascript. I will have practical demos, but I also want people to go nuts thinking about what they can do when Compilers are the new Frameworks.

## What Humans Can Learn from Machine Learning

Over the last half century, we've taught Machines to speak, move, react, see, think, and now to teach themselves. Is it game over for Humans? On the contrary, because we're now able to see and adjust the variables of learning, we've learned a great deal about _how_ to learn. In this talk, we explore five tricks of general computational learning algorithms and how we can apply them in our own learning!

---

Hi Organizers! I write and think a lot about Learning and Meta-Learning topics, and one of my top requested topics is always Learning How To Learn. I also do Machine Learning on the side and I think nobody has really tried to meld the two disciplines together and draw lessons from one to the other. I have an outline that I am very excited about, including:

- the alpha parameter
- momentum
- optimality in the face of an impossibly large search space
- generalize > memorize by using a testing set
- epsilon exhaustion and Probably Approximately Correct learning

Would love to have the chance to introduce these ideas in a way that will be engaging for the audience regardless of whether or not they know Machine Learning.

---

Oredev:

- You will learn about how the alpha parameter can help accelerate your learning, or overshoot
- You will learn about epsilon exhaustion and Probably Approximately Correct learning (this is a real ML term!)
- You will learn about Simulated Annealing and the best way to search a possible solution space while converging on schedule
- You will learn to apply the difference between Supervised and Unsupervised Learning and why generalization is more important than memorization


## Hooked on Change

React Hooks are finally here! Nothing's changed, yet everything's changed. Hooks don't unlock any new capability in React, so what's the big fuss? In this talk we introduce the Hooks API, explore the wonderful world of custom hooks, and finally discussed how your APIs and tools can also be Optimized for Change.

5 reasons:

- Hooks represent the React team's vision of the future
- There is a lot of FUD around Hooks from people who don't see the benefits
- The concept of Hooks have a broader applicability even outside React; they may even be adopted in Vue
- Custom Hooks make injecting and refactoring any functionality easy
- Library authors and app architects alike can draw broad API design lessons from Hooks, and apply it in many other contexts

Links:

- Speaking:
- React Rally: https://www.youtube.com/watch?v=nyFHR0dDZo0
- Hooks and Concurrent React: https://youtu.be/vhWaMPQhMLQ
- Info on Hooks: https://reactjs.org/hooks

## Learning React in Public

Developers are used to the idea of constant learning, especially in
the fast moving Javascript ecosystem. But how often do we take a step
back from learning to consider -how- we learn? In this talk we explore
how Learning in Public can accelerate your career, bring value to your
professional network, and ultimately make you a better developer, with
examples all drawn from personal experience with React.

Details

This is a "soft skills" talk unlike any other - it cuts to the heart of how developers of every level learn, grow, build, and market themselves.

- What is Learning in Public?
- Who Learns in Public? Exploring Career Philosophies of leaders in our industry
  - Sarah Drasner: Interdisciplinary blends
  - Kent C Dodds: Consume, Build, Teach
  - Julia Evans: B0rk
  - Chris Coyier: Workgin in Public
  - Lin Clark: Code Cartoons
  - Cory House: Becoming an Outlier
  - Max Stoiber: React-Boilerplate
- Why Learn in Public?
  - Giving back to others
  - Helping your future self
  - Being a sounding board, helping experts with your beginner's mind
- How to Learn in Public
  - Keeping your Identity small
  - Brad Frost & the concept of Learning Exhaust
  - Practicing the non-tech part of a career tech
  - Speaking
  - Twitter: some advice
  - "How to Win Friends and Influence People: Online Edition"

Pitch

I have been writing and thinking about learning philosophy as I myself learned React and entered the industry without formal computer science qualifications, a situation I believe many React developers share. This has been some of my best and most well received writing, and I would like to earnestly include and share this "career hack" with fellow React developers who may be interested in meta-learning algorithms like this.

## Learning in Public

Developers are used to the idea of constant learning, especially in
the fast moving Javascript ecosystem. But how often do we take a step
back from learning to consider -how- we learn? In this talk we explore
how Learning in Public can accelerate your career, bring value to your
professional network, and ultimately make you a better developer, with
examples all drawn from personal experience.

Pitch

I've given lots of technical talks, but this is my first time proposing a soft skills talk. A year ago I wrote an essay called "Learn in Public" that ended up helping many developers (https://twitter.com/swyx/status/1009174159690264579). Despite all the code I've written, that short essay may have been the most impactful thing I've ever written. I've since done a lot more thinking and collecting various examples and inspirations (and practicing the messaging in podcasts!) and I think this is something that could help other developers as much as it has helped me. I hope to give the audience something that will stay with them long after they have moved on from the jobs, frameworks, and languages they currently work with.
