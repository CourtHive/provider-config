import { describe, expect, it } from 'vitest';
import { isMutationAllowed, MUTATION_PERMISSIONS } from './mutation-permissions';

describe('individual participant consolidation permissions', () => {
  it('requires permission to delete the duplicate', () => {
    expect(MUTATION_PERMISSIONS.mergeIndividualParticipants).toBe('canDeleteParticipants');
    expect(isMutationAllowed('mergeIndividualParticipants', { canDeleteParticipants: false })).toBe(false);
    expect(isMutationAllowed('mergeIndividualParticipants', { canDeleteParticipants: true })).toBe(true);
    expect(
      isMutationAllowed('mergeIndividualParticipants', {
        canDeleteParticipants: true,
        canEditParticipantDetails: false,
      }),
    ).toBe(false);
    expect(
      isMutationAllowed('mergeIndividualParticipants', {
        canDeleteParticipants: true,
        canEditParticipantDetails: true,
      }),
    ).toBe(true);
  });
});
