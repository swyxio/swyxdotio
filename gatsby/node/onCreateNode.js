"use strict";

const crypto = require(`crypto`);
const { createFilePath } = require(`gatsby-source-filesystem`);

// Create fields for post slugs and source
// This will change with schema customization with work
const basePath = "/writing/draft";
const contentPath = "/content/collections/drafts"
module.exports = ({ node, actions, getNode, createNodeId }) => {
  const { createNode, createParentChildLink } = actions;

  // Make sure it's an MDX node
  if (node.internal.type !== `Mdx`) {
    return;
  }
  
  // Create source field (according to contentPath)
  const fileNode = getNode(node.parent);
  const source = fileNode.sourceInstanceName;

  if (node.internal.type === `Mdx` && source === 'draftPosts') {
    const slugify = str => {
      const slug = str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      return `/${basePath}/${slug}`.replace(/\/\/+/g, "/");
    };

    const slug = createFilePath({
      node: fileNode,
      getNode,
      basePath,
    });

    const fieldData = {
      slug: slugify(node.frontmatter.slug) || slugify(node.frontmatter.title),
      author: node.frontmatter.author,
      title: node.frontmatter.title,
      date: node.frontmatter.date,
      hero: node.frontmatter.hero,
    };

    createNode({
      ...fieldData,
      // Required fields.
      id: createNodeId(`${node.id} >>> Draft`),
      parent: node.id,
      children: [],
      internal: {
        type: `Draft`,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(fieldData))
          .digest(`hex`),
        content: JSON.stringify(fieldData),
        description: `Draft Posts`,
      },
    });

    createParentChildLink({ parent: fileNode, child: node });
  }
};
