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
    *   [`Dictionary`](#dictionary)
    *   [`Options`](#options)
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
In Node.js (version 16+), install with [npm][]:

```sh
npm install retext-spell
```

In Deno with [`esm.sh`][esmsh]:

```js
import retextSpell from 'https://esm.sh/retext-spell@6'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import retextSpell from 'https://esm.sh/retext-spell@6?bundle'
</script>
```

## Use

```js
import dictionaryEn from 'dictionary-en'
import {retext} from 'retext'
import retextSpell from 'retext-spell'
import {reporter} from 'vfile-reporter'

const file = await retext()
  .use(retextSpell, {dictionary: dictionaryEn})
  .process('Some useles documeant.')

console.error(reporter(file))
```

Yields:

```txt
1:6-1:12  warning Unexpected unknown word `useles`, expected for example `useless`     useles    retext-spell
1:13-1:22 warning Unexpected unknown word `documeant`, expected for example `document` documeant retext-spell

⚠ 2 warnings
```

## API

This package exports no identifiers.
The default export is [`retextSpell`][api-retext-spell].

### `unified().use(retextSpell, options)`

Check spelling.

###### Parameters

*   `options` ([`Options`][api-options], **required**)
    — configuration

###### Returns

Transform ([`Transformer`][unified-transformer]).

### `Dictionary`

Dictionary function (TypeScript type).

###### Type

```ts
type Dictionary = (onload: OnLoad) => undefined | void

type OnLoad = (error: Error | undefined, result?: unknown) => undefined | void
```

### `Options`

Configuration (TypeScript type).

###### Fields

*   `dictionary` ([`Dictionary`][api-dictionary], **required**)
    — dictionary function;
    result of importing one of the dictionaries in
    [`wooorm/dictionaries`][dictionaries]
*   `ignore` (`Array<string>`, optional)
    — list of words to ignore
*   `ignoreLiteral` (`boolean`, default: `true`)
    — whether to ignore [literal words][nlcst-is-literal]
*   `ignoreDigits` (`boolean`, default: `true`)
    — whether to ignore “words” that contain digits or times such as `123456`
    or `2:41pm`
*   `max` (`number`, default: `30`)
    — number of times to suggest;
    further misspellings do not get suggestions
*   `normalizeApostrophes` (`boolean`, default: `true`)
    — normalize smart apostrophes (`’`) as straight (`'`) apostrophes;
    dictionaries sometimes don’t support smart apostrophes
*   `personal` (`Buffer` in UTF-8 or `string`, optional)
    — [personal][nspell-personal] dictionary to use

## Messages

Each message is emitted as a [`VFileMessage`][vfile-message] on `file`, with
`source` set to `'retext-spell'`, `ruleId` to the normalized unknown word,
`actual` to the unknown word, and `expected` to an array with suggestions.

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Dictionary`][api-dictionary] and
[`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `retext-spell@^6`,
compatible with Node.js 16.

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

[size-badge]: https://img.shields.io/bundlejs/size/retext-spell

[size]: https://bundlejs.com/?q=retext-spell

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/retextjs/retext/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[health]: https://github.com/retextjs/.github

[contributing]: https://github.com/retextjs/.github/blob/main/contributing.md

[support]: https://github.com/retextjs/.github/blob/main/support.md

[coc]: https://github.com/retextjs/.github/blob/main/code-of-conduct.md

[license]: license

[author]: https://wooorm.com

[dictionaries]: https://github.com/wooorm/dictionaries

[nlcst-is-literal]: https://github.com/syntax-tree/nlcst-is-literal

[nspell]: https://github.com/wooorm/nspell

[nspell-personal]: https://github.com/wooorm/nspell#personal-dictionary-documents

[retext]: https://github.com/retextjs/retext

[unified]: https://github.com/unifiedjs/unified

[unified-transformer]: https://github.com/unifiedjs/unified#transformer

[vfile-message]: https://github.com/vfile/vfile-message

[api-dictionary]: #dictionary

[api-options]: #options

[api-retext-spell]: #unifieduseretextspell-options
