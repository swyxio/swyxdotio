<script>
  import MobileMenu from '../components/Home/MobileMenu.svelte';
  export let templateHtml, settings;
</script>

<style global lang="postcss">
  /* purgecss start ignore */
  @tailwind base;

  @tailwind components;
  /* purgecss end ignore */

  @tailwind utilities;
</style>

<svelte:head>
  <link rel="stylesheet" href="{settings.locations.assets.replace('./public', '')}style.css" />
  <link rel="stylesheet" href="https://unpkg.com/balloon-css/balloon.min.css" />
  <script>
    if ('themePreference' in localStorage && localStorage.themePreference === 'dark') {
      document.querySelector('html').classList.add('dark');
    } else if (!('themePreference' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.querySelector('html').classList.add('dark');
    }
  </script>
</svelte:head>
<div>
  <div class="relative bg-gray-800 overflow-hidden">
    <div class="relative pt-6 pb-12 sm:pb-32">
      <MobileMenu hydrate-client={{}} />
      <main class="mt-8 sm:mt-16 md:mt-20 lg:mt-24">
        {@html templateHtml}
      </main>
    </div>
  </div>
</div>
