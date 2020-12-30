<svelte:head>
  <title>swyx's site</title>
  <meta property="og:url" content="https://www.swyx.io/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="swyx.io home" />
  <meta name="Description" content="swyx's home on the Internet" />
  <meta property="og:description" content="swyx's home on the Internet" />
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content="swyx.io home" />
  <meta name="twitter:description" content="swyx's home on the Internet" />
  <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg" />
</svelte:head>

<div class="mx-auto max-w-screen-xl mytext">
  <div class="lg:grid lg:grid-cols-12 lg:gap-8">
    <div
      class="px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6
        lg:text-left lg:flex lg:items-center">
      <div>
        <!-- <h2
          class="mt-4 text-4xl tracking-tight leading-10 font-extrabold sm:mt-5
            sm:leading-none sm:text-6xl lg:mt-6 lg:text-5xl xl:text-6xl
            text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-indigo-400
            to-indigo-400">
          Welcome to swyx.io!
        </h2> -->
        <div class="mt-4">
          <h1
            class="text-2xl leading-9 tracking-tight font-extrabold mytext
            sm:text-xl sm:leading-10">
            Recently Featured
          </h1>
          <ul class="list-disc ml-4 mb-4">
            <li>
              Essay: <a class="mylink" href="/api-economy">The Light and Dark Side of the API Economy</a>
            </li>
            <li>
              Talk: <a class="mylink" href="https://www.youtube.com/watch?v=D-Sj6jo4o1I">The
                Operating System of You</a>
            </li>
            <li>
              Podcast: <a class="mylink" href="https://shoptalkshow.com/432/">SWYX on Shop Talk Show</a>
            </li>
          </ul>
          <div>👉 <a class="mylink" href="/ideas">See All My Essays, Talks, and Podcasts!</a> 👈</div>
        </div>
        <div
          class="mt-5 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
          <p class="text-base font-medium text-opacity-75">
            Join 2,000+ developers getting updates!
          </p>
          <form
            action="https://tinyletter.com/swyx"
            method="post"
            target="popupwindow"
            onsubmit="window.open('https://tinyletter.com/swyx', 'popupwindow', 'scrollbars=yes,width=800,height=600');return true"
            class="mt-3 sm:flex">
            <input
              aria-label="Email"
              id="tlemail"
              name="email"
              type="email"
              class="appearance-none block w-full px-3 py-3 border
                border-gray-300 text-base leading-6 rounded-md
                placeholder-gray-500 shadow-sm focus:outline-none
                focus:placeholder-gray-400 focus:ring-blue
                focus:border-blue-300 transition duration-150 ease-in-out
                sm:flex-1"
              placeholder="I solemnly swear to never spam you." />
            <input type="hidden" value="1" name="embed" />
            <button
              type="submit"
              class="mt-3 w-full px-6 py-3 border border-transparent text-base
                leading-6 font-medium rounded-md text-white bg-indigo-600
                shadow-sm hover:bg-indigo-400 focus:outline-none
                focus:border-gray-300 focus:ring-gray
                active:bg-indigo-400 transition duration-150 ease-in-out sm:mt-0
                sm:ml-3 sm:flex-shrink-0 sm:inline-flex sm:items-center
                sm:w-auto hover:animate-wiggle">
              Subscribe via Email
            </button>
          </form>
          <p class="mt-3 text-sm leading-5 text-opacity-75">
            Too soon! <a class="font-medium text-opacity-75
                underline" rel="noopener" href="https://tinyletter.com/swyx/archive">Show
              me what I'm signing up for!</a>
          </p>
        </div>
        <!-- <p class="mt-8 text-sm text-white uppercase tracking-wide font-semibold sm:mt-10">Used by</p>
              <div class="mt-5 w-full sm:mx-auto sm:max-w-lg lg:ml-0">
                <div class="flex flex-wrap items-start justify-between">
                  <div class="flex justify-center px-1">
                    <img class="h-9 sm:h-10" src="https://tailwindui.com/img/logos/tuple-logo.svg" alt="Tuple">
                  </div>
                  <div class="flex justify-center px-1">
                    <img class="h-9 sm:h-10" src="https://tailwindui.com/img/logos/workcation-logo.svg" alt="Workcation">
                  </div>
                  <div class="flex justify-center px-1">
                    <img class="h-9 sm:h-10" src="https://tailwindui.com/img/logos/statickit-logo.svg" alt="StaticKit">
                  </div>
                </div>
              </div> -->
      </div>
    </div>
    <div
      class="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0
        lg:col-span-6 lg:flex lg:items-center">
      <div class="relative mx-auto w-32 md:w-full rounded-lg lg:max-w-md">
        <a href="/ideas">
          <img
            class="hover:border-4 hover:border-blue-500 
              w-full relative block rounded-full
              md:rounded-lg overflow-hidden focus:outline-none
              focus:ring"
            src="https://avatars2.githubusercontent.com/u/6764957?u=97ad815028595b73b06ee4b0510e66bbe391228d&v=4&s=400"
            alt="swyx at niseko" />
        </a>
      </div>
    </div>
    <hr />
    <div class="prose pt-4">
      <h2>Featured Work (on this site)</h2>
      <h3 id="featured-writing">Writing</h3>
      <div>
        I do a bunch of
        <a href="/writing">personal and work-related writing</a>, and recently
        published
        <a href="https://learninpublic.org/">The Coding Career Handbook</a>
        with the best of my nontechnical writing.
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
            <div>How this very site was written.</div>
          </li>
          <li>
            <b> <a href="/slack-fumble">Slack is Fumbling Developers</a> </b>
            <div>
              Trendspotting how Developer communities are leaving Slack (for
              Discord).
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
              My personal story,
              <a href="https://github.com/sw-yx/README/blob/master/README.md">
                README
              </a>
              , and
              <a href="/speaking/freecodecamp-podcast">
                podcast with Quincy Larson
              </a>
              about learning to code.
            </div>
          </li>
          <li>
            <a href="https://www.swyx.io/ideas/?show=Essays">More of my writing
              here!</a>
          </li>
        </ul>
      </div>
  
      <h3 id="featured-speaking">Speaking</h3>
      <div>
        I have done a bunch of talks and podcast appearances. The best of which
        are:
        <ul>
          <li>
            <a href="/speaking/react-hooks">Getting Closure on Hooks</a>
            <div>
              My most well received technical talk, where I explain a mental model
              for React hooks by livecoding a React clone at JSConf Asia. Started
              as
              <a href="https://twitter.com/swyx/status/1100809424963219456">a
                tweet</a>, then
              <a href="https://www.swyx.io/writing/getting-closure-on-hooks/">a
                blogpost.</a>
            </div>
          </li>
          <li>
            <a href="/speaking/react-not-reactive"> Why React is not Reactive </a>
            <div>
              My first conference talk ever was at the biggest React venue in the
              world, React Rally. I spent a month writing
              <a
                href="https://twitter.com/swyx/status/1112513571315830784?s=20">my
                CFP on the most interesting React question I could think of</a>.
            </div>
          </li>
  
          <li>
            <a href="/speaking/contributing-to-react"> Contributing to React </a>
            <div>
              My first meetup talk ever was at React NYC - this was accepted on to
              the React docs as a guide for other contributors!
            </div>
          </li>
          <li>
            <a href="/speaking/learn-in-public-nyc">Learn In Public</a>
            <div>
              My first verbal exposition on the Learn In Public philosophy. Video
              is frozen at the end, sorry.
            </div>
          </li>
          <li>
            <a href="/speaking/babel-macros">I Can Babel Macros and So Can You!
              (the Moana talk)
            </a>
            <div>
              My first JSConf appearance ever, at one of the most competitive
              JSConfs ever. This talk is where I first started experimenting with
              theming talks, and it came out really well with the Moana theme.
            </div>
          </li>
          <li>
            <a href="https://www.swyx.io/ideas/?show=Talks&show=Podcasts">More of
              my speaking here</a>
          </li>
        </ul>
      </div>
    </div>
    <hr />
    <div class="prose pt-4">
      <h2>Other Work (off-site)</h2>
      <h3>Teaching</h3>
      <div>
        I teach on
        <a href="https://egghead.io/s/26zf5">egghead.io</a>
        and in other workshops:
        <ul>
          <li>
            My course on
            <a
              href="https://egghead.io/courses/design-systems-with-react-and-typescript-in-storybook?af=95qfq1">
              Design Systems with React + TypeScript
            </a>
          </li>
          <li>
            My (upcoming) workshop on
            <b>Building Custom CLI Tooling with OClif and React-Ink</b>
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
              ⚛️ 📜 React-TypeScript Cheatsheet
            </a>
          </li>
          <li>
            <a href="https://github.com/sw-yx/spark-joy/">✨ 😂 Spark-Joy</a>
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
        I helped moderate
        <a href="https://www.swyx.io/writing/react-survey-2019/">/r/reactjs</a>
        to
        <a href="https://www.swyx.io/moderating-rreactjs/">200k+ developers</a>,
        and
        <a href="https://twitter.com/sveltesociety">cofounded Svelte Society</a>.
      </p>
      <div>
        I led CLI development for
        <a href="https://news.ycombinator.com/item?id=19615546">Netlify Dev</a>,
        <a
          href="https://github.com/netlify/plugins/blob/master/plugins.json">Build
          Plugins</a>
        and other open source tooling at Netlify. I've also helped maintain other
        OSS projects like
        <a href="https://github.com/jaredpalmer/tsdx">TSDX</a>
        ,
        <a href="https://www.gatsbyjs.org/showcase/">Gatsby's Showcase</a>
        ,
        <a href="https://github.com/sveltejs/community">Svelte Society</a>
        <a href="https://github.com/sw-yx/ssg">SSG</a>
        ,
        <a href="https://github.com/pedronauck/docz/">Docz</a>
        (inactive), etc.
      </div>
    </div>
  </div>
</div>
