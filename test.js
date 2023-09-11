/**
 * @typedef {import('./index.js').Dictionary} Dictionary
 */

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
      // @ts-expect-error: to do.
      retext().use(retextSpell).freeze()
    },
    /^TypeError: Expected `Object`, got `undefined`$/,
    'should throw'
  )

  t.end()
})

test('should fail load errors on the VFile', async (t) => {
  /** @type {Dictionary} */
  function failingDictionary(callback) {
    setImmediate(() => {
      callback(new Error('load error'))
    })
  }

  const processor = retext().use(retextSpell, failingDictionary)

  try {
    await processor.process('')
    t.fail('failing dictionary should not pass')
  } catch (error) {
    t.match(String(error), /load error/, 'expected error to throw process (1)')
  }

  // Coverage: future files can fail immediately.
  try {
    await processor.process('')
    t.fail('failing dictionary should not pass')
  } catch (error) {
    t.match(String(error), /load error/, 'expected error to throw process (2)')
  }
})

test('should warn for misspelt words', async (t) => {
  const file = await retext().use(retextSpell, enGb).process('color')

  t.deepEqual(
    JSON.parse(JSON.stringify({...file.messages[0], ancestors: []})),
    {
      ancestors: [],
      column: 1,
      fatal: false,
      message: '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
      line: 1,
      name: '1:1-1:6',
      place: {
        start: {line: 1, column: 1, offset: 0},
        end: {line: 1, column: 6, offset: 5}
      },
      reason: '`color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
      ruleId: 'color',
      source: 'retext-spell',
      actual: 'color',
      expected: ['colon', 'colour', 'Colo'],
      url: 'https://github.com/retextjs/retext-spell#readme'
    },
    'should emit messages'
  )

  check(t, await retext().use(retextSpell, enGb).process('color'), [
    '1:1-1:6: `color` is misspelt'
  ])

  check(t, await retext().use(retextSpell, en).process('colour and utilise'), [
    '1:1-1:7: `colour` is misspelt',
    '1:12-1:19: `utilise` is misspelt'
  ])

  check(
    t,
    await retext().use(retextSpell, en).process('colour and colour and colour'),
    [
      '1:1-1:7: `colour` is misspelt',
      '1:12-1:18: `colour` is misspelt',
      '1:23-1:29: `colour` is misspelt'
    ]
  )
})

test('should warn for invalid words (coverage)', async (t) => {
  const english = retext().use(retextSpell, enGb)

  check(t, await english.process('color'), ['1:1-1:6: `color` is misspelt'])
  check(t, await english.process('colour'), [])
})

test('should cache suggestions', async (t) => {
  const processor = retext().use(retextSpell, enGb)
  const numberOfChecks = 2
  let index = -1

  t.plan(numberOfChecks)

  while (++index < numberOfChecks) {
    const file = await processor.process('color')

    t.deepEqual(
      String(file.messages),
      '1:1-1:6: `color` is misspelt; did you mean `colon`, `colour`, `Colo`?',
      'should emit messages'
    )
  }
})

test('should support `max`, for maximum suggestions', async (t) => {
  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, max: 1})
      .process('Some useles mispelt documeant'),
    [
      '1:6-1:12: `useles` is misspelt',
      '1:13-1:20: Too many misspellings',
      '1:13-1:20: `mispelt` is misspelt',
      '1:21-1:30: `documeant` is misspelt'
    ]
  )
})

test('should ignore literal words', async (t) => {
  check(t, await retext().use(retextSpell, enGb).process('“color”'), [])
})

test('...unless `ignoreLiteral` is false', async (t) => {
  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, ignoreLiteral: false})
      .process('“color”'),
    ['1:2-1:7: `color` is misspelt']
  )
})

test('should warn for misspelt hyphenated words', async (t) => {
  check(
    t,
    await retext().use(retextSpell, enGb).process('wrongely-spelled-word'),
    ['1:1-1:22: `wrongely-spelled-word` is misspelt']
  )
})

test('should not warn for correctly spelled hyphenated words', async (t) => {
  check(
    t,
    await retext().use(retextSpell, enGb).process('random-hyphenated-word'),
    []
  )
})

test('should not warn for ignored words in hyphenated words', async (t) => {
  check(
    t,
    await retext()
      .use(retextSpell, {
        dictionary: enGb,
        ignore: ['wrongely']
      })
      .process('wrongely-spelled-word'),
    []
  )
})

test('should ignore digits', async (t) => {
  check(t, await retext().use(retextSpell, enGb).process('123456'), [])
})

test('should ignore times', async (t) => {
  check(
    t,
    await retext().use(retextSpell, enGb).process('Let’s meet at 2:41pm.'),
    []
  )

  check(
    t,
    await retext().use(retextSpell, enGb).process('On my way! ETA 11:50!'),
    []
  )
})

test('should treat smart apostrophes as straight apostrophes', async (t) => {
  check(t, await retext().use(retextSpell, enGb).process('It doesn’t work'), [])

  check(
    t,
    await retext().use(retextSpell, enGb).process("It doesn't work."),
    []
  )

  check(
    t,
    await retext()
      .use(retextSpell, {
        dictionary: enGb,
        normalizeApostrophes: false
      })
      .process("It doesn't work"),
    []
  )
})

test('...unless `ignoreDigits` is false', async (t) => {
  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, ignoreDigits: false})
      .process('123456'),
    ['1:1-1:7: `123456` is misspelt']
  )
})

test('should ignore digits with decimals', async (t) => {
  check(t, await retext().use(retextSpell, enGb).process('3.14'), [])
})

test('...unless `ignoreDigits` is false', async (t) => {
  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, ignoreDigits: false})
      .process('3.15'),
    ['1:1-1:5: `3.15` is misspelt']
  )
})

test('should not ignore words that include digits', async (t) => {
  check(t, await retext().use(retextSpell, enGb).process('768x1024'), [
    '1:1-1:9: `768x1024` is misspelt'
  ])
})

test('should `ignore`', async (t) => {
  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, ignore: ['color']})
      .process('color coloor'),
    ['1:7-1:13: `coloor` is misspelt']
  )
})

test('should accept `personal`', async (t) => {
  // Forbid UK spelling, mark US spelling as correct.
  const personal = '*colour\ncolor\n'

  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, personal})
      .process('color coloor colour'),
    ['1:7-1:13: `coloor` is misspelt', '1:14-1:20: `colour` is misspelt']
  )

  check(
    t,
    await retext()
      .use(retextSpell, {dictionary: enGb, personal: Buffer.from(personal)})
      .process('color coloor colour'),
    ['1:7-1:13: `coloor` is misspelt', '1:14-1:20: `colour` is misspelt']
  )
})

test('should integrate w/ `retext-emoji`', async (t) => {
  check(t, await retext().use(retextSpell, enGb).process('Pages ⚡️'), [
    '1:8-1:9: `️` is misspelt; did you mean'
  ])

  check(
    t,
    await retext().use(emoji).use(retextSpell, enGb).process('Pages ⚡️'),
    []
  )
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
