---
title: GraphQL Variables and Persisted Queries
subtitle: Something I learned from Lee Byron and Why Babel-Blade is a Bad Idea
slug: why-graphql-variables
categories: ['Tech', 'GraphQL']
date: 2019-09-09
intro: Hi! This is swyx, I work on Developer Experience at Netlify and recently wrote an article on the common trends behind [Design Systems, TypeScript, Apollo GraphQL, and React at CSS Tricks.](https://css-tricks.com/star-apps-a-new-generation-of-front-end-tooling-for-development-workflows/)
---

_This is a brief commentary for the awesome [Ladybug podcast](http://ladybug.dev)._

Hi! This is swyx, I work on Developer Experience at Netlify and recently wrote an article on the common trends behind [Design Systems, TypeScript, Apollo GraphQL, and React at CSS Tricks.](https://css-tricks.com/star-apps-a-new-generation-of-front-end-tooling-for-development-workflows/)

The way GraphQL Variables work is best envisioned by how you would use it inside the GraphiQL tool.

Let's say you are querying the `name` of a `user` with an argument of `id: 1`. We give this query a name of `getUser`. Your query would be a simple string on the top left of GraphiQL:

```graphql
query getUser {
  user(id: 1) {
    name
  }
}
```

However you don't want to hardcode the id of `1` since in your app you might change this around. So the answer is to make your _named query_ itself take arguments, and then pass those arguments down to whichever field takes those arguments. Think of it like making a function that takes arguments, and calls another function with those arguments.

To turn a basic hardcoded query into a dynamic one with variables, you have to do 3 things:

1. Replace the static value in the query with a dollar sign, then variable name. So for our example, we replace `1` with `$id`

2. Declare the variable as one of the arguments accepted by the query. GraphQL is strongly typed, so you also have to provide the variable's type upfront, as well as indicate a required argument with a `!`. So for our example, after the named `getUser` query, we add `($id: ID!)`

3. Separately, pass in the variable name (`id`) and value (`1`) in a JSON object to your GraphQL client library. In GraphiQL, this is the (sometimes hidden) bottom left panel. So top left has your query, and bottom left has your query variables.

```graphql
query getUser($id: ID!){
  user(id: $id) {
    name
  }
}
///// JSON
{
  "id": 1
}
```

Now, you can change your query just by passing in a different JSON object, without rewriting the query string at runtime.

What a lot of people might miss is _WHY_ you don't want to rewrite the query string at runtime. After all, GraphQL clients use the `graphql-tag` library to let you write ES6 template strings, which do string interpolation very well. Instead of writing `$id`, `ID!`, `id`, and `$id` 4 times, I could simply swap the static `1` value with some interpolated value from JavaScript!

This is infact exactly what I did, and I even wrote [a Babel plugin called `babel-blade`](https://babel-blade.netlify.com) to autogenerate the query string at runtime.

But then I met Lee Byron and other longtime users of GraphQL, and learned that the reason you don't rewrite the query string is _because_ you want to hardcode it. If you hardcode your query, you can serialize it upfront, and if you can serialize it upfront, you can make your GraphQL server only respond to that query, and that means hackers can't make unauthorized or prohibitively expensive queries. You can even reduce the query down to a single identifier, like "query 5", meaning you ship less JavaScript and data to your user. For huge apps like Facebook, this made a material difference to their speed, because upload speeds are typically much slower than download speeds, especially on mobile devices. This is a best practice called [Persisted Queries](https://blog.apollographql.com/persisted-graphql-queries-with-apollo-client-119fd7e6bba5). Think of going to your local diner, and instead of ordering "Two all beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun" every time, you just say you'll have "the usual".

Persisted Queries are awesome, and only possible because of GraphQL Variables.
