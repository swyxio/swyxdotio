<script>
  // import { fade, fly } from "svelte/transition";
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

<article>
  <h1>swyx's site!</h1>
  <h2>
    Latest Post:
    <a href="/writing/donating-to-freecodecamp">
      <b>Donating $10k to FreeCodeCamp</b>
    </a>
  </h2>
</article>
