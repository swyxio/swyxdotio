<script>
  export let hooks;
  import HookDetail from "../HookDetail/HookDetail.svelte";
</script>

<style>
  .hooks {
    display: grid;
    grid-template-columns: 100%;
  }

  @media (min-width: 768px) {
    .hooks {
      grid-template-columns: 50% 50%;
    }
  }
</style>

<div class="hooks">
  {#each hooks as hook, i}
    <HookDetail {hook} {i} />
  {/each}

</div>
