var Builder = require('broccoli').Builder;
var optimizeJs = require('./index');
var writeFile = require('broccoli-file-creator');
var fs = require('fs');
var assert = require('assert');

var input = writeFile('some/module.js', 'define("foo",["exports"], function (exports){});');
var optimize = optimizeJs(input, {
  sourceMap: true,
  eager: true,
  compress: true,
  mangle: true
});

var builder = new Builder(optimize);
builder.build().then(function (result) {
  try {
    var actual = fs.readFileSync(result.directory + '/some/module.js', 'utf8');
    assert.equal(actual, 'define(\"foo\",[\"exports\"],(function(o){}));\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzLm1pbi5vcHQiLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJkZWZpbmUoXCJmb29cIixbXCJleHBvcnRzXCJdLCBmdW5jdGlvbiAoZXhwb3J0cyl7fSk7Il0sIm5hbWVzIjpbImRlZmluZSJdLCJtYXBwaW5ncyI6IkFBQUFBLHlCQUEwQixDQUFBLGFBQTFCQSxDQUFBQSJ9');
  } finally {
    builder.cleanup();
  }
}).catch(function (e) {
  console.error(e.stack);
  process.exit(1);
});
