module.exports = {
  data: {},
  all: () => [{slug: 'ideas'}],
  permalink: ({ request }) => `/${request.slug}/`,
};
