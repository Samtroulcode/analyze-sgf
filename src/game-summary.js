/**
 * @fileOverview Readable game summaries for SGF root comments.
 */

const { categoryLabel, colorLabel, translate } = require('./comment-i18n');

const float = (f) => parseFloat(f).toFixed(2);

function renderGameSummary(gametree) {
  const opts = gametree.opts || {};
  const summary = opts.summary || {};

  if (!summary.enabled) return '';
  if (opts.commentStyle !== 'compact' && opts.commentStyle !== 'detailed') {
    return '';
  }

  const { language } = opts;
  const moves = classifiedMoves(gametree.nodes);
  if (!moves.length) return '';

  return [
    `# ${translate(language, 'reviewSummary')}`,
    '',
    `## ${translate(language, 'statistics')}`,
    playerStats(language, moves, 'B'),
    playerStats(language, moves, 'W'),
    '',
    `## ${translate(language, 'keyMoments')}`,
    keyMoments(language, moves, summary.maxKeyMoments),
  ]
    .filter((v) => v)
    .join('\n');
}

function classifiedMoves(nodes) {
  return nodes
    .map((node, index) => ({
      index,
      pl: node.pl,
      classification: node.classification,
    }))
    .filter((move) => move.classification);
}

function playerStats(language, moves, pl) {
  const playerMoves = moves.filter((move) => move.pl === pl);
  const losses = playerMoves.map(
    (move) => move.classification.scoreLoss || 0,
  );
  const totalLoss = losses.reduce((acc, loss) => acc + loss, 0);
  const largestLoss = losses.length ? Math.max(...losses) : 0;

  return [
    `${colorLabel(language, pl)} (${playerMoves.length})`,
    categoryCounts(language, playerMoves),
    `${translate(language, 'sumEstimatedLosses')}: ${formatPoints(
      language,
      totalLoss,
    )}`,
    `${translate(language, 'largestEstimatedLoss')}: ${formatPoints(
      language,
      largestLoss,
    )}`,
  ]
    .filter((v) => v)
    .join('\n');
}

function categoryCounts(language, moves) {
  const counts = moves.reduce((acc, move) => {
    const { category } = move.classification;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(counts)
    .map(
      (category) =>
        `${categoryLabel(language, category)}: ${counts[category]}`,
    )
    .join(', ');
}

function keyMoments(language, moves, maxKeyMoments) {
  const max = maxKeyMoments === undefined ? 5 : maxKeyMoments;
  const moments = moves
    .filter((move) => move.classification.scoreLoss > 0)
    .sort((a, b) => b.classification.scoreLoss - a.classification.scoreLoss)
    .slice(0, max);

  if (!moments.length) return '-';

  return moments.map((move) => keyMomentLine(language, move)).join('\n');
}

function keyMomentLine(language, move) {
  const label = categoryLabel(language, move.classification.category);
  const loss = formatPoints(language, move.classification.scoreLoss);
  const color = colorLabel(language, move.pl);
  return `#${move.index + 1} ${color} - ${label} - ${loss}`;
}

function formatPoints(language, value) {
  return translate(language, 'points', { value: float(value) });
}

module.exports = {
  renderGameSummary,
};
