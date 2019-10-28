---
title: ryan infra notes
published: false
---

## How Does Netlify Work

the heart of what we do is serve requests


## Request Chain

what happens an unauthenticated HTTP request to `example.com/beer.jpeg` comes in?

- starts with CDN Box
  - CDN spans 8 (and growing) providers
  - 14-18 points of presence
    - in any region we will have multiple versions of the same node (eg Frankfurt has 3, SF 4, JFK 3, spanning zones. we have London and Dublin across clouds so that one region on a cloud can fail and we fail over)
- First, *magically does DNS* (discussed later)
- goes into Apache Traffic Server (ATS)
  - caching server
  - open source project
  - very complex threading model
  - we have 2 plugins for it now, hope to expand over time
  - communicates with our MongoDB instance to resolve geoip based stuff
  - if it is a cache hit, we resolve that request and never see it again 😃
  - 90-95% cache hit rate, so never seen downstream
  - when there is a miss, ATS has a concept of "origin"
- origin loops and contacts our Proxy service
  - Proxy is a go binary we write that does reverse proxying and does a lot of our business logic
    - is this an origin request?
    - vendor request?
    - request to an external engine?
  - if its a standard request, it exits the CDN Box and goes to the Origin
  

- Origin (35 instances, almost all in Google Central US regions)
  - Origin has to figure out what actual bytes to serve
  - made up of 2 services
    - Netlify Server
    - BitBalloon (backs Netlify Server)
      - original Proof of Concept when we started the company
      - handles a lot of biz logic with the MDB cluster
  - Origin runs in GCP (GKE)
    - K8s cluster
    - 2 diff pods (Server Pod and BitBalloon Pod)
    - Netlify Server (on GCS) is the first gateway   
      - can i handle this request?
      - if possible, try not to
      - protecting the origin
      - handles things like:
        - is this a request for an asset that runs thru our public cdn (cloudfront) - uses heuristics on url to figure this out
      - no? fall thru to BitBalloon
    - BitBalloon (Ruby on Rails app)
      - last point of handling, has to figure out what are the actual bytes for the request
      - figure out:
        - what site does `example.com` map to?
          - x0 million sites, which one is it
          - figure out what the current deploy is
          - what object in that deploy
          - a lot of back n forth with mongodb to figure this out
          - resolve to a subdomain like `*.netlify.com`
          - object contains list of all the assets
            - incl checking for redirects and their status
            - this is what we mean by immutable deploys
        - find the SHA1 (someday will move to SHA256, not easy)
      - impt to figure out what the current deploy we are supposed to serve, and inside that, what path we serve, is impt
    - Note: Each service takes a web request - there is no special API
    - Bitballoon then contacts the cloud provider (RAX, replicated to GCS, S3) and gets those bytes and funnels those bytes all the way back up 
      - BB doesnt actually handle the funnelling  - bc Ruby is slow with object thruput - so uses the SHA to tell Netlify Server to do the funnelling
      - Netlify Server has heuristics on which cloud to actually use
  
          




Our MongoDB instances
  - 5 nodes: 3 GCS (spans 3 zones), 2 AWS

When it is NOT a basic asset request
  - eg a redirect
  - `_redirects` or `netlify.toml`
  - specify rules in order (so there can be shadowing problems) like `/api/* heroku.mything/:splat 200` 
  - forwarded on the edge to your heroku instance
  - on the backend you can actually fan out to multiple instances
  - very complex subject
    - e.g. we handle resigning of URLs with JWTs
  - external redirect `/api/* heroku.mything/:splat 200` 
    - if cache headers
      - we will cache, be very careful
    - if no caching headers
      - fall down to Proxy, then to Origin, which figures out it's not requesting an object
      - bundle up the entire `_redirects` file + a map of path to SHA (all the files in that deploy)
      - pass back up to Proxy
      - Proxy turns it in to a "redirects bunffdle" and a Bloom filter (probabilistic data structure where no means no, yes means maybe)
        - Impt Nuance: you can shadow files
        - e.g. if `/api` -> heroku but `/api/notfound` has a file, we have to serve that file
          - check the bloom filter for the object first
          - if no, proxy
          - if yes, follow request to Origin to figure out where object is, if not found then make the proxy
          - if you want to excape this shadowing behavior, you have to force it. Netlify's docs on this are good.
      - proxies to `heroku.mything` etc
      - content comes back and is served


TODO

- object resolution