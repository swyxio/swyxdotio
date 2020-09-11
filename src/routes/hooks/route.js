const { hookInterface } = require('@elderjs/elderjs');
const data = require('./data');

module.exports = {
  data,
  all: () =>
    hookInterface.map((hook) => ({
      slug: hook.hook,
    })),
  permalink: ({ request }) => `/${request.slug}/`,
};
