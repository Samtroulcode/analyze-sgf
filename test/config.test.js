const fs = require('fs');
const assert = require('assert');
const yaml = require('js-yaml');

const yamlpath = require.resolve('../src/analyze-sgf.yml');
const opts = yaml.load(fs.readFileSync(yamlpath));

describe('default config', () => {
  it('should define future readable comment options.', () => {
    assert.equal(opts.sgf.commentStyle, 'legacy');
    assert.equal(opts.sgf.language, 'en');
  });

  it('should define default classification options.', () => {
    assert.deepEqual(opts.classification, {
      enabled: true,
      bestMaxScoreLoss: 0.05,
      excellentMaxScoreLoss: 0.2,
      greatMaxScoreLoss: 0.6,
      goodMaxScoreLoss: 1.2,
      inaccuracyMaxScoreLoss: 4.0,
      mistakeMaxScoreLoss: 10.0,
    });
  });

  it('should define future summary options.', () => {
    assert.deepEqual(opts.summary, {
      enabled: true,
      maxKeyMoments: 5,
    });
  });
});
