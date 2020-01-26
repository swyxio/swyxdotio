<script>
  import { themeStore } from '../theme.js'
  let noop = () => { /* noop */ }
  let selectedPreset = $themeStore.name
  let breakloop = 0
  let loopLimit = 1000000 // prevent against accidental infinite loop
  $: {
    if (breakloop  < loopLimit) {
      if (selectedPreset !== 'custom') setPreset()
      console.log($themeStore)
      // console.log({ breakloop })
    }
  }
  function setPreset() {
    let temp = presetThemes.find(theme => theme.name === selectedPreset)
    $themeStore = temp
  }
  const presetThemes = [
    {
      name: 'custom'
    },
    {
      name: 'light',
      bgColor: "#d2bfb0",
      textColor: "#2a2966",
      linkColor: "#d4521d"
    },
    {
      name: 'default',
      bgColor: '#1d1f21',
      textColor: '#eeeeee',
      linkColor: '#2cb67d'
    },
  ]
</script>
<style>
  #themeEditor {
    max-width: 100ch;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
  }
</style>
<div on:click|stopPropagation={noop}>
  <form id="themeEditor">
    <div>
      Preset:
      <select bind:value={selectedPreset} name="themeSelector" id="themeSelector">
        <option>custom</option>
        <option>light</option>
        <option>default</option>
      </select>
    </div>
    {#if selectedPreset === 'custom'}
    <label> --bg-color:
      <input type='color' bind:value={$themeStore.bgColor}  placeholder='any css color value'>
    </label>
    <label> --text-color:
      <input type='color' bind:value={$themeStore.textColor}  placeholder='any css color value'>
    </label>
    <label> --link-color:
      <input type='color' bind:value={$themeStore.linkColor} placeholder='any css color value'>
    </label>
    {/if}
    <span>⚠️ This is a WIP feature! Ideas welcome
    </span>
  </form>
</div>