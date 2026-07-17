const assert = require('assert');

const GameTree = require('../src/gametree');

const baseOpts = {
  boardYSize: 19,
  commentStyle: 'compact',
  language: 'en',
  annotationStyle: 'auto',
  maxWinrateDropForGoodMove: 2,
  minWinrateDropForBadMove: 5,
  minWinrateDropForBadHotSpot: 20,
  minWinrateDropForVariations: 5,
  showBadVariations: false,
  maxVariationsForEachMove: 10,
  showVariationsAfterLastMove: false,
  classification: { enabled: true },
  summary: { enabled: true, maxKeyMoments: 1 },
};

function responses() {
  return `${JSON.stringify({
    turnNumber: 0,
    rootInfo: { winrate: 0.5, scoreLead: 0, visits: 10 },
    moveInfos: [{ pv: ['A1'], winrate: 0.51, scoreLead: 0.1 }],
  })}\n${JSON.stringify({
    turnNumber: 1,
    rootInfo: { winrate: 0.51, scoreLead: 0.1, visits: 20 },
    moveInfos: [{ pv: ['B2'], winrate: 0.49, scoreLead: 0 }],
  })}\n${JSON.stringify({
    turnNumber: 2,
    rootInfo: { winrate: 0.7, scoreLead: 4.1, visits: 30 },
    moveInfos: [],
  })}\n`;
}

describe('game summary', () => {
  it('should render a compact root summary from classifications.', () => {
    const sgf =
      '(;SZ[13]PB[Sammu]PW[bun_patty]KM[6.5]RE[B+R]' +
      'DT[2024-07-09]RU[Japanese];B[aa];W[bb])';
    const gametree = new GameTree(sgf, responses(), baseOpts);
    const report = gametree.getReport();

    assert(report.indexOf('# Review Summary') !== -1);
    assert(
      report.indexOf('Players: Sammu (Black) vs bun_patty (White)') !== -1,
    );
    assert(report.indexOf('Rules: Japanese') !== -1);
    assert(report.indexOf('Komi: 6.5') !== -1);
    assert(report.indexOf('Board size: 13x13') !== -1);
    assert(report.indexOf('Result: Black wins by resignation') !== -1);
    assert(report.indexOf('Date: 2024-07-09') !== -1);
    assert(report.indexOf('Sammu (Black) - 1\nBest: 1') !== -1);
    assert(report.indexOf('bun_patty (White) - 1\nInaccuracy: 1') !== -1);
    assert(report.indexOf('Sum of estimated losses: 4.00 points') !== -1);
    assert(report.indexOf('#2 White - Inaccuracy - 4.00 points') !== -1);
    assert(
      report.indexOf(
        'Analyzed by KataGo Parallel Analysis Engine (30 max visits).',
      ) !== -1,
    );
  });

  it('should keep legacy reports for legacy comments.', () => {
    const opts = { ...baseOpts, commentStyle: 'legacy' };
    const gametree = new GameTree('(;B[aa];W[bb])', responses(), opts);

    assert(gametree.getReport().indexOf('# Analyze-SGF Report') !== -1);
  });

  it('should allow disabling compact root summaries.', () => {
    const opts = { ...baseOpts, summary: { enabled: false } };
    const gametree = new GameTree('(;B[aa];W[bb])', responses(), opts);

    assert(gametree.getReport().indexOf('# Analyze-SGF Report') !== -1);
  });

  it('should localize compact root summaries.', () => {
    const opts = { ...baseOpts, language: 'fr' };
    const gametree = new GameTree('(;B[aa];W[bb])', responses(), opts);
    const report = gametree.getReport();

    assert(report.indexOf("# Résumé de l'analyse") !== -1);
    assert(report.indexOf('Joueurs: Noir (Noir) vs Blanc (Blanc)') !== -1);
    assert(report.indexOf('Blanc (Blanc) - 1\nImprécision: 1') !== -1);
  });
});
