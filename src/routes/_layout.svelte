<script>
  import Nav from "../components/Nav.svelte";
  export let segment;
</script>

<style>
  main {
    flex: 1;
    position: relative;
    max-width: 56em;
    margin: 0 auto;
    box-sizing: border-box;
    line-height: 1.5em;
  }
  .layout {
    display: flex;
    min-height: 95vh;
    flex-direction: column;
  }
</style>

<div class="layout">
  <Nav {segment} />

  <main>
    <slot />
  </main>

  <Nav isFooter {segment} />
</div>
