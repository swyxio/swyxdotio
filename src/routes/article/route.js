// const fs = require('fs')
module.exports = {
  // data: (all) => {
  
  //   // fs.writeFileSync('all.json', JSON.stringify(all, null, 2))
  //   // fs.writeFileSync('all2.json', JSON.stringify(Object.keys(all), null, 2))
  // },
  all: ({data}) => {
    // fs.writeFileSync('all.json', JSON.stringify(data, null, 2))
    // data.markdown is []!!!!!
    return []
  },
  permalink: ({ request }) => `/${request.slug}/`,
};





