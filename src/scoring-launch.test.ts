import { describe, expect, it } from 'vitest';

import { DEFAULT_SCORING_LAUNCH, resolveScoringLaunchUrl, scoringLaunchPlaceholders } from './scoring-launch';

describe('resolveScoringLaunchUrl', () => {
  it('substitutes all supported placeholders', () => {
    const url = resolveScoringLaunchUrl('https://ionsport.app/t/${tournamentId}/m/${matchUpId}', {
      tournamentId: 'abc',
      matchUpId: 'xyz',
    });
    expect(url).toBe('https://ionsport.app/t/abc/m/xyz');
  });

  it('substitutes eventId and drawId', () => {
    const url = resolveScoringLaunchUrl('https://x/${eventId}/${drawId}', { eventId: 'e1', drawId: 'd1' });
    expect(url).toBe('https://x/e1/d1');
  });

  it('resolves absent values to empty string', () => {
    const url = resolveScoringLaunchUrl('https://x/${matchUpId}', {});
    expect(url).toBe('https://x/');
  });

  it('resolves unknown placeholders to empty string', () => {
    const url = resolveScoringLaunchUrl('https://x/${bogus}', { matchUpId: 'm' });
    expect(url).toBe('https://x/');
  });

  it('uri-encodes values', () => {
    const url = resolveScoringLaunchUrl('https://x?m=${matchUpId}', { matchUpId: 'a b/c' });
    expect(url).toBe('https://x?m=a%20b%2Fc');
  });

  it('leaves a template with no placeholders untouched', () => {
    expect(resolveScoringLaunchUrl('https://x/score', { matchUpId: 'm' })).toBe('https://x/score');
  });
});

describe('scoringLaunchPlaceholders', () => {
  it('extracts and dedupes referenced placeholders', () => {
    expect(scoringLaunchPlaceholders('https://x/${matchUpId}/${matchUpId}/${eventId}')).toEqual([
      'matchUpId',
      'eventId',
    ]);
  });

  it('returns an empty array when there are no placeholders', () => {
    expect(scoringLaunchPlaceholders('https://x/score')).toEqual([]);
  });
});

describe('DEFAULT_SCORING_LAUNCH', () => {
  it('is EPIXODIC', () => {
    expect(DEFAULT_SCORING_LAUNCH).toEqual({ app: 'EPIXODIC' });
  });
});
