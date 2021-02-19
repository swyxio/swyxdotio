module.exports = [{
  shortcode: "youtube",
  run: async ({ props, content }) => {
    return `<iframe
    src="https://www.youtube.com/embed/${props[0]}"
    title="video123"
    name="video123"
    allow="accelerometer; autoplay; encrypted-media; gyroscope;
    picture-in-picture"
    frameBorder="0"
    webkitallowfullscreen="true"
    mozallowfullscreen="true"
    width="600"
    height="400"
    allowFullScreen
    aria-hidden="true"></iframe>`;
  },
},
{
  shortcode: "twitter",
  run: async ({ props, content }) => {
    return `
    <blockquote class="twitter-tweet" data-lang="en" data-dnt="true" data-theme="dark">
    <a href="https://twitter.com/x/status/${props[0]}"></a></blockquote> 
    <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    `;
  },
}

]
