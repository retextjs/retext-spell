# retext-spell [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Chat][chat-badge]][chat]

Check spelling with [**retext**][retext], based on [`nspell`][nspell].

## Installation

[npm][]:

```bash
npm install retext-spell
```

## Usage

```js
var retext = require('retext')
var spell = require('retext-spell')
var dictionary = require('dictionary-en-gb')
var report = require('vfile-reporter')

retext()
  .use(spell, dictionary)
  .process('Some useles documeant.', function(err, file) {
    console.error(report(err || file))
  })
```

Yields:

```txt
   1:6-1:12  warning  `useles` is misspelt; did you mean `useless`?      retext-spell  retext-spell
  1:13-1:22  warning  `documeant` is misspelt; did you mean `document`?  retext-spell  retext-spell

⚠ 2 warnings
```

## API

### `retext().use(spell, options)`

> **retext-spell** is async; use [`process`][process], not `processSync`.

Adds warnings for misspelt words to processed [virtual
file][vfile]s.

##### Signatures

*   `retext().use(spell, dictionary)`
*   `retext().use(spell, options)`

##### `options`

Optional object.

###### `options.dictionary`

A dictionary ([`Function`][dictionaries]).  Result of requiring one of the
dictionaries in [`wooorm/dictionaries`][dictionaries].

###### `options.personal`

[Personal][] dictionary (`string` or a `Buffer` in `utf8`, optional).

###### `options.ignore`

List of words to ignore (`Array.<string>`, default `[]`).

###### `options.ignoreLiteral`

Whether to ignore [literal words][literal] (`boolean?`, default `true`).

###### `options.ignoreDigits`

Whether to ignore “words” that contain only digits, such as `123456`
(`boolean?`, default `true`).

###### `options.normalizeApostrophes`

Deal with apostrophes (`boolean?`, default `true`).  Whether to swap smart
apostrophes (`’`) with straight apostrophes (`'`) before checking spelling.
Most dictionaries do recognise straight apostrophes (`isn't`), but not smart
apostrophes (`isn’t`).

###### `options.max`

Number of unique words to suggest for (`number?`, default `30`).  By default,
up to thirty words are suggested for.  Further misspellings are still warned
about, but without suggestions

## Related

*   [`retext-contractions`](https://github.com/retextjs/retext-contractions)
    — Check apostrophe use in contractions
*   [`retext-diacritics`](https://github.com/retextjs/retext-diacritics)
    — Check for proper use of diacritics
*   [`retext-indefinite-article`](https://github.com/retextjs/retext-indefinite-article)
    — Check if indefinite articles (`a`, `an`) are used correctly
*   [`retext-redundant-acronyms`](https://github.com/retextjs/retext-redundant-acronyms)
    — Check for redundant acronyms (`ATM machine`)
*   [`retext-repeated-words`](https://github.com/retextjs/retext-repeated-words)
    — Check `for for` repeated words
*   [`retext-syntax-mentions`](https://github.com/retextjs/retext-syntax-mentions)
    — Classify [**@mentions**](https://github.com/blog/821) as syntax
*   [`retext-syntax-urls`](https://github.com/retextjs/retext-syntax-urls)
    — Classify URLs and filepaths as syntax

## Contribute

See [`contributing.md` in `retextjs/retext`][contributing] for ways to get
started.

This organisation has a [Code of Conduct][coc].  By interacting with this
repository, organisation, or community you agree to abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/retextjs/retext-spell.svg

[build]: https://travis-ci.org/retextjs/retext-spell

[coverage-badge]: https://img.shields.io/codecov/c/github/retextjs/retext-spell.svg

[coverage]: https://codecov.io/github/retextjs/retext-spell

[downloads-badge]: https://img.shields.io/npm/dm/retext-spell.svg

[downloads]: https://www.npmjs.com/package/retext-spell

[chat-badge]: https://img.shields.io/badge/join%20the%20community-on%20spectrum-7b16ff.svg

[chat]: https://spectrum.chat/unified/retext

[npm]: https://docs.npmjs.com/cli/install

[license]: license

[author]: https://wooorm.com

[retext]: https://github.com/retextjs/retext

[process]: https://github.com/unifiedjs/unified#processorprocessfilevalue-done

[vfile]: https://github.com/vfile/vfile

[dictionaries]: https://github.com/wooorm/dictionaries

[nspell]: https://github.com/wooorm/nspell

[literal]: https://github.com/syntax-tree/nlcst-is-literal#isliteralparent-index

[personal]: https://github.com/wooorm/nspell#personal-dictionary-documents

[contributing]: https://github.com/retextjs/retext/blob/master/contributing.md

[coc]: https://github.com/retextjs/retext/blob/master/code-of-conduct.md
