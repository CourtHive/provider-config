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
