# Bundled diagram logos

`logos.json` contains a small, self-contained catalog, not a remote logo lookup.
Each record retains its source, license, original aspect ratio, MIME type and bytes.
Only files referenced by an inserted preset/component enter the drawing; repeated
marks reuse a versioned file ID. The original scene, native undo and saved personal
library items are not replaced.

- Latent Space: the user-supplied official mark already in
  `static/assets/latent-space-hex-gradient.png`, unmodified.
- AI Engineer: the existing `static/assets/ai-engineer-logo.svg`, unmodified.
- OpenAI and Google Docs: Simple Icons **13.21.0**, CC0. Google Docs uses its blue
  `#4285f4` fill; geometry is unmodified. Exact source URLs are in the catalog.
- Slack, Notion, Apache Airflow and Apache Spark: Devicon **v2.17.0**, MIT;
  original SVGs and brand colors retained. Exact source URLs are in the catalog.

Upstream license texts are included alongside the catalog. Company marks remain
their owners' trademarks; their presence is identification, not endorsement.
New logos should come from verified assets, never generated imitations. When
changing bytes, bump the file ID version so existing saved scenes retain their
original artwork.

The LS purple/lilac diagram palette is separate from third-party logo colors.
Native pictograms are authored in `draw-diagram-kit.js`; they are independently
editable Excalidraw shapes. Logos are individual image layers with native captions,
not flattened diagram screenshots.
