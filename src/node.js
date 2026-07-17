/**
 * @fileOverview SGF Node data structure.
 *               Please see <https://homepages.cwi.nl/~aeb/go/misc/sgf.html>.
 */

/* eslint no-param-reassign: ["error", { "props": false }] */

const sgfconv = require('./sgfconv');
const { renderCompactNode } = require('./comment-renderer');
const { classifyMove } = require('./move-classifier');

// Carries a SGF Node and its win rate.
class Node {
  constructor(node, title) {
    // e.g., ';B[aa]', ';W[cc]'.
    this.node = node;
    this.title = title;
    this.info = title ? `${title}\n` : '';
    this.report = '';

    const index = node.search(/\b[BW]\[/);
    if (index === -1) throw Error(`Invalid NodeSequece: ${node}`);

    // 'B' or 'W'
    this.pl = node.substring(index, index + 1);
  }

  // Sets comment.
  setReport(report) {
    this.report = report;
  }

  // Gets SGF node with comments.
  getSGF() {
    if (this.sgf) return this.sgf;

    const comment = this.isCompact()
      ? renderCompactNode(this)
      : [this.info, this.report].filter((v) => v).join('\n');
    this.sgf = comment ? sgfconv.addComment(this.node, comment) : this.node;

    return this.sgf;
  }

  isCompact() {
    return this.opts && this.opts.commentStyle === 'compact';
  }

  // Calculates scoreDrop, winrateDrop, ... and sets them to this.info and
  // the properties of this.node.
  setWinrate(prevInfo, curInfo, opts) {
    this.opts = opts;
    calcWinrate(this, prevInfo, curInfo);
    setClassification(this, opts);
    setProperties(this, opts);
  }

  // e.g., 'BC9 B17 F16 L3 F14 R7 (B 54.61%, B 0.19)'
  formatPV(boardYSize) {
    return (
      `${sgfconv.seqToPV(this.node, boardYSize)} (` +
      `${formatWinrate(this.winrate)}, ${formatScoreLead(this.scoreLead)}, ` +
      `${this.visits} visits)`
    );
  }
}

// Calculates scoreDrop, winrateDrop, winrate, ...
function calcWinrate(that, prevInfo, curInfo) {
  if (prevInfo) {
    that.winrateDrop = prevInfo.winrate - curInfo.winrate;
    that.scoreDrop = prevInfo.scoreLead - curInfo.scoreLead;

    if (that.pl === 'W') {
      that.winrateDrop = -that.winrateDrop;
      that.scoreDrop = -that.scoreDrop;
    }
  }

  if (that.pl === 'W') {
    that.myWinrate = 1 - curInfo.winrate;
    that.myScoreLead = -curInfo.scoreLead;
  } else {
    that.myWinrate = curInfo.winrate;
    that.myScoreLead = curInfo.scoreLead;
  }

  that.winrate = curInfo.winrate;
  that.scoreLead = curInfo.scoreLead;
  that.visits = curInfo.visits;
}

function setClassification(that, opts) {
  that.classification = classifyMove(
    { scoreDrop: that.scoreDrop, rawChoiceRank: that.rawChoiceRank },
    opts && opts.classification,
  );
}

const float = (f) => parseFloat(f).toFixed(2);

// e.g.,
// * Win rate: B 51.74%
// * Score lead: W 0.20
// * Win rate drop: B ⇣30.29%
// * Score drop: B ⇣4.31
// * Visits: 1015
const getWinratesInfo = (that) =>
  [
    `* Win rate: ${formatWinrate(that.winrate)}\n` +
      `* Score lead: ${formatScoreLead(that.scoreLead)}\n`,
    that.winrateDrop !== undefined
      ? `* Win rate drop: ${that.pl} ⇣${float(that.winrateDrop * 100)}%\n` +
        `* Score drop: ${that.pl} ⇣${float(that.scoreDrop)}\n`
      : '',
    `* Visits: ${that.visits}\n`,
  ].join('');

// Sets winrate, scoreDrop, winrateDrop, ... to that.info and the properties
// of that.node.
function setProperties(that, opts) {
  if (that.propertiesGot === true) return;

  that.propertiesGot = true;

  if (that.winrate != null) {
    if (!that.isCompact()) {
      // Does not add winrate report to SGF comment property. Adds it when
      // Node.getSGF() is called.
      that.info += `\n${getWinratesInfo(that)}`;
    }

    // RSGF win rate.
    that.node = sgfconv.addProperty(
      that.node,
      `SBKV[${float(that.winrate * 100)}]`,
      0,
    );
  }

  setAnnotations(that, opts);
}

function setAnnotations(that, opts) {
  const style = annotationStyle(opts);

  if (style === 'none') return;
  if (style === 'classification') {
    setClassificationAnnotations(that);
    return;
  }
  setLegacyAnnotations(that, opts);
}

function annotationStyle(opts) {
  if (opts.annotationStyle && opts.annotationStyle !== 'auto') {
    return opts.annotationStyle;
  }
  return opts.commentStyle === 'compact' || opts.commentStyle === 'detailed'
    ? 'classification'
    : 'legacy';
}

function setClassificationAnnotations(that) {
  const category = that.classification && that.classification.category;

  if (category === 'best' || category === 'excellent') {
    that.node = sgfconv.toGoodNode(that.node);
  } else if (category === 'great') {
    that.node = sgfconv.toInterestingNode(that.node);
  } else if (category === 'inaccuracy') {
    that.node = sgfconv.toDoubtfulNode(that.node);
  } else if (category === 'blunder') {
    that.node = sgfconv.toBadHotSpot(that.node);
  } else if (category === 'mistake') {
    that.node = sgfconv.toBadNode(that.node);
  }
}

function setLegacyAnnotations(that, opts) {
  if (that.winrateDrop < opts.maxWinrateDropForGoodMove / 100)
    that.node = sgfconv.toGoodNode(that.node);
  else if (that.winrateDrop > opts.minWinrateDropForBadHotSpot / 100)
    that.node = sgfconv.toBadHotSpot(that.node);
  else if (that.winrateDrop > opts.minWinrateDropForBadMove / 100)
    that.node = sgfconv.toBadNode(that.node);
}

function formatWinrate(winrate) {
  const v = float(winrate * 100);
  return v > 50 ? `B ${v}%` : `W ${float(100 - v)}%`;
}

function formatScoreLead(scoreLead) {
  const v = float(scoreLead);
  return v > 0 ? `B ${v}` : `W ${float(-v)}`;
}

module.exports = Node;
