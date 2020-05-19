<style>
  h1,
  /* h2, */
  #CTA {
    text-align: center;
    margin: 0 auto;
  }

  #CTA {
    font-size: 2em;
    line-height: 1.25;
    margin: 0 0 2em 0;
  }
  h1 {
    font-size: 2.8em;
    text-transform: uppercase;
    font-weight: 700;
    margin: 0 0 0.5em 0;
  }

  @media (min-width: 480px) {
    h1 {
      font-size: 4em;
    }
  }

  #WebMentions {
    margin: 0 auto;
    font-style: italic;
    width: 80%;
    min-width: 300px;
  }
  h3 {
    display: inline;
  }
  .WebMentionsContainer {
    border: 1px dashed var(--link-color);
    padding: 1rem;
    margin-top: 1rem;
    color: var(--text-color);
  }
  .WebMentionsContainer ul {
    list-style-type: none;
    padding: 0;
  }
  .WebMentionReply {
    margin-top: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .Avatar {
    margin-right: 16px;
    width: 40px;
    flex: 0 0 auto;
    align-self: start;
  }
  .Avatar img {
    width: 40px;
    max-width: 100%;
    height: 40px;
    margin: 0px;
    border-radius: 50%;
  }
  .FetchMore {
    width: 20ch;
    font-size: 1.5rem;
    background-color: transparent;
    color: var(--link-color);
    border: 0;
    text-align: left;
  }
  .PostHeader {
    background-color: var(--bg-color-secondary);
  }
  .PostHeader a {
    overflow-wrap: break-word;
  }
</style>

<svelte:head>
  <title>swyx's site | What I am doing Now</title>
</svelte:head>
<article>
  <h1>What I am Doing Now</h1>
  <div id="CTA">
    <p>
      <a href="/writing/i-m-writing-a-book-45a8">
        <b>I'm Writing a Book!</b>
      </a>
      Launching my first product on Jun 1, while I wait for my next job to
      beign.
    </p>
  </div>

</article>
