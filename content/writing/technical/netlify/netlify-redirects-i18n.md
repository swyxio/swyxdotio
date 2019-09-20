---
title: JAMstack or 'Pilha de Atolamento'?
subtitle: Let Your User Decide (i18n in Gatsby + Netlify)
slug: netlify-redirects-i18n
categories: ['Tech', 'Netlify']
started: 2019-08-19
date: 2019-08-21
canonical: https://scotch.io/@sw-yx/jamstack-or-pilha-de-atolamento-let-your-user-decide-i18n-in-gatsby-netlify
tweet: https://twitter.com/swyx/status/1164328143571677185
---

_Published on [Scotch.io](https://scotch.io/@sw-yx/jamstack-or-pilha-de-atolamento-let-your-user-decide-i18n-in-gatsby-netlify)_

Internationalization (often shortened to i18n) is an important part of your app's world domination plans, but do it badly and you risk shipping your leaning Tower of Babel app to emerging markets users that don't even speak English. Or worse, you might accidentally deny users who _can_ speak English, access to your English content! In this post, we explore how to intelligently internationalize your apps and yet allow your users to opt out when appropriate, and provide a Gatsby + Netlify example for you to explore a proof of concept with English and Portuguese translations.

![gatsby-netlify-i18n](https://user-images.githubusercontent.com/6764957/63299767-8b5c0700-c2a4-11e9-880b-7e45615cb502.gif)

You can [see the Demo here](https://gatsby-netlify-i18n-demo.netlify.com) and its [source is on GitHub](https://github.com/sw-yx/gatsby-netlify-i18n-redirects).

## Naive Route-based or Client-side i18n

URL design can greatly affect the desired i18n solution. For example, you can choose to offer your languages by subdomains:

- English: `www.mydomain.com`, `en.mydomain.com`
- Portuguese: `pt.mydomain.com`

This may involve a complex deployment and DNS strategy, although it can be made easier with each subdomain belonging to a git branch with [Netlify DNS Branch Subdomains](https://www.netlify.com/docs/custom-domains/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#branch-subdomains). With a good CI/CD system, this strategy is quite maintainable.

There is some concern about the SEO optimality of this strategy as each subdomain is no longer an exact match. Under this schema, links to a domain in one language don't contribute as much as everyone linking to the same URL.

A close second which may be a better fit if your company or client has physical local subsidiaries may be to use country code TLDs:

- USA: `www.mydomain.com`
- Brazil: `www.mydomain.com.br`
- Portugal: `www.mydomain.com.pt`

However most companies without a local presence will find this DNS strategy difficult to manage.

The last, route-based strategy is the one we will consider for most smaller sites:

- English: `www.mydomain.com`, `www.mydomain.com/en`
- Portuguese: `www.mydomain.com/pt`

SEO, Code sharing, deployment, and incremental migration will be more straightforward here. At the extreme of simplicity, with a dynamic Single-Page App client, one can even abandon all route-based i18n; just process and display i18n content based on a simple setting stored as a cookie or localstorage or even together with authentication preferences. However, this isn't encouraged as it does give up the full SEO and speed benefits of having a statically rendered app.

Let's look at how to set up route-based i18n with React and Gatsby.

## i18n in Gatsby

React and Gatsby abound with great options for i18n. [`react-i18next`](https://github.com/i18next/react-i18next), [`lingui`](https://github.com/lingui/js-lingui), [`react-intl`](https://github.com/yahoo/react-intl) are great React options, while [`gatsby-plugin-i18n`](https://npm.im/gatsby-plugin-i18n) streamlines the static rendering story with Gatsby.

To add i18n to your Gatsby app, install the plugin:

```bash
npm i gatsby-plugin-i18n react-intl
```

Then configure the plugin accordingly:

```js
// gatsby-config.js
module.exports = {
  siteMetadata: {
    // ...
    languages: ['en', 'pt']
  },
  plugins: [
    // ...
    {
      resolve: 'gatsby-plugin-i18n',
      options: {
        langKeyForNull: 'any',
        langKeyDefault: 'en', // or pick your preferred default
        useLangKeyLayout: true,
        prefixDefault: true // adds a route for your default language, en
      }
    }
  ]
}
```

You can then set up your i18n according to the [`react-intl`](https://github.com/yahoo/react-intl) API, however for Gatsby you'll want to pay attention to the magic `src/pages` folder, where you now can provide pages in two languages:

```bash
- src
  - pages
    - index.en.js # mydomain.com/en/
    - index.pt.js # mydomain.com/pt/
    - page-2.en.js # mydomain.com/en/page-2
    - page-2.pt.js # mydomain.com/pt/page-2
```

Notice how the language prefixes are correctly inferred from the file name syntax. See [the rest of our demo code](https://github.com/sw-yx/gatsby-netlify-i18n-redirects) for ideas on customizing relative links and drawing translated messages from a static file (a common i18n workflow). In particular, a design goal I would encourage is allowing the user to change languages in the site navigation, as it serves as an important visual indication that a more suitable translation may be available.

Above all, remember that you're still working with the full flexibility of JavaScript and you are free to set up reusable code in a way that makes sense for your app. Code reuse is maximized where there is no language specific assumption in it (in particular, don't forget the needs of Right-To-Left languages if you anticipate needing that!).

With a route-based strategy, the user still has to choose what language they want to read your content in. But you, as a modern web developer, can do better than that! Let's look at options for automatically picking your language based on what the user already uses.

## Content Negotiation: Serving Exactly What the User Wants

Uniform Resource Identifiers ([URIs](https://en.wikipedia.org/wiki/Uniform_Resource_Identifier)) are the backbone of how we link to and request resources on the Internet. (You may be more familiar with the terminology of "URLs" - there is [some debate on the the difference](https://danielmiessler.com/study/url-uri/), but URI is more general). The Web wouldn't be very interesting if we couldn't link to and download things from other servers.

We tend to think of URIs as boring, immutable things - request a resource, and get back whatever is there (all diagrams are from [MDN](https://mdn.mozillademos.org/files/13789/HTTPNego.png)):

![https://mdn.mozillademos.org/files/13789/HTTPNego.png](https://mdn.mozillademos.org/files/13789/HTTPNego.png)

However, this is not quite true. Web developers are most commonly familiar with the contingent nature of HTTP requests where it comes to REST APIs.

![https://phpenthusiast.com/theme/assets/images/blog/what_is_rest_api.png](https://phpenthusiast.com/theme/assets/images/blog/what_is_rest_api.png)

If we send a POST request to an endpoint, we would expect it to behave differently than a GET or DELETE or PUT request.

Similarly, this conditional behavior also happens for files requested by their URI's!

Importantly, the principle URI's espouse is [uniformity](https://en.wiktionary.org/wiki/uniformity) to a predefined syntax (e.g. `https://foo.bar/baz.jpg`). The **U** in **URI** doesn't mean "Unique", whereas a [Content Addressable Network](https://en.wikipedia.org/wiki/Content_addressable_network) would be a stronger guarantee of uniqueness. What you actually get when you request a URI depends on what you included in your request, in much the same way that I might address a letter to your home, but different people might open it depending on whose name I put on the letter.

In **Content Negotiation**, the browser sends a range of headers which indicates the user's preferences. The `Accept` header is often used to either return `json` or `xml` or `html` or any other number of file formats. In future, the [`Client Hints`](https://developer.mozilla.org/en-US/docs/Glossary/Client_hints) spec may give indications for viewport size and pixel resolution for better optimized mobile performance. But for internationalization, the relevant header is the [`Accept-Language`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) header, indicating the languages preferred by the user by language code. Here's a fuller picture of the request-response cycle with headers:

![https://mdn.mozillademos.org/files/13791/HTTPNegoServer.png](https://mdn.mozillademos.org/files/13791/HTTPNegoServer.png)

Since this header is attached by default, we should take advantage of it to adapt our content to the system defaults of the user.

With this ability, ALL inbound links to content can point to `www.mydomain.com`, and get maximum SEO juice, while also preserving the speed of a JAMstack site with intelligent i18n customization based on the user's own language! This is the best of all worlds, but the _real_ good news is: it's all configurable with a few lines of redirects!

## Redirecting based on `Accept-Language`

First we have to make our server understand the `Accept-Language` header and differentially redirect the user based on the header. This is difficult if we're working in a JAMstack environment with no running server!

Cue cutscenes of frantically rummaging through `.htaccess` files and Route53 documentation...

Fortunately, Netlify does offer [Redirects](https://www.netlify.com/docs/redirects/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex) for this exact use case.

Netlify Redirects can take two forms - a `_redirects` file in the publish directory root folder, or `toml` rules in the central [`netlify.toml`](https://www.netlify.com/docs/netlify-toml-reference/) config file.

So a simple redirect from `/` to `/en` can either look like this:

```bash
## _redirects
/             /en
```

and with HTTP Status Codes:

```bash
## _redirects
/   /en  302
```

or, if more conditional and expressive power is required:

```toml
##  netlify.toml
[[redirects]]
  from = "/"
  to = "/en"
```

However that only redirects requests for `/index.html` to `/en/index.html`. What about all the other files, like requests for `/page-2.html` to `/en/page-2.html` and all other associated CSS and image files? That's where a [splat rule](https://www.netlify.com/docs/redirects/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#splats) comes in!

```bash
## _redirects
/*   /en/:splat 302
```

We don't actually want to redirect EVERYTHING to `/en/*`, that would defeat the purpose of i18n altogether. The last piece of this puzzle is making it conditional based on the [`Accept-Language` header](https://www.netlify.com/docs/redirects/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#geoip-and-language-based-redirects):

```bash
## _redirects
/*  /en/:splat   302  Language=en
/*  /pt/:splat   302  Language=pt
```

Some browsers, especially mobile browsers, don't have any language settings though. So make sure to have some fallback (here we fallback to English):

```bash
## _redirects
/*  /pt/:splat   302  Language=pt
/*  /en/:splat   302
```

Voila! You can test this in Chrome by going to `chrome://settings/languages` (or alternatively, navigate Settings > Advanced Settings > Languages > Language) and switching up the order of languages you have configured to accept.

![image](https://user-images.githubusercontent.com/6764957/63475659-d2383100-c44b-11e9-991a-fc663cd9bdf1.png)

However we've subtly introduced a user experience bug here. Assume your user is bilingual, using a Portuguese-preferring browser. For whatever reason (incomplete translation, temporary language loss) they need to switch over to your English version. If they try to manually navigate over to the English version and refresh the page - we don't let them! 😱 Because we _only_ check the `Accept-Language` header. We need to get smarter than this.

## Freedom to Choose

This is the final UX principle to check for in a i18n setup - you can take clever hints from your user, but never assume you know more than your user about what they want.

If they want `en`, give them `en`.

There are two ways to do this in the setup we have built so far. Since redirects match in sequence, we can extend our redirects to match more eagerly for specfic matches:

```bash
## _redirects
/en  /en/:splat   302
/pt  /pt/:splat   302
/*  /pt/:splat   302  Language=pt
/*  /en/:splat   302
```

This way, the language agnostic pages can redirect intelligently, while the the language specific pages bypass all redirection, giving full control to the user. The last rule is the catchall, fallback rule that matches everything the others don't.

Lastly, since the `nf_lang` cookie overrides the browser language setting in [Language Based Redirects](https://www.netlify.com/docs/redirects/?utm_source=blog&utm_medium=scotchio&utm_campaign=devex#geoip-and-language-based-redirects), you can also create a user interface to set that cookie in JavaScript.

Finally, you will have arrived at the full intelligent i18n flow, with great user control:

![gatsby-netlify-i18n](https://user-images.githubusercontent.com/6764957/63299767-8b5c0700-c2a4-11e9-880b-7e45615cb502.gif)

As a reminder, you can [see the full demo here](https://gatsby-netlify-i18n-demo.netlify.com) and its [source is on GitHub](https://github.com/sw-yx/gatsby-netlify-i18n-redirects).

If you've got any feedback or would like to share this, you can [find this article's tweet here](https://twitter.com/swyx/status/1164328143571677185)!
