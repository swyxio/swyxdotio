<style>
  .content {
    padding: 1em;
    max-width: 75ch;
    margin: 0 auto;
    overflow: auto;
  }
  .content :global(h2) {
    font-weight: bold;
  }
  .content :global(h3) {
    font-weight: bold;
  }

  .content :global(code) {
    font-size: 90%;
    background-color: #292d3e;
    padding: 0.25em 0.5em;
  }
  .content :global(pre) {
    font-size: 90%;
    background-color: #292d3e;
    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.05);
    padding: 1em;
    border-radius: 2px;
    overflow-x: auto;
  }

  .content :global(pre) :global(code) {
    background-color: transparent;
    padding: 0;
  }

  .content :global(blockquote) {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
  }

  .content :global(ul) {
    line-height: 1.5;
  }

  .content :global(li) {
    margin: 0 0 0.5em 0;
  }
  .content :global(.icon-link) {
    font-size: smaller;
  }

  .content :global(img) {
    max-width: 80%;
    margin: 0 auto;
    display: block;
  }
  @media (min-width: 480px) {
    .content :global(a)::before {
      content: attr(href);
      position: absolute;
      transform: translate(-10rem, 1.5rem) scale(0);
      background: linear-gradient(45deg, var(--hover-color-primary),var(--hover-color-secondary));
      visibility: visible;
      transition: all 0.5s;
      opacity: 0;
    }
    .content :global(a):hover::before {
      opacity: 1;
      transform: translateY(1.5rem) scale(1);
    }
  }

  :global(#table-of-contents) {
    width: 50%;
    font-size: 1.5em;
    font-weight: bold;
    margin: 0 0 0em 0.25em;
  }
  :global(#table-of-contents + ul) {
    width: 40%;
    min-width: 200px;
    background: var(--bg-color-secondary);
    /* font-size: 0.8em; */
    /* position: sticky; */
    padding: 1em 2em;
    margin: 0 0 0.5em 0.5em;
  }
  :global(#table-of-contents + ul li, #table-of-contents + ul li p) {
    margin: 0;
  }
  :global(section) {
    margin-top: 3rem;
  }
  /* :global(section:nth-child(even)) {
    background-color: white;
  }

  :global(section:nth-child(odd)) {
    background-color: papayawhip;
  } */
</style>

<div class="content">
  <slot />
</div>
