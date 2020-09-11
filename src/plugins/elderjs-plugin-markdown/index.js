const glob = require('glob');
const path = require('path');
const fs = require('fs');
const grayMatter = require('gray-matter');
const remark = require('remark');
const remarkHtml = require('remark-html');
require('dotenv-safe').config(); // have DEV_TO_API_KEY in process.env
const fetch = require('node-fetch');
const { title } = require('process');

async function parseMarkdown(markdown) {
  const result = await remark().use(remarkHtml).process(markdown);
  return result.toString();
}

async function getFromDevTo() {
  let allArticles = [];
  let page = 0;
  let per_page = 300; // can go up to 1000
  let latestResult = [];
  do {
    page += 1; // bump page up by 1 every loop
    latestResult = await fetch(`https://dev.to/api/articles/me/published?page=${page}&per_page=${per_page}`, {
      headers: {
        'api-key': process.env.DEV_TO_API_KEY,
      },
    })
      .then((res) => res.json())
      .then((x) => (allArticles = allArticles.concat(x)))
      .catch((err) => {
        console.error(err); // very basic error handling, customize as needed
        throw new Error(`error fetching page ${page}, {err}`);
      });
  } while (latestResult.length === per_page);
  return allArticles;
}

const plugin = {
  name: 'elderjs-plugin-markdown',
  description:
    'Reads and collects markdown content from specified routes. It automatically adds found markdown files as requests on allRequests',
  init: (plugin) => {
    const { config, settings } = plugin;

    // used to store the data in the plugin's closure so it is persisted between loads
    plugin.markdown = [];
    plugin.requests = [];

    // (async function () {
    //   let articles = await getFromDevTo();
    //   console.log('devtolength', articles.length)
    //   articles.forEach((article) => {
    //     let {
    //       // data,
    //       content,
    //     } = grayMatter(article.body_markdown);
    //     // if (!data.title) data.title = article.title
    //     // if (!data.slug) data.slug = article.slug
    //     plugin.markdown.push({
    //       slug: article.slug,
    //       data: {
    //         title: article.title,
    //         slug: article.slug,
    //         description: article.desc || article.description,
    //         tag_list: article.tag_list,
    //       },
    //       content,
    //     });
    //   });
    //   fs.writeFileSync('test.json', JSON.stringify(plugin.markdown, null, 2))
    // })();

    if (config && Array.isArray(config.routes) && config.routes.length > 0) {
      for (const route of config.routes) {
        const mdsInRoute = path.resolve(process.cwd(), settings.locations.srcFolder, './routes/', route);
        // console.log(`${mdsInRoute}/*.md`);
        const mdFiles = glob.sync(`${mdsInRoute}/*.md`);

        for (const file of mdFiles) {
          const md = fs.readFileSync(file, 'utf-8');
          const { data, content } = grayMatter(md);

          let fileSlug = file.replace('.md', '').split('/').pop();

          if (fileSlug.includes(' ')) {
            fileSlug = fileSlug.replace(/ /gim, '-');
          }

          if (data.slug) {
            plugin.markdown.push({
              slug: data.slug,
              data,
              content,
            });
            plugin.requests.push({ slug: data.slug, route });
          } else {
            plugin.markdown.push({
              slug: fileSlug,
              data,
              content,
            });
            plugin.requests.push({ slug: fileSlug, route });
          }
        }
      }
    }
    return plugin;
  },
  config: {},
  hooks: [
    {
      hook: 'bootstrap',
      name: 'addMdFilesToDataObject',
      description: 'Add parsed .md content and data to the data object',
      priority: 50, // default
      run: async ({ data, plugin }) => {
        return {
          data: { ...data, markdown: plugin.markdown },
        };
      },
    },
    {
      hook: 'allRequests',
      name: 'mdFilesToAllRequests',
      description: 'Add collected md files to allRequests array.',
      priority: 50, // default
      run: async ({ allRequests, plugin }) => {
        return {
          allRequests: [...allRequests, ...plugin.requests],
        };
      },
    },
    {
      hook: 'data',
      name: 'addFrontmatterAndHtmlToDataForRequest',
      description: 'Adds parsed frontmatter and html to the data object for the specific request.',
      priority: 50,
      run: async ({ request, data }) => {
        if (data.markdown) {
          const markdown = data.markdown.find((m) => m.slug === request.slug);
          if (markdown) {
            const { content, data: frontmatter } = markdown;
            const html = await parseMarkdown(content);
            return {
              data: {
                ...data,
                frontmatter,
                html,
              },
            };
          }
        }
      },
    },
  ],
};

module.exports = plugin;
exports.default = plugin;
