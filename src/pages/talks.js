import React from 'react'
import Link from 'gatsby-link'
import { A } from 'swyx-a'

const Talks = () => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: 0,
      paddingBottom: 'calc(56.25% + 40px)',
    }}
  >
    <div>
      <h1>Current Talk: Why React is -NOT- Reactive</h1>
      <h5>a talk given at ReactNYC and React Rally</h5>
      <p>
        Please see the dedicated <Link to="/reactrally">React Rally</Link> page
      </p>
    </div>
    <hr />
    <div>
      <h1>Contributing to React</h1>
      <h5>a talk given at ReactNYC</h5>
      <ul>
        <li>
          <A href="https://www.youtube.com/watch?v=GWCcZ6fnpn4">
            Recording (?? 2018)
          </A>
        </li>
      </ul>
    </div>
    <div>
      <h1>React Suspense</h1>
      <h5>a talk given at ReactNYC</h5>
      <ul>
        <li>
          <A href="https://www.youtube.com/watch?v=eRvbh5C6Lj0">
            Recording (Jun 2018)
          </A>
        </li>
      </ul>
      <p>Details coming</p>
    </div>
    <div>
      <h1>Creating Create-React-App</h1>
      <h5>a talk given at ReactNYC</h5>
      <ul>
        <li>
          <A href="https://www.beautiful.ai/player/-LD4eaMxlqSlCy6biPmZ/Creating-Create-React-App">
            Slides
          </A>
        </li>
        <li>
          <A href="https://www.youtube.com/watch?v=Et571vTAtT8">
            Recording (Jun 2018)
          </A>
        </li>
        <li>
          <A href="https://github.com/sw-yx/create-react-app-parcel">
            Related Github
          </A>
        </li>
      </ul>
      <p>
        We all use create-react-app but how much do we know about how it works
        internally? In this talk we discuss how I recently dived into the source
        code for create-react-app to make a fun clone! It looks intimidating but
        is really not, once you get a hang of how lerna monorepos work and try
        making one of your own. Watch this and then go make your own
        create-awesome-app!
      </p>
    </div>
    <div>
      <h1>Babel ❤️ GraphQL</h1>
      <h5>a lightning talk at React Boston 2018</h5>
      <ul>
        <li>Coming to React Boston Sept 2018</li>
        <li>
          <A href="https://youtu.be/7OHXz7vXC0g">Recording (Aug 2018)</A>
        </li>
        <li>
          <A href="https://babel-blade.netlify.com/">babel-blade Docs</A>
        </li>
      </ul>
      <p>
        Babel plugins can help solve DX and UX tradeoffs by metaprogramming to
        write code the way that is best for you while delivering code that is
        best for the user. Case in point: JSX - but why stop there? In this talk
        we explore how babel-blade solves the double declaration problem in all
        React GraphQL client libraries, and how to get started writing your
        first babel plugin!
      </p>
      <p>
        Babel-Macros were shipped with Create-React-App v2 - but what are they?
        What can you do with them? In this lightning talk we discuss how babel
        macros differ from plugins, and my recent work with babel-blade creating
        an inline GraphQL compiler that works with all React GraphQL clients.
      </p>
    </div>
    <hr />
    <div>
      <h5>Reusable bio</h5>
      <p>
        swyx is an Infinite Builder working on Developer Experience at Netlify.
        In his free time he helps run the Beginner Q&A and Job Postings at
        /r/reactjs.
      </p>
    </div>
    <hr />
    <div>
      <p>
        <i>pending talks</i>
      </p>
      <div>
        <h5>Static Site Generators: Performance by Default</h5>
        <p>
          There is a sea change afoot in the worlds of frontend frameworks and
          static site generators: the two have gotten married! React has Gatsby
          and React-Static, Vue has VuePress, even Svelte has Sapper. What’s
          going on? In this talk we explore how the performance bar has been
          raised for making fast, full-featured sites on the JAMStack, and how
          new tools are meeting that bar!
        </p>
        <p style={{ display: 'none' }}>
          I do a lot of work with the JAMstack as a DX advocate with Netlify - a
          lot of folks still underestimate how much Static Site Generator
          frameworks build in performance best practices by default (Lighthouse
          100 out of the box anyone?), and overestimate how limiting the
          constraint of Static Site Generation is for actually building non
          trivial web apps. I'd love the opportunity to talk about it to the
          PerfMatters community!
        </p>
      </div>
      <div>
        <h5>I can Babel Macros (and So Can You!)</h5>
        <p>
          Babel macros are a new way to solve DX and UX tradeoffs by
          metaprogramming to write code the way that is best for you while
          delivering code that is best for the user. Case in point: JSX - but
          why stop there? In this talk we explore how I wrote babel-blade to
          solve the double declaration problem in clientside GraphQL libraries,
          and how to get started writing your first babel macro!
        </p>
      </div>
      <div>
        <h5>The Dawn of Hybrid Site Generators</h5>
        <p>
          There is a sea change afoot in the worlds of frontend frameworks and
          static site generators: the two have gotten married! React has Gatsby
          and React-Static, Vue has VuePress, even Svelte has Sapper. What’s
          going on? In this talk we explore how the UX bar has been raised for
          making fast, full-featured sites on the JAMStack, and how new tools
          are meeting that bar!
        </p>
      </div>
      <div>
        <h5>JS at the Edge of the World</h5>
        <p>
          Want to live life on the Edge? Lambda functions open a world of
          possibilities for running on-demand, server-side code without having
          to run a dedicated server. It's been 4 years - What have people been
          using them for? In this talk we explore how people are pushing the
          frontiers of serverless Node.js to do everything from making slackbots
          to taking money for your next great side project!
        </p>
      </div>
      <div>
        <h5>React Suspense For The Rest of Us</h5>
        <p>
          Even if you don't work with React, you're likely to have come across a
          React dev super excited about the new Suspense feature in React. What
          is it? Why are people so hyped? Should I care? This talk is an
          introduction for anyone who feels out of the loop - walking through
          the history of the idea and the general UI problems it solves (even
          for React Native!). We will approach this in a framework-agnostic way,
          so that you can see if the Suspense design pattern might make sense in
          your next project!
        </p>
      </div>
      <div>
        <h5>Reacting Ahead of Time</h5>
        <p>
          What's faster than O(1)? Step changes in performance and scalability
          come from paradigm changes rather than incremental optimizations. The
          inexorable march forward in "table stakes" product requirements has
          forced developers to explore ways to push computation from client to
          server, from runtime to buildtime, from fat SPAs to code-split
          frameworks. Cutting edge UX is exploring how to prefetch and cache
          resources intelligently, trading off memory usage for compute time.
          Lastly, DX has also been pushed forward with fascinating ideas from
          hot reloading to GraphQL. Where is all this taking us?
        </p>
      </div>
      <div>
        <h5>Learning React in Public</h5>
        <p>
          Developers are used to the idea of constant learning, especially in
          the fast moving Javascript ecosystem. But how often do we take a step
          back from learning to consider -how- we learn? In this talk we explore
          how Learning in Public can accelerate your career, bring value to your
          professional network, and ultimately make you a better developer, with
          examples all drawn from personal experience with React.
        </p>
      </div>
      <div>
        <h5>Using the React DevTools Profiler at Netlify</h5>
        <p>
          How can the new React DevTools Profiler help you identify and fix
          performance issues in your app? In this lightning talk we go through a
          real life example diving into the Netlify production app to solve
          longstanding performance issues, and end with a quick checklist of
          things you can try on your app!
        </p>
      </div>
      <div>
        <h5>React Suspense Workers</h5>
        <p>
          React Suspense doesn't work without a caching layer, so every Suspense
          library has built one - except in service workers! In this talk we go
          through what React Suspense is, then explore a prototype of how
          "Suspense Workers" could be useful in future Concurrent React apps.
        </p>
      </div>
      <div>
        <h5>Immutability is Changing: From Immutable.js to Immer</h5>
        <p>
          The need for immutability in JavaScript isn’t obvious, but
          Immutable.js swept the Javascript world in 2015 when it enforced a
          stricter, more functional approach to code without any need for deep
          comparisons. Then Immer was introduced in 2018, and took the
          Javascript world by storm. What's different? What's better? And what
          do ES6 Proxies have to do with it?
        </p>
      </div>
      <div>
        <h5>The Rise of Immer in React</h5>
        <p>
          Immer is one of the most successful open source launches in 2018, and
          has found particular favor in the React community. What problems does
          it solve, and why does it fit React's design principles so well?
        </p>
      </div>
      <div>
        <h5>Atomic React Deploys</h5>
        <p>
          React's logo is an atom. The component philosophy encourages Atomic
          design. What if our app deployments were atomic too? A backend that is
          never out of sync with your frontend - pipe dream or reality?
        </p>
      </div>
      <div>
        <h5>Better Docs with Docz</h5>
        <p>
          We all know good documentation is important for adoption and developer
          experience - isn't it worth investing in tooling to make it easier?
          Docz burst onto the scene this year as a fantastic new way to make
          great documentation for your React libraries with MDX. Let's take it
          out for a spin!
        </p>
      </div>
    </div>
  </div>
)
export default Talks
