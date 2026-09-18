# Cardo + Newsreader reading treatment · September 18, 2026

The user selected **PROPOSED · CARDO + NEWSREADER** from the matched article typography study. The acceptance reference is the right side of `approved-comparison-light.png` and `approved-comparison-dark.png`. The font was identified from Anu Atluru’s actual stylesheet and measured in the browser; it is Cardo prose paired with Inter utility text. This is a bounded typography change, independent of the earlier investing layout explorations.

## Approved contract

- Self-host Cardo regular 400, bold 700, and italic 400; Inter variable 400–700 for navigation, metadata, controls, and other utility text. Retain Newsreader display titles.
- Reading prose is 19 px / 1.65 at desktop and tablet widths, 18 px / 1.65 through 760 px. Maximum article measure grows from 648 to 680 px. Paragraph spacing is 1.3 em.
- Article titles are 36 px / 1.2 desktop and 30 px / 1.2 through 760 px; reading section headings use genuine Cardo Bold at 24 px / 1.3. The About opening and investing title use the same restrained maximum title scale.
- Keep Markdown heading markers and permalinks. Markers are muted 12 px monospace; heading links inherit the heading weight and ink color.
- Keep warm paper, semantic dark colors, gold selection, native notes, both TOCs, all article content, About versions/copy controls, portfolio catalog/filter/sort/detail behavior, metadata, and other site navigation. Portfolio tables remain sans serif; only its editorial introduction adopts Cardo.

## Visual comparison and corrections

The initial implementation inherited Tailwind’s 500 weight on heading anchors, even though the heading itself computed to 700. The browser’s actual platform font was Cardo Regular. The correction makes heading links inherit the heading weight; platform-font inspection then confirmed **Cardo-Bold**. The other correction replaced the navigation’s explicit Georgia override with the shared Inter token. `round1-desktop.png` and `round1-phone.png` preserve the initial implementation.

| Delta                                                       | Status      | Result                                                                                                                                                         |
| ----------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium heading links instead of the approved bold hierarchy | Fixed       | Cardo-Bold is the actual rendered face; anchor and parent both compute to 700.                                                                                 |
| Navigation still used Georgia                               | Fixed       | Shared Inter utility token is used.                                                                                                                            |
| Preview’s abbreviated TOC and article excerpt               | Intentional | Production retains all existing entries and article content. No copy was rewritten.                                                                            |
| Existing About columns and portfolio directory geometry     | Intentional | Typography approval does not replace those layouts.                                                                                                            |
| Font appearance in raster captures                          | Intentional | The app browser has persisted zoom; capture metadata records the actual CSS dimensions. Small rounding differences and raster softness are capture conditions. |
| Physical-device touch/keyboard behavior                     | Open        | Browser checks do not establish physical-device behavior; no input or interaction contract changed.                                                            |

## Evidence and verification

The article was visually inspected at CSS widths 1440, 390, 834, and 720 in both themes. Heights round to 899, 843, 1194, and 899 due to persisted browser zoom. `capture-metadata.json` records actual measured dimensions, theme, heading-anchor weight, overflow, and default TOC state. Device metrics were compensated for browser zoom 0.536, with device scale factor 2; PNG pixels are approximately 1.072 times CSS pixels. The phone TOC starts collapsed; larger widths retain the existing expanded default. No document horizontal overflow appeared.

About and portfolio were also visually inspected at desktop and phone widths in both themes. The long About introduction remains readable without overflow. Space opens the native investing disclosure, Enter opens the phone floating TOC, and the inline TOC navigates to `#pick-a-topic` with the existing 32 px scroll margin. Browser platform-font inspection confirmed Cardo-Regular for prose and Cardo-Bold for section links.

Focused reading-system and Markdown checks pass, including theme contrast, metadata, anchors, and TOC preservation. Svelte check reports zero errors/warnings, and the Cloudflare production build succeeds. Local read/presence bindings are unavailable and local counts do not establish production counts.

No ImageGen raster assets are needed for the selected real-font treatment. The accepted deterministic typography specimens are retained as review references. Fonts are licensed under the SIL Open Font License and served locally; no Google Fonts request is made by the product. All official Unicode subsets are included but only subsets and faces used by a page are requested (about 100 KB for all Latin faces, fewer when italic is unused).
