var Builder = require('broccoli').Builder;
var OptimizeJs = require('./index');
var writeFile = require('broccoli-file-creator');
var fs = require('fs');
var assert = require('assert');

var input = writeFile('some/module.js', 'define("foo",["exports"], function (exports){});');
var optimize = new OptimizeJs(input, {
  sourceMap: true,
  compressorOptions: {
    negate_iife: false
  }
});
var builder = new Builder(optimize);

builder.build().then(function (result) {
  try {
    var actual = fs.readFileSync(result.directory + '/some/module.js', 'utf8');
    assert.equal(actual, '!(function(){})();');
  } finally {
    builder.cleanup();
  }
}).catch(function (e) {
  console.error(e.stack);
  process.exit(1);
});
