import Filter from 'broccoli-persistent-filter';
import optimizeJs from 'optimize-js';
import stringify from 'json-stable-stringify';
import { createHash } from 'crypto';

export default class OptimizeJs extends Filter {
  constructor(inputNode, options) {
    super(inputNode, {
      persist: true
    });
    // Filter doesn't pass this to Plugin
    this._annotation = options && options.annotation;
    this._optionsHash = null;
    this.options = options && options.optimizejs || {};
  }

  baseDir() {
    return __dirname;
  }

  optionsHash() {
    if (!this._optionsHash) {
      this._optionsHash = createHash('md5').update(stringify(this.options), 'utf8').digest('hex');
    }
    return this._optionsHash;
  }

  cacheKeyProcessString(string, relativePath) {
    let key = super.cacheKeyProcessString(string, relativePath);
    return this.optionsHash() + key;
  }

  processString(string) {
    return optimizeJs(string, this.options);
  }
}
