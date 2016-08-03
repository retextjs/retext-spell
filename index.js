/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module retext:spell
 * @fileoverview Spelling checker for retext.
 */

'use strict';

/*
 * Dependencies.
 */

var Spellchecker = require('hunspell-spellchecker');
var visit = require('unist-util-visit');
var toString = require('nlcst-to-string');
var isLiteral = require('nlcst-is-literal');

var spellchecker =  new Spellchecker();
/**
 * Check a file for spelling mistakes.
 * Can be invoked with `loadError` to fail on the file and
 * stop the middleware.
 *
 * @param {NLCSTNode} tree - Parent node of `WordNode`s.
 * @param {VFile} file - Virtual file.
 * @param {Object} config - Configuration.
 */
function all(tree, file, config) {
    spellchecker.use(config.dictionary);
    var ignoreLiteral = config.ignore;

    /**
     * Check a single `WordNode`.
     *
     * @param {NLCSTNode} node - Word.
     * @param {number} index - Position of `node` in
     *   `parent`.
     * @param {NLCSTNode} parent - `parent` of `node`.
     */
    function one(node, index, parent) {
        if (ignoreLiteral && isLiteral(parent, index)) {
            return;
        }

        var word = toString(node);
        var isCorrect = spellchecker.check(word);

        if (!isCorrect) {
            file.warn(word + ' is mispelled.', node, 'spelling');
        }

    }

    /*
     * Visit all words.
     */
    visit(tree, 'WordNode', one);
}

/**
 * Attacher.
 *
 * @param {Retext} retext - Processor.
 * @param {(Function|Object)} options - Configuration.
 * @return {Function} - `transformer`.
 */
function attacher(retext, options) {
    var queue = [];
    var load = options && (options.dictionary || options);
    var ignore = options && options.ignoreLiteral;
    var config = {};
    var loadError;

    if (!load) {
        throw new Error('Expected `Object`, got `' + load + '`');
    }

    config.ignore = ignore === null || ignore === undefined ? true : ignore;

    /**
     * Callback invoked when a `dictionary` is constructed
     * (possibly erroneous) or when `load`ing failed.
     *
     * Flushes the queue when available, and sets the
     * results on the parent scope.
     *
     * @param {Error?} err - Construction or loading error.
     * @param {Dictionary?} dictionary - Dictionary instance.
     */
    function construct(err, dictionary) {
        var length = queue.length;
        var index = -1;

        config.dictionary = dictionary;
        loadError = err;

        while (++index < length) {
            if (loadError) {
                queue[index][3](loadError); // next();
            } else {
                all.apply(null, queue[index]);
                queue[index][3](); // next();
            }
        }

        queue = [];
    }

    /**
     * `load`. See `dictionaries` for signatures.
     * Invokes `construct` on completion.
     *
     * @see https://github.com/wooorm/dictionaries
     */
    load(function (err, result) {
        if (err) {
            construct(err);
        } else {
            construct(null, spellchecker.parse({
                aff: result.aff,
                dic: result.dic
            }));
        }
    });

    /**
     * Transformer which either immediatly invokes `all`
     * when everything has finished loading or queue’s
     * the arguments.
     */
    return function transformer (tree, file, next) {
        if (!loadError && !config.dictionary) {
            queue.push([tree, file, config, next]);
        } else if (loadError) {
            next(loadError);
        } else {
            all(tree, file, config);
            next();
        }
    };
}

/*
 * Expose.
 */

module.exports = attacher;
