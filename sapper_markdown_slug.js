const slugify = require('@sindresorhus/slugify')
const SLUG_SEPARATOR = '_'

/* url-safe processor */
const urlsafeSlugProcessor = (string) =>
  slugify(string, {
    customReplacements: [
      // runs before any other transformations
      ['$', 'DOLLAR'], // `$destroy` & co
      ['-', 'DASH'], // conflicts with `separator`
    ],
    separator: SLUG_SEPARATOR,
    decamelize: false,
    lowercase: false,
  })
    .replace(/DOLLAR/g, '$')
    .replace(/DASH/g, '-')
exports.urlsafeSlugProcessor = urlsafeSlugProcessor

/* unicode-preserver processor */

const alphaNumRegex = /[a-zA-Z0-9]/
const unicodeRegex = /\p{Letter}/u
const isNonAlphaNumUnicode = (string) => !alphaNumRegex.test(string) && unicodeRegex.test(string)

const unicodeSafeProcessor = (string) =>
  string
    .split('')
    .reduce(
      (accum, char, index, array) => {
        const type = isNonAlphaNumUnicode(char) ? 'pass' : 'process'

        if (index === 0) {
          accum.current = { type, string: char }
        } else if (type === accum.current.type) {
          accum.current.string += char
        } else {
          accum.chunks.push(accum.current)
          accum.current = { type, string: char }
        }

        if (index === array.length - 1) {
          accum.chunks.push(accum.current)
        }

        return accum
      },
      { chunks: [], current: { type: '', string: '' } },
    )
    .chunks.reduce((accum, chunk) => {
      const processed = chunk.type === 'process' ? urlsafeSlugProcessor(chunk.string) : chunk.string

      processed.length > 0 && accum.push(processed)

      return accum
    }, [])
    .join(SLUG_SEPARATOR)
exports.unicodeSafeProcessor = unicodeSafeProcessor

/* processor */

exports.makeSlugProcessor = (preserveUnicode = false) => (preserveUnicode ? unicodeSafeProcessor : urlsafeSlugProcessor)

/* session processor */

exports.makeSessionSlugProcessor = (preserveUnicode = false) => {
  const processor = makeSlugProcessor(preserveUnicode)
  const seen = new Set()

  return (string) => {
    const slug = processor(string)

    if (seen.has(slug)) throw new Error(`Duplicate slug ${slug}`)
    seen.add(slug)

    return slug
  }
}
