---
title: Writing an Authentication Store in Svelte
slug: svelte-auth
categories: ['Tech', 'Svelte']
description: This is my attempt today wrapping an Authentication workflow into a Svelte Store
date: 2020-01-22
---

## Table of Contents

Chris Dhanaraj, one half of the AMAZING [Toolsday](https://twitter.com/toolsday?lang=en) duo with the equally talented [Una Kravets](https://twitter.com/una), and [serial mispronouncer of my name](https://spec.fm/podcasts/toolsday/311251), recently schooled me that [Svelte Stores are very similar to React Hooks](https://twitter.com/chrisdhanaraj/status/1214663440184164352). I objected at first, but Rich Harris confirmed he was right.

This is my attempt today wrapping an Authentication workflow into a Svelte Store, just like I did with [Netlify Identity and React Hooks + Context](https://github.com/sw-yx/react-netlify-identity-widget). This example uses Amplify Auth, but really its going to be the exact same for any auth library/system.

## Bottom Line Up Front

You can see my Live Demo here: https://d1tdmagl19vwso.cloudfront.net/

and the source code is at: https://github.com/sw-yx/svelte-amplify-auth-demo

![image](https://user-images.githubusercontent.com/6764957/72947142-2030c800-3d4f-11ea-8095-cd1df9d3920e.png)

> *Sequel post: [Optimistic, Offline-First Apps with Svelte and Amplify DataStore](https://www.swyx.io/writing/svelte-amplify-datastore/)*

## Process - setup from Scratch

> ⚠️Note: this is a backward reconstruction of my process, I have not doublechecked that I have accounted for every step of the process if you followed this tutorial from top down. Thinking caps on!

Originally I set out to try out [Amplify's new DataStore](https://medium.com/open-graphql/create-a-multiuser-graphql-crud-l-app-in-5-minutes-with-the-amplify-datastore-902764f27404), but quickly got sidetracked because it requires auth and there is no Amplify Svelte adaptor. So I embarked on a little bit of yak shaving to implement auth in a simple Svelte app.

I think the best way to start is to boot up a standard Svelte app:

```bash
npx degit sveltejs/template-webpack svelte-app # must use webpack, Amplify doesnt work with rollup
cd svelte-app
npm install
npm run dev
```

And then follow some of the steps on Amplify's Auth docs: 

- https://aws-amplify.github.io/docs/js/authentication#configure-your-app
- https://github.com/aws-amplify/amplify-js/blob/master/README.md#2-add-authentication-to-your-app

```bash
npm i @aws-amplify/auth @aws-amplify/core aws-amplify
npx amplify-app
amplify init 
amplify add auth
```

You will also need to modify Svelte's root js page to use amplify's generated config files ([adapting their Configuration docs](https://github.com/aws-amplify/amplify-js/blob/master/README.md#configuration)):

```js
// src/main.js
import App from './App.svelte';

import Amplify from '@aws-amplify/core';
import Auth from '@aws-amplify/auth';
import aws_exports from './aws-exports';

Amplify.configure(aws_exports);

const app = new App({
  target: document.body,
  props: {
    name: 'world'
  }
});

export default app;
```

You are now ready to add Svelte stores.

## Adding a Svelte Store

Svelte stores are dead easy to use. I gave an [Intro to Svelte Stores](https://twitter.com/SvelteSociety/status/1215264775262949378) recently. You could also [RTFM](https://svelte.dev/docs#svelte_store) but where's the fun in that??

```js
// auth.js
import { writable } from 'svelte/store';

export const store = writable(null); // start with no user
```

And so we have a two line store we can now use in our app. Let's also create a login component:


```html
<!-- src/Login.svelte -->
<script>
  import { store } from './auth.js'
  let username = ""
  let password = ""
  let email = ""
  function handleSubmit() {
    $store = { username } // simulate login
  }
</script>
<div>
  <h1>Sign In</h1>
  <pre>{JSON.stringify($store, null, 2)}</pre>
  <form on:submit|preventDefault={handleSubmit}>
    <label>
      Username:
      <input type="text" bind:value={username} placeholder="your username"/>
    </label>
    <label>
      Password:
      <input type="password" bind:value={password} />
    </label>
    <label>
      Email:
      <input type="email" bind:value={email} />
    </label>
    <button type="submit">Submit</button>
  </form>
</div>
```

Here we are using two way binding and the `$` store autosubscribe syntax to make creating the form easy.

Implementing logout is even easier:

```html
<!-- Main.svelte -->
<script>
  import { store } from './auth.js'
  function logout() {
    $store = null
  }
</script>
<main>
  <h2>You are logged in <button type="button" on:click={logout}>Log Out</button></h2>
  <pre>
    {JSON.stringify($store, null, 2)}
  </pre>
</main>
```

and you can tie them together in your main app:

```html
<!-- App.svelte -->
<script>
	import Login from './Login.svelte'
	import Main from './Main.svelte'
	import { store } from './auth.js'
</script>

<main>
	{#if $store != null}
		<Main />
	{:else}
		<Login />
	{/if}
</main>
```

## Adapting the Auth Library

Now lets actually wire up the submit handler to sign up the user:

```html
<!-- src/Login.svelte -->
<script>
  import { store } from './auth.js'
  import Auth from '@aws-amplify/auth';
  let username = ""
  let password = ""
  let email = ""
  function handleSubmit() {
    Auth.signUp({
      username,
      password,
      attributes: {
        email,
      },
    }).then(user => {
      $store = user //  save user object, representing a successful login
    })
  }
</script>
<!-- etc -->
```

Ok, this lets us sign people up but then we also need to confirm the user.  Amplify requires a two step signup process - a [sign up](https://github.com/aws-amplify/amplify-js/blob/master/README.md#2-add-authentication-to-your-app) and then a [confirm step](https://aws-amplify.github.io/docs/js/authentication#sign-up) for 2FA verification (in this case, your email, but they also do SMS). Because this is Amplify specific, I'm going to handwave over it and ask you to look at my demo if you need details. It's gonna be dependent on whatever you actually end up using.

## Showing Promise State

It's a good user experience to tell the user exactly what's going on with their login, while it happens. Svelte helps with this too with the super handy [await syntax](https://svelte.dev/docs#await). The trick to this is assigning a promise to a variable, and then letting Svelte track/unroll the state of the promise as it goes inflight and results in either success or failure:

```html
<!-- src/Login.svelte -->
<script>
  import { store } from './auth.js'
  import Auth from '@aws-amplify/auth';
  let username = ""
  let password = ""
  let email = ""
  let promise // undefined at first
  function handleSubmit() {
    // etc...
  }
</script>

{#await promise}
  <p>Logging in...</p>
{:catch error}
  <p class="errorMessage">Something went wrong: {error.message}</p>
{/await}
<!-- etc -->
```

You can test the rejection case works by assigning 

```js
promise = new Promise((yay, nay) => setTimeout(() => nay({message: 'rejected'}), 1000)
```

## Moving Logic into the Store

What we've made isn't really reusable. I like wrapping up reusable behavior in UI-less libraries - this was the original impetus behind hooks, which [Merrick Christensen called Headless Components](https://medium.com/merrickchristensen/headless-user-interface-components-565b0c0f2e18). This way, you get to reuse this code however you like with whatever UI you like. We're also mixing a lot of business logic into our Login component, and it might be nice to split it out a bit.

So lets revisit the store and do the move:

```js
// src/auth.js
import { writable } from 'svelte/store';
import Auth from '@aws-amplify/auth';

export const store = writable(null);
export const logout = () => store.set(null);
export async function signUp(username, password, email) {
  return Auth.signUp(username, password, email)
          .then((data) => void store.set(data));
}
// etc, as needed
```

Now I can `import { logout, signUp } from './auth'` anywhere in my app and use this logic!

## Draw the rest of the Owl

Do more of the same for signing in an already signed up user.

## Bonus: persisting state to localStorage

It can be annoying to lose the logged in user state on refresh. People expect their session to stick around. so you might want to sync up the user object to localStorage:

```js
// src/auth.js
import { writable } from 'svelte/store';
import Auth from '@aws-amplify/auth';

let _user = localStorage.getItem('amplifyUser');
export const store = writable(_user ? JSON.parse(_user) : null);
store.subscribe((value) => {
  if (value) localStorage.setItem('amplifyUser', JSON.stringify(value));
  else localStorage.removeItem('amplifyUser'); // for logout
});
```

Note some caveats - this may need an isomorphic wrapper if you are doing server side rendering, and that there are some security situations in which you should not store JWT's in localStorage. You can adapt your code to your needs but this will get you started.

That's all I've got - even getting here took longer than I thought! I hope to return to DataStore at some point but figured I would write up what I have.

> *Sequel post: [Optimistic, Offline-First Apps with Svelte and Amplify DataStore](https://www.swyx.io/writing/svelte-amplify-datastore/)*