---
title: Solve CORS once and for all with Netlify Dev
slug: netlify-dev-cors
categories: ['Tech']
date: 2019-06-28
canonical: https://alligator.io/nodejs/solve-cors-once-and-for-all-netlify-dev/
---

_Published on [Alligator.io](https://alligator.io/nodejs/solve-cors-once-and-for-all-netlify-dev/)_

## Access-Control-Allow-Headers and CORS

Say you're a budding young (or young-at-heart!) frontend developer. You'd really love to smush together a bunch of third party APIs for your next Hackathon project. This API looks great: <https://icanhazdadjoke.com/api>! We'll build the next great Dad Joke app in the world! Excitedly, you whip up a small app (these examples use React, but the principles are framework agnostic):

```js
function App() {
  const [msg, setMsg] = React.useState('click the button')
  const handler = () =>
    fetch('https://icanhazdadjoke.com/', { headers: { accept: 'Accept: application/json' } })
      .then((x) => x.json())
      .then(({ msg }) => setMsg(msg))

  return (
    <div className="App">
      <header className="App-header">
        <p>message: {msg}</p>
        <button onClick={handler}> click meeee</button>
      </header>
    </div>
  )
}
```

You excitedly `yarn start` to test your new app locally, and...

```bash
Access to fetch at 'https://icanhazdadjoke.com/' from origin 'http://localhost:3000' has been blocked by CORS policy: Request header field accept is not allowed by Access-Control-Allow-Headers in preflight response.
```

_Oh no_, you think, _I've seen this before but how do I fix this again?_

You google around and find [this browser plugin](https://medium.com/@dtkatz/3-ways-to-fix-the-cors-error-and-how-access-control-allow-origin-works-d97d55946d9) and [this serverside fix](https://daveceddia.com/access-control-allow-origin-cors-errors-in-react-express/#best-cors-header-requires-server-changes) and [this way too long MDN article](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) and its all much too much for just a simple API request. First of all, you don't have control of the API, so adding a CORS header is out of the question. Second of all, this problem is happening because you're hitting an `https://` API from `http://localhost`, which doesn't have SSL, so the problem could go away once you deploy onto an `https` enabled domain, but that still doesn't solve the local development experience. Last of all, you just wanted to get something up and running and now you're stuck googling icky security stuff on step 1.

Super frustrating. Now that [more and more of the web is HTTPS by default](https://transparencyreport.google.com/https/overview?hl=en&time_os_region=chrome-usage:1;series:time;groupby:os&lu=load_os_region&load_os_region=chrome-usage:1;series:page-load;groupby:os), you're just going to run into this more and more as you work on clientside apps (one reason server-side frameworks actually don't even face CORS problems because they are run in trusted environments).

## Netlify Dev, the local proxy solution

If you've looked around long enough you'll notice that CORS is a browser protection that completely doesn't apply if you just made the request from a server you control. In other words, spin up a proxy server and all your problems go away. The only problem has been spinning up this proxy has been too hard and too costly. And that's just for local dev; the deployed experience is totally different and just adds more complexity to the setup.

For the past few months I've been working on Netlify Dev, which aims to be a great proxy server for exactly this kind of usecase. It comes embedded in the Netlify CLI, which you can download:

```bash
npm i -g netlify-cli
```

Now in your project, if it is [a popular project we support like create-react-app, Next.js, Gatsby, Vue-CLI, Nuxt and so on](https://github.com/netlify/netlify-dev-plugin/tree/master/src/detectors), you should be able to run:

```bash
# provide a build command and publish folder
# specific to your project,
# create a Netlify site instance, and
# initialize netlify.toml config file if repo connected to git remote
netlify init # or `ntl init`

# start local proxy server
netlify dev # or `ntl dev`
```

And you should see the proxy server run on `localhost:8888` if that port is available.

If your project isn't supported, [you can write and contribute your own config](https://www.netlify.com/blog/2019/04/24/zero-config-yet-technology-agnostic-how-netlify-dev-detectors-work/), but it should be a zero config experience for the vast majority of people.

As of right now it is a local proxy server that just blindly proxies your project, nothing too impressive. Time to spin up a serverless function!

## Creating a Netlify Function

At this point you should have a [`netlify.toml`](https://www.netlify.com/docs/netlify-toml-reference/) file with a `functions` field. You can hand write your own if you wish, but it should look like this:

```toml
[build]
  command = "yarn run build"
  functions = "functions"
  publish = "dist"
```

You can configure each one of these to your needs, just [check the docs](https://www.netlify.com/docs/netlify-toml-reference/). But in any case, now when you run

```bash
netlify functions:create
```

the CLI shows you the list of function templates. Pick `node-fetch` and it will scaffold a new serverless function for you in `/functions/node-fetch` by default, including installing any required dependencies. Have a look at the generated files, but the most important one will be `functions/node-fetch/node-fetch.js`. By convention the folder name must match the file name for the function entry point to be recognized.

Great, so we now have a serverless Node.js function making our call to the API. The only remaining thing to do is to modify our frontend to ping our function proxy instead of directly hitting the API:

```js
const handler = () =>
  fetch('/.netlify/functions/node-fetch', { headers: { accept: 'Accept: application/json' } })
    .then((x) => x.json())
    .then(({ msg }) => setMsg(msg))
```

## Getting rid of CORS in local development

Now when we run the proxy server again:

```bash
netlify dev # or ntl dev
```

And head to the proxy port (usually `http://localhost:8888`), and click the button...

```bash
message: Why can't a bicycle stand on its own? It's two-tired.
```

Funny! and we can laugh now that we have got rid of our CORS issues.

## Deploying and Getting rid of CORS in production

When deploying, we lose the local proxy, but gain the warm embrace of the production environment, which, [by design](https://www.netlify.com/blog/2019/04/09/netlify-dev--our-entire-platform-right-on-your-laptop/), is going to work the exact same way.

```bash
npm run build ## in case you need it
netlify deploy --prod ## this is the manual deploy process
```

And head to the deployed site (run `netlify open:site`).

> Note: if you are deploying your site via continuous deployment from GitHub, GitLab or BitBucket, you will want to modify your `netlify.toml` build command to install function dependencies:

```toml
[build]
  command = "yarn build && cd functions/node-fetch && yarn"
  functions = "functions"
  publish = "dist"
```

Now you know how to spin up a function to proxy literally any API, together with using confidential API keys (either hardcoded, although don't do this if your project is open source, or as [environment variables](https://www.netlify.com/docs/continuous-deployment/#environment-variables)) that you don't want to expose to your end user, in minutes. This helps to mitigate any production CORS issues as well, although those are more rare.

If you have simple endpoints and files to proxy, you may also choose to use [Netlify Redirect Rewrites](https://www.netlify.com/docs/redirects/#proxying) to accomplish what we just did in one line, however it is of course less customizable.

That's all there is to solving your CORS problems once and for all! Note that Netlify Dev is still in beta, if you ran into any hiccups or have questions, [please file an issue](https://github.com/netlify/netlify-dev-plugin/)!
