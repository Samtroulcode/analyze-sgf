/**
 * @fileOverview Readable game summaries for SGF root comments.
 */

/* eslint max-lines: ["error", 210] */

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
    `## ${translate(language, 'gameInfo')}`,
    gameInfo(language, gametree),
    '',
    `## ${translate(language, 'statistics')}`,
    playerStats(language, moves, 'B', gametree.root),
    playerStats(language, moves, 'W', gametree.root),
    '',
    `## ${translate(language, 'keyMoments')}`,
    keyMoments(language, moves, summary.maxKeyMoments),
    '',
    analysisInfo(language, gametree.maxVisits),
  ]
    .filter((v) => v)
    .join('\n');
}

function gameInfo(language, gametree) {
  const { root, opts } = gametree;
  const pb = rootValue(root, 'PB') || translate(language, 'black');
  const pw = rootValue(root, 'PW') || translate(language, 'white');
  return [
    `${translate(language, 'players')}: ${pb} (${colorLabel(
      language,
      'B',
    )}) vs ${pw} (${colorLabel(language, 'W')})`,
    gameInfoLine(language, 'rules', rootValue(root, 'RU')),
    gameInfoLine(language, 'komi', rootValue(root, 'KM')),
    gameInfoLine(language, 'boardSize', boardSize(opts)),
    gameInfoLine(
      language,
      'result',
      formatResult(language, rootValue(root, 'RE')),
    ),
    gameInfoLine(language, 'date', rootValue(root, 'DT')),
    gameInfoLine(
      language,
      'event',
      rootValue(root, 'EV') || rootValue(root, 'GN'),
    ),
  ]
    .filter((v) => v)
    .join('\n');
}

function rootValue(root, key) {
  return root[key] && root[key][0].trim();
}

function gameInfoLine(language, key, value) {
  return value ? `${translate(language, key)}: ${value}` : '';
}

function boardSize(opts) {
  if (!opts.boardXSize || !opts.boardYSize) return '';
  return `${opts.boardXSize}x${opts.boardYSize}`;
}

function formatResult(language, result) {
  if (!result) return '';
  const normalized = result.toUpperCase();
  if (normalized === '0' || normalized === 'DRAW') {
    return translate(language, 'draw');
  }
  if (normalized === 'B+R') {
    return translate(language, 'blackWinsByResignation');
  }
  if (normalized === 'W+R') {
    return translate(language, 'whiteWinsByResignation');
  }
  if (normalized.startsWith('B+')) {
    return translate(language, 'blackWinsByPoints', {
      points: result.substring(2),
    });
  }
  if (normalized.startsWith('W+')) {
    return translate(language, 'whiteWinsByPoints', {
      points: result.substring(2),
    });
  }
  return result;
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

function playerStats(language, moves, pl, root) {
  const playerMoves = moves.filter((move) => move.pl === pl);
  const losses = playerMoves.map(
    (move) => move.classification.scoreLoss || 0,
  );
  const totalLoss = losses.reduce((acc, loss) => acc + loss, 0);
  const largestLoss = losses.length ? Math.max(...losses) : 0;

  return [
    `${playerName(language, root, pl)} (${colorLabel(language, pl)}) - ${
      playerMoves.length
    }`,
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

function playerName(language, root, pl) {
  return (
    rootValue(root, pl === 'B' ? 'PB' : 'PW') || colorLabel(language, pl)
  );
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

function analysisInfo(language, maxVisits) {
  return `${translate(language, 'analyzedBy')} (${translate(
    language,
    'maxVisits',
    { visits: maxVisits },
  )}).`;
}

module.exports = {
  renderGameSummary,
};
