---
title: '"No Code" vs RPA'
subtitle: Is Robotic Process Automation just Enterprise™ NoCode?
slug: no-code-rpa
categories: ['No Code']
date: 2020-02-09
description: Is Robotic Process Automation just Enterprise™ NoCode? Yes, and... No.
---

I [spent some time](https://twitter.com/swyx/status/1226678489832730624) looking into RPA ([Robotic Process Automation](https://en.wikipedia.org/wiki/Robotic_process_automation)) today. RPA seems to be Enterprise Edition #NoCode and the pricing disparity is wild. But there are real differences and I am trying to note them down here.

## No Code Players

"No Code" tools are typically in the $50-$300/mo range. Here are some players people consider in the NoCode space:

- Workflow Automation
  - [Zapier](https://zapier.com/) - "Easy automation for busy people. Zapier moves info between your web apps automatically, so you can focus on your most important work."
  - [Parabola](https://parabola.io/) - "Hand off your routine data tasks by describing them in Parabola. Build once, reuse infinitely."
  - [Integromat](https://www.integromat.com/en) - "Integromat is the most advanced online automation platform. We've redefined work automation so everyone can get back to what matters the most."
  - [Retool](https://retool.com/) - "Retool gives you building blocks, which you can assemble into any custom internal tool."
- NLP/OCR
  - [Instabase](https://about.instabase.com/) - Optical Character Recognition, Data Classification & Extraction, Natural Language Processing
  - [Rossum](https://rossum.ai/) - "The next generation invoice data capture tool that works without any specific rule or template setup. Thanks to artificial intelligence."
- Spreadsheets 3.0
  - [Airtable](https://airtable.com/)
  - [Smartsheet](https://www.smartsheet.com/)
- Site Builders
  - [webflow](https://webflow.com/)
  - [Carrd](https://carrd.co/)
  - [Mendix](https://mendix.com)? unsure what they really do
- App builders
  - [Adalo](https://www.adalo.com/)
  - [Glide](https://www.glideapps.com/)
  - [Google AppSheet](https://www.appsheet.com/)

## Comparison with RPA

RPA does "Workflow Automation" and "NLP/OCR" more than the latter "Site Builders" and "App builders" stuff. But what they DO do, is very focused on the enterprise usecase. For example:

- [Excel Automation](https://www.youtube.com/watch?v=MBl-3Yb30FA&t=5491s)
- [PDF Automation](https://www.youtube.com/watch?v=MBl-3Yb30FA&t=9986s)
- [Citrix Automation](https://www.youtube.com/watch?v=MBl-3Yb30FA&t=13553s) (!!!)
- Orchestrator, ReFramework for doing stuff at sales
- [Inferencing and Learning bots](https://www.youtube.com/watch?v=MBl-3Yb30FA&t=30320s)

They are typically Windows apps, rather than web apps, reflecting the audience.

RPA *STARTS* at $1k/mo and seem to avg $5-8k/mo:

- [UiPath](https://www.uipath.com/)
- [Blue Prism](https://www.blueprism.com/)
- [Automation Anywhere](https://www.automationanywhere.com/)
- [Microsoft Power Automate](https://flow.microsoft.com/en-us/)

I also notice that Sales are handled by affiliates like [Edureka](http://edureka.co/), they don't do self service sales like "No Code" tools.

## Comparison Table

|       | No Code | RPA   |
|-------|---------|-------|
| Price range ($/mo) | 50-300    | 1-8k      |
| Sales style      | Self Serve        | Affiliate/"Call us"       |
| Jobs to Do     | Automate + Site/Apps | Automate with existing tools       |

## High Level Thesis

I think RPA justifies its high cost by automating away the even higher cost of dreary boring human work. There is a lot of [TPS report filing](https://www.mentalfloss.com/article/57338/what-tps-report) out there in the world. The less you have to rip 'n replace systems, and the more you can just rip 'n replace humans who work with those systems, that's what you want to go with.

NoCode tools are more greenfield - startups and smaller cos want to grow topline, so there is a more site/app building focus.