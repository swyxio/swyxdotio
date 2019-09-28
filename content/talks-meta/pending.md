## Does Svelte Make Me Look Fat?

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

## A Skeptic's Intro to the JAMStack

A delightful exploration of how JavaScript web apps, serverless APIs, the static-site renaissance, and Git-centric workflows are enabling a whole new architecture, from a fellow skeptic wary of marketing acronyms.

> Abstract (Detailed description of your presentation, including key audience takeaways)

The JAMStack stands for JavaScript, APIs, and Markup, and at first glance it seems a truism - of course everyone uses that, right? What kind of stack is that? At its core, however, it describes a new architecture for web apps and sites that is at the confluence of multiple trends in serverless, JavaScript frameworks, static site generators, and Git-centric workflows.

Over the past 20 years, the stack of web apps has slowly shifted from fully server-side driven (LAMP) to a "full stack" straddling front-end and back-end (MEAN). Thanks to furious innovation in JavaScript and serverless technologies in the last 5 years, the stack has shifted even further forward to empower front-end developers to be responsible for fully dynamic web app experiences on par with mobile apps. JavaScript frameworks like React have arisen to make writing compenentized web apps much easier. Their ability to statically render and rehydrate have allowed a new generation of static site generators like Gatsby and Vuepress to offer dynamic and fast experiences previously not possible for static sites. On the backend, the proliferation of the third party API economy and the launch of AWS Lambdas and other serverless functionality make it ever easier to build without a monolithic server. This allows a clear decoupling between front-end and back-end, and a fundamental re-examining of the application delivery architectures as a direct result. By leaning on serverless functions and static-building, we can use a Git-centric workflow to eliminate a lot of the complexity inherent in today's architectures, with direct implications for reliability, security, performance, and simplified caching. Finally, we can unlock new possibilities with the new JAMstack architecture, like deploy previews and atomic deploys.

> Who is this presentation for?

CTOs, VP Engs, Web App Team Leads, Beginners who want to learn about shifts in web architecture

> What's the takeaway for the audience?

- JAMStack is shorthand for a fundamental rethinking of web architecture taking advantage of latest technologies in serverless and JavaScript.

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

## STAR Apps: Design Systems, TypeScript, Apollo GraphQL, and React

A new front-end stack is emerging, with one theme: constraints that scale. They involve building Design Systems for visual consistency, using TypeScript for internal consistency, Apollo GraphQL for data manipulation, and server- or statically-rendered React for data representation. In this talk we explore how these trends fit together, and _why_ leading product teams from AirBnb to the New York Times are embracing them.

Details:

This will be a high-level architecture, patterns, and tooling talk, that will tie together multiple disparate trends and hopefully present a convincing thesis: that we are at a beginning of a movement that is leading large tech companies to invest heavily in front-end technologies that impose constraints that allow teams to collaborate and ship at scale.

Having these opinions allow us to build a React-based framework that bake in these opinions, and that is something I hope to demo as React's answer to the outstanding work that has been done by the Vue CLI/UI team.

Talk structure:

- Introducing and defining Design Systems and the tools used
- Introducing TypeScript and why teams have embraced it for large React apps
- Introducing Apollo and why it has become the leading GraphQL client for React
- Discussing server-side (Next.js) vs static (Gatsby) React why React is still growing at >70% annually
- Exploring combinations:
  - Design Systems + React: React-sketchapp, Framer X
  - GraphQL + React: Discussing the componentization of Data
  - TypeScript + React: Documentation, and static checking vs proptypes
- Introducing a React-based framework and CLI that ties in all these patterns as a proof of concept
- Inviting the audience to explore how these trends are expressions of a deeper underlying desire for better tooling that matches the needs of product engineering teams.

Pitch:

Sometimes it can be hard to find method among the madness of all the different trendy technologies in web development. Old hands are rightfully cynical and fatigued with hot new things. However, some trends, like React, do end up "winning" and persisting over many years, making them very worthwhile investments. Much like we invest in stocks and real estate, it is worth developing an investment thesis around open source technologies and architectures, in order to have a framework for deciding what to invest in and build on.

As a former investment analyst, I hope to bring that market analysis perspective to developers who may not view the open source world through this lens, and hopefully explain why these trends may come together in a "superframework" that covers Design Systems, TypeScript, ApolloGraphQL, and React, or something that looks like it. My personal involvement is having worked on an app that uses all these technologies and seeing the benefits of a cohesive philosophy around consistency and data, as well as having taken stock of what multiple large tech companies are reporting they invest in.

## JAMStack Jumpstart: Gatsby + Netlify

There is a lot of developer and investment interest in JAMStack technologies: from the serverless movement to new authentication models to continuous atomic deployment to the static site generator renaissance. But with so many new terms and options, it is hard for people to figure out where to start.

This workshop will teach developers to set up a simple but state of the art Gatsby and Netlify stack, which lets people create blazing fast sites and apps with React and GraphQL, backed up by a continuous deployment and serverless platform complete with authentication and CMS. It has never been easier to get a great Lighthouse score, or to deploy complex, secure webapps for free.

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
