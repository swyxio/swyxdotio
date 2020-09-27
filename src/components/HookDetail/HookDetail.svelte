<script>
  export let hook;
  export let i;

  let hover = false;

  let x, y;

  const hookEntityDefinitions = {
    allRequests: `This represents all of the valid requests Elder.js is aware of. This is collected during bootstrap and can be modified on the 'allRequests' hook. It is important to note that 'allRequests' will be different at the 'requestStart' hook during a build because the requests are split between different processes during build time using the allRequests object.`,
    hookInterface:
      'The hook interface is what defines the "contract" for each hook. It includes what properties the hook has access to and which of those properties can be mutated.',
    customProps: 'An object that represents any custom props added during the "customizeHook" hook',
    errors: 'An array of errors collected during the build process.',
    request:
      'An object that represents the paramaters required to generate a specific page on a specific route. This object originating from the all() query of a route.js file.',
    helpers:
      'An object of helpers loaded from `./src/helpers/index.js` in addition to the Elder.js provided helper functions.',
    data: 'An object that is passed to Svelte templates as the "data" prop.',
    settings: 'An object representing the elder.config.js and other details about the build.',
    routes: 'An object that represents all of the routes registered with Elder.js.',
    hooks: 'An array of all of the hooks that have been validated by Elder.js.',
    query: 'An object that is initially empty but is reserved for plugins and sites to add database or api access to.',
    route: 'An object representing the specific route (similar to a route.js file) for a specific request.',
    headStack:
      'A "stack" of strings to be merged together (a long with cssStack) that are written to the <head> tag. If you are looking to customize the head you\'re probably better looking at the "headString."',
    cssStack:
      'A "stack" of strings to be merged together to create the the cssString prop. This is mainly uses to collect the css strings emitted by SSR\'d Svelte files.',
    styleTag: 'The full style tag that is going to be written to the head of the page.',
    cssString:
      'The the css string that is wrapped in the styleTag. Added purely for convience in case users wanted to minify the css.',
    headString: 'The complete <head></head> string just before it is written to the head.',
    beforeHydrateStack:
      'A "stack" of generally JS script tags that are required to be loaded before a Svelte component is hydrated. This is only written to the page when a Svelte component needs to be hydrated.',
    hydrateStack: 'A "stack" Svelte components that will be hydrated.',
    customJsStack:
      'A "stack" of user specific customJs strings that will to be merged together. This is written after the Svelte components.',
    footerStack: 'A "stack" of strings to be merged together that will be added to the footer tag.',
    htmlString: 'The fully generated html for the page.',
    timings: 'An array of collected timings of the system. These are collected using the performance observer.',
    req: "The 'req' object from Express or Polka when Elder.js is being used as middleware.",
    next: "The 'next' object from Express or Polka when Elder.js is being used as middleware.",
  };
</script>

<style>
  .list {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 13px;
  }

  .list .code {
    cursor: help;
  }

  .hook {
    max-width: 100%;
    text-overflow: wrap;
    padding: 1rem;
    border: 1px solid #ddd;
    border-collapse: collapse;
    margin-bottom: 1rem;
    border-radius: 1rem;
    position: relative;
    background: white;
  }

  .hook-number {
    position: absolute;
    top: 0;
    right: 0px;
    width: 2rem;
    height: 1.75rem;
    border-top-right-radius: 1rem;
    border-bottom-left-radius: 1rem;
    text-align: center;
    padding-top: 3px;
    background: #ddd;
    font-size: 14px;
  }

  .overview {
    margin-right: 1rem;
  }

  @media (min-width: 768px) {
    .hook:nth-child(even) {
      margin-left: 0.5rem;
    }
    .hook:nth-child(odd) {
      margin-right: 0.5rem;
    }
  }

  .use {
    font-size: 14px;
  }
  :global(.use ul) {
    padding-left: 1rem;
  }

  .overview {
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #ddd;
  }
</style>

<div class="hook">

  {#if i || i === 0}
    <span class="hook-number">{i + 1}.</span>
  {/if}

  <div class="overview">
    <span class="hook-name">

      {#if hook.link && hook.link.length > 0}
        <a href={hook.link}>{hook.hook}</a>
      {:else}{hook.hook}{/if}
    </span>
    : {hook.context}
  </div>
  <div class="use">
    {@html hook.use}
  </div>

  <div class="list">
    <strong>Props</strong>
    :
    {#each hook.props as prop}
      <div class="code" data-balloon-length="medium" data-balloon-pos="up" aria-label={hookEntityDefinitions[prop]}>
        {prop}
      </div>
    {/each}
  </div>
  <div class="list">
    <strong>Mutable</strong>
    :
    {#each hook.mutable as mutable}
      <div class="code" data-balloon-length="medium" data-balloon-pos="up" aria-label={hookEntityDefinitions[mutable]}>
        {mutable}
      </div>
    {/each}
  </div>

  {#if hook.advanced}
    <div>
      <small>This hook is an 'advanced' hook meaning it geared towards advanced users or plugins.</small>
    </div>
  {/if}

  <small>{hook.expiremental ? 'Expiremental' : 'Stable'} &middot; Location: {hook.location}</small>
</div>
