/**
 * @fileOverview Pure move classification helpers.
 */

const DEFAULT_OPTIONS = Object.freeze({
  bestMaxScoreLoss: 0.05,
  excellentMaxScoreLoss: 0.2,
  greatMaxScoreLoss: 0.6,
  goodMaxScoreLoss: 1.2,
  inaccuracyMaxScoreLoss: 4.0,
  mistakeMaxScoreLoss: 10.0,
});

const THRESHOLDS = [
  'bestMaxScoreLoss',
  'excellentMaxScoreLoss',
  'greatMaxScoreLoss',
  'goodMaxScoreLoss',
  'inaccuracyMaxScoreLoss',
  'mistakeMaxScoreLoss',
];

const SEVERITY = Object.freeze({
  best: 0,
  excellent: 1,
  great: 2,
  good: 3,
  inaccuracy: 4,
  mistake: 5,
  blunder: 6,
});

function classifyMove(move, options) {
  const opts = validateOptions({ ...DEFAULT_OPTIONS, ...options });
  const isTopChoice = move && move.rawChoiceRank === 0;

  if (!isFiniteNumber(move && move.scoreDrop)) {
    return {
      category: null,
      scoreLoss: null,
      severity: null,
      isTopChoice,
    };
  }

  const scoreLoss = Math.max(0, move.scoreDrop);
  const category = categoryFromScoreLoss(scoreLoss, isTopChoice, opts);

  return {
    category,
    scoreLoss,
    severity: SEVERITY[category],
    isTopChoice,
  };
}

function categoryFromScoreLoss(scoreLoss, isTopChoice, opts) {
  if (isTopChoice && scoreLoss <= opts.bestMaxScoreLoss) return 'best';
  if (scoreLoss <= opts.excellentMaxScoreLoss) return 'excellent';
  if (scoreLoss <= opts.greatMaxScoreLoss) return 'great';
  if (scoreLoss <= opts.goodMaxScoreLoss) return 'good';
  if (scoreLoss <= opts.inaccuracyMaxScoreLoss) return 'inaccuracy';
  if (scoreLoss <= opts.mistakeMaxScoreLoss) return 'mistake';
  return 'blunder';
}

function validateOptions(options) {
  THRESHOLDS.forEach((key) => {
    if (!isFiniteNumber(options[key]) || options[key] < 0) {
      throw Error(`Invalid classification threshold: ${key}`);
    }
  });

  THRESHOLDS.slice(1).forEach((key, index) => {
    if (options[key] <= options[THRESHOLDS[index]]) {
      throw Error('Classification thresholds must be strictly increasing');
    }
  });

  return options;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

module.exports = {
  classifyMove,
  DEFAULT_OPTIONS,
};
