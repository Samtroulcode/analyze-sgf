/* eslint max-lines-per-function: ["error", 100] */

const assert = require('assert');

const {
  translate,
  categoryLabel,
  colorLabel,
  normalizeLanguage,
  DEFAULT_LANGUAGE,
} = require('../src/comment-i18n');

describe('comment-i18n', () => {
  it('should expose the default language.', () => {
    assert.equal(DEFAULT_LANGUAGE, 'en');
  });

  it('should normalize unsupported languages to English.', () => {
    assert.equal(normalizeLanguage('en'), 'en');
    assert.equal(normalizeLanguage('fr'), 'fr');
    assert.equal(normalizeLanguage('de'), 'en');
    assert.equal(normalizeLanguage(undefined), 'en');
  });

  it('should translate category labels in English.', () => {
    assert.equal(categoryLabel('en', 'best'), 'Best');
    assert.equal(categoryLabel('en', 'excellent'), 'Excellent');
    assert.equal(categoryLabel('en', 'great'), 'Great');
    assert.equal(categoryLabel('en', 'good'), 'Good');
    assert.equal(categoryLabel('en', 'inaccuracy'), 'Inaccuracy');
    assert.equal(
      categoryLabel('en', 'missedOpportunity'),
      'Missed opportunity',
    );
    assert.equal(categoryLabel('en', 'mistake'), 'Mistake');
    assert.equal(categoryLabel('en', 'blunder'), 'Blunder');
  });

  it('should translate category labels in French.', () => {
    assert.equal(categoryLabel('fr', 'best'), 'Meilleur');
    assert.equal(categoryLabel('fr', 'excellent'), 'Excellent');
    assert.equal(categoryLabel('fr', 'great'), 'Très bon');
    assert.equal(categoryLabel('fr', 'good'), 'Bon');
    assert.equal(categoryLabel('fr', 'inaccuracy'), 'Imprécision');
    assert.equal(
      categoryLabel('fr', 'missedOpportunity'),
      'Occasion manquée',
    );
    assert.equal(categoryLabel('fr', 'mistake'), 'Erreur');
    assert.equal(categoryLabel('fr', 'blunder'), 'Grosse erreur');
  });

  it('should translate common comment labels.', () => {
    assert.equal(translate('en', 'estimatedLoss'), 'Estimated loss');
    assert.equal(translate('fr', 'estimatedLoss'), 'Perte estimée');
    assert.equal(translate('en', 'keyMoments'), 'Key Moments');
    assert.equal(translate('fr', 'keyMoments'), 'Moments clés');
    assert.equal(translate('en', 'statistics'), 'Statistics');
    assert.equal(translate('fr', 'statistics'), 'Statistiques');
  });

  it('should translate player colors from SGF players.', () => {
    assert.equal(colorLabel('en', 'B'), 'Black');
    assert.equal(colorLabel('en', 'W'), 'White');
    assert.equal(colorLabel('fr', 'B'), 'Noir');
    assert.equal(colorLabel('fr', 'W'), 'Blanc');
  });

  it('should interpolate parameters.', () => {
    assert.equal(
      translate('fr', 'moveTitle', {
        moveNumber: 47,
        color: 'Noir',
        category: 'Grosse erreur',
      }),
      'Coup 47 - Noir - Grosse erreur',
    );
    assert.equal(translate('en', 'points', { value: '8.4' }), '8.4 points');
  });

  it('should keep unknown interpolation placeholders.', () => {
    assert.equal(
      translate('en', 'moveTitle', { moveNumber: 47 }),
      'Move 47 - {color} - {category}',
    );
  });

  it('should fall back to English for unsupported languages.', () => {
    assert.equal(translate('de', 'mistake'), 'Mistake');
  });

  it('should reject unknown translation keys.', () => {
    assert.throws(
      () => translate('en', 'unknownKey'),
      /Unknown translation key: unknownKey/,
    );
  });

  it('should not mutate interpolation params.', () => {
    const params = { value: '4.2' };

    translate('en', 'points', params);

    assert.deepEqual(params, { value: '4.2' });
  });
});
