---
title: Amplify DataStore Svelte Demo
slug: svelte-amplify-datastore
categories: ['Tech', 'Svelte']
description: This is my attempt adapting an Amplify DataStore tutorial to Svelte
date: 2020-01-23
---

This is a followup to [Writing an Authentication Store in Svelte](https://www.swyx.io/writing/svelte-auth).

Now that I have a nice auth wrapper in Svelte, I can actually start playing around with the DataStore, as [per the React tutorial](https://medium.com/open-graphql/create-a-multiuser-graphql-crud-l-app-in-5-minutes-with-the-amplify-datastore-902764f27404). I had already set up the model and the codegen per its instructions, and the remaining task was to wire up DataStore to do basic CRUD.

## Bottom Line Up Front

You can see the source: https://github.com/sw-yx/svelte-amplify-datastore-demo

and the deployed demo here: https://d1tdmagl19vwso.cloudfront.net/

Concurrent Session CRUD seems to have a bug right now, filed at: https://github.com/aws-amplify/amplify-js/issues/4765

## Wiring up the DataStore

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
  async function listNotes() {
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

## CRUD wrappers

Similarly, you can write simple event handlers that wrap around the basic DataStore operations:

```html
<!-- Main.svelte -->
<script>
  // etc
  let value = '' // we will bind this to a textbox used for search, update, and creation
  const resetValue = () => value = "" // helper to reset value to ''

  // add, update, delete
  const handleAddNote = () => DataStore.save(new Note({ note: value })).then(listNotes).then(resetValue)
  async function handleUpdateNote() {
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

## Display Modes

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

## Putting them together

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
  async function handleSelect(note) {
    value = note.note
    selectedId = note.id
    displayMode = 'update'
  }
  async function listNotes() {
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

 It comes it at 100 lines of code, compared to 158 lines for the React example.

You can see the source: https://github.com/sw-yx/svelte-amplify-datastore-demo and the deployed demo here: https://d1tdmagl19vwso.cloudfront.net/

- Try going offline, editing, and going back online again.
- Concurrent Session CRUD seems to have a bug right now, filed at: https://github.com/aws-amplify/amplify-js/issues/4765
