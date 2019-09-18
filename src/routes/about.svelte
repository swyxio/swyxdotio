<script>
  import { fade, fly } from "svelte/transition";
</script>

<style>
  article {
    padding: 1rem;
    text-align: center;
  }
</style>

<svelte:head>
  <title>About</title>
</svelte:head>

<article
  in:fly={{ y: 200, duration: 2000, delay: 500 }}
  out:fade={{ scale: 0, duration: 300 }}>
  <h1>About this site</h1>

  <p>This is the 'about' page. There's not much here.</p>
</article>
