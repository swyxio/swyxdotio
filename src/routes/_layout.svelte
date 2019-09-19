<script>
  import Nav from '../components/Nav.svelte'
  export let segment
</script>

<style>
  main.layoutmain {
    flex: 1;
    position: relative;
    box-sizing: border-box;
    line-height: 1.5em;
    margin-top: auto;
    margin-bottom: auto;
  }
  div.layout {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 10px);
    /* https://every-layout.dev/layouts/cover/ */
  }
</style>

<div class="layout">
  <Nav {segment} />

  <main class="layoutmain">
    <slot />
  </main>

  <Nav isFooter {segment} />
</div>
