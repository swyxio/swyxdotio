---
title: "Building Authenticated Serverless JAMstack Apps with Gatsby and Netlify"
date: 2019-09-11
slug: netlify-gatsby-jamstack-apps-authenticated-serverless
categories: ['Tech', 'Netlify', 'Gatsby']
description: Gatsby is more than a simple static site generator. It uses JavaScript to rehydrate Markup into a fully dynamic React app - which means you can use APIs to do all sorts of dynamic functionality!
published: false
---

When interacting with a backend, a JAMstack app can do everything a mobile app can do, without the tyranny of the app store. This is a fundamental insight that goes as deep as the fight for a more open,  secure, decoupled, faster web.

Static site generators (SSGs) are traditionally used to generate markup HTML for static sites, and even [e-commerce sites](https://css-tricks.com/lets-build-a-jamstack-e-commerce-store-with-netlify-functions/), but the modern generation of JavaScript SSGs are enabling full-blown, blazing fast web apps. Gatsby uses JavaScript to rehydrate Markup into a fully dynamic React app - which means you can use APIs to do all sorts of dynamic functionality!

Let's see how we can incrementally add functionality to a Gatsby static site with Netlify Functions, and then add authentication with Netlify Identity to create a proper Gatsby app. We'll gradually build up to [a full working demo](https://github.com/sw-yx/jamstack-hackathon-starter/) with:

- 👋🏼Dynamic Clientside Pages in Gatsby
- 🚋Serverless Functions (with Netlify Dev)
- 🕵🏼‍♂️Hide API Secrets from being exposed to Frontend
- 🔏Authentication (with Netlify Identity)
- 🏠Protected Routes
- 🔐Authenticated Serverless Functions (why not!)
- 😻External Provider login with GitHub, Bitbucket, Google, etc.

## Not Your Parent's Static Site Generator

Why would you use something like Gatsby over Jekyll or Hugo or one of the [hundreds of Static Site Generators](https://www.staticgen.com/) out there? [There are many reasons](https://www.gatsbyjs.org/blog/2018-2-27-why-i-upgraded-my-website-to-gatsbyjs-from-jekyll/), but one of the unique selling points is how Gatsby helps you build ["Static Progressive Web Apps"](https://www.gatsbyjs.org/docs/progressive-web-app/#progressive-web-app) with React.

[Gatsby's ability to rehydrate](https://www.gatsbyjs.org/docs/production-app/#dom-hydration) (what a delicious word!) the DOM means you can do incredibly dynamic things with JavaScript and React that would be much harder with legacy SSG's.

Let's say you have a typical static Gatsby site, like [gatsby-starter-default](https://www.gatsbyjs.org/starters/gatsby-starter-default). You can `npm run build` it, and it spits out a bunch of HTML files. Great! I can host that for free!

Now imagine your client comes to you and asks you to add some custom logic that needs to be executed on the server:

- Maybe you have third party API secrets you don't want to expose to your user.
- Maybe you need [a serverside proxy to get around CORS issues](https://alligator.io/nodejs/solve-cors-once-and-for-all-netlify-dev/).
- Maybe you need to ping a database to check your inventory.

**Oh no! Now you have to rewrite everything and move to a Digital Ocean droplet!**

I'm kidding. No, you don't have to rewrite everything.

The beauty of serverless functions is that it is incrementally adoptable - **your site grows with your needs** - and with JavaScript you can rerender entire sections of your site based on live API data. Of course, the more you do this, the more resource intensive (in terms of bandwidth and computation) it can be, so there is a performance tradeoff. **Your site should be as dynamic as you need it to be, but no more.** Gatsby is perfect for this.

## Using Netlify Dev to add Serverless Functions

[Netlify Functions](https://www.netlify.com/docs/functions/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex) are a great low configuration solution for adding serverless functionality to your Gatsby site.

We'll assume you have a Gatsby site ready to go already, preferably linked to a Git remote like GitHub. If you don't have one, fork and download [gatsby-starter-default](https://app.netlify.com/start/deploy?repository=https://github.com/gatsbyjs/gatsby-starter-default). Let's walk through the steps to add Netlify Functions:

1. **Install Netlify CLI and login**: 

```bash
npm i -g netlify-cli
netlify login # to link your free Netlify account
```

Pretty straightforward.

2. **Create your Netlify instance for your Gatsby site**: 

```bash
netlify init
```

You will be prompted for a "build command", which for Gatsby is `yarn build`, and a "publish directory", which for Gatsby is `public`. You can also save this in a [netlify.toml config file](https://www.netlify.com/docs/netlify-toml-reference/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex), or the CLI will create it for you:

```toml:title=netlify.toml
[build]
  command = "yarn build"
  functions = "functions"
  publish = "public"
```

As you can see in the above example, We'll also specify where we'll save our functions to the creatively named `functions` folder.

3. **Create your first Netlify Function**: Netlify CLI has a [set of templates](https://github.com/netlify/cli/tree/master/src/functions-templates/js) available to help you get started writing serverless functions. Just run:

```bash
netlify functions:create # ntl functions:create also works
```

You'll be presented with an autocomplete list. We'll pick the `token-hider` example for now. Once you select it, the CLI will copy out the necessary files, and install the necessary `axios` dependencies.

Notice that `token-hider.js` includes this line:

```js
const { API_SECRET = "shiba" } = process.env
```

This is meant to simulate API secrets that you don't want to expose to the frontend. You can set these as [build environment variables](https://www.netlify.com/docs/continuous-deployment/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex#environment-variables) on your site's Netlify Dashboard. You can name them whatever you like, and for the purposes of our demo we've provided a default, but of course feel free to modify this code however you like. It's Just JavaScript™!

4. **Make sure function dependencies are installed with `netlify-lambda`** (Optional but Recommended) 

Notice that your function comes with its own `package.json` and `node_modules`. This means each function can have their own independently managed dependencies, but you also need to make sure these dependencies are installed when you deploy or when someone else clones your repo. You can either check them into git (ugh!), or write a bash script to do this installation. But don't worry, there's a simple utility to automate this:

```bash
yarn add -D netlify-lambda
```

And add a postinstall script in `package.json` (this isn't Netlify specific, it is part of [how npm works](https://docs.npmjs.com/misc/scripts#description)):

```js
  "scripts": {
    "postinstall": "netlify-lambda install"
  },
```

5. **Fire up Gatsby and Functions with Netlify Dev**

[Netlify Dev](https://www.netlify.com/blog/2019/04/09/netlify-dev-our-entire-platform-right-on-your-laptop/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex) is the local proxy server embedded in the CLI that we will use to develop our Functions alongside our Gatsby app. You can start it like so:

```bash
netlify dev # or ntl dev
```

Your Gatsby app will now be accessible at `http://localhost:8888` and your function will be accessible at `http://localhost:8888/.netlify/function/token-hider`. Check it out in your browser!

How are both the Gatsby dev server and the Netlify Functions server both available on the same local port? How come the API_SECRET you set on the Netlify side is available in local development? The rough mental image you should have looks [something like this](https://github.com/netlify/cli/blob/master/docs/netlify-dev.md):

![ASCCII-ART](https://www.freecodecamp.org/news/content/images/2019/09/ASCCII-ART.png)

You can hit your Netlify Function from anywhere in your Gatsby app! For example, in any event handler or lifecycle method, insert:

```js
fetch("/.netlify/functions/token-hider")
  .then(response => response.json())
  .then(console.log)
```

and watch a list of dog images pop up in your console.  If you are new to React, I highly recommend [reading through the React docs](https://reactjs.org/docs/handling-events.html) to understand where and how to insert event handlers so you can, for example, [respond to a button click](https://reactjs.org/docs/handling-events.html).

## Adding Authentication

So, yes, your site can now be more dynamic than any static site: It can hit any database or API. You can hide API tokens from prying eyes. It runs rings around CORS (by the way, you can also use [Netlify Redirects](https://www.netlify.com/docs/redirects/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex) for that). But its not an _app_ app. Yet!

The key thing about web apps (and, let's face it, the key thing users really pay for) is they all have some concept of `user`, and that brings with it all manner of complication from security to state management to [role-based access control](https://www.netlify.com/docs/visitor-access-control/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex#role-based-access-controls-with-jwt-tokens). Entire routes need to be guarded by authentication, and sensitive content shielded from Gatsby's static generation. Sometimes there are things you -don't- want Google's spiders to see!

It's a different tier of concern, which makes it hard to write about in the same article as a typical Gatsby tutorial. But we're here to make apps, so let's bring it on!

## Adding Netlify Identity and Authenticated Pages to Gatsby

1. **Enable Netlify Identity**: Netlify Identity doesn't come enabled by default. You'll have to head to your site admin (eg `https://app.netlify.com/sites/YOUR_AWESOME_SITE/identity`) to turn it on. [Read the docs](https://www.netlify.com/docs/identity/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex) for further info on what you can do, for example add Facebook or Google social sign-on!
2. **Install dependencies**: `npm install gatsby-plugin-netlify-identity react-netlify-identity-widget  @reach/dialog @reach/tabs @reach/visually-hidden gatsby-plugin-create-client-paths`
3. **Configure Gatsby**: for dynamic-ness!

```jsx:title=gatsby-config.js
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-plugin-create-client-paths`,
      options: { prefixes: [`/app/*`] },
    },
    {
      resolve: `gatsby-plugin-netlify-identity`,
      options: {
        url: "https://YOUR_AWESOME_SITE_INSTANCE_HERE.netlify.com",
      },
    },
  ],
}
```

This sets up everything under the `/app` route to be dynamic on the clientside, which means you can put it behind an authentication wall.

4. **Add the login widget**: [`netlify-identity-widget`](https://github.com/netlify/netlify-identity-widget) is a framework-agnostic overlay that ships with a nice signup/login UI. However it is a 60kb package, so there is a 6kb alternative that simply assumes you're using React: `react-netlify-identity-widget`.

The widget is implemented as an accessible modal with `@reach/dialog`, so you need to put it somewhere in your app:

```jsx:title=src/app/login.js
// src/app/login.js
import React from "react"
import { navigate } from "gatsby"

import { IdentityModal } from "react-netlify-identity-widget"
import "react-netlify-identity-widget/styles.css" // delete if you want to bring your own CSS

export default function Login() {
  const [dialog, setDialog] = React.useState(false)
  return (
    <div>
      <h1>Log in</h1>
      <button onClick={() => setDialog(true)}>log in</button>
      <IdentityModal
        showDialog={dialog}
        onCloseDialog={() => setDialog(false)}
        onLogin={user => navigate("/app/profile")}
        onSignup={user => navigate("/app/profile")}
      />
    </div>
  )
}
```

`react-netlify-identity-widget` uses React Context, so it normally requires adding a Provider, but `gatsby-plugin-netlify-identity` already did that for you (that's its whole purpose!).

As you might expect, you can use that Context in the rest of your app. `react-netlify-identity-widget` exports a [Custom Consumer Hook](https://kentcdodds.com/blog/how-to-use-react-context-effectively) called `useIdentityContext`, which helps do some runtime checks and makes TypeScript typing easier by removing an `undefined` check.

`useIdentityContext` returns an `identity` object, and [you can see the plethora of data and methods it exposes to you on the docs](https://github.com/sw-yx/react-netlify-identity#user-content-usage). Let's use them to implement a `NavBar` component!

```jsx:title=src/app/components/NavBar.js
// src/app/components/NavBar.js
import React from "react"
import { Link, navigate } from "gatsby"
import { useIdentityContext } from "react-netlify-identity-widget"

export default function NavBar() {
  const { user, isLoggedIn, logoutUser } = useIdentityContext()
  let message = isLoggedIn
    ? `Hello, ${user.user_metadata && user.user_metadata.full_name}`
    : "You are not logged in"
  const handleClick = async event => {
    event.preventDefault()
    await logoutUser()
    navigate(`/app/login`)
  }
  return (
    <div>
      <span>{message}</span>
      <nav>
        <span>Navigate the app: </span>
        <Link to="/app/">Main</Link>
        <Link to="/app/profile">Profile</Link>
        {isLoggedIn ? (<a href="/" onClick={handleClick}>Logout</a>) : (<Link to="/app/login">Login</Link>)}
      </nav>
    </div>
  )
}
```

5. **Write the rest of your app**: Because of our configuration in `gatsby-plugin-create-client-paths`, any sub paths in `src/pages/app` will be exempt from Gatsby static generation. To keep the dividing line between app and site crystal clear, I like to have all my dynamic Gatsby code in a dedicated `app` folder. This means you can use `@reach/router` with `react-netlify-identity-widget` to write a standard dynamic React app with private, authenticated routes. Here's some sample code to give you an idea of how to hook them up:

```jsx:title=src/app/app.js
// src/app/app.js
import React from "react"
import { Router } from "@reach/router"
import Layout from "../components/layout"
import NavBar from "./components/NavBar"
import Profile from "./profile"
import Main from "./main"
import Login from "./login"
import { useIdentityContext } from "react-netlify-identity-widget"
import { navigate } from "gatsby"

function PrivateRoute(props) {
  const { isLoggedIn } = useIdentityContext()
  const { component: Component, location, ...rest } = props

  React.useEffect(
    () => {
      if (!isLoggedIn && location.pathname !== `/app/login`) {
        // If the user is not logged in, redirect to the login page.
        navigate(`/app/login`)
      }
    },
    [isLoggedIn, location]
  )
  return isLoggedIn ? <Component {...rest} /> : null
}
function PublicRoute(props) {
  return <div>{props.children}</div>
}

export default function App() {
  return (
    <Layout>
      <NavBar />
      <Router>
        <PrivateRoute path="/app/profile" component={Profile} />
        <PublicRoute path="/app">
          <PrivateRoute path="/" component={Main} />
          <Login path="/login" />
        </PublicRoute>
      </Router>
    </Layout>
  )
}
```

Phew that was a lot! but you should have a solid starting point for your app now :)

## Bonus points: Authenticated Netlify Functions 🤯

Just like [every magic act has a pledge, a turn, and a prestige](<https://en.wikipedia.org/wiki/The_Prestige_(film)>), I have one last tidbit for you. [Nothing on the client-side is safe](https://stackoverflow.com/questions/50277192/react-security-concerns-restricted-pages-in-app). Although you can send along Netlify Identity user ID's to your Netlify Function endpoints for authenticated access from your Gatsby App (for example in the body of a POST request), you'll never be truly sure if that flow is secure either from malicious users or snooping.

The best way to do authenticated actions inside serverless functions is to do it from **inside** the context of the function itself. Fortunately, [Netlify Identity and Functions work seamlessly together](https://www.netlify.com/docs/functions/?utm_source=blog&utm_medium=freecodecamp&utm_campaign=devex#identity-and-functions). All you have to do is to send along the user's [JWT](https://jwt.io/) when hitting your endpoint:

```js
// in your gatsby app
const { user } = useIdentityContext()
// in an event handler
fetch("/.netlify/functions/auth-hello", {
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Bearer " + user.token.access_token, // like this
  },
}).then(/* etc */)
```

If even this is too much boilerplate, you can even use the fetch wrapper that ships with the `identity` object:

```js
// in your gatsby app
const { authedFetch } = useIdentityContext()
// in an event handler
authedFetch("/.netlify/functions/auth-hello").then(/* etc */)
```

And then inside your Netlify function, you can now check the `user` object or pass it on to your end API or database:

```js
module.exports = { handler }
async function handler(event, context) {
  if (context.clientContext) {
    const { user } = context.clientContext
    // you can get actual user metadata you can use!
    return {
      statusCode: 200,
      body: JSON.stringify({
        msg: "super secret info only available to authenticated users",
        user,
      })
    }
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({
        msg:
          "Error: No authentication detected! Note that netlify-lambda doesn't locally emulate Netlify Identity.",
      }),
    }
  }
}
```

## Gatsby + Netlify - Perfect for your next Hackathon

As you can see, it's a few steps to turn your static Gatsby sites into dynamic, authenticated, fully serverless apps with Netlify's free tools. This makes Gatsby a perfect tool for your next app. If you're at a hackathon, short on time, or just like to see a full working demo, check any of the following links.

- **Code:** https://github.com/sw-yx/jamstack-hackathon-starter
- **Starter:** https://www.gatsbyjs.org/starters/jamstack-hackathon-starter
- **Live Demo:** https://jamstack-hackathon-starter.netlify.com/