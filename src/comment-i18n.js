/**
 * @fileOverview Text labels for readable comments.
 */

const DEFAULT_LANGUAGE = 'en';

const STRINGS = Object.freeze({
  en: Object.freeze({
    best: 'Best',
    excellent: 'Excellent',
    great: 'Great',
    good: 'Good',
    inaccuracy: 'Inaccuracy',
    mistake: 'Mistake',
    blunder: 'Blunder',
    black: 'Black',
    white: 'White',
    move: 'Move',
    estimatedLoss: 'Estimated loss',
    victoryImpact: 'Victory impact',
    playedMove: 'Played move',
    bestChoice: 'Best choice',
    katagoChoice: 'KataGo choice',
    winrate: 'Winrate',
    estimatedScore: 'Estimated score',
    proposedVariations: 'Proposed variations',
    visits: 'Visits',
    pass: 'pass',
    reviewSummary: 'Review Summary',
    gameInfo: 'Game',
    players: 'Players',
    rules: 'Rules',
    boardSize: 'Board size',
    komi: 'Komi',
    result: 'Result',
    date: 'Date',
    event: 'Event',
    unknown: 'unknown',
    blackWinsByResignation: 'Black wins by resignation',
    whiteWinsByResignation: 'White wins by resignation',
    blackWinsByPoints: 'Black wins by {points} points',
    whiteWinsByPoints: 'White wins by {points} points',
    draw: 'Draw',
    analyzedBy: 'Analyzed by KataGo Parallel Analysis Engine',
    maxVisits: '{visits} max visits',
    keyMoments: 'Key Moments',
    statistics: 'Statistics',
    sumEstimatedLosses: 'Sum of estimated losses',
    largestEstimatedLoss: 'Largest estimated loss',
    moveTitle: 'Move {moveNumber} - {color} - {category}',
    points: '{value} points',
  }),
  fr: Object.freeze({
    best: 'Meilleur',
    excellent: 'Excellent',
    great: 'Très bon',
    good: 'Bon',
    inaccuracy: 'Imprécision',
    mistake: 'Erreur',
    blunder: 'Grosse erreur',
    black: 'Noir',
    white: 'Blanc',
    move: 'Coup',
    estimatedLoss: 'Perte estimée',
    victoryImpact: 'Impact victoire',
    playedMove: 'Coup joué',
    bestChoice: 'Meilleur choix',
    katagoChoice: 'Choix KataGo',
    winrate: 'Taux de gain',
    estimatedScore: 'Score estimé',
    proposedVariations: 'Variations proposées',
    visits: 'Visites',
    pass: 'passe',
    reviewSummary: "Résumé de l'analyse",
    gameInfo: 'Partie',
    players: 'Joueurs',
    rules: 'Règles',
    boardSize: 'Taille du goban',
    komi: 'Komi',
    result: 'Résultat',
    date: 'Date',
    event: 'Évènement',
    unknown: 'inconnu',
    blackWinsByResignation: 'Noir gagne par abandon',
    whiteWinsByResignation: 'Blanc gagne par abandon',
    blackWinsByPoints: 'Noir gagne de {points} points',
    whiteWinsByPoints: 'Blanc gagne de {points} points',
    draw: 'Partie nulle',
    analyzedBy: 'Analysé par KataGo Parallel Analysis Engine',
    maxVisits: '{visits} visites max',
    keyMoments: 'Moments clés',
    statistics: 'Statistiques',
    sumEstimatedLosses: 'Somme des pertes estimées',
    largestEstimatedLoss: 'Plus grosse perte estimée',
    moveTitle: 'Coup {moveNumber} - {color} - {category}',
    points: '{value} points',
  }),
});

function translate(language, key, params) {
  const strings = STRINGS[normalizeLanguage(language)];

  if (!Object.prototype.hasOwnProperty.call(strings, key)) {
    throw Error(`Unknown translation key: ${key}`);
  }

  return interpolate(strings[key], params || {});
}

function categoryLabel(language, category) {
  return translate(language, category);
}

function colorLabel(language, pl) {
  return translate(language, pl === 'W' ? 'white' : 'black');
}

function normalizeLanguage(language) {
  return Object.prototype.hasOwnProperty.call(STRINGS, language)
    ? language
    : DEFAULT_LANGUAGE;
}

function interpolate(template, params) {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) return match;
    return params[key];
  });
}

module.exports = {
  translate,
  categoryLabel,
  colorLabel,
  normalizeLanguage,
  DEFAULT_LANGUAGE,
};
