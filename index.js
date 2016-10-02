/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module retext:spell
 * @fileoverview Spell checker for retext.
 */

'use strict';

/* Dependencies. */
var Spellchecker = require('hunspell-spellchecker');
var visit = require('unist-util-visit');
var toString = require('nlcst-to-string');
var isLiteral = require('nlcst-is-literal');
var includes = require('lodash.includes');

/* Expose. */
module.exports = spell;

/* Constants. */
var spellchecker = new Spellchecker();

/* Plugin attacher. */
function spell(retext, options) {
  var queue = [];
  var load = options && (options.dictionary || options);
  var ignore = options && options.ignore;
  var ignoreLiteral = options && options.ignoreLiteral;
  var ignoreDigits = options && options.ignoreDigits;
  var config = {};
  var loadError;

  if (!load) {
    throw new Error('Expected `Object`, got `' + load + '`');
  }

  if (ignoreLiteral === null || ignoreLiteral === undefined) {
    ignoreLiteral = true;
  }

  if (ignoreDigits === null || ignoreDigits === undefined) {
    ignoreDigits = true;
  }

  config.ignoreLiteral = ignoreLiteral;
  config.ignoreDigits = ignoreDigits;
  config.ignore = ignore;

  /* `load`. See `dictionaries` for signatures.
   * Invokes `construct` on completion. */
  load(function (err, result) {
    construct(err, err ? null : spellchecker.parse(result));
  });

  return transformer;

  /* Transformer which either immediatly invokes `all`
   * when everything has finished loading or queue’s
   * the arguments. */
  function transformer(tree, file, next) {
    if (!loadError && !config.dictionary) {
      queue.push([tree, file, config, next]);
    } else if (loadError) {
      next(loadError);
    } else {
      all(tree, file, config);
      next();
    }
  }

  /* Callback invoked when a `dictionary` is constructed
   * (possibly erroneous) or when `load`ing failed.
   *
   * Flushes the queue when available, and sets the
   * results on the parent scope. */
  function construct(err, dictionary) {
    var length = queue.length;
    var index = -1;

    config.dictionary = dictionary;
    loadError = err;

    while (++index < length) {
      if (loadError) {
        queue[index][3](loadError);
      } else {
        all.apply(null, queue[index]);
        queue[index][3]();
      }
    }

    queue = [];
  }
}

/* Check a file for spelling mistakes.
 * Can be invoked with `loadError` to fail on the file and
 * stop the middleware. */
function all(tree, file, config) {
  var ignore = config.ignore;
  var ignoreLiteral = config.ignoreLiteral;
  var ignoreDigits = config.ignoreDigits;

  spellchecker.use(config.dictionary);

  visit(tree, 'WordNode', checkWord);

  return;

  /* Check one word. */
  function checkWord(node, position, parent) {
    var children = node.children;
    var correct = true;
    var word = toString(node);
    var length;
    var index;
    var child;

    if (ignoreLiteral && isLiteral(parent, position)) {
      return;
    }

    if (irrelevant(word)) {
      return;
    }

    correct = spellchecker.check(word);

    if (!correct && children.length > 1) {
      correct = true;
      length = children.length;
      index = -1;

      while (++index < length) {
        child = children[index];

        if (child.type !== 'TextNode' || irrelevant(child.value)) {
          continue;
        }

        if (!spellchecker.check(child.value)) {
          correct = false;
        }
      }
    }

    if (!correct) {
      file.warn(word + ' is misspelled', node, 'spelling');
    }
  }

  /* Check if a word is irrelevant. */
  function irrelevant(word) {
    return includes(ignore, word) || (ignoreDigits && /^\d+$/.test(word));
  }
}
