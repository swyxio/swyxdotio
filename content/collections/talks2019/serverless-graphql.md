---
title: Serverless GraphQL
slug: serverless-graphql
topic: GraphQL
venues: GraphQL Asia
date: Apr 2019
url: https://www.youtube.com/watch?v=lq_He6Buv14
desc: A basic talk on how serverless functions work with GraphQL
description: GraphQL is often synonymous with the return of Monolithic architecture. Does this mean the benefits of Serverless are irrelevant? In this talk we explore how Serverless and GraphQL work together, explore ways to stitch individual function schemas, and get hard numbers to fight performance concerns.
---

## Basic Pitch

GraphQL is often synonymous with the return of Monolithic architecture. Does this mean the benefits of Serverless are irrelevant? In this talk we explore how Serverless and GraphQL work together, explore ways to stitch individual function schemas, and get hard numbers to fight performance concerns.

This talk is a gentle reintroduction to the serverless movement for skeptics, who may not have been paying attention to all the GraphQL capabilities that are slowly emerging even on the Serverless side because most tutorials assume monolithic architectures. Nothing in the spec requires a monolith, and in fact resolvers are all mini-serverless functions anyway. We just lack the tools and wholistic viewpoint to address this gap in the market. In this talk we will discuss what we're doing at Netlify to fix that.

## Talk Structure

- DX Engineer, Frontend
  - Babel Blade - solving double declaration problem on the frontend
- Creating > Consuming GraphQL
- Live Demo: Generated Schemas
  - gatsby site
  - showing off netlify dev
  - fauna graphql schema
  - netlify dev --live?
- problems of direct DB schema generation
  - benefits: speed, optimization, aggregation queries
  - resolver spam: DX? Security concern
    - auth? eg C R are different in role than R and D
  - vendor specific conventions. Opportunity to standardize?
    - pluralizing?
    - parent-child relationships
    - special directives
  - business rules "inside" = limits
- The Revenge of the Monolith
  - assertion: swing too far against monolith, will come back
  - counter - swung too far towards graphql
- The Benefits of Serverless
  - Managed Deployment: "just write business logic"
  - pay per execution
  - scalability
  - composability
  - immutable deploys
  - incremental adoption
- Live Demo: Resolver First
  - setup serverless gql endpoints
  - setup gateway
  - show how schema stitching works
  - business rules "outside" - max control
- Benefits:
  - schema delegation vs schema merging
  - miniliths! REST? GraphQL?
  - principle of least power
  - easy to wrap REST
  - DataLoader already works like this!
  - simpler auth model - public, private data
- Concerns:
  - cost
  - cold start
    - the 5 minute trick
  - uptime

Talking points

- Is Serverless GraphQL a limitation or an Opportunity
  - limitation:
    - can't maintain internal state
  - opportunity:
    - gradual adoption of graphql
    - break the frontend
    - iterate at the speed of product needs, not permission
- What we need
  - make it easier to write Fat gateways
  - better tooling to wrap REST/Swagger APIs
  - more innovation in schema federation and stitching
    - compiler approach:
      - split the schema from the resolver
    - modularizing
      - graphql-modules
      - graphql-import
  - how to flow types down from server to client
    - double declaration problem on the frontend
    - typegraphql
    - gql nexus

Open questions

- what is the right cut of a minilith?
- are your needs more often gateway vs endpoint?
