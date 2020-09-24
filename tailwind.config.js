const production = !process.env.ROLLUP_WATCH;
module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true
  },
  // experimental: {
  //   darkModeVariant: true
  // },
  // dark: 'class',

  theme: {
    typography: (theme) => ({
      default: {
        css: {
          color: theme('colors.white'),
          h1: {
            color: theme('colors.white'),
          },
          h2: {
            color: theme('colors.white'),
          },
          h3: {
            color: theme('colors.white'),
          },
          strong: {
            color: theme('colors.teal.300'),
          },
          a: {
            color: theme('colors.blue.300'),
          },
          pre: {
            color: theme('colors.green.300'),
          },
          code: {
            color: theme('colors.green.300'),
          },
          blockquote: {
            color: theme('colors.green.300'),
          }
          // ...
        },
      },
    }),
  },
  purge: {
    // mode: 'all', // TODO: purge typography styles
    // options: {
    //   whitelist: ['h1', 'h2', 'h3', 'p', 'blockquote', 'strong' /* etc. */],
    // },
    content: [
      "./src/**/*.svelte",
      // may also want to include base index.html
    ],
    defaultExtractor: content => {
      // Capture as liberally as possible, including things like `h-(screen-1.5)`
      const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []
      const broadMatchesWithoutTrailingSlash = broadMatches.map(match => _.trimEnd(match, '\\'))
      // // Capture classes within other delimiters like .block(class="w-1/2") in Pug
      // const innerMatches = content.match(/[^<>"'`\s.(){}[\]#=%]*[^<>"'`\s.(){}[\]#=%:]/g) || []
      const matches = broadMatches
          .concat(broadMatchesWithoutTrailingSlash)
          // .concat([...content.matchAll(/(?:class:)*([\w\d-\/:%.]+)/gm)].map(([_match, group, ..._rest]) => group))
      return matches
    },
    enabled: production // disable purge in dev
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
};
