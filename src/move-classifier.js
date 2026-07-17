/**
 * @fileOverview Pure move classification helpers.
 */

/* eslint max-lines: ["error", 200] */

const DEFAULT_OPTIONS = Object.freeze({
  profile: 'ogs',
  bestMaxScoreLoss: 0.05,
  excellentMaxScoreLoss: 0.2,
  greatMaxScoreLoss: 0.6,
  goodMaxScoreLoss: 1.2,
  inaccuracyMaxScoreLoss: 4.0,
  mistakeMaxScoreLoss: 10.0,
  excellentMaxWinrateLoss: 1.0,
  greatMaxWinrateLoss: 3.0,
  goodMaxWinrateLoss: 7.0,
  inaccuracyMaxWinrateLoss: 15.0,
  mistakeMaxWinrateLoss: 30.0,
});

const SCORE_THRESHOLDS = [
  'bestMaxScoreLoss',
  'excellentMaxScoreLoss',
  'greatMaxScoreLoss',
  'goodMaxScoreLoss',
  'inaccuracyMaxScoreLoss',
  'mistakeMaxScoreLoss',
];

const WINRATE_THRESHOLDS = [
  'excellentMaxWinrateLoss',
  'greatMaxWinrateLoss',
  'goodMaxWinrateLoss',
  'inaccuracyMaxWinrateLoss',
  'mistakeMaxWinrateLoss',
];

const SEVERITY = Object.freeze({
  best: 0,
  excellent: 1,
  great: 2,
  good: 3,
  inaccuracy: 4,
  missedOpportunity: 4,
  mistake: 5,
  blunder: 6,
});

function classifyMove(move, options) {
  const opts = validateOptions({ ...DEFAULT_OPTIONS, ...options });
  const isTopChoice = move && move.rawChoiceRank === 0;
  const scoreLoss = normalizedLoss(move && move.scoreDrop);
  const winrateLoss = normalizedLoss(move && move.winrateDrop);

  if (scoreLoss === null && winrateLoss === null) {
    return {
      category: null,
      profile: opts.profile,
      scoreLoss: null,
      winrateLoss: null,
      scoreCategory: null,
      winrateCategory: null,
      severity: null,
      isTopChoice,
    };
  }

  const scoreCategory =
    scoreLoss === null
      ? null
      : scoreCategoryFromLoss(scoreLoss, isTopChoice, opts);
  const winrateCategory =
    winrateLoss === null || opts.profile === 'ogs'
      ? null
      : winrateCategoryFromLoss(winrateLoss, opts);
  const category = finalCategory(
    scoreCategory,
    winrateCategory,
    isTopChoice,
    opts,
  );

  return {
    category,
    profile: opts.profile,
    scoreLoss,
    winrateLoss: opts.profile === 'hybrid' && isTopChoice ? 0 : winrateLoss,
    scoreCategory,
    winrateCategory:
      opts.profile === 'hybrid' && isTopChoice ? 'best' : winrateCategory,
    severity: SEVERITY[category],
    isTopChoice,
  };
}

function finalCategory(scoreCategory, winrateCategory, isTopChoice, opts) {
  if (opts.profile === 'ogs') return scoreCategory;
  if (isTopChoice) return 'best';
  return isMissedOpportunity(scoreCategory, winrateCategory)
    ? 'missedOpportunity'
    : mostSevereCategory(scoreCategory, winrateCategory);
}

function isMissedOpportunity(scoreCategory, winrateCategory) {
  return (
    SEVERITY[scoreCategory] >= SEVERITY.inaccuracy &&
    SEVERITY[winrateCategory] <= SEVERITY.good
  );
}

function scoreCategoryFromLoss(scoreLoss, isTopChoice, opts) {
  if (opts.profile === 'ogs')
    return ogsScoreCategoryFromLoss(scoreLoss, opts);
  return hybridScoreCategoryFromLoss(scoreLoss, isTopChoice, opts);
}

function ogsScoreCategoryFromLoss(scoreLoss, opts) {
  if (scoreLoss < opts.excellentMaxScoreLoss) return 'excellent';
  if (scoreLoss < opts.greatMaxScoreLoss) return 'great';
  if (scoreLoss < opts.goodMaxScoreLoss) return 'good';
  if (scoreLoss < opts.inaccuracyMaxScoreLoss) return 'inaccuracy';
  if (scoreLoss < opts.mistakeMaxScoreLoss) return 'mistake';
  return 'blunder';
}

function hybridScoreCategoryFromLoss(scoreLoss, isTopChoice, opts) {
  if (isTopChoice && scoreLoss <= opts.bestMaxScoreLoss) return 'best';
  if (scoreLoss <= opts.excellentMaxScoreLoss) return 'excellent';
  if (scoreLoss <= opts.greatMaxScoreLoss) return 'great';
  if (scoreLoss <= opts.goodMaxScoreLoss) return 'good';
  if (scoreLoss <= opts.inaccuracyMaxScoreLoss) return 'inaccuracy';
  if (scoreLoss <= opts.mistakeMaxScoreLoss) return 'mistake';
  return 'blunder';
}

function winrateCategoryFromLoss(winrateLoss, opts) {
  if (winrateLoss <= opts.excellentMaxWinrateLoss) return 'excellent';
  if (winrateLoss <= opts.greatMaxWinrateLoss) return 'great';
  if (winrateLoss <= opts.goodMaxWinrateLoss) return 'good';
  if (winrateLoss <= opts.inaccuracyMaxWinrateLoss) return 'inaccuracy';
  if (winrateLoss <= opts.mistakeMaxWinrateLoss) return 'mistake';
  return 'blunder';
}

function mostSevereCategory(...categories) {
  return categories
    .filter((category) => category)
    .sort((a, b) => SEVERITY[b] - SEVERITY[a])[0];
}

function validateOptions(options) {
  if (options.profile !== 'ogs' && options.profile !== 'hybrid') {
    throw Error(`Invalid classification profile: ${options.profile}`);
  }

  const scoreThresholds =
    options.profile === 'ogs' ? SCORE_THRESHOLDS.slice(1) : SCORE_THRESHOLDS;

  validateThresholds(options, scoreThresholds);
  validateThresholds(options, WINRATE_THRESHOLDS);

  return options;
}

function validateThresholds(options, thresholds) {
  thresholds.forEach((key) => {
    if (!isFiniteNumber(options[key]) || options[key] < 0) {
      throw Error(`Invalid classification threshold: ${key}`);
    }
  });

  thresholds.slice(1).forEach((key, index) => {
    if (options[key] <= options[thresholds[index]]) {
      throw Error('Classification thresholds must be strictly increasing');
    }
  });
}

function normalizedLoss(loss) {
  return isFiniteNumber(loss) ? Number(Math.max(0, loss).toFixed(10)) : null;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

module.exports = {
  classifyMove,
  DEFAULT_OPTIONS,
};
