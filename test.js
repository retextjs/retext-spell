/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module retext:spell
 * @fileoverview Test suite for `retext-spell`.
 */

'use strict';

/* eslint-env node */

/*
 * Dependencies.
 */

var test = require('tape');
var enUS = require('dictionary-en-us');
var enGB = require('dictionary-en-gb');
var retext = require('retext');
var spell = require('./');

/**
 * Fixture for a loader which fails.
 */
function failingLoader(callback) {
    setImmediate(function () {
        callback(new Error('load error'));
    });
}

/**
 * Fixture for a loader which fails.
 */
function failingConstructor(callback) {
    setImmediate(function () {
        callback(null, {
            'dic': 'alpha'
        });
    });
}

/*
 * Tests.
 */

test('should throw when without `options`', function (t) {
    t.plan(1);

    try {
        retext().use(spell);
    } catch (err) {
        t.equal(err.message, 'Expected `Object`, got `undefined`');
    }
});

test('should fail load errors on the VFile', function (t) {
    var processor = retext().use(spell, failingLoader);

    t.plan(3);

    processor.process('', function (err) {
        var failed;

        t.equal(err.message, 'load error');

        /*
         * Coverage: future files can fail immediatly.
         */

        processor.process('', function (err) {
            t.equal(err.message, 'load error');
            failed = true;
        });

        t.equal(failed, true);
    });
});

test('should fail construct errors on the VFile', function (t) {
    var processor = retext().use(spell, failingConstructor);

    t.plan(3);

    processor.process('', function (err) {
        var failed;

        t.equal(err.message, 'First argument must be a buffer');

        /*
         * Coverage: future files can fail immediatly.
         */

        processor.process('', function (err) {
            t.equal(err.message, 'First argument must be a buffer');
            failed = true;
        });

        t.equal(failed, true);
    });
});

test('should warn for misspelt words', function (t) {
    t.plan(4);

    retext().use(spell, enGB).process('color', function (err, file) {
        t.equal(err, null);

        t.deepEqual(file.messages.map(String), [
            '1:1-1:6: color > colour, colon, col or, col-or, Colorado'
        ]);
    });

    retext().use(spell, enUS).process('colour and utilise', function (err, file) {
        t.equal(err, null);

        t.deepEqual(file.messages.map(String), [
            '1:1-1:7: colour > color, co lour, co-lour, col our, col-our, lour',
            '1:12-1:19: utilise > utilize'
        ]);
    });
});

test('should warn for invalid words (coverage)', function (t) {
    var english = retext().use(spell, enGB);

    t.plan(3);

    english.process('color', function (err, file) {
        t.equal(err, null);

        t.deepEqual(file.messages.map(String), [
            '1:1-1:6: color > colour, colon, col or, col-or, Colorado'
        ]);

        /*
         * Coverage: future files can start faster.
         */

        english.process('colour', function (err, file) {
            t.deepEqual(file.messages.map(String), []);
        });
    });
});

test('should ignore literal words', function (t) {
    t.plan(2);

    retext().use(spell, enGB).process('“color”', function (err, file) {
        t.equal(err, null);
        t.deepEqual(file.messages.map(String), []);
    });
});

test('...unless `ignoreLiteral` is false', function (t) {
    t.plan(2);

    retext().use(spell, {
        'dictionary': enGB,
        'ignoreLiteral': false
    }).process('“color”', function (err, file) {
        t.equal(err, null);
        t.deepEqual(file.messages.map(String), [
            '1:2-1:7: color > colour, colon, col or, col-or, Colorado'
        ]);
    });
});
