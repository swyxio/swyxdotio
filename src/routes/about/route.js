module.exports = {
  data: {},
  all: () => [{slug: 'about'}],
  permalink: ({ request }) => `/${request.slug}/`,
};
