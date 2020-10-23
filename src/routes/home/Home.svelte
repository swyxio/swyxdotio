<svelte:head>
  <title>swyx's site</title>
  <meta property="og:url" content="https://www.swyx.io/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="swyx.io home" />
  <meta name="Description" content="swyx's home on the Internet" />
  <meta property="og:description" content="swyx's home on the Internet" />
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content="swyx.io home" />
  <meta name="twitter:description" content="swyx's home on the Internet" />
  <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg" />
</svelte:head>

<div class="mx-auto max-w-screen-xl">
  <div class="lg:grid lg:grid-cols-12 lg:gap-8">
    <div
      class="px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6
        lg:text-left lg:flex lg:items-center">
      <div>
        <div
          class="text-sm font-semibold uppercase tracking-wide text-gray-500
            sm:text-base lg:text-sm xl:text-base">
          Shawn <span class="text-teal-500 opacity-75">@Swyx</span> Wang
        </div>
        <!-- <h2
          class="mt-4 text-4xl tracking-tight leading-10 font-extrabold
            text-white sm:mt-5 sm:leading-none sm:text-6xl lg:mt-6 lg:text-5xl
            xl:text-6xl">
          Welcome to <span class="text-indigo-400">swyx.io</span>!
        </h2> -->
        <h2
          class="mt-4 text-4xl tracking-tight leading-10 font-extrabold sm:mt-5
            sm:leading-none sm:text-6xl lg:mt-6 lg:text-5xl xl:text-6xl
            text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-indigo-400
            to-indigo-400">
          Welcome to swyx.io!
        </h2>
        <p
          class="mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg
            xl:text-xl">
          <span class="block">I <a
              rel="noopener"
              href="http://github.com/sw-yx"
              class="underline text-indigo-300 hover:text-indigo-200">code</a>, <a
              rel="noopener"
              href="https://www.swyx.io/speaking/react-hooks"
              class="underline text-indigo-300 hover:text-indigo-200">speak</a>, <a
              rel="noopener"
              href="http://careerchats.transistor.fm/"
              class="underline text-indigo-300 hover:text-indigo-200">podcast</a>,
            and <a
              rel="noopener"
              href="https://egghead.io/s/26zf5"
              class="underline text-indigo-300 hover:text-indigo-200">teach</a>.
            But above all, I <a
              rel="noopener"
              href="/ideas"
              class="underline text-indigo-300 hover:text-indigo-200">write</a> about
            great ideas for developers and infinite builders.
          </span><span>If we share <a
              class="underline text-indigo-300 hover:text-indigo-200"
              href="/about">interests</a>, I'd love to <a href="mailto:swyx@hey.com">connect</a>!</span>
          <!-- I am passionate about Developer Tools and Developer Communities and currently work as a Senior Developer
                Advocate at AWS. In my free time I teach React, TypeScript, Storybook and Node.js CLI's at <a
                  rel="noopener" href="https://egghead.io/s/26zf5">Egghead.io</a>, and help run the <a
                  rel="noopener" href="https://sveltesociety.dev/">Svelte Society</a> community of meetups. -->
        </p>
        <div class="mt-4">
          <span class="text-teal-300">Recently Featured</span>:
          <ul class="list-disc text-gray-300 ml-4 mb-4">
            <li>
              Essay: <a class="text-indigo-300 underline hover:text-indigo-200" href="/svelte-sites-react-apps">Svelte for Sites, React for Apps</a>
            </li>
            <li>
              Talk: <a class="text-indigo-300 underline hover:text-indigo-200" href="https://www.youtube.com/watch?v=D-Sj6jo4o1I">The
                Operating System of You</a>
            </li>
            <li>
              Podcast: <a class="text-indigo-300 underline hover:text-indigo-200" href="https://reactpodcast.com/episodes/114/">Coding Career Handbook on React
                Podcast</a>
            </li>
          </ul>
          <div>👉 <a class="text-indigo-300 underline hover:text-indigo-200" href="/ideas">See All My Essays, Talks, and Podcasts!</a> 👈</div>
        </div>
        <div
          class="mt-5 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
          <p class="text-base font-medium text-indigo-100 text-opacity-75">
            Join 2,000+ developers getting updates when I ship something big!
          </p>
          <form
            action="https://tinyletter.com/swyx"
            method="post"
            target="popupwindow"
            onsubmit="window.open('https://tinyletter.com/swyx', 'popupwindow', 'scrollbars=yes,width=800,height=600');return true"
            class="mt-3 sm:flex">
            <input
              aria-label="Email"
              id="tlemail"
              name="email"
              type="email"
              class="appearance-none block w-full px-3 py-3 border
                border-gray-300 text-base leading-6 rounded-md
                placeholder-gray-500 shadow-sm focus:outline-none
                focus:placeholder-gray-400 focus:shadow-outline-blue
                focus:border-blue-300 transition duration-150 ease-in-out
                sm:flex-1"
              placeholder="I solemnly swear to never spam you." />
            <input type="hidden" value="1" name="embed" />
            <button
              type="submit"
              class="mt-3 w-full px-6 py-3 border border-transparent text-base
                leading-6 font-medium rounded-md text-white bg-indigo-600
                shadow-sm hover:bg-indigo-400 focus:outline-none
                focus:border-gray-300 focus:shadow-outline-gray
                active:bg-indigo-400 transition duration-150 ease-in-out sm:mt-0
                sm:ml-3 sm:flex-shrink-0 sm:inline-flex sm:items-center
                sm:w-auto hover:animate-wiggle">
              Subscribe via Email
            </button>
          </form>
          <p class="mt-3 text-sm leading-5 text-gray-300 text-opacity-75">
            Too soon! <a class="font-medium text-gray-300 text-opacity-75
                underline" rel="noopener" href="https://tinyletter.com/swyx/archive">Show
              me what I'm signing up for!</a>
          </p>
        </div>
        <!-- <p class="mt-8 text-sm text-white uppercase tracking-wide font-semibold sm:mt-10">Used by</p>
              <div class="mt-5 w-full sm:mx-auto sm:max-w-lg lg:ml-0">
                <div class="flex flex-wrap items-start justify-between">
                  <div class="flex justify-center px-1">
                    <img class="h-9 sm:h-10" src="https://tailwindui.com/img/logos/tuple-logo.svg" alt="Tuple">
                  </div>
                  <div class="flex justify-center px-1">
                    <img class="h-9 sm:h-10" src="https://tailwindui.com/img/logos/workcation-logo.svg" alt="Workcation">
                  </div>
                  <div class="flex justify-center px-1">
                    <img class="h-9 sm:h-10" src="https://tailwindui.com/img/logos/statickit-logo.svg" alt="StaticKit">
                  </div>
                </div>
              </div> -->
      </div>
    </div>
    <div
      class="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0
        lg:col-span-6 lg:flex lg:items-center">
      <div class="relative mx-auto w-32 md:w-full rounded-lg lg:max-w-md">
        <a href="/ideas">
          <img
            class="hover:border-4 hover:border-blue-500 
              w-full relative block rounded-full
              md:rounded-lg overflow-hidden focus:outline-none
              focus:shadow-outline"
            src="https://avatars2.githubusercontent.com/u/6764957?u=97ad815028595b73b06ee4b0510e66bbe391228d&v=4&s=400"
            alt="swyx at niseko" />
        </a>
      </div>
    </div>
  </div>
</div>
