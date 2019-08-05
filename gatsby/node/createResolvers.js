"use strict";

// helper that grabs the mdx resolver when given a string fieldname
const mdxResolverPassthrough = fieldName => async (
  source,
  args,
  context,
  info,
) => {
  const type = info.schema.getType(`Mdx`);
  const mdxNode = context.nodeModel.getNodeById({
    id: source.parent,
  });
  const resolver = type.getFields()[fieldName].resolve;
  const result = await resolver(mdxNode, args, context, {
    fieldName,
  });
  return result;
};

// Define resolvers for custom fields
module.exports = ({ createResolvers }) => {
  createResolvers({
    Draft: {
      excerpt: {
        resolve: mdxResolverPassthrough(`excerpt`),
      },
      body: {
        resolve: mdxResolverPassthrough(`body`),
      },
      timeToRead: {
        resolve: mdxResolverPassthrough(`timeToRead`),
      },
    },
  });
};
