# Public YouTube reference snapshot for /draw

**Snapshot:** 2026-08-26T08:23:54.664Z. **Coverage:** 70/70 collection slots; 69 unique videos; seven verified channels. **Visual review:** all 69 unique thumbnails inspected; 57 have manually transcribed prominent text.

## Scope and evidence

- **Latest:** first five cards in the official channel **Videos** tab with **Latest** selected. **Popular:** first five returned by that tab’s **Popular** sort control. These are two separately retrieved channel orders, not the top five of a recent sample.
- This does **not** claim a fully enumerated all-time ranking across every upload, deleted video, Shorts tab, Live tab, region or members-only inventory. Separate Shorts and Live tabs were not traversed. A short-duration upload can still appear on the Videos tab.
- Publicly listed members-only cards are retained if YouTube includes them in the requested order; listing visibility is not playback access. Matthew Berman’s `eHigN-2_go8` was marked **Members only**, and its view count was unavailable. No member video, transcript or audio was fetched.
- Channel IDs, titles, ordering, thumbnail URLs, relative publication labels, rounded view labels and durations come from YouTube’s public web metadata. Title strings are stored as observed, including punctuation and apparent typos; no title was replaced by an analyst rewrite.
- Exact publication dates and view counts are omitted when unavailable. Displayed labels such as “2 weeks ago” and “1.4M views” are not converted into fabricated dates or exact integers. No performance claim is inferred from view count.
- `thumbnailText` is manually observed **prominent thumbnail copy**, not spoken quotation evidence. Reading order and line breaks are normalized; punctuation is transcribed visually, not pixel/OCR identity proof. Small logos, watermarks, background code and secondary UI labels may be omitted. Examples without a standalone headline have no `thumbnailText`; absence is not filled from the video title.
- Example `notes` are original analyst readings, not creator-approved prompts, brand rules, endorsements or causal explanations of success. These references do not authorize reuse of portraits, logos, thumbnails or original compositions.
- Only public thumbnail **URLs** are included in the repository. Temporary image downloads/contact sheets were used for analysis only; no binaries were rehosted, no private assets were added and no paid inference ran.

## Identity decisions

| Requested creator | Selected official channel                                  | Immutable channel ID       | Evidence / distinction                                                                                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dwarkesh Patel    | [@DwarkeshPatel](https://www.youtube.com/@DwarkeshPatel)   | `UCXl4i9dYBrFOabk0xGmbkRA` | [Dwarkesh about page](https://www.dwarkesh.com/about) links `/c/DwarkeshPatel`; YouTube channel metadata resolves the ID.                                                                                                                                                              |
| Matthew Berman    | [@matthew_berman](https://www.youtube.com/@matthew_berman) | `UCawZsQWqfGSbCI5yjkdVkTA` | [Forward Future](https://forwardfuture.com/) links this exact channel ID. **Not** the different same-name `@MatthewBerman` / `UCzi5kcwU8aT4aLR7LcYhfWQ`.                                                                                                                               |
| Matt Pocock       | [@mattpocockuk](https://www.youtube.com/@mattpocockuk)     | `UCswG6FSbgZjbWtdf_hMLaow` | [mattpocock.com/youtube](https://www.mattpocock.com/youtube) redirects to `/c/mattpocockuk`. **Not** his voice/accent channel `@MattPocock` / `UCU7pKYhvlPKc9AgGGDI5mRQ`.                                                                                                              |
| AI Engineer       | [@aiDotEngineer](https://www.youtube.com/@aiDotEngineer)   | `UCLKPca3kwwd-B59HNr-_lvA` | [AI Engineer](https://ai.engineer/) identifies its official channel as `@aiDotEngineer`; public channel metadata confirms the ID.                                                                                                                                                      |
| Latent Space      | [@LatentSpacePod](https://www.youtube.com/@LatentSpacePod) | `UCxBcwypKK-W3GHd_RZ9FZrQ` | [Latent Space TV](https://www.youtube.com/@LatentSpaceTV) explicitly names itself “Latent Space TV (see @LatentSpacePod for Pod)”. Use the podcast channel; do not mix in the community livestream channel `UCvi5jNRoRVm436TVAXet1kQ`.                                                 |
| Theo - t3․gg      | [@t3dotgg](https://www.youtube.com/@t3dotgg)               | `UCbRP3c757lWg9M-U7TyEkXA` | [Theo’s own site](https://t3.gg/) links `@t3dotgg`. Do not merge separate rant/throwaway/clip channels.                                                                                                                                                                                |
| ThePrimeagen      | [@ThePrimeagen](https://www.youtube.com/@ThePrimeagen)     | `UC8ENHE5xdFSwx71u3fDH5Xw` | [ThePrimeagen’s GitHub profile](https://github.com/ThePrimeagen) links both channels separately. This snapshot uses the requested main `@ThePrimeagen`, **not** The PrimeTime `@ThePrimeTimeagen` / `UCUyeluBRhGPCW4rPe_UvBZQ`. Freshness therefore differs from his reaction channel. |

## Retrieval method and reproducibility

Inspected checkout `97b9549` on `codex/draw-show-onboarding`. The research script is `scripts/research-draw-channels.mjs` and uses only Node built-ins. It performs anonymous HTTP reads with no auth cookies, browser profile, bearer token or API key:

1. GET each verified channel’s `/videos?hl=en&gl=US` page; read `channelMetadataRenderer` and reject a mismatched immutable ID.
2. Read the selected Videos `richGridRenderer` and explicit Latest/Popular controls. The current public UI has both direct chips and a dropdown containing the same sort commands; both were observed.
3. For Popular, follow the **actual continuation token supplied by that control** to the fixed public read endpoint `https://www.youtube.com/youtubei/v1/browse?prettyPrint=false`. Select the video-grid replacement, not the preceding sort/header replacement. This POST is a read-only browse operation, not an account mutation.
4. Preserve the first five unique `LOCKUP_CONTENT_TYPE_VIDEO` cards in the returned order. Store each video once using `yt-VIDEOID`; retain membership in both `latestIds` and `topIds`.
5. For this snapshot only, download the 69 public images to `/tmp/draw-reference-research`, create seven 2-column contact sheets (Latest left, Popular right), and inspect each image. No image bytes are committed.

**Important:** the legacy `?sort=p` query was tested and still returned a page with **Latest selected**. It was not treated as proof of Popular ordering. Search snippets and third-party analytics were not used to populate rankings.

The public web response shape is not a supported YouTube Data API contract. Refresh is an explicit research action, not an app runtime dependency. The script labels failed/incomplete collections unavailable/partial and never claims missing results are zero. A refresh intentionally drops visual annotations until thumbnails are re-inspected because even an unchanged image URL can serve changed artwork.

```sh
node scripts/research-draw-channels.mjs
```

### Popular response integrity receipts

Each hash identifies the public JSON response actually used for its Popular order at this snapshot. The response body was not placed in the repo because it includes unnecessary public visitor/tracking fields. Hashes are integrity receipts, not permanent server archives; the source can change.

| Channel         | Popular browse response SHA-256                                    |
| --------------- | ------------------------------------------------------------------ |
| @DwarkeshPatel  | `afff75c3fbd7e943a737fd6b55989f3b6c0cb4ef1be109420af1c84c8bc84f23` |
| @matthew_berman | `71bbf9cd1a030fbbd0048396e43e09f5f8b0a6720b0ed29887139e0d5d94fad4` |
| @mattpocockuk   | `fc255551b265d693c5b09c320aa213e8d73a66655bd0957282c9c99dd80ee948` |
| @aiDotEngineer  | `3d76d88147bcf7e7b945b78f5f66a3c46e5eec4c8ac347147b2e6f65ecb6083a` |
| @LatentSpacePod | `eaa21076455d1ca32937df9182a29d8644d0b827f30da1f34b5da5474a2bdee0` |
| @t3dotgg        | `c083965d096ee63043595840d435c9566c966f6490489f154a4f9f14d3fbbb27` |
| @ThePrimeagen   | `a23ffe3eb8839e27ae82b07c1a347d3146a97ad683443ab2f1917d44993a698a` |

## Snapshot inventory

The video links below support identity/title lookup. To reproduce collection order, open the linked channel’s Videos tab and select the named sort; the current order may differ from this dated snapshot.

### Dwarkesh Patel (@DwarkeshPatel)

[Videos tab](https://www.youtube.com/@DwarkeshPatel/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                                                          | Views observed | Published observed | Thumbnail headline                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | ----------------------------------------------------- |
| Latest 1          | [Dylan Patel – Anthropic & OpenAI will have most of the world’s compute by 2028](https://www.youtube.com/watch?v=aV26V1UvkJw) | 75K views      | 16 hours ago       | “Every force is screeching towards centralization.”   |
| Latest 2          | [Ryan Greenblatt – What happens once AI can automate AI research?](https://www.youtube.com/watch?v=-RXD4bTuFTo)               | 139K views     | 2 weeks ago        | “The most important question in the world right now.” |
| Latest 3          | [8 Predictions for the Era of Continual Learning](https://www.youtube.com/watch?v=iewm45atodE)                                | 55K views      | 2 weeks ago        | Winner takes all at the model layer.                  |
| Latest 4          | [Why smarter AI models could drive up compute prices 10x](https://www.youtube.com/watch?v=oZBGAuANX6I)                        | 95K views      | 3 weeks ago        | The end of cheap compute?                             |
| Latest 5          | [General relativity from first principles – Adam Brown](https://www.youtube.com/watch?v=QbdbAhaJoCQ)                          | 251K views     | 1 month ago        | Explaining Einstein’s most beautiful idea.            |
| Popular 1         | [Sarah Paine — The war for India (Lecture & interview)](https://www.youtube.com/watch?v=LbkO84MsmyM)                          | 5.6M views     | 1 year ago         | SARAH PAINE / EPISODE 1                               |
| Popular 2         | [Sarah C. M. Paine — Why dictators keep making the same fatal mistake](https://www.youtube.com/watch?v=YcVSgYz5SJ8)           | 4.9M views     | 2 years ago        | HITLER’S BLUNDER / FULL EPISODE                       |
| Popular 3         | [Sarah Paine — How Mao conquered China (lecture & interview)](https://www.youtube.com/watch?v=4l3Sa8ImGFQ)                    | 2.4M views     | 1 year ago         | SARAH PAINE / EPISODE 3                               |
| Popular 4         | [Elon Musk – "In 36 months, the cheapest place to put AI will be space”](https://www.youtube.com/watch?v=BYXbuik3dgA)         | 2.1M views     | 6 months ago       | How TeraFab, Starship, and Optimus fit together       |
| Popular 5         | [How Much Will China Risk for Taiwan? – Sarah Paine (Naval War College)](https://www.youtube.com/watch?v=qSTuahfAZf0)         | 2M views       | 2 years ago        | Unavailable / no standalone headline                  |

### Matthew Berman (@matthew_berman)

[Videos tab](https://www.youtube.com/@matthew_berman/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                                                             | Views observed | Published observed | Thumbnail headline                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | ------------------------------------ |
| Latest 1          | [How to Understand the Next Wave of AI Before Everyone Else \| Tibo Interview](https://www.youtube.com/watch?v=4qjEgPojjzM)      | 80K views      | 1 day ago          | TIBO                                 |
| Latest 2          | [ULTRAFAST MODE is coming...](https://www.youtube.com/watch?v=eHigN-2_go8)                                                       | Unavailable    | 4 days ago         | Unavailable / no standalone headline |
| Latest 3          | [11 Grok Bot Use Cases That Could Save You Hours Every Day](https://www.youtube.com/watch?v=5CSXUsljJ_E)                         | 50K views      | 5 days ago         | DOES IT FOR YOU                      |
| Latest 4          | [You NEED to try these 6 Open-Source Projects NOW](https://www.youtube.com/watch?v=1RTq_EWv2Yo)                                  | 81K views      | 8 days ago         | 29.6k                                |
| Latest 5          | [AI News: ChatGPT Ultrafast, Grok 4.6, 3 New Open-Source Models, and more!](https://www.youtube.com/watch?v=9qix4oDB5aw)         | 65K views      | 11 days ago        | HUGE NEWS                            |
| Popular 1         | [Rabbit R1: The First Personal AI AGENT Device NO ONE Saw Coming (Look Out, Apple)](https://www.youtube.com/watch?v=DlnJlG1SOZo) | 1.2M views     | 2 years ago        | INTRODUCING rabbit r1                |
| Popular 2         | [Microsoft CEO’s Shocking Prediction: “Agents Will Replace ALL Software"](https://www.youtube.com/watch?v=uGOLYz2pgr8)           | 1.1M views     | 1 year ago         | SaaS is DEAD                         |
| Popular 3         | [Elon Musk files BOMBSHELL LAWSUIT against OpenAI (“They Achieved AGI”)](https://www.youtube.com/watch?v=_1Fp1A1JWT4)            | 979K views     | 2 years ago        | “HE’S HIDING AGI”                    |
| Popular 4         | [DeepSeek R1 Fully Tested - Insane Performance](https://www.youtube.com/watch?v=bOsvI3HYHgI)                                     | 911K views     | 1 year ago         | DEEPSEEK R1 / TESTED                 |
| Popular 5         | [NVIDIA Unveils "NIMS" Digital Humans, Robots, Earth 2.0, and AI Factories](https://www.youtube.com/watch?v=IurALhiB6Ko)         | 831K views     | 2 years ago        | DIGITAL / HUMAN                      |

### Matt Pocock (@mattpocockuk)

[Videos tab](https://www.youtube.com/@mattpocockuk/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                                                            | Views observed | Published observed | Thumbnail headline                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Latest 1          | [New Skills! v1.2 brings /wait-what, /writing-for-agents, and fixes /grill-me](https://www.youtube.com/watch?v=gaDdrDdczO4)     | 136K views     | 2 weeks ago        | New Docs! / Claude Code Plugin / /wait-what / /wizard / /grill-me changes             |
| Latest 2          | [/wayfinder: Nothing is too big to plan anymore](https://www.youtube.com/watch?v=F3lL98Pj90o)                                   | 311K views     | 3 weeks ago        | Start / Destination                                                                   |
| Latest 3          | [Don't waste time on specs: /prototype instead](https://www.youtube.com/watch?v=n0VhIVtviC0)                                    | 129K views     | 1 month ago        | /prototype is GREAT                                                                   |
| Latest 4          | [mattpocock/skills: A complete AI Coding workflow, end-to-end](https://www.youtube.com/watch?v=M6mYodf0dJM)                     | 322K views     | 1 month ago        | mattpocock/skills / 170K Stars / 9.2m Downloads / No Slop Allowed                     |
| Latest 5          | [New Skills! v1.1 brings /wayfinder, /research, /implement, /to-spec, /to-tickets](https://www.youtube.com/watch?v=A8mokin_YOs) | 230K views     | 1 month ago        | Replaces /grill-me?!                                                                  |
| Popular 1         | [5 Claude Code skills I use every single day](https://www.youtube.com/watch?v=EJyuu6zlQCg)                                      | 478K views     | 5 months ago       | (my favourite) / /grill-me / /write-a-prd / /prd-to-issues / /tdd / /improve-codebase |
| Popular 2         | [/handoff is my new favourite skill](https://www.youtube.com/watch?v=dtAJ2dOd3ko)                                               | 457K views     | 3 months ago       | handoff.md / handoff-2.md                                                             |
| Popular 3         | [Most devs don't understand how LLM tokens work](https://www.youtube.com/watch?v=nKSk_TiR8YA)                                   | 342K views     | 11 months ago      | “the cat sat on the mat”                                                              |
| Popular 4         | [I stopped using /grill-me for coding. Here’s what I use instead:](https://www.youtube.com/watch?v=6BB6exR8Zd8)                 | 326K views     | 3 months ago       | My new favorite skill / /grill-with-docs                                              |
| Popular 5         | [mattpocock/skills: A complete AI Coding workflow, end-to-end](https://www.youtube.com/watch?v=M6mYodf0dJM)                     | 322K views     | 1 month ago        | mattpocock/skills / 170K Stars / 9.2m Downloads / No Slop Allowed                     |

### AI Engineer (@aiDotEngineer)

[Videos tab](https://www.youtube.com/@aiDotEngineer/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                                                                              | Views observed | Published observed | Thumbnail headline                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | ------------------------------------------------- |
| Latest 1          | [The Missing Layer in Agentic AI — Giedrius Šteimantas, Oxylabs](https://www.youtube.com/watch?v=XsvUhpnHepE)                                     | 173 views      | 1 hour ago         | His Shopping Agent Got Captcha'd Into Oblivion    |
| Latest 2          | [Einstein Arena: Harnessing Collective Agent Intelligence for Open Science — James Zou, Together AI](https://www.youtube.com/watch?v=mMNkdYnIVC4) | 796 views      | 11 hours ago       | Half of Data Science Benchmarks Can Be Gamed      |
| Latest 3          | [The Agent Behind the Curtain: Building the Oz Cloud Agent Platform — Safia Abdalla, Warp](https://www.youtube.com/watch?v=L173Z8DpaJg)           | 2.7K views     | 3 days ago         | Our GitHub Stars Hit 60K in 3 Months              |
| Latest 4          | [Inside 847 Production Clinical AI Notes — Sebastian Fox, Composo](https://www.youtube.com/watch?v=yqF6XhzbWBk)                                   | 1.3K views     | 3 days ago         | 1 in 20 AI Medical Notes Has a Dangerous Error    |
| Latest 5          | [Agent Frameworks Considered Harmful — Rémi Louf, .txt](https://www.youtube.com/watch?v=KHudyx5wW3U)                                              | 8.7K views     | 3 days ago         | You Don't Need Graphs for Agents. Just Events.    |
| Popular 1         | [Don't Build Agents, Build Skills Instead – Barry Zhang & Mahesh Murag, Anthropic](https://www.youtube.com/watch?v=CEvIs9y1uog)                   | 1.4M views     | 8 months ago       | DON’T BUILD AGENTS! / Build Skills Instead        |
| Popular 2         | [Full Walkthrough: Workflow for AI Coding — Matt Pocock](https://www.youtube.com/watch?v=-QFHIoCo-Ko)                                             | 1.4M views     | 4 months ago       | Watch Him Code                                    |
| Popular 3         | ["Software Fundamentals Matter More Than Ever" — Matt Pocock](https://www.youtube.com/watch?v=v4F1gFy-hqg)                                        | 1.1M views     | 4 months ago       | Principles for AI Coding                          |
| Popular 4         | [The New Code — Sean Grove, OpenAI](https://www.youtube.com/watch?v=8rABwKRsec4)                                                                  | 1M views       | 1 year ago         | Prompt Engineering is Dead / EVERYTHING IS A SPEC |
| Popular 5         | [No Vibes Allowed: Solving Hard Problems in Complex Codebases – Dex Horthy, HumanLayer](https://www.youtube.com/watch?v=rmvDxxNubIg)              | 619K views     | 8 months ago       | SOLVING HARD PROBLEMS WITH / Harness Engineering  |

### Latent Space (@LatentSpacePod)

[Videos tab](https://www.youtube.com/@LatentSpacePod/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                                                                                | Views observed | Published observed | Thumbnail headline                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | ---------------------------------------------- |
| Latest 1          | [⏭️ Forward Deployed: Voice AI on what works in 2026](https://www.youtube.com/watch?v=MwNvowwcZOo)                                                  | 365 views      | 13 hours ago       | OUTBOUND BEATS INBOUND?                        |
| Latest 2          | [Simulating Humanity: from Generative Agents to 8 Billion Digital Twins — Joon Sung Park, Simile AI](https://www.youtube.com/watch?v=KpOW9Pk4BUs)   | 15K views      | 4 days ago         | 8 BILLION DIGITAL TWINS                        |
| Latest 3          | [Exo: Harnesses should see their own code and logs — Alex Krentsel, UC Berekeley / Google Research](https://www.youtube.com/watch?v=5lFD-34dhqE)    | 9.3K views     | 10 days ago        | The RSI Meta-Harness                           |
| Latest 4          | [🔬They Thought the Model Was Broken — Matt McPartlon & Neil Patil, Chai Discovery](https://www.youtube.com/watch?v=Qp5xklyJySI)                    | 2.4K views     | 2 weeks ago        | “It was the first antibody hit to this target” |
| Latest 5          | [Next 100x in AI: Inference, Networking, & Self-Optimizing Models — Philip Kiely & Ali Taha, Baseten](https://www.youtube.com/watch?v=7PSXtru6mmY)  | 51K views      | 3 weeks ago        | AI OPTIMIZES ITSELF                            |
| Popular 1         | [Outlasting Noam Shazeer, Crowdsourcing Chai AI w/ 1.4m DAU — with William Beauchamp, Chai Research](https://www.youtube.com/watch?v=5npvwAjHWno)   | 213K views     | 1 year ago         | THE FUTURE OF AI FRIENDS                       |
| Popular 2         | [Podcast Crossover: AIE, AGI, frontier lab strategy with ​ ⁨@matthew_berman⁩ and @swyxtv](https://www.youtube.com/watch?v=bIOCKXcxloQ)              | 143K views     | 1 month ago        | 30 MINUTES WITH SWYX                           |
| Popular 3         | [Marc Andreessen introspects on Death of the Browser, Pi + OpenClaw, and Why "This Time Is Different"](https://www.youtube.com/watch?v=knx2wrILP1M) | 129K views     | 4 months ago       | The browser will die                           |
| Popular 4         | [Cooking with OpenAI’s Research Chief: AGI, o1, Evals, and Scaling Laws — Mark Chen](https://www.youtube.com/watch?v=fpAthTtha8c)                   | 93K views      | 2 months ago       | CHIEF RESEARCH                                 |
| Popular 5         | [Greg Brockman on OpenAI's Road to AGI](https://www.youtube.com/watch?v=35ZWesLrv5A)                                                                | 72K views      | 1 year ago         | GPT-5 WAS JUST THE BEGINNING                   |

### Theo - t3․gg (@t3dotgg)

[Videos tab](https://www.youtube.com/@t3dotgg/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                                                                          | Views observed | Published observed | Thumbnail headline                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | ------------------------------------------------------- |
| Latest 1          | [Turn off Claude Code's Memory](https://www.youtube.com/watch?v=Jf54k7tFeEc)                                                                  | 64K views      | 23 hours ago       | TURN THIS OFF                                           |
| Latest 2          | [Boris Might Be Right (Again)](https://www.youtube.com/watch?v=0wemf5SZkW4)                                                                   | 76K views      | 1 day ago          | Coding is solved, bugs are not yet solved. Fix incoming |
| Latest 3          | [Which AI Models Are Worth Using](https://www.youtube.com/watch?v=06BvFMW8Ng8)                                                                | 109K views     | 3 days ago         | Unavailable / no standalone headline                    |
| Latest 4          | [MacOS Is Making Your Mac Slow](https://www.youtube.com/watch?v=4wVNFaFDIn8)                                                                  | 80K views      | 5 days ago         | Unavailable / no standalone headline                    |
| Latest 5          | [So I tried Matt's skills...](https://www.youtube.com/watch?v=0oXOOlqVu5M)                                                                    | 246K views     | 7 days ago         | mattpocock/skills                                       |
| Popular 1         | [PirateSoftware is right, this needs to stop](https://www.youtube.com/watch?v=A-IJ5QmeXpk)                                                    | 1M views       | 1 year ago         | Are you incompetent or just lying?                      |
| Popular 2         | [From 0 to Production - The Modern React Tutorial (RSCs, Next.js, Shadui, Drizzle, TS and more)](https://www.youtube.com/watch?v=d5x0JCZbAJs) | 579K views     | 2 years ago        | The Modern React Tutorial                               |
| Popular 3         | [The REAL Cost Of AWS (And How To Avoid It)](https://www.youtube.com/watch?v=kK-iR6g-V1g)                                                     | 560K views     | 3 years ago        | Unavailable / no standalone headline                    |
| Popular 4         | [T3 Stack Tutorial - FROM 0 TO PROD FOR $0 (Next.js, tRPC, TypeScript, Tailwind, Prisma & More)](https://www.youtube.com/watch?v=YkOSUVzOAA4) | 539K views     | 3 years ago        | MODERN WEB DEV TUTORIAL                                 |
| Popular 5         | [JavaScript Framework Tier List](https://www.youtube.com/watch?v=WJRf7dh5Zws)                                                                 | 456K views     | 2 years ago        | Unavailable / no standalone headline                    |

### ThePrimeagen (@ThePrimeagen)

[Videos tab](https://www.youtube.com/@ThePrimeagen/videos?hl=en&gl=US). Latest: **complete**; Popular: **complete**.

| Collection / rank | Video title observed                                                                      | Views observed     | Published observed | Thumbnail headline                   |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------ | ------------------ | ------------------------------------ |
| Latest 1          | [am I becoming a real Game Dev?](https://www.youtube.com/watch?v=tYQyh1tjSFc)             | 54 thousand views  | 2 weeks ago        | Unavailable / no standalone headline |
| Latest 2          | [I like Game Programming](https://www.youtube.com/watch?v=G8vdu30EEfw)                    | 116 thousand views | 1 month ago        | Better than Unit Tests               |
| Latest 3          | [Layout is harder than you think..](https://www.youtube.com/watch?v=js7_bCY6WEw)          | 109 thousand views | 2 months ago       | Unavailable / no standalone headline |
| Latest 4          | [I learned Odin](https://www.youtube.com/watch?v=HwmqZTnb7Co)                             | 215 thousand views | 2 months ago       | Finally a Game Programmer?           |
| Latest 5          | [Musician turned Programmer turned Musician](https://www.youtube.com/watch?v=taoAAcS5PSw) | 142 thousand views | 1 year ago         | Unavailable / no standalone headline |
| Popular 1         | [0 to LSP : Neovim RC From Scratch](https://www.youtube.com/watch?v=w7i4amO_zaE)          | 1.9 million views  | 3 years ago        | Neovim From Scratch                  |
| Popular 2         | [Vim As Your Editor - Introduction](https://www.youtube.com/watch?v=X6AR2RMB5tE)          | 1.4 million views  | 3 years ago        | Unavailable / no standalone headline |
| Popular 3         | [From Meth To Netflix](https://www.youtube.com/watch?v=JjHFubUPLV0)                       | 1.3 million views  | 3 years ago        | Unavailable / no standalone headline |
| Popular 4         | [This Algorithm is 1,606,240% FASTER](https://www.youtube.com/watch?v=U16RnpV48KQ)        | 956 thousand views | 3 years ago        | 1,606,240% FASTER                    |
| Popular 5         | [I was wrong btw](https://www.youtube.com/watch?v=ZH3iKbEiks0)                            | 876 thousand views | 1 year ago         | Unavailable / no standalone headline |

## Validation

- Seven immutable channel identities; five Latest and five Popular memberships each; all membership IDs resolve to a video in the same channel.
- 69 unique examples / 70 slots: `yt-M6mYodf0dJM` belongs to both Matt Pocock collections and is stored only once.
- All 69 thumbnail URLs returned decodable images during analysis; 57 prominent-text annotations were manually reviewed. Twelve examples intentionally have no headline annotation.
- No `viewCount` or exact `publishedAt` value was synthesized from rounded display text. No generic URL, paid inference, video/audio download, private account data, media upload, provisioning, commit or deployment was used.
