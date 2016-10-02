/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module retext:spell
 * @fileoverview Test suite for `retext-spell`.
 */

'use strict';

/* Dependencies. */
var test = require('tape');
var enUS = require('dictionary-en-us');
var enGB = require('dictionary-en-gb');
var retext = require('retext');
var spell = require('./');

/* Tests. */
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

    /* Coverage: future files can fail immediatly. */
    processor.process('', function (err) {
      t.equal(err.message, 'load error');
      failed = true;
    });

    t.equal(failed, true);
  });

  /* Fixture for a loader which fails. */
  function failingLoader(callback) {
    setImmediate(function () {
      callback(new Error('load error'));
    });
  }
});

test('should warn for misspelt words', function (t) {
  t.plan(4);

  retext().use(spell, enGB).process('color', function (err, file) {
    t.ifErr(err);

    t.deepEqual(file.messages.map(String), [
      '1:1-1:6: color is misspelled'
    ]);
  });

  retext().use(spell, enUS).process('colour and utilise', function (err, file) {
    t.ifErr(err);

    t.deepEqual(file.messages.map(String), [
      '1:1-1:7: colour is misspelled',
      '1:12-1:19: utilise is misspelled'
    ]);
  });
});

test('should warn for invalid words (coverage)', function (t) {
  var english = retext().use(spell, enGB);

  t.plan(4);

  english.process('color', function (err, file) {
    t.ifErr(err);

    t.deepEqual(file.messages.map(String), [
      '1:1-1:6: color is misspelled'
    ]);

    /* Coverage: future files can start faster. */
    english.process('colour', function (err, file) {
      t.ifErr(err);
      t.deepEqual(file.messages.map(String), []);
    });
  });
});

test('should ignore literal words', function (t) {
  t.plan(2);

  retext().use(spell, enGB).process('“color”', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), []);
  });
});

test('...unless `ignoreLiteral` is false', function (t) {
  t.plan(2);

  retext().use(spell, {
    dictionary: enGB,
    ignoreLiteral: false
  }).process('“color”', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), ['1:2-1:7: color is misspelled']);
  });
});

test('should warn for misspelled hyphenated words', function (t) {
  t.plan(2);

  retext().use(spell, {
    dictionary: enGB,
    ignoreDigits: false
  }).process('wrongely-spelled-word', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), [
      '1:1-1:22: wrongely-spelled-word is misspelled'
    ]);
  });
});

test('should not warn for correctly spelled hyphenated words', function (t) {
  t.plan(2);

  retext().use(spell, enGB).process('random-hyphenated-word', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), []);
  });
});

test('should not warn for ignored words in hyphenated words', function (t) {
  t.plan(2);

  retext().use(spell, {
    dictionary: enGB,
    ignore: ['wrongely']
  }).process('wrongely-spelled-word', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), []);
  });
});

test('should ignore digits', function (t) {
  t.plan(2);

  retext().use(spell, enGB).process('123456', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), []);
  });
});

test('...unless `ignoreDigits` is false', function (t) {
  t.plan(2);

  retext().use(spell, {
    dictionary: enGB,
    ignoreDigits: false
  }).process('123456', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), [
      '1:1-1:7: 123456 is misspelled'
    ]);
  });
});

test('should ignore digits with decimals', function (t) {
  t.plan(2);

  retext().use(spell, enGB).process('3.14', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), []);
  });
});

test('...unless `ignoreDigits` is false', function (t) {
  t.plan(2);

  retext().use(spell, {
    dictionary: enGB,
    ignoreDigits: false
  }).process('3.15', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), [
      '1:1-1:5: 3.15 is misspelled'
    ]);
  });
});

test('should not ignore words that include digits', function (t) {
  t.plan(2);

  retext().use(spell, enGB).process('768x1024', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), [
      '1:1-1:9: 768x1024 is misspelled'
    ]);
  });
});

test('should `ignore`', function (t) {
  t.plan(2);

  retext().use(spell, {
    dictionary: enGB,
    ignore: ['color']
  }).process('color coloor', function (err, file) {
    t.ifErr(err);
    t.deepEqual(file.messages.map(String), [
      '1:7-1:13: coloor is misspelled'
    ]);
  });
});
