---
title: Engineering Metrics
slug: engineering-metrics
categories: ['Tech']
date: 2020-01-14
published: false
---

- Throughput - PRs getting merged into production
  - at team level, not individual
- Bugs
  - Bugs in production (weekly)
  - Open bugs vs Closed bugs
  - Open bugs by severity and priority
  - Time to close (Cycle time for bugs)
- Community Contributions
- Feature work
- Secuirty

Open questions

- Documentation?
- Batesian Mimicry https://seekingalpha.com/article/217019-a-batesian-mimicry-explanation-of-business-cycles

DX metrics

- OSS projects created (github, codepen, codesandbox)
- Sales contacts collected
- Direct response tracking
- dangers: https://twitter.com/mekkaokereke/status/1233427196829560833

## Sources

- Dalia Havens https://twitter.com/nmeans/status/1152018971433922561
  - https://www.youtube.com/watch?v=6QC1OwoddD8

## to process

- https://www.youtube.com/watch?v=goihWvyqRow
- https://6figuredev.com/podcast/episode-130-progression-into-devops/
  - Throughput
  Lead Time – from concept to deployed
  Deployment Frequency – how frequent new code is deployed
  - Stability
  Change Failure – how often a deployment breaks some thing
  Time to Restore – how quickly to recover from broken (either fix or revert)
  Availability – how often service is good and available to be consumed

- https://github.com/dwmkerr/hacker-laws#user-content-goodharts-law



https://en.m.wikipedia.org/wiki/Application_performance_management


---

Metric		Definition
as of dates (MTD)		"Metrics are being tracked on a weekly basis. As of dates indicate point in time during the week all metrics are pulled against. All metrics are 
aggregated based on the as of date indicated in row 5. For example, New MRR as of 1/16/2020 means New MRR from 1/1/2020 - 1/16/2020"
Self Serve Signups	 sign ups excluding resllers. 
New Active Conversions		Potential change in definition
Monthly Active Developer		"MAD is a trailing 30 day look-back starting from the as of date. Following is what defines an active developer:
Did a deploy: trigger a deploy or create a site
Visited a site admin page (you can't go there without having created an actual site before)
Visited a team admin page (if you visit a teams page that means that you belong to an paid account)
Visited billing page

"
Average Sales Price		
	New Conversion	The average MRR of a conversion from base subscriptions. This excludes metered billings
	Churned	The average MRR of a paid user that churns. This excludes metered billings
Base Subscriptions		"A base subscription is defined as any one of the Netlify products that has a recurring charge irrespective of usage. Specifically: Teams, Analytics, 
Forms, Identity, Functions, Seats"
Metered Billings		Total $$$ billed from metered products usages. Specifically: Bandwidth, Builds, Domains & Forms
Conversions (#)		All conversions that happen in a given month differentiated based on their month of sign up as defined below
	M+0	"Users that sign up and convert in the month of sign up. An M+0 conversion in January-20 implies a January-20 sign up that converted
in January-20. A conversion is defined as a free user that signs up to a recurring base subscription"
	M+1	"Users that sign up and convert in the subsequent month. An M+1 conversion in January-20 implies a December-19 sign up that converted
in January-20. A conversion is defined as a free user that signs up to a recurring base subscription"
	Legacy	All cohorts of users that are not covered by the above two definitions that convert in the month.
Conversions ($$$)		
	M+0	The total new recurring $$$ amount from the cohort as defined above
	M+1	The total new recurring $$$ amount from the cohort as defined above
	Legacy	The total new recurring $$$ amount from the cohort as defined above
		
Conversions (%)		
	M+0	Total conversions from cohort / total signups from this cohort
	M+1	Total conversions from cohort / total signups from this cohort
	Legacy	Total conversions from cohort / total signups from this cohort
	Legacy Base	Total number of customers in all legacy cohorts. This number will go up every month
		
BoM ARR		Beginning of Month ARR
	New ARR	New ARR from recurring subscriptions
	Expansion (Base) ARR	"Expansion ARR from recurring subscriptions. A customer that had any recurring subscription in a prior month and bought
an additional recurring subscription.. For example, a Pro customer buying more seats. Measured on a customer level"
	Expansion (Metered) ARR	"Total growth in metered billings over prior month, measured at the aggregate level. A negative amount will imply we 
billed fewer $$$ in the current month than last"
	Churn ARR	An account that reduces spend on recurring subscriptions to $0
	Contraction ARR	An account that reduces spend on recurring subscriptions but spend is still >$0
EoM ARR		End of Month ARR
Cumulative Metered (MRR)		Total amount of billings through metered products on a monthly basis
Cumulative Metered (ARR)		Total amount of billings through metered products on an annualized basis 
ARR (%)		
	Expansion (Base), Seats, Forms, Identity, Analytics	The MRR from expansion (as defined above) / BoM ARR
	Expansion (Metered) - Builds, BW 	The MRR from expansion (as defined above) / BoM ARR
	Churn	The MRR from churn (as defined above) / BoM ARR
	Contraction	The MRR from contraction (as defined above) / BoM ARR
Pipeline		Amount of pipeline generated from Marketing/Sales