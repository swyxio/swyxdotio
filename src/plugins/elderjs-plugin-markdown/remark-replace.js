const visit = require("unist-util-visit");

// https://github.com/angeloashmore/gatsby-remark-find-replace/blob/master/src/index.js
// https://swizec.com/blog/how-to-build-a-remark-plugin-to-supercharge-your-static-site/

const replacements = {
  ' %}': ` /%}`
}
// RegExp to find any replacement keys.
const regexp = RegExp(
  '(' +
    Object.keys(replacements)
      // .map(key => escapeStringRegexp(key))
      .join('|') +
    ')',
  'g',
)

const replacer = (_match, name) => replacements[name]

module.exports =  function plugin(){
  return function transformer(tree) {
    visit(tree, ['text', 'html'], node => {
      const processedText = node.value.replace(regexp, replacer)
      node.value = processedText
    });
  };
}