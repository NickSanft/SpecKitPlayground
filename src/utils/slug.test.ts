import { describe, expect, it } from 'vitest';
import { featureDirName, formatFeatureNumber, slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('User Authentication')).toBe('user-authentication');
  });

  it('collapses internal whitespace and punctuation runs', () => {
    expect(slugify('Hello,    world!!')).toBe('hello-world');
  });

  it('strips leading and trailing separators', () => {
    expect(slugify('---hello---')).toBe('hello');
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('strips diacritics', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
    expect(slugify('Mañana')).toBe('manana');
  });

  it('drops non-ASCII letters that have no decomposition', () => {
    expect(slugify('日本語 hello')).toBe('hello');
  });

  it('returns "feature" for empty or all-junk input', () => {
    expect(slugify('')).toBe('feature');
    expect(slugify('   ')).toBe('feature');
    expect(slugify('!!!')).toBe('feature');
    expect(slugify('---')).toBe('feature');
    expect(slugify('日本語')).toBe('feature');
  });

  it('truncates long slugs to 40 chars and trims trailing separators', () => {
    const long = 'a'.repeat(60);
    const out = slugify(long);
    expect(out.length).toBeLessThanOrEqual(40);
  });

  it('truncates long inputs without leaving a trailing hyphen', () => {
    const input = 'authentication and authorization for super important users';
    const out = slugify(input);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith('-')).toBe(false);
  });

  it('handles numbers and mixed alphanumerics', () => {
    expect(slugify('Phase 2: domain model')).toBe('phase-2-domain-model');
    expect(slugify('v1.0.0 release')).toBe('v1-0-0-release');
  });

  it('handles common punctuation', () => {
    expect(slugify("It's a test")).toBe('it-s-a-test');
    expect(slugify('A/B/C')).toBe('a-b-c');
    expect(slugify('A & B')).toBe('a-b');
  });

  it('preserves single hyphens between words', () => {
    expect(slugify('foo-bar-baz')).toBe('foo-bar-baz');
  });
});

describe('formatFeatureNumber', () => {
  it('zero-pads to 3 digits', () => {
    expect(formatFeatureNumber(1)).toBe('001');
    expect(formatFeatureNumber(7)).toBe('007');
    expect(formatFeatureNumber(42)).toBe('042');
    expect(formatFeatureNumber(100)).toBe('100');
  });

  it('does not truncate numbers over 999', () => {
    expect(formatFeatureNumber(1234)).toBe('1234');
  });
});

describe('featureDirName', () => {
  it('joins padded number and slug with a hyphen', () => {
    expect(featureDirName(1, 'user-auth')).toBe('001-user-auth');
    expect(featureDirName(42, 'fast-export')).toBe('042-fast-export');
  });
});
