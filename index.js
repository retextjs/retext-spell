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

var nodehun = require('nodehun').createNewNodehun;
var visit = require('unist-util-visit');
var toString = require('nlcst-to-string');
var isLiteral = require('nlcst-is-literal');

/**
 * Check a file for spelling mistakes.
 * Can be invoked with `loadError` to fail on the file and
 * stop the middleware.
 *
 * @param {NLCSTNode} tree - Parent node of `WordNode`s.
 * @param {VFile} file - Virtual file.
 * @param {Object} config - Configuration.
 * @param {function(Error?)} next - Invoked to continue or
 *   break the middleware.
 */
function all(tree, file, config, next) {
    var hun = config.dictionary;
    var ignoreLiteral = config.ignore;
    var queue = 0;

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

        queue++;

        hun.spellSuggestions(toString(node), function (err, _, correct) {
            var message;

            if (!err && correct.length) {
                message = toString(node) + ' > ' + correct.join(', ');
                message = file.warn(message, node);
                message.source = 'retext-spell';
            }

            queue--;

            if (!queue) {
                next();
            }
        });
    }

    /*
     * Visit all words.
     */

    visit(tree, 'WordNode', one);

    if (!queue) {
        next();
    }
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
     * Callback invoked when a `hun` is constructed
     * (possibly erroneous) for the given dictionary or
     * when `load`ing failed.
     *
     * Flushes the queue when available, and sets the
     * results on the parent scope.
     *
     * @param {Error?} err - Construction or loading error.
     * @param {Hun?} hun - Dictionary instance.
     */
    function construct(err, hun) {
        var length = queue.length;
        var index = -1;

        config.dictionary = hun;
        loadError = err;

        while (++index < length) {
            if (loadError) {
                queue[index][3](loadError);
            } else {
                all.apply(null, queue[index]);
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
            nodehun(result.aff, result.dic, construct);
        }
    });

    /**
     * Transformer which either immediatly invokes `all`
     * when everything has finished loading or queue’s
     * the arguments.
     */
    return function (tree, file, next) {
        if (!loadError && !config.dictionary) {
            queue.push([tree, file, config, next]);
        } else if (loadError) {
            next(loadError);
        } else {
            all(tree, file, config, next);
        }
    };
}

/*
 * Expose.
 */

module.exports = attacher;
