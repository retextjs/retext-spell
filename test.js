/**
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import dictionaryEn from 'dictionary-en'
import {retext} from 'retext'
import retextEmoji from 'retext-emoji'
import retextSpell from './index.js'

test('retextSpell', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('./index.js')).sort(), [
      'default'
    ])
  })

  await t.test('should throw when without `options`', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how the runtime handles missing options.
      retext().use(retextSpell).freeze()
    }, /Missing `dictionary` in options/)
  })

  await t.test('should fail load errors on the VFile', async function () {
    const processor = retext().use(retextSpell, function (callback) {
      setImmediate(function () {
        callback(new Error('load error'))
      })
    })

    try {
      await processor.process('')
      assert.fail()
    } catch (error) {
      assert.match(String(error), /load error/)
    }

    // Coverage: future files can fail immediately.
    try {
      await processor.process('')
      assert.fail()
    } catch (error) {
      assert.match(String(error), /load error/)
    }
  })

  await t.test('should emit a message w/ metadata', async function () {
    const file = await retext().use(retextSpell, dictionaryEn).process('kolor')

    assert.deepEqual(
      JSON.parse(JSON.stringify({...file.messages[0], ancestors: []})),
      {
        actual: 'kolor',
        ancestors: [],
        column: 1,
        expected: ['color', 'dolor'],
        fatal: false,
        line: 1,
        message: '`kolor` is misspelt; did you mean `color`, `dolor`?',
        name: '1:1-1:6',
        place: {
          start: {column: 1, line: 1, offset: 0},
          end: {column: 6, line: 1, offset: 5}
        },
        reason: '`kolor` is misspelt; did you mean `color`, `dolor`?',
        ruleId: 'kolor',
        source: 'retext-spell',
        url: 'https://github.com/retextjs/retext-spell#readme'
      }
    )
  })

  await t.test('should work', async function () {
    const file = await retext().use(retextSpell, dictionaryEn).process('kolor')

    assert.deepEqual(file.messages.map(String), [
      '1:1-1:6: `kolor` is misspelt; did you mean `color`, `dolor`?'
    ])
  })

  await t.test('should work w/ repeated misspellings', async function () {
    const file = await retext()
      .use(retextSpell, dictionaryEn)
      .process('kolor and kolor and kolor')

    assert.deepEqual(file.messages.map(String), [
      '1:1-1:6: `kolor` is misspelt; did you mean `color`, `dolor`?',
      '1:11-1:16: `kolor` is misspelt; did you mean `color`, `dolor`?',
      '1:21-1:26: `kolor` is misspelt; did you mean `color`, `dolor`?'
    ])
  })

  await t.test(
    'should work w/ repeated calls to misspellings',
    async function () {
      const processor = retext().use(retextSpell, dictionaryEn)
      const fileA = await processor.process('kolor')
      assert.equal(fileA.messages.length, 1)

      const fileB = await processor.process('kolor')
      assert.equal(fileB.messages.length, 1)
    }
  )

  await t.test('should support `options.max`', async function () {
    const file = await retext()
      .use(retextSpell, {dictionary: dictionaryEn, max: 1})
      .process('Soem useles mispelt documeant')

    assert.deepEqual(file.messages.map(String), [
      '1:1-1:5: `Soem` is misspelt',
      '1:6-1:12: Too many misspellings; no further spell suggestions are given',
      '1:6-1:12: `useles` is misspelt',
      '1:13-1:20: `mispelt` is misspelt',
      '1:21-1:30: `documeant` is misspelt'
    ])
  })

  await t.test('should ignore literal words by default', async function () {
    const file = await retext()
      .use(retextSpell, {dictionary: dictionaryEn})
      .process('“kolor”')

    assert.deepEqual(file.messages.map(String), [])
  })

  await t.test(
    'should include literal words w/ `options.ignoreLiteral: false`',
    async function () {
      const file = await retext()
        .use(retextSpell, {dictionary: dictionaryEn, ignoreLiteral: false})
        .process('“kolor”')

      assert.deepEqual(file.messages.map(String), [
        '1:2-1:7: `kolor` is misspelt; did you mean `color`, `dolor`?'
      ])
    }
  )

  await t.test(
    'should warn for misspellings in hyphenated combination words',
    async function () {
      const file = await retext()
        .use(retextSpell, {dictionary: dictionaryEn, ignoreLiteral: false})
        .process('wrongely-spelled-word')

      assert.deepEqual(file.messages.map(String), [
        '1:1-1:22: `wrongely-spelled-word` is misspelt'
      ])
    }
  )

  await t.test(
    'should not warn for correct words in hyphenated combination words',
    async function () {
      const file = await retext()
        .use(retextSpell, {dictionary: dictionaryEn, ignoreLiteral: false})
        .process('random-hyphenated-word')

      assert.deepEqual(file.messages.map(String), [])
    }
  )

  await t.test('should support `options.ignore`', async function () {
    const file = await retext()
      .use(retextSpell, {
        dictionary: dictionaryEn,
        ignore: ['kolor', 'wrongely']
      })
      .process('kolor and wrongely-spelled-word')

    assert.deepEqual(file.messages.map(String), [])
  })

  await t.test('should ignore digits', async function () {
    const file = await retext()
      .use(retextSpell, {dictionary: dictionaryEn})
      .process('123456 alpha 3.14')

    assert.deepEqual(file.messages.map(String), [])
  })

  await t.test(
    'should include literal words w/ `options.ignoreDigits: false`',
    async function () {
      const file = await retext()
        .use(retextSpell, {dictionary: dictionaryEn, ignoreDigits: false})
        .process('123456 alpha 3.14')

      assert.deepEqual(file.messages.map(String), [
        '1:1-1:7: `123456` is misspelt; did you mean `12th456`, `12th3456`, `12th56`?',
        '1:14-1:18: `3.14` is misspelt; did you mean `3.14th`?'
      ])
    }
  )

  await t.test('should include words that contain digits', async function () {
    const file = await retext()
      .use(retextSpell, {dictionary: dictionaryEn})
      .process('768x1024')

    assert.deepEqual(file.messages.map(String), [
      '1:1-1:9: `768x1024` is misspelt; did you mean `76th8x1024`, `76thx1024`?'
    ])
  })

  await t.test('should ignore times', async function () {
    const file = await retext()
      .use(retextSpell, {dictionary: dictionaryEn})
      .process('Let’s meet at 2:41pm. On my way! ETA 11:50!')

    assert.deepEqual(file.messages.map(String), [])
  })

  await t.test('should support `options.personal`', async function () {
    const file = await retext()
      // Forbid US spelling, mark UK spelling as correct.
      .use(retextSpell, {
        dictionary: dictionaryEn,
        personal: '*color\ncolour\n'
      })
      .process('color coloor colour')

    assert.deepEqual(file.messages.map(String), [
      '1:1-1:6: `color` is misspelt; did you mean `dolor`, `colors`, `colon`, `colour`, `Colo`?',
      '1:7-1:13: `coloor` is misspelt; did you mean `colour`?'
    ])
  })

  await t.test('should integrate w/ `retext-emoji` (1)', async function () {
    const file = await retext()
      .use(retextSpell, {dictionary: dictionaryEn})
      .process('Pages ⚡️')

    assert.match(String(file.messages), /`️` is misspelt/)
  })

  await t.test('should integrate w/ `retext-emoji` (2)', async function () {
    const file = await retext()
      .use(retextEmoji)
      .use(retextSpell, {dictionary: dictionaryEn})
      .process('Pages ⚡️')

    assert.deepEqual(file.messages.map(String), [])
  })
})
