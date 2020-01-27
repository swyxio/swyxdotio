<script>
  import { themeStore } from '../theme.js'
  import { fly } from 'svelte/transition';
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
    transition: all 0.4s ease;
    background: rgba(0,0,0,0.75);
    position: fixed;
    width: 100%;
    position: fixed;
    max-width: 80ch;
    z-index: 999;
    padding: 2rem;
    bottom: 10rem;
    left: calc(25vw - 6rem);
    color: white;
  }
  .PresetContainer {
    display: flex;
    align-items: center;
  }

  /* mobile */
  @media (max-width: 480px) {
    #themeEditor {
      left: 0;
    }
    .customColorSelectorContainer {
      display: flex;
      flex-direction: column;
    }
  }


/* https://codepen.io/chriscoyier/pen/zYYZaGP */
  /* class applies to select element itself, not a wrapper element */
.select-css {
	display: block;
	font-size: 16px;
	font-family: sans-serif;
	font-weight: 700;
	color: var(--text-color);
	line-height: 1.3;
	padding: .6em 1.4em .5em .8em;
	width: 100%;
	max-width: 20ch;
	box-sizing: border-box;
	margin: 0;
  margin-left: 1em;
	border: 1px solid #aaa;
	box-shadow: 0 1px 0 1px rgba(0,0,0,.04);
	border-radius: .5em;
	-moz-appearance: none;
	-webkit-appearance: none;
	appearance: none;
	background-color: var(--bg-color);
	/* note: bg image below uses 2 urls. The first is an svg data uri for the arrow icon, and the second is the gradient. 
		for the icon, if you want to change the color, be sure to use `%23` instead of `#`, since it's a url. You can also swap in a different svg icon or an external image reference
		
	*/
	background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'),
	  linear-gradient(to bottom, var(--bg-color) 0%,var(--bg-color) 100%);
	  /* linear-gradient(to bottom, #ffffff 0%,#e5e5e5 100%); */
	background-repeat: no-repeat, repeat;
	/* arrow icon position (1em from the right, 50% vertical) , then gradient position*/
	background-position: right .7em top 50%, 0 0;
	/* icon size, then gradient */
	background-size: .65em auto, 100%;
}
/* Hide arrow icon in IE browsers */
.select-css::-ms-expand {
	display: none;
}
/* Hover style */
.select-css:hover {
	border-color: #888;
}
/* Focus style */
.select-css:focus {
	border-color: #aaa;
	/* It'd be nice to use -webkit-focus-ring-color here but it doesn't work on box-shadow */
	box-shadow: 0 0 1px 3px rgba(59, 153, 252, .7);
	box-shadow: 0 0 0 3px -moz-mac-focusring;
	color: #222; 
	outline: none;
}

/* Set options to normal weight */
.select-css option {
	font-weight:normal;
}


</style>
<!-- <div> -->
  <form id="themeEditor" on:click|stopPropagation={noop} transition:fly>
    <div class="PresetContainer">
      Preset:
      <select class="select-css" bind:value={selectedPreset} name="themeSelector" id="themeSelector">
        <option>custom</option>
        <option>light</option>
        <option>default</option>
      </select>
    </div>
    {#if selectedPreset === 'custom'}
    <div class="customColorSelectorContainer">
      <label> --bg-color:
        <input type='color' bind:value={$themeStore.bgColor}  placeholder='any css color value'>
      </label>
      <label> --text-color:
        <input type='color' bind:value={$themeStore.textColor}  placeholder='any css color value'>
      </label>
      <label> --link-color:
        <input type='color' bind:value={$themeStore.linkColor} placeholder='any css color value'>
      </label>
    </div>
    {/if}
    <span>⚠️ This is a WIP feature! Ideas welcome
    </span>
  </form>
<!-- </div> -->