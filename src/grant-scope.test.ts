import { describe, expect, it } from 'vitest';

import {
  GRANT_CAPABILITY_ALL,
  SCOPE_KEYS,
  SCOPE_KEY_FOR_FIELD,
  grantCoversCapability,
  grantCoversMethod,
  isEvaluableScope,
  isTargetInScope,
  isTournamentWide,
  isWithinWindow,
  requiredTargetFields,
} from './grant-scope';

describe('grant scope — the canonical predicate', () => {
  it('every target field maps to a real scope key, and every key is reachable', () => {
    const mapped = Object.values(SCOPE_KEY_FOR_FIELD);
    expect(new Set(mapped).size).toBe(mapped.length); // no two fields share a key
    expect([...mapped].sort()).toEqual([...SCOPE_KEYS].sort());
  });

  describe('empty scope is tournament-wide', () => {
    it('treats {} and undefined as unrestricted — the pre-existing behavior', () => {
      expect(isTournamentWide({})).toBe(true);
      expect(isTournamentWide(undefined)).toBe(true);
      expect(isTargetInScope({}, { courtId: 'centre' })).toBe(true);
      expect(isTargetInScope(undefined, {})).toBe(true);
    });
  });

  describe('the court case — what a global boolean cannot express', () => {
    const courtSeven = { courtIds: ['court-7'] };

    it('permits the granted court and refuses the final on Centre', () => {
      expect(isTargetInScope(courtSeven, { courtId: 'court-7' })).toBe(true);
      expect(isTargetInScope(courtSeven, { courtId: 'centre' })).toBe(false);
    });

    // An unscheduled matchUp is not on Court 7. Answering "unknown" with "allow"
    // would be the fail-open shape.
    it('refuses a target that cannot answer the dimension', () => {
      expect(isTargetInScope(courtSeven, {})).toBe(false);
      expect(isTargetInScope(courtSeven, { courtId: undefined })).toBe(false);
    });
  });

  describe('multiple dimensions', () => {
    it('requires every declared dimension, and matches any value within one', () => {
      const scope = { courtIds: ['c1', 'c2'], scheduledDates: ['2026-08-24'] };
      expect(isTargetInScope(scope, { courtId: 'c2', scheduledDate: '2026-08-24' })).toBe(true);
      expect(isTargetInScope(scope, { courtId: 'c3', scheduledDate: '2026-08-24' })).toBe(false);
      expect(isTargetInScope(scope, { courtId: 'c1', scheduledDate: '2026-08-25' })).toBe(false);
    });

    it('ignores a dimension declared with an empty list', () => {
      expect(isTargetInScope({ courtIds: [] }, {})).toBe(true);
    });
  });

  describe('unknown keys fail closed', () => {
    it('refuses a scope it cannot evaluate', () => {
      const scope = { somethingNew: ['x'] } as any;
      expect(isEvaluableScope(scope)).toBe(false);
      expect(isTargetInScope(scope, { courtId: 'court-7' })).toBe(false);
    });

    it('accepts a scope built only from known keys', () => {
      expect(isEvaluableScope({ courtIds: ['c1'], matchUpIds: ['m1'] })).toBe(true);
    });
  });

  describe('time bounds — delivery roles are shift-based', () => {
    const now = new Date('2026-08-24T12:00:00Z');

    it('is live inside the window and unbounded without one', () => {
      expect(isWithinWindow({ notBefore: '2026-08-24T08:00:00Z', notAfter: '2026-08-24T18:00:00Z' }, now)).toBe(true);
      expect(isWithinWindow({}, now)).toBe(true);
      expect(isWithinWindow({ notBefore: null, notAfter: null }, now)).toBe(true);
    });

    // The Saturday desk volunteer must not still hold the grant on Wednesday.
    it('is refused before it starts and after it ends', () => {
      expect(isWithinWindow({ notBefore: '2026-08-25T08:00:00Z' }, now)).toBe(false);
      expect(isWithinWindow({ notAfter: '2026-08-23T18:00:00Z' }, now)).toBe(false);
    });
  });

  describe('requiredTargetFields drives lazy resolution', () => {
    it('reports nothing for a tournament-wide grant, so no record walk is paid for', () => {
      expect(requiredTargetFields({})).toEqual([]);
      expect(requiredTargetFields(undefined)).toEqual([]);
    });

    it('reports only dimensions that actually constrain', () => {
      expect(requiredTargetFields({ courtIds: ['c1'], matchUpIds: [] })).toEqual(['courtId']);
    });
  });

  describe('capability bounds the grant', () => {
    it('matches a capability against the shared mutation map', () => {
      expect(grantCoversMethod('canEnterScores', 'setMatchUpStatus')).toBe(true);
      expect(grantCoversMethod('canCreateEvents', 'addEvent')).toBe(true);
    });

    it('does not let a scoring grant authorize structural work', () => {
      expect(grantCoversMethod('canEnterScores', 'addEvent')).toBe(false);
      expect(grantCoversCapability('canEnterScores', 'canModifySchedule')).toBe(false);
    });

    it('honors the wildcard', () => {
      expect(grantCoversMethod(GRANT_CAPABILITY_ALL, 'addEvent')).toBe(true);
      expect(grantCoversCapability(GRANT_CAPABILITY_ALL, 'canPublish')).toBe(true);
    });

    it('refuses an unmapped method and a missing capability', () => {
      expect(grantCoversMethod('canEnterScores', 'someBrandNewMethod')).toBe(false);
      expect(grantCoversMethod(undefined, 'setMatchUpStatus')).toBe(false);
      expect(grantCoversCapability(undefined, 'canPublish')).toBe(false);
    });
  });
});
