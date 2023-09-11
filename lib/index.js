/**
 * @typedef {import('nlcst').Root} Root
 * @typedef {import('unified').TransformCallback<Root>} TransformCallback
 * @typedef {import('vfile').VFile} VFile
 */

/**
 * @callback Dictionary
 *   Dictionary.
 * @param {DictionaryOnLoad} onload
 *   Callback called when the dictionary is loaded.
 * @returns {undefined | void}
 *   Nothing.
 *
 *   Note: `void` included until TS infers it.
 *
 * @callback DictionaryOnLoad
 *   Callback called when the dictionary is loaded.
 * @param {Error | undefined} error
 *   Error.
 * @param {unknown} [result]
 *   Dictionary.
 * @returns {undefined | void}
 *   Nothing.
 *
 *   Note: `void` included until TS infers it.
 *
 * @typedef Options
 *   Configuration.
 * @property {Dictionary} dictionary
 *   Dictionary (required);
 *   result of importing one of the dictionaries in `wooorm/dictionaries`.
 * @property {ReadonlyArray<string> | null | undefined} [ignore]
 *   List of words to ignore (optional).
 * @property {boolean | null | undefined} [ignoreLiteral=true]
 *   Whether to ignore literal words (default: `true`).
 * @property {boolean | null | undefined} [ignoreDigits=true]
 *   Whether to ignore “words” that contain digits or times such as `123456` or
 *   `2:41pm` (default: `true`).
 * @property {number | null | undefined} [max=30]
 *   Number of unique words to suggest for (default: `30`);
 *   further misspellings do not include suggestions.
 * @property {boolean | null | undefined} [normalizeApostrophes=true]
 *   Treat smart apostrophes (`’`) as straight (`'`) apostrophes (default:
 *   `true`);
 *   dictionaries sometimes don’t support smart apostrophes.
 * @property {Uint8Array | string | null | undefined} [personal]
 *   Personal dictionary (optional).
 *
 * @typedef State
 *   Info passed around.
 * @property {Map<string, ReadonlyArray<string>>} cache
 *   Cache of suggestions.
 * @property {unknown} checker
 *   Spell checker.
 * @property {number} count
 *   Suggestions.
 * @property {ReadonlyArray<string>} ignore
 *   List of words to ignore.
 * @property {boolean} ignoreLiteral
 *   Whether to ignore literal words.
 * @property {boolean} ignoreDigits
 *   Whether to ignore words that contain only digits.
 * @property {number} max
 *   Maximum number of suggestions.
 * @property {boolean} normalizeApostrophes
 *   Whether to normalize apostrophes.
 */

import {isLiteral} from 'nlcst-is-literal'
import {toString} from 'nlcst-to-string'
// @ts-expect-error: to type.
import nspell from 'nspell'
import {quotation} from 'quotation'
import {visit} from 'unist-util-visit'

/** @type {ReadonlyArray<never>} */
const emptyIgnore = []

/**
 * Check spelling.
 *
 * @param {Readonly<Options> | Dictionary} options
 *   Configuration or dictionary (required).
 * @returns
 *   Transform.
 */
export default function retextSpell(options) {
  const settings =
    typeof options === 'function' ? {dictionary: options} : options || {}
  const dictionary = settings.dictionary
  const ignore = settings.ignore || emptyIgnore
  const ignoreLiteral =
    typeof settings.ignoreLiteral === 'boolean' ? settings.ignoreLiteral : true
  const ignoreDigits =
    typeof settings.ignoreDigits === 'boolean' ? settings.ignoreDigits : true
  const max = settings.max || 30
  const normalizeApostrophes =
    typeof settings.normalizeApostrophes === 'boolean'
      ? /* c8 ignore next -- this is now solved in `dictionary-en-gb` */
        settings.normalizeApostrophes
      : true
  const personal = settings.personal

  if (typeof dictionary !== 'function') {
    throw new TypeError('Missing `dictionary` in options')
  }

  /** @type {Array<[Root, VFile, State, TransformCallback]>} */
  const queue = []
  /** @type {Error | undefined} */
  let loadError

  /** @type {State} */
  const state = {
    cache: new Map(),
    checker: undefined,
    count: 0,
    ignore,
    ignoreLiteral,
    ignoreDigits,
    max,
    normalizeApostrophes
  }

  // Callback called when a `dictionary` is loaded or when `load`ing failed.
  // Flushes the queue when available, and sets the results on the parent scope.
  dictionary(onload)

  /**
   * Transform.
   *
   * @param {Root} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @param {TransformCallback} next
   *   Next.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree, file, next) {
    if (loadError) {
      next(loadError)
    } else if (state.checker) {
      all(tree, file, state)
      next()
    } else {
      queue.push([tree, file, state, next])
    }
  }

  /** @type {DictionaryOnLoad} */
  function onload(error, dictionary) {
    let index = -1

    loadError = error

    if (dictionary) {
      // To do: nspell.
      // type-coverage:ignore-next-line
      state.checker = nspell(dictionary)

      if (personal) {
        // @ts-expect-error: to do: type nspell.
        state.checker.personal(personal)
      }
    }

    while (++index < queue.length) {
      const [tree, file, state, next] = queue[index]

      if (!error) {
        all(tree, file, state)
      }

      next(error)
    }

    queue.length = 0
  }
}

/**
 * Check a file for spelling mistakes.
 *
 * @param {Root} tree
 *   Tree.
 * @param {VFile} file
 *   File.
 * @param {State} state
 *   Info.
 * @returns {undefined}
 *   Nothing.
 */
function all(tree, file, state) {
  visit(tree, 'WordNode', function (node, position, parent) {
    if (
      !parent ||
      position === undefined ||
      (state.ignoreLiteral && isLiteral(parent, position))
    ) {
      return
    }

    let actual = toString(node)

    if (state.normalizeApostrophes) {
      actual = actual.replace(/’/g, "'")
    }

    if (irrelevant(actual)) {
      return
    }

    // Check the whole word.
    /** @type {boolean} */
    // @ts-expect-error: to do: type nspell.
    let correct = state.checker.correct(actual)

    // If the whole word is not correct, check all its parts.
    // This makes sure that, if `alpha` and `bravo` are correct, `alpha-bravo`
    // is also seen as correct.
    if (!correct && node.children.length > 1) {
      let index = -1

      correct = true

      while (++index < node.children.length) {
        const child = node.children[index]

        if (child.type !== 'TextNode' || irrelevant(child.value)) {
          continue
        }

        // @ts-expect-error: to do: type nspell.
        if (!state.checker.correct(child.value)) {
          correct = false
        }
      }
    }

    if (!correct) {
      let reason = quotation(actual, '`') + ' is misspelt'
      const cached = state.cache.get(actual)
      /** @type {ReadonlyArray<string>} */
      let expected = []

      // Suggestions are very slow, so cache them (spelling mistakes other than
      // typos often occur multiple times).
      if (cached) {
        expected = cached
        reason = concatPrefixToSuggestions(reason, expected)
      } else {
        if (state.count === state.max) {
          file.message(
            'Too many misspellings; no further spell suggestions are given',
            {
              place: node.position,
              ruleId: 'overflow',
              source: 'retext-spell'
            }
          )
        }

        state.count++

        if (state.count < state.max) {
          // @ts-expect-error: to do: type nspell.
          expected = state.checker.suggest(actual)

          if (expected.length > 0) {
            reason = concatPrefixToSuggestions(reason, expected)
          }
        }

        state.cache.set(actual, expected)
      }

      const message = file.message(reason, {
        place: node.position,
        ruleId: actual.toLowerCase().replace(/\W+/, '-'),
        source: 'retext-spell'
      })

      message.actual = actual
      message.expected = [...expected]
      message.url = 'https://github.com/retextjs/retext-spell#readme'
    }
  })

  /**
   * Concatenate the formatted suggestions to a given prefix
   *
   * @param {string} prefix
   *   Reason.
   * @param {ReadonlyArray<string>} suggestions
   *   Suggestions.
   * @returns {string}
   *   Message.
   */
  function concatPrefixToSuggestions(prefix, suggestions) {
    return (
      prefix +
      '; did you mean ' +
      // To do: `quotation` should support `ReadonlyArray`.
      quotation([...suggestions], '`').join(', ') +
      '?'
    )
  }

  /**
   * Check if a word is irrelevant.
   *
   * @param {string} word
   *   Word.
   * @returns {boolean}
   *   Whether `word` is irrelevant.
   */
  function irrelevant(word) {
    return (
      state.ignore.includes(word) ||
      (state.ignoreDigits && /^\d+$/.test(word)) ||
      (state.ignoreDigits && /^\d{1,2}:\d{2}(?:[ap]\.?m\.?)?$/i.test(word))
    )
  }
}
