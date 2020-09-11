const data = require('./data');

module.exports = {
  data,
  all: () => [{ slug: '/' }],
  permalink: ({ request }) => request.slug,
};
