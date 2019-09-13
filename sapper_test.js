const { get_posts } = require('./sapper_markdown_code')
const x = get_posts('content/talks', 'talks')
// console.log(x.map((y) => y && Object.keys(y)))
console.log(x[0].metadata)
