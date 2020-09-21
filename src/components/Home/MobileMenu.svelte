<script>
  import { scale } from 'svelte/transition';
  let isMenuOpen = false;
  import IconList from '../IconList/IconList.svelte'
</script>

<nav class="relative max-w-screen-xl mx-auto flex items-center justify-between px-4 sm:px-6 pt-6 pb-6 sm:pb-12">
  <div class="flex items-center flex-1">
    <div class="flex items-center justify-between w-full md:w-auto">
      <a href="/" aria-label="Home" class="text-white"> swyx.io </a>
      <div class="-mr-2 flex items-center md:hidden">
        <button
          on:click={() => (isMenuOpen = true)}
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:bg-gray-700
            focus:outline-none focus:bg-gray-700 transition duration-150 ease-in-out"
          id="main-menu"
          aria-label="Main menu"
          aria-haspopup="true">
          <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
    <div class="hidden space-x-10 md:flex md:ml-10">
      <a href="/ideas" class="font-medium text-teal-400 hover:text-red-500 transition duration-150 ease-in-out">Ideas</a>
      <!-- <a href="#d" class="font-medium text-teal-400 hover:text-red-500 transition duration-150 ease-in-out">Features</a> -->
    </div>
  </div>
  <!-- <div class="hidden md:flex">
    <a href="#" class="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:shadow-outline-gray focus:border-gray-700 active:bg-gray-700 transition duration-150 ease-in-out">
      Log in
    </a>
  </div> -->
  <IconList />
</nav>

{#if isMenuOpen}
  <div
    transition:scale={{ duration: 300, start: 0.9 }}
    class="absolute top-0 inset-x-0 p-2 transition transform origin-top-right md:hidden">
    <div class="rounded-lg shadow-md">
      <div
        class="rounded-lg bg-white shadow-xs overflow-hidden"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="main-menu">
        <div class="px-5 pt-4 flex items-center justify-between">
          <div><img class="h-8 w-auto" src="https://tailwindui.com/img/logos/workflow-mark-on-white.svg" alt="" /></div>
          <div class="-mr-2">
            <button
              on:click={() => (isMenuOpen = false)}
              type="button"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:bg-gray-100
                focus:outline-none focus:bg-gray-100 focus:text-gray-500 transition duration-150 ease-in-out"
              aria-label="Close menu">
              <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="space-y-1 px-2 pt-2 pb-3">
          <a
            href="#a"
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50
              focus:outline-none focus:text-gray-900 focus:bg-gray-50 transition duration-150 ease-in-out"
            role="menuitem">Product</a>
          <a
            href="#b"
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50
              focus:outline-none focus:text-gray-900 focus:bg-gray-50 transition duration-150 ease-in-out"
            role="menuitem">Features</a>
        </div>
        <!-- <div>
          <a href="#" class="block w-full px-5 py-3 text-center font-medium text-indigo-600 bg-gray-50 hover:bg-gray-100 hover:text-indigo-700 focus:outline-none focus:bg-gray-100 focus:text-indigo-700 transition duration-150 ease-in-out" role="menuitem">
            Log in
          </a>
        </div> -->
      </div>
    </div>
  </div>
{/if}
