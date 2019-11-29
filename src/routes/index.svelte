<script>
  // import { fade, fly } from "svelte/transition";
</script>

<style>
  h1,
  h2,
  #CTA {
    text-align: center;
    margin: 0 auto;
  }

  #CTA {
    font-size: 2em;
    line-height: 1.25;
    margin: 0 0 2em 0;
  }
  h1 {
    font-size: 2.8em;
    text-transform: uppercase;
    font-weight: 700;
    margin: 0 0 0.5em 0;
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
</style>

<svelte:head>
  <title>swyx's site</title>
</svelte:head>

<article>
  <h1>swyx's site!</h1>
  <div id="CTA">
    Latest Post:
    <div>
      <a href="/writing/narrow-waists">
        <b>Narrow Waists</b>
      </a>
    </div>
  </div>
  <hr />
  <div id="Cards">
    <div>
      <h2>Start Here</h2>
      <ul>
        <li>
          <h3>Writing</h3>
          <div>
            I do a bunch of personal and work-related writing:
            <ul>
              <li>
                <b>
                  <a href="/writing/learn-in-public">Learn in Public</a>
                </b>
                <div>
                  My most impactful essay, and the personal growth philosophy I
                  and many others follow.
                </div>
              </li>
              <li>
                <b>
                  <a href="/writing/svelte-static">Static Svelte</a>
                </b>
                <div>How this very site was written</div>
              </li>
              <li>
                <b>
                  <a href="/writing/rise-of-immer">Rise of Immer in React</a>
                </b>
                <div>
                  A recap of Immutability in JavaScript and its relationship
                  with React
                </div>
              </li>
              <li>
                <b>About</b>
                <div>
                  My personal story,
                  <a
                    href="https://github.com/sw-yx/README/blob/master/README.md">
                    README
                  </a>
                  , and
                  <a href="/speaking/freecodecamp-podcast">
                    podcast with Quincy Larson
                  </a>
                  about learning to code.
                </div>
              </li>
            </ul>
          </div>
        </li>

        <li>
          <h3>Speaking</h3>
          <div>
            I have done a bunch of talks and podcast appearances. The best of
            which are:
            <ul>
              <li>
                <a href="/speaking/react-hooks">Getting Closure on Hooks</a>
              </li>
              <li>
                <a href="/speaking/react-not-reactive">
                  Why React is not Reactive
                </a>
              </li>

              <li>
                <a href="/speaking/contributing-to-react">
                  Contributing to React
                </a>
              </li>
              <li>
                <a href="/speaking/learn-in-public-nyc">Learn In Public</a>
              </li>
              <li>
                <a href="/speaking/babel-macros">
                  Babel Macros (the Moana talk)
                </a>
              </li>
            </ul>
          </div>
        </li>
      </ul>

    </div>
    <hr />
    <div>
      <h2>Other Work (off-site)</h2>
      <ul>
        <li>
          <h3>Teaching</h3>
          <div>
            I teach on
            <a href="https://egghead.io/">Egghead.io</a>
            and in other workshops:
            <ul>
              <li>
                My course on
                <a
                  href="https://egghead.io/courses/design-systems-with-react-and-typescript-in-storybook">
                  Design Systems with React + TypeScript
                </a>
              </li>
              <li>
                My (upcoing) workshop on
                <b>Building Custom CLI Tooling with OClif and React-Ink</b>
              </li>
              <li>
                <a href="/speaking/netlify-freecodecamp-intro">
                  Complete Intro to Netlify in 3.5 hours
                </a>
              </li>
            </ul>
          </div>
        </li>
        <li>
          <h3>Cheatsheets</h3>
          <div>
            I enjoy collecting helpful repos around topics, like
            <ul>
              <li>
                <a
                  href="https://github.com/typescript-cheatsheets/react-typescript-cheatsheet/">
                  React-TypeScript Cheatsheet
                </a>
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
              <li>
                <a href="https://github.com/sw-yx/spark-joy/">spark-joy</a>
              </li>
            </ul>
          </div>
        </li>
        <li>
          <h3>Open Source</h3>
          <div>
            I've helped maintain
            <a href="https://github.com/netlify/cli">open</a>
            <a href="https://github.com/sw-yx/react-netlify-identity/">
              source
            </a>
            <a href="https://github.com/sw-yx/jamstack-hackathon-starter">
              tooling
            </a>
            at Netlify, as well as helped work on some other OSS projects like
            <a href="https://github.com/jaredpalmer/tsdx">TSDX</a>
            ,
            <a href="https://www.gatsbyjs.org/showcase/">Gatsby's Showcase</a>
            ,
            <a href="https://github.com/sveltejs/community">Svelte Community</a>
            <a href="https://github.com/sw-yx/ssg">SSG</a>
            ,
            <a href="https://github.com/pedronauck/docz/">Docz</a>
            (inactive), etc.
          </div>
        </li>
      </ul>
    </div>
  </div>
</article>
