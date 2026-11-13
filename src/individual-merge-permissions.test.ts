import { isMutationAllowed, MUTATION_PERMISSIONS } from './mutation-permissions';
import { validateCaps, validateSettings } from './validators';
import { computeEffectiveConfig } from './effective-config';
import { describe, expect, it } from 'vitest';

const MERGE = 'mergeIndividualParticipants';
const granted = { canMergeParticipants: true, canDeleteParticipants: true, canEditParticipantDetails: true };

describe('individual participant consolidation permissions', () => {
  it('is gated by its own permission', () => {
    expect(MUTATION_PERMISSIONS[MERGE]).toBe('canMergeParticipants');
  });

  it('requires all three grants to be explicitly true', () => {
    expect(isMutationAllowed(MERGE, granted)).toBe(true);
    for (const key of Object.keys(granted)) {
      expect(isMutationAllowed(MERGE, { ...granted, [key]: false })).toBe(false);
      expect(isMutationAllowed(MERGE, { ...granted, [key]: undefined })).toBe(false);
    }
  });

  it('refuses when no permissions are supplied', () => {
    expect(isMutationAllowed(MERGE)).toBe(false);
    expect(isMutationAllowed(MERGE, {})).toBe(false);
  });

  it('is opt-in: an unconfigured provider cannot merge, but keeps deleting and editing', () => {
    const { permissions = {} } = computeEffectiveConfig({}, {});
    expect(permissions.canMergeParticipants).toBe(false);
    expect(isMutationAllowed(MERGE, permissions)).toBe(false);
    expect(isMutationAllowed('deleteParticipants', permissions)).toBe(true);
    expect(isMutationAllowed('modifyParticipant', permissions)).toBe(true);
  });

  it('needs both tiers: the provisioner allows it and the provider admin turns it on', () => {
    const allow = { permissions: { canMergeParticipants: true } };
    expect(isMutationAllowed(MERGE, computeEffectiveConfig(allow, allow).permissions)).toBe(true);
    // A default-false key resolves false in any tier that leaves it unset.
    expect(isMutationAllowed(MERGE, computeEffectiveConfig(allow, {}).permissions)).toBe(false);
    expect(isMutationAllowed(MERGE, computeEffectiveConfig({}, allow).permissions)).toBe(false);
  });

  it('is a known key to both validators', () => {
    expect(validateCaps({ permissions: { canMergeParticipants: true } })).toEqual([]);
    expect(
      validateSettings(
        { permissions: { canMergeParticipants: true } },
        { permissions: { canMergeParticipants: true } },
      ),
    ).toEqual([]);
  });
});
