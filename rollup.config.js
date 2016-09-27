var buble = require('rollup-plugin-buble');
var pkg = require('./package.json');
var external = Object.keys(pkg.dependencies);

module.exports = {
  entry: 'src/index.js',
  plugins: [buble()],
  sourceMap: true,
  external: external.concat('crypto'),
  dest: pkg['main'],
  format: 'cjs'
};
