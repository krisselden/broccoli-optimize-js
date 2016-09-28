import Filter from 'broccoli-persistent-filter';
import optimizeJs from 'optimize-js';
import stringify from 'json-stable-stringify';
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
    this._optionsHash = null;
    this._annotation = options.annotation;
    this.sourceMap = !!options.sourceMap;
    this.compressorOptions = options.compressorOptions;
    this.options = options;
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
    let original = { code, file: basename(file) };
    let minified;
    let optimized;
    if (this.compressorOptions) {
      minified = this.minify(original);
      optimized = this.optimize(minified);
    } else {
      optimized = this.optimize(original);
    }

    if (this.sourceMap) {
      return this.processMap({
        original,
        minified,
        optimized
      });
    }
    return optimized.code;
  }

  minify(source) {
    let UglifyJS = require('uglify-js');
    let ast = UglifyJS.parse(source.code, { filename: source.file });
    ast.figure_out_scope();

    let compressor = UglifyJS.Compressor(this.compressorOptions);
    let compressed_ast = ast.transform(compressor);

    compressed_ast.figure_out_scope();
    compressed_ast.compute_char_frequency();
    compressed_ast.mangle_names();

    let file = source.file + '.min';
    let source_map = UglifyJS.SourceMap();
    var stream = UglifyJS.OutputStream({
        source_map: source_map
    });
    compressed_ast.print(stream);
    let code = stream.toString(); // this is your minified code
    let map = source_map.get().toJSON();
    return { code, file, map };
  }

  optimize(source) {
    let sourceMap = this.sourceMap;
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
    if (!optimized.map) {
      return optimized.code;
    }

    if (!minified.map) {
      return optimized.code + toURL(optimized.map);
    }

    let sorcery = require('sorcery');
    let chain = sorcery.loadSync(optimized.file, {
      content: {
        [original.file]: original.code,
        [minified.file]: minified.code,
        [optimized.file]: optimized.code
      },
      sourcemaps: {
        [minified.file]: minified.map,
        [optimized.file]: optimized.map
      }
    });
    let map = chain.apply({ includeContent: true });
    return optimized.code + map.toUrl();
  }
}

function toURL(map) {
  return SOURCE_MAPPING_TOKEN + 'data:application/json;charset=utf-8;base64,' +
    new Buffer(JSON.stringify(map), 'utf8').toString('base64');
}

function parseSourceMap(dataURL) {
  let index = dataURL.indexOf(BASE64_TOKEN);
  let base64 = dataURL.slice(index + BASE64_TOKEN_LEN);
  return JSON.parse(new Buffer(base64, 'base64').toString('utf8'));
}
