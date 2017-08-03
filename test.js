'use strict';

var test = require('tape');
var enUS = require('dictionary-en-us');
var enGB = require('dictionary-en-gb');
var retext = require('retext');
var spell = require('./');

test('should throw when without `options`', function (t) {
  t.throws(
    function () {
      retext().use(spell).freeze();
    },
    /^Error: Expected `Object`, got `undefined`$/,
    'should throw'
  );

  t.end();
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
  t.plan(3);

  retext().use(spell, enGB).process('color', function (_, file) {
    t.deepEqual(file.messages.map(String), [
      '1:1-1:6: `color` is misspelt; did you mean `colon`, `colour`, `Colo`?'
    ]);
  });

  retext().use(spell, enUS).process('colour and utilise', function (_, file) {
    t.deepEqual(file.messages.map(String), [
      '1:1-1:7: `colour` is misspelt; did you mean `color`?',
      '1:12-1:19: `utilise` is misspelt; did you mean `utilize`?'
    ]);
  });

  retext().use(spell, enUS).process('colour and colour and colour', function (_, file) {
    t.deepEqual(
      file.messages.map(String),
      [
        '1:1-1:7: `colour` is misspelt; did you mean `color`?',
        '1:12-1:18: `colour` is misspelt; did you mean `color`?',
        '1:23-1:29: `colour` is misspelt; did you mean `color`?'
      ]
    );
  });
});

test('should warn for invalid words (coverage)', function (t) {
  var english = retext().use(spell, enGB);

  t.plan(2);

  english.process('color', function (_, file) {
    t.deepEqual(file.messages.map(String), [
      '1:1-1:6: `color` is misspelt; did you mean `colon`, `colour`, `Colo`?'
    ]);

    /* Coverage: future files can start faster. */
    english.process('colour', function (_, file) {
      t.deepEqual(file.messages.map(String), []);
    });
  });
});

test('should support `max`, for maximum suggestions', function (t) {
  t.plan(1);

  retext()
    .use(spell, {dictionary: enGB, max: 1})
    .process('Some useles mispelt documeant', function (_, file) {
      t.deepEqual(
        file.messages.map(String),
        [
          '1:6-1:12: `useles` is misspelt',
          '1:13-1:20: Too many misspellings; no further spell suggestions are given',
          '1:13-1:20: `mispelt` is misspelt',
          '1:21-1:30: `documeant` is misspelt'
        ]
      );
    });
});

test('should ignore literal words', function (t) {
  t.plan(1);

  retext().use(spell, enGB).process('“color”', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });
});

test('...unless `ignoreLiteral` is false', function (t) {
  t.plan(1);

  retext()
    .use(spell, {dictionary: enGB, ignoreLiteral: false})
    .process('“color”', function (_, file) {
      t.deepEqual(
        file.messages.map(String),
        ['1:2-1:7: `color` is misspelt; did you mean `colon`, `colour`, `Colo`?']
      );
    });
});

test('should warn for misspelt hyphenated words', function (t) {
  t.plan(1);

  retext()
    .use(spell, enGB)
    .process('wrongely-spelled-word', function (_, file) {
      t.deepEqual(file.messages.map(String), [
        '1:1-1:22: `wrongely-spelled-word` is misspelt'
      ]);
    });
});

test('should not warn for correctly spelled hyphenated words', function (t) {
  t.plan(1);

  retext().use(spell, enGB).process('random-hyphenated-word', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });
});

test('should not warn for ignored words in hyphenated words', function (t) {
  t.plan(1);

  retext().use(spell, {
    dictionary: enGB,
    ignore: ['wrongely']
  }).process('wrongely-spelled-word', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });
});

test('should ignore digits', function (t) {
  t.plan(1);

  retext().use(spell, enGB).process('123456', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });
});

test('should treat smart apostrophes as straight apostrophes', function (t) {
  t.plan(4);

  retext().use(spell, enGB).process('It doesn’t work', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });

  retext().use(spell, enGB).process('It doesn\'t work.', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });

  retext().use(spell, {
    dictionary: enGB,
    normalizeApostrophes: false
  }).process('It doesn’t work', function (_, file) {
    t.deepEqual(
      file.messages.map(String),
      ['1:4-1:11: `doesn’t` is misspelt']
    );
  });

  retext().use(spell, {
    dictionary: enGB,
    normalizeApostrophes: false
  }).process('It doesn\'t work', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });
});

test('...unless `ignoreDigits` is false', function (t) {
  t.plan(1);

  retext()
    .use(spell, {dictionary: enGB, ignoreDigits: false})
    .process('123456', function (_, file) {
      t.deepEqual(file.messages.map(String), [
        '1:1-1:7: `123456` is misspelt; did you mean `12th456`, `12th3456`, `12th56`?'
      ]);
    });
});

test('should ignore digits with decimals', function (t) {
  t.plan(1);

  retext().use(spell, enGB).process('3.14', function (_, file) {
    t.deepEqual(file.messages.map(String), []);
  });
});

test('...unless `ignoreDigits` is false', function (t) {
  t.plan(1);

  retext()
    .use(spell, {dictionary: enGB, ignoreDigits: false})
    .process('3.15', function (_, file) {
      t.deepEqual(file.messages.map(String), [
        '1:1-1:5: `3.15` is misspelt; did you mean `3.15th`?'
      ]);
    });
});

test('should not ignore words that include digits', function (t) {
  t.plan(1);

  retext().use(spell, enGB).process('768x1024', function (_, file) {
    t.deepEqual(file.messages.map(String), [
      '1:1-1:9: `768x1024` is misspelt; did you mean `76thx1024`, `76th8x1024`, `76th1024`?'
    ]);
  });
});

test('should `ignore`', function (t) {
  t.plan(1);

  retext()
    .use(spell, {dictionary: enGB, ignore: ['color']})
    .process('color coloor', function (_, file) {
      t.deepEqual(file.messages.map(String), [
        '1:7-1:13: `coloor` is misspelt; did you mean `colour`?'
      ]);
    });
});

test('should accept `personal`', function (t) {
  /* Forbid UK spelling, mark US spelling as correct. */
  var personal = '*colour\ncolor\n';

  t.plan(2);

  retext()
    .use(spell, {dictionary: enGB, personal: personal})
    .process('color coloor colour', function (_, file) {
      t.deepEqual(
        file.messages.map(String),
        [
          '1:7-1:13: `coloor` is misspelt; did you mean `color`?',
          '1:14-1:20: `colour` is misspelt; did you mean `dolour`, `colours`, `color`?'
        ],
        'as string'
      );
    });

  retext()
    .use(spell, {dictionary: enGB, personal: new Buffer(personal)})
    .process('color coloor colour', function (_, file) {
      t.deepEqual(
        file.messages.map(String),
        [
          '1:7-1:13: `coloor` is misspelt; did you mean `color`?',
          '1:14-1:20: `colour` is misspelt; did you mean `dolour`, `colours`, `color`?'
        ],
        'as buffer'
      );
    });
});
