<script>
  import { themeStore } from '../theme.js'
  import { fly } from 'svelte/transition';
  let noop = () => { /* noop */ }
  let breakloop = 0
  let loopLimit = 1000000 // prevent against accidental infinite loop
  $: {
    if (breakloop  < loopLimit) {
      if ($themeStore.name !== 'custom') {
        const presetThemes = [
          {
            name: 'custom'
          },
          {
            name: 'light',
            bgColor: "#eeeeee",
            textColor: "#323179",
            linkColor: "#3a90ef",
            lineLength: "69ch",
          },
          {
            name: 'default',
            bgColor: '#1d1f21',
            textColor: '#eeeeee',
            linkColor: '#2cb67d',
            lineLength: "69ch"
          },
        ]
        let temp = presetThemes.find(theme => theme.name === $themeStore.name)
        $themeStore = temp
      }
    }
  }
</script>

<form id="themeEditor" on:click|stopPropagation={noop} transition:fly>
  <div class="PresetContainer">
    Preset:
    <select class="select-css" bind:value={$themeStore.name} name="themeSelector" id="themeSelector">
      <option>custom</option>
      <option>light</option>
      <option>default</option>
    </select>
  </div>
  {#if $themeStore.name === 'custom'}
  <div class="customColorSelectorContainer">
    <label> --bg-color:
      <input type='color' bind:value={$themeStore.bgColor}  placeholder='any css color value'>
    </label>
    <label> --text-color:
      <input type='color' bind:value={$themeStore.textColor}  placeholder='any css color value'>
    </label>
    <label> --link-color:
      <input type='color' bind:value={$themeStore.linkColor} placeholder='any css color value'>
    </label><label> --line-length:
      <input type='text' bind:value={$themeStore.lineLength} placeholder='any css length eg 600px'>
    </label>
  </div>
  {/if}
  <span>⚠️ This is a WIP feature! Ideas welcome
  </span>
</form>
