<script>
  export let blog;
  export let link;
</script>

<div class="entry">
  <a href={link.blog({ slug: blog.slug })}>{blog.data.title}</a>
  <p>{blog.data.description || blog.data.desc || blog.data.excerpt}</p>
</div>
