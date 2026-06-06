import { describe, expect, it } from 'vitest';

import { validateCaps, validateSettings } from './validators';

describe('validateCaps', () => {
  it('accepts an empty object', () => {
    expect(validateCaps({})).toEqual([]);
  });

  it('rejects non-objects', () => {
    expect(validateCaps(null)).toEqual([{ path: '', code: 'wrongType', message: 'caps must be an object' }]);
    expect(validateCaps('hi')).toHaveLength(1);
    expect(validateCaps([])[0].code).toBe('wrongType');
  });

  it('rejects unknown top-level keys', () => {
    const issues = validateCaps({ defaults: { defaultEventType: 'SINGLES' } });
    expect(issues).toEqual([
      {
        path: 'defaults',
        code: 'unknownField',
        message: expect.stringContaining('unknown caps top-level key'),
      },
    ]);
  });

  it('accepts well-formed branding', () => {
    expect(
      validateCaps({
        branding: {
          appName: 'IONSport',
          navbarLogoUrl: 'https://x/y.png',
          navbarLogoHeight: 32,
          accentColor: '#0066cc',
        },
      }),
    ).toEqual([]);
  });

  it('rejects unknown branding keys', () => {
    const issues = validateCaps({ branding: { foo: 'bar' } });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      path: 'branding.foo',
      code: 'unknownField',
      message: 'unknown branding key "foo"',
    });
  });

  it('rejects wrong-typed branding values', () => {
    const issues = validateCaps({ branding: { appName: 99, navbarLogoHeight: '32' } });
    expect(issues.find((i) => i.path === 'branding.appName')?.code).toBe('wrongType');
    expect(issues.find((i) => i.path === 'branding.navbarLogoHeight')?.code).toBe('wrongType');
  });

  it('accepts well-formed themeTokens with --tmx-* and --chc-* prefixes', () => {
    expect(
      validateCaps({
        branding: {
          themeTokens: {
            '--tmx-accent-blue': '#1a5276',
            '--tmx-bg-primary': '#f4f6f8',
            '--chc-text-primary': '#0a0a0a',
          },
        },
      }),
    ).toEqual([]);
  });

  it('rejects themeTokens keys outside the allowed prefixes', () => {
    const issues = validateCaps({
      branding: { themeTokens: { '--malicious-var': 'red', background: 'blue' } },
    });
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.code === 'unknownField')).toBe(true);
    expect(issues.map((i) => i.path).sort()).toEqual([
      'branding.themeTokens.--malicious-var',
      'branding.themeTokens.background',
    ]);
  });

  it('rejects non-string themeTokens values', () => {
    const issues = validateCaps({
      branding: { themeTokens: { '--tmx-accent-blue': 12345 } },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      path: 'branding.themeTokens.--tmx-accent-blue',
      code: 'wrongType',
      message: 'themeTokens value for "--tmx-accent-blue" must be a string',
    });
  });

  it('rejects non-object themeTokens', () => {
    const issues = validateCaps({ branding: { themeTokens: 'red' } });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('wrongType');
    expect(issues[0].path).toBe('branding.themeTokens');
  });

  it('accepts well-formed stylesheetUrl', () => {
    expect(validateCaps({ branding: { stylesheetUrl: 'https://provider.example.com/theme.css' } })).toEqual([]);
  });

  it('rejects non-string stylesheetUrl', () => {
    const issues = validateCaps({ branding: { stylesheetUrl: 42 } });
    expect(issues[0]).toEqual({
      path: 'branding.stylesheetUrl',
      code: 'wrongType',
      message: 'stylesheetUrl must be a string',
    });
  });

  it('accepts well-formed permissions (booleans + arrays)', () => {
    expect(
      validateCaps({
        permissions: {
          canCreateEvents: true,
          canDeleteEvents: false,
          allowedDrawTypes: ['SE', 'RR'],
          allowedScoringApproaches: [],
        },
      }),
    ).toEqual([]);
  });

  it('rejects unknown permission keys', () => {
    const issues = validateCaps({ permissions: { canFly: true } });
    expect(issues).toEqual([
      { path: 'permissions.canFly', code: 'unknownField', message: 'unknown permission key "canFly"' },
    ]);
  });

  it('rejects wrong-typed boolean permission', () => {
    const issues = validateCaps({ permissions: { canCreateEvents: 'yes' } });
    expect(issues[0]).toEqual({
      path: 'permissions.canCreateEvents',
      code: 'wrongType',
      message: 'canCreateEvents must be a boolean',
    });
  });

  it('rejects wrong-typed array permission', () => {
    const issues = validateCaps({ permissions: { allowedDrawTypes: 'SE' } });
    expect(issues[0]).toEqual({
      path: 'permissions.allowedDrawTypes',
      code: 'wrongType',
      message: 'allowedDrawTypes must be an array of strings',
    });
  });

  it('rejects array with non-string elements', () => {
    const issues = validateCaps({ permissions: { allowedDrawTypes: ['SE', 99] } });
    expect(issues[0].code).toBe('wrongType');
  });

  it('accepts well-formed policies', () => {
    expect(
      validateCaps({
        policies: {
          allowedMatchUpFormats: ['SET3-S:6/TB7'],
          allowedCategories: [{ ageCategoryCode: 'U12', categoryName: 'Under 12' }],
        },
      }),
    ).toEqual([]);
  });

  it('rejects unknown caps policy key', () => {
    // schedulingPolicy belongs to settings, not caps
    const issues = validateCaps({ policies: { schedulingPolicy: { startTime: '09:00' } } });
    expect(issues[0].code).toBe('unknownField');
    expect(issues[0].path).toBe('policies.schedulingPolicy');
  });

  it('rejects malformed allowedCategories', () => {
    const issues = validateCaps({ policies: { allowedCategories: [{ noCode: true }] } });
    expect(issues[0].code).toBe('wrongType');
  });

  it('accepts well-formed integrations', () => {
    expect(validateCaps({ integrations: { ssoProvider: 'ioncourt' } })).toEqual([]);
  });

  it('rejects unknown integrations keys', () => {
    const issues = validateCaps({ integrations: { customField: 'x' } });
    expect(issues[0].code).toBe('unknownField');
  });
});

describe('validateSettings', () => {
  describe('structural checks', () => {
    it('accepts an empty object', () => {
      expect(validateSettings({})).toEqual([]);
    });

    it('rejects non-objects', () => {
      expect(validateSettings(null)[0].code).toBe('wrongType');
    });

    it('rejects branding (settings has no branding)', () => {
      const issues = validateSettings({ branding: { appName: 'X' } });
      expect(issues[0].code).toBe('unknownField');
      expect(issues[0].path).toBe('branding');
    });

    it('rejects integrations (settings has no integrations)', () => {
      const issues = validateSettings({ integrations: { ssoProvider: 'foo' } });
      expect(issues[0].code).toBe('unknownField');
    });

    it('accepts well-formed defaults', () => {
      expect(
        validateSettings({
          defaults: { defaultEventType: 'SINGLES', defaultDrawType: 'SE' },
        }),
      ).toEqual([]);
    });

    it('rejects unknown defaults key', () => {
      const issues = validateSettings({ defaults: { defaultColor: 'blue' } });
      expect(issues[0].code).toBe('unknownField');
    });

    it('rejects wrong-typed defaults', () => {
      const issues = validateSettings({ defaults: { defaultEventType: 99 } });
      expect(issues[0].code).toBe('wrongType');
    });

    it('accepts well-formed scheduling/scoring/seeding policy shapes from factory defaults', () => {
      expect(
        validateSettings({
          policies: {
            schedulingPolicy: {
              allowModificationWhenMatchUpsScheduled: { courts: false, venues: false },
              defaultTimes: {
                averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
                recoveryTimes: [{ minutes: { default: 60 } }],
              },
              defaultDailyLimits: { SINGLES: 2, DOUBLES: 2, total: 3 },
              matchUpAverageTimes: [
                {
                  matchUpFormatCodes: ['SET3-S:6/TB7'],
                  averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
                },
              ],
              matchUpRecoveryTimes: [
                {
                  matchUpFormatCodes: ['SET3-S:6/TB7'],
                  recoveryTimes: [{ categoryTypes: ['ADULT'], minutes: { default: 60 } }],
                },
              ],
              matchUpDailyLimits: [],
            },
            scoringPolicy: {
              requireParticipantsForScoring: false,
              requireAllPositionsAssigned: false,
              allowChangePropagation: false,
              defaultMatchUpFormat: 'SET3-S:6/TB7',
              allowDeletionWithScoresPresent: { drawDefinitions: false, structures: false },
              stage: { MAIN: { stageSequence: { 1: { requireAllPositionsAssigned: true } } } },
              processCodes: { incompleteAssignmentsOnDefault: ['RANKING.IGNORE'] },
              matchUpFormats: [
                { matchUpFormat: 'SET3-S:6/TB7', description: 'Best of 3 tiebreak sets', categoryNames: [] },
              ],
              matchUpStatusCodes: {
                WALKOVER: [{ matchUpStatusCode: 'W1', label: 'Injury', matchUpStatusCodeDisplay: 'Wo [inj]' }],
              },
            },
            seedingPolicy: {
              seedingProfile: {
                drawTypes: { ROUND_ROBIN: { positioning: 'WATERFALL' } },
                positioning: 'SEPARATE',
              },
              validSeedPositions: { ignore: true },
              duplicateSeedNumbers: true,
              drawSizeProgression: true,
              containerByesIgnoreSeeding: true,
              policyName: 'USTA SEEDING',
              seedsCountThresholds: [{ drawSize: 16, minimumParticipantCount: 12, seedsCount: 4 }],
            },
          },
        }),
      ).toEqual([]);
    });

    it('rejects unknown schedulingPolicy keys', () => {
      const issues = validateSettings({ policies: { schedulingPolicy: { startTime: '09:00' } } });
      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual({
        path: 'policies.schedulingPolicy.startTime',
        code: 'unknownField',
        message: 'unknown schedulingPolicy key "startTime"',
      });
    });

    it('rejects wrong-typed schedulingPolicy interior values', () => {
      const issues = validateSettings({
        policies: {
          schedulingPolicy: {
            allowModificationWhenMatchUpsScheduled: { courts: 'no' },
            defaultDailyLimits: { SINGLES: '2' },
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.allowModificationWhenMatchUpsScheduled.courts',
        code: 'wrongType',
        message: expect.stringContaining('must be a boolean'),
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.defaultDailyLimits.SINGLES',
        code: 'wrongType',
        message: expect.stringContaining('must be a number'),
      });
    });

    it('rejects unknown scoringPolicy keys and wrong-typed booleans', () => {
      const issues = validateSettings({
        policies: {
          scoringPolicy: {
            variant: 'standard',
            requireParticipantsForScoring: 'yes',
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.variant',
        code: 'unknownField',
        message: 'unknown scoringPolicy key "variant"',
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.requireParticipantsForScoring',
        code: 'wrongType',
        message: expect.stringContaining('must be a boolean'),
      });
    });

    it('rejects malformed scoringPolicy.matchUpFormats entries', () => {
      const issues = validateSettings({
        policies: {
          scoringPolicy: {
            matchUpFormats: [{ description: 'no format key' }, 'not an object'],
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.matchUpFormats[0].matchUpFormat',
        code: 'wrongType',
        message: expect.stringContaining('must be a string'),
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.matchUpFormats[1]',
        code: 'wrongType',
        message: expect.stringContaining('must be an object'),
      });
    });

    it('rejects malformed scoringPolicy.matchUpStatusCodes entries', () => {
      const issues = validateSettings({
        policies: {
          scoringPolicy: {
            matchUpStatusCodes: {
              WALKOVER: [{ label: 'Injury' }],
            },
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.matchUpStatusCodes.WALKOVER[0].matchUpStatusCode',
        code: 'wrongType',
        message: expect.stringContaining('must be a string'),
      });
    });

    it('rejects scoringPolicy.stage.stageSequence wrong-typed leaf', () => {
      const issues = validateSettings({
        policies: {
          scoringPolicy: {
            stage: { MAIN: { stageSequence: { 1: { requireAllPositionsAssigned: 'yes' } } } },
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.stage.MAIN.stageSequence.1.requireAllPositionsAssigned',
        code: 'wrongType',
        message: expect.stringContaining('must be a boolean'),
      });
    });

    it('rejects unknown seedingPolicy keys and malformed seedsCountThresholds', () => {
      const issues = validateSettings({
        policies: {
          seedingPolicy: {
            method: 'random',
            seedsCountThresholds: [{ drawSize: '16', minimumParticipantCount: 12, seedsCount: 4 }],
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.method',
        code: 'unknownField',
        message: 'unknown seedingPolicy key "method"',
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.seedsCountThresholds[0].drawSize',
        code: 'wrongType',
        message: expect.stringContaining('must be a number'),
      });
    });

    it('rejects unknown seedingProfile keys and wrong-typed positioning', () => {
      const issues = validateSettings({
        policies: {
          seedingPolicy: {
            seedingProfile: { foo: 'bar', positioning: 99 },
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.seedingProfile.foo',
        code: 'unknownField',
        message: expect.stringContaining('unknown key'),
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.seedingProfile.positioning',
        code: 'wrongType',
        message: expect.stringContaining('must be a string'),
      });
    });

    it('rejects malformed schedulingPolicy.matchUpAverageTimes entries', () => {
      const issues = validateSettings({
        policies: {
          schedulingPolicy: {
            matchUpAverageTimes: [
              { matchUpFormatCodes: 'SET3-S:6/TB7', averageTimes: [] },
              { matchUpFormatCodes: ['SET3-S:6/TB7'], averageTimes: 'oops' },
            ],
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.matchUpAverageTimes[0].matchUpFormatCodes',
        code: 'wrongType',
        message: expect.stringContaining('must be an array of strings'),
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.matchUpAverageTimes[1].averageTimes',
        code: 'wrongType',
        message: expect.stringContaining('must be an array'),
      });
    });

    it('rejects schedulingPolicy.defaultTimes with non-array inner block', () => {
      const issues = validateSettings({
        policies: { schedulingPolicy: { defaultTimes: { averageTimes: 'oops', recoveryTimes: 42 } } },
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.defaultTimes.averageTimes',
        code: 'wrongType',
        message: expect.stringContaining('must be an array'),
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.defaultTimes.recoveryTimes',
        code: 'wrongType',
        message: expect.stringContaining('must be an array'),
      });
    });

    it('rejects schedulingPolicy.matchUpDailyLimits non-array', () => {
      const issues = validateSettings({
        policies: { schedulingPolicy: { matchUpDailyLimits: { foo: 1 } } },
      });
      expect(issues).toContainEqual({
        path: 'policies.schedulingPolicy.matchUpDailyLimits',
        code: 'wrongType',
        message: expect.stringContaining('must be an array'),
      });
    });

    it('rejects scoringPolicy.processCodes with non-string-array value', () => {
      const issues = validateSettings({
        policies: { scoringPolicy: { processCodes: { incompleteAssignmentsOnDefault: 'RANKING.IGNORE' } } },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.processCodes.incompleteAssignmentsOnDefault',
        code: 'wrongType',
        message: expect.stringContaining('must be an array of strings'),
      });
    });

    it('rejects scoringPolicy.defaultMatchUpFormat non-string', () => {
      const issues = validateSettings({
        policies: { scoringPolicy: { defaultMatchUpFormat: 42 } },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.defaultMatchUpFormat',
        code: 'wrongType',
        message: expect.stringContaining('must be a string'),
      });
    });

    it('rejects scoringPolicy.allowDeletionWithScoresPresent unknown sub-key', () => {
      const issues = validateSettings({
        policies: { scoringPolicy: { allowDeletionWithScoresPresent: { events: true } } },
      });
      expect(issues).toContainEqual({
        path: 'policies.scoringPolicy.allowDeletionWithScoresPresent.events',
        code: 'unknownField',
        message: expect.stringContaining('unknown key'),
      });
    });

    it('rejects seedingPolicy non-boolean toggles and seedsCountThresholds top-level non-array', () => {
      const issues = validateSettings({
        policies: {
          seedingPolicy: {
            duplicateSeedNumbers: 'yes',
            drawSizeProgression: 1,
            seedsCountThresholds: { drawSize: 16 },
          },
        },
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.duplicateSeedNumbers',
        code: 'wrongType',
        message: expect.stringContaining('must be a boolean'),
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.drawSizeProgression',
        code: 'wrongType',
        message: expect.stringContaining('must be a boolean'),
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.seedsCountThresholds',
        code: 'wrongType',
        message: expect.stringContaining('must be an array'),
      });
    });

    it('rejects seedingPolicy.seedingProfile.drawTypes with non-object draw-type entry', () => {
      const issues = validateSettings({
        policies: { seedingPolicy: { seedingProfile: { drawTypes: 'oops' } } },
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.seedingProfile.drawTypes',
        code: 'wrongType',
        message: expect.stringContaining('must be an object keyed by draw type'),
      });
    });

    it('rejects seedingPolicy.validSeedPositions unknown sub-key', () => {
      const issues = validateSettings({
        policies: { seedingPolicy: { validSeedPositions: { strict: true } } },
      });
      expect(issues).toContainEqual({
        path: 'policies.seedingPolicy.validSeedPositions.strict',
        code: 'unknownField',
        message: expect.stringContaining('unknown key'),
      });
    });
  });

  describe('caps-respect — boolean permissions', () => {
    it('accepts settings true when caps undefined', () => {
      expect(validateSettings({ permissions: { canCreateEvents: true } }, {})).toEqual([]);
    });

    it('accepts settings false when caps true (provider may disable)', () => {
      expect(
        validateSettings({ permissions: { canCreateEvents: false } }, { permissions: { canCreateEvents: true } }),
      ).toEqual([]);
    });

    it('accepts settings false when caps false (consistent)', () => {
      expect(
        validateSettings({ permissions: { canCreateEvents: false } }, { permissions: { canCreateEvents: false } }),
      ).toEqual([]);
    });

    it('REJECTS settings true when caps false (cannot upgrade above ceiling)', () => {
      const issues = validateSettings(
        { permissions: { canCreateOfficials: true } },
        { permissions: { canCreateOfficials: false } },
      );
      expect(issues).toEqual([
        {
          path: 'permissions.canCreateOfficials',
          code: 'exceedsCap',
          message: expect.stringContaining('cannot be enabled'),
        },
      ]);
    });

    it('accepts settings true when caps true', () => {
      expect(
        validateSettings({ permissions: { canCreateOfficials: true } }, { permissions: { canCreateOfficials: true } }),
      ).toEqual([]);
    });
  });

  describe('caps-respect — array permissions', () => {
    it('accepts any settings when caps universe undefined', () => {
      expect(validateSettings({ permissions: { allowedDrawTypes: ['SE', 'COMPASS'] } }, {})).toEqual([]);
    });

    it('accepts any settings when caps universe is empty (= unrestricted)', () => {
      expect(
        validateSettings({ permissions: { allowedDrawTypes: ['COMPASS'] } }, { permissions: { allowedDrawTypes: [] } }),
      ).toEqual([]);
    });

    it('accepts narrowing within caps universe', () => {
      expect(
        validateSettings(
          { permissions: { allowedDrawTypes: ['SE'] } },
          { permissions: { allowedDrawTypes: ['SE', 'RR', 'PAGE'] } },
        ),
      ).toEqual([]);
    });

    it('REJECTS settings adding values outside caps universe', () => {
      const issues = validateSettings(
        { permissions: { allowedDrawTypes: ['SE', 'COMPASS'] } },
        { permissions: { allowedDrawTypes: ['SE', 'RR'] } },
      );
      expect(issues).toEqual([
        {
          path: 'permissions.allowedDrawTypes',
          code: 'exceedsCap',
          message: expect.stringContaining('outside the provisioner-allowed universe'),
          disallowedValues: ['COMPASS'],
        },
      ]);
    });

    it('reports all disallowed values, not just the first', () => {
      const issues = validateSettings(
        { permissions: { allowedDrawTypes: ['SE', 'COMPASS', 'EVIL'] } },
        { permissions: { allowedDrawTypes: ['SE'] } },
      );
      expect(issues[0].disallowedValues).toEqual(['COMPASS', 'EVIL']);
    });
  });

  describe('caps-respect — policies', () => {
    it('accepts allowedMatchUpFormats narrowing', () => {
      expect(
        validateSettings(
          { policies: { allowedMatchUpFormats: ['SET3-S:6/TB7'] } },
          { policies: { allowedMatchUpFormats: ['SET3-S:6/TB7', 'SET5-S:6/TB7'] } },
        ),
      ).toEqual([]);
    });

    it('REJECTS allowedMatchUpFormats adding values outside caps universe', () => {
      const issues = validateSettings(
        { policies: { allowedMatchUpFormats: ['SET3-S:6/TB7', 'SET99-S:6/TB99'] } },
        { policies: { allowedMatchUpFormats: ['SET3-S:6/TB7'] } },
      );
      expect(issues[0].disallowedValues).toEqual(['SET99-S:6/TB99']);
    });

    it('REJECTS allowedCategories adding categories outside caps universe (by ageCategoryCode)', () => {
      const issues = validateSettings(
        { policies: { allowedCategories: [{ ageCategoryCode: 'U12' }, { ageCategoryCode: 'U99' }] } },
        { policies: { allowedCategories: [{ ageCategoryCode: 'U12' }, { ageCategoryCode: 'U14' }] } },
      );
      expect(issues[0].code).toBe('exceedsCap');
      expect(issues[0].disallowedValues).toEqual(['U99']);
    });

    it('accepts a well-formed settings-only policy regardless of caps', () => {
      expect(
        validateSettings(
          { policies: { schedulingPolicy: { defaultDailyLimits: { SINGLES: 2, total: 3 } } } },
          { policies: { allowedMatchUpFormats: ['SET3-S:6/TB7'] } },
        ),
      ).toEqual([]);
    });
  });

  describe('participantPrivacy (settings-only)', () => {
    it('accepts an absent participantPrivacy block', () => {
      const issues = validateSettings({ permissions: {} }, {});
      expect(issues.filter((i) => i.path.startsWith('participantPrivacy'))).toEqual([]);
    });

    it('accepts boolean cityState true', () => {
      const issues = validateSettings({ participantPrivacy: { cityState: true } }, {});
      expect(issues.filter((i) => i.path.startsWith('participantPrivacy'))).toEqual([]);
    });

    it('accepts boolean cityState false', () => {
      const issues = validateSettings({ participantPrivacy: { cityState: false } }, {});
      expect(issues.filter((i) => i.path.startsWith('participantPrivacy'))).toEqual([]);
    });

    it('rejects a non-boolean cityState', () => {
      const issues = validateSettings({ participantPrivacy: { cityState: 'yes' } }, {});
      const issue = issues.find((i) => i.path === 'participantPrivacy.cityState');
      expect(issue?.code).toBe('wrongType');
    });

    it('rejects an unknown participantPrivacy key', () => {
      const issues = validateSettings({ participantPrivacy: { gender: true } }, {});
      const issue = issues.find((i) => i.path === 'participantPrivacy.gender');
      expect(issue?.code).toBe('unknownField');
    });

    it('rejects a non-object participantPrivacy', () => {
      const issues = validateSettings({ participantPrivacy: 'true' }, {});
      const issue = issues.find((i) => i.path === 'participantPrivacy');
      expect(issue?.code).toBe('wrongType');
    });

    it('rejects participantPrivacy on caps (it belongs on settings)', () => {
      // The caps validator should reject `participantPrivacy` as an
      // unknown top-level field — privacy is provider-owned.
      const issues = validateCaps({ participantPrivacy: { cityState: true } });
      const issue = issues.find((i) => i.path === 'participantPrivacy');
      expect(issue?.code).toBe('unknownField');
    });
  });

  describe('combined real-world rejection', () => {
    it('reports multiple issues from a single bad write', () => {
      const issues = validateSettings(
        {
          permissions: {
            canCreateOfficials: true, // caps forbid
            allowedDrawTypes: ['SE', 'COMPASS'], // COMPASS not in caps
            unknownPerm: true, // unknown key
          },
          defaults: { defaultEventType: 99 }, // wrong type
          branding: { appName: 'leak' }, // settings has no branding
        },
        {
          permissions: {
            canCreateOfficials: false,
            allowedDrawTypes: ['SE', 'RR'],
          },
        },
      );

      const codes = issues.map((i) => i.code).sort();
      expect(codes).toContain('exceedsCap');
      expect(codes).toContain('unknownField');
      expect(codes).toContain('wrongType');
      expect(issues.length).toBeGreaterThanOrEqual(4);
    });
  });
});
