rahul kadyan sfc

- remove data-test
- i18n
- benefits
  - one file per component
  - style in same file
  - mini app
  - html css js
  - choice of languages
- steps
  - compile script
  - compile style - append to head
  - compile template
    - jsx: extend js, flexible, empower end user
    - templates: extend html, declarative, empower build tools
    - template parsing is gnarly bc of vue; pass to compiler
  - combine all blocks
- ideas
  - compile time transpile and remove `data-test`
  - compile time i18n lang=json
    - findTranslation
    - have to reparse tokens after and redo for all nodes
  - handwriting render function
  - template-explorer.vuejs.org
  - hook into compiler
- new in vue 3.0
  - debugger in template
  - features of vue you are using

style notes

- minion style
