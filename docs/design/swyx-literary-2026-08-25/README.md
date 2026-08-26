# The familiar and the cosmic footnote

The approved light direction is **A Most Reasonable Familiar**; the approved dark
direction is **The Cosmic Footnote**. The two retained, compressed reference
images are `light-reference.webp` and `dark-reference.webp`.

Both themes share one information architecture: a concise author introduction, a
keyboard-accessible horizontal shelf of eleven selected essays, recent writing,
current projects, a compact free-book promotion, the working newsletter form,
and the complete existing writing and speaking collections. The theme switch is
available without opening the mobile navigation drawer.

The light theme uses warm paper, restrained terracotta, forest-dark ink, and the
original generated mechanical messenger-bird engraving. The dark theme uses
midnight navy, warm gold, and the original generated celestial-atlas background.
Both use the project's existing licensed Newsreader font for editorial headings.

Private personal drawing tools remain outside shared navigation, the essay
shelf, public discovery documents, and indexing. The existing server-side
`X-Clacks-Overhead` header is complemented by a visible `GNU Terry Pratchett`
tribute in the public footer.

The selected images are atmosphere references rather than pixel-exact website
specifications: real, accessible HTML text replaces generated image lettering;
the essay shelf intentionally contains more than three entries; every existing
public writing, speaking, book, newsletter, and archive interaction remains
available.

## First visual critique and correction ledger

- Fixed: the initially oversized dark celestial decoration increased document
  width by 156 pixels on phone, tablet, and split-screen viewports; constrain the
  artwork to the viewport while keeping the intentionally scrolling essay shelf.
- Fixed: the initial mobile author heading wrapped the surname to a second line;
  tighten its responsive display size and shorten the supporting subtitle.
- Fixed: an exhaustive recent-content list pushed current projects and the book
  far below the tablet and mobile fold; move the compact project/book row ahead
  of the full list at narrower breakpoints while preserving every article.
- Fixed: remove an unnecessary noninteractive tab stop; individual essay links
  remain fully keyboard reachable and naturally scroll into view when focused.
- Intentional: the decorative messenger bird is omitted on narrow screens to
  preserve a compact reading-first mobile composition.
- Intentional: the approved three-card image is expanded to an eleven-entry
  horizontal shelf at the user's explicit request.

## Capture conditions and final measured geometry

All captures use Chromium, device pixel ratio 1, the populated local homepage,
reduced motion, and the operating-system theme corresponding to the filename.

- Phone: 390 × 844; featured heading y=303, first essay y=379, book y=596.
- Tablet: 834 × 1194; featured heading y=321, first essay y=374, book y=608.
- Split desktop: 720 × 900; featured heading y=318, first essay y=370, book y=604.
- Full desktop: 1440 × 900; featured heading y=316, first essay y=376.

Both themes pass zero document-level horizontal overflow at every viewport; the
eleven-essay shelf alone scrolls horizontally, including when its last link is
focused by keyboard. Mobile captures also verify the visible theme switch,
persisted manual theme selection, the expanded navigation drawer, and Escape
dismissal. The dark mobile archive is captured separately to confirm the shared
design tokens preserve search, filters, and public content discovery.
