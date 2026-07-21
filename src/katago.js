/**
 * @fileOverview Requests analysis to KataGo and reads responses.
 */

const syspath = require('path');
const homedir = require('os').homedir();
const chalk = require('chalk');
const progress = require('cli-progress');
const { spawn } = require('child_process');
const { reduce } = require('axax/es5/reduce');

const sgfconv = require('./sgfconv');
const katagoconv = require('./katagoconv');

const log = (message) => console.error(chalk.grey(message));
const config = `${homedir}${syspath.sep}.analyze-sgf.yml`;
const structuredProgressPrefix = 'ANALYZE_SGF_PROGRESS';

// Requests analysis to KataGo once or twice.
async function analyze(query, revisit, revisitWinrateDrop, kopts) {
  const responses = await analyzeOnce(query, kopts);

  // If revisit given, try again.
  return responses && revisit
    ? analyzeAgain(responses, query, revisit, revisitWinrateDrop, kopts)
    : responses;
}

// Requests analysis to KataGo and reads responses.
async function analyzeOnce(query, kopts) {
  const katago = spawn(`${kopts.path} ${kopts.arguments}`, [], {
    shell: true,
  });

  katago.on('exit', (code) => {
    if (code === 0) return;
    log(`Process error. Please fix: ${config}\n${JSON.stringify(kopts)}`);
    process.exit(1);
  });

  katago.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const format = `{bar} {percentage}% ({value}/{total}, ${sgfconv.formatK(
    query.maxVisits,
  )} visits) | ETA: {eta_formatted} ({duration_formatted})`;
  const bar = process.stderr.isTTY
    ? new progress.SingleBar({ format, barsize: 30 }, progress.Presets.rect)
    : null;
  if (bar) bar.start(query.analyzeTurns.length, 0);

  // Sends query to KataGo.
  await katago.stdin.write(`${JSON.stringify(query)}\n`);
  katago.stdin.end();

  // Reads analysis from KataGo.
  const { responses } = await reduce(
    (acc, cur) => {
      const count = (cur.toString().match(/\n/g) || []).length;
      const currentMove = acc.count + count;
      if (count) emitProgress(currentMove, query, bar);
      return { count: currentMove, responses: acc.responses + cur };
    },
    { count: 0, responses: '' },
  )(katago.stdout);

  if (bar) bar.stop();
  return responses;
}

function emitProgress(currentMove, query, bar) {
  const totalMoves = query.analyzeTurns.length;
  const clampedMove = Math.max(0, Math.min(currentMove, totalMoves));

  if (bar) {
    bar.update(clampedMove);
    return;
  }

  const percent =
    totalMoves === 0 ? 100 : Math.round((clampedMove / totalMoves) * 100);
  process.stderr.write(
    `${structuredProgressPrefix} ${JSON.stringify({
      percent,
      currentMove: clampedMove,
      totalMoves,
      visits: query.maxVisits,
    })}\n`,
  );
}

// Revisits KataGo and merges responses.
async function analyzeAgain(
  responses,
  query,
  revisit,
  revisitWinrateDrop,
  kopts,
) {
  const q = { ...query };
  q.maxVisits = revisit;
  q.analyzeTurns = katagoconv.winrateDropTurnsFromKataGoResponses(
    responses,
    revisitWinrateDrop,
  );

  if (!q.analyzeTurns.length) {
    log(
      'No move found whose win rate drops by more than ' +
        `${revisitWinrateDrop}%.`,
    );
    return responses;
  }

  const r = await analyzeOnce(q, kopts);
  return r
    ? katagoconv.mergeKataGoResponses(responses, r, q.analyzeTurns)
    : responses;
}

module.exports = { analyze };
