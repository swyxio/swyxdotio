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
      // Capture classes within other delimiters like .block(class="w-1/2") in Pug
      const innerMatches = content.match(/[^<>"'`\s.(){}[\]#=%]*[^<>"'`\s.(){}[\]#=%:]/g) || []
      const matches = broadMatches.concat(broadMatchesWithoutTrailingSlash).concat(innerMatches)
      // if (_.get(config, 'purge.preserveHtmlElements', true)) {
      //   return [...htmlTags].concat(matches)
      // } else {
      // }
      return [...matches, ...svelteExtractor(content)]
    },
    enabled: production // disable purge in dev
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
};

// https://github.com/tailwindlabs/tailwindcss/discussions/1731
function svelteExtractor(content) {
  const regExp = new RegExp(/[A-Za-z0-9-_:/]+/g)
  const matchedTokens = []
  let match = regExp.exec(content)

  while (match) {
    if (match[0].startsWith('class:')) {
      matchedTokens.push(match[0].substring(6))
    } else {
      matchedTokens.push(match[0])
    }
    match = regExp.exec(content)
  }
  return matchedTokens
}