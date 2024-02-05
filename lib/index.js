/**
 * @typedef {import('nlcst').Root} Root
 * @typedef {import('unified').TransformCallback<Root>} TransformCallback
 * @typedef {import('vfile').VFile} VFile
 */

/**
 * @callback DictionaryCallback
 *   Dictionary function.
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
 * @param {Dictionary} [result]
 *   Dictionary.
 * @returns {undefined | void}
 *   Nothing.
 *
 *   Note: `void` included until TS infers it.
 *
 * @typedef Dictionary
 *   A hunspell dictionary.
 * @property {Uint8Array} aff
 *   Data for the affix file (defines the language, keyboard, flags, and more).
 * @property {Uint8Array} dic
 *   Data for the dictionary file (contains words and flags applying to those words).
 *
 * @typedef Options
 *   Configuration.
 * @property {DictionaryCallback | Dictionary} dictionary
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
 *   Number of times to suggest (default: `30`);
 *   further misspellings do not get suggestions.
 * @property {boolean | null | undefined} [normalizeApostrophes=true]
 *   Normalize smart apostrophes (`’`) as straight (`'`) apostrophes (default:
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
 * @param {Readonly<Options> | DictionaryCallback | Dictionary} options
 *   Configuration or dictionary (required).
 * @returns
 *   Transform.
 */
export default function retextSpell(options) {
  const settings =
    typeof options === 'function' ||
    (options && 'aff' in options && 'dic' in options)
      ? {dictionary: options}
      : options || {}
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

  if (!settings.dictionary) {
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
  if (typeof settings.dictionary === 'function') {
    settings.dictionary(onload)
  } else {
    onload(undefined, settings.dictionary)
  }

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
      let suggestions = state.cache.get(actual)

      // Suggestions are very slow, so cache them (spelling mistakes other than
      // typos often occur multiple times).
      if (!suggestions) {
        if (state.count === state.max) {
          const message = file.info(
            'No longer generating suggestions to improve performance',
            {
              ancestors: [parent, node],
              place: node.position,
              ruleId: 'overflow',
              source: 'retext-spell'
            }
          )
          message.note = 'To keep on suggesting, increase `options.max`.'
        }

        suggestions =
          state.count < state.max
            ? // @ts-expect-error: to do: type nspell.
              /** @type {Array<string>} */ (state.checker.suggest(actual))
            : []

        state.count++
        state.cache.set(actual, suggestions)
      }

      let extra = ''

      if (suggestions.length > 0) {
        extra =
          ', expected for example ' +
          quotation([...suggestions], '`').join(', ')
      }

      const message = file.message(
        'Unexpected unknown word `' + actual + '`' + extra,
        {
          ancestors: [parent, node],
          place: node.position,
          ruleId: actual.toLowerCase().replace(/\W+/, '-'),
          source: 'retext-spell'
        }
      )

      message.actual = actual
      message.expected = [...suggestions]
      message.url = 'https://github.com/retextjs/retext-spell#readme'
    }
  })

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
