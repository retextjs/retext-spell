'use strict'

var assert = require('assert')
var test = require('tape')
var en = require('dictionary-en')
var enGb = require('dictionary-en-gb')
var retext = require('retext')
var emoji = require('retext-emoji')
var spell = require('.')

test('should throw when without `options`', function (t) {
  t.throws(
    function () {
      retext().use(spell).freeze()
    },
    /^Error: Expected `Object`, got `undefined`$/,
    'should throw'
  )

  t.end()
})

test('should fail load errors on the VFile', function (t) {
  var processor = retext().use(spell, failingLoader)

  t.plan(3)

  processor.process('', function (error) {
    var failed

    t.equal(error.message, 'load error')

    // Coverage: future files can fail immediatly.
    processor.process('', function (error) {
      t.equal(error.message, 'load error')
      failed = true
    })

    t.equal(failed, true)
  })

  // Fixture for a loader which fails.
  function failingLoader(callback) {
    setImmediate(function () {
      callback(new Error('load error'))
    })
  }
})

test('should warn for misspelt words', function (t) {
  t.plan(4)

  retext()
    .use(spell, enGb)
    .process('color', function (_, file) {
      t.deepEqual(
        JSON.parse(JSON.stringify(file.messages)),
        [
          {
            message:
              '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
            name: '1:1-1:6',
            reason:
              '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
            line: 1,
            column: 1,
            location: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 6, offset: 5}
            },
            source: 'retext-spell',
            ruleId: 'color',
            fatal: false,
            actual: 'color',
            expected: ['colon', 'colour', 'Colo']
          }
        ],
        'should emit messages'
      )
    })

  retext()
    .use(spell, enGb)
    .process('color', function (_, file) {
      check(t, file, ['1:1-1:6: `color` is misspelt'])
    })

  retext()
    .use(spell, en)
    .process('colour and utilise', function (_, file) {
      check(t, file, [
        '1:1-1:7: `colour` is misspelt',
        '1:12-1:19: `utilise` is misspelt'
      ])
    })

  retext()
    .use(spell, en)
    .process('colour and colour and colour', function (_, file) {
      check(t, file, [
        '1:1-1:7: `colour` is misspelt',
        '1:12-1:18: `colour` is misspelt',
        '1:23-1:29: `colour` is misspelt'
      ])
    })
})

test('should warn for invalid words (coverage)', function (t) {
  var english = retext().use(spell, enGb)

  t.plan(2)

  english.process('color', function (_, file) {
    check(t, file, ['1:1-1:6: `color` is misspelt'])

    // Coverage: future files can start faster.
    english.process('colour', function (_, file) {
      check(t, file, [])
    })
  })
})

test('should cache suggestions', function (t) {
  t.plan(2)

  const retextSpell = retext().use(spell, enGb)

  const numberOfChecks = 2

  for (let i = 0; i < numberOfChecks; i += 1) {
    retextSpell.process('color', function (_, file) {
      t.deepEqual(
        JSON.parse(JSON.stringify(file.messages)),
        [
          {
            message:
              '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
            name: '1:1-1:6',
            reason:
              '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
            line: 1,
            column: 1,
            location: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 6, offset: 5}
            },
            source: 'retext-spell',
            ruleId: 'color',
            fatal: false,
            actual: 'color',
            expected: ['colon', 'colour', 'Colo']
          }
        ],
        'should emit messages'
      )
    })
  }
})

test('should support `max`, for maximum suggestions', function (t) {
  t.plan(1)

  retext()
    .use(spell, {dictionary: enGb, max: 1})
    .process('Some useles mispelt documeant', function (_, file) {
      check(t, file, [
        '1:6-1:12: `useles` is misspelt',
        '1:13-1:20: Too many misspellings',
        '1:13-1:20: `mispelt` is misspelt',
        '1:21-1:30: `documeant` is misspelt'
      ])
    })
})

test('should ignore literal words', function (t) {
  t.plan(1)

  retext()
    .use(spell, enGb)
    .process('“color”', function (_, file) {
      check(t, file, [])
    })
})

test('...unless `ignoreLiteral` is false', function (t) {
  t.plan(1)

  retext()
    .use(spell, {dictionary: enGb, ignoreLiteral: false})
    .process('“color”', function (_, file) {
      check(t, file, ['1:2-1:7: `color` is misspelt'])
    })
})

test('should warn for misspelt hyphenated words', function (t) {
  t.plan(1)

  retext()
    .use(spell, enGb)
    .process('wrongely-spelled-word', function (_, file) {
      check(t, file, ['1:1-1:22: `wrongely-spelled-word` is misspelt'])
    })
})

test('should not warn for correctly spelled hyphenated words', function (t) {
  t.plan(1)

  retext()
    .use(spell, enGb)
    .process('random-hyphenated-word', function (_, file) {
      check(t, file, [])
    })
})

test('should not warn for ignored words in hyphenated words', function (t) {
  t.plan(1)

  retext()
    .use(spell, {
      dictionary: enGb,
      ignore: ['wrongely']
    })
    .process('wrongely-spelled-word', function (_, file) {
      check(t, file, [])
    })
})

test('should ignore digits', function (t) {
  t.plan(1)

  retext()
    .use(spell, enGb)
    .process('123456', function (_, file) {
      check(t, file, [])
    })
})

test('should treat smart apostrophes as straight apostrophes', function (t) {
  t.plan(3)

  retext()
    .use(spell, enGb)
    .process('It doesn’t work', function (_, file) {
      check(t, file, [])
    })

  retext()
    .use(spell, enGb)
    .process("It doesn't work.", function (_, file) {
      check(t, file, [])
    })

  // Most affix files specify this functionality (with `ICONV ’ '`).
  // This didn’t work in nspell, but was fixed:
  // see: <https://github.com/wooorm/nspell/commit/a55923e>.
  // We keep `normalizeApostrophes` here for legacy reasons and for use with
  // dictionaries that don’t support it.
  //
  // retext()
  //   .use(spell, {
  //     dictionary: enGb,
  //     normalizeApostrophes: false
  //   })
  //   .process('It doesn’t work', function(_, file) {
  //     check(t, file, ['1:4-1:11: `doesn’t` is misspelt'])
  //   })

  retext()
    .use(spell, {
      dictionary: enGb,
      normalizeApostrophes: false
    })
    .process("It doesn't work", function (_, file) {
      check(t, file, [])
    })
})

test('...unless `ignoreDigits` is false', function (t) {
  t.plan(1)

  retext()
    .use(spell, {dictionary: enGb, ignoreDigits: false})
    .process('123456', function (_, file) {
      check(t, file, ['1:1-1:7: `123456` is misspelt'])
    })
})

test('should ignore digits with decimals', function (t) {
  t.plan(1)

  retext()
    .use(spell, enGb)
    .process('3.14', function (_, file) {
      check(t, file, [])
    })
})

test('...unless `ignoreDigits` is false', function (t) {
  t.plan(1)

  retext()
    .use(spell, {dictionary: enGb, ignoreDigits: false})
    .process('3.15', function (_, file) {
      check(t, file, ['1:1-1:5: `3.15` is misspelt'])
    })
})

test('should not ignore words that include digits', function (t) {
  t.plan(1)

  retext()
    .use(spell, enGb)
    .process('768x1024', function (_, file) {
      check(t, file, ['1:1-1:9: `768x1024` is misspelt'])
    })
})

test('should `ignore`', function (t) {
  t.plan(1)

  retext()
    .use(spell, {dictionary: enGb, ignore: ['color']})
    .process('color coloor', function (_, file) {
      check(t, file, ['1:7-1:13: `coloor` is misspelt'])
    })
})

test('should accept `personal`', function (t) {
  // Forbid UK spelling, mark US spelling as correct.
  var personal = '*colour\ncolor\n'

  t.plan(2)

  retext()
    .use(spell, {dictionary: enGb, personal: personal})
    .process('color coloor colour', function (_, file) {
      check(t, file, [
        '1:7-1:13: `coloor` is misspelt',
        '1:14-1:20: `colour` is misspelt'
      ])
    })

  retext()
    .use(spell, {dictionary: enGb, personal: Buffer.from(personal)})
    .process('color coloor colour', function (_, file) {
      check(t, file, [
        '1:7-1:13: `coloor` is misspelt',
        '1:14-1:20: `colour` is misspelt'
      ])
    })
})

test('should integrate w/ `retext-emoji`', function (t) {
  t.plan(2)

  retext()
    .use(spell, enGb)
    .process('Pages ⚡️', function (_, file) {
      check(t, file, ['1:8-1:9: `️` is misspelt; did you mean'])
    })

  retext()
    .use(emoji)
    .use(spell, enGb)
    .process('Pages ⚡️', function (_, file) {
      check(t, file, [])
    })
})

function check(t, file, expected) {
  t.doesNotThrow(function () {
    var messages = file.messages
    var length = Math.max(expected.length, messages.length)
    var index = -1

    while (++index < length) {
      assert.strictEqual(
        String(messages[index]).indexOf(expected[index]),
        0,
        expected[index]
      )
    }
  })
}
