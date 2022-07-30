import assert from 'node:assert'
import {Buffer} from 'node:buffer'
import test from 'tape'
import en from 'dictionary-en'
import enGb from 'dictionary-en-gb'
import {retext} from 'retext'
import emoji from 'retext-emoji'
import retextSpell from './index.js'

test('should throw when without `options`', (t) => {
  t.throws(
    () => {
      retext().use(retextSpell).freeze()
    },
    /^TypeError: Expected `Object`, got `undefined`$/,
    'should throw'
  )

  t.end()
})

test('should fail load errors on the VFile', (t) => {
  const processor = retext().use(
    retextSpell,
    // Fixture for a loader that fails.
    (callback) => {
      setImmediate(() => {
        callback(new Error('load error'))
      })
    }
  )

  t.plan(2)

  processor.process('').then(t.ifErr, (/** @type {Error} */ error) => {
    t.equal(error.message, 'load error')

    // Coverage: future files can fail immediatly.
    processor.process('').then(t.ifErr, (/** @type {Error} */ error) => {
      t.equal(error.message, 'load error')
    })
  })
})

test('should warn for misspelt words', (t) => {
  t.plan(4)

  retext()
    .use(retextSpell, enGb)
    .process('color')
    .then((file) => {
      t.deepEqual(
        JSON.parse(JSON.stringify(file.messages)),
        [
          {
            name: '1:1-1:6',
            message:
              '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
            reason:
              '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
            line: 1,
            column: 1,
            source: 'retext-spell',
            ruleId: 'color',
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 6, offset: 5}
            },
            fatal: false,
            actual: 'color',
            expected: ['colon', 'colour', 'Colo'],
            url: 'https://github.com/retextjs/retext-spell#readme'
          }
        ],
        'should emit messages'
      )
    }, t.ifErr)

  retext()
    .use(retextSpell, enGb)
    .process('color')
    .then((file) => {
      check(t, file, ['1:1-1:6: `color` is misspelt'])
    }, t.ifErr)

  retext()
    .use(retextSpell, en)
    .process('colour and utilise')
    .then((file) => {
      check(t, file, [
        '1:1-1:7: `colour` is misspelt',
        '1:12-1:19: `utilise` is misspelt'
      ])
    }, t.ifErr)

  retext()
    .use(retextSpell, en)
    .process('colour and colour and colour')
    .then((file) => {
      check(t, file, [
        '1:1-1:7: `colour` is misspelt',
        '1:12-1:18: `colour` is misspelt',
        '1:23-1:29: `colour` is misspelt'
      ])
    }, t.ifErr)
})

test('should warn for invalid words (coverage)', (t) => {
  const english = retext().use(retextSpell, enGb)

  t.plan(2)

  english.process('color').then((file) => {
    check(t, file, ['1:1-1:6: `color` is misspelt'])

    // Coverage: future files can start faster.
    english.process('colour').then((file) => {
      check(t, file, [])
    }, t.ifErr)
  }, t.ifErr)
})

test('should cache suggestions', (t) => {
  const processor = retext().use(retextSpell, enGb)
  const numberOfChecks = 2
  let index = -1

  t.plan(numberOfChecks)

  while (++index < numberOfChecks) {
    processor.process('color').then((file) => {
      t.deepEqual(
        String(file.messages),
        '1:1-1:6: `color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
        'should emit messages'
      )
    }, t.ifErr)
  }
})

test('should support `max`, for maximum suggestions', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, {dictionary: enGb, max: 1})
    .process('Some useles mispelt documeant')
    .then((file) => {
      check(t, file, [
        '1:6-1:12: `useles` is misspelt',
        '1:13-1:20: Too many misspellings',
        '1:13-1:20: `mispelt` is misspelt',
        '1:21-1:30: `documeant` is misspelt'
      ])
    }, t.ifErr)
})

test('should ignore literal words', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, enGb)
    .process('“color”')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('...unless `ignoreLiteral` is false', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, {dictionary: enGb, ignoreLiteral: false})
    .process('“color”')
    .then((file) => {
      check(t, file, ['1:2-1:7: `color` is misspelt'])
    }, t.ifErr)
})

test('should warn for misspelt hyphenated words', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, enGb)
    .process('wrongely-spelled-word')
    .then((file) => {
      check(t, file, ['1:1-1:22: `wrongely-spelled-word` is misspelt'])
    }, t.ifErr)
})

test('should not warn for correctly spelled hyphenated words', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, enGb)
    .process('random-hyphenated-word')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('should not warn for ignored words in hyphenated words', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, {
      dictionary: enGb,
      ignore: ['wrongely']
    })
    .process('wrongely-spelled-word')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('should ignore digits', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, enGb)
    .process('123456')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('should ignore times', (t) => {
  t.plan(2)

  retext()
    .use(retextSpell, enGb)
    .process('Let’s meet at 2:41pm.')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)

  retext()
    .use(retextSpell, enGb)
    .process('On my way! ETA 11:50!')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('should treat smart apostrophes as straight apostrophes', (t) => {
  t.plan(3)

  retext()
    .use(retextSpell, enGb)
    .process('It doesn’t work')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)

  retext()
    .use(retextSpell, enGb)
    .process("It doesn't work.")
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)

  // Most affix files specify this functionality (with `ICONV ’ '`).
  // This didn’t work in nspell, but was fixed:
  // see: <https://github.com/wooorm/nspell/commit/a55923e>.
  // We keep `normalizeApostrophes` here for legacy reasons and for use with
  // dictionaries that don’t support it.
  //
  // retext()
  //   .use(retextSpell, {
  //     dictionary: enGb,
  //     normalizeApostrophes: false
  //   })
  //   .process('It doesn’t work')
  //   .then((file) => {
  //     check(t, file, ['1:4-1:11: `doesn’t` is misspelt'])
  //   }, t.ifErr)

  retext()
    .use(retextSpell, {
      dictionary: enGb,
      normalizeApostrophes: false
    })
    .process("It doesn't work")
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('...unless `ignoreDigits` is false', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, {dictionary: enGb, ignoreDigits: false})
    .process('123456')
    .then((file) => {
      check(t, file, ['1:1-1:7: `123456` is misspelt'])
    }, t.ifErr)
})

test('should ignore digits with decimals', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, enGb)
    .process('3.14')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

test('...unless `ignoreDigits` is false', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, {dictionary: enGb, ignoreDigits: false})
    .process('3.15')
    .then((file) => {
      check(t, file, ['1:1-1:5: `3.15` is misspelt'])
    }, t.ifErr)
})

test('should not ignore words that include digits', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, enGb)
    .process('768x1024')
    .then((file) => {
      check(t, file, ['1:1-1:9: `768x1024` is misspelt'])
    }, t.ifErr)
})

test('should `ignore`', (t) => {
  t.plan(1)

  retext()
    .use(retextSpell, {dictionary: enGb, ignore: ['color']})
    .process('color coloor')
    .then((file) => {
      check(t, file, ['1:7-1:13: `coloor` is misspelt'])
    }, t.ifErr)
})

test('should accept `personal`', (t) => {
  // Forbid UK spelling, mark US spelling as correct.
  const personal = '*colour\ncolor\n'

  t.plan(2)

  retext()
    .use(retextSpell, {dictionary: enGb, personal})
    .process('color coloor colour')
    .then((file) => {
      check(t, file, [
        '1:7-1:13: `coloor` is misspelt',
        '1:14-1:20: `colour` is misspelt'
      ])
    }, t.ifErr)

  retext()
    .use(retextSpell, {dictionary: enGb, personal: Buffer.from(personal)})
    .process('color coloor colour')
    .then((file) => {
      check(t, file, [
        '1:7-1:13: `coloor` is misspelt',
        '1:14-1:20: `colour` is misspelt'
      ])
    }, t.ifErr)
})

test('should integrate w/ `retext-emoji`', (t) => {
  t.plan(2)

  retext()
    .use(retextSpell, enGb)
    .process('Pages ⚡️')
    .then((file) => {
      check(t, file, ['1:8-1:9: `️` is misspelt; did you mean'])
    }, t.ifErr)

  retext()
    .use(emoji)
    .use(retextSpell, enGb)
    .process('Pages ⚡️')
    .then((file) => {
      check(t, file, [])
    }, t.ifErr)
})

/**
 * @param {import('tape').Test} t
 * @param {import('vfile').VFile} file
 * @param {Array<string>} expected
 */
function check(t, file, expected) {
  t.doesNotThrow(() => {
    const messages = file.messages
    const length = Math.max(expected.length, messages.length)
    let index = -1

    while (++index < length) {
      assert.strictEqual(
        String(messages[index]).indexOf(expected[index]),
        0,
        expected[index]
      )
    }
  })
}
