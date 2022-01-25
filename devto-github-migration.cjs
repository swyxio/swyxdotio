require('dotenv-safe').config(); // have DEV_TO_API_KEY in process.env
const fetch = require('node-fetch');
const fs = require('fs');

// // download all devto content
// async function getFromDevTo() {
//   let allArticles = [];
//   let page = 0;
//   let per_page = 300; // can go up to 1000
//   let latestResult = [];
//   do {
//     page += 1; // bump page up by 1 every loop
//     // var abc = await fetch('https://dev.to/api/articles/me/published', { headers: { 'api-key': 'dxHE3aPVYRDfYs57nGWmDG6P' } })
//     latestResult = await fetch(`https://dev.to/api/articles/me/all?page=${page}&per_page=${per_page}`, {
//       headers: {
//         'api-key': process.env.DEV_TO_API_KEY,
//       },
//     })
//       .then(async (res) => {
//         try {
//           return res.json()
//         } catch (err) {
//           const text = await res.text()
//           console.error('err', err); // very basic error handling, customize as needed
//           console.log('res.json text: ', text.slice(0, 200));
//           throw err
//         }
//       })
//       .then((x) => (allArticles = allArticles.concat(x)))
//       .catch((err) => {
//         console.log({res})
//         console.error(err); // very basic error handling, customize as needed
//         throw new Error(`error fetching page ${page}, {err}`);
//       });
//   } while (latestResult.length === per_page);
//   return allArticles;
// }

// getFromDevTo().then((allArticles) => {
//   console.log(allArticles.length)
//   fs.writeFileSync('./devto-articles.json', JSON.stringify(allArticles, null, 2));
// })

// // normalize devto content
// let data = JSON.parse(fs.readFileSync('./devto-articles.json'))
// data.forEach()

// upload to github issues
(async function main() {
  let data = JSON.parse(fs.readFileSync('./devto-articles.json'))
  console.log(data.length)
  const start = 220
  for (let i = start; i < start + 4; i++) {
    const post = data[i]
    await postToGitHub(post, i)
    await sleep(1000)
  }
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})()

async function postToGitHub(post, i) {
  let body = `---
${renderExtra({
  source: 'devto',
  devToUrl: `"${post.url}"`,
  devToReactions: post.public_reactions_count,
  devToReadingTime: post.reading_time_minutes,
  devToPublishedAt: `"${post.published_at}"`,
  devToViewsCount: post.page_views_count,
})}
${stripHeader(post.body_markdown)}`
  
  // console.log(body.slice(0, 500))
  
  await fetch('https://api.github.com/repos/sw-yx/swyxdotio/issues', {
    method: 'POST',
    headers: {
      'Authorization': `token ${process.env.GH_TOKEN}`,
      'Content-Type': "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      title: post.title,
      body,
      labels: ['Published'],
    }),
  }).then((res) => {
    console.log(i + ': success', post.title)
  }).catch(err => {
    console.log(i + ': error: ' + post.title, err)
  })
}

function renderExtra(extra) {
  return Object.entries(extra)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

function stripHeader(x) {
  return x.slice(0,4) === '---\n' ? x.slice(4) : ('\n---\n\n' + x)
}