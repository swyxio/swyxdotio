---
title: Serverless Functions are Stateful
subtitle: aka Why "Warmers" Don't Prevent Cold Starts
slug: stateful-serverless
categories: ['Tech']
date: 2020-02-20
description: A reminder that serverless functions actually have a lot of state, and how the "function" analogy breaks down when you look through the abstraction
---

We are often taught that serverless functions should be written as small, stateless pieces of business logic. This might lead us to conclude that their environment is stateless as well. It's extremely easy to verify that they are not, and the resulting abstraction leak will teach you something about serverless functions you probably didn't know.

## Write a Stateful Serverless Function

I'll mostly assume you have some basic knowledge with writing Netlify Functions ([docs link](https://docs.netlify.com/functions/build-with-javascript/#format)) here, which have the same API and behavior as AWS Lambda Functions, but this also applies to other clouds.

Consider this basic function:

```js
// functions/hello-world.js
let abc = 0;
exports.handler = async (event, context) => {
  abc += 1;
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello, abc is ${abc}` })
  };
};
```

You can see this in action here: https://github.com/sw-yx/stateful-serverless with the deployed endpoint here https://stateful-serverless-demo.netlify.com/.netlify/functions/hello-world

Now: What is the result of pinging the `hello-world` function repeatedly? You might reasonably expect that you'll get `{"message":"Hello, abc is 1"}` over and over.

Well, let's see:

```bash
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/hello-world
{"message":"Hello, abc is 1"}
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/hello-world
{"message":"Hello, abc is 2"}
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/hello-world
{"message":"Hello, abc is 3"}
```

If you thought serverless functions are stateless like me, this will be a deep shock. `let abc = 0` is only run once!

This means that we can kind of abuse this fact to build a crappy rate limited function:

```js
// functions/rate-limiting.js
let count = 0;
let firstInvoke = new Date();
exports.handler = async (event, context) => {
  let currentInvoke = new Date();
  let diff = currentInvoke - firstInvoke;
  if (diff < 5000) {
    count += 1;
  } else {
    count = 1;
    firstInvoke = currentInvoke;
  }
  if (count > 3) {
    return {
      statusCode: 429,
      body: JSON.stringify({ message: `Too many requests! ${count}` })
    };
  } else {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Hello, count is ${count}` })
    };
  }
};

```

Let's try it:

```bash
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/rate-limiting
{"message":"Hello, count is 1"}
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/rate-limiting
{"message":"Hello, count is 2"}
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/rate-limiting
{"message":"Hello, count is 3"}
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/rate-limiting
{"message":"Too many requests! 4"}
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/rate-limiting
{"message":"Too many requests! 5"}

# wait 5 seconds...
$ curl https://stateful-serverless-demo.netlify.com/.netlify/functions/rate-limiting
{"message":"Hello, count is 1"}
```

## What's going on?

You probably had the same serverless mental model I had:

![image](https://user-images.githubusercontent.com/6764957/75006590-3ad68980-5440-11ea-85b3-9e64fe3a099c.png)

This would map to each function being stateless.

However, what actually happens is a little messier:

![image](https://user-images.githubusercontent.com/6764957/75006585-3611d580-5440-11ea-9f18-84ff77509461.png)

I first learned about this from [Guillermo Rauch's Stateful Serverless Applications talk at PrismaDay 2019](https://www.youtube.com/watch?v=lUyln5m6AhY&app=desktop) - and it forever changed the way I thought about Serverless.

As you can see from the [AWS Note on Container Reuse](https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/), a significant amount of state in the environment can be reused, even if it can't be relied on. You can even **write to the filesystem** in `/tmp` and it will stick around! 

As [Guillermo notes in his talk](https://youtu.be/lUyln5m6AhY?t=889), this means that other stateful processes in the container will also resume upon subsequent invocations of the same container:

- `setTimeout` and `setInterval`
- child processes (and their children)
- Sockets might need to reconnect

## Spot the bug

It was the nuances described above that caused me to face this bug today. 

Here is the pseudocode, see if you can spot the bug:

```js
exports.handler = async function(event, context) {
  let data = JSON.parse(event.body || "{}");
  sendData(data);
  return { statusCode: 200, body: "OK" };
};
function sendData(data) {
  const https = require("https");
  const options = {/* misc */};
  const req = https.request(options);
  req.write(data);
  req.end();
}
```

Can you spot the bug?

Give up?

`req.write(data)` and `req.end()` are queued child process operations, and the `handler` function returns/terminates before they actually have a chance to complete. It is only when the next function invocation gets called does the container wake up again and execute the prior `req`. So we only see the effect of the first `sendData` on the 2nd function invocation, and so on.

FYI - [initialization is also free](https://twitter.com/alexbdebrie/status/1192120017137127425), so you can stick some heavy require code in there if you don't mind longer cold starts.

## Oh, about Cold Starts

It is a myth that you can simply [periodically ping lambdas to avoid cold starts](https://serverless.com/blog/keep-your-lambdas-warm/) every [5-15 mins](http://stackoverflow.com/questions/42877521/is-it-possible-to-keep-an-aws-lambda-function-warm?noredirect=1#comment72860693_42877521), like you would a health check on a server. It helps but it doesn't solve it.

[**Lambda cold starts** are about concurrent executions](https://hackernoon.com/im-afraid-you-re-thinking-about-aws-lambda-cold-starts-all-wrong-7d907f278a4f). It happens when Lambda decides it needs to initialize another container to handle your function invocation. This is why you can't rely on singleton state in your serverless functions, even though they are stateful. 

However it is also why sending a periodic ping doesn't solve all your cold start problems - it just warms the functions you use the least. This is why [Brian LeRoux](https://twitter.com/brianleroux) has concluded the only reliable way to avoid cold starts is simply to make sure your function is [<1mb of JS](https://twitter.com/brianleroux) (you can do more with faster runtimes like Go).

[Definitely read Yan Cui's article on this in it's entirety to internalize this.](https://hackernoon.com/im-afraid-you-re-thinking-about-aws-lambda-cold-starts-all-wrong-7d907f278a4f)

## Appendix: Master List of Lambda Container Reuse and Cold Start facts

- Cost of cold starts seem to be around 3 seconds
- [Lambdas seem to reset around 14:00 UTC regardless of recency of use](https://read.acloud.guru/how-to-keep-your-lambda-functions-warm-9d7e1aa6e2f0)
- [executions that are idle for a while would be garbage collected](https://read.acloud.guru/how-long-does-aws-lambda-keep-your-idle-functions-around-before-a-cold-start-bf715d3b810)
- [executions that have been active for a while (somewhere between 4 and 7 hours) would be garbage collected too](https://hackernoon.com/im-afraid-you-re-thinking-about-aws-lambda-cold-starts-all-wrong-7d907f278a4f)