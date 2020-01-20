---
title: Collapsing Layers
slug: collapsing-layers
subtitle: Doing Less to Do More
categories: ['Tech']
date: 2020-01-20
description: As Moore's Law ends, we must look at optimizing software for continued gains in speed and efficiency.
---

*Essay status: confident in framing, not confident in timing. Still looking for more examples*

**The future of technology is less layers, not more.**

## Table of Contents

## The Mess We're In

As hardware has gotten faster and cheaper over time, we have chosen to stack layer after layer of software on top of each other in the name of ease of use (both taking away lower level concerns for those who would otherwise have to handcode it, and also enabling an ever-wider group of people to write software). This has made a lot of people very angry and been widely regarded as a bad move.

Hut it was the right move - enabling more people to write and use more software accelerated the demand for all technology, hardware included.

Of course, we have always had frequent calls for a return to simplicity and more efficient software. [Niklaus Wirth](https://en.wikipedia.org/wiki/Wirth%27s_law) in 1995 [pled for Lean Software](http://doi.ieeecomputersociety.org/10.1109/2.348001). There is a delicious irony in the contrast between Moore's Law and Wirth's Law - this is a special case of [Jevons paradox](https://en.wikipedia.org/wiki/Jevons_paradox). My favorite modern framing of pits the former CEOs of Intel vs Microsoft: [What Andy giveth, Bill taketh away](https://en.wikipedia.org/wiki/Andy_and_Bill%27s_law). [Joe Armstrong](https://en.wikipedia.org/wiki/Joe_Armstrong_(programmer)) gave a great Strange Loop talk on this fittingly titled [The Mess We're In](https://www.youtube.com/watch?v=lKXe3HUG2l4).

In the 2010's we carried on as our predecessors did. [As the modern iteration of the joke goes](https://twitter.com/iamdevloper/status/926458505355235328?lang=en):

> 1969:
> - what're you doing with that 2KB of RAM?
> - sending people to the moon

> 2018:
> - what're you doing with that 1.5GB of RAM?
> - running Slack

Another favorite stat I like comes from [Jake and Surma](https://www.youtube.com/watch?v=TsTt7Tja30Q) on the size of Minesweeper on Windows:

- Windows 95: 9.6kb 
- Windows Vista: 4MB
- Windows 10: 105MB

**That is 1,050,000% bloat in 20 years.**

## What's changing?

Three factors at play: the slowing of Moore's law, the rise of mobile and wearable devices, and the demand for more secure and reliable software.

### Moore's Law 

Rumors of Moore's law's death have been greatly exaggerated before, but we still hold it to be broadly true. In 2016 the industry collectively agreed it would [die by 2021](https://www.techrepublic.com/article/moores-law-dead-in-2021-heres-what-the-next-revolution-will-mean/), but right on target, [Intel in 2019 said it was back on](https://venturebeat.com/2019/10/24/intel-ceo-7nm-in-2021-will-put-us-back-on-moores-law-cadence/). Of course technically, the law as stated has [died a few "deaths" already](https://www.extremetech.com/extreme/203490-moores-law-is-dead-long-live-moores-law):  we just kept shifting the bar from transistor density to power consumption to marginal cost. So what makes this time any different?

Moore's law won't suffer a dramatic death, it will just slow and become irrelevant compared to progress seen by adopting other chip architectures. We will move from 10nm to 7nm to 5nm and there's a quantum effect-imposed hard limit down near 1nm. But each process node upgrade is getting slower, and more expensive. Meanwhile, we are already shunting plenty of calculations to GPUs, even on smartphones. This is a "collapsing of layers" between workload and chipset, and of course similar movements are happening for all large scale workloads like [cryptocurrency mining](https://en.bitcoin.it/wiki/ASIC) and [machine learning](https://en.wikipedia.org/wiki/Tensor_processing_unit) applications. For general computing consumer hardware, Moore's law is already effectively dead - laptops have not materially gained clock speed in a decade, and we have simply added multiple cores and GPUs.

There is still hope - anything from [quantum computers](https://ai.googleblog.com/2019/10/quantum-supremacy-using-programmable.html) to [photonic chips](https://qz.com/852770/theres-a-limit-to-how-small-we-can-make-transistors-but-the-solution-is-photonic-chips/) to [3d chips](https://www.engadget.com/2018/12/12/intel-foverus-3d-chip/0) - but all of these are at the "science fair" stage and at even longer odds than process node improvements on traditional silicon.

**What's easier - solving quantum computing or taking another look at 50 years of software bloat?**

### Mobile and Wearable Devices

No matter what happens to high end, "full powered" computers, the *range* of computers has also broadened tremendously in our lifetimes and will continue to do so. Just like PCs lagged behind Mainframes, smartphones lag behind PCs, and wearable devices like watches and headphones will lag even further. All of these will always need faster processing at low power at low cost. We cannot conceivably write software for these devices like we do for PCs.

### More Secure and Reliable Software

Software used to be written for technical people, for occasional uses where lives and livelihoods did not depend on it. As [software eats the world](https://techcrunch.com/2016/06/07/software-is-eating-the-world-5-years-later/), these assumptions must change. Of course, most software is not life-or-death, but it is hard to deny that there is a tremendous demand for more reliable software, both from users in the form of fewer bugs and crashes and bad states, as well as from developers in the form of having a more stable substrate on which to write as well as deploying more reliable code per hour (since that is the ultimate limited resource).

I choose to focus on reliability, not speed, so as not to overlap with the above points - we always want faster software. But of course speed leaks into reliability, with timeouts and hidden race conditions and the like. It is a bolder assertion that we can outright achieve more reliable software as well by collapsing layers. I recognize that this is not a necessary result, and that it is somewhat unsubstantiated. But each layer is an abstraction, and [all non-trivial abstractions, to some degree, are leaky](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/). Fewer layers, fewer leaks, fewer bugs - at the cost of having to do more per-layer.

I really don't know anything about security, but this is a major dimension of concern on every device at every level. [By all accounts we are severely lacking here](https://blog.jessfraz.com/post/why-open-source-firmware-is-important-for-security/). And a re-examination and collapsing of layers with the benefit of today's knowledge is likely to yield benefits.

## Dealing with the Cost

Calling for a reversal in a 50 year trend in software bloat is, frankly, ridiculous. I understand that humans are really bad at responding to slow moving train wrecks. Using **nearly-free, tried and tested tech with known bugs** is preferable to sinking a bunch of time into **new, unproven tech with unknown bugs.**

Although the cost of ignoring these issues is rising due to the reasons listed above, we may need a distinct flashpoint event or movement or community that helps to galvanize and coordinate action at every layer of the stack. I confess I have no idea how to do this. I'd love more conversation about it.

However, I do like one concept that has taken in my mind in the past year. The simple phrasing: **layers that belong together, should live together**. In backend API design, it is well known that sorting, filtering and paging of database results belong at the same layer of the stack, since trying to place one thing at a different layer to the other requires so much transmission of information that you basically end up merging layers poorly. So in terms of cost, the collapsing of layers pays for itself because we were paying for the cost anyway through needing to punch holes in layers that ought to have been designed together but never were, through accident of history.

I wonder what other layers "belong together". 

**We might also add layers to reduce layers**. In 2016 Dan Abramov kicked off [a movement to bundle layers in the JavaScript ecosystem](https://increment.com/development/the-melting-pot-of-javascript/). The idea here is that, yes, we are adding layers, but we can reduce a bunch of layers to implementation detail. So from the outside it looks like just one layer, while on the inside there are of course a bunch of layers that are collectively managed by a generous open source community (socializing the cost). 

This is a "cheat", of course - a bunch of layers stuck together with duct tape and elbow grease. We aren't really collapsing layers at all, and it is leaky as hell - but it works to prove out the demand for simplicity, and paves the way [for other tools](https://parceljs.org/) designed from the ground up to handle this.

## What's collapsing?

I intend this to be a living list of current movements in collapsing layers, to inspire the reader as to the wealth of opportunities and the degree of impact that can be had.

- Hardware:
  - We talked about ASICs above. [Oxide](http://dtrace.org/blogs/bmc/2019/12/02/the-soul-of-a-new-computer-company/) arguably takes "the ASIC approach" to the private cloud.
  - [NERF and the Open Source Firmware movement](https://blog.jessfraz.com/post/why-open-source-firmware-is-important-for-security/)
  - [Unikernels](https://thenewstack.io/why-the-unikernel-might-outpace-generic-linux-for-cloud-native-ops/): [servers using 10% of normal energy/CPU cycles](https://www.youtube.com/watch?v=msnQyUwz7ws&feature=emb_title)
  - [Packet](https://www.packet.com/blog/oops-we-forgot-to-build-a-managed-kubernetes-service/) punching through the big cloud names and focusing heavily on automated bare metal
- Software:
  - JavaScript: [Deno](https://deno.land/) folds TypeScript into Node's spiritual successor. [The Pika Project](https://github.com/pikapkg) is helping make build tools optional. [Rome](http://romejs.dev/) is being created to fold prettifying, linting and bundling and typechecking into a single AST run. [Parcel](https://parceljs.org/) folded a bunch of plugins into the build tool to make a true optional config experience. [Svelte](http://svelte.dev/) takes a compiler approach to preserve the declarative authoring experience of frontend frameworks without a virtual DOM layer, also adding in styling and animations in the same toolkit.
  - Reason Native: [`esy` helps compile Reason apps](https://reasonml.github.io/docs/en/quickstart-ocaml) to native code, [removing several layers](https://www.youtube.com/watch?v=QD9hpiBZQvA&feature=youtu.be) and reporting 10x faster startup and 5x less memory usage
- Infrastructure:
  - [JAMstack](http://jamstack.org/) is arguably a movement to collapse deployments straight to the essentials of [Git -> Build -> CDN](https://twitter.com/Netlify/status/1177579567059546113)
- Developer Tools:
  - [Darklang](https://medium.com/darklang/unveiling-dark-e0be6f1e0b06) is collapsing IDE + Language + Cloud Infrastructure
- [What else am I missing?](https://twitter.com/swyx)

## Challenges

To be honest, I myself struggle to reconcile this idea with [Unix philosophy](https://en.wikipedia.org/wiki/Unix_philosophy). I feel a little better that [Linux itself is 15m lines of code](https://unix.stackexchange.com/questions/223746/why-is-the-linux-kernel-15-million-lines-of-code) - in other words - maybe its more about the simple number of layers than the actual depth or thickness of each layer. Rich Harris puts it better than I can: [small modules may be better for developers at the cost of users](https://medium.com/@Rich_Harris/small-modules-it-s-not-quite-that-simple-3ca532d65de4).

I do think that Collapsing Layers is only suitable for a more mature subset of technologies. If something is nascent, growing like a weed, prone to change - you probably still want to tack on more layers. [AWS is growing at 40% a year](https://www.zdnet.com/article/amazon-delivers-mixed-q3-results-as-aws-growth-slows/) and unusable? Fine, add [a second layer cloud](https://softwareengineeringdaily.com/2019/10/14/how-to-build-a-cloud-provider-with-anurag-goel/). Nondeveloper Prosumers want to make software en masse? [Fine, slap a GUI on everything](https://webflow.com/blog/no-code-is-a-lie).

Jim Barksdale is famous for noting that there are [two ways of making money in business: bundling and unbundling](https://hbr.org/2014/07/marc-andreessen-and-jim-barksdale-on-how-to-make-money). This is often applied to the business of software, but one can argue the same for technology architecture. It's time to bundle the basics.