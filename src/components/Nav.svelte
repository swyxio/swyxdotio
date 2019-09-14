<script>
  export let segment;
  export let isFooter = false
</script>

<style>
  nav.headerNav {
    border-bottom: 1px solid rgba(255, 62, 0, 0.1);
    font-weight: 300;
    padding: 0 1em;
  }
  nav.footerNav {
    border-top: 1px solid rgba(255, 62, 0, 0.1);
    border-bottom: none;
  }

  ul {
    margin: 0;
    padding: 0;
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

  a {
    text-decoration: none;
    padding: 1em 0.5em;
    display: block;
  }
</style>

<nav class={isFooter && 'footerNav' || 'headerNav'}>
  <ul>
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
      <li>
          <a href="https://tinyletter.com/swyx">
            newsletter
          </a>
        </li>
  </ul>
</nav>
