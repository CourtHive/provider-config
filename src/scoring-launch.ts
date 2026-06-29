/**
 * scoring-launch — provider-declared scoring-app launch target for
 * courthive-public's per-matchUp "Score this match" action.
 *
 * A provider may declare `integrations.scoringLaunch` to control which
 * app the public site launches:
 *   EPIXODIC — CourtHive Epixodic deep-link (default when undeclared)
 *   EMBEDDED — courthive-public's own in-page `/track` scoring shell
 *   EXTERNAL — the provider's own app via a urlTemplate (e.g. IONSport)
 *
 * This module is pure (no runtime deps, no server/URL awareness beyond
 * template substitution) so it can ship in the published package and be
 * called from courthive-public, TMX, and the CFS endpoint alike.
 */

import { type ScoringLaunchApp, type ScoringLaunchConfig } from './types';

/** Closed set of launch app kinds. */
export const SCORING_LAUNCH_APPS: readonly ScoringLaunchApp[] = ['EPIXODIC', 'EMBEDDED', 'EXTERNAL'];

/** Placeholders an EXTERNAL urlTemplate may reference. */
export const SCORING_LAUNCH_PLACEHOLDERS: readonly string[] = ['tournamentId', 'matchUpId', 'eventId', 'drawId'];

/** The launch target a provider gets when nothing is declared. */
export const DEFAULT_SCORING_LAUNCH: ScoringLaunchConfig = { app: 'EPIXODIC' };

export interface ScoringLaunchContext {
  tournamentId?: string;
  matchUpId?: string;
  eventId?: string;
  drawId?: string;
}

const PLACEHOLDER_RE = /\$\{(\w+)\}/g;

/**
 * Substitute `${tournamentId}` / `${matchUpId}` / `${eventId}` / `${drawId}`
 * placeholders in an EXTERNAL urlTemplate with values from `ctx`. Unknown
 * placeholders and absent values resolve to an empty string. Values are
 * URI-component-encoded so ids are safe inside a path or query.
 */
export function resolveScoringLaunchUrl(urlTemplate: string, ctx: ScoringLaunchContext): string {
  return urlTemplate.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const value = (ctx as Record<string, string | undefined>)[key];
    return value == null ? '' : encodeURIComponent(value);
  });
}

/** Extract the placeholder names referenced by a urlTemplate (deduped). */
export function scoringLaunchPlaceholders(urlTemplate: string): string[] {
  const found = new Set<string>();
  for (const match of urlTemplate.matchAll(PLACEHOLDER_RE)) found.add(match[1]);
  return [...found];
}
