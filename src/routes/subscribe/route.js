module.exports = {
    data: {},
    all: () => [{slug: 'subscribe'}],
    permalink: ({ request }) => `/${request.slug}/`,
  };
  