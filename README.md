# broccoli-optimize-js

JS optimizer for broccoli using

* [UglifyJS2](https://github.com/mishoo/UglifyJS2)
* [optimize-js](https://github.com/nolanlawson/optimize-js)

## Installation

```bash
npm install --save-dev broccoli-optimize-js
```

## Usage

```js
var optimizeJs = require('broccoli-optimize-js');
var concat = require('broccoli-concat');
var merge = require('broccoli-merge-trees');

var eagerOpt = optimizeJs(eagerSrc, {
  mangle: true,
  compress: true,
  sourceMap: true,
  eager: true
});

var lazyOpt = optimizeJs(lazySrc, {
  mangle: true,
  compress: true,
  sourceMap: true
});

var bundle = concat(merge([ lazyOpt, eagerOpt ]), {
  outputFile: '/bundle.js',
  inputFiles: ['**/*'],
  sourceMapConfig: {
    enabled: true
  },
});
```

### Options

The following options are supported:

* `eager` hint code for eager parsing
* `mangle` UglifyJS2 mangle
* `compress` UglifyJS2 compress options
* `output` UglifyJS2 codegen options

## Source Maps

Source maps are inlined, this makes caching easier, this is intended to be used
with `broccoli-concat` which will split out the source map again.
