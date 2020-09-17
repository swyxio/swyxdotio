<script>
  import BlogTeaser from '../../components/BlogTeaser/BlogTeaser.svelte'
  import Showcase from '../../components/Showcase/Showcase.svelte'
  export let data
</script>

<div class="bg-white pt-16 pb-20 px-4 sm:px-6 lg:pt-24 lg:pb-28 lg:px-8">
  <div class="relative max-w-lg mx-auto lg:max-w-7xl">
    <div>
      <h2
        class="text-3xl leading-9 tracking-tight font-extrabold text-gray-900
          sm:text-4xl sm:leading-10">
        Recent publications2
      </h2>
      <p class="mt-3 text-xl leading-7 text-gray-500 sm:mt-4">
        Nullam risus blandit ac aliquam justo ipsum. Quam mauris volutpat massa
        dictumst amet. Sapien tortor lacus arcu.
      </p>
    </div>
  </div>
  <Showcase hydrate-client={{data}} />
  <!-- <div
    class="mt-12 grid gap-16 border-t-2 border-gray-100 pt-12 lg:grid-cols-3
      lg:col-gap-5 lg:row-gap-12">
    {#each data.markdown as blog}
      <BlogTeaser { blog } />
    {/each}
  </div> -->
</div>
