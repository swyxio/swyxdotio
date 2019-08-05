"use strict";
require("dotenv").config();

const log = (msg, section) =>
  console.log(`\n\x1b[36m${msg} \x1b[4m${section}\x1b[0m\x1b[0m\n`);

const path = require("path");
const createPaginatedPages = require("gatsby-paginate");

const templatesDir = path.resolve('node_modules', "@narative/gatsby-theme-novela/src/templates");
const templates = {
  articles: path.resolve(templatesDir, "articles.template.tsx"),
  article: path.resolve(templatesDir, "article.template.tsx"),
};

// How many posts per page? This is hardcoded for now.
const pageLength = 6;

// https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-transformer-sharp/src/fragments.js
const GatsbyImageSharpFluid_withWebp = `
  base64
  aspectRatio
  src
  srcSet
  srcWebp
  srcSetWebp
  sizes
`;

const articlesQuery = `{
  articles: allDraft(
    sort: { fields: [date, title], order: DESC }
    limit: 1000
  ) {
    edges {
      node {
        id
        slug
        title
        author
        date(formatString: "MMMM Do, YYYY")
        dateForSEO: date
        timeToRead
        excerpt
        body
        hero {
          full: childImageSharp {
            fluid(maxWidth: 944, maxHeight: 425, quality: 90) {
              ${GatsbyImageSharpFluid_withWebp}
            }
          }
          regular: childImageSharp {
            fluid(maxWidth: 653, quality: 90) {
              ${GatsbyImageSharpFluid_withWebp}
            }
          }
          narrow: childImageSharp {
            fluid(maxWidth: 457, quality: 90) {
              ${GatsbyImageSharpFluid_withWebp}
            }
          }
          seo: childImageSharp {
            fixed(width: 1200, quality: 100) {
              src
            }
          }
        }
      }
    }
  }
  authors: allAuthorsYaml {
    edges {
      node {
        bio
        id
        name
        avatar {
          image: childImageSharp {
            fluid(maxWidth: 50, quality: 100) {
              ${GatsbyImageSharpFluid_withWebp}
            }
          }
        }
      }
    }
  }
}
`;

const basePath = "/writing/draft";
module.exports = async ({ actions: { createPage }, graphql }) => {

  function buildPaginatedPath(index, basePath) {
    if (basePath === "/") {
      return index > 1 ? `${basePath}page/${index}` : basePath;
    }
    return index > 1 ? `${basePath}/page/${index}` : basePath;
  }

  log("Querying", "drafts");
  const result = await graphql(articlesQuery);
  const articles = result.data.articles.edges;
  const authors = result.data.authors.edges;

  if (articles.length === 0) {
    throw new Error("You must have at least one article");
  }

  if (authors.length === 0) {
    throw new Error("You must have at least one author");
  }

  log("Creating", "drafts page");
  createPaginatedPages({
    edges: articles,
    pathPrefix: basePath,
    createPage,
    pageLength,
    pageTemplate: templates.articles,
    buildPath: buildPaginatedPath,
    context: {
      basePath,
      skip: pageLength,
      limit: pageLength,
    },
  });

  log("Creating", "draft posts");
  articles.forEach(({ node }, index) => {
    const article = node;

    // Match the Author to the one specified in the article
    let author;

    try {
      author = authors.find(
        ({ node: author }) => author.name === article.author,
      ).node;
    } catch (error) {
      throw new Error(`
          We could not find the Author for "${article.title}".
          Double check the author field is specified in your post and the name
          matches a specified author.
        `);
    }

    let next = articles.slice(index + 1, index + 3);

    // If it's the last item in the list, there will be no articles. So grab the first 2
    if (next.length === 0) next = articles.slice(0, 2);

    // If there's 1 item in the list, grab the first article
    if (next.length === 1 && articles.length !== 2)
      next = [...next, articles[0]];

    if (articles.length === 1) next = [];

    createPage({
      path: article.slug,
      component: templates.article,
      context: {
        article,
        author,
        basePath,
        slug: article.slug,
        id: article.id,
        title: article.title,
        next,
      },
    });
  });
};
