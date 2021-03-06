/**
 * @typedef {(onload: (error: Error|null|undefined, result?: unknown) => void) => void} Dictionary
 *
 * @typedef Options
 * @property {Dictionary} dictionary
 *   A dictionary (`Function`).
 *   Result of importing one of the dictionaries in `wooorm/dictionaries`.
 * @property {string|Uint8Array} [personal]
 *   Personal dictionary (`string` or a `Buffer` in UTF-8).
 * @property {string[]} [ignore]
 *   List of words to ignore.
 * @property {boolean} [ignoreLiteral=true]
 *   Whether to ignore literal words.
 * @property {boolean} [ignoreDigits=true]
 *   Whether to ignore “words” that contain only digits, such as `123456`.
 * @property {boolean} [normalizeApostrophes=true]
 *   Deal with apostrophes.
 *   Whether to swap smart apostrophes (`’`) with straight apostrophes (`'`)
 *   before checking spelling.
 *   Dictionaries typically support this, but this option can be used if not.
 * @property {number} [max=30]
 *   Number of unique words to suggest for.
 *   By default, up to thirty words are suggested for.
 *   Further misspellings are still warned about, but without suggestions.
 *   Increasing this number significantly impacts performance.
 */

// @ts-expect-error: to type.
import nspell from 'nspell'
import {visit} from 'unist-util-visit'
import {toString} from 'nlcst-to-string'
import {isLiteral} from 'nlcst-is-literal'
import {quotation} from 'quotation'

const own = {}.hasOwnProperty

const source = 'retext-spell'

/**
 * Plugin to check spelling (with `nspell`).
 *
 * @type {import('unified').Plugin<[Options|Dictionary]>}
 */
// @ts-expect-error: prevent errors.
export default function retextSpell(options = {}) {
  /**
   * @typedef {import('unist').Node} Node
   * @typedef {import('vfile').VFile} VFile
   */

  if (typeof options === 'function') {
    options = {dictionary: options}
  }

  const {
    dictionary,
    ignore,
    max,
    ignoreLiteral,
    ignoreDigits,
    normalizeApostrophes,
    personal
  } = options
  /** @type {Array.<[Node, VFile, config, (error?: Error|null|undefined) => void]>} */
  const queue = []
  /** @type {Error|null|undefined} */
  let loadError

  if (typeof dictionary !== 'function') {
    throw new TypeError('Expected `Object`, got `' + dictionary + '`')
  }

  const config = {
    ignoreLiteral:
      ignoreLiteral === null || ignoreLiteral === undefined
        ? true
        : ignoreLiteral,
    ignoreDigits:
      ignoreDigits === null || ignoreDigits === undefined ? true : ignoreDigits,
    normalizeApostrophes:
      normalizeApostrophes === null || normalizeApostrophes === undefined
        ? true
        : normalizeApostrophes,
    ignore: ignore || [],
    max: max || 30,
    count: 0,
    cache: {},
    checker: undefined
  }

  // Callback called when a `dictionary` is loaded (possibly erroneous) or
  // when `load`ing failed.
  // Flushes the queue when available, and sets the results on the parent scope.
  dictionary((error, dictionary) => {
    let index = -1

    loadError = error

    if (dictionary) {
      config.checker = nspell(dictionary)

      if (personal) {
        // @ts-expect-error: hush.
        config.checker.personal(personal)
      }
    }

    while (++index < queue.length) {
      const parameters = queue[index].slice(0, 3)

      if (!error) {
        // @ts-expect-error: fine.
        all(...parameters)
      }

      queue[index][3](error)
    }

    queue.length = 0
  })

  // Transformer which either immediately invokes `all` when everything has
  // finished loading or queues the arguments.
  return (tree, file, next) => {
    if (loadError) {
      next(loadError)
    } else if (config.checker) {
      all(tree, file, config)
      next()
    } else {
      queue.push([tree, file, config, next])
    }
  }
}

/**
 * Check a file for spelling mistakes.
 *
 * @param {import('unist').Node} tree
 * @param {import('vfile').VFile} file
 * @param {object} config
 * @param {string[]} config.ignore
 * @param {boolean} config.ignoreLiteral
 * @param {boolean} config.ignoreDigits
 * @param {boolean} config.normalizeApostrophes
 * @param {any} config.checker
 * @param {Record<string, string[]>} config.cache
 * @param {number} config.count
 * @param {number} config.max
 */
function all(tree, file, config) {
  /**
   * @typedef {import('unist').Parent} Parent
   * @typedef {import('unist').Literal<string>} Literal
   */

  const {
    ignore,
    ignoreLiteral,
    ignoreDigits,
    normalizeApostrophes,
    // To do: nspell.
    // type-coverage:ignore-next-line
    checker,
    cache
  } = config

  visit(tree, 'WordNode', (/** @type {Parent} */ node, position, parent) => {
    const children = node.children

    if (
      !parent ||
      position === null ||
      (ignoreLiteral && isLiteral(parent, position))
    ) {
      return
    }

    let actual = toString(node)

    if (normalizeApostrophes) {
      actual = actual.replace(/’/g, "'")
    }

    if (irrelevant(actual)) {
      return
    }

    // Check the whole word.
    /** @type {boolean} */
    // type-coverage:ignore-next-line
    let correct = checker.correct(actual)

    // If the whole word is not correct, check all its parts.
    // This makes sure that, if `alpha` and `bravo` are correct, `alpha-bravo`
    // is also seen as correct.
    if (!correct && children.length > 1) {
      let index = -1

      correct = true

      while (++index < children.length) {
        const child = /** @type {Literal} */ (children[index])

        if (child.type !== 'TextNode' || irrelevant(child.value)) {
          continue
        }

        // To do: nspell.
        // type-coverage:ignore-next-line
        if (!checker.correct(child.value)) {
          correct = false
        }
      }
    }

    if (!correct) {
      let reason = quotation(actual, '`') + ' is misspelt'
      /** @type {string[]|undefined} */
      let expected

      // Suggestions are very slow, so cache them (spelling mistakes other than
      // typos often occur multiple times).
      if (own.call(cache, actual)) {
        expected = cache[actual]
        reason = concatPrefixToSuggestions(reason, expected)
      } else {
        if (config.count === config.max) {
          file.message(
            'Too many misspellings; no further spell suggestions are given',
            node,
            [source, 'overflow'].join(':')
          )
        }

        config.count++

        if (config.count < config.max) {
          // To do: nspell.
          // type-coverage:ignore-next-line
          expected = checker.suggest(actual)

          // @ts-expect-error: hush.
          if (expected.length > 0) {
            // @ts-expect-error: hush.
            reason = concatPrefixToSuggestions(reason, expected)
          }
        }

        cache[actual] = expected || []
      }

      Object.assign(
        file.message(
          reason,
          node,
          [source, actual.toLowerCase().replace(/\W+/, '-')].join(':')
        ),
        {actual, expected: expected || []}
      )
    }
  })

  /**
   * Concatenate the formatted suggestions to a given prefix
   *
   * @param {string} prefix
   * @param {Array.<string>} suggestions
   * @returns {string}
   */
  function concatPrefixToSuggestions(prefix, suggestions) {
    return (
      prefix + '; did you mean ' + quotation(suggestions, '`').join(', ') + '?'
    )
  }

  /**
   * Check if a word is irrelevant.
   *
   * @param {string} word
   * @returns {boolean}
   */
  function irrelevant(word) {
    return ignore.includes(word) || (ignoreDigits && /^\d+$/.test(word))
  }
}
