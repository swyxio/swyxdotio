---
title: DynamoDB Debate
slug: dynamodb-debate
categories: ['Tech']
date: 2020-01-29
published: false
description: Pro or Con, dynamodb?
---

SQL vs NoSQL:

- First, NoSQL databases avoid the need for flexibility in your data access by requiring you to do planning up front. Rather than reassembling your data at read time, you will ‘pre-join’ your data by laying it out in the way it will be read.
- The second tradeoff of NoSQL databases is that data integrity is now an application-level concern. While JOINs would allow you for a ‘write once, refer many’ pattern for referenced items, you may need to denormalize and duplicate data in your NoSQL database. For pieces of data that are unchanging — birth dates, order dates, sensor readings — this duplication is no problem. For data that does change, like display names or listed prices, you may find yourself updating multiple records in the event of a change.
- Finally, NoSQL databases are less storage efficient than their relational counterparts, but it’s mostly not a concern. When RDBMS were designed, storage was at more of a premium than compute. This is no longer the case


pro:

- https://www.alexdebrie.com/posts/dynamodb-no-bad-queries/
  - DynamoDB won't let you write a bad query
    - How fast will my query return when the scale is 100X as large? The same — single-digit milliseconds
    - How will my query impact other queries in the database? It won’t — queries are bounded in their resource impact
  - The biggest problem with relational databases: unpredictability
  - How DynamoDB ‘shifts left’ on scalability
  - The three reasons relational databases run into trouble at scale
    - The poor time complexity characteristics of SQL joins,  ( O (M + N) ) or worse
    - The difficulty in horizontally scaling - vertical scaling has limits, the first time you shard u have no way to do it
    - The unbounded nature of queries
  - How DynamoDB avoids the three problems
    - DynamoDB does not allow joins;
    - DynamoDB forces you to segment your data, allowing for easier horizontal scaling; and
    - DynamoDB puts explicit bounds on your queries.
  - Where you might see performance problems with DynamoDB.


cons:

- https://www.alexdebrie.com/posts/dynamodb-no-bad-queries/
  - Pagination: This pagination can bite you as you scale. When your data is small or in testing, you might not need to page through results, or it might just be a single follow-up request to fetch the second page of results. As your data grows, you may find this access pattern taking longer and longer as multiple pages are needed.
  - Hot keys :The second, and more pernicious, way that your DynamoDB table will have trouble as it scales is through hot keys.