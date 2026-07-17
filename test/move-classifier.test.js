/* eslint max-lines: ["error", 220], max-lines-per-function: ["error", 220] */

const assert = require('assert');

const { classifyMove, DEFAULT_OPTIONS } = require('../src/move-classifier');

describe('classifyMove', () => {
  const classify = (scoreDrop, rawChoiceRank, options) =>
    classifyMove({ scoreDrop, rawChoiceRank }, options);

  it('should classify each category.', () => {
    assert.equal(classify(0, 0).category, 'best');
    assert.equal(classify(0, 1).category, 'excellent');
    assert.equal(classify(0.3, 1).category, 'great');
    assert.equal(classify(0.9, 1).category, 'good');
    assert.equal(classify(2, 1).category, 'inaccuracy');
    assert.equal(classify(7, 1).category, 'mistake');
    assert.equal(classify(11, 1).category, 'blunder');
  });

  it('should classify exact category boundaries.', () => {
    assert.equal(classify(0.05, 0).category, 'best');
    assert.equal(classify(0.2, 1).category, 'excellent');
    assert.equal(classify(0.6, 1).category, 'great');
    assert.equal(classify(1.2, 1).category, 'good');
    assert.equal(classify(4, 1).category, 'inaccuracy');
    assert.equal(classify(10, 1).category, 'mistake');
  });

  it('should classify just before category boundaries.', () => {
    assert.equal(classify(0.049, 0).category, 'best');
    assert.equal(classify(0.199, 1).category, 'excellent');
    assert.equal(classify(0.599, 1).category, 'great');
    assert.equal(classify(1.199, 1).category, 'good');
    assert.equal(classify(3.999, 1).category, 'inaccuracy');
    assert.equal(classify(9.999, 1).category, 'mistake');
  });

  it('should classify just after category boundaries.', () => {
    assert.equal(classify(0.051, 1).category, 'excellent');
    assert.equal(classify(0.201, 1).category, 'great');
    assert.equal(classify(0.601, 1).category, 'good');
    assert.equal(classify(1.201, 1).category, 'inaccuracy');
    assert.equal(classify(4.001, 1).category, 'mistake');
    assert.equal(classify(10.001, 1).category, 'blunder');
  });

  it('should normalize negative scoreDrop to zero loss.', () => {
    assert.deepEqual(classify(-3, 0), {
      category: 'best',
      scoreLoss: 0,
      winrateLoss: 0,
      scoreCategory: 'best',
      winrateCategory: 'best',
      severity: 0,
      isTopChoice: true,
    });
  });

  it('should classify zero loss for non-top choice as excellent.', () => {
    assert.deepEqual(classify(0, 1), {
      category: 'excellent',
      scoreLoss: 0,
      winrateLoss: null,
      scoreCategory: 'excellent',
      winrateCategory: null,
      severity: 1,
      isTopChoice: false,
    });
  });

  it('should use the most severe score or winrate category.', () => {
    assert.deepEqual(
      classifyMove({ scoreDrop: 1, winrateDrop: 20, rawChoiceRank: 2 }),
      {
        category: 'mistake',
        scoreLoss: 1,
        winrateLoss: 20,
        scoreCategory: 'good',
        winrateCategory: 'mistake',
        severity: 5,
        isTopChoice: false,
      },
    );
  });

  it('should mark low-impact score losses as missed opportunity.', () => {
    assert.deepEqual(
      classifyMove({ scoreDrop: 7, winrateDrop: 2, rawChoiceRank: 2 }),
      {
        category: 'missedOpportunity',
        scoreLoss: 7,
        winrateLoss: 2,
        scoreCategory: 'mistake',
        winrateCategory: 'great',
        severity: 4,
        isTopChoice: false,
      },
    );
  });

  it('should keep top choice as best despite winrate noise.', () => {
    assert.deepEqual(
      classifyMove({ scoreDrop: 0, winrateDrop: 20, rawChoiceRank: 0 }),
      {
        category: 'best',
        scoreLoss: 0,
        winrateLoss: 0,
        scoreCategory: 'best',
        winrateCategory: 'best',
        severity: 0,
        isTopChoice: true,
      },
    );
  });

  it('should return null classification for invalid scoreDrop.', () => {
    [undefined, null, NaN, Infinity, '1'].forEach((scoreDrop) => {
      assert.deepEqual(classify(scoreDrop, 0), {
        category: null,
        scoreLoss: null,
        winrateLoss: null,
        scoreCategory: null,
        winrateCategory: null,
        severity: null,
        isTopChoice: true,
      });
    });
  });

  it('should detect top choice only from rawChoiceRank zero.', () => {
    assert.equal(classify(0.04, 0).category, 'best');
    assert.equal(classify(0.05, 0).category, 'best');
    assert.equal(classify(0.051, 0).category, 'best');
    assert.equal(classify(0, -1).isTopChoice, false);
    assert.equal(classify(0).isTopChoice, false);
  });

  it('should accept partial options.', () => {
    assert.equal(
      classify(0.08, 0, { bestMaxScoreLoss: 0.1 }).category,
      'best',
    );
    assert.equal(classify(0.3, 1, { goodMaxScoreLoss: 2 }).category, 'great');
  });

  it('should accept custom thresholds.', () => {
    const options = {
      bestMaxScoreLoss: 1,
      excellentMaxScoreLoss: 2,
      greatMaxScoreLoss: 3,
      goodMaxScoreLoss: 4,
      inaccuracyMaxScoreLoss: 5,
      mistakeMaxScoreLoss: 6,
    };

    assert.equal(classify(1, 0, options).category, 'best');
    assert.equal(classify(1, 1, options).category, 'excellent');
    assert.equal(classify(2.5, 1, options).category, 'great');
    assert.equal(classify(3.5, 1, options).category, 'good');
    assert.equal(classify(4.5, 1, options).category, 'inaccuracy');
    assert.equal(classify(5.5, 1, options).category, 'mistake');
    assert.equal(classify(6.5, 1, options).category, 'blunder');
  });

  it('should reject invalid thresholds.', () => {
    const invalids = [
      { excellentMaxScoreLoss: DEFAULT_OPTIONS.bestMaxScoreLoss },
      { excellentMaxScoreLoss: 0.01 },
      { bestMaxScoreLoss: -1 },
      { bestMaxScoreLoss: '0.1' },
      { bestMaxScoreLoss: Infinity },
    ];

    invalids.forEach((options) => {
      assert.throws(
        () => classify(0, 0, options),
        /Invalid classification threshold|strictly increasing/,
      );
    });
  });

  it('should not mutate inputs.', () => {
    const move = { scoreDrop: 0.7, rawChoiceRank: 3 };
    const options = { goodMaxScoreLoss: 2 };

    classifyMove(move, options);

    assert.deepEqual(move, { scoreDrop: 0.7, rawChoiceRank: 3 });
    assert.deepEqual(options, { goodMaxScoreLoss: 2 });
  });

  it('should be deterministic across multiple calls.', () => {
    const move = { scoreDrop: 5.42, rawChoiceRank: 4 };
    const options = { mistakeMaxScoreLoss: 8 };

    assert.deepEqual(
      classifyMove(move, options),
      classifyMove(move, options),
    );
  });
});
