import nspell from 'nspell'
import {visit} from 'unist-util-visit'
import {toString} from 'nlcst-to-string'
import {isLiteral} from 'nlcst-is-literal'
import {quotation} from 'quotation'

const own = {}.hasOwnProperty

const source = 'retext-spell'

export default function retextSpell(options = {}) {
  const load = options.dictionary || options
  const {
    ignore,
    max,
    ignoreLiteral,
    ignoreDigits,
    normalizeApostrophes,
    personal
  } = options
  const queue = []
  let loadError

  if (typeof load !== 'function') {
    throw new TypeError('Expected `Object`, got `' + load + '`')
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
  load((error, dictionary) => {
    let index = -1

    loadError = error

    if (dictionary) {
      config.checker = nspell(dictionary)

      if (personal) {
        config.checker.personal(personal)
      }
    }

    while (++index < queue.length) {
      if (!error) {
        all(...queue[index])
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

// Check a file for spelling mistakes.
function all(tree, file, config) {
  const {
    ignore,
    ignoreLiteral,
    ignoreDigits,
    normalizeApostrophes,
    checker,
    cache
  } = config

  visit(tree, 'WordNode', (node, position, parent) => {
    const children = node.children

    if (ignoreLiteral && isLiteral(parent, position)) {
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
    let correct = checker.correct(actual)

    // If the whole word is not correct, check all its parts.
    // This makes sure that, if `alpha` and `bravo` are correct, `alpha-bravo`
    // is also seen as correct.
    if (!correct && children.length > 1) {
      let index = -1

      correct = true

      while (++index < children.length) {
        const child = children[index]

        if (child.type !== 'TextNode' || irrelevant(child.value)) {
          continue
        }

        if (!checker.correct(child.value)) {
          correct = false
        }
      }
    }

    if (!correct) {
      let reason = quotation(actual, '`') + ' is misspelt'
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
          expected = checker.suggest(actual)

          if (expected.length > 0) {
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

  // Concatenate the formatted suggestions to a given prefix
  function concatPrefixToSuggestions(prefix, suggestions) {
    return (
      prefix + '; did you mean ' + quotation(suggestions, '`').join(', ') + '?'
    )
  }

  // Check if a word is irrelevant.
  function irrelevant(word) {
    return ignore.includes(word) || (ignoreDigits && /^\d+$/.test(word))
  }
}
