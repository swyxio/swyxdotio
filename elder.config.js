module.exports = {
  server: {
    prefix: '',
  },
  build: {},
  locations: {
    // assets: './public/dist/static/',
    assets: './public/',
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
  shortcodes: {
    // https://elderguide.com/tech/elderjs/#specifications-and-config
    openPattern: "{%", // Opening pattern for identifying shortcodes in html output.
    closePattern: "%}", // closing pattern for identifying shortcodes in html output.
  },
  hooks: {
    // disable: ['elderWriteHtmlFileToPublic'], // this is used to disable internal hooks. Uncommenting this would disabled writing your files on build.
  },
  plugins: {
    'elderjs-plugin-markdown': {
      routes: ['src/routes/ideas', 'src/routes/article',
        'content/writing/learn-in-public',
        'content/writing/technical',
        'content/writing/nontechnical',
      ],
    },
    '@elderjs/browser-reload': {}, // this reloads your browser when nodemon restarts your server.
  },
};
