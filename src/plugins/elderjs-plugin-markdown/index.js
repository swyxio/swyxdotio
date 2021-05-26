const glob = require('glob');
const path = require('path');
const fs = require('fs');
const grayMatter = require('gray-matter');
// const remark = require('remark');
// const remarkHtml = require('remark-html');
require('dotenv-safe').config(); // have DEV_TO_API_KEY in process.env
const fetch = require('node-fetch');
const yaml = require('js-yaml')
const unified = require('unified')
const vfile = require('vfile')
const report = require('vfile-reporter')

let _preset = {
  settings: {},
  plugins: [
    require('remark-parse'),
    require('remark-slug'),
    [
      require('remark-autolink-headings'),
      {
        behavior: 'wrap',
        linkProperties: { class: 'highlightOnHover' }
        // content: {
        //   type: 'element',
        //   tagName: 'span',
        //   properties: { className: ['icon', 'icon-link'] },
        //   children: [{ type: 'text', value: ' 🔗' }],
        // },
      },
    ],
    require('remark-toc'),
    require('remark-sectionize'),
    require('remark-rehype'),
    require('rehype-format'),
    [require('remark-frontmatter'), ['yaml']],
    [require('./rehype-shiki'), { theme: 'material-theme-palenight' }],
    require('rehype-stringify'),
    require('./remark-replace'),
  ],
}


async function parseMarkdown({ filePath, markdown }) {
  // const result = await remark().use(remarkHtml).process(markdown);
  var post_vfile = vfile({ path: filePath, contents: markdown });
  const file = await unified()
    .use(_preset)
    .process(post_vfile)
    .catch((err) => {
      console.error(report(post_vfile));
      throw err;
    });
  file.extname = '.html';
  return file.toString();
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
      .then((res) => {
        try {
          return res.json()
        } catch (err) {
          console.error('res.json source: ', res);
          throw err
        }
      })
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
    plugin.podcasts = yaml.safeLoad(fs.readFileSync(path.resolve('content/podcasts.yml'), 'utf8'));
    plugin.talks = yaml.safeLoad(fs.readFileSync(path.resolve('content/talks.yml'), 'utf8'));


    if (config && Array.isArray(config.routes) && config.routes.length > 0) {
      for (const route of config.routes) {
        const mdsInRoute = path.resolve(process.cwd(), route);
        const mdFiles = glob.sync(`${mdsInRoute}/*.md`);
        const segment = route.split('/').slice(-1)[0]
        for (const file of mdFiles) {
          const md = fs.readFileSync(file, 'utf-8');
          const { data, content } = grayMatter(md);

          let fileSlug = file.replace('.md', '').split('/').pop();

          if (fileSlug.includes(' ')) {
            fileSlug = fileSlug.replace(/ /gim, '-');
          }
          const categories = data.tag_list || (Array.isArray(data.categories) ? data.categories : [data.categories || 'uncategorized'])
          if (data.slug) {
            plugin.markdown.push({
              slug: data.slug,
              data: {
                technical: segment === 'technical',
                ...data,
                categories
              },
              content,
            });
            plugin.requests.push({ slug: data.slug, route: 'article' });
          } else {
            plugin.markdown.push({
              slug: fileSlug,
              data: {
                technical: segment === 'technical',
                ...data,
                categories
              },
              content,
            });
            plugin.requests.push({ slug: fileSlug, route: 'article' });
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
        let articles = await getFromDevTo();
        articles.forEach((article) => {
          let {
            data,
            content,
          } = grayMatter(article.body_markdown);
          const slug = data.slug || article.slug
          plugin.markdown.push({
            slug,
            data: {
              slug,
              disclosure: data.disclosure,
              canonical_url: article.canonical_url,
              cover_image: article.cover_image,
              devto_url: article.url,
              date: new Date(data.displayed_publish_date || article.published_at),
              title: article.title,
              description: data.desc || article.description,
              categories: article.tag_list,
              devto_reactions: article.public_reactions_count
            },
            content,
          });
          plugin.requests.push({ slug, route: 'article' });
        });

        // // todo: make simple recommender algo to do related posts feature
        // fs.writeFileSync('test.json', JSON.stringify(articles, null, 2))

        // console.log('markdown', plugin.markdown.map(x => Object.keys(x.data)))
        return {
          data: {
            ...data,
            markdown: plugin.markdown,
            podcasts: plugin.podcasts,
            talks: plugin.talks
          },
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
            const html = await parseMarkdown({
              filePath: frontmatter.slug,
              markdown: content
            });
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
