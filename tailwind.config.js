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
    enabled: production // disable purge in dev
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
};
