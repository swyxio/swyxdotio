<script>
  import ThemeEditor from './ThemeEditor.svelte'
  export let segment
  export let isFooter = false
  let showThemeEditor = false
  let toggleEditor = () => void(showThemeEditor = !showThemeEditor)
  let hideEditor = () => void(showThemeEditor = false)
</script>

<style>
  .themeButton {
    background: none;
    color: var(--text-color);
  }
  .active {
    background:lightsalmon;
  }
  .themeButtonContainer {
    display: flex;
  }
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
  li.mobileExternal {
    display: none;
  }
  @media (max-width: 480px) {
    ul {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
    }
    li.divider {
      display: none;
    }
    li.external {
      display: none;
    }
    li.mobileExternal {
      display: flex;
      justify-content: space-between;
    }
  }

  /* clearfix */
  ul::after {
    content: '';
    display: block;
    clear: both;
  }

  li {
    display: block;
    float: left;
    /* transition: all 1s; */
  }
  /* li:hover {
    font-size: 1.25rem;
  } */
  li.divider {
    width: 100%;
  }

  .selected {
    position: relative;
    display: inline-block;
  }

  .headerNav .selected::after {
    position: absolute;
    content: '';
    width: calc(100% - 1em);
    height: 2px;
    background-color: rgb(255, 62, 0);
    display: block;
    bottom: -1px;
  }

  .footerNav .selected::before {
    position: absolute;
    content: '';
    width: calc(100% - 1em);
    height: 2px;
    background-color: rgb(255, 62, 0);
    display: block;
    top: -1px;
  }

  .block {
    text-decoration: none;
    padding: 1em 0.5em;
    display: block;
  }

  span {
    background: linear-gradient(to right, #647bd8, #93199f);
    -webkit-background-clip: text;
    background-clip: text;
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

<svelte:body on:click={hideEditor} />

<nav class={(isFooter && 'footerNav') || 'headerNav'}>
  <ul>
    <li class="me block">
      <a href=".">
        <span>swyx.io</span>
      </a>
    </li>
    <li>
      <a
        class={'block ' + (segment === 'about' ? 'selected' : '')}
        href="/about">
        about
      </a>
    </li>

    <li>
      <a
        rel="prefetch"
        class={'block ' + (segment === 'writing' ? 'selected' : '')}
        href="/writing">
        writing
      </a>
    </li>
    <li>
      <a
        rel="prefetch"
        class={'block ' + (segment === 'speaking' ? 'selected' : '')}
        href="/speaking">
        speaking
      </a>
    </li>
    <li>
      <a class="block" href="https://tinyletter.com/swyx">mailinglist</a>
    </li>
    <li class="themeButtonContainer" class:showThemeEditor>
      <button class="themeButton" on:click|stopPropagation={toggleEditor}>change theme</button>
    </li>
    <li class="divider">{''}</li>
    <li class="mobileExternal block">
      <a href="https://swyx.io/rss.xml" target="_blank">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          aria-hidden="true">
          <path
            d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796
            0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001
            3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966
            11.022
            11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046
            19.152 8.594 19.183
            19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z" />
        </svg>
      </a>

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
    <li class="external block">
      <a href="https://swyx.io/rss.xml" title="RSS" target="_blank">
        <svg
          class="icon"
          viewBox="0 0 30 30"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          aria-hidden="true">
          <path
            d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796
            0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001
            3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966
            11.022
            11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046
            19.152 8.594 19.183
            19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z" />
        </svg>
      </a>
    </li>
    <li class="external block">
      <a
        href="https://twitter.com/swyx"
        title="twitter"
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
            d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66
            10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5
            4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />

        </svg>
      </a>
    </li>
    <li class="external block">
      <a
        title="github source of this site"
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
    <li class="external block">
      <a title="search" href="/search">
        <svg
          class="icon"
          viewBox="-2 -2 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          aria-hidden="true">
          <path
            d="M15.853 16.56c-1.683 1.517-3.911 2.44-6.353 2.44-5.243
            0-9.5-4.257-9.5-9.5s4.257-9.5 9.5-9.5 9.5 4.257 9.5 9.5c0 2.442-.923
            4.67-2.44 6.353l7.44 7.44-.707.707-7.44-7.44zm-6.353-15.56c4.691 0
            8.5 3.809 8.5 8.5s-3.809 8.5-8.5 8.5-8.5-3.809-8.5-8.5 3.809-8.5
            8.5-8.5z" />
        </svg>
      </a>
    </li>
  </ul>
</nav>
{#if showThemeEditor}
<ThemeEditor />
{/if}