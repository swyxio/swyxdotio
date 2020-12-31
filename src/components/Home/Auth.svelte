<script>
  import { getContext } from 'svelte'
  import AuthPopup from './AuthPopup.svelte'
  const { open } = getContext('simple-modal')
  const showPopup = () => {
    open(AuthPopup, { message: "It's a popup!" })
  }
</script>

<button on:click={showPopup}>Log In / Sign Up</button>
