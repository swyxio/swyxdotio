<script>
  import { scale } from 'svelte/transition'
  let isMenuOpen = false
  import IconList from '../IconList/IconList.svelte'
  import { clickOutside } from './clickOutside.js';

  function handleClickOutside() {
    if (isMenuOpen) isMenuOpen = false
  }

</script>

<nav class="relative max-w-screen-xl mx-auto flex items-center justify-between px-4
    sm:px-6 pt-6 pb-6 sm:pb-12">
  <div class="flex items-center flex-1">
    <div class="flex items-center justify-between w-full md:w-auto">
      <div class="text-sm font-semibold uppercase tracking-wide text-gray-500
      sm:text-base lg:text-sm xl:text-base">
        <a href="/" aria-label="Home" class="text-indigo-700 dark:text-indigo-400 hover:text-yellow-400 dark:hover:text-yellow-200">
          Shawn <span class="font-bold text-indigo-800 dark:text-indigo-200 opacity-75 hover:text-yellow-400 dark:hover:text-yellow-200">@Swyx</span> Wang
        </a>
      </div>
    </div>
    <div class="hidden space-x-10 md:flex md:ml-10">
      <a href="/ideas" class="font-medium text-indigo-800 dark:text-indigo-400 dark:hover:text-red-800 hover:text-red-500 transition
          duration-150 ease-in-out">Ideas</a>
      <a href="/about" class="font-medium text-indigo-800 dark:text-indigo-400 dark:hover:text-red-800 hover:text-red-500 transition
          duration-150 ease-in-out">About</a>
    </div>
  </div>
  <!-- <div class="hidden md:flex">
    <a href="#" class="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-gray focus:border-gray-700 active:bg-gray-700 transition duration-150 ease-in-out">
      Log in
    </a>
  </div> -->

  <div class="hidden md:flex">
    <IconList />
  </div>
  <div class="-mr-2 flex items-center md:hidden">
    <button on:click={()=> (isMenuOpen = true)}
      type="button"
      class="inline-flex items-center justify-center p-2 rounded-md
      text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-700
      transition duration-150 ease-in-out"
      id="main-menu"
      aria-label="Main menu"
      aria-haspopup="true">
      <svg class="h-6 w-6 ml-2" stroke="currentColor" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>
</nav>

{#if isMenuOpen}
  <div
    transition:scale={{ duration: 300, start: 0.9 }}
    use:clickOutside 
    on:click_outside={handleClickOutside}
    class="absolute top-0 inset-x-0 p-2 transition transform origin-top-right
      md:hidden z-50">
    <div class="rounded-lg shadow-md">
      <div
        class="rounded-lg bg-white shadow-xs overflow-hidden"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="main-menu">
        <div class="px-5 pt-4 flex items-center justify-between">
          <!-- <div><img class="h-8 w-auto" src="https://tailwindui.com/img/logos/workflow-mark-on-white.svg" alt="" /></div> -->
          <a href="/" aria-label="Home" class="text-indigo-700"> swyx.io </a>
          <div class="-mr-2">
            <button
              on:click={() => (isMenuOpen = false)}
              type="button"
              class="inline-flex items-center justify-center m-2 rounded-md
                text-gray-400 hover:bg-gray-100 focus:outline-none
                focus:bg-gray-100 focus:text-gray-500 transition duration-150
                ease-in-out"
              aria-label="Close menu">
              <svg
                class="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="space-y-1 px-2 pt-2 pb-3">
          <a
            href="/ideas"
            class="block px-3 py-2 rounded-md text-base font-medium
              text-gray-700 hover:text-gray-900 hover:bg-gray-50
              focus:outline-none focus:text-gray-900 focus:bg-gray-50 transition
              duration-150 ease-in-out"
            role="menuitem">Ideas</a>
          <a
            href="/about"
            class="block px-3 py-2 rounded-md text-base font-medium
              text-gray-700 hover:text-gray-900 hover:bg-gray-50
              focus:outline-none focus:text-gray-900 focus:bg-gray-50 transition
              duration-150 ease-in-out"
            role="menuitem">About</a>
          <a
            href="https://twitter.com/swyx"
            class="block px-3 py-2 rounded-md text-base font-medium
              text-gray-700 hover:text-gray-900 hover:bg-gray-50
              focus:outline-none focus:text-gray-900 focus:bg-gray-50 transition
              duration-150 ease-in-out"
            role="menuitem">My Twitter</a>
          <a
            href="https://github.com/sw-yx"
            class="block px-3 py-2 rounded-md text-base font-medium
              text-gray-700 hover:text-gray-900 hover:bg-gray-50
              focus:outline-none focus:text-gray-900 focus:bg-gray-50 transition
              duration-150 ease-in-out"
            role="menuitem">My GitHub</a>
          <a
            href="https://tinyletter.com/swyx"
            class="block px-3 py-2 rounded-md text-base font-medium
              bg-purple-200 hover:bg-green-200 text-gray-700 hover:text-gray-900
              hover:bg-gray-50 focus:outline-none focus:text-gray-900
              focus:bg-gray-50 transition duration-150 ease-in-out"
            role="menuitem">My Mailing List</a>
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