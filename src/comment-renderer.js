/**
 * @fileOverview Comment renderers for readable SGF comments.
 */

const sgfconv = require('./sgfconv');
const { categoryLabel, colorLabel, translate } = require('./comment-i18n');

const float = (f) => parseFloat(f).toFixed(2);

function renderCompactNode(node) {
  const language = node.opts && node.opts.language;
  const category = node.classification && node.classification.category;
  const title = node.title || translate(language, 'move');
  const heading = translate(language, 'moveTitle', {
    moveNumber: moveNumberFromTitle(title) || title,
    color: colorLabel(language, node.pl),
    category: category ? categoryLabel(language, category) : '',
  });

  return [
    heading,
    '',
    `${translate(language, 'estimatedLoss')}: ${formatScoreLoss(node)}`,
    `${translate(language, 'playedMove')}: ${firstMove(node.node, node)}`,
    compactBestChoice(node, language),
    compactKataGoChoice(node, language),
    '',
    `${translate(language, 'winrate')}: ${formatWinrate(node, language)}`,
    `${translate(language, 'estimatedScore')}: ${formatScoreLead(node)}`,
    `${translate(language, 'visits')}: ${node.visits}`,
  ]
    .filter((v) => v !== null)
    .join('\n');
}

function renderCompactTail(tail) {
  return [renderCompactNode(tail), compactVariations(tail)]
    .filter((v) => v)
    .join('\n\n');
}

function compactBestChoice(node, language) {
  if (!node.variations || !node.variations.length) return null;
  return `${translate(language, 'bestChoice')}: ${firstMove(
    node.variations[0].node,
    node,
  )}`;
}

function compactKataGoChoice(node, language) {
  if (node.rawChoiceRank === undefined || node.rawChoiceRank < 0) return null;
  return `${translate(language, 'katagoChoice')}: #${node.rawChoiceRank + 1}`;
}

function compactVariations(node) {
  const language = node.opts && node.opts.language;
  if (!node.variations || !node.variations.length) return '';

  return `${translate(language, 'proposedVariations')}\n\n${node.variations
    .map(
      (variation, index) =>
        `${index + 1}. ${variation.formatPV(node.opts.boardYSize)}`,
    )
    .join('\n')}`;
}

function formatScoreLoss(node) {
  const loss = node.classification && node.classification.scoreLoss;
  return loss === null ? '-' : `${float(loss)} points`;
}

function formatWinrate(node, language) {
  const value = float(node.winrate * 100);
  return node.winrate > 0.5
    ? `${colorLabel(language, 'B')} ${value}%`
    : `${colorLabel(language, 'W')} ${float(100 - value)}%`;
}

function formatScoreLead(node) {
  const value = float(node.scoreLead);
  return node.scoreLead > 0 ? `B +${value}` : `W +${float(-value)}`;
}

function firstMove(seq, node) {
  const match = seq.match(/[BW]\[([^\]]*)\]/);
  if (!match || !match[1]) return translate(node.opts.language, 'pass');
  return sgfconv.iaToJ19(match[1], node.opts.boardYSize);
}

function moveNumberFromTitle(title) {
  const match = title && title.match(/Move (\d+)/);
  return match ? match[1] : '';
}

module.exports = {
  renderCompactNode,
  renderCompactTail,
};
