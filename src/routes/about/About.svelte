<style>
  h1,
  h2 {
    text-align: center;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.8em;
    text-transform: uppercase;
    font-weight: 700;
    /* margin: 0 0 0.5em 0; */
  }

  @media (min-width: 480px) {
    h1 {
      font-size: 4em;
    }
    #Cards {
      flex-direction: row !important;
    }
  }
  #Cards {
    display: flex;
    flex-direction: column;
  }
  #Cards > div {
    flex: 1;
  }
  h2 {
    font-size: 2em;
    text-transform: uppercase;
    font-weight: 700;
    margin: 0 0 0.5em 0;
  }
  h3 {
    /* font-size: 2em;
    text-transform: uppercase; */
    font-weight: 700;
    /* margin: 0 0 0.5em 0; */
  }
  .prose {
    margin: 0 auto;
  }
</style>

<svelte:head>
  <title>About Swyx</title>
</svelte:head>

<article class="text-teal-400 px-4">
  <h1 class="mb-2">About Swyx</h1>
  <h2 class="text-teal-600">aka Shawn Wang</h2>
  <div class="prose py-4">
    <h3 id="about">About</h3>
    <p>
      I am a <a
        href="https://www.freecodecamp.org/news/shawn-wang-podcast-interview/">hedgie
        turned developer</a>, primarily active in the JavaScript community. I
      grew up in Singapore 🇸🇬, but have lived and worked mostly in the US/UK,
      most recently in New York City 🗽. I am best known for the <a
        href="/learn-in-public">Learn in Public</a> idea and <a
        href="/ideas?filter=React&show=Essays&show=Talks&show=Podcasts">my
        speaking on React</a>.
    </p>
    <h3 id="bio">Bio for Event Organizers</h3>
    <p>
      swyx is an Infinite Builder, working on Developer Experience at AWS
      Amplify and recently published <a href="https://learninpublic.org/">the
        Coding Career Handbook</a>. In his free time he teaches React,
      TypeScript, Storybook and Node.js CLI's at <a
        href="https://egghead.io/s/26zf5">Egghead.io</a>, and helps run the <a
        href="https://sveltesociety.dev/">Svelte Society</a> community of meetups.
    </p>
    <p>
      🔗 <a href="https://twitter.com/swyx">Twitter</a>, <a
        href="https://github.com/sw-yx">GitHub</a>.
    </p>
    <p>
      🖼️ <a
        href="https://pbs.twimg.com/profile_images/990728399873232896/CMPn3IxT_400x400.jpg">Medium</a>,
      <a
        href="https://avatars3.githubusercontent.com/u/6764957?s=460&v=4">Large</a>.
    </p>
    <h3 id="now">
      What I'm Doing Now <a href="https://nownownow.com/about">
        <svg
          class="inline"
          xmlns="http://www.w3.org/2000/svg"
          width="0.75em"
          height="0.75em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </svg>
      </a>
    </h3>
    <p>
      I am currently working on Developer Experience at AWS Amplify, working US
      hours out of Singapore. I also am on the <a
        href="https://www.svelteradio.com/">Svelte Radio</a> and <a
        href="http://careerchats.transistor.fm/">Career Chats</a> podcasts. You can
      get more high frequency updates on <a href="https://twitter.com/swyx">my
        Twitter</a>.
    </p>
  </div>
  <hr />
  <div class="prose pt-4">
    <h2>Featured Work (on this site)</h2>
    <h3>Writing</h3>
    <div>
      I do a bunch of <a href="/writing">personal and work-related writing</a>,
      and recently published <a href="https://learninpublic.org/">The Coding
        Career Handbook</a> with the best of my nontechnical writing.
      <ul>
        <li>
          <b> <a href="/writing/learn-in-public">Learn in Public</a> </b>
          <div>
            My most impactful essay, and the personal growth philosophy I and
            many others follow.
          </div>
        </li>
        <li>
          <b> <a href="/create_luck">How to Create Luck</a> </b>
          <div>
            Luck is random, but creating luck is a skill that can be developed.
          </div>
        </li>
        <li>
          <b> <a href="/js-third-age">Third Age of JavaScript</a> </b>
          <div>
            Every 10 years there is a changing of the guard in JavaScript. A
            well received piece that has caught the imagination of some
            community leaders like Fred Schott and Rich Harris.
          </div>
        </li>
        <li>
          <b> <a href="/writing/svelte-static">Static Svelte</a> </b>
          <div>How this very site was written</div>
        </li>
        <li>
          <b> <a href="/slack-fumble">Slack is Fumbling Developers</a> </b>
          <div>
            Trendspotting how Developer communities are leaving Slack (for
            Discord)
          </div>
        </li>
        <li>
          <b>
            <a href="/react-sfcs-here">React Single File Components Are Here</a>
          </b>
          <div>
            Talking about why and when Single File Components are slowly coming
            to React.js
          </div>
        </li>
        <li>
          <b>About</b>
          <div>
            My personal story, <a
              href="https://github.com/sw-yx/README/blob/master/README.md">
              README
            </a> , and <a href="/speaking/freecodecamp-podcast">
              podcast with Quincy Larson
            </a> about learning to code.
          </div>
        </li>
      </ul>
    </div>

    <h3>Speaking</h3>
    <div>
      I have done a bunch of talks and podcast appearances. The best of which
      are:
      <ul>
        <li><a href="/speaking/react-hooks">Getting Closure on Hooks</a></li>
        <li>
          <a href="/speaking/react-not-reactive"> Why React is not Reactive </a>
        </li>

        <li>
          <a href="/speaking/contributing-to-react"> Contributing to React </a>
        </li>
        <li><a href="/speaking/learn-in-public-nyc">Learn In Public</a></li>
        <li>
          <a href="/speaking/babel-macros"> Babel Macros (the Moana talk) </a>
        </li>
      </ul>
    </div>
  </div>
  <hr />
  <div class="prose pt-4">
    <h2>Other Work (off-site)</h2>
    <h3>Teaching</h3>
    <div>
      I teach on <a href="https://egghead.io/s/26zf5">egghead.io</a> and in other
      workshops:
      <ul>
        <li>
          My course on <a href="https://egghead.io/courses/design-systems-with-react-and-typescript-in-storybook?af=95qfq1"> Design
            Systems with React + TypeScript </a>
        </li>
        <li>
          My (upcoming) workshop on <b>Building Custom CLI Tooling with OClif
            and React-Ink</b>
        </li>
        <li>
          <a href="/speaking/netlify-freecodecamp-intro">
            Complete Intro to Netlify in 3.5 hours
          </a>
        </li>
      </ul>
    </div>
    <h3>Cheatsheets</h3>
    <div>
      I curate helpful repos around topics, like
      <ul>
        <li>
          <a
            href="https://github.com/typescript-cheatsheets/react-typescript-cheatsheet/">
            ⚛️📜 React-TypeScript Cheatsheet
          </a>
        </li>
        <li>
          <a href="https://github.com/sw-yx/spark-joy/">✨😂 Spark-Joy</a>
        </li>
        <li>
          <a
            href="https://github.com/sw-yx/cli-cheatsheet/blob/master/README.md">
            CLI Cheatsheet
          </a>
        </li>
        <li>
          <a href="https://github.com/sw-yx/concurrent-react-notes">
            Concurrent-React Notes
          </a>
        </li>
      </ul>
    </div>

    <h3>Dev Tooling & Dev Community</h3>
    <p>
      I helped moderate <a
        href="https://www.swyx.io/writing/react-survey-2019/">/r/reactjs</a> to 200k+
      developers, and <a href="https://twitter.com/sveltesociety">cofounded
        Svelte Society</a>.
    </p>
    <div>
      I led CLI development for <a
        href="https://news.ycombinator.com/item?id=19615546">Netlify Dev</a>, <a
        href="https://github.com/netlify/plugins/blob/master/plugins.json">Build
        Plugins</a> and other open source tooling at Netlify. I've also helped maintain
      other OSS projects like <a
        href="https://github.com/jaredpalmer/tsdx">TSDX</a> , <a
        href="https://www.gatsbyjs.org/showcase/">Gatsby's Showcase</a> , <a href="https://github.com/sveltejs/community">Svelte
        Society</a>
      <a href="https://github.com/sw-yx/ssg">SSG</a> , <a
        href="https://github.com/pedronauck/docz/">Docz</a> (inactive), etc.
    </div>
  </div>
</article>
