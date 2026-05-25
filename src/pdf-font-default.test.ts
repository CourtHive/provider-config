import { describe, expect, it } from 'vitest';

import { computeEffectiveConfig } from './effective-config';
import { validateSettings } from './validators';

describe('provider default PDF font', () => {
  it('accepts defaults.defaultPdfFont as a string', () => {
    expect(validateSettings({ defaults: { defaultPdfFont: 'dejavu-sans' } })).toEqual([]);
  });

  it('rejects a non-string defaultPdfFont', () => {
    const issues = validateSettings({ defaults: { defaultPdfFont: 42 } });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ path: 'defaults.defaultPdfFont', code: 'wrongType' });
  });

  it('also accepts defaults.defaultLanguage (previously missing from the whitelist)', () => {
    expect(validateSettings({ defaults: { defaultLanguage: 'cs' } })).toEqual([]);
  });

  it('surfaces defaultPdfFont in the effective config', () => {
    const effective = computeEffectiveConfig({}, { defaults: { defaultPdfFont: 'liberation-sans' } });
    expect(effective.defaults?.defaultPdfFont).toBe('liberation-sans');
  });
});
