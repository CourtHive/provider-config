import { describe, expect, it } from 'vitest';

import { MUTATION_PERMISSIONS, isMutationAllowed } from './mutation-permissions';

describe('MUTATION_PERMISSIONS map', () => {
  it('covers participant CRUD mutations', () => {
    expect(MUTATION_PERMISSIONS.addParticipants).toBe('canCreateCompetitors');
    expect(MUTATION_PERMISSIONS.deleteParticipants).toBe('canDeleteParticipants');
    expect(MUTATION_PERMISSIONS.modifyParticipant).toBe('canEditParticipantDetails');
  });

  it('covers official-assignment under canCreateOfficials', () => {
    expect(MUTATION_PERMISSIONS.addMatchUpOfficial).toBe('canCreateOfficials');
  });

  it('covers event CRUD', () => {
    expect(MUTATION_PERMISSIONS.addEvent).toBe('canCreateEvents');
    expect(MUTATION_PERMISSIONS.deleteEvents).toBe('canDeleteEvents');
    expect(MUTATION_PERMISSIONS.modifyEvent).toBe('canModifyEventFormat');
    expect(MUTATION_PERMISSIONS.setMatchUpFormat).toBe('canModifyEventFormat');
    expect(MUTATION_PERMISSIONS.modifyTieFormat).toBe('canModifyEventFormat');
  });

  it('covers draw CRUD', () => {
    expect(MUTATION_PERMISSIONS.addDrawDefinition).toBe('canCreateDraws');
    expect(MUTATION_PERMISSIONS.deleteDrawDefinitions).toBe('canDeleteDraws');
    expect(MUTATION_PERMISSIONS.deleteFlightAndFlightDraw).toBe('canDeleteDraws');
  });

  it('covers schedule mutations', () => {
    expect(MUTATION_PERMISSIONS.addMatchUpScheduleItems).toBe('canModifySchedule');
    expect(MUTATION_PERMISSIONS.bulkScheduleMatchUps).toBe('canModifySchedule');
    expect(MUTATION_PERMISSIONS.proAutoSchedule).toBe('canModifySchedule');
  });

  it('covers court availability', () => {
    expect(MUTATION_PERMISSIONS.modifyCourt).toBe('canModifyCourtAvailability');
    expect(MUTATION_PERMISSIONS.modifyCourtAvailability).toBe('canModifyCourtAvailability');
  });

  it('covers tournament-detail mutations', () => {
    expect(MUTATION_PERMISSIONS.setTournamentDates).toBe('canModifyTournamentDetails');
    expect(MUTATION_PERMISSIONS.setTournamentName).toBe('canModifyTournamentDetails');
    expect(MUTATION_PERMISSIONS.setRegistrationProfile).toBe('canModifyTournamentDetails');
  });

  it('covers tournament-policy mutations', () => {
    expect(MUTATION_PERMISSIONS.attachPolicies).toBe('canModifyPolicies');
  });

  it('covers publish + unpublish under the appropriate ceiling', () => {
    expect(MUTATION_PERMISSIONS.publishEvent).toBe('canPublish');
    expect(MUTATION_PERMISSIONS.publishOrderOfPlay).toBe('canPublish');
    expect(MUTATION_PERMISSIONS.unPublishEvent).toBe('canUnpublish');
    expect(MUTATION_PERMISSIONS.unPublishOrderOfPlay).toBe('canUnpublish');
  });
});

describe('isMutationAllowed', () => {
  it('returns true for unmapped mutations', () => {
    expect(isMutationAllowed('someUnknownMutation')).toBe(true);
    expect(isMutationAllowed('someUnknownMutation', { canPublish: false })).toBe(true);
  });

  it('returns true when permission is true', () => {
    expect(isMutationAllowed('addEvent', { canCreateEvents: true })).toBe(true);
  });

  it('returns false when permission is false', () => {
    expect(isMutationAllowed('deleteEvents', { canDeleteEvents: false })).toBe(false);
  });

  it('defaults to true when permission is undefined (boolean defaults permissive)', () => {
    expect(isMutationAllowed('addEvent', {})).toBe(true);
    expect(isMutationAllowed('addEvent')).toBe(true);
  });
});
