import { describe, it, expect } from 'vitest';
import { findClosestPreset } from './presetMatcher';
import { DEFAULT_SIZE_PRESETS } from '../types';

describe('Preset Auto-Matcher (findClosestPreset)', () => {
  it('should return default preset when given invalid dimensions', () => {
    const result = findClosestPreset(0, 0);
    expect(result).toBeDefined();
    expect(result.id).toBe(DEFAULT_SIZE_PRESETS[2].id);
  });

  it('should match a 2:3 vertical photo to 6x9 cm', () => {
    // 600 x 900 px is 2:3 ratio
    const result = findClosestPreset(600, 900);
    expect(result.width / result.height).toBeCloseTo(60 / 90, 1);
  });

  it('should match a square 1:1 photo to a 1:1 preset', () => {
    // 500 x 500 px
    const result = findClosestPreset(500, 500);
    expect(result.width).toBe(result.height);
  });
});
