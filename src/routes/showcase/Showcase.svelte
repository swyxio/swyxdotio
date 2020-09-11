
<script>
  import BlogTeaser from '../../components/BlogTeaser/BlogTeaser.svelte';
  export let data, link;
  
</script>


<div class="blog">
  <div class="entries">
    {#each data.markdown as blog}
      <BlogTeaser {blog} {link} />
    {/each}
  </div>
</div>