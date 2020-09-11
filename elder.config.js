module.exports = {
  server: {
    prefix: '',
  },
  build: {},
  locations: {
    assets: './public/dist/static/',
    public: './public/',
    svelte: {
      ssrComponents: './___ELDER___/compiled/',
      clientComponents: './public/dist/svelte/',
    },
    systemJs: '/dist/static/s.min.js',
    intersectionObserverPoly: '/dist/static/intersection-observer.js',
  },
  debug: {
    stacks: false,
    hooks: false,
    performance: false,
    build: false,
    automagic: false,
  },
  hooks: {
    // disable: ['elderWriteHtmlFileToPublic'], // this is used to disable internal hooks. Uncommenting this would disabled writing your files on build.
  },
  plugins: {
    'elderjs-plugin-markdown': {
      routes: ['blog'],
    },
    '@elderjs/browser-reload': {}, // this reloads your browser when nodemon restarts your server.
  },
};
