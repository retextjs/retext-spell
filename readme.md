# retext-spell [![Build Status](https://img.shields.io/travis/wooorm/retext-spell.svg)](https://travis-ci.org/wooorm/retext-spell) [![Coverage Status](https://img.shields.io/codecov/c/github/wooorm/retext-spell.svg)](https://codecov.io/github/wooorm/retext-spell)

Spelling checker for [retext](https://github.com/wooorm/retext).

## Installation

[npm](https://docs.npmjs.com/cli/install):

```bash
npm install retext-spell
```

## Usage

```js
var retext = require('retext');
var spell = require('retext-spell');
var dictionary = require('dictionary-en-gb');
var report = require('vfile-reporter');
var doc = 'Some useles mispelt documeant.';

retext().use(spell, dictionary).process(doc, function (err, file) {
    if (err) throw err;
    console.log(report(file));
});
```

Yields:

```txt
<stdin>
   1:6-1:12  warning  useles is misspelled                                    spelling
  1:13-1:20  warning  mispelt is misspelled                                   spelling
  1:21-1:30  warning  documeant is misspelled                                 spelling

⚠ 3 warnings
```

## API

### [retext](https://github.com/wooorm/retext#api).[use](https://github.com/wooorm/retext#retextuseplugin-options)(spell, options)

> **retext-spell** is async; use the async form of
> [`retext.process`](https://github.com/wooorm/retext#retextprocessvalue-done).

Adds warnings for misspelt words to processed [virtual
file](https://github.com/wooorm/vfile)s.

**Signatures**

*   `use(plugin, dictionary)`;
*   `use(plugin, options)`.

**Parameters**

*   `spell` — This plug-in.

*   `dictionary` ([`Function`](https://github.com/wooorm/dictionaries))
    — The result of requiring one of the dictionaries in
    [`wooorm/dictionaries`](https://github.com/wooorm/dictionaries);

*   `options` (`Object`):

    *   `dictionary` — See above;

    *   `ignore` (`array?`, default `null`) — List of words to ignore.

    *   `ignoreLiteral` (`boolean?`, default `true`)
        — Whether to ignore [literal words](https://github.com/wooorm/nlcst-is-literal#isliteralparent-index).

## License

[MIT](LICENSE) © [Titus Wormer](http://wooorm.com)
