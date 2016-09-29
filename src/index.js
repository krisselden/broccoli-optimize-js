import Filter from 'broccoli-persistent-filter';
import optimizeJs from 'optimize-js';
import stringify from 'json-stable-stringify';
import assign from 'lodash.assign';
import { basename } from 'path';
import { createHash } from 'crypto';

const SOURCE_MAPPING_TOKEN = '//# sourceMap' + 'pingURL=';
const SOURCE_MAPPING_TOKEN_LEN = SOURCE_MAPPING_TOKEN.length;
const BASE64_TOKEN = 'base64,';
const BASE64_TOKEN_LEN = BASE64_TOKEN.length;

export default class OptimizeJs extends Filter {
  constructor(inputNode, _options) {
    super(inputNode, {
      persist: true
    });

    let options = _options || {};

    // Filter doesn't pass this to Plugin
    this._annotation = options.annotation;

    let sourceMap = !!options.sourceMap;
    let mangle = !!options.mangle;
    let compress = options.compress;
    let output = options.output;
    let eager = !!options.eager;

    if (compress) {
      // negate_iife causes IIFE to be not to
      // be recognized as eager in Chrome and while
      // this is fixed by optimize-js but it will
      // also make define() eager as well and is not
      // configurable at the moment
      compress = assign({}, compress, {
        negate_iife: false
      });
    }

    this._optionsHash = null;
    this.options = { sourceMap, mangle, compress, output, eager };

    if (!mangle && !compress && !eager) {
      // TODO heimdall logger
      console.warn('nothing to do, all optimizations disabled');
      this.canProcessFile = () => false;
    }
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

  processString(code, file) {
    let { sourceMap, mangle, compress, eager } = this.options;
    let original = { code, file: basename(file) };
    let minified;
    let optimized;

    if (mangle || compress) {
      minified = this.minify(original);
    }

    if (eager) {
      optimized = this.optimize(minified || original);
    }

    if (sourceMap) {
      return this.processMap({
        original,
        minified,
        optimized
      });
    }

    if (optimized) {
      return optimized.code;
    }

    return minified.code;
  }

  minify(source) {
    let UglifyJS = require('uglify-js');
    let { sourceMap, mangle, compress, output } = this.options;

    let ast = UglifyJS.parse(source.code, { filename: source.file });
    ast.figure_out_scope();

    if (compress) {
      let compressor = UglifyJS.Compressor(compress);
      ast = ast.transform(compressor);
    }

    if (mangle) {
      ast.figure_out_scope();
      ast.compute_char_frequency();
      ast.mangle_names();
    }

    let file = source.file + '.min';
    if (sourceMap) {
      output = assign({}, output, {
        source_map: UglifyJS.SourceMap()
      });
    }

    let stream = UglifyJS.OutputStream(output);
    ast.print(stream);

    let code = stream.toString();
    let map;
    if (sourceMap) {
      map = output.source_map.get().toJSON();
      map.sources[0] = source.file;
      map.sourcesContent = [ source.code ];
    }

    return { code, file, map };
  }

  optimize(source) {
    let { sourceMap } = this.options;
    let code = optimizeJs( source.code, { sourceMap } );
    let file = source.file + '.opt';
    let map;
    if (sourceMap) {
      let index = code.lastIndexOf(SOURCE_MAPPING_TOKEN);
      if (index !== -1) {
        map = parseSourceMap(code.slice(index + SOURCE_MAPPING_TOKEN_LEN));
        map.sources[0] = source.file;
        map.sourcesContent[0] = source.code;
        code = code.slice(0, index);
      }
    }
    return { code, file, map };
  }

  processMap({original, minified, optimized}) {
    let sorcery = require('sorcery');

    let generated;
    let content = Object.create(null);
    let sourcemaps = Object.create(null);
    content[original.file] = original.code;

    if (minified) {
      generated = minified;
      content[minified.file] = minified.code;
      sourcemaps[minified.file] = minified.map;
    }

    if (optimized) {
      generated = optimized;
      content[optimized.file] = optimized.code;
      sourcemaps[optimized.file] = optimized.map;
    }

    let chain = sorcery.loadSync(generated.file, { content, sourcemaps });
    let map = chain.apply({ includeContent: true });

    return generated.code + map.toUrl();
  }
}

function parseSourceMap(dataURL) {
  let index = dataURL.indexOf(BASE64_TOKEN);
  let base64 = dataURL.slice(index + BASE64_TOKEN_LEN);
  return JSON.parse(new Buffer(base64, 'base64').toString('utf8'));
}
