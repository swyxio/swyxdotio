const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const podcasts = yaml.safeLoad(fs.readFileSync(path.resolve('content/podcasts.yml'), 'utf8'));
const talks = yaml.safeLoad(fs.readFileSync(path.resolve('content/talks.yml'), 'utf8'));
module.exports = {
  data: {podcasts, talks},
  all: () => [{slug: 'ideas'}],
  permalink: ({ request }) => `/${request.slug}/`,
};
