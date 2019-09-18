<script>
  import { fade, fly } from "svelte/transition";
</script>

<style>
  h1,
  h2 {
    text-align: center;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.8em;
    text-transform: uppercase;
    font-weight: 700;
    margin: 0 0 0.5em 0;
  }

  @media (min-width: 480px) {
    h1 {
      font-size: 4em;
    }
  }
</style>

<svelte:head>
  <title>swyx's site</title>
</svelte:head>

<article
  in:fly={{ y: 200, duration: 2000, delay: 500 }}
  out:fade={{ scale: 0, duration: 300 }}>
  <h1 transition:fade>swyx's site!</h1>
  <h2>
    Latest Post:
    <a href="/writing/js-tooling">
      <b>Why JavaScript Tooling Sucks</b>
    </a>
  </h2>
</article>
