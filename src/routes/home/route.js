// const { hookInterface } = require('@elderjs/elderjs');
module.exports = {
  data: ({ request, data }) => {
    // data.hookInterface = hookInterface;
    return data;
  },
  all: () => [{ slug: '/' }],
  permalink: ({ request }) => request.slug,
};
