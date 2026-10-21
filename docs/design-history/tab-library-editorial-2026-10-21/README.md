# Tab Library editorial feed, October 2026

The selected ImageGen direction is [the editorial feed](selected-editorial.png): a narrow desktop rail for batch and filters, a continuous reading list with titles and short summaries, and inline notes and actions. On phones the rail becomes a compact batch selector and disclosures above the feed. Tap, Scroll, and Swipe remain available.

Reference patterns: [Nextdoor](https://mobbin.com/explore/screens/2aeb4bc9-a474-4696-92b6-5f1b3994a0a9) for in-context actions, [Finimize](https://mobbin.com/explore/screens/9ec15274-8fc4-4196-bb83-b27e96316e94) for editorial reading rows, [Substack](https://mobbin.com/explore/screens/50df93ce-6f09-450e-b5c0-0eb1bd0f06d1) for grouping source, title and excerpt, and [Reeder](https://mobbin.com/explore/screens/cad24956-08d8-4322-b8e0-ff0521c35b65) for grouping and filtering a reading list.

The implementation uses the real site navigation and theme, real batch/filter controls and captured domains, rather than mock-only navigation, counts, sorting or invented thumbnails. Full URLs move into expanded content. Saved summaries, notes, preview and original-link actions remain together in the expanded entry.

The screenshots in this directory use synthetic example domains, titles and notes, with a local test-only account and intercepted fixture responses. They show the Tap feed at 1440 × 900 and 390 × 844, the expanded state, dark theme and a failed batch load at 390 × 844. Comparisons also covered 834 × 1194 and 720 × 900; screenshots are CSS viewport pixels at device scale 1. The wider expanded content and compact phone controls are intentional adaptations to the real data and site shell. An unavailable library is explicitly distinguished from an empty one. No private library content is included.
