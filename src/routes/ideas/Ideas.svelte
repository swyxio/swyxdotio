<script>
  import BlogTeaser from '../../components/BlogTeaser/BlogTeaser.svelte'
  import Showcase from '../../components/Showcase/Showcase.svelte'
  export let data

  let _data = [
    ...data.podcasts.map((x) => void (x.type = 'podcasts') || x),
    ...data.talks.map((x) => void (x.type = 'talks') || x),
    ...data.markdown.map((x) => void (x.data.type = 'markdown') || x.data)
  ]
</script>

<div class="bg-white pt-16 pb-20 px-4 sm:px-6 lg:pt-24 lg:pb-28 lg:px-8">
  <Showcase hydrate-client={{ data: _data }} />
  <!-- <div
    class="mt-12 grid gap-16 border-t-2 border-gray-100 pt-12 lg:grid-cols-3
      lg:col-gap-5 lg:row-gap-12">
    {#each data.markdown as blog}
      <BlogTeaser { blog } />
    {/each}
  </div> -->
</div>
