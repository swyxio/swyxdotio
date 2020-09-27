<script>
  import Nav from '../components/Nav.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { themeStore } from '../theme.js'
  export let segment

  onMount(renderCSS)
  onDestroy(() => {
    if (typeof document === 'undefined') return // SSR
    var ss = document.getElementById("unique-stylesheet-id")
    ss.innerHTML = '' // not actually sure if i need this
  })
  let _themeStore // $ store syntax buggy
  themeStore.subscribe(v => {
    _themeStore = v
    renderCSS()
  })
  function renderCSS() {
    if (typeof document === 'undefined') return // SSR
    var ss = document.getElementById("unique-stylesheet-id");
    if (!ss) return // not rendered yet
    let string = ``
    if ($themeStore.bgColor) string += `--bg-color: ${$themeStore.bgColor};`
    if ($themeStore.textColor) string += `--text-color: ${$themeStore.textColor};`
    if ($themeStore.linkColor) string += `--link-color: ${$themeStore.linkColor};`
    if ($themeStore.lineLength) string += `--line-length: ${$themeStore.lineLength};`
    ss.innerHTML = `html { ${string} }`
  }
</script>

<svelte:head>
  <style id="unique-stylesheet-id"> </style>
  <script>
    (function() {
      let temp = localStorage.getItem('swyx_io_themeStore')
      if (temp) {
        temp = JSON.parse(temp) // store object
        if (typeof document === 'undefined') return // SSR
        var ss = document.getElementById("unique-stylesheet-id");
        if (!ss) return // not rendered yet
        let string = ``
        if (temp.bgColor) string += `--bg-color: ${temp.bgColor};`
        if (temp.textColor) string += `--text-color: ${temp.textColor};`
        if (temp.linkColor) string += `--link-color: ${temp.linkColor};`
        if (temp.lineLength) string += `--line-length: ${temp.lineLength};`
        ss.innerHTML = `html { ${string} }`
      }
    })()
  </script>
</svelte:head>

<style>
  main.layoutmain {
    flex: 1;
    position: relative;
    box-sizing: border-box;
    line-height: 1.8em;
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
