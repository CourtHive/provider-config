/**
 * Mutation method → provider permission key map.
 *
 * Used by:
 *   - TMX `mutationRequest()` to gate user-initiated mutations against the
 *     local `providerConfig.permissions` (UI defense layer).
 *   - server `executionQueue` to gate mutations against the request's
 *     effective permissions (defense in depth: rejects malicious
 *     browsers that strip the client check by replaying ws payloads).
 *
 * Mutations not in this map are allowed by default. Add new entries here
 * when introducing a mutation that maps to a lockable behavior; both
 * client and server pick up the gate automatically.
 *
 * Keys are factory mutation method names (the string values, not the
 * UPPER_CASE identifiers). Values are `keyof ProviderPermissions`.
 */

import type { ProviderPermissions } from './types';

export const MUTATION_PERMISSIONS: Readonly<Record<string, keyof ProviderPermissions>> = {
  // Participants
  addParticipants: 'canCreateCompetitors',
  deleteParticipants: 'canDeleteParticipants',
  modifyParticipant: 'canEditParticipantDetails',
  modifyParticipantOtherName: 'canEditParticipantDetails',
  modifyParticipantsSignInStatus: 'canEditParticipantDetails',
  modifyEntriesStatus: 'canEditParticipantDetails',

  // Officials (proxy via match-official assignment — there's no dedicated
  // ADD_OFFICIAL mutation since officials enter as PARTICIPANTS but the
  // assignment-to-matchUp surface is the gate-worthy one)
  addMatchUpOfficial: 'canCreateOfficials',

  // Match personnel: scorekeeper/timekeeper nomination (crowd-scoring Phase D).
  // Same match-role assignment shape as addMatchUpOfficial; gated on the same
  // personnel-assignment permission. Could become a dedicated permission later.
  assignMatchUpScorekeeper: 'canCreateOfficials',
  removeMatchUpScorekeeper: 'canCreateOfficials',
  assignMatchUpTimekeeper: 'canCreateOfficials',
  removeMatchUpTimekeeper: 'canCreateOfficials',

  // Events
  addEvent: 'canCreateEvents',
  deleteEvents: 'canDeleteEvents',
  modifyEvent: 'canModifyEventFormat',
  setMatchUpFormat: 'canModifyEventFormat',
  modifyTieFormat: 'canModifyEventFormat',

  // Draws
  addDrawDefinition: 'canCreateDraws',
  addFlight: 'canCreateDraws',
  attachFlightProfile: 'canCreateDraws',
  modifyDrawDefinition: 'canCreateDraws',
  deleteDrawDefinitions: 'canDeleteDraws',
  deleteAdHocMatchUps: 'canDeleteDraws',
  deleteFlightAndFlightDraw: 'canDeleteDraws',

  // Scheduling
  addMatchUpScheduleItems: 'canModifySchedule',
  bulkScheduleMatchUps: 'canModifySchedule',
  proAutoSchedule: 'canModifySchedule',
  proColumnResolve: 'canModifySchedule',

  // Venues + courts
  addVenue: 'canCreateVenues',
  deleteVenues: 'canDeleteVenues',
  modifyVenue: 'canCreateVenues', // edit-venue gates on create-venue ceiling
  modifyCourt: 'canModifyCourtAvailability',
  modifyCourtAvailability: 'canModifyCourtAvailability',

  // Tournament details
  setTournamentDates: 'canModifyTournamentDetails',
  setTournamentName: 'canModifyTournamentDetails',
  setTournamentLocalTimeZone: 'canModifyTournamentDetails',
  setTournamentNotes: 'canModifyTournamentDetails',
  setRegistrationProfile: 'canModifyTournamentDetails',

  // Tournament policies
  attachPolicies: 'canModifyPolicies',

  // Publishing
  publishEvent: 'canPublish',
  publishOrderOfPlay: 'canPublish',
  publishParticipants: 'canPublish',
  publishEventSeeding: 'canPublish',
  unPublishEvent: 'canUnpublish',
  unPublishOrderOfPlay: 'canUnpublish',
  unPublishParticipants: 'canUnpublish',
  unPublishEventSeeding: 'canUnpublish',

  // ── Entries (event + draw) ──
  // Previously ungated entirely: a director blocked from CREATING competitors
  // could still enter every existing participant into every event.
  addEventEntries: 'canModifyEntries',
  removeEventEntries: 'canModifyEntries',
  addDrawEntries: 'canModifyEntries',
  removeDrawEntries: 'canModifyEntries',
  addEventEntryPairs: 'canModifyEntries',
  destroyPairEntries: 'canModifyEntries',
  removeStageEntries: 'canModifyEntries',

  // ── Draw positioning ──
  // Placing players is a different act from making the draw, so these do NOT
  // gate on canCreateDraws.
  assignDrawPosition: 'canAssignPositions',
  assignDrawPositionBye: 'canAssignPositions',
  removeDrawPositionAssignment: 'canAssignPositions',
  setPositionAssignments: 'canAssignPositions',
  automatedPlayoffPositioning: 'canAssignPositions',
  luckyDrawAdvancement: 'canAssignPositions',
  setSubOrder: 'canAssignPositions',
  seedWithdrawalCascade: 'canAssignPositions',
  setDrawPositionPreferences: 'canAssignPositions',
  assignTieMatchUpParticipantId: 'canAssignPositions',
  removeTieMatchUpParticipantId: 'canAssignPositions',

  // ── Draft positioning ──
  initializeDraft: 'canUseDraftPositioning',
  resolveDraftPositions: 'canUseDraftPositioning',

  // ── Structures ──
  attachQualifyingStructure: 'canModifyStructures',
  attachPlayoffStructures: 'canModifyStructures',
  attachConsolationStructures: 'canModifyStructures',
  generateVoluntaryConsolation: 'canModifyStructures',
  generateFlightProfile: 'canModifyStructures',
  addAdHocMatchUps: 'canModifyStructures',
  renameStructures: 'canModifyStructures',
  modifyDrawName: 'canModifyStructures',
  removeStructure: 'canDeleteDraws',
  resetDrawDefinition: 'canDeleteDraws',

  // ── Scoring ──
  // canEnterScores and canModifyCompletedScores were declared but enforced
  // nowhere; setMatchUpStatus is the single method TMX's scoring path emits.
  setMatchUpStatus: 'canEnterScores',
  setDelegatedOutcome: 'canEnterScores',
  removeDelegatedOutcome: 'canEnterScores',
  // NOTE: these three are score-destructive and semantically belong under
  // `canModifyCompletedScores` — but that key is in PERMISSIONS_DEFAULT_FALSE, so
  // computeEffectiveConfig resolves it to `false` for every provider that has not
  // configured permissions (which, as of 2026-08-23, is all 1130 in production).
  // Mapping them there would deny these operations for everyone on deploy.
  // Gated under canEnterScores to stay behaviour-neutral; tightening to
  // canModifyCompletedScores is a deliberate policy change that must ship with a
  // provider-config migration, not as a side effect of closing the mapping gap.
  resetScorecard: 'canEnterScores',
  resetMatchUpLinesUps: 'canEnterScores',
  abandonTournamentMatchUps: 'canEnterScores',

  // ── Scheduling ──
  setMatchUpCalledAt: 'canModifySchedule',
  setMatchUpScheduleLock: 'canModifySchedule',
  addScheduleScenario: 'canModifyScheduleScenarios',
  updateScheduleScenario: 'canModifyScheduleScenarios',
  removeScheduleScenario: 'canModifyScheduleScenarios',
  rebaseScheduleScenario: 'canModifyScheduleScenarios',
  applyScheduleScenario: 'canModifyScheduleScenarios',

  // ── Courts + venue resources ──
  addCourts: 'canCreateVenues',
  deleteCourts: 'canDeleteVenues',
  addOnlineResource: 'canModifyTournamentDetails',
  removeOnlineResource: 'canModifyTournamentDetails',

  // ── Practice courts ──
  addPracticeRegistration: 'canManagePracticeCourts',
  updatePracticeRegistration: 'canManagePracticeCourts',
  removePracticeRegistration: 'canManagePracticeCourts',
  setPracticeDefaultCapacity: 'canManagePracticeCourts',

  // ── Participants: grouping, extensions, time items ──
  createGroupParticipant: 'canEditParticipantDetails',
  addIndividualParticipantIds: 'canEditParticipantDetails',
  removeIndividualParticipantIds: 'canEditParticipantDetails',
  addParticipantExtension: 'canEditParticipantDetails',
  removeParticipantExtension: 'canEditParticipantDetails',
  addParticipantTimeItem: 'canEditParticipantDetails',

  // ── Ratings + scales ──
  addDynamicRatings: 'canModifyRatings',
  setParticipantScaleItems: 'canModifyRatings',
  generateSeedingScaleItems: 'canModifyRatings',
  updateParticipantResults: 'canModifyRatings',

  // ── Tournament details + extensions ──
  setTournamentCategories: 'canModifyTournamentDetails',
  setTournamentTier: 'canModifyTournamentDetails',
  addTournamentExtension: 'canModifyTournamentDetails',
  addTournamentTimeItem: 'canModifyTournamentDetails',
  addEventExtension: 'canModifyEventFormat',
  addDrawDefinitionExtension: 'canCreateDraws',

  // ── Linked tournaments ──
  linkTournaments: 'canLinkTournaments',
  unlinkTournament: 'canLinkTournaments',
} as const;

/**
 * Predicate: is the given mutation method allowed under the supplied
 * permissions object? Mutations without a permission entry are
 * permitted by default. Booleans default to `true` when undefined
 * (matching the permissive default in `ProviderPermissions`).
 *
 * Caller is responsible for handling the array-permission keys
 * (allowedDrawTypes, etc.) — those have richer semantics than a
 * simple boolean and are checked at a different layer (e.g. when
 * the draw-type itself is selected, not on the addDrawDefinition
 * call).
 */
export function isMutationAllowed(method: string, permissions: ProviderPermissions = {}): boolean {
  const permKey = MUTATION_PERMISSIONS[method];
  if (!permKey) return true;
  const value = permissions[permKey];
  if (typeof value === 'boolean') return value;
  // Array permissions or undefined → not the gate this layer enforces.
  return true;
}
