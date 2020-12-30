<script>
  export let blog
</script>

<div class="hover:bg-red-100">
  <div class="flex gap-2">
    <!-- <a href="#" class="inline-block"> -->
    {#each blog.data.categories || ['uncategorized'] as tag}
      <span
        class="inline-flex items-center px-3 py-0.5 rounded-full text-sm
          font-medium leading-5 bg-indigo-100 text-indigo-800">
        {tag}
      </span>
    {/each}
    <!-- </a> -->
  </div>
  <a href={blog.slug} class="block">
    <h3
      class="mt-4 text-xl leading-7 font-semibold text-gray-900
        hover:text-blue-700">
      {blog.data.title}
    </h3>
    <!-- <pre>{JSON.stringify(blog.data, null, 2)}</pre> -->
    {#if blog.data.description}
    <p class="mt-3 text-base leading-6 text-gray-500 hover:text-indigo-700">
      {blog.data.description}
    </p>
    {/if}
  </a>
  <!-- <div class="mt-6 flex items-center">
    <div class="flex-shrink-0">
      <a href="#">
        <img class="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="">
      </a>
    </div>
    <div class="ml-3">
      <p class="text-sm leading-5 font-medium text-gray-900">
        <a href="#">
          Paul York
        </a>
      </p>
      <div class="flex text-sm leading-5 text-gray-500">
        <time datetime="2020-03-16">
          Mar 16, 2020
        </time>
        <span class="mx-1">
          &middot;
        </span>
        <span>
          6 min read
        </span>
      </div>
    </div>
  </div> -->
</div>
