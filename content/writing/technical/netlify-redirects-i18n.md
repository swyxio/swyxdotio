---
title: "JAMstack or 'Pilha de Atolamento'? Let Your User Decide (i18n in Gatsby/React)"
slug: netlify-redirects-i18n
categories: ['Tech']
date: 2019-08-19
canonical: https://scotch.io/@sw-yx/
published: false
---

_Published on [Scotch.io]()_

Internationalization is an important part of your app's world domination plans, but do it badly and you risk shipping your leaning Tower of Babel app to emerging markets users that don't even speak English, or worse, denying users who _can_ speak English access to your English content! In this post, we explore how to intelligently internationalize your apps and yet allow your users to opt out when appropriate, and provide a Gatsby/React example for you to explore a proof of concept.

![gatsby-netlify-i18n](https://user-images.githubusercontent.com/6764957/63299767-8b5c0700-c2a4-11e9-880b-7e45615cb502.gif)

## Content Negotiation: Serving Exactly What the User Wants

Uniform Resource Identifiers ([URIs](https://en.wikipedia.org/wiki/Uniform_Resource_Identifier)) are the backbone of how we link to and request resources on the Internet. (You may be more familiar with the terminology of "URLs" - there is [some debate on the the difference](https://danielmiessler.com/study/url-uri/), but URI is more general). The Web wouldn't be very interesting if we couldn't link to and download things from other servers.

We tend to think of URIs as boring, immutable things - request a resource, and get back whatever is there:

![https://mdn.mozillademos.org/files/13789/HTTPNego.png](https://mdn.mozillademos.org/files/13789/HTTPNego.png)

However, this is not quite true. Web developers are most commonly familiar with the contingent nature of HTTP requests where it comes to REST APIs.

![https://phpenthusiast.com/theme/assets/images/blog/what_is_rest_api.png](https://phpenthusiast.com/theme/assets/images/blog/what_is_rest_api.png)

If we send a POST request to an endpoint, we would expect it to behave differently than a GET or DELETE or PUT request.

Similarly, this conditional behavior also happens for files!

Importantly, the principle URIs espouse is [uniformity](https://en.wiktionary.org/wiki/uniformity) to a predefined syntax (e.g. `https://foo.bar/baz.jpg`). The **U** in **URI** doesn't mean "Unique", whereas a [Content Addressable Network](https://en.wikipedia.org/wiki/Content_addressable_network) would be a stronger guarantee of uniqueness. What you actually get when you request a URI depends on what you included in your request, in much the same way that I might address a letter to your home, but different people might open it depending on whose name I put on the letter.

In **Content Negotiation**, the browser sends a range of headers which indicates the user's preferences. The `Accept` header is often used to either return `json` or `xml` or `html` or any other number of file formats. In future, the [`Client Hints`](https://developer.mozilla.org/en-US/docs/Glossary/Client_hints) spec may give indications for viewport size and pixel resolution for better optimized mobile performance. But for internationalization, the relevant header is the [`Accept-Language`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) header, indicating the languages preferred by the user by language code. Here's a fuller picture of the request-response cycle with headers:

![https://mdn.mozillademos.org/files/13791/HTTPNegoServer.png](https://mdn.mozillademos.org/files/13791/HTTPNegoServer.png)

Since this header is attached by default, we should take advantage of it to adapt our content.
