<script>
  export let segment;
  export let isFooter = false;
</script>

<style>
  nav.headerNav {
    border-bottom: 1px solid rgba(255, 62, 0, 0.1);
    font-weight: 300;
    padding: 0 1em;
  }
  nav.footerNav {
    border-top: 1px solid rgba(255, 62, 0, 0.1);
    padding: 0 1em;
  }

  ul {
    margin: 0;
    padding: 0;
    display: flex;
  }
  @media (max-width: 480px) {
    ul {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
    }
    li.divider {
      display: none;
    }
  }

  /* clearfix */
  ul::after {
    content: "";
    display: block;
    clear: both;
  }

  li {
    display: block;
    float: left;
    transition: all 1s;
  }
  li:hover {
    font-size: 1.25rem;
  }
  li.divider {
    width: 100%;
  }

  .selected {
    position: relative;
    display: inline-block;
  }

  .headerNav .selected::after {
    position: absolute;
    content: "";
    width: calc(100% - 1em);
    height: 2px;
    background-color: rgb(255, 62, 0);
    display: block;
    bottom: -1px;
  }

  .footerNav .selected::before {
    position: absolute;
    content: "";
    width: calc(100% - 1em);
    height: 2px;
    background-color: rgb(255, 62, 0);
    display: block;
    top: -1px;
  }

  a,
  span {
    text-decoration: none;
    padding: 1em 0.5em;
    display: block;
  }

  span {
    background: linear-gradient(to right, #647bd8, #93199f);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: bold;
  }
  .icon {
    stroke: currentColor;
    fill: none;
    position: relative;
    top: 2px;
    display: inline-block;
    height: 1em;
    width: 1em;
  }
  .icon:hover {
    stroke: red;
    fill: aqua;
  }
</style>

<nav class={(isFooter && 'footerNav') || 'headerNav'}>
  <ul>
    <li>
      <span>swyx.io</span>
    </li>
    <li>
      <a class={segment === undefined ? 'selected' : ''} href=".">home</a>
    </li>
    <li>
      <a class={segment === 'about' ? 'selected' : ''} href="about">about</a>
    </li>

    <li>
      <a
        rel="prefetch"
        class={segment === 'writing' ? 'selected' : ''}
        href="writing">
        writing
      </a>
    </li>
    <li>
      <a
        rel="prefetch"
        class={segment === 'talks' ? 'selected' : ''}
        href="talks">
        talks
      </a>
    </li>
    <li class="divider">{''}</li>
    <li class="external">
      <a href="https://tinyletter.com/swyx">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          aria-hidden="true">

          <path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1
            0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />

        </svg>
      </a>
    </li>
    <li class="external">
      <a href="https://twitter.com/swyx" target="_blank" rel="noopener">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          aria-hidden="true">

          <path
            d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66
            10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5
            4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />

        </svg>
      </a>
    </li>
    <li class="external">
      <a
        href="https://github.com/sw-yx/swyxdotio"
        target="_blank"
        rel="noopener">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          aria-hidden="true">

          <path
            d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0
            0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07
            5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65
            5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42
            3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />

        </svg>
      </a>
    </li>
  </ul>
</nav>
