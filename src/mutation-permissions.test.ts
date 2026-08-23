import { describe, expect, it } from 'vitest';

import { MUTATION_PERMISSIONS, isMutationAllowed } from './mutation-permissions';
import { BOOLEAN_PERMISSION_KEYS, PERMISSIONS_DEFAULT_FALSE } from './types';
import { computeEffectiveConfig } from './effective-config';

describe('MUTATION_PERMISSIONS map', () => {
  it('covers participant CRUD mutations', () => {
    expect(MUTATION_PERMISSIONS.addParticipants).toBe('canCreateCompetitors');
    expect(MUTATION_PERMISSIONS.deleteParticipants).toBe('canDeleteParticipants');
    expect(MUTATION_PERMISSIONS.modifyParticipant).toBe('canEditParticipantDetails');
  });

  it('covers official-assignment under canCreateOfficials', () => {
    expect(MUTATION_PERMISSIONS.addMatchUpOfficial).toBe('canCreateOfficials');
  });

  it('gates scorekeeper/timekeeper nomination under canCreateOfficials', () => {
    expect(MUTATION_PERMISSIONS.assignMatchUpScorekeeper).toBe('canCreateOfficials');
    expect(MUTATION_PERMISSIONS.removeMatchUpScorekeeper).toBe('canCreateOfficials');
    expect(MUTATION_PERMISSIONS.assignMatchUpTimekeeper).toBe('canCreateOfficials');
    expect(MUTATION_PERMISSIONS.removeMatchUpTimekeeper).toBe('canCreateOfficials');
    expect(isMutationAllowed('assignMatchUpScorekeeper', { canCreateOfficials: false })).toBe(false);
    expect(isMutationAllowed('assignMatchUpScorekeeper', { canCreateOfficials: true })).toBe(true);
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
    expect(MUTATION_PERMISSIONS.proColumnResolve).toBe('canModifySchedule');
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

describe('MUTATION_PERMISSIONS conformance', () => {
  // Control: a broken map (empty, or reduced to a handful) must not be able to
  // pass the guards below by vacuous truth.
  it('maps a substantial map, not a stub', () => {
    expect(Object.keys(MUTATION_PERMISSIONS).length).toBeGreaterThan(100);
  });

  it('every mapped value is a real boolean permission key', () => {
    const valid = new Set<string>(BOOLEAN_PERMISSION_KEYS);
    const bad = Object.entries(MUTATION_PERMISSIONS).filter(([, key]) => !valid.has(key));
    expect(bad).toEqual([]);
  });

  // The safety property the whole gap-closing change rests on. As of 2026-08-23
  // no provider in production has configured any permission, so an unconfigured
  // provider is the real-world case, and it must be able to do everything it
  // could before these mappings existed.
  it('denies nothing for a provider with no configured permissions', () => {
    const permissions = computeEffectiveConfig({}, {}).permissions ?? {};
    const denied = Object.keys(MUTATION_PERMISSIONS).filter((m) => !isMutationAllowed(m, permissions));
    expect(denied).toEqual([]);
  });

  // The trap that caught resetScorecard: a key in PERMISSIONS_DEFAULT_FALSE
  // resolves to false for every unconfigured provider, so mapping a mutation to
  // one silently denies it fleet-wide on deploy.
  it('maps no mutation to a permission that defaults to false', () => {
    const offenders = Object.entries(MUTATION_PERMISSIONS).filter(([, key]) => PERMISSIONS_DEFAULT_FALSE.has(key));
    expect(offenders).toEqual([]);
  });
});

describe('newly gated mutation families', () => {
  it('gates entries independently of participant creation', () => {
    expect(isMutationAllowed('addEventEntries', { canModifyEntries: false })).toBe(false);
    expect(isMutationAllowed('addEventEntries', { canCreateCompetitors: false })).toBe(true);
    for (const m of [
      'removeEventEntries',
      'addDrawEntries',
      'removeDrawEntries',
      'addEventEntryPairs',
      'destroyPairEntries',
      'removeStageEntries',
    ])
      expect(isMutationAllowed(m, { canModifyEntries: false })).toBe(false);
  });

  it('gates positioning independently of draw creation', () => {
    for (const m of [
      'assignDrawPosition',
      'assignDrawPositionBye',
      'setPositionAssignments',
      'removeDrawPositionAssignment',
      'luckyDrawAdvancement',
      'setSubOrder',
      'seedWithdrawalCascade',
    ])
      expect(isMutationAllowed(m, { canAssignPositions: false })).toBe(false);
    expect(isMutationAllowed('assignDrawPosition', { canCreateDraws: false })).toBe(true);
  });

  it('gates structures, scenarios, practice courts, ratings and links', () => {
    expect(isMutationAllowed('attachPlayoffStructures', { canModifyStructures: false })).toBe(false);
    expect(isMutationAllowed('applyScheduleScenario', { canModifyScheduleScenarios: false })).toBe(false);
    expect(isMutationAllowed('addPracticeRegistration', { canManagePracticeCourts: false })).toBe(false);
    expect(isMutationAllowed('setParticipantScaleItems', { canModifyRatings: false })).toBe(false);
    expect(isMutationAllowed('linkTournaments', { canLinkTournaments: false })).toBe(false);
  });

  it('finally enforces canEnterScores — the key that gated nothing', () => {
    expect(isMutationAllowed('setMatchUpStatus', { canEnterScores: false })).toBe(false);
    expect(isMutationAllowed('setMatchUpStatus', { canEnterScores: true })).toBe(true);
    expect(isMutationAllowed('setDelegatedOutcome', { canEnterScores: false })).toBe(false);
  });
});
