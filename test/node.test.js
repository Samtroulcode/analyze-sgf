/* eslint max-lines: ["error", 500], max-lines-per-function: ["error", 120] */

const fs = require('fs');
const assert = require('assert');
const yaml = require('js-yaml');

const Node = require('../src/node');
const NodeSeq = require('../src/nodeseq');
const Tail = require('../src/tail');

const yamlpath = require.resolve('../src/analyze-sgf.yml');
const opts = yaml.load(fs.readFileSync(yamlpath));
const sgfopts = opts.sgf;
sgfopts.boardYSize = opts.analysis.boardYSize;
sgfopts.classification = opts.classification;

const compactOpts = (language) => ({
  ...sgfopts,
  commentStyle: 'compact',
  language,
});

describe('Node.setWinrate', () => {
  it('should result expected pl.', () => {
    const node = new Node('(;B[aa];W[bb])');

    assert.equal(node.pl, 'B');
  });

  it('should result expected winrate.', () => {
    const node = new Node('(;B[aa];W[bb])');
    const currinfo = { winrate: 0.44, scoreLead: 6.5, visits: 1000 };

    node.setWinrate(null, currinfo, sgfopts);

    assert.equal(node.winrateDrop, undefined);
    assert.equal(node.scoreDrop, undefined);
    assert.deepEqual(node.classification, {
      category: null,
      profile: 'ogs',
      scoreLoss: null,
      winrateLoss: null,
      scoreCategory: null,
      winrateCategory: null,
      severity: null,
      isTopChoice: false,
    });
  });

  it('should result expected winrate drop.', () => {
    const node = new Node('(;B[aa];W[bb])');
    const previnfo = { winrate: 0.4, scoreLead: 5.0, visits: 1000 };
    const currinfo = { winrate: 0.44, scoreLead: 6.5, visits: 1000 };

    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.equal(node.winrate, currinfo.winrate);
    assert.equal(node.scoreLead, currinfo.scoreLead);
    assert.equal(node.visits, currinfo.visits);

    assert.equal(node.winrateDrop.toFixed(2), -0.04);
    assert.equal(node.scoreDrop.toFixed(1), -1.5);
    assert.equal(node.myWinrate, currinfo.winrate);
    assert.equal(node.myScoreLead, currinfo.scoreLead);
    assert.deepEqual(node.classification, {
      category: 'excellent',
      profile: 'ogs',
      scoreLoss: 0,
      winrateLoss: 0,
      scoreCategory: 'excellent',
      winrateCategory: null,
      severity: 1,
      isTopChoice: false,
    });
  });

  it('should result inverted winrate drop.', () => {
    const node = new Node('(;W[aa];B[bb])');
    const previnfo = { winrate: 0.4, scoreLead: 5.0, visits: 1000 };
    const currinfo = { winrate: 0.44, scoreLead: 6.5, visits: 1000 };

    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.equal(node.winrateDrop.toFixed(2), 0.04);
    assert.equal(node.scoreDrop.toFixed(1), 1.5);
    assert.equal(node.myScoreLead.toFixed(1), -6.5);
    assert.equal(node.myWinrate.toFixed(2), 0.56);
  });
});

describe('Node classification', () => {
  it('should use OGS score-loss classification by default.', () => {
    const node = new Node(';B[aa]');
    const previnfo = { winrate: 0.9, scoreLead: 0, visits: 1000 };
    const currinfo = { winrate: 0.69, scoreLead: -0.1, visits: 1000 };

    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.deepEqual(node.classification, {
      category: 'excellent',
      profile: 'ogs',
      scoreLoss: 0.1,
      winrateLoss: 21,
      scoreCategory: 'excellent',
      winrateCategory: null,
      severity: 1,
      isTopChoice: false,
    });
    assert.equal(node.node, ';B[aa]BM[1]HO[1]SBKV[69.00]');
  });

  it('should support hybrid score and winrate classification.', () => {
    const node = new Node(';B[aa]');
    const previnfo = { winrate: 0.9, scoreLead: 0, visits: 1000 };
    const currinfo = { winrate: 0.69, scoreLead: -0.1, visits: 1000 };

    node.setWinrate(previnfo, currinfo, {
      ...sgfopts,
      classification: { ...sgfopts.classification, profile: 'hybrid' },
    });

    assert.equal(node.classification.category, 'mistake');
  });

  it('should classify top choice under best threshold as best.', () => {
    const node = new Node(';B[aa]');
    const previnfo = { winrate: 0.5, scoreLead: 0, visits: 1000 };
    const currinfo = { winrate: 0.49, scoreLead: -0.04, visits: 1000 };

    node.rawChoiceRank = 0;
    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.deepEqual(node.classification, {
      category: 'excellent',
      profile: 'ogs',
      scoreLoss: 0.04,
      winrateLoss: 1,
      scoreCategory: 'excellent',
      winrateCategory: null,
      severity: 1,
      isTopChoice: true,
    });
  });
});

describe('Node.formatPV', () => {
  it('should result expected PVs.', () => {
    const node = [new Node('(;B[aa];W[bb];B[cc])'), new Node(';B[aa]')];
    const previnfo = { winrate: 0.4, scoreLead: 5.0, visits: 1000 };
    const currinfo = { winrate: 0.44, scoreLead: 6.5, visits: 1000 };

    node[0].setWinrate(previnfo, currinfo, sgfopts);
    assert.equal(
      node[0].formatPV(19),
      'BA19 B18 C17 (W 56.00%, B 6.50, 1000 visits)',
    );

    node[1].setWinrate(previnfo, currinfo, sgfopts);
    assert.equal(node[1].formatPV(19), 'A19 (W 56.00%, B 6.50, 1000 visits)');
    assert.equal(node[1].formatPV(9), 'A9 (W 56.00%, B 6.50, 1000 visits)');
  });
});

describe('Node.getSGF', () => {
  it('should render the current main move comment exactly.', () => {
    const node = new Node(';B[aa]', 'Move 1');
    const previnfo = { winrate: 0.5, scoreLead: 0, visits: 1000 };
    const currinfo = { winrate: 0.44, scoreLead: -1.25, visits: 123 };

    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.equal(
      node.getSGF(),
      ';B[aa]C[Move 1\n\n' +
        '* Win rate: W 56.00%\n' +
        '* Score lead: W 1.25\n' +
        '* Win rate drop: B ⇣6.00%\n' +
        '* Score drop: B ⇣1.25\n' +
        '* Visits: 123\n]BM[1]SBKV[44.00]',
    );
  });

  it('should render negative drops exactly as today.', () => {
    const node = new Node(';B[aa]', 'Move 1');
    const previnfo = { winrate: 0.4, scoreLead: 1, visits: 1 };
    const currinfo = { winrate: 0.45, scoreLead: 2.5, visits: 2 };

    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.equal(
      node.getSGF(),
      ';B[aa]C[Move 1\n\n' +
        '* Win rate: W 55.00%\n' +
        '* Score lead: B 2.50\n' +
        '* Win rate drop: B ⇣-5.00%\n' +
        '* Score drop: B ⇣-1.50\n' +
        '* Visits: 2\n]TE[1]SBKV[45.00]',
    );
  });

  it('should return the same SGF after multiple calls.', () => {
    const node = new Node(';B[aa]', 'Move 1');
    const previnfo = { winrate: 0.5, scoreLead: 0, visits: 1000 };
    const currinfo = { winrate: 0.44, scoreLead: -1.25, visits: 123 };

    node.setWinrate(previnfo, currinfo, sgfopts);

    assert.equal(node.getSGF(), node.getSGF());
  });

  it('should render compact English move comments.', () => {
    const node = new Node(';B[aa]', 'Move 1');
    const previnfo = { winrate: 0.5, scoreLead: 0, visits: 1 };
    const currinfo = { winrate: 0.51, scoreLead: 1.25, visits: 123 };

    node.rawChoiceRank = 0;
    node.setWinrate(previnfo, currinfo, compactOpts('en'));

    assert.equal(
      node.getSGF(),
      ';B[aa]C[Move 1 - Black - Excellent\n\n' +
        'Estimated loss: 0.0 points\n' +
        'Victory impact: -0.0%\n' +
        'Played move: A19\n' +
        'KataGo choice: #1\n\n' +
        'Winrate: Black 51.00%\n' +
        'Estimated score: B +1.25\n' +
        'Visits: 123]IT[1]SBKV[51.00]',
    );
  });
});

describe('Node SGF annotations', () => {
  const annotatedNode = (winrateDrop) => {
    const node = new Node(';B[aa]');
    const previnfo = { winrate: 0.5, scoreLead: 0, visits: 1 };
    const currinfo = {
      winrate: 0.5 - winrateDrop,
      scoreLead: 0,
      visits: 1,
    };

    node.setWinrate(previnfo, currinfo, sgfopts);
    return node.node;
  };

  it('should keep TE boundary behavior.', () => {
    assert.equal(annotatedNode(0.019), ';B[aa]TE[1]SBKV[48.10]');
    assert.equal(annotatedNode(0.02), ';B[aa]SBKV[48.00]');
  });

  it('should keep BM boundary behavior.', () => {
    assert.equal(annotatedNode(0.05), ';B[aa]SBKV[45.00]');
    assert.equal(annotatedNode(0.051), ';B[aa]BM[1]SBKV[44.90]');
  });

  it('should keep BM and HO boundary behavior.', () => {
    assert.equal(annotatedNode(0.2), ';B[aa]BM[1]SBKV[30.00]');
    assert.equal(annotatedNode(0.201), ';B[aa]BM[1]HO[1]SBKV[29.90]');
  });

  it('should keep legacy annotations based on winrate.', () => {
    const node = new Node(';B[aa]');

    node.setWinrate(
      { winrate: 0.9, scoreLead: 0, visits: 1000 },
      { winrate: 0.69, scoreLead: -2, visits: 1000 },
      sgfopts,
    );

    assert.equal(node.classification.category, 'inaccuracy');
    assert.equal(node.node, ';B[aa]BM[1]HO[1]SBKV[69.00]');
  });

  it('should mark compact great moves as good.', () => {
    const node = new Node(';B[aa]');

    node.setWinrate(
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate: 0.49, scoreLead: -0.4, visits: 1000 },
      compactOpts('en'),
    );

    assert.equal(node.classification.category, 'great');
    assert.equal(node.node, ';B[aa]TE[1]SBKV[49.00]');
  });

  it('should mark hybrid compact missed opportunities as doubtful.', () => {
    const node = new Node(';B[aa]');

    node.setWinrate(
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate: 0.49, scoreLead: -7, visits: 1000 },
      {
        ...compactOpts('en'),
        classification: { ...sgfopts.classification, profile: 'hybrid' },
      },
    );

    assert.equal(node.classification.category, 'missedOpportunity');
    assert.equal(node.node, ';B[aa]DO[1]SBKV[49.00]');
  });

  it('should mark compact inaccuracies as doubtful.', () => {
    const node = new Node(';B[aa]');

    node.setWinrate(
      { winrate: 0.7, scoreLead: 0, visits: 1000 },
      { winrate: 0.6, scoreLead: -2, visits: 1000 },
      compactOpts('en'),
    );

    assert.equal(node.classification.category, 'inaccuracy');
    assert.equal(node.node, ';B[aa]DO[1]SBKV[60.00]');
  });

  it('should mark compact mistakes from score-based classification.', () => {
    const node = new Node(';B[aa]');

    node.setWinrate(
      { winrate: 0.7, scoreLead: 0, visits: 1000 },
      { winrate: 0.5, scoreLead: -5, visits: 1000 },
      compactOpts('en'),
    );

    assert.equal(node.classification.category, 'mistake');
    assert.equal(node.node, ';B[aa]BM[1]SBKV[50.00]');
  });

  it('should mark compact blunders as bad hotspots.', () => {
    const node = new Node(';B[aa]');

    node.setWinrate(
      { winrate: 0.8, scoreLead: 0, visits: 1000 },
      { winrate: 0.45, scoreLead: -11, visits: 1000 },
      compactOpts('en'),
    );

    assert.equal(node.classification.category, 'blunder');
    assert.equal(node.node, ';B[aa]BM[1]HO[1]SBKV[45.00]');
  });
});

describe('NodeSeq.getSGF', () => {
  it('should render the current variation comment exactly.', () => {
    const variation = new NodeSeq(
      '(;W[bb];B[cc])',
      'A variation of move 2',
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate: 0.53, scoreLead: -0.75, visits: 45 },
      sgfopts,
    );

    assert.equal(
      variation.getSGF(),
      '(;W[bb]C[A variation of move 2\n\n' +
        '* Win rate: B 53.00%\n' +
        '* Score lead: W 0.75\n' +
        '* Win rate drop: W ⇣3.00%\n' +
        '* Score drop: W ⇣-0.75\n' +
        '* Visits: 45\n' +
        '* Sequence: WB18 C17\n]SBKV[53.00];B[cc])',
    );
  });
});

describe('Tail.getSGF', () => {
  const makeVariation = (seq, winrate, visits) =>
    new NodeSeq(
      seq,
      'A variation of move 1',
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate, scoreLead: 1, visits },
      sgfopts,
    );

  it('should render KataGo top choice exactly.', () => {
    const tail = new Tail(';B[aa]', 'Move 1');

    tail.setVariations(
      [
        makeVariation('(;B[aa];W[bb])', 0.51, 100),
        makeVariation('(;B[bb];W[cc])', 0.5, 50),
      ],
      19,
    );
    tail.setWinrate(
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate: 0.51, scoreLead: 1, visits: 100 },
      sgfopts,
    );

    assert(tail.getSGF().indexOf('* KataGo top choice\n') !== -1);
  });

  it('should not render a choice when absent from shown variations.', () => {
    const tail = new Tail(';B[cc]', 'Move 1');

    tail.setVariations([makeVariation('(;B[aa];W[bb])', 0.51, 100)], 19);
    tail.setWinrate(
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate: 0.49, scoreLead: 1, visits: 100 },
      sgfopts,
    );

    assert.equal(tail.getSGF().indexOf('* KataGo choice'), -1);
    assert.equal(tail.getSGF().indexOf('* KataGo top choice'), -1);
  });

  it('should render the proposed variations list exactly.', () => {
    const tail = new Tail(';B[aa]', 'Move 1');

    tail.setVariations(
      [
        makeVariation('(;B[aa];W[bb])', 0.51, 100),
        makeVariation('(;B[bb];W[cc])', 0.5, 50),
      ],
      19,
    );

    assert.equal(
      tail.pvs,
      'The proposed variations\n\n' +
        '1. BA19 B18 (B 51.00%, B 1.00, 100 visits)\n' +
        '2. BB18 C17 (W 50.00%, B 1.00, 50 visits)\n',
    );
  });

  it('should refresh classification after raw rank is set.', () => {
    const tail = new Tail(';B[aa]', 'Move 1');

    tail.setWinrate(
      { winrate: 0.5, scoreLead: 0, visits: 1000 },
      { winrate: 0.49, scoreLead: -0.04, visits: 100 },
      sgfopts,
    );
    assert.equal(tail.classification.category, 'excellent');

    tail.setVariations(
      [makeVariation('(;B[aa];W[bb])', 0.51, 100)],
      19,
      0,
      0,
    );

    assert.deepEqual(tail.classification, {
      category: 'excellent',
      profile: 'ogs',
      scoreLoss: 0,
      winrateLoss: 1,
      scoreCategory: 'excellent',
      winrateCategory: null,
      severity: 1,
      isTopChoice: true,
    });
  });

  it('should render compact French comments with variations.', () => {
    const tail = new Tail(';B[aa]', 'Move 1');
    const optsfr = compactOpts('fr');

    tail.setVariations([makeVariation('(;B[aa];W[bb])', 0.51, 100)], 19, 0);
    tail.setWinrate(
      { winrate: 0.5, scoreLead: 0, visits: 1 },
      { winrate: 0.51, scoreLead: 1.25, visits: 123 },
      optsfr,
    );

    assert.equal(
      tail.getSGF(),
      ';B[aa]C[Coup 1 - Noir - Excellent\n\n' +
        'Perte estimée: 0.0 points\n' +
        'Impact victoire: -0.0%\n' +
        'Coup joué: A19\n' +
        'Meilleur choix: A19\n' +
        'Choix KataGo: #1\n\n' +
        'Taux de gain: Noir 51.00%\n' +
        'Score estimé: B +1.25\n' +
        'Visites: 123\n\n' +
        'Variations proposées\n\n' +
        '1. BA19 B18 (B 51.00%, B 1.00, 100 visits)]IT[1]SBKV[51.00]',
    );
  });
});
