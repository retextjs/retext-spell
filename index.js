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
var includes = require('lodash.includes');

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
    var ignore = config.ignore;
    var ignoreLiteral = config.ignoreLiteral;
    var ignoreDigits = config.ignoreDigits;
    var ignoreMentions = config.ignoreMentions;

    spellchecker.use(config.dictionary);

    /**
     * Check if a word should be excluded from spelling check
     *
     * @param {string} word - Word to check
     */
    function isIgnored(word) {
        return includes(ignore, word) || (ignoreDigits && /^\d+$/.test(word));
    }

    function isMention(node, parent) {
        var previousNode = parent.children[parent.children.indexOf(node) - 1];
        return previousNode && toString(previousNode) == '@';
    }

    /**
     * Check a single `WordNode`.
     *
     * @param {NLCSTNode} node - Word.
     * @param {number} position - Position of `node` in
     *   `parent`.
     * @param {NLCSTNode} parent - `parent` of `node`.
     */
    function checkWord(node, position, parent) {
        var children = node.children;
        var isCorrect = true;
        var word = toString(node);
        var length;
        var index;
        var child;

        if(ignoreMentions && isMention(node, parent)) {
            return;
        }

        if (ignoreLiteral && isLiteral(parent, position)) {
            return;
        }

        if (isIgnored(word)) {
            return;
        }

        isCorrect = spellchecker.check(word);

        if (!isCorrect && children.length > 1) {
            isCorrect = true;
            length = children.length;
            index = -1;

            while (++index < length) {
                child = children[index];

                if (child.type !== 'TextNode' || isIgnored(child.value)) {
                    continue;
                }

                if (!spellchecker.check(child.value)) {
                    isCorrect = false;
                }
            }
        }

        if (!isCorrect) {
            file.warn(word + ' is misspelled', node, 'spelling');
        }

    }

    /*
     * Visit all words.
     */
    visit(tree, 'WordNode', checkWord);
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
    var ignore = options && options.ignore;
    var ignoreLiteral = options && options.ignoreLiteral;
    var ignoreDigits = options && options.ignoreDigits;
    var ignoreMentions = options && options.ignoreMentions;
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

    if (ignoreMentions === null || ignoreMentions === undefined) {
        ignoreMentions = true;
    }

    config.ignoreLiteral = ignoreLiteral;
    config.ignoreDigits = ignoreDigits;
    config.ignoreMentions = ignoreMentions;
    config.ignore = ignore;

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
