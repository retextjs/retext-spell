# retext-spell [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

Check spelling with [**retext**][retext].

## Installation

[npm][]:

```bash
npm install retext-spell
```

## Usage

```js
var retext = require('retext');
var spell = require('retext-spell');
var dictionary = require('dictionary-en-gb');
var report = require('vfile-reporter');

retext()
  .use(spell, dictionary)
  .process('Some useles mispelt documeant.', function (err, file) {
    console.error(report(err || file));
  });
```

Yields:

```txt
   1:6-1:12  warning  `useles` is misspelt; did you mean `useless`?      retext-spell  retext-spell
  1:13-1:20  warning  `mispelt` is misspelt; did you mean `misspelt`?    retext-spell  retext-spell
  1:21-1:30  warning  `documeant` is misspelt; did you mean `document`?  retext-spell  retext-spell

⚠ 3 warnings
```

## API

### `retext().use(spell, options)`

> **retext-spell** is async; use [`process`][process], not `processSync`.

Adds warnings for misspelt words to processed [virtual
file][vfile]s.

###### Signatures

*   `retext().use(spell, dictionary)`
*   `retext().use(spell, options)`

###### `options`

`Object`:

*   `dictionary` ([`Function`][dictionaries])
    — Result of requiring one of the dictionaries in
    [`wooorm/dictionaries`][dictionaries]
*   `personal` (`string` or a `Buffer` in `utf8`, optional)
    — [Personal][] dictionary
*   `ignore` (`Array.<string>`, default `[]`)
    — List of words to ignore
*   `ignoreLiteral` (`boolean?`, default `true`)
    — Whether to ignore [literal words][literal]
*   `ignoreDigits` (`boolean?`, default `true`)
    — Whether to ignore “words” that contain only
    digits, such as `123456`
*   `normalizeApostrophes` (`boolean?`, default `true`)
    — Whether to swap smart apostrophes (`’`) with straight apostrophes (`'`)
    before checking spelling.  Most dictionaries do recognise straight
    apostrophes (`isn't`), but not smart apostrophes (`isn’t`).
*   `max` (`number?`, default `30`)
    — Number of unique words to suggest for.  By default, up to thirty
    words are suggested for.  Further misspellings are still warned about,
    but without suggestions

## Related

*   [`retext-contractions`](https://github.com/wooorm/retext-contractions)
    — Check apostrophe use in contractions
*   [`retext-diacritics`](https://github.com/wooorm/retext-diacritics)
    — Check for proper use of diacritics
*   [`retext-indefinite-article`](https://github.com/wooorm/retext-indefinite-article)
    — Check if indefinite articles (`a`, `an`) are used correctly
*   [`retext-redundant-acronyms`](https://github.com/wooorm/retext-redundant-acronyms)
    — Check for redundant acronyms (`ATM machine`)
*   [`retext-repeated-words`](https://github.com/wooorm/retext-repeated-words)
    — Check `for for` repeated words
*   [`retext-syntax-mentions`](https://github.com/wooorm/retext-syntax-mentions)
    — Classify @mentions as syntax

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/wooorm/retext-spell.svg

[travis]: https://travis-ci.org/wooorm/retext-spell

[codecov-badge]: https://img.shields.io/codecov/c/github/wooorm/retext-spell.svg

[codecov]: https://codecov.io/github/wooorm/retext-spell

[npm]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[retext]: https://github.com/wooorm/retext

[process]: https://github.com/unifiedjs/unified#processorprocessfilevalue-done

[vfile]: https://github.com/vfile/vfile

[dictionaries]: https://github.com/wooorm/dictionaries

[literal]: https://github.com/syntax-tree/nlcst-is-literal#isliteralparent-index

[personal]: https://github.com/wooorm/nspell#personal-dictionary-documents
