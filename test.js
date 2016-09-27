var Builder = require('broccoli').Builder;
var OptimizeJs = require('./index');
var writeFile = require('broccoli-file-creator');
var fs = require('fs');
var assert = require('assert');

var builder = new Builder(
  new OptimizeJs(writeFile('negate-iife.js', '!function(){}();'))
);

builder.build().then(function (result) {
  try {
    var actual = fs.readFileSync(result.directory + '/negate-iife.js', 'utf8');
    assert.equal(actual, '!(function(){})();');
  } finally {
    builder.cleanup();
  }
}).catch(function (e) {
  console.error(e.stack);
  process.exit(1);
});
