# retext-spell

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[retext][]** plugin to check spelling.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`unified().use(retextSpell, options)`](#unifieduseretextspell-options)
*   [Messages](#messages)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a [unified][] ([retext][]) plugin to check spelling with
[`nspell`][nspell] and a [dictionary][dictionaries].

## When should I use this?

You can opt-into this plugin when you’re dealing with content that might contain
spelling mistakes, and have authors that can fix that content.

## Install

This package is [ESM only][esm].
In Node.js (version 12.20+, 14.14+, 16.0+, or 18.0+), install with [npm][]:

```sh
npm install retext-spell
```

## Use

```js
import {reporter} from 'vfile-reporter'
import {retext} from 'retext'
import retextSpell from 'retext-spell'
import dictionary from 'dictionary-en-gb'

const file = await retext()
  .use(retextSpell, dictionary)
  .process('Some useles documeant.')

console.error(reporter(file))
```

Yields:

```txt
   1:6-1:12  warning  `useles` is misspelt; did you mean `useless`?      useles     retext-spell
  1:13-1:22  warning  `documeant` is misspelt; did you mean `document`?  documeant  retext-spell

⚠ 2 warnings
```

## API

This package exports no identifiers.
The default export is `retextSpell`.

### `unified().use(retextSpell, options)`

Check spelling (with [`nspell`][nspell]).

> ⚠️ **Important**: `retext-spell` is async.
> You must use [`process`][process] instead of `processSync`.

##### Signatures

*   `retext().use(spell, dictionary)`
*   `retext().use(spell, options)`

##### `options`

Configuration (optional).

###### `options.dictionary`

A dictionary ([`Function`][dictionaries]).
Result of importing one of the dictionaries in
[`wooorm/dictionaries`][dictionaries].

###### `options.personal`

[Personal][] dictionary (`string` or a `Buffer` in UTF-8, optional).

###### `options.ignore`

List of words to ignore (`Array<string>`, default `[]`).

###### `options.ignoreLiteral`

Whether to ignore [literal words][literal] (`boolean?`, default `true`).

###### `options.ignoreDigits`

Whether to ignore “words” that contain only digits or times, such as
`123456` or `2:41pm` (`boolean?`, default `true`).

###### `options.normalizeApostrophes`

Deal with apostrophes (`boolean?`, default `true`).
Whether to swap smart apostrophes (`’`) with straight apostrophes (`'`) before
checking spelling.
Dictionaries typically support this, but this option can be used if not.

###### `options.max`

Number of unique words to suggest for (`number?`, default `30`).
By default, up to thirty words are suggested for.
Further misspellings are still warned about, but without suggestions.
Increasing this number significantly impacts performance.

## Messages

Each message is emitted as a [`VFileMessage`][vfile-message] on `file`, with
the following fields:

###### `message.source`

Name of this plugin (`'retext-spell'`).

###### `message.ruleId`

Normalized not ok word (`string`, such as `'useles'`).

###### `message.actual`

Current not ok word (`string`, such as `'Useles'`).

###### `message.expected`

List of suggestions of words to use (`Array<string>`, such as `['Useless']`).

## Types

This package is fully typed with [TypeScript][].
It exports the additional types `Options` and `Dictionary`.

## Compatibility

Projects maintained by the unified collective are compatible with all maintained
versions of Node.js.
As of now, that is Node.js 12.20+, 14.14+, 16.0+, and 18.0+.
Our projects sometimes work with older versions, but this is not guaranteed.

## Related

*   [`retext-contractions`](https://github.com/retextjs/retext-contractions)
    — check apostrophe use in contractions
*   [`retext-diacritics`](https://github.com/retextjs/retext-diacritics)
    — check for proper use of diacritics
*   [`retext-indefinite-article`](https://github.com/retextjs/retext-indefinite-article)
    — check if indefinite articles (`a`, `an`) are used correctly
*   [`retext-redundant-acronyms`](https://github.com/retextjs/retext-redundant-acronyms)
    — check for redundant acronyms (`ATM machine`)
*   [`retext-repeated-words`](https://github.com/retextjs/retext-repeated-words)
    — check `for for` repeated words
*   [`retext-emoji`](https://github.com/retextjs/retext-emoji)
    — classify emoji, gemoji, emoticons
*   [`retext-syntax-mentions`](https://github.com/retextjs/retext-syntax-mentions)
    — classify [**@mentions**](https://github.com/blog/821) as syntax
*   [`retext-syntax-urls`](https://github.com/retextjs/retext-syntax-urls)
    — classify URLs and filepaths as syntax

## Contribute

See [`contributing.md`][contributing] in [`retextjs/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/retextjs/retext-spell/workflows/main/badge.svg

[build]: https://github.com/retextjs/retext-spell/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/retextjs/retext-spell.svg

[coverage]: https://codecov.io/github/retextjs/retext-spell

[downloads-badge]: https://img.shields.io/npm/dm/retext-spell.svg

[downloads]: https://www.npmjs.com/package/retext-spell

[size-badge]: https://img.shields.io/bundlephobia/minzip/retext-spell.svg

[size]: https://bundlephobia.com/result?p=retext-spell

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/retextjs/retext/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[typescript]: https://www.typescriptlang.org

[health]: https://github.com/retextjs/.github

[contributing]: https://github.com/retextjs/.github/blob/main/contributing.md

[support]: https://github.com/retextjs/.github/blob/main/support.md

[coc]: https://github.com/retextjs/.github/blob/main/code-of-conduct.md

[license]: license

[author]: https://wooorm.com

[unified]: https://github.com/unifiedjs/unified

[retext]: https://github.com/retextjs/retext

[vfile-message]: https://github.com/vfile/vfile-message

[literal]: https://github.com/syntax-tree/nlcst-is-literal#isliteralparent-index

[process]: https://github.com/unifiedjs/unified#processorprocessfilevalue-done

[dictionaries]: https://github.com/wooorm/dictionaries

[nspell]: https://github.com/wooorm/nspell

[personal]: https://github.com/wooorm/nspell#personal-dictionary-documents
