---
title: Optimistic, Offline-First Apps 
subtitle: with Svelte and Amplify DataStore
slug: svelte-amplify-datastore
categories: ['Tech', 'Svelte']
description: This is my attempt adapting an Amplify DataStore tutorial to Svelte
date: 2020-01-23
---

**Offline-first apps and Optimistic UI are essentially the same thing**. Given a well defined backend contract (like GraphQL), we can move a lot of this desirable functionality into a reusable frontend-framework-agnostic "data framework" that handles all this so the developer doesn't have to.

This is why I am interested in DataStore. I wrote [Optimistic, Offline-first apps using serverless functions and GraphQL](https://twitter.com/swyx/status/1108663969466572800) in a private gist a year ago, and I believe that DataStore is the closest attempt at a framework for this since [Meteor](https://docs.meteor.com/api/collections.html) and [PouchDB](https://pouchdb.com/).

This blogpost is a two-parter. 

- Part 1 is a How-To for hooking up Svelte to DataStore. 
- Part 2 is a republishing of my musings on why this is so important.

## Table of Contents

## Bottom Line Up Front

You can see the source: https://github.com/sw-yx/svelte-amplify-datastore-demo

and the deployed demo here: https://d1tdmagl19vwso.cloudfront.net/

![sveltedatastore](https://user-images.githubusercontent.com/6764957/73031770-05238e00-3e0b-11ea-8bf8-67ca0f844c2c.gif)


Concurrent Session CRUD seems to have a bug right now, filed at: https://github.com/aws-amplify/amplify-js/issues/4765

## Part 1 - Svelte + DataStore

### Wiring up the DataStore

This is a followup to [Writing an Authentication Store in Svelte](https://www.swyx.io/writing/svelte-auth).

Now that I have a nice auth wrapper in Svelte, I can actually start playing around with the DataStore, as [per the React tutorial](https://medium.com/open-graphql/create-a-multiuser-graphql-crud-l-app-in-5-minutes-with-the-amplify-datastore-902764f27404). I had already set up the model and the codegen per its instructions, and the remaining task was to wire up DataStore to do basic CRUD.

The tutorial example colocates the DataStore logic with component logic. This is nice and short but sometimes you might wish to move it out into an app-level state. I was tempted by the idea of having a "Amplify DataStore Svelte Store" just like the much-maligned [AWS Systems Manager Session Manager](https://twitter.com/quinnypig/status/1166847095736807424). But it is extra complexity so I discarded the idea.

What's really nice about Svelte is that almost everything inside the `<script>` tag is "just JavaScript. The only things that get transformed are the assignment operators and the magic `$` reactivity label. So most of these examples I can do in "plain JS".

First step is to establish some state to be able to store stuff:

```html
<!-- Main.svelte -->
<script>
  let notes = [] // in memory copy of all the results from DataStore queries
  const setNotes = v => void (notes = v) // helper to set the store
</script>
```

Easy peasy! now let's actually grab some data from the store when the component mounts and unsubscribe when it unmounts:

```html
<!-- Main.svelte -->
<script>
  import { DataStore, Predicates } from '@aws-amplify/datastore';
  import { Note } from './models';
  import { onMount, onDestroy } from 'svelte';
  
  let notes = [] // in memory copy of all the results from DataStore queries
  const setNotes = v => void (notes = v) // helper to set the store
  function listNotes() {
    return DataStore.query(Note, Predicates.ALL).then(setNotes);
  }

  // do stuff on mount/unmount
  onMount(listNotes);
  const subscription = DataStore.observe(Note).subscribe(listNotes);
  onDestroy(subscription.unsubscribe)
  
  // handle connectivity and logout
  const handleConnectionChange = () => {
    const condition = navigator.onLine ? 'online' : 'offline';
    if (condition === 'online') listNotes();
  };
  window.addEventListener('online', handleConnectionChange);
  Hub.listen('auth', (data) => (data.payload.event === 'signOut') && DataStore.clear())
</script>
```

We don't technically have to wrap DataStore in functions, but it can make the code a lot more readable and abstract implementation from the actual domain.

### CRUD wrappers

Similarly, you can write simple event handlers that wrap around the basic DataStore operations:

```html
<!-- Main.svelte -->
<script>
  // etc
  let value = '' // we will bind this to a textbox used for search, update, and creation
  const resetValue = () => value = "" // helper to reset value to ''

  // add, update, delete
  const handleAddNote = () => DataStore.save(new Note({ note: value })).then(listNotes).then(resetValue)
  function handleUpdateNote() {
    const original = await DataStore.query(Note, selectedId);
    await DataStore.save(
      Note.copyOf(original, (updated) => void (updated.note = value))
    ).then(listNotes)
  }
  async function deleteNote(id) {
    const toDelete = await DataStore.query(Note, id);
    return DataStore.delete(toDelete);
  }
</script>
```

### Display Modes

The original demo used a set of Boolean states to manage what was displaying on screen:

```js
  const [displayAdd, setDisplayAdd] = useState(true);
  const [displayUpdate, setDisplayUpdate] = useState(false);
  const [displaySearch, setDisplaySearch] = useState(false);
```

This can result in weird states because it relies on the developer correctly resetting values as appropriate on each state change. It is probably better to consciously design states like this:

```js
  let displayMode = 'add' // add, search, update
```

and you are free to just set displayMode once and be sure that your UI will rerender as intended. Instead of 2x2x2 = 8 possible states, you get 3 and only 3. I did a small version of this with [the auth screen](https://www.swyx.io/writing/svelte-auth) as well.

### Putting them together

We can now wire up the CRUD wrappers and Display Modes together to create a full Svelte clone of the DataStore example:


```html
<!-- Main.svelte -->
<script>
  import { store as authStore, logout } from './stores/auth.js'
  import Amplify, { Hub } from '@aws-amplify/core';
  import { DataStore, Predicates } from '@aws-amplify/datastore';
  import { Note } from './models';
  import { onMount, onDestroy } from 'svelte';

  let displayMode = 'add' // add, search, update
  let value = ""
  const resetValue = () => value = ""
  let selectedId = ""
  let notes = [] // in memory copy of all the results from DataStore queries
  const setNotes = v => void (notes = v) // helper to set the store
  onMount(listNotes);
  const subscription = DataStore.observe(Note).subscribe(listNotes);
  onDestroy(subscription.unsubscribe)
  const handleConnectionChange = () => {
    const condition = navigator.onLine ? 'online' : 'offline';
    if (condition === 'online') listNotes();
  };
  window.addEventListener('online', handleConnectionChange);
  Hub.listen('auth', (data) => (data.payload.event === 'signOut') && DataStore.clear())
  function handleAddNote() {
    return DataStore.save(new Note({ note: value })).then(listNotes).then(resetValue)
  }
  async function handleUpdateNote() {
    const original = await DataStore.query(Note, selectedId);
    await DataStore.save(
      Note.copyOf(original, (updated) => void (updated.note = value))
    ).then(listNotes)
  }
  function handleSearch() {
    displayMode = 'search'
    DataStore.query(Note, (c) => c.note('contains', value)).then(setNotes)
  }
  function clearSearch() {
    displayMode = 'add'
    listNotes().then(resetValue)
  }
  function handleSelect(note) {
    value = note.note
    selectedId = note.id
    displayMode = 'update'
  }
  function listNotes() {
    return DataStore.query(Note, Predicates.ALL).then(setNotes);
  }
  function handleDelete(id) {
    return async () => {
      const toDelete = await DataStore.query(Note, id);
      DataStore.delete(toDelete).then(listNotes)
    }
  }
</script>

<h2>You are logged in as {$authStore.username} <button type="button" on:click={logout}>Log Out</button></h2>
<div class="container">
  {#if displayMode === 'add'}
  <form on:submit|preventDefault={handleAddNote}>
    <div class="input-group mb-3">
      <input type="text" class="form-control form-control-lg" placeholder="New Note" bind:value />
      <div class="input-group-append">
        <button class="btn btn-warning border border-light text-white font-weight-bold" type="submit">
          Add Note
        </button>
        <button class="btn btn-warning border border-light text-white font-weight-bold" type="button" on:click={handleSearch} >
          Search
        </button>
      </div>
    </div>
  </form>
  {/if}
  {#if displayMode === 'update'}
  <form on:submit|preventDefault={handleUpdateNote} >
    <div class="input-group mb-3">
      <input type="text" class="form-control form-control-lg" placeholder="Update Note" bind:value />
      <div class="input-group-append">
        <button class="btn btn-warning text-white font-weight-bold" type="submit">
          Update Note
        </button>
      </div>
    </div>
  </form>
  {/if}
</div>
<div class="container">
  {#each notes as item}
  <div class="alert alert-warning alert-dismissible text-dark show" role="alert">
    <span on:click={() => handleSelect(item)}>{item.note}</span>
    <button type="button" class="close" data-dismiss="alert" aria-label="Close" on:click={handleDelete(item.id)} >
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  {/each}
  {#if displayMode === 'search'}
  <button class="button btn-warning float-right text-white font-weight-bold" on:click={clearSearch}>
    <span aria-hidden="true">Clear Search</span>
  </button>
  {/if}
</div>
```

It comes in at 100 lines of code, compared to 158 lines for the React example.

You can see the source: https://github.com/sw-yx/svelte-amplify-datastore-demo and the deployed demo here: https://d1tdmagl19vwso.cloudfront.net/

- Try going offline, editing, and going back online again. You **do not lose data** and it is always fast because you're writing to a local store first.
- Concurrent Session CRUD seems to have a bug right now, filed at: https://github.com/aws-amplify/amplify-js/issues/4765

## Part 2 - Why this is Important

I wrote [Optimistic, Offline-first apps using serverless functions and GraphQL](https://twitter.com/swyx/status/1108663969466572800) in a private gist a year ago, and I believe that DataStore is the closest attempt at a framework for this since Meteor and [PouchDB](https://pouchdb.com/). ([Eric Vicenti](https://twitter.com/EricVicenti) also has a more nascent project, Aven Cloud), and I have yet to confirm if Firebase's SDK actually does this as well. [Replicache](https://replicache.com) is a newer attempt at this problem.

The main realization is that Offline-first and Optimistic UI are essentially the same thing, and given a well defined backend contract (like GraphQL), we can move a lot of this desirable functionality into a reusable frontend-framework-agnostic "data framework" that handles all this so the developer doesn't have to.

### Optimistic Apps

In a world where API latency is unpredictable, the way to make user interactions seem instant is essentially by lying to the user. Most implementations of optimistic updates work like this:

- duplicate what the result of the interaction would be in clientside code, while sending off the interaction to the server.
- (optional) If this succeeds, the legitimate result may replace the clientside simulated result
- If this fails, a notification is shown and the result is reverted.

Pulling this off well is tremendously hard to do:

- Design considerations of whether to make it clear the optimistic result is not final, and how to revert on failure
- Authentication may expire, or APIs may hit other limits
- Properly keeping the rest of the app in sync that may need to know about this update
- Firing off multiple interactions that depend on each other, where some may fail and some may succeed, possibly arriving at the API out of sequence.
- State changes on the serverside that may impact the results of user's interaction (for example, from other users)

```
Paradigm 1: Client <-> Server
```

Against the sole benefit of "feeling instant", the engineering challenge of coordinating all these cases may often kill the goal.

### Offline-first

A constraint that can simplify the design and engineering of Optimistic UI is the idea of Offline-first apps. This concept is still very new and not that popular with webapps, and traditionally has more to do with local storage and manipulation of data (and subsequent syncing). The usage of service workers and IndexedDB to do this gives this concept a lot of overlap with Progressive Web Apps.

Here the challenge is to download some subset of data that is likely to be useful, as well as being able to locally operate on that data, while being able to sync back and forth with the data store.

However, simply having an explicit layer to control syncing on one side (facing the server) and updates on the other (facing the client) with explicit global knowledge of whether we are in online or offline state can make the programming model a lot clearer.

```
Paradigm 2: Client <-> IndexedDB + Service Worker <-> AppSync
```

### GraphQL as Contract

One way to dramatically lock down the surface area of REST endpoints is to only communicate back and forth between client and service worker and server with GraphQL. On the clientside, DataStore exposes a constrained ORM for this purpose, which gets translated to GraphQL queries for AppSync.

```
Paradigm 3: Client <- DataStore queries -> IndexedDB + Service Worker <- GraphQL -> AppSync
```

### Conflict resolution

Of course all this is nice until you have multiple people editing the same fields on a database. The nice word for this is "collaboration", but to devs the technical term is "clusterfuck". 

[Commutative operations](https://sciencing.com/associative-commutative-property-of-addition-multiplication-with-examples-13712459.html) are still fine. Order doesn't matter.

But so many interesting things happen when order matters. The simplest strategy is "Last-Write-Wins". But sometimes you want to merge complex objects. And also you should have a way to not discard data irretrievably for dropped updates.

I haven't done a whole lot of thining here, to be brutally honest. I just know it's hard and I rather hand it over to a framework unless I absolutely have to dig into it. More reading from smart people:

- [DataStore docs on their Conflict Detection](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
- [Richard Threlkeld - AppSync/DataStore session at Re:invent 2019](https://www.youtube.com/watch?v=KcYl6_We0EU&list=WL&index=4&t=5s)
- [Richard on more important nuances](https://twitter.com/undef_obj/status/1213034443759243264)
- [James Long - CRDTs for Mortals](https://twitter.com/swyx/status/1215631885239492610)
- [Andrew Herron - To OT or CRDT, that is the question](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)
- [Thai Pangsakulyanont - Handling Optimistic Updates in a Separate Queue](https://www.youtube.com/watch?v=DWZj56qUNfs&app=desktop)
  - [Richard's comments](https://twitter.com/undef_obj/status/1213020036484366336): What this is talking about is needing a deterministic synchronization protocol that has both safety and correctness in the system. Separate stores is one way to do this on the client, however it doesn't address the problem of dealing with conflicts
- what else is required reading? [please let me know.](https://twitter.com/swyx)