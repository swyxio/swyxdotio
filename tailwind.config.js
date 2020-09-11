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
