<script>
  import MobileMenu from '../components/Home/MobileMenu.svelte'
  import IconList from '../components/IconList/IconList.svelte'
  export let templateHtml, settings
</script>

<style global lang="postcss">
  /* purgecss start ignore */
  @tailwind base;

  @tailwind components;
  /* purgecss end ignore */

  @tailwind utilities;

  /* https://css-tricks.com/the-current-state-of-styling-scrollbars/ */
  body::-webkit-scrollbar-track {
    background-color: var(--bg-color);
  }
  body::-webkit-scrollbar {
    width: 2vw;
  }
  body::-webkit-scrollbar-thumb {
    background: linear-gradient(var(--link-color), var(--text-color));
  }
  @media (min-width: 1000px) {
    body::-webkit-scrollbar-track {
      -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.9);
      background: radial-gradient(
          circle closest-side at 60% 43%,
          var(--bg-color) 26%,
          rgba(187, 0, 51, 0) 27%
        ),
        radial-gradient(
          circle closest-side at 40% 43%,
          var(--bg-color) 26%,
          rgba(187, 0, 51, 0) 27%
        ),
        radial-gradient(
          circle closest-side at 40% 22%,
          #d35 45%,
          rgba(221, 51, 85, 0) 46%
        ),
        radial-gradient(
          circle closest-side at 60% 22%,
          #d35 45%,
          rgba(221, 51, 85, 0) 46%
        ),
        radial-gradient(
          circle closest-side at 50% 35%,
          #d35 30%,
          rgba(221, 51, 85, 0) 31%
        ),
        radial-gradient(
            circle closest-side at 60% 43%,
            var(--bg-color) 26%,
            rgba(187, 0, 51, 0) 27%
          )
          50px 50px,
        radial-gradient(
            circle closest-side at 40% 43%,
            var(--bg-color) 26%,
            rgba(187, 0, 51, 0) 27%
          )
          50px 50px,
        radial-gradient(
            circle closest-side at 40% 22%,
            #d35 45%,
            rgba(221, 51, 85, 0) 46%
          )
          50px 50px,
        radial-gradient(
            circle closest-side at 60% 22%,
            #d35 45%,
            rgba(221, 51, 85, 0) 46%
          )
          50px 50px,
        radial-gradient(
            circle closest-side at 50% 35%,
            #d35 30%,
            rgba(221, 51, 85, 0) 31%
          )
          50px 50px;
      background-color: var(--bg-color);
      background-size: 20px 20px;
    }

    body::-webkit-scrollbar-thumb {
      -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.9);
      border-radius: 10px;
      background-image: -webkit-linear-gradient(
        45deg,
        rgba(170, 170, 225, 0.7) 25%,
        rgba(100, 50, 50, 0.9) 25%,
        rgba(100, 50, 50, 0.9) 50%,
        rgba(170, 170, 225, 0.7) 50%,
        rgba(170, 170, 225, 0.7) 75%,
        rgba(100, 50, 50, 0.9) 75%,
        rgba(100, 50, 50, 0.9)
      );
      background-size: 2rem 2rem;
    }
  }

  /* page border */
  body:before {
    content: '';
    position: fixed;
    max-width: 100vw;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    border-radius: inherit;
    /* background: linear-gradient(var(--brand-color-primary), #9198e5); */
    background: linear-gradient(#ff335f, #9198e5);
  }

  #base {
    transition: background-color 1s ease;
    background: var(--bg-color);
    min-height: calc(100vh - 10px);
    margin: 5px;
  }
</style>

<svelte:head>
  <link
    rel="stylesheet"
    href="{settings.locations.assets.replace('./public', '')}style.css" />
  <link rel="stylesheet" href="https://unpkg.com/balloon-css/balloon.min.css" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="webmention" href="https://webmention.io/www.swyx.io/webmention" />
  <link rel="pingback" href="https://webmention.io/www.swyx.io/xmlrpc" />
  <script>
    if (
      'themePreference' in localStorage &&
      localStorage.themePreference === 'dark'
    ) {
      document.querySelector('html').classList.add('dark')
    } else if (
      !('themePreference' in localStorage) &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      document.querySelector('html').classList.add('dark')
    }
  </script>
</svelte:head>
<div id="base">
  <div class="relative bg-gray-800 overflow-hidden">
    <MobileMenu hydrate-client={{}} />
    <!-- <main class="mt-8 sm:mt-16 md:mt-20 lg:mt-24"> -->
    <main>
      {@html templateHtml}
    </main>
    <!-- <footer class="pt-6 pb-12 sm:pb-32 text-white"> TODO: FOOTER</footer> -->
    <footer
      class="max-w-screen-xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
      <nav class="-mx-5 -my-2 flex flex-wrap justify-center">
        <div class="px-5 py-2">
          <a
            href="/ideas"
            class="text-base leading-6 text-teal-400 hover:text-red-500">
            Ideas
          </a>
        </div>
      </nav>
      <div class="mt-8 flex justify-center">
        <IconList />
      </div>
      <div class="mt-8">
        <p class="text-center text-base leading-6 text-gray-400">
          &copy; 2020 swyx. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</div>
