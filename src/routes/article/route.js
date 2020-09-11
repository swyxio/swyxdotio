const data = require('./data');

module.exports = {
  data,
  all: () => [], // these are populated by the elderjs-plugin-markdown
  permalink: ({ request }) => `/${request.slug}/`,
};
