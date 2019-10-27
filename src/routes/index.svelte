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
    margin: 0 0 0.5em 0;
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
      <a href="/writing/donating-to-freecodecamp">
        <b>Donating $10k to FreeCodeCamp</b>
      </a>
    </div>
  </div>
  <hr />
  <div id="Cards">
    <div>
      <h2>Start Here</h2>
      <ul>
        <li>
          <h3>
            <a href="/writing/learn-in-public">Learn in Public</a>
          </h3>
          <div>
            My most impactful essay, and the personal growth philosophy I and
            many others follow.
          </div>
        </li>
        <li>
          <h3>
            <a href="/writing/svelte-static">Static Svelte</a>
          </h3>
          <div>How this very site was written</div>
        </li>
        <li>
          <h3>
            <a href="/writing/rise-of-immer">Rise of Immer in React</a>
          </h3>
          <div>
            A recap of Immutability in JavaScript and its relationship with
            React
          </div>
        </li>
        <li>
          <h3>About</h3>
          <div>
            My personal story, README, and
            <a href="/speaking/freecodecamp-podcast">
              podcast with Quincy Larson
            </a>
            about learning to code.
          </div>
        </li>
      </ul>
    </div>
    <hr />
    <div>
      <h2>My Best Work</h2>
      <ul>
        <li>
          <h3>Cheatsheets</h3>
          <div>
            I enjoy collecting helpful repos around topics, like
            <ul>
              <li>React-TypeScript Cheatsheet</li>
              <li>CLI Cheatsheet</li>
              <li>Concurrent-React Notes</li>
              <li>spark-joy</li>
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
                <a href="/speaking/learn-in-public">Learn In Public</a>
              </li>
              <li>
                <a href="/speaking/babel-macros">
                  Babel Macros (the Moana talk)
                </a>
              </li>
            </ul>
          </div>
        </li>
        <li>
          <h3>Open Source</h3>
          <div>
            I help maintain open source tooling at Netlify, as well as helped
            work on some other OSS projects like Docz, TSDX, Gatsby's Showcase,
            Sapper, etc.
          </div>
        </li>
      </ul>
    </div>
  </div>
</article>
