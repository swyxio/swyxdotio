---
title: Scraping Twitter Fail
slug: scraping-twitter-fail
categories: ['Tech']
date: 2020-01-29
published: false
description: no fail
---


I got as far as 

```js
const fetch = require('node-fetch');
const fs = require('fs');

// search, sorted latest
// tweet_search_mode=live
// https://api.twitter.com/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&q=from%3Aswyx&tweet_search_mode=live&count=20&query_source=typeahead_click&pc=0&spelling_corrections=1&ext=mediaStats%2CcameraMoment
// top
// https://api.twitter.com/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&q=from%3Aswyx&count=20&query_source=typeahead_click&pc=1&spelling_corrections=1&ext=mediaStats%2CcameraMoment

// full timeline
// `https://api.twitter.com/2/timeline/profile/33521530.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&include_tweet_replies=false&userId=33521530&count=20&ext=mediaStats%2CcameraMoment`,
// timeline w replies
// include_tweet_replies=true
// `https://api.twitter.com/2/timeline/profile/33521530.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&include_tweet_replies=true&userId=33521530&count=20&ext=mediaStats%2CcameraMoment`,
// minimal necessary
// `https://api.twitter.com/2/timeline/profile/33521530.json?count=100&cursor=HBaAgLuN0ZeQgyIAAA%3D%3D`,
// minimal with full text
// `https://api.twitter.com/2/timeline/profile/33521530.json?count=100&cursor=HBaAgLuN0ZeQgyIAAA%3D%3D&tweet_mode=extended`,
// const cursor = encodeURIComponent('HBaAwLS96u2DhyIAAA=='); // jan 31 - feb 10ish
// const cursor = encodeURIComponent('HBaAwKPVlMeQ+iEAAA=='); // nov 13 to jan 31
// const cursor = encodeURIComponent('HBaCwLWtg/2g7iEAAA=='); // jan 22 to jan 1??? not sure
// const cursor = encodeURIComponent('HBaCwL71obmd4yEAAA=='); // jan 14 to dec 29?
// const cursor = encodeURIComponent('HBaAwLqBm9fU0CEAAA=='); // nov 7 - dec 30?
// const cursor = encodeURIComponent('HBaAwLWBqZ7d7iEAAA=='); // nov 7 - dec 30?

// options
let recurse = true;
let currentCursor = null;
// let currentCursor = 'HBaAgKOBhvfa+iEAAA==';
let convertCursor = () => (currentCursor ? `&cursor=${currentCursor}` : '');

// goal: scrape 24000 tweets
// 2 yrs of 1k tweets a month: 1000 * 12 * 2 = 24000
let goal = 2000; // 24000
let seenSet = new Set();
const headers = {
  authorization: `Bearer REDACTED`,
  cookie: `REDACTED COOKIE STUFF WITH CSRF ID`,
  'x-csrf-token': 'REDACTED CSRF TOKEN'
};
let countMultiplier = 1; // set it to 1 to look like your normal timeline
function scrapeStuff() {
  setTimeout(
    () =>
      fetch(
        `https://api.twitter.com/2/timeline/profile/33521530.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&include_tweet_replies=false&userId=33521530count=${20 *
          countMultiplier}${convertCursor()}&ext=mediaStats%2CcameraMoment`,
        // `https://api.twitter.com/2/timeline/profile/33521530.json?count=${20 *
        //   countMultiplier}${convertCursor()}&tweet_mode=extended`,
        { headers }
      )
        .then((res) => res.json())
        .then((temp) => {
          fs.writeFileSync('dump.json', JSON.stringify(temp, null, 2));
          if (temp.timeline) {
            countMultiplier = 1; /// reset to 1 if not 1
            const nextCursor = temp.timeline.instructions
              .find((x) => !!x.addEntries)
              .addEntries.entries.find(
                (x) =>
                  x.content.operation &&
                  x.content.operation.cursor.cursorType === 'Bottom'
                // x.content.operation.cursor.cursorType === 'Top'
              ).content.operation.cursor.value;

            console.log(
              'success',
              Object.keys(temp.globalObjects.tweets).length
            );
            console.log('bottom cursor', nextCursor);
            currentCursor = nextCursor;
            Object.entries(temp.globalObjects.tweets).forEach(([k, v]) => {
              const _date = new Date(v.created_at).toISOString().slice(0, 7);
              const dir = `data/${_date}`;
              fs.mkdirSync(dir, { recursive: true }); // requires node 12
              fs.writeFileSync(`${dir}/${k}.json`, JSON.stringify(v, null, 2));
              seenSet.add(k);
            });
          } else {
            // no results, widen search
            countMultiplier += 1;
          }
          if (seenSet.size < goal) {
            console.log({ seenSet: seenSet.size, goal, countMultiplier });
            if (recurse) scrapeStuff(); // recurse if we still havent reached goal
          }
        })
        .catch((err) => {
          console.error(err);
          fs.writeFileSync(`err_${currentCursor}.json`, err);
        }),
    2000
  );
}
scrapeStuff(); // init
```

but it would terminate badly:

```bash
 ✘  twitter-scraping   master  node script.js
success 25
bottom cursor HBaAwLzxneD2hSIAAA==
{ seenSet: 25, goal: 2000, countMultiplier: 1 }
success 34
bottom cursor HBaAgLDxxuq5gyIAAA==
{ seenSet: 58, goal: 2000, countMultiplier: 1 }
success 29
bottom cursor HBaCgLfZ4KPFgCIAAA==
{ seenSet: 86, goal: 2000, countMultiplier: 1 }
success 30
bottom cursor HBaAwLSR99D5/SEAAA==
{ seenSet: 115, goal: 2000, countMultiplier: 1 }
success 28
bottom cursor HBaAgKOBhvfa+iEAAA==
{ seenSet: 142, goal: 2000, countMultiplier: 1 }
{ seenSet: 142, goal: 2000, countMultiplier: 2 }
{ seenSet: 142, goal: 2000, countMultiplier: 3 }
{ seenSet: 142, goal: 2000, countMultiplier: 4 }
```

with an unhelpful cryptic error i was not able to figure out:

```json
{
  "errors": [
    {
      "code": 214,
      "message": "Bad request."
    }
  ]
}
```