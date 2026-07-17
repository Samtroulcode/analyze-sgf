/* eslint max-lines: ["error", 260], max-lines-per-function: ["error", 70] */

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
});
