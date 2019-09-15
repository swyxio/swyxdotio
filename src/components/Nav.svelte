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
    font-size: 50px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
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
      <a href="https://tinyletter.com/swyx">mailinglist</a>
    </li>
    <li class="external">
      <a href="https://twitter.com/swyx">twitter</a>
    </li>
    <li class="external">
      <a href="https://github.com/sw-yx/swyxdotio">github</a>
    </li>
  </ul>
</nav>
