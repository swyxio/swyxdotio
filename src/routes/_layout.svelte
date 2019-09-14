<script>
  import Nav from "../components/Nav.svelte";
  export let segment;
</script>

<style>
  main {
    position: relative;
    max-width: 56em;
    padding: 2em;
    margin: 0 auto;
    box-sizing: border-box;
  }
</style>

<svelte:head>
    <meta property="og:url" content="https://www.swyx.io/">
    <meta property="og:type" content="article">
    <meta property="og:title" content="swyx.io personal site">
    <meta property="og:description" content="shawn / @swyx / site">
    <meta property="og:image" content="https://www.swyx.io/swyx.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:creator" content="https://twitter.com/swyx/">
    <meta name="twitter:title" content="swyx.io personal site">
    <meta name="twitter:description" content="shawn / @swyx / site">
    <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg">
</svelte:head>


<Nav {segment} />

<main>
  <slot />
</main>
